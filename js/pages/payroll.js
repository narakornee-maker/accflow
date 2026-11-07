/* ============================================================
 * Payroll: พนักงาน / รอบจ่ายเงินเดือน / ประกันสังคม / ภ.ง.ด.1
 * ============================================================ */
Pages.payroll = (view, tab = 'runs', id, query = {}) => {
  if (tab === 'run') return Pages.payrollRun(view, id);
  if (!['runs', 'employees'].includes(tab)) tab = 'runs';
  App.setTitle('จ่ายเงินเดือน');
  const s = Store.state;
  const runs = [...s.payrolls].sort((a, b) => b.period.localeCompare(a.period));
  const emps = [...s.employees].sort((a, b) => (a.code || '').localeCompare(b.code || ''));
  const active = emps.filter((e) => e.active !== false);
  const p = s.settings.payroll;

  view.innerHTML = `
  <div class="page-head"><div><h2>จ่ายเงินเดือน (Payroll)</h2><p>คำนวณประกันสังคม ${p.ssoRate}% (ฐาน ${U.money(p.ssoMin)}–${U.money(p.ssoMax)}) และภาษีหัก ณ ที่จ่าย ภ.ง.ด.1 อัตโนมัติ</p></div>
    <div class="btn-group"><button class="btn btn-outline" onclick="Pages.employeeForm()">${U.icon('user-plus')}เพิ่มพนักงาน</button>
    <a class="btn btn-primary" href="#/payroll/run/new">${U.icon('plus')}สร้างรอบจ่ายเงินเดือน</a></div></div>
  <div class="grid g3 mb-2">
    <div class="card kpi"><div class="kpi-ic tone-blue">${U.icon('users')}</div><div><div class="kpi-label">พนักงาน</div><div class="kpi-value">${active.length}</div><div class="kpi-sub">ทั้งหมด ${emps.length} คน</div></div></div>
    <div class="card kpi"><div class="kpi-ic tone-violet">${U.icon('wallet')}</div><div><div class="kpi-label">เงินเดือนรวม/เดือน</div><div class="kpi-value">${U.money(U.sum(active, (e) => e.salary))}</div><div class="kpi-sub">ตามฐานเงินเดือนปัจจุบัน</div></div></div>
    <div class="card kpi"><div class="kpi-ic tone-green">${U.icon('calendar-check')}</div><div><div class="kpi-label">จ่ายล่าสุด</div><div class="kpi-value" style="font-size:19px">${runs[0] ? U.thMonth(runs[0].period) : '-'}</div><div class="kpi-sub">${runs[0] ? 'สุทธิ ' + U.money(ACC.calcPayroll(runs[0]).net) : 'ยังไม่มีรอบจ่าย'}</div></div></div>
  </div>
  <div class="card">
    <div class="tabs"><a href="#/payroll" class="${tab === 'runs' ? 'active' : ''}">${U.icon('calendar-range')}รอบจ่ายเงินเดือน</a><a href="#/payroll/employees" class="${tab === 'employees' ? 'active' : ''}">${U.icon('id-card')}พนักงาน</a></div>
    <div class="table-wrap">${tab === 'runs' ? (runs.length ? `<table class="tbl"><thead><tr><th>เลขที่</th><th>งวด</th><th>วันที่จ่าย</th><th>สถานะ</th><th class="num">คน</th><th class="num">รวมเงินได้</th><th class="num">ประกันสังคม</th><th class="num">ภ.ง.ด.1</th><th class="num">จ่ายสุทธิ</th></tr></thead><tbody>
      ${runs.map((r) => { const c = ACC.calcPayroll(r); return `<tr class="clickable" onclick="location.hash='#/payroll/run/${r.id}'"><td class="doc-link"><a href="#/payroll/run/${r.id}">${U.esc(r.no)}</a></td><td>${U.thMonth(r.period)}</td><td>${U.thDate(r.payDate)}</td>
        <td><span class="chip chip-${r.status === 'approved' ? 'paid' : 'draft'}">${r.status === 'approved' ? 'จ่ายแล้ว' : 'ร่าง'}</span></td><td class="num">${c.lines.length}</td><td class="num">${U.money(c.gross)}</td><td class="num">${U.money(c.sso)}</td><td class="num">${U.money(c.wht)}</td><td class="num fw-6">${U.money(c.net)}</td></tr>`; }).join('')}
      </tbody></table>` : `<div class="empty">${U.icon('calendar-range')}<h4>ยังไม่มีรอบจ่ายเงินเดือน</h4><p>${emps.length ? 'สร้างรอบจ่ายเงินเดือนแรกของคุณ' : 'เพิ่มพนักงานก่อน แล้วสร้างรอบจ่ายเงินเดือน'}</p></div>`)
    : (emps.length ? `<table class="tbl"><thead><tr><th>รหัส</th><th>ชื่อ-สกุล</th><th>ตำแหน่ง</th><th>เลขบัตรประชาชน</th><th>บัญชีธนาคาร</th><th class="num">เงินเดือน</th><th>ประกันสังคม</th><th>สถานะ</th><th></th></tr></thead><tbody>
      ${emps.map((e) => `<tr><td class="fw-6">${U.esc(e.code)}</td><td>${U.esc(e.name)}</td><td>${U.esc(e.position || '-')}</td><td>${U.esc(e.idCard || '-')}</td><td class="small">${U.esc(e.bank || '-')}</td>
        <td class="num">${U.money(e.salary)}</td><td>${e.sso === false ? '<span class="muted">ไม่เข้า</span>' : 'เข้า'}</td><td>${e.active === false ? '<span class="chip chip-void">ลาออก</span>' : '<span class="chip chip-paid">ทำงาน</span>'}</td>
        <td class="actions"><button class="icon-btn" onclick="Pages.employeeForm('${e.id}')">${U.icon('pencil')}</button><button class="icon-btn danger" onclick="Pages.employeeDelete('${e.id}')">${U.icon('trash-2')}</button></td></tr>`).join('')}
      </tbody></table>` : `<div class="empty">${U.icon('users')}<h4>ยังไม่มีพนักงาน</h4></div>`)}</div>
  </div>`;
};

