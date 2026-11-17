/**
 * ============================================================
 *  VoltGrid Accounting Backend — Google Apps Script  (v4)
 *  - เก็บข้อมูลบัญชีใน Google Drive (JSON) + Google Sheets
 *  - ระบบผู้ใช้งาน: ลงทะเบียน / เข้าสู่ระบบ (Google หรือรหัสผ่าน) / ผู้ดูแลอนุมัติ
 *  - บันทึกประวัติการใช้งานลงชีต "ประวัติการใช้งาน"
 *  - เก็บไฟล์แนบ (PO / WO / สัญญา) แบบส่วนตัวในโฟลเดอร์ Attachments
 *  - หลายบริษัท: แต่ละบริษัทมีโฟลเดอร์ของตัวเอง (ข้อมูล / Backups / Attachments / Sheets)
 *  - สำรองข้อมูลอัตโนมัติรายวัน
 * ============================================================
 *  ติดตั้ง / อัปเดต:
 *   1) วางโค้ดนี้แทนโค้ดเดิมทั้งหมด → Save
 *   2) (ถ้าต้องการ) ใส่ GOOGLE_CLIENT_ID / ALLOWED_DOMAIN ด้านล่าง
 *   3) เลือกฟังก์ชัน setup → Run → อนุญาตสิทธิ์ (มีสิทธิ์ใหม่: เชื่อมต่อบริการภายนอก)
 *   4) Deploy → Manage deployments → ✏️ → Version: New version → Deploy
 *      (แก้ deployment เดิม URL จะไม่เปลี่ยน)
 * ============================================================
 */

/* =================== ตั้งค่า =================== */
const GOOGLE_CLIENT_ID = '423952598920-i3bh3g3o2fq277bdb8fidbofra5ho14n.apps.googleusercontent.com';  // OAuth Client ID (…apps.googleusercontent.com) เพื่อเปิด "เข้าสู่ระบบด้วย Google"
const ALLOWED_DOMAIN = '';          // เช่น 'voltgrid.co.th' = รับเฉพาะอีเมลโดเมนนี้ (เว้นว่าง = ทุกอีเมล)
const ALLOW_PASSWORD_LOGIN = true;  // false = บังคับเข้าสู่ระบบด้วย Google เท่านั้น
const SESSION_DAYS = 7;             // อายุการเข้าสู่ระบบ (วัน)
/* ===============================================
 * หมายเหตุ: เมื่อรัน setup() ค่า GOOGLE_CLIENT_ID / ALLOWED_DOMAIN ที่ใส่ไว้ข้างบน
 * จะถูก "จำ" ไว้ใน Script Properties — ครั้งต่อไปที่วางโค้ดใหม่ทับ (ค่าข้างบนว่าง)
 * ระบบจะใช้ค่าที่จำไว้ให้เอง ไม่ต้องใส่ใหม่
 * ต้องการล้างค่าที่จำไว้: รันฟังก์ชัน clearSavedConfig
 * =============================================== */

const APP_NAME = 'VoltGrid Accounting';
const FOLDER_NAME = 'AccFlow Data';
const BACKUP_FOLDER_NAME = 'Backups';
const ATTACH_FOLDER_NAME = 'Attachments';
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const DATA_FILE = 'accflow-data.json';
const SHEET_NAME = 'AccFlow Database';
const USER_SHEET = 'ผู้ใช้งาน';
const LOG_SHEET = 'ประวัติการใช้งาน';
const KEEP_BACKUPS = 60;
const USER_COLS = [['email', 'อีเมล'], ['firstName', 'ชื่อ'], ['lastName', 'นามสกุล'], ['phone', 'เบอร์โทร'], ['birthDate', 'วันเกิด'],
  ['position', 'ตำแหน่ง'], ['role', 'สิทธิ์'], ['status', 'สถานะ'], ['authType', 'วิธีเข้าสู่ระบบ'], ['createdAt', 'ลงทะเบียนเมื่อ'],
  ['lastLogin', 'เข้าใช้ล่าสุด'], ['approvedBy', 'อนุมัติโดย'], ['companies', 'บริษัทที่เข้าได้']];

const props = () => PropertiesService.getScriptProperties();

/** ค่าตั้งค่า: ใช้ค่าที่ใส่ในโค้ดก่อน ถ้าว่างใช้ค่าที่จำไว้ใน Script Properties */
function clientId_() { return GOOGLE_CLIENT_ID || props().getProperty('CFG_GOOGLE_CLIENT_ID') || ''; }
function domain_() { return ALLOWED_DOMAIN || props().getProperty('CFG_ALLOWED_DOMAIN') || ''; }
function allowPassword_() { return ALLOW_PASSWORD_LOGIN && props().getProperty('CFG_ALLOW_PASSWORD_LOGIN') !== 'false'; }
function rememberConfig_() {
  if (GOOGLE_CLIENT_ID) props().setProperty('CFG_GOOGLE_CLIENT_ID', GOOGLE_CLIENT_ID);
  if (ALLOWED_DOMAIN) props().setProperty('CFG_ALLOWED_DOMAIN', ALLOWED_DOMAIN);
  if (!ALLOW_PASSWORD_LOGIN) props().setProperty('CFG_ALLOW_PASSWORD_LOGIN', 'false');
}
/** ล้างค่าตั้งค่าที่จำไว้ (Client ID / โดเมน / บังคับ Google) แล้วใช้ค่าในโค้ดเท่านั้น */
function clearSavedConfig() {
  ['CFG_GOOGLE_CLIENT_ID', 'CFG_ALLOWED_DOMAIN', 'CFG_ALLOW_PASSWORD_LOGIN'].forEach((k) => props().deleteProperty(k));
  Logger.log('ล้างค่าที่จำไว้แล้ว');
}

