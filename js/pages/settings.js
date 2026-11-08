/* ============================================================
 * Settings: กิจการ / ภาษี / เงินเดือน / Google / ข้อมูล
 * ============================================================ */
Pages.settings = (view, tab = 'company') => {
  const TABS = [['company', 'building', 'ข้อมูลกิจการ'], ['tax', 'percent', 'ภาษีและเอกสาร'], ['payroll', 'id-card', 'เงินเดือน'], ['sign', 'signature', 'ลายเซ็นและตราประทับ'], ['google', 'cloud', 'Google Drive / Sheets'], ['data', 'database', 'สำรองและกู้คืนข้อมูล']];
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
      <div class="field"><label>โลโก้ (ไม่เกิน 200KB)</label><input type="file" id="logo-file" accept="image/*"><input type="hidden" name="logo" value="${U.esc(c.logo)}"></div>
      ${c.logo ? `<div class="full"><img src="${c.logo}" style="max-height:64px;border:1px solid var(--border);border-radius:8px;padding:4px"> <button class="btn btn-xs btn-ghost" id="logo-rm">ลบโลโก้</button></div>` : ''}
    </div>${saveBtn}`;
    U.$('#logo-file').onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      if (f.size > 200 * 1024) return U.toast('ไฟล์ใหญ่เกิน 200KB', 'error');
      const r = new FileReader(); r.onload = () => { body.querySelector('[name=logo]').value = r.result; U.toast('เลือกโลโก้แล้ว กดบันทึกเพื่อใช้งาน', 'info'); }; r.readAsDataURL(f);
    };
    const rm = U.$('#logo-rm'); if (rm) rm.onclick = () => { c.logo = ''; Store.save(); App.render(); };
    bindSave((f) => { delete f[''];  Object.assign(c, f, { fyStartMonth: +f.fyStartMonth }); });
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
    body.innerHTML = `
      <div class="alert ${Sync.enabled() ? 'alert-ok' : 'alert-info'}">${U.icon(Sync.enabled() ? 'cloud' : 'cloud-off')}<div>${Sync.enabled() ? `เชื่อมต่อ Google แล้ว · ซิงก์ล่าสุด ${s.meta.syncedAt ? new Date(s.meta.syncedAt).toLocaleString('th-TH') : '-'}` : 'ยังไม่ได้เชื่อมต่อ — ข้อมูลเก็บอยู่ในเบราว์เซอร์เครื่องนี้เท่านั้น'}</div></div>
      <h4 class="mt-3">วิธีตั้งค่า (ทำครั้งเดียว ~5 นาที)</h4>
      <ol class="small" style="line-height:1.9;color:var(--text-2)">
        <li>เปิด <a href="https://script.google.com/home/projects/create" target="_blank" rel="noopener">script.google.com</a> → สร้างโปรเจกต์ใหม่ ตั้งชื่อ “AccFlow Backend”</li>
        <li>คัดลอกโค้ดจากไฟล์ <code>google-apps-script/Code.gs</code> ใน repository ไปวางแทนโค้ดเดิม แล้วกดบันทึก</li>
        <li>เลือกฟังก์ชัน <code>setup</code> แล้วกด ▶ Run → อนุญาตสิทธิ์ → ดู <b>API Token</b> ใน Execution log</li>
        <li>กด <b>Deploy → New deployment</b> → ประเภท <b>Web app</b> · Execute as: <b>Me</b> · Who has access: <b>Anyone</b> → Deploy แล้วคัดลอก URL</li>
        <li>นำ URL และ Token มาวางด้านล่าง แล้วกด “ทดสอบการเชื่อมต่อ”</li>
      </ol>
      <div class="form-grid mt-2">
        <div class="field full"><label>Web App URL</label><input name="gasUrl" value="${U.esc(st.gasUrl)}" placeholder="https://script.google.com/macros/s/XXXX/exec"></div>
        <div class="field full"><label>API Token</label><input type="password" name="gasToken" value="${U.esc(st.gasToken)}" autocomplete="off"></div>
        <label class="check full"><input type="checkbox" name="autoSync" ${st.autoSync ? 'checked' : ''}> ซิงก์อัตโนมัติทุกครั้งที่บันทึกข้อมูล</label>
      </div>
      <div class="btn-group mt-2">
        <button class="btn btn-primary" id="set-save">${U.icon('save')}บันทึก</button>
        <button class="btn btn-outline" id="g-test">${U.icon('plug-zap')}ทดสอบการเชื่อมต่อ</button>
        <button class="btn btn-outline" id="g-push" ${Sync.enabled() ? '' : 'disabled'}>${U.icon('cloud-upload')}ซิงก์ขึ้น + อัปเดต Google Sheets</button>
        <button class="btn btn-outline" id="g-pull" ${Sync.enabled() ? '' : 'disabled'}>${U.icon('cloud-download')}ดึงข้อมูลจาก Google</button>
        <button class="btn btn-success" id="g-backup" ${Sync.enabled() ? '' : 'disabled'}>${U.icon('archive')}สำรองข้อมูลตอนนี้</button>
      </div>
      <h4 class="mt-3">ไฟล์สำรองบน Google Drive</h4><div id="g-backups" class="mt-1 muted small">${Sync.enabled() ? 'กำลังโหลด…' : '-'}</div>`;
    bindSave((f) => Object.assign(st, { gasUrl: f.gasUrl, gasToken: f.gasToken, autoSync: f.autoSync }));
    const busy = async (btn, fn) => { btn.disabled = true; const h = btn.innerHTML; btn.innerHTML = `${U.icon('loader-2')}กำลังดำเนินการ…`; U.refreshIcons(); try { await fn(); } catch (e) { U.toast(e.message, 'error'); } finally { btn.disabled = false; btn.innerHTML = h; U.refreshIcons(); } };
    U.$('#g-test').onclick = (e) => busy(e.currentTarget, async () => {
      const f = U.formData(body); Object.assign(st, { gasUrl: f.gasUrl, gasToken: f.gasToken }); Store.save({ sync: false, silent: true });
      const r = await Sync.call('ping'); U.toast(`เชื่อมต่อสำเร็จ: ${r.app || 'AccFlow'} (${r.user || 'Google'})`); App.render();
    });
    U.$('#g-push').onclick = (e) => busy(e.currentTarget, async () => { await Sync.push({ sheets: true }); U.toast('ซิงก์ข้อมูลและอัปเดต Google Sheets แล้ว'); });
    U.$('#g-pull').onclick = (e) => busy(e.currentTarget, async () => {
      if (!(await U.confirm('แทนที่ข้อมูลในเครื่องด้วยข้อมูลจาก Google?', { danger: true }))) return;
      const d = await Sync.pull(); if (!d) return U.toast('ยังไม่มีข้อมูลบน Google', 'warning');
      d.settings = { ...d.settings, gasUrl: st.gasUrl, gasToken: st.gasToken }; Store.replace(d); U.toast('ดึงข้อมูลแล้ว'); App.render();
    });
    U.$('#g-backup').onclick = (e) => busy(e.currentTarget, async () => { await Sync.push({ sheets: true }); const r = await Sync.call('backup'); U.toast(`สำรองข้อมูลแล้ว: ${r.name}`); loadBackups(); });
    const loadBackups = async () => {
      const el = U.$('#g-backups'); if (!el || !Sync.enabled()) return;
      try {
        const r = await Sync.call('listBackups');
        el.innerHTML = r.files && r.files.length ? `<table class="tbl compact"><thead><tr><th>ไฟล์</th><th>วันที่</th><th class="num">ขนาด</th><th></th></tr></thead><tbody>
          ${r.files.map((f) => `<tr><td>${U.esc(f.name)}</td><td>${new Date(f.date).toLocaleString('th-TH')}</td><td class="num">${(f.size / 1024).toFixed(1)} KB</td>
          <td class="actions"><button class="btn btn-xs btn-outline" data-restore="${U.esc(f.id)}">${U.icon('rotate-ccw')}กู้คืน</button></td></tr>`).join('')}</tbody></table>
          ${r.sheetUrl ? `<p><a href="${U.esc(r.sheetUrl)}" target="_blank" rel="noopener">${U.icon('sheet')} เปิด Google Sheets ฐานข้อมูล</a> · <a href="${U.esc(r.folderUrl)}" target="_blank" rel="noopener">${U.icon('folder')} เปิดโฟลเดอร์ใน Drive</a></p>` : ''}`
          : 'ยังไม่มีไฟล์สำรอง';
        U.refreshIcons();
        el.querySelectorAll('[data-restore]').forEach((b) => b.onclick = async () => {
          if (!(await U.confirm('กู้คืนข้อมูลจากไฟล์สำรองนี้? ข้อมูลปัจจุบันจะถูกแทนที่', { danger: true, okText: 'กู้คืน' }))) return;
          try { const x = await Sync.call('restore', { id: b.dataset.restore }); x.data.settings = { ...x.data.settings, gasUrl: st.gasUrl, gasToken: st.gasToken }; Store.replace(x.data); Store.save(); U.toast('กู้คืนข้อมูลแล้ว'); App.render(); } catch (e) { U.toast(e.message, 'error'); }
        });
      } catch (e) { el.textContent = 'โหลดรายการไม่สำเร็จ: ' + e.message; }
    };
    loadBackups();
  } else if (tab === 'data') {
    const size = (JSON.stringify(s).length / 1024).toFixed(1);
    body.innerHTML = `
      <div class="grid g3">
        <div class="card kpi"><div><div class="kpi-label">เอกสาร</div><div class="kpi-value">${s.documents.length}</div></div></div>
        <div class="card kpi"><div><div class="kpi-label">รายชื่อ / สินค้า</div><div class="kpi-value">${s.contacts.length} / ${s.products.length}</div></div></div>
        <div class="card kpi"><div><div class="kpi-label">ขนาดข้อมูล</div><div class="kpi-value">${size} KB</div></div></div>
      </div>
      <h4 class="mt-3">สำรองข้อมูลลงเครื่อง</h4><p class="muted small">ดาวน์โหลดข้อมูลทั้งหมดเป็นไฟล์ JSON เก็บไว้ หรือย้ายไปใช้เครื่องอื่น</p>
      <div class="btn-group"><button class="btn btn-outline" id="d-export">${U.icon('download')}ดาวน์โหลดไฟล์สำรอง (.json)</button>
        <label class="btn btn-outline">${U.icon('upload')}นำเข้าไฟล์สำรอง<input type="file" id="d-import" accept=".json,application/json" hidden></label></div>
      <h4 class="mt-3">ข้อมูลตัวอย่าง</h4><p class="muted small">โหลดข้อมูลตัวอย่างเพื่อทดลองใช้งาน (ข้อมูลเดิมจะถูกแทนที่)</p>
      <button class="btn btn-soft" onclick="Demo.confirmLoad()">${U.icon('sparkles')}โหลดข้อมูลตัวอย่าง</button>
      <h4 class="mt-3" style="color:var(--danger)">ล้างข้อมูลทั้งหมด</h4><p class="muted small">ลบข้อมูลทั้งหมดในเครื่องนี้ (ข้อมูลบน Google จะไม่ถูกลบ)</p>
      <button class="btn btn-danger" id="d-reset">${U.icon('trash-2')}ล้างข้อมูล</button>`;
    U.$('#d-export').onclick = () => U.downloadFile(`accflow-backup-${U.today()}.json`, JSON.stringify(s, null, 1), 'application/json');
    U.$('#d-import').onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = async () => {
        try {
          const d = JSON.parse(r.result);
          if (!d.documents || !d.accounts) throw new Error('ไฟล์ไม่ถูกต้อง');
          if (!(await U.confirm(`นำเข้าข้อมูลจากไฟล์ (${d.documents.length} เอกสาร)? ข้อมูลปัจจุบันจะถูกแทนที่`, { danger: true }))) return;
          Store.replace(d); Store.save(); U.toast('นำเข้าข้อมูลแล้ว'); App.go('#/dashboard');
        } catch (er) { U.toast('ไฟล์ไม่ถูกต้อง: ' + er.message, 'error'); }
      };
      r.readAsText(f);
    };
    U.$('#d-reset').onclick = async () => {
      if (!(await U.confirm('ล้างข้อมูลทั้งหมดในเครื่องนี้? ไม่สามารถย้อนกลับได้ (แนะนำให้ดาวน์โหลดไฟล์สำรองก่อน)', { danger: true, okText: 'ล้างข้อมูล' }))) return;
      const keep = { gasUrl: st.gasUrl, gasToken: st.gasToken };
      const d = Store.defaults(); d.settings = { ...d.settings, ...keep, autoSync: false };
      Store.replace(d); Store.save({ sync: false }); U.toast('ล้างข้อมูลแล้ว', 'info'); App.go('#/start');
    };
  }
};
