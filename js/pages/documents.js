/* ============================================================
 * Documents: ใบเสนอราคา / ใบวางบิล / ใบเสร็จ / ใบสั่งซื้อ / ใบรับสินค้า / ค่าใช้จ่าย
 * ============================================================ */
const Docs = {
  STATUS: { draft: ['ร่าง', 'draft'], pending: ['รออนุมัติ', 'pending'], approved: ['อนุมัติ', 'approved'], void: ['ยกเลิก', 'void'] },

  /** สถานะที่แสดงผล (รวมสถานะการชำระ) */
  status(d) {
    const today = U.today();
    if (d.status !== 'approved') { const [l, c] = this.STATUS[d.status] || this.STATUS.draft; return { label: l, cls: c }; }
    if (d.type === 'QT') return ACC.childrenOf(d.id).length ? { label: 'วางบิลแล้ว', cls: 'done' } : { label: 'อนุมัติ', cls: 'approved' };
    if (d.type === 'PO') return ACC.childrenOf(d.id).length ? { label: 'รับสินค้าแล้ว', cls: 'done' } : { label: 'อนุมัติ', cls: 'approved' };
    if (d.type === 'RC') return { label: 'รับชำระแล้ว', cls: 'paid' };
    if (ACC.isPaid(d)) return { label: d.type === 'BN' ? 'ชำระแล้ว' : 'จ่ายแล้ว', cls: 'paid' };
    if (d.dueDate && d.dueDate < today) return { label: 'เกินกำหนด', cls: 'overdue' };
    return { label: d.type === 'BN' ? 'รอชำระ' : 'รอจ่ายชำระ', cls: 'pending' };
  },
  statusChip(d) { const s = this.status(d); return `<span class="chip chip-${s.cls}">${s.label}</span>`; },

  blankItem() { return { productId: '', description: '', qty: 1, unit: '', price: 0, discount: 0, account: '' }; },

  blank(type) {
    const c = Store.state.company;
    const d = U.today();
    return {
      id: null, type, no: '', date: d, dueDate: U.addDays(d, type === 'QT' ? 30 : type === 'RC' ? 0 : +c.defaultCreditDays || 30),
      contactId: '', items: [this.blankItem()], discount: 0, vatMode: c.vatRegistered ? 'exclusive' : 'none', whtRate: 0,
      note: '', reference: '', refId: '', status: 'draft',
      payAccount: '1120', payMethod: 'transfer',
      payment: { paid: type === 'EX', date: d, account: '1120' },
      taxInvoiceNo: '', taxInvoiceDate: '',
    };
  },

  /** แปลงเอกสาร: QT→BN, BN→RC, PO→GR */
  fillFrom(doc, srcId) {
    const src = Store.get('documents', srcId);
    if (!src) return;
    const ct = Store.get('contacts', src.contactId) || {};
    Object.assign(doc, {
      contactId: src.contactId, items: JSON.parse(JSON.stringify(src.items || [])), discount: src.discount, vatMode: src.vatMode,
      whtRate: src.whtRate || 0, note: src.note, reference: src.no, refId: src.id,
    });
    if (doc.type === 'BN' || doc.type === 'GR') doc.dueDate = U.addDays(doc.date, ct.creditDays ?? Store.state.company.defaultCreditDays);
  },

  childType(type) { return DOC_TYPES[type].next; },

  canUnapprove(d) {
    const kids = ACC.childrenOf(d.id).filter((k) => k.status === 'approved' || k.status === 'draft' || k.status === 'pending');
    if (kids.length) return `มีเอกสารอ้างอิงต่อแล้ว (${kids.map((k) => k.no).join(', ')}) กรุณายกเลิกเอกสารนั้นก่อน`;
    if ((d.type === 'GR' || d.type === 'EX') && d.payment && d.payment.paid) return 'เอกสารนี้บันทึกจ่ายชำระแล้ว กรุณายกเลิกการชำระก่อน';
    return '';
  },

  validate(d) {
    if (!d.contactId) return `กรุณาเลือก${DOC_TYPES[d.type].party === 'customer' ? 'ลูกค้า' : 'ผู้ขาย'}`;
    if (!d.date) return 'กรุณาระบุวันที่';
    const items = (d.items || []).filter((i) => (i.description || i.productId) && +i.qty);
    if (!items.length) return 'กรุณาเพิ่มรายการสินค้า/บริการอย่างน้อย 1 รายการ';
    if (items.some((i) => +i.qty < 0 || +i.price < 0)) return 'จำนวนและราคาต้องไม่ติดลบ';
    if (ACC.calcDoc(d).total < 0) return 'ยอดรวมต้องไม่ติดลบ';
    return '';
  },

  /** เตือนเมื่อขายสินค้าเกินจำนวนคงเหลือ (ไม่บล็อก) */
  stockWarning(d) {
    if (!(d.type === 'BN' || (d.type === 'RC' && !d.refId))) return;
    const prev = Store.get('documents', d.id);
    if (prev && prev.status === 'approved') return;
    const need = {};
    (d.items || []).forEach((l) => { if (ACC.isStockLine(l)) need[l.productId] = (need[l.productId] || 0) + (+l.qty || 0); });
    const bal = ACC.inventory().bal;
    const short = Object.keys(need).filter((pid) => need[pid] > ((bal[pid] || {}).qty || 0)).map((pid) => Store.get('products', pid).name);
    if (short.length) U.toast(`สินค้าคงเหลือไม่พอ: ${short.join(', ')} — สต็อกจะติดลบ`, 'warning');
  },

  async setApproved(id, on) {
    const d = Store.get('documents', id);
    if (!d) return;
    if (on) {
      const err = this.validate(d);
      if (err) { U.toast(err, 'error'); App.render(); return; }
      this.stockWarning(d);
      d.status = 'approved';
    } else {
      const err = this.canUnapprove(d);
      if (err) { U.toast(err, 'error'); App.render(); return; }
      d.status = 'draft';
    }
    Store.upsert('documents', d);
    U.toast(on ? `อนุมัติ ${d.no} แล้ว — ลงบัญชีอัตโนมัติ` : `ยกเลิกอนุมัติ ${d.no}`, on ? 'success' : 'info');
    App.render();
  },

  async voidDoc(id) {
    const d = Store.get('documents', id);
    const err = this.canUnapprove(d);
    if (err) return U.toast(err, 'error');
    if (!(await U.confirm(`ยกเลิกเอกสาร <b>${U.esc(d.no)}</b>? เอกสารจะถูกเก็บไว้แต่ไม่ถูกนำไปลงบัญชี`, { danger: true, okText: 'ยกเลิกเอกสาร' }))) return;
    d.status = 'void'; Store.upsert('documents', d); U.toast('ยกเลิกเอกสารแล้ว', 'info'); App.render();
  },

  async deleteDoc(id) {
    const d = Store.get('documents', id);
    if (d.status === 'approved') return U.toast('เอกสารที่อนุมัติแล้วลบไม่ได้ ให้ใช้ “ยกเลิกเอกสาร”', 'error');
    if (ACC.childrenOf(d.id).length) return U.toast('มีเอกสารอ้างอิงต่อแล้ว ลบไม่ได้', 'error');
    if (!(await U.confirm(`ลบเอกสาร <b>${U.esc(d.no || 'ร่าง')}</b> ถาวร?`, { danger: true, okText: 'ลบ' }))) return;
    Store.remove('documents', id); U.toast('ลบแล้ว', 'info'); App.go(`#/list/${d.type}`);
  },

  payModal(id) {
    const d = Store.get('documents', id);
    const c = ACC.calcDoc(d);
    U.modal({
      title: `บันทึกจ่ายชำระ ${U.esc(d.no)}`, size: 'sm',
      body: `<div class="grid" style="gap:14px">
        <div class="alert alert-info">${U.icon('info')}<div>ยอดรวม ${U.money(c.total)}${c.wht ? ` − หัก ณ ที่จ่าย ${U.money(c.wht)}` : ''} = <b>จ่ายสุทธิ ${U.money(c.net)}</b></div></div>
        <div class="field"><label>วันที่จ่าย</label><input type="date" name="date" value="${U.today()}"></div>
        <div class="field"><label>จ่ายจากบัญชี</label><select name="account">${Store.payAccounts().map((a) => U.opt(a.code, `${a.code} ${a.name}`, '1120')).join('')}</select></div>
      </div>`,
      footer: `<button class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-success" data-ok>${U.icon('check')} บันทึกจ่ายชำระ</button>`,
      onOpen: (root, close) => {
        root.querySelector('[data-ok]').onclick = () => {
          const f = U.formData(root);
          d.payment = { paid: true, date: f.date, account: f.account };
          Store.upsert('documents', d); close(); U.toast('บันทึกจ่ายชำระแล้ว'); App.render();
        };
      },
    });
  },

  async unpay(id) {
    const d = Store.get('documents', id);
    if (!(await U.confirm('ยกเลิกรายการจ่ายชำระของเอกสารนี้?'))) return;
    d.payment = { ...d.payment, paid: false }; Store.upsert('documents', d); App.render();
  },

  duplicate(id) {
    const d = Store.get('documents', id);
    const n = JSON.parse(JSON.stringify(d));
    Object.assign(n, { id: null, no: '', status: 'draft', date: U.today(), refId: '', reference: '' });
    n.dueDate = U.addDays(n.date, U.daysBetween(d.date, d.dueDate || d.date));
    if (n.payment) n.payment = { ...n.payment, paid: d.type === 'EX', date: U.today() };
    sessionStorage.setItem('accflow_dup', JSON.stringify(n));
    App.go(`#/doc/${d.type}/new?dup=1`);
  },

  itemsSummary(d) {
    const its = (d.items || []).filter((i) => i.description);
    if (!its.length) return '-';
    return U.esc(its[0].description) + (its.length > 1 ? ` <span class="muted small">+${its.length - 1} รายการ</span>` : '');
  },
};