/** รันครั้งแรก / หลังอัปเดตโค้ด: สร้างโฟลเดอร์ ชีต Token และตั้งเวลาสำรองรายวัน */
function setup() {
  const folder = getFolder_();
  const ss = getSpreadsheet_();
  upgradeHeaders_();
  try { migrateMainFolder_(); } catch (e) { Logger.log('⚠️ ย้ายโฟลเดอร์บริษัทหลักไม่สำเร็จ (ระบบยังใช้งานได้ตามเดิม): ' + e); }
  companies_().forEach((c) => { try { coSub_(c.id, BACKUP_FOLDER_NAME); coSub_(c.id, ATTACH_FOLDER_NAME); } catch (e) { /* noop */ } });
  userSheet_(); logSheet_();
  let token = props().getProperty('API_TOKEN');
  if (!token) {
    token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
    props().setProperty('API_TOKEN', token);
  }
  ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === 'dailyBackup').forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('dailyBackup').timeBased().everyDays(1).atHour(2).create();
  try { UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo', { muteHttpExceptions: true }); } catch (e) { /* ขอสิทธิ์ external request */ }
  Logger.log('✅ ติดตั้งเรียบร้อย');
  Logger.log('📁 Folder: ' + folder.getUrl());
  Logger.log('📊 Sheets: ' + ss.getUrl());
  Logger.log('🏢 บริษัท: ' + companies_().map((c) => c.name).join(', '));
  Logger.log('🔑 API Token (สำหรับกู้คืนระบบ): ' + token);
  rememberConfig_();
  Logger.log('🔐 Google Login: ' + (clientId_() ? 'เปิด (Client ID: ' + clientId_().slice(0, 12) + '…)' : 'ปิด (ยังไม่ได้ใส่ GOOGLE_CLIENT_ID)'));
  Logger.log('📧 จำกัดโดเมนอีเมล: ' + (domain_() || 'ไม่จำกัด') + ' · ล็อกอินด้วยรหัสผ่าน: ' + (allowPassword_() ? 'เปิด' : 'ปิด'));
}

/** สร้าง Token กู้คืนระบบใหม่ */
/**
 * ตรวจหาสาเหตุเมื่อระบบใช้งานไม่ได้ — เลือกฟังก์ชันนี้แล้วกด Run ดูผลใน Execution log
 * แต่ละขั้นจะขึ้น ✅ หรือ ❌ พร้อมสาเหตุ
 */
function diagnose() {
  const ok = (m) => Logger.log('✅ ' + m), bad = (m, e) => Logger.log('❌ ' + m + ' → ' + ((e && e.message) || e));
  const step = (name, fn) => { try { const r = fn(); ok(name + (r ? ': ' + r : '')); return true; } catch (e) { bad(name, e); return false; } };
  Logger.log('— บัญชีที่สคริปต์ทำงาน: ' + Session.getEffectiveUser().getEmail());
  Logger.log('— เจ้าของสคริปต์ / ผู้ที่กำลังกด Run: ' + Session.getActiveUser().getEmail());
  step('โฟลเดอร์หลัก (AccFlow Data)', () => { const f = getFolder_(); return f.getName() + ' — เจ้าของ ' + f.getOwner().getEmail(); });
  step('Google Sheets กลาง', () => { const ss = getSpreadsheet_(); return ss.getName() + ' — ' + ss.getUrl(); });
  step('ชีตผู้ใช้งาน', () => (getUsers_().length) + ' คน: ' + getUsers_().map((u) => u.email + ' (' + u.role + '/' + u.status + ')').join(', '));
  step('ชีตประวัติการใช้งาน (อ่าน)', () => logSheet_().getLastRow() + ' แถว, ' + logSheet_().getMaxColumns() + ' คอลัมน์');
  step('ชีตประวัติการใช้งาน (เขียน)', () => { logRowsUnsafe_({ email: 'diagnose', firstName: 'ทดสอบระบบ', lastName: '' }, [{ action: 'diagnose', detail: 'ทดสอบการเขียน' }], ''); return 'เขียนได้'; });
  step('ชีตผู้ใช้งาน (เขียนแถวข้อมูล — แบบที่ระบบใช้จริง)', () => { const u = getUsers_()[0]; if (!u) return 'ยังไม่มีผู้ใช้ ข้าม'; saveUser_(u); return 'เขียนได้'; });
  try { const sh = userSheet_(); const v = sh.getRange(1, 1).getValues(); sh.getRange(1, 1).setValues(v); Logger.log('ℹ️ แถวหัวตารางชีตผู้ใช้งาน: เขียนได้'); }
  catch (e) { Logger.log('ℹ️ แถวหัวตารางชีตผู้ใช้งาน: เข้าถึงไม่ได้ (' + e.message + ') — ระบบไม่ใช้ส่วนนี้แล้ว ไม่กระทบการทำงาน'); }
  step('ชนิดชีตผู้ใช้งาน', () => { const sh = userSheet_(); let t = ''; try { t = String(sh.getType()); } catch (e) { t = '?'; } return 'type=' + t + ' · แถวที่ตรึง ' + sh.getFrozenRows() + ' · ขนาด ' + sh.getMaxRows() + '×' + sh.getMaxColumns(); });
  step('การป้องกันชีต (Protection)', () => { const ss = getSpreadsheet_(); const p = ss.getProtections(SpreadsheetApp.ProtectionType.SHEET).concat(ss.getProtections(SpreadsheetApp.ProtectionType.RANGE)); return p.length ? p.length + ' รายการ: ' + p.map((x) => { try { return (x.getRange().getSheet().getName()) + ' (แก้ได้: ' + x.getEditors().map((e) => e.getEmail()).join(', ') + ')'; } catch (e) { return '?'; } }).join('; ') : 'ไม่มี'; });
  step('สิทธิ์ใน Google Sheets กลาง', () => { const f = DriveApp.getFileById(getSpreadsheet_().getId()); return 'เจ้าของ ' + f.getOwner().getEmail() + ' · ผู้แก้ไข: ' + (f.getEditors().map((e) => e.getEmail()).join(', ') || '-'); });
  let list = [];
  step('รายชื่อบริษัท', () => { list = companies_(); return list.map((c) => c.name + ' [' + c.id + ']').join(', '); });
  list.forEach((c) => {
    step('  [' + c.name + '] โฟลเดอร์', () => { const f = coFolder_(c.id); return f.getName() + ' — เจ้าของ ' + f.getOwner().getEmail(); });
    step('  [' + c.name + '] ไฟล์ข้อมูล', () => { const f = coDataFile_(c.id); return f ? (f.getSize() / 1024).toFixed(1) + ' KB, แก้ไขล่าสุด ' + f.getLastUpdated() : 'ยังไม่มี (ปกติสำหรับบริษัทใหม่)'; });
    step('  [' + c.name + '] อ่านไฟล์ข้อมูล', () => { const f = coDataFile_(c.id); if (!f) return 'ข้าม'; const d = JSON.parse(f.getBlob().getDataAsString()); return (d.documents || []).length + ' เอกสาร'; });
    step('  [' + c.name + '] โฟลเดอร์ Backups', () => coSub_(c.id, BACKUP_FOLDER_NAME).getName());
    step('  [' + c.name + '] โฟลเดอร์ Attachments', () => coSub_(c.id, ATTACH_FOLDER_NAME).getName());
  });
  step('ค่าตั้งค่า', () => 'Google Login: ' + (clientId_() ? 'เปิด' : 'ปิด') + ' · โดเมน: ' + (domain_() || 'ไม่จำกัด') + ' · รหัสผ่าน: ' + (allowPassword_() ? 'เปิด' : 'ปิด'));
  Logger.log('— ถ้ามี ❌ ให้ส่งภาพ Execution log นี้ให้ผู้พัฒนา');
}

