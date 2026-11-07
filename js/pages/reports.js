/* ============================================================
 * Reports: งบกำไรขาดทุน / งบแสดงฐานะการเงิน / ภาษี / ลูกหนี้ / เจ้าหนี้ / ยอดขาย / สต็อก
 * ============================================================ */
Pages.reports = (view, tab = 'pl', query = {}) => {
  const TABS = [['pl', 'trending-up', 'งบกำไรขาดทุน'], ['bs', 'scale', 'งบแสดงฐานะการเงิน'], ['vat', 'percent', 'ภาษีมูลค่าเพิ่ม (ภ.พ.30)'], ['wht', 'file-minus', 'ภาษีหัก ณ ที่จ่าย'],
    ['ar', 'hand-coins', 'ลูกหนี้คงค้าง'], ['ap', 'receipt', 'เจ้าหนี้คงค้าง'], ['sales', 'bar-chart-3', 'ยอดขาย'], ['stock', 'warehouse', 'สินค้าคงเหลือ']];
  if (!TABS.some((t) => t[0] === tab)) tab = 'pl';
  App.setTitle('รีพอร์ต');
  const today = U.today();
  const fy = ACC.fiscalStart(today);
  const from = query.from || (tab === 'vat' || tab === 'wht' ? U.startOfMonth(today) : fy);
  const to = query.to || today;
  const asOf = query.asOf || today;
  const pointInTime = ['bs', 'ar', 'ap', 'stock'].includes(tab);
  const co = Store.state.company;
  const csvRows = [];

  const presets = pointInTime ? '' : `<div class="seg">${[['เดือนนี้', U.startOfMonth(today), today], ['เดือนก่อน', U.startOfMonth(U.addDays(U.startOfMonth(today), -1)), U.addDays(U.startOfMonth(today), -1)], ['ปีบัญชีนี้', fy, today], ['ปีก่อน', ACC.fiscalStart(U.addDays(fy, -1)), U.addDays(fy, -1)]]
    .map(([l, f, t]) => `<button class="${from === f && to === t ? 'active' : ''}" onclick="location.hash='#/reports/${tab}?from=${f}&to=${t}'">${l}</button>`).join('')}</div>`;

  view.innerHTML = `
  <div class="page-head"><div><h2>รีพอร์ต</h2><p>รายงานทางบัญชี ภาษี และการบริหาร คำนวณจากรายการบัญชีแบบเรียลไทม์</p></div></div>
  <div class="card">
    <div class="tabs">${TABS.map(([k, ic, l]) => `<a href="#/reports/${k}" class="${tab === k ? 'active' : ''}">${U.icon(ic)}${l}</a>`).join('')}</div>
    <div class="toolbar">
      ${pointInTime ? `<div class="flex"><span class="small muted">ณ วันที่</span><input type="date" id="r-asof" value="${asOf}" style="width:auto"></div>`
        : `<div class="flex"><span class="small muted">ตั้งแต่</span><input type="date" id="r-from" value="${from}" style="width:auto"><span class="small muted">ถึง</span><input type="date" id="r-to" value="${to}" style="width:auto"></div>${presets}`}
      <div class="flex-1"></div>
      <button class="btn btn-outline btn-sm" id="r-csv">${U.icon('download')}CSV</button>
      <button class="btn btn-outline btn-sm" onclick="window.print()">${U.icon('printer')}พิมพ์</button>
    </div>
    <div id="r-body"></div>
  </div>`;

  const head = (title, period) => `<div class="report-title"><h3>${U.esc(co.name)}</h3><p><b>${title}</b><br>${period}</p></div>`;
  const periodTxt = `สำหรับงวดตั้งแต่วันที่ ${U.thDateLong(from)} ถึงวันที่ ${U.thDateLong(to)}`;
  const asOfTxt = `ณ วันที่ ${U.thDateLong(asOf)}`;
  const body = U.$('#r-body');
  const fsRows = (rows) => rows.map((r) => { csvRows.push([r.code, r.name, r.amount]); return `<tr class="i"><td><span class="code">${r.code}</span>${U.esc(r.name)}</td><td class="num">${U.acc(r.amount)}</td></tr>`; }).join('');
  const fsTotal = (label, v, cls = 't') => { csvRows.push(['', label, v]); return `<tr class="${cls}"><td>${label}</td><td class="num">${U.acc(v)}</td></tr>`; };
  const fsHead = (label) => { csvRows.push(['', label, '']); return `<tr class="h"><td colspan="2">${label}</td></tr>`; };

  if (tab === 'pl') {
    const p = ACC.profitLoss(from, to);
    body.innerHTML = `<div class="report">${head('งบกำไรขาดทุน', periodTxt)}<table class="fs">
      ${fsHead('รายได้')}${fsRows(p.revenue)}${fsTotal('รวมรายได้จากการขายและบริการ', p.totalRevenue)}
      ${fsHead('ต้นทุนขายและบริการ')}${fsRows(p.cost)}${fsTotal('รวมต้นทุนขาย', p.totalCost)}
      ${fsTotal('กำไรขั้นต้น', p.gross, 'gt')}
      ${fsHead('ค่าใช้จ่ายในการขายและบริหาร')}${fsRows(p.opex)}${fsTotal('รวมค่าใช้จ่ายในการขายและบริหาร', p.totalOpex)}
      ${fsTotal('กำไร (ขาดทุน) จากการดำเนินงาน', p.operating)}
      ${p.otherIncome.length ? fsHead('รายได้อื่น') + fsRows(p.otherIncome) : ''}${p.otherExp.length ? fsHead('ค่าใช้จ่ายอื่น') + fsRows(p.otherExp) : ''}
      ${fsTotal('กำไร (ขาดทุน) ก่อนภาษีเงินได้', p.beforeTax)}
      ${p.tax.length ? fsRows(p.tax) : ''}
      ${fsTotal('กำไร (ขาดทุน) สุทธิ', p.net, 'gt')}
    </table>
    <div class="grid g3" style="padding:20px">
      ${ratio('อัตรากำไรขั้นต้น', p.totalRevenue ? (p.gross / p.totalRevenue) * 100 : 0)}${ratio('อัตรากำไรจากการดำเนินงาน', p.totalRevenue ? (p.operating / p.totalRevenue) * 100 : 0)}${ratio('อัตรากำไรสุทธิ', p.totalRevenue ? (p.net / p.totalRevenue) * 100 : 0)}
    </div></div>`;
  } else if (tab === 'bs') {
    const b = ACC.balanceSheet(asOf);
    body.innerHTML = `<div class="report">${head('งบแสดงฐานะการเงิน', asOfTxt)}
      <div style="padding:0 20px"><div class="alert ${b.balanced ? 'alert-ok' : 'alert-err'}">${U.icon(b.balanced ? 'check-circle-2' : 'alert-circle')}<div>${b.balanced ? 'สินทรัพย์ = หนี้สิน + ส่วนของเจ้าของ' : 'งบไม่สมดุล — กรุณาตรวจสอบ'} (${U.money(b.totalAssets)})</div></div></div>
      <table class="fs">
      ${fsHead('สินทรัพย์หมุนเวียน')}${fsRows(b.curA)}${fsTotal('รวมสินทรัพย์หมุนเวียน', b.totalCurA)}
      ${fsHead('สินทรัพย์ไม่หมุนเวียน')}${fsRows(b.nonA)}${fsTotal('รวมสินทรัพย์ไม่หมุนเวียน', b.totalNonA)}
      ${fsTotal('รวมสินทรัพย์', b.totalAssets, 'gt')}
      ${fsHead('หนี้สินหมุนเวียน')}${fsRows(b.curL)}${fsTotal('รวมหนี้สินหมุนเวียน', b.totalCurL)}
      ${b.nonL.length ? fsHead('หนี้สินไม่หมุนเวียน') + fsRows(b.nonL) + fsTotal('รวมหนี้สินไม่หมุนเวียน', b.totalNonL) : ''}
      ${fsTotal('รวมหนี้สิน', b.totalLiab)}
      ${fsHead('ส่วนของเจ้าของ')}${fsRows(b.eq)}${fsTotal('รวมส่วนของเจ้าของ', b.totalEq)}
      ${fsTotal('รวมหนี้สินและส่วนของเจ้าของ', b.totalLE, 'gt')}
      </table>
      <div class="grid g3" style="padding:20px">
        ${ratio('อัตราส่วนทุนหมุนเวียน', b.totalCurL ? b.totalCurA / b.totalCurL : 0, 'เท่า')}${ratio('หนี้สินต่อทุน (D/E)', b.totalEq ? b.totalLiab / b.totalEq : 0, 'เท่า')}${ratio('เงินทุนหมุนเวียน', b.totalCurA - b.totalCurL, 'บาท')}
      </div></div>`;
  } else if (tab === 'vat') {
    const v = ACC.vatReport(from, to);
    const t = (rows, title) => `<h4 style="padding:16px 20px 8px">${title}</h4><div class="table-wrap"><table class="tbl compact"><thead><tr><th>#</th><th>วันที่</th><th>เลขที่ใบกำกับ</th><th>ชื่อผู้ซื้อ/ผู้ขาย</th><th>เลขผู้เสียภาษี</th><th>สาขา</th><th class="num">มูลค่าสินค้า/บริการ</th><th class="num">ภาษี</th></tr></thead><tbody>
      ${rows.map((r, i) => { const c = Store.get('contacts', r.contactId) || {}; csvRows.push([title, r.date, r.docNo, c.name, c.taxId, c.branch, r.base, r.vat]); return `<tr><td>${i + 1}</td><td>${U.thDate(r.date)}</td><td>${U.esc(r.docNo)}</td><td>${U.esc(c.name || '-')}</td><td>${U.esc(c.taxId || '')}</td><td>${U.esc(c.branch || '')}</td><td class="num">${U.money(r.base)}</td><td class="num">${U.money(r.vat)}</td></tr>`; }).join('') || '<tr><td colspan="8" class="center muted">ไม่มีรายการ</td></tr>'}
      </tbody><tfoot><tr><td colspan="6">รวม</td><td class="num">${U.money(U.sum(rows, (r) => r.base))}</td><td class="num">${U.money(U.sum(rows, (r) => r.vat))}</td></tr></tfoot></table></div>`;
    body.innerHTML = `${head('รายงานภาษีมูลค่าเพิ่ม', periodTxt)}
      <div class="grid g3" style="padding:0 20px">
        ${box('ภาษีขาย', v.outVat, `ฐานภาษี ${U.money(v.outBase)}`, 'tone-blue', 'arrow-up-right')}${box('ภาษีซื้อ', v.inVat, `ฐานภาษี ${U.money(v.inBase)}`, 'tone-orange', 'arrow-down-left')}
        ${box(v.net >= 0 ? 'ภาษีที่ต้องชำระ (ภ.พ.30)' : 'ภาษีชำระเกิน (ขอคืน/ยกไป)', Math.abs(v.net), 'ยื่นภายในวันที่ 15 ของเดือนถัดไป (ออนไลน์ 23)', v.net >= 0 ? 'tone-red' : 'tone-green', 'landmark')}
      </div>
      ${co.vatPoint === 'payment' ? `<div style="padding:12px 20px 0"><div class="alert alert-info">${U.icon('info')}<div>ตั้งค่าจุดความรับผิดภาษีขาย “เมื่อรับชำระเงิน” (กิจการบริการ) — ภาษีขายรับรู้ตามใบเสร็จรับเงิน/ใบกำกับภาษี ส่วนที่ยังไม่รับชำระอยู่ในบัญชี 2155 (${U.money(ACC.balanceOf('2155', to))})</div></div></div>` : ''}
      ${t(v.output, 'รายงานภาษีขาย')}${t(v.input, 'รายงานภาษีซื้อ')}`;
  } else if (tab === 'wht') {
    const w = ACC.whtReport(from, to);
    const forms = U.groupBy(w.withheld, (r) => r.form);
    const row = (r, i) => { const c = r.employeeId ? Store.get('employees', r.employeeId) || {} : Store.get('contacts', r.contactId) || {};
      csvRows.push([r.form || 'ถูกหัก', r.date, r.docNo, c.name, c.taxId || c.idCard, r.base, r.rate, r.wht]);
      return `<tr><td>${i + 1}</td><td>${U.thDate(r.date)}</td><td>${U.esc(r.docNo)}</td><td>${U.esc(c.name || '-')}</td><td>${U.esc(c.taxId || c.idCard || '')}</td><td class="num">${U.money(r.base)}</td><td class="num">${r.rate != null ? r.rate + '%' : '-'}</td><td class="num">${U.money(r.wht)}</td></tr>`; };
    const tbl = (rows, title) => `<h4 style="padding:16px 20px 8px">${title}</h4><div class="table-wrap"><table class="tbl compact"><thead><tr><th>#</th><th>วันที่จ่าย</th><th>เอกสาร</th><th>ชื่อ</th><th>เลขผู้เสียภาษี</th><th class="num">เงินได้</th><th class="num">อัตรา</th><th class="num">ภาษีที่หัก</th></tr></thead><tbody>
      ${rows.map(row).join('') || '<tr><td colspan="8" class="center muted">ไม่มีรายการ</td></tr>'}</tbody><tfoot><tr><td colspan="5">รวม</td><td class="num">${U.money(U.sum(rows, (r) => r.base))}</td><td></td><td class="num">${U.money(U.sum(rows, (r) => r.wht))}</td></tr></tfoot></table></div>`;
    body.innerHTML = `${head('รายงานภาษีเงินได้หัก ณ ที่จ่าย', periodTxt)}
      <div class="grid g4" style="padding:0 20px">${['ภ.ง.ด.1', 'ภ.ง.ด.3', 'ภ.ง.ด.53'].map((f) => box(f, U.sum(forms[f] || [], (r) => r.wht), `${(forms[f] || []).length} รายการ · นำส่งภายในวันที่ 7`, 'tone-violet', 'file-minus')).join('')}
      ${box('ถูกหัก ณ ที่จ่าย (เครดิตภาษี)', U.sum(w.deducted, (r) => r.wht), 'ใช้เครดิตตอนยื่น ภ.ง.ด.50/51', 'tone-green', 'file-plus')}</div>
      ${['ภ.ง.ด.1', 'ภ.ง.ด.3', 'ภ.ง.ด.53'].map((f) => tbl(forms[f] || [], `${f} — ${f === 'ภ.ง.ด.1' ? 'เงินเดือนพนักงาน' : f === 'ภ.ง.ด.3' ? 'จ่ายบุคคลธรรมดา' : 'จ่ายนิติบุคคล'}`)).join('')}
      ${tbl(w.deducted, 'ภาษีที่ถูกลูกค้าหัก ณ ที่จ่าย')}`;
  } else if (tab === 'ar' || tab === 'ap') {
    const a = ACC.aging(tab, asOf);
    const labels = ['ยังไม่ถึงกำหนด', '1–30 วัน', '31–60 วัน', '61–90 วัน', 'มากกว่า 90 วัน'];
    const byC = U.groupBy(a.rows, (r) => r.doc.contactId);
    csvRows.push(['คู่ค้า', 'เอกสาร', 'วันที่', 'ครบกำหนด', 'เกินกำหนด(วัน)', ...labels, 'รวม']);
    body.innerHTML = `${head(tab === 'ar' ? 'รายงานลูกหนี้คงค้างแยกตามอายุหนี้' : 'รายงานเจ้าหนี้คงค้างแยกตามอายุหนี้', asOfTxt)}
      <div class="grid g5" style="padding:0 20px">${labels.map((l, i) => `<div class="card kpi" style="padding:12px 14px"><div><div class="kpi-label">${l}</div><div class="kpi-value" style="font-size:18px;color:${['#2563eb', '#d97706', '#ea580c', '#dc2626', '#991b1b'][i]}">${U.money(a.buckets[i])}</div></div></div>`).join('')}</div>
      <div class="table-wrap mt-2"><table class="tbl compact"><thead><tr><th>${tab === 'ar' ? 'ลูกค้า' : 'ผู้ขาย'} / เอกสาร</th><th>วันที่</th><th>ครบกำหนด</th><th class="num">เกินกำหนด</th>${labels.map((l) => `<th class="num">${l}</th>`).join('')}<th class="num">รวม</th></tr></thead><tbody>
      ${Object.entries(byC).map(([cid, rows]) => { const c = Store.get('contacts', cid) || {}; return `<tr class="group"><td colspan="4">${U.esc(c.name || '-')}</td>${[0, 1, 2, 3, 4].map((b) => `<td class="num">${U.money(U.sum(rows.filter((r) => r.bucket === b), (r) => r.total))}</td>`).join('')}<td class="num">${U.money(U.sum(rows, (r) => r.total))}</td></tr>
        ${rows.map((r) => { csvRows.push([c.name, r.doc.no, r.doc.date, r.due, Math.max(0, r.days), ...[0, 1, 2, 3, 4].map((b) => (r.bucket === b ? r.total : '')), r.total]);
          return `<tr><td style="padding-left:28px"><a href="#/doc/${r.doc.type}/${r.doc.id}">${U.esc(r.doc.no)}</a></td><td>${U.thDate(r.doc.date)}</td><td>${U.thDate(r.due)}</td><td class="num ${r.days > 0 ? 'text-danger' : ''}">${r.days > 0 ? r.days + ' วัน' : '-'}</td>
          ${[0, 1, 2, 3, 4].map((b) => `<td class="num">${r.bucket === b ? U.money(r.total) : ''}</td>`).join('')}<td class="num">${U.money(r.total)}</td></tr>`; }).join('')}`; }).join('') || '<tr><td colspan="10" class="center muted" style="padding:30px">ไม่มียอดคงค้าง 🎉</td></tr>'}
      </tbody><tfoot><tr><td colspan="4">รวมทั้งสิ้น</td>${a.buckets.map((v) => `<td class="num">${U.money(v)}</td>`).join('')}<td class="num">${U.money(a.total)}</td></tr></tfoot></table></div>
      <div style="padding:12px 20px" class="small muted">ยอดบัญชี ${tab === 'ar' ? '1130 ลูกหนี้การค้า' : '2110 เจ้าหนี้การค้า'} ณ วันที่ = ${U.money(ACC.balanceOf(tab === 'ar' ? '1130' : '2110', asOf))}</div>`;
  } else if (tab === 'sales') {
    const ds = Store.state.documents.filter((d) => d.status === 'approved' && (d.type === 'BN' || (d.type === 'RC' && !d.refId)) && d.date >= from && d.date <= to);
    const byCust = {}, byProd = {};
    ds.forEach((d) => {
      const c = ACC.calcDoc(d);
      const cc = (byCust[d.contactId] = byCust[d.contactId] || { n: 0, base: 0, vat: 0, total: 0 });
      cc.n++; cc.base = U.r2(cc.base + c.base); cc.vat = U.r2(cc.vat + c.vat); cc.total = U.r2(cc.total + c.total);
      c.lines.forEach((l) => { const k = l.productId || l.description; const p = (byProd[k] = byProd[k] || { name: l.description, qty: 0, base: 0 }); p.qty += +l.qty || 0; p.base = U.r2(p.base + l.base); });
    });
    const custRows = Object.entries(byCust).sort((a, b) => b[1].base - a[1].base);
    const prodRows = Object.entries(byProd).sort((a, b) => b[1].base - a[1].base);
    const tot = U.sum(custRows, (r) => r[1].base);
    custRows.forEach(([id, r]) => csvRows.push(['ลูกค้า', (Store.get('contacts', id) || {}).name, r.n, r.base, r.vat, r.total]));
    prodRows.forEach(([k, r]) => csvRows.push(['สินค้า', r.name, r.qty, r.base]));
    body.innerHTML = `${head('รายงานยอดขาย', periodTxt)}
      <div class="grid g2" style="padding:0 20px 20px">
        <div><h4 class="mb-2" style="margin-bottom:8px">ตามลูกค้า</h4><table class="tbl compact"><thead><tr><th>ลูกค้า</th><th class="num">เอกสาร</th><th class="num">ยอดขาย (ก่อน VAT)</th><th class="num">%</th></tr></thead><tbody>
          ${custRows.map(([id, r]) => `<tr><td>${U.esc((Store.get('contacts', id) || {}).name || '-')}</td><td class="num">${r.n}</td><td class="num">${U.money(r.base)}</td><td class="num">${tot ? ((r.base / tot) * 100).toFixed(1) : 0}%</td></tr>`).join('') || '<tr><td colspan="4" class="center muted">ไม่มีข้อมูล</td></tr>'}
          </tbody><tfoot><tr><td>รวม</td><td class="num">${ds.length}</td><td class="num">${U.money(tot)}</td><td></td></tr></tfoot></table></div>
        <div><h4 style="margin-bottom:8px">ตามสินค้า/บริการ</h4><table class="tbl compact"><thead><tr><th>สินค้า/บริการ</th><th class="num">จำนวน</th><th class="num">ยอดขาย (ก่อน VAT)</th></tr></thead><tbody>
          ${prodRows.map(([, r]) => `<tr><td>${U.esc(r.name)}</td><td class="num">${U.qty(r.qty)}</td><td class="num">${U.money(r.base)}</td></tr>`).join('') || '<tr><td colspan="3" class="center muted">ไม่มีข้อมูล</td></tr>'}
          </tbody></table></div>
      </div><div style="padding:0 20px 20px"><div class="chart-box"><canvas id="ch-sales"></canvas></div></div>`;
    if (window.Chart && custRows.length) {
      App.charts.push(new Chart(U.$('#ch-sales'), { type: 'bar', data: { labels: custRows.slice(0, 10).map(([id]) => ((Store.get('contacts', id) || {}).name || '-').slice(0, 24)), datasets: [{ label: 'ยอดขาย', data: custRows.slice(0, 10).map(([, r]) => r.base), backgroundColor: '#3b82f6', borderRadius: 6 }] },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } }));
    }
  } else if (tab === 'stock') {
    const inv = ACC.inventory();
    const goods = Store.state.products.filter((p) => p.type === 'goods');
    const rows = goods.map((p) => { const ms = inv.moves.filter((m) => m.productId === p.id && m.date <= asOf); const last = ms[ms.length - 1]; return { p, qty: last ? last.balQty : 0, value: last ? last.balValue : 0 }; });
    rows.forEach((r) => csvRows.push([r.p.code, r.p.name, r.p.unit, r.qty, r.qty ? U.r2(r.value / r.qty) : 0, r.value]));
    body.innerHTML = `${head('รายงานสินค้าคงเหลือ (ต้นทุนถัวเฉลี่ยเคลื่อนที่)', asOfTxt)}<div class="table-wrap"><table class="tbl compact"><thead><tr><th>รหัส</th><th>สินค้า</th><th>หน่วย</th><th class="num">คงเหลือ</th><th class="num">ทุนเฉลี่ย</th><th class="num">มูลค่า</th></tr></thead><tbody>
      ${rows.map((r) => `<tr><td>${U.esc(r.p.code)}</td><td>${U.esc(r.p.name)}</td><td>${U.esc(r.p.unit || '')}</td><td class="num">${U.qty(r.qty)}</td><td class="num">${U.money(r.qty ? r.value / r.qty : 0)}</td><td class="num">${U.money(r.value)}</td></tr>`).join('') || '<tr><td colspan="6" class="center muted">ไม่มีสินค้าประเภทนับสต็อก</td></tr>'}
      </tbody><tfoot><tr><td colspan="5">รวมมูลค่าสินค้าคงเหลือ</td><td class="num">${U.money(U.sum(rows, (r) => r.value))}</td></tr></tfoot></table></div>`;
  }

  function ratio(label, v, unit = '%') { return `<div class="card kpi" style="padding:14px 16px"><div><div class="kpi-label">${label}</div><div class="kpi-value" style="font-size:19px">${unit === 'บาท' ? U.money(v) : (+v || 0).toFixed(2)} <span class="small muted">${unit}</span></div></div></div>`; }
  function box(label, v, sub, tone, ic) { return `<div class="card kpi"><div class="kpi-ic ${tone}">${U.icon(ic)}</div><div><div class="kpi-label">${label}</div><div class="kpi-value" style="font-size:20px">${U.money(v)}</div><div class="kpi-sub">${sub}</div></div></div>`; }

  if (pointInTime) U.$('#r-asof').onchange = (e) => location.hash = `#/reports/${tab}?asOf=${e.target.value}`;
  else { const go = () => location.hash = `#/reports/${tab}?from=${U.$('#r-from').value}&to=${U.$('#r-to').value}`; U.$('#r-from').onchange = go; U.$('#r-to').onchange = go; }
  U.$('#r-csv').onclick = () => U.downloadCSV(`report-${tab}-${pointInTime ? asOf : from + '_' + to}.csv`, csvRows);
};
