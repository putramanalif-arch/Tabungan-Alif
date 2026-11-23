'use strict';
/* ===== Kasku core: data, perhitungan, parser chat, sinkron GitHub, Excel ===== */
const LS = 'kasku.v1', LSG = 'kasku.gh', LSM = 'kasku.ghmeta';
const $ = (s, e = document) => e.querySelector(s);
const $$ = (s, e = document) => [...e.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rp = n => (n < 0 ? '-' : '') + 'Rp' + Math.abs(Math.round(+n || 0)).toLocaleString('id-ID');
const pct = (n, d = 1) => (isFinite(n) ? (n * 100).toFixed(d).replace('.', ',') : '0') + '%';
const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const BLS = BLN.map(b => b.slice(0, 3));
const pad = n => String(n).padStart(2, '0');
const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const today = () => ymd(new Date());
const mFrom = (y, m) => `${y}-${pad(m)}-01`, mTo = (y, m) => `${y}-${pad(m)}-31`;
const fmtD = s => { if (!s) return ''; const [y, m, d] = s.split('-'); return `${+d} ${BLS[+m - 1]} ${y}`; };
const uid = () => Math.random().toString(36).slice(2, 8);

/* ---- 15 jenis transaksi (mengikuti sheet Pengaturan Excel v3) ---- */
const TYPES = {
  'Pemasukan': { cash: 1, inc: 1, be: 0, ref: null, cat: 'inc', how: 'Gaji, bonus, usaha. Kategori dari daftar pemasukan.' },
  'Pengeluaran': { cash: -1, be: 1, beban: 1, ref: null, cat: 'exp', how: 'Belanja/konsumsi. Kategori dari alokasi.' },
  'Setoran tabungan': { cash: -1, be: 1, ref: 'target', cat: 'exp', how: 'Kas ke tabungan. Terkait = nama target.' },
  'Penarikan tabungan': { cash: 1, be: -1, ref: 'target', cat: 'exp', how: 'Tabungan ke kas. Terkait = nama target.' },
  'Pembelian investasi': { cash: -1, be: 1, ref: 'inv', cat: 'exp', how: 'Kas ke investasi. Terkait = instrumen, isi unit.' },
  'Penjualan investasi': { cash: 1, be: 0, ref: 'inv', cat: 'any', how: 'Hasil jual. Terkait = instrumen, isi unit terjual.' },
  'Pembayaran utang': { cash: -1, be: 1, ref: 'debt', cat: 'exp', how: 'Hanya POKOK cicilan. Terkait = nama pinjaman.' },
  'Pembayaran bunga': { cash: -1, be: 1, beban: 1, ref: 'debt', cat: 'exp', how: 'Bunga/denda utang (beban).' },
  'Pemberian piutang': { cash: -1, be: 0, ref: 'rec', cat: 'any', how: 'Uang dipinjamkan (aset). Terkait = ID piutang.' },
  'Penerimaan piutang': { cash: 1, be: 0, ref: 'rec', cat: 'any', how: 'Pembayaran dari peminjam. Terkait = ID piutang.' },
  'Penerimaan pinjaman': { cash: 1, be: 0, ref: 'debt', cat: 'any', how: 'Dana pinjaman cair (menambah kas).' },
  'Penerimaan dividen': { cash: 1, inc: 1, be: 0, ref: 'inv', cat: 'inc', how: 'Dividen kas diterima.' },
  'Penerimaan bunga': { cash: 1, inc: 1, be: 0, ref: null, cat: 'inc', how: 'Bunga tabungan/deposito yang diterima.' },
  'Refund': { cash: 1, be: -1, refund: 1, ref: 'any', cat: 'exp', how: 'Pengembalian dana. Kategori sama dengan transaksi asal.' },
  'Penyesuaian saldo': { cash: 0, be: 0, adj: 1, ref: null, cat: 'any', how: 'Koreksi kas, boleh negatif. Jelaskan di catatan.' }
};
const TYPE_NAMES = Object.keys(TYPES);
const METHODS = ['Tunai', 'Transfer Bank', 'QRIS / E-Wallet', 'Kartu Debit', 'Kartu Kredit', 'PayLater'];

/* ---- data awal ---- */
function defaults() {
  const a = (n, jenis, p) => ({ n, jenis, pct: p });
  return {
    v: 1, updatedAt: 0,
    set: { nama: 'Pemilik', income: 5000000, saldoAwal: 0, dsr: .3, sr: .2, warn: .85, dd: 6, low: 500000, asetBasis: 'Nilai Buku', autolock: 5, kontrakEnd: '', kontrakIncome: 0, kontrakExpense: 0, kontrakAset: 'kas+tab', gold: 0, silver: 0, zakatMode: 'bulanan', haulMaal: '', jiwa: 1, berasKg: 0, fitrahDate: '', notif: false, lastNotif: '' },
    incCats: [['Gaji Pokok', 'Aktif'], ['Tunjangan & Lembur', 'Aktif'], ['Bonus & THR', 'Aktif'], ['Freelance / Usaha Sampingan', 'Aktif'], ['Dividen & Bunga', 'Pasif'], ['Pendapatan Sewa', 'Pasif'], ['Pendapatan Lainnya', 'Aktif']].map(([n, t]) => ({ n, t })),
    alloc: [a('Zakat / Sedekah / Sosial', 'Tetap', .025), a('Sewa Kost / Rumah', 'Tetap', .15), a('Listrik, Air & Internet', 'Tetap', .05), a('Cicilan / Utang', 'Tetap', .05), a('Asuransi & BPJS', 'Tetap', .03), a('Makan & Minum', 'Variabel', .225), a('Transportasi', 'Variabel', .08), a('Kesehatan & Perawatan Diri', 'Variabel', .03), a('Pulsa & Langganan', 'Variabel', .03), a('Dana Darurat', 'Tabungan', .10), a('Tabungan Target', 'Tabungan', .10), a('Investasi', 'Tabungan', .05), a('Hiburan & Gaya Hidup', 'Keinginan', .05), a('Lain-lain / Tak Terduga', 'Keinginan', .03), a('Pajak', 'Tetap', 0)],
    tx: [], targets: [{ n: 'Dana Darurat', pri: 'Tinggi', goal: 20000000, dl: '', awal: 0, mode: 'percent', pct: .10, monthly: 0 }],
    debts: [], recv: [], inv: [], assets: [], bills: [], ins: [], tax: [], chat: [], logam: [], zakat: [], spt: { done: {}, ck: {} }
  };
}
let S = defaults();
function normalize(d) { const b = defaults(), o = Object.assign(b, d); o.set = Object.assign(defaults().set, d.set || {}); o.spt = Object.assign({ done: {}, ck: {} }, d.spt || {}); return o; }
/* ---- kunci password: enkripsi AES-GCM (PBKDF2) di browser ---- */
let KEY = null, PW = '', SALT = '', ITER = 600000, LOCKED = false, GHC = {};
const _e = new TextEncoder(), _d = new TextDecoder();
const u8b = u => { let t = ''; for (let i = 0; i < u.length; i++) t += String.fromCharCode(u[i]); return btoa(t); };
const b8u = b => Uint8Array.from(atob(b), c => c.charCodeAt(0));
const newSalt = () => u8b(crypto.getRandomValues(new Uint8Array(16)));
async function deriveKey(pw, saltB64, it = 600000) {
  const base = await crypto.subtle.importKey('raw', _e.encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b8u(saltB64), iterations: it, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function encStr(str, key = KEY, salt = SALT) {
  const iv = crypto.getRandomValues(new Uint8Array(12)), ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, _e.encode(str)));
  return { enc: 1, salt, it: ITER, iv: u8b(iv), ct: u8b(ct), updatedAt: S.updatedAt };
}
async function decPayload(p, key) { return _d.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b8u(p.iv) }, key, b8u(p.ct))); }
function isLocked() { try { const j = JSON.parse(localStorage.getItem(LS) || 'null'); return !!(j && j.enc); } catch { return false; } }
function load() {
  try { const r = localStorage.getItem(LS); if (r) { const j = JSON.parse(r); if (j && !j.enc) S = normalize(j); } } catch (e) { console.warn(e); }
}
let wchain = Promise.resolve();
function persist() {
  const snap = JSON.stringify(S);
  if (!KEY) { try { localStorage.setItem(LS, snap); } catch (e) { toast('Penyimpanan browser penuh atau diblokir. Unduh cadangan sekarang.'); } return; }
  wchain = wchain.then(async () => { try { localStorage.setItem(LS, JSON.stringify(await encStr(snap))); } catch (e) { toast('Gagal menyimpan data terenkripsi. Unduh cadangan sekarang.'); } });
}
function persistCfg() { const t = JSON.stringify(GHC); if (!KEY) { localStorage.setItem(LSG, t); return; } wchain = wchain.then(async () => { try { localStorage.setItem(LSG, JSON.stringify(await encStr(t))); } catch (e) { console.warn(e); } }); }
function loadCfg() { try { const j = JSON.parse(localStorage.getItem(LSG) || 'null'); if (j && !j.enc) GHC = j; } catch { } }
async function loadCfgEnc() { try { const j = JSON.parse(localStorage.getItem(LSG) || 'null'); if (j && j.enc) GHC = JSON.parse(await decPayload(j, KEY)); } catch (e) { console.warn(e); } }
function save(touch = true) {
  if (touch) S.updatedAt = Date.now();
  persist();
  if (touch) ghSchedule();
}

