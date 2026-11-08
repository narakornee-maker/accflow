/**
 * ============================================================
 *  VoltGrid Accounting Backend — Google Apps Script  (v2)
 *  - เก็บข้อมูลบัญชีใน Google Drive (JSON) + Google Sheets
 *  - ระบบผู้ใช้งาน: ลงทะเบียน / เข้าสู่ระบบ (Google หรือรหัสผ่าน) / ผู้ดูแลอนุมัติ
 *  - บันทึกประวัติการใช้งานลงชีต "ประวัติการใช้งาน"
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
const GOOGLE_CLIENT_ID = '';        // OAuth Client ID (…apps.googleusercontent.com) เพื่อเปิด "เข้าสู่ระบบด้วย Google"
const ALLOWED_DOMAIN = '';          // เช่น 'voltgrid.co.th' = รับเฉพาะอีเมลโดเมนนี้ (เว้นว่าง = ทุกอีเมล)
const ALLOW_PASSWORD_LOGIN = true;  // false = บังคับเข้าสู่ระบบด้วย Google เท่านั้น
const SESSION_DAYS = 7;             // อายุการเข้าสู่ระบบ (วัน)
/* =============================================== */

const APP_NAME = 'VoltGrid Accounting';
const FOLDER_NAME = 'AccFlow Data';
const BACKUP_FOLDER_NAME = 'Backups';
const DATA_FILE = 'accflow-data.json';
const SHEET_NAME = 'AccFlow Database';
const USER_SHEET = 'ผู้ใช้งาน';
const LOG_SHEET = 'ประวัติการใช้งาน';
const KEEP_BACKUPS = 60;
const USER_COLS = [['email', 'อีเมล'], ['firstName', 'ชื่อ'], ['lastName', 'นามสกุล'], ['phone', 'เบอร์โทร'], ['birthDate', 'วันเกิด'],
  ['position', 'ตำแหน่ง'], ['role', 'สิทธิ์'], ['status', 'สถานะ'], ['authType', 'วิธีเข้าสู่ระบบ'], ['createdAt', 'ลงทะเบียนเมื่อ'],
  ['lastLogin', 'เข้าใช้ล่าสุด'], ['approvedBy', 'อนุมัติโดย']];

const props = () => PropertiesService.getScriptProperties();

/** รันครั้งแรก / หลังอัปเดตโค้ด: สร้างโฟลเดอร์ ชีต Token และตั้งเวลาสำรองรายวัน */
function setup() {
  const folder = getFolder_();
  getBackupFolder_();
  const ss = getSpreadsheet_();
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
  Logger.log('🔑 API Token (สำหรับกู้คืนระบบ): ' + token);
  Logger.log('🔐 Google Login: ' + (GOOGLE_CLIENT_ID ? 'เปิด' : 'ปิด (ยังไม่ได้ใส่ GOOGLE_CLIENT_ID)'));
}

/** สร้าง Token กู้คืนระบบใหม่ */
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
const ADMIN_ACTIONS = { listUsers: 1, updateUser: 1, deleteUser: 1, resetPassword: 1, activity: 1, restore: 1 };

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
    switch (req.action) {
      case 'ping': return json_({ ok: true, app: APP_NAME, version: 2 });
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
      case 'save': return json_(save_(req, me));
      case 'load': return json_(load_());
      case 'backup': log_(me, 'สำรองข้อมูล', ''); return json_(backup_('manual'));
      case 'listBackups': return json_(listBackups_());
      case 'restore': log_(me, 'กู้คืนข้อมูล', req.id); return json_(restore_(req.id));
      default: return json_({ ok: false, error: 'unknown action: ' + req.action });
    }
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  } finally {
    try { lock.releaseLock(); } catch (e2) { /* noop */ }
  }
}

/* =================== Auth =================== */
function config_() {
  return { ok: true, app: APP_NAME, version: 2, google: !!GOOGLE_CLIENT_ID, clientId: GOOGLE_CLIENT_ID, password: ALLOW_PASSWORD_LOGIN,
    domain: ALLOWED_DOMAIN, hasUsers: getUsers_().length > 0 };
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
  if (!GOOGLE_CLIENT_ID) throw new Error('ยังไม่ได้เปิดใช้การเข้าสู่ระบบด้วย Google');
  const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('ยืนยันตัวตนกับ Google ไม่สำเร็จ');
  const t = JSON.parse(res.getContentText());
  if (t.aud !== GOOGLE_CLIENT_ID) throw new Error('Client ID ไม่ตรงกัน');
  if (String(t.email_verified) !== 'true') throw new Error('อีเมล Google ยังไม่ได้ยืนยัน');
  if (+t.exp * 1000 < Date.now()) throw new Error('การยืนยันตัวตนหมดอายุ กรุณาลองใหม่');
  const email = String(t.email).toLowerCase();
  checkDomain_(email);
  return { email: email, firstName: t.given_name || '', lastName: t.family_name || '', picture: t.picture || '' };
}

