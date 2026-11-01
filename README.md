# Kaplan Macerası

Her şeyi kürelerden yapılmış üç boyutlu bir macera oyunu.

Kötü kuşlar timsahları kafeslere kilitledi. Kaplan anahtarları bulup kafesleri açar ve timsahları
kurtarır. Bölüm bitince yeni bir dünyaya geçilir. Dünyalar bölüm numarasından üretilir, yani bölümler
sonsuzdur: ilk altısı Orman, Çöl, Kar, Volkan, Dev Ev ve Korsan Gemisi'dir, sonrakiler kendi
renklerini, bitkilerini ve sıvısını üretir (Pembe Mantar Diyarı, Mor Kristal Vadisi gibi). Dev Ev'in
üst katına ve geminin gözcü yerine kanatla çıkılır; gemideki kaptan kuşa iki kez vurmak gerekir.
Her bölümde haritada görünmeyen bir bonus vardır: yüksekteki minik kulübeye yalnızca taştan taşa
zıplayarak çıkılır, çevresinde kanatlar çalışmaz. İçindeki altın topu alıp vurma tuşuna basınca
kaplan yere yumruk atar ve bölüm bitene kadar bütün kuşlar yok olur. Bölüm ilerledikçe kafes ve kuş sayısı artar, kuşlar hızlanır. Anahtarlar basamaklı kulelerin, spiral
merdivenlerin ve uçan taşların tepesindedir; dağlara zıplayarak çıkılır. Küreler kırılmaz.

## Oynamak

`index.html` dosyasına çift tıklayın. Kurulum gerekmez, tarayıcının WebGL2 desteklemesi yeterlidir.

Oyun kendini tarayıcıya kaydeder ve kapatınca kaldığı yerden devam eder; kuşlar baştan başlar. Kayıt
o tarayıcıya ve açılan adrese özeldir.

- **W A S D / oklar:** yürü
- **Boşluk:** zıpla; kuşun üstüne zıplarsan onu yenersin
- **Boşluk'u basılı tut:** kanat aldıysan uç; her kanat 10 saniye uçurur, süre yalnızca uçarken azalır
- **F / tıkla:** dönerek vur; yakındaki kuşları yener
- **Fareyi oynat / Q, E:** kamerayı çevir
- **Esc:** oyunu durdur, fareyi geri al; devam etmek için tıkla, baştan başlamak için düğmeye bas
- **Fare tekerleği:** yakınlaş, uzaklaş
- **O (hile):** en yakındaki anahtarı veya kanadı alır, anahtar varsa kafesi açar

## Kod

- `js/renderer.js`: küreleri Three.js ile çizer
- `js/world.js`: adayı üretir; dünya 25 cm'lik bir ızgaradır
- `js/landmarks.js`: elle tasarlanmış yerler: dev ev ve korsan gemisi
- `js/models.js`: kaplan, timsah, kuş, anahtar ve kafes
- `js/crossing.js`: bölümler arası geçiş animasyonu; kaplan dünyasına göre yüzer, kayar ya da uçar
- `js/game.js`: oyun kuralları, kontroller ve ekran
- `js/utils.js`: küçük yardımcı fonksiyonlar
- `vendor/three.min.js`: Three.js 0.187.0, çift tıkla çalışsın diye esbuild ile tek dosyada paketlenmiş hâli (`export * from 'three'`, `--bundle --minify --format=iife --global-name=THREE`)
