'use strict';
/* ===== Kasku: Emas & Perak, Zakat, Pajak, SPT, Pengingat ===== */
const daysTo = d => Math.round((new Date(d + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 864e5);
const dueTxt = d => { const n = daysTo(d); return n < 0 ? `terlambat ${-n} hari` : n === 0 ? 'hari ini' : `${n} hari lagi`; };
const dueTag = (d, paid) => paid ? '<span class="tag g">Sudah</span>' : !d ? '<span class="tag n">Tanpa tanggal</span>' : daysTo(d) < 0 ? '<span class="tag e">Lewat</span>' : daysTo(d) <= 7 ? '<span class="tag w">≤ 7 hari</span>' : '<span class="tag i">Terjadwal</span>';
const addY = (d, n) => `${+d.slice(0, 4) + n}${d.slice(4)}`;
const addM = (d, n) => { const x = new Date(+d.slice(0, 4), +d.slice(5, 7) - 1 + n, Math.min(+d.slice(8, 10), 28)); return ymd(x); };
const lastDay = (y, m) => `${y}-${pad(m)}-${pad(new Date(y, m, 0).getDate())}`;
const zPaid = key => S.zakat.some(z => z.key === key && z.paid);
const gramFmt = n => (+n || 0).toLocaleString('id-ID', { maximumFractionDigits: 3 }) + ' g';

/* ---------- Emas & perak ---------- */
function logamPrice(x) { return +x.price || (x.jenis === 'Emas' ? +S.set.gold : x.jenis === 'Perak' ? +S.set.silver : 0) || 0; }
function logamVal(x) { return (+x.gram || 0) * logamPrice(x); }
function logamBody() {
  const st = S.set, E = S.logam.filter(x => x.jenis === 'Emas'), Pk = S.logam.filter(x => x.jenis === 'Perak');
  const sm = a => sum(a, x => +x.gram || 0);
  return `<section class="card"><h2>Harga per gram (isi manual)</h2><p class="sub">Ubah harga ini kapan saja. Nilai semua emas/perak langsung ikut berubah dan masuk ke kekayaan bersih.</p>
  <div class="frm" style="margin-top:10px">${fld('Harga emas per gram (Rp)', 'p_g', `<input id="p_g" type="number" step="any" value="${st.gold || ''}" data-c="lgprice" data-k="gold" placeholder="mis. isi dari harga hari ini">`)}${fld('Harga perak per gram (Rp)', 'p_s', `<input id="p_s" type="number" step="any" value="${st.silver || ''}" data-c="lgprice" data-k="silver">`)}</div>
  <div class="kpis" style="margin-top:14px"><div class="kpi"><small>Total emas</small><b>${gramFmt(sm(E))}</b><em>${rp(sum(E, logamVal))}</em></div><div class="kpi"><small>Total perak</small><b>${gramFmt(sm(Pk))}</b><em>${rp(sum(Pk, logamVal))}</em></div><div class="kpi"><small>Total nilai emas + perak</small><b>${rp(sum(S.logam, logamVal))}</b><em>${S.logam.length} item</em></div></div></section>
  <section class="card"><h2>Daftar emas, perak, dan logam lain</h2>${tbl(['Jenis', 'Keterangan', 'Tgl beli', '>Berat', '>Dipakai sehari-hari', '>Harga/gram', '>Nilai sekarang', '>Untung/rugi', ''], S.logam.map((x, i) => `<tr><td><span class="tag ${x.jenis === 'Emas' ? 'w' : 'n'}">${esc(x.jenis)}</span></td><td>${esc(x.n)}</td><td>${fmtD(x.d)}</td><td class="r">${gramFmt(x.gram)}</td><td class="r">${gramFmt(x.pakai || 0)}</td><td style="width:140px"><input type="number" step="any" value="${x.price || ''}" placeholder="${logamPrice({ ...x, price: 0 }) ? 'umum: ' + logamPrice({ ...x, price: 0 }).toLocaleString('id-ID') : 'isi harga'}" data-c="lgitem" data-i="${i}" aria-label="Harga per gram ${esc(x.n)}"></td><td class="r"><b>${rp(logamVal(x))}</b></td><td class="r ${x.buy ? signc(logamVal(x) - x.buy) : ''}">${x.buy ? rp(logamVal(x) - x.buy) : '-'}</td><td><button class="btn d s" data-a="dellogam" data-i="${i}">Hapus</button></td></tr>`), `<tr><td colspan="3">Total</td><td class="r">${gramFmt(sm(S.logam))}</td><td></td><td></td><td class="r">${rp(sum(S.logam, logamVal))}</td><td colspan="2"></td></tr>`)}
  <form data-f="logam" class="frm" style="margin-top:14px">${fld('Jenis', 'lg_j', `<select name="j" id="lg_j">${opt(['Emas', 'Perak', 'Logam lain'], 'Emas')}</select>`)}${fld('Keterangan', 'lg_n', inp('n', '', 'text', 'required placeholder="mis. Antam 10 g, cincin, kalung"'))}${fld('Berat (gram)', 'lg_g', num('g', '').replace('step="any"', 'step="any" required'))}${fld('Tanggal beli / dimiliki', 'lg_d', inp('d', today(), 'date'))}${fld('Berat dipakai sehari-hari (g, perhiasan)', 'lg_p', num('p', '0'))}${fld('Harga beli total (opsional)', 'lg_b', num('b', ''))}${fld('Harga/gram sekarang (kosong = harga umum)', 'lg_h', num('h', ''))}
  <label style="display:flex;align-items:center;gap:8px;min-height:44px;flex:1 1 100%"><input type="checkbox" name="kas" style="width:20px;height:20px"> Dibeli dengan uang kas yang tercatat (catat pengeluaran kas, butuh harga beli)</label><button class="btn">Tambah</button></form>
  <p class="sub">Perhiasan yang dipakai sehari-hari dikurangi dari berat yang dizakati (sesuai contoh di Panduan Zakat Praktis). Tanggal beli dipakai untuk memantau haul 1 tahun.</p></section>`;
}
C.lgprice = el => { S.set[el.dataset.k] = parseFloat(el.value) || 0; save(); render(); };
C.lgitem = el => { S.logam[+el.dataset.i].price = parseFloat(el.value) || 0; save(); render(); };
A.dellogam = b => { if (confirm('Hapus item ini?')) { S.logam.splice(+b.dataset.i, 1); save(); render(); } };
F.logam = f => {
  const id = 'LG-' + uid(), buy = +f.b.value || 0, o = { id, jenis: f.j.value, n: f.n.value.trim(), gram: +f.g.value || 0, d: f.d.value, pakai: +f.p.value || 0, buy, price: +f.h.value || 0 };
  S.logam.push(o);
  if (f.kas.checked) { if (!buy) toast('Harga beli kosong, pengeluaran kas tidak dicatat.'); else addTx({ t: 'Pembelian investasi', c: 'Investasi', amt: buy, d: o.d, m: 'Transfer Bank', ref: 'logam:' + id, unit: o.gram, note: 'Beli ' + o.jenis + ' ' + o.n }); }
  save(); render();
};

/* ---------- Zakat: aturan Panduan Zakat Praktis (Kemenag RI, 2013) ---------- */
function zakatInfo() {
  const st = S.set, gold = +st.gold || 0, silver = +st.silver || 0;
  const emas = S.logam.filter(x => x.jenis === 'Emas'), perak = S.logam.filter(x => x.jenis === 'Perak');
  const net = a => sum(a, x => Math.max(0, (+x.gram || 0) - (+x.pakai || 0)));
  const gE = net(emas), gP = net(perak);
  const hs = (arr, nis) => { let c = 0; for (const x of [...arr].filter(x => x.d).sort((a, b) => a.d.localeCompare(b.d))) { c += Math.max(0, (+x.gram || 0) - (+x.pakai || 0)); if (c >= nis) return x.d; } return ''; };
  const n = netWorth(), debtDue = sum(S.debts, d => Math.min(debtBal(d), (d.monthly || 0) * 12));
  return { gold, silver, gE, gP, hsE: hs(emas, 85), hsP: hs(perak, 595), zE: gE >= 85 ? gE * gold * .025 : 0, zP: gP >= 595 ? gP * silver * .025 : 0, harta: n.kas + n.tab + n.inv + n.pi - debtDue, nisabE: 85 * gold, debtDue };
}
function nextAnniv(start, prefix) {
  if (!start) return null;
  for (let k = +start.slice(0, 4) + 1; k <= +start.slice(0, 4) + 80; k++) { const d = `${k}${start.slice(4)}`; if (daysTo(d) < -60) continue; const key = prefix + ':' + k; if (zPaid(key)) continue; return { d, key }; }
  return null;
}
function autoZakat() {
  const st = S.set, z = zakatInfo(), out = [], y = NOW.getFullYear(), ym = today().slice(0, 7);
  const push = (key, n, amt, due, note) => { if (!zPaid(key)) out.push({ key, n, amt: Math.round(amt), due, note, auto: true }); };
  if (z.gE >= 85) { const a = nextAnniv(z.hsE, 'emas'); if (a) push(a.key, 'Zakat emas', z.zE, a.d, `${gramFmt(z.gE)} emas × 2,5%, haul 1 tahun sejak ${fmtD(z.hsE)}${z.gold ? '' : ' (isi harga emas)'}`); }
  if (z.gP >= 595) { const a = nextAnniv(z.hsP, 'perak'); if (a) push(a.key, 'Zakat perak', z.zP, a.d, `${gramFmt(z.gP)} perak × 2,5%, haul sejak ${fmtD(z.hsP)}${z.silver ? '' : ' (isi harga perak)'}`); }
  if (st.haulMaal && z.harta > 0 && (!z.gold || z.harta >= z.nisabE)) { const a = nextAnniv(st.haulMaal, 'maal'); if (a) push(a.key, 'Zakat maal (simpanan)', z.harta * .025, a.d, `2,5% dari harta bersih ${rp(z.harta)}, haul sejak ${fmtD(st.haulMaal)}`); }
  if (st.zakatMode === 'bulanan') { const inc = monthSum(y, NOW.getMonth() + 1).inc || st.income; push('pgh:' + ym, 'Zakat penghasilan ' + BLN[NOW.getMonth()], inc * .025, lastDay(y, NOW.getMonth() + 1), `2,5% dari penghasilan ${rp(inc)} (dibayar tiap menerima penghasilan)`); }
  else if (st.zakatMode === 'tahunan') { const ann = Math.max(sum(txIn(`${y}-01-01`, `${y}-12-31`), incVal), st.income * 12); if (!z.gold || ann >= z.nisabE) push('pghY:' + y, 'Zakat penghasilan ' + y, ann * .025, `${y}-12-31`, `2,5% dari penghasilan setahun ${rp(ann)} (nisab 85 g emas)`); }
  if (st.fitrahDate && st.jiwa > 0 && st.berasKg > 0) push('fitrah:' + st.fitrahDate.slice(0, 4), 'Zakat fitrah', st.jiwa * 2.5 * st.berasKg, st.fitrahDate, `${st.jiwa} jiwa × 2,5 kg × ${rp(st.berasKg)}/kg, bayar sebelum salat Id`);
  return out.sort((a, b) => a.due.localeCompare(b.due));
}

/* ---------- SPT ---------- */
S.spt = S.spt || { done: {}, ck: {} };
function nextSpt() {
  S.spt = S.spt || { done: {}, ck: {} };
  for (let ty = NOW.getFullYear() - 1; ty < NOW.getFullYear() + 5; ty++) { const due = `${ty + 1}-03-31`; if (S.spt.done[ty] || daysTo(due) < -60) continue; return { ty, due, n: daysTo(due) }; }
  return null;
}
const SPT_TABLE = [['I', 'SPT Tahunan', ''], ['1', 'SPT Tahunan Wajib Pajak Orang Pribadi (termasuk Wajib Pajak Warisan Belum Terbagi)', 'Paling lama 3 bulan setelah akhir Tahun Pajak (31 Maret)'], ['2', 'SPT Tahunan Wajib Pajak Badan', 'Paling lama 4 bulan setelah akhir Tahun Pajak (30 April)'], ['II', 'SPT Masa', ''], ['1', 'PPh Pasal 4 ayat 2', 'Paling lama 20 hari setelah Masa Pajak berakhir'], ['2', 'PPh Pasal 15', 'Paling lama 20 hari setelah Masa Pajak berakhir'], ['3', 'PPh Pasal 21/26', 'Paling lama 20 hari setelah Masa Pajak berakhir'], ['4', 'PPh Pasal 23/26', 'Paling lama 20 hari setelah Masa Pajak berakhir'], ['5', 'PPh Pasal 25', 'Paling lama 20 hari setelah Masa Pajak berakhir'], ['6', 'PPN & PPnBM', 'Paling lama akhir bulan berikutnya setelah Masa Pajak berakhir'], ['7', 'PPh Pasal 22', 'Paling lama 20 hari setelah Masa Pajak berakhir'], ['8', 'PPh Pasal 22, PPN atau PPN dan PPnBM atas impor yang dipungut oleh Direktorat Jenderal Bea dan Cukai', 'Hari kerja terakhir minggu berikutnya'], ['9', 'PPh Pasal 22 yang dipungut oleh Instansi Pemerintah', 'Paling lama 20 hari setelah Masa Pajak berakhir']];
const SPT_CK = ['Penghasilan dari pekerjaan: ambil bukti potong PPh 21 (Form 1721-A1/A2) dari pemberi kerja', 'Penghasilan lain: freelance/usaha sampingan (hitung neto), honor, komisi', 'Penghasilan bunga, dividen, sewa, hadiah, dan penjualan aset (cek mana yang PPh final dan mana yang tidak)', 'Harta per 31 Desember: kas dan rekening, tabungan, deposito, saham/reksa dana, emas/perak, kripto, piutang, kendaraan, tanah/bangunan (tahun dan harga perolehan)', 'Utang per 31 Desember (sisa pokok: KPR, kendaraan, pinjaman, kartu kredit)', 'Susunan keluarga/tanggungan (status kawin dan jumlah anak) untuk PTKP', 'Pajak yang sudah dipotong atau dibayar (PPh 21 di bukti potong, PPh 25, PPh 22/23 jika ada)', 'Zakat atau sumbangan keagamaan wajib yang dibayar ke lembaga resmi (BAZNAS/LAZ yang disahkan), simpan buktinya sebagai pengurang penghasilan bruto', 'Siapkan NPWP, akun DJP Online, dan kode otorisasi/sertifikat elektronik untuk lapor lewat e-Filing'];
function sptBahan(ty) {
  const a = `${ty}-01-01`, b = `${ty}-12-31`, l = txIn(a, b).filter(t => TYPES[t.t].inc), g = group(l, t => t.c || 'Lainnya', t => t.amt);
  const hint = c => /gaji|tunjangan|lembur|bonus|thr/i.test(c) ? 'Penghasilan dari pekerjaan: cocokkan dengan bukti potong 1721-A1' : /freelance|usaha/i.test(c) ? 'Penghasilan usaha/pekerjaan bebas: hitung neto' : /dividen|bunga/i.test(c) ? 'Penghasilan lain (bunga/dividen), cek apakah final' : /sewa/i.test(c) ? 'Penghasilan sewa, cek apakah final' : 'Penghasilan lain';
  const n = netWorth(), now = NOW.getFullYear() === ty ? today() : b;
  const harta = [['Kas dan rekening (per ' + fmtD(b) + ')', cashAt(b)], ['Tabungan target', n.tab], ['Investasi (nilai sekarang)', n.inv], ['Emas/perak (nilai sekarang)', n.lg], ['Piutang', n.pi], ...S.assets.filter(x => +x.d.slice(0, 4) <= ty).map(x => [`${x.n} (harta, harga perolehan, tahun ${x.d.slice(0, 4)})`, x.cost])];
  return {
    peng: Object.entries(g).map(([k, v]) => [k, v, hint(k)]), totalPeng: sum(Object.values(g), x => x), harta, totalHarta: sum(harta, x => x[1]), utang: S.debts.map(d => [d.n, debtBal(d)]), totalUtang: sum(S.debts, debtBal),
    zakat: sum(S.zakat.filter(z => z.paid && (z.paidDate || '').startsWith(String(ty))), z => z.amt), pajak: sum(S.tax.filter(z => z.paid && (z.paidDate || '').startsWith(String(ty))), z => z.amt)
  };
}
function sptBody() {
  const sp = nextSpt(), ty = P.sptY || (sp ? sp.ty : NOW.getFullYear() - 1), bh = sptBahan(ty); S.spt.ck[ty] = S.spt.ck[ty] || {};
  return `<section class="card ${sp && sp.n <= 30 ? '' : ''}" style="${sp && sp.n < 0 ? 'border-color:#E5533D' : ''}"><h2>Kapan lapor SPT Tahunan?</h2>
  ${sp ? `<div style="font-size:26px;font-weight:800;margin:8px 0">${fmtD(sp.due)} <span class="tag ${sp.n < 0 ? 'e' : sp.n <= 30 ? 'w' : 'i'}">${dueTxt(sp.due)}</span></div><p>SPT Tahunan PPh Orang Pribadi untuk <b>tahun pajak ${sp.ty}</b>. Batas lapor 31 Maret ${sp.ty + 1} (3 bulan setelah akhir tahun pajak). Lebih awal lebih aman: lapor lewat e-Filing DJP Online.</p><button class="btn l" data-a="sptdone" data-ty="${sp.ty}">Saya sudah lapor SPT tahun ${sp.ty}</button>` : '<p>Tidak ada SPT yang menunggu.</p>'}
  <p class="sub" style="margin-top:10px">Telat lapor SPT Tahunan PPh Orang Pribadi umumnya dikenai denda administrasi Rp100.000 (SPT Masa Rp500.000 untuk PPN dan Rp100.000 untuk SPT Masa lain). Periksa ketentuan terbaru di pajak.go.id atau Kring Pajak 1500200.</p>
  ${Object.keys(S.spt.done).filter(k => S.spt.done[k]).map(k => `<span class="tag g" style="margin:2px">SPT ${k} ✔ <button data-a="sptundo" data-ty="${k}" style="border:0;background:none;cursor:pointer;min-width:24px;min-height:24px" aria-label="Batalkan SPT ${k}">×</button></span>`).join('')}</section>
  <section class="card"><h2>Batas waktu pelaporan SPT (sumber: DJP)</h2>${tbl(['No', 'Jenis SPT', 'Batas waktu pelaporan'], SPT_TABLE.map(r => /^(I|II)$/.test(r[0]) ? `<tr><td colspan="3" style="background:#FAF8F2"><b>${r[0]}. ${r[1]}</b></td></tr>` : `<tr><td>${r[0]}</td><td style="white-space:normal">${r[1]}</td><td style="white-space:normal">${r[2]}</td></tr>`))}<p class="sub">Khusus Wajib Pajak Instansi Pemerintah tidak perlu melaporkan SPT Tahunan PPh. Tahun Pajak = 1 tahun kalender kecuali memakai tahun buku yang berbeda. Untuk karyawan biasa, yang relevan umumnya SPT Tahunan OP (31 Maret). SPT Masa berlaku bila Anda punya usaha atau memungut/memotong pajak.</p></section>
  <section class="card"><div class="top"><div><h2>Apa yang dilaporkan di SPT Tahunan OP</h2><p class="sub">Ceklis persiapan untuk tahun pajak ${ty}. Ringkasan umum, bukan nasihat pajak.</p></div><div class="fl" style="flex:0 0 130px"><label for="sy">Tahun pajak</label><select id="sy" data-c="sptyear">${opt([NOW.getFullYear() - 2, NOW.getFullYear() - 1, NOW.getFullYear()], ty)}</select></div></div>${SPT_CK.map((x, i) => `<label class="ck"><input type="checkbox" data-c="sptck" data-ty="${ty}" data-i="${i}" ${S.spt.ck[ty][i] ? 'checked' : ''}> ${x}</label>`).join('')}</section>
  <section class="card"><div class="top"><div><h2>Bahan SPT ${ty} dari pembukuan Anda</h2><p class="sub">Dihitung otomatis dari Buku Transaksi. Cocokkan dengan bukti potong dan dokumen asli sebelum mengisi.</p></div><button class="btn o" data-a="sptxlsx" data-ty="${ty}">Unduh Excel</button></div>
  ${tbl(['Penghasilan', '>Rp', 'Catatan pengisian'], bh.peng.map(r => `<tr><td>${esc(r[0])}</td><td class="r">${rp(r[1])}</td><td style="white-space:normal">${r[2]}</td></tr>`), `<tr><td>Total penghasilan tercatat ${ty}</td><td class="r">${rp(bh.totalPeng)}</td><td></td></tr>`)}
  <div style="height:12px"></div>${tbl(['Harta', '>Rp'], bh.harta.map(r => `<tr><td style="white-space:normal">${esc(r[0])}</td><td class="r">${rp(r[1])}</td></tr>`), `<tr><td>Total harta</td><td class="r">${rp(bh.totalHarta)}</td></tr>`)}
  <div style="height:12px"></div>${tbl(['Utang (sisa pokok sekarang)', '>Rp'], bh.utang.map(r => `<tr><td>${esc(r[0])}</td><td class="r">${rp(r[1])}</td></tr>`), `<tr><td>Total utang</td><td class="r">${rp(bh.totalUtang)}</td></tr>`)}
  <div style="height:12px"></div>${tbl(['Pembayaran tercatat tahun ' + ty, '>Rp'], [`<tr><td>Zakat yang sudah ditandai dibayar</td><td class="r">${rp(bh.zakat)}</td></tr>`, `<tr><td>Pajak yang sudah ditandai dibayar</td><td class="r">${rp(bh.pajak)}</td></tr>`])}
  <p class="sub">Nilai harta selain kas memakai nilai saat ini. Untuk tahun lalu, sesuaikan dengan nilai per 31 Desember dan harga perolehan.</p></section>`;
}
C.sptyear = el => { P.sptY = +el.value; render(); };
C.sptck = el => { S.spt.ck[el.dataset.ty] = S.spt.ck[el.dataset.ty] || {}; S.spt.ck[el.dataset.ty][el.dataset.i] = el.checked; save(); };
A.sptdone = b => { if (confirm(`Konfirmasi: SPT Tahunan tahun pajak ${b.dataset.ty} sudah Anda laporkan?`)) { S.spt.done[b.dataset.ty] = true; save(); render(); toast('SPT ditandai sudah dilaporkan'); } };
A.sptundo = b => { delete S.spt.done[b.dataset.ty]; save(); render(); };
A.sptxlsx = b => {
  if (typeof XLSX === 'undefined') return toast('Pustaka Excel belum termuat (butuh internet).');
  const ty = +b.dataset.ty, h = sptBahan(ty), wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[`Bahan SPT Tahunan OP ${ty}`], [], ['PENGHASILAN', 'Rp', 'Catatan'], ...h.peng, ['Total', h.totalPeng], [], ['HARTA', 'Rp'], ...h.harta, ['Total', h.totalHarta], [], ['UTANG', 'Rp'], ...h.utang, ['Total', h.totalUtang], [], ['Zakat dibayar', h.zakat], ['Pajak dibayar', h.pajak]]), 'Bahan SPT');
  XLSX.writeFile(wb, `Bahan_SPT_${ty}.xlsx`);
};

