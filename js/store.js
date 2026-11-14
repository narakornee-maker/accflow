/* ============================================================
 * AccFlow — Data store (localStorage + Google Apps Script sync)
 * ============================================================ */

/** ผังบัญชีมาตรฐานสำหรับ SME ไทย */
const DEFAULT_ACCOUNTS = [
  // 1 สินทรัพย์
  { code: '1110', name: 'เงินสด', type: 'asset', group: 'current', pay: true },
  { code: '1120', name: 'เงินฝากธนาคาร', type: 'asset', group: 'current', pay: true },
  { code: '1130', name: 'ลูกหนี้การค้า', type: 'asset', group: 'current', system: true },
  { code: '1150', name: 'สินค้าคงเหลือ', type: 'asset', group: 'current', system: true },
  { code: '1160', name: 'ภาษีเงินได้ถูกหัก ณ ที่จ่าย', type: 'asset', group: 'current', system: true },
  { code: '1170', name: 'ภาษีซื้อ', type: 'asset', group: 'current', system: true },
  { code: '1190', name: 'สินทรัพย์หมุนเวียนอื่น', type: 'asset', group: 'current' },
  { code: '1210', name: 'อาคารและอุปกรณ์ (ราคาทุน)', type: 'asset', group: 'noncurrent', system: true },
  { code: '1219', name: 'ค่าเสื่อมราคาสะสม', type: 'asset', group: 'noncurrent', contra: true, system: true },
  { code: '1290', name: 'สินทรัพย์ไม่หมุนเวียนอื่น', type: 'asset', group: 'noncurrent' },
  // 2 หนี้สิน
  { code: '2110', name: 'เจ้าหนี้การค้า', type: 'liability', group: 'current', system: true },
  { code: '2120', name: 'ค่าใช้จ่ายค้างจ่าย', type: 'liability', group: 'current' },
  { code: '2140', name: 'ภาษีหัก ณ ที่จ่ายค้างจ่าย', type: 'liability', group: 'current', system: true },
  { code: '2150', name: 'ภาษีขาย', type: 'liability', group: 'current', system: true },
  { code: '2155', name: 'ภาษีขายยังไม่ถึงกำหนดชำระ', type: 'liability', group: 'current', system: true },
  { code: '2160', name: 'เงินประกันสังคมค้างจ่าย', type: 'liability', group: 'current', system: true },
  { code: '2170', name: 'ภาษีมูลค่าเพิ่มค้างจ่าย (ภ.พ.30)', type: 'liability', group: 'current' },
  { code: '2190', name: 'หนี้สินหมุนเวียนอื่น', type: 'liability', group: 'current' },
  { code: '2210', name: 'เงินกู้ยืมระยะยาว', type: 'liability', group: 'noncurrent' },
  // 3 ส่วนของเจ้าของ
  { code: '3100', name: 'ทุนจดทะเบียน / ทุน', type: 'equity', system: true },
  { code: '3200', name: 'กำไร (ขาดทุน) สะสม', type: 'equity', system: true },
  { code: '3300', name: 'ถอนใช้ส่วนตัว', type: 'equity' },
  // 4 รายได้
  { code: '4110', name: 'รายได้จากการขายสินค้า', type: 'revenue', group: 'sales', system: true },
  { code: '4120', name: 'รายได้จากการให้บริการ', type: 'revenue', group: 'sales', system: true },
  { code: '4900', name: 'รายได้อื่น', type: 'revenue', group: 'other' },
  // 5 ค่าใช้จ่าย
  { code: '5100', name: 'ต้นทุนขาย / ต้นทุนบริการ', type: 'expense', group: 'cost', system: true },
  { code: '5200', name: 'ค่าใช้จ่ายในการดำเนินงานทั่วไป', type: 'expense', group: 'opex' },
  { code: '5210', name: 'ค่าเช่า', type: 'expense', group: 'opex' },
  { code: '5220', name: 'ค่าน้ำ ค่าไฟ ค่าโทรศัพท์', type: 'expense', group: 'opex' },
  { code: '5230', name: 'ค่าวัสดุสิ้นเปลือง', type: 'expense', group: 'opex' },
  { code: '5240', name: 'ค่าขนส่ง', type: 'expense', group: 'opex' },
  { code: '5250', name: 'ค่าโฆษณาและส่งเสริมการขาย', type: 'expense', group: 'opex' },
  { code: '5260', name: 'ค่าธรรมเนียมธนาคาร', type: 'expense', group: 'opex' },
  { code: '5270', name: 'ค่าจ้างทำของ / ค่าบริการภายนอก', type: 'expense', group: 'opex' },
  { code: '5300', name: 'เงินเดือนและค่าจ้าง', type: 'expense', group: 'opex', system: true },
  { code: '5310', name: 'เงินสมทบกองทุนประกันสังคม', type: 'expense', group: 'opex', system: true },
  { code: '5400', name: 'ค่าเสื่อมราคา', type: 'expense', group: 'opex', system: true },
  { code: '5900', name: 'ค่าใช้จ่ายอื่น', type: 'expense', group: 'other' },
  { code: '5910', name: 'ภาษีเงินได้นิติบุคคล', type: 'expense', group: 'tax' },
];

