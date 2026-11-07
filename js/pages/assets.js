/* ============================================================
 * Fixed assets & straight-line depreciation
 * ============================================================ */
Pages.assets = (view) => {
  App.setTitle('สินทรัพย์');
  const today = U.today();
  const list = [...Store.state.assets].sort((a, b) => (a.code || '').localeCompare(b.code || ''));
  const rows = list.map((a) => { const sch = ACC.depSchedule(a, today); const acc = sch.length ? sch[sch.length - 1].accum : 0; return { a, acc, nbv: U.r2(+a.cost - acc), monthly: sch.length ? sch[0].amount : U.r2((+a.cost - +a.salvage) / ((+a.lifeYears || 1) * 12)) }; });
  const tCost = U.sum(rows, (r) => r.a.cost), tAcc = U.sum(rows, (r) => r.acc), tNbv = U.sum(rows, (r) => r.nbv);
  const cats = { building: 'อาคาร', equipment: 'เครื่องมือ/อุปกรณ์', computer: 'คอมพิวเตอร์', vehicle: 'ยานพาหนะ', furniture: 'เครื่องตกแต่งสำนักงาน', other: 'อื่นๆ' };

  view.innerHTML = `
  <div class="page-head"><div><h2>สินทรัพย์ถาวร</h2><p>ทะเบียนสินทรัพย์ คิดค่าเสื่อมราคาแบบเส้นตรงรายเดือน และลงบัญชีอัตโนมัติทุกสิ้นเดือน</p></div>
    <button class="btn btn-primary" onclick="Pages.assetForm()">${U.icon('plus')}เพิ่มสินทรัพย์</button></div>
  <div class="grid g3 mb-2">
    <div class="card kpi"><div class="kpi-ic tone-blue">${U.icon('building-2')}</div><div><div class="kpi-label">ราคาทุนรวม</div><div class="kpi-value">${U.money(tCost)}</div><div class="kpi-sub">${list.length} รายการ</div></div></div>
    <div class="card kpi"><div class="kpi-ic tone-orange">${U.icon('trending-down')}</div><div><div class="kpi-label">ค่าเสื่อมราคาสะสม</div><div class="kpi-value">${U.money(tAcc)}</div><div class="kpi-sub">ถึงวันที่ ${U.thDate(today)}</div></div></div>
    <div class="card kpi"><div class="kpi-ic tone-green">${U.icon('scale')}</div><div><div class="kpi-label">มูลค่าสุทธิตามบัญชี</div><div class="kpi-value">${U.money(tNbv)}</div><div class="kpi-sub">ค่าเสื่อม/เดือน ${U.money(U.sum(rows.filter((r) => r.nbv > +r.a.salvage), (r) => r.monthly))}</div></div></div>
  </div>
  <div class="card"><div class="table-wrap">${rows.length ? `<table class="tbl"><thead><tr><th>รหัส</th><th>ชื่อสินทรัพย์</th><th>หมวด</th><th>วันที่ได้มา</th><th class="num">อายุ (ปี)</th><th class="num">ราคาทุน</th><th class="num">ค่าเสื่อม/เดือน</th><th class="num">ค่าเสื่อมสะสม</th><th class="num">มูลค่าสุทธิ</th><th></th></tr></thead><tbody>
    ${rows.map(({ a, acc, nbv, monthly }) => `<tr><td class="fw-6">${U.esc(a.code)}</td><td>${U.esc(a.name)}</td><td>${cats[a.category] || '-'}</td><td>${U.thDate(a.acquireDate)}</td><td class="num">${a.lifeYears}</td>
      <td class="num">${U.money(a.cost)}</td><td class="num">${U.money(monthly)}</td><td class="num">${U.money(acc)}</td><td class="num fw-6">${U.money(nbv)}</td>
      <td class="actions"><button class="icon-btn" title="ตารางค่าเสื่อม" onclick="Pages.assetSchedule('${a.id}')">${U.icon('table')}</button><button class="icon-btn" onclick="Pages.assetForm('${a.id}')">${U.icon('pencil')}</button><button class="icon-btn danger" onclick="Pages.assetDelete('${a.id}')">${U.icon('trash-2')}</button></td></tr>`).join('')}
    </tbody><tfoot><tr><td colspan="5">รวม</td><td class="num">${U.money(tCost)}</td><td></td><td class="num">${U.money(tAcc)}</td><td class="num">${U.money(tNbv)}</td><td></td></tr></tfoot></table>`
    : `<div class="empty">${U.icon('building-2')}<h4>ยังไม่มีสินทรัพย์</h4><p>เพิ่มอาคาร อุปกรณ์ คอมพิวเตอร์ ยานพาหนะ เพื่อคำนวณค่าเสื่อมราคาอัตโนมัติ</p></div>`}</div></div>`;
};

