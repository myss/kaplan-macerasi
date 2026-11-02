# Kaplan Macerası

Her şeyi kürelerden yapılmış üç boyutlu bir macera oyunu.

Kötü kuşlar timsahları kafeslere kilitledi. Kaplan anahtarları bulup kafesleri açar ve timsahları
kurtarır. Dokuz dünya vardır: Canlı Ağaçlar Ormanı, Akrepler Çölü, Kar Vadisi, Cehennem Köyü, Dev ev,
Korsanlar gemisi, Deniz dibi zindanı (kaplan başlıkla dalar; kanat gerekmez, Boşluk'u basılı tutunca yüzer; yavaş denizanaları, köpekbalıkları ve dev kalamar
vardır), Zorlu Sörf (bambaşka oynanır: kaplan üç şeritte kendiliğinden ilerler, kayalardan, şamandıralardan
ve yunuslardan kaçar; sonunda balinanın gölgesinden kaçar, balinaya vurulamaz) ve Yer Dibi Şehri (her girişte yolları değişen büyük bir labirent, harita yok;
köstebekler, karıncalar ve dev solucan). Dev evin üst katına ve geminin gözcü yerine kanatla çıkılır; gemideki kaptan kuşa iki kez vurmak gerekir.
Her bölümde haritada görünmeyen bir bonus vardır: yüksekteki minik kulübeye yalnızca taştan taşa
zıplayarak çıkılır, çevresinde kanatlar çalışmaz. İçindeki altın topu alıp vurma tuşuna basınca
kaplan yere yumruk atar ve bölüm bitene kadar bütün kuşlar yok olur; canavarlar kalır.

Kuşların yanında her dünyanın kendi yürüyen canavarı vardır ve her birinin kendine özgü bir özelliği vardır:
yürüyen ağaçların yerde ilerleyen kökü kaplanı bir an tutar (üstünden zıplanır), akrepler yavaşlatan zehir atar,
kutup ayıları titreyip karınları üstünde kayar, lav canavarları ateş topu atar, fareler sürüyle gezer ve biri
yenilince diğerleri kaçar, korsan ayılar yapıştıran bal atar, köpekbalıklarının yalnızca yüzgeci görünür ve yakına
gelince ısırmak için fırlar, köstebekler yerin altından kaplanın yanında çıkar (toprak önce kabarır), karıncaların
zırhı vardır ve iki kez vurmak gerekir. Atılan her şeyden kaçılabilir ya da vurarak yok edilebilir.

Bütün timsahlar kurtarılınca o dünyanın canavarının devi gelir: 3 canı vardır, kaplanın 3 canı biterse
o da baştan başlar. Her boss'un kendi hamleleri vardır: ağaç elma atar ve köküyle döner, akrep sokar,
kıskaçlarıyla atılır ve göbek saldırısı yapar, ayılar pençe atar (kutup ayısı kartopu, korsan ayı bal
atar), fare kuyruğuyla döner ve ısırır, lav canavarı dev ateş topu atar ve yakan kollarıyla döner.
Dönen kök ve kuyruk yakalayıp fırlatır; üstünden zıplanarak kurtulunur. Bölüm ilerledikçe kafes ve kuş sayısı artar, kuşlar hızlanır. Anahtarlar basamaklı kulelerin, spiral
merdivenlerin ve uçan taşların tepesindedir; dağlara zıplayarak çıkılır. Küreler kırılmaz.

Oyun Ana Sayfa köyünde başlar. Her dünyanın yanında adı yazan bir tabela ve kendi girişi vardır: ağaç kovuğu
(orman), dev akrebin ağzı (çöl), buz mağarası (Kar Vadisi), minik volkan (Cehennem Köyü), minik ev (Dev ev), kıyıdaki
küçük gemi (Korsanlar gemisi), su
dolu kuyu (Deniz dibi zindanı), sonu su olan mağara (Zorlu Sörf) ve köstebek deliği (Yer Dibi Şehri). Bitirilen dünyaya
yeniden girince zor seviyesi oynanır. Sürpriz Kapısı ise her seferinde yeni, kendi renkleri ve bitkisiyle
üretilmiş bir dünyaya açılır; her bitirişte hızlanır, boss'un canı ve canavar çeşidi artar. Bölüm bitince kaplan Ana Sayfa'ya döner; Esc menüsünden de dönülür.

## Oynamak

`index.html` dosyasına çift tıklayın. Kurulum gerekmez, tarayıcının WebGL2 desteklemesi yeterlidir.

Oyun kendini tarayıcıya kaydeder ve kapatınca kaldığı yerden devam eder; kuşlar baştan başlar. Kayıt
o tarayıcıya ve açılan adrese özeldir.

- **W A S D / oklar:** yürü
- **Boşluk:** zıpla; kuşun üstüne zıplarsan onu yenersin
- **Boşluk'u basılı tut:** kanat aldıysan uç; her kanat 10 saniye uçurur, süre yalnızca uçarken azalır
- **F / tıkla:** dönerek vur; yakındaki kuşları yener
- **Q:** yön tuşuyla birlikte hızlı koş; tek başına basınca kaplan olduğu yerde koşar
- **Fareyi oynat:** kamerayı çevir
- **Esc:** oyunu durdur, fareyi geri al; devam etmek için tıkla, baştan başlamak için düğmeye bas
- **Fare tekerleği:** yakınlaş, uzaklaş
- **M:** sesi aç, kapat
- **O (hile):** en yakındaki anahtarı veya kanadı alır, anahtar varsa kafesi açar
- **Shift+O (hile):** boss'u geçer
- **Home:** ekran düğmelerini aç, kapat

Fare olmayan cihazlarda ekran düğmeleri kendiliğinden görünür; farenin de olduğu cihazlarda ekrana ilk dokunuşta açılır. Soldaki oklar yürütür, sağdaki düğmeler zıplatır, vurur ve hızlı koşturur; parmağı ekranda kaydırmak kamerayı çevirir. ⏸️ oyunu durdurur.

## Kod

- `js/renderer.js`: küreleri Three.js ile çizer
- `js/world.js`: adayı üretir; dünya 25 cm'lik bir ızgaradır
- `js/landmarks.js`: elle tasarlanmış yerler: dev ev ve korsan gemisi
- `js/models.js`: kaplan, timsah, kuş, anahtar ve kafes
- `js/crossing.js`: bölümler arası geçiş animasyonu; kaplan dünyasına göre yüzer, kayar ya da uçar
- `js/monsters.js`: her dünyanın yürüyen canavarları ve ateş topları
- `js/boss.js`: bölüm sonu boss'ları ve hamleleri
- `js/surf.js`: sörf bölümü ve balina
- `js/home.js`: Ana Sayfa köyü; girişler ve isim yazıları
- `js/audio.js`: ses efektleri ve dünyaların müzikleri; hepsi kodla üretilir, ses dosyası yoktur
- `js/touch.js`: fare olmadan oynamak için ekran düğmeleri
- `js/game.js`: oyun kuralları, kontroller ve ekran
- `js/utils.js`: küçük yardımcı fonksiyonlar
- `vendor/three.min.js`: Three.js 0.187.0, çift tıkla çalışsın diye esbuild ile tek dosyada paketlenmiş hâli (`export * from 'three'`, `--bundle --minify --format=iife --global-name=THREE`)
