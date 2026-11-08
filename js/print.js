/* ============================================================
 * Print: Preview + edit panel, A4 templates (modern / classic), payslip
 * ============================================================ */
const Print = {
  DEFAULTS: { template: 'modern', color: '#2E7D32', copies: 'original', showLogo: true, showStamp: true, showDiscount: true, showVat: true, useSign: true, useStampImg: true,
    signLeft: '', signRight: '', footer: '' },
  COLORS: ['#2E7D32', '#388E3C', '#FF8F00', '#2563eb', '#1e3a8a', '#0d9488', '#7c3aed', '#111827'],

  opts() { return { ...this.DEFAULTS, ...(Store.state.settings.print || {}) }; },

  css: `
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; }
    body { font-family: 'IBM Plex Sans Thai', 'Sarabun', sans-serif; color: #111827; font-size: 12.5px; background: #e5e7eb; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { width: 210mm; min-height: 297mm; margin: 16px auto; padding: 12mm 13mm; background: #fff; box-shadow: 0 4px 24px rgba(0,0,0,.12); position: relative; display: flex; flex-direction: column; }
    @media print { body { background: #fff; } .page { margin: 0; box-shadow: none; page-break-after: always; } .page:last-child { page-break-after: auto; } .tbar { display: none; } }
    .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .spacer { flex: 1; min-height: 16px; }
    .void { position: absolute; top: 40%; left: 0; right: 0; text-align: center; font-size: 110px; color: rgba(220, 38, 38, .15); transform: rotate(-20deg); font-weight: 800; pointer-events: none; }
    .tbar { position: sticky; top: 0; z-index: 2; background: #0f172a; color: #fff; padding: 10px 16px; display: flex; gap: 10px; align-items: center; justify-content: center; }
    .tbar button { font: inherit; padding: 6px 14px; border-radius: 6px; border: 0; cursor: pointer; background: #2563eb; color: #fff; }

    /* ---------- modern ---------- */
    .m .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; }
    .m .top img { max-height: 64px; max-width: 200px; }
    .m .co { text-align: right; line-height: 1.6; font-weight: 600; font-size: 12px; }
    .m .co h1 { color: var(--c); font-size: 19px; margin: 0 0 2px; }
    .m .title { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1px solid #d1d5db; padding-bottom: 6px; margin-top: 18px; }
    .m .title h2 { margin: 0; font-size: 19px; }
    .m .title span { font-weight: 600; font-size: 12px; }
    .m .info { display: grid; grid-template-columns: 250px 1fr; gap: 44px; margin-top: 18px; }
    .m .meta { width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; }
    .m .meta td { padding: 6px 9px; border-bottom: 1px solid #e5e7eb; font-weight: 600; }
    .m .meta td:last-child { text-align: right; } .m .meta td:first-child { white-space: nowrap; }
    .m .meta tr.h td { background: var(--c); color: #fff; }
    .m .party { line-height: 1.6; font-weight: 600; }
    .m .party .lbl { color: var(--c); }
    .m .party b { font-size: 13.5px; }
    .m .proj { margin-top: 18px; font-weight: 700; }
    .m .items { width: 100%; border-collapse: collapse; margin-top: 14px; }
    .m .items th { background: none; color: var(--c); font-weight: 700; text-align: left; padding: 8px 6px; border-bottom: 2px solid #374151; font-size: 12px; }
    .m .items td { padding: 9px 6px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    .m .items .d1 { font-weight: 700; } .m .items .d2 { color: #6b7280; font-size: 11.5px; }
    .m .foot { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 18px; }
    .m .baht { background: #e5e7eb; padding: 8px 10px; text-align: center; font-weight: 700; }
    .m .note { margin-top: 12px; white-space: pre-wrap; color: #374151; line-height: 1.6; }
    .m .note b { color: var(--c); }
    .m .tot div { display: flex; justify-content: space-between; padding: 5px 0; font-weight: 700; }
    .m .tot div span:first-child { color: var(--c); padding-left: 60px; }
    .m .tot .sep { border-top: 1px solid #9ca3af; margin-top: 4px; padding-top: 9px; }
    .m .tot .grand span:last-child { font-size: 14px; }
    .m .sign { margin-top: 0; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; align-items: end; text-align: center; font-size: 11.5px; }
    .m .sign .ln { border-top: 1px dashed #6b7280; padding-top: 6px; font-weight: 600; }
    .m .sign .ln small { color: #6b7280; font-weight: 400; }
    .m .stamp { color: #d1d5db; font-size: 16px; font-weight: 700; padding-bottom: 8px; }
    .sig { display: block; height: 58px; max-width: 190px; object-fit: contain; margin: 0 auto -4px; }
    .sig-sp { height: 58px; }
    .stamp-img { max-height: 96px; max-width: 130px; object-fit: contain; opacity: .92; }
    .m .pfoot { display: flex; gap: 40px; justify-content: space-between; font-size: 10.5px; font-weight: 600; margin-top: 18px; padding-top: 8px; border-top: 1px solid #e5e7eb; }

    /* ---------- classic ---------- */
    .k .top { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; }
    .k .co h1 { font-size: 18px; margin: 0 0 2px; } .k .co { line-height: 1.55; color: #374151; }
    .k .co img { max-height: 56px; margin-bottom: 6px; }
    .k .dt { text-align: right; } .k .dt h2 { font-size: 21px; margin: 0; color: var(--c); }
    .k .copy { display: inline-block; margin-top: 4px; font-size: 11px; border: 1px solid var(--c); color: var(--c); border-radius: 4px; padding: 1px 8px; }
    .k .box { display: grid; grid-template-columns: 1.5fr 1fr; border: 1px solid #cbd5e1; border-radius: 8px; margin-top: 14px; overflow: hidden; }
    .k .box > div { padding: 10px 12px; line-height: 1.6; } .k .box > div + div { border-left: 1px solid #cbd5e1; background: #f8fafc; }
    .k .lbl { color: #6b7280; font-size: 11.5px; } .k .kv { display: flex; justify-content: space-between; gap: 10px; }
    .k .items { width: 100%; border-collapse: collapse; margin-top: 14px; }
    .k .items th { background: var(--c); color: #fff; font-weight: 600; padding: 7px 8px; font-size: 12px; text-align: left; }
    .k .items td { padding: 7px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    .k .foot { display: grid; grid-template-columns: 1.3fr 1fr; gap: 18px; margin-top: 12px; }
    .k .tot div { display: flex; justify-content: space-between; padding: 4px 0; }
    .k .tot .g { border-top: 2px solid #111827; font-weight: 700; font-size: 14px; margin-top: 4px; padding-top: 7px; }
    .k .tot .n { background: #f1f5f9; font-weight: 700; padding: 6px 8px; border-radius: 6px; margin-top: 4px; }
    .k .baht { background: #f1f5f9; border-radius: 6px; padding: 7px 10px; text-align: center; font-weight: 600; margin-top: 8px; }
    .k .note { border: 1px dashed #cbd5e1; border-radius: 6px; padding: 8px 10px; min-height: 50px; white-space: pre-wrap; color: #374151; }
    .k .sign { margin-top: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; text-align: center; align-items: end; }
    .k .sign .ln { border-top: 1px solid #6b7280; padding-top: 6px; } .k .sign .d { color: #6b7280; font-size: 11.5px; margin-top: 4px; }
    .k .stamp { color: #d1d5db; font-size: 16px; font-weight: 700; padding-bottom: 8px; }
    .k .pfoot { font-size: 11px; color: #9ca3af; text-align: center; margin-top: 14px; }

    /* payslip (legacy layout) */
    .co h1 { font-size: 18px; margin: 0 0 2px; } .co { line-height: 1.55; color: #374151; } .co img { max-height: 56px; }
    .doc-title { text-align: right; } .doc-title h2 { font-size: 21px; margin: 0; color: var(--c); }
    .doc-title .copy { display: inline-block; margin-top: 4px; font-size: 11px; border: 1px solid #1d4ed8; color: #1d4ed8; border-radius: 4px; padding: 1px 8px; }
    .box { display: grid; grid-template-columns: 1.5fr 1fr; border: 1px solid #cbd5e1; border-radius: 8px; margin-top: 14px; overflow: hidden; }
    .box > div { padding: 10px 12px; line-height: 1.6; } .box > div + div { border-left: 1px solid #cbd5e1; background: #f8fafc; }
    .lbl { color: #6b7280; font-size: 11.5px; } .kv { display: flex; justify-content: space-between; gap: 10px; }
    .top { display: flex; justify-content: space-between; gap: 20px; }
    table.items { width: 100%; border-collapse: collapse; margin-top: 14px; }
    .items th { background: var(--c); color: #fff; font-weight: 600; padding: 7px 8px; font-size: 12px; text-align: left; }
    .items td { padding: 7px 8px; border-bottom: 1px solid #e5e7eb; }
    .foot { display: grid; grid-template-columns: 1.3fr 1fr; gap: 18px; margin-top: 12px; }
    .tot div { display: flex; justify-content: space-between; padding: 4px 0; }
    .tot .g { border-top: 2px solid #111827; font-weight: 700; font-size: 14px; margin-top: 4px; padding-top: 7px; }
    .tot .n { background: #eff6ff; color: #1e40af; font-weight: 700; padding: 6px 8px; border-radius: 6px; margin-top: 4px; }
    .baht { background: #f1f5f9; border-radius: 6px; padding: 7px 10px; text-align: center; font-weight: 600; margin-top: 8px; }
    .sign { display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px; margin-top: 46px; text-align: center; }
    .sign .line { border-top: 1px solid #6b7280; margin: 0 20px; padding-top: 6px; }
  `,

  html(title, pages, color = '#2563eb', toolbar = false) {
    return `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${U.esc(title)}</title>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;600;700&display=swap" rel="stylesheet">
      <style>:root{--c:${color}}${this.css}</style></head><body>
      ${toolbar ? `<div class="tbar"><b>${U.esc(title)}</b><button onclick="print()">🖨️ พิมพ์ / บันทึก PDF</button></div>` : ''}${pages}</body></html>`;
  },

  open(title, pages, color = '#2E7D32') {
    const w = window.open('', '_blank');
    if (!w) return U.toast('เบราว์เซอร์บล็อกหน้าต่างใหม่ กรุณาอนุญาต Pop-up', 'error');
    w.document.write(this.html(title, pages, color, true));
    w.document.close(); w.focus();
  },

  header(co) {
    return `<div class="co">${co.logo ? `<img src="${co.logo}"><br>` : ''}<h1>${U.esc(co.name)}</h1>${co.nameEn ? `${U.esc(co.nameEn)}<br>` : ''}${U.esc(co.address || '')}<br>
      ${co.taxId ? `เลขประจำตัวผู้เสียภาษี ${U.esc(co.taxId)} (${U.esc(co.branch || 'สำนักงานใหญ่')})<br>` : ''}${co.phone ? `โทร ${U.esc(co.phone)} ` : ''}${co.email ? `อีเมล ${U.esc(co.email)}` : ''}</div>`;
  },

  docTitle(d) {
    const vat = ACC.calcDoc(d).vat > 0;
    const co = Store.state.company;
    if (d.type === 'RC') return vat ? 'ใบเสร็จรับเงิน / ใบกำกับภาษี' : 'ใบเสร็จรับเงิน';
    if (d.type === 'BN') return vat && co.vatPoint === 'invoice' ? 'ใบแจ้งหนี้ / ใบกำกับภาษี' : 'ใบวางบิล / ใบแจ้งหนี้';
    return DOC_TYPES[d.type].label;
  },

  /** ป้ายลายเซ็นเริ่มต้น */
  signLabels(d) {
    const purchase = DOC_TYPES[d.type].group === 'purchase';
    const left = { QT: 'ผู้อนุมัติสั่งซื้อ / Customer Signature', BN: 'ผู้รับวางบิล / Received by', RC: 'ผู้จ่ายเงิน / Payer', PO: 'ผู้ขาย / Supplier', GR: 'ผู้ส่งของ / Delivered by', EX: 'ผู้รับเงิน / Payee' }[d.type];
    const right = { RC: 'ผู้รับเงิน / Collector' }[d.type] || (purchase ? 'ผู้อนุมัติ / Authorized Signature' : 'ผู้มีอำนาจลงนาม / Authorized Signature');
    return [left, right];
  },

  /** สร้างหน้าเอกสาร (string ของ .page ทั้งหมด) */
  pages(d, o = this.opts()) {
    const co = Store.state.company, ct = Store.get('contacts', d.contactId) || {}, c = ACC.calcDoc(d);
    const title = this.docTitle(d);
    const [defL, defR] = this.signLabels(d);
    const signL = o.signLeft || defL, signR = o.signRight || defR;
    const ref = d.refId ? Store.get('documents', d.refId) : null;
    const purchase = DOC_TYPES[d.type].group === 'purchase';
    const credit = d.dueDate && d.type !== 'RC' ? Math.max(0, U.daysBetween(d.date, d.dueDate)) : null;
    const dueL = { QT: 'ยืนราคาถึง', PO: 'กำหนดส่งของ' }[d.type] || 'ครบกำหนด';
    const payM = { cash: 'เงินสด', transfer: 'โอนเงิน', cheque: 'เช็ค', card: 'บัตรเครดิต' }[d.payMethod] || '';
    const salesL = purchase ? 'ผู้สั่งซื้อ' : 'พนักงานขาย';
    const copies = o.copies === 'both' ? ['ต้นฉบับ', 'สำเนา'] : o.copies === 'copy' ? ['สำเนา'] : ['ต้นฉบับ'];
    const voidMark = d.status === 'void' ? '<div class="void">ยกเลิก</div>' : '';
    const showVatCol = o.showVat && c.vatRate > 0;
    const useSig = o.useSign && co.signImage;
    const sigImg = useSig ? `<img class="sig" src="${co.signImage}" alt="ลายเซ็น">` : '<div class="sig-sp"></div>';
    const stampHtml = o.useStampImg && co.stampImage ? `<img class="stamp-img" src="${co.stampImage}" alt="ตราประทับ">` : o.showStamp ? 'ตราประทับบริษัท' : '';
    const fullDate = U.thDate(d.date).replace(/\/(\d\d)$/, '/25$1');
    const signDate = useSig ? fullDate : '......................';
    const coLine = [co.address, co.taxId ? `เลขผู้เสียภาษี ${co.taxId}` : ''].filter(Boolean).join(' · ');

    const itemRows = (cls) => c.lines.map((l, i) => {
      const p = l.productId ? Store.get('products', l.productId) : null;
      const sub = p && p.description && p.name === l.description ? p.description : '';
      return `<tr><td>${i + 1}</td><td><div class="d1">${U.esc(l.description)}</div>${sub ? `<div class="d2">${U.esc(sub)}</div>` : ''}</td>
        <td class="num">${U.qty(l.qty)}${cls === 'k' ? '' : ` <span class="d2">${U.esc(l.unit || '')}</span>`}</td>${cls === 'k' ? `<td>${U.esc(l.unit || '')}</td>` : ''}
        <td class="num">${U.money(l.price)}</td>${o.showDiscount ? `<td class="num">${+l.discount ? U.money(l.discount) : '0.00'}</td>` : ''}
        ${showVatCol ? `<td class="num">${c.vatRate}%</td>` : ''}<td class="num">${U.money(l.amount)}</td></tr>`;
    }).join('');

    const modern = (copy) => `<div class="page m">${voidMark}
      <div class="top"><div>${o.showLogo && co.logo ? `<img src="${co.logo}">` : ''}</div>
        <div class="co"><h1>${U.esc(co.name)}</h1>${U.esc(co.address || '')}${co.taxId ? `<br>เลขผู้เสียภาษี ${U.esc(co.taxId)}${co.branch ? ` (${U.esc(co.branch)})` : ''}` : ''}
        <br>${[co.phone ? `โทร.: ${U.esc(co.phone)}` : '', U.esc(co.email || '')].filter(Boolean).join(' | ')}</div></div>
      <div class="title"><h2>${title}</h2><span>${copy}</span></div>
      <div class="info">
        <table class="meta"><tr class="h"><td>เลขที่:</td><td>${U.esc(d.no)}</td></tr><tr><td>วันที่:</td><td>${U.thDate(d.date).replace(/\/(\d\d)$/, '/25$1')}</td></tr>
          ${credit !== null ? `<tr><td>เครดิต:</td><td>${credit} วัน</td></tr><tr><td>${dueL}:</td><td>${U.thDate(d.dueDate).replace(/\/(\d\d)$/, '/25$1')}</td></tr>` : ''}
          ${d.type === 'RC' && payM ? `<tr><td>ชำระโดย:</td><td>${payM}</td></tr>` : ''}
          ${ref || d.reference ? `<tr><td>อ้างอิง:</td><td>${U.esc(ref ? ref.no : d.reference)}</td></tr>` : ''}
          ${d.salesPerson ? `<tr><td>${salesL}:</td><td>${U.esc(d.salesPerson)}${d.salesPhone ? `<br><span style="font-weight:400">${U.esc(d.salesPhone)}</span>` : ''}</td></tr>` : ''}</table>
        <div class="party"><div class="lbl">${purchase ? 'ผู้ขาย:' : 'ลูกค้า:'}</div><b>${U.esc(ct.name || '-')}</b><br>${U.esc(ct.address || '')}${ct.phone ? ` โทร: ${U.esc(ct.phone)}` : ''}
          ${ct.taxId ? `<br>เลขที่ผู้เสียภาษี ${U.esc(ct.taxId)}${ct.branch ? ` (${U.esc(ct.branch)})` : ''}` : ''}
          ${d.contactPhone ? `<br>โทร.: ${U.esc(d.contactPhone)}` : ''}${d.contactName ? `<br>เรียน: ${U.esc(d.contactName)}` : ''}${d.contactEmail ? `<br>อีเมล: ${U.esc(d.contactEmail)}` : ''}</div>
      </div>
      ${d.project ? `<div class="proj">โปรเจกต์ : ${U.esc(d.project)}</div>` : ''}
      <table class="items"><thead><tr><th style="width:26px"></th><th>รายการ</th><th class="num">จำนวน</th><th class="num">ราคาต่อหน่วย</th>${o.showDiscount ? '<th class="num">ส่วนลด</th>' : ''}${showVatCol ? '<th class="num">ภาษี</th>' : ''}<th class="num">จำนวนเงิน <small>(บาท)</small></th></tr></thead>
        <tbody>${itemRows('m')}</tbody></table>
      <div class="foot"><div><div class="baht">${U.bahtText(c.total)}</div>${d.note ? `<div class="note"><b>หมายเหตุ</b><br>${U.esc(d.note)}</div>` : ''}</div>
        <div class="tot"><div><span>รวมเป็นเงิน</span><span class="num">${U.money(c.subtotal)}</span></div>
          ${c.discount ? `<div><span>หักส่วนลดพิเศษ</span><span class="num">${U.money(c.discount)}</span></div><div><span>ยอดหลังหักส่วนลด</span><span class="num">${U.money(c.after)}</span></div>` : ''}
          ${c.vatRate ? `${d.vatMode === 'inclusive' ? `<div><span>มูลค่าก่อนภาษี</span><span class="num">${U.money(c.base)}</span></div>` : ''}<div><span>ภาษีมูลค่าเพิ่ม ${c.vatRate} %</span><span class="num">${U.money(c.vat)}</span></div>` : ''}
          <div class="sep grand"><span>จำนวนเงินรวมทั้งสิ้น</span><span class="num">${U.money(c.total)}</span></div>
          ${c.wht ? `<div><span>หัก ณ ที่จ่าย ${c.whtRate} %</span><span class="num">${U.money(c.wht)}</span></div><div class="sep grand"><span>ยอดชำระสุทธิ</span><span class="num">${U.money(c.net)}</span></div>` : ''}
        </div></div>
      <div class="spacer"></div>
      <div class="sign"><div><div class="sig-sp"></div><div class="ln">${U.esc(signL.split(' / ')[0])}${signL.includes(' / ') ? ` <small>/ ${U.esc(signL.split(' / ')[1])}</small>` : ''}<br>วันที่ <small>/ Date</small> ......................</div></div>
        <div class="stamp">${stampHtml}</div>
        <div>${sigImg}<div class="ln">${U.esc(signR.split(' / ')[0])}${signR.includes(' / ') ? ` <small>/ ${U.esc(signR.split(' / ')[1])}</small>` : ''}${co.signName ? `<br>(${U.esc(co.signName)})` : ''}<br>วันที่ <small>/ Date</small> ${signDate}</div></div></div>
      <div class="pfoot"><span>หน้า 1 / 1</span><span>${U.esc(o.footer || coLine)}</span></div></div>`;

    const classic = (copy) => `<div class="page k">${voidMark}
      <div class="top"><div class="co">${o.showLogo && co.logo ? `<img src="${co.logo}"><br>` : ''}<h1>${U.esc(co.name)}</h1>${co.nameEn ? `${U.esc(co.nameEn)}<br>` : ''}${U.esc(co.address || '')}<br>
        ${co.taxId ? `เลขประจำตัวผู้เสียภาษี ${U.esc(co.taxId)} (${U.esc(co.branch || 'สำนักงานใหญ่')})<br>` : ''}${co.phone ? `โทร ${U.esc(co.phone)} ` : ''}${co.email ? `อีเมล ${U.esc(co.email)}` : ''}</div>
        <div class="dt"><h2>${title}</h2><div class="copy">${copy}</div></div></div>
      <div class="box"><div><div class="lbl">${purchase ? 'ผู้ขาย' : 'ลูกค้า'}</div><b>${U.esc(ct.name || '-')}</b><br>${U.esc(ct.address || '')}
        ${ct.taxId ? `<br>เลขประจำตัวผู้เสียภาษี ${U.esc(ct.taxId)} ${ct.branch ? `(${U.esc(ct.branch)})` : ''}` : ''}${ct.phone ? `<br>โทร ${U.esc(ct.phone)}` : ''}
        ${d.contactName ? `<br>ผู้ติดต่อ: ${U.esc(d.contactName)}${d.contactPhone ? ` · โทร ${U.esc(d.contactPhone)}` : ''}` : d.contactPhone ? `<br>โทรผู้ติดต่อ ${U.esc(d.contactPhone)}` : ''}</div>
        <div><div class="kv"><span class="lbl">เลขที่</span><b>${U.esc(d.no)}</b></div><div class="kv"><span class="lbl">วันที่</span><span>${U.thDateLong(d.date)}</span></div>
          ${credit !== null ? `<div class="kv"><span class="lbl">เครดิต</span><span>${credit} วัน</span></div><div class="kv"><span class="lbl">${dueL}</span><span>${U.thDateLong(d.dueDate)}</span></div>` : ''}
          ${ref || d.reference ? `<div class="kv"><span class="lbl">อ้างอิง</span><span>${U.esc(ref ? ref.no : d.reference)}</span></div>` : ''}
          ${d.type === 'RC' ? `<div class="kv"><span class="lbl">ชำระโดย</span><span>${payM}</span></div>` : ''}
          ${d.salesPerson ? `<div class="kv"><span class="lbl">${salesL}</span><span>${U.esc(d.salesPerson)}${d.salesPhone ? ` (${U.esc(d.salesPhone)})` : ''}</span></div>` : ''}</div></div>
      ${d.project ? `<p style="margin:12px 0 0"><b>โปรเจกต์:</b> ${U.esc(d.project)}</p>` : ''}
      <table class="items"><thead><tr><th style="width:30px">#</th><th>รายละเอียด</th><th class="num">จำนวน</th><th>หน่วย</th><th class="num">ราคา/หน่วย</th>${o.showDiscount ? '<th class="num">ส่วนลด</th>' : ''}${showVatCol ? '<th class="num">ภาษี</th>' : ''}<th class="num">จำนวนเงิน</th></tr></thead>
        <tbody>${itemRows('k')}</tbody></table>
      <div class="foot"><div><div class="lbl">หมายเหตุ</div><div class="note">${U.esc(d.note || '')}</div><div class="baht">(${U.bahtText(c.total)})</div></div>
        <div class="tot"><div><span>รวมเป็นเงิน</span><span class="num">${U.money(c.subtotal)}</span></div>
          ${c.discount ? `<div><span>ส่วนลด</span><span class="num">${U.money(c.discount)}</span></div><div><span>หลังหักส่วนลด</span><span class="num">${U.money(c.after)}</span></div>` : ''}
          ${c.vatRate ? `<div><span>มูลค่าก่อนภาษี</span><span class="num">${U.money(c.base)}</span></div><div><span>ภาษีมูลค่าเพิ่ม ${c.vatRate}%</span><span class="num">${U.money(c.vat)}</span></div>` : ''}
          <div class="g"><span>จำนวนเงินรวมทั้งสิ้น</span><span class="num">${U.money(c.total)}</span></div>
          ${c.wht ? `<div><span>หักภาษี ณ ที่จ่าย ${c.whtRate}%</span><span class="num">${U.money(c.wht)}</span></div><div class="n"><span>ยอดชำระสุทธิ</span><span class="num">${U.money(c.net)}</span></div>` : ''}</div></div>
      <div class="spacer"></div>
      <div class="sign"><div><div class="sig-sp"></div><div class="ln">${U.esc(signL)}</div><div class="d">วันที่ ........../........../..........</div></div><div class="stamp">${stampHtml}</div>
        <div>${sigImg}<div class="ln">${U.esc(signR)}${co.signName ? `<br>(${U.esc(co.signName)})` : ''}</div><div class="d">วันที่ ${useSig ? fullDate : '........../........../..........'}</div></div></div>
      <div class="pfoot">${U.esc(o.footer || 'ออกโดยระบบบัญชี VoltGrid')}</div></div>`;

    return copies.map((cp) => (o.template === 'classic' ? classic(cp) : modern(cp))).join('');
  },

  /** หน้าต่าง Preview + แผงแก้ไข */
  doc(id) {
    const d0 = Store.get('documents', id);
    if (!d0) return;
    const d = JSON.parse(JSON.stringify(d0));
    const o = this.opts();
    const T = DOC_TYPES[d.type];
    const sales = T.group === 'sales';
    const [defL, defR] = this.signLabels(d);
    const title = `${this.docTitle(d)} ${d.no}`;
    const inp = (k, label, ph = '', type = 'text') => `<div class="field"><label>${label}</label><input type="${type}" data-d="${k}" value="${U.esc(d[k] || '')}" placeholder="${U.esc(ph)}"></div>`;
    const chk = (k, label) => `<label class="check"><input type="checkbox" data-o="${k}" ${o[k] ? 'checked' : ''}> ${label}</label>`;
    let dirty = false;

    U.modal({
      title: `${U.icon('eye')} ตัวอย่างก่อนพิมพ์ — ${U.esc(title)}`, size: 'full',
      body: `<div class="pv">
        <div class="pv-frame"><iframe id="pv-iframe" title="ตัวอย่างเอกสาร"></iframe></div>
        <div class="pv-side">
          <div class="pv-sec"><h4>${U.icon('layout-template')}รูปแบบเอกสาร</h4>
            <div class="seg" style="width:100%">${[['modern', 'โมเดิร์น'], ['classic', 'คลาสสิก']].map(([v, l]) => `<button type="button" data-tpl="${v}" class="${o.template === v ? 'active' : ''}" style="flex:1">${l}</button>`).join('')}</div>
            <div class="lbl-sm mt-1">สีหลัก</div>
            <div class="swatches">${this.COLORS.map((c) => `<button type="button" data-color="${c}" style="background:${c}" class="${o.color === c ? 'on' : ''}" title="${c}"></button>`).join('')}<input type="color" data-o="color" value="${o.color}" title="เลือกสีเอง"></div>
            <div class="field mt-1"><label>ฉบับ</label><select data-o="copies">${[['original', 'ต้นฉบับ'], ['copy', 'สำเนา'], ['both', 'ต้นฉบับ + สำเนา']].map(([v, l]) => U.opt(v, l, o.copies)).join('')}</select></div>
            <div class="pv-checks">${chk('showLogo', 'แสดงโลโก้')}${chk('showStamp', 'ช่องตราประทับ')}${chk('showDiscount', 'คอลัมน์ส่วนลด')}${chk('showVat', 'คอลัมน์ภาษี')}${chk('useSign', 'แสดงลายเซ็น')}${chk('useStampImg', 'รูปตราประทับ')}</div>
            ${Store.state.company.signImage ? '' : `<div class="small muted">ยังไม่มีลายเซ็น — <a href="#/settings/sign" data-gosign>ตั้งค่าลายเซ็นอิเล็กทรอนิกส์</a></div>`}
          </div>
          <div class="pv-sec"><h4>${U.icon('user-round')}${sales ? 'ข้อมูลผู้ติดต่อลูกค้า' : 'ข้อมูลผู้ติดต่อผู้ขาย'}</h4>
            ${inp('contactName', 'ชื่อผู้ติดต่อ (เรียน)', 'เช่น คุณสมศรี')}${inp('contactPhone', 'เบอร์โทรผู้ติดต่อ', '08x-xxx-xxxx', 'tel')}${inp('contactEmail', 'อีเมลผู้ติดต่อ', '', 'email')}</div>
          <div class="pv-sec"><h4>${U.icon('badge-check')}${sales ? 'ข้อมูลผู้ขาย (พนักงานขาย)' : 'ผู้สั่งซื้อ'}</h4>
            ${inp('salesPerson', sales ? 'ชื่อพนักงานขาย' : 'ชื่อผู้สั่งซื้อ')}${inp('salesPhone', 'เบอร์โทร', '', 'tel')}${inp('project', 'โปรเจกต์ / งาน')}${inp('reference', 'เลขที่อ้างอิง')}
            <div class="field"><label>หมายเหตุ</label><textarea data-d="note" rows="3">${U.esc(d.note || '')}</textarea></div></div>
          <div class="pv-sec"><h4>${U.icon('pen-line')}ลายเซ็นและท้ายกระดาษ</h4>
            <div class="field"><label>ลายเซ็นซ้าย</label><input data-o="signLeft" value="${U.esc(o.signLeft)}" placeholder="${U.esc(defL)}"></div>
            <div class="field"><label>ลายเซ็นขวา</label><input data-o="signRight" value="${U.esc(o.signRight)}" placeholder="${U.esc(defR)}"></div>
            <div class="field"><label>ข้อความท้ายกระดาษ</label><input data-o="footer" value="${U.esc(o.footer)}" placeholder="ที่อยู่บริษัท (ค่าเริ่มต้น)"></div></div>
          <p class="small muted">รายการสินค้า ราคา และยอดเงิน แก้ได้ที่หน้า “แก้ไขเอกสาร” (เอกสารที่อนุมัติแล้วต้องยกเลิกอนุมัติก่อน)</p>
        </div></div>`,
      footer: `<a class="btn btn-ghost" style="margin-right:auto" href="#/doc/${d.type}/${d.id}" data-edit>${U.icon('pencil')}แก้ไขเอกสาร (รายการ/ราคา)</a>
        <button class="btn btn-outline" data-save>${U.icon('save')}บันทึกข้อมูล</button>
        <button class="btn btn-outline" data-dl>${U.icon('download')}ดาวน์โหลด HTML</button>
        <button class="btn btn-primary" data-print>${U.icon('printer')}พิมพ์ / บันทึก PDF</button>`,
      onOpen: (root, close) => {
        const frame = root.querySelector('#pv-iframe');
        const render = () => { frame.srcdoc = this.html(title, this.pages(d, o), o.color); };
        const renderLater = U.debounce(render, 180);
        const saveOpts = () => { Store.state.settings.print = { ...o }; Store.save({ silent: true }); };
        const saveDoc = () => {
          if (!dirty) return;
          const cur = Store.get('documents', d.id);
          ['contactName', 'contactPhone', 'contactEmail', 'salesPerson', 'salesPhone', 'project', 'reference', 'note'].forEach((k) => (cur[k] = d[k] || ''));
          Store.upsert('documents', cur); dirty = false;
        };
        root.querySelector('.pv-side').addEventListener('input', (e) => {
          const t = e.target;
          if (t.dataset.d) { d[t.dataset.d] = t.value; dirty = true; renderLater(); }
          if (t.dataset.o) {
            o[t.dataset.o] = t.type === 'checkbox' ? t.checked : t.value;
            if (t.dataset.o === 'color') root.querySelectorAll('[data-color]').forEach((b) => b.classList.toggle('on', b.dataset.color === t.value));
            saveOpts(); renderLater();
          }
        });
        root.querySelectorAll('[data-tpl]').forEach((b) => b.onclick = () => { o.template = b.dataset.tpl; root.querySelectorAll('[data-tpl]').forEach((x) => x.classList.toggle('active', x === b)); saveOpts(); render(); });
        root.querySelectorAll('[data-color]').forEach((b) => b.onclick = () => { o.color = b.dataset.color; root.querySelector('[data-o=color]').value = o.color; root.querySelectorAll('[data-color]').forEach((x) => x.classList.toggle('on', x === b)); saveOpts(); render(); });
        root.querySelector('[data-save]').onclick = () => { saveDoc(); U.toast('บันทึกข้อมูลลงเอกสารแล้ว'); };
        root.querySelector('[data-print]').onclick = () => { saveDoc(); frame.contentWindow.focus(); frame.contentWindow.print(); };
        root.querySelector('[data-dl]').onclick = () => { saveDoc(); U.downloadFile(`${d.no}.html`, this.html(title, this.pages(d, o), o.color), 'text/html'); };
        root.querySelector('[data-edit]').onclick = () => { saveDoc(); close(); };
        const gs = root.querySelector('[data-gosign]'); if (gs) gs.onclick = () => { saveDoc(); close(); };
        root.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => { if (dirty) { saveDoc(); U.toast('บันทึกข้อมูลที่แก้ไขแล้ว', 'info'); App.render(); } }));
        render();
      },
    });
  },

  payslip(runId, idx) {
    const run = Store.get('payrolls', runId);
    if (!run) return;
    const c = ACC.calcPayroll(run), co = Store.state.company;
    const lines = idx == null ? c.lines : [c.lines[idx]];
    const pages = lines.map((l) => {
      const e = Store.get('employees', l.employeeId) || {};
      const row = (a, b) => `<tr><td>${a}</td><td class="num">${U.money(b)}</td></tr>`;
      return `<div class="page"><div class="top">${this.header(co)}<div class="doc-title"><h2>สลิปเงินเดือน</h2><div class="copy">PAYSLIP</div></div></div>
        <div class="box"><div><div class="lbl">พนักงาน</div><b>${U.esc(e.name || '-')}</b> (${U.esc(e.code || '')})<br>${U.esc(e.position || '')} ${e.department ? '· ' + U.esc(e.department) : ''}<br>${e.bank ? 'บัญชี ' + U.esc(e.bank) : ''}</div>
          <div><div class="kv"><span class="lbl">งวด</span><b>${U.thMonth(run.period)}</b></div><div class="kv"><span class="lbl">วันที่จ่าย</span><span>${U.thDateLong(run.payDate)}</span></div><div class="kv"><span class="lbl">เลขที่</span><span>${U.esc(run.no)}</span></div></div></div>
        <div class="foot" style="grid-template-columns:1fr 1fr">
          <table class="items"><thead><tr><th>รายได้</th><th class="num">จำนวนเงิน</th></tr></thead><tbody>${row('เงินเดือน', l.salary)}${row('ค่าล่วงเวลา (OT)', l.ot)}${row('โบนัส', l.bonus)}${row('รายได้อื่น', l.other)}</tbody></table>
          <table class="items"><thead><tr><th>รายการหัก</th><th class="num">จำนวนเงิน</th></tr></thead><tbody>${row('ประกันสังคม', l.sso)}${row('ภาษีเงินได้หัก ณ ที่จ่าย', l.wht)}${row('รายการหักอื่น', l.deduct)}</tbody></table>
        </div>
        <div class="foot" style="grid-template-columns:1fr 1fr"><div class="tot"><div class="g"><span>รวมรายได้</span><span class="num">${U.money(l.gross)}</span></div></div>
          <div class="tot"><div class="g"><span>รวมรายการหัก</span><span class="num">${U.money(U.r2(l.sso + l.wht + l.deduct))}</span></div></div></div>
        <div class="tot" style="max-width:50%;margin-left:auto"><div class="n"><span>เงินได้สุทธิ</span><span class="num">${U.money(l.net)}</span></div></div>
        <div class="baht">(${U.bahtText(l.net)})</div>
        <div class="sign"><div>${co.signImage ? `<img class="sig" src="${co.signImage}" alt="ลายเซ็น">` : '<div class="sig-sp"></div>'}<div class="line">ผู้จ่ายเงิน${co.signName ? `<br>(${U.esc(co.signName)})` : ''}</div></div><div><div class="sig-sp"></div><div class="line">ผู้รับเงิน<br>(${U.esc(e.name || '')})</div></div></div></div>`;
    }).join('');
    this.open(`สลิปเงินเดือน ${run.no}`, pages, '#2E7D32');
  },
};