/* ---- perhitungan ---- */
const okTx = () => S.tx.filter(t => (t.st || 'Selesai') === 'Selesai');
const cashEff = t => t.t === 'Penyesuaian saldo' ? +t.amt : (TYPES[t.t]?.cash || 0) * t.amt;
const incVal = t => TYPES[t.t]?.inc ? t.amt : 0;
const bebanVal = t => t.t === 'Pengeluaran' || t.t === 'Pembayaran bunga' ? t.amt : t.t === 'Refund' ? -t.amt : 0;
const budVal = t => (TYPES[t.t]?.be || 0) * t.amt;
const inRange = (t, a, b) => t.d >= a && t.d <= b;
const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
const txIn = (a, b) => okTx().filter(t => inRange(t, a, b));
function group(arr, keyf, valf) { const m = {}; arr.forEach(x => { const k = keyf(x); m[k] = (m[k] || 0) + valf(x); }); return m; }
function monthSum(y, m) {
  const l = txIn(mFrom(y, m), mTo(y, m));
  const inc = sum(l, incVal), exp = sum(l, bebanVal);
  return { inc, exp, net: inc - exp, cash: sum(l, cashEff), n: l.length, list: l };
}
const cashAt = d => S.set.saldoAwal + sum(okTx().filter(t => t.d <= d), cashEff);
const cashNow = () => S.set.saldoAwal + sum(okTx(), cashEff);
const sumRef = (type, ref) => sum(okTx().filter(t => t.t === type && t.ref === ref), t => t.amt);
const targetSaved = tg => (+tg.awal || 0) + sumRef('Setoran tabungan', tg.n) - sumRef('Penarikan tabungan', tg.n);
const debtPaid = d => (+d.paidP || 0) + sumRef('Pembayaran utang', d.n);
const debtBal = d => Math.max(0, d.principal - debtPaid(d));
const invUnits = i => sum(okTx().filter(t => t.t === 'Pembelian investasi' && t.ref === i.n), t => +t.unit || 0) - sum(okTx().filter(t => t.t === 'Penjualan investasi' && t.ref === i.n), t => +t.unit || 0);
const invBought = i => sumRef('Pembelian investasi', i.n), invSold = i => sumRef('Penjualan investasi', i.n);
const invVal = i => { const u = invUnits(i); return u > 0 && i.price ? u * i.price : Math.max(0, invBought(i) - invSold(i)); };
const recvGiven = r => sumRef('Pemberian piutang', r.id), recvGot = r => sumRef('Penerimaan piutang', r.id);
const recvBal = r => Math.max(0, recvGiven(r) - recvGot(r));
function assetBook(a, asOf = today()) {
  if (!a.life) return a.cost;
  const [y1, m1] = a.d.split('-').map(Number), [y2, m2] = asOf.split('-').map(Number);
  const mo = Math.max(0, (y2 - y1) * 12 + m2 - m1);
  const res = +a.res || 0; return Math.max(res, a.cost - (a.cost - res) / (a.life * 12) * mo);
}
const assetVal = a => S.set.asetBasis === 'Nilai Saat Ini' && a.now ? a.now : assetBook(a);
function netWorth() {
  const kas = cashNow(), tab = sum(S.targets, targetSaved), inv = sum(S.inv, invVal), pi = sum(S.recv, recvBal), at = sum(S.assets, assetVal), lg = sum(S.logam || [], x => (+x.gram || 0) * ((+x.price) || (x.jenis === 'Emas' ? +S.set.gold : x.jenis === 'Perak' ? +S.set.silver : 0) || 0));
  const ut = sum(S.debts, debtBal);
  return { kas, tab, inv, pi, at, lg, aset: kas + tab + inv + pi + at + lg, ut, nw: kas + tab + inv + pi + at + lg - ut };
}
function baseIncome(y, m) { const a = monthSum(y, m).inc; return a > 0 ? a : S.set.income; }
const budgetOf = (cat, y, m) => cat.pct * baseIncome(y, m);
function realisasi(y, m) { return group(txIn(mFrom(y, m), mTo(y, m)), t => t.c || 'Lain-lain / Tak Terduga', budVal); }
function allCats() { return [...new Set([...S.alloc.map(a => a.n), ...S.incCats.map(a => a.n)])]; }

