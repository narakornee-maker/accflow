/* ============================================================
 * Contacts: ลูกค้า / ผู้ขาย
 * ============================================================ */
Pages.contacts = (view, tab = 'customer', query = {}) => {
  if (!['customer', 'supplier'].includes(tab)) tab = 'customer';
  App.setTitle('จัดการรายชื่อ');
  const q = (query.q || '').toLowerCase();
  const list = Store.state.contacts.filter((c) => (tab === 'customer' ? c.type !== 'supplier' : c.type !== 'customer'))
    .filter((c) => !q || `${c.code} ${c.name} ${c.taxId} ${c.phone} ${c.email}`.toLowerCase().includes(q))
    .sort((a, b) => (a.code || '').localeCompare(b.code || ''));
  const bal = (c) => {
    const types = tab === 'customer' ? ['BN'] : ['GR', 'EX'];
    return U.sum(Store.state.documents.filter((d) => types.includes(d.type) && d.contactId === c.id), (d) => ACC.outstanding(d));
  };
  const nCus = Store.state.contacts.filter((c) => c.type !== 'supplier').length;
  const nSup = Store.state.contacts.filter((c) => c.type !== 'customer').length;

  view.innerHTML = `
  <div class="page-head"><div><h2>จัดการรายชื่อ</h2><p>รายชื่อลูกค้า ผู้ขาย (ซัพพลายเออร์) สำหรับออกเอกสาร — พนักงานจัดการที่เมนู <a href="#/payroll">จ่ายเงินเดือน</a></p></div>
    <button class="btn btn-primary" onclick="Pages.contactForm(null, '${tab}')">${U.icon('user-plus')}เพิ่ม${tab === 'customer' ? 'ลูกค้า' : 'ผู้ขาย'}</button></div>
  <div class="card">
    <div class="tabs"><a href="#/contacts/customer" class="${tab === 'customer' ? 'active' : ''}">${U.icon('users')}ลูกค้า <span class="tag">${nCus}</span></a>
      <a href="#/contacts/supplier" class="${tab === 'supplier' ? 'active' : ''}">${U.icon('truck')}ผู้ขาย / ซัพพลายเออร์ <span class="tag">${nSup}</span></a></div>
    <div class="toolbar"><div class="search">${U.icon('search')}<input id="c-q" placeholder="ค้นหาชื่อ รหัส เลขผู้เสียภาษี เบอร์โทร…" value="${U.esc(query.q || '')}"></div><div class="flex-1"></div>
      <button class="btn btn-outline btn-sm" id="c-export">${U.icon('download')}ส่งออก CSV</button></div>
    <div class="table-wrap">${list.length ? `<table class="tbl"><thead><tr><th>รหัส</th><th>ชื่อ</th><th>เลขผู้เสียภาษี / สาขา</th><th>ติดต่อ</th><th class="num">เครดิต (วัน)</th>
      <th class="num">${tab === 'customer' ? 'ลูกหนี้คงค้าง' : 'เจ้าหนี้คงค้าง'}</th><th></th></tr></thead><tbody>
      ${list.map((c) => `<tr><td class="fw-6">${U.esc(c.code)}</td><td><b>${U.esc(c.name)}</b>${c.contactPerson ? `<div class="muted small">ผู้ติดต่อ: ${U.esc(c.contactPerson)}${c.contactPhone ? ' · ' + U.esc(c.contactPhone) : ''}</div>` : ''}</td>
        <td>${U.esc(c.taxId || '-')}<div class="muted small">${U.esc(c.branch || '')} · ${c.entityType === 'individual' ? 'บุคคลธรรมดา' : 'นิติบุคคล'}</div></td>
        <td class="small">${U.esc(c.phone || '')}<br>${U.esc(c.email || '')}</td><td class="num">${c.creditDays ?? '-'}</td><td class="num fw-6">${U.money(bal(c))}</td>
        <td class="actions"><a class="btn btn-xs btn-soft" href="#/doc/${tab === 'customer' ? 'QT' : 'PO'}/new?contact=${c.id}">${U.icon('file-plus')}สร้างเอกสาร</a>
          <button class="icon-btn" onclick="Pages.contactForm('${c.id}')">${U.icon('pencil')}</button>
          <button class="icon-btn danger" onclick="Pages.contactDelete('${c.id}')">${U.icon('trash-2')}</button></td></tr>`).join('')}
      </tbody></table>` : `<div class="empty">${U.icon('contact')}<h4>ยังไม่มีรายชื่อ</h4><p>เพิ่มรายชื่อเพื่อใช้ออกเอกสาร</p></div>`}</div>
  </div>`;
  const qi = U.$('#c-q');
  qi.addEventListener('input', U.debounce(() => { Pages.contacts(view, tab, { q: qi.value }); U.refreshIcons(); const n = U.$('#c-q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250));
  U.$('#c-export').onclick = () => U.downloadCSV(`contacts-${tab}.csv`, [['รหัส', 'ชื่อ', 'ประเภท', 'เลขผู้เสียภาษี', 'สาขา', 'ที่อยู่', 'โทร', 'อีเมล', 'เครดิต'], ...list.map((c) => [c.code, c.name, c.entityType, c.taxId, c.branch, c.address, c.phone, c.email, c.creditDays])]);
};

Pages.contactForm = (id, type = 'customer', onSaved) => {
  const c = id ? { ...Store.get('contacts', id) } : { type, entityType: 'company', branch: 'สำนักงานใหญ่', creditDays: Store.state.company.defaultCreditDays, code: Store.nextCode('contacts', type === 'supplier' ? 'S' : 'C') };
  U.modal({
    title: id ? 'แก้ไขรายชื่อ' : `เพิ่ม${type === 'supplier' ? 'ผู้ขาย' : 'ลูกค้า'}`, size: 'lg',
    body: `<div class="form-grid">
      <div class="field"><label>ประเภทรายชื่อ</label><select name="type">${[['customer', 'ลูกค้า'], ['supplier', 'ผู้ขาย'], ['both', 'ทั้งลูกค้าและผู้ขาย']].map(([v, l]) => U.opt(v, l, c.type)).join('')}</select></div>
      <div class="field"><label>รหัส</label><input name="code" value="${U.esc(c.code || '')}"></div>
      <div class="field full"><label class="req">ชื่อ / ชื่อบริษัท</label><input name="name" value="${U.esc(c.name || '')}" placeholder="เช่น บริษัท ตัวอย่าง จำกัด"></div>
      <div class="field"><label>ประเภทผู้เสียภาษี</label><select name="entityType">${[['company', 'นิติบุคคล (ภ.ง.ด.53)'], ['individual', 'บุคคลธรรมดา (ภ.ง.ด.3)']].map(([v, l]) => U.opt(v, l, c.entityType)).join('')}</select></div>
      <div class="field"><label>เลขประจำตัวผู้เสียภาษี (13 หลัก)</label><input name="taxId" maxlength="13" value="${U.esc(c.taxId || '')}" inputmode="numeric"></div>
      <div class="field"><label>สาขา</label><input name="branch" value="${U.esc(c.branch || '')}" placeholder="สำนักงานใหญ่ / 00001"></div>
      <div class="field"><label>ชื่อผู้ติดต่อ</label><input name="contactPerson" value="${U.esc(c.contactPerson || '')}"></div>
      <div class="field"><label>เบอร์โทรผู้ติดต่อ</label><input type="tel" name="contactPhone" value="${U.esc(c.contactPhone || '')}"></div>
      <div class="field full"><label>ที่อยู่</label><textarea name="address" rows="2">${U.esc(c.address || '')}</textarea></div>
      <div class="field"><label>โทรศัพท์</label><input name="phone" value="${U.esc(c.phone || '')}"></div>
      <div class="field"><label>อีเมล</label><input type="email" name="email" value="${U.esc(c.email || '')}"></div>
      <div class="field"><label>เครดิต (วัน)</label><input type="number" name="creditDays" min="0" value="${c.creditDays ?? 30}"></div>
      <div class="field"><label>หัก ณ ที่จ่ายเริ่มต้น (%)</label><select name="defaultWht">${[['', 'ไม่กำหนด'], [1, '1% ค่าขนส่ง'], [2, '2% ค่าโฆษณา'], [3, '3% ค่าบริการ/จ้างทำของ'], [5, '5% ค่าเช่า']].map(([v, l]) => U.opt(v, l, c.defaultWht ?? '')).join('')}</select></div>
      <div class="field full"><label>บัญชีธนาคาร / หมายเหตุ</label><input name="note" value="${U.esc(c.note || '')}"></div>
    </div>`,
    footer: `<button class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-primary" data-ok>${U.icon('save')}บันทึก</button>`,
    onOpen: (root, close) => {
      root.querySelector('[data-ok]').onclick = () => {
        const f = U.formData(root);
        if (!f.name) return U.toast('กรุณากรอกชื่อ', 'error');
        if (f.taxId && !/^\d{13}$/.test(f.taxId)) return U.toast('เลขผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก', 'error');
        if (Store.state.contacts.some((x) => x.code === f.code && x.id !== c.id)) return U.toast('รหัสซ้ำ', 'error');
        const saved = Store.upsert('contacts', { ...c, ...f, defaultWht: f.defaultWht === '' ? '' : +f.defaultWht });
        close(); U.toast('บันทึกรายชื่อแล้ว');
        if (onSaved) onSaved(saved); else App.render();
      };
    },
  });
};

Pages.contactDelete = async (id) => {
  if (Store.state.documents.some((d) => d.contactId === id)) return U.toast('รายชื่อนี้มีเอกสารอ้างอิง ลบไม่ได้', 'error');
  if (!(await U.confirm('ลบรายชื่อนี้?', { danger: true, okText: 'ลบ' }))) return;
  Store.remove('contacts', id); App.render();
};
