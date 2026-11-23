# Kasku: Keuangan Pribadi (tanpa database)

Aplikasi statis (HTML, CSS, JS). Data disimpan di browser, bisa disinkronkan ke repo GitHub privat Anda, dan bisa diunduh sebagai Excel.

## Pasang di GitHub Pages
1. Buat repository baru di GitHub, mis. `kasku` (publik, karena GitHub Pages gratis untuk repo publik). Repo ini hanya berisi aplikasi, TANPA data keuangan.
2. Unggah semua isi folder ini: `index.html`, `style.css`, folder `js/`, dan `README.md`.
3. Settings → Pages → Source: Deploy from a branch → Branch `main` / folder `/ (root)` → Save.
4. Tunggu 1-2 menit. Alamat: `https://USERNAME.github.io/kasku/`.

## Simpan data di GitHub (opsional, agar HP dan laptop sama)
1. Buat repository PRIVATE baru, mis. `kasku-data`, centang "Add a README".
2. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate. Pilih HANYA repo `kasku-data`, izin Repository permissions → Contents: Read and write.
3. Di aplikasi: Pengaturan & Excel → Sinkron GitHub → isi username, nama repo, token → Simpan dan sinkron. Ulangi di tiap perangkat.

## Pindah dari Excel v3
Pengaturan & Excel → Impor dari Excel → pilih file Keuangan_Pribadi_v3.xlsx.

## Pengingat
Tanpa server, notifikasi browser hanya muncul saat aplikasi dibuka. Untuk pengingat saat aplikasi tertutup, unduh jadwal (.ics) dan buka di HP agar masuk kalender.

## Kunci PIN
Pengaturan & Excel → Kunci PIN → buat PIN 4-8 angka (6+ lebih aman). Data di browser, cadangan JSON, dan file di GitHub ikut terenkripsi (AES-256). PIN TIDAK bisa dipulihkan. Simpan cadangan Excel/JSON. File Excel tidak terenkripsi.
