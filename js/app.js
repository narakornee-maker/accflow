/* ============================================================
 * AccFlow — App shell & hash router
 * ============================================================ */
const App = {
  NAV: [
    { sec: 'ภาพรวม' },
    { href: '#/dashboard', icon: 'layout-dashboard', label: 'แดชบอร์ด' },
    { href: '#/start', icon: 'store', label: 'เริ่มต้นใช้งาน' },
    { sec: 'การขาย' },
    { href: '#/list/QT', icon: 'file-text', label: 'ใบเสนอราคา', badge: () => ACC_badge('QT') },
    { href: '#/list/BN', icon: 'file-spreadsheet', label: 'ใบวางบิล / ใบแจ้งหนี้', badge: () => ACC_badge('BN') },
    { href: '#/list/RC', icon: 'receipt', label: 'ใบเสร็จรับเงิน' },
    { sec: 'ซื้อและจ่าย' },
    { href: '#/list/PO', icon: 'shopping-cart', label: 'ใบสั่งซื้อ' },
    { href: '#/list/GR', icon: 'package-check', label: 'ใบรับสินค้า', badge: () => ACC_badge('GR') },
    { href: '#/list/EX', icon: 'wallet', label: 'ค่าใช้จ่าย', badge: () => ACC_badge('EX') },
    { sec: 'การจัดการ' },
    { href: '#/products', icon: 'boxes', label: 'สินค้าและสต็อก' },
    { href: '#/contacts', icon: 'contact', label: 'จัดการรายชื่อ' },
    { href: '#/payroll', icon: 'id-card', label: 'จ่ายเงินเดือน' },
    { href: '#/assets', icon: 'building-2', label: 'สินทรัพย์' },
    { sec: 'บัญชีและรายงาน' },
    { href: '#/accounting', icon: 'book-open', label: 'บัญชี' },
    { href: '#/reports', icon: 'pie-chart', label: 'รีพอร์ต' },
    { href: '#/settings', icon: 'settings', label: 'ตั้งค่าการใช้งาน' },
  ],

  charts: [],

  init() {
    const had = Store.load();
    if (!had) Store.save({ silent: true, sync: false });
    window.addEventListener('hashchange', () => this.render());
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.dropdown')) document.querySelectorAll('.dropdown.open').forEach((d) => d.classList.remove('open'));
    });
    this.renderNewDocMenu();
    if (!location.hash) location.hash = had ? '#/dashboard' : '#/start';
    this.render();
    Sync.init();
    if (!had) setTimeout(() => this.welcome(), 400);
  },

  welcome() {
    U.modal({
      title: 'ยินดีต้อนรับสู่ AccFlow 👋', size: 'md',
      body: `<p>โปรแกรมบัญชีออนไลน์สำหรับ SME — ออกเอกสารขาย/ซื้อ แล้วระบบ <b>ลงบัญชีคู่อัตโนมัติ</b> พร้อมงบการเงินและรายงานภาษี</p>
        <div class="alert alert-info mt-2">${U.icon('lightbulb')}<div>เริ่มต้นด้วยการ <b>ตั้งค่าข้อมูลกิจการ</b> หรือ <b>โหลดข้อมูลตัวอย่าง</b> เพื่อทดลองใช้งานทุกฟังก์ชัน (ลบทิ้งได้ภายหลัง)</div></div>`,
      footer: `<button class="btn btn-outline" data-demo>${U.icon('sparkles')} โหลดข้อมูลตัวอย่าง</button><button class="btn btn-primary" data-setup>${U.icon('settings')} ตั้งค่ากิจการ</button>`,
      onOpen: (root, close) => {
        root.querySelector('[data-demo]').onclick = () => { Demo.load(); close(); location.hash = '#/dashboard'; this.render(); U.toast('โหลดข้อมูลตัวอย่างแล้ว'); };
        root.querySelector('[data-setup]').onclick = () => { close(); location.hash = '#/settings'; };
      },
    });
  },

  renderNewDocMenu() {
    const m = document.getElementById('new-doc-menu');
    const item = (t) => `<a href="#/doc/${t}/new">${U.icon(DOC_TYPES[t].icon)}${DOC_TYPES[t].label}</a>`;
    m.innerHTML = `<div class="lbl">การขาย</div>${['QT', 'BN', 'RC'].map(item).join('')}<div class="sep"></div>
      <div class="lbl">ซื้อและจ่าย</div>${['PO', 'GR', 'EX'].map(item).join('')}<div class="sep"></div>
      <a href="#/accounting/journal/new">${U.icon('book-plus')}บันทึกบัญชีรายวัน (JV)</a>
      <a href="#/payroll/run/new">${U.icon('id-card')}รอบจ่ายเงินเดือน</a>`;
    m.addEventListener('click', () => document.getElementById('new-doc-dd').classList.remove('open'));
  },

  toggleDropdown(id, e) { e.stopPropagation(); const el = document.getElementById(id); const open = el.classList.contains('open'); document.querySelectorAll('.dropdown.open').forEach((d) => d.classList.remove('open')); if (!open) el.classList.add('open'); },

  renderNav() {
    const hash = location.hash || '#/dashboard';
    const path = hash.split('?')[0];
    const isActive = (href) => {
      if (path === href) return true;
      const m = path.match(/^#\/doc\/(\w+)/);
      if (m && href === `#/list/${m[1]}`) return true;
      return href !== '#/dashboard' && path.startsWith(href + '/');
    };
    document.getElementById('nav').innerHTML = this.NAV.map((n) => {
      if (n.sec) return `<div class="nav-sec">${n.sec}</div>`;
      const b = n.badge ? n.badge() : 0;
      return `<a href="${n.href}" class="${isActive(n.href) ? 'active' : ''}">${U.icon(n.icon)}<span>${n.label}</span>${b ? `<span class="badge">${b}</span>` : ''}</a>`;
    }).join('');
    const c = Store.state.company;
    document.getElementById('user-chip').innerHTML = `<div class="avatar">${U.esc((c.name || 'A').replace(/^(บริษัท|ห้างหุ้นส่วน(จำกัด|สามัญ)?|หจก\.?)\s*/, '').slice(0, 1))}</div><span>${U.esc(c.name)}</span>`;
    document.getElementById('sidebar-foot').innerHTML = `ปีบัญชี ${U.thMonth(ACC.fiscalStart(U.today()).slice(0, 7))} ·
      ${c.vatRegistered ? 'จด VAT ' + c.vatRate + '%' : 'ไม่จด VAT'}<br><span style="opacity:.7">ข้อมูลเก็บในเครื่อง${Sync.enabled() ? ' + Google' : ''}</span>`;
  },

  setTitle(t) { document.getElementById('page-title').textContent = t; document.title = `${t} — AccFlow`; },

  render() {
    this.charts.forEach((c) => c.destroy()); this.charts = [];
    document.body.classList.remove('nav-open');
    const hash = location.hash.slice(1) || '/dashboard';
    const [pathPart, qs] = hash.split('?');
    const parts = pathPart.split('/').filter(Boolean);
    const query = Object.fromEntries(new URLSearchParams(qs || ''));
    const view = document.getElementById('view');
    const routes = {
      dashboard: () => Pages.dashboard(view),
      start: () => Pages.start(view),
      list: () => Pages.docList(view, parts[1], query),
      doc: () => Pages.docEdit(view, parts[1], parts[2], query),
      contacts: () => Pages.contacts(view, parts[1], query),
      products: () => Pages.products(view, parts[1], query),
      payroll: () => Pages.payroll(view, parts[1], parts[2], query),
      assets: () => Pages.assets(view, query),
      accounting: () => Pages.accounting(view, parts[1], parts[2], query),
      reports: () => Pages.reports(view, parts[1], query),
      settings: () => Pages.settings(view, parts[1]),
    };
    try {
      (routes[parts[0]] || routes.dashboard)();
    } catch (err) {
      console.error(err);
      view.innerHTML = `<div class="card"><div class="empty">${U.icon('bug')}<h4>เกิดข้อผิดพลาด</h4><p>${U.esc(err.message)}</p></div></div>`;
    }
    this.renderNav();
    U.refreshIcons();
    Sync.setStatus(Sync.status === 'off' && Sync.enabled() ? 'idle' : Sync.status);
    window.scrollTo(0, 0);
  },

  go(hash) { if (location.hash === hash) this.render(); else location.hash = hash; },
};

/** จำนวนเอกสารที่ต้องดำเนินการ (badge บนเมนู) */
function ACC_badge(type) {
  const today = U.today();
  const ds = Store.state.documents.filter((d) => d.type === type);
  if (type === 'QT') return ds.filter((d) => d.status === 'pending').length;
  return ds.filter((d) => d.status === 'approved' && !ACC.isPaid(d) && d.dueDate && d.dueDate < today).length;
}

document.addEventListener('DOMContentLoaded', () => App.init());
