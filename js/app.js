/* ============================================================
 * AccFlow — App shell & hash router
 * ============================================================ */
/** โลโก้/ชื่อบนเมนู — ตั้งค่าได้ที่ ตั้งค่า → ข้อมูลกิจการ (จำไว้ในเครื่องเพื่อแสดงในหน้า Login ด้วย) */
const Brand = {
  KEY: 'accflow_brand',
  DEF: { name: 'VoltGrid', sub: 'Energy & Solutions · บัญชี', logo: '' },
  fromState() { const c = Store.state.company; return { name: c.brandName || this.DEF.name, sub: c.brandSub ?? this.DEF.sub, logo: c.appLogo || '' }; },
  cached() { try { return { ...this.DEF, ...(JSON.parse(localStorage.getItem(this.KEY)) || {}) }; } catch (e) { return { ...this.DEF }; } },
  logoHtml(b) { return b.logo ? `<img src="${b.logo}" alt="">` : U.icon('zap'); },
  /** แสดงบนแถบเมนู + favicon และจำค่าไว้ */
  apply() {
    const b = this.fromState();
    try { localStorage.setItem(this.KEY, JSON.stringify(b)); } catch (e) { /* noop */ }
    const el = document.getElementById('brand-logo');
    if (el) { el.innerHTML = this.logoHtml(b); el.classList.toggle('has-img', !!b.logo); }
    const n = document.getElementById('brand-name'); if (n) n.textContent = b.name;
    const sub = document.getElementById('brand-sub'); if (sub) { sub.textContent = b.sub; sub.style.display = b.sub ? '' : 'none'; }
    this.favicon(b);
  },
  /** ไอคอนบนแท็บเบราว์เซอร์: ใช้โลโก้ที่ตั้งไว้ ถ้าไม่มีใช้ไอคอนเริ่มต้น */
  favicon(b = this.cached()) {
    const fav = document.getElementById('favicon'); if (!fav) return;
    if (!this._fav) this._fav = fav.getAttribute('href');
    fav.setAttribute('href', b.logo || this._fav);
    const at = document.getElementById('apple-icon'); if (at) { if (!this._at) this._at = at.getAttribute('href'); at.setAttribute('href', b.logo || this._at); }
  },
};

const App = {
  NAV: [
    { sec: 'ภาพรวม' },
    { href: '#/dashboard', icon: 'layout-dashboard', label: 'แดชบอร์ด' },
    { href: '#/start', icon: 'store', label: 'เริ่มต้นใช้งาน' },
    { sec: 'การขาย' },
    { href: '#/list/QT', icon: 'file-text', label: 'ใบเสนอราคา', badge: () => ACC_badge('QT') },
    { href: '#/list/BN', icon: 'file-spreadsheet', label: 'ใบวางบิล / ใบแจ้งหนี้', badge: () => ACC_badge('BN') },
    { href: '#/list/RC', icon: 'receipt', label: 'ใบเสร็จรับเงิน' },
    { href: '#/letters', icon: 'file-check-2', label: 'หนังสือส่งมอบงาน' },
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
    { href: '#/settings', icon: 'settings', label: 'ตั้งค่าการใช้งาน', admin: true },
  ],

  charts: [],

  ready: false,

  init() {
    Store.load();
    Store.persist();
    window.addEventListener('hashchange', () => { if (this.ready) this.render(); });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.dropdown')) document.querySelectorAll('.dropdown.open').forEach((d) => d.classList.remove('open'));
    });
    this.renderNewDocMenu();
    Brand.favicon();   // แสดงโลโก้ที่จำไว้ตั้งแต่หน้า Login
    document.title = `${Brand.cached().name} — ระบบบัญชีออนไลน์`;
    Auth.start(() => this.boot());
  },

  /** หลังเข้าสู่ระบบ */
  boot() {
    this.ready = true;
    if (!location.hash || location.hash === '#') location.hash = '#/dashboard';
    this.render();
    Sync.refresh({ quiet: true });
    Sync.startPolling();
  },

  renderNewDocMenu() {
    const m = document.getElementById('new-doc-menu');
    const item = (t) => `<a href="#/doc/${t}/new">${U.icon(DOC_TYPES[t].icon)}${DOC_TYPES[t].label}</a>`;
    m.innerHTML = `<div class="lbl">การขาย</div>${['QT', 'BN', 'RC'].map(item).join('')}<div class="sep"></div>
      <div class="lbl">ซื้อและจ่าย</div>${['PO', 'GR', 'EX'].map(item).join('')}<div class="sep"></div>
      <a href="#/accounting/journal/new">${U.icon('book-plus')}บันทึกบัญชีรายวัน (JV)</a>
      <a href="#/letter/new">${U.icon('file-check-2')}หนังสือส่งมอบงาน</a>
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
      if (path.startsWith('#/letter/') && href === '#/letters') return true;
      return href !== '#/dashboard' && path.startsWith(href + '/');
    };
    document.getElementById('nav').innerHTML = this.NAV.map((n) => {
      if (n.sec) return `<div class="nav-sec">${n.sec}</div>`;
      if (n.admin && !Auth.isAdmin()) return '';
      const b = n.badge ? n.badge() : 0;
      return `<a href="${n.href}" class="${isActive(n.href) ? 'active' : ''}">${U.icon(n.icon)}<span>${n.label}</span>${b ? `<span class="badge">${b}</span>` : ''}</a>`;
    }).join('');
    const c = Store.state.company;
    Brand.apply();
    const u = Auth.user || {};
    document.getElementById('user-chip').innerHTML = `<button class="user-btn" onclick="App.toggleDropdown('user-dd', event)"><div class="avatar">${U.esc((u.firstName || u.email || '?').slice(0, 1))}</div><span class="user-txt"><b>${U.esc(Auth.fullName() || 'ผู้ใช้')}</b><small>${U.esc(u.position || '')}</small></span>${U.icon('chevron-down')}</button>
      <div class="dropdown-menu"><div class="lbl">${U.esc(u.email || '')}</div>
        <button onclick="Auth.profileModal()">${U.icon('user-round')}โปรไฟล์ของฉัน</button>
        ${Auth.isAdmin() ? `<a href="#/settings/users">${U.icon('users')}จัดการผู้ใช้งาน</a><a href="#/settings/activity">${U.icon('history')}ประวัติการใช้งาน</a>` : ''}
        <div class="sep"></div><button onclick="Auth.logout()" style="color:var(--danger)">${U.icon('log-out')}ออกจากระบบ</button></div>`;
    document.getElementById('sidebar-foot').innerHTML = `ปีบัญชี ${U.thMonth(ACC.fiscalStart(U.today()).slice(0, 7))} ·
      ${c.vatRegistered ? 'จด VAT ' + c.vatRate + '%' : 'ไม่จด VAT'}<br><span style="opacity:.7">${U.esc(Store.state.company.name)}</span>`;
  },

  setTitle(t) { document.getElementById('page-title').textContent = t; document.title = `${t} — ${Brand.fromState().name}`; },

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
      letters: () => Pages.letters(view, query),
      letter: () => Pages.letterEdit(view, parts[1], query),
    };
    try {
      (routes[parts[0]] || routes.dashboard)();
    } catch (err) {
      console.error(err);
      view.innerHTML = `<div class="card"><div class="empty">${U.icon('bug')}<h4>เกิดข้อผิดพลาด</h4><p>${U.esc(err.message)}</p></div></div>`;
    }
    this.renderNav();
    U.refreshIcons();
    Sync.setStatus(Sync.status === 'off' && Sync.enabled() ? (Store.state.meta.dirty ? 'pending' : 'idle') : Sync.status);
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