function checkDomain_(email) {
  if (ALLOWED_DOMAIN && !email.endsWith('@' + ALLOWED_DOMAIN.toLowerCase())) throw new Error('อนุญาตเฉพาะอีเมล @' + ALLOWED_DOMAIN);
}

function loginGoogle_(req) {
  const g = verifyGoogle_(req.idToken);
  const u = findUser_(g.email);
  if (!u) return { ok: true, needRegister: true, profile: g };
  return loginResult_(u, 'Google');
}

function loginPassword_(req) {
  if (!ALLOW_PASSWORD_LOGIN) throw new Error('ระบบนี้อนุญาตเฉพาะการเข้าสู่ระบบด้วย Google');
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
    if (!ALLOW_PASSWORD_LOGIN) throw new Error('กรุณาลงทะเบียนด้วยบัญชี Google');
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
  u.lastLogin = nowStr_(); saveUser_(u);
  log_(u, 'เข้าสู่ระบบ', via);
  const res = { ok: true, session: session, exp: exp, user: publicUser_(u) };
  if (u.role === 'admin') res.pendingUsers = getUsers_().filter((x) => x.status === 'pending').length;
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
function userSheet_() {
  const ss = getSpreadsheet_();
  let sh = ss.getSheetByName(USER_SHEET);
  if (!sh) {
    sh = ss.insertSheet(USER_SHEET);
    sh.getRange(1, 1, 1000, USER_COLS.length).setNumberFormat('@');
    sh.getRange(1, 1, 1, USER_COLS.length).setValues([USER_COLS.map((c) => c[1])]).setFontWeight('bold').setBackground('#2E7D32').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}
function getUsers_() {
  if (USERS_CACHE) return USERS_CACHE;
  const rows = userSheet_().getDataRange().getValues();
  USERS_CACHE = rows.slice(1).filter((r) => r[0]).map((r) => { const o = {}; USER_COLS.forEach((c, i) => (o[c[0]] = String(r[i] === undefined ? '' : r[i]))); o.email = o.email.toLowerCase(); return o; });
  return USERS_CACHE;
}
function findUser_(email) { email = String(email || '').toLowerCase(); return getUsers_().find((u) => u.email === email) || null; }
function saveUser_(u) {
  const sh = userSheet_(); const rows = sh.getDataRange().getValues();
  const row = USER_COLS.map((c) => String(u[c[0]] === undefined ? '' : u[c[0]]));
  let idx = -1;
  for (let i = 1; i < rows.length; i++) if (String(rows[i][0]).toLowerCase() === u.email) { idx = i; break; }
  if (idx >= 0) sh.getRange(idx + 1, 1, 1, row.length).setValues([row]);
  else { const r = Math.max(sh.getLastRow(), 1) + 1; sh.getRange(r, 1, 1, row.length).setNumberFormat('@').setValues([row]); }
  USERS_CACHE = null;
}
function publicUser_(u) { const o = {}; USER_COLS.forEach((c) => (o[c[0]] = u[c[0]] || '')); return o; }

/* =================== Activity log =================== */
function logSheet_() {
  const ss = getSpreadsheet_();
  let sh = ss.getSheetByName(LOG_SHEET);
  if (!sh) {
    sh = ss.insertSheet(LOG_SHEET);
    sh.getRange(1, 1, 1, 5).setValues([['เวลา', 'อีเมล', 'ชื่อ', 'การกระทำ', 'รายละเอียด']]).setFontWeight('bold').setBackground('#2E7D32').setFontColor('#ffffff');
    sh.setFrozenRows(1); sh.setColumnWidth(1, 160); sh.setColumnWidth(5, 380);
  }
  return sh;
}
function log_(user, action, detail) { logRows_(user, [{ action: action, detail: detail }]); }
function logRows_(user, items) {
  if (!items || !items.length) return;
  const sh = logSheet_();
  const name = user ? ((user.firstName || '') + ' ' + (user.lastName || '')).trim() : '';
  const rows = items.slice(0, 200).map((it) => [it.at ? new Date(it.at) : new Date(), user ? user.email : '', name, String(it.action || '').slice(0, 100), String(it.detail || '').slice(0, 500)]);
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, 5).setValues(rows);
}
function activity_(req) {
  const sh = logSheet_(); const last = sh.getLastRow();
  const n = Math.min(+req.limit || 300, Math.max(last - 1, 0));
  if (!n) return { ok: true, rows: [] };
  const vals = sh.getRange(last - n + 1, 1, n, 5).getValues().reverse();
  return { ok: true, rows: vals.map((r) => ({ at: r[0] instanceof Date ? r[0].toISOString() : String(r[0]), email: r[1], name: r[2], action: r[3], detail: r[4] })) };
}

/* =================== Data =================== */
function save_(req, me) {
  if (!req.data || !req.data.accounts) throw new Error('ไม่มีข้อมูล');
  const file = getDataFile_();
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
  else getFolder_().createFile(DATA_FILE, content, MimeType.PLAIN_TEXT);
  if (req.tables) writeTables_(req.tables);
  if (req.activity && req.activity.length) logRows_(me, req.activity);
  return { ok: true, savedAt: savedAt, size: content.length };
}

function load_() {
  const file = getDataFile_();
  if (!file) return { ok: true, data: null };
  return { ok: true, data: JSON.parse(file.getBlob().getDataAsString()) };
}

function backup_(kind) {
  const file = getDataFile_();
  if (!file) throw new Error('ยังไม่มีข้อมูลให้สำรอง');
  const stamp = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd-HHmmss');
  const name = 'accflow-backup-' + stamp + (kind === 'auto' ? '-auto' : '') + '.json';
  const copy = file.makeCopy(name, getBackupFolder_());
  pruneBackups_();
  return { ok: true, name: name, id: copy.getId() };
}

function listBackups_() {
  const it = getBackupFolder_().getFiles();
  const files = [];
  while (it.hasNext()) { const f = it.next(); files.push({ id: f.getId(), name: f.getName(), date: f.getDateCreated().toISOString(), size: f.getSize() }); }
  files.sort((a, b) => (a.date < b.date ? 1 : -1));
  return { ok: true, files: files.slice(0, 30), sheetUrl: getSpreadsheet_().getUrl(), folderUrl: getFolder_().getUrl() };
}

function restore_(id) {
  const f = DriveApp.getFileById(id);
  const parents = f.getParents(); let ok = false; const bid = getBackupFolder_().getId();
  while (parents.hasNext()) if (parents.next().getId() === bid) ok = true;
  if (!ok) throw new Error('ไฟล์ไม่อยู่ในโฟลเดอร์สำรองข้อมูล');
  backup_('manual');
  const data = JSON.parse(f.getBlob().getDataAsString());
  data.meta = data.meta || {};
  data.meta.syncedAt = new Date().toISOString();
  getDataFile_().setContent(JSON.stringify(data));
  return { ok: true, data: data };
}

function dailyBackup() {
  if (getDataFile_()) backup_('auto');
}

/* =================== Google Sheets tables =================== */
function writeTables_(tables) {
  const ss = getSpreadsheet_();
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
function getFolder_() {
  const id = props().getProperty('FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* recreate */ } }
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  const f = it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
  props().setProperty('FOLDER_ID', f.getId());
  return f;
}
function getBackupFolder_() {
  const id = props().getProperty('BACKUP_FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* recreate */ } }
  const parent = getFolder_();
  const it = parent.getFoldersByName(BACKUP_FOLDER_NAME);
  const f = it.hasNext() ? it.next() : parent.createFolder(BACKUP_FOLDER_NAME);
  props().setProperty('BACKUP_FOLDER_ID', f.getId());
  return f;
}
function getDataFile_() {
  const it = getFolder_().getFilesByName(DATA_FILE);
  return it.hasNext() ? it.next() : null;
}
function getSpreadsheet_() {
  const id = props().getProperty('SHEET_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) { /* recreate */ } }
  const ss = SpreadsheetApp.create(SHEET_NAME);
  DriveApp.getFileById(ss.getId()).moveTo(getFolder_());
  props().setProperty('SHEET_ID', ss.getId());
  return ss;
}
function pruneBackups_() {
  const it = getBackupFolder_().getFiles(); const files = [];
  while (it.hasNext()) files.push(it.next());
  files.sort((a, b) => b.getDateCreated() - a.getDateCreated());
  files.slice(KEEP_BACKUPS).forEach((f) => f.setTrashed(true));
}
function clean_(s) { return String(s || '').trim().slice(0, 120); }
function nowStr_() { return Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss'); }
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
