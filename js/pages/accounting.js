/* ============================================================
 * Accounting: ผังบัญชี / สมุดรายวัน / บัญชีแยกประเภท / งบทดลอง
 * ============================================================ */
Pages.accounting = (view, tab = 'coa', sub, query = {}) => {
  if (!['coa', 'journal', 'ledger', 'tb'].includes(tab)) tab = 'coa';
  App.setTitle('บัญชี');
  const tabs = [['coa', 'list-tree', 'ผังบัญชี'], ['journal', 'book-open', 'สมุดรายวันทั่วไป'], ['ledger', 'library', 'บัญชีแยกประเภท'], ['tb', 'scale', 'งบทดลอง']];
  view.innerHTML = `
  <div class="page-head"><div><h2>บัญชี</h2><p>ระบบบัญชีคู่ — เอกสารที่อนุมัติจะถูกลงบัญชีอัตโนมัติ และสามารถบันทึกรายการปรับปรุงด้วยใบสำคัญทั่วไป (JV)</p></div>
    <button class="btn btn-primary" onclick="Pages.jvForm()">${U.icon('book-plus')}บันทึกรายการทั่วไป (JV)</button></div>
  <div class="card"><div class="tabs">${tabs.map(([k, ic, l]) => `<a href="#/accounting/${k}" class="${tab === k ? 'active' : ''}">${U.icon(ic)}${l}</a>`).join('')}</div><div id="acc-body"></div></div>`;
  const body = U.$('#acc-body');
  ({ coa: coaTab, journal: journalTab, ledger: ledgerTab, tb: tbTab })[tab]();
  if (tab === 'journal' && sub === 'new') { history.replaceState(null, '', '#/accounting/journal'); setTimeout(() => Pages.jvForm(), 50); }

  function coaTab() {
    const accs = [...Store.state.accounts].sort((a, b) => a.code.localeCompare(b.code));
    const byType = U.groupBy(accs, (a) => a.type);
    body.innerHTML = `<div class="toolbar"><span class="muted small">ยอดคงเหลือ ณ วันที่ ${U.thDateLong(U.today())} (บัญชีรายได้/ค่าใช้จ่าย แสดงยอดตั้งแต่ต้นปีบัญชี)</span><div class="flex-1"></div>
      <button class="btn btn-outline btn-sm" onclick="Pages.accountForm()">${U.icon('plus')}เพิ่มบัญชี</button></div>
      <div class="table-wrap"><table class="tbl"><thead><tr><th style="width:110px">รหัสบัญชี</th><th>ชื่อบัญชี</th><th>หมวด</th><th class="num">ยอดคงเหลือ</th><th></th></tr></thead><tbody>
      ${['asset', 'liability', 'equity', 'revenue', 'expense'].map((t) => `<tr class="group"><td colspan="5">${{ asset: '1', liability: '2', equity: '3', revenue: '4', expense: '5' }[t]} · ${ACC.TYPE_LABEL[t]}</td></tr>
        ${(byType[t] || []).map((a) => `<tr><td class="fw-6">${a.code}</td><td>${U.esc(a.name)} ${a.system ? '<span class="tag">ระบบ</span>' : ''}</td>
          <td class="muted small">${{ current: 'หมุนเวียน', noncurrent: 'ไม่หมุนเวียน', sales: 'รายได้หลัก', other: 'อื่นๆ', cost: 'ต้นทุนขาย', opex: 'ค่าใช้จ่ายดำเนินงาน', tax: 'ภาษีเงินได้' }[a.group] || ''}</td>
          <td class="num"><a href="#/accounting/ledger?acc=${a.code}">${U.acc(ACC.balanceOf(a.code))}</a></td>
          <td class="actions">${a.system ? '' : `<button class="icon-btn" onclick="Pages.accountForm('${a.code}')">${U.icon('pencil')}</button><button class="icon-btn danger" onclick="Pages.accountDelete('${a.code}')">${U.icon('trash-2')}</button>`}</td></tr>`).join('')}`).join('')}
      </tbody></table></div>`;
  }

  function journalTab() {
    const from = query.from || ACC.fiscalStart(U.today()), to = query.to || U.today();
    const src = query.src || '';
    const { entries } = ACC.buildJournal(to);
    const srcLabel = { BN: 'ขาย', RC: 'รับเงิน', GR: 'ซื้อ', EX: 'ค่าใช้จ่าย', 'GR-PAY': 'จ่ายเงิน', 'EX-PAY': 'จ่ายเงิน', PAY: 'เงินเดือน', ASSET: 'สินทรัพย์', DEP: 'ค่าเสื่อม', ADJ: 'สต็อก', JV: 'ทั่วไป' };
    const list = entries.filter((e) => e.date >= from && e.date <= to && (!src || e.src.type === src || (src === 'PAYM' && e.src.type.endsWith('-PAY'))));
    const dr = U.sum(list, (e) => U.sum(e.lines, (l) => l.dr)), cr = U.sum(list, (e) => U.sum(e.lines, (l) => l.cr));
    const link = (e) => {
      const t = e.src.type.replace('-PAY', '');
      if (DOC_TYPES[t]) return `#/doc/${t}/${e.src.id}`;
      if (t === 'PAY') return `#/payroll/run/${e.src.id}`;
      if (t === 'ASSET' || t === 'DEP') return '#/assets';
      if (t === 'ADJ') return '#/products/stock';
      return '';
    };
    body.innerHTML = `<div class="toolbar">
      <div class="flex"><span class="small muted">ตั้งแต่</span><input type="date" id="j-from" value="${from}" style="width:auto"><span class="small muted">ถึง</span><input type="date" id="j-to" value="${to}" style="width:auto"></div>
      <select id="j-src" style="width:auto"><option value="">ทุกสมุด</option>${[['BN', 'สมุดรายวันขาย'], ['RC', 'สมุดรายวันรับเงิน'], ['GR', 'สมุดรายวันซื้อ'], ['EX', 'ค่าใช้จ่าย'], ['PAYM', 'สมุดรายวันจ่ายเงิน'], ['PAY', 'เงินเดือน'], ['DEP', 'ค่าเสื่อมราคา'], ['JV', 'สมุดรายวันทั่วไป (JV)']].map(([v, l]) => U.opt(v, l, src)).join('')}</select>
      <div class="flex-1"></div><button class="btn btn-outline btn-sm" id="j-csv">${U.icon('download')}CSV</button></div>
      <div class="table-wrap">${list.length ? `<table class="tbl compact"><thead><tr><th style="width:90px">วันที่</th><th style="width:150px">เลขที่</th><th>รายการ / ชื่อบัญชี</th><th style="width:70px">รหัส</th><th class="num" style="width:130px">เดบิต</th><th class="num" style="width:130px">เครดิต</th><th style="width:70px"></th></tr></thead><tbody>
        ${list.map((e) => { const h = link(e); return `<tr class="sub"><td class="fw-6">${U.thDate(e.date)}</td><td>${h ? `<a href="${h}">${U.esc(e.no)}</a>` : U.esc(e.no)}</td><td class="fw-6">${U.esc(e.desc)} <span class="tag">${srcLabel[e.src.type] || e.src.type}</span></td><td></td><td></td><td></td>
          <td class="actions">${e.src.type === 'JV' ? `<button class="icon-btn" onclick="Pages.jvForm('${e.src.id}')">${U.icon('pencil')}</button>` : ''}</td></tr>
          ${e.lines.map((l) => `<tr><td></td><td></td><td style="padding-left:${l.cr ? 48 : 22}px">${U.esc(Store.accName(l.acc))}${l.memo ? ` <span class="muted small">— ${U.esc(l.memo)}</span>` : ''}</td><td>${l.acc}</td><td class="num">${l.dr ? U.money(l.dr) : ''}</td><td class="num">${l.cr ? U.money(l.cr) : ''}</td><td></td></tr>`).join('')}`; }).join('')}
        </tbody><tfoot><tr><td colspan="4">รวม ${list.length} รายการ ${Math.abs(dr - cr) < 0.005 ? '<span class="chip chip-paid">สมดุล</span>' : '<span class="chip chip-void">ไม่สมดุล</span>'}</td><td class="num">${U.money(dr)}</td><td class="num">${U.money(cr)}</td><td></td></tr></tfoot></table>`
        : `<div class="empty">${U.icon('book-open')}<h4>ไม่มีรายการบัญชีในช่วงนี้</h4></div>`}</div>`;
    const go = () => location.hash = `#/accounting/journal?from=${U.$('#j-from').value}&to=${U.$('#j-to').value}${U.$('#j-src').value ? '&src=' + U.$('#j-src').value : ''}`;
    ['#j-from', '#j-to', '#j-src'].forEach((s) => U.$(s).onchange = go);
    U.$('#j-csv').onclick = () => U.downloadCSV(`journal-${from}-${to}.csv`, [['วันที่', 'เลขที่', 'คำอธิบาย', 'รหัสบัญชี', 'ชื่อบัญชี', 'เดบิต', 'เครดิต', 'หมายเหตุ'], ...list.flatMap((e) => e.lines.map((l) => [e.date, e.no, e.desc, l.acc, Store.accName(l.acc), l.dr, l.cr, l.memo || '']))]);
  }

  function ledgerTab() {
    const code = query.acc || '1120';
    const from = query.from || ACC.fiscalStart(U.today()), to = query.to || U.today();
    const L = ACC.ledger(code, from, to);
    body.innerHTML = `<div class="toolbar">
      <select id="l-acc" style="width:auto;min-width:260px">${[...Store.state.accounts].sort((a, b) => a.code.localeCompare(b.code)).map((a) => U.opt(a.code, `${a.code} ${a.name}`, code)).join('')}</select>
      <div class="flex"><span class="small muted">ตั้งแต่</span><input type="date" id="l-from" value="${from}" style="width:auto"><span class="small muted">ถึง</span><input type="date" id="l-to" value="${to}" style="width:auto"></div>
      <div class="flex-1"></div><button class="btn btn-outline btn-sm" onclick="window.print()">${U.icon('printer')}พิมพ์</button></div>
      <div class="report-title"><h3>บัญชีแยกประเภท: ${code} ${U.esc(Store.accName(code))}</h3><p>${U.thDateLong(from)} – ${U.thDateLong(to)} · ด้านปกติ: ${ACC.isDebitNormal(code) ? 'เดบิต' : 'เครดิต'}</p></div>
      <div class="table-wrap"><table class="tbl compact"><thead><tr><th>วันที่</th><th>เลขที่</th><th>คำอธิบาย</th><th class="num">เดบิต</th><th class="num">เครดิต</th><th class="num">คงเหลือ</th></tr></thead><tbody>
      <tr class="sub"><td></td><td></td><td class="fw-6">ยอดยกมา</td><td></td><td></td><td class="num fw-6">${U.acc(L.open)}</td></tr>
      ${L.rows.map((r) => `<tr><td>${U.thDate(r.date)}</td><td>${U.esc(r.no)}</td><td>${U.esc(r.desc)}</td><td class="num">${r.dr ? U.money(r.dr) : ''}</td><td class="num">${r.cr ? U.money(r.cr) : ''}</td><td class="num">${U.acc(r.bal)}</td></tr>`).join('')}
      </tbody><tfoot><tr><td colspan="3">รวม / ยอดคงเหลือยกไป</td><td class="num">${U.money(L.dr)}</td><td class="num">${U.money(L.cr)}</td><td class="num">${U.acc(L.close)}</td></tr></tfoot></table></div>`;
    const go = () => location.hash = `#/accounting/ledger?acc=${U.$('#l-acc').value}&from=${U.$('#l-from').value}&to=${U.$('#l-to').value}`;
    ['#l-acc', '#l-from', '#l-to'].forEach((s) => U.$(s).onchange = go);
  }

  function tbTab() {
    const asOf = query.asOf || U.today();
    const tb = ACC.trialBalance(asOf);
    const ok = Math.abs(tb.dr - tb.cr) < 0.005;
    body.innerHTML = `<div class="toolbar"><div class="flex"><span class="small muted">ณ วันที่</span><input type="date" id="tb-asof" value="${asOf}" style="width:auto"></div><div class="flex-1"></div>
      <button class="btn btn-outline btn-sm" id="tb-csv">${U.icon('download')}CSV</button><button class="btn btn-outline btn-sm" onclick="window.print()">${U.icon('printer')}พิมพ์</button></div>
      <div class="report">
      <div class="report-title"><h3>${U.esc(Store.state.company.name)}</h3><p><b>งบทดลอง</b> ณ วันที่ ${U.thDateLong(asOf)}</p></div>
      <div style="padding:0 20px 16px"><div class="alert ${ok ? 'alert-ok' : 'alert-err'}">${U.icon(ok ? 'check-circle-2' : 'alert-circle')}<div>${ok ? 'งบทดลองสมดุล — ยอดรวมเดบิตเท่ากับเครดิต' : `งบทดลองไม่สมดุล ผลต่าง ${U.money(tb.dr - tb.cr)}`}</div></div></div>
      <table class="tbl"><thead><tr><th>รหัสบัญชี</th><th>ชื่อบัญชี</th><th class="num">เดบิต</th><th class="num">เครดิต</th></tr></thead><tbody>
      ${tb.rows.map((r) => `<tr><td>${r.code}</td><td><a href="#/accounting/ledger?acc=${r.code}&to=${asOf}">${U.esc(r.name)}</a>${r.code === '3200' && tb.priorProfit ? ` <span class="muted small">(รวมกำไรสะสมปีก่อน ${U.acc(tb.priorProfit)})</span>` : ''}</td><td class="num">${r.dr ? U.money(r.dr) : ''}</td><td class="num">${r.cr ? U.money(r.cr) : ''}</td></tr>`).join('')}
      </tbody><tfoot><tr><td></td><td>รวม</td><td class="num">${U.money(tb.dr)}</td><td class="num">${U.money(tb.cr)}</td></tr></tfoot></table></div>`;
    U.$('#tb-asof').onchange = (e) => location.hash = `#/accounting/tb?asOf=${e.target.value}`;
    U.$('#tb-csv').onclick = () => U.downloadCSV(`trial-balance-${asOf}.csv`, [['รหัส', 'ชื่อบัญชี', 'เดบิต', 'เครดิต'], ...tb.rows.map((r) => [r.code, r.name, r.dr, r.cr]), ['', 'รวม', tb.dr, tb.cr]]);
  }
};