/* ---- parser chat ---- */
const KW = [
  ['Makan & Minum', 'makan minum kopi sarapan lunch dinner bakso nasi ayam warung jajan snack cafe resto geprek mie soto gofood grabfood boba teh'],
  ['Transportasi', 'bensin grab gojek ojek parkir tol angkot bus krl kereta ojol maxim bbm servis'],
  ['Sewa Kost / Rumah', 'kost kos sewa kontrakan'],
  ['Listrik, Air & Internet', 'listrik air pdam wifi internet token indihome'],
  ['Pulsa & Langganan', 'pulsa paket data langganan spotify netflix youtube'],
  ['Kesehatan & Perawatan Diri', 'obat dokter apotek klinik cukur salon vitamin rs'],
  ['Hiburan & Gaya Hidup', 'nonton film game wisata nongkrong hobi baju sepatu belanja shopee tokopedia'],
  ['Zakat / Sedekah / Sosial', 'zakat infaq sedekah donasi kado hadiah sumbangan'],
  ['Asuransi & BPJS', 'asuransi bpjs premi'],
  ['Pajak', 'pajak pbb stnk']
];
const INC_KW = [['Gaji Pokok', 'gaji'], ['Bonus & THR', 'bonus thr'], ['Tunjangan & Lembur', 'lembur tunjangan'], ['Freelance / Usaha Sampingan', 'freelance proyek honor komisi jual usaha'], ['Pendapatan Sewa', 'sewa masuk']];
function parseAmount(text) {
  const t = text.toLowerCase().replace(/(tgl|tanggal)\s*\d+/g, ' ');
  const out = [];
  for (const m of t.matchAll(/(\d[\d.,]*)\s*(juta|jt|ribu|rb|k)?(?![a-z0-9])/g)) {
    const s = m[1].replace(/[.,]$/, ''), suf = m[2];
    let v = /^\d{1,3}(\.\d{3})+$/.test(s) ? parseFloat(s.replace(/\./g, '')) : parseFloat(s.replace(',', '.'));
    if (isNaN(v)) continue;
    v = Math.round(v * ({ juta: 1e6, jt: 1e6, ribu: 1e3, rb: 1e3, k: 1e3 }[suf] || 1));
    if (suf || v >= 1000) out.push(v);
  }
  return out.length ? Math.max(...out) : 0;
}
function parseDate(t) {
  const d = new Date();
  if (/kemarin/.test(t)) d.setDate(d.getDate() - 1);
  else { const m = t.match(/(?:tgl|tanggal)\s*(\d{1,2})/); if (m) d.setDate(Math.min(31, +m[1])); }
  return ymd(d);
}
const hasAny = (t, words) => words.split(' ').some(w => new RegExp('(^|[^a-z])' + w + '([^a-z]|$)').test(t));
function parseChat(text) {
  const t = text.toLowerCase();
  const amt = parseAmount(text);
  let type = 'Pengeluaran';
  const invw = 'saham reksa reksadana emas sbn obligasi etf crypto kripto deposito';
  if (/refund|pengembalian dana|cashback/.test(t)) type = 'Refund';
  else if (/(tarik|ambil)\s+(dari\s+)?(tabungan|dana darurat)/.test(t)) type = 'Penarikan tabungan';
  else if (/^(setor|nabung|menabung)|tabung/.test(t)) type = 'Setoran tabungan';
  else if (/dividen/.test(t)) type = 'Penerimaan dividen';
  else if (/jual/.test(t) && hasAny(t, invw)) type = 'Penjualan investasi';
  else if (/(beli|topup|top up)/.test(t) && hasAny(t, invw)) type = 'Pembelian investasi';
  else if (/bayar.*bunga|bunga (pinjaman|cicilan|utang)/.test(t)) type = 'Pembayaran bunga';
  else if (/(terima|dapat|cair).*(pinjaman)/.test(t)) type = 'Penerimaan pinjaman';
  else if (/(pinjamkan|meminjamkan|kasih pinjam|utangi)/.test(t)) type = 'Pemberian piutang';
  else if (/(piutang|dibayar balik|bayar balik)/.test(t)) type = 'Penerimaan piutang';
  else if (/(bayar|cicil|angsur).*(utang|hutang|cicilan|pinjaman|kartu kredit|paylater)|^cicilan/.test(t)) type = 'Pembayaran utang';
  else if (/bunga/.test(t)) type = 'Penerimaan bunga';
  else if (hasAny(t, 'gaji bonus thr lembur tunjangan freelance honor komisi pemasukan income terima dapat') || /^jual /.test(t)) type = 'Pemasukan';
  let method = 'Tunai';
  if (/qris|gopay|ovo|dana|shopeepay|e-?wallet/.test(t)) method = 'QRIS / E-Wallet';
  else if (/transfer|tf |bank/.test(t)) method = 'Transfer Bank';
  else if (/debit/.test(t)) method = 'Kartu Debit';
  else if (/kartu kredit|kk /.test(t)) method = 'Kartu Kredit';
  else if (/paylater/.test(t)) method = 'PayLater';
  let cat = '';
  const known = S.alloc.map(a => a.n);
  const pick = list => { for (const [c, w] of list) if (hasAny(t, w)) return c; return ''; };
  const TY = TYPES[type];
  if (TY.cat === 'inc') cat = type === 'Penerimaan dividen' || type === 'Penerimaan bunga' ? 'Dividen & Bunga' : (pick(INC_KW) || 'Pendapatan Lainnya');
  else if (type === 'Setoran tabungan' || type === 'Penarikan tabungan') cat = /darurat/.test(t) ? 'Dana Darurat' : 'Tabungan Target';
  else if (type === 'Pembelian investasi') cat = 'Investasi';
  else if (type === 'Pembayaran utang' || type === 'Pembayaran bunga') cat = 'Cicilan / Utang';
  else if (TY.cat === 'exp' || TY.cat === 'any') cat = type === 'Pengeluaran' || type === 'Refund' ? (pick(KW) || '') : '';
  // cocokkan nama kategori yang ditulis langsung
  if (!cat && type === 'Pengeluaran') { const k = known.find(n => t.includes(n.toLowerCase().split(/[ ,/&]+/)[0]) && n.length > 3); if (k && hasAny(t, k.toLowerCase().split(/[ ,/&]+/)[0])) cat = k; }
  // terkait
  let ref = '';
  const lists = { target: S.targets.map(x => x.n), inv: S.inv.map(x => x.n), debt: S.debts.map(x => x.n), rec: S.recv.map(x => x.id) };
  if (TY.ref && lists[TY.ref]) {
    const words = t.split(/[^a-z0-9]+/).filter(w => w.length > 2);
    const cands = lists[TY.ref];
    ref = cands.find(n => words.some(w => n.toLowerCase().includes(w))) || (cands.length === 1 ? cands[0] : '');
  }
  const note = text.replace(/\s+/g, ' ').trim();
  return { t: type, c: cat, amt: amt[0] ? amt : amt, a: parseAmount(text), m: method, d: parseDate(t), ref, note };
}
function nextId() {
  const mx = Math.max(0, ...S.tx.map(t => +(t.id || '').replace(/\D/g, '') || 0));
  return 'TRX-' + String(mx + 1).padStart(4, '0');
}
function addTx(o) {
  const t = Object.assign({ id: nextId(), d: today(), t: 'Pengeluaran', c: '', sub: '', note: '', amt: 0, m: 'Tunai', ref: '', unit: '', st: 'Selesai', bukti: '', cat2: '' }, o);
  S.tx.push(t); save(); return t;
}
function cekTx(t) {
  const T = TYPES[t.t]; if (!T) return '⚠ Jenis tidak dikenal';
  if (!(+t.amt) && !T.adj) return '⚠ Nominal kosong';
  if (+t.amt < 0 && !T.adj) return '⚠ Nominal negatif';
  if (!t.d) return '⚠ Tanggal kosong';
  if (T.ref && T.ref !== 'any' && !t.ref) return '⚠ Isi Terkait';
  if (T.ref === 'target' && !S.targets.some(x => x.n === t.ref)) return '⚠ Target tidak ada';
  if (T.ref === 'debt' && t.t !== 'Penerimaan pinjaman' && !S.debts.some(x => x.n === t.ref)) return '⚠ Utang tidak ada';
  if (T.ref === 'inv' && !String(t.ref).startsWith('logam:') && !S.inv.some(x => x.n === t.ref)) return '⚠ Instrumen tidak ada';
  if (T.ref === 'rec' && !S.recv.some(x => x.id === t.ref)) return '⚠ Piutang tidak ada';
  if (!t.c && (T.cat === 'inc' || T.cat === 'exp')) return '⚠ Isi kategori';
  return '✔';
}

