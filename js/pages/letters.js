/* ============================================================
 * หนังสือส่งมอบงาน (Work Delivery Letter)
 *  - แก้ไขบนกระดาษได้โดยตรง: ช่องสีเหลือง = ดึงข้อมูลอัตโนมัติ/แก้ได้
 *  - ดึงข้อมูลจากใบเสนอราคา / ใบวางบิล / ใบเสร็จ
 *  - พิมพ์ / PDF / ดาวน์โหลด Word
 * ============================================================ */
const Letters = {
  CSS: `
    .page.letter { padding: 15mm 20mm 14mm 26mm; font-family: 'Sarabun', 'TH Sarabun New', 'IBM Plex Sans Thai', sans-serif; font-size: 16px; line-height: 1.78; color: #1a1a1a; }
    .letter .lh { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; }
    .letter .lh-l { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .letter .lh-l img { max-height: 54px; max-width: 120px; object-fit: contain; }
    .letter .lh-name { font-size: 19px; font-weight: 700; color: var(--c, #2E7D32); line-height: 1.3; }
    .letter .lh-sub { font-size: 11.5px; color: #777; letter-spacing: .4px; }
    .letter .lh-r { text-align: right; font-size: 11.5px; line-height: 1.55; color: #555; max-width: 62%; }
    .letter .lh-bar { position: relative; height: 2px; background: var(--c, #2E7D32); margin: 10px 0 0; }
    .letter .lh-bar::before { content: ''; position: absolute; left: 0; top: -2px; width: 64px; height: 6px; background: #FF8F00; border-radius: 0 3px 3px 0; }
    .letter .ttl { text-align: center; margin: 22px 0 18px; }
    .letter .ttl h1 { font-size: 23px; font-weight: 700; margin: 0; letter-spacing: .5px; line-height: 1.3; }
    .letter .ttl .en { font-size: 10.5px; letter-spacing: 3px; color: #8a8a8a; margin-top: 2px; }
    .letter .meta { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
    .letter .meta .no { font-size: 14.5px; color: #333; }
    .letter table.hd { border-collapse: collapse; margin: 0 0 12px; }
    .letter table.hd td { padding: 1px 0; vertical-align: top; }
    .letter table.hd td:first-child { width: 64px; white-space: nowrap; }
    .letter .body p { margin: 0 0 8px; text-indent: 2cm; text-align: left; word-break: normal; overflow-wrap: break-word; }
    .letter .close { width: 50%; text-align: center; margin: 26px 0 0; }
    .letter .signs { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 8px; text-align: center; line-height: 1.55; page-break-inside: avoid; }
    .letter .sb { display: flex; flex-direction: column; align-items: center; }
    .letter .sig-area { height: 64px; display: flex; align-items: flex-end; justify-content: center; }
    .letter .sig-area img.sig { max-height: 62px; max-width: 190px; object-fit: contain; margin-bottom: -10px; }
    .letter .sline { width: 60mm; border-bottom: 1px dotted #444; margin-bottom: 6px; }
    .letter .sb .nm { white-space: nowrap; }
    .letter .sb .tt { color: #333; }
    .letter .sb .org { font-size: 14.5px; color: #444; }
    .letter .sb .dt { margin-top: 4px; font-size: 14.5px; color: #333; }
    .letter .stamp-img { position: absolute; left: 50%; transform: translateX(-50%); bottom: 22mm; max-height: 92px; opacity: .9; }
    .letter .ft { margin-top: auto; padding-top: 14px; border-top: 1px solid #e3e3e3; display: flex; justify-content: space-between; font-family: 'IBM Plex Sans Thai', sans-serif; font-size: 10.5px; color: #999; }
  `,
  EDIT_CSS: `
    .letter .lf { background: #fff59d; border-radius: 3px; padding: 0 2px; outline: none; transition: background .15s, box-shadow .15s; }
    .letter .lf:hover { background: #ffee58; }
    .letter .lf:focus { background: #fffde7; box-shadow: 0 0 0 2px #FF8F00; }
    .letter .lf:empty::before { content: attr(data-ph); color: #b08900; font-style: italic; }
    .letter .le { border-bottom: 1px dashed #94a3b8; outline: none; }
    .letter .le:hover { background: #f1f5f9; }
    .letter .le:focus { background: #eef7ee; border-bottom-color: #2E7D32; }
    .letter .le:empty::before { content: attr(data-ph); color: #94a3b8; font-style: italic; }
    .letter .la { background: #C8E6C9; border-radius: 3px; padding: 0 2px; }
    .letter .opt-empty { opacity: .55; }
    .letter .opt-empty::after { content: ' (ไม่แสดงตอนพิมพ์)'; font-size: 11px; color: #b08900; font-family: 'IBM Plex Sans Thai', sans-serif; }
    .letter .dup { opacity: .45; }
  `,

  /** ฟิลด์: [key, ค่าเริ่มต้น, ไฮไลต์(ดึงอัตโนมัติ)] */
  defaults() {
    const co = Store.state.company;
    return {
      subject: 'ส่งมอบงานและอนุมัติเบิกจ่ายค่าจ้าง',
      to: '', customer: '', contractor: co.name, workVerb: 'เขียนแบบ', workType: 'For Construction',
      project: '', deliverables: '', serviceName: 'ค่าบริการเขียนแบบ', amount: 0, poNo: '',
      contractorSigner: co.signName || '', contractorTitle: '', receiverName: '', receiverTitle: '', receiverOrg: '',
    };
  },

  blank() {
    return { id: null, no: '', date: U.today(), sourceId: '', contactId: '', basis: 'total', status: 'draft',
      showHead: true, useSign: true, useStamp: false, fields: this.defaults() };
  },

  /** ผู้ตรวจรับคนล่าสุดของลูกค้ารายนี้ (จากหนังสือฉบับก่อน) */
  lastReceiver(contactId) {
    const prev = (Store.state.letters || []).filter((x) => x.contactId === contactId && x.fields && x.fields.receiverName)
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))[0];
    return prev ? { name: prev.fields.receiverName, title: prev.fields.receiverTitle || '' } : null;
  },
  /** รายชื่อแนะนำสำหรับช่องผู้ตรวจรับ */
  receiverSuggestions(contactId) {
    const names = new Set();
    const ct = Store.get('contacts', contactId);
    if (ct && ct.contactPerson) names.add(ct.contactPerson);
    (Store.state.letters || []).forEach((x) => { if (x.fields && x.fields.receiverName && (!contactId || x.contactId === contactId)) names.add(x.fields.receiverName); });
    Store.state.documents.forEach((d) => { if (d.contactName && (!contactId || d.contactId === contactId)) names.add(d.contactName); });
    return [...names];
  },

  /** ดึงข้อมูลจากเอกสารขาย */
  fillFrom(L, docId, basis = L.basis || 'total') {
    const d = Store.get('documents', docId);
    if (!d) return L;
    const ct = Store.get('contacts', d.contactId) || {};
    const c = ACC.calcDoc(d);
    const desc = ((d.items || [])[0] || {}).description || '';
    const full = `${ct.name || ''}${ct.branch ? ` (${ct.branch})` : ''}`;
    L.sourceId = d.id; L.contactId = d.contactId; L.basis = basis;
    Object.assign(L.fields, {
      to: full, customer: ct.name || '', receiverOrg: full,
      project: d.project || L.fields.project || '',
      workType: /for construction/i.test(desc) ? 'For Construction' : (desc || L.fields.workType),
      amount: basis === 'base' ? c.base : basis === 'net' ? c.net : c.total,
      poNo: d.reference || L.fields.poNo || '',
      receiverName: d.contactName || ((this.lastReceiver(d.contactId) || {}).name) || L.fields.receiverName || '',
      receiverTitle: (!d.contactName && (this.lastReceiver(d.contactId) || {}).title) || L.fields.receiverTitle || '',
    });
    return L;
  },

  fillContact(L, contactId) {
    const ct = Store.get('contacts', contactId) || {};
    const full = `${ct.name || ''}${ct.branch ? ` (${ct.branch})` : ''}`;
    L.contactId = contactId;
    Object.assign(L.fields, { to: full, customer: ct.name || '', receiverOrg: full, receiverName: ct.contactPerson || ((this.lastReceiver(contactId) || {}).name) || L.fields.receiverName || '', receiverTitle: ((this.lastReceiver(contactId) || {}).title) || L.fields.receiverTitle || '' });
    return L;
  },

  /** สร้าง HTML ของหนังสือ (editable = แสดงช่องแก้ไข) */
  render(L, { editable = false } = {}) {
    const f = L.fields, co = Store.state.company;
    const ed = editable ? 'contenteditable="true" spellcheck="false"' : '';
    const has = (k) => !!String(f[k] ?? '').trim();
    const Y = (k, ph = '') => editable ? `<span class="lf" data-k="${k}" data-ph="${U.esc(ph)}" ${ed}>${U.esc(f[k] ?? '')}</span>` : U.esc(f[k] ?? '');
    const E = (k, ph = '') => editable ? `<span class="le" data-k="${k}" data-ph="${U.esc(ph)}" ${ed}>${U.esc(f[k] ?? '')}</span>` : U.esc(f[k] ?? '');
    const BLANK = '&nbsp;'.repeat(40);
    const NAME = (k, ph) => (editable ? `<span class="lf" data-k="${k}" data-ph="${U.esc(ph)}" ${ed}>${U.esc(f[k] || '')}</span>` : (has(k) ? U.esc(f[k]) : BLANK));
    const TITLE = (k, def) => (editable ? `<span class="le" data-k="${k}" data-ph="${U.esc(def)}" ${ed}>${U.esc(f[k] || '')}</span>` : U.esc(f[k] || def));
    /** ส่วนที่ไม่บังคับ: ตอนพิมพ์แสดงเฉพาะเมื่อมีข้อมูล, ตอนแก้ไขแสดงเสมอ (จางลงถ้าว่าง) */
    const OPT = (k, html, tag = 'span') => (editable ? `<${tag} class="opt" data-opt="${k}"${has(k) ? '' : ' data-empty="1"'}>${html}</${tag}>` : (has(k) ? html : ''));
    const amt = U.money(f.amount);
    const AMT = editable ? `<span class="lf" data-k="amount" data-num="1" ${ed}>${amt}</span>` : amt;
    const BAHT = editable ? `<span class="la" data-auto="baht" title="คำนวณอัตโนมัติจากมูลค่า">${U.bahtText(f.amount)}</span>` : U.bahtText(f.amount);
    const DATE = editable ? `<span class="lf" data-auto="date" title="แก้วันที่ที่แผงด้านขวา">${U.thDateLong(L.date)}</span>` : U.thDateLong(L.date);
    const norm = (x) => String(x || '').replace(/^(นาย|นางสาว|นาง|น\.ส\.|คุณ)\s*/, '').replace(/\s+/g, '');
    const orgDup = norm(f.contractor) === norm(f.contractorSigner);
    const sigImg = L.useSign && co.signImage ? `<img class="sig" src="${co.signImage}" alt="ลายเซ็น">` : '';
    const addr2 = [co.taxId ? `เลขประจำตัวผู้เสียภาษี ${U.esc(co.taxId)}${co.branch ? ` (${U.esc(co.branch)})` : ''}` : '', [co.phone ? `โทร ${U.esc(co.phone)}` : '', co.email ? U.esc(co.email) : ''].filter(Boolean).join(' · ')].filter(Boolean).join('<br>');
    return `<div class="page letter">
      ${L.showHead ? `<div class="lh"><div class="lh-l">${co.logo ? `<img src="${co.logo}" alt="">` : ''}<div><div class="lh-name">${U.esc(co.name)}</div>${co.nameEn && co.nameEn !== co.name ? `<div class="lh-sub">${U.esc(co.nameEn)}</div>` : ''}</div></div>
        <div class="lh-r">${U.esc(co.address || '')}${addr2 ? `<br>${addr2}` : ''}</div></div><div class="lh-bar"></div>` : ''}
      <div class="ttl"><h1>หนังสือส่งมอบงาน</h1><div class="en">WORK DELIVERY LETTER</div></div>
      <div class="meta"><span class="no">${L.no ? `ที่ ${U.esc(L.no)}` : ''}</span><span>${DATE}</span></div>
      <table class="hd">
        <tr><td>เรื่อง</td><td>${E('subject', 'เรื่อง')}</td></tr>
        <tr><td>เรียน</td><td>${Y('to', 'ชื่อผู้ว่าจ้าง (สาขา)')} (ผู้ว่าจ้าง)</td></tr>
        ${editable || has('poNo') ? `<tr class="opt" data-opt="poNo"${has('poNo') ? '' : ' data-empty="1"'}><td>อ้างถึง</td><td>ใบสั่งซื้อเลขที่ ${Y('poNo', 'ไม่ระบุ — คลิกเพื่อใส่เลข PO')}</td></tr>` : ''}
      </table>
      <div class="body">
        <p>ตามที่ ${Y('customer', 'ชื่อผู้ว่าจ้าง')} (ผู้ว่าจ้าง) ได้ตกลงว่าจ้าง ${E('contractor', 'ชื่อผู้รับจ้าง')} (ผู้รับจ้าง) ให้ดำเนินการ${E('workVerb', 'ประเภทงาน')} ${Y('workType', 'รายละเอียดงาน')}${OPT('project', ` สำหรับโครงการ ${Y('project', 'ชื่อโครงการ')}`)}</p>
        <p>บัดนี้ ${E('contractor', 'ชื่อผู้รับจ้าง')} (ผู้รับจ้าง) ได้ดำเนินการจัดทำแบบ ${Y('workType', 'รายละเอียดงาน')} เสร็จสมบูรณ์แล้ว${OPT('deliverables', ` ซึ่งผลงานประกอบไปด้วย ${Y('deliverables', 'รายการผลงานที่ส่งมอบ')}`)}</p>
        <p>ดังนั้น ผู้รับจ้างจึงขอส่งมอบงานดังกล่าวเพื่อให้ผู้ว่าจ้างพิจารณาตรวจรับ และขออนุมัติเบิกจ่าย${E('serviceName', 'ค่าบริการ')} เป็นจำนวนเงิน ${AMT} บาท (${BAHT})${OPT('poNo', ` ตามที่ระบุไว้ในใบสั่งซื้อเลขที่ ${Y('poNo', 'เลขที่ PO')}`)}</p>
        <p>จึงเรียนมาเพื่อโปรดพิจารณาตรวจรับงาน และดำเนินการเบิกจ่ายค่าจ้างต่อไป</p>
      </div>
      <div class="close">ขอแสดงความนับถือ</div>
      <div class="signs">
        <div class="sb"><div class="sig-area">${sigImg}</div><div class="sline"></div>
          <div class="nm">(${NAME('contractorSigner', 'คลิกใส่ชื่อผู้ลงนาม')})</div><div class="tt">${TITLE('contractorTitle', 'ผู้รับจ้าง')}</div>
          ${editable ? `<div class="org${orgDup ? ' dup' : ''}" title="${orgDup ? 'ชื่อซ้ำกับผู้ลงนาม — จะไม่แสดงตอนพิมพ์' : ''}">${E('contractor', '')}</div>` : orgDup ? '' : `<div class="org">${U.esc(f.contractor || '')}</div>`}</div>
        <div class="sb"><div class="sig-area"></div><div class="sline"></div>
          <div class="nm">(${NAME('receiverName', 'คลิกใส่ชื่อผู้ตรวจรับงาน')})</div><div class="tt">${TITLE('receiverTitle', 'ผู้ตรวจรับงาน / ผู้ว่าจ้าง')}</div>
          <div class="org">${Y('receiverOrg', 'ชื่อผู้ว่าจ้าง')}</div><div class="dt">วันที่ ........../........../..........</div></div>
      </div>
      ${L.useStamp && co.stampImage ? `<img class="stamp-img" src="${co.stampImage}" alt="">` : ''}
    </div>`;
  },

  printHtml(L) {
    const title = `หนังสือส่งมอบงาน ${L.no || ''}`;
    return Print.html(title, `<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet"><style>${this.CSS}</style>${this.render(L)}`, '#2E7D32');
  },

  /** ไฟล์ Word (.doc แบบ HTML ที่ Word เปิดได้) */
  wordHtml(L) {
    const body = this.render({ ...L, useSign: false, useStamp: false }).replace(/<img[^>]*>/g, '');
    return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>หนังสือส่งมอบงาน</title><style>
      @page { size: 21cm 29.7cm; margin: 2cm 2cm 2cm 3cm; }
      body { font-family: 'TH Sarabun New', 'Sarabun', sans-serif; font-size: 16pt; line-height: 1.4; }
      .lh-name { font-size: 18pt; font-weight: bold; color: #2E7D32; } .lh-sub, .lh-r { font-size: 11pt; color: #555; } .lh-bar { border-bottom: 2px solid #2E7D32; }
      .ttl { text-align: center; } .ttl h1 { font-size: 20pt; margin: 6pt 0 0; } .ttl .en { font-size: 9pt; color: #888; letter-spacing: 2pt; }
      .meta span:last-child { float: right; } table.hd td:first-child { width: 1.6cm; }
      .body p { text-indent: 2cm; margin: 0 0 4pt; } .close { margin: 18pt 0 0 3cm; }
      .signs > div { display: inline-block; width: 48%; text-align: center; vertical-align: top; } .sig-area { height: 36pt; }
      .sline { border-bottom: 1px dotted #444; margin: 0 1.5cm 4pt; } .org, .dt { font-size: 14pt; }
      </style></head><body>${body}</body></html>`;
  },
};

/* ------------------------------------------------------------ */
Pages.letters = (view, query = {}) => {
  App.setTitle('หนังสือส่งมอบงาน');
  const q = (query.q || '').toLowerCase();
  const list = [...(Store.state.letters || [])].filter((L) => !q || `${L.no} ${L.fields.customer} ${L.fields.project} ${L.fields.poNo}`.toLowerCase().includes(q))
    .sort((a, b) => (b.date + b.no).localeCompare(a.date + a.no));
  view.innerHTML = `
  <div class="page-head"><div><h2>หนังสือส่งมอบงาน</h2><p>ส่งมอบงานและขออนุมัติเบิกจ่ายค่าจ้าง — ดึงข้อมูลจากใบเสนอราคา/ใบวางบิลอัตโนมัติ</p></div>
    <a class="btn btn-primary" href="#/letter/new">${U.icon('plus')}สร้างหนังสือส่งมอบงาน</a></div>
  <div class="card">
    <div class="toolbar"><div class="search">${U.icon('search')}<input id="l-q" placeholder="ค้นหาเลขที่ ผู้ว่าจ้าง โครงการ หรือเลข PO…" value="${U.esc(query.q || '')}"></div></div>
    <div class="table-wrap">${list.length ? `<table class="tbl"><thead><tr><th>เลขที่</th><th>วันที่</th><th>ผู้ว่าจ้าง</th><th>โครงการ</th><th>เลข PO</th><th>อ้างอิง</th><th class="num">มูลค่า</th><th></th></tr></thead><tbody>
      ${list.map((L) => { const src = L.sourceId && Store.get('documents', L.sourceId); return `<tr class="clickable" onclick="if(!event.target.closest('a,button'))location.hash='#/letter/${L.id}'">
        <td class="doc-link"><a href="#/letter/${L.id}">${U.esc(L.no)}</a></td><td>${U.thDate(L.date)}</td><td>${U.esc(L.fields.customer || '-')}</td><td>${U.esc(L.fields.project || '-')}</td>
        <td>${U.esc(L.fields.poNo || '-')}</td><td>${src ? `<a href="#/doc/${src.type}/${src.id}">${U.esc(src.no)}</a>` : '-'}</td><td class="num">${U.money(L.fields.amount)}</td>
        <td class="actions"><button class="icon-btn" title="พิมพ์" onclick="Pages.letterPrint('${L.id}')">${U.icon('printer')}</button></td></tr>`; }).join('')}
      </tbody></table>` : `<div class="empty">${U.icon('file-check-2')}<h4>ยังไม่มีหนังสือส่งมอบงาน</h4><p>สร้างจากเมนูนี้ หรือจากใบเสนอราคา/ใบวางบิล (เมนู ⋯ → สร้างหนังสือส่งมอบงาน)</p><a class="btn btn-primary mt-1" href="#/letter/new">${U.icon('plus')}สร้างหนังสือส่งมอบงาน</a></div>`}</div>
  </div>`;
  const qi = U.$('#l-q');
  qi.addEventListener('input', U.debounce(() => { Pages.letters(view, { q: qi.value }); U.refreshIcons(); const n = U.$('#l-q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250));
};

Pages.letterPrint = (id) => {
  const L = Store.get('letters', id); if (!L) return;
  const w = window.open('', '_blank');
  if (!w) return U.toast('เบราว์เซอร์บล็อกหน้าต่างใหม่ กรุณาอนุญาต Pop-up', 'error');
  w.document.write(Letters.printHtml(L).replace('<body>', '<body><div class="tbar"><b>หนังสือส่งมอบงาน</b><button onclick="print()">🖨️ พิมพ์ / บันทึก PDF</button></div>'));
  w.document.close();
};

Pages.letterEdit = (view, id, query = {}) => {
  let L;
  if (!id || id === 'new') {
    L = Letters.blank();
    if (query.from) Letters.fillFrom(L, query.from);
  } else {
    const x = Store.get('letters', id);
    if (!x) { view.innerHTML = `<div class="card"><div class="empty">${U.icon('file-x')}<h4>ไม่พบหนังสือ</h4><a href="#/letters">กลับ</a></div></div>`; return; }
    L = JSON.parse(JSON.stringify(x));
    L.fields = { ...Letters.defaults(), ...L.fields };
  }
  const isNew = !L.id;
  App.setTitle(isNew ? 'สร้างหนังสือส่งมอบงาน' : `หนังสือส่งมอบงาน ${L.no}`);
  const s = Store.state;
  const srcDocs = s.documents.filter((d) => ['QT', 'BN', 'RC'].includes(d.type) && d.status !== 'void').sort((a, b) => (b.date + b.no).localeCompare(a.date + a.no));
  const customers = s.contacts.filter((c) => c.type !== 'supplier');
  let dirty = isNew && !!query.from;

  view.innerHTML = `
  <style id="letter-css">${Letters.CSS}${Letters.EDIT_CSS}</style>
  <div class="doc-head">
    <div class="title"><a class="icon-btn" href="#/letters" title="กลับ">${U.icon('arrow-left')}</a>
      <div><h2>${isNew ? 'สร้าง' : ''}หนังสือส่งมอบงาน</h2><div class="muted small">${L.no ? `<b>${U.esc(L.no)}</b> · ` : ''}คลิกที่ข้อความ<span style="background:#fff59d;padding:0 4px;border-radius:3px">สีเหลือง</span>หรือ<span style="border-bottom:1px dashed #94a3b8">เส้นประ</span>บนหนังสือเพื่อแก้ไขได้ทันที</div></div></div>
    <div class="btn-group">
      <button class="btn btn-primary" id="lt-save">${U.icon('save')}บันทึก</button>
      <button class="btn btn-outline" id="lt-print">${U.icon('printer')}พิมพ์ / PDF</button>
      <button class="btn btn-outline" id="lt-word">${U.icon('file-type-2')}ดาวน์โหลด Word</button>
      ${isNew ? '' : `<button class="icon-btn danger" id="lt-del" title="ลบ">${U.icon('trash-2')}</button>`}
    </div>
  </div>
  <div class="pv letter-edit">
    <div class="letter-stage"><div class="letter-paper" id="lt-paper"></div></div>
    <div class="pv-side" style="max-height:none">
      <div class="pv-sec"><h4>${U.icon('wand-sparkles')}ดึงข้อมูลอัตโนมัติ</h4>
        <div class="field"><label>จากเอกสาร (ใบเสนอราคา / ใบวางบิล / ใบเสร็จ)</label>
          <select id="lt-src"><option value="">— ไม่อ้างอิงเอกสาร —</option>${srcDocs.map((d) => U.opt(d.id, `${d.no} · ${(Store.get('contacts', d.contactId) || {}).name || ''} · ${U.money(ACC.calcDoc(d).total)}`, L.sourceId)).join('')}</select></div>
        <div class="field"><label>มูลค่าที่ใช้</label><select id="lt-basis">${[['total', 'ยอดรวมทั้งสิ้น (รวม VAT)'], ['base', 'มูลค่าก่อน VAT'], ['net', 'ยอดสุทธิหลังหัก ณ ที่จ่าย']].map(([v, l]) => U.opt(v, l, L.basis)).join('')}</select></div>
        <div class="field"><label>หรือเลือกผู้ว่าจ้าง</label><select id="lt-contact"><option value="">— เลือกลูกค้า —</option>${customers.map((c) => U.opt(c.id, c.name, L.contactId)).join('')}</select></div>
      </div>
      <div class="pv-sec"><h4>${U.icon('link')}อ้างอิง (ไม่บังคับ)</h4>
        <div class="field"><label>เลขที่ใบสั่งซื้อ (PO)</label><input id="lt-po" placeholder="เช่น PO-1331001185 — เว้นว่างได้" value="${U.esc(L.fields.poNo || '')}"></div>
        <div class="small muted">ถ้าเว้นว่าง จะไม่แสดงบรรทัด “อ้างถึง” และข้อความ “ตามที่ระบุไว้ในใบสั่งซื้อ…” · ช่องโครงการและรายการผลงานก็เว้นว่างได้เช่นกัน</div>
      </div>
      <div class="pv-sec"><h4>${U.icon('pen-line')}ผู้ลงนาม</h4>
        <div class="field"><label>ชื่อผู้ตรวจรับงาน (ฝั่งผู้ว่าจ้าง)</label><input id="lt-rname" list="dl-receivers" placeholder="เช่น นายสมชาย ใจดี" value="${U.esc(L.fields.receiverName || '')}"><datalist id="dl-receivers"></datalist></div>
        <div class="field"><label>ตำแหน่งผู้ตรวจรับงาน</label><input id="lt-rtitle" placeholder="ผู้ตรวจรับงาน / ผู้ว่าจ้าง" value="${U.esc(L.fields.receiverTitle || '')}"></div>
        <div class="field"><label>ชื่อผู้ลงนามฝั่งผู้รับจ้าง</label><input id="lt-cname" list="dl-signers" value="${U.esc(L.fields.contractorSigner || '')}"><datalist id="dl-signers">${[s.company.signName, ...s.employees.filter((e) => e.active !== false).map((e) => e.name)].filter(Boolean).map((n) => `<option value="${U.esc(n)}">`).join('')}</datalist></div>
        <div class="field"><label>ตำแหน่งผู้ลงนามฝั่งผู้รับจ้าง</label><input id="lt-ctitle" placeholder="ผู้รับจ้าง" value="${U.esc(L.fields.contractorTitle || '')}"></div>
        <div class="small muted">ช่องตำแหน่งว่างไว้ = ใช้ข้อความเริ่มต้น · ถ้าเว้นชื่อผู้ตรวจรับว่าง ตอนพิมพ์จะเป็นช่องว่างให้เขียนด้วยมือ</div>
      </div>
      <div class="pv-sec"><h4>${U.icon('calendar')}เอกสาร</h4>
        <div class="field"><label>วันที่หนังสือ</label><input type="date" id="lt-date" value="${L.date}"></div>
        <div class="pv-checks" style="grid-template-columns:1fr">
          <label class="check"><input type="checkbox" id="lt-head" ${L.showHead ? 'checked' : ''}> หัวกระดาษบริษัท (โลโก้/ที่อยู่)</label>
          <label class="check"><input type="checkbox" id="lt-sign" ${L.useSign ? 'checked' : ''}> ลายเซ็นอิเล็กทรอนิกส์ผู้รับจ้าง ${s.company.signImage ? '' : '<span class="muted small">(ยังไม่ได้ตั้งค่า)</span>'}</label>
          <label class="check"><input type="checkbox" id="lt-stamp" ${L.useStamp ? 'checked' : ''}> ตราประทับบริษัท ${s.company.stampImage ? '' : '<span class="muted small">(ยังไม่ได้ตั้งค่า)</span>'}</label>
        </div>
      </div>
      <div class="pv-sec"><h4>${U.icon('info')}คำแนะนำ</h4>
        <div class="small muted" style="line-height:1.7">
          <span style="background:#fff59d;padding:0 4px;border-radius:3px">สีเหลือง</span> ข้อมูลที่ดึงอัตโนมัติ — แก้ไขได้<br>
          <span style="border-bottom:1px dashed #94a3b8">เส้นประ</span> ข้อความทั่วไป — แก้ไขได้<br>
          <span style="background:#C8E6C9;padding:0 4px;border-radius:3px">สีเขียว</span> คำนวณอัตโนมัติ (จำนวนเงินตัวอักษร)<br>
          สีไฮไลต์จะไม่แสดงตอนพิมพ์ / PDF</div>
      </div>
    </div>
  </div>`;

  const paper = U.$('#lt-paper');
  const draw = () => { paper.innerHTML = Letters.render(L, { editable: true }); bindPaper(); syncPanel(); syncOpt(); };
  const PANEL = { poNo: '#lt-po', receiverName: '#lt-rname', receiverTitle: '#lt-rtitle', contractorSigner: '#lt-cname', contractorTitle: '#lt-ctitle' };
  const syncPanel = () => { Object.entries(PANEL).forEach(([k, sel]) => { const el = U.$(sel); if (el && document.activeElement !== el) el.value = L.fields[k] || ''; });
    const dl = U.$('#dl-receivers'); if (dl) dl.innerHTML = Letters.receiverSuggestions(L.contactId).map((n) => `<option value="${U.esc(n)}">`).join(''); };
  const syncOpt = () => paper.querySelectorAll('[data-opt]').forEach((el) => { const v = String(L.fields[el.dataset.opt] ?? '').trim(); el.classList.toggle('opt-empty', !v); });
  const syncField = (k, src) => { paper.querySelectorAll(`[data-k="${k}"]`).forEach((el) => { if (el !== src) el.textContent = k === 'amount' ? U.money(L.fields.amount) : L.fields[k]; }); if (PANEL[k]) syncPanel(); syncOpt(); };
  const bindPaper = () => {
    paper.querySelectorAll('[data-k]').forEach((el) => {
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } });
      el.addEventListener('paste', (e) => { e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData.getData('text/plain') || '').replace(/\s*\n\s*/g, ' ')); });
      el.addEventListener('input', () => {
        dirty = true;
        const k = el.dataset.k;
        if (el.dataset.num) {
          const n = parseFloat(el.textContent.replace(/[^\d.]/g, '')) || 0;
          L.fields.amount = U.r2(n);
          const b = paper.querySelector('[data-auto=baht]'); if (b) b.textContent = U.bahtText(L.fields.amount);
        } else { L.fields[k] = el.textContent.replace(/\s+/g, ' ').trim(); syncField(k, el); }
      });
      if (el.dataset.num) el.addEventListener('blur', () => { el.textContent = U.money(L.fields.amount); });
      if (el.dataset.k === 'to') el.addEventListener('blur', () => { if (!L.fields.receiverOrg || L.fields.receiverOrg === L._lastTo) { L.fields.receiverOrg = L.fields.to; syncField('receiverOrg'); } L._lastTo = L.fields.to; });
    });
  };
  L._lastTo = L.fields.to;
  draw();

  const markDirty = () => { dirty = true; };
  Object.entries(PANEL).forEach(([k, sel]) => { U.$(sel).addEventListener('input', (e) => { L.fields[k] = e.target.value.trim(); markDirty(); syncField(k, null); }); });
  U.$('#lt-src').onchange = (e) => { if (e.target.value) { Letters.fillFrom(L, e.target.value, U.$('#lt-basis').value); U.$('#lt-contact').value = L.contactId; } else L.sourceId = ''; markDirty(); draw(); };
  U.$('#lt-basis').onchange = (e) => { L.basis = e.target.value; if (L.sourceId) Letters.fillFrom(L, L.sourceId, L.basis); markDirty(); draw(); };
  U.$('#lt-contact').onchange = (e) => { if (e.target.value) Letters.fillContact(L, e.target.value); markDirty(); draw(); };
  U.$('#lt-date').onchange = (e) => { L.date = e.target.value || U.today(); markDirty(); draw(); };
  U.$('#lt-head').onchange = (e) => { L.showHead = e.target.checked; markDirty(); draw(); };
  U.$('#lt-sign').onchange = (e) => { L.useSign = e.target.checked; markDirty(); draw(); };
  U.$('#lt-stamp').onchange = (e) => { L.useStamp = e.target.checked; markDirty(); draw(); };

  const save = () => {
    if (!L.fields.customer && !L.fields.to) { U.toast('กรุณาระบุผู้ว่าจ้าง', 'error'); return null; }
    if (!L.no) L.no = Store.nextNo('DL', L.date);
    const data = JSON.parse(JSON.stringify(L)); delete data._lastTo;
    const saved = Store.upsert('letters', data);
    L.id = saved.id; dirty = false;
    return saved;
  };
  U.$('#lt-save').onclick = () => { const x = save(); if (x) { U.toast(`บันทึก ${x.no} แล้ว`); if (isNew) App.go(`#/letter/${x.id}`); } };
  U.$('#lt-print').onclick = () => { const x = save(); if (x) Pages.letterPrint(x.id); };
  U.$('#lt-word').onclick = () => { const x = save(); if (x) U.downloadFile(`${x.no}.doc`, '﻿' + Letters.wordHtml(x), 'application/msword'); };
  const del = U.$('#lt-del');
  if (del) del.onclick = async () => { if (await U.confirm(`ลบหนังสือ ${U.esc(L.no)}?`, { danger: true, okText: 'ลบ' })) { Store.remove('letters', L.id); App.go('#/letters'); } };
};