/* ------------------------------------------------------------ */
/* List page                                                     */
/* ------------------------------------------------------------ */
Pages.docList = (view, type, query) => {
  const T = DOC_TYPES[type];
  if (!T) return Pages.dashboard(view);
  App.setTitle(T.label);
  const today = U.today();
  const all = Store.state.documents.filter((d) => d.type === type);
  const contact = (id) => Store.get('contacts', id) || {};

  // ---- strip buckets
  let actionSet, bucketOf, boxTitles;
  if (type === 'RC') {
    actionSet = all.filter((d) => d.status === 'approved');
    bucketOf = (d) => { const a = U.daysBetween(d.date, today); return a <= 7 ? 0 : a <= 30 ? 1 : 2; };
    boxTitles = ['รับเงินภายใน 7 วัน', 'ภายใน 8–30 วัน', 'มากกว่า 30 วัน'];
  } else {
    if (type === 'QT' || type === 'PO') actionSet = all.filter((d) => d.status === 'approved' && !ACC.childrenOf(d.id).length);
    else actionSet = all.filter((d) => d.status === 'approved' && !ACC.isPaid(d));
    bucketOf = (d) => { const left = U.daysBetween(today, d.dueDate || d.date); return left <= 0 ? 0 : left <= 7 ? 1 : 2; };
    const urgent = { QT: 'ออกใบวางบิลด่วน', BN: 'ออกใบเสร็จด่วน', PO: 'รับสินค้าด่วน', GR: 'จ่ายชำระด่วน', EX: 'จ่ายชำระด่วน' }[type];
    boxTitles = [urgent, 'ภายใน 7 วัน', 'มากกว่า 7 วัน'];
  }
  const boxes = [0, 1, 2].map((b) => { const ds = actionSet.filter((d) => bucketOf(d) === b); return { n: ds.length, v: U.sum(ds, (d) => ACC.calcDoc(d).total) }; });
  const unapproved = all.filter((d) => d.status === 'draft' || d.status === 'pending').length;

  // ---- filtering
  const f = query.f || 'all';
  const q = (query.q || '').toLowerCase();
  const range = query.range || 'all';
  let rows = all.filter((d) => {
    if (f === 'pending' && !(d.status === 'draft' || d.status === 'pending')) return false;
    if (f === 'approved' && d.status !== 'approved') return false;
    if (f === 'void' && d.status !== 'void') return false;
    if (f === 'wait' && !(d.status === 'approved' && !ACC.childrenOf(d.id).length)) return false;
    if (f === 'unpaid' && !(d.status === 'approved' && !ACC.isPaid(d))) return false;
    if (f === 'paid' && !(d.status === 'approved' && ACC.isPaid(d))) return false;
    if (f === 'overdue' && !(d.status === 'approved' && !ACC.isPaid(d) && d.dueDate && d.dueDate < today)) return false;
    if (/^b\d$/.test(f) && !(actionSet.includes(d) && bucketOf(d) === +f[1])) return false;
    if (range === 'month' && d.date.slice(0, 7) !== today.slice(0, 7)) return false;
    if (range === 'year' && d.date.slice(0, 4) !== today.slice(0, 4)) return false;
    if (q) {
      const hay = `${d.no} ${contact(d.contactId).name || ''} ${(d.items || []).map((i) => i.description).join(' ')} ${d.reference || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const sort = query.sort || 'date';
  rows.sort((a, b) => (sort === 'no' ? b.no.localeCompare(a.no) : (b.date + b.no).localeCompare(a.date + a.no)));
  const size = +query.size || 20, page = +query.page || 1;
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const shown = rows.slice((page - 1) * size, page * size);
  const total = U.sum(rows.filter((d) => d.status !== 'void'), (d) => ACC.calcDoc(d).total);

  const linkQ = (patch) => { const p = { ...query, ...patch }; Object.keys(p).forEach((k) => (p[k] === '' || p[k] == null) && delete p[k]); const s = new URLSearchParams(p).toString(); return `#/list/${type}${s ? '?' + s : ''}`; };

  const refCol = { QT: 'ใบวางบิล', BN: 'ใบเสร็จรับเงิน', RC: 'อ้างอิง', PO: 'ใบรับสินค้า', GR: 'การชำระ', EX: 'การชำระ' }[type];
  const refCell = (d) => {
    if (type === 'QT' || type === 'PO' || type === 'BN') {
      const kids = ACC.childrenOf(d.id);
      if (kids.length) return kids.map((k) => `<a href="#/doc/${k.type}/${k.id}">${U.esc(k.no)}</a>`).join('<br>');
      if (d.status !== 'approved') return '<span class="muted">-</span>';
      const nt = DOC_TYPES[type].next;
      const lbl = { QT: 'รอลูกค้ายืนยัน', BN: 'รอรับชำระ', PO: 'รอรับสินค้า' }[type];
      return `<span class="muted small">${lbl}</span> <a class="btn btn-xs btn-soft" href="#/doc/${nt}/new?from=${d.id}" onclick="event.stopPropagation()">${U.icon('arrow-right')}${DOC_TYPES[nt].short}</a>`;
    }
    if (type === 'RC') { const r = d.refId && Store.get('documents', d.refId); return r ? `<a href="#/doc/${r.type}/${r.id}">${U.esc(r.no)}</a>` : '<span class="tag">ขายสด</span>'; }
    if (d.status !== 'approved') return '<span class="muted">-</span>';
    if (d.payment && d.payment.paid) return `<span class="small">${U.thDate(d.payment.date)} · ${U.esc(Store.accName(d.payment.account))}</span>`;
    return `<button class="btn btn-xs btn-soft" onclick="event.stopPropagation();Docs.payModal('${d.id}')">${U.icon('banknote')}จ่ายชำระ</button>`;
  };

  view.innerHTML = `
    <div class="strip">
      <div class="strip-first"><div class="lbl">${type === 'RC' ? 'รอแก้ไข' : 'ยังไม่อนุมัติ'}</div><div class="n">${unapproved}</div><div class="s">${T.short}</div></div>
      ${['sb-orange', 'sb-slate', 'sb-green'].map((cls, i) => `<a class="strip-box ${cls} ${f === 'b' + i ? 'active' : ''}" href="${linkQ({ f: f === 'b' + i ? '' : 'b' + i, page: '' })}" style="text-decoration:none">
        <div class="t">${boxTitles[i]}</div><div class="c">${boxes[i].n} รายการ</div><div class="v">฿${U.money(boxes[i].v)}</div></a>`).join('')}
    </div>
    <div class="card">
      <div class="toolbar">
        <select id="f-status" style="width:auto">
          ${[['all', 'ทุกสถานะ'], ['pending', 'ยังไม่อนุมัติ'], ['approved', 'อนุมัติ'],
            ...(type === 'QT' || type === 'PO' ? [['wait', type === 'QT' ? 'รอวางบิล' : 'รอรับสินค้า']] : []),
            ...(['BN', 'GR', 'EX'].includes(type) ? [['unpaid', 'รอชำระ'], ['overdue', 'เกินกำหนด'], ['paid', 'ชำระแล้ว']] : []), ['void', 'ยกเลิก']]
            .map(([v, l]) => U.opt(v, l, /^b\d$/.test(f) ? 'all' : f)).join('')}
        </select>
        <div class="search">${U.icon('search')}<input id="f-q" placeholder="ค้นหาเลขที่ ชื่อลูกค้า หรือสินค้า…" value="${U.esc(query.q || '')}"></div>
        <div class="seg">${[['all', 'ตลอดเวลา'], ['year', 'ปีนี้'], ['month', 'เดือนนี้']].map(([v, l]) => `<button class="${range === v ? 'active' : ''}" onclick="location.hash='${linkQ({ range: v === 'all' ? '' : v, page: '' })}'">${l}</button>`).join('')}</div>
        <div class="flex-1"></div>
        <button class="btn btn-outline btn-sm" id="btn-export">${U.icon('download')}ส่งออก</button>
        <a class="btn btn-primary btn-sm" href="#/doc/${type}/new">${U.icon('plus-circle')}สร้าง${T.short}</a>
      </div>
      <div class="flex between" style="padding:10px 16px;font-size:13px"><span class="muted">ผลลัพธ์ ${rows.length} รายการ</span><span>ยอดรวมทั้งหมด : <b>${U.money(total)}</b></span></div>
      <div class="table-wrap">
      ${shown.length ? `<table class="tbl"><thead><tr>
        <th style="width:60px" title="อนุมัติ / ลงบัญชี">อนุมัติ</th><th><a href="${linkQ({ sort: sort === 'no' ? '' : 'no' })}" style="color:inherit">${T.short} ${U.icon('arrow-down-up', 'muted')}</a></th><th>สถานะ</th><th>วันที่</th>
        <th>${refCol}</th><th>${T.party === 'customer' ? 'ชื่อลูกค้า' : 'ผู้ขาย'}</th><th>สินค้า / รายละเอียด</th><th class="num">ยอดเงินรวม</th><th class="num">ยอดสุทธิ</th><th></th></tr></thead>
        <tbody>${shown.map((d) => { const c = ACC.calcDoc(d); return `<tr class="clickable" onclick="if(!event.target.closest('a,button,label,input'))location.hash='#/doc/${type}/${d.id}'">
          <td><label class="switch" onclick="event.stopPropagation()"><input type="checkbox" ${d.status === 'approved' ? 'checked' : ''} ${d.status === 'void' ? 'disabled' : ''} onchange="Docs.setApproved('${d.id}', this.checked)"><span></span></label></td>
          <td class="doc-link"><a href="#/doc/${type}/${d.id}">${U.esc(d.no)}</a></td>
          <td>${Docs.statusChip(d)}</td><td class="nowrap">${U.thDate(d.date)}${d.dueDate && ['BN', 'GR', 'EX'].includes(type) ? `<div class="muted small">ครบ ${U.thDate(d.dueDate)}</div>` : ''}</td>
          <td>${refCell(d)}</td><td>${U.esc(contact(d.contactId).name || '-')}</td><td style="max-width:300px">${Docs.itemsSummary(d)}</td>
          <td class="num">${U.money(c.total)}</td><td class="num fw-6">${U.money(c.net)}</td>
          <td class="actions"><button class="icon-btn" title="พิมพ์" onclick="event.stopPropagation();Print.doc('${d.id}')">${U.icon('printer')}</button></td></tr>`; }).join('')}
        </tbody></table>` : `<div class="empty">${U.icon(T.icon)}<h4>ไม่พบ${T.short}</h4><p>${all.length ? 'ลองเปลี่ยนตัวกรองหรือคำค้นหา' : `เริ่มสร้าง${T.short}ฉบับแรกของคุณ`}</p><a class="btn btn-primary mt-1" href="#/doc/${type}/new">${U.icon('plus')}สร้าง${T.short}</a></div>`}
      </div>
      <div class="pager">
        <span>${rows.length ? `${(page - 1) * size + 1}–${Math.min(page * size, rows.length)} จาก ${rows.length}` : '0 รายการ'}</span>
        <span class="flex"><a class="icon-btn" href="${linkQ({ page: Math.max(1, page - 1) })}">${U.icon('chevron-left')}</a> หน้า ${page}/${pages} <a class="icon-btn" href="${linkQ({ page: Math.min(pages, page + 1) })}">${U.icon('chevron-right')}</a></span>
        <span class="sizes">แสดง ${[20, 50, 100].map((n) => `<button class="${size === n ? 'active' : ''}" onclick="location.hash='${linkQ({ size: n, page: '' })}'">${n}</button>`).join('')}</span>
      </div>
    </div>`;

  const qi = U.$('#f-q');
  qi.addEventListener('input', U.debounce(() => { history.replaceState(null, '', linkQ({ q: qi.value, page: '' })); Pages.docList(view, type, { ...query, q: qi.value, page: '' }); U.refreshIcons(); const n = U.$('#f-q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 300));
  U.$('#f-status').onchange = (e) => { location.hash = linkQ({ f: e.target.value === 'all' ? '' : e.target.value, page: '' }); };
  U.$('#btn-export').onclick = () => {
    U.downloadCSV(`${type}-${today}.csv`, [['เลขที่', 'วันที่', 'ครบกำหนด', 'คู่ค้า', 'เลขผู้เสียภาษี', 'สถานะ', 'ก่อน VAT', 'VAT', 'ยอดรวม', 'หัก ณ ที่จ่าย', 'สุทธิ', 'อ้างอิง'],
      ...rows.map((d) => { const c = ACC.calcDoc(d); const ct = contact(d.contactId); return [d.no, d.date, d.dueDate, ct.name, ct.taxId, Docs.status(d).label, c.base, c.vat, c.total, c.wht, c.net, d.reference]; })]);
  };
};

/* ------------------------------------------------------------ */
/* Editor                                                        */
/* ------------------------------------------------------------ */
Pages.docEdit = (view, type, id, query) => {
  const T = DOC_TYPES[type];
  if (!T) return Pages.dashboard(view);
  let doc;
  if (!id || id === 'new') {
    doc = Docs.blank(type);
    if (query.dup) { try { doc = { ...doc, ...JSON.parse(sessionStorage.getItem('accflow_dup')) }; } catch (e) { /* ignore */ } }
    if (query.from) {
      const kids = ACC.childrenOf(query.from).filter((k) => k.type === type);
      if (kids.length) { U.toast(`มี${T.short}อ้างอิงแล้ว: ${kids[0].no}`, 'info'); location.replace(`#/doc/${type}/${kids[0].id}`); return; }
      Docs.fillFrom(doc, query.from);
    }
    if (query.contact) doc.contactId = query.contact;
  } else {
    const d = Store.get('documents', id);
    if (!d) { view.innerHTML = `<div class="card"><div class="empty">${U.icon('file-x')}<h4>ไม่พบเอกสาร</h4><a href="#/list/${type}">กลับไปหน้ารายการ</a></div></div>`; return; }
    doc = JSON.parse(JSON.stringify(d));
  }
  if (!doc.items || !doc.items.length) doc.items = [Docs.blankItem()];
  const isNew = !doc.id;
  const locked = doc.status === 'approved' || doc.status === 'void';
  const dis = locked ? 'disabled' : '';
  const isPurchase = T.group === 'purchase';
  const showAcct = type === 'GR' || type === 'EX';
  const s = Store.state;
  App.setTitle(isNew ? `สร้าง${T.short}` : `${T.short} ${doc.no}`);

  const parties = s.contacts.filter((c) => (T.party === 'customer' ? c.type !== 'supplier' : c.type !== 'customer'));
  const expAccounts = s.accounts.filter((a) => a.type === 'expense' || (a.type === 'asset' && !['1110', '1120', '1130', '1160', '1170', '1219'].includes(a.code)));
  const dueLabel = { QT: 'ยืนราคาถึงวันที่', BN: 'วันครบกำหนดชำระ', RC: 'วันที่รับชำระ', PO: 'กำหนดส่งของ', GR: 'วันครบกำหนดชำระ', EX: 'วันครบกำหนดชำระ' }[type];
  const ref = doc.refId ? Store.get('documents', doc.refId) : null;
  const kids = doc.id ? ACC.childrenOf(doc.id) : [];

  // flow indicator
  const chain = T.group === 'sales' ? ['QT', 'BN', 'RC'] : type === 'EX' ? ['EX'] : ['PO', 'GR'];
  const flow = chain.length > 1 ? `<div class="flow">${chain.map((t, i) => {
    const cls = t === type ? 'cur' : (chain.indexOf(type) > i && ref) || (chain.indexOf(type) < i && kids.some((k) => k.type === t)) ? 'done' : '';
    return `${i ? '<span class="arrow">→</span>' : ''}<span class="step ${cls}">${DOC_TYPES[t].short}</span>`;
  }).join('')}</div>` : '';

  const actions = [];
  if (!locked) {
    actions.push(`<button class="btn btn-outline" data-act="draft">${U.icon('save')}บันทึกร่าง</button>`);
    if (type === 'QT' || type === 'PO') actions.push(`<button class="btn btn-outline" data-act="pending">${U.icon('send')}ส่งรออนุมัติ</button>`);
    actions.push(`<button class="btn btn-primary" data-act="approved">${U.icon('check-circle-2')}บันทึกและอนุมัติ</button>`);
  } else if (doc.status === 'approved') {
    const nt = T.next;
    if (nt && !kids.some((k) => k.type === nt)) actions.push(`<a class="btn btn-primary" href="#/doc/${nt}/new?from=${doc.id}">${U.icon('arrow-right-circle')}สร้าง${DOC_TYPES[nt].short}</a>`);
    if ((type === 'GR' || type === 'EX') && !(doc.payment && doc.payment.paid)) actions.push(`<button class="btn btn-success" onclick="Docs.payModal('${doc.id}')">${U.icon('banknote')}บันทึกจ่ายชำระ</button>`);
  }
  if (!isNew) actions.push(`<button class="btn btn-outline" onclick="Print.doc('${doc.id}')">${U.icon('printer')}พิมพ์</button>`);
  const more = [];
  if (!isNew) {
    if (doc.status === 'approved') more.push(`<button onclick="Pages._unlock('${doc.id}')">${U.icon('pencil')}แก้ไข (ยกเลิกอนุมัติ)</button>`);
    if ((type === 'GR' || type === 'EX') && doc.payment && doc.payment.paid) more.push(`<button onclick="Docs.unpay('${doc.id}')">${U.icon('undo-2')}ยกเลิกการจ่ายชำระ</button>`);
    more.push(`<button onclick="Docs.duplicate('${doc.id}')">${U.icon('copy')}ทำสำเนาเอกสาร</button>`);
    more.push(`<button onclick="Pages._showJE('${doc.id}')">${U.icon('book-open')}ดูการบันทึกบัญชี</button>`);
    if (doc.status !== 'void') more.push(`<div class="sep"></div><button onclick="Docs.voidDoc('${doc.id}')" style="color:var(--danger)">${U.icon('ban')}ยกเลิกเอกสาร</button>`);
    if (doc.status !== 'approved') more.push(`<button onclick="Docs.deleteDoc('${doc.id}')" style="color:var(--danger)">${U.icon('trash-2')}ลบเอกสาร</button>`);
  }

  view.innerHTML = `
  <div class="doc-head">
    <div class="title">
      <a class="icon-btn" href="#/list/${type}" title="กลับ">${U.icon('arrow-left')}</a>
      <div><h2>${isNew ? 'สร้าง' : ''}${T.label}</h2><div class="flex mt-0" style="margin-top:4px">${doc.no ? `<span class="fw-6">${U.esc(doc.no)}</span>` : '<span class="muted small">เลขที่เอกสารจะสร้างอัตโนมัติเมื่อบันทึก</span>'} ${isNew ? '' : Docs.statusChip(doc)}</div></div>
    </div>
    <div class="btn-group">${actions.join('')}
      ${more.length ? `<div class="dropdown" id="more-dd"><button class="btn btn-outline" onclick="App.toggleDropdown('more-dd', event)">${U.icon('more-horizontal')}</button><div class="dropdown-menu">${more.join('')}</div></div>` : ''}
    </div>
  </div>
  ${flow ? `<div class="mb-2">${flow}</div>` : ''}
  ${locked ? `<div class="lock-note">${U.icon(doc.status === 'void' ? 'ban' : 'lock')}<div>${doc.status === 'void' ? 'เอกสารนี้ถูกยกเลิกแล้ว ไม่ถูกนำไปลงบัญชี' : 'เอกสารอนุมัติและลงบัญชีแล้ว — หากต้องการแก้ไข เลือก “แก้ไข (ยกเลิกอนุมัติ)” จากเมนู ⋯'}</div></div>` : ''}

  <div class="doc-paper" id="doc-form">
    <div class="section doc-grid">
      <div>
        <div class="field">
          <label class="req">${T.party === 'customer' ? 'ลูกค้า' : 'ผู้ขาย / ผู้รับเงิน'}</label>
          <div class="flex">
            <select data-f="contactId" ${dis} class="flex-1"><option value="">— เลือก${T.party === 'customer' ? 'ลูกค้า' : 'ผู้ขาย'} —</option>${parties.map((c) => U.opt(c.id, `${c.code ? c.code + ' · ' : ''}${c.name}`, doc.contactId)).join('')}</select>
            ${locked ? '' : `<button class="btn btn-outline" id="btn-new-contact" title="เพิ่มรายชื่อใหม่">${U.icon('user-plus')}</button>`}
          </div>
        </div>
        <div class="party-box" id="party-box"></div>
        ${ref ? `<div class="mt-1 small muted">อ้างอิงจาก <a href="#/doc/${ref.type}/${ref.id}">${DOC_TYPES[ref.type].short} ${U.esc(ref.no)}</a></div>` : ''}
      </div>
      <div class="form-grid">
        <div class="field"><label>เลขที่เอกสาร</label><input value="${U.esc(doc.no || Store.nextNo(type, doc.date, true))}" readonly></div>
        <div class="field"><label class="req">วันที่</label><input type="date" data-f="date" value="${doc.date}" ${dis}></div>
        ${type !== 'RC' ? `<div class="field"><label>${dueLabel}</label><input type="date" data-f="dueDate" value="${doc.dueDate || ''}" ${dis}></div>` : ''}
        <div class="field"><label>เลขที่อ้างอิง</label><input data-f="reference" value="${U.esc(doc.reference || '')}" placeholder="เช่น PO ลูกค้า / เลขสัญญา" ${dis}></div>
        ${isPurchase && type !== 'PO' ? `<div class="field"><label>เลขที่ใบกำกับภาษี (ผู้ขาย)</label><input data-f="taxInvoiceNo" value="${U.esc(doc.taxInvoiceNo || '')}" ${dis}></div>
          <div class="field"><label>วันที่ใบกำกับภาษี</label><input type="date" data-f="taxInvoiceDate" value="${doc.taxInvoiceDate || ''}" ${dis}></div>` : ''}
        ${type === 'RC' ? `<div class="field"><label>วิธีรับชำระ</label><select data-f="payMethod" ${dis}>${[['cash', 'เงินสด'], ['transfer', 'โอนเงิน'], ['cheque', 'เช็ค'], ['card', 'บัตรเครดิต']].map(([v, l]) => U.opt(v, l, doc.payMethod)).join('')}</select></div>
          <div class="field"><label>รับเงินเข้าบัญชี</label><select data-f="payAccount" ${dis}>${Store.payAccounts().map((a) => U.opt(a.code, `${a.code} ${a.name}`, doc.payAccount)).join('')}</select></div>` : ''}
      </div>
    </div>

    <div class="section">
      <div class="flex between mb-2" style="margin-bottom:8px"><h3 style="font-size:15px">รายการ</h3>
        <select data-f="vatMode" ${dis} style="width:auto" class="input-sm">${[['exclusive', 'ราคาไม่รวม VAT (แยก VAT)'], ['inclusive', 'ราคารวม VAT แล้ว'], ['none', 'ไม่มี VAT']].map(([v, l]) => U.opt(v, l, doc.vatMode)).join('')}</select>
      </div>
      <div class="table-wrap"><table class="items-tbl" id="items"></table></div>
      ${locked ? '' : `<button class="btn btn-soft btn-sm mt-1" id="btn-add-item">${U.icon('plus')}เพิ่มรายการ</button>`}
    </div>

    <div class="section doc-grid">
      <div>
        <div class="field"><label>หมายเหตุ</label><textarea data-f="note" rows="3" ${dis} placeholder="เงื่อนไขการชำระเงิน / หมายเหตุสำหรับลูกค้า">${U.esc(doc.note || '')}</textarea></div>
        ${showAcct ? `<div class="card mt-2" style="box-shadow:none"><div class="card-body">
          <label class="check"><input type="checkbox" data-f="payment.paid" ${doc.payment && doc.payment.paid ? 'checked' : ''} ${dis}> <b>ชำระเงินแล้ว</b></label>
          <div class="form-grid mt-1" id="pay-fields">
            <div class="field"><label>วันที่จ่าย</label><input type="date" data-f="payment.date" value="${(doc.payment && doc.payment.date) || doc.date}" ${dis}></div>
            <div class="field"><label>จ่ายจากบัญชี</label><select data-f="payment.account" ${dis}>${Store.payAccounts().map((a) => U.opt(a.code, `${a.code} ${a.name}`, doc.payment && doc.payment.account)).join('')}</select></div>
          </div></div></div>` : ''}
        ${!isNew ? `<div class="mt-2 small muted">สร้างเมื่อ ${new Date(doc.createdAt).toLocaleString('th-TH')} · แก้ไขล่าสุด ${new Date(doc.updatedAt).toLocaleString('th-TH')}</div>` : ''}
      </div>
      <div id="totals"></div>
    </div>
  </div>`;

  const form = U.$('#doc-form');

  const renderParty = () => {
    const c = Store.get('contacts', doc.contactId);
    U.$('#party-box').innerHTML = c ? `<b>${U.esc(c.name)}</b> ${c.branch ? `<span class="tag">${U.esc(c.branch)}</span>` : ''}<br>${U.esc(c.address || '')}
      ${c.taxId ? `<br>เลขประจำตัวผู้เสียภาษี: ${U.esc(c.taxId)}` : ''}${c.phone ? ` · โทร ${U.esc(c.phone)}` : ''}${c.email ? ` · ${U.esc(c.email)}` : ''}` : '<span class="muted">ยังไม่ได้เลือก</span>';
  };

  const prodOpts = (sel) => `<option value="">— ระบุเอง —</option>${s.products.map((p) => U.opt(p.id, `${p.code} · ${p.name}`, sel)).join('')}`;
  const renderItems = () => {
    const c = ACC.calcDoc(doc);
    U.$('#items').innerHTML = `<thead><tr><th>#</th><th style="min-width:260px">สินค้า / รายละเอียด</th>${showAcct ? '<th style="min-width:170px">บัญชี</th>' : ''}
      <th style="width:90px" class="num">จำนวน</th><th style="width:80px">หน่วย</th><th style="width:120px" class="num">ราคา/หน่วย</th><th style="width:100px" class="num">ส่วนลด</th><th style="width:130px" class="num">จำนวนเงิน</th><th style="width:36px"></th></tr></thead>
      <tbody>${doc.items.map((it, i) => {
        const p = Store.get('products', it.productId);
        const forced = type === 'GR' && p && p.type === 'goods';
        return `<tr>
        <td class="idx">${i + 1}</td>
        <td><div class="desc-wrap"><select data-i="${i}" data-k="productId" ${dis}>${prodOpts(it.productId)}</select>
          <input data-i="${i}" data-k="description" value="${U.esc(it.description || '')}" placeholder="รายละเอียดสินค้า / บริการ" ${dis}></div></td>
        ${showAcct ? `<td><select data-i="${i}" data-k="account" ${dis || (forced ? 'disabled' : '')}>${forced ? U.opt('1150', '1150 สินค้าคงเหลือ', '1150') : expAccounts.map((a) => U.opt(a.code, `${a.code} ${a.name}`, it.account || ACC.purchaseAccount(it, type))).join('')}</select></td>` : ''}
        <td><input type="number" class="num" step="any" min="0" data-i="${i}" data-k="qty" value="${it.qty}" ${dis}></td>
        <td><input data-i="${i}" data-k="unit" value="${U.esc(it.unit || '')}" ${dis}></td>
        <td><input type="number" class="num" step="any" min="0" data-i="${i}" data-k="price" value="${it.price}" ${dis}></td>
        <td><input type="number" class="num" step="any" min="0" data-i="${i}" data-k="discount" value="${it.discount || 0}" ${dis}></td>
        <td class="num amount" data-amt="${i}">${U.money(c.lines[i].amount)}</td>
        <td>${locked || doc.items.length === 1 ? '' : `<button class="icon-btn danger" data-del="${i}" title="ลบรายการ">${U.icon('trash-2')}</button>`}</td></tr>`;
      }).join('')}</tbody>`;
    U.refreshIcons();
  };

  const renderTotals = () => {
    const c = ACC.calcDoc(doc);
    U.$$('[data-amt]').forEach((el) => { el.textContent = U.money(c.lines[+el.dataset.amt].amount); });
    const vatOn = s.company.vatRegistered && doc.vatMode !== 'none';
    U.$('#totals').innerHTML = `<div class="totals">
      <div class="row"><span>รวมเป็นเงิน</span><span>${U.money(c.subtotal)}</span></div>
      <div class="row"><span>ส่วนลดท้ายบิล</span><input type="number" class="num" step="any" min="0" data-f="discount" value="${doc.discount || 0}" style="width:130px" ${dis}></div>
      <div class="row"><span>ราคาหลังหักส่วนลด</span><span>${U.money(c.after)}</span></div>
      ${vatOn ? `<div class="row"><span>${doc.vatMode === 'inclusive' ? 'มูลค่าก่อนภาษี' : 'มูลค่าที่คำนวณภาษี'}</span><span>${U.money(c.base)}</span></div>
      <div class="row"><span>ภาษีมูลค่าเพิ่ม ${c.vatRate}%</span><span>${U.money(c.vat)}</span></div>` : ''}
      <div class="row grand"><span>จำนวนเงินรวมทั้งสิ้น</span><span>${U.money(c.total)}</span></div>
      <div class="row"><span class="flex">หัก ณ ที่จ่าย <select data-f="whtRate" ${dis}>${[0, 1, 1.5, 2, 3, 5, 10, 15].map((r) => U.opt(r, r ? r + '%' : 'ไม่หัก', doc.whtRate || 0)).join('')}</select></span><span>${c.wht ? '-' + U.money(c.wht) : '0.00'}</span></div>
      <div class="row net"><span>${T.group === 'sales' ? 'ยอดรับชำระสุทธิ' : 'ยอดจ่ายชำระสุทธิ'}</span><span>${U.money(c.net)}</span></div>
      <div class="baht-text">(${U.bahtText(c.total)})</div>
    </div>`;
  };

  const togglePay = () => { const pf = U.$('#pay-fields'); if (pf) pf.style.display = doc.payment && doc.payment.paid ? '' : 'none'; };

  renderParty(); renderItems(); renderTotals(); togglePay();

  const setField = (path, val) => { if (path.startsWith('payment.')) { doc.payment = doc.payment || {}; doc.payment[path.split('.')[1]] = val; } else doc[path] = val; };

  form.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.k && t.tagName === 'INPUT') {
      const it = doc.items[+t.dataset.i];
      it[t.dataset.k] = t.type === 'number' ? (t.value === '' ? 0 : +t.value) : t.value;
      if (['qty', 'price', 'discount'].includes(t.dataset.k)) renderTotals();
    } else if (t.dataset.f && t.tagName !== 'SELECT' && t.type !== 'checkbox') {
      setField(t.dataset.f, t.type === 'number' ? +t.value || 0 : t.value);
      if (t.dataset.f === 'discount') { const pos = t.selectionStart; renderTotals(); const n = form.querySelector('[data-f=discount]'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (er) { /* number inputs */ } }
    }
  });
  form.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.k && t.tagName === 'SELECT') {
      const i = +t.dataset.i, it = doc.items[i];
      it[t.dataset.k] = t.value;
      if (t.dataset.k === 'productId') {
        const p = Store.get('products', t.value);
        if (p) Object.assign(it, { description: p.name, unit: p.unit || '', price: isPurchase ? +p.costPrice || 0 : +p.salePrice || 0, account: '' });
        renderItems(); renderTotals();
      }
    } else if (t.dataset.f) {
      const v = t.type === 'checkbox' ? t.checked : t.type === 'number' ? +t.value || 0 : t.value;
      setField(t.dataset.f, v);
      if (t.dataset.f === 'contactId') {
        renderParty();
        const ct = Store.get('contacts', v);
        if (ct && ['BN', 'GR', 'EX'].includes(type)) { doc.dueDate = U.addDays(doc.date, ct.creditDays ?? s.company.defaultCreditDays); const dd = form.querySelector('[data-f=dueDate]'); if (dd) dd.value = doc.dueDate; }
        if (ct && ct.defaultWht !== undefined && ct.defaultWht !== '' && !doc.whtRate) { doc.whtRate = +ct.defaultWht || 0; }
        renderTotals();
      }
      if (t.dataset.f === 'date') { const no = form.querySelector('input[readonly]'); if (no && !doc.no) no.value = Store.nextNo(type, doc.date, true); }
      if (['vatMode', 'whtRate'].includes(t.dataset.f)) renderTotals();
      if (t.dataset.f === 'payment.paid') togglePay();
    }
  });
  form.addEventListener('click', (e) => {
    const b = e.target.closest('[data-del]');
    if (b) { doc.items.splice(+b.dataset.del, 1); renderItems(); renderTotals(); }
  });
  const addBtn = U.$('#btn-add-item');
  if (addBtn) addBtn.onclick = () => { doc.items.push(Docs.blankItem()); renderItems(); renderTotals(); const ins = U.$$('[data-k=description]'); ins[ins.length - 1].focus(); };
  const ncBtn = U.$('#btn-new-contact');
  if (ncBtn) ncBtn.onclick = () => Pages.contactForm(null, T.party, (c) => {
    const sel = form.querySelector('[data-f=contactId]');
    sel.insertAdjacentHTML('beforeend', U.opt(c.id, `${c.code} · ${c.name}`, c.id));
    sel.value = c.id; sel.dispatchEvent(new Event('change', { bubbles: true }));
  });

  U.$$('[data-act]').forEach((b) => b.addEventListener('click', () => {
    const status = b.dataset.act;
    doc.items = doc.items.filter((i) => i.description || i.productId || +i.price);
    if (!doc.items.length) doc.items = [Docs.blankItem()];
    if (status !== 'draft') { const err = Docs.validate(doc); if (err) { renderItems(); renderTotals(); return U.toast(err, 'error'); } }
    else if (!doc.contactId && !doc.items.some((i) => i.description)) return U.toast('กรุณากรอกข้อมูลก่อนบันทึก', 'error');
    if (status === 'approved') Docs.stockWarning(doc);
    if (!doc.no) doc.no = Store.nextNo(type, doc.date);
    if (!(type === 'GR' || type === 'EX')) delete doc.payment;
    doc.status = status;
    const saved = Store.upsert('documents', doc);
    U.toast(status === 'approved' ? `บันทึกและอนุมัติ ${saved.no} แล้ว — ลงบัญชีอัตโนมัติ` : `บันทึก ${saved.no} แล้ว`);
    App.go(`#/doc/${type}/${saved.id}`);
  }));
};

Pages._unlock = async (id) => {
  const d = Store.get('documents', id);
  const err = Docs.canUnapprove(d);
  if (err) return U.toast(err, 'error');
  if (!(await U.confirm('ยกเลิกการอนุมัติเพื่อแก้ไข? รายการบัญชีของเอกสารนี้จะถูกถอนออกจนกว่าจะอนุมัติใหม่'))) return;
  d.status = 'draft'; Store.upsert('documents', d); App.render();
};

Pages._showJE = (docId) => {
  const { entries } = ACC.buildJournal(U.addDays(U.today(), 36500));
  const es = entries.filter((e) => e.src.id === docId);
  U.modal({
    title: 'การบันทึกบัญชีของเอกสาร', size: 'lg',
    body: es.length ? es.map((e) => `<div class="mb-2"><div class="flex between"><b>${U.thDate(e.date)} · ${U.esc(e.no)}</b><span class="muted small">${U.esc(e.desc)}</span></div>
      <table class="tbl compact mt-1"><thead><tr><th>รหัส</th><th>ชื่อบัญชี</th><th class="num">เดบิต</th><th class="num">เครดิต</th></tr></thead><tbody>
      ${e.lines.map((l) => `<tr><td>${l.acc}</td><td style="${l.cr ? 'padding-left:34px' : ''}">${U.esc(Store.accName(l.acc))}</td><td class="num">${l.dr ? U.money(l.dr) : ''}</td><td class="num">${l.cr ? U.money(l.cr) : ''}</td></tr>`).join('')}
      </tbody><tfoot><tr><td></td><td>รวม</td><td class="num">${U.money(U.sum(e.lines, (l) => l.dr))}</td><td class="num">${U.money(U.sum(e.lines, (l) => l.cr))}</td></tr></tfoot></table></div>`).join('')
      : `<div class="empty">${U.icon('book-x')}<h4>ยังไม่มีรายการบัญชี</h4><p>เอกสารที่ยังไม่อนุมัติ หรือใบเสนอราคา/ใบสั่งซื้อ จะไม่ถูกลงบัญชี</p></div>`,
  });
};
