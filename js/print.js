/* ============================================================
 * Print: A4 document templates (ใบเสนอราคา/ใบวางบิล/ใบเสร็จ/ใบกำกับภาษี/สลิปเงินเดือน)
 * ============================================================ */
const Print = {
  css: `
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: 'IBM Plex Sans Thai', 'Sarabun', sans-serif; color: #111827; font-size: 12.5px; margin: 0; }
    .page { max-width: 186mm; margin: 0 auto; padding: 4mm 0; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    .top { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; }
    .co h1 { font-size: 18px; margin: 0 0 2px; } .co { line-height: 1.55; color: #374151; }
    .co img { max-height: 56px; margin-bottom: 6px; }
    .doc-title { text-align: right; }
    .doc-title h2 { font-size: 21px; margin: 0; color: #1d4ed8; }
    .doc-title .copy { display: inline-block; margin-top: 4px; font-size: 11px; border: 1px solid #1d4ed8; color: #1d4ed8; border-radius: 4px; padding: 1px 8px; }
    .box { display: grid; grid-template-columns: 1.5fr 1fr; gap: 0; border: 1px solid #cbd5e1; border-radius: 8px; margin-top: 14px; overflow: hidden; }
    .box > div { padding: 10px 12px; line-height: 1.6; } .box > div + div { border-left: 1px solid #cbd5e1; background: #f8fafc; }
    .lbl { color: #6b7280; font-size: 11.5px; } .kv { display: flex; justify-content: space-between; gap: 10px; }
    table.items { width: 100%; border-collapse: collapse; margin-top: 14px; }
    .items th { background: #1e3a8a; color: #fff; font-weight: 600; padding: 7px 8px; font-size: 12px; text-align: left; }
    .items th:first-child { border-radius: 6px 0 0 0; } .items th:last-child { border-radius: 0 6px 0 0; }
    .items td { padding: 7px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .foot { display: grid; grid-template-columns: 1.3fr 1fr; gap: 18px; margin-top: 12px; }
    .tot div { display: flex; justify-content: space-between; padding: 4px 0; }
    .tot .g { border-top: 2px solid #111827; font-weight: 700; font-size: 14px; margin-top: 4px; padding-top: 7px; }
    .tot .n { background: #eff6ff; color: #1e40af; font-weight: 700; padding: 6px 8px; border-radius: 6px; margin-top: 4px; }
    .baht { background: #f1f5f9; border-radius: 6px; padding: 7px 10px; text-align: center; font-weight: 600; margin-top: 8px; }
    .note { border: 1px dashed #cbd5e1; border-radius: 6px; padding: 8px 10px; min-height: 50px; white-space: pre-wrap; color: #374151; }
    .sign { display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px; margin-top: 46px; text-align: center; }
    .sign .line { border-top: 1px solid #6b7280; margin: 0 20px; padding-top: 6px; }
    .sign .d { color: #6b7280; font-size: 11.5px; margin-top: 4px; }
    .stamp { font-size: 11px; color: #9ca3af; text-align: center; margin-top: 18px; }
    .void { position: fixed; top: 40%; left: 0; right: 0; text-align: center; font-size: 110px; color: rgba(220, 38, 38, .15); transform: rotate(-20deg); font-weight: 800; }
    .tbar { position: sticky; top: 0; background: #0f172a; color: #fff; padding: 10px 16px; display: flex; gap: 10px; align-items: center; justify-content: center; }
    .tbar button { font: inherit; padding: 6px 14px; border-radius: 6px; border: 0; cursor: pointer; background: #2563eb; color: #fff; }
    .tbar label { display: flex; gap: 6px; align-items: center; }
    @media print { .tbar { display: none; } }
  `,

  open(title, pages) {
    const w = window.open('', '_blank');
    if (!w) return U.toast('เบราว์เซอร์บล็อกหน้าต่างใหม่ กรุณาอนุญาต Pop-up', 'error');
    w.document.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${U.esc(title)}</title>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;600;700&display=swap" rel="stylesheet"><style>${this.css}</style></head>
      <body><div class="tbar"><b>${U.esc(title)}</b><button onclick="print()">🖨️ พิมพ์ / บันทึก PDF</button></div>${pages}</body></html>`);
    w.document.close();
    w.focus();
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

  doc(id) {
    const d = Store.get('documents', id);
    if (!d) return;
    const co = Store.state.company, ct = Store.get('contacts', d.contactId) || {}, c = ACC.calcDoc(d);
    const title = this.docTitle(d);
    const ref = d.refId ? Store.get('documents', d.refId) : null;
    const purchase = DOC_TYPES[d.type].group === 'purchase';
    const dueL = { QT: 'ยืนราคาถึง', BN: 'ครบกำหนดชำระ', PO: 'กำหนดส่งของ', GR: 'ครบกำหนดชำระ', EX: 'ครบกำหนดชำระ' }[d.type];
    const payM = { cash: 'เงินสด', transfer: 'โอนเงิน', cheque: 'เช็ค', card: 'บัตรเครดิต' }[d.payMethod] || '';
    const page = (copy) => `<div class="page">${d.status === 'void' ? '<div class="void">ยกเลิก</div>' : ''}
      <div class="top">${this.header(co)}<div class="doc-title"><h2>${title}</h2><div class="copy">${copy}</div></div></div>
      <div class="box"><div><div class="lbl">${purchase ? 'ผู้ขาย' : 'ลูกค้า'}</div><b>${U.esc(ct.name || '-')}</b><br>${U.esc(ct.address || '')}
        ${ct.taxId ? `<br>เลขประจำตัวผู้เสียภาษี ${U.esc(ct.taxId)} ${ct.branch ? `(${U.esc(ct.branch)})` : ''}` : ''}${ct.phone ? `<br>โทร ${U.esc(ct.phone)}` : ''}${ct.contactPerson ? ` · ผู้ติดต่อ ${U.esc(ct.contactPerson)}` : ''}</div>
        <div><div class="kv"><span class="lbl">เลขที่</span><b>${U.esc(d.no)}</b></div><div class="kv"><span class="lbl">วันที่</span><span>${U.thDateLong(d.date)}</span></div>
          ${dueL && d.dueDate ? `<div class="kv"><span class="lbl">${dueL}</span><span>${U.thDateLong(d.dueDate)}</span></div>` : ''}
          ${ref ? `<div class="kv"><span class="lbl">อ้างอิง</span><span>${U.esc(ref.no)}</span></div>` : d.reference ? `<div class="kv"><span class="lbl">อ้างอิง</span><span>${U.esc(d.reference)}</span></div>` : ''}
          ${d.type === 'RC' ? `<div class="kv"><span class="lbl">ชำระโดย</span><span>${payM}</span></div>` : ''}</div></div>
      <table class="items"><thead><tr><th style="width:34px">#</th><th>รายละเอียด</th><th class="num" style="width:70px">จำนวน</th><th style="width:56px">หน่วย</th><th class="num" style="width:96px">ราคา/หน่วย</th><th class="num" style="width:76px">ส่วนลด</th><th class="num" style="width:106px">จำนวนเงิน</th></tr></thead><tbody>
        ${c.lines.map((l, i) => `<tr><td>${i + 1}</td><td>${U.esc(l.description)}</td><td class="num">${U.qty(l.qty)}</td><td>${U.esc(l.unit || '')}</td><td class="num">${U.money(l.price)}</td><td class="num">${+l.discount ? U.money(l.discount) : '-'}</td><td class="num">${U.money(l.amount)}</td></tr>`).join('')}
      </tbody></table>
      <div class="foot"><div><div class="lbl">หมายเหตุ</div><div class="note">${U.esc(d.note || '')}</div><div class="baht">(${U.bahtText(c.total)})</div></div>
        <div class="tot"><div><span>รวมเป็นเงิน</span><span class="num">${U.money(c.subtotal)}</span></div>
          ${c.discount ? `<div><span>ส่วนลด</span><span class="num">${U.money(c.discount)}</span></div><div><span>หลังหักส่วนลด</span><span class="num">${U.money(c.after)}</span></div>` : ''}
          ${c.vatRate ? `<div><span>มูลค่าก่อนภาษี</span><span class="num">${U.money(c.base)}</span></div><div><span>ภาษีมูลค่าเพิ่ม ${c.vatRate}%</span><span class="num">${U.money(c.vat)}</span></div>` : ''}
          <div class="g"><span>จำนวนเงินรวมทั้งสิ้น</span><span class="num">${U.money(c.total)}</span></div>
          ${c.wht ? `<div><span>หักภาษี ณ ที่จ่าย ${c.whtRate}%</span><span class="num">${U.money(c.wht)}</span></div><div class="n"><span>ยอดชำระสุทธิ</span><span class="num">${U.money(c.net)}</span></div>` : ''}
        </div></div>
      <div class="sign"><div><div class="line">${d.type === 'RC' ? 'ผู้รับเงิน' : purchase ? 'ผู้สั่งซื้อ' : 'ผู้อนุมัติ'}${co.signName ? `<br>(${U.esc(co.signName)})` : ''}</div><div class="d">วันที่ ........../........../..........</div></div>
        <div><div class="line">${d.type === 'QT' ? 'ผู้อนุมัติสั่งซื้อ (ลูกค้า)' : d.type === 'BN' ? 'ผู้รับวางบิล' : purchase ? 'ผู้ขาย' : 'ผู้จ่ายเงิน'}</div><div class="d">วันที่ ........../........../..........</div></div></div>
      <div class="stamp">ออกโดยโปรแกรมบัญชีออนไลน์ AccFlow</div></div>`;
    const pages = ['RC', 'BN'].includes(d.type) ? page('ต้นฉบับ') + page('สำเนา') : page('ต้นฉบับ');
    this.open(`${title} ${d.no}`, pages);
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
        <div class="sign"><div><div class="line">ผู้จ่ายเงิน</div></div><div><div class="line">ผู้รับเงิน</div></div></div></div>`;
    }).join('');
    this.open(`สลิปเงินเดือน ${run.no}`, pages);
  },
};
