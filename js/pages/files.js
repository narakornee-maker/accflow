/* ============================================================
 * ไฟล์แนบ: เอกสารจากลูกค้า (PO / WO / สัญญา / อื่นๆ)
 *  - อัปโหลดเก็บใน Google Drive ของบริษัท (ส่วนตัว เปิดผ่านระบบเท่านั้น)
 *  - หรือวางลิงก์ไฟล์
 *  - แนบกับเอกสาร และตามไปเมื่อแปลงเอกสาร (QT → BN → RC)
 * ============================================================ */
const Files = {
  MAX: 10 * 1024 * 1024,
  KINDS: { PO: ['PO', 'ใบสั่งซื้อ (PO)', 'approved'], WO: ['WO', 'ใบสั่งงาน (WO)', 'info'], CONTRACT: ['สัญญา', 'สัญญา / ข้อตกลง', 'paid'], OTHER: ['อื่นๆ', 'เอกสารอื่นๆ', 'draft'] },

  all() { return Store.state.files || (Store.state.files = []); },
  get(id) { return this.all().find((f) => f.id === id); },
  forContact(contactId) { return this.all().filter((f) => f.contactId === contactId).sort((a, b) => (b.date || '').localeCompare(a.date || '')); },
  kindChip(k) { const [short, , cls] = this.KINDS[k] || this.KINDS.OTHER; return `<span class="chip chip-${cls}">${short}</span>`; },
  sizeText(n) { return !n ? '' : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`; },
  icon(f) { return f.isLink ? 'link' : /pdf/i.test(f.mime || f.name) ? 'file-text' : /image|\.(png|jpe?g|webp|gif)$/i.test(`${f.mime} ${f.name}`) ? 'image' : 'file'; },

  /** เอกสารที่อ้างถึงไฟล์นี้ */
  linkedDocs(id) {
    const out = [];
    Store.state.documents.forEach((d) => { if ((d.fileIds || []).includes(id)) out.push({ no: d.no || '(ร่าง)', href: `#/doc/${d.type}/${d.id}` }); });
    (Store.state.letters || []).forEach((L) => { if ((L.fileIds || []).includes(id)) out.push({ no: L.no || '(ร่าง)', href: `#/letter/${L.id}` }); });
    return out;
  },

  readBase64(file) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = () => rej(new Error('อ่านไฟล์ไม่ได้')); r.readAsDataURL(file); });
  },

  /** อัปโหลดไฟล์ 1 ไฟล์ → บันทึกรายการ */
  async upload(file, meta) {
    if (file.size > this.MAX) throw new Error(`“${file.name}” ใหญ่เกิน 10 MB`);
    if (!Sync.enabled()) throw new Error('ต้องเชื่อมต่อเซิร์ฟเวอร์และเข้าสู่ระบบก่อนอัปโหลดไฟล์');
    const ct = Store.get('contacts', meta.contactId) || {};
    let r;
    try { r = await Sync.call('uploadFile', { name: file.name, mime: file.type, data: await this.readBase64(file), folder: ct.name || 'ไม่ระบุลูกค้า' }); }
    catch (e) { throw new Error(/unknown action/.test(e.message) ? 'เซิร์ฟเวอร์ยังไม่รองรับไฟล์แนบ — ผู้ดูแลระบบต้องอัปเดต Code.gs เป็นเวอร์ชันล่าสุด แล้ว Deploy เวอร์ชันใหม่ (ระหว่างนี้ใช้ “วางลิงก์” แทนได้)' : e.message); }
    return Store.upsert('files', { ...meta, name: r.name, size: r.size, mime: r.mime || file.type, fileId: r.fileId, isLink: false });
  },

  /** เปิดไฟล์ในแท็บใหม่ (ไฟล์ใน Drive ดึงผ่านระบบ ต้องเข้าสู่ระบบ) */
  async open(id, download = false) {
    const f = this.get(id);
    if (!f) return U.toast('ไม่พบไฟล์', 'error');
    if (f.isLink) { window.open(f.url, '_blank', 'noopener'); return; }
    const w = download ? null : window.open('', '_blank');
    if (w) w.document.write('<p style="font-family:sans-serif;padding:24px;color:#555">กำลังโหลดไฟล์…</p>');
    try {
      const r = await Sync.call('getFile', { fileId: f.fileId });
      const bin = atob(r.data); const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const blob = new Blob([u8], { type: r.mime || f.mime || 'application/octet-stream' });
      if (download || !w) U.downloadFile(f.name, blob);
      else w.location.href = URL.createObjectURL(blob);
    } catch (e) { if (w) w.close(); U.toast('เปิดไฟล์ไม่สำเร็จ: ' + e.message, 'error'); }
  },

  async remove(id) {
    const f = this.get(id); if (!f) return false;
    const links = this.linkedDocs(id);
    if (links.length) { U.toast(`ไฟล์นี้แนบอยู่กับ ${links.map((x) => x.no).join(', ')} — นำออกจากเอกสารก่อน`, 'error'); return false; }
    if (!(await U.confirm(`ลบไฟล์ <b>${U.esc(f.name || f.url)}</b>?${f.isLink ? '' : ' ไฟล์จะถูกย้ายไปถังขยะใน Google Drive'}`, { danger: true, okText: 'ลบ' }))) return false;
    if (!f.isLink && f.fileId) { try { await Sync.call('deleteFile', { fileId: f.fileId }); } catch (e) { U.toast('ลบไฟล์ใน Drive ไม่สำเร็จ: ' + e.message, 'warning'); } }
    Store.remove('files', id);
    return true;
  },

  /** หน้าต่างเพิ่มไฟล์ (อัปโหลดหลายไฟล์ หรือวางลิงก์) → onDone([records]) */
  addModal({ contactId = '', kind = 'PO', refNo = '', lockContact = false, onDone } = {}) {
    const customers = Store.state.contacts;
    U.modal({
      title: `${U.icon('paperclip')} เพิ่มเอกสารจากลูกค้า`, size: 'md',
      body: `<div class="form-grid">
        <div class="field full"><label class="req">ลูกค้า / คู่ค้า</label><select name="contactId" ${lockContact && contactId ? 'disabled' : ''}><option value="">— เลือก —</option>${customers.map((c) => U.opt(c.id, c.name, contactId)).join('')}</select></div>
        <div class="field"><label>ประเภทเอกสาร</label><select name="kind">${Object.entries(this.KINDS).map(([k, v]) => U.opt(k, v[1], kind)).join('')}</select></div>
        <div class="field"><label>เลขที่เอกสาร (เช่น เลข PO / WO)</label><input name="refNo" value="${U.esc(refNo)}" placeholder="PO-1331001185"></div>
        <div class="field"><label>วันที่เอกสาร</label><input type="date" name="date" value="${U.today()}"></div>
        <div class="field"><label>หมายเหตุ</label><input name="note" placeholder="เช่น งาน BigC ราชดำริ"></div>
        <div class="full"><div class="seg" id="fm-mode"><button type="button" class="active" data-m="up">${U.icon('upload')} อัปโหลดไฟล์</button><button type="button" data-m="link">${U.icon('link')} วางลิงก์</button></div></div>
        <div class="field full" id="fm-up"><label>ไฟล์ PDF หรือรูปภาพ (ไฟล์ละไม่เกิน 10 MB — เลือกได้หลายไฟล์)</label>
          <label class="dropzone" id="fm-drop">${U.icon('upload-cloud')}<span>คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่</span><input type="file" id="fm-file" multiple accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" hidden></label>
          <div id="fm-list" class="small"></div></div>
        <div class="field full" id="fm-link" style="display:none"><label>ลิงก์ไฟล์ (Google Drive, อีเมล ฯลฯ)</label><input name="url" type="url" placeholder="https://drive.google.com/…"><span class="hint">ตรวจสอบว่าลิงก์แชร์ให้ผู้ที่ต้องเปิดดูแล้ว</span></div>
      </div>`,
      footer: `<button class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-primary" data-ok>${U.icon('save')}บันทึก</button>`,
      onOpen: (root, close) => {
        let mode = 'up', picked = [];
        const list = root.querySelector('#fm-list');
        const drawList = () => { list.innerHTML = picked.map((f) => `<div class="flex" style="padding:4px 0">${U.icon('file')}<span class="flex-1">${U.esc(f.name)}</span><span class="${f.size > this.MAX ? 'text-danger' : 'muted'}">${this.sizeText(f.size)}${f.size > this.MAX ? ' — ใหญ่เกินไป' : ''}</span></div>`).join(''); U.refreshIcons(); };
        const pick = (fl) => { picked = [...fl]; drawList(); };
        root.querySelector('#fm-file').onchange = (e) => pick(e.target.files);
        const dz = root.querySelector('#fm-drop');
        ['dragover', 'dragenter'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('over'); }));
        ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('over'); }));
        dz.addEventListener('drop', (e) => pick(e.dataTransfer.files));
        root.querySelectorAll('#fm-mode button').forEach((b) => b.onclick = () => {
          mode = b.dataset.m; root.querySelectorAll('#fm-mode button').forEach((x) => x.classList.toggle('active', x === b));
          root.querySelector('#fm-up').style.display = mode === 'up' ? '' : 'none'; root.querySelector('#fm-link').style.display = mode === 'link' ? '' : 'none';
        });
        root.querySelector('[data-ok]').onclick = async (e) => {
          const v = U.formData(root);
          const meta = { contactId: lockContact && contactId ? contactId : v.contactId, kind: v.kind, refNo: v.refNo, date: v.date || U.today(), note: v.note };
          if (!meta.contactId) return U.toast('กรุณาเลือกลูกค้า', 'error');
          const btn = e.currentTarget; const html = btn.innerHTML;
          try {
            let recs = [];
            if (mode === 'link') {
              if (!/^https?:\/\/\S+$/i.test(v.url)) return U.toast('ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://', 'error');
              recs = [Store.upsert('files', { ...meta, name: meta.refNo ? `${(this.KINDS[meta.kind] || [])[0]} ${meta.refNo}` : 'ลิงก์เอกสาร', url: v.url, isLink: true })];
            } else {
              if (!picked.length) return U.toast('กรุณาเลือกไฟล์', 'error');
              const big = picked.find((f) => f.size > this.MAX); if (big) return U.toast(`“${big.name}” ใหญ่เกิน 10 MB`, 'error');
              btn.disabled = true;
              for (let i = 0; i < picked.length; i++) {
                btn.innerHTML = `${U.icon('loader-2', 'spin-ic')} กำลังอัปโหลด ${i + 1}/${picked.length}…`; U.refreshIcons();
                recs.push(await this.upload(picked[i], meta));
              }
            }
            close(); U.toast(`บันทึก ${recs.length} ไฟล์แล้ว`);
            if (onDone) onDone(recs); else App.render();
          } catch (er) { btn.disabled = false; btn.innerHTML = html; U.refreshIcons(); U.toast(er.message, 'error'); }
        };
      },
    });
  },

  /**
   * กล่องไฟล์แนบ (ใช้ในหน้าเอกสาร / หนังสือส่งมอบงาน)
   * opts: { el, getIds(), setIds(ids), contactId(), onAttach(rec) }
   */
  widget(opts) {
    const draw = () => {
      const ids = opts.getIds().filter((id) => this.get(id));
      const cid = opts.contactId();
      const avail = cid ? this.forContact(cid).filter((f) => !ids.includes(f.id)) : [];
      opts.el.innerHTML = `<div class="attach">
        <div class="flex between"><b class="attach-h">${U.icon('paperclip')}ไฟล์แนบ / เอกสารจากลูกค้า <span class="tag">${ids.length}</span></b>
          <div class="btn-group"><button type="button" class="btn btn-xs btn-soft" data-add>${U.icon('upload')}แนบไฟล์</button>
          ${avail.length ? `<div class="dropdown" id="att-dd-${opts.key || 'x'}"><button type="button" class="btn btn-xs btn-outline" data-pick>${U.icon('folder-open')}เลือกจากไฟล์ของลูกค้า (${avail.length})</button>
            <div class="dropdown-menu" style="min-width:300px;max-height:260px;overflow:auto">${avail.map((f) => `<button type="button" data-use="${f.id}">${U.icon(this.icon(f))}<span class="flex-1">${this.KINDS[f.kind] ? this.KINDS[f.kind][0] : ''} ${U.esc(f.refNo || '')}<small class="muted" style="display:block">${U.esc(f.name || '')}</small></span></button>`).join('')}</div></div>` : ''}</div></div>
        ${ids.length ? `<div class="attach-list">${ids.map((id) => { const f = this.get(id); return `<div class="attach-item">${U.icon(this.icon(f))}
          <div class="flex-1" style="min-width:0">${this.kindChip(f.kind)} <b>${U.esc(f.refNo || '')}</b><div class="muted small" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${U.esc(f.name || f.url || '')}${f.size ? ` · ${this.sizeText(f.size)}` : ''}</div></div>
          <button type="button" class="btn btn-xs btn-outline" data-open="${id}">${U.icon('external-link')}เปิด</button>
          ${f.isLink ? '' : `<button type="button" class="icon-btn" title="ดาวน์โหลด" data-dl="${id}">${U.icon('download')}</button>`}
          <button type="button" class="icon-btn danger" title="นำออกจากเอกสารนี้" data-rm="${id}">${U.icon('x')}</button></div>`; }).join('')}</div>`
          : `<div class="muted small" style="padding:6px 0">ยังไม่มีไฟล์แนบ — แนบ PO / WO จากลูกค้าไว้อ้างอิงและใช้ตอนวางบิล</div>`}
      </div>`;
      U.refreshIcons();
      const q = (s) => opts.el.querySelector(s), qa = (s) => opts.el.querySelectorAll(s);
      const attach = (rec) => { const cur = opts.getIds(); if (!cur.includes(rec.id)) opts.setIds([...cur, rec.id]); if (opts.onAttach) opts.onAttach(rec); };
      q('[data-add]').onclick = () => {
        if (!opts.contactId()) return U.toast('กรุณาเลือกลูกค้าในเอกสารก่อนแนบไฟล์', 'error');
        this.addModal({ contactId: opts.contactId(), lockContact: true, refNo: opts.refNo ? opts.refNo() : '', onDone: (recs) => { recs.forEach(attach); draw(); } });
      };
      const pk = q('[data-pick]'); if (pk) pk.onclick = (e) => { e.stopPropagation(); pk.parentElement.classList.toggle('open'); };
      qa('[data-use]').forEach((b) => b.onclick = () => { attach(this.get(b.dataset.use)); draw(); });
      qa('[data-open]').forEach((b) => b.onclick = () => this.open(b.dataset.open));
      qa('[data-dl]').forEach((b) => b.onclick = () => this.open(b.dataset.dl, true));
      qa('[data-rm]').forEach((b) => b.onclick = () => { opts.setIds(opts.getIds().filter((x) => x !== b.dataset.rm)); draw(); });
    };
    draw();
    return { redraw: draw };
  },
};