Pages.accountForm = (code) => {
  const a = code ? { ...Store.account(code) } : { type: 'expense', group: 'opex' };
  U.modal({
    title: code ? 'แก้ไขบัญชี' : 'เพิ่มบัญชี', size: 'md',
    body: `<div class="form-grid">
      <div class="field"><label class="req">รหัสบัญชี (4 หลัก)</label><input name="code" value="${U.esc(a.code || '')}" ${code ? 'readonly' : ''} maxlength="6"></div>
      <div class="field"><label>ประเภท</label><select name="type">${Object.entries(ACC.TYPE_LABEL).map(([v, l]) => U.opt(v, l, a.type)).join('')}</select></div>
      <div class="field full"><label class="req">ชื่อบัญชี</label><input name="name" value="${U.esc(a.name || '')}"></div>
      <div class="field full"><label>หมวดในงบการเงิน</label><select name="group">${[['current', 'หมุนเวียน (สินทรัพย์/หนี้สิน)'], ['noncurrent', 'ไม่หมุนเวียน (สินทรัพย์/หนี้สิน)'], ['sales', 'รายได้จากการขาย/บริการ'], ['other', 'รายได้อื่น / ค่าใช้จ่ายอื่น'], ['cost', 'ต้นทุนขาย'], ['opex', 'ค่าใช้จ่ายในการขายและบริหาร'], ['tax', 'ภาษีเงินได้'], ['', '-']].map(([v, l]) => U.opt(v, l, a.group || '')).join('')}</select></div>
      <label class="check full"><input type="checkbox" name="pay" ${a.pay ? 'checked' : ''}> ใช้เป็นบัญชีรับ/จ่ายเงิน (เงินสด/ธนาคาร)</label>
    </div>`,
    footer: `<button class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-primary" data-ok>บันทึก</button>`,
    onOpen: (root, close) => {
      root.querySelector('[data-ok]').onclick = () => {
        const f = U.formData(root);
        if (!/^\d{4,6}$/.test(f.code) || !f.name) return U.toast('กรุณากรอกรหัส (ตัวเลข) และชื่อบัญชี', 'error');
        const first = { asset: '1', liability: '2', equity: '3', revenue: '4', expense: '5' }[f.type];
        if (f.code[0] !== first) return U.toast(`รหัสบัญชี${ACC.TYPE_LABEL[f.type]}ต้องขึ้นต้นด้วย ${first}`, 'error');
        const list = Store.state.accounts;
        if (!code && list.some((x) => x.code === f.code)) return U.toast('รหัสบัญชีซ้ำ', 'error');
        const i = list.findIndex((x) => x.code === (code || f.code));
        if (i >= 0) list[i] = { ...list[i], ...f }; else list.push(f);
        Store.save(); close(); App.render();
      };
    },
  });
};