Pages.employeeForm = (id) => {
  const e = id ? { ...Store.get('employees', id) } : { code: Store.nextCode('employees', 'EMP'), salary: 15000, sso: true, active: true, startDate: U.today() };
  U.modal({
    title: id ? 'แก้ไขพนักงาน' : 'เพิ่มพนักงาน', size: 'lg',
    body: `<div class="form-grid">
      <div class="field"><label>รหัสพนักงาน</label><input name="code" value="${U.esc(e.code)}"></div>
      <div class="field"><label class="req">ชื่อ-สกุล</label><input name="name" value="${U.esc(e.name || '')}"></div>
      <div class="field"><label>ตำแหน่ง</label><input name="position" value="${U.esc(e.position || '')}"></div>
      <div class="field"><label>แผนก</label><input name="department" value="${U.esc(e.department || '')}"></div>
      <div class="field"><label>เลขบัตรประชาชน</label><input name="idCard" maxlength="13" value="${U.esc(e.idCard || '')}"></div>
      <div class="field"><label>วันเริ่มงาน</label><input type="date" name="startDate" value="${e.startDate || ''}"></div>
      <div class="field"><label>เงินเดือน (บาท)</label><input type="number" class="num" name="salary" value="${e.salary || 0}"></div>
      <div class="field"><label>ค่าลดหย่อนเพิ่มเติม/ปี (คู่สมรส บุตร ประกัน ฯลฯ)</label><input type="number" class="num" name="extraAllowance" value="${e.extraAllowance || 0}"></div>
      <div class="field full"><label>บัญชีธนาคาร</label><input name="bank" value="${U.esc(e.bank || '')}" placeholder="ธนาคาร / เลขที่บัญชี"></div>
      <label class="check"><input type="checkbox" name="sso" ${e.sso !== false ? 'checked' : ''}> เข้าระบบประกันสังคม</label>
      <label class="check"><input type="checkbox" name="active" ${e.active !== false ? 'checked' : ''}> ยังทำงานอยู่</label>
    </div>`,
    footer: `<button class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-primary" data-ok>บันทึก</button>`,
    onOpen: (root, close) => {
      root.querySelector('[data-ok]').onclick = () => {
        const f = U.formData(root);
        if (!f.name) return U.toast('กรุณากรอกชื่อ', 'error');
        Store.upsert('employees', { ...e, ...f }); close(); U.toast('บันทึกพนักงานแล้ว'); App.render();
      };
    },
  });
};

Pages.employeeDelete = async (id) => {
  if (Store.state.payrolls.some((r) => r.lines.some((l) => l.employeeId === id))) return U.toast('พนักงานมีประวัติการจ่ายเงินเดือน ให้ตั้งเป็น “ลาออก” แทน', 'error');
  if (!(await U.confirm('ลบพนักงานนี้?', { danger: true }))) return;
  Store.remove('employees', id); App.render();
};

