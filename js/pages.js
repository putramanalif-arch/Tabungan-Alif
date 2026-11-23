'use strict';
/* ===== Kasku pages: tampilan dan interaksi ===== */
const NOW = new Date();
const P = { y: NOW.getFullYear(), m: NOW.getMonth() + 1, page: 'dashboard', tab: {}, edit: null, amort: null, q: '', ft: '', fm: 0 };
const PAGES = [['dashboard', 'Dashboard', 'Utama'], ['catat', 'Catat Cepat', ''], ['transaksi', 'Buku Transaksi', ''], ['anggaran', 'Anggaran & Tagihan', 'Rencana'], ['target', 'Target & Tabungan', ''], ['kekayaan', 'Utang, Investasi, Aset', 'Kekayaan'], ['laporan', 'Laporan & Rasio', 'Laporan'], ['rencana', 'Proyeksi, Zakat, Pajak', 'Perencanaan'], ['pengaturan', 'Pengaturan & Excel', 'Sistem']];
const A = {}, F = {}, C = {}, V = {};
const opt = (list, val) => list.map(x => { const [v, l] = Array.isArray(x) ? x : [x, x]; return `<option value="${esc(v)}"${String(v) === String(val) ? ' selected' : ''}>${esc(l)}</option>`; }).join('');
const fld = (label, id, html, cls = '') => `<div class="fl ${cls}"><label for="${id}">${label}</label>${html}</div>`;
const inp = (id, val = '', type = 'text', extra = '') => `<input id="${id}" name="${id}" type="${type}" value="${esc(val)}" ${extra}>`;
const num = (id, val = '') => inp(id, val, 'number', 'step="any" inputmode="decimal"');
const tbl = (head, rows, foot = '') => `<div class="tw"><table><thead><tr>${head.map(h => `<th${h[0] === '>' ? ' class="r"' : ''}>${esc(h.replace(/^>/, ''))}</th>`).join('')}</tr></thead><tbody>${rows.join('') || `<tr><td colspan="${head.length}" class="empty">Belum ada data</td></tr>`}</tbody>${foot ? `<tfoot>${foot}</tfoot>` : ''}</table></div>`;
const tabs = (key, list, def) => { const cur = P.tab[key] || def; return `<div class="tabs" role="tablist">${list.map(([k, l]) => `<button role="tab" aria-selected="${cur === k}" class="${cur === k ? 'on' : ''}" data-a="tab" data-k="${key}" data-v="${k}">${l}</button>`).join('')}</div>`; };
const curTab = (key, def) => P.tab[key] || def;
const signc = n => n < 0 ? 'neg' : 'pos';
const yearOpts = () => { const ys = new Set([NOW.getFullYear(), P.y, ...S.tx.map(t => +t.d.slice(0, 4))]); return [...ys].sort((a, b) => b - a); };
const periodBar = (withMonth = true) => `<div class="frm" style="flex:0 0 auto"><div class="fl" style="flex:0 0 110px"><label for="py">Tahun</label><select id="py" data-c="period">${opt(yearOpts(), P.y)}</select></div>${withMonth ? `<div class="fl" style="flex:0 0 150px"><label for="pm">Bulan</label><select id="pm" data-c="period">${opt(BLN.map((b, i) => [i + 1, b]), P.m)}</select></div>` : ''}</div>`;
const head = (t, s, extra = '') => `<div class="top"><div><h1>${t}</h1><p class="sub">${s}</p></div>${extra}</div>`;

function cols(n) { return n; }
function barChart(labels, a, b, ca = '#0B9E88', cb = '#FF6F4D') {
  const mx = Math.max(1, ...a, ...(b || []));
  return `<div class="chart" role="img" aria-label="Grafik batang">${labels.map((l, i) => `<div class="c"><div class="p"><u style="height:${a[i] / mx * 100}%;background:${ca}" title="${rp(a[i])}"></u>${b ? `<u style="height:${b[i] / mx * 100}%;background:${cb}" title="${rp(b[i])}"></u>` : ''}</div></div>`).join('')}</div><div class="lab">${labels.map(l => `<span>${l}</span>`).join('')}</div>`;
}
function hbars(items, color = '#0B9E88') {
  const mx = Math.max(1, ...items.map(i => i[1]));
  return items.length ? items.map(([n, v]) => `<div class="hb"><span title="${esc(n)}" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(n)}</span><div class="bar"><i style="width:${v / mx * 100}%;background:${color}"></i></div><span>${rp(v)}</span></div>`).join('') : '<div class="empty">Belum ada data</div>';
}
const statusTag = (used, warn = S.set.warn) => used > 1 ? '<span class="tag e">Lewat</span>' : used >= warn ? '<span class="tag w">Waspada</span>' : '<span class="tag g">Aman</span>';
const bar = (v, warn = S.set.warn) => `<div class="bar ${v > 1 ? 'e' : v >= warn ? 'w' : ''}"><i style="width:${Math.min(100, v * 100)}%"></i></div>`;
function avgExpense() { const ms = []; for (let i = 0; i < 3; i++) { const d = new Date(NOW.getFullYear(), NOW.getMonth() - i, 1); const e = monthSum(d.getFullYear(), d.getMonth() + 1).exp; if (e > 0) ms.push(e); } return ms.length ? sum(ms, x => x) / ms.length : S.set.income * .6; }
function billDue(b) { const n = nextBill(b); return n ? n.days : null; }