/* ---------- Pajak ---------- */
function pajakBody() {
  const rows = S.tax.map((x, i) => [x, i]).sort((a, b) => (a[0].paid - b[0].paid) || (a[0].due || '9').localeCompare(b[0].due || '9'));
  return `<section class="card"><h2>Pajak yang harus dibayar</h2><p class="sub">Masukkan jenis pajak, nominal, dan batas bayar. Pengingat muncul di Dashboard, notifikasi browser, dan kalender HP (.ics).</p>
  ${tbl(['Jenis pajak', '>Nominal', 'Batas bayar', 'Ulang', 'Status', 'Catatan', ''], rows.map(([x, i]) => `<tr><td>${esc(x.n)}</td><td class="r">${rp(x.amt)}</td><td>${fmtD(x.due)}${x.paid ? '' : x.due ? `<br><small class="sub">${dueTxt(x.due)}</small>` : ''}</td><td>${esc(x.rep || 'Tidak')}</td><td>${dueTag(x.due, x.paid)}${x.paid && x.paidDate ? `<br><small class="sub">${fmtD(x.paidDate)}</small>` : ''}</td><td style="white-space:normal;max-width:180px">${esc(x.note || '')}</td><td>${x.paid ? `<button class="btn o s" data-a="taxundo" data-i="${i}">Batalkan</button>` : `<button class="btn s" data-a="paytax" data-i="${i}">Sudah dibayar</button> <button class="btn o s" data-a="taxmark" data-i="${i}">Tandai saja</button>`} <button class="btn d s" data-a="deltax" data-i="${i}" aria-label="Hapus ${esc(x.n)}">Hapus</button></td></tr>`), `<tr><td>Belum dibayar</td><td class="r">${rp(sum(S.tax.filter(x => !x.paid), x => x.amt))}</td><td colspan="5"></td></tr>`)}
  <p class="sub">"Sudah dibayar" menandai lunas dan mencatat pengeluaran (kategori Pajak). "Tandai saja" hanya menandai, kalau Anda sudah mencatatnya sendiri.</p></section>
  <section class="card"><h2>Tambah pajak</h2><form data-f="tax" class="frm" style="margin-top:10px">${fld('Jenis pajak', 'x_n', inp('n', '', 'text', 'required list="dl-tax" placeholder="mis. PBB, Pajak kendaraan"'))}<datalist id="dl-tax"><option value="PBB"><option value="Pajak kendaraan (PKB)"><option value="SWDKLLJ"><option value="PPh 25 (angsuran)"><option value="PPh kurang bayar SPT Tahunan"><option value="PPN"><option value="Pajak daerah lainnya"></datalist>${fld('Nominal (Rp)', 'x_a', num('a', '').replace('step="any"', 'step="any" required'))}${fld('Batas pembayaran', 'x_d', inp('d', '', 'date', 'required'))}${fld('Berulang', 'x_r', `<select name="r" id="x_r">${opt(['Tidak', 'Tahunan', 'Bulanan'], 'Tidak')}</select>`)}${fld('Catatan', 'x_c', inp('c', ''))}<button class="btn">Tambah pajak</button></form></section>`;
}
F.tax = f => { S.tax.push({ id: uid(), n: f.n.value.trim(), amt: +f.a.value || 0, due: f.d.value, rep: f.r.value, note: f.c.value.trim(), paid: false }); save(); render(); toast('Pajak ditambahkan'); };
A.deltax = b => { if (confirm('Hapus pajak ini dari daftar?')) { S.tax.splice(+b.dataset.i, 1); save(); render(); } };
function taxDone(i, record) {
  const x = S.tax[i]; x.paid = true; x.paidDate = today();
  if (record) addTx({ t: 'Pengeluaran', c: 'Pajak', amt: x.amt, m: 'Transfer Bank', note: 'Bayar ' + x.n });
  if (x.rep && x.rep !== 'Tidak' && x.due) S.tax.push({ id: uid(), n: x.n, amt: x.amt, due: x.rep === 'Tahunan' ? addY(x.due, 1) : addM(x.due, 1), rep: x.rep, note: x.note, paid: false });
  save(); render(); toast(x.rep && x.rep !== 'Tidak' ? 'Lunas. Jadwal berikutnya sudah dibuat' : 'Pajak ditandai sudah dibayar');
}
A.paytax = b => { const x = S.tax[+b.dataset.i]; if (confirm(`Konfirmasi: ${x.n} sebesar ${rp(x.amt)} SUDAH dibayar?\n\nOK = tandai lunas dan catat sebagai pengeluaran.\nBatal = tidak ada perubahan.`)) taxDone(+b.dataset.i, true); };
A.taxmark = b => { const x = S.tax[+b.dataset.i]; if (confirm(`Tandai ${x.n} sudah dibayar (tanpa mencatat pengeluaran)?`)) taxDone(+b.dataset.i, false); };
A.taxundo = b => { const x = S.tax[+b.dataset.i]; x.paid = false; x.paidDate = ''; save(); render(); toast('Status dibatalkan. Pengeluaran yang sudah tercatat tidak ikut dihapus.'); };