Pages.payrollRun = (view, id) => {
  const s = Store.state;
  let run;
  if (!id || id === 'new') {
    const ym = U.today().slice(0, 7); const [y, m] = ym.split('-').map(Number);
    run = { id: null, no: '', period: ym, payDate: U.monthEnd(y, m), payAccount: '1120', status: 'draft',
      lines: s.employees.filter((e) => e.active !== false).map((e) => ({ employeeId: e.id, salary: +e.salary || 0, ot: 0, bonus: 0, otherIncome: 0, deduct: 0, whtOverride: '' })) };
    if (!run.lines.length) { U.toast('กรุณาเพิ่มพนักงานก่อน', 'error'); location.replace('#/payroll/employees'); return; }
  } else {
    run = JSON.parse(JSON.stringify(Store.get('payrolls', id) || {}));
    if (!run.id) { view.innerHTML = '<div class="card"><div class="empty"><h4>ไม่พบรอบจ่าย</h4></div></div>'; return; }
  }
  const locked = run.status === 'approved';
  const dis = locked ? 'disabled' : '';
  App.setTitle(run.no ? `เงินเดือน ${run.no}` : 'สร้างรอบจ่ายเงินเดือน');

  view.innerHTML = `
  <div class="doc-head"><div class="title"><a class="icon-btn" href="#/payroll">${U.icon('arrow-left')}</a><div><h2>รอบจ่ายเงินเดือน ${run.no ? U.esc(run.no) : ''}</h2>
    <div class="muted small">${locked ? '<span class="chip chip-paid">อนุมัติจ่ายแล้ว · ลงบัญชีแล้ว</span>' : 'ตรวจสอบตัวเลข แล้วกด “อนุมัติจ่าย” เพื่อลงบัญชี'}</div></div></div>
    <div class="btn-group">${locked ? `<button class="btn btn-outline" id="pr-unlock">${U.icon('pencil')}แก้ไข</button><button class="btn btn-outline" id="pr-slips">${U.icon('printer')}พิมพ์สลิปทั้งหมด</button>`
      : `<button class="btn btn-outline" data-act="draft">${U.icon('save')}บันทึกร่าง</button><button class="btn btn-primary" data-act="approved">${U.icon('check-circle-2')}อนุมัติจ่าย</button>`}
      ${run.id && !locked ? `<button class="icon-btn danger" id="pr-del" title="ลบ">${U.icon('trash-2')}</button>` : ''}</div></div>
  <div class="card"><div class="card-body form-grid g3">
    <div class="field"><label>งวดเดือน</label><input type="month" id="pr-period" value="${run.period}" ${dis}></div>
    <div class="field"><label>วันที่จ่าย</label><input type="date" id="pr-date" value="${run.payDate}" ${dis}></div>
    <div class="field"><label>จ่ายจากบัญชี</label><select id="pr-acc" ${dis}>${Store.payAccounts().map((a) => U.opt(a.code, `${a.code} ${a.name}`, run.payAccount)).join('')}</select></div>
  </div></div>
  <div class="card"><div class="card-body p0 table-wrap" id="pr-table"></div></div>
  <div class="alert alert-info mt-2">${U.icon('info')}<div>ภาษีหัก ณ ที่จ่ายคำนวณจากรายได้ทั้งปี (×12) หักค่าใช้จ่าย ${s.settings.payroll.expenseRate}% (ไม่เกิน ${U.money(s.settings.payroll.expenseMax)}) ค่าลดหย่อนส่วนตัว ${U.money(s.settings.payroll.personalAllowance)} และประกันสังคม แล้วคิดอัตราก้าวหน้า ÷ 12 — ระบุ “ภาษีกำหนดเอง” เพื่อแทนค่า
    <br>บันทึกบัญชี: Dr เงินเดือน + ประกันสังคมนายจ้าง / Cr เงินฝากธนาคาร, ประกันสังคมค้างจ่าย, ภาษีหัก ณ ที่จ่ายค้างจ่าย</div></div>`;

  const renderTable = () => {
    const c = ACC.calcPayroll(run);
    const inp = (i, k, v) => `<input type="number" class="num input-sm" step="any" data-i="${i}" data-k="${k}" value="${v}" ${dis} style="width:100px">`;
    U.$('#pr-table').innerHTML = `<table class="tbl"><thead><tr><th>พนักงาน</th><th class="num">เงินเดือน</th><th class="num">OT</th><th class="num">โบนัส</th><th class="num">รายได้อื่น</th><th class="num">รวมเงินได้</th>
      <th class="num">ประกันสังคม</th><th class="num">ภาษีกำหนดเอง</th><th class="num">ภ.ง.ด.1</th><th class="num">หักอื่น</th><th class="num">สุทธิ</th><th></th></tr></thead><tbody>
      ${c.lines.map((l, i) => { const e = Store.get('employees', l.employeeId) || {}; return `<tr><td><b>${U.esc(e.name || '-')}</b><div class="muted small">${U.esc(e.position || '')}</div></td>
        <td class="num">${inp(i, 'salary', l.salary)}</td><td class="num">${inp(i, 'ot', l.ot)}</td><td class="num">${inp(i, 'bonus', l.bonus)}</td><td class="num">${inp(i, 'otherIncome', run.lines[i].otherIncome || 0)}</td>
        <td class="num fw-6">${U.money(l.gross)}</td><td class="num">${U.money(l.sso)}</td>
        <td class="num"><input type="number" class="num input-sm" step="any" data-i="${i}" data-k="whtOverride" value="${run.lines[i].whtOverride ?? ''}" placeholder="อัตโนมัติ" ${dis} style="width:100px"></td>
        <td class="num">${U.money(l.wht)}</td><td class="num">${inp(i, 'deduct', l.deduct)}</td><td class="num fw-7 text-primary">${U.money(l.net)}</td>
        <td class="actions">${run.id ? `<button class="icon-btn" title="สลิปเงินเดือน" onclick="Print.payslip('${run.id}', ${i})">${U.icon('printer')}</button>` : ''}${locked ? '' : `<button class="icon-btn danger" data-del="${i}">${U.icon('x')}</button>`}</td></tr>`; }).join('')}
      </tbody><tfoot><tr><td>รวม ${c.lines.length} คน</td><td class="num">${U.money(U.sum(c.lines, (l) => l.salary))}</td><td class="num">${U.money(U.sum(c.lines, (l) => l.ot))}</td><td class="num">${U.money(U.sum(c.lines, (l) => l.bonus))}</td><td class="num">${U.money(U.sum(c.lines, (l) => l.other))}</td>
        <td class="num">${U.money(c.gross)}</td><td class="num">${U.money(c.sso)}</td><td></td><td class="num">${U.money(c.wht)}</td><td class="num">${U.money(c.deduct)}</td><td class="num">${U.money(c.net)}</td><td></td></tr>
      <tr><td colspan="12" class="small" style="font-weight:500">ประกันสังคมส่วนนายจ้าง ${U.money(c.employerSso)} · ยอดนำส่งประกันสังคมรวม ${U.money(c.sso + c.employerSso)} · ต้นทุนค่าแรงรวม ${U.money(c.gross + c.employerSso)}</td></tr></tfoot></table>`;
    U.refreshIcons();
  };
  renderTable();

  const tbl = U.$('#pr-table');
  tbl.addEventListener('change', (e) => {
    const t = e.target; if (!t.dataset.k) return;
    run.lines[+t.dataset.i][t.dataset.k] = t.dataset.k === 'whtOverride' ? (t.value === '' ? '' : +t.value) : +t.value || 0;
    renderTable();
  });
  tbl.addEventListener('click', (e) => { const b = e.target.closest('[data-del]'); if (b) { run.lines.splice(+b.dataset.del, 1); renderTable(); } });
  const per = U.$('#pr-period');
  if (!locked) per.onchange = () => { run.period = per.value; const [y, m] = per.value.split('-').map(Number); run.payDate = U.monthEnd(y, m); U.$('#pr-date').value = run.payDate; };

  U.$$('[data-act]').forEach((b) => b.onclick = () => {
    run.period = per.value; run.payDate = U.$('#pr-date').value; run.payAccount = U.$('#pr-acc').value;
    if (!run.lines.length) return U.toast('ไม่มีรายการพนักงาน', 'error');
    if (s.payrolls.some((r) => r.period === run.period && r.id !== run.id && r.status === 'approved') && b.dataset.act === 'approved') {
      U.toast('มีรอบจ่ายเงินเดือนเดือนนี้ที่อนุมัติแล้ว (จ่ายเพิ่มได้ แต่ควรตรวจสอบ)', 'warning');
    }
    if (!run.no) run.no = Store.nextNo('PS', run.payDate);
    run.status = b.dataset.act;
    const saved = Store.upsert('payrolls', run);
    U.toast(run.status === 'approved' ? 'อนุมัติจ่ายเงินเดือนและลงบัญชีแล้ว' : 'บันทึกร่างแล้ว');
    App.go(`#/payroll/run/${saved.id}`);
  });
  const ul = U.$('#pr-unlock');
  if (ul) ul.onclick = async () => { if (await U.confirm('ยกเลิกอนุมัติเพื่อแก้ไข? รายการบัญชีจะถูกถอนออก')) { const r = Store.get('payrolls', run.id); r.status = 'draft'; Store.upsert('payrolls', r); App.render(); } };
  const sl = U.$('#pr-slips');
  if (sl) sl.onclick = () => Print.payslip(run.id);
  const del = U.$('#pr-del');
  if (del) del.onclick = async () => { if (await U.confirm('ลบรอบจ่ายเงินเดือนนี้?', { danger: true })) { Store.remove('payrolls', run.id); App.go('#/payroll'); } };
};
