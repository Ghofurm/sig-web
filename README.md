# Semarang Spasial

Situs statis untuk laporan **Analisis Spasial Kepadatan Penduduk dan Aksesibilitas Fasilitas Kesehatan di Kota Semarang**.

Peta interaktif 16 kecamatan: kepadatan penduduk, rasio fasilitas kesehatan per 10.000 penduduk, dan cakupan radius 1 km. Dibuat dengan HTML, CSS, JavaScript, dan Leaflet. Tidak perlu build step atau server.

## Jalankan lokal

Karena data dimuat dengan `fetch`, buka lewat server lokal (bukan `file://`):

```bash
python3 -m http.server 8000
# buka http://localhost:8000
```

## Deploy ke GitHub Pages

1. Buat repositori GitHub, lalu push seluruh isi folder ini.
2. Buka **Settings → Pages**.
3. Pilih **Deploy from a branch**, branch `main`, folder `/ (root)`, lalu **Save**.
4. Tunggu beberapa menit; situs tersedia di `https://ghofurm.github.io/sig-web/`.

File `.nojekyll` sudah disertakan agar folder `data/` dan `assets/` disajikan apa adanya.

## Struktur

```
index.html                 halaman tunggal
assets/css/site.css        seluruh tampilan
assets/js/site.js          peta, diagram, tabel, interaksi
assets/vendor/leaflet/     Leaflet 1.9.4 (lokal)
data/kecamatan.geojson     batas + statistik 16 kecamatan
data/faskes.geojson        259 titik fasilitas kesehatan
data/cakupan.geojson       buffer 1 km, dipotong batas kota
data/statistik-kecamatan.csv
qgis2web_.../              ekspor QGIS asli (sumber data)
```

## Sumber data

- Batas kecamatan, jumlah penduduk, dan luas: dataset BPS Kota Semarang yang dipakai pada analisis QGIS.
- Fasilitas kesehatan: OpenStreetMap, 259 titik (216 klinik, 40 rumah sakit, 3 praktik dokter). © kontributor OpenStreetMap, ODbL.
- Peta dasar: OpenStreetMap.
- Pengolahan buffer, irisan, dan luas: QGIS.

## Angka utama

- Penduduk: 1.722.421 · luas: 381 km² · rata-rata 4.521 jiwa/km².
- 259 fasilitas · 1,50 per 10.000 penduduk.
- 59,9% luas kota berada dalam radius 1 km fasilitas kesehatan.
- Estimasi 503.902 jiwa (29,3%) tinggal di luar cakupan 1 km, dengan asumsi penduduk tersebar merata per kecamatan.

## Mengubah isi

- Teks dan judul ada di `index.html`.
- Warna dan tipografi ada di blok `:root` pada `assets/css/site.css`.
- Angka peta, diagram, dan tabel dibaca dari file di `data/`. Untuk memperbarui data, ganti GeoJSON dengan struktur properti yang sama (lihat `kecamatan.geojson`), lalu sesuaikan angka naratif di `index.html` bila berubah.
- Indikator peta dan kelas warnanya ada di objek `METRICS` pada `assets/js/site.js`.
- OG/canonical memakai `https://ghofurm.github.io/sig-web/`. Ganti bila nama repo atau domain berubah; gambar pratinjau ada di `assets/share.jpg` (1200 × 630).

## Catatan metode

- Kepadatan = penduduk ÷ luas kecamatan.
- Rasio faskes = jumlah fasilitas ÷ penduduk × 10.000.
- Cakupan = luas irisan buffer 1 km tiap fasilitas dengan batas kecamatan ÷ luas kecamatan.
- Estimasi di luar cakupan mengasumsikan penduduk tersebar merata di dalam kecamatan. Buffer memakai jarak garis lurus, bukan jarak jalan.
- Jumlah fasilitas tidak dibobot kapasitas; rumah sakit dan klinik dihitung sama.