const DOC_TYPES = {
  QT: { label: 'ใบเสนอราคา', short: 'ใบเสนอราคา', group: 'sales', party: 'customer', next: 'BN', icon: 'file-text', prefix: 'QT' },
  BN: { label: 'ใบวางบิล / ใบแจ้งหนี้', short: 'ใบวางบิล', group: 'sales', party: 'customer', next: 'RC', icon: 'file-spreadsheet', prefix: 'BN' },
  RC: { label: 'ใบเสร็จรับเงิน / ใบกำกับภาษี', short: 'ใบเสร็จรับเงิน', group: 'sales', party: 'customer', icon: 'receipt', prefix: 'RC' },
  PO: { label: 'ใบสั่งซื้อ', short: 'ใบสั่งซื้อ', group: 'purchase', party: 'supplier', next: 'GR', icon: 'shopping-cart', prefix: 'PO' },
  GR: { label: 'ใบรับสินค้า / ซื้อสินค้า', short: 'ใบรับสินค้า', group: 'purchase', party: 'supplier', icon: 'package-check', prefix: 'GR' },
  EX: { label: 'บันทึกค่าใช้จ่าย', short: 'ค่าใช้จ่าย', group: 'purchase', party: 'supplier', icon: 'wallet', prefix: 'EX' },
};

const COMPANY_NAME = 'VoltGrid Energy & Solutions Co., Ltd.';
const COLLECTIONS = ['contacts', 'products', 'documents', 'journals', 'stockAdjustments', 'employees', 'payrolls', 'assets', 'letters', 'files'];

/* ============================================================
 * Company — หลายบริษัทในระบบเดียว (ข้อมูลแยกกันทั้งในเครื่องและบนเซิร์ฟเวอร์)
 * ============================================================ */