function rotateToken() {
  const token = Utilities.getUuid().replace(/-/g, '');
  props().setProperty('API_TOKEN', token);
  Logger.log('🔑 New API Token: ' + token);
}

/** ใช้กรณีฉุกเฉิน: ตั้งผู้ใช้เป็นผู้ดูแลระบบ — แก้อีเมลแล้วกด Run */
function makeAdmin() {
  const email = 'ใส่อีเมลที่นี่@gmail.com';
  const u = findUser_(email);
  if (!u) { Logger.log('ไม่พบผู้ใช้ ' + email); return; }
  u.role = 'admin'; u.status = 'active'; saveUser_(u);
  Logger.log('✅ ตั้ง ' + email + ' เป็นผู้ดูแลระบบแล้ว');
}

function doGet() {
  return json_({ ok: true, app: APP_NAME, message: 'VoltGrid backend is running. Use POST.' });
}

const PUBLIC_ACTIONS = { ping: 1, config: 1, loginGoogle: 1, loginPassword: 1, register: 1 };
const ADMIN_ACTIONS = { listUsers: 1, updateUser: 1, deleteUser: 1, resetPassword: 1, activity: 1, restore: 1, createCompany: 1, renameCompany: 1, removeCompany: 1 };
const COMPANY_ACTIONS = { save: 1, load: 1, uploadFile: 1, getFile: 1, deleteFile: 1, backup: 1, listBackups: 1, restore: 1 };

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'invalid json' }); }
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
    let me = null;
    if (!PUBLIC_ACTIONS[req.action]) {
      me = auth_(req);
      if (!me) return json_({ ok: false, code: 'AUTH', error: 'กรุณาเข้าสู่ระบบใหม่' });
      if (ADMIN_ACTIONS[req.action] && me.role !== 'admin') return json_({ ok: false, code: 'FORBIDDEN', error: 'เฉพาะผู้ดูแลระบบ' });
    }
    const cid = COMPANY_ACTIONS[req.action] ? cid_(req, me) : null;
    if (req.action === 'save' || req.action === 'activity') flushLogQueue_();
    switch (req.action) {
      case 'ping': return json_({ ok: true, app: APP_NAME, version: 4 });
      case 'config': return json_(config_());
      case 'loginGoogle': return json_(loginGoogle_(req));
      case 'loginPassword': return json_(loginPassword_(req));
      case 'register': return json_(register_(req));
      case 'me': return json_({ ok: true, user: publicUser_(me) });
      case 'logout': return json_(logout_(req, me));
      case 'updateProfile': return json_(updateProfile_(req, me));
      case 'changePassword': return json_(changePassword_(req, me));
      case 'listUsers': return json_({ ok: true, users: getUsers_().map(publicUser_) });
      case 'updateUser': return json_(updateUser_(req, me));
      case 'deleteUser': return json_(deleteUser_(req, me));
      case 'resetPassword': return json_(resetPassword_(req, me));
      case 'activity': return json_(activity_(req));
      case 'listCompanies': return json_({ ok: true, companies: myCompanies_(me) });
      case 'createCompany': return json_(createCompany_(req, me));
      case 'renameCompany': return json_(renameCompany_(req, me));
      case 'removeCompany': return json_(removeCompany_(req, me));
      case 'save': return json_(save_(req, me, cid));
      case 'load': return json_(load_(cid));
      case 'uploadFile': return json_(uploadFile_(req, me, cid));
      case 'getFile': return json_(getFile_(req, cid));
      case 'deleteFile': return json_(deleteFile_(req, me, cid));
      case 'backup': logRows_(me, [{ action: 'สำรองข้อมูล', detail: '' }], company_(cid).name); return json_(backup_('manual', cid));
      case 'listBackups': return json_(listBackups_(cid));
      case 'restore': logRows_(me, [{ action: 'กู้คืนข้อมูล', detail: req.id }], company_(cid).name); return json_(restore_(req.id, cid));
      default: return json_({ ok: false, error: 'unknown action: ' + req.action });
    }
  } catch (err) {
    // ระบุตำแหน่งที่เกิดปัญหา (ชื่อฟังก์ชัน/บรรทัด) เพื่อช่วยแก้ไข — ไม่มีข้อมูลลับ
    const where = String((err && err.stack) || '').split('\n').map((l) => l.trim()).filter((l) => /^at /.test(l)).slice(0, 3).map((l) => l.replace(/^at\s+/, '').replace(/\s*\(.*?:(\d+)(:\d+)?\)/, ' (บรรทัด $1)')).join(' ← ');
    return json_({ ok: false, code: (err && err.code) || undefined, error: String((err && err.message) || err), where: where || undefined, by: (function () { try { return Session.getEffectiveUser().getEmail(); } catch (e) { return ''; } })() });
  } finally {
    try { lock.releaseLock(); } catch (e2) { /* noop */ }
  }
}

/* =================== Auth =================== */
function config_() {
  return { ok: true, app: APP_NAME, version: 4, files: true, multiCompany: true, google: !!clientId_(), clientId: clientId_(), password: allowPassword_(),
    domain: domain_(), hasUsers: getUsers_().length > 0 };
}

function auth_(req) {
  const token = props().getProperty('API_TOKEN');
  if (req.token && token && req.token === token) return { email: 'system', firstName: 'System', lastName: '', role: 'admin', status: 'active' };
  if (!req.session) return null;
  const raw = props().getProperty('sess:' + req.session);
  if (!raw) return null;
  const s = JSON.parse(raw);
  if (s.exp < Date.now()) { props().deleteProperty('sess:' + req.session); return null; }
  const u = findUser_(s.email);
  if (!u || u.status !== 'active') return null;
  return u;
}

function verifyGoogle_(idToken) {
  if (!clientId_()) throw new Error('ยังไม่ได้เปิดใช้การเข้าสู่ระบบด้วย Google');
  const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('ยืนยันตัวตนกับ Google ไม่สำเร็จ');
  const t = JSON.parse(res.getContentText());
  if (t.aud !== clientId_()) throw new Error('Client ID ไม่ตรงกัน');
  if (String(t.email_verified) !== 'true') throw new Error('อีเมล Google ยังไม่ได้ยืนยัน');
  if (+t.exp * 1000 < Date.now()) throw new Error('การยืนยันตัวตนหมดอายุ กรุณาลองใหม่');
  const email = String(t.email).toLowerCase();
  checkDomain_(email);
  return { email: email, firstName: t.given_name || '', lastName: t.family_name || '', picture: t.picture || '' };
}