/* ---- anuitas (amortisasi) ---- */
function amort(principal, ratePct, tenor) {
  const r = ratePct / 12; const rows = []; let bal = principal;
  const pmt = r ? principal * r / (1 - Math.pow(1 + r, -tenor)) : principal / tenor;
  for (let i = 1; i <= tenor; i++) { const bg = bal * r, pk = pmt - bg; bal = Math.max(0, bal - pk); rows.push({ i, pmt, pk, bg, bal }); }
  return { pmt, rows };
}

/* ---- sinkron GitHub ---- */
const gh = {
  cfg() { return GHC; },
  setCfg(c) { GHC = c; persistCfg(); },
  meta() { try { return JSON.parse(localStorage.getItem(LSM)) || {}; } catch { return {}; } },
  setMeta(m) { localStorage.setItem(LSM, JSON.stringify(m)); },
  ok() { const c = this.cfg(); return !!(c.owner && c.repo && c.token); },
  status: 'Belum disambungkan',
  b64e(s) { const b = new TextEncoder().encode(s); let bin = ''; b.forEach(x => bin += String.fromCharCode(x)); return btoa(bin); },
  b64d(s) { const bin = atob(s.replace(/\n/g, '')); return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))); },
  url() { const c = this.cfg(); return `https://api.github.com/repos/${c.owner}/${c.repo}/contents/${c.path || 'data.json'}`; },
  hdr() { return { Authorization: 'Bearer ' + this.cfg().token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }; },
  async pull() {
    const c = this.cfg(), r = await fetch(this.url() + '?ref=' + encodeURIComponent(c.branch || 'main') + '&t=' + Date.now(), { headers: this.hdr(), cache: 'no-store' });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error('GitHub ' + r.status + ' ' + (await r.text()).slice(0, 120));
    const j = await r.json();
    let data = JSON.parse(this.b64d(j.content));
    if (data.enc) {
      if (!KEY) throw new Error('Data di GitHub terenkripsi. Aktifkan PIN di Pengaturan dengan PIN yang sama dulu.');
      try { data = JSON.parse(await decPayload(data, data.salt === SALT ? KEY : await deriveKey(PW, data.salt, data.it || 250000))); } catch { return { sha: j.sha, data: { updatedAt: 0 }, bad: true }; }
    }
    return { sha: j.sha, data };
  },
  async push(retry = true) {
    const c = this.cfg(); let m = this.meta();
    const body = { message: 'Kasku: perbarui data ' + new Date().toISOString(), content: this.b64e(KEY ? JSON.stringify(await encStr(JSON.stringify(S))) : JSON.stringify(S)), branch: c.branch || 'main' };
    if (m.sha) body.sha = m.sha;
    const r = await fetch(this.url(), { method: 'PUT', headers: { ...this.hdr(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if ((r.status === 409 || r.status === 422) && retry) {
      const rem = await this.pull();
      if (rem && rem.data.updatedAt > (m.syncedAt || 0) && rem.data.updatedAt !== S.updatedAt) throw new Error('KONFLIK');
      this.setMeta({ ...m, sha: rem ? rem.sha : '' }); return this.push(false);
    }
    if (!r.ok) throw new Error('GitHub ' + r.status + ' ' + (await r.text()).slice(0, 120));
    const j = await r.json(); this.setMeta({ sha: j.content.sha, syncedAt: S.updatedAt });
  }
};
let ghTimer = null;
function setStatus(s) { gh.status = s; const e = $('#syncst'); if (e) e.textContent = s; }
function ghSchedule() { if (!gh.ok()) return; setStatus('Menunggu sinkron…'); clearTimeout(ghTimer); ghTimer = setTimeout(ghSync, 2500); }
async function ghSync() {
  if (!gh.ok()) return setStatus('Belum disambungkan');
  if (!navigator.onLine) return setStatus('Offline, disimpan di perangkat');
  try {
    setStatus('Sinkron…');
    const rem = await gh.pull(); const m = gh.meta();
    if (rem && rem.bad) {
      if (!confirm('Data di GitHub memakai PIN lain atau tidak bisa dibuka.\n\nOK = timpa dengan data perangkat ini\nBatal = jangan ubah')) return setStatus('Data GitHub tidak bisa dibuka');
      gh.setMeta({ sha: rem.sha }); await gh.push();
    } else if (rem) {
      const remNew = rem.data.updatedAt > S.updatedAt, localDirty = S.updatedAt > (m.syncedAt || 0);
      if (remNew) {
        if (localDirty && m.syncedAt && !confirm('Data di GitHub lebih baru, dan perangkat ini juga punya perubahan yang belum terkirim.\n\nOK = pakai data GitHub (perubahan di perangkat ini hilang)\nBatal = pakai data perangkat ini (menimpa GitHub)')) { gh.setMeta({ ...m, sha: rem.sha }); await gh.push(); }
        else { S = normalize(rem.data); save(false); gh.setMeta({ sha: rem.sha, syncedAt: S.updatedAt }); if (window.render) render(); }
      } else if (S.updatedAt > rem.data.updatedAt) { gh.setMeta({ ...m, sha: rem.sha }); await gh.push(); }
      else gh.setMeta({ sha: rem.sha, syncedAt: S.updatedAt });
    } else { gh.setMeta({}); await gh.push(); }
    setStatus('Tersinkron ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
  } catch (e) { setStatus(e.message === 'KONFLIK' ? 'Konflik: buka Pengaturan' : 'Gagal sinkron'); console.warn(e); if (e.message !== 'KONFLIK') toast('Sinkron GitHub gagal: ' + e.message); }
}
window.addEventListener('online', () => { if (gh.ok()) ghSync(); });

function toast(msg) { let e = $('#toast'); if (!e) { e = document.createElement('div'); e.id = 'toast'; e.setAttribute('role', 'status'); document.body.appendChild(e); } e.textContent = msg; e.className = 'show'; clearTimeout(toast.t); toast.t = setTimeout(() => e.className = '', 4500); }

/* ---- Excel ---- */
function dl(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
async function exportJSON() { const enc = !!KEY; const txt = enc ? JSON.stringify(await encStr(JSON.stringify(S))) : JSON.stringify(S, null, 1); dl(new Blob([txt], { type: 'application/json' }), `kasku-cadangan${enc ? '-terenkripsi' : ''}-${today()}.json`); toast(enc ? 'Cadangan terenkripsi diunduh (butuh password untuk memulihkan)' : 'Cadangan JSON diunduh (tidak terenkripsi)'); }
function exportXLSX() {
  if (typeof XLSX === 'undefined') return toast('Pustaka Excel belum termuat (butuh internet sekali). Coba lagi.');
  const wb = XLSX.utils.book_new(), add = (name, rows, w) => { const ws = XLSX.utils.aoa_to_sheet(rows); if (w) ws['!cols'] = w.map(x => ({ wch: x })); XLSX.utils.book_append_sheet(wb, ws, name); };
  const y = new Date().getFullYear(), nw = netWorth();
  add('Transaksi', [['BUKU TRANSAKSI (LEDGER UTAMA)'], [], [], [], ['ID Transaksi', 'Tanggal', 'Jenis Transaksi', 'Kategori', 'Subkategori', 'Keterangan', 'Nominal (Rp)', 'Metode Pembayaran', 'Terkait (target / instrumen / utang / ID)', 'Unit', 'Status', 'Bukti (dari sheet Arsip)', 'Catatan', 'Cek']].concat(
    [...S.tx].sort((a, b) => a.d.localeCompare(b.d) || a.id.localeCompare(b.id)).map(t => [t.id, t.d, t.t, t.c, t.sub, t.note, t.amt, t.m, t.ref, t.unit, t.st || 'Selesai', t.bukti, t.cat2, cekTx(t)])), [12, 12, 20, 26, 16, 34, 14, 16, 24, 8, 10, 14, 20, 24]);
  const rows = [['Bulan', 'Pemasukan', 'Pengeluaran (beban)', 'Surplus', 'Savings rate', 'Saldo kas akhir']];
  for (let m = 1; m <= 12; m++) { const s = monthSum(y, m); rows.push([`${BLN[m - 1]} ${y}`, s.inc, s.exp, s.net, s.inc ? s.net / s.inc : 0, cashAt(mTo(y, m))]); }
  add('Ringkasan', rows, [18, 14, 18, 14, 12, 16]);
  const mo = new Date().getMonth() + 1, re = realisasi(y, mo), base = baseIncome(y, mo);
  add('Anggaran', [['Kategori', 'Jenis', '% alokasi', `Jatah ${BLN[mo - 1]}`, 'Realisasi', 'Sisa']].concat(S.alloc.map(a => [a.n, a.jenis, a.pct, a.pct * base, re[a.n] || 0, a.pct * base - (re[a.n] || 0)])), [28, 12, 10, 14, 14, 14]);
  add('Tagihan', [['Nama Tagihan', 'Kategori', 'Nominal per tagihan', 'Tgl Jatuh Tempo', 'Aktif?', 'Frekuensi', 'Terakhir dibayar', 'Bulan Jatuh Tempo']].concat(S.bills.map(b => [b.n, b.kat, b.amt, b.day, b.aktif === false ? 'Tidak' : 'Ya', b.freq || 'Bulanan', b.paid || '', b.mon || ''])), [26, 24, 14, 12, 8, 12, 14]);
  add('Target', [['No', 'Nama Target', 'Prioritas', 'Target Nominal (Rp)', 'Deadline', 'Saldo Awal (sebelum dicatat)', 'Total Terkumpul (Rp)', 'Progress', 'Cara setor', 'Nilai setoran']].concat(S.targets.map((t, i) => [i + 1, t.n, t.pri, t.goal, t.dl, t.awal || 0, targetSaved(t), t.goal ? targetSaved(t) / t.goal : 0, t.mode === 'percent' ? 'Persen penghasilan' : 'Nominal tetap', t.mode === 'percent' ? t.pct : t.monthly])), [5, 26, 10, 16, 12, 16, 16, 10, 18, 12]);
  add('Utang', [['No', 'Nama Pinjaman', 'Kategori Utang', 'Pemberi Pinjaman', 'Pokok Awal (Rp)', 'Suku Bunga (% / tahun)', 'Tenor (bulan)', 'Tgl Cicilan Pertama', 'Cicilan Bulanan (Rp)', 'Pokok Terbayar Sblm Dicatat', 'Total Pokok Terbayar', 'Sisa Pokok (Rp)']].concat(S.debts.map((d, i) => [i + 1, d.n, d.kat, d.lender, d.principal, d.rate, d.tenor, d.start, d.monthly, d.paidP || 0, debtPaid(d), debtBal(d)])), [5, 26, 20, 20, 14, 12, 10, 14, 14, 14, 14, 14]);
  add('Piutang', [['ID Piutang', 'Nama Peminjam', 'Tanggal Pinjaman', 'Jumlah Pinjaman (Rp)', 'Jatuh Tempo', 'Pembayaran Diterima (Rp)', 'Sisa Piutang (Rp)']].concat(S.recv.map(r => [r.id, r.n, r.d, recvGiven(r), r.due, recvGot(r), recvBal(r)])), [12, 22, 14, 16, 12, 16, 16]);
  add('Investasi', [['No', 'Nama Instrumen', 'Jenis', 'Modal Pembelian (Rp)', 'Hasil Penjualan (Rp)', 'Unit Dimiliki', 'Harga Pasar Terbaru', 'Nilai Pasar (Rp)']].concat(S.inv.map((i, k) => [k + 1, i.n, i.jenis, invBought(i), invSold(i), invUnits(i), i.price || 0, invVal(i)])), [5, 28, 14, 16, 16, 12, 16, 16]);
  add('Aset', [['ID Aset', 'Nama Aset', 'Kategori', 'Tgl Perolehan', 'Harga Perolehan (Rp)', 'Nilai Saat Ini (Rp)', 'Umur manfaat (tahun)', 'Nilai Buku (Rp)']].concat(S.assets.map(a => [a.id, a.n, a.kat, a.d, a.cost, a.now || 0, a.life || 0, assetBook(a)])), [10, 24, 20, 12, 16, 16, 12, 16]);
  add('Neraca', [['Pos', 'Nilai (Rp)'], ['Kas', nw.kas], ['Tabungan', nw.tab], ['Investasi (nilai pasar)', nw.inv], ['Piutang', nw.pi], ['Aset tetap', nw.at], ['Emas & perak', nw.lg], ['TOTAL ASET', nw.aset], ['Sisa pokok utang', nw.ut], ['KEKAYAAN BERSIH', nw.nw]], [28, 18]);
  add('Pengaturan', [['Nama Pemilik', S.set.nama], ['Penghasilan Rutin Bulanan (rencana) – Rp', S.set.income], ['Saldo Awal Kas saat mulai mencatat – Rp', S.set.saldoAwal], ['Batas Aman Rasio Cicilan (DSR)', S.set.dsr], ['Target Savings Rate Minimum', S.set.sr], ['Ambang Waspada Anggaran', S.set.warn], ['Dana Darurat Ideal (jumlah bulan)', S.set.dd], ['Batas Saldo Kas Rendah – Rp', S.set.low]], [44, 20]);
  add('Alokasi', [[], [], [], ['No', 'Kategori Pengeluaran', 'Jenis', 'Alokasi (% Penghasilan)']].concat(S.alloc.map((a, i) => [i + 1, a.n, a.jenis, a.pct])), [5, 30, 12, 14]);
  add('EmasPerak', [['Jenis', 'Keterangan', 'Tgl beli', 'Berat (g)', 'Dipakai sehari-hari (g)', 'Harga/gram', 'Nilai sekarang', 'Harga beli']].concat((S.logam || []).map(x => [x.jenis, x.n, x.d, x.gram, x.pakai || 0, (+x.price) || (x.jenis === 'Emas' ? S.set.gold : S.set.silver) || 0, (+x.gram || 0) * (((+x.price) || (x.jenis === 'Emas' ? +S.set.gold : +S.set.silver)) || 0), x.buy || 0])), [10, 26, 12, 10, 14, 14, 16, 14]);
  add('Zakat', [['Jenis', 'Nominal', 'Batas', 'Status', 'Tgl dibayar', 'Catatan']].concat(S.zakat.map(x => [x.n, x.amt, x.due, x.paid ? 'Sudah' : 'Belum', x.paidDate || '', x.note || ''])), [28, 14, 12, 10, 12, 30]);
  add('Pajak', [['Jenis pajak', 'Nominal', 'Batas bayar', 'Ulang', 'Status', 'Tgl dibayar', 'Catatan']].concat(S.tax.map(x => [x.n, x.amt, x.due, x.rep || 'Tidak', x.paid ? 'Sudah' : 'Belum', x.paidDate || '', x.note || ''])), [28, 14, 12, 10, 10, 12, 30]);
  XLSX.writeFile(wb, `Keuangan_Pribadi_${today()}.xlsx`); toast('Excel diunduh');
}
function xDate(v) {
  if (v instanceof Date && !isNaN(v)) return ymd(new Date(v.getTime() + 12 * 3600e3)); // hindari geser zona waktu
  if (typeof v === 'number' && v > 20000) return ymd(new Date(Math.round((v - 25569) * 864e5) + 12 * 3600e3 - new Date().getTimezoneOffset() * 0)).slice(0, 10);
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  return '';
}
function readTable(ws, firstHeader) {
  const a = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
  const hi = a.findIndex(r => r.some(c => c === firstHeader)); if (hi < 0) return [];
  const h = a[hi]; const out = [];
  for (let i = hi + 1; i < a.length; i++) { const r = a[i]; const o = {}; let any = false; const first = r.find(c => c != null && c !== ''); if (out.length && (first === undefined || /^TOTAL/i.test(String(first)))) break; if (first === undefined) continue; if (/^TOTAL/i.test(String(first))) break; h.forEach((k, j) => { if (k != null && r[j] != null && r[j] !== '') { o[String(k).trim()] = r[j]; any = true; } }); if (any) out.push(o); }
  return out;
}
async function importXLSX(file) {
  if (typeof XLSX === 'undefined') return toast('Pustaka Excel belum termuat (butuh internet).');
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  const sh = n => wb.Sheets[n], N = v => +v || 0, str = v => v == null ? '' : String(v).trim();
  const n = defaults(); let cnt = {};
  if (sh('Transaksi')) {
    n.tx = readTable(sh('Transaksi'), 'ID Transaksi').filter(o => o['Jenis Transaksi'] && TYPES[o['Jenis Transaksi']] && xDate(o['Tanggal'])).map(o => ({
      id: str(o['ID Transaksi']), d: xDate(o['Tanggal']), t: o['Jenis Transaksi'], c: str(o['Kategori']), sub: str(o['Subkategori']), note: str(o['Keterangan']),
      amt: N(o['Nominal (Rp)']), m: str(o['Metode Pembayaran']), ref: str(o['Terkait (target / instrumen / utang / ID)']), unit: o['Unit'] ?? '', st: str(o['Status']) || 'Selesai', bukti: str(o['Bukti (dari sheet Arsip)']), cat2: str(o['Catatan'])
    })); cnt.tx = n.tx.length;
  }
  if (sh('Target')) { n.targets = readTable(sh('Target'), 'Nama Target').map(o => ({ n: str(o['Nama Target']), pri: str(o['Prioritas']) || 'Sedang', goal: N(o['Target Nominal (Rp)']), dl: xDate(o['Deadline']), awal: N(o['Saldo Awal (sebelum dicatat)']), mode: 'fixed', pct: 0, monthly: N(o['Perlu Setor / Bulan (Rp)']) })).filter(x => x.n); cnt.target = n.targets.length; }
  if (sh('Utang')) { n.debts = readTable(sh('Utang'), 'Nama Pinjaman').map(o => ({ n: str(o['Nama Pinjaman']), kat: str(o['Kategori Utang']), lender: str(o['Pemberi Pinjaman']), principal: N(o['Pokok Awal (Rp)']), rate: N(o['Suku Bunga (% / tahun)']), tenor: N(o['Tenor (bulan)']), start: xDate(o['Tgl Cicilan Pertama']), monthly: N(o['Cicilan Bulanan (Rp)']), paidP: N(o['Pokok Terbayar Sblm Dicatat']) })).filter(x => x.n); cnt.utang = n.debts.length; }
  if (sh('Piutang')) { n.recv = readTable(sh('Piutang'), 'ID Piutang').map(o => ({ id: str(o['ID Piutang']), n: str(o['Nama Peminjam']), d: xDate(o['Tanggal Pinjaman']), due: xDate(o['Jatuh Tempo']), amt: N(o['Jumlah Pinjaman (Rp)']) })).filter(x => x.id); cnt.piutang = n.recv.length; }
  if (sh('Investasi')) { n.inv = readTable(sh('Investasi'), 'Nama Instrumen').map(o => ({ n: str(o['Nama Instrumen']), jenis: str(o['Jenis']), price: N(o['Harga Pasar Terbaru']) })).filter(x => x.n); cnt.investasi = n.inv.length; }
  if (sh('Aset')) { n.assets = readTable(sh('Aset'), 'ID Aset').filter(o => /^AST/.test(str(o['ID Aset']))).map(o => ({ id: str(o['ID Aset']), n: str(o['Nama Aset']), kat: str(o['Kategori']), d: xDate(o['Tgl Perolehan']), cost: N(o['Harga Perolehan (Rp)']), now: N(o['Nilai Saat Ini (Rp)']), life: /Kendaraan/.test(str(o['Kategori'])) ? 8 : /Peralatan/.test(str(o['Kategori'])) ? 4 : 0 })); if (sh('Penyusutan')) readTable(sh('Penyusutan'), 'Nama Aset').forEach(o => { const x = n.assets.find(a => a.n === str(o['Nama Aset'])); if (x) { x.life = /Tidak/i.test(str(o['Metode'])) ? 0 : N(o['Umur Ekonomis (tahun)']); x.res = N(o['Nilai Residu (Rp)']); } }); cnt.aset = n.assets.length; }
  if (sh('Tagihan')) { n.bills = readTable(sh('Tagihan'), 'Nama Tagihan').map(o => ({ n: str(o['Nama Tagihan']), kat: str(o['Kategori']), amt: N(o['Nominal / Bulan (Rp)']), day: N(o['Tgl Jatuh Tempo (1-31)']) || 1, aktif: str(o['Aktif?']) !== 'Tidak', freq: ['Triwulan', 'Semesteran', 'Tahunan'].includes(str(o['Frekuensi'])) ? str(o['Frekuensi']) : 'Bulanan', mon: N(o['Bulan Jatuh Tempo']) || 1, paid: '' })).filter(x => x.n); cnt.tagihan = n.bills.length; }
  if (sh('Alokasi')) { const al = readTable(sh('Alokasi'), 'Kategori Pengeluaran').filter(o => typeof o['Alokasi (% Penghasilan)'] === 'number').map(o => ({ n: str(o['Kategori Pengeluaran']), jenis: str(o['Jenis']) || 'Variabel', pct: N(o['Alokasi (% Penghasilan)']) })); if (al.length) { n.alloc = al; cnt.alokasi = al.length; } }
  if (sh('Pengaturan')) {
    const a = XLSX.utils.sheet_to_json(sh('Pengaturan'), { header: 1, raw: true, defval: null }), g = k => { const r = a.find(r => String(r[0] || '').startsWith(k)); return r ? r[1] : null; };
    const setv = (key, k) => { const v = g(k); if (v != null && v !== '') n.set[key] = typeof n.set[key] === 'number' ? N(v) : str(v); };
    setv('nama', 'Nama Pemilik'); setv('income', 'Penghasilan Rutin'); setv('saldoAwal', 'Saldo Awal'); setv('dsr', 'Batas Aman'); setv('sr', 'Target Savings'); setv('warn', 'Ambang Waspada'); setv('dd', 'Dana Darurat Ideal'); setv('low', 'Batas Saldo'); setv('asetBasis', 'Dasar Nilai');
    if (n.set.asetBasis === 'Nilai Pasar') n.set.asetBasis = 'Nilai Saat Ini';
  }
  if (!Object.keys(cnt).length) return toast('File ini tidak dikenali. Pakai file Excel Keuangan Pribadi v3 atau hasil unduhan Kasku.');
  const ringkas = Object.entries(cnt).map(([k, v]) => `${v} ${k}`).join(', ');
  if (!confirm(`Akan mengimpor: ${ringkas}.\n\nData di aplikasi ini DIGANTI dengan isi file. Lanjut? (Disarankan unduh cadangan JSON dulu.)`)) return;
  const old = S; ['chat', 'logam', 'zakat', 'tax', 'ins', 'spt'].forEach(k => n[k] = old[k]); ['kontrakEnd', 'kontrakIncome', 'kontrakExpense', 'kontrakAset', 'autolock', 'gold', 'silver', 'zakatMode', 'haulMaal', 'jiwa', 'berasKg', 'fitrahDate', 'notif', 'lastNotif'].forEach(k => n.set[k] = old.set[k]); S = n; if (!cnt.tx) S.tx = []; save(); toast('Impor selesai: ' + ringkas); if (window.render) render();
}
