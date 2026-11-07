/* ============================================================
 * Demo data — ข้อมูลตัวอย่างสำหรับทดลองใช้งาน
 * ============================================================ */
const Demo = {
  async confirmLoad() {
    if (Store.state.documents.length && !(await U.confirm('โหลดข้อมูลตัวอย่าง? ข้อมูลปัจจุบันในเครื่องจะถูกแทนที่', { danger: true, okText: 'โหลดข้อมูลตัวอย่าง' }))) return;
    this.load(); U.toast('โหลดข้อมูลตัวอย่างแล้ว'); App.go('#/dashboard');
  },

  load() {
    const keep = { gasUrl: Store.state.settings.gasUrl, gasToken: Store.state.settings.gasToken, autoSync: Store.state.settings.autoSync };
    const s = Store.defaults();
    s.settings = { ...s.settings, ...keep };
    Store.state = s;
    const today = U.today();
    const fy = ACC.fiscalStart(today);
    const curM = U.daysBetween(fy, today) / 30.4 | 0; // months elapsed in fiscal year
    const D = (m, d) => { const [y, mm] = fy.split('-').map(Number); const dt = new Date(y, mm - 1 + m, d); return U.iso(dt) > today ? today : U.iso(dt); };
    const id = () => U.uid();

    Object.assign(s.company, {
      name: 'บริษัท ตัวอย่าง เอ็นจิเนียริ่ง จำกัด', nameEn: 'Sample Engineering Co., Ltd.', taxId: '0105566000001', branch: 'สำนักงานใหญ่',
      address: '99/9 ถนนพหลโยธิน แขวงจตุจักร เขตจตุจักร กรุงเทพมหานคร 10900', phone: '02-123-4567', email: 'account@sample.co.th',
      businessType: 'mixed', vatRegistered: true, vatRate: 7, vatPoint: 'payment', signName: 'นายพัฒนพร ตัวอย่าง',
    });

    const C = (code, name, type, extra = {}) => { const c = { id: id(), code, name, type, entityType: 'company', branch: 'สำนักงานใหญ่', creditDays: 30, ...extra }; s.contacts.push(c); return c; };
    const bjc = C('C0001', 'บริษัท บีเจซี เพาเวอร์ จำกัด', 'customer', { taxId: '0105551234567', address: '123 ถนนวิภาวดีรังสิต แขวงลาดยาว เขตจตุจักร กรุงเทพฯ 10900', phone: '02-555-0101', contactPerson: 'คุณวรวุฒิ', contactPhone: '081-234-5678', defaultWht: 3 });
    const green = C('C0002', 'บริษัท กรีนเอนเนอร์จี โซลูชั่น จำกัด', 'customer', { taxId: '0105559876543', address: '55 นิคมอุตสาหกรรมอมตะนคร จ.ชลบุรี 20000', phone: '038-111-222', contactPerson: 'คุณอรอุมา', contactPhone: '086-555-1212', creditDays: 45, defaultWht: 3 });
    const somchai = C('C0003', 'คุณสมชาย ใจดี', 'customer', { entityType: 'individual', taxId: '3100500123456', address: '88 หมู่ 3 ต.บางพูด อ.ปากเกร็ด จ.นนทบุรี 11120', creditDays: 0 });
    const itsup = C('S0001', 'บริษัท โซลาร์ซัพพลาย จำกัด', 'supplier', { taxId: '0105560011223', address: '77 ถนนบางนา-ตราด กม.5 สมุทรปราการ', creditDays: 30 });
    const mea = C('S0002', 'การไฟฟ้านครหลวง', 'supplier', { taxId: '0994000165510', address: '30 ซอยชิดลม ถนนเพลินจิต ปทุมวัน กรุงเทพฯ', creditDays: 0 });
    const landlord = C('S0003', 'นางสาวมาลี เจ้าของอาคาร', 'supplier', { entityType: 'individual', taxId: '3101200456789', creditDays: 0, defaultWht: 5 });
    const drafter = C('S0004', 'นายวิชัย ช่างเขียนแบบ', 'supplier', { entityType: 'individual', taxId: '1100700998877', creditDays: 15, defaultWht: 3 });

    const P = (code, name, type, unit, salePrice, costPrice, extra = {}) => { const p = { id: id(), code, name, type, unit, salePrice, costPrice, ...extra }; s.products.push(p); return p; };
    const dwg = P('PD-000001', 'DWG.For Construction BigC', 'service', 'งาน', 25000, 0);
    const design = P('PD-000002', 'ออกแบบระบบ Solar Rooftop', 'service', 'งาน', 45000, 0);
    const panel = P('PD-000003', 'แผงโซลาร์เซลล์ Mono 550W', 'goods', 'แผง', 4500, 3200, { reorder: 10 });
    const inverter = P('PD-000004', 'อินเวอร์เตอร์ 10kW 3 เฟส', 'goods', 'เครื่อง', 38000, 29000, { reorder: 2 });
    P('PD-000005', 'ค่าบริการเขียนแบบภายนอก', 'expense', 'งาน', 0, 8000, { expenseAccount: '5270' });

    const it = (p, qty, price, description) => ({ productId: p ? p.id : '', description: description || p.name, qty, unit: p ? p.unit : 'งาน', price: price ?? (p ? p.salePrice : 0), discount: 0, account: '' });
    const doc = (type, date, contact, items, extra = {}) => {
      const d = { id: id(), type, no: Store.nextNo(type, date), date, dueDate: U.addDays(date, type === 'QT' ? 30 : contact.creditDays || 0), contactId: contact.id, items,
        discount: 0, vatMode: 'exclusive', whtRate: 0, note: '', reference: '', refId: '', status: 'approved',
        contactName: contact.contactPerson || '', contactPhone: contact.contactPhone || '', contactEmail: '', salesPerson: type === 'QT' || type === 'BN' || type === 'RC' ? 'นายณัฐพล วิศวกร' : 'นางสาวปวีณา บัญชีดี', salesPhone: '089-123-4567', project: '', payAccount: '1120', payMethod: 'transfer', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...extra };
      s.documents.push(d); return d;
    };
    const chain = (qtDate, contact, items, { bnAfter = 3, rcAfter = 20, wht = 3, paid = true, note = '' } = {}) => {
      const qt = doc('QT', qtDate, contact, items, { note: note || 'ยืนราคา 30 วัน · ชำระเงินภายใน 30 วันหลังวางบิล', whtRate: 0 });
      const bnDate = U.addDays(qtDate, bnAfter); if (bnDate > today) return;
      const bn = doc('BN', bnDate > today ? today : bnDate, contact, JSON.parse(JSON.stringify(items)), { refId: qt.id, reference: qt.no, whtRate: wht });
      const rcDate = U.addDays(bn.date, rcAfter);
      if (paid && rcDate <= today) doc('RC', rcDate, contact, JSON.parse(JSON.stringify(items)), { refId: bn.id, reference: bn.no, whtRate: wht });
    };

    // ยอดยกมา
    s.journals.push({ id: id(), no: Store.nextNo('JV', fy), date: fy, desc: 'บันทึกยอดยกมา / ทุนจดทะเบียน', status: 'approved',
      lines: [{ acc: '1110', dr: 50000, cr: 0, memo: 'เงินสดยกมา' }, { acc: '1120', dr: 650000, cr: 0, memo: 'เงินฝากธนาคารยกมา' }, { acc: '3100', dr: 0, cr: 1000000, memo: 'ทุนจดทะเบียน' }, { acc: '3200', dr: 300000, cr: 0, memo: 'ขาดทุนสะสมยกมา' }] });
    s.stockAdjustments.push({ id: id(), no: Store.nextNo('ADJ', fy), date: fy, productId: panel.id, qty: 20, unitCost: 3100, reason: 'opening', note: 'สินค้ายกมา' });

    // สินทรัพย์
    s.assets.push({ id: id(), code: 'FA0001', name: 'คอมพิวเตอร์ Workstation สำหรับเขียนแบบ 2 เครื่อง', category: 'computer', acquireDate: D(0, 15), cost: 90000, salvage: 1, lifeYears: 3, payAccount: '1120' });
    s.assets.push({ id: id(), code: 'FA0002', name: 'เฟอร์นิเจอร์สำนักงาน', category: 'furniture', acquireDate: D(0, 20), cost: 60000, salvage: 1, lifeYears: 5, payAccount: '1120' });

    // ซื้อสินค้า (ทุกไตรมาส)
    for (let m = 0; m <= curM; m += 3) {
      doc('GR', D(m, 2), itsup, [it(panel, 25, 3300 - m * 10), it(inverter, 2, 29000)], { payment: { paid: true, date: D(m, 20), account: '1120' }, taxInvoiceNo: `IV-${U.pad(m + 1)}-0012`, taxInvoiceDate: D(m, 2) });
    }

    // ยอดขายรายเดือน
    const months = Math.max(1, curM);
    for (let m = 0; m < months; m++) {
      const cust = [bjc, green, bjc][m % 3];
      chain(D(m, 3), cust, [it(design, 1, 85000 + (m % 4) * 12000)], { rcAfter: 18 });
      if (m % 2 === 1) chain(D(m, 12), green, [it(panel, 8 + m, 4500), it(inverter, 1, 38000), it(null, 1, 15000, 'ค่าติดตั้งระบบ')], { rcAfter: 25 });
      // ค่าเช่า (หัก 5%) และค่าไฟ
      doc('EX', D(m, 1), landlord, [{ ...it(null, 1, 15000, `ค่าเช่าสำนักงาน ${U.thMonth(D(m, 1).slice(0, 7))}`), account: '5210', unit: 'เดือน' }], { vatMode: 'none', whtRate: 5, payment: { paid: true, date: D(m, 1), account: '1120' } });
      doc('EX', D(m, 25), mea, [{ ...it(null, 1, 2800 + (m % 3) * 350, 'ค่าไฟฟ้า'), account: '5220', unit: 'เดือน' }], { payment: { paid: true, date: D(m, 25), account: '1120' } });
    }
    // ขายสด
    doc('RC', D(Math.max(0, curM - 1), 18), somchai, [it(panel, 4, 4500), it(null, 1, 5000, 'ค่าติดตั้ง')], { payMethod: 'cash', payAccount: '1110' });

    // ใบเสนอราคาเดือนก่อน (เหมือนตัวอย่างหน้าจอ) — รอวางบิล
    const lm = Math.max(0, curM - 1);
    doc('QT', D(lm, 6), bjc, [it(dwg, 1, 105000, 'DWG.For Construction BigC ราชดำริ 781.20 kWp')]);
    doc('QT', D(lm, 7), bjc, [it(dwg, 1, 25000, 'DWG.For Construction BigC ราชดำริ 781.20 kWp')]);
    doc('QT', D(lm, 7), bjc, [it(dwg, 1, 25000, 'DWG.For Construction BigC อยุธยา 1,953.00 kWp')]);
    doc('QT', D(lm, 7), bjc, [it(dwg, 1, 25000, 'DWG.For Construction BigC เพชรบุรี 1976.50 kWp')]);
    doc('QT', D(lm, 7), bjc, [it(dwg, 1, 30000, 'DWG.For Construction BigC พิษณุโลก 4.4 MWp')]);
    doc('QT', today, green, [it(design, 1, 65000)], { status: 'pending' });

    // ใบวางบิลเกินกำหนด + ค้างจ่าย
    const over = U.addDays(today, -50);
    doc('BN', over >= fy ? over : fy, green, [it(design, 1, 52000, 'ออกแบบระบบ Solar Rooftop โรงงานชลบุรี เฟส 2')], { whtRate: 3 });
    doc('GR', U.addDays(today, -20), drafter, [{ ...it(null, 2, 8000, 'จ้างเขียนแบบ As-built'), account: '5270' }], { vatMode: 'none', whtRate: 3, payment: { paid: false } });
    doc('PO', U.addDays(today, -2), itsup, [it(panel, 40, 3250), it(inverter, 2, 28500)], { status: 'approved' });

    // พนักงาน + เงินเดือน
    const e1 = { id: id(), code: 'EMP0001', name: 'นายณัฐพล วิศวกร', position: 'วิศวกรออกแบบ', department: 'วิศวกรรม', salary: 38000, sso: true, active: true, bank: 'กสิกรไทย 123-4-56789-0', idCard: '1100100223344', extraAllowance: 0 };
    const e2 = { id: id(), code: 'EMP0002', name: 'นางสาวปวีณา บัญชีดี', position: 'เจ้าหน้าที่บัญชี', department: 'บัญชี', salary: 22000, sso: true, active: true, bank: 'ไทยพาณิชย์ 987-6-54321-0', idCard: '1100100556677' };
    const e3 = { id: id(), code: 'EMP0003', name: 'นายกิตติ ช่างไฟ', position: 'ช่างติดตั้ง', department: 'ติดตั้ง', salary: 16000, sso: true, active: true, bank: 'กรุงไทย 111-2-33333-4', idCard: '1100100889900' };
    s.employees.push(e1, e2, e3);
    for (let m = 0; m < months; m++) {
      const [y, mm] = D(m, 1).split('-').map(Number);
      const pd = U.monthEnd(y, mm) > today ? today : U.monthEnd(y, mm);
      s.payrolls.push({ id: id(), no: Store.nextNo('PS', pd), period: `${y}-${U.pad(mm)}`, payDate: pd, payAccount: '1120', status: 'approved',
        lines: [e1, e2, e3].map((e) => ({ employeeId: e.id, salary: e.salary, ot: e === e3 ? 1500 : 0, bonus: 0, otherIncome: 0, deduct: 0, whtOverride: '' })) });
    }
    Store.save();
  },
};