function checkDomain_(email) {
  const dom = domain_();
  if (dom && !email.endsWith('@' + dom.toLowerCase())) throw new Error('อนุญาตเฉพาะอีเมล @' + dom);
}

function loginGoogle_(req) {
  const g = verifyGoogle_(req.idToken);
  const u = findUser_(g.email);
  if (!u) return { ok: true, needRegister: true, profile: g };
  return loginResult_(u, 'Google');
}

function loginPassword_(req) {
  if (!allowPassword_()) throw new Error('ระบบนี้อนุญาตเฉพาะการเข้าสู่ระบบด้วย Google');
  const email = String(req.email || '').trim().toLowerCase();
  const cache = CacheService.getScriptCache();
  const fails = +(cache.get('fail:' + email) || 0);
  if (fails >= 5) throw new Error('ใส่รหัสผ่านผิดหลายครั้ง กรุณารอ 15 นาที');
  const u = findUser_(email);
  const pw = props().getProperty('pw:' + email);
  if (!u || !pw || hash_(String(req.password || ''), JSON.parse(pw).salt) !== JSON.parse(pw).hash) {
    cache.put('fail:' + email, String(fails + 1), 900);
    throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  }
  cache.remove('fail:' + email);
  return loginResult_(u, 'รหัสผ่าน');
}

function register_(req) {
  const p = req.profile || {};
  let email, authType;
  if (req.idToken) { email = verifyGoogle_(req.idToken).email; authType = 'google'; }
  else {
    if (!allowPassword_()) throw new Error('กรุณาลงทะเบียนด้วยบัญชี Google');
    email = String(p.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('อีเมลไม่ถูกต้อง');
    checkDomain_(email);
    if (String(req.password || '').length < 8) throw new Error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
    authType = 'password';
  }
  ['firstName', 'lastName', 'phone', 'birthDate', 'position'].forEach((k) => { if (!String(p[k] || '').trim()) throw new Error('กรุณากรอกข้อมูลให้ครบทุกช่อง'); });
  if (!/^0\d{8,9}$/.test(String(p.phone).replace(/[\s-]/g, ''))) throw new Error('เบอร์โทรไม่ถูกต้อง');
  if (findUser_(email)) throw new Error('อีเมลนี้ลงทะเบียนแล้ว กรุณาเข้าสู่ระบบ');
  const first = getUsers_().length === 0;
  const u = { email: email, firstName: clean_(p.firstName), lastName: clean_(p.lastName), phone: String(p.phone).replace(/[\s-]/g, ''),
    birthDate: clean_(p.birthDate), position: clean_(p.position), role: first ? 'admin' : 'staff', status: first ? 'active' : 'pending',
    authType: authType, createdAt: nowStr_(), lastLogin: '', approvedBy: first ? 'ผู้ใช้คนแรก (อัตโนมัติ)' : '' };
  saveUser_(u);
  if (authType === 'password') setPassword_(email, req.password);
  log_(u, 'ลงทะเบียน', (first ? 'ผู้ดูแลระบบคนแรก' : 'รออนุมัติ') + ' · ' + u.position);
  return loginResult_(u, authType === 'google' ? 'Google' : 'รหัสผ่าน');
}

function loginResult_(u, via) {
  if (u.status === 'disabled') throw new Error('บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
  if (u.status !== 'active') return { ok: true, pending: true, user: publicUser_(u) };
  const all = props().getProperties();
  Object.keys(all).forEach((k) => { if (k.indexOf('sess:') === 0) { try { if (JSON.parse(all[k]).exp < Date.now()) props().deleteProperty(k); } catch (e) { props().deleteProperty(k); } } });
  const session = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  const exp = Date.now() + SESSION_DAYS * 86400000;
  props().setProperty('sess:' + session, JSON.stringify({ email: u.email, exp: exp }));
  // ขั้นต่อไปนี้ไม่จำเป็นต่อการเข้าสู่ระบบ — ถ้าล้มจะไม่ขัดการเข้าใช้งาน
  // ไม่เขียน Google Sheets ระหว่างเข้าสู่ระบบ (ให้ตอบกลับเร็วและไม่ขึ้นกับ Sheets)
  u.lastLogin = nowStr_();
  props().setProperty('last:' + u.email, u.lastLogin);
  queueLog_(u, 'เข้าสู่ระบบ', via);
  const res = { ok: true, session: session, exp: exp, user: publicUser_(u), companies: myCompanies_(u) };
  if (u.role === 'admin') { try { res.pendingUsers = getUsers_().filter((x) => x.status === 'pending').length; } catch (e) { warn_('นับผู้รออนุมัติ', e); } }
  return res;
}

function logout_(req, me) {
  if (req.session) props().deleteProperty('sess:' + req.session);
  log_(me, 'ออกจากระบบ', '');
  return { ok: true };
}

function updateProfile_(req, me) {
  const p = req.profile || {};
  ['firstName', 'lastName', 'phone', 'birthDate', 'position'].forEach((k) => { if (p[k] !== undefined && String(p[k]).trim()) me[k] = k === 'phone' ? String(p[k]).replace(/[\s-]/g, '') : clean_(p[k]); });
  saveUser_(me); log_(me, 'แก้ไขโปรไฟล์', '');
  return { ok: true, user: publicUser_(me) };
}

function changePassword_(req, me) {
  const pw = props().getProperty('pw:' + me.email);
  if (pw && hash_(String(req.oldPassword || ''), JSON.parse(pw).salt) !== JSON.parse(pw).hash) throw new Error('รหัสผ่านเดิมไม่ถูกต้อง');
  if (String(req.newPassword || '').length < 8) throw new Error('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร');
  setPassword_(me.email, req.newPassword); log_(me, 'เปลี่ยนรหัสผ่าน', '');
  return { ok: true };
}

function updateUser_(req, me) {
  const u = findUser_(req.email);
  if (!u) throw new Error('ไม่พบผู้ใช้');
  const admins = getUsers_().filter((x) => x.role === 'admin' && x.status === 'active');
  const losingAdmin = u.role === 'admin' && (req.role === 'staff' || (req.status && req.status !== 'active'));
  if (losingAdmin && admins.length <= 1) throw new Error('ต้องมีผู้ดูแลระบบอย่างน้อย 1 คน');
  const changes = [];
  if (req.status && req.status !== u.status) { if (req.status === 'active' && u.status === 'pending') u.approvedBy = me.email; changes.push('สถานะ ' + u.status + ' → ' + req.status); u.status = req.status; }
  if (req.role && req.role !== u.role) { changes.push('สิทธิ์ ' + u.role + ' → ' + req.role); u.role = req.role; }
  if (req.companies !== undefined) { const v = String(req.companies || '').trim(); u.companies = v === '*' ? '' : v; changes.push('บริษัทที่เข้าได้: ' + (u.companies || 'ทุกบริษัท')); }
  if (req.status === 'disabled') revokeSessions_(u.email);
  saveUser_(u); log_(me, 'จัดการผู้ใช้', u.email + ': ' + changes.join(', '));
  return { ok: true, user: publicUser_(u) };
}

function deleteUser_(req, me) {
  const email = String(req.email || '').toLowerCase();
  if (email === me.email) throw new Error('ลบบัญชีตัวเองไม่ได้');
  const sh = userSheet_(); const rows = sh.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) if (String(rows[i][0]).toLowerCase() === email) sh.deleteRow(i + 1);
  props().deleteProperty('pw:' + email); revokeSessions_(email); USERS_CACHE = null;
  log_(me, 'ลบผู้ใช้', email);
  return { ok: true };
}

function resetPassword_(req, me) {
  const u = findUser_(req.email);
  if (!u) throw new Error('ไม่พบผู้ใช้');
  if (String(req.newPassword || '').length < 8) throw new Error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
  setPassword_(u.email, req.newPassword); revokeSessions_(u.email);
  if (u.authType !== 'password') { u.authType = u.authType + '+password'; saveUser_(u); }
  log_(me, 'รีเซ็ตรหัสผ่าน', u.email);
  return { ok: true };
}

function revokeSessions_(email) {
  const all = props().getProperties();
  Object.keys(all).forEach((k) => { if (k.indexOf('sess:') === 0) { try { if (JSON.parse(all[k]).email === email) props().deleteProperty(k); } catch (e) { /* noop */ } } });
}

function setPassword_(email, password) {
  const salt = Utilities.getUuid();
  props().setProperty('pw:' + email, JSON.stringify({ salt: salt, hash: hash_(String(password), salt) }));
}

function hash_(password, salt) {
  let h = salt + ':' + password;
  for (let i = 0; i < 300; i++) h = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h + salt, Utilities.Charset.UTF_8));
  return h;
}

