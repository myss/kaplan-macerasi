# Kaplan Macerası

Her şeyi kürelerden yapılmış üç boyutlu bir macera oyunu.

Kötü kuşlar timsahları kafeslere kilitledi. Kaplan anahtarları bulup kafesleri açar ve timsahları
kurtarır. Dünya hazır gelir, küreler kırılmaz.

## Oynamak

`index.html` dosyasına çift tıklayın. Kurulum gerekmez, tarayıcının WebGL2 desteklemesi yeterlidir.

- **W A S D / oklar:** yürü
- **Boşluk:** zıpla; kuşun üstüne zıplarsan onu yenersin
- **Fare ile sürükle / Q, E:** kamerayı çevir
- **Fare tekerleği:** yakınlaş, uzaklaş

## Kod

- `js/renderer.js`: küreleri Three.js ile çizer
- `js/world.js`: adayı üretir; dünya 25 cm'lik bir ızgaradır
- `js/models.js`: kaplan, timsah, kuş, anahtar ve kafes
- `js/game.js`: oyun kuralları, kontroller ve ekran
- `js/utils.js`: küçük yardımcı fonksiyonlar
- `vendor/three.min.js`: Three.js 0.187.0, çift tıkla çalışsın diye esbuild ile tek dosyada paketlenmiş hâli (`export * from 'three'`, `--bundle --minify --format=iife --global-name=THREE`)
