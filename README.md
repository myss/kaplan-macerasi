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

- `js/renderer.js`: küreleri WebGL2 ile çizer
- `js/world.js`: adayı üretir; dünya 25 cm'lik bir ızgaradır
- `js/models.js`: kaplan, timsah, kuş, anahtar ve kafes
- `js/game.js`: oyun kuralları, kontroller ve ekran
- `js/math.js`: matris ve yardımcı hesaplar