/* =================== Users sheet =================== */
let USERS_CACHE = null;
let USER_SH = null;
function userSheet_() {
  if (USER_SH) return USER_SH;
  const ss = getSpreadsheet_();
  let sh = ss.getSheetByName(USER_SHEET);
  if (!sh) {
    sh = ss.insertSheet(USER_SHEET);
    sh.getRange(1, 1, 1000, USER_COLS.length).setNumberFormat('@');
    sh.getRange(1, 1, 1, USER_COLS.length).setValues([USER_COLS.map((c) => c[1])]).setFontWeight('bold').setBackground('#2E7D32').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  // หมายเหตุ: ไม่อ่าน/เขียนแถวหัวตาราง (แถว 1) ทีละช่อง — บางชีตปฏิเสธการเข้าถึงส่วนนี้
  USER_SH = sh;
  return sh;
}
function getUsers_() {
  if (USERS_CACHE) return USERS_CACHE;
  const rows = retry_(() => userSheet_().getDataRange().getValues());
  USERS_CACHE = rows.slice(1).filter((r) => r[0]).map((r) => { const o = {}; USER_COLS.forEach((c, i) => (o[c[0]] = String(r[i] === undefined ? '' : r[i]))); o.email = o.email.toLowerCase(); const ll = props().getProperty('last:' + o.email); if (ll) o.lastLogin = ll; return o; });
  return USERS_CACHE;
}
function findUser_(email) { email = String(email || '').toLowerCase(); return getUsers_().find((u) => u.email === email) || null; }
function saveUser_(u) {
  const row = USER_COLS.map((c) => String(u[c[0]] === undefined ? '' : u[c[0]]));
  retry_(() => {
    const sh = userSheet_(); const rows = sh.getDataRange().getValues();
    let idx = -1;
    for (let i = 1; i < rows.length; i++) if (String(rows[i][0]).toLowerCase() === u.email) { idx = i; break; }
    if (idx >= 0) sh.getRange(idx + 1, 1, 1, row.length).setValues([row]);
    else { const r = Math.max(sh.getLastRow(), 1) + 1; sh.getRange(r, 1, 1, row.length).setNumberFormat('@').setValues([row]); }
  });
  if (USERS_CACHE) {   // อัปเดตในหน่วยความจำ ไม่ต้องอ่านชีตซ้ำ
    const o = {}; USER_COLS.forEach((c, i) => (o[c[0]] = row[i])); o.email = String(o.email).toLowerCase();
    const i = USERS_CACHE.findIndex((x) => x.email === o.email);
    if (i >= 0) USERS_CACHE[i] = o; else USERS_CACHE.push(o);
  }
}
function publicUser_(u) { const o = {}; USER_COLS.forEach((c) => (o[c[0]] = u[c[0]] || '')); return o; }

/** เติมหัวคอลัมน์ใหม่ให้ชีตจากเวอร์ชันก่อน (รันใน setup เท่านั้น — ถ้าทำไม่ได้ก็ไม่เป็นไร) */
function upgradeHeaders_() {
  const fix = (sh, headers) => {
    try {
      const cur = sh.getRange(1, 1, 1, headers.length).getValues()[0].map(String);
      if (cur.join('|') !== headers.join('|')) sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#2E7D32').setFontColor('#ffffff');
    } catch (e) { Logger.log('ℹ️ ข้ามการปรับหัวคอลัมน์ชีต “' + sh.getName() + '”: ' + e.message + ' (ไม่กระทบการทำงาน)'); }
  };
  fix(userSheet_(), USER_COLS.map((c) => c[1]));
  fix(logSheet_(), ['เวลา', 'อีเมล', 'ชื่อ', 'การกระทำ', 'รายละเอียด', 'บริษัท']);
}

/* =================== Activity log =================== */
let LOG_SH = null;
function logSheet_() {
  if (LOG_SH) return LOG_SH;
  const ss = getSpreadsheet_();
  let sh = ss.getSheetByName(LOG_SHEET);
  if (!sh) {
    sh = ss.insertSheet(LOG_SHEET);
    sh.getRange(1, 1, 1, 6).setValues([['เวลา', 'อีเมล', 'ชื่อ', 'การกระทำ', 'รายละเอียด', 'บริษัท']]).setFontWeight('bold').setBackground('#2E7D32').setFontColor('#ffffff');
    sh.setFrozenRows(1); sh.setColumnWidth(1, 160); sh.setColumnWidth(5, 380);
  }
  LOG_SH = sh;
  return sh;
}
function log_(user, action, detail) { logRows_(user, [{ action: action, detail: detail }]); }
/** บันทึกประวัติ — ถ้าเขียนไม่ได้ จะไม่ขัดการทำงานหลัก (เช่น การเข้าสู่ระบบ) */
/** เก็บประวัติไว้ก่อน (ใน Script Properties) แล้วค่อยเขียนลงชีตในคำขอถัดไป */
function queueLog_(user, action, detail) {
  try {
    const q = JSON.parse(props().getProperty('LOG_QUEUE') || '[]');
    q.push({ at: new Date().toISOString(), email: user.email, name: ((user.firstName || '') + ' ' + (user.lastName || '')).trim(), action: action, detail: detail || '' });
    props().setProperty('LOG_QUEUE', JSON.stringify(q.slice(-100)));
  } catch (e) { warn_('เก็บประวัติชั่วคราว', e); }
}
function flushLogQueue_() {
  let q;
  try { q = JSON.parse(props().getProperty('LOG_QUEUE') || '[]'); } catch (e) { q = []; }
  if (!q.length) return;
  props().deleteProperty('LOG_QUEUE');
  try {
    const sh = logSheet_();
    const rows = q.map((x) => [new Date(x.at), x.email, x.name, x.action, x.detail, '']);
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, 6).setValues(rows);
  } catch (e) { warn_('เขียนประวัติที่ค้าง', e); }
}
function logRows_(user, items, companyName) {
  try { logRowsUnsafe_(user, items, companyName); }
  catch (e) { try { console.error('บันทึกประวัติการใช้งานไม่สำเร็จ: ' + e.message); } catch (e2) { /* noop */ } }
}
function logRowsUnsafe_(user, items, companyName) {
  if (!items || !items.length) return;
  const name = user ? ((user.firstName || '') + ' ' + (user.lastName || '')).trim() : '';
  const rows = items.slice(0, 200).map((it) => [it.at ? new Date(it.at) : new Date(), user ? user.email : '', name, String(it.action || '').slice(0, 100), String(it.detail || '').slice(0, 500), companyName || '']);
  const sh2 = logSheet_(); sh2.getRange(sh2.getLastRow() + 1, 1, rows.length, 6).setValues(rows);
}
function activity_(req) {
  const sh = logSheet_(); const last = sh.getLastRow();
  const n = Math.min(+req.limit || 300, Math.max(last - 1, 0));
  if (!n) return { ok: true, rows: [] };
  const vals = sh.getRange(last - n + 1, 1, n, 6).getValues().reverse();
  return { ok: true, rows: vals.map((r) => ({ at: r[0] instanceof Date ? r[0].toISOString() : String(r[0]), email: r[1], name: r[2], action: r[3], detail: r[4], company: r[5] || '' })) };
}

