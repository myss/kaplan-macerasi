# Kaplan Macerası

Her şeyi kürelerden yapılmış üç boyutlu bir macera oyunu.

Kötü kuşlar timsahları kafeslere kilitledi. Kaplan anahtarları bulup kafesleri açar ve timsahları
kurtarır. Bölüm bitince yeni bir dünyaya geçilir. Dünyalar bölüm numarasından üretilir, yani bölümler
sonsuzdur: Orman, Çöl, Kar ve Volkan sırayla döner, her seferinde farklı bir ada çıkar. Bölüm
ilerledikçe kafes ve kuş sayısı artar, kuşlar hızlanır. Anahtarlar basamaklı kulelerin, spiral
merdivenlerin ve uçan taşların tepesindedir; dağlara zıplayarak çıkılır. Küreler kırılmaz.

## Oynamak

`index.html` dosyasına çift tıklayın. Kurulum gerekmez, tarayıcının WebGL2 desteklemesi yeterlidir.

- **W A S D / oklar:** yürü
- **Boşluk:** zıpla; kuşun üstüne zıplarsan onu yenersin
- **F / tıkla:** dönerek vur; yakındaki kuşları yener
- **Fare ile sürükle / Q, E:** kamerayı çevir
- **Fare tekerleği:** yakınlaş, uzaklaş

## Kod

- `js/renderer.js`: küreleri Three.js ile çizer
- `js/world.js`: adayı üretir; dünya 25 cm'lik bir ızgaradır
- `js/models.js`: kaplan, timsah, kuş, anahtar ve kafes
- `js/game.js`: oyun kuralları, kontroller ve ekran
- `js/utils.js`: küçük yardımcı fonksiyonlar
- `vendor/three.min.js`: Three.js 0.187.0, çift tıkla çalışsın diye esbuild ile tek dosyada paketlenmiş hâli (`export * from 'three'`, `--bundle --minify --format=iife --global-name=THREE`)
