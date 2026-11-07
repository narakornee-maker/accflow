/* ============================================================
 * AccFlow — Accounting engine
 *  - คำนวณยอดเอกสาร (ส่วนลด / VAT แยก-รวม / หัก ณ ที่จ่าย)
 *  - ลงบัญชีคู่อัตโนมัติจากเอกสาร (Double-entry)
 *  - ต้นทุนสินค้าแบบถัวเฉลี่ยเคลื่อนที่ (Moving average)
 *  - ค่าเสื่อมราคาแบบเส้นตรง, เงินเดือน + ประกันสังคม + ภ.ง.ด.1
 *  - งบทดลอง, งบกำไรขาดทุน, งบแสดงฐานะการเงิน, รายงานภาษี
 * ============================================================ */
const ACC = (() => {
  const S = () => Store.state;
  const r2 = U.r2;
  let cache = {};
  const invalidate = () => { cache = {}; };

  const TYPE_LABEL = { asset: 'สินทรัพย์', liability: 'หนี้สิน', equity: 'ส่วนของเจ้าของ', revenue: 'รายได้', expense: 'ค่าใช้จ่าย' };
  const accType = (code) => { const a = Store.account(code); if (a) return a.type; return { 1: 'asset', 2: 'liability', 3: 'equity', 4: 'revenue', 5: 'expense' }[String(code)[0]]; };
  const isDebitNormal = (code) => ['asset', 'expense'].includes(accType(code));
  const isPL = (code) => ['revenue', 'expense'].includes(accType(code));

  const docs = (types, pred = () => true) => S().documents.filter((d) => types.includes(d.type) && pred(d));
  const posted = (d) => d.status === 'approved';
  const contact = (id) => Store.get('contacts', id);
  const product = (id) => (id ? Store.get('products', id) : null);

  /* ---------------- Document totals ---------------- */
  function calcDoc(doc) {
    const rate = doc.vatMode === 'none' || !S().company.vatRegistered ? 0 : +S().company.vatRate || 0;
    const lines = (doc.items || []).map((it) => {
      const gross = r2((+it.qty || 0) * (+it.price || 0));
      const disc = r2(+it.discount || 0);
      return { ...it, gross, amount: r2(gross - disc) };
    });
    const subtotal = U.sum(lines, (l) => l.amount);
    const discount = r2(+doc.discount || 0);
    const after = r2(subtotal - discount);
    let base, vat, total;
    if (rate && doc.vatMode === 'inclusive') { total = after; base = r2((total * 100) / (100 + rate)); vat = r2(total - base); }
    else if (rate) { base = after; vat = r2((base * rate) / 100); total = r2(base + vat); }
    else { base = after; vat = 0; total = after; }
    // allocate base (ex-VAT, after bill discount) to lines for posting
    let acc = 0;
    lines.forEach((l, i) => {
      if (i === lines.length - 1) l.base = r2(base - acc);
      else { l.base = subtotal ? r2((base * l.amount) / subtotal) : 0; acc = r2(acc + l.base); }
    });
    const whtRate = +doc.whtRate || 0;
    const wht = r2((base * whtRate) / 100);
    return { lines, subtotal, discount, after, base, vat, total, vatRate: rate, whtRate, wht, net: r2(total - wht) };
  }

  /* ---------------- Account mapping ---------------- */
  const salesAccount = (l) => {
    if (l.account) return l.account;
    const p = product(l.productId);
    if (p) return p.type === 'goods' ? '4110' : '4120';
    return S().company.businessType === 'goods' ? '4110' : '4120';
  };
  const purchaseAccount = (l, docType) => {
    const p = product(l.productId);
    if (p && p.type === 'goods' && docType === 'GR') return '1150';
    if (l.account) return l.account;
    if (p && p.expenseAccount) return p.expenseAccount;
    return docType === 'GR' ? '5100' : '5200';
  };
  const isStockLine = (l) => { const p = product(l.productId); return p && p.type === 'goods' && p.trackStock !== false; };

  /** สถานะการชำระของใบวางบิล */
  const receiptsOf = (bnId) => docs(['RC'], (r) => r.refId === bnId && r.status !== 'void' && r.status !== 'draft');
  const childrenOf = (id) => S().documents.filter((d) => d.refId === id && d.status !== 'void');
  const isPaid = (d) => {
    if (d.type === 'BN') return receiptsOf(d.id).length > 0;
    if (d.type === 'GR' || d.type === 'EX') return !!(d.payment && d.payment.paid);
    if (d.type === 'RC') return true;
    return false;
  };
  const outstanding = (d) => (isPaid(d) || d.status !== 'approved' ? 0 : calcDoc(d).total);

  /* ---------------- Inventory (moving average) ---------------- */
  function inventory() {
    if (cache.inv) return cache.inv;
    const moves = [];
    const add = (m) => moves.push(m);
    for (const d of S().documents) {
      if (!posted(d)) continue;
      const isOut = d.type === 'BN' || (d.type === 'RC' && !d.refId);
      const isIn = d.type === 'GR';
      if (!isOut && !isIn) continue;
      const c = calcDoc(d);
      c.lines.forEach((l, i) => {
        if (!isStockLine(l)) return;
        const q = +l.qty || 0;
        if (isIn) add({ date: d.date, productId: l.productId, qty: q, cost: l.base, key: `${d.id}:${i}`, ref: d.no, kind: 'in', order: 0 });
        else add({ date: d.date, productId: l.productId, qty: -q, key: `${d.id}:${i}`, ref: d.no, kind: 'out', order: 1 });
      });
    }
    for (const a of S().stockAdjustments) {
      const q = +a.qty || 0;
      add({ date: a.date, productId: a.productId, qty: q, cost: q > 0 ? r2(q * (+a.unitCost || 0)) : undefined, key: `ADJ:${a.id}`, ref: a.no || 'ปรับสต็อก', kind: q > 0 ? 'in' : 'out', order: q > 0 ? 0 : 1, adj: a });
    }
    moves.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.order - b.order));
    const bal = {}; const costOf = {};
    for (const m of moves) {
      const b = (bal[m.productId] = bal[m.productId] || { qty: 0, value: 0 });
      if (m.qty > 0) { b.qty += m.qty; b.value = r2(b.value + m.cost); }
      else {
        const p = product(m.productId);
        const avg = b.qty > 0 ? b.value / b.qty : +(p && p.costPrice) || 0;
        const cost = b.qty > 0 && -m.qty === b.qty ? b.value : r2(avg * -m.qty);
        m.cost = cost; costOf[m.key] = cost;
        b.qty += m.qty; b.value = r2(b.value - cost);
        if (Math.abs(b.qty) < 1e-9) { b.qty = 0; b.value = 0; }
      }
      m.balQty = b.qty; m.balValue = b.value;
    }
    for (const id in bal) bal[id].avg = bal[id].qty > 0 ? r2(bal[id].value / bal[id].qty) : 0;
    cache.inv = { moves, bal, costOf };
    return cache.inv;
  }

  /* ---------------- Depreciation (straight-line, monthly) ---------------- */
  function depSchedule(asset, upTo = '9999-12-31') {
    const cost = +asset.cost || 0, salvage = +asset.salvage || 0, months = Math.round((+asset.lifeYears || 0) * 12);
    if (!months || cost <= salvage || !asset.acquireDate) return [];
    const depreciable = r2(cost - salvage);
    const monthly = r2(depreciable / months);
    const out = []; let accum = 0;
    let [y, m] = asset.acquireDate.split('-').map(Number);
    for (let i = 0; i < months; i++) {
      const date = U.monthEnd(y, m);
      if (date > upTo || (asset.disposeDate && date > asset.disposeDate)) break;
      const amt = i === months - 1 ? r2(depreciable - accum) : monthly;
      accum = r2(accum + amt);
      out.push({ date, amount: amt, accum, nbv: r2(cost - accum) });
      m++; if (m > 12) { m = 1; y++; }
    }
    return out;
  }

  /* ---------------- Payroll ---------------- */
  function annualTax(net) {
    const br = [[150000, 0], [300000, 0.05], [500000, 0.10], [750000, 0.15], [1000000, 0.20], [2000000, 0.25], [5000000, 0.30], [Infinity, 0.35]];
    let tax = 0, prev = 0;
    for (const [lim, rate] of br) { if (net <= prev) break; tax += (Math.min(net, lim) - prev) * rate; prev = lim; }
    return r2(tax);
  }
  function calcPayLine(line) {
    const p = S().settings.payroll; const emp = Store.get('employees', line.employeeId) || {};
    const salary = +line.salary || 0, ot = +line.ot || 0, bonus = +line.bonus || 0, other = +line.otherIncome || 0;
    const gross = r2(salary + ot + bonus + other);
    const ssoBase = Math.min(Math.max(salary, +p.ssoMin), +p.ssoMax);
    const sso = emp.sso === false ? 0 : Math.round((ssoBase * +p.ssoRate) / 100);
    const employerSso = sso;
    let wht;
    if (line.whtOverride !== '' && line.whtOverride != null) wht = r2(+line.whtOverride);
    else {
      const annual = (salary + ot + other) * 12 + bonus;
      const expense = Math.min(annual * (+p.expenseRate / 100), +p.expenseMax);
      const net = annual - expense - +p.personalAllowance - sso * 12 - (+emp.extraAllowance || 0);
      wht = r2(annualTax(Math.max(net, 0)) / 12);
    }
    const deduct = +line.deduct || 0;
    return { salary, ot, bonus, other, gross, sso, employerSso, wht, deduct, net: r2(gross - sso - wht - deduct) };
  }
  function calcPayroll(run) {
    const lines = (run.lines || []).map((l) => ({ ...l, ...calcPayLine(l) }));
    const t = (k) => U.sum(lines, (l) => l[k]);
    return { lines, gross: t('gross'), sso: t('sso'), employerSso: t('employerSso'), wht: t('wht'), deduct: t('deduct'), net: t('net') };
  }

  /* ---------------- Journal generation ---------------- */
  function buildJournal(upTo = '9999-12-31') {
    const key = 'j:' + upTo;
    if (cache[key]) return cache[key];
    const inv = inventory();
    const entries = [];
    const vatReg = []; // {kind:'output'|'input', date, docNo, contactId, base, vat}
    const whtReg = []; // {kind:'deducted'|'withheld', form, date, docNo, contactId, base, wht}
    const vatPointPayment = S().company.vatPoint === 'payment';

    const mk = (date, no, desc, src) => {
      const e = { id: `${src.type}:${src.id}:${entries.length}`, date, no, desc, src, lines: [] };
      e.dr = (acc, amt, memo) => { amt = r2(amt); if (amt) e.lines.push({ acc, dr: amt > 0 ? amt : 0, cr: amt < 0 ? -amt : 0, memo }); return e; };
      e.cr = (acc, amt, memo) => { amt = r2(amt); if (amt) e.lines.push({ acc, dr: amt < 0 ? -amt : 0, cr: amt > 0 ? amt : 0, memo }); return e; };
      e.push = () => { if (e.lines.length) entries.push(e); return e; };
      return e;
    };
    const cname = (id) => (contact(id) || {}).name || '';
    const cogs = (e, d, c) => {
      c.lines.forEach((l, i) => {
        if (!isStockLine(l)) return;
        const cost = inv.costOf[`${d.id}:${i}`] || 0;
        e.dr('5100', cost, 'ต้นทุนขาย').cr('1150', cost, l.description);
      });
    };

    for (const d of S().documents) {
      if (!posted(d)) continue;
      const c = calcDoc(d);
      const who = cname(d.contactId);
      if (d.type === 'BN') {
        const e = mk(d.date, d.no, `ขายเชื่อ ${who}`, { type: 'BN', id: d.id });
        e.dr('1130', c.total, who);
        c.lines.forEach((l) => e.cr(salesAccount(l), l.base, l.description));
        e.cr(vatPointPayment ? '2155' : '2150', c.vat, 'ภาษีขาย');
        cogs(e, d, c); e.push();
        if (!vatPointPayment && c.vat) vatReg.push({ kind: 'output', date: d.date, docNo: d.no, contactId: d.contactId, base: c.base, vat: c.vat, docId: d.id });
      } else if (d.type === 'RC') {
        const payAcc = d.payAccount || '1120';
        if (d.refId) {
          const bn = Store.get('documents', d.refId);
          const e = mk(d.date, d.no, `รับชำระหนี้ ${who}${bn ? ' ตาม ' + bn.no : ''}`, { type: 'RC', id: d.id });
          e.dr(payAcc, c.net, who).dr('1160', c.wht, 'ถูกหัก ณ ที่จ่าย').cr('1130', c.total, who);
          if (vatPointPayment && c.vat) e.dr('2155', c.vat, 'โอนภาษีขายถึงกำหนด').cr('2150', c.vat, 'ภาษีขาย');
          e.push();
          if (vatPointPayment && c.vat) vatReg.push({ kind: 'output', date: d.date, docNo: d.no, contactId: d.contactId, base: c.base, vat: c.vat, docId: d.id });
        } else {
          const e = mk(d.date, d.no, `ขายสด ${who}`, { type: 'RC', id: d.id });
          e.dr(payAcc, c.net, who).dr('1160', c.wht, 'ถูกหัก ณ ที่จ่าย');
          c.lines.forEach((l) => e.cr(salesAccount(l), l.base, l.description));
          e.cr('2150', c.vat, 'ภาษีขาย');
          cogs(e, d, c); e.push();
          if (c.vat) vatReg.push({ kind: 'output', date: d.date, docNo: d.no, contactId: d.contactId, base: c.base, vat: c.vat, docId: d.id });
        }
        if (c.wht) whtReg.push({ kind: 'deducted', date: d.date, docNo: d.no, contactId: d.contactId, base: c.base, rate: c.whtRate, wht: c.wht });
      } else if (d.type === 'GR' || d.type === 'EX') {
        const e = mk(d.date, d.no, `${d.type === 'GR' ? 'ซื้อสินค้า' : 'ค่าใช้จ่าย'} ${who}`, { type: d.type, id: d.id });
        c.lines.forEach((l) => e.dr(purchaseAccount(l, d.type), l.base, l.description));
        e.dr('1170', c.vat, 'ภาษีซื้อ').cr('2110', c.total, who).push();
        if (c.vat) vatReg.push({ kind: 'input', date: d.taxInvoiceDate || d.date, docNo: d.taxInvoiceNo || d.no, contactId: d.contactId, base: c.base, vat: c.vat, docId: d.id });
        if (d.payment && d.payment.paid) {
          const pd = d.payment.date || d.date;
          mk(pd, d.no, `จ่ายชำระ ${who}`, { type: d.type + '-PAY', id: d.id })
            .dr('2110', c.total, who).cr(d.payment.account || '1120', c.net, who).cr('2140', c.wht, 'ภาษีหัก ณ ที่จ่าย').push();
          if (c.wht) {
            const ct = contact(d.contactId) || {};
            whtReg.push({ kind: 'withheld', form: ct.entityType === 'individual' ? 'ภ.ง.ด.3' : 'ภ.ง.ด.53', date: pd, docNo: d.no, contactId: d.contactId, base: c.base, rate: c.whtRate, wht: c.wht });
          }
        }
      }
    }

    // Payroll
    for (const run of S().payrolls) {
      if (run.status !== 'approved') continue;
      const p = calcPayroll(run);
      const e = mk(run.payDate, run.no, `จ่ายเงินเดือน ${U.thMonth(run.period)}`, { type: 'PAY', id: run.id });
      e.dr('5300', p.gross, 'เงินเดือนและค่าจ้าง').dr('5310', p.employerSso, 'ประกันสังคมส่วนนายจ้าง')
        .cr(run.payAccount || '1120', p.net, 'จ่ายสุทธิ').cr('2160', r2(p.sso + p.employerSso), 'ประกันสังคมค้างนำส่ง')
        .cr('2140', p.wht, 'ภ.ง.ด.1').cr('2190', p.deduct, 'รายการหักอื่น').push();
      p.lines.forEach((l) => { if (l.wht) whtReg.push({ kind: 'withheld', form: 'ภ.ง.ด.1', date: run.payDate, docNo: run.no, employeeId: l.employeeId, base: l.gross, rate: null, wht: l.wht }); });
    }

    // Fixed assets
    for (const a of S().assets) {
      if (a.payAccount && a.acquireDate) mk(a.acquireDate, a.code, `ซื้อสินทรัพย์ ${a.name}`, { type: 'ASSET', id: a.id }).dr('1210', a.cost, a.name).cr(a.payAccount, a.cost, a.name).push();
      for (const s of depSchedule(a, upTo)) mk(s.date, a.code, `ค่าเสื่อมราคา ${a.name}`, { type: 'DEP', id: a.id }).dr('5400', s.amount, a.name).cr('1219', s.amount, a.name).push();
    }

    // Stock adjustments
    for (const m of inv.moves) {
      if (!m.adj) continue;
      const a = m.adj; const p = product(a.productId) || {};
      const contra = a.reason === 'opening' ? '3200' : '5100';
      const e = mk(a.date, a.no || 'ADJ', `${a.reason === 'opening' ? 'สินค้ายกมา' : 'ปรับปรุงสต็อก'} ${p.name || ''}`, { type: 'ADJ', id: a.id });
      if (m.qty > 0) e.dr('1150', m.cost, p.name).cr(contra, m.cost, a.note);
      else e.dr(contra, m.cost, a.note).cr('1150', m.cost, p.name);
      e.push();
    }

    // Manual journal vouchers
    for (const j of S().journals) {
      if (j.status === 'void') continue;
      const e = mk(j.date, j.no, j.desc || 'บันทึกรายการทั่วไป', { type: 'JV', id: j.id });
      (j.lines || []).forEach((l) => { if (+l.dr) e.dr(l.acc, +l.dr, l.memo); if (+l.cr) e.cr(l.acc, +l.cr, l.memo); });
      e.push();
    }

    const filtered = entries.filter((e) => e.date <= upTo).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    cache[key] = { entries: filtered, vatReg, whtReg };
    return cache[key];
  }

  /* ---------------- Balances & statements ---------------- */
  const fiscalStart = (date) => {
    const m = +S().company.fyStartMonth || 1;
    let [y, mm] = date.split('-').map(Number);
    if (mm < m) y--;
    return `${y}-${U.pad(m)}-01`;
  };

  /** movement by account in [from, to] (dr - cr) */
  function movement(from, to) {
    const { entries } = buildJournal(to);
    const m = {};
    for (const e of entries) {
      if (e.date < from || e.date > to) continue;
      for (const l of e.lines) { const a = (m[l.acc] = m[l.acc] || { dr: 0, cr: 0 }); a.dr = r2(a.dr + l.dr); a.cr = r2(a.cr + l.cr); }
    }
    return m;
  }
  /** signed balance in natural side */
  const natural = (code, mv) => (mv ? (isDebitNormal(code) ? r2(mv.dr - mv.cr) : r2(mv.cr - mv.dr)) : 0);

  function trialBalance(asOf) {
    const fy = fiscalStart(asOf);
    const all = movement('0000-01-01', asOf);
    const cur = movement(fy, asOf);
    const prev = movement('0000-01-01', U.addDays(fy, -1));
    const priorProfit = r2(Object.keys(prev).filter(isPL).reduce((s, c) => s + (prev[c].cr - prev[c].dr), 0));
    const codes = new Set([...Object.keys(all), ...S().accounts.map((a) => a.code)]);
    const rows = [];
    for (const code of [...codes].sort()) {
      const mv = isPL(code) ? cur[code] : all[code];
      let dr = mv ? mv.dr : 0, cr = mv ? mv.cr : 0;
      if (code === '3200') cr = r2(cr + priorProfit);
      const bal = r2(dr - cr);
      if (!bal) continue;
      rows.push({ code, name: Store.accName(code), type: accType(code), dr: bal > 0 ? bal : 0, cr: bal < 0 ? -bal : 0 });
    }
    return { rows, dr: U.sum(rows, (r) => r.dr), cr: U.sum(rows, (r) => r.cr), priorProfit };
  }

  function profitLoss(from, to) {
    const mv = movement(from, to);
    const rows = (pred) => S().accounts.filter(pred).map((a) => ({ code: a.code, name: a.name, amount: natural(a.code, mv[a.code]) })).filter((r) => r.amount);
    const revenue = rows((a) => a.type === 'revenue' && a.group !== 'other');
    const otherIncome = rows((a) => a.type === 'revenue' && a.group === 'other');
    const cost = rows((a) => a.type === 'expense' && a.group === 'cost');
    const opex = rows((a) => a.type === 'expense' && (a.group === 'opex' || !a.group));
    const otherExp = rows((a) => a.type === 'expense' && a.group === 'other');
    const tax = rows((a) => a.type === 'expense' && a.group === 'tax');
    const t = (r) => U.sum(r, (x) => x.amount);
    const totalRevenue = t(revenue), totalCost = t(cost), gross = r2(totalRevenue - totalCost);
    const totalOpex = t(opex), operating = r2(gross - totalOpex);
    const totalOtherInc = t(otherIncome), totalOtherExp = t(otherExp);
    const beforeTax = r2(operating + totalOtherInc - totalOtherExp);
    const totalTax = t(tax);
    return { revenue, otherIncome, cost, opex, otherExp, tax, totalRevenue, totalCost, gross, totalOpex, operating, totalOtherInc, totalOtherExp, beforeTax, totalTax, net: r2(beforeTax - totalTax) };
  }

  function balanceSheet(asOf) {
    const tb = trialBalance(asOf);
    const fy = fiscalStart(asOf);
    const pl = profitLoss(fy, asOf);
    const bal = {}; tb.rows.forEach((r) => (bal[r.code] = r));
    const get = (code) => { const r = bal[code]; if (!r) return 0; return isDebitNormal(code) ? r2(r.dr - r.cr) : r2(r.cr - r.dr); };
    const list = (pred) => S().accounts.filter(pred).map((a) => ({ code: a.code, name: a.name, amount: get(a.code) })).filter((r) => r.amount);
    const curA = list((a) => a.type === 'asset' && a.group !== 'noncurrent');
    const nonA = list((a) => a.type === 'asset' && a.group === 'noncurrent');
    const curL = list((a) => a.type === 'liability' && a.group !== 'noncurrent');
    const nonL = list((a) => a.type === 'liability' && a.group === 'noncurrent');
    const eq = list((a) => a.type === 'equity');
    eq.push({ code: '', name: 'กำไร (ขาดทุน) สุทธิงวดปัจจุบัน', amount: pl.net });
    const t = (r) => U.sum(r, (x) => x.amount);
    const totalAssets = r2(t(curA) + t(nonA));
    const totalLiab = r2(t(curL) + t(nonL));
    const totalEq = t(eq);
    return { curA, nonA, curL, nonL, eq, totalCurA: t(curA), totalNonA: t(nonA), totalCurL: t(curL), totalNonL: t(nonL), totalAssets, totalLiab, totalEq, totalLE: r2(totalLiab + totalEq), balanced: Math.abs(totalAssets - (totalLiab + totalEq)) < 0.01 };
  }

  function ledger(code, from, to) {
    const { entries } = buildJournal(to);
    let open = 0; const rows = [];
    const sign = isDebitNormal(code) ? 1 : -1;
    const plStart = isPL(code) ? fiscalStart(from) : '0000-01-01';
    for (const e of entries) {
      for (const l of e.lines) {
        if (l.acc !== code) continue;
        if (e.date < from) { if (e.date >= plStart) open = r2(open + sign * (l.dr - l.cr)); continue; }
        if (e.date > to) continue;
        rows.push({ date: e.date, no: e.no, desc: l.memo ? `${e.desc} — ${l.memo}` : e.desc, dr: l.dr, cr: l.cr, src: e.src });
      }
    }
    let bal = open;
    rows.forEach((r) => { bal = r2(bal + sign * (r.dr - r.cr)); r.bal = bal; });
    return { open, rows, close: bal, dr: U.sum(rows, (r) => r.dr), cr: U.sum(rows, (r) => r.cr) };
  }

  const balanceOf = (code, asOf = U.today()) => {
    const mv = movement(isPL(code) ? fiscalStart(asOf) : '0000-01-01', asOf);
    return natural(code, mv[code]);
  };

  function vatReport(from, to) {
    const { vatReg } = buildJournal(to);
    const inRange = vatReg.filter((v) => v.date >= from && v.date <= to).sort((a, b) => (a.date < b.date ? -1 : 1));
    const output = inRange.filter((v) => v.kind === 'output');
    const input = inRange.filter((v) => v.kind === 'input');
    const outVat = U.sum(output, (v) => v.vat), inVat = U.sum(input, (v) => v.vat);
    return { output, input, outBase: U.sum(output, (v) => v.base), outVat, inBase: U.sum(input, (v) => v.base), inVat, net: r2(outVat - inVat) };
  }

  function whtReport(from, to) {
    const { whtReg } = buildJournal(to);
    const r = whtReg.filter((v) => v.date >= from && v.date <= to).sort((a, b) => (a.date < b.date ? -1 : 1));
    return { withheld: r.filter((x) => x.kind === 'withheld'), deducted: r.filter((x) => x.kind === 'deducted') };
  }

  function aging(group, asOf = U.today()) {
    const types = group === 'ar' ? ['BN'] : ['GR', 'EX'];
    const rows = docs(types, (d) => d.status === 'approved' && !isPaid(d) && d.date <= asOf).map((d) => {
      const c = calcDoc(d);
      const due = d.dueDate || d.date;
      const days = U.daysBetween(due, asOf);
      const bucket = days <= 0 ? 0 : days <= 30 ? 1 : days <= 60 ? 2 : days <= 90 ? 3 : 4;
      return { doc: d, contact: contact(d.contactId) || {}, total: c.total, net: c.net, due, days, bucket };
    });
    const buckets = [0, 1, 2, 3, 4].map((b) => U.sum(rows.filter((r) => r.bucket === b), (r) => r.total));
    return { rows, buckets, total: U.sum(rows, (r) => r.total) };
  }

  /** ข้อมูลตารางสำหรับเขียนลง Google Sheets */
  function exportTables() {
    const s = S();
    const { entries } = buildJournal(U.today());
    const tb = trialBalance(U.today());
    return {
      'รายชื่อติดต่อ': [['รหัส', 'ประเภท', 'ชื่อ', 'เลขผู้เสียภาษี', 'สาขา', 'ที่อยู่', 'โทร', 'อีเมล', 'เครดิต(วัน)'],
        ...s.contacts.map((c) => [c.code, c.type, c.name, c.taxId, c.branch, c.address, c.phone, c.email, c.creditDays])],
      'สินค้า': [['รหัส', 'ชื่อ', 'ประเภท', 'หน่วย', 'ราคาขาย', 'ราคาทุน', 'คงเหลือ', 'มูลค่า'],
        ...s.products.map((p) => { const b = inventory().bal[p.id] || {}; return [p.code, p.name, p.type, p.unit, p.salePrice, p.costPrice, b.qty || 0, b.value || 0]; })],
      'เอกสาร': [['ประเภท', 'เลขที่', 'วันที่', 'ครบกำหนด', 'คู่ค้า', 'สถานะ', 'ก่อนภาษี', 'VAT', 'รวม', 'หัก ณ ที่จ่าย', 'สุทธิ', 'อ้างอิง'],
        ...s.documents.map((d) => { const c = calcDoc(d); const ref = d.refId ? (Store.get('documents', d.refId) || {}).no : ''; return [d.type, d.no, d.date, d.dueDate, (contact(d.contactId) || {}).name, d.status, c.base, c.vat, c.total, c.wht, c.net, ref]; })],
      'สมุดรายวัน': [['วันที่', 'เลขที่', 'คำอธิบาย', 'รหัสบัญชี', 'ชื่อบัญชี', 'เดบิต', 'เครดิต'],
        ...entries.flatMap((e) => e.lines.map((l) => [e.date, e.no, e.desc, l.acc, Store.accName(l.acc), l.dr, l.cr]))],
      'งบทดลอง': [['รหัสบัญชี', 'ชื่อบัญชี', 'เดบิต', 'เครดิต'], ...tb.rows.map((r) => [r.code, r.name, r.dr, r.cr]), ['', 'รวม', tb.dr, tb.cr]],
    };
  }

  return { TYPE_LABEL, accType, isDebitNormal, isPL, calcDoc, salesAccount, purchaseAccount, isStockLine, receiptsOf, childrenOf, isPaid, outstanding,
    inventory, depSchedule, annualTax, calcPayLine, calcPayroll, buildJournal, fiscalStart, movement, trialBalance, profitLoss, balanceSheet, ledger,
    balanceOf, vatReport, whtReport, aging, exportTables, invalidate };
})();