/* =================== Companies (หลายบริษัท แยกโฟลเดอร์) =================== */
/** รายชื่อบริษัท: [{id, name, createdAt}] — บริษัทแรกใช้ id 'main' */
function companies_() {
  const raw = props().getProperty('COMPANIES');
  if (raw) { try { const l = JSON.parse(raw); if (l.length) return l; } catch (e) { /* rebuild */ } }
  let name = 'บริษัทหลัก';
  try { const f = coDataFile_('main'); if (f) { const d = JSON.parse(f.getBlob().getDataAsString()); if (d.company && d.company.name) name = d.company.name; } } catch (e) { /* noop */ }
  const list = [{ id: 'main', name: name, createdAt: nowStr_() }];
  props().setProperty('COMPANIES', JSON.stringify(list));
  return list;
}
function saveCompanies_(list) { props().setProperty('COMPANIES', JSON.stringify(list)); }
function company_(cid) { const c = companies_().find((x) => x.id === cid); if (!c) throw new Error('ไม่พบบริษัท'); return c; }
function userCompanies_(u) { const v = String(u.companies || '').trim(); return !v || v === '*' ? null : v.split(',').map((x) => x.trim()).filter(Boolean); }
function canAccess_(u, cid) { if (u.role === 'admin') return true; const l = userCompanies_(u); return !l || l.indexOf(cid) >= 0; }
function myCompanies_(u) { return companies_().filter((c) => canAccess_(u, c.id)).map((c) => ({ id: c.id, name: c.name })); }

/** ตรวจสิทธิ์และคืนรหัสบริษัทของคำขอ */
function cid_(req, me) {
  const cid = String(req.company || 'main');
  company_(cid);
  if (!canAccess_(me, cid)) { const e = new Error('คุณไม่มีสิทธิ์เข้าถึงบริษัทนี้'); e.code = 'NOCOMPANY'; throw e; }
  return cid;
}

function createCompany_(req, me) {
  const name = clean_(req.name);
  if (!name) throw new Error('กรุณาระบุชื่อบริษัท');
  const list = companies_();
  if (list.some((c) => c.name === name)) throw new Error('มีบริษัทชื่อนี้อยู่แล้ว');
  const id = 'c' + Utilities.getUuid().replace(/-/g, '').slice(0, 10);
  const folder = getFolder_().createFolder(safeName_(name));
  props().setProperty('C:' + id + ':FOLDER_ID', folder.getId());
  list.push({ id: id, name: name, createdAt: nowStr_() });
  saveCompanies_(list);
  log_(me, 'เพิ่มบริษัท', name);
  return { ok: true, company: { id: id, name: name }, companies: myCompanies_(me) };
}

function renameCompany_(req, me) {
  const name = clean_(req.name);
  if (!name) throw new Error('กรุณาระบุชื่อบริษัท');
  const list = companies_(); const c = list.find((x) => x.id === req.id);
  if (!c) throw new Error('ไม่พบบริษัท');
  const old = c.name; c.name = name; saveCompanies_(list);
  try { if (props().getProperty('C:' + c.id + ':FOLDER_ID')) coFolder_(c.id).setName(safeName_(name)); } catch (e) { /* โฟลเดอร์ยังใช้ได้แม้เปลี่ยนชื่อไม่สำเร็จ */ }
  log_(me, 'เปลี่ยนชื่อบริษัท', old + ' → ' + name);
  return { ok: true, companies: myCompanies_(me) };
}