/* ===== DASHBOARD ===== */
V.dashboard = () => {
  const nw = netWorth(), ms = monthSum(P.y, P.m), re = realisasi(P.y, P.m), base = baseIncome(P.y, P.m);
  const sr = ms.inc ? ms.net / ms.inc : 0;
  const dsrAmt = sum(ms.list.filter(t => t.t === 'Pembayaran utang' || t.t === 'Pembayaran bunga'), t => t.amt), dsr = ms.inc ? dsrAmt / ms.inc : 0;
  const ddSaved = sum(S.targets.filter(t => /darurat/i.test(t.n)), targetSaved) + 0, dd = (nw.kas + ddSaved) / (avgExpense() || 1);
  const al = [];
  if (nw.kas < S.set.low) al.push(['e', `Saldo kas ${rp(nw.kas)} di bawah batas ${rp(S.set.low)}.`]);
  S.alloc.forEach(a => { const b = budgetOf(a, P.y, P.m); if (b > 0 && a.jenis !== 'Tabungan') { const u = (re[a.n] || 0) / b; if (u > 1) al.push(['e', `Anggaran ${esc(a.n)} terlewati (${pct(u, 0)}).`]); else if (u >= S.set.warn) al.push(['w', `Anggaran ${esc(a.n)} sudah ${pct(u, 0)}.`]); } });
  S.bills.filter(b => b.aktif !== false).forEach(b => { const d = billDue(b); if (d !== null && d <= 7) al.push([d < 0 ? 'e' : 'w', `Tagihan ${esc(b.n)} ${d < 0 ? 'terlambat ' + (-d) + ' hari' : d === 0 ? 'jatuh tempo hari ini' : 'jatuh tempo ' + d + ' hari lagi'} (${rp(b.amt)}).`]); });
  if (ms.inc && sr < S.set.sr) al.push(['w', `Savings rate bulan ini ${pct(sr, 0)}, di bawah target ${pct(S.set.sr, 0)}.`]);
  if (dsr > S.set.dsr) al.push(['e', `Rasio cicilan ${pct(dsr, 0)} melebihi batas ${pct(S.set.dsr, 0)}.`]);
  const bad = S.tx.filter(t => cekTx(t) !== '✔').length; if (bad) al.push(['w', `${bad} transaksi perlu dicek (lihat kolom Cek di Buku Transaksi).`]);
  const inc = [], exp = [], nwBars = [];
  for (let m = 1; m <= 12; m++) { const s = monthSum(P.y, m); inc.push(s.inc); exp.push(s.exp); }
  const catExp = Object.entries(group(ms.list, t => t.c || 'Tanpa kategori', bebanVal)).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const totB = sum(S.alloc.filter(a => a.jenis !== 'Tabungan'), a => budgetOf(a, P.y, P.m)), totR = sum(S.alloc.filter(a => a.jenis !== 'Tabungan'), a => re[a.n] || 0);
  const upcoming = S.bills.filter(b => b.aktif !== false).map(b => [b, billDue(b)]).filter(x => x[1] !== null).sort((a, b) => a[1] - b[1]).slice(0, 5);
  return head(`Halo, ${esc(S.set.nama)}`, `Ringkasan ${BLN[P.m - 1]} ${P.y}`, periodBar()) + `
  <section class="card dark"><div style="display:flex;flex-wrap:wrap;gap:24px;align-items:flex-end;justify-content:space-between"><div><div style="color:#9FC2B3;font-weight:600">Kekayaan bersih (net worth)</div><div style="font-size:34px;font-weight:800;font-variant-numeric:tabular-nums">${rp(nw.nw)}</div></div>
  <div style="display:flex;flex-wrap:wrap;gap:24px"><div><small style="color:#9FC2B3">Saldo kas</small><div style="font-size:18px;font-weight:800">${rp(nw.kas)}</div></div><div><small style="color:#9FC2B3">Total aset</small><div style="font-size:18px;font-weight:800">${rp(nw.aset)}</div></div><div><small style="color:#9FC2B3">Total utang</small><div style="font-size:18px;font-weight:800">${rp(nw.ut)}</div></div></div></div></section>
  ${notifCard()}${transisiCard()}${al.length ? `<section class="card" aria-label="Peringatan"><h2>Perlu perhatian</h2><div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">${al.slice(0, 8).map(([k, t]) => `<div class="al ${k}">${t}</div>`).join('')}</div></section>` : ''}
  <div class="kpis"><div class="kpi"><small>Pemasukan</small><b class="pos">${rp(ms.inc)}</b><em>${ms.n} transaksi</em></div><div class="kpi"><small>Pengeluaran</small><b class="neg">${rp(ms.exp)}</b><em>${ms.inc ? pct(ms.exp / ms.inc, 0) + ' dari pemasukan' : '-'}</em></div><div class="kpi"><small>Surplus / defisit</small><b class="${signc(ms.net)}">${rp(ms.net)}</b><em>Savings rate ${pct(sr, 0)}</em></div><div class="kpi"><small>Rasio cicilan</small><b>${pct(dsr, 0)}</b><em>Batas ${pct(S.set.dsr, 0)}</em></div><div class="kpi"><small>Dana darurat</small><b>${dd.toFixed(1).replace('.', ',')} bln</b><em>Ideal ${S.set.dd} bulan</em></div><div class="kpi"><small>Anggaran terpakai</small><b>${totB ? pct(totR / totB, 0) : '-'}</b><em>${rp(totR)} dari ${rp(totB)}</em></div></div>
  <div class="row"><section class="card"><h2>Pemasukan vs pengeluaran ${P.y}</h2><p class="sub">Per bulan</p>${barChart(BLS, inc, exp)}<div class="leg"><span><i style="background:#0B9E88"></i>Pemasukan</span><span><i style="background:#FF6F4D"></i>Pengeluaran</span></div></section>
  <section class="card"><h2>Pengeluaran per kategori</h2><p class="sub">${BLN[P.m - 1]} ${P.y}</p>${hbars(catExp, '#FF6F4D')}</section></div>
  <div class="row"><section class="card"><h2>Target tabungan</h2>${S.targets.length ? S.targets.map(t => { const s = targetSaved(t), p = t.goal ? s / t.goal : 0; return `<div style="margin-top:12px"><div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(t.n)}</b><span>${rp(s)} / ${rp(t.goal)}</span></div>${bar(p, 2)}<small class="sub">${pct(p, 0)}</small></div>`; }).join('') : '<div class="empty">Belum ada target</div>'}</section>
  <section class="card"><h2>Tagihan terdekat</h2>${upcoming.length ? upcoming.map(([b, d]) => `<div style="display:flex;justify-content:space-between;gap:8px;padding:10px 0;border-bottom:1px solid #F1EEE3"><span><b>${esc(b.n)}</b><br><small class="sub">tgl ${b.day} · ${d < 0 ? 'terlambat ' + -d + ' hari' : d === 0 ? 'hari ini' : d + ' hari lagi'}</small></span><b>${rp(b.amt)}</b></div>`).join('') : '<div class="empty">Tidak ada tagihan yang belum dibayar</div>'}</section></div>`;
};

/* ===== CATAT CEPAT ===== */
const EX = ['makan siang 35rb qris', 'gaji 5jt transfer', 'setor dana darurat 500rb', 'bensin 50rb', 'beli reksa dana 500rb', 'bayar cicilan pinjaman 266rb', 'sisa jatah makan?'];
function txBubble(id) {
  const t = S.tx.find(x => x.id === id); if (!t) return '<div class="bt">Transaksi sudah dihapus.</div>';
  const T = TYPES[t.t], isIn = T.cash > 0;
  const catOpts = (T.cat === 'inc' ? S.incCats.map(c => c.n) : S.alloc.map(a => a.n)).slice(0, 40);
  const refOpts = T.ref === 'target' ? S.targets.map(x => x.n) : T.ref === 'inv' ? S.inv.map(x => x.n) : T.ref === 'debt' ? S.debts.map(x => x.n) : T.ref === 'rec' ? S.recv.map(x => x.id) : [];
  return `<div class="bt"><div style="font-size:12px;color:var(--mut);font-weight:600">${esc(t.id)} · ${esc(t.t)} dicatat · ${fmtD(t.d)}</div>
  <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin:4px 0"><b style="font-size:17px" class="${isIn ? 'pos' : 'neg'}">${isIn ? '+' : '−'} ${rp(t.amt)}</b><span class="tag ${t.c ? 'w' : 'e'}">${esc(t.c || 'Kategori belum dipilih')}</span></div>
  <div style="font-size:12px;color:var(--mut)">${esc(t.m)}${t.ref ? ' · Terkait: ' + esc(t.ref) : ''}</div>
  ${(!t.c || T.cat !== 'any') && catOpts.length ? `<div class="chips" aria-label="Ganti kategori">${catOpts.map(c => `<button class="chip ${c === t.c ? 'on' : ''}" data-a="recat" data-id="${esc(id)}" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
  ${T.ref && T.ref !== 'any' ? (refOpts.length ? `<div style="margin-top:8px;font-size:12px;font-weight:700">Terkait:</div><div class="chips">${refOpts.map(c => `<button class="chip ${c === t.ref ? 'on' : ''}" data-a="setref" data-id="${esc(id)}" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : `<div class="al w" style="margin-top:8px">Belum ada ${T.ref === 'target' ? 'target' : T.ref === 'inv' ? 'instrumen' : T.ref === 'debt' ? 'utang' : 'piutang'} untuk dikaitkan. Tambahkan dulu di halamannya.</div>`) : ''}
  <div class="chips"><button class="chip" data-a="undo" data-id="${esc(id)}">Batalkan</button></div></div>`;
}
function allocBubble(b) {
  const t = S.tx.find(x => x.id === b.id); if (!t) return '';
  const lines = S.targets.map(g => ({ g, v: g.mode === 'percent' ? Math.round(g.pct * t.amt) : Math.round(g.monthly || 0) })).filter(x => x.v > 0);
  if (!lines.length) return '';
  return `<div class="bt" style="background:#ECE6FB;border-color:#D5C9F5"><b>Saran alokasi dari ${rp(t.amt)}</b><div style="margin:6px 0;font-size:13px">${lines.map(x => `${esc(x.g.n)}: <b>${rp(x.v)}</b>${x.g.mode === 'percent' ? ' (' + pct(x.g.pct, 0) + ')' : ''}`).join('<br>')}</div>${b.done ? '<span class="tag g">Sudah dicatat</span>' : `<div class="chips"><button class="chip on" data-a="alloc" data-id="${esc(b.id)}">Catat alokasi</button></div>`}</div>`;
}
function botAnswer(text) {
  const t = text.toLowerCase(), re = realisasi(P.y, NOW.getMonth() + 1), m = NOW.getMonth() + 1, y = NOW.getFullYear();
  if (/saldo|kas/.test(t) && !/sisa/.test(t)) return `Saldo kas sekarang <b>${rp(cashNow())}</b>.`;
  if (/net ?worth|kekayaan/.test(t)) return `Kekayaan bersih <b>${rp(netWorth().nw)}</b>.`;
  if (/(total|berapa).*(pengeluaran|keluar)/.test(t)) return `Pengeluaran ${BLN[m - 1]}: <b>${rp(monthSum(y, m).exp)}</b>.`;
  if (/(total|berapa).*(pemasukan|masuk)/.test(t)) return `Pemasukan ${BLN[m - 1]}: <b>${rp(monthSum(y, m).inc)}</b>.`;
  const cat = parseChat(text.replace(/sisa|jatah|\?/g, ' ')).c || S.alloc.find(a => hasAny(t, a.n.toLowerCase().split(/[ ,/&]+/)[0]))?.n;
  if (cat) { const a = S.alloc.find(x => x.n === cat); if (a) { const b = budgetOf(a, y, m), r = re[cat] || 0; return `Anggaran <b>${esc(cat)}</b> ${BLN[m - 1]}: jatah ${rp(b)}, terpakai ${rp(r)}, sisa <b>${rp(b - r)}</b>.`; } }
  return 'Saya belum paham pertanyaannya. Coba: "sisa jatah makan", "saldo", atau "total pengeluaran".';
}
F.chat = f => {
  const text = f.text.value.trim(); if (!text) return; f.text.value = '';
  S.chat.push({ r: 'me', text });
  if (/\?\s*$/.test(text) || /^(sisa|berapa|saldo|total|net ?worth)/i.test(text)) S.chat.push({ r: 'bt', html: botAnswer(text) });
  else {
    const p = parseChat(text);
    if (!p.a) S.chat.push({ r: 'bt', html: 'Nominal tidak terbaca. Tulis misalnya <b>35rb</b>, <b>1,5jt</b>, atau <b>35000</b>.' });
    else { const t = addTx({ t: p.t, c: p.c, amt: p.a, m: p.m, d: p.d, ref: p.ref, note: p.note }); S.chat.push({ r: 'tx', id: t.id }); if (p.t === 'Pemasukan' && /gaji/i.test(text)) S.chat.push({ r: 'alloc', id: t.id }); }
  }
  S.chat = S.chat.slice(-80); save(); render(); const c = $('#chat'); if (c) c.scrollTop = c.scrollHeight; $('#ctext')?.focus();
};
A.recat = b => { const t = S.tx.find(x => x.id === b.dataset.id); if (t) { t.c = b.dataset.v; save(); render(); } };
A.setref = b => { const t = S.tx.find(x => x.id === b.dataset.id); if (t) { t.ref = b.dataset.v; save(); render(); } };
A.undo = b => { S.tx = S.tx.filter(x => x.id !== b.dataset.id); save(); render(); toast('Transaksi dibatalkan'); };
A.alloc = b => {
  const t = S.tx.find(x => x.id === b.dataset.id); if (!t) return;
  S.targets.forEach(g => { const v = g.mode === 'percent' ? Math.round(g.pct * t.amt) : Math.round(g.monthly || 0); if (v > 0) addTx({ t: 'Setoran tabungan', c: /darurat/i.test(g.n) ? 'Dana Darurat' : 'Tabungan Target', amt: v, m: 'Transfer Bank', d: t.d, ref: g.n, note: 'Alokasi dari ' + t.id }); });
  const c = S.chat.find(x => x.r === 'alloc' && x.id === b.dataset.id); if (c) c.done = true; save(); render(); toast('Alokasi dicatat');
};
V.catat = () => {
  const msgs = S.chat.map(c => c.r === 'me' ? `<div class="me">${esc(c.text)}</div>` : c.r === 'bt' ? `<div class="bt">${c.html}</div>` : c.r === 'tx' ? txBubble(c.id) : allocBubble(c)).join('') || '<div class="bt">Halo! Tulis transaksi seperti chat, misalnya <b>makan siang 35rb qris</b>. Saya yang menentukan jenis, kategori, dan metodenya.</div>';
  return head('Catat Cepat', 'Tulis seperti chat. Jenis, kategori, nominal, dan metode terbaca otomatis') + `<div class="row"><section class="card" style="flex:2 1 420px"><div class="chat" id="chat" aria-live="polite">${msgs}</div>
  <div class="tabs" style="margin-top:10px">${EX.map(e => `<button class="chip" data-a="ex" data-v="${esc(e)}">${esc(e)}</button>`).join('')}</div>
  <form class="cin" data-f="chat" autocomplete="off"><label for="ctext" style="position:absolute;left:-9999px">Ketik transaksi</label><input id="ctext" name="text" placeholder="Ketik: kopi 25rb tunai" enterkeyhint="send"><button aria-label="Kirim">→</button></form></section>
  <section class="card" style="flex:1 1 280px"><h2>Cara menulis</h2><ul style="padding-left:18px;line-height:1.8;margin:8px 0 0"><li><b>35rb</b>, <b>1,5jt</b>, <b>35.000</b> untuk nominal</li><li><b>qris</b>, <b>tunai</b>, <b>transfer</b> untuk metode</li><li><b>kemarin</b> atau <b>tgl 5</b> untuk tanggal</li><li><b>gaji</b>, <b>bonus</b> otomatis jadi pemasukan</li><li><b>setor dana darurat</b>, <b>beli reksa dana</b>, <b>bayar cicilan</b></li><li>Tanya: <b>sisa jatah makan?</b>, <b>saldo</b></li></ul><p class="sub">Salah kategori? Tekan kategori yang benar di bawah catatan. Transaksi juga bisa diedit di Buku Transaksi.</p></section></div>`;
};
A.ex = b => { const i = $('#ctext'); i.value = b.dataset.v; i.focus(); };

/* ===== BUKU TRANSAKSI ===== */
V.transaksi = () => {
  const e = P.edit ? S.tx.find(x => x.id === P.edit) : null, v = e || { d: today(), t: 'Pengeluaran', m: 'Tunai', st: 'Selesai' };
  let list = [...S.tx];
  if (P.fm) list = list.filter(t => t.d.startsWith(`${P.y}-${pad(P.fm)}`)); else list = list.filter(t => t.d.startsWith(String(P.y)));
  if (P.ft) list = list.filter(t => t.t === P.ft);
  if (P.q) list = list.filter(t => (t.note + t.c + t.ref + t.id).toLowerCase().includes(P.q.toLowerCase()));
  list.sort((a, b) => b.d.localeCompare(a.d) || b.id.localeCompare(a.id));
  const inc = sum(list.filter(t => (t.st || 'Selesai') === 'Selesai'), incVal), exp = sum(list.filter(t => (t.st || 'Selesai') === 'Selesai'), bebanVal), cash = sum(list.filter(t => (t.st || 'Selesai') === 'Selesai'), cashEff);
  const refs = [...S.targets.map(x => x.n), ...S.inv.map(x => x.n), ...S.debts.map(x => x.n), ...S.recv.map(x => x.id)];
  return head('Buku Transaksi', 'Semua kejadian uang dicatat sekali di sini. Laporan dihitung otomatis') + `
  <section class="card"><h2>${e ? 'Ubah ' + esc(e.id) : 'Tambah transaksi'}</h2><form data-f="tx" class="frm" style="margin-top:12px">
  ${fld('Tanggal', 'f_d', inp('d', v.d, 'date', 'required'))}${fld('Jenis', 'f_t', `<select id="f_t" name="t" data-c="typehint">${opt(TYPE_NAMES, v.t)}</select>`)}
  ${fld('Kategori', 'f_c', inp('c', v.c || '', 'text', 'list="dl-cat" autocomplete="off"'))}${fld('Keterangan', 'f_n', inp('note', v.note || ''))}
  ${fld('Nominal (Rp)', 'f_a', num('amt', v.amt ?? '').replace('step="any"', 'step="any" required'))}${fld('Metode', 'f_m', `<select id="f_m" name="m">${opt(METHODS, v.m)}</select>`)}
  ${fld('Terkait (target/instrumen/utang/ID)', 'f_r', inp('ref', v.ref || '', 'text', 'list="dl-ref" autocomplete="off"'))}${fld('Unit (investasi)', 'f_u', num('unit', v.unit ?? ''))}
  ${fld('Status', 'f_s', `<select id="f_s" name="st">${opt(['Selesai', 'Pending', 'Dibatalkan'], v.st || 'Selesai')}</select>`)}
  <datalist id="dl-cat">${allCats().map(c => `<option value="${esc(c)}">`).join('')}</datalist><datalist id="dl-ref">${refs.map(c => `<option value="${esc(c)}">`).join('')}</datalist>
  <div style="flex:1 1 100%;display:flex;gap:10px;flex-wrap:wrap;align-items:center"><button class="btn">${e ? 'Simpan perubahan' : 'Simpan transaksi'}</button>${e ? '<button type="button" class="btn o" data-a="canceledit">Batal</button>' : ''}<span class="sub" id="typehint">${esc(TYPES[v.t].how)}</span></div></form></section>
  <section class="card"><div class="frm" style="margin-bottom:12px">
  <div class="fl" style="flex:0 0 110px"><label for="py">Tahun</label><select id="py" data-c="period">${opt(yearOpts(), P.y)}</select></div>
  <div class="fl" style="flex:0 0 150px"><label for="fm">Bulan</label><select id="fm" data-c="fmonth">${opt([[0, 'Semua bulan'], ...BLN.map((b, i) => [i + 1, b])], P.fm)}</select></div>
  <div class="fl" style="flex:0 0 200px"><label for="ft">Jenis</label><select id="ft" data-c="ftype">${opt([['', 'Semua jenis'], ...TYPE_NAMES], P.ft)}</select></div>
  <div class="fl"><label for="fq">Cari</label><input id="fq" data-c="fq" value="${esc(P.q)}" placeholder="kata kunci atau ID"></div></div>
  ${tbl(['ID', 'Tanggal', 'Jenis', 'Kategori', 'Keterangan', '>Nominal', 'Metode', 'Terkait', 'Cek', ''], list.slice(0, 300).map(t => { const c = cekTx(t); return `<tr><td>${esc(t.id)}</td><td>${fmtD(t.d)}</td><td><span class="tag ${TYPES[t.t]?.cash > 0 ? 'g' : 'n'}">${esc(t.t)}</span></td><td>${esc(t.c)}</td><td style="max-width:220px;overflow:hidden;text-overflow:ellipsis">${esc(t.note)}</td><td class="r ${TYPES[t.t]?.cash > 0 ? 'pos' : ''}">${t.t === 'Penyesuaian saldo' ? rp(t.amt) : rp(t.amt)}</td><td>${esc(t.m)}</td><td>${esc(t.ref)}</td><td><span class="tag ${c === '✔' ? 'g' : 'w'}">${c}</span></td><td><button class="btn o s" data-a="edit" data-id="${esc(t.id)}">Ubah</button> <button class="btn d s" data-a="del" data-id="${esc(t.id)}" aria-label="Hapus ${esc(t.id)}">Hapus</button></td></tr>`; }), `<tr><td colspan="5">${list.length} transaksi${list.length > 300 ? ' (300 terbaru ditampilkan)' : ''} · pemasukan ${rp(inc)} · pengeluaran ${rp(exp)}</td><td class="r">${rp(cash)}</td><td colspan="4">perubahan kas</td></tr>`)}</section>
  <section class="card"><h2>Aturan 15 jenis transaksi</h2>${tbl(['Jenis', 'Efek kas', 'Pemasukan?', 'Anggaran', 'Terkait', 'Cara mencatat'], TYPE_NAMES.map(n => { const T = TYPES[n]; return `<tr><td><b>${n}</b></td><td>${T.adj ? '±' : T.cash > 0 ? '+1' : '−1'}</td><td>${T.inc ? 'Ya' : 'Tidak'}</td><td>${T.be > 0 ? '+1' : T.be < 0 ? '−1' : '0'}</td><td>${T.ref ? (T.ref === 'any' ? 'ID asal' : T.ref) : '-'}</td><td style="white-space:normal">${T.how}</td></tr>`; }))}</section>`;
};
C.typehint = el => { const h = $('#typehint'); if (h) h.textContent = TYPES[el.value].how; };
F.tx = f => {
  const g = n => f.elements[n].value.trim();
  const o = { d: g('d'), t: g('t'), c: g('c'), note: g('note'), amt: parseFloat(g('amt')) || 0, m: g('m'), ref: g('ref'), unit: g('unit'), st: g('st') };
  if (P.edit) { const t = S.tx.find(x => x.id === P.edit); Object.assign(t, o); P.edit = null; toast('Transaksi diperbarui'); } else { const t = addTx(o); toast(t.id + ' disimpan'); }
  save(); render();
};
A.edit = b => { P.edit = b.dataset.id; render(); scrollTo(0, 0); };
A.canceledit = () => { P.edit = null; render(); };
A.del = b => { if (confirm('Hapus transaksi ' + b.dataset.id + '?')) { S.tx = S.tx.filter(x => x.id !== b.dataset.id); save(); render(); } };
C.fmonth = el => { P.fm = +el.value; render(); }; C.ftype = el => { P.ft = el.value; render(); };
C.fq = el => { P.q = el.value; clearTimeout(C._q); C._q = setTimeout(() => { render(); const i = $('#fq'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 350); };

/* ===== ANGGARAN & TAGIHAN ===== */
V.anggaran = () => {
  const re = realisasi(P.y, P.m), base = baseIncome(P.y, P.m), tp = sum(S.alloc, a => a.pct);
  const rows = S.alloc.map((a, i) => { const b = a.pct * base, r = re[a.n] || 0, u = b ? r / b : (r > 0 ? 2 : 0); return `<tr><td>${esc(a.n)}</td><td><span class="tag n">${esc(a.jenis)}</span></td><td style="width:90px"><input type="number" step="0.1" value="${+(a.pct * 100).toFixed(2)}" data-c="allocpct" data-i="${i}" aria-label="Persen ${esc(a.n)}"></td><td class="r">${rp(b)}</td><td class="r">${rp(r)}</td><td class="r ${signc(b - r)}">${rp(b - r)}</td><td style="min-width:110px">${bar(u)}</td><td>${statusTag(u)}</td><td><button class="btn d s" data-a="delalloc" data-i="${i}" aria-label="Hapus ${esc(a.n)}">Hapus</button></td></tr>`; });
  const byJ = {}; S.alloc.forEach(a => { byJ[a.jenis] = byJ[a.jenis] || { p: 0, r: 0 }; byJ[a.jenis].p += a.pct; byJ[a.jenis].r += re[a.n] || 0; });
  const ym = `${NOW.getFullYear()}-${pad(NOW.getMonth() + 1)}`;
  return head('Anggaran & Tagihan', `Jatah = % alokasi × penghasilan (${rp(base)}${monthSum(P.y, P.m).inc > 0 ? ', aktual' : ', rencana'})`, periodBar()) + `
  <section class="card"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px"><h2>Anggaran vs realisasi</h2><span class="tag ${Math.abs(tp - 1) < .0005 ? 'g' : 'w'}">Total alokasi ${pct(tp, 1)} ${Math.abs(tp - 1) < .0005 ? '✔' : '(harus 100%)'}</span></div>
  ${tbl(['Kategori', 'Jenis', '% alokasi', '>Jatah', '>Realisasi', '>Sisa', 'Terpakai', 'Status', ''], rows, `<tr><td colspan="3">Total</td><td class="r">${rp(sum(S.alloc, a => a.pct * base))}</td><td class="r">${rp(sum(S.alloc, a => re[a.n] || 0))}</td><td class="r">${rp(sum(S.alloc, a => a.pct * base - (re[a.n] || 0)))}</td><td colspan="3"></td></tr>`)}
  <form data-f="alloc" class="frm" style="margin-top:14px">${fld('Kategori baru', 'al_n', inp('n', '', 'text', 'required'))}${fld('Jenis', 'al_j', `<select name="j" id="al_j">${opt(['Tetap', 'Variabel', 'Tabungan', 'Keinginan'], 'Variabel')}</select>`)}${fld('% penghasilan', 'al_p', num('p', '0'))}<button class="btn">Tambah kategori</button></form></section>
  <div class="row"><section class="card"><h2>Ringkasan per jenis</h2>${tbl(['Jenis', '>% alokasi', '>Jatah', '>Realisasi'], Object.entries(byJ).map(([j, x]) => `<tr><td>${j}</td><td class="r">${pct(x.p, 1)}</td><td class="r">${rp(x.p * base)}</td><td class="r">${rp(x.r)}</td></tr>`))}<p class="sub">Acuan 50/30/20: kebutuhan (tetap + variabel) 50–60%, tabungan ≥ 20%, keinginan ≤ 30%.</p></section></div>
  <section class="card"><h2>Tagihan rutin</h2><p class="sub">Tekan Bayar untuk mencatat pengeluaran dan menandai lunas bulan ini</p>
  ${tbl(['Nama', 'Kategori', '>Nominal', 'Frekuensi', 'Jatuh tempo berikutnya', 'Terakhir dibayar', '>Setara / bulan', ''], S.bills.map((b, i) => { const nd = nextBill(b), st = BSTEP[b.freq || 'Bulanan'] || 1; return `<tr><td>${esc(b.n)}</td><td>${esc(b.kat)}</td><td class="r">${rp(b.amt)}</td><td>${esc(b.freq || 'Bulanan')}</td><td>${nd ? fmtD(nd.d) + ' ' + dueTag(nd.d, false) + `<br><small class="sub">${dueTxt(nd.d)}</small>` : '-'}</td><td>${b.paid ? BLS[+b.paid.slice(5, 7) - 1] + ' ' + b.paid.slice(0, 4) : '-'}</td><td class="r">${rp(b.amt / st)}</td><td>${nd ? `<button class="btn s" data-a="paybill" data-i="${i}">Bayar</button> ` : ''}<button class="btn d s" data-a="delbill" data-i="${i}" aria-label="Hapus ${esc(b.n)}">Hapus</button></td></tr>`; }), `<tr><td>Total setara per bulan</td><td></td><td></td><td></td><td></td><td></td><td class="r">${rp(sum(S.bills, b => b.amt / (BSTEP[b.freq || 'Bulanan'] || 1)))}</td><td>${rp(sum(S.bills, b => b.amt * 12 / (BSTEP[b.freq || 'Bulanan'] || 1)))} / tahun</td></tr>`)}
  <p class="sub">Tagihan tahunan, semesteran, atau triwulan punya kolom "Setara / bulan" (nominal dibagi jumlah bulannya): itu uang yang sebaiknya disisihkan tiap bulan agar tidak kaget saat jatuh tempo.</p>
  <form data-f="bill" class="frm" style="margin-top:14px">${fld('Nama tagihan', 'b_n', inp('n', '', 'text', 'required'))}${fld('Kategori', 'b_k', `<select name="k" id="b_k">${opt(S.alloc.map(a => a.n), 'Listrik, Air & Internet')}</select>`)}${fld('Nominal per tagihan (Rp)', 'b_a', num('a', '').replace('step="any"', 'step="any" required'))}${fld('Frekuensi', 'b_f', `<select name="f" id="b_f">${opt(['Bulanan', 'Triwulan', 'Semesteran', 'Tahunan'], 'Bulanan')}</select>`)}${fld('Bulan jatuh tempo (untuk non-bulanan)', 'b_m', `<select name="m" id="b_m">${opt(BLN.map((x, k) => [k + 1, x]), NOW.getMonth() + 1)}</select>`)}${fld('Tanggal jatuh tempo (1-31)', 'b_d', num('d', '1'))}<button class="btn">Tambah tagihan</button></form></section>`;
};
C.allocpct = el => { S.alloc[+el.dataset.i].pct = (parseFloat(el.value) || 0) / 100; save(); render(); };
F.alloc = f => { S.alloc.push({ n: f.n.value.trim(), jenis: f.j.value, pct: (parseFloat(f.p.value) || 0) / 100 }); save(); render(); };
A.delalloc = b => { const a = S.alloc[+b.dataset.i]; if (confirm(`Hapus kategori ${a.n}? Transaksi lama tetap ada.`)) { S.alloc.splice(+b.dataset.i, 1); save(); render(); } };
F.bill = f => { const nb = { n: f.n.value.trim(), kat: f.k.value, amt: +f.a.value || 0, day: Math.min(31, Math.max(1, +f.d.value || 1)), aktif: true, freq: f.f.value, mon: +f.m.value || 1, paid: '' }; nb.paid = billStartKey(nb); S.bills.push(nb); save(); render(); };
A.delbill = b => { S.bills.splice(+b.dataset.i, 1); save(); render(); };
A.paybill = b => { const x = S.bills[+b.dataset.i], nd = nextBill(x); if (!nd) return; addTx({ t: 'Pengeluaran', c: x.kat, amt: x.amt, m: 'Transfer Bank', note: 'Bayar ' + x.n + ' (' + x.freq + ')' }); x.paid = nd.key; save(); render(); toast('Tagihan dibayar dan dicatat'); };

/* ===== TARGET ===== */
function monthsLeft(dl) { if (!dl) return 0; const d = new Date(dl + 'T00:00:00'); return Math.max(0, (d.getFullYear() - NOW.getFullYear()) * 12 + d.getMonth() - NOW.getMonth()); }
const tgRule = g => g.mode === 'percent' ? Math.round(g.pct * baseIncome(NOW.getFullYear(), NOW.getMonth() + 1)) : Math.round(g.monthly || 0);
V.target = () => {
  const cards = S.targets.map((g, i) => {
    const s = targetSaved(g), p = g.goal ? s / g.goal : 0, left = Math.max(0, g.goal - s), ml = monthsLeft(g.dl), need = ml ? Math.ceil(left / ml) : left, rule = tgRule(g), eta = rule > 0 ? Math.ceil(left / rule) : null;
    const etaD = eta !== null ? new Date(NOW.getFullYear(), NOW.getMonth() + eta, 1) : null;
    const ok = !g.dl || (eta !== null && eta <= ml);
    return `<section class="card"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><h2>${esc(g.n)}</h2><span class="tag ${p >= 1 ? 'g' : ok ? 'i' : 'w'}">${p >= 1 ? 'Tercapai' : ok ? 'Sesuai jalur' : 'Perlu ditambah'}</span></div>
    <div style="font-size:24px;font-weight:800;margin:8px 0;font-variant-numeric:tabular-nums">${rp(s)} <small class="sub">/ ${rp(g.goal)}</small></div>${bar(p, 2)}
    <p class="sub">${pct(p, 0)} · sisa ${rp(left)}${g.dl ? ` · deadline ${fmtD(g.dl)} (${ml} bulan)` : ''}</p>
    <div style="margin-top:10px;font-size:13px;line-height:1.7">Aturan setor: <b>${g.mode === 'percent' ? pct(g.pct, 1) + ' dari penghasilan' : 'nominal tetap'}</b> = <b>${rp(rule)}</b>/bulan<br>${g.dl ? `Perlu setor agar tepat waktu: <b>${rp(need)}</b>/bulan<br>` : ''}${etaD ? `Perkiraan tercapai: <b>${BLN[etaD.getMonth()]} ${etaD.getFullYear()}</b> (${eta} bulan)` : 'Atur nilai setoran untuk melihat perkiraan'}</div>
    <div class="frm" style="margin-top:12px"><div class="fl" style="flex:1 1 130px"><label for="tm${i}">Cara setor</label><select id="tm${i}" data-c="tgmode" data-i="${i}">${opt([['percent', '% penghasilan'], ['fixed', 'Nominal tetap']], g.mode)}</select></div>
    <div class="fl" style="flex:1 1 110px"><label for="tv${i}">${g.mode === 'percent' ? 'Persen (%)' : 'Rp / bulan'}</label><input id="tv${i}" type="number" step="any" value="${g.mode === 'percent' ? +(g.pct * 100).toFixed(2) : g.monthly || 0}" data-c="tgval" data-i="${i}"></div>
    <div class="fl" style="flex:1 1 110px"><label for="tg${i}">Target (Rp)</label><input id="tg${i}" type="number" step="any" value="${g.goal}" data-c="tggoal" data-i="${i}"></div>
    <button class="btn d s" data-a="deltarget" data-i="${i}">Hapus</button></div></section>`;
  }).join('');
  const dd = S.targets.filter(t => /darurat/i.test(t.n)), ddS = sum(dd, targetSaved), ae = avgExpense();
  return head('Target & Tabungan', 'Setiap target punya tujuan, batas waktu, dan aturan setor: nominal tetap atau % dari penghasilan') + `
  <div class="row">${cards || '<div class="card empty" style="flex:1">Belum ada target</div>'}</div>
  <section class="card"><h2>Tambah target</h2><form data-f="target" class="frm" style="margin-top:12px">${fld('Nama tujuan', 't_n', inp('n', '', 'text', 'required placeholder="mis. Laptop, Umrah, DP rumah"'))}${fld('Prioritas', 't_p', `<select name="p" id="t_p">${opt(['Tinggi', 'Sedang', 'Rendah'], 'Sedang')}</select>`)}${fld('Jumlah target (Rp)', 't_g', num('g', '').replace('step="any"', 'step="any" required'))}${fld('Deadline', 't_d', inp('dl', '', 'date'))}${fld('Cara setor', 't_m', `<select name="mode" id="t_m"><option value="percent">% dari penghasilan bulanan</option><option value="fixed">Nominal tetap per bulan</option></select>`)}${fld('Persen (%) atau Rp/bulan', 't_v', num('v', '10'))}${fld('Saldo awal (Rp)', 't_s', num('s', '0'))}<button class="btn">Tambah target</button></form>
  <p class="sub">Setoran dicatat di Buku Transaksi dengan jenis <b>Setoran tabungan</b> dan Terkait = nama target (atau lewat Catat Cepat).</p></section>
  <div class="row"><section class="card"><h2>Alokasikan penghasilan bulan ini</h2><p class="sub">Catat setoran semua target sesuai aturannya sekaligus</p>${tbl(['Target', '>Setoran bulan ini'], S.targets.map(g => `<tr><td>${esc(g.n)}</td><td class="r">${rp(tgRule(g))}</td></tr>`), `<tr><td>Total</td><td class="r">${rp(sum(S.targets, tgRule))}</td></tr>`)}<button class="btn l" style="margin-top:12px" data-a="allocall">Catat semua setoran</button></section>
  <section class="card"><h2>Dana darurat</h2><div style="font-size:26px;font-weight:800">${(ddS / ae).toFixed(1).replace('.', ',')} bulan</div><p class="sub">${rp(ddS)} dari ideal ${S.set.dd} bulan × pengeluaran rata-rata ${rp(ae)} = ${rp(S.set.dd * ae)}</p>${bar(ddS / (S.set.dd * ae || 1), 2)}${dd.length ? '' : '<p class="sub">Buat target bernama "Dana Darurat" agar dihitung di sini.</p>'}</section></div>`;
};
const tg = b => S.targets[+b.dataset.i];
C.tgmode = el => { const g = tg(el); g.mode = el.value; if (g.mode === 'percent' && !g.pct) g.pct = .1; save(); render(); };
C.tgval = el => { const g = tg(el); const v = parseFloat(el.value) || 0; if (g.mode === 'percent') g.pct = v / 100; else g.monthly = v; save(); render(); };
C.tggoal = el => { tg(el).goal = parseFloat(el.value) || 0; save(); render(); };
A.deltarget = b => { if (confirm('Hapus target ini? Setoran lama tetap ada di transaksi.')) { S.targets.splice(+b.dataset.i, 1); save(); render(); } };
F.target = f => { const m = f.mode.value, v = parseFloat(f.v.value) || 0; S.targets.push({ n: f.n.value.trim(), pri: f.p.value, goal: +f.g.value || 0, dl: f.dl.value, awal: +f.s.value || 0, mode: m, pct: m === 'percent' ? v / 100 : 0, monthly: m === 'fixed' ? v : 0 }); save(); render(); };
A.allocall = () => { const n = S.targets.filter(g => tgRule(g) > 0).length; if (!n || !confirm(`Catat ${n} setoran tabungan?`)) return; S.targets.forEach(g => { const v = tgRule(g); if (v > 0) addTx({ t: 'Setoran tabungan', c: /darurat/i.test(g.n) ? 'Dana Darurat' : 'Tabungan Target', amt: v, m: 'Transfer Bank', ref: g.n, note: 'Setoran bulanan' }); }); render(); toast('Setoran dicatat'); };

/* ===== KEKAYAAN ===== */
V.kekayaan = () => {
  const t = curTab('kk', 'utang'); let body = '';
  if (t === 'utang') {
    body = `<section class="card"><h2>Utang & cicilan</h2><p class="sub">Pembayaran dicatat di Transaksi: "Pembayaran utang" = pokok, "Pembayaran bunga" = bunga. Terkait = nama pinjaman.</p>${tbl(['Nama', 'Kategori', '>Pokok awal', '>Bunga/thn', 'Tenor', '>Cicilan', '>Pokok terbayar', '>Sisa pokok', ''], S.debts.map((d, i) => `<tr><td>${esc(d.n)}</td><td>${esc(d.kat)}</td><td class="r">${rp(d.principal)}</td><td class="r">${pct(d.rate, 1)}</td><td>${d.tenor} bln</td><td class="r">${rp(d.monthly)}</td><td class="r">${rp(debtPaid(d))}</td><td class="r"><b>${rp(debtBal(d))}</b></td><td><button class="btn o s" data-a="amort" data-i="${i}">Jadwal</button> <button class="btn d s" data-a="deldebt" data-i="${i}">Hapus</button></td></tr>`), `<tr><td colspan="7">Total sisa pokok</td><td class="r">${rp(sum(S.debts, debtBal))}</td><td></td></tr>`)}
    <form data-f="debt" class="frm" style="margin-top:14px">${fld('Nama pinjaman', 'd_n', inp('n', '', 'text', 'required'))}${fld('Kategori', 'd_k', `<select name="k" id="d_k">${opt(['Pinjaman Bank', 'Cicilan Kendaraan', 'Cicilan Rumah', 'Kartu Kredit', 'PayLater', 'Pinjaman Pribadi', 'Pinjaman Pendidikan', 'Utang Lainnya'], 'Pinjaman Pribadi')}</select>`)}${fld('Pokok awal (Rp)', 'd_p', num('p', '').replace('step="any"', 'step="any" required'))}${fld('Bunga (% / tahun)', 'd_r', num('r', '0'))}${fld('Tenor (bulan)', 'd_t', num('t', '12'))}${fld('Cicilan/bulan (kosong = hitung)', 'd_m', num('m', ''))}${fld('Tgl cicilan pertama', 'd_s', inp('s', '', 'date'))}${fld('Pokok sudah terbayar sebelumnya', 'd_b', num('b', '0'))}<button class="btn">Tambah utang</button></form></section>`;
    if (P.amort !== null && S.debts[P.amort]) { const d = S.debts[P.amort], a = amort(d.principal, d.rate / 100, d.tenor || 1); body += `<section class="card"><div style="display:flex;justify-content:space-between;gap:8px"><h2>Jadwal amortisasi: ${esc(d.n)}</h2><button class="btn o s" data-a="amort" data-i="-1">Tutup</button></div><p class="sub">Anuitas, cicilan ${rp(a.pmt)}/bulan, total bunga ${rp(sum(a.rows, r => r.bg))}</p>${tbl(['Bulan', '>Cicilan', '>Pokok', '>Bunga', '>Sisa pokok'], a.rows.map(r => `<tr><td>${r.i}</td><td class="r">${rp(r.pmt)}</td><td class="r">${rp(r.pk)}</td><td class="r">${rp(r.bg)}</td><td class="r">${rp(r.bal)}</td></tr>`))}</section>`; }
  } else if (t === 'piutang') {
    body = `<section class="card"><h2>Piutang</h2><p class="sub">Uang yang dipinjamkan adalah aset, bukan pengeluaran. Penerimaan dicatat dengan jenis "Penerimaan piutang", Terkait = ID.</p>${tbl(['ID', 'Peminjam', 'Tanggal', '>Dipinjamkan', '>Diterima', '>Sisa', 'Jatuh tempo', 'Status', ''], S.recv.map((r, i) => { const b = recvBal(r); return `<tr><td>${esc(r.id)}</td><td>${esc(r.n)}</td><td>${fmtD(r.d)}</td><td class="r">${rp(recvGiven(r))}</td><td class="r">${rp(recvGot(r))}</td><td class="r"><b>${rp(b)}</b></td><td>${fmtD(r.due)}</td><td>${b === 0 ? '<span class="tag g">Lunas</span>' : r.due && r.due < today() ? '<span class="tag e">Lewat tempo</span>' : '<span class="tag i">Berjalan</span>'}</td><td><button class="btn d s" data-a="delrecv" data-i="${i}">Hapus</button></td></tr>`; }), `<tr><td colspan="5">Total piutang</td><td class="r">${rp(sum(S.recv, recvBal))}</td><td colspan="3"></td></tr>`)}
    <form data-f="recv" class="frm" style="margin-top:14px">${fld('Nama peminjam', 'r_n', inp('n', '', 'text', 'required'))}${fld('Jumlah (Rp)', 'r_a', num('a', '').replace('step="any"', 'step="any" required'))}${fld('Tanggal', 'r_d', inp('d', today(), 'date'))}${fld('Jatuh tempo', 'r_j', inp('j', '', 'date'))}<button class="btn">Tambah dan catat transaksi</button></form></section>`;
  } else if (t === 'investasi') {
    body = `<section class="card"><h2>Investasi & portofolio</h2><p class="sub">Isi harga pasar terbaru secara berkala. Pembelian/penjualan dicatat di Transaksi (Terkait = nama instrumen, isi unit).</p>${tbl(['Instrumen', 'Jenis', '>Modal beli', '>Hasil jual', '>Unit', '>Harga pasar', '>Nilai pasar', '>Untung/rugi', ''], S.inv.map((v, i) => { const mod = invBought(v) - invSold(v), val = invVal(v); return `<tr><td>${esc(v.n)}</td><td>${esc(v.jenis)}</td><td class="r">${rp(invBought(v))}</td><td class="r">${rp(invSold(v))}</td><td class="r">${invUnits(v).toLocaleString('id-ID', { maximumFractionDigits: 4 })}</td><td style="width:130px"><input type="number" step="any" value="${v.price || 0}" data-c="invprice" data-i="${i}" aria-label="Harga pasar ${esc(v.n)}"></td><td class="r"><b>${rp(val)}</b></td><td class="r ${signc(val - mod)}">${rp(val - mod)}</td><td><button class="btn d s" data-a="delinv" data-i="${i}">Hapus</button></td></tr>`; }), `<tr><td colspan="6">Total nilai pasar</td><td class="r">${rp(sum(S.inv, invVal))}</td><td colspan="2"></td></tr>`)}
    <form data-f="inv" class="frm" style="margin-top:14px">${fld('Nama instrumen', 'i_n', inp('n', '', 'text', 'required'))}${fld('Jenis', 'i_j', `<select name="j" id="i_j">${opt(['Saham', 'Reksa Dana', 'Emas', 'Deposito', 'Obligasi', 'SBN', 'ETF', 'Cryptocurrency', 'Investasi Lainnya'], 'Reksa Dana')}</select>`)}${fld('Harga pasar per unit', 'i_p', num('p', '0'))}<button class="btn">Tambah instrumen</button></form></section>`;
  } else if (t === 'logam') { body = logamBody(); } else if (t === 'aset') {
    body = `<section class="card"><h2>Aset tetap & penyusutan</h2><p class="sub">Penyusutan garis lurus per bulan dari tanggal perolehan. Umur 0 = tidak disusutkan (mis. tanah).</p>${tbl(['ID', 'Nama', 'Kategori', 'Perolehan', '>Harga', '>Umur (thn)', '>Penyusutan/bln', '>Akumulasi', '>Nilai buku', ''], S.assets.map((a, i) => `<tr><td>${esc(a.id)}</td><td>${esc(a.n)}</td><td>${esc(a.kat)}</td><td>${fmtD(a.d)}</td><td class="r">${rp(a.cost)}</td><td class="r">${a.life || 0}</td><td class="r">${rp(a.life ? (a.cost - (a.res || 0)) / (a.life * 12) : 0)}</td><td class="r">${rp(a.cost - assetBook(a))}</td><td class="r"><b>${rp(assetBook(a))}</b></td><td><button class="btn d s" data-a="delasset" data-i="${i}">Hapus</button></td></tr>`), `<tr><td colspan="8">Total nilai buku</td><td class="r">${rp(sum(S.assets, assetBook))}</td><td></td></tr>`)}
    <form data-f="asset" class="frm" style="margin-top:14px">${fld('Nama aset', 'a_n', inp('n', '', 'text', 'required'))}${fld('Kategori', 'a_k', `<select name="k" id="a_k">${opt(['Kendaraan', 'Tanah', 'Rumah', 'Peralatan Produktif', 'Properti', 'Aset Lainnya'], 'Kendaraan')}</select>`)}${fld('Tanggal perolehan', 'a_d', inp('d', today(), 'date'))}${fld('Harga perolehan', 'a_c', num('c', '').replace('step="any"', 'step="any" required'))}${fld('Nilai saat ini (opsional)', 'a_v', num('v', ''))}${fld('Umur manfaat (tahun)', 'a_l', num('l', '5'))}${fld('Nilai residu (Rp)', 'a_r', num('r', '0'))}<button class="btn">Tambah aset</button></form></section>`;
  } else {
    const y = P.y, byM = []; for (let m = 1; m <= 12; m++) { const l = txIn(mFrom(y, m), mTo(y, m)).filter(t => t.t === 'Penerimaan dividen' || t.t === 'Penerimaan bunga' || /sewa/i.test(t.c) && TYPES[t.t].inc); byM.push(sum(l, t => t.amt)); }
    const tot = sum(byM, x => x), exp = monthSum(y, P.m).exp;
    body = `<section class="card"><div class="top"><div><h2>Pendapatan pasif ${y}</h2><p class="sub">Dividen, bunga, dan sewa yang benar-benar diterima</p></div>${periodBar(false)}</div>${barChart(BLS, byM)}<p style="margin-top:12px">Total setahun <b>${rp(tot)}</b> · rata-rata <b>${rp(tot / 12)}</b>/bulan · menutup <b>${exp ? pct(tot / 12 / exp, 1) : '0%'}</b> pengeluaran bulanan.</p></section>`;
  }
  const nw = netWorth();
  return head('Utang, Investasi, Aset', 'Semua komponen kekayaan bersih') + `<div class="kpis"><div class="kpi"><small>Total aset</small><b>${rp(nw.aset)}</b><em>kas ${rp(nw.kas)} · tabungan ${rp(nw.tab)}</em></div><div class="kpi"><small>Investasi</small><b>${rp(nw.inv)}</b></div><div class="kpi"><small>Aset tetap</small><b>${rp(nw.at)}</b></div><div class="kpi"><small>Emas & perak</small><b>${rp(nw.lg)}</b></div><div class="kpi"><small>Piutang</small><b>${rp(nw.pi)}</b></div><div class="kpi"><small>Utang</small><b class="neg">${rp(nw.ut)}</b></div><div class="kpi"><small>Kekayaan bersih</small><b>${rp(nw.nw)}</b></div></div>` + tabs('kk', [['utang', 'Utang'], ['piutang', 'Piutang'], ['investasi', 'Investasi'], ['logam', 'Emas & Perak'], ['aset', 'Aset tetap'], ['pasif', 'Pendapatan pasif']], 'utang') + body;
};
F.debt = f => { const p = +f.p.value || 0, r = (+f.r.value || 0) / 100, t = +f.t.value || 1; const m = +f.m.value || Math.round(amort(p, r, t).pmt); S.debts.push({ n: f.n.value.trim(), kat: f.k.value, lender: '', principal: p, rate: r, tenor: t, start: f.s.value, monthly: m, paidP: +f.b.value || 0 }); save(); render(); };
A.deldebt = b => { if (confirm('Hapus utang ini?')) { S.debts.splice(+b.dataset.i, 1); save(); render(); } };
A.amort = b => { P.amort = +b.dataset.i < 0 ? null : +b.dataset.i; render(); };
F.recv = f => { const n = S.recv.length + 1, id = 'PTG-' + String(Math.max(n, ...S.recv.map(r => +r.id.replace(/\D/g, '') + 1)) ).padStart(3, '0'); S.recv.push({ id, n: f.n.value.trim(), d: f.d.value, due: f.j.value, amt: +f.a.value }); addTx({ t: 'Pemberian piutang', c: '', amt: +f.a.value, d: f.d.value, ref: id, note: 'Pinjaman ke ' + f.n.value.trim(), m: 'Tunai' }); save(); render(); };
A.delrecv = b => { S.recv.splice(+b.dataset.i, 1); save(); render(); };
F.inv = f => { S.inv.push({ n: f.n.value.trim(), jenis: f.j.value, price: +f.p.value || 0 }); save(); render(); };
C.invprice = el => { S.inv[+el.dataset.i].price = parseFloat(el.value) || 0; save(); render(); };
A.delinv = b => { S.inv.splice(+b.dataset.i, 1); save(); render(); };
F.asset = f => { const id = 'AST-' + String(S.assets.length + 1).padStart(3, '0') + uid().slice(0, 1); S.assets.push({ id, n: f.n.value.trim(), kat: f.k.value, d: f.d.value, cost: +f.c.value || 0, now: +f.v.value || 0, life: +f.l.value || 0, res: +f.r.value || 0 }); save(); render(); };
A.delasset = b => { S.assets.splice(+b.dataset.i, 1); save(); render(); };

/* ===== LAPORAN ===== */
function cashFlow(a, b) {
  const l = txIn(a, b), s = (types, sign = 1) => sum(l.filter(t => types.includes(t.t)), t => t.amt) * sign;
  const op = [['Pemasukan (gaji, usaha, dividen, bunga)', sum(l, incVal)], ['Pengeluaran', -s(['Pengeluaran'])], ['Pembayaran bunga', -s(['Pembayaran bunga'])], ['Refund', s(['Refund'])]];
  const iv = [['Pembelian investasi', -s(['Pembelian investasi'])], ['Penjualan investasi', s(['Penjualan investasi'])]];
  const fn = [['Penerimaan pinjaman', s(['Penerimaan pinjaman'])], ['Pembayaran utang (pokok)', -s(['Pembayaran utang'])]];
  const tb = [['Setoran tabungan', -s(['Setoran tabungan'])], ['Penarikan tabungan', s(['Penarikan tabungan'])], ['Pemberian piutang', -s(['Pemberian piutang'])], ['Penerimaan piutang', s(['Penerimaan piutang'])]];
  const adj = [['Penyesuaian saldo', s(['Penyesuaian saldo'])]];
  const tot = [op, iv, fn, tb, adj].flat().reduce((x, r) => x + r[1], 0);
  const open = S.set.saldoAwal + sum(okTx().filter(t => t.d < a), cashEff);
  return { groups: [['Aktivitas operasional', op], ['Aktivitas investasi', iv], ['Pendanaan (utang)', fn], ['Tabungan & piutang', tb], ['Penyesuaian', adj]], tot, open, close: open + tot, chk: Math.abs(open + tot - cashAt(b)) < 1 };
}
function labaRugi(a, b, months) {
  const l = txIn(a, b), inc = group(l.filter(t => TYPES[t.t].inc), t => t.c || 'Lainnya', t => t.amt), bb = group(l, t => t.c || 'Lain-lain', bebanVal);
  const dep = sum(S.assets.filter(x => x.life), x => { let n = 0; for (let i = 0; i < months; i++) { const d = new Date(+a.slice(0, 4), +a.slice(5, 7) - 1 + i, 1), ds = ymd(d).slice(0, 7); if (ds >= x.d.slice(0, 7) && (d.getFullYear() - +x.d.slice(0, 4)) * 12 + d.getMonth() - (+x.d.slice(5, 7) - 1) < x.life * 12) n++; } return n * (x.cost - (x.res || 0)) / (x.life * 12); });
  return { inc, bb: Object.fromEntries(Object.entries(bb).filter(x => x[1] !== 0)), ti: sum(Object.values(inc), x => x), te: sum(Object.values(bb), x => x), dep };
}
const lineRows = o => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="r">${rp(v)}</td></tr>`);
V.laporan = () => {
  const t = curTab('lp', 'bulanan'), y = P.y, m = P.m; let body = '';
  if (t === 'harian') {
    const dd = P.day || today(), l = okTx().filter(x => x.d === dd), days = new Date(y, m, 0).getDate(), rows = [];
    for (let d = 1; d <= days; d++) { const ds = `${y}-${pad(m)}-${pad(d)}`, lx = okTx().filter(x => x.d === ds); if (lx.length) rows.push(`<tr><td>${d} ${BLS[m - 1]} (${['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][new Date(y, m - 1, d).getDay()]})</td><td class="r">${rp(sum(lx, incVal))}</td><td class="r">${rp(sum(lx, bebanVal))}</td><td class="r ${signc(sum(lx, cashEff))}">${rp(sum(lx, cashEff))}</td><td class="r">${rp(cashAt(ds))}</td></tr>`); }
    body = `<section class="card"><h2>Rekap harian ${BLN[m - 1]} ${y}</h2>${tbl(['Tanggal', '>Pemasukan', '>Pengeluaran', '>Perubahan kas', '>Saldo kas akhir hari'], rows)}</section><section class="card"><div class="frm"><div class="fl" style="flex:0 0 200px"><label for="pd">Lihat tanggal</label><input type="date" id="pd" value="${dd}" data-c="day"></div></div><h2 style="margin-top:12px">Transaksi ${fmtD(dd)}</h2>${tbl(['ID', 'Jenis', 'Kategori', 'Keterangan', '>Nominal', 'Metode'], l.map(x => `<tr><td>${esc(x.id)}</td><td>${esc(x.t)}</td><td>${esc(x.c)}</td><td>${esc(x.note)}</td><td class="r">${rp(x.amt)}</td><td>${esc(x.m)}</td></tr>`), `<tr><td colspan="4">Total hari ini</td><td class="r">${rp(sum(l, cashEff))}</td><td></td></tr>`)}</section>`;
  } else if (t === 'bulanan') {
    const ms = []; for (let i = 1; i <= 12; i++) ms.push(monthSum(y, i));
    body = `<section class="card"><h2>Laporan bulanan ${y}</h2>${tbl(['Bulan', '>Pemasukan', '>Pengeluaran', '>Surplus', '>Savings rate', '>Saldo kas akhir', 'Transaksi'], ms.map((s, i) => `<tr><td>${BLN[i]}</td><td class="r">${rp(s.inc)}</td><td class="r">${rp(s.exp)}</td><td class="r ${signc(s.net)}">${rp(s.net)}</td><td class="r">${s.inc ? pct(s.net / s.inc, 0) : '-'}</td><td class="r">${rp(cashAt(mTo(y, i + 1)))}</td><td>${s.n}</td></tr>`), `<tr><td>Total</td><td class="r">${rp(sum(ms, s => s.inc))}</td><td class="r">${rp(sum(ms, s => s.exp))}</td><td class="r">${rp(sum(ms, s => s.net))}</td><td class="r">${sum(ms, s => s.inc) ? pct(sum(ms, s => s.net) / sum(ms, s => s.inc), 0) : '-'}</td><td></td><td>${sum(ms, s => s.n)}</td></tr>`)}</section>
    <section class="card"><h2>Pemasukan per kategori ${y}</h2>${tbl(['Kategori', ...BLS.map(b => '>' + b), '>Total'], S.incCats.map(c => { const v = BLS.map((_, i) => sum(txIn(mFrom(y, i + 1), mTo(y, i + 1)).filter(t => TYPES[t.t].inc && t.c === c.n), t => t.amt)); return `<tr><td>${esc(c.n)}</td>${v.map(x => `<td class="r">${x ? rp(x) : '-'}</td>`).join('')}<td class="r"><b>${rp(sum(v, x => x))}</b></td></tr>`; }), `<tr><td>Total</td>${ms.map(s => `<td class="r">${rp(s.inc)}</td>`).join('')}<td class="r">${rp(sum(ms, s => s.inc))}</td></tr>`)}</section>`;
  } else if (t === 'tahunan') {
    const ys = [...new Set(S.tx.map(x => +x.d.slice(0, 4)).concat(NOW.getFullYear()))].sort();
    body = `<section class="card"><h2>Laporan tahunan</h2>${tbl(['Tahun', '>Pemasukan', '>Pengeluaran', '>Surplus', '>Savings rate', '>Saldo kas akhir'], ys.map(yy => { const inc = sum(txIn(`${yy}-01-01`, `${yy}-12-31`), incVal), exp = sum(txIn(`${yy}-01-01`, `${yy}-12-31`), bebanVal); return `<tr><td>${yy}</td><td class="r">${rp(inc)}</td><td class="r">${rp(exp)}</td><td class="r ${signc(inc - exp)}">${rp(inc - exp)}</td><td class="r">${inc ? pct((inc - exp) / inc, 0) : '-'}</td><td class="r">${rp(cashAt(`${yy}-12-31`))}</td></tr>`; }))}</section>`;
  } else if (t === 'aruskas') {
    const cf = cashFlow(mFrom(y, m), mTo(y, m));
    body = `<section class="card"><div style="display:flex;justify-content:space-between;gap:8px"><h2>Arus kas ${BLN[m - 1]} ${y}</h2><span class="tag ${cf.chk ? 'g' : 'e'}">${cf.chk ? '✔ Cocok dengan saldo kas' : '⚠ Tidak cocok'}</span></div>${tbl(['Pos', '>Rp'], [`<tr><td><b>Saldo kas awal</b></td><td class="r"><b>${rp(cf.open)}</b></td></tr>`, ...cf.groups.map(([g, rows]) => `<tr><td colspan="2" style="background:#FAF8F2"><b>${g}</b></td></tr>` + rows.map(([n, v]) => `<tr><td style="padding-left:24px">${n}</td><td class="r ${signc(v)}">${rp(v)}</td></tr>`).join('') + `<tr><td style="padding-left:24px"><i>Subtotal</i></td><td class="r"><i>${rp(sum(rows, r => r[1]))}</i></td></tr>`)], `<tr><td>Perubahan kas</td><td class="r">${rp(cf.tot)}</td></tr><tr><td>Saldo kas akhir</td><td class="r">${rp(cf.close)}</td></tr>`)}</section>`;
  } else if (t === 'labarugi') {
    const per = curTab('lrp', 'bulan'), a = per === 'bulan' ? mFrom(y, m) : `${y}-01-01`, bb = per === 'bulan' ? mTo(y, m) : `${y}-12-31`, lr = labaRugi(a, bb, per === 'bulan' ? 1 : 12), net = lr.ti - lr.te;
    body = `<section class="card"><div class="top"><h2>Laba-rugi ${per === 'bulan' ? BLN[m - 1] + ' ' : 'tahun '}${y}</h2>${tabs('lrp', [['bulan', 'Bulan ini'], ['tahun', 'Setahun']], 'bulan')}</div>${tbl(['Pos', '>Rp'], [`<tr><td colspan="2" style="background:#FAF8F2"><b>Pendapatan</b></td></tr>`, ...lineRows(lr.inc), `<tr><td><b>Total pendapatan</b></td><td class="r"><b>${rp(lr.ti)}</b></td></tr>`, `<tr><td colspan="2" style="background:#FAF8F2"><b>Beban (pengeluaran dikurangi refund)</b></td></tr>`, ...lineRows(lr.bb), `<tr><td><b>Total beban</b></td><td class="r"><b>${rp(lr.te)}</b></td></tr>`], `<tr><td>Surplus (pendapatan − beban)</td><td class="r ${signc(net)}">${rp(net)}</td></tr><tr><td>Penyusutan aset tetap (non-kas)</td><td class="r">${rp(-lr.dep)}</td></tr><tr><td>Laba bersih setelah penyusutan</td><td class="r ${signc(net - lr.dep)}">${rp(net - lr.dep)}</td></tr>`)}<p class="sub">Setoran tabungan, pembelian investasi, dan pokok utang bukan beban: hanya perpindahan aset.</p></section>`;
  } else if (t === 'neraca') {
    const n = netWorth();
    body = `<section class="card"><h2>Neraca per hari ini (${fmtD(today())})</h2><div class="row"><div>${tbl(['Aset', '>Rp'], [['Kas', n.kas], ['Tabungan (target)', n.tab], ['Investasi (nilai pasar)', n.inv], ['Piutang', n.pi], ['Aset tetap (' + S.set.asetBasis.toLowerCase() + ')', n.at], ['Emas & perak', n.lg]].map(([k, v]) => `<tr><td>${k}</td><td class="r">${rp(v)}</td></tr>`), `<tr><td>Total aset</td><td class="r">${rp(n.aset)}</td></tr>`)}</div><div>${tbl(['Kewajiban & ekuitas', '>Rp'], [...S.debts.map(d => `<tr><td>Utang: ${esc(d.n)}</td><td class="r">${rp(debtBal(d))}</td></tr>`), `<tr><td><b>Total kewajiban</b></td><td class="r"><b>${rp(n.ut)}</b></td></tr>`, `<tr><td><b>Kekayaan bersih</b></td><td class="r"><b>${rp(n.nw)}</b></td></tr>`], `<tr><td>Kewajiban + kekayaan bersih</td><td class="r">${rp(n.ut + n.nw)}</td></tr>`)}<p class="sub">${Math.abs(n.ut + n.nw - n.aset) < 1 ? '✔ Neraca seimbang' : '⚠ Tidak seimbang'}</p></div></div></section>`;
  } else {
    const ms = monthSum(y, m), l = ms.list, inc = ms.inc, nw = netWorth(), ae = avgExpense();
    const dsr = inc ? sum(l.filter(t => t.t === 'Pembayaran utang' || t.t === 'Pembayaran bunga'), t => t.amt) / inc : 0, sr = inc ? ms.net / inc : 0, dd = sum(S.targets.filter(t => /darurat/i.test(t.n)), targetSaved);
    const rs = [['Savings rate', pct(sr, 1), `≥ ${pct(S.set.sr, 0)}`, inc ? (sr >= S.set.sr ? 'g' : sr >= S.set.sr / 2 ? 'w' : 'e') : 'n'], ['Rasio pengeluaran', inc ? pct(ms.exp / inc, 1) : '-', '≤ 80%', inc ? (ms.exp / inc <= .8 ? 'g' : ms.exp / inc <= 1 ? 'w' : 'e') : 'n'], ['Rasio cicilan (DSR)', pct(dsr, 1), `≤ ${pct(S.set.dsr, 0)}`, dsr <= S.set.dsr ? 'g' : 'e'], ['Dana darurat (bulan)', (dd / ae).toFixed(1).replace('.', ','), `${S.set.dd} bulan`, dd / ae >= S.set.dd ? 'g' : dd / ae >= 3 ? 'w' : 'e'], ['Likuiditas (kas ÷ pengeluaran)', (nw.kas / ae).toFixed(1).replace('.', ',') + ' bln', '≥ 3 bulan', nw.kas / ae >= 3 ? 'g' : nw.kas / ae >= 1 ? 'w' : 'e'], ['Utang ÷ aset', nw.aset ? pct(nw.ut / nw.aset, 1) : '-', '≤ 50%', nw.aset && nw.ut / nw.aset > .5 ? 'e' : 'g'], ['Investasi ÷ aset', nw.aset ? pct(nw.inv / nw.aset, 1) : '-', 'informasi', 'n'], ['Aset likuid (kas + tabungan)', rp(nw.kas + nw.tab), 'informasi', 'n'], ['Pendapatan pasif ÷ pengeluaran', ms.exp ? pct(sum(l.filter(t => t.t === 'Penerimaan dividen' || t.t === 'Penerimaan bunga'), t => t.amt) / ms.exp, 1) : '-', 'informasi', 'n'], ['Net worth', rp(nw.nw), 'informasi', 'n']];
    body = `<section class="card"><h2>10 rasio keuangan, ${BLN[m - 1]} ${y}</h2>${tbl(['Rasio', '>Nilai', 'Acuan', 'Status'], rs.map(r => `<tr><td>${r[0]}</td><td class="r"><b>${r[1]}</b></td><td>${r[2]}</td><td><span class="tag ${r[3]}">${{ g: 'Sehat', w: 'Perlu perhatian', e: 'Bahaya', n: 'Info' }[r[3]]}</span></td></tr>`))}</section>`;
  }
  return head('Laporan & Rasio', 'Harian, bulanan, tahunan, arus kas, laba-rugi, neraca, dan rasio', periodBar()) + tabs('lp', [['harian', 'Harian'], ['bulanan', 'Bulanan'], ['tahunan', 'Tahunan'], ['aruskas', 'Arus kas'], ['labarugi', 'Laba-rugi'], ['neraca', 'Neraca'], ['rasio', 'Rasio']], 'bulanan') + body;
};
C.day = el => { P.day = el.value; render(); };

/* ===== PROYEKSI, ZAKAT, ASURANSI, PAJAK ===== */
const SC = { Pesimis: { g: 0, r: .03, i: .06 }, Konservatif: { g: .03, r: .05, i: .05 }, Normal: { g: .05, r: .07, i: .05 }, Optimis: { g: .08, r: .09, i: .04 }, Agresif: { g: .10, r: .12, i: .04 } };
function project(sc, years, inc0, exp0, nw0) {
  let nw = nw0, rows = [], fiMonths = null; const target = exp0 * 12 / .04;
  for (let mth = 1; mth <= years * 12; mth++) {
    const inc = inc0 * Math.pow(1 + sc.g, mth / 12), exp = exp0 * Math.pow(1 + sc.i, mth / 12);
    nw = nw * (1 + sc.r / 12) + (inc - exp);
    if (fiMonths === null && nw >= target * Math.pow(1 + sc.i, mth / 12)) fiMonths = mth;
    if (mth % 12 === 0) rows.push([mth / 12, nw]);
  } return { rows, fiMonths, target };
}
V.rencana = () => {
  const t = curTab('rc', 'proyeksi'); let body = '';
  if (t === 'proyeksi') {
    const nw = netWorth().nw, inc0 = baseIncome(NOW.getFullYear(), NOW.getMonth() + 1), exp0 = avgExpense(), cur = curTab('sc', 'Normal');
    const res = Object.fromEntries(Object.entries(SC).map(([k, v]) => [k, project(v, 30, inc0, exp0, nw)])), r = res[cur];
    body = `<section class="card"><h2>Proyeksi kekayaan bersih</h2><p class="sub">Dasar: penghasilan ${rp(inc0)}/bln, pengeluaran rata-rata ${rp(exp0)}/bln, net worth sekarang ${rp(nw)}. Ini perkiraan, bukan jaminan.</p>${tabs('sc', Object.keys(SC).map(k => [k, k]), 'Normal')}
    ${tbl(['Skenario', '>Kenaikan penghasilan/thn', '>Return investasi/thn', '>Inflasi pengeluaran/thn', '>NW 5 tahun', '>NW 10 tahun'], Object.entries(SC).map(([k, v]) => `<tr><td><b>${k}</b></td><td class="r">${pct(v.g, 0)}</td><td class="r">${pct(v.r, 0)}</td><td class="r">${pct(v.i, 0)}</td><td class="r">${rp(res[k].rows[4][1])}</td><td class="r">${rp(res[k].rows[9][1])}</td></tr>`))}</section>
    <div class="row"><section class="card"><h2>Skenario ${cur}</h2>${tbl(['Tahun ke-', '>Net worth'], [1, 3, 5, 10, 20, 30].map(y => `<tr><td>${y}</td><td class="r">${rp(r.rows[y - 1][1])}</td></tr>`))}${barChart(r.rows.slice(0, 15).map(x => x[0]), r.rows.slice(0, 15).map(x => Math.max(0, x[1])))}</section>
    <section class="card"><h2>Financial Independence (aturan 4%)</h2><p class="sub">Dana yang dibutuhkan = pengeluaran tahunan ÷ 4%</p><div style="font-size:26px;font-weight:800">${rp(r.target)}</div>${r.fiMonths ? `<p>Tercapai dalam <b>${Math.floor(r.fiMonths / 12)} tahun ${r.fiMonths % 12} bulan</b> (sekitar ${NOW.getFullYear() + Math.ceil((NOW.getMonth() + 1 + r.fiMonths) / 12) - 1}) pada skenario ${cur}.</p>` : '<p>Belum tercapai dalam 30 tahun pada skenario ini. Naikkan surplus atau kurangi pengeluaran.</p>'}${tbl(['Skenario', '>Estimasi FI'], Object.entries(res).map(([k, x]) => `<tr><td>${k}</td><td class="r">${x.fiMonths ? Math.floor(x.fiMonths / 12) + ' th ' + x.fiMonths % 12 + ' bln' : '> 30 tahun'}</td></tr>`))}</section></div>`;
  } else if (t === 'zakat') { body = zakatBody();
  } else if (t === 'asuransi') {
    const inc = S.set.income * 12;
    body = `<section class="card"><h2>Asuransi</h2>${tbl(['Polis', 'Jenis', '>Premi', 'Periode', 'Jatuh tempo', '>Setahun', ''], S.ins.map((x, i) => `<tr><td>${esc(x.n)}</td><td>${esc(x.jenis)}</td><td class="r">${rp(x.premi)}</td><td>${esc(x.per)}</td><td>${fmtD(x.due)}</td><td class="r">${rp(x.premi * ({ Bulanan: 12, Triwulan: 4, Semesteran: 2, Tahunan: 1 }[x.per] || 1))}</td><td><button class="btn d s" data-a="delins" data-i="${i}">Hapus</button></td></tr>`), `<tr><td colspan="5">Total premi setahun</td><td class="r">${rp(sum(S.ins, x => x.premi * ({ Bulanan: 12, Triwulan: 4, Semesteran: 2, Tahunan: 1 }[x.per] || 1)))}</td><td>${inc ? pct(sum(S.ins, x => x.premi * ({ Bulanan: 12, Triwulan: 4, Semesteran: 2, Tahunan: 1 }[x.per] || 1)) / inc, 1) + ' penghasilan' : ''}</td></tr>`)}
    <form data-f="ins" class="frm" style="margin-top:14px">${fld('Nama polis', 'n_n', inp('n', '', 'text', 'required'))}${fld('Jenis', 'n_j', `<select name="j" id="n_j">${opt(['Kesehatan', 'Jiwa', 'Kendaraan', 'Properti', 'BPJS', 'Lainnya'], 'Kesehatan')}</select>`)}${fld('Premi (Rp)', 'n_p', num('p', '').replace('step="any"', 'step="any" required'))}${fld('Periode', 'n_r', `<select name="per" id="n_r">${opt(['Bulanan', 'Triwulan', 'Semesteran', 'Tahunan'], 'Bulanan')}</select>`)}${fld('Jatuh tempo', 'n_d', inp('d', '', 'date'))}<button class="btn">Tambah</button></form><p class="sub">Acuan: total premi 5–10% dari penghasilan.</p></section>`;
  } else if (t === 'pajak') { body = pajakBody();
  } else { body = sptBody(); }
  return head('Proyeksi, Zakat, Pajak, SPT', 'Perencanaan jangka panjang dan kewajiban zakat, pajak, serta pelaporan SPT') + tabs('rc', [['proyeksi', 'Proyeksi & FI'], ['zakat', 'Zakat'], ['pajak', 'Pajak'], ['spt', 'SPT'], ['asuransi', 'Asuransi']], 'proyeksi') + body;
};
C.gold = el => { S.set.gold = +el.value || 0; save(); render(); };
F.ins = f => { S.ins.push({ n: f.n.value.trim(), jenis: f.j.value, premi: +f.p.value || 0, per: f.per.value, due: f.d.value }); save(); render(); };
A.delins = b => { S.ins.splice(+b.dataset.i, 1); save(); render(); };
F.tax = f => { S.tax.push({ n: f.n.value.trim(), amt: +f.a.value || 0, due: f.d.value, paid: false }); save(); render(); };
A.deltax = b => { S.tax.splice(+b.dataset.i, 1); save(); render(); };
A.paytax = b => { const x = S.tax[+b.dataset.i]; addTx({ t: 'Pengeluaran', c: 'Pajak', amt: x.amt, m: 'Transfer Bank', note: 'Bayar ' + x.n }); x.paid = true; save(); render(); toast('Pajak dibayar dan dicatat'); };

/* ===== PENGATURAN ===== */
V.pengaturan = () => {
  const s = S.set, c = gh.cfg(), mt = gh.meta();
  const f = (id, label, v, type = 'number', ex = '') => fld(label, 's_' + id, `<input id="s_${id}" type="${type}" step="any" value="${esc(v)}" data-c="setv" data-k="${id}" ${ex}>`);
  return head('Pengaturan, Excel & Sinkron', 'Data tersimpan di browser ini. Unduh Excel atau sambungkan GitHub agar aman dan bisa dipakai di beberapa perangkat') + `
  <section class="card dark"><h2>Excel dan cadangan</h2><p class="sub" style="color:#CFE3DA">Unduh Excel sebagai laporan, atau impor file Keuangan Pribadi v3 / hasil unduhan Kasku.</p><div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:12px"><button class="btn l" data-a="xlsx">Unduh Excel lengkap (.xlsx)</button><button class="btn o" data-a="pickx">Impor dari Excel</button><button class="btn o" data-a="json">Cadangan JSON</button><button class="btn o" data-a="pickj">Pulihkan dari JSON</button></div><input type="file" id="fx" accept=".xlsx,.xls" hidden><input type="file" id="fj" accept=".json" hidden></section>
  <section class="card"><h2>Sinkron GitHub (opsional)</h2><p class="sub">Data disimpan sebagai satu file JSON di repository GitHub PRIBADI (private) milik Anda. Token hanya disimpan di browser ini dan tidak ikut ke Excel atau cadangan.</p>
  <form data-f="gh" class="frm" style="margin-top:12px">${fld('Pemilik (username GitHub)', 'g_o', inp('owner', c.owner || '', 'text', 'autocomplete="off"'))}${fld('Nama repository data', 'g_r', inp('repo', c.repo || '', 'text', 'autocomplete="off" placeholder="kasku-data"'))}${fld('Cabang', 'g_b', inp('branch', c.branch || 'main'))}${fld('Nama file', 'g_p', inp('path', c.path || 'data.json'))}${fld('Token (Fine-grained, akses Contents: read & write)', 'g_t', inp('token', c.token || '', 'password', 'autocomplete="off"'))}<button class="btn">Simpan dan sinkron</button>${gh.ok() ? '<button type="button" class="btn d" data-a="ghoff">Putuskan</button>' : ''}</form>
  <p style="margin-top:10px">Status: <b id="syncst2">${esc(gh.status)}</b>${mt.syncedAt ? ' · terakhir ' + new Date(mt.syncedAt).toLocaleString('id-ID') : ''}</p>
  <ol class="sub" style="line-height:1.8;padding-left:18px"><li>Buat repository <b>private</b> baru, mis. <b>kasku-data</b>, centang "Add a README" supaya cabang main ada.</li><li>GitHub → Settings → Developer settings → Fine-grained tokens → Generate. Pilih HANYA repo itu, izin <b>Contents: Read and write</b>.</li><li>Tempel token di atas, di setiap perangkat yang dipakai.</li></ol></section>
  ${lockCard()}
  <section class="card"><h2>Pengingat zakat, pajak, dan SPT</h2><p class="sub">Aplikasi ini tidak punya server, jadi notifikasi browser hanya muncul saat aplikasi dibuka. Agar HP tetap mengingatkan saat aplikasi tertutup, unduh jadwal ke kalender (.ics): alarm 7 hari, 1 hari, dan hari-H.</p><div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:10px">${s.notif ? '<button class="btn o" data-a="notifoff">Matikan notifikasi browser</button><span class="tag g" style="align-self:center">Aktif</span>' : '<button class="btn" data-a="notifon">Aktifkan notifikasi browser</button>'}<button class="btn l" data-a="ics">Unduh jadwal ke kalender (.ics)</button></div></section>
  <section class="card"><h2>Pengaturan umum</h2><div class="frm" style="margin-top:10px">${f('nama', 'Nama pemilik', s.nama, 'text')}${f('income', 'Penghasilan rutin bulanan (rencana)', s.income)}${f('saldoAwal', 'Saldo awal kas saat mulai mencatat', s.saldoAwal)}${f('low', 'Batas saldo kas rendah', s.low)}${f('dsr', 'Batas aman rasio cicilan (0,3 = 30%)', s.dsr)}${f('sr', 'Target savings rate (0,2 = 20%)', s.sr)}${f('warn', 'Ambang waspada anggaran (0,85)', s.warn)}${f('dd', 'Dana darurat ideal (bulan)', s.dd)}${fld('Nilai aset tetap di neraca', 's_ab', `<select id="s_ab" data-c="setv" data-k="asetBasis">${opt(['Nilai Buku', 'Nilai Saat Ini'], s.asetBasis)}</select>`)}</div></section>
  <section class="card"><h2>Kategori pemasukan</h2><div style="margin:10px 0">${S.incCats.map((x, i) => `<span class="tag ${x.t === 'Pasif' ? 'i' : 'g'}" style="margin:3px">${esc(x.n)} · ${x.t} <button data-a="delinc" data-i="${i}" aria-label="Hapus ${esc(x.n)}" style="border:0;background:none;cursor:pointer;min-width:24px;min-height:24px">×</button></span>`).join('')}</div><form data-f="inc" class="frm">${fld('Kategori baru', 'ic_n', inp('n', '', 'text', 'required'))}${fld('Sifat', 'ic_t', `<select name="t" id="ic_t">${opt(['Aktif', 'Pasif'], 'Aktif')}</select>`)}<button class="btn">Tambah</button></form></section>
  <section class="card"><h2>Checklist penutupan bulanan</h2>${['Semua transaksi bulan ini sudah dicatat dan kolom Cek bertanda ✔', 'Harga pasar investasi sudah diperbarui', 'Arus kas dan neraca cocok', 'Tagihan sudah ditandai', 'Tinjau anggaran, rasio, dan dashboard', 'Unduh Excel sebagai cadangan'].map((x, i) => `<label class="ck"><input type="checkbox" data-c="ck" data-i="${i}" ${(S.ck || {})[ym2()]?.[i] ? 'checked' : ''}> ${x}</label>`).join('')}</section>
  <section class="card"><h2>Zona berbahaya</h2><p class="sub">Menghapus semua data di browser ini. Unduh cadangan dulu.</p><button class="btn d" data-a="reset">Hapus semua data</button></section>`;
};
const ym2 = () => ymd(NOW).slice(0, 7);
C.setv = el => { const k = el.dataset.k; S.set[k] = typeof defaults().set[k] === 'number' ? parseFloat(el.value) || 0 : el.value; save(); };
C.ck = el => { S.ck = S.ck || {}; S.ck[ym2()] = S.ck[ym2()] || {}; S.ck[ym2()][el.dataset.i] = el.checked; save(); };
F.inc = f => { S.incCats.push({ n: f.n.value.trim(), t: f.t.value }); save(); render(); };
A.delinc = b => { S.incCats.splice(+b.dataset.i, 1); save(); render(); };
A.xlsx = exportXLSX; A.json = exportJSON;
A.pickx = () => $('#fx').click(); A.pickj = () => $('#fj').click();
A.reset = () => { if (confirm('Yakin hapus SEMUA data di browser ini? Tidak bisa dibatalkan.') && confirm('Sekali lagi: hapus semua data?')) { S = defaults(); save(); render(); } };
A.ghoff = () => { gh.setCfg({}); localStorage.removeItem(LSM); setStatus('Belum disambungkan'); render(); };
F.gh = async f => { gh.setCfg({ owner: f.owner.value.trim(), repo: f.repo.value.trim(), branch: f.branch.value.trim() || 'main', path: f.path.value.trim() || 'data.json', token: f.token.value.trim() }); gh.setMeta({}); await ghSync(); render(); };

/* ===== ROUTER & EVENT ===== */
function render() {
  if (LOCKED) return;
  const pg = P.page, scrollY = window.scrollY;
  let lastG = '';
  $('#nav').innerHTML = `<div class="lo"><b>K</b><span><strong>Kasku</strong><small>${esc(S.set.nama)} · Keuangan pribadi</small></span></div>` + PAGES.map(([k, l, g]) => (g && g !== lastG ? `<div class="gl">${(lastG = g)}</div>` : '') + `<a class="nv ${k === pg ? 'on' : ''}" href="#/${k}" ${k === pg ? 'aria-current="page"' : ''}><i></i>${l}${k === 'rencana' && typeof notifs === 'function' && notifs().length ? ` <span class="tag e" style="margin-left:auto">${notifs().length}</span>` : ''}</a>`).join('') + `<div class="sy"><b>${KEY ? 'Terkunci PIN' : 'Data di perangkat ini'}</b><span id="syncst">${esc(gh.status)}</span>${KEY ? '<button class="btn l s" style="margin-top:8px;width:100%" data-a="locknow">Kunci sekarang</button>' : ''}</div>`;
  $('#bn').innerHTML = [['dashboard', 'Beranda'], ['catat', 'Catat'], ['transaksi', 'Buku'], ['laporan', 'Laporan'], ['pengaturan', 'Lainnya']].map(([k, l]) => `<a href="#/${k}" class="${k === pg ? 'on' : ''}"><i></i>${l}</a>`).join('');
  try { $('#view').innerHTML = (V[pg] || V.dashboard)(); } catch (e) { console.error(e); $('#view').innerHTML = `<div class="card"><h2>Terjadi kesalahan menampilkan halaman</h2><p class="sub">${esc(e.message)}. Data Anda aman. Coba muat ulang atau unduh cadangan di Pengaturan.</p></div>`; }
  window.scrollTo(0, scrollY);
}
function route() { const h = (location.hash.replace('#/', '') || 'dashboard'); P.page = V[h] ? h : 'dashboard'; P.edit = null; render(); window.scrollTo(0, 0); }
document.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b) return; if (b.dataset.a === 'tab') { P.tab[b.dataset.k] = b.dataset.v; render(); } else if (A[b.dataset.a]) { e.preventDefault(); A[b.dataset.a](b, e); } });
document.addEventListener('submit', e => { const f = e.target.closest('[data-f]'); if (!f) return; e.preventDefault(); F[f.dataset.f]?.(f); });
document.addEventListener('change', e => { const el = e.target.closest('[data-c]'); if (!el) return; const k = el.dataset.c; if (k === 'period') { P.y = +$('#py').value; if ($('#pm')) P.m = +$('#pm').value; render(); } else if (k !== 'fq') C[k]?.(el); });
document.addEventListener('input', e => { const el = e.target.closest('[data-c="fq"]'); if (el) C.fq(el); });
document.addEventListener('change', e => {
  const t = e.target; if (t.id === 'fx' && t.files[0]) { importXLSX(t.files[0]); t.value = ''; }
  if (t.id === 'fj' && t.files[0]) { t.files[0].text().then(async x => { try { let d = JSON.parse(x); if (d.enc) { const pw = prompt('Cadangan ini terenkripsi. Masukkan PIN saat cadangan dibuat:'); if (!pw) return; d = JSON.parse(await decPayload(d, await deriveKey(pw, d.salt, d.it || 250000))); } if (!d.tx || !d.set) throw 0; if (confirm('Ganti semua data dengan isi cadangan ini?')) { S = normalize(d); save(); render(); toast('Data dipulihkan'); } } catch { toast('File JSON tidak valid atau PIN salah'); } }); t.value = ''; }
});
window.addEventListener('hashchange', route);
