# Aset Mochi

## Hero Profil level 2–5 (2026-11-15)

- Level 2: `mochi-level-2.png` / `.webp`, blob pink lebar dari image.png_2.
  Background Blender, garis grid dan overlay seleksi pada badan dihapus.
- Level 3: `mochi-level-3.png` / `.webp`, jelly biru dengan bintang emas dan wink.
- Level 4: `mochi-level-4.png` / `.webp`, karakter lavender tinggi bermata besar.
- Level 5: `mochi-crown-transparent.png`, aset crown yang diminta pengguna,
  dipakai tanpa mengganti artwork. Level 1 tetap scene Spline.
- PNG adalah master alpha hasil edit imagegen bawaan. WebP 512px adalah ekspor
  quality 90 / alphaQuality 100. Background benar-benar transparan. Prompt final
  disimpan di `../../docs/mascot-level-edit-prompts.md`.
- Latar hitam pada login/avatar berasal dari JPEG hasil warmup optimizer yang
  tersimpan di cache lama; bukan background baru pada PNG/WebP sumber.
  Worker v3-alpha memaksa WebP untuk jalur optimasi dan menghormati Vary.

## Aset sebelumnya

- Referensi terbaru: `mochi-reference (2).png`, disediakan pengguna.
- Master transparan: `mochi-crown-transparent.png` (1254 × 1254, RGBA).
- Aset UI: `mochi-crown-transparent.webp` (1254 × 1254, alpha dipertahankan;
  WebP quality 90, alphaQuality 100). Ukuran sekitar 147 KB.
- Dibuat dengan imagegen bawaan, mode edit/background-extraction. Referensi dan
  PNG transparan lama dipertahankan. Berkas ikon PWA memiliki latar opak tersendiri.
- Digunakan pada login, quick-add, permission/hint kamera, sukses scan dan fallback
  Beranda. Scene Spline merupakan aset 3D terpisah.
- Alpha PNG/WebP telah diperiksa: sudut transparan, bagian tengah karakter opak.
  Tampilan login dan fallback Beranda ditinjau pada tema terang serta gelap.

## Prompt final

Use case: background-extraction. Edit target: the attached local image
mochi-reference (2).png, the user's new Cashly Mochi mascot. Remove ONLY the white
background and any white backdrop glow outside the subject, producing a genuinely
transparent RGBA PNG. Preserve the existing mascot pixel appearance as closely as
possible: full purple jelly body, big glossy eyes with their white sclera,
cheerful open mouth, gold crown, purple cape, both hands holding both gold coins
(large coin on image left with M and star; smaller coin on image right with
clover), gold star pendant and clasp, both feet, and the floating gold sparkle
details around the crown. Keep the same front-facing pose, proportions, facial
expression, materials, colors, lighting, and full square composition with
comfortable clear margins. No redesign, recoloring, added objects, cropping,
checkerboard pattern, solid background, text, or watermark. Smooth antialiased
alpha at all edges; no white fringe so it works cleanly on dark plum and light
lavender UI backgrounds. This is a website mascot cutout asset, not an app icon.
