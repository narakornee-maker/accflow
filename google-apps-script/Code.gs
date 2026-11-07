/**
 * ============================================================
 *  AccFlow Backend — Google Apps Script
 *  เก็บข้อมูลบัญชีใน Google Drive (JSON) + Google Sheets (ตารางอ่านง่าย)
 *  พร้อมสำรองข้อมูลอัตโนมัติรายวัน
 * ============================================================
 *  วิธีติดตั้ง:
 *   1) script.google.com → New project → วางโค้ดนี้ → Save
 *   2) เลือกฟังก์ชัน setup → Run → อนุญาตสิทธิ์ → ดู API Token ใน Execution log
 *   3) Deploy → New deployment → Web app
 *        Execute as: Me   |   Who has access: Anyone
 *   4) นำ Web app URL + API Token ไปใส่ในหน้า ตั้งค่า → Google Drive / Sheets
 * ============================================================
 */

const APP_NAME = 'AccFlow';
const FOLDER_NAME = 'AccFlow Data';
const BACKUP_FOLDER_NAME = 'Backups';
const DATA_FILE = 'accflow-data.json';
const SHEET_NAME = 'AccFlow Database';
const KEEP_BACKUPS = 60;

const props = () => PropertiesService.getScriptProperties();

/** รันครั้งแรก: สร้างโฟลเดอร์ / Sheets / Token / ตั้งเวลาสำรองรายวัน */
function setup() {
  const folder = getFolder_();
  getBackupFolder_();
  const ss = getSpreadsheet_();
  let token = props().getProperty('API_TOKEN');
  if (!token) {
    token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
    props().setProperty('API_TOKEN', token);
  }
  // daily backup trigger @ 02:00
  ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === 'dailyBackup').forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('dailyBackup').timeBased().everyDays(1).atHour(2).create();
  Logger.log('✅ ติดตั้งเรียบร้อย');
  Logger.log('📁 Folder: ' + folder.getUrl());
  Logger.log('📊 Sheets: ' + ss.getUrl());
  Logger.log('🔑 API Token: ' + token);
}

/** สร้าง Token ใหม่ (Token เดิมจะใช้ไม่ได้) */
function rotateToken() {
  const token = Utilities.getUuid().replace(/-/g, '');
  props().setProperty('API_TOKEN', token);
  Logger.log('🔑 New API Token: ' + token);
}

function doGet() {
  return json_({ ok: true, app: APP_NAME, message: 'AccFlow backend is running. Use POST.' });
}

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'invalid json' }); }
  const token = props().getProperty('API_TOKEN');
  if (!token || req.token !== token) return json_({ ok: false, error: 'unauthorized: token ไม่ถูกต้อง' });

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    switch (req.action) {
      case 'ping': return json_({ ok: true, app: APP_NAME, user: Session.getEffectiveUser().getEmail(), time: new Date().toISOString() });
      case 'save': return json_(save_(req));
      case 'load': return json_(load_());
      case 'backup': return json_(backup_('manual'));
      case 'listBackups': return json_(listBackups_());
      case 'restore': return json_(restore_(req.id));
      default: return json_({ ok: false, error: 'unknown action: ' + req.action });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (e2) { /* noop */ }
  }
}

/* ---------------- actions ---------------- */
function save_(req) {
  if (!req.data || !req.data.accounts) throw new Error('ไม่มีข้อมูล');
  const savedAt = new Date().toISOString();
  req.data.meta = req.data.meta || {};
  req.data.meta.syncedAt = savedAt;
  // ไม่เก็บ token ในไฟล์ข้อมูล
  const clean = JSON.parse(JSON.stringify(req.data));
  if (clean.settings) { delete clean.settings.gasToken; }
  const content = JSON.stringify(clean);
  const file = getDataFile_();
  if (file) file.setContent(content);
  else getFolder_().createFile(DATA_FILE, content, MimeType.PLAIN_TEXT);
  if (req.tables) writeTables_(req.tables);
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
  // ต้องเป็นไฟล์ในโฟลเดอร์ Backups เท่านั้น
  const parents = f.getParents(); let ok = false; const bid = getBackupFolder_().getId();
  while (parents.hasNext()) if (parents.next().getId() === bid) ok = true;
  if (!ok) throw new Error('ไฟล์ไม่อยู่ในโฟลเดอร์สำรองข้อมูล');
  backup_('manual'); // สำรองข้อมูลปัจจุบันก่อนกู้คืน
  const content = f.getBlob().getDataAsString();
  getDataFile_().setContent(content);
  return { ok: true, data: JSON.parse(content) };
}

/** ตั้งเวลาไว้ใน setup(): สำรองข้อมูลทุกวัน */
function dailyBackup() {
  if (getDataFile_()) backup_('auto');
}

/* ---------------- Google Sheets ---------------- */
function writeTables_(tables) {
  const ss = getSpreadsheet_();
  Object.keys(tables).forEach(function (name) {
    const rows = tables[name];
    if (!rows || !rows.length) return;
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    sh.clearContents();
    const width = rows.reduce((m, r) => Math.max(m, r.length), 0);
    const data = rows.map((r) => { const x = r.slice(); while (x.length < width) x.push(''); return x.map((v) => (v === null || v === undefined ? '' : v)); });
    sh.getRange(1, 1, data.length, width).setValues(data);
    sh.getRange(1, 1, 1, width).setFontWeight('bold').setBackground('#1e3a8a').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  });
  const def = ss.getSheetByName('Sheet1') || ss.getSheetByName('แผ่น1');
  if (def && ss.getSheets().length > 1) ss.deleteSheet(def);
  let info = ss.getSheetByName('ข้อมูลระบบ');
  if (!info) info = ss.insertSheet('ข้อมูลระบบ');
  info.clearContents();
  info.getRange(1, 1, 2, 2).setValues([['อัปเดตล่าสุด', new Date()], ['หมายเหตุ', 'ชีตนี้สร้างอัตโนมัติจาก AccFlow — แก้ไขในโปรแกรมเท่านั้น']]);
}

/* ---------------- helpers ---------------- */
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
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
