/* ============================================================
 * AccFlow — Utility helpers (format, date, Thai baht text, UI)
 * ============================================================ */
const U = (() => {
  const TH_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  const TH_MONTHS_S = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  /** Round to 2 decimals (accounting rounding, half away from zero) */
  const r2 = (n) => {
    n = +n || 0;
    const s = n < 0 ? -1 : 1;
    return s * Math.round((Math.abs(n) + Number.EPSILON) * 100) / 100;
  };

  const money = (n) => (+n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  /** Accounting style: negatives in parentheses */
  const acc = (n) => { n = r2(n); return n < 0 ? `(${money(-n)})` : money(n); };
  const qty = (n) => (+n || 0).toLocaleString('th-TH', { maximumFractionDigits: 4 });

  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => iso(new Date());
  const parse = (s) => { if (!s) return null; const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s) || new Date(); d.setDate(d.getDate() + (+n || 0)); return iso(d); };
  const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
  const monthEnd = (y, m) => iso(new Date(y, m, 0)); // m: 1-12
  const startOfMonth = (s) => s.slice(0, 8) + '01';
  const startOfYear = (s) => s.slice(0, 4) + '-01-01';

  /** 07/10/69 (พ.ศ. ย่อ) */
  const thDate = (s) => { if (!s) return '-'; const [y, m, d] = s.split('-'); return `${d}/${m}/${String(+y + 543).slice(-2)}`; };
  /** 7 ตุลาคม 2569 */
  const thDateLong = (s) => { if (!s) return '-'; const [y, m, d] = s.split('-').map(Number); return `${d} ${TH_MONTHS[m - 1]} ${y + 543}`; };
  const thMonth = (ym) => { const [y, m] = ym.split('-').map(Number); return `${TH_MONTHS[m - 1]} ${y + 543}`; };
  const thMonthShort = (ym) => { const [y, m] = ym.split('-').map(Number); return `${TH_MONTHS_S[m - 1]} ${String(y + 543).slice(-2)}`; };

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /** Thai baht text: 1234.50 -> หนึ่งพันสองร้อยสามสิบสี่บาทห้าสิบสตางค์ */
  const bahtText = (num) => {
    num = r2(num);
    if (num === 0) return 'ศูนย์บาทถ้วน';
    const neg = num < 0; num = Math.abs(num);
    const [b, s] = num.toFixed(2).split('.');
    const D = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const P = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];
    const read = (str, higher = false) => {
      str = str.replace(/^0+/, '');
      if (!str) return '';
      if (str.length > 6) return read(str.slice(0, -6)) + 'ล้าน' + read(str.slice(-6), true);
      let out = ''; const len = str.length;
      for (let i = 0; i < len; i++) {
        const d = +str[i], p = len - i - 1;
        if (d === 0) continue;
        if (p === 0 && d === 1 && (len > 1 || higher)) out += 'เอ็ด';
        else if (p === 1 && d === 2) out += 'ยี่';
        else if (p === 1 && d === 1) out += '';
        else out += D[d];
        out += P[p];
      }
      return out;
    };
    let txt = '';
    const bt = read(b);
    if (bt) txt += bt + 'บาท';
    txt += s === '00' ? 'ถ้วน' : read(s) + 'สตางค์';
    return (neg ? 'ลบ' : '') + txt;
  };

  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const sum = (arr, f = (x) => x) => r2(arr.reduce((a, x) => a + (+f(x) || 0), 0));
  const groupBy = (arr, f) => arr.reduce((m, x) => { const k = f(x); (m[k] = m[k] || []).push(x); return m; }, {});

  /* ---------------- UI helpers ---------------- */
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  const icon = (name, cls = '') => `<i data-lucide="${name}" class="ic ${cls}"></i>`;
  const refreshIcons = () => { if (window.lucide) lucide.createIcons({ attrs: { 'stroke-width': 1.8 } }); };

  const toast = (msg, type = 'success') => {
    let wrap = $('#toasts');
    if (!wrap) { wrap = document.createElement('div'); wrap.id = 'toasts'; document.body.appendChild(wrap); }
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    const ic = { success: 'check-circle-2', error: 'alert-circle', info: 'info', warning: 'alert-triangle' }[type] || 'info';
    el.innerHTML = `${icon(ic)}<span>${esc(msg)}</span>`;
    wrap.appendChild(el); refreshIcons();
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3200);
  };

  /** modal({title, body, footer, size:'md'|'lg'|'xl', onOpen(root, close)}) */
  const modal = ({ title, body, footer = '', size = 'md', onOpen }) => {
    const ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.innerHTML = `<div class="modal modal-${size}" role="dialog" aria-modal="true">
      <div class="modal-head"><h3>${title}</h3><button class="icon-btn" data-close>${icon('x')}</button></div>
      <div class="modal-body">${body}</div>
      ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
    </div>`;
    document.body.appendChild(ov);
    const close = () => { ov.classList.remove('show'); setTimeout(() => ov.remove(), 200); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    ov.addEventListener('mousedown', (e) => { if (e.target === ov) close(); });
    $$('[data-close]', ov).forEach((b) => b.addEventListener('click', close));
    refreshIcons();
    requestAnimationFrame(() => ov.classList.add('show'));
    if (onOpen) onOpen(ov, close);
    const first = ov.querySelector('input:not([type=hidden]):not([readonly]),select,textarea');
    if (first) setTimeout(() => first.focus(), 60);
    return close;
  };

  const confirm = (msg, { okText = 'ยืนยัน', danger = false, title = 'ยืนยันการทำรายการ' } = {}) => new Promise((resolve) => {
    let done = false;
    modal({
      title, size: 'sm',
      body: `<p class="confirm-msg">${msg}</p>`,
      footer: `<button class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${okText}</button>`,
      onOpen: (root, close) => {
        root.querySelector('[data-ok]').onclick = () => { done = true; resolve(true); close(); };
        root.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => { if (!done) resolve(false); }));
      },
    });
  });

  /** Collect form values: inputs with name attr */
  const formData = (root) => {
    const o = {};
    $$('[name]', root).forEach((el) => {
      if (el.type === 'checkbox') o[el.name] = el.checked;
      else if (el.type === 'number') o[el.name] = el.value === '' ? '' : +el.value;
      else o[el.name] = el.value.trim();
    });
    return o;
  };

  const downloadFile = (name, content, mime = 'text/plain') => {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  /** rows: array of arrays */
  const downloadCSV = (name, rows) => {
    const csv = rows.map((r) => r.map((c) => { const v = String(c ?? ''); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; }).join(',')).join('\n');
    downloadFile(name, '﻿' + csv, 'text/csv;charset=utf-8');
  };

  const opt = (value, label, selected) => `<option value="${esc(value)}" ${String(value) === String(selected) ? 'selected' : ''}>${esc(label)}</option>`;

  return { TH_MONTHS, TH_MONTHS_S, uid, r2, money, acc, qty, pad, iso, today, parse, addDays, daysBetween, monthEnd, startOfMonth, startOfYear,
    thDate, thDateLong, thMonth, thMonthShort, esc, bahtText, debounce, sum, groupBy, $, $$, icon, refreshIcons, toast, modal, confirm, formData,
    downloadFile, downloadCSV, opt };
})();

/** Page registry (filled by js/pages/*.js) */
const Pages = {};
