'use strict';
/* ===== Kunci password ===== */
const hasCrypto = () => !!(window.crypto && crypto.subtle);
function showLock() {
  LOCKED = true; $('#app').hidden = true; $('#bn').hidden = true;
  let o = $('#lock'); if (!o) { o = document.createElement('div'); o.id = 'lock'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-labelledby', 'lk-t'); document.body.appendChild(o); }
  o.hidden = false;
  o.innerHTML = `<form class="box" id="lkf" autocomplete="on"><div class="lo2">K</div><div><h1 id="lk-t" style="font-size:22px">Kasku terkunci</h1><p class="sub">Masukkan PIN untuk membuka data keuangan Anda.</p></div>
  <div class="fl"><label for="lk-pw">PIN</label><input id="lk-pw" name="password" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="current-password" required style="letter-spacing:.4em;font-size:20px;text-align:center"></div><p class="err" id="lk-err" role="alert"></p>
  <button class="btn" id="lk-go">Buka</button>
  <details><summary style="cursor:pointer;min-height:40px;display:flex;align-items:center;color:var(--mut);font-weight:600">Lupa PIN?</summary><p class="sub">PIN tidak bisa dipulihkan, karena data memang dienkripsi dengan PIN itu. Anda bisa menghapus data di perangkat ini, lalu memulihkannya dari Excel, cadangan JSON, atau GitHub (butuh PIN yang sama untuk cadangan terenkripsi).</p><button type="button" class="btn d s" id="lk-reset">Hapus data di perangkat ini</button></details></form>`;
  $('#lk-pw').focus();
  $('#lkf').addEventListener('submit', async e => {
    e.preventDefault(); const pw = $('#lk-pw').value, err = $('#lk-err'), btn = $('#lk-go'); if (!pw) return;
    const fails = +(localStorage.getItem('kasku.fail') || 0), wait = fails >= 5 ? Math.min(300, 2 ** (fails - 4)) : 0, until = +(localStorage.getItem('kasku.until') || 0);
    if (Date.now() < until) { err.textContent = `Terlalu banyak percobaan. Tunggu ${Math.ceil((until - Date.now()) / 1000)} detik.`; return; }
    btn.disabled = true; btn.textContent = 'Membuka…'; err.textContent = '';
    const ok = await tryUnlock(pw);
    if (ok) { localStorage.removeItem('kasku.fail'); localStorage.removeItem('kasku.until'); }
    if (!ok) { const n = fails + 1; localStorage.setItem('kasku.fail', n); if (n >= 5) localStorage.setItem('kasku.until', Date.now() + Math.min(300, 2 ** (n - 4)) * 1000); await new Promise(r => setTimeout(r, 900)); err.textContent = 'PIN salah. Coba lagi.'; btn.disabled = false; btn.textContent = 'Buka'; $('#lk-pw').select(); }
  });
  $('#lk-reset').addEventListener('click', () => { if (confirm('Hapus SEMUA data Kasku di perangkat ini? Tidak bisa dibatalkan.') && confirm('Yakin? Pastikan Anda punya cadangan.')) { [LS, LSG, LSM].forEach(k => localStorage.removeItem(k)); location.reload(); } });
}
async function tryUnlock(pw) {
  try {
    const raw = JSON.parse(localStorage.getItem(LS)), key = await deriveKey(pw, raw.salt, raw.it || 250000), txt = await decPayload(raw, key);
    KEY = key; PW = pw; SALT = raw.salt; ITER = raw.it || 250000; S = normalize(JSON.parse(txt)); await loadCfgEnc();
  } catch (e) { return false; }
  LOCKED = false; $('#lock').hidden = true; $('#lock').innerHTML = ''; $('#app').hidden = false; $('#bn').hidden = false; startApp(); return true;
}
let idleT = null;
function setupAutoLock() {
  clearTimeout(idleT); if (!KEY || !(+S.set.autolock > 0)) return;
  const arm = () => { clearTimeout(idleT); idleT = setTimeout(() => location.reload(), S.set.autolock * 60000); };
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(ev => document.addEventListener(ev, arm, { passive: true })); arm();
}
function lockCard() {
  if (!hasCrypto()) return `<section class="card"><h2>Kunci PIN</h2><p class="sub">Browser ini belum mendukung enkripsi (butuh https atau localhost). Buka lewat alamat GitHub Pages (https).</p></section>`;
  const pwf = (id, label, ac) => fld(label, id, `<input id="${id}" name="${id}" type="password" inputmode="numeric" pattern="[0-9]{4,8}" maxlength="8" minlength="4" autocomplete="${ac}" required>`);
  return KEY ? `<section class="card"><div class="top"><div><h2>Kunci PIN</h2><p class="sub">Data di perangkat ini dan di GitHub tersimpan terenkripsi (AES-256). Tanpa PIN, isinya tidak bisa dibaca.</p></div><span class="tag g">Aktif</span></div>
  <div class="frm" style="margin-top:12px">${fld('Kunci otomatis bila tidak dipakai', 'al_t', `<select id="al_t" data-c="autolock">${opt([[1, '1 menit'], [5, '5 menit'], [15, '15 menit'], [60, '1 jam'], [0, 'Tidak otomatis']], S.set.autolock)}</select>`)}<button class="btn o" data-a="locknow">Kunci sekarang</button></div>
  <form data-f="lockchg" class="frm" style="margin-top:14px">${pwf('lc_o', 'PIN sekarang', 'current-password')}${pwf('lc_n', 'PIN baru (4-8 angka)', 'new-password')}${pwf('lc_n2', 'Ulangi PIN baru', 'new-password')}<button class="btn">Ganti PIN</button></form>
  <form data-f="lockoff" class="frm" style="margin-top:10px">${pwf('lf_o', 'PIN sekarang (untuk mematikan kunci)', 'current-password')}<button class="btn d">Matikan kunci</button></form>
  <p class="sub">PIN pendek lebih mudah ditebak daripada password panjang, jadi pakai 6 angka atau lebih dan jangan memakai tanggal lahir. Cadangan JSON ikut terenkripsi. File Excel tidak bisa dienkripsi, simpan di tempat aman.</p></section>`
    : `<section class="card"><div class="top"><div><h2>Kunci PIN</h2><p class="sub">Minta PIN setiap membuka aplikasi. Data di browser dan di GitHub dienkripsi dengan PIN ini.</p></div><span class="tag n">Belum aktif</span></div>
  <form data-f="lockon" class="frm" style="margin-top:12px">${pwf('lo_n', 'Buat PIN (4-8 angka, 6 atau lebih lebih aman)', 'new-password')}${pwf('lo_n2', 'Ulangi PIN', 'new-password')}<button class="btn">Aktifkan PIN</button></form>
  <p class="sub"><b>Penting:</b> PIN tidak bisa dipulihkan. Jika lupa, data hanya bisa dipulihkan dari Excel atau cadangan yang Anda simpan. Ingat PIN Anda dengan baik.</p></section>`;
}
F.lockon = async f => {
  const a = f.lo_n.value, b = f.lo_n2.value; if (!/^\d{4,8}$/.test(a)) return toast('PIN harus 4 sampai 8 angka'); if (a !== b) return toast('Ulangi PIN dengan sama persis');
  try { SALT = newSalt(); ITER = 600000; KEY = await deriveKey(a, SALT, ITER); PW = a; } catch (e) { KEY = null; return toast('Gagal membuat kunci: ' + e.message); }
  S.set.autolock = S.set.autolock || 5; save(); persistCfg(); setupAutoLock(); render(); toast('PIN aktif. Data kini terenkripsi.');
};
F.lockchg = async f => {
  if (f.lc_o.value !== PW) return toast('PIN sekarang salah'); const a = f.lc_n.value; if (!/^\d{4,8}$/.test(a)) return toast('PIN baru harus 4 sampai 8 angka'); if (a !== f.lc_n2.value) return toast('Ulangi PIN baru dengan sama persis');
  SALT = newSalt(); ITER = 600000; KEY = await deriveKey(a, SALT, ITER); PW = a; save(); persistCfg(); render(); toast('PIN diganti');
};
F.lockoff = async f => {
  if (f.lf_o.value !== PW) return toast('PIN salah'); if (!confirm('Matikan kunci? Data akan disimpan tanpa enkripsi.')) return;
  KEY = null; PW = ''; SALT = ''; clearTimeout(idleT); save(); persistCfg(); render(); toast('Kunci dimatikan');
};
C.autolock = el => { S.set.autolock = +el.value; save(); setupAutoLock(); toast('Pengaturan kunci otomatis disimpan'); };
A.locknow = () => location.reload();