Pages.assetForm = (id) => {
  const a = id ? { ...Store.get('assets', id) } : { code: Store.nextCode('assets', 'FA'), category: 'equipment', acquireDate: U.today(), lifeYears: 5, salvage: 1, payAccount: '1120' };
  const life = { building: 20, equipment: 5, computer: 3, vehicle: 5, furniture: 5, other: 5 };
  U.modal({
    title: id ? 'แก้ไขสินทรัพย์' : 'เพิ่มสินทรัพย์', size: 'lg',
    body: `<div class="form-grid">
      <div class="field"><label>รหัส</label><input name="code" value="${U.esc(a.code)}"></div>
      <div class="field"><label>หมวด</label><select name="category">${[['building', 'อาคาร (20 ปี)'], ['equipment', 'เครื่องมือ/อุปกรณ์ (5 ปี)'], ['computer', 'คอมพิวเตอร์ (3 ปี)'], ['vehicle', 'ยานพาหนะ (5 ปี)'], ['furniture', 'เครื่องตกแต่งสำนักงาน (5 ปี)'], ['other', 'อื่นๆ']].map(([v, l]) => U.opt(v, l, a.category)).join('')}</select></div>
      <div class="field full"><label class="req">ชื่อสินทรัพย์</label><input name="name" value="${U.esc(a.name || '')}"></div>
      <div class="field"><label>วันที่ได้มา</label><input type="date" name="acquireDate" value="${a.acquireDate}"></div>
      <div class="field"><label>ราคาทุน (ไม่รวม VAT)</label><input type="number" class="num" step="any" name="cost" value="${a.cost || 0}"></div>
      <div class="field"><label>อายุการใช้งาน (ปี)</label><input type="number" step="any" min="0.5" name="lifeYears" value="${a.lifeYears}"></div>
      <div class="field"><label>มูลค่าซาก</label><input type="number" class="num" step="any" name="salvage" value="${a.salvage ?? 1}"><span class="hint">นิยมตั้ง 1 บาท</span></div>
      <div class="field full"><label>การบันทึกการได้มา</label><select name="payAccount">
        <option value="">ไม่บันทึก (บันทึกผ่านเอกสารค่าใช้จ่าย / ยอดยกมาแล้ว)</option>
        ${Store.payAccounts().map((x) => U.opt(x.code, `Dr อาคารและอุปกรณ์ / Cr ${x.code} ${x.name}`, a.payAccount)).join('')}
        ${U.opt('2110', 'Dr อาคารและอุปกรณ์ / Cr 2110 เจ้าหนี้การค้า', a.payAccount)}${U.opt('3100', 'Dr อาคารและอุปกรณ์ / Cr 3100 ทุน (นำมาลงทุน)', a.payAccount)}</select></div>
      <div class="field"><label>วันที่จำหน่าย/ตัดบัญชี (ถ้ามี)</label><input type="date" name="disposeDate" value="${a.disposeDate || ''}"></div>
    </div>`,
    footer: `<button class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-primary" data-ok>บันทึก</button>`,
    onOpen: (root, close) => {
      const cat = root.querySelector('[name=category]');
      cat.onchange = () => { root.querySelector('[name=lifeYears]').value = life[cat.value]; };
      root.querySelector('[data-ok]').onclick = () => {
        const f = U.formData(root);
        if (!f.name || !(+f.cost > 0)) return U.toast('กรุณากรอกชื่อและราคาทุน', 'error');
        if (+f.salvage >= +f.cost) return U.toast('มูลค่าซากต้องน้อยกว่าราคาทุน', 'error');
        Store.upsert('assets', { ...a, ...f }); close(); U.toast('บันทึกสินทรัพย์แล้ว'); App.render();
      };
    },
  });
};

Pages.assetDelete = async (id) => {
  if (!(await U.confirm('ลบสินทรัพย์นี้? รายการค่าเสื่อมราคาทั้งหมดจะถูกถอนออกจากบัญชี', { danger: true }))) return;
  Store.remove('assets', id); App.render();
};

Pages.assetSchedule = (id) => {
  const a = Store.get('assets', id);
  const sch = ACC.depSchedule(a);
  const today = U.today();
  U.modal({
    title: `ตารางค่าเสื่อมราคา: ${U.esc(a.name)}`, size: 'lg',
    body: `<p class="mt-0 muted">ราคาทุน ${U.money(a.cost)} · ซาก ${U.money(a.salvage)} · ${a.lifeYears} ปี · วิธีเส้นตรง</p>
    <table class="tbl compact"><thead><tr><th>#</th><th>งวด (สิ้นเดือน)</th><th class="num">ค่าเสื่อมราคา</th><th class="num">ค่าเสื่อมสะสม</th><th class="num">มูลค่าสุทธิ</th><th></th></tr></thead><tbody>
    ${sch.map((x, i) => `<tr><td>${i + 1}</td><td>${U.thDate(x.date)}</td><td class="num">${U.money(x.amount)}</td><td class="num">${U.money(x.accum)}</td><td class="num">${U.money(x.nbv)}</td><td>${x.date <= today ? '<span class="chip chip-paid">ลงบัญชีแล้ว</span>' : ''}</td></tr>`).join('')}
    </tbody></table>`,
  });
};