/** นำบริษัทออกจากระบบ — โฟลเดอร์และข้อมูลใน Google Drive ยังอยู่ (เติม "(นำออกแล้ว)" ต่อท้ายชื่อโฟลเดอร์) */
function removeCompany_(req, me) {
  const list = companies_();
  if (list.length <= 1) throw new Error('ต้องมีอย่างน้อย 1 บริษัท');
  const c = list.find((x) => x.id === req.id);
  if (!c) throw new Error('ไม่พบบริษัท');
  try { if (props().getProperty('C:' + c.id + ':FOLDER_ID')) { const f = coFolder_(c.id); f.setName(f.getName() + ' (นำออกแล้ว ' + nowStr_().slice(0, 10) + ')'); } } catch (e) { /* noop */ }
  saveCompanies_(list.filter((x) => x.id !== c.id));
  log_(me, 'นำบริษัทออก', c.name);
  return { ok: true, companies: myCompanies_(me) };
}

/* ---------- ที่เก็บข้อมูลของแต่ละบริษัท ---------- */
function coFolder_(cid) {
  const id = props().getProperty('C:' + cid + ':FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* fallthrough */ } }
  if (cid === 'main') return getFolder_();   // ยังไม่ได้ย้ายเข้าโฟลเดอร์ย่อย (ยังไม่ได้รัน setup)
  throw new Error('ไม่พบโฟลเดอร์ของบริษัท');
}
function coSub_(cid, name) {
  const f = coFolder_(cid); const it = f.getFoldersByName(name);
  return it.hasNext() ? it.next() : f.createFolder(name);
}
function coDataFile_(cid) { const it = coFolder_(cid).getFilesByName(DATA_FILE); return it.hasNext() ? it.next() : null; }
function coSheet_(cid) {
  if (cid === 'main') return getSpreadsheet_();
  const k = 'C:' + cid + ':SHEET_ID'; const id = props().getProperty(k);
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) { /* recreate */ } }
  const ss = SpreadsheetApp.create(safeName_(company_(cid).name) + ' — Database');
  DriveApp.getFileById(ss.getId()).moveTo(coFolder_(cid));
  props().setProperty(k, ss.getId());
  return ss;
}

/** ย้ายข้อมูลบริษัทแรกเข้าโฟลเดอร์ของตัวเอง (ทำครั้งเดียวตอนรัน setup) */
function migrateMainFolder_() {
  if (props().getProperty('C:main:FOLDER_ID')) return;
  const root = getFolder_();
  const name = companies_()[0].name;
  const sub = root.createFolder(safeName_(name));
  const fi = root.getFilesByName(DATA_FILE); while (fi.hasNext()) fi.next().moveTo(sub);
  [BACKUP_FOLDER_NAME, ATTACH_FOLDER_NAME].forEach((n) => { const it = root.getFoldersByName(n); while (it.hasNext()) it.next().moveTo(sub); });
  props().setProperty('C:main:FOLDER_ID', sub.getId());
  Logger.log('📦 ย้ายข้อมูล “' + name + '” เข้าโฟลเดอร์ของบริษัทแล้ว: ' + sub.getUrl());
}

/* =================== Data =================== */
function save_(req, me, cid) {
  if (!req.data || !req.data.accounts) throw new Error('ไม่มีข้อมูล');
  const file = coDataFile_(cid);
  if (file && !req.force) {
    const cur = JSON.parse(file.getBlob().getDataAsString());
    const curVer = (cur.meta && cur.meta.syncedAt) || '';
    if (curVer && req.baseVersion !== curVer) return { ok: false, conflict: true, data: cur };
  }
  const savedAt = new Date().toISOString();
  const clean = JSON.parse(JSON.stringify(req.data));
  clean.meta = clean.meta || {};
  clean.meta.syncedAt = savedAt;
  clean.meta.savedBy = me.email;
  delete clean.meta.dirty;
  if (clean.settings) { delete clean.settings.gasToken; delete clean.settings.gasUrl; }
  const content = JSON.stringify(clean);
  if (file) file.setContent(content);
  else coFolder_(cid).createFile(DATA_FILE, content, MimeType.PLAIN_TEXT);
  let warning;
  if (req.tables) { try { writeTables_(req.tables, coSheet_(cid)); } catch (e) { warn_('อัปเดตตาราง Google Sheets', e); warning = 'บันทึกข้อมูลแล้ว แต่อัปเดตตาราง Google Sheets ไม่สำเร็จ: ' + e.message; } }
  if (req.activity && req.activity.length) logRows_(me, req.activity, company_(cid).name);
  return { ok: true, savedAt: savedAt, size: content.length, warning: warning };
}

function load_(cid) {
  const file = coDataFile_(cid);
  if (!file) return { ok: true, data: null };
  return { ok: true, data: JSON.parse(file.getBlob().getDataAsString()) };
}

function backup_(kind, cid) {
  const file = coDataFile_(cid);
  if (!file) throw new Error('ยังไม่มีข้อมูลให้สำรอง');
  const stamp = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd-HHmmss');
  const name = 'accflow-backup-' + stamp + (kind === 'auto' ? '-auto' : '') + '.json';
  const folder = coSub_(cid, BACKUP_FOLDER_NAME);
  const copy = file.makeCopy(name, folder);
  pruneBackups_(folder);
  return { ok: true, name: name, id: copy.getId() };
}

function listBackups_(cid) {
  const it = coSub_(cid, BACKUP_FOLDER_NAME).getFiles();
  const files = [];
  while (it.hasNext()) { const f = it.next(); files.push({ id: f.getId(), name: f.getName(), date: f.getDateCreated().toISOString(), size: f.getSize() }); }
  files.sort((a, b) => (a.date < b.date ? 1 : -1));
  return { ok: true, files: files.slice(0, 30), sheetUrl: coSheet_(cid).getUrl(), folderUrl: coFolder_(cid).getUrl() };
}

function restore_(id, cid) {
  const f = DriveApp.getFileById(id);
  const parents = f.getParents(); let ok = false; const bid = coSub_(cid, BACKUP_FOLDER_NAME).getId();
  while (parents.hasNext()) if (parents.next().getId() === bid) ok = true;
  if (!ok) throw new Error('ไฟล์ไม่อยู่ในโฟลเดอร์สำรองข้อมูลของบริษัทนี้');
  backup_('manual', cid);
  const data = JSON.parse(f.getBlob().getDataAsString());
  data.meta = data.meta || {};
  data.meta.syncedAt = new Date().toISOString();
  coDataFile_(cid).setContent(JSON.stringify(data));
  return { ok: true, data: data };
}

/** ตั้งเวลาไว้ใน setup(): สำรองข้อมูลทุกบริษัททุกวัน */
function dailyBackup() {
  companies_().forEach((c) => { try { if (coDataFile_(c.id)) backup_('auto', c.id); } catch (e) { Logger.log('backup ' + c.name + ': ' + e); } });
}