/* ------------------------------------------------------------ */
Pages.files = (view, query = {}) => {
  App.setTitle('เอกสารจากลูกค้า (PO / WO)');
  const q = (query.q || '').toLowerCase(), kind = query.kind || '';
  const cname = (id) => (Store.get('contacts', id) || {}).name || '-';
  const all = Files.all();
  const list = all.filter((f) => (!kind || f.kind === kind) && (!q || `${f.refNo} ${f.name} ${f.note} ${cname(f.contactId)}`.toLowerCase().includes(q)))
    .sort((a, b) => ((b.date || '') + (b.createdAt || '')).localeCompare((a.date || '') + (a.createdAt || '')));
  const link = (patch) => { const p = { ...query, ...patch }; Object.keys(p).forEach((k) => !p[k] && delete p[k]); const s = new URLSearchParams(p).toString(); return `#/files${s ? '?' + s : ''}`; };
  view.innerHTML = `
  <div class="page-head"><div><h2>เอกสารจากลูกค้า</h2><p>เก็บใบสั่งซื้อ (PO) ใบสั่งงาน (WO) สัญญา และเอกสารอื่นจากลูกค้า ไว้อ้างอิงและแนบตอนวางบิล — ไฟล์เก็บใน Google Drive ของบริษัท</p></div>
    <button class="btn btn-primary" id="f-add">${U.icon('upload')}เพิ่มเอกสาร</button></div>
  <div class="card">
    <div class="toolbar"><div class="seg">${[['', 'ทั้งหมด'], ...Object.entries(Files.KINDS).map(([k, v]) => [k, v[0]])].map(([k, l]) => `<button class="${kind === k ? 'active' : ''}" onclick="location.hash='${link({ kind: k })}'">${l} (${k ? all.filter((f) => f.kind === k).length : all.length})</button>`).join('')}</div>
      <div class="search">${U.icon('search')}<input id="f-q" placeholder="ค้นหาเลขที่ PO/WO ชื่อลูกค้า ชื่อไฟล์…" value="${U.esc(query.q || '')}"></div></div>
    <div class="table-wrap">${list.length ? `<table class="tbl"><thead><tr><th>วันที่</th><th>ประเภท</th><th>เลขที่</th><th>ลูกค้า</th><th>ไฟล์</th><th>แนบกับเอกสาร</th><th></th></tr></thead><tbody>
      ${list.map((f) => { const ld = Files.linkedDocs(f.id); return `<tr><td class="nowrap">${U.thDate(f.date)}</td><td>${Files.kindChip(f.kind)}</td><td class="fw-6">${U.esc(f.refNo || '-')}</td><td>${U.esc(cname(f.contactId))}</td>
        <td style="max-width:280px"><div class="flex" style="min-width:0">${U.icon(Files.icon(f))}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${U.esc(f.name || f.url || '')}</span></div><div class="muted small">${f.isLink ? 'ลิงก์' : Files.sizeText(f.size)}${f.note ? ` · ${U.esc(f.note)}` : ''}${f.createdBy ? ` · โดย ${U.esc(f.createdBy)}` : ''}</div></td>
        <td class="small">${ld.length ? ld.map((x) => `<a href="${x.href}">${U.esc(x.no)}</a>`).join(', ') : '<span class="muted">ยังไม่ได้แนบ</span>'}</td>
        <td class="actions"><button class="btn btn-xs btn-outline" onclick="Files.open('${f.id}')">${U.icon('external-link')}เปิด</button>
          ${f.isLink ? '' : `<button class="icon-btn" title="ดาวน์โหลด" onclick="Files.open('${f.id}', true)">${U.icon('download')}</button>`}
          <a class="icon-btn" title="สร้างใบวางบิลพร้อมแนบไฟล์นี้" href="#/doc/BN/new?contact=${f.contactId}&file=${f.id}">${U.icon('file-plus')}</a>
          <button class="icon-btn danger" title="ลบ" onclick="Files.remove('${f.id}').then((ok) => ok && App.render())">${U.icon('trash-2')}</button></td></tr>`; }).join('')}
      </tbody></table>` : `<div class="empty">${U.icon('paperclip')}<h4>${all.length ? 'ไม่พบเอกสาร' : 'ยังไม่มีเอกสารจากลูกค้า'}</h4><p>อัปโหลด PO / WO ที่ได้รับจากลูกค้า แล้วแนบกับใบเสนอราคา ใบวางบิล หรือหนังสือส่งมอบงานได้</p></div>`}</div>
  </div>`;
  U.$('#f-add').onclick = () => Files.addModal({});
  const qi = U.$('#f-q');
  qi.addEventListener('input', U.debounce(() => { Pages.files(view, { ...query, q: qi.value }); U.refreshIcons(); const n = U.$('#f-q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250));
};
