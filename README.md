# Kaplan Macerası · Tiger Adventure

**Türkçe** · [English](#english)

Bu oyun çocuklarımın oyunu. Ben yalnızca ufak tefek yardım ettim.

Oyunu "vibe coding" ile yaptık: Çocuklar ne istediklerini çoğu zaman Claude Code'a kendileri söyledi, kodu da Claude Opus 5.5 yazdı. Dünyalara adlarını onlar verdi, neyin eğlenceli olup neyin olmadığına onlar karar verdi. Her yeni hâlini oynayıp bozuk yerleri de çoğu zaman onlar yakaladı. Mesela canavarın çok üstünde uçarken bile ona hasar verilebildiğini onlar fark etti.

Oyunda her şey kürelerden yapılmış: kaplan da, ağaçlar da, dağlar da.

## Hikâye

Kötü kuşlar timsahları kafeslere kapatmış! Kaplan anahtarları bulup kafesleri açıyor, timsahları tek tek kurtarıyor. Hepsi kurtulunca da o dünyanın dev canavarı çıkıp geliyor.

## Dünyalar

Oyun, Ana Sayfa köyünde başlıyor. Her dünyaya köydeki kendi girişinden gidiliyor:

- **Canlı Ağaçlar Ormanı:** Ağaçlar yürüyor, yerden ilerleyen kökleri de kaplanı bir an yakalıyor.
- **Akrepler Çölü:** Akreplerin attığı zehir kaplanı yavaşlatıyor.
- **Kar Vadisi:** Kutup ayıları karınlarının üstünde kayarak saldırıyor.
- **Cehennem Köyü:** Lav canavarları ateş topu atıyor.
- **Dev ev:** Fareler sürüyle dolaşıyor. Üst kata ancak kanatla çıkılıyor.
- **Korsanlar gemisi:** Korsan ayılar yapış yapış bal fırlatıyor. Kaptan kuş da iki vuruşta yeniliyor.
- **Deniz dibi zindanı:** Köpekbalıklarının yalnızca yüzgeci görünüyor, yaklaşınca ısırmak için fırlıyorlar.
- **Zorlu Sörf:** Üç şeritte kayalardan ve yunuslardan kaçtıktan sonra sıra dev balinadan kaçmaya geliyor.
- **Yer Dibi Şehri:** Haritası olmayan, yolları her girişte değişen kocaman bir labirent. Köstebekler ve zırhlı karıncalar burada yaşıyor.
- **Magma Tabakası:** Köstebeklerin şehrinin de altında, lav gölleri arasında. Yeraltı gemileri kayaların içinde yüzüyor, yalnızca periskopları görünüyor. Uzaktan ateş topu atıyor, yaklaşınca fırlayıp çarpıyorlar. Sonunda Dünyanın Çekirdeği geliyor.
- **Bulutlar:** Elektrikli bulutlar dokununca çarpıyor, uzaktan da yıldırım atıyor. Kasırga, adanın üstünde güneş şeklinde dev bir bulutta yaşıyor.
- **Sürpriz Kapısı:** Her seferinde yepyeni bir dünyaya açılıyor. Her bitirişte oyun biraz daha zorlaşıyor.

Her dünyada haritada görünmeyen bir de sürpriz var: Taştan taşa zıplayarak çıkılan minik bir kulübe.

## Nasıl oynanır?

`index.html` dosyasına çift tıklamanız yeterli, bir şey kurmanıza gerek yok. Tarayıcının WebGL2 desteklemesi yetiyor. Oyun kaldığınız yeri tarayıcıya kaydediyor.

| Tuş | Ne işe yarar? |
| --- | --- |
| W A S D / oklar | Yürür |
| Boşluk | Zıplar; kuşun üstüne zıplayınca kuş yenilir |
| Boşluk'a basılı tutmak | Kanat aldıysanız uçar |
| F / tıklama | Dönerek vurur |
| Q | Hızlı koşar; tek başına basılınca kaplan olduğu yerde koşar |
| Fare | Kamerayı çevirir; tekerlek yakınlaştırıp uzaklaştırır |
| M | Sesi açar, kapatır |
| Esc | Oyunu durdurur |
| Home | Ekran düğmelerini açar, kapatır |
| O (hile) | En yakındaki anahtarı veya kanadı alır; anahtarınız varsa kafesi açar |
| Shift+O (hile) | Bölüm sonu canavarını geçer |

Fare olmayan cihazlarda ekran düğmeleri kendiliğinden çıkıyor. Farenin de olduğu cihazlarda ise ekrana ilk dokunuşta açılıyor.

## Kod

Düz JavaScript ve [Three.js](https://threejs.org) kullanıldı, derlemeye gerek yok. Ses dosyası da yok; bütün sesleri ve müzikleri kod üretiyor.

- `js/renderer.js`: Küreleri Three.js ile çizer.
- `js/world.js`: Adayı üretir. Dünya, 25 cm'lik bir ızgaradan oluşur.
- `js/landmarks.js`: Elle tasarlanan yerler burada.
- `js/models.js`: Kaplan, timsah, kuş, anahtar ve kafes.
- `js/crossing.js`: Bölümler arasındaki geçiş animasyonu.
- `js/monsters.js`: Dünyaların canavarları ve fırlattıkları.
- `js/boss.js`: Bölüm sonu canavarları ve hamleleri.
- `js/surf.js`: Sörf bölümü ve balina.
- `js/home.js`: Ana Sayfa köyü.
- `js/audio.js`: Ses efektleri ve müzikler.
- `js/touch.js`: Fare olmadan oynamak için ekran düğmeleri.
- `js/game.js`: Oyunun kuralları, kontroller ve ekran.
- `js/utils.js`: Küçük yardımcı fonksiyonlar.
- `vendor/three.min.js`: Three.js 0.187.0. Çift tıklayınca çalışsın diye esbuild ile tek dosyada paketlendi (`export * from 'three'`, `--bundle --minify --format=iife --global-name=THREE`).

---

<a id="english"></a>

# English

[Türkçe](#kaplan-macerası--tiger-adventure) · **English**

This is my kids' game. I only helped out a little.

We vibe-coded it: most of the time the kids told Claude Code what they wanted themselves, and Claude Opus 5.5 wrote the code. They named the worlds and decided what was fun. They played each new version and often caught what was broken, like being able to hurt a monster while flying high above its head.

Everything in the game is made of spheres: the tiger, the trees, even the mountains.

## The story

Evil birds have locked the crocodiles in cages! The tiger finds the keys, opens the cages and rescues the crocodiles. Once they are all free, the world's giant monster arrives.

## The worlds

The game starts in the home village, where each world has its own entrance. The in-game names are Turkish:

- **Canlı Ağaçlar Ormanı (Forest of Living Trees):** the roots of walking trees hold the tiger for a moment
- **Akrepler Çölü (Scorpion Desert):** scorpions throw slowing poison
- **Kar Vadisi (Snow Valley):** polar bears slide on their bellies
- **Cehennem Köyü (Hell Village):** lava monsters throw fireballs
- **Dev ev (Giant House):** rats roam in swarms; wings take you upstairs
- **Korsanlar gemisi (Pirate Ship):** pirate bears throw sticky honey; the captain bird takes two hits
- **Deniz dibi zindanı (Deep Sea Dungeon):** you only see the sharks' fins until they lunge
- **Zorlu Sörf (Tough Surf):** dodge rocks and dolphins across three lanes, then escape a giant whale
- **Yer Dibi Şehri (Underground City):** a maze with no map whose paths change on every visit, home to moles and armoured ants
- **Magma Tabakası (Magma Layer):** below the moles' city, among lava lakes; underground ships sail through the rock with only their periscopes showing, throw fireballs from afar and burst up to ram, and the Earth's core itself is the boss
- **Bulutlar (The Clouds):** electric clouds shock on touch and throw lightning, and a tornado lives in a giant sun-shaped cloud above the island
- **Sürpriz Kapısı (Surprise Door):** generates a new world every time, and the game gets harder with each one you finish

Every world also hides a bonus that isn't on the map: a tiny hut you reach by jumping from stone to stone.

## Playing

Double-click `index.html`. There is nothing to install; the browser only needs WebGL2. The game's text is in Turkish. It saves itself in the browser.

| Key | What it does |
| --- | --- |
| W A S D / arrows | Walk |
| Space | Jump; landing on a bird defeats it |
| Hold Space | Fly, if you have wings |
| F / click | Spin attack |
| Q | Run; on its own, the tiger runs on the spot |
| Mouse | Look around; the wheel zooms |
| M | Sound on or off |
| Esc | Pause |
| Home | Show or hide the on-screen buttons |
| O (cheat) | Takes the nearest key or wing, and opens a cage if you hold a key |
| Shift+O (cheat) | Skips the boss |

On-screen buttons appear by themselves on devices without a mouse. On devices that also have a mouse, they appear at the first touch.

## The code

Plain JavaScript and [Three.js](https://threejs.org), with no build step. Sounds and music are generated by code rather than loaded from files. The list of files is in the [Turkish section](#kod).