const Company = {
  CUR: 'accflow_company', LIST: 'accflow_companies',
  get id() { return localStorage.getItem(this.CUR) || 'main'; },
  list() { try { return JSON.parse(localStorage.getItem(this.LIST)) || []; } catch (e) { return []; } },
  setList(l) { if (Array.isArray(l)) localStorage.setItem(this.LIST, JSON.stringify(l)); },
  current() { return this.list().find((c) => c.id === this.id) || { id: this.id, name: '' }; },
  stateKey(id = this.id) { return id === 'main' ? 'accflow_state_v1' : `accflow_state_v1:${id}`; },
  activityKey(id = this.id) { return id === 'main' ? 'accflow_activity' : `accflow_activity:${id}`; },

  /** สลับบริษัท: ซิงก์งานค้างของบริษัทปัจจุบันก่อน แล้วโหลดหน้าใหม่ */
  async switchTo(id) {
    if (id === this.id) return;
    if (Store.state.meta.dirty && Sync.enabled()) {
      try { await Sync.push(); }
      catch (e) { if (!(await U.confirm('ซิงก์ข้อมูลของบริษัทปัจจุบันไม่สำเร็จ ข้อมูลที่ยังไม่ซิงก์จะเก็บไว้ในเครื่องนี้ก่อน ต้องการสลับบริษัทต่อหรือไม่?', { okText: 'สลับบริษัท' }))) return; }
    }
    localStorage.setItem(this.CUR, id);
    location.hash = '#/dashboard'; location.reload();
  },

  /** ดึงรายชื่อบริษัทที่มีสิทธิ์ — ถ้าบริษัทปัจจุบันเข้าไม่ได้แล้ว ย้ายไปบริษัทแรก */
  async refreshList() {
    const r = await Sync.call('listCompanies');
    this.setList(r.companies);
    if (r.companies.length && !r.companies.some((c) => c.id === this.id)) { localStorage.setItem(this.CUR, r.companies[0].id); location.hash = '#/dashboard'; location.reload(); }
    return r.companies;
  },

  /** สร้างบริษัทใหม่แล้วสลับเข้าไป (เริ่มจากข้อมูลว่าง) */
  async create(name) {
    const r = await Sync.call('createCompany', { name });
    this.setList(r.companies);
    const s = Store.defaults();
    Object.assign(s.company, { name: r.company.name, brandName: r.company.name.replace(/^(บริษัท|ห้างหุ้นส่วนจำกัด|หจก\.?)\s*/, '').replace(/\s*จำกัด(\s*\(มหาชน\))?\s*$/, '').replace(/,?\s*(Co\.,?\s*)?Ltd\.?\s*$/i, '').trim().slice(0, 24) || r.company.name, brandSub: 'ระบบบัญชี' });
    s.meta.updatedAt = new Date().toISOString(); s.meta.dirty = true;
    localStorage.setItem(this.stateKey(r.company.id), JSON.stringify(s));
    await this.switchTo(r.company.id);
  },

  /** ลบข้อมูลทุกบริษัทที่เก็บในเครื่อง (ตอนออกจากระบบ) */
  clearLocal() {
    Object.keys(localStorage).forEach((k) => { if (k.startsWith('accflow_state_v1') || k.startsWith('accflow_activity')) localStorage.removeItem(k); });
  },
};