/* =================== Attachments (PO / WO / สัญญา) =================== */
function safeName_(s) { return String(s || '').replace(/[\\/:*?"<>|#%]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100); }

/** ไฟล์ต้องอยู่ในโฟลเดอร์ Attachments ของบริษัทนั้น (หรือโฟลเดอร์ย่อย 1 ชั้น) เท่านั้น */
function attachFile_(fileId, cid) {
  const f = DriveApp.getFileById(fileId);
  const root = coSub_(cid, ATTACH_FOLDER_NAME).getId();
  const ps = f.getParents();
  while (ps.hasNext()) {
    const p = ps.next();
    if (p.getId() === root) return f;
    const gp = p.getParents();
    while (gp.hasNext()) if (gp.next().getId() === root) return f;
  }
  throw new Error('ไม่พบไฟล์แนบ');
}

function uploadFile_(req, me, cid) {
  const name = safeName_(req.name) || 'file';
  const bytes = Utilities.base64Decode(String(req.data || ''));
  if (!bytes.length) throw new Error('ไฟล์ว่างเปล่า');
  if (bytes.length > MAX_FILE_BYTES) throw new Error('ไฟล์ใหญ่เกิน 10 MB');
  const root = coSub_(cid, ATTACH_FOLDER_NAME);
  let folder = root;
  const sub = safeName_(req.folder);
  if (sub) { const it = root.getFoldersByName(sub); folder = it.hasNext() ? it.next() : root.createFolder(sub); }
  const file = folder.createFile(Utilities.newBlob(bytes, req.mime || 'application/octet-stream', name));
  logRows_(me, [{ action: 'แนบไฟล์', detail: (sub ? sub + ' / ' : '') + name }], company_(cid).name);
  return { ok: true, fileId: file.getId(), name: name, size: bytes.length, mime: req.mime || '' };
}

function getFile_(req, cid) {
  const f = attachFile_(req.fileId, cid);
  const blob = f.getBlob();
  return { ok: true, name: f.getName(), mime: blob.getContentType(), data: Utilities.base64Encode(blob.getBytes()) };
}

function deleteFile_(req, me, cid) {
  const f = attachFile_(req.fileId, cid);
  f.setTrashed(true);
  logRows_(me, [{ action: 'ลบไฟล์แนบ', detail: f.getName() }], company_(cid).name);
  return { ok: true };
}

/* =================== Google Sheets tables =================== */
function writeTables_(tables, ss) {
  Object.keys(tables).forEach(function (name) {
    if (name === USER_SHEET || name === LOG_SHEET) return;
    const rows = tables[name];
    if (!rows || !rows.length) return;
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    sh.clearContents();
    const width = rows.reduce((m, r) => Math.max(m, r.length), 0);
    const data = rows.map((r) => { const x = r.slice(); while (x.length < width) x.push(''); return x.map((v) => (v === null || v === undefined ? '' : v)); });
    sh.getRange(1, 1, data.length, width).setValues(data);
    sh.getRange(1, 1, 1, width).setFontWeight('bold').setBackground('#2E7D32').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  });
  ['Sheet1', 'แผ่น1', 'ชีต1'].forEach((n) => { const def = ss.getSheetByName(n); if (def && ss.getSheets().length > 1) ss.deleteSheet(def); });
  let info = ss.getSheetByName('ข้อมูลระบบ');
  if (!info) info = ss.insertSheet('ข้อมูลระบบ');
  info.clearContents();
  info.getRange(1, 1, 2, 2).setValues([['อัปเดตล่าสุด', new Date()], ['หมายเหตุ', 'ชีตนี้สร้างอัตโนมัติจากระบบบัญชี — แก้ไขในโปรแกรมเท่านั้น']]);
}

/* =================== helpers =================== */
/** โฟลเดอร์หลักของระบบ (AccFlow Data) — โฟลเดอร์ของแต่ละบริษัทอยู่ข้างใน */
function getFolder_() {
  const id = props().getProperty('FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* recreate */ } }
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  const f = it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
  props().setProperty('FOLDER_ID', f.getId());
  return f;
}
/** Google Sheets กลาง: ผู้ใช้งาน + ประวัติการใช้งาน (+ ตารางของบริษัทแรก) */
let SS_CACHE = null;   // เปิดไฟล์ Sheets ครั้งเดียวต่อคำขอ แล้วใช้ซ้ำ
function getSpreadsheet_() {
  if (SS_CACHE) return SS_CACHE;
  const id = props().getProperty('SHEET_ID');
  if (id) { try { SS_CACHE = SpreadsheetApp.openById(id); return SS_CACHE; } catch (e) { /* recreate */ } }
  const ss = SpreadsheetApp.create(SHEET_NAME);
  DriveApp.getFileById(ss.getId()).moveTo(getFolder_());
  props().setProperty('SHEET_ID', ss.getId());
  SS_CACHE = ss;
  return ss;
}
function pruneBackups_(folder) {
  const it = folder.getFiles(); const files = [];
  while (it.hasNext()) files.push(it.next());
  files.sort((a, b) => b.getDateCreated() - a.getDateCreated());
  files.slice(KEEP_BACKUPS).forEach((f) => f.setTrashed(true));
}
/**
 * ลองใหม่อัตโนมัติเมื่อ Google Sheets ตอบ error ชั่วคราว (เช่น “ไม่มีสิทธิ์เข้าถึงเอกสาร”, Service error, timeout)
 * ระหว่างลองใหม่จะเปิดไฟล์ Sheets ใหม่
 */
function retry_(fn, tries) {
  tries = tries || 3;
  for (let i = 0; ; i++) {
    try { return fn(); }
    catch (e) {
      const msg = String((e && e.message) || e);
      const transient = /permission|สิทธิ์|access the requested|เข้าถึงเอกสาร|Service|บริการ|timed out|หมดเวลา|try again|ลองอีกครั้ง|internal error|ข้อผิดพลาดภายใน/i.test(msg);
      if (!transient || i >= tries - 1) throw e;
      warn_('Sheets (ลองใหม่ครั้งที่ ' + (i + 1) + ')', e);
      try { SpreadsheetApp.flush(); } catch (e2) { /* noop */ }
      SS_CACHE = null; USER_SH = null; LOG_SH = null;   // เปิดไฟล์ใหม่ในรอบถัดไป
      Utilities.sleep(250 * (i + 1));
    }
  }
}
function warn_(what, e) { try { console.warn(what + ' ไม่สำเร็จ: ' + ((e && e.message) || e)); } catch (e2) { /* noop */ } }
function clean_(s) { return String(s || '').trim().slice(0, 120); }
function nowStr_() { return Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss'); }
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