/* ---------- Zakat (halaman) ---------- */
const ZJENIS = ['Zakat maal (simpanan)', 'Zakat penghasilan', 'Zakat emas', 'Zakat perak', 'Zakat perdagangan', 'Zakat investasi / sewa', 'Zakat THR / hadiah / komisi', 'Zakat hibah', 'Zakat fitrah', 'Infaq / sedekah'];
const ZRULES = [
  ['Syarat harta wajib zakat maal', 'Milik penuh; berkembang; mencapai nisab; cukup haul (1 tahun); lebih dari kebutuhan pokok; bebas dari utang.'],
  ['Emas dan perak', 'Nisab 85 gram emas (20 dinar) atau 200 dirham perak (umumnya 595 gram); haul 1 tahun; zakat 2,5% dari nilai. Perhiasan yang dipakai sehari-hari dikurangkan dari berat yang dizakati (contoh di buku: 120 g dikurangi 15 g dipakai = 105 g). Emas/perak yang diperdagangkan wajib dizakati walau belum mencapai nisab.'],
  ['Perdagangan / usaha', 'Haul 1 tahun, nisab setara 85 g emas, zakat 2,5% dari (modal diputar + keuntungan + piutang yang bisa dicairkan) dikurangi (utang + kerugian). Tanah, bangunan, dan peralatan tetap tidak dihitung.'],
  ['Profesi / penghasilan', 'Zakat 2,5%. Ada dua pendapat di buku: (1) dibayar setahun sekali jika mencapai nisab, atau (2) dibayar setiap menerima penghasilan tanpa menunggu setahun dan tanpa dikurangi kebutuhan pokok/utang. Angka nisab Rp1,3 juta di buku (2013) sudah tidak relevan, aplikasi memakai 85 g emas.'],
  ['THR, hadiah, komisi, hibah', 'THR/hadiah yang besarnya sama dengan penghasilan 1 bulan: 2,5%. Komisi dari persentase laba perusahaan: 10%. Hibah yang tidak diduga sebelumnya: 20%; yang sudah diketahui sebelumnya: 2,5%.'],
  ['Investasi (sewa, saham, dsb.)', 'Dua cara: 2,5% dari pokok + keuntungan setelah 1 tahun, atau 10% (5% bila ada biaya pengairan/pengelolaan) dari hasil saat hasil diterima, tanpa menunggu setahun dan modal tidak dizakati.'],
  ['Zakat fitrah', '2,5 kg makanan pokok per jiwa (mazhab Hanafi membolehkan membayar senilai uangnya). Dibayar sebelum salat Idulfitri.'],
  ['Di bawah nisab', 'Bila belum mencapai nisab tetapi tetap ingin memberi, hukumnya infaq atau sedekah, bukan zakat.'],
  ['Penerima zakat (8 asnaf)', 'Fakir, miskin, amil, muallaf, riqab (hamba sahaya), gharimin (orang berutang), sabilillah, ibnu sabil.']
];
function zakatBody() {
  const st = S.set, z = zakatInfo(), au = autoZakat(), man = S.zakat.filter(x => !x.key && !x.paid), hist = S.zakat.filter(x => x.paid).sort((a, b) => (b.paidDate || '').localeCompare(a.paidDate || ''));
  const zd = P.zd || {}, dag = Math.max(0, (+zd.modal || 0) + (+zd.kas || 0) + (+zd.piutang || 0) - (+zd.utang || 0));
  const gold = z.gold, ok = (c, t) => `<span class="tag ${c}">${t}</span>`;
  const remRows = [...au.map(x => ({ ...x })), ...man.map(x => ({ ...x, manual: true }))].sort((a, b) => (a.due || '9').localeCompare(b.due || '9'));
  const zi = (k, label, v, type = 'number', extra = '') => fld(label, 'z_' + k, `<input id="z_${k}" type="${type}" step="any" value="${esc(v ?? '')}" data-c="zset" data-k="${k}" ${extra}>`);
  return `<section class="card"><h2>Pengingat zakat</h2><p class="sub">Pengingat otomatis dihitung dari data Anda. Tekan "Sudah dibayar" untuk konfirmasi.</p>
  ${tbl(['Jenis', '>Nominal', 'Batas', 'Keterangan', 'Status', ''], remRows.map((x, i) => `<tr><td><b>${esc(x.n)}</b>${x.auto ? ' <span class="tag n">otomatis</span>' : ''}</td><td class="r">${x.amt ? rp(x.amt) : '-'}</td><td>${fmtD(x.due)}${x.due ? `<br><small class="sub">${dueTxt(x.due)}</small>` : ''}</td><td style="white-space:normal;max-width:260px">${esc(x.note || '')}</td><td>${dueTag(x.due, false)}</td><td>${x.auto ? `<button class="btn s" data-a="zauto" data-key="${esc(x.key)}" data-n="${esc(x.n)}" data-amt="${x.amt}" data-due="${x.due}">Sudah dibayar</button>` : `<button class="btn s" data-a="zpay" data-id="${x.id}">Sudah dibayar</button> <button class="btn d s" data-a="zdel" data-id="${x.id}" aria-label="Hapus ${esc(x.n)}">Hapus</button>`}</td></tr>`))}
  ${hist.length ? `<details style="margin-top:12px"><summary style="cursor:pointer;font-weight:700;min-height:36px">Riwayat sudah dibayar (${hist.length}) · total ${rp(sum(hist, x => x.amt))}</summary>${tbl(['Jenis', '>Nominal', 'Dibayar', ''], hist.map(x => `<tr><td>${esc(x.n)}</td><td class="r">${rp(x.amt)}</td><td>${fmtD(x.paidDate)}</td><td><button class="btn o s" data-a="zundo" data-id="${x.id}">Batalkan</button> <button class="btn d s" data-a="zdel" data-id="${x.id}" aria-label="Hapus riwayat">Hapus</button></td></tr>`))}</details>` : ''}
  <form data-f="zakat" class="frm" style="margin-top:14px">${fld('Jenis', 'zk_j', `<select name="j" id="zk_j">${opt(ZJENIS, ZJENIS[0])}</select>`)}${fld('Nominal (Rp)', 'zk_a', num('a', '').replace('step="any"', 'step="any" required'))}${fld('Batas / rencana bayar', 'zk_d', inp('d', '', 'date', 'required'))}${fld('Catatan', 'zk_c', inp('c', ''))}<button class="btn">Tambah pengingat zakat</button></form></section>
  <section class="card"><h2>Pengaturan zakat</h2><div class="frm" style="margin-top:10px">${zi('gold', 'Harga emas per gram (Rp)', st.gold || '')}${zi('silver', 'Harga perak per gram (Rp)', st.silver || '')}${fld('Zakat penghasilan', 'z_mode', `<select id="z_mode" data-c="zset" data-k="zakatMode">${opt([['bulanan', 'Dibayar tiap bulan (2,5%)'], ['tahunan', 'Dibayar setahun sekali (nisab 85 g emas)'], ['off', 'Tidak diingatkan']], st.zakatMode)}</select>`)}${zi('haulMaal', 'Tanggal mulai haul harta simpanan (nisab tercapai)', st.haulMaal, 'date')}${zi('jiwa', 'Zakat fitrah: jumlah jiwa', st.jiwa)}${zi('berasKg', 'Harga beras per kg (Rp)', st.berasKg || '')}${zi('fitrahDate', 'Perkiraan Idulfitri (ikuti pengumuman pemerintah)', st.fitrahDate, 'date')}</div></section>
  <section class="card"><h2>Perhitungan zakat dari data Anda</h2>${tbl(['Jenis', '>Kepemilikan', '>Nisab', 'Status', '>Zakat 2,5%'], [
    ['Emas', gramFmt(z.gE), '85 g' + (gold ? ` = ${rp(z.nisabE)}` : ''), z.gE >= 85 ? ok('w', 'Wajib (jika haul genap)') : ok('n', 'Belum nisab'), rp(z.zE)],
    ['Perak', gramFmt(z.gP), '595 g', z.gP >= 595 ? ok('w', 'Wajib (jika haul genap)') : ok('n', 'Belum nisab'), rp(z.zP)],
    ['Simpanan (kas + tabungan + investasi + piutang − cicilan 12 bln)', rp(z.harta), gold ? rp(z.nisabE) : 'isi harga emas', !gold ? ok('n', 'Isi harga emas') : z.harta >= z.nisabE ? ok('w', 'Wajib (jika haul genap)') : ok('n', 'Belum nisab'), rp(gold && z.harta >= z.nisabE ? z.harta * .025 : 0)]
  ].map(r => `<tr><td>${r[0]}</td><td class="r">${r[1]}</td><td class="r">${r[2]}</td><td>${r[3]}</td><td class="r"><b>${r[4]}</b></td></tr>`))}
  ${S.logam.some(x => !x.d) ? '<p class="sub">Isi tanggal beli emas/perak agar haul 1 tahun terpantau.</p>' : ''}${S.logam.length === 0 ? '<p class="sub">Tambahkan emas/perak di Utang, Investasi, Aset → Emas & Perak.</p>' : ''}</section>
  <section class="card"><h2>Kalkulator zakat perdagangan / usaha</h2><p class="sub">(Modal diputar + keuntungan + piutang yang dapat dicairkan) − (utang + kerugian) × 2,5%</p><div class="frm" style="margin-top:10px">${[['modal', 'Barang dagangan + keuntungan'], ['kas', 'Uang tunai usaha'], ['piutang', 'Piutang lancar'], ['utang', 'Utang + kerugian']].map(([k, l]) => fld(l, 'zd_' + k, `<input id="zd_${k}" type="number" step="any" value="${zd[k] ?? ''}" data-c="zdag" data-k="${k}">`)).join('')}</div><p style="margin-top:10px">Harta kena zakat <b>${rp(dag)}</b> · nisab ${gold ? rp(z.nisabE) : '(isi harga emas)'} · zakat <b>${rp(gold && dag >= z.nisabE ? dag * .025 : 0)}</b> ${gold ? (dag >= z.nisabE ? ok('w', 'Wajib jika haul 1 tahun') : ok('n', 'Belum nisab')) : ''}</p></section>
  <section class="card"><h2>Aturan zakat (Panduan Zakat Praktis, Kemenag RI 2013)</h2>${ZRULES.map(r => `<details style="border-bottom:1px solid #F1EEE3;padding:6px 0"><summary style="cursor:pointer;font-weight:700;min-height:40px;display:flex;align-items:center">${r[0]}</summary><p style="margin:4px 0 10px;line-height:1.6">${r[1]}</p></details>`).join('')}<p class="sub">Perhitungan di aplikasi adalah perkiraan untuk membantu mengingat. Untuk kepastian hukum dan nominal, konsultasikan dengan BAZNAS/LAZ resmi atau ulama.</p></section>`;
}
C.zset = el => { const k = el.dataset.k; S.set[k] = el.type === 'number' ? parseFloat(el.value) || 0 : el.value; save(); render(); };
C.zdag = el => { P.zd = P.zd || {}; P.zd[el.dataset.k] = el.value; render(); };
F.zakat = f => { S.zakat.push({ id: uid(), n: f.j.value, amt: +f.a.value || 0, due: f.d.value, note: f.c.value.trim(), paid: false }); save(); render(); toast('Pengingat zakat ditambahkan'); };
A.zdel = b => { if (confirm('Hapus data ini?')) { S.zakat = S.zakat.filter(x => x.id !== b.dataset.id); save(); render(); } };
A.zundo = b => { const x = S.zakat.find(x => x.id === b.dataset.id); if (x.key) S.zakat = S.zakat.filter(y => y.id !== x.id); else { x.paid = false; x.paidDate = ''; } save(); render(); toast('Status dibatalkan. Pengeluaran yang sudah tercatat tidak ikut dihapus.'); };
A.zpay = b => { const x = S.zakat.find(x => x.id === b.dataset.id); if (!confirm(`Konfirmasi: ${x.n} sebesar ${rp(x.amt)} SUDAH dibayarkan?\n\nOK = tandai sudah dan catat sebagai pengeluaran (Zakat / Sedekah / Sosial).\nBatal = tidak ada perubahan.`)) return; x.paid = true; x.paidDate = today(); addTx({ t: 'Pengeluaran', c: 'Zakat / Sedekah / Sosial', amt: x.amt, m: 'Transfer Bank', note: x.n }); save(); render(); toast('Zakat ditandai sudah dibayar'); };
A.zauto = b => { const d = b.dataset; if (!confirm(`Konfirmasi: ${d.n} sebesar ${rp(+d.amt)} SUDAH dibayarkan?\n\nOK = tandai sudah dan catat sebagai pengeluaran (Zakat / Sedekah / Sosial).\nBatal = tidak ada perubahan.`)) return; S.zakat.push({ id: uid(), key: d.key, n: d.n, amt: +d.amt, due: d.due, paid: true, paidDate: today() }); addTx({ t: 'Pengeluaran', c: 'Zakat / Sedekah / Sosial', amt: +d.amt, m: 'Transfer Bank', note: d.n }); save(); render(); toast('Zakat ditandai sudah dibayar'); };