const Store = {
  get KEY() { return Company.stateKey(); },
  state: null,
  listeners: [],

  defaults() {
    return {
      meta: { version: 2, createdAt: new Date().toISOString(), updatedAt: null, syncedAt: null, dirty: false, brand: 'voltgrid' },
      company: {
        name: COMPANY_NAME, nameEn: '', taxId: '', branch: 'สำนักงานใหญ่', address: '', phone: '', email: '', website: '',
        businessType: 'service', vatRegistered: true, vatRate: 7, vatPoint: 'payment', fyStartMonth: 1, logo: '',
        defaultCreditDays: 30, signName: '',
      },
      settings: {
        autoSync: true,
        payroll: { ssoRate: 5, ssoMin: 1650, ssoMax: 17500, personalAllowance: 60000, expenseRate: 50, expenseMax: 100000 },
      },
      counters: {},
      accounts: DEFAULT_ACCOUNTS.map((a) => ({ ...a })),
      contacts: [], products: [], documents: [], journals: [], stockAdjustments: [], employees: [], payrolls: [], assets: [], letters: [], files: [],
      deleted: [],
    };
  },

  normalize(s) {
    const d = this.defaults();
    s.company = { ...d.company, ...s.company };
    s.settings = { ...d.settings, ...s.settings, payroll: { ...d.settings.payroll, ...(s.settings || {}).payroll } };
    s.meta = { ...d.meta, ...s.meta };
    for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
    for (const a of DEFAULT_ACCOUNTS) if (!s.accounts.find((x) => x.code === a.code)) s.accounts.push({ ...a });
    // เปลี่ยนชื่อบริษัทเป็น VoltGrid (ครั้งเดียว) ถ้ายังเป็นชื่อเริ่มต้น/ชื่อตัวอย่าง
    if (s.meta.brand !== 'voltgrid') {
      if (['บริษัทของฉัน จำกัด', 'บริษัท ตัวอย่าง เอ็นจิเนียริ่ง จำกัด', ''].includes(s.company.name)) s.company.name = COMPANY_NAME;
      s.meta.brand = 'voltgrid';
    }
    return s;
  },

  load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(this.KEY)); } catch (e) { s = null; }
    if (!s) { this.state = this.defaults(); return false; }
    this.state = this.normalize(s);
    return true;
  },

  persist() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.state)); }
    catch (e) { U.toast('บันทึกลงเครื่องไม่สำเร็จ: พื้นที่เต็ม', 'error'); }
  },

  save({ silent = false, sync = true } = {}) {
    this.state.meta.updatedAt = new Date().toISOString();
    if (sync) this.state.meta.dirty = true;
    this.persist();
    if (typeof ACC !== 'undefined') ACC.invalidate();
    if (sync) Sync.schedule();
    if (!silent) this.listeners.forEach((f) => f());
  },

  replace(newState) {
    this.state = this.normalize(JSON.parse(JSON.stringify(newState)));
    this.persist();
    if (typeof ACC !== 'undefined') ACC.invalidate();
  },

  /* ---------- CRUD ---------- */
  get(col, id) { return this.state[col].find((x) => x.id === id); },
  upsert(col, obj) {
    if (!obj.id) obj.id = U.uid();
    const i = this.state[col].findIndex((x) => x.id === obj.id);
    const prev = i >= 0 ? this.state[col][i] : null;
    obj.updatedAt = new Date().toISOString();
    const who = typeof Auth !== 'undefined' && Auth.user ? Auth.user.email : '';
    if (who) obj.updatedBy = who;
    if (i >= 0) this.state[col][i] = obj; else { obj.createdAt = obj.updatedAt; if (who) obj.createdBy = who; this.state[col].push(obj); }
    Activity.record(col, obj, prev);
    this.save();
    return obj;
  },
  remove(col, id) {
    const prev = this.get(col, id);
    this.state[col] = this.state[col].filter((x) => x.id !== id);
    (this.state.deleted = this.state.deleted || []).push({ col, id, at: new Date().toISOString() });
    if (this.state.deleted.length > 3000) this.state.deleted = this.state.deleted.slice(-3000);
    if (prev) Activity.add('ลบ', Activity.label(col, prev));
    this.save();
  },

  /** เลขที่เอกสาร: PREFIX + ปี พ.ศ. + เดือน + ลำดับ 4 หลัก เช่น QT2569110001 */
  nextNo(type, date = U.today(), peek = false, state = this.state) {
    const prefix = (state.settings.prefixes || {})[type] || (DOC_TYPES[type] || {}).prefix || type;
    const [y, m] = date.split('-');
    const key = `${prefix}${+y + 543}${m}`;
    const n = (state.counters[key] || 0) + 1;
    if (!peek) state.counters[key] = n;
    return `${key}${U.pad(n, 4)}`;
  },

  nextCode(col, prefix) {
    const nums = this.state[col].map((x) => +(String(x.code || '').replace(/\D/g, '')) || 0);
    return `${prefix}${U.pad((nums.length ? Math.max(...nums) : 0) + 1, 4)}`;
  },

  /**
   * รวมข้อมูลในเครื่องกับข้อมูลบนเซิร์ฟเวอร์ระดับรายการ (ใช้เมื่อหลายคนบันทึกพร้อมกัน)
   * - รายการเดียวกัน: เลือกฉบับที่แก้ไขล่าสุด (updatedAt)
   * - รายการที่ถูกลบ (tombstone) จะไม่กลับมา
   * - เลขที่เอกสารซ้ำ: ออกเลขใหม่ให้ฉบับที่สร้างทีหลัง
   */
  merge(local, remote) {
    const out = JSON.parse(JSON.stringify(remote));
    const tomb = {};
    [...(remote.deleted || []), ...(local.deleted || [])].forEach((t) => { const k = `${t.col}|${t.id}`; if (!tomb[k] || tomb[k] < t.at) tomb[k] = t.at; });
    out.deleted = Object.entries(tomb).map(([k, at]) => { const [col, id] = k.split('|'); return { col, id, at }; }).sort((a, b) => (a.at < b.at ? -1 : 1)).slice(-3000);
    for (const col of COLLECTIONS) {
      const map = new Map((remote[col] || []).map((x) => [x.id, x]));
      for (const it of local[col] || []) { const r = map.get(it.id); if (!r || (it.updatedAt || '') > (r.updatedAt || '')) map.set(it.id, it); }
      out[col] = [...map.values()].filter((x) => { const t = tomb[`${col}|${x.id}`]; return !t || t < (x.updatedAt || ''); });
    }
    const accs = new Map((remote.accounts || []).map((a) => [a.code, a]));
    (local.accounts || []).forEach((a) => accs.set(a.code, a));
    out.accounts = [...accs.values()];
    out.counters = { ...(remote.counters || {}) };
    Object.entries(local.counters || {}).forEach(([k, v]) => { out.counters[k] = Math.max(out.counters[k] || 0, v); });
    if ((local.meta.updatedAt || '') > (remote.meta && remote.meta.updatedAt || '')) { out.company = local.company; out.settings = local.settings; }
    const seen = {};
    [...out.documents].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')).forEach((d) => {
      const k = `${d.type}|${d.no}`;
      if (d.no && seen[k]) { d.no = this.nextNo(d.type, d.date, false, out); d.updatedAt = new Date().toISOString(); }
      seen[`${d.type}|${d.no}`] = true;
    });
    out.meta = { ...(remote.meta || {}), updatedAt: new Date().toISOString(), dirty: true };
    return out;
  },

  account(code) { return this.state.accounts.find((a) => a.code === code); },
  accName(code) { const a = this.account(code); return a ? a.name : code; },
  payAccounts() { return this.state.accounts.filter((a) => a.pay || ['1110', '1120'].includes(a.code)); },
  onChange(f) { this.listeners.push(f); },
};

