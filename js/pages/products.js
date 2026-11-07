/* ============================================================
 * Products & Inventory (สินค้า / บริการ / สต็อก)
 * ============================================================ */
Pages.products = (view, tab = 'list', query = {}) => {
  if (!['list', 'stock'].includes(tab)) tab = 'list';
  App.setTitle('สินค้าและสต็อก');
  const s = Store.state;
  const inv = ACC.inventory();
  const q = (query.q || '').toLowerCase();
  const list = s.products.filter((p) => !q || `${p.code} ${p.name}`.toLowerCase().includes(q)).sort((a, b) => a.code.localeCompare(b.code));
  const stockValue = U.sum(s.products, (p) => (inv.bal[p.id] || {}).value || 0);
  const lowStock = s.products.filter((p) => p.type === 'goods' && +p.reorder > 0 && ((inv.bal[p.id] || {}).qty || 0) <= +p.reorder);
  const tLabel = { goods: 'สินค้า (นับสต็อก)', service: 'บริการ', expense: 'ค่าใช้จ่าย / วัตถุดิบ' };

  view.innerHTML = `
  <div class="page-head"><div><h2>สินค้าและสต็อก</h2><p>สินค้านับสต็อก งานบริการ วัตถุดิบ ค่าใช้จ่าย — ต้นทุนคำนวณแบบถัวเฉลี่ยเคลื่อนที่</p></div>
    <div class="btn-group"><button class="btn btn-outline" onclick="Pages.stockAdjust()">${U.icon('sliders-horizontal')}ปรับปรุงสต็อก</button>
    <button class="btn btn-primary" onclick="Pages.productForm()">${U.icon('plus')}เพิ่มสินค้า/บริการ</button></div></div>
  <div class="grid g3 mb-2">
    <div class="card kpi"><div class="kpi-ic tone-blue">${U.icon('boxes')}</div><div><div class="kpi-label">จำนวนรายการ</div><div class="kpi-value">${s.products.length}</div><div class="kpi-sub">สินค้า ${s.products.filter((p) => p.type === 'goods').length} · บริการ ${s.products.filter((p) => p.type === 'service').length}</div></div></div>
    <div class="card kpi"><div class="kpi-ic tone-green">${U.icon('warehouse')}</div><div><div class="kpi-label">มูลค่าสินค้าคงเหลือ</div><div class="kpi-value">${U.money(stockValue)}</div><div class="kpi-sub">ตรงกับบัญชี 1150 = ${U.money(ACC.balanceOf('1150'))}</div></div></div>
    <div class="card kpi"><div class="kpi-ic tone-orange">${U.icon('alert-triangle')}</div><div><div class="kpi-label">สินค้าใกล้หมด</div><div class="kpi-value">${lowStock.length}</div><div class="kpi-sub">${lowStock.slice(0, 3).map((p) => U.esc(p.name)).join(', ') || 'ไม่มี'}</div></div></div>
  </div>
  <div class="card">
    <div class="tabs"><a href="#/products" class="${tab === 'list' ? 'active' : ''}">${U.icon('package')}รายการสินค้า/บริการ</a><a href="#/products/stock" class="${tab === 'stock' ? 'active' : ''}">${U.icon('history')}ความเคลื่อนไหวสต็อก</a></div>
    ${tab === 'list' ? `
    <div class="toolbar"><div class="search">${U.icon('search')}<input id="p-q" placeholder="ค้นหารหัส/ชื่อสินค้า…" value="${U.esc(query.q || '')}"></div></div>
    <div class="table-wrap">${list.length ? `<table class="tbl"><thead><tr><th>รหัส</th><th>ชื่อสินค้า/บริการ</th><th>ประเภท</th><th>หน่วย</th><th class="num">ราคาขาย</th><th class="num">ทุนเฉลี่ย</th><th class="num">คงเหลือ</th><th class="num">มูลค่า</th><th></th></tr></thead><tbody>
      ${list.map((p) => { const b = inv.bal[p.id] || { qty: 0, value: 0, avg: 0 }; const low = p.type === 'goods' && +p.reorder > 0 && b.qty <= +p.reorder;
        return `<tr><td class="fw-6">${U.esc(p.code)}</td><td>${U.esc(p.name)}${p.description ? `<div class="muted small">${U.esc(p.description)}</div>` : ''}</td><td><span class="tag">${tLabel[p.type] || p.type}</span></td><td>${U.esc(p.unit || '')}</td>
        <td class="num">${U.money(p.salePrice)}</td><td class="num">${p.type === 'goods' ? U.money(b.avg || p.costPrice) : U.money(p.costPrice)}</td>
        <td class="num ${low ? 'text-danger fw-6' : ''}">${p.type === 'goods' ? U.qty(b.qty) : '-'}</td><td class="num">${p.type === 'goods' ? U.money(b.value) : '-'}</td>
        <td class="actions">${p.type === 'goods' ? `<button class="icon-btn" title="ประวัติสต็อก" onclick="Pages.stockCard('${p.id}')">${U.icon('history')}</button>` : ''}
          <button class="icon-btn" onclick="Pages.productForm('${p.id}')">${U.icon('pencil')}</button><button class="icon-btn danger" onclick="Pages.productDelete('${p.id}')">${U.icon('trash-2')}</button></td></tr>`; }).join('')}
      </tbody></table>` : `<div class="empty">${U.icon('package-open')}<h4>ยังไม่มีสินค้า</h4><p>เพิ่มสินค้าหรือบริการเพื่อใช้ในเอกสาร</p></div>`}</div>` : stockTab()}
  </div>`;

  const qi = U.$('#p-q');
  if (qi) qi.addEventListener('input', U.debounce(() => { Pages.products(view, tab, { q: qi.value }); U.refreshIcons(); const n = U.$('#p-q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250));
  if (query.new) { history.replaceState(null, '', '#/products'); setTimeout(() => Pages.productForm(), 50); }

  function stockTab() {
    const moves = [...inv.moves].reverse().slice(0, 300);
    if (!moves.length) return `<div class="empty">${U.icon('history')}<h4>ยังไม่มีความเคลื่อนไหว</h4><p>สต็อกจะเปลี่ยนเมื่ออนุมัติใบรับสินค้า (เข้า) ใบวางบิล/ใบเสร็จขายสด (ออก) หรือปรับปรุงสต็อก</p></div>`;
    return `<div class="table-wrap"><table class="tbl"><thead><tr><th>วันที่</th><th>อ้างอิง</th><th>สินค้า</th><th>ประเภท</th><th class="num">จำนวน</th><th class="num">มูลค่า</th><th class="num">คงเหลือ</th><th class="num">มูลค่าคงเหลือ</th><th></th></tr></thead><tbody>
      ${moves.map((m) => { const p = Store.get('products', m.productId) || {}; return `<tr><td>${U.thDate(m.date)}</td><td>${U.esc(m.ref)}</td><td>${U.esc(p.name || '-')}</td>
        <td>${m.adj ? `<span class="chip chip-info">${m.adj.reason === 'opening' ? 'ยกมา' : 'ปรับปรุง'}</span>` : m.kind === 'in' ? '<span class="chip chip-paid">รับเข้า</span>' : '<span class="chip chip-pending">ขายออก</span>'}</td>
        <td class="num ${m.qty < 0 ? 'text-danger' : 'text-success'}">${m.qty > 0 ? '+' : ''}${U.qty(m.qty)}</td><td class="num">${U.money(m.cost)}</td><td class="num">${U.qty(m.balQty)}</td><td class="num">${U.money(m.balValue)}</td>
        <td class="actions">${m.adj ? `<button class="icon-btn danger" onclick="Pages.stockAdjDelete('${m.adj.id}')">${U.icon('trash-2')}</button>` : ''}</td></tr>`; }).join('')}
      </tbody></table></div>`;
  }
};

Pages.productForm = (id) => {
  const p = id ? { ...Store.get('products', id) } : { type: Store.state.company.businessType === 'service' ? 'service' : 'goods', code: Store.nextCode('products', 'PD-'), unit: 'ชิ้น', salePrice: 0, costPrice: 0 };
  const expAcc = Store.state.accounts.filter((a) => a.type === 'expense');
  U.modal({
    title: id ? 'แก้ไขสินค้า/บริการ' : 'เพิ่มสินค้า/บริการ', size: 'lg',
    body: `<div class="form-grid">
      <div class="field"><label>ประเภท</label><select name="type">${[['goods', 'สินค้า (นับสต็อก)'], ['service', 'บริการ'], ['expense', 'ค่าใช้จ่าย / วัตถุดิบ (ไม่นับสต็อก)']].map(([v, l]) => U.opt(v, l, p.type)).join('')}</select></div>
      <div class="field"><label>รหัสสินค้า</label><input name="code" value="${U.esc(p.code)}"></div>
      <div class="field full"><label class="req">ชื่อสินค้า/บริการ</label><input name="name" value="${U.esc(p.name || '')}"></div>
      <div class="field full"><label>รายละเอียด</label><input name="description" value="${U.esc(p.description || '')}"></div>
      <div class="field"><label>หน่วยนับ</label><input name="unit" value="${U.esc(p.unit || '')}" list="units"><datalist id="units">${['ชิ้น', 'อัน', 'กล่อง', 'ชุด', 'งาน', 'ครั้ง', 'เดือน', 'ชั่วโมง', 'กก.', 'เมตร', 'ลิตร', 'แผ่น'].map((u) => `<option value="${u}">`).join('')}</datalist></div>
      <div class="field"><label>จุดสั่งซื้อซ้ำ (แจ้งเตือนสินค้าใกล้หมด)</label><input type="number" name="reorder" min="0" value="${p.reorder || 0}"></div>
      <div class="field"><label>ราคาขาย / หน่วย</label><input type="number" class="num" step="any" name="salePrice" value="${p.salePrice || 0}"></div>
      <div class="field"><label>ราคาซื้อ / ต้นทุนมาตรฐาน</label><input type="number" class="num" step="any" name="costPrice" value="${p.costPrice || 0}"></div>
      <div class="field full"><label>บัญชีค่าใช้จ่ายเมื่อซื้อ (สำหรับบริการ/ค่าใช้จ่าย)</label><select name="expenseAccount"><option value="">อัตโนมัติ</option>${expAcc.map((a) => U.opt(a.code, `${a.code} ${a.name}`, p.expenseAccount)).join('')}</select></div>
    </div>`,
    footer: `<button class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-primary" data-ok>${U.icon('save')}บันทึก</button>`,
    onOpen: (root, close) => {
      root.querySelector('[data-ok]').onclick = () => {
        const f = U.formData(root);
        if (!f.name) return U.toast('กรุณากรอกชื่อสินค้า', 'error');
        if (Store.state.products.some((x) => x.code === f.code && x.id !== p.id)) return U.toast('รหัสสินค้าซ้ำ', 'error');
        Store.upsert('products', { ...p, ...f }); close(); U.toast('บันทึกสินค้าแล้ว'); App.render();
      };
    },
  });
};

Pages.productDelete = async (id) => {
  if (Store.state.documents.some((d) => (d.items || []).some((i) => i.productId === id)) || Store.state.stockAdjustments.some((a) => a.productId === id)) return U.toast('สินค้านี้ถูกใช้ในเอกสารแล้ว ลบไม่ได้', 'error');
  if (!(await U.confirm('ลบสินค้านี้?', { danger: true, okText: 'ลบ' }))) return;
  Store.remove('products', id); App.render();
};

Pages.stockAdjust = () => {
  const goods = Store.state.products.filter((p) => p.type === 'goods');
  if (!goods.length) return U.toast('ยังไม่มีสินค้าประเภทนับสต็อก', 'error');
  U.modal({
    title: 'ปรับปรุงสต็อก', size: 'md',
    body: `<div class="form-grid">
      <div class="field full"><label>สินค้า</label><select name="productId">${goods.map((p) => U.opt(p.id, `${p.code} · ${p.name}`)).join('')}</select></div>
      <div class="field"><label>วันที่</label><input type="date" name="date" value="${U.today()}"></div>
      <div class="field"><label>เหตุผล</label><select name="reason"><option value="opening">สินค้ายกมา (ต้นงวด)</option><option value="adjust">ตรวจนับ / สูญหาย / เสียหาย</option></select></div>
      <div class="field"><label>จำนวน (+ เพิ่ม / − ลด)</label><input type="number" step="any" name="qty" value="0"></div>
      <div class="field"><label>ต้นทุนต่อหน่วย (กรณีเพิ่ม)</label><input type="number" step="any" class="num" name="unitCost" value="0"></div>
      <div class="field full"><label>หมายเหตุ</label><input name="note"></div>
      <div class="full alert alert-info">${U.icon('info')}<div>ยกมา: Dr สินค้าคงเหลือ / Cr กำไรสะสม · ปรับปรุง: ผลต่างบันทึกเข้าต้นทุนขาย (5100)</div></div>
    </div>`,
    footer: `<button class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-primary" data-ok>บันทึก</button>`,
    onOpen: (root, close) => {
      const sel = root.querySelector('[name=productId]');
      const setCost = () => { const p = Store.get('products', sel.value); root.querySelector('[name=unitCost]').value = (ACC.inventory().bal[p.id] || {}).avg || p.costPrice || 0; };
      sel.onchange = setCost; setCost();
      root.querySelector('[data-ok]').onclick = () => {
        const f = U.formData(root);
        if (!+f.qty) return U.toast('กรุณาระบุจำนวน', 'error');
        const b = ACC.inventory().bal[f.productId] || { qty: 0 };
        if (f.qty < 0 && b.qty + f.qty < 0) return U.toast('จำนวนคงเหลือไม่พอ', 'error');
        f.no = Store.nextNo('ADJ', f.date);
        Store.upsert('stockAdjustments', f); close(); U.toast('บันทึกการปรับปรุงสต็อกแล้ว'); App.render();
      };
    },
  });
};

Pages.stockAdjDelete = async (id) => {
  if (!(await U.confirm('ลบรายการปรับปรุงสต็อกนี้?', { danger: true }))) return;
  Store.remove('stockAdjustments', id); App.render();
};

Pages.stockCard = (id) => {
  const p = Store.get('products', id);
  const moves = ACC.inventory().moves.filter((m) => m.productId === id);
  U.modal({
    title: `บัตรคุมสินค้า: ${U.esc(p.name)}`, size: 'lg',
    body: moves.length ? `<table class="tbl compact"><thead><tr><th>วันที่</th><th>อ้างอิง</th><th class="num">รับ</th><th class="num">จ่าย</th><th class="num">ทุน/หน่วย</th><th class="num">มูลค่า</th><th class="num">คงเหลือ</th><th class="num">มูลค่าคงเหลือ</th></tr></thead><tbody>
      ${moves.map((m) => `<tr><td>${U.thDate(m.date)}</td><td>${U.esc(m.ref)}</td><td class="num">${m.qty > 0 ? U.qty(m.qty) : ''}</td><td class="num">${m.qty < 0 ? U.qty(-m.qty) : ''}</td>
        <td class="num">${U.money(Math.abs(m.cost / m.qty))}</td><td class="num">${U.money(m.cost)}</td><td class="num">${U.qty(m.balQty)}</td><td class="num">${U.money(m.balValue)}</td></tr>`).join('')}</tbody></table>`
      : `<div class="empty">${U.icon('history')}<h4>ยังไม่มีความเคลื่อนไหว</h4></div>`,
  });
};