Pages.accountDelete = async (code) => {
  const used = ACC.buildJournal(U.addDays(U.today(), 36500)).entries.some((e) => e.lines.some((l) => l.acc === code));
  if (used) return U.toast('บัญชีนี้มีรายการเคลื่อนไหว ลบไม่ได้', 'error');
  if (!(await U.confirm(`ลบบัญชี ${code}?`, { danger: true }))) return;
  Store.state.accounts = Store.state.accounts.filter((a) => a.code !== code); Store.save(); App.render();
};

Pages.jvForm = (id) => {
  const j = id ? JSON.parse(JSON.stringify(Store.get('journals', id))) : { date: U.today(), desc: '', lines: [{ acc: '', dr: 0, cr: 0, memo: '' }, { acc: '', dr: 0, cr: 0, memo: '' }] };
  const accOpts = (sel) => `<option value="">— เลือกบัญชี —</option>${[...Store.state.accounts].sort((a, b) => a.code.localeCompare(b.code)).map((a) => U.opt(a.code, `${a.code} ${a.name}`, sel)).join('')}`;
  U.modal({
    title: id ? `แก้ไขใบสำคัญทั่วไป ${U.esc(j.no)}` : 'บันทึกรายการทั่วไป (Journal Voucher)', size: 'xl',
    body: `<div class="form-grid g3">
        <div class="field"><label>วันที่</label><input type="date" id="jv-date" value="${j.date}"></div>
        <div class="field" style="grid-column:span 2"><label>คำอธิบายรายการ</label><input id="jv-desc" value="${U.esc(j.desc)}" placeholder="เช่น บันทึกยอดยกมา / ปรับปรุงค่าใช้จ่ายค้างจ่าย / นำเงินสดฝากธนาคาร"></div>
      </div>
      <div class="flex mt-1 wrap"><span class="small muted">แม่แบบ:</span>
        <button class="btn btn-xs btn-soft" data-tpl="open">ยอดยกมา/ลงทุน</button><button class="btn btn-xs btn-soft" data-tpl="deposit">ฝากเงินสดเข้าธนาคาร</button>
        <button class="btn btn-xs btn-soft" data-tpl="accrue">ค่าใช้จ่ายค้างจ่าย</button><button class="btn btn-xs btn-soft" data-tpl="vat">ปิดภาษีซื้อ-ขาย (ภ.พ.30)</button>
        <button class="btn btn-xs btn-soft" data-tpl="wht">นำส่งภาษีหัก ณ ที่จ่าย/ประกันสังคม</button></div>
      <table class="items-tbl mt-2"><thead><tr><th style="min-width:280px">บัญชี</th><th>คำอธิบาย</th><th class="num" style="width:150px">เดบิต</th><th class="num" style="width:150px">เครดิต</th><th style="width:36px"></th></tr></thead><tbody id="jv-lines"></tbody></table>
      <button class="btn btn-soft btn-sm mt-1" id="jv-add">${U.icon('plus')}เพิ่มบรรทัด</button>
      <div id="jv-total" class="mt-2"></div>`,
    footer: `${id ? `<button class="btn btn-ghost" style="color:var(--danger);margin-right:auto" id="jv-del">${U.icon('trash-2')}ลบ</button>` : ''}<button class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-primary" data-ok>${U.icon('save')}บันทึก</button>`,
    onOpen: (root, close) => {
      const tb = root.querySelector('#jv-lines');
      const render = () => {
        tb.innerHTML = j.lines.map((l, i) => `<tr><td><select data-i="${i}" data-k="acc">${accOpts(l.acc)}</select></td><td><input data-i="${i}" data-k="memo" value="${U.esc(l.memo || '')}"></td>
          <td><input type="number" class="num" step="any" min="0" data-i="${i}" data-k="dr" value="${l.dr || ''}"></td><td><input type="number" class="num" step="any" min="0" data-i="${i}" data-k="cr" value="${l.cr || ''}"></td>
          <td>${j.lines.length > 2 ? `<button class="icon-btn danger" data-del="${i}">${U.icon('x')}</button>` : ''}</td></tr>`).join('');
        U.refreshIcons(); total();
      };
      const total = () => {
        const dr = U.sum(j.lines, (l) => l.dr), cr = U.sum(j.lines, (l) => l.cr); const ok = dr === cr && dr > 0;
        root.querySelector('#jv-total').innerHTML = `<div class="alert ${ok ? 'alert-ok' : 'alert-warn'}">${U.icon(ok ? 'check-circle-2' : 'alert-triangle')}<div>เดบิต <b>${U.money(dr)}</b> · เครดิต <b>${U.money(cr)}</b> ${ok ? '— สมดุล' : `— ผลต่าง ${U.money(U.r2(dr - cr))}`}</div></div>`;
      };
      tb.addEventListener('input', (e) => { const t = e.target; if (!t.dataset.k) return; const l = j.lines[+t.dataset.i]; l[t.dataset.k] = t.type === 'number' ? +t.value || 0 : t.value;
        if (t.dataset.k === 'dr' && +t.value) { l.cr = 0; t.closest('tr').querySelector('[data-k=cr]').value = ''; }
        if (t.dataset.k === 'cr' && +t.value) { l.dr = 0; t.closest('tr').querySelector('[data-k=dr]').value = ''; }
        total(); });
      tb.addEventListener('change', (e) => { const t = e.target; if (t.dataset.k === 'acc') j.lines[+t.dataset.i].acc = t.value; });
      tb.addEventListener('click', (e) => { const b = e.target.closest('[data-del]'); if (b) { j.lines.splice(+b.dataset.del, 1); render(); } });
      root.querySelector('#jv-add').onclick = () => { j.lines.push({ acc: '', dr: 0, cr: 0, memo: '' }); render(); };
      root.querySelectorAll('[data-tpl]').forEach((b) => b.onclick = () => {
        const L = (acc, dr, cr, memo = '') => ({ acc, dr, cr, memo });
        const asOf = root.querySelector('#jv-date').value;
        const t = b.dataset.tpl;
        if (t === 'open') { j.desc = 'บันทึกยอดยกมา / นำเงินมาลงทุน'; j.lines = [L('1110', 0, 0), L('1120', 0, 0), L('3100', 0, 0)]; }
        if (t === 'deposit') { j.desc = 'นำเงินสดฝากธนาคาร'; j.lines = [L('1120', 0, 0), L('1110', 0, 0)]; }
        if (t === 'accrue') { j.desc = 'บันทึกค่าใช้จ่ายค้างจ่าย'; j.lines = [L('5200', 0, 0), L('2120', 0, 0)]; }
        if (t === 'vat') {
          const outV = ACC.balanceOf('2150', asOf), inV = ACC.balanceOf('1170', asOf); const net = U.r2(outV - inV);
          j.desc = 'ปิดบัญชีภาษีซื้อ-ภาษีขาย (ภ.พ.30)';
          j.lines = [L('2150', outV, 0, 'ภาษีขาย'), L('1170', 0, inV, 'ภาษีซื้อ'), net >= 0 ? L('2170', 0, net, 'ภาษีค้างจ่าย') : L('1190', -net, 0, 'ภาษีรอขอคืน')];
        }
        if (t === 'wht') {
          const w = ACC.balanceOf('2140', asOf), sso = ACC.balanceOf('2160', asOf);
          j.desc = 'นำส่งภาษีหัก ณ ที่จ่าย และเงินสมทบประกันสังคม';
          j.lines = [L('2140', w, 0, 'ภ.ง.ด.1/3/53'), L('2160', sso, 0, 'สปส.1-10'), L('1120', 0, U.r2(w + sso))];
        }
        root.querySelector('#jv-desc').value = j.desc; render();
      });
      const del = root.querySelector('#jv-del');
      if (del) del.onclick = async () => { if (await U.confirm('ลบใบสำคัญนี้?', { danger: true })) { Store.remove('journals', id); close(); App.render(); } };
      root.querySelector('[data-ok]').onclick = () => {
        j.date = root.querySelector('#jv-date').value; j.desc = root.querySelector('#jv-desc').value.trim();
        j.lines = j.lines.filter((l) => l.acc && (+l.dr || +l.cr));
        const dr = U.sum(j.lines, (l) => l.dr), cr = U.sum(j.lines, (l) => l.cr);
        if (j.lines.length < 2) { if (!j.lines.length) j.lines = [{ acc: '', dr: 0, cr: 0 }, { acc: '', dr: 0, cr: 0 }]; render(); return U.toast('ต้องมีอย่างน้อย 2 บรรทัด', 'error'); }
        if (dr !== cr) { render(); return U.toast('ยอดเดบิตและเครดิตต้องเท่ากัน', 'error'); }
        if (!j.no) j.no = Store.nextNo('JV', j.date);
        Store.upsert('journals', j); close(); U.toast(`บันทึก ${j.no} แล้ว`); App.render();
      };
      render();
    },
  });
};