/* ============================================================
 * Activity log — ส่งไปบันทึกในชีต "ประวัติการใช้งาน" พร้อมการซิงก์
 * ============================================================ */
const Activity = {
  get KEY() { return Company.activityKey(); },
  COL: { documents: '', contacts: 'รายชื่อ', products: 'สินค้า', journals: 'บันทึกบัญชี', stockAdjustments: 'ปรับสต็อก', employees: 'พนักงาน', payrolls: 'เงินเดือน', assets: 'สินทรัพย์', letters: 'หนังสือส่งมอบงาน', files: 'ไฟล์แนบ' },
  queue() { try { return JSON.parse(localStorage.getItem(this.KEY)) || []; } catch (e) { return []; } },
  label(col, o) {
    if (col === 'documents') return `${(DOC_TYPES[o.type] || {}).short || o.type} ${o.no || '(ร่าง)'}`;
    return `${this.COL[col] || col} ${o.no || o.code || ''} ${o.name || ''}`.replace(/\s+/g, ' ').trim();
  },
  add(action, detail) {
    if (typeof Auth === 'undefined' || !Auth.user) return;
    const q = this.queue(); q.push({ at: new Date().toISOString(), action, detail });
    localStorage.setItem(this.KEY, JSON.stringify(q.slice(-500)));
  },
  record(col, obj, prev) {
    let action = prev ? 'แก้ไข' : 'สร้าง';
    if (prev && prev.status !== obj.status) action = { approved: 'อนุมัติ', void: 'ยกเลิกเอกสาร', draft: 'ยกเลิกอนุมัติ', pending: 'ส่งรออนุมัติ' }[obj.status] || action;
    else if (!prev && obj.status === 'approved') action = 'สร้างและอนุมัติ';
    if (col === 'documents' && prev && prev.payment && obj.payment && !prev.payment.paid && obj.payment.paid) action = 'บันทึกจ่ายชำระ';
    let detail = this.label(col, obj);
    if (col === 'documents') { try { detail += ` · ${U.money(ACC.calcDoc(obj).total)} บาท`; } catch (e) { /* noop */ } }
    this.add(action, detail);
  },
  take() { const q = this.queue(); return q; },
  clear(n) { const q = this.queue(); localStorage.setItem(this.KEY, JSON.stringify(q.slice(n))); },
};

