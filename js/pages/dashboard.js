/* ============================================================
 * Dashboard & Getting-started hub
 * ============================================================ */
Pages.dashboard = (view) => {
  App.setTitle('แดชบอร์ด');
  const s = Store.state, c = s.company, today = U.today();
  const fy = ACC.fiscalStart(today);
  const fyEnd = U.addDays(`${+fy.slice(0, 4) + 1}${fy.slice(4)}`, -1);
  const pl = ACC.profitLoss(fy, today);
  const revenue = U.r2(pl.totalRevenue + pl.totalOtherInc);
  const expense = U.r2(pl.totalCost + pl.totalOpex + pl.totalOtherExp + pl.totalTax);
  const cash = U.r2(ACC.balanceOf('1110') + ACC.balanceOf('1120'));
  const ar = ACC.aging('ar'), ap = ACC.aging('ap');

  const D = (t, f) => s.documents.filter((d) => d.type === t && (!f || f(d)));
  const sumT = (arr) => U.sum(arr, (d) => ACC.calcDoc(d).total);
  const overdue = (d) => d.status === 'approved' && !ACC.isPaid(d) && d.dueDate && d.dueDate < today;
  const qtPending = D('QT', (d) => d.status === 'pending' || d.status === 'draft');
  const qtWait = D('QT', (d) => d.status === 'approved' && !ACC.childrenOf(d.id).length);
  const bnUnpaid = D('BN', (d) => d.status === 'approved' && !ACC.isPaid(d));
  const bnOver = bnUnpaid.filter(overdue);
  const poPending = D('PO', (d) => d.status === 'pending' || d.status === 'draft');
  const poWait = D('PO', (d) => d.status === 'approved' && !ACC.childrenOf(d.id).length);
  const billsUnpaid = s.documents.filter((d) => ['GR', 'EX'].includes(d.type) && d.status === 'approved' && !ACC.isPaid(d));
  const billsOver = billsUnpaid.filter(overdue);

  const li = (label, n, amt, href, danger) => `<li class="${danger ? 'danger' : ''}"><a href="${href}">${label} (${n})</a><span class="num">${U.money(amt)}</span></li>`;

  view.innerHTML = `
  <div class="hero">
    <div style="position:relative;z-index:1">
      <p style="margin:0">ยินดีต้อนรับ</p>
      <h2>${U.esc(c.name)}</h2>
      <div class="meta">
        <span>${U.icon('briefcase')} ${c.businessType === 'goods' ? 'ซื้อมาขายไป' : c.businessType === 'mixed' ? 'ขายสินค้าและบริการ' : 'งานบริการ'}</span>
        ${c.taxId ? `<span>${U.icon('hash')} เลขผู้เสียภาษี ${U.esc(c.taxId)}</span>` : ''}
        <span>${U.icon('calendar')} ข้อมูลสรุป ${U.thDateLong(fy)} – ${U.thDateLong(fyEnd)}</span>
      </div>
    </div>
    <div class="hero-actions">
      <a class="btn btn-white" href="#/doc/QT/new">${U.icon('file-plus')} สร้างใบเสนอราคา</a>
      <a class="btn" href="#/doc/EX/new">${U.icon('wallet')} บันทึกค่าใช้จ่าย</a>
    </div>
  </div>

  <div class="grid g4 mt-2">
    ${kpi('รายได้', revenue, 'ปีบัญชีปัจจุบัน', 'trending-up', 'tone-blue')}
    ${kpi('ต้นทุนขาย + ค่าใช้จ่าย', expense, 'ปีบัญชีปัจจุบัน', 'trending-down', 'tone-orange')}
    ${kpi('กำไรสุทธิ', pl.net, pl.net >= 0 ? 'กำไร' : 'ขาดทุน', 'badge-dollar-sign', pl.net >= 0 ? 'tone-green' : 'tone-red', pl.net >= 0 ? 'text-success' : 'text-danger')}
    ${kpi('เงินสดและเงินฝาก', cash, `ลูกหนี้ ${U.money(ar.total)} · เจ้าหนี้ ${U.money(ap.total)}`, 'landmark', 'tone-violet')}
  </div>

  <div class="grid g21 mt-2">
    <div class="card">
      <div class="card-head"><h3>วันนี้ทำอะไรดี?</h3></div>
      <div class="card-body grid g3">
        ${qa('สร้างยอดขาย', 'calculator', 'tone-orange', [['#/doc/QT/new', 'สร้างใบเสนอราคา'], ['#/doc/BN/new', 'สร้างใบวางบิล'], ['#/doc/RC/new', 'สร้างใบเสร็จรับเงิน']])}
        ${qa('รายการใช้จ่าย', 'receipt-text', 'tone-green', [['#/doc/PO/new', 'สร้างใบสั่งซื้อ'], ['#/doc/GR/new', 'สร้างใบรับสินค้า'], ['#/doc/EX/new', 'สร้างค่าใช้จ่าย']])}
        ${qa('จัดการสินค้า', 'package', 'tone-blue', [['#/products?new=1', 'เพิ่มสินค้าใหม่'], ['#/products/stock', 'จัดการสต็อกสินค้า'], ['#/contacts/customer', 'รายชื่อลูกค้า'], ['#/contacts/supplier', 'รายชื่อซัพพลายเออร์']])}
      </div>
    </div>
    <div>
      <div class="card">
        <div class="card-head"><h3>ยอดขาย</h3><a class="btn btn-outline btn-sm" href="#/doc/QT/new">${U.icon('plus')}ใบเสนอราคา</a></div>
        <div class="card-body" style="padding-top:8px;padding-bottom:8px"><ul class="stat-list">
          ${li('รออนุมัติ', qtPending.length, sumT(qtPending), '#/list/QT?f=pending')}
          ${li('รอวางบิล', qtWait.length, sumT(qtWait), '#/list/QT?f=wait')}
          ${li('รอชำระเงิน', bnUnpaid.length, sumT(bnUnpaid), '#/list/BN?f=unpaid')}
          ${li('เกินกำหนดชำระ', bnOver.length, sumT(bnOver), '#/list/BN?f=overdue', true)}
        </ul></div>
      </div>
      <div class="card">
        <div class="card-head"><h3>รายการซื้อและค่าใช้จ่าย</h3><a class="btn btn-outline btn-sm" href="#/doc/PO/new">${U.icon('plus')}ใบสั่งซื้อ</a></div>
        <div class="card-body" style="padding-top:8px;padding-bottom:8px"><ul class="stat-list">
          ${li('รออนุมัติ', poPending.length, sumT(poPending), '#/list/PO?f=pending')}
          ${li('รอรับสินค้า', poWait.length, sumT(poWait), '#/list/PO?f=wait')}
          ${li('รอชำระเงิน', billsUnpaid.length, sumT(billsUnpaid), '#/list/GR?f=unpaid')}
          ${li('เกินกำหนดชำระ', billsOver.length, sumT(billsOver), '#/list/GR?f=overdue', true)}
        </ul></div>
      </div>
    </div>
  </div>

  <div class="grid g21 mt-2">
    <div class="card">
      <div class="card-head"><h3>รายได้ – ค่าใช้จ่ายรายเดือน</h3><span class="muted small">ปีบัญชี ${+fy.slice(0, 4) + 543}</span></div>
      <div class="card-body"><div class="chart-box"><canvas id="ch-monthly"></canvas></div></div>
    </div>
    <div class="card">
      <div class="card-head"><h3>ลูกหนี้คงค้างตามอายุ</h3><a href="#/reports/ar" class="small">ดูรายงาน</a></div>
      <div class="card-body"><div class="chart-box" style="height:220px"><canvas id="ch-aging"></canvas></div>
        <div class="flex between mt-1"><span class="muted">รวมลูกหนี้คงค้าง</span><b class="num">${U.money(ar.total)}</b></div>
      </div>
    </div>
  </div>

  <div class="card mt-2">
    <div class="card-head"><h3>เอกสารล่าสุด</h3></div>
    <div class="card-body p0 table-wrap">${recentDocs()}</div>
  </div>`;

  // Charts
  if (window.Chart) {
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.color = '#64748b';
    const months = [];
    let [y, m] = fy.split('-').map(Number);
    for (let i = 0; i < 12; i++) { months.push(`${y}-${U.pad(m)}`); m++; if (m > 12) { m = 1; y++; } }
    const rev = [], exp = [], prof = [];
    months.forEach((ym) => {
      const [yy, mm] = ym.split('-').map(Number);
      const p = ACC.profitLoss(`${ym}-01`, U.monthEnd(yy, mm));
      const r = U.r2(p.totalRevenue + p.totalOtherInc), e = U.r2(p.totalCost + p.totalOpex + p.totalOtherExp + p.totalTax);
      rev.push(r); exp.push(e); prof.push(U.r2(r - e));
    });
    App.charts.push(new Chart(document.getElementById('ch-monthly'), {
      data: {
        labels: months.map(U.thMonthShort),
        datasets: [
          { type: 'bar', label: 'รายได้', data: rev, backgroundColor: '#3b82f6', borderRadius: 6, maxBarThickness: 22 },
          { type: 'bar', label: 'ค่าใช้จ่าย', data: exp, backgroundColor: '#fdba74', borderRadius: 6, maxBarThickness: 22 },
          { type: 'line', label: 'กำไรสุทธิ', data: prof, borderColor: '#16a34a', backgroundColor: '#16a34a', tension: .35, pointRadius: 3 },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } }, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${U.money(x.raw)}` } } },
        scales: { y: { grid: { color: '#eef2f7' }, ticks: { callback: (v) => (Math.abs(v) >= 1000 ? (v / 1000).toLocaleString() + 'K' : v) } }, x: { grid: { display: false } } } },
    }));
    App.charts.push(new Chart(document.getElementById('ch-aging'), {
      type: 'doughnut',
      data: { labels: ['ยังไม่ถึงกำหนด', '1–30 วัน', '31–60 วัน', '61–90 วัน', '> 90 วัน'], datasets: [{ data: ar.buckets, backgroundColor: ['#3b82f6', '#fbbf24', '#fb923c', '#f87171', '#b91c1c'], borderWidth: 2 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '64%', plugins: { legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11.5 } } }, tooltip: { callbacks: { label: (x) => `${x.label}: ${U.money(x.raw)}` } } } },
    }));
  }

  function kpi(label, value, sub, ic, tone, cls = '') {
    return `<div class="card kpi"><div class="kpi-ic ${tone}">${U.icon(ic)}</div><div><div class="kpi-label">${label}</div>
      <div class="kpi-value ${cls}">${U.money(value)}</div><div class="kpi-sub">${sub}</div></div></div>`;
  }
  function qa(title, ic, tone, links) {
    return `<div class="card qa"><div class="qa-ic ${tone}">${U.icon(ic)}</div><h4>${title}</h4><ul>${links.map(([h, t]) => `<li><a href="${h}">${U.icon('circle-arrow-right')}${t}</a></li>`).join('')}</ul></div>`;
  }
  function recentDocs() {
    const list = [...s.documents].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 8);
    if (!list.length) return `<div class="empty">${U.icon('inbox')}<h4>ยังไม่มีเอกสาร</h4><p>เริ่มสร้างเอกสารแรกของคุณจากปุ่ม “สร้างเอกสารใหม่”</p></div>`;
    return `<table class="tbl"><thead><tr><th>ประเภท</th><th>เลขที่</th><th>วันที่</th><th>คู่ค้า</th><th>สถานะ</th><th class="num">ยอดรวม</th></tr></thead><tbody>
      ${list.map((d) => `<tr class="clickable" onclick="location.hash='#/doc/${d.type}/${d.id}'"><td><span class="tag">${DOC_TYPES[d.type].short}</span></td>
        <td class="doc-link"><a href="#/doc/${d.type}/${d.id}">${U.esc(d.no)}</a></td><td>${U.thDate(d.date)}</td>
        <td>${U.esc((Store.get('contacts', d.contactId) || {}).name || '-')}</td><td>${Docs.statusChip(d)}</td><td class="num">${U.money(ACC.calcDoc(d).total)}</td></tr>`).join('')}
    </tbody></table>`;
  }
};

Pages.start = (view) => {
  App.setTitle('เริ่มต้นใช้งาน');
  const items = [
    ['#/settings', 'store', 'เริ่มต้นใช้งาน', 'ตั้งค่าข้อมูลกิจการ เลขผู้เสียภาษี VAT และเชื่อมต่อ Google'],
    ['#/assets', 'building-2', 'สินทรัพย์', 'การจัดการสินทรัพย์ถาวร และคำนวณค่าเสื่อมราคาอัตโนมัติ'],
    ['#/list/QT', 'circle-dollar-sign', 'การขาย', 'ออกใบเสนอราคา ใบวางบิล ใบกำกับภาษี และใบเสร็จ'],
    ['#/list/EX', 'hand-coins', 'ซื้อและจ่าย', 'ซื้อสินค้าและจ่ายค่าใช้จ่ายต่างๆ พร้อมภาษีซื้อและหัก ณ ที่จ่าย'],
    ['#/products', 'shopping-cart', 'สินค้า', 'การบริการจัดการสินค้านับสต็อก งานบริการ วัตถุดิบ ค่าใช้จ่าย'],
    ['#/payroll', 'id-card', 'จ่ายเงินเดือน', 'วิธีการจ่ายเงินเดือนให้แก่พนักงาน (Payroll) ประกันสังคม ภ.ง.ด.1'],
    ['#/accounting', 'newspaper', 'บัญชี', 'ผังบัญชี สมุดรายวัน บัญชีแยกประเภท และงบทดลอง'],
    ['#/contacts', 'phone', 'จัดการรายชื่อ', 'ตั้งค่าสินค้า รายชื่อ ลูกค้า ผู้ขาย และพนักงาน'],
    ['#/reports', 'pie-chart', 'รีพอร์ต', 'รายงานต่างๆ ทางด้านบัญชีและการบริหาร งบการเงิน ภาษี'],
    ['#/settings', 'settings', 'ตั้งค่าการใช้งาน', 'กำหนดค่าการใช้งานระบบ การเข้าถึงข้อมูล สำรองข้อมูล และการตั้งค่าอื่นๆ'],
  ];
  const steps = [
    ['ตั้งค่ากิจการ', 'ชื่อ ที่อยู่ เลขผู้เสียภาษี การจด VAT', '#/settings', !!Store.state.company.taxId],
    ['เพิ่มรายชื่อลูกค้า/ผู้ขาย', 'ใช้ในการออกเอกสาร', '#/contacts', Store.state.contacts.length > 0],
    ['เพิ่มสินค้า/บริการ', 'ราคาขาย ราคาทุน หน่วยนับ', '#/products', Store.state.products.length > 0],
    ['บันทึกยอดยกมา', 'ทุน เงินสด ธนาคาร ลูกหนี้ เจ้าหนี้', '#/accounting/journal/new', Store.state.journals.length > 0],
    ['เชื่อมต่อ Google Drive', 'สำรองข้อมูลอัตโนมัติ', '#/settings/google', Sync.enabled()],
  ];
  view.innerHTML = `
    <div class="page-head"><div><h2>เริ่มต้นใช้งาน AccFlow</h2><p>คู่มือการเริ่มต้นใช้งานแอพพลิเคชั่น และทางลัดไปยังทุกโมดูล</p></div></div>
    <div class="grid g21">
      <div class="card hub">${items.map(([h, ic, t, d]) => `<a href="${h}">${U.icon(ic)}<div><h4>${t}</h4><p>${d}</p></div></a>`).join('')}</div>
      <div>
        <div class="card"><div class="card-head"><h3>ขั้นตอนตั้งค่า</h3><span class="muted small">${steps.filter((x) => x[3]).length}/${steps.length}</span></div>
          <div class="card-body" style="padding:8px 12px">
          ${steps.map(([t, d, h, ok], i) => `<a href="${h}" class="flex" style="padding:10px 8px;border-radius:9px;color:inherit;text-decoration:none">
            <span class="kpi-ic ${ok ? 'tone-green' : 'tone-blue'}" style="width:32px;height:32px;border-radius:50%">${ok ? U.icon('check') : `<b>${i + 1}</b>`}</span>
            <div class="flex-1"><div class="fw-6">${t}</div><div class="muted small">${d}</div></div>${U.icon('chevron-right', 'muted')}</a>`).join('')}
          </div></div>
        <div class="card"><div class="card-head"><h3>ลำดับการทำงาน</h3></div><div class="card-body small">
          <p class="mt-0"><b>ฝั่งขาย:</b></p><div class="flow"><span class="step">ใบเสนอราคา</span><span class="arrow">→</span><span class="step">ใบวางบิล</span><span class="arrow">→</span><span class="step">ใบเสร็จ/ใบกำกับภาษี</span></div>
          <p><b>ฝั่งซื้อ:</b></p><div class="flow"><span class="step">ใบสั่งซื้อ</span><span class="arrow">→</span><span class="step">ใบรับสินค้า</span><span class="arrow">→</span><span class="step">จ่ายชำระ</span></div>
          <p class="muted">เอกสารที่ “อนุมัติ” แล้วจะถูกลงบัญชีคู่ (เดบิต/เครดิต) อัตโนมัติ และแสดงในงบการเงินทันที</p>
          <button class="btn btn-soft btn-sm mt-1" onclick="Demo.confirmLoad()">${U.icon('sparkles')} โหลดข้อมูลตัวอย่าง</button>
        </div></div>
      </div>
    </div>`;
};
