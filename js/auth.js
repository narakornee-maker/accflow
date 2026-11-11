/* ============================================================
 * Auth: เข้าสู่ระบบ / ลงทะเบียน / รออนุมัติ / ตั้งค่าการเชื่อมต่อ
 * ============================================================ */
const Auth = {
  KEY: 'accflow_session',
  token: null,
  user: null,
  cfg: null,
  googleProfile: null,
  idToken: null,

  IDLE_MS: 60 * 60 * 1000,      // ออกจากระบบอัตโนมัติเมื่อไม่ได้ใช้งาน 1 ชั่วโมง
  WARN_MS: 2 * 60 * 1000,       // เตือนล่วงหน้า 2 นาที
  LAST_KEY: 'accflow_last_active',

  isAdmin() { return !!(this.user && this.user.role === 'admin'); },
  fullName(u = this.user) { return u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email : ''; },

  load() {
    try {
      const s = JSON.parse(localStorage.getItem(this.KEY));
      if (s && s.token && s.exp > Date.now()) { this.token = s.token; this.user = s.user; return true; }
    } catch (e) { /* noop */ }
    return false;
  },
  storeSession(r) {
    this.token = r.session; this.user = r.user;
    localStorage.setItem(this.KEY, JSON.stringify({ token: r.session, user: r.user, exp: r.exp }));
  },
  updateUser(u) {
    this.user = u;
    try { const s = JSON.parse(localStorage.getItem(this.KEY)); s.user = u; localStorage.setItem(this.KEY, JSON.stringify(s)); } catch (e) { /* noop */ }
  },
  clearSession() { this.token = null; this.user = null; localStorage.removeItem(this.KEY); },

  /** เริ่มต้น: ตรวจลิงก์ตั้งค่า → การเชื่อมต่อ → เซสชัน */
  start(onReady) {
    this.onReady = onReady;
    const qs = new URLSearchParams(location.search);
    if (qs.get('setup')) {
      try { const x = JSON.parse(atob(qs.get('setup'))); if (x.u) Conn.set({ gasUrl: x.u }); } catch (e) { /* ignore */ }
      history.replaceState(null, '', location.pathname + location.hash);
    }
    if (!Conn.get().gasUrl) return this.show('setup');
    if (this.load()) {
      if (Date.now() - this.lastActive() > this.IDLE_MS) { this.clearSession(); sessionStorage.setItem('accflow_idle', '1'); return this.show('login'); }
      this.enter(); this.verify(); return;
    }
    this.show('login');
  },

  enter(r) {
    this.touch(true);
    this.startIdleWatch();
    document.body.classList.remove('auth-mode');
    const root = document.getElementById('auth'); if (root) root.remove();
    this.onReady();
    if (r && r.pendingUsers) setTimeout(() => U.toast(`มีผู้ใช้รออนุมัติ ${r.pendingUsers} คน — ไปที่ ตั้งค่า → ผู้ใช้งาน`, 'warning'), 800);
  },

  async verify() {
    try { const r = await Sync.call('me'); this.updateUser(r.user); if (typeof App !== 'undefined') App.renderNav(); } catch (e) { /* AUTH → expired() */ }
  },

  expired() {
    if (!this.token) return;
    this.clearSession();
    U.toast('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 'warning');
    this.show('login');
  },

  async logout() {
    if (Store.state.meta.dirty && Sync.enabled()) {
      try { await Sync.push(); } catch (e) {
        if (!(await U.confirm('ยังมีข้อมูลที่ยังไม่ได้ซิงก์ขึ้นเซิร์ฟเวอร์ ถ้าออกจากระบบตอนนี้ข้อมูลส่วนนี้จะหายไป ต้องการออกหรือไม่?', { danger: true, okText: 'ออกจากระบบ' }))) return;
      }
    }
    try { await Sync.call('logout'); } catch (e) { /* noop */ }
    this.clearSession();
    localStorage.removeItem(Store.KEY); localStorage.removeItem(Activity.KEY);
    location.hash = ''; location.reload();
  },

  /* ---------------- Idle auto-logout ---------------- */
  lastActive() { return +localStorage.getItem(this.LAST_KEY) || Date.now(); },
  touch(force) {
    const now = Date.now();
    if (!force && now - (this._lastTouch || 0) < 10000) return;   // throttle
    this._lastTouch = now;
    localStorage.setItem(this.LAST_KEY, String(now));
  },
  startIdleWatch() {
    if (this._idleOn) return;
    this._idleOn = true;
    const onAct = () => { if (this.token) { this.touch(!!this._warnClose); if (this._warnClose) this.checkIdle(); } };
    ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel', 'scroll'].forEach((ev) => window.addEventListener(ev, onAct, { passive: true, capture: true }));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.checkIdle(); });
    setInterval(() => this.checkIdle(), 15000);
  },
  checkIdle() {
    if (!this.token || this._loggingOut) return;
    const idle = Date.now() - this.lastActive();
    if (idle >= this.IDLE_MS) return this.idleLogout();
    if (idle >= this.IDLE_MS - this.WARN_MS) { if (!this._warnClose) this.idleWarn(); }
    else if (this._warnClose) { this._warnClose(); this._warnClose = null; }   // ใช้งานจากแท็บอื่นแล้ว
  },
  idleWarn() {
    let timer;
    this._warnClose = U.modal({
      title: `${U.icon('timer')} ไม่ได้ใช้งานนานเกินไป`, size: 'sm',
      body: `<p class="confirm-msg">ระบบจะออกจากระบบอัตโนมัติใน <b id="idle-left">2:00</b> นาที เพื่อความปลอดภัยของข้อมูล</p>`,
      footer: `<button class="btn btn-ghost" data-out>ออกจากระบบ</button><button class="btn btn-primary" data-stay>${U.icon('mouse-pointer-click')}ใช้งานต่อ</button>`,
      onOpen: (root, close) => {
        const tick = () => {
          const left = Math.max(0, this.IDLE_MS - (Date.now() - this.lastActive()));
          const el = root.querySelector('#idle-left'); if (el) el.textContent = `${Math.floor(left / 60000)}:${U.pad(Math.floor((left % 60000) / 1000))}`;
          if (!document.body.contains(root)) clearInterval(timer);
        };
        timer = setInterval(tick, 1000); tick();
        root.querySelector('[data-stay]').onclick = () => { this.touch(true); clearInterval(timer); this._warnClose = null; close(); };
        root.querySelector('[data-out]').onclick = () => { clearInterval(timer); close(); this.idleLogout(); };
        root.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => { this.touch(true); clearInterval(timer); this._warnClose = null; }));
      },
    });
  },
  async idleLogout() {
    if (this._loggingOut) return;
    this._loggingOut = true;
    let synced = !Store.state.meta.dirty;
    if (!synced && Sync.enabled()) { try { await Sync.push(); synced = true; } catch (e) { synced = false; } }
    try { await Sync.call('logout'); } catch (e) { /* noop */ }
    this.clearSession();
    if (synced) { localStorage.removeItem(Store.KEY); localStorage.removeItem(Activity.KEY); }   // ถ้ายังซิงก์ไม่ได้ เก็บไว้ในเครื่องเพื่อส่งขึ้นหลังเข้าสู่ระบบใหม่
    sessionStorage.setItem('accflow_idle', '1');
    location.hash = ''; location.reload();
  },

  /* ---------------- UI ---------------- */
  async show(view, data) {
    document.body.classList.add('auth-mode');
    let root = document.getElementById('auth');
    if (!root) { root = document.createElement('div'); root.id = 'auth'; document.body.appendChild(root); }
    if (['login', 'register', 'pending'].includes(view) && !this.cfg) {
      root.innerHTML = this.frame('<div class="auth-loading">' + U.icon('loader-2', 'spin-ic') + ' กำลังเชื่อมต่อเซิร์ฟเวอร์…</div>', 'login');
      U.refreshIcons();
      try { this.cfg = await Sync.call('config'); }
      catch (e) { return this.show('error', e.message.includes('unknown action') ? 'เซิร์ฟเวอร์ใช้โค้ด Apps Script เวอร์ชันเก่า — ผู้ดูแลระบบต้องอัปเดต Code.gs เป็นเวอร์ชันล่าสุด แล้ว Deploy เวอร์ชันใหม่' : e.message); }
    }
    root.innerHTML = this.frame(this[`v_${view}`](data), view);
    U.refreshIcons();
    const fn = this[`b_${view}`]; if (fn) fn.call(this, root, data);
  },

  frame(inner, view) {
    const reg = view === 'register';
    return `<div class="auth-page"><div class="auth-shell">
      <header class="auth-top"><div class="auth-brand">${this.logo()}<b>${U.esc(Brand.cached().name)}</b></div>
        ${['login', 'register'].includes(view) && this.cfg ? `<div class="auth-switch">${reg ? 'มีบัญชีแล้ว?' : 'ยังไม่มีบัญชี?'} <a href="#" data-go="${reg ? 'login' : 'register'}">${reg ? 'เข้าสู่ระบบ' : 'ลงทะเบียน'}</a></div>` : ''}</header>
      <div class="auth-body">
        <section class="auth-hero">
          <div class="auth-grid"></div>
          <div class="auth-card">
            <div class="flex between"><b>ภาพรวมการเงิน</b><span class="auth-chip">ปีนี้</span></div>
            <div class="auth-sub">1 ม.ค. – 31 ธ.ค. 2569</div>
            <div class="auth-stats"><div><small>ต้นทุน</small><b data-count="30">0%</b></div><div><small>ค่าใช้จ่าย</small><b data-count="25">0%</b></div><div><small>กำไร</small><b data-count="45">0%</b></div></div>
            <svg class="auth-gauge" viewBox="0 0 200 110"><path d="M20 100 A80 80 0 0 1 180 100" class="g-bg"/><path d="M20 100 A80 80 0 0 1 180 100" class="g-a"/><path d="M20 100 A80 80 0 0 1 180 100" class="g-b"/></svg>
            <div class="auth-gauge-label">45%</div>
            <div class="auth-bars">${[38, 52, 44, 66, 58, 74, 82].map((h, i) => `<span style="--h:${h}%;--d:${0.9 + i * 0.07}s"></span>`).join('')}</div>
          </div>
          <h2>จัดการบัญชี ภาษี และเอกสาร<br><em>ครบในที่เดียว</em></h2>
          <p>ระบบบัญชีภายในสำหรับพนักงาน VoltGrid Energy &amp; Solutions — ใบเสนอราคา ใบแจ้งหนี้ สต็อก เงินเดือน และงบการเงิน</p>
        </section>
        <section class="auth-form">${inner}</section>
      </div></div></div>`;
  },

  logo() { const b = Brand.cached(); return `<span class="auth-logo${b.logo ? ' has-img' : ''}">${Brand.logoHtml(b)}</span>`; },

  /* ----- views ----- */
  v_setup() {
    return `<h1>เชื่อมต่อเซิร์ฟเวอร์</h1><p class="auth-lead">ตั้งค่าครั้งแรกบนเครื่องนี้ — ใส่ Web App URL ของ Google Apps Script</p>
      <form id="f-setup" class="auth-fields">
        <div class="field"><label>Web App URL</label><input name="gasUrl" required placeholder="https://script.google.com/macros/s/…/exec" value="${U.esc(Conn.get().gasUrl || '')}"></div>
        <div class="auth-err" id="auth-err"></div>
        <button class="btn btn-primary auth-btn" type="submit">${U.icon('plug-zap')}เชื่อมต่อ</button>
      </form>
      <p class="auth-note">พนักงาน: ขอ “ลิงก์เข้าใช้งาน” จากผู้ดูแลระบบ เปิดลิงก์นั้นแล้วระบบจะตั้งค่าให้อัตโนมัติ</p>`;
  },
  b_setup(root) {
    root.querySelector('#f-setup').onsubmit = async (e) => {
      e.preventDefault();
      const url = e.target.gasUrl.value.trim();
      if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(url)) return this.err('URL ต้องขึ้นต้นด้วย https://script.google.com/macros/s/ และลงท้ายด้วย /exec');
      this.busy(e.submitter, true);
      try { this.cfg = await Sync.call('config', {}, { url }); Conn.set({ gasUrl: url }); this.show('login'); }
      catch (er) { this.busy(e.submitter, false); this.err(er.message.includes('unknown action') ? 'Apps Script ยังเป็นโค้ดเวอร์ชันเก่า กรุณาอัปเดต Code.gs แล้ว Deploy เวอร์ชันใหม่' : er.message); }
    };
  },

  v_error(msg) {
    return `<h1>เชื่อมต่อไม่สำเร็จ</h1><div class="alert alert-err mt-2">${U.icon('alert-circle')}<div>${U.esc(msg)}</div></div>
      <div class="btn-group mt-2"><button class="btn btn-primary" data-retry>${U.icon('refresh-cw')}ลองใหม่</button><button class="btn btn-outline" data-reset>${U.icon('settings')}เปลี่ยน URL เซิร์ฟเวอร์</button></div>`;
  },
  b_error(root) {
    root.querySelector('[data-retry]').onclick = () => { this.cfg = null; this.show('login'); };
    root.querySelector('[data-reset]').onclick = () => this.show('setup');
  },

  v_login() {
    const c = this.cfg;
    const idle = sessionStorage.getItem('accflow_idle'); sessionStorage.removeItem('accflow_idle');
    return `<h1>ยินดีต้อนรับสู่ ${U.esc(Brand.cached().name)}!</h1><p class="auth-lead">เข้าสู่ระบบเพื่อใช้งานระบบบัญชีของบริษัท</p>
      ${idle ? `<div class="alert alert-info">${U.icon('timer')}<div>ออกจากระบบอัตโนมัติแล้ว เนื่องจากไม่ได้ใช้งานเกิน 1 ชั่วโมง — กรุณาเข้าสู่ระบบอีกครั้ง</div></div>` : ''}
      ${!c.hasUsers ? `<div class="alert alert-warn">${U.icon('crown')}<div>ยังไม่มีผู้ใช้ในระบบ — <b>ผู้ลงทะเบียนคนแรกจะเป็นผู้ดูแลระบบ</b> <a href="#" data-go="register">ลงทะเบียนเลย</a></div></div>` : ''}
      ${c.google ? `<div id="g-btn" class="auth-google"></div>` : ''}
      ${c.google && c.password ? '<div class="auth-or"><span>หรือเข้าสู่ระบบด้วยอีเมล</span></div>' : ''}
      ${c.password ? `<form id="f-login" class="auth-fields">
        <div class="field"><label>อีเมล</label><input type="email" name="email" required autocomplete="username" placeholder="name@company.com"></div>
        <div class="field"><label>รหัสผ่าน</label><div class="auth-pw"><input type="password" name="password" required autocomplete="current-password" placeholder="••••••••"><button type="button" class="icon-btn" data-eye>${U.icon('eye')}</button></div></div>
        <div class="right"><a href="#" data-forgot class="small">ลืมรหัสผ่าน?</a></div>
        <div class="auth-err" id="auth-err"></div>
        <button class="btn btn-primary auth-btn" type="submit">เข้าสู่ระบบ</button>
      </form>` : ''}
      ${c.domain ? `<p class="auth-note">${U.icon('shield-check')} ใช้ได้เฉพาะอีเมล @${U.esc(c.domain)}</p>` : ''}
      <p class="auth-note">พนักงานใหม่: <a href="#" data-go="register">ลงทะเบียน</a> แล้วรอผู้ดูแลระบบอนุมัติ</p>`;
  },
  b_login(root) {
    this.bindCommon(root);
    if (this.cfg.google) this.renderGoogle(root.querySelector('#g-btn'), 'signin_with');
    const f = root.querySelector('#f-login');
    if (f) f.onsubmit = async (e) => {
      e.preventDefault();
      this.busy(e.submitter, true);
      try { this.result(await Sync.call('loginPassword', { email: f.email.value.trim(), password: f.password.value })); }
      catch (er) { this.busy(e.submitter, false); this.err(er.message); }
    };
    const fg = root.querySelector('[data-forgot]');
    if (fg) fg.onclick = (e) => { e.preventDefault(); U.modal({ title: 'ลืมรหัสผ่าน', size: 'sm', body: '<p class="confirm-msg">กรุณาติดต่อผู้ดูแลระบบของบริษัท เพื่อรีเซ็ตรหัสผ่านให้ (เมนู ตั้งค่า → ผู้ใช้งาน → รีเซ็ตรหัสผ่าน)</p>', footer: '<button class="btn btn-primary" data-close>ตกลง</button>' }); };
  },

  v_register() {
    const c = this.cfg, g = this.googleProfile;
    return `<h1>ลงทะเบียนพนักงาน</h1><p class="auth-lead">${g ? 'ยืนยันตัวตนกับ Google แล้ว — กรอกข้อมูลให้ครบเพื่อขอสิทธิ์ใช้งาน' : 'กรอกข้อมูลให้ครบทุกช่อง ผู้ดูแลระบบจะอนุมัติก่อนเข้าใช้งาน'}</p>
      ${c.google && !g ? `<div id="g-btn" class="auth-google"></div>${c.password ? '<div class="auth-or"><span>หรือลงทะเบียนด้วยอีเมล</span></div>' : ''}` : ''}
      ${g || c.password ? `<form id="f-reg" class="auth-fields">
        <div class="form-grid">
          <div class="field"><label class="req">ชื่อ</label><input name="firstName" required value="${U.esc((g && g.firstName) || '')}"></div>
          <div class="field"><label class="req">นามสกุล</label><input name="lastName" required value="${U.esc((g && g.lastName) || '')}"></div>
          <div class="field"><label class="req">เบอร์โทร</label><input type="tel" name="phone" required placeholder="08x-xxx-xxxx" inputmode="tel"></div>
          <div class="field"><label class="req">วันเดือนปีเกิด</label><input type="date" name="birthDate" required max="${U.addDays(U.today(), -365 * 15)}"></div>
          <div class="field full"><label class="req">ตำแหน่งงาน</label><input name="position" required list="dl-pos" placeholder="เช่น เจ้าหน้าที่บัญชี"><datalist id="dl-pos">${['ผู้จัดการ', 'ผู้จัดการฝ่ายบัญชี', 'เจ้าหน้าที่บัญชี', 'เจ้าหน้าที่การเงิน', 'เจ้าหน้าที่ฝ่ายขาย', 'วิศวกร', 'ช่างเทคนิค', 'จัดซื้อ', 'ธุรการ', 'ฝ่ายบุคคล'].map((x) => `<option value="${x}">`).join('')}</datalist></div>
          <div class="field full"><label class="req">อีเมล</label><input type="email" name="email" required ${g ? `value="${U.esc(g.email)}" readonly` : 'placeholder="name@company.com" autocomplete="username"'}></div>
          ${g ? '' : `<div class="field"><label class="req">รหัสผ่าน (อย่างน้อย 8 ตัว)</label><input type="password" name="password" required minlength="8" autocomplete="new-password"></div>
          <div class="field"><label class="req">ยืนยันรหัสผ่าน</label><input type="password" name="password2" required minlength="8" autocomplete="new-password"></div>`}
        </div>
        <label class="check small"><input type="checkbox" name="consent" required> ยินยอมให้บริษัทเก็บข้อมูลข้างต้นเพื่อใช้ยืนยันตัวตนและบันทึกประวัติการใช้งานระบบ</label>
        <div class="auth-err" id="auth-err"></div>
        <button class="btn btn-primary auth-btn" type="submit">${U.icon('user-plus')}ลงทะเบียน</button>
        ${g ? '<a href="#" class="small center" data-cancelg>ยกเลิก / ใช้บัญชีอื่น</a>' : ''}
      </form>` : ''}`;
  },
  b_register(root) {
    this.bindCommon(root);
    if (this.cfg.google && !this.googleProfile) this.renderGoogle(root.querySelector('#g-btn'), 'signup_with');
    const cg = root.querySelector('[data-cancelg]');
    if (cg) cg.onclick = (e) => { e.preventDefault(); this.googleProfile = null; this.idToken = null; this.show('login'); };
    const f = root.querySelector('#f-reg');
    if (!f) return;
    f.onsubmit = async (e) => {
      e.preventDefault();
      const v = U.formData(f);
      if (!/^0\d{8,9}$/.test(v.phone.replace(/[\s-]/g, ''))) return this.err('เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)');
      if (!this.googleProfile && v.password !== v.password2) return this.err('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
      this.busy(e.submitter, true);
      try {
        const profile = { firstName: v.firstName, lastName: v.lastName, phone: v.phone, birthDate: v.birthDate, position: v.position, email: v.email };
        const r = await Sync.call('register', this.googleProfile ? { profile, idToken: this.idToken } : { profile, password: v.password });
        this.googleProfile = null; this.idToken = null;
        if (this.cfg) this.cfg.hasUsers = true;
        this.result(r);
      } catch (er) { this.busy(e.submitter, false); this.err(er.message); }
    };
  },

  v_pending(u) {
    return `<div class="auth-pending">${U.icon('hourglass')}</div><h1>รอผู้ดูแลระบบอนุมัติ</h1>
      <p class="auth-lead">ลงทะเบียนเรียบร้อยแล้ว — เมื่อผู้ดูแลระบบอนุมัติ คุณจะเข้าสู่ระบบได้ทันที</p>
      <div class="party-box"><b>${U.esc(this.fullName(u))}</b><br>${U.esc(u.position || '')}<br>${U.esc(u.email)} · ${U.esc(u.phone || '')}</div>
      <button class="btn btn-outline auth-btn mt-2" data-go="login">${U.icon('arrow-left')}กลับไปหน้าเข้าสู่ระบบ</button>`;
  },
  b_pending(root) { this.bindCommon(root); },

  /* ----- helpers ----- */
  bindCommon(root) {
    root.querySelectorAll('[data-go]').forEach((a) => a.onclick = (e) => { e.preventDefault(); this.show(a.dataset.go); });
    root.querySelectorAll('[data-eye]').forEach((b) => b.onclick = () => { const i = b.previousElementSibling; i.type = i.type === 'password' ? 'text' : 'password'; });
    root.querySelectorAll('[data-count]').forEach((el) => {
      const to = +el.dataset.count; let n = 0; const t0 = performance.now() + 600;
      const step = (t) => { const k = Math.min(1, Math.max(0, (t - t0) / 900)); n = Math.round(to * (1 - Math.pow(1 - k, 3))); el.textContent = n + '%'; if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  },
  err(msg) { const el = document.getElementById('auth-err'); if (el) { el.textContent = msg; el.classList.add('show'); } },
  busy(btn, on) {
    if (!btn) return;
    if (on) { btn.dataset.html = btn.innerHTML; btn.disabled = true; btn.innerHTML = `${U.icon('loader-2', 'spin-ic')} กำลังดำเนินการ…`; U.refreshIcons(); }
    else { btn.disabled = false; btn.innerHTML = btn.dataset.html || btn.innerHTML; U.refreshIcons(); }
  },

  result(r) {
    if (r.needRegister) { this.googleProfile = r.profile; return this.show('register'); }
    if (r.pending) return this.show('pending', r.user);
    this.storeSession(r);
    this.enter(r);
  },

  /** Google Identity Services */
  loadGIS() {
    if (window.google && google.accounts && google.accounts.id) return Promise.resolve();
    if (this._gis) return this._gis;
    this._gis = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      s.onload = res; s.onerror = () => { this._gis = null; rej(new Error('โหลดปุ่ม Google ไม่สำเร็จ')); };
      document.head.appendChild(s);
    });
    return this._gis;
  },
  async renderGoogle(el, text) {
    if (!el) return;
    el.innerHTML = `<div class="muted small center">${U.icon('loader-2', 'spin-ic')} กำลังโหลดปุ่ม Google…</div>`; U.refreshIcons();
    try {
      await this.loadGIS();
      google.accounts.id.initialize({ client_id: this.cfg.clientId, callback: (resp) => this.onGoogle(resp.credential), ux_mode: 'popup', auto_select: false, cancel_on_tap_outside: true });
      el.innerHTML = '';
      google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', shape: 'pill', text, locale: 'th', width: Math.min(400, el.clientWidth || 360), logo_alignment: 'center' });
    } catch (e) { el.innerHTML = `<div class="auth-err show">${U.esc(e.message)}</div>`; }
  },
  async onGoogle(credential) {
    const el = document.getElementById('g-btn');
    if (el) { el.innerHTML = `<div class="muted small center">${U.icon('loader-2', 'spin-ic')} กำลังยืนยันตัวตน…</div>`; U.refreshIcons(); }
    try {
      this.idToken = credential;
      this.result(await Sync.call('loginGoogle', { idToken: credential }));
    } catch (e) { this.idToken = null; this.show(document.querySelector('#f-reg') ? 'register' : 'login').then(() => this.err(e.message)); }
  },

  /* ----- in-app: profile modal ----- */
  profileModal() {
    const u = this.user || {};
    const pwUser = String(u.authType || '').includes('password');
    U.modal({
      title: `${U.icon('user-round')} โปรไฟล์ของฉัน`, size: 'md',
      body: `<div class="flex mb-2"><span class="avatar-lg">${U.esc((u.firstName || u.email || '?').slice(0, 1))}</span><div><b>${U.esc(this.fullName())}</b><div class="muted small">${U.esc(u.email)} · ${u.role === 'admin' ? 'ผู้ดูแลระบบ' : 'พนักงาน'}</div></div></div>
        <div class="form-grid" id="pf">
          <div class="field"><label>ชื่อ</label><input name="firstName" value="${U.esc(u.firstName || '')}"></div>
          <div class="field"><label>นามสกุล</label><input name="lastName" value="${U.esc(u.lastName || '')}"></div>
          <div class="field"><label>เบอร์โทร</label><input name="phone" value="${U.esc(u.phone || '')}"></div>
          <div class="field"><label>วันเดือนปีเกิด</label><input type="date" name="birthDate" value="${U.esc(u.birthDate || '')}"></div>
          <div class="field full"><label>ตำแหน่งงาน</label><input name="position" value="${U.esc(u.position || '')}"></div>
        </div>
        ${pwUser ? `<h4 class="mt-3">เปลี่ยนรหัสผ่าน</h4><div class="form-grid mt-1" id="pw">
          <div class="field"><label>รหัสผ่านเดิม</label><input type="password" name="oldPassword" autocomplete="current-password"></div>
          <div class="field"><label>รหัสผ่านใหม่ (8 ตัวขึ้นไป)</label><input type="password" name="newPassword" autocomplete="new-password"></div></div>` : ''}`,
      footer: `<button class="btn btn-ghost" style="margin-right:auto;color:var(--danger)" data-logout>${U.icon('log-out')}ออกจากระบบ</button><button class="btn btn-ghost" data-close>ปิด</button><button class="btn btn-primary" data-ok>${U.icon('save')}บันทึก</button>`,
      onOpen: (root, close) => {
        root.querySelector('[data-logout]').onclick = () => { close(); this.logout(); };
        root.querySelector('[data-ok]').onclick = async (e) => {
          this.busy(e.currentTarget, true);
          try {
            const r = await Sync.call('updateProfile', { profile: U.formData(root.querySelector('#pf')) });
            this.updateUser(r.user);
            const pw = root.querySelector('#pw');
            if (pw) { const f = U.formData(pw); if (f.newPassword) await Sync.call('changePassword', f); }
            U.toast('บันทึกโปรไฟล์แล้ว'); close(); App.renderNav();
          } catch (er) { this.busy(e.currentTarget, false); U.toast(er.message, 'error'); }
        };
      },
    });
  },
};