/* ============================================================
 * Connection config — URL ของ Apps Script (ไม่ใช่ข้อมูลลับ)
 * ============================================================ */
const Conn = {
  KEY: 'accflow_conn',
  get() {
    let c = {};
    try { c = JSON.parse(localStorage.getItem(this.KEY)) || {}; } catch (e) { c = {}; }
    const cfg = window.ACCFLOW_CONFIG || {};
    if (!c.gasUrl && cfg.gasUrl) c.gasUrl = cfg.gasUrl;
    if (!c.gasUrl) { // ย้ายค่าจากเวอร์ชันเก่า
      try { const s = JSON.parse(localStorage.getItem('accflow_state_v1')); if (s && s.settings && s.settings.gasUrl) c.gasUrl = s.settings.gasUrl; } catch (e) { /* noop */ }
    }
    return c;
  },
  set(patch) { const c = { ...this.get(), ...patch }; localStorage.setItem(this.KEY, JSON.stringify(c)); return c; },
  inviteLink() { const u = this.get().gasUrl; return `${location.origin}${location.pathname}?setup=${encodeURIComponent(btoa(JSON.stringify({ u })))}`; },
};

/* ============================================================
 * Google Apps Script sync
 * ============================================================ */
const Sync = {
  status: 'off',
  lastError: '',
  timer: null,
  busy: false,

  enabled() { return !!(Conn.get().gasUrl && typeof Auth !== 'undefined' && Auth.token); },

  setStatus(st, err = '') {
    this.status = st; this.lastError = err;
    const el = document.getElementById('sync-status');
    if (!el) return;
    const map = {
      off: ['cloud-off', 'ออฟไลน์', 'muted'],
      idle: ['cloud', 'ซิงก์แล้ว', 'ok'],
      pending: ['cloud-upload', 'รอซิงก์…', 'warn'],
      syncing: ['refresh-cw', 'กำลังซิงก์…', 'warn spin'],
      error: ['cloud-alert', 'ซิงก์ไม่สำเร็จ', 'err'],
    };
    const [ic, label, cls] = map[st] || map.off;
    el.className = `sync-pill ${cls}`;
    el.title = err || label;
    el.innerHTML = `${U.icon(ic)}<span>${label}</span>`;
    U.refreshIcons();
  },

  /** เรียก API (ไม่ต้องเข้าสู่ระบบสำหรับ config/login/register) */
  async call(action, payload = {}, { url } = {}) {
    const gasUrl = url || Conn.get().gasUrl;
    if (!gasUrl) throw new Error('ยังไม่ได้ตั้งค่าการเชื่อมต่อเซิร์ฟเวอร์');
    let res;
    try {
      res = await fetch(gasUrl, {
        method: 'POST', redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, session: (typeof Auth !== 'undefined' && Auth.token) || undefined, company: Company.id, ...payload }),
      });
    } catch (e) {
      throw new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ — ตรวจสอบอินเทอร์เน็ต หรือการ Deploy ของ Apps Script (ผู้ที่มีสิทธิ์เข้าถึง: ทุกคน)');
    }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    let j;
    try { j = await res.json(); } catch (e) { throw new Error('เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง — ตรวจสอบ URL ของ Apps Script'); }
    if (j.code === 'AUTH' && typeof Auth !== 'undefined') { Auth.expired(); throw new Error(j.error); }
    if (j.code === 'NOCOMPANY' && Company.id !== 'main') { localStorage.setItem(Company.CUR, 'main'); U.toast(j.error, 'error'); setTimeout(() => location.reload(), 1200); throw new Error(j.error); }
    if (!j.ok && !j.conflict) { const e = new Error(j.error || 'เกิดข้อผิดพลาด'); e.code = j.code; throw e; }
    return j;
  },

  schedule() {
    if (!this.enabled()) { this.setStatus('off'); return; }
    if (!Store.state.settings.autoSync) { this.setStatus('pending'); return; }
    this.setStatus('pending');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.push().catch(() => {}), 2500);
  },

  /** ส่งข้อมูลขึ้น (ถ้ามีคนอื่นบันทึกก่อน จะรวมข้อมูลแล้วส่งใหม่อัตโนมัติ) */
  async push({ sheets = false, force = false } = {}) {
    if (!this.enabled()) return;
    if (this.busy) { clearTimeout(this.timer); this.timer = setTimeout(() => this.push({ sheets, force }).catch(() => {}), 1500); return; }
    this.busy = true;
    this.setStatus('syncing');
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const activity = Activity.take();
        const payload = { data: Store.state, baseVersion: Store.state.meta.syncedAt || '', activity, force };
        if (sheets) payload.tables = ACC.exportTables();
        const r = await this.call('save', payload);
        if (r.conflict) {
          Store.replace(Store.merge(Store.state, r.data));
          Store.state.meta.syncedAt = r.data.meta && r.data.meta.syncedAt;
          Store.persist();
          continue;
        }
        Activity.clear(activity.length);
        Store.state.meta.syncedAt = r.savedAt;
        Store.state.meta.dirty = false;
        Store.persist();
        this.setStatus('idle');
        if (attempt > 0) this.afterRemoteChange('รวมข้อมูลจากผู้ใช้อื่นแล้ว');
        return r;
      }
      throw new Error('มีการบันทึกพร้อมกันหลายครั้ง กรุณาลองใหม่');
    } catch (e) { this.setStatus('error', e.message); throw e; }
    finally { this.busy = false; }
  },

  /** แทนที่ข้อมูลทั้งหมดบนเซิร์ฟเวอร์ (ล้างข้อมูล / นำเข้า / ข้อมูลตัวอย่าง) — สำรองข้อมูลเดิมก่อน */
  async overwrite(data, reason) {
    if (this.enabled()) { try { await this.call('backup'); } catch (e) { /* ยังไม่มีไฟล์ */ } }
    clearTimeout(this.timer);
    Store.replace(data);
    Store.state.deleted = [];
    Store.state.meta.dirty = true;
    Store.persist();
    Activity.add(reason, '');
    if (this.enabled()) await this.push({ sheets: true, force: true });
  },

  async pull() {
    this.setStatus('syncing');
    try { const r = await this.call('load'); this.setStatus('idle'); return r.data || null; }
    catch (e) { this.setStatus('error', e.message); throw e; }
  },

  /** ดึงข้อมูลล่าสุดของทีม: รวมกับงานที่ยังไม่ได้ซิงก์ในเครื่อง */
  async refresh({ quiet = true } = {}) {
    if (!this.enabled() || this.busy) return;
    try {
      const remote = await this.pull();
      if (!remote) { if (Store.state.meta.dirty || Store.state.documents.length) await this.push({ sheets: true }); return; }
      const rv = (remote.meta && remote.meta.syncedAt) || '';
      if (rv === Store.state.meta.syncedAt) { if (Store.state.meta.dirty) await this.push(); return; }
      if (Store.state.meta.dirty) {
        Store.replace(Store.merge(Store.state, remote));
        Store.state.meta.syncedAt = rv; Store.persist();
        await this.push();
      } else {
        Store.replace(remote);
        Store.state.meta.dirty = false; Store.persist();
      }
      this.afterRemoteChange(quiet ? '' : 'อัปเดตข้อมูลล่าสุดแล้ว');
    } catch (e) { /* status already set */ }
  },

  afterRemoteChange(msg) {
    const editing = /^#\/(doc|payroll\/run)\//.test(location.hash) || document.querySelector('.modal-overlay');
    if (editing) { if (msg !== '') U.toast('มีข้อมูลใหม่จากผู้ใช้อื่น — จะแสดงเมื่อออกจากหน้านี้', 'info'); return; }
    if (typeof App !== 'undefined' && App.ready) App.render();
    if (msg) U.toast(msg, 'info');
  },

  startPolling() {
    clearInterval(this.poll);
    this.poll = setInterval(() => { if (!document.hidden) this.refresh(); }, 90000);
    window.addEventListener('focus', U.debounce(() => this.refresh(), 1000));
  },
};
