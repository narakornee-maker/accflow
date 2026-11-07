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

const Store = {
  KEY: 'accflow_state_v1',
  state: null,
  listeners: [],

  defaults() {
    return {
      meta: { version: 1, createdAt: new Date().toISOString(), updatedAt: null, syncedAt: null },
      company: {
        name: 'บริษัทของฉัน จำกัด', nameEn: '', taxId: '', branch: 'สำนักงานใหญ่', address: '', phone: '', email: '', website: '',
        businessType: 'service', vatRegistered: true, vatRate: 7, vatPoint: 'payment', fyStartMonth: 1, logo: '',
        defaultCreditDays: 30, signName: '',
      },
      settings: {
        gasUrl: '', gasToken: '', autoSync: true, autoBackupOnSync: false,
        payroll: { ssoRate: 5, ssoMin: 1650, ssoMax: 17500, personalAllowance: 60000, expenseRate: 50, expenseMax: 100000 },
      },
      counters: {},
      accounts: DEFAULT_ACCOUNTS.map((a) => ({ ...a })),
      contacts: [],
      products: [],
      documents: [],
      journals: [],
      stockAdjustments: [],
      employees: [],
      payrolls: [],
      assets: [],
    };
  },

  load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(this.KEY)); } catch (e) { s = null; }
    const d = this.defaults();
    if (!s) { this.state = d; return false; }
    // shallow-merge defaults for forward compatibility
    s.company = { ...d.company, ...s.company };
    s.settings = { ...d.settings, ...s.settings, payroll: { ...d.settings.payroll, ...(s.settings || {}).payroll } };
    s.meta = { ...d.meta, ...s.meta };
    for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
    // ensure system accounts exist
    for (const a of DEFAULT_ACCOUNTS) if (!s.accounts.find((x) => x.code === a.code)) s.accounts.push({ ...a });
    this.state = s;
    return true;
  },

  save({ silent = false, sync = true } = {}) {
    this.state.meta.updatedAt = new Date().toISOString();
    try { localStorage.setItem(this.KEY, JSON.stringify(this.state)); }
    catch (e) { U.toast('บันทึกลงเครื่องไม่สำเร็จ: พื้นที่เต็ม', 'error'); }
    if (typeof ACC !== 'undefined') ACC.invalidate();
    if (sync) Sync.schedule();
    if (!silent) this.listeners.forEach((f) => f());
  },

  replace(newState) {
    localStorage.setItem(this.KEY, JSON.stringify(newState));
    this.load();
    if (typeof ACC !== 'undefined') ACC.invalidate();
  },

  /* ---------- CRUD ---------- */
  get(col, id) { return this.state[col].find((x) => x.id === id); },
  upsert(col, obj) {
    if (!obj.id) obj.id = U.uid();
    const i = this.state[col].findIndex((x) => x.id === obj.id);
    obj.updatedAt = new Date().toISOString();
    if (i >= 0) this.state[col][i] = obj; else { obj.createdAt = obj.updatedAt; this.state[col].push(obj); }
    this.save();
    return obj;
  },
  remove(col, id) {
    this.state[col] = this.state[col].filter((x) => x.id !== id);
    this.save();
  },

  /** เลขที่เอกสาร: PREFIX + ปี พ.ศ. + เดือน + ลำดับ 4 หลัก เช่น QT2569110001 */
  nextNo(type, date = U.today(), peek = false) {
    const prefix = (this.state.settings.prefixes || {})[type] || (DOC_TYPES[type] || {}).prefix || type;
    const [y, m] = date.split('-');
    const key = `${prefix}${+y + 543}${m}`;
    const n = (this.state.counters[key] || 0) + 1;
    if (!peek) this.state.counters[key] = n;
    return `${key}${U.pad(n, 4)}`;
  },

  nextCode(col, prefix) {
    const nums = this.state[col].map((x) => +(String(x.code || '').replace(/\D/g, '')) || 0);
    return `${prefix}${U.pad((nums.length ? Math.max(...nums) : 0) + 1, 4)}`;
  },

  account(code) { return this.state.accounts.find((a) => a.code === code); },
  accName(code) { const a = this.account(code); return a ? a.name : code; },
  payAccounts() { return this.state.accounts.filter((a) => a.pay || ['1110', '1120'].includes(a.code)); },
  onChange(f) { this.listeners.push(f); },
};

/* ============================================================
 * Google Apps Script sync — เก็บข้อมูลใน Google Drive / Sheets
 * ============================================================ */
const Sync = {
  status: 'off', // off | idle | syncing | error
  lastError: '',
  timer: null,

  enabled() { const s = Store.state.settings; return !!(s.gasUrl && s.gasToken); },

  setStatus(st, err = '') {
    this.status = st; this.lastError = err;
    const el = document.getElementById('sync-status');
    if (!el) return;
    const map = {
      off: ['cloud-off', 'ยังไม่เชื่อม Google', 'muted'],
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

  async call(action, payload = {}) {
    const { gasUrl, gasToken } = Store.state.settings;
    if (!gasUrl) throw new Error('ยังไม่ได้ตั้งค่า Google Apps Script URL');
    // text/plain เพื่อหลีกเลี่ยง CORS preflight ของ Apps Script
    const res = await fetch(gasUrl, {
      method: 'POST', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, token: gasToken, ...payload }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || 'เกิดข้อผิดพลาด');
    return j;
  },

  schedule() {
    if (!this.enabled() || !Store.state.settings.autoSync) { this.setStatus(this.enabled() ? 'pending' : 'off'); return; }
    this.setStatus('pending');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.push().catch(() => {}), 2500);
  },

  async push({ sheets = false } = {}) {
    if (!this.enabled()) return;
    this.setStatus('syncing');
    try {
      const data = Store.state;
      const payload = { data };
      if (sheets) payload.tables = ACC.exportTables();
      const r = await this.call('save', payload);
      Store.state.meta.syncedAt = r.savedAt || new Date().toISOString();
      localStorage.setItem(Store.KEY, JSON.stringify(Store.state));
      this.setStatus('idle');
      return r;
    } catch (e) { this.setStatus('error', e.message); throw e; }
  },

  async pull() {
    this.setStatus('syncing');
    try {
      const r = await this.call('load');
      this.setStatus('idle');
      return r.data || null;
    } catch (e) { this.setStatus('error', e.message); throw e; }
  },

  /** On startup: take remote data if it is newer than local */
  async init() {
    if (!this.enabled()) { this.setStatus('off'); return; }
    try {
      const remote = await this.pull();
      const lu = Store.state.meta.updatedAt || '';
      const ru = (remote && remote.meta && remote.meta.updatedAt) || '';
      if (remote && ru > lu) {
        // keep local connection settings
        remote.settings = { ...remote.settings, gasUrl: Store.state.settings.gasUrl, gasToken: Store.state.settings.gasToken };
        Store.replace(remote);
        U.toast('โหลดข้อมูลล่าสุดจาก Google แล้ว', 'info');
        App.render();
      } else if (lu > ru) {
        await this.push();
      }
    } catch (e) { /* status already set */ }
  },
};