/* ---------- Pengingat gabungan, notifikasi, kalender ---------- */
function allDue() {
  const out = [];
  S.tax.filter(x => !x.paid && x.due).forEach(x => out.push({ src: 'Pajak', t: `${x.n} ${rp(x.amt)}`, d: x.due, tab: 'pajak' }));
  S.zakat.filter(x => !x.key && !x.paid && x.due).forEach(x => out.push({ src: 'Zakat', t: `${x.n} ${rp(x.amt)}`, d: x.due, tab: 'zakat' }));
  autoZakat().forEach(x => out.push({ src: 'Zakat', t: `${x.n} ${x.amt ? rp(x.amt) : ''}`, d: x.due, tab: 'zakat' }));
  S.bills.forEach(b => { const nd = nextBill(b); if (nd) out.push({ src: 'Tagihan', t: `${b.n} ${rp(b.amt)}`, d: nd.d, tab: '', p: 'anggaran' }); });
  const sp = nextSpt(); if (sp) out.push({ src: 'SPT', t: `Lapor SPT Tahunan OP tahun pajak ${sp.ty}`, d: sp.due, tab: 'spt', win: 60 });
  return out.map(x => ({ ...x, n: daysTo(x.d) })).sort((a, b) => a.n - b.n);
}
function notifs() { return allDue().filter(x => x.src !== 'Tagihan' && x.n <= (x.win || 30)).map(x => ({ ...x, k: x.n < 0 || x.n <= 3 ? 'e' : x.n <= 14 ? 'w' : 'i' })); }
function notifCard() {
  const l = notifs(); if (!l.length) return '';
  return `<section class="card" aria-label="Pengingat zakat, pajak, SPT"><div class="top"><h2>Pengingat zakat, pajak, dan SPT</h2><button class="btn o s" data-a="ics">Unduh ke kalender HP (.ics)</button></div><div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">${l.slice(0, 8).map(x => `<div class="al ${x.k}" style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><span><b>${x.src}:</b> ${esc(x.t)} · ${fmtD(x.d)} (${dueTxt(x.d)})</span><button class="btn o s" data-a="goto" data-p="${x.p || 'rencana'}" data-t="${x.tab}">Buka</button></div>`).join('')}</div></section>`;
}
A.goto = b => { P.tab.rc = b.dataset.t; if (location.hash === '#/' + b.dataset.p) render(); else location.hash = '#/' + b.dataset.p; setTimeout(render, 0); };
function icsEsc(s) { return String(s).replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n'); }
function exportICS() {
  const items = allDue().filter(x => x.n >= -30); if (!items.length) return toast('Belum ada jadwal untuk diunduh');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kasku//Pengingat//ID', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Kasku: Zakat, Pajak, SPT'];
  items.forEach((x, i) => {
    const d = x.d.replace(/-/g, ''), nxt = ymd(new Date(new Date(x.d + 'T00:00:00').getTime() + 864e5)).replace(/-/g, '');
    L.push('BEGIN:VEVENT', `UID:kasku-${d}-${i}-${x.src}@local`, `DTSTAMP:${new Date().toISOString().replace(/[-:]|\.\d{3}/g, '')}`, `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${nxt}`, `SUMMARY:${icsEsc(`${x.src}: ${x.t}`)}`, `DESCRIPTION:${icsEsc('Pengingat dari Kasku. Buka aplikasi untuk menandai sudah dibayar.')}`);
    [['-P6DT15H', '7 hari lagi'], ['-PT15H', 'besok'], ['PT8H', 'hari ini']].forEach(([tr, tx]) => L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(`${x.src} ${tx}: ${x.t}`)}`, `TRIGGER;RELATED=START:${tr}`, 'END:VALARM'));
    L.push('END:VEVENT');
  });
  L.push('END:VCALENDAR'); dl(new Blob([L.join('\r\n')], { type: 'text/calendar' }), 'kasku-pengingat.ics'); toast('File kalender diunduh. Buka file itu di HP agar masuk kalender.');
}
A.ics = exportICS;
function maybeNotify() {
  if (!S.set.notif || typeof Notification === 'undefined' || Notification.permission !== 'granted' || S.set.lastNotif === today()) return;
  const l = notifs().filter(x => x.n <= 7); if (!l.length) return;
  try { new Notification(`Kasku: ${l.length} pengingat`, { body: l.slice(0, 3).map(x => `${x.src}: ${x.t} (${dueTxt(x.d)})`).join('\n'), tag: 'kasku' }); S.set.lastNotif = today(); save(false); } catch (e) { console.warn(e); }
}
A.notifon = async () => {
  if (typeof Notification === 'undefined') return toast('Browser ini tidak mendukung notifikasi. Pakai kalender (.ics).');
  const p = await Notification.requestPermission(); S.set.notif = p === 'granted'; save(false); render(); toast(p === 'granted' ? 'Notifikasi aktif. Muncul saat aplikasi dibuka.' : 'Izin notifikasi ditolak di browser.'); if (p === 'granted') { S.set.lastNotif = ''; maybeNotify(); }
};
A.notifoff = () => { S.set.notif = false; save(false); render(); };
setInterval(maybeNotify, 3600e3);

/* ---------- Masa transisi: kontrak berakhir, tanpa penghasilan ---------- */
function avgSurplus() { const v = []; for (let i = 1; i <= 3; i++) { const d = new Date(NOW.getFullYear(), NOW.getMonth() - i, 1), m = monthSum(d.getFullYear(), d.getMonth() + 1); if (m.n) v.push(m.net); } return v.length ? sum(v, x => x) / v.length : 0; }
function transisi() {
  const st = S.set, n = netWorth(), liquid = n.kas + (st.kontrakAset === 'kas' ? 0 : n.tab), end = st.kontrakEnd;
  if (!end) return null;
  const mEnd = Math.max(0, (new Date(end + 'T00:00:00') - new Date(today() + 'T00:00:00')) / (864e5 * 30.4375)), spend = +st.kontrakExpense || avgExpense(), inc = +st.kontrakIncome || 0, burn = Math.max(0, spend - inc);
  const atEnd = Math.max(0, liquid + (daysTo(end) > 0 ? mEnd * avgSurplus() : 0)), months = burn > 0 ? atEnd / burn : Infinity, need = burn * st.dd, kurang = Math.max(0, need - atEnd);
  const out = months === Infinity ? null : addM(end > today() ? end : today(), Math.floor(months));
  return { end, liquid, mEnd, spend, inc, burn, atEnd, months, need, kurang, perBulan: mEnd >= 1 ? kurang / Math.floor(mEnd) : kurang, out, days: daysTo(end) };
}
function transisiCard() {
  const st = S.set, t = transisi();
  const f = (k, label, v, type = 'number', ph = '') => fld(label, 'kt_' + k, `<input id="kt_${k}" type="${type}" step="any" value="${esc(v || '')}" placeholder="${ph}" data-c="ktset" data-k="${k}">`);
  const form = `<div class="frm" style="margin-top:10px">${f('kontrakEnd', 'Tanggal kontrak / penghasilan berakhir', st.kontrakEnd, 'date')}${f('kontrakIncome', 'Perkiraan penghasilan setelahnya per bulan (Rp)', st.kontrakIncome, 'number', '0 jika belum ada')}${f('kontrakExpense', 'Pengeluaran per bulan (kosong = rata-rata 3 bulan)', st.kontrakExpense, 'number', 'otomatis')}${fld('Uang yang dihitung', 'kt_a', `<select id="kt_a" data-c="ktset" data-k="kontrakAset">${opt([['kas+tab', 'Kas + tabungan target'], ['kas', 'Kas saja']], st.kontrakAset)}</select>`)}</div>`;
  if (!t) return `<section class="card"><h2>Masa transisi (kontrak berakhir)</h2><p class="sub">Isi tanggal berakhirnya penghasilan untuk melihat uang Anda cukup sampai kapan.</p>${form}</section>`;
  const c = t.months >= st.dd ? 'g' : t.months >= 3 ? 'w' : 'e', mtxt = t.months === Infinity ? 'Tidak terbatas' : t.months.toFixed(1).replace('.', ',') + ' bulan';
  return `<section class="card"><div class="top"><div><h2>Masa transisi (kontrak berakhir)</h2><p class="sub">${t.days > 0 ? `Penghasilan berakhir ${fmtD(t.end)} (${t.days} hari lagi)` : `Penghasilan berakhir sejak ${fmtD(t.end)}`}</p></div><span class="tag ${c}">${t.months >= st.dd ? 'Aman' : t.months >= 3 ? 'Perlu disiapkan' : 'Rawan'}</span></div>
  <div class="kpis" style="margin-top:12px"><div class="kpi"><small>Uang bertahan</small><b>${mtxt}</b><em>${t.out ? 'sampai sekitar ' + BLN[+t.out.slice(5, 7) - 1] + ' ' + t.out.slice(0, 4) : ''}</em></div><div class="kpi"><small>Uang saat penghasilan berakhir (perkiraan)</small><b>${rp(t.atEnd)}</b><em>sekarang ${rp(t.liquid)}</em></div><div class="kpi"><small>Kekurangan bulanan</small><b class="neg">${rp(t.burn)}</b><em>pengeluaran ${rp(t.spend)} − penghasilan ${rp(t.inc)}</em></div><div class="kpi"><small>Target aman ${st.dd} bulan</small><b>${rp(t.need)}</b><em>${t.kurang > 0 ? 'kurang ' + rp(t.kurang) : 'sudah tercukupi'}</em></div></div>
  ${t.kurang > 0 && t.days > 0 ? `<p style="margin-top:10px">Agar cukup ${st.dd} bulan, sisihkan sekitar <b>${rp(t.perBulan)}</b> per bulan sampai kontrak berakhir.</p>` : ''}${form}<p class="sub">Perkiraan sederhana: uang saat berakhir = uang sekarang + rata-rata surplus 3 bulan terakhir × sisa bulan. Pesangon atau kompensasi, catat sebagai pemasukan dan angkanya ikut naik.</p></section>`;
}
C.ktset = el => { const k = el.dataset.k; S.set[k] = el.type === 'number' ? parseFloat(el.value) || 0 : el.value; save(); render(); };

/* ---------- Tagihan rutin: bulanan, triwulan, semesteran, tahunan ---------- */
const BSTEP = { Bulanan: 1, Triwulan: 3, Semesteran: 6, Tahunan: 12 };
function billMonths(b) {
  const st = BSTEP[b.freq || 'Bulanan'] || 1; if (st === 1) return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const m0 = ((+b.mon || 1) - 1) % 12, out = []; for (let m = m0; m < 12 + m0; m += st) out.push(m % 12 + 1); return out.sort((a, c) => a - c);
}
function nextBill(b) {
  if (b.aktif === false) return null;
  const y = NOW.getFullYear(), ms = billMonths(b), c = [];
  for (let yy = y - 1; yy <= y + 1; yy++) for (const m of ms) c.push({ d: `${yy}-${pad(m)}-${pad(Math.min(b.day || 1, new Date(yy, m, 0).getDate()))}`, key: `${yy}-${pad(m)}` });
  const f = c.filter(x => x.key > (b.paid || '') && daysTo(x.d) >= -45).sort((a, z) => a.d.localeCompare(z.d))[0];
  return f ? { ...f, days: daysTo(f.d) } : null;
}

function billStartKey(b) { const ym = today().slice(0, 7), y = NOW.getFullYear(), ks = []; for (let yy = y - 2; yy <= y; yy++) for (const m of billMonths(b)) ks.push(`${yy}-${pad(m)}`); return ks.filter(k => k < ym).sort().pop() || ''; }
