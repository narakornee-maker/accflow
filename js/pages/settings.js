/* ============================================================
 * Settings: กิจการ / ภาษี / เงินเดือน / Google / ข้อมูล
 * ============================================================ */
Pages.settings = (view, tab = 'company') => {
  const TABS = [['company', 'building', 'ข้อมูลกิจการ'], ['tax', 'percent', 'ภาษีและเอกสาร'], ['payroll', 'id-card', 'เงินเดือน'], ['sign', 'signature', 'ลายเซ็นและตราประทับ'],
    ['companies', 'building-2', 'บริษัท'], ['users', 'users', 'ผู้ใช้งาน'], ['activity', 'history', 'ประวัติการใช้งาน'], ['google', 'cloud', 'เซิร์ฟเวอร์ / Google'], ['data', 'database', 'สำรองและกู้คืนข้อมูล']];
  if (!Auth.isAdmin()) {
    App.setTitle('ตั้งค่าการใช้งาน');
    view.innerHTML = `<div class="card"><div class="empty">${U.icon('lock')}<h4>เฉพาะผู้ดูแลระบบ</h4><p>การตั้งค่าระบบจัดการโดยผู้ดูแลระบบ — แก้ไขข้อมูลส่วนตัวได้ที่ “โปรไฟล์ของฉัน”</p>
      <button class="btn btn-primary mt-1" onclick="Auth.profileModal()">${U.icon('user-round')}โปรไฟล์ของฉัน</button></div></div>`;
    return;
  }
  if (!TABS.some((t) => t[0] === tab)) tab = 'company';
  App.setTitle('ตั้งค่าการใช้งาน');
  const s = Store.state, c = s.company, st = s.settings;

  view.innerHTML = `
  <div class="page-head"><div><h2>ตั้งค่าการใช้งาน</h2><p>กำหนดค่าการใช้งานระบบ การเข้าถึงข้อมูล และการตั้งค่าอื่นๆ</p></div></div>
  <div class="card"><div class="tabs">${TABS.map(([k, ic, l]) => `<a href="#/settings/${k}" class="${tab === k ? 'active' : ''}">${U.icon(ic)}${l}</a>`).join('')}</div>
  <div class="card-body" id="set-body" style="max-width:900px"></div></div>`;
  const body = U.$('#set-body');

  const saveBtn = `<div class="mt-3"><button class="btn btn-primary" id="set-save">${U.icon('save')}บันทึกการตั้งค่า</button></div>`;
  const bindSave = (fn) => { U.$('#set-save').onclick = () => { fn(U.formData(body)); Store.save(); U.toast('บันทึกการตั้งค่าแล้ว'); App.render(); }; };

  if (tab === 'company') {
    body.innerHTML = `<div class="form-grid">
      <div class="field full"><label class="req">ชื่อกิจการ (ใช้แสดงบนเอกสาร)</label><input name="name" value="${U.esc(c.name)}"></div>
      <div class="field"><label>ชื่อภาษาอังกฤษ</label><input name="nameEn" value="${U.esc(c.nameEn)}"></div>
      <div class="field"><label>ประเภทธุรกิจ</label><select name="businessType">${[['service', 'งานบริการ'], ['goods', 'ซื้อมาขายไป'], ['mixed', 'ขายสินค้าและบริการ']].map(([v, l]) => U.opt(v, l, c.businessType)).join('')}</select></div>
      <div class="field"><label>เลขประจำตัวผู้เสียภาษี</label><input name="taxId" maxlength="13" value="${U.esc(c.taxId)}"></div>
      <div class="field"><label>สาขา</label><input name="branch" value="${U.esc(c.branch)}"></div>
      <div class="field full"><label>ที่อยู่</label><textarea name="address" rows="2">${U.esc(c.address)}</textarea></div>
      <div class="field"><label>โทรศัพท์</label><input name="phone" value="${U.esc(c.phone)}"></div>
      <div class="field"><label>อีเมล</label><input name="email" value="${U.esc(c.email)}"></div>
      <div class="field"><label>เว็บไซต์</label><input name="website" value="${U.esc(c.website)}"></div>
      <div class="field"><label>เดือนเริ่มต้นปีบัญชี</label><select name="fyStartMonth">${U.TH_MONTHS.map((m, i) => U.opt(i + 1, m, c.fyStartMonth)).join('')}</select></div>
      <div class="field"><label>ชื่อผู้มีอำนาจลงนาม</label><input name="signName" value="${U.esc(c.signName)}"></div>
      <div class="field"><label>โลโก้บนเอกสาร (ไม่เกิน 200KB)</label><input type="file" id="logo-file" accept="image/*"><input type="hidden" name="logo" value="${U.esc(c.logo)}"></div>
      ${c.logo ? `<div class="full"><img src="${c.logo}" style="max-height:64px;border:1px solid var(--border);border-radius:8px;padding:4px"> <button class="btn btn-xs btn-ghost" id="logo-rm">ลบโลโก้</button></div>` : ''}
      <div class="full"><h4 class="mt-2">โลโก้และชื่อบนเมนู</h4><p class="muted small" style="margin:2px 0 0">แสดงที่มุมซ้ายบนของเมนู หน้าเข้าสู่ระบบ และไอคอนบนแท็บเบราว์เซอร์ — แนะนำรูปสี่เหลี่ยมจัตุรัส (ระบบย่อขนาดให้อัตโนมัติ)</p></div>
      <div class="field"><label>รูปโลโก้บนเมนู</label><input type="file" id="applogo-file" accept="image/*"><input type="hidden" name="appLogo" value="${U.esc(c.appLogo || '')}">
        <div class="flex mt-1"><div class="brand-prev" id="applogo-prev"><span class="brand-logo${c.appLogo ? ' has-img' : ''}">${c.appLogo ? `<img src="${c.appLogo}" alt="">` : U.icon('zap')}</span><div><b id="bp-name">${U.esc(c.brandName || 'VoltGrid')}</b><small id="bp-sub">${U.esc(c.brandSub ?? 'Energy & Solutions · บัญชี')}</small></div></div>
          ${c.appLogo ? `<button class="btn btn-xs btn-ghost" id="applogo-rm" style="color:var(--danger)">${U.icon('trash-2')}ใช้ไอคอนเดิม</button>` : ''}
          ${c.logo ? `<button class="btn btn-xs btn-soft" id="applogo-same" type="button">ใช้โลโก้เดียวกับเอกสาร</button>` : ''}</div></div>
      <div class="field"><label>ชื่อบนเมนู</label><input name="brandName" maxlength="24" value="${U.esc(c.brandName || 'VoltGrid')}">
        <label class="mt-1">ข้อความใต้ชื่อ</label><input name="brandSub" maxlength="40" value="${U.esc(c.brandSub ?? 'Energy & Solutions · บัญชี')}"></div>
    </div>${saveBtn}`;
    /** ย่อรูปเป็นสี่เหลี่ยมไม่เกิน 256px (PNG โปร่งใส) */
    const shrink = (src, max = 256) => new Promise((res, rej) => { const img = new Image(); img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)); const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); res(cv.toDataURL('image/png')); }; img.onerror = () => rej(new Error('อ่านรูปไม่ได้')); img.src = src; });
    const setPrev = (url) => { body.querySelector('[name=appLogo]').value = url; const el = body.querySelector('#applogo-prev .brand-logo'); el.classList.toggle('has-img', !!url); el.innerHTML = url ? `<img src="${url}" alt="">` : U.icon('zap'); U.refreshIcons(); };
    U.$('#applogo-file').onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      if (f.size > 5 * 1024 * 1024) return U.toast('ไฟล์ใหญ่เกิน 5MB', 'error');
      const r = new FileReader(); r.onload = async () => { try { setPrev(await shrink(r.result)); U.toast('เลือกโลโก้แล้ว กด “บันทึกการตั้งค่า” เพื่อใช้งาน', 'info'); } catch (er) { U.toast(er.message, 'error'); } }; r.readAsDataURL(f);
    };
    const same = U.$('#applogo-same'); if (same) same.onclick = async () => { try { setPrev(await shrink(c.logo)); U.toast('กด “บันทึกการตั้งค่า” เพื่อใช้งาน', 'info'); } catch (er) { U.toast(er.message, 'error'); } };
    const arm = U.$('#applogo-rm'); if (arm) arm.onclick = () => { c.appLogo = ''; Store.save(); U.toast('กลับไปใช้ไอคอนเดิมแล้ว', 'info'); App.render(); };
    body.querySelector('[name=brandName]').oninput = (e) => { U.$('#bp-name').textContent = e.target.value || 'VoltGrid'; };
    body.querySelector('[name=brandSub]').oninput = (e) => { U.$('#bp-sub').textContent = e.target.value; };
    U.$('#logo-file').onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      if (f.size > 200 * 1024) return U.toast('ไฟล์ใหญ่เกิน 200KB', 'error');
      const r = new FileReader(); r.onload = () => { body.querySelector('[name=logo]').value = r.result; U.toast('เลือกโลโก้แล้ว กดบันทึกเพื่อใช้งาน', 'info'); }; r.readAsDataURL(f);
    };
    const rm = U.$('#logo-rm'); if (rm) rm.onclick = () => { c.logo = ''; Store.save(); App.render(); };
    bindSave((f) => {
      delete f['']; Object.assign(c, f, { fyStartMonth: +f.fyStartMonth });
      // ให้ชื่อในตัวสลับบริษัทตรงกับชื่อกิจการ
      if (c.name && c.name !== Company.current().name && Sync.enabled()) Sync.call('renameCompany', { id: Company.id, name: c.name }).then((r) => { Company.setList(r.companies); App.renderCompanySwitch(); U.refreshIcons(); }).catch(() => {});
    });
  } else if (tab === 'tax') {
    body.innerHTML = `<div class="form-grid">
      <label class="check full"><input type="checkbox" name="vatRegistered" ${c.vatRegistered ? 'checked' : ''}> จดทะเบียนภาษีมูลค่าเพิ่ม (VAT)</label>
      <div class="field"><label>อัตราภาษีมูลค่าเพิ่ม (%)</label><input type="number" step="any" name="vatRate" value="${c.vatRate}"></div>
      <div class="field"><label>จุดรับรู้ภาษีขาย</label><select name="vatPoint">${[['payment', 'เมื่อรับชำระเงิน (กิจการให้บริการ)'], ['invoice', 'เมื่อออกใบวางบิล/ส่งมอบ (ขายสินค้า)']].map(([v, l]) => U.opt(v, l, c.vatPoint)).join('')}</select>
        <span class="hint">ตามประมวลรัษฎากร ม.78 — บริการเกิดความรับผิดเมื่อได้รับชำระ, ขายสินค้าเมื่อส่งมอบ</span></div>
      <div class="field"><label>เครดิตเทอมเริ่มต้น (วัน)</label><input type="number" name="defaultCreditDays" value="${c.defaultCreditDays}"></div>
      <div class="full"><h4 class="mt-2">รูปแบบเลขที่เอกสาร</h4><p class="muted small">รูปแบบ: คำนำหน้า + ปี พ.ศ. + เดือน + ลำดับ 4 หลัก เช่น QT${+U.today().slice(0, 4) + 543}${U.today().slice(5, 7)}0001 (เริ่มนับใหม่ทุกเดือน)</p></div>
      ${[...Object.keys(DOC_TYPES), 'JV', 'PS'].map((t) => `<div class="field"><label>${DOC_TYPES[t] ? DOC_TYPES[t].label : t === 'JV' ? 'ใบสำคัญทั่วไป' : 'รอบจ่ายเงินเดือน'}</label><input name="prefix_${t}" value="${U.esc((st.prefixes || {})[t] || (DOC_TYPES[t] || {}).prefix || t)}"></div>`).join('')}
    </div>${saveBtn}`;
    bindSave((f) => {
      Object.assign(c, { vatRegistered: f.vatRegistered, vatRate: +f.vatRate || 0, vatPoint: f.vatPoint, defaultCreditDays: +f.defaultCreditDays || 0 });
      st.prefixes = {}; Object.keys(f).filter((k) => k.startsWith('prefix_')).forEach((k) => (st.prefixes[k.slice(7)] = f[k].replace(/\s/g, '') || k.slice(7)));
    });
  } else if (tab === 'payroll') {
    const p = st.payroll;
    body.innerHTML = `<div class="form-grid">
      <div class="field"><label>อัตราเงินสมทบประกันสังคม (%)</label><input type="number" step="any" name="ssoRate" value="${p.ssoRate}"></div>
      <div class="field"><label>ฐานค่าจ้างขั้นต่ำ</label><input type="number" name="ssoMin" value="${p.ssoMin}"></div>
      <div class="field"><label>ฐานค่าจ้างสูงสุด</label><input type="number" name="ssoMax" value="${p.ssoMax}"><span class="hint">ปี 2569–2571 ฐานสูงสุด 17,500 (สมทบสูงสุด 875 บาท) — ปรับได้ตามประกาศ</span></div>
      <div class="field"><label>ค่าลดหย่อนส่วนตัว/ปี</label><input type="number" name="personalAllowance" value="${p.personalAllowance}"></div>
      <div class="field"><label>หักค่าใช้จ่าย 40(1)(2) (%)</label><input type="number" name="expenseRate" value="${p.expenseRate}"></div>
      <div class="field"><label>หักค่าใช้จ่ายสูงสุด/ปี</label><input type="number" name="expenseMax" value="${p.expenseMax}"></div>
      <div class="full alert alert-info">${U.icon('info')}<div>อัตราภาษีเงินได้บุคคลธรรมดาแบบขั้นบันได: 0–150,000 ยกเว้น · 5% · 10% · 15% · 20% · 25% · 30% · 35% (เกิน 5 ล้าน)</div></div>
    </div>${saveBtn}`;
    bindSave((f) => { Object.keys(f).forEach((k) => (p[k] = +f[k] || 0)); });
  } else if (tab === 'sign') {
    body.innerHTML = `
      <div class="alert alert-info">${U.icon('info')}<div>ลายเซ็นและตราประทับจะแสดงในช่อง <b>ผู้มีอำนาจลงนาม / ผู้รับเงิน</b> (ฝั่งบริษัท) บนเอกสารที่พิมพ์และ PDF — เปิด/ปิดได้ในหน้าตัวอย่างก่อนพิมพ์</div></div>
      <h4 class="mt-3">ลายเซ็นผู้มีอำนาจลงนาม</h4>
      <div class="form-grid mt-1">
        <div class="field"><label>ชื่อผู้ลงนาม (แสดงใต้ลายเซ็น)</label><input id="sg-name" value="${U.esc(c.signName || '')}" placeholder="เช่น นายสมชาย ใจดี"></div>
        <div class="field"><label>ลายเซ็นปัจจุบัน</label><div class="sig-current" id="sg-current">${c.signImage ? `<img src="${c.signImage}" alt="ลายเซ็น"><button class="btn btn-xs btn-ghost" id="sg-del" style="color:var(--danger)">${U.icon('trash-2')}ลบ</button>` : '<span class="muted small">ยังไม่มีลายเซ็น</span>'}</div></div>
      </div>
      <div class="seg mt-2" id="sg-mode"><button class="active" data-m="draw">${U.icon('pen-line')} วาดลายเซ็น</button><button data-m="upload">${U.icon('upload')} อัปโหลดรูป</button></div>
      <div id="sg-draw" class="mt-1">
        <div class="sig-pad-wrap"><canvas id="sg-pad"></canvas><span class="sig-pad-hint">เซ็นชื่อในกรอบนี้ด้วยเมาส์หรือนิ้ว</span></div>
        <div class="flex wrap mt-1">
          <span class="small muted">สีหมึก</span>
          ${[['#111827', 'ดำ'], ['#1d4ed8', 'น้ำเงิน']].map(([v, l], i) => `<button class="btn btn-xs ${i ? 'btn-outline' : 'btn-soft'}" data-ink="${v}"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${v}"></span>${l}</button>`).join('')}
          <span class="small muted" style="margin-left:8px">ความหนา</span><input type="range" id="sg-width" min="1.5" max="5" step="0.5" value="2.5" style="width:110px">
          <div class="flex-1"></div>
          <button class="btn btn-sm btn-ghost" id="sg-clear">${U.icon('eraser')}ล้าง</button>
          <button class="btn btn-sm btn-primary" id="sg-save">${U.icon('save')}ใช้ลายเซ็นนี้</button>
        </div>
      </div>
      <div id="sg-upload" class="mt-1" style="display:none">
        <div class="field"><label>รูปลายเซ็น (PNG/JPG — เซ็นบนกระดาษขาวแล้วถ่ายรูป หรือสแกน)</label><input type="file" id="sg-file" accept="image/*"></div>
        <label class="check mt-1"><input type="checkbox" id="sg-white" checked> ลบพื้นหลังสีขาวให้โปร่งใสอัตโนมัติ</label>
      </div>

      <h4 class="mt-3">ตราประทับบริษัท</h4>
      <div class="form-grid mt-1">
        <div class="field"><label>อัปโหลดรูปตราประทับ (แนะนำ PNG พื้นหลังโปร่งใส)</label><input type="file" id="st-file" accept="image/*">
          <label class="check mt-1"><input type="checkbox" id="st-white" checked> ลบพื้นหลังสีขาวอัตโนมัติ</label></div>
        <div class="field"><label>ตราประทับปัจจุบัน</label><div class="sig-current" id="st-current">${c.stampImage ? `<img src="${c.stampImage}" alt="ตราประทับ" style="max-height:90px"><button class="btn btn-xs btn-ghost" id="st-del" style="color:var(--danger)">${U.icon('trash-2')}ลบ</button>` : '<span class="muted small">ยังไม่มีตราประทับ</span>'}</div></div>
      </div>
      <p class="small muted mt-3">ลายเซ็นในรูปแบบรูปภาพถือเป็น “ลายมือชื่ออิเล็กทรอนิกส์” ตาม พ.ร.บ.ว่าด้วยธุรกรรมทางอิเล็กทรอนิกส์ พ.ศ. 2544 ซึ่งใช้กับเอกสารทางการค้าทั่วไปได้ — เก็บรักษาบัญชีผู้ใช้และเครื่องให้ปลอดภัย เพราะผู้ที่เข้าถึงระบบได้จะพิมพ์เอกสารพร้อมลายเซ็นได้</p>`;

    /** แปลงรูปเป็น PNG: ลบพื้นขาว, ตัดขอบว่าง, ย่อขนาด */
    const processImage = (src, removeWhite, maxW = 600) => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, maxW / img.width, 400 / img.height);
        const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h); const px = data.data;
        let x0 = w, y0 = h, x1 = -1, y1 = -1;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          if (removeWhite) { const m = Math.min(px[i], px[i + 1], px[i + 2]); if (m > 225) px[i + 3] = 0; else if (m > 180) px[i + 3] = Math.round(px[i + 3] * (225 - m) / 45); }
          if (px[i + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        }
        if (x1 < 0) return reject(new Error('รูปว่างเปล่า'));
        ctx.putImageData(data, 0, 0);
        const pad = 6; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
        const out = document.createElement('canvas'); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
        out.getContext('2d').drawImage(cv, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
        resolve(out.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('อ่านรูปไม่ได้'));
      img.src = src;
    });
    const readFile = (f) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
    const saveName = () => { c.signName = U.$('#sg-name').value.trim(); };
    const commit = (msg) => { saveName(); Store.save(); U.toast(msg); App.render(); };

    // mode switch
    U.$$('#sg-mode button').forEach((b) => b.onclick = () => {
      U.$$('#sg-mode button').forEach((x) => x.classList.toggle('active', x === b));
      U.$('#sg-draw').style.display = b.dataset.m === 'draw' ? '' : 'none';
      U.$('#sg-upload').style.display = b.dataset.m === 'upload' ? '' : 'none';
    });
    U.$('#sg-name').onchange = () => { saveName(); Store.save({ silent: true }); };

    // signature pad
    const pad = U.$('#sg-pad'), wrap = pad.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const ctx = pad.getContext('2d');
    let ink = '#111827', drawn = false, pts = [];
    const size = () => { const w = wrap.clientWidth, h = 200; pad.width = w * dpr; pad.height = h * dpr; pad.style.width = w + 'px'; pad.style.height = h + 'px'; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; };
    size();
    const pos = (e) => { const r = pad.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    pad.addEventListener('pointerdown', (e) => { e.preventDefault(); pad.setPointerCapture(e.pointerId); pts = [pos(e)]; drawn = true; wrap.classList.add('used');
      ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = +U.$('#sg-width').value; ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, ctx.lineWidth / 2, 0, Math.PI * 2); ctx.fill(); });
    pad.addEventListener('pointermove', (e) => {
      if (!pts.length) return;
      pts.push(pos(e)); const n = pts.length; if (n < 3) return;
      const [a, b, cc] = [pts[n - 3], pts[n - 2], pts[n - 1]];
      ctx.beginPath(); ctx.moveTo((a.x + b.x) / 2, (a.y + b.y) / 2); ctx.quadraticCurveTo(b.x, b.y, (b.x + cc.x) / 2, (b.y + cc.y) / 2); ctx.stroke();
    });
    const end = () => { pts = []; };
    pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
    U.$$('[data-ink]').forEach((b) => b.onclick = () => { ink = b.dataset.ink; U.$$('[data-ink]').forEach((x) => { x.classList.toggle('btn-soft', x === b); x.classList.toggle('btn-outline', x !== b); }); });
    U.$('#sg-clear').onclick = () => { ctx.clearRect(0, 0, pad.width, pad.height); drawn = false; wrap.classList.remove('used'); };
    U.$('#sg-save').onclick = async () => {
      if (!drawn) return U.toast('กรุณาเซ็นชื่อในกรอบก่อน', 'error');
      try { c.signImage = await processImage(pad.toDataURL('image/png'), false); commit('บันทึกลายเซ็นแล้ว'); } catch (e) { U.toast(e.message, 'error'); }
    };
    U.$('#sg-file').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      if (f.size > 5 * 1024 * 1024) return U.toast('ไฟล์ใหญ่เกิน 5MB', 'error');
      try { c.signImage = await processImage(await readFile(f), U.$('#sg-white').checked); commit('บันทึกลายเซ็นแล้ว'); } catch (er) { U.toast(er.message, 'error'); }
    };
    U.$('#st-file').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      if (f.size > 5 * 1024 * 1024) return U.toast('ไฟล์ใหญ่เกิน 5MB', 'error');
      try { c.stampImage = await processImage(await readFile(f), U.$('#st-white').checked, 400); commit('บันทึกตราประทับแล้ว'); } catch (er) { U.toast(er.message, 'error'); }
    };
    const sd = U.$('#sg-del'); if (sd) sd.onclick = async () => { if (await U.confirm('ลบลายเซ็นอิเล็กทรอนิกส์?', { danger: true })) { c.signImage = ''; commit('ลบลายเซ็นแล้ว'); } };
    const td = U.$('#st-del'); if (td) td.onclick = async () => { if (await U.confirm('ลบรูปตราประทับ?', { danger: true })) { c.stampImage = ''; commit('ลบตราประทับแล้ว'); } };
  } else if (tab === 'google') {
    const conn = Conn.get();
    body.innerHTML = `
      <div class="alert ${Sync.enabled() ? 'alert-ok' : 'alert-warn'}">${U.icon(Sync.enabled() ? 'cloud' : 'cloud-off')}<div>${Sync.enabled() ? `เชื่อมต่อเซิร์ฟเวอร์แล้ว · ซิงก์ล่าสุด ${s.meta.syncedAt ? new Date(s.meta.syncedAt).toLocaleString('th-TH') : '-'}${s.meta.savedBy ? ` โดย ${U.esc(s.meta.savedBy)}` : ''}` : 'ยังไม่ได้เชื่อมต่อ'}</div></div>
      <h4 class="mt-3">ลิงก์เข้าใช้งานสำหรับพนักงาน</h4>
      <p class="muted small">ส่งลิงก์นี้ให้พนักงาน เปิดครั้งแรกระบบจะตั้งค่าการเชื่อมต่อให้อัตโนมัติ แล้วไปหน้าลงทะเบียน/เข้าสู่ระบบ</p>
      <div class="flex"><input id="inv-link" readonly value="${U.esc(Conn.inviteLink())}"><button class="btn btn-outline" id="inv-copy">${U.icon('copy')}คัดลอก</button></div>
      <div class="form-grid mt-3">
        <div class="field full"><label>Web App URL (Google Apps Script)</label><input id="g-url" value="${U.esc(conn.gasUrl || '')}" placeholder="https://script.google.com/macros/s/XXXX/exec"></div>
        <label class="check full"><input type="checkbox" id="g-auto" ${st.autoSync ? 'checked' : ''}> ซิงก์อัตโนมัติทุกครั้งที่บันทึกข้อมูล</label>
      </div>
      <div class="btn-group mt-2">
        <button class="btn btn-primary" id="g-save">${U.icon('save')}บันทึก</button>
        <button class="btn btn-outline" id="g-push">${U.icon('cloud-upload')}ซิงก์ + อัปเดต Google Sheets</button>
        <button class="btn btn-outline" id="g-pull">${U.icon('cloud-download')}ดึงข้อมูลล่าสุด</button>
        <button class="btn btn-success" id="g-backup">${U.icon('archive')}สำรองข้อมูลตอนนี้</button>
      </div>
      <div class="alert alert-info mt-3">${U.icon('shield-check')}<div>การเข้าสู่ระบบด้วย Google: ${Auth.cfg && Auth.cfg.google ? '<b>เปิดใช้งานแล้ว</b>' : 'ยังไม่เปิด — ใส่ <code>GOOGLE_CLIENT_ID</code> ใน Code.gs'}${Auth.cfg && Auth.cfg.domain ? ` · จำกัดเฉพาะ @${U.esc(Auth.cfg.domain)}` : ''} · ล็อกอินด้วยรหัสผ่าน: ${!Auth.cfg || Auth.cfg.password ? 'เปิด' : 'ปิด (Google เท่านั้น)'}</div></div>
      <h4 class="mt-3">ไฟล์สำรองบน Google Drive</h4><div id="g-backups" class="mt-1 muted small">กำลังโหลด…</div>`;
    U.$('#inv-copy').onclick = () => { navigator.clipboard.writeText(U.$('#inv-link').value).then(() => U.toast('คัดลอกลิงก์แล้ว')); };
    const busy = async (btn, fn) => { btn.disabled = true; const h = btn.innerHTML; btn.innerHTML = `${U.icon('loader-2')}กำลังดำเนินการ…`; U.refreshIcons(); try { await fn(); } catch (e) { U.toast(e.message, 'error'); } finally { btn.disabled = false; btn.innerHTML = h; U.refreshIcons(); } };
    U.$('#g-save').onclick = (e) => busy(e.currentTarget, async () => {
      const url = U.$('#g-url').value.trim();
      if (url !== conn.gasUrl) { await Sync.call('config', {}, { url }); Conn.set({ gasUrl: url }); }
      st.autoSync = U.$('#g-auto').checked; Store.save(); U.toast('บันทึกแล้ว'); App.render();
    });
    U.$('#g-push').onclick = (e) => busy(e.currentTarget, async () => { await Sync.push({ sheets: true }); U.toast('ซิงก์ข้อมูลและอัปเดต Google Sheets แล้ว'); });
    U.$('#g-pull').onclick = (e) => busy(e.currentTarget, async () => { await Sync.refresh({ quiet: false }); });
    U.$('#g-backup').onclick = (e) => busy(e.currentTarget, async () => { await Sync.push({ sheets: true }); const r = await Sync.call('backup'); U.toast(`สำรองข้อมูลแล้ว: ${r.name}`); loadBackups(); });
    const loadBackups = async () => {
      const el = U.$('#g-backups'); if (!el) return;
      try {
        const r = await Sync.call('listBackups');
        el.innerHTML = `${r.sheetUrl ? `<p><a href="${U.esc(r.sheetUrl)}" target="_blank" rel="noopener">${U.icon('sheet')} เปิด Google Sheets ฐานข้อมูล</a> · <a href="${U.esc(r.folderUrl)}" target="_blank" rel="noopener">${U.icon('folder')} เปิดโฟลเดอร์ใน Drive</a></p>` : ''}
          ${r.files && r.files.length ? `<table class="tbl compact"><thead><tr><th>ไฟล์</th><th>วันที่</th><th class="num">ขนาด</th><th></th></tr></thead><tbody>
          ${r.files.map((f) => `<tr><td>${U.esc(f.name)}</td><td>${new Date(f.date).toLocaleString('th-TH')}</td><td class="num">${(f.size / 1024).toFixed(1)} KB</td>
          <td class="actions"><button class="btn btn-xs btn-outline" data-restore="${U.esc(f.id)}">${U.icon('rotate-ccw')}กู้คืน</button></td></tr>`).join('')}</tbody></table>` : 'ยังไม่มีไฟล์สำรอง'}`;
        U.refreshIcons();
        el.querySelectorAll('[data-restore]').forEach((b) => b.onclick = async () => {
          if (!(await U.confirm('กู้คืนข้อมูลจากไฟล์สำรองนี้? ข้อมูลปัจจุบันของ<b>ทุกคน</b>จะถูกแทนที่ (ระบบจะสำรองข้อมูลปัจจุบันไว้ก่อน)', { danger: true, okText: 'กู้คืน' }))) return;
          try { const x = await Sync.call('restore', { id: b.dataset.restore }); Store.replace(x.data); Store.state.meta.dirty = false; Store.persist(); U.toast('กู้คืนข้อมูลแล้ว'); App.render(); } catch (e) { U.toast(e.message, 'error'); }
        });
      } catch (e) { el.textContent = 'โหลดรายการไม่สำเร็จ: ' + e.message; }
    };
    loadBackups();
  } else if (tab === 'companies') {
    body.style.maxWidth = 'none';
    body.innerHTML = `<div class="flex between wrap mb-2"><p class="muted small" style="margin:0">แต่ละบริษัทแยกข้อมูลกันทั้งหมด (เอกสาร บัญชี สต็อก ไฟล์แนบ สำรองข้อมูล) และมีโฟลเดอร์ของตัวเองใน Google Drive — ผู้ใช้งานใช้ร่วมกัน กำหนดสิทธิ์รายบริษัทได้ที่แท็บ “ผู้ใช้งาน”</p>
      <button class="btn btn-primary btn-sm" onclick="Pages.companyAdd()">${U.icon('plus')}เพิ่มบริษัท</button></div><div id="co-list" class="muted">กำลังโหลด…</div>`;
    const load = async () => {
      const el = U.$('#co-list'); if (!el) return;
      try {
        const list = await Company.refreshList();
        el.innerHTML = `<div class="table-wrap"><table class="tbl"><thead><tr><th>บริษัท</th><th>สถานะ</th><th></th></tr></thead><tbody>
          ${list.map((x) => `<tr><td><div class="flex">${U.icon('building-2', 'text-primary')}<b>${U.esc(x.name)}</b></div></td>
            <td>${x.id === Company.id ? '<span class="chip chip-paid">กำลังใช้งาน</span>' : `<button class="btn btn-xs btn-soft" onclick="Company.switchTo('${x.id}')">${U.icon('arrow-right-left')}สลับไปบริษัทนี้</button>`}</td>
            <td class="actions"><button class="icon-btn" title="เปลี่ยนชื่อ" data-ren="${x.id}">${U.icon('pencil')}</button>${list.length > 1 && x.id !== Company.id ? `<button class="icon-btn danger" title="นำออกจากระบบ" data-del="${x.id}">${U.icon('trash-2')}</button>` : ''}</td></tr>`).join('')}
          </tbody></table></div>
          <p class="small muted mt-2">การ “นำออก” จะซ่อนบริษัทจากระบบ แต่โฟลเดอร์และข้อมูลใน Google Drive ยังอยู่ (ชื่อโฟลเดอร์จะมีคำว่า “นำออกแล้ว” ต่อท้าย) · นำบริษัทที่กำลังใช้งานออกไม่ได้ ให้สลับไปบริษัทอื่นก่อน</p>`;
        U.refreshIcons(); App.renderCompanySwitch(); U.refreshIcons();
        el.querySelectorAll('[data-ren]').forEach((b) => b.onclick = () => { const x = list.find((y) => y.id === b.dataset.ren); U.modal({
          title: 'เปลี่ยนชื่อบริษัท', size: 'sm', body: `<div class="field"><label>ชื่อบริษัท</label><input id="co-name" value="${U.esc(x.name)}"></div><p class="small muted">ชื่อนี้ใช้ในตัวสลับบริษัทและชื่อโฟลเดอร์ — ชื่อบนเอกสารแก้ที่แท็บ “ข้อมูลกิจการ”</p>`,
          footer: '<button class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-primary" data-ok>บันทึก</button>',
          onOpen: (root, close) => { root.querySelector('[data-ok]').onclick = async () => { try { await Sync.call('renameCompany', { id: x.id, name: root.querySelector('#co-name').value.trim() }); close(); U.toast('เปลี่ยนชื่อแล้ว'); load(); } catch (e) { U.toast(e.message, 'error'); } }; },
        }); });
        el.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => { const x = list.find((y) => y.id === b.dataset.del);
          if (!(await U.confirm(`นำบริษัท <b>${U.esc(x.name)}</b> ออกจากระบบ? ทุกคนจะไม่เห็นบริษัทนี้อีก (ข้อมูลใน Google Drive ยังอยู่)`, { danger: true, okText: 'นำออก' }))) return;
          try { await Sync.call('removeCompany', { id: x.id }); localStorage.removeItem(Company.stateKey(x.id)); U.toast('นำบริษัทออกแล้ว', 'info'); load(); } catch (e) { U.toast(e.message, 'error'); } });
      } catch (e) { el.innerHTML = `<div class="alert alert-err">${U.icon('alert-circle')}<div>${U.esc(/unknown action/.test(e.message) ? 'เซิร์ฟเวอร์ยังไม่รองรับหลายบริษัท — อัปเดต Code.gs เป็นเวอร์ชันล่าสุด รัน setup แล้ว Deploy เวอร์ชันใหม่' : e.message)}</div></div>`; U.refreshIcons(); }
    };
    load();
  } else if (tab === 'users') {
    body.style.maxWidth = 'none';
    body.innerHTML = `<div class="flex between wrap mb-2"><p class="muted small" style="margin:0">พนักงานลงทะเบียนเอง แล้วผู้ดูแลระบบอนุมัติที่นี่ · ข้อมูลเก็บในชีต “ผู้ใช้งาน”</p>
      <button class="btn btn-outline btn-sm" id="u-invite">${U.icon('link')}คัดลอกลิงก์เข้าใช้งาน</button></div><div id="u-list" class="muted">กำลังโหลด…</div>`;
    U.$('#u-invite').onclick = () => navigator.clipboard.writeText(Conn.inviteLink()).then(() => U.toast('คัดลอกลิงก์แล้ว'));
    const load = async () => {
      const el = U.$('#u-list'); if (!el) return;
      try {
        const { users } = await Sync.call('listUsers');
        const coText = (u) => { const ids = String(u.companies || '').split(',').filter(Boolean); return ids.length ? ids.map((i) => (Company.list().find((x) => x.id === i) || {}).name || i).join(', ') : 'ทุกบริษัท'; };
        users.sort((a, b) => (a.status === 'pending' ? -1 : 0) - (b.status === 'pending' ? -1 : 0) || a.firstName.localeCompare(b.firstName));
        const st2 = { active: ['ใช้งาน', 'paid'], pending: ['รออนุมัติ', 'pending'], disabled: ['ระงับ', 'void'] };
        el.innerHTML = `<div class="table-wrap"><table class="tbl"><thead><tr><th>ชื่อ-นามสกุล</th><th>ตำแหน่ง</th><th>ติดต่อ</th><th>วันเกิด</th><th>สิทธิ์</th><th>สถานะ</th><th>เข้าใช้ล่าสุด</th><th></th></tr></thead><tbody>
          ${users.map((u) => { const me = u.email === Auth.user.email; const [sl, sc] = st2[u.status] || st2.pending; return `<tr>
            <td><b>${U.esc(Auth.fullName(u))}</b>${me ? ' <span class="tag">คุณ</span>' : ''}<div class="muted small">ลงทะเบียน ${U.esc(String(u.createdAt).slice(0, 10))} · ${u.authType.includes('google') ? 'Google' : 'รหัสผ่าน'}</div></td>
            <td>${U.esc(u.position)}${Company.list().length > 1 ? `<div class="muted small">${U.icon('building-2')} ${u.role === 'admin' ? 'ทุกบริษัท' : U.esc(coText(u))}</div>` : ''}</td><td class="small">${U.esc(u.email)}<br>${U.esc(u.phone)}</td><td class="small">${u.birthDate ? U.thDate(u.birthDate) : '-'}</td>
            <td><select data-role="${U.esc(u.email)}" class="input-sm" style="width:auto;min-width:130px">${U.opt('staff', 'พนักงาน', u.role)}${U.opt('admin', 'ผู้ดูแลระบบ', u.role)}</select></td>
            <td><span class="chip chip-${sc}">${sl}</span></td><td class="small">${U.esc(u.lastLogin || '-')}</td>
            <td class="actions">${u.status === 'pending' ? `<button class="btn btn-xs btn-success" data-st="active" data-em="${U.esc(u.email)}">${U.icon('check')}อนุมัติ</button>` : ''}
              ${u.status === 'active' && !me ? `<button class="btn btn-xs btn-outline" data-st="disabled" data-em="${U.esc(u.email)}">${U.icon('ban')}ระงับ</button>` : ''}
              ${u.status === 'disabled' ? `<button class="btn btn-xs btn-outline" data-st="active" data-em="${U.esc(u.email)}">${U.icon('rotate-ccw')}เปิดใช้</button>` : ''}
              ${u.role === 'admin' ? '' : `<button class="icon-btn" title="บริษัทที่เข้าได้: ${U.esc(coText(u))}" data-co="${U.esc(u.email)}">${U.icon('building-2')}</button>`}
              <button class="icon-btn" title="รีเซ็ตรหัสผ่าน" data-pw="${U.esc(u.email)}">${U.icon('key-round')}</button>
              ${me ? '' : `<button class="icon-btn danger" title="ลบผู้ใช้" data-del="${U.esc(u.email)}">${U.icon('trash-2')}</button>`}</td></tr>`; }).join('')}
          </tbody></table></div>`;
        U.refreshIcons();
        const act = async (fn, msg) => { try { await fn(); U.toast(msg); load(); } catch (e) { U.toast(e.message, 'error'); load(); } };
        el.querySelectorAll('[data-st]').forEach((b) => b.onclick = () => act(() => Sync.call('updateUser', { email: b.dataset.em, status: b.dataset.st }), b.dataset.st === 'active' ? 'อนุมัติ/เปิดใช้งานแล้ว' : 'ระงับผู้ใช้แล้ว'));
        el.querySelectorAll('[data-role]').forEach((sel) => sel.onchange = () => act(() => Sync.call('updateUser', { email: sel.dataset.role, role: sel.value }), 'เปลี่ยนสิทธิ์แล้ว'));
        el.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => { if (await U.confirm(`ลบผู้ใช้ ${U.esc(b.dataset.del)}? (ประวัติการใช้งานยังเก็บไว้)`, { danger: true, okText: 'ลบ' })) act(() => Sync.call('deleteUser', { email: b.dataset.del }), 'ลบผู้ใช้แล้ว'); });
        el.querySelectorAll('[data-co]').forEach((b) => b.onclick = () => { const u = users.find((x) => x.email === b.dataset.co); const cur = String(u.companies || '').split(',').filter(Boolean); const cos = Company.list();
          U.modal({ title: 'บริษัทที่เข้าใช้งานได้', size: 'sm',
            body: `<p class="small muted mt-0">${U.esc(Auth.fullName(u))} · ${U.esc(u.email)}</p>
              <label class="check"><input type="checkbox" id="co-all" ${cur.length ? '' : 'checked'}> <b>ทุกบริษัท</b> (รวมบริษัทที่เพิ่มในอนาคต)</label>
              <div id="co-pick" style="margin:10px 0 0 26px;display:flex;flex-direction:column;gap:8px">${cos.map((x) => `<label class="check"><input type="checkbox" value="${x.id}" ${!cur.length || cur.includes(x.id) ? 'checked' : ''}> ${U.esc(x.name)}</label>`).join('')}</div>`,
            footer: '<button class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-primary" data-ok>บันทึก</button>',
            onOpen: (root, close) => {
              const all = root.querySelector('#co-all'), pick = root.querySelector('#co-pick');
              const sync2 = () => { pick.style.opacity = all.checked ? .5 : 1; pick.querySelectorAll('input').forEach((i) => { i.disabled = all.checked; if (all.checked) i.checked = true; }); };
              all.onchange = sync2; sync2();
              root.querySelector('[data-ok]').onclick = () => { const ids = [...pick.querySelectorAll('input:checked')].map((i) => i.value);
                if (!all.checked && !ids.length) return U.toast('เลือกอย่างน้อย 1 บริษัท', 'error');
                close(); act(() => Sync.call('updateUser', { email: u.email, companies: all.checked ? '*' : ids.join(',') }), 'บันทึกสิทธิ์บริษัทแล้ว'); };
            } }); });
        el.querySelectorAll('[data-pw]').forEach((b) => b.onclick = () => U.modal({
          title: 'รีเซ็ตรหัสผ่าน', size: 'sm',
          body: `<p class="small muted mt-0">${U.esc(b.dataset.pw)}</p><div class="field"><label>รหัสผ่านใหม่ (8 ตัวขึ้นไป)</label><input type="text" id="np" value="${Math.random().toString(36).slice(2, 6)}${Math.random().toString(36).slice(2, 8).toUpperCase()}"></div><p class="small muted">แจ้งรหัสนี้ให้พนักงาน แล้วให้เปลี่ยนเองที่ “โปรไฟล์ของฉัน”</p>`,
          footer: '<button class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-primary" data-ok>รีเซ็ต</button>',
          onOpen: (root, close) => { root.querySelector('[data-ok]').onclick = () => { const np = root.querySelector('#np').value.trim(); close(); act(() => Sync.call('resetPassword', { email: b.dataset.pw, newPassword: np }), 'รีเซ็ตรหัสผ่านแล้ว'); }; },
        }));
      } catch (e) { el.innerHTML = `<div class="alert alert-err">${U.icon('alert-circle')}<div>${U.esc(e.message)}</div></div>`; U.refreshIcons(); }
    };
    load();
  } else if (tab === 'activity') {
    body.style.maxWidth = 'none';
    body.innerHTML = `<div class="toolbar" style="padding:0 0 12px;border:0"><div class="search">${U.icon('search')}<input id="a-q" placeholder="ค้นหาผู้ใช้ การกระทำ หรือเลขที่เอกสาร…"></div><div class="flex-1"></div>
      <button class="btn btn-outline btn-sm" id="a-csv">${U.icon('download')}CSV</button><button class="btn btn-outline btn-sm" id="a-reload">${U.icon('refresh-cw')}รีเฟรช</button></div><div id="a-list" class="muted">กำลังโหลด…</div>`;
    let rows = [];
    const draw = () => {
      const q = U.$('#a-q').value.toLowerCase();
      const list = rows.filter((r) => !q || `${r.email} ${r.name} ${r.company} ${r.action} ${r.detail}`.toLowerCase().includes(q));
      U.$('#a-list').innerHTML = list.length ? `<div class="table-wrap"><table class="tbl compact"><thead><tr><th>เวลา</th><th>ผู้ใช้</th><th>บริษัท</th><th>การกระทำ</th><th>รายละเอียด</th></tr></thead><tbody>
        ${list.map((r) => `<tr><td class="nowrap small">${new Date(r.at).toLocaleString('th-TH')}</td><td><b>${U.esc(r.name || '-')}</b><div class="muted small">${U.esc(r.email)}</div></td><td class="small">${U.esc(r.company || '-')}</td><td><span class="tag">${U.esc(r.action)}</span></td><td class="small">${U.esc(r.detail)}</td></tr>`).join('')}
        </tbody></table></div>` : `<div class="empty">${U.icon('history')}<h4>ไม่มีประวัติ</h4></div>`;
      U.refreshIcons();
    };
    const load = async () => { try { rows = (await Sync.call('activity', { limit: 500 })).rows; draw(); } catch (e) { U.$('#a-list').textContent = e.message; } };
    U.$('#a-q').oninput = U.debounce(draw, 200);
    U.$('#a-reload').onclick = load;
    U.$('#a-csv').onclick = () => U.downloadCSV(`activity-${U.today()}.csv`, [['เวลา', 'อีเมล', 'ชื่อ', 'การกระทำ', 'รายละเอียด'], ...rows.map((r) => [r.at, r.email, r.name, r.action, r.detail])]);
    load();
  } else if (tab === 'data') {
    const size = (JSON.stringify(s).length / 1024).toFixed(1);
    body.innerHTML = `
      <div class="grid g3">
        <div class="card kpi"><div><div class="kpi-label">เอกสาร</div><div class="kpi-value">${s.documents.length}</div></div></div>
        <div class="card kpi"><div><div class="kpi-label">รายชื่อ / สินค้า</div><div class="kpi-value">${s.contacts.length} / ${s.products.length}</div></div></div>
        <div class="card kpi"><div><div class="kpi-label">ขนาดข้อมูล</div><div class="kpi-value">${size} KB</div></div></div>
      </div>
      <div class="alert alert-warn mt-2">${U.icon('alert-triangle')}<div>ข้อมูลใช้ร่วมกันทั้งบริษัท — การนำเข้า โหลดข้อมูลตัวอย่าง หรือล้างข้อมูล จะ<b>แทนที่ข้อมูลของทุกคนบนเซิร์ฟเวอร์</b> (ระบบสำรองข้อมูลเดิมไว้ให้ก่อนอัตโนมัติ)</div></div>
      <h4 class="mt-3">สำรองข้อมูลลงเครื่อง</h4><p class="muted small">ดาวน์โหลดข้อมูลทั้งหมดเป็นไฟล์ JSON</p>
      <div class="btn-group"><button class="btn btn-outline" id="d-export">${U.icon('download')}ดาวน์โหลดไฟล์สำรอง (.json)</button>
        <label class="btn btn-outline">${U.icon('upload')}นำเข้าไฟล์สำรอง<input type="file" id="d-import" accept=".json,application/json" hidden></label></div>
      <h4 class="mt-3">ข้อมูลตัวอย่าง</h4><p class="muted small">สำหรับทดลองระบบเท่านั้น</p>
      <button class="btn btn-soft" onclick="Demo.confirmLoad()">${U.icon('sparkles')}โหลดข้อมูลตัวอย่าง</button>
      <h4 class="mt-3" style="color:var(--danger)">ล้างข้อมูลทั้งหมด</h4><p class="muted small">ลบเอกสาร รายชื่อ สินค้า และบัญชีทั้งหมด เพื่อเริ่มใช้งานจริง (ผู้ใช้งานและประวัติการใช้งานยังอยู่)</p>
      <button class="btn btn-danger" id="d-reset">${U.icon('trash-2')}ล้างข้อมูล</button>`;
    U.$('#d-export').onclick = () => U.downloadFile(`voltgrid-backup-${U.today()}.json`, JSON.stringify(s, null, 1), 'application/json');
    U.$('#d-import').onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = async () => {
        try {
          const d = JSON.parse(r.result);
          if (!d.documents || !d.accounts) throw new Error('ไฟล์ไม่ถูกต้อง');
          if (!(await U.confirm(`นำเข้าข้อมูลจากไฟล์ (${d.documents.length} เอกสาร)? ข้อมูลของทุกคนจะถูกแทนที่`, { danger: true }))) return;
          await Sync.overwrite(d, 'นำเข้าข้อมูลจากไฟล์'); U.toast('นำเข้าข้อมูลแล้ว'); App.go('#/dashboard');
        } catch (er) { U.toast(er.message, 'error'); }
      };
      r.readAsText(f);
    };
    U.$('#d-reset').onclick = async () => {
      if (!(await U.confirm('ล้างข้อมูลบัญชีทั้งหมดของบริษัท? ทุกคนจะเห็นข้อมูลว่างเปล่า (ระบบสำรองข้อมูลเดิมไว้ใน Google Drive ก่อน)', { danger: true, okText: 'ล้างข้อมูล' }))) return;
      const d = Store.defaults(); d.company = { ...d.company, ...{ name: s.company.name, nameEn: s.company.nameEn, taxId: s.company.taxId, branch: s.company.branch, address: s.company.address, phone: s.company.phone, email: s.company.email, logo: s.company.logo, appLogo: s.company.appLogo, brandName: s.company.brandName, brandSub: s.company.brandSub, signName: s.company.signName, signImage: s.company.signImage, stampImage: s.company.stampImage } };
      try { await Sync.overwrite(d, 'ล้างข้อมูลทั้งหมด'); U.toast('ล้างข้อมูลแล้ว (ข้อมูลกิจการ โลโก้ และลายเซ็นยังอยู่)', 'info'); App.go('#/start'); } catch (er) { U.toast(er.message, 'error'); }
    };
  }
};

/** เพิ่มบริษัทใหม่ (ผู้ดูแลระบบ) */
Pages.companyAdd = () => {
  if (!Auth.isAdmin()) return U.toast('เฉพาะผู้ดูแลระบบ', 'error');
  U.modal({
    title: `${U.icon('building-2')} เพิ่มบริษัท`, size: 'sm',
    body: `<div class="field"><label class="req">ชื่อบริษัท / กิจการ</label><input id="nc-name" placeholder="เช่น บริษัท ตัวอย่าง จำกัด"></div>
      <div class="alert alert-info mt-2">${U.icon('info')}<div>ระบบจะสร้างโฟลเดอร์ของบริษัทนี้ใน Google Drive และเริ่มจากข้อมูลว่าง แล้วสลับเข้าไปให้ทันที — ตั้งค่าที่อยู่ เลขผู้เสียภาษี โลโก้ และลายเซ็นได้ที่หน้าตั้งค่า</div></div>`,
    footer: '<button class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-primary" data-ok>สร้างบริษัท</button>',
    onOpen: (root) => {
      root.querySelector('[data-ok]').onclick = async (e) => {
        const name = root.querySelector('#nc-name').value.trim();
        if (!name) return U.toast('กรุณาระบุชื่อบริษัท', 'error');
        const btn = e.currentTarget; btn.disabled = true; btn.textContent = 'กำลังสร้าง…';
        try { await Company.create(name); }
        catch (er) { btn.disabled = false; btn.textContent = 'สร้างบริษัท'; U.toast(/unknown action/.test(er.message) ? 'เซิร์ฟเวอร์ยังไม่รองรับหลายบริษัท — อัปเดต Code.gs แล้ว Deploy เวอร์ชันใหม่' : er.message, 'error'); }
      };
    },
  });
};
