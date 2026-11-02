# Kaplan Macerası · Tiger Adventure

**Türkçe** · [English](#english)

Bu oyunu çocuklarım hayal etti, ben de onlara yardım ettim.

Her şeyi kürelerden yapılmış, üç boyutlu bir macera oyunu. Birlikte "vibe coding" yaptık: çocuklarım ne istediklerini anlattı, ben de bunu Claude Code'a aktardım, kodu Claude Opus 5.5 modeli yazdı. Dünyaların adlarını onlar koydu, neyin eğlenceli olduğuna onlar karar verdi. Yeni sürümleri onlar oynadı ve birçok hatayı onlar buldu. Bir canavarın tepesinde uçarken ona hasar vermek gibi.

## Hikâye

Kötü kuşlar timsahları kafeslere kilitledi! Kaplan anahtarları bulur, kafesleri açar ve timsahları kurtarır. Bütün timsahlar kurtulunca o dünyanın dev canavarı gelir.

## Dünyalar

Oyun Ana Sayfa köyünde başlar. Her dünyanın kendi girişi vardır:

- **Canlı Ağaçlar Ormanı:** yürüyen ağaçların kökleri kaplanı bir an tutar
- **Akrepler Çölü:** akrepler yavaşlatan zehir atar
- **Kar Vadisi:** kutup ayıları karınları üstünde kayar
- **Cehennem Köyü:** lav canavarları ateş topu atar
- **Dev ev:** fareler sürüyle gezer; üst kata kanatla çıkılır
- **Korsanlar gemisi:** korsan ayılar yapıştıran bal atar; kaptan kuşa iki kez vurmak gerekir
- **Deniz dibi zindanı:** köpekbalıklarının yalnızca yüzgeci görünür, yakına gelince fırlar
- **Zorlu Sörf:** üç şeritte kayalardan ve yunuslardan kaçılır, sonunda dev balinadan kaçılır
- **Yer Dibi Şehri:** her girişte yolları değişen, haritasız bir labirent; köstebekler ve zırhlı karıncalar yaşar
- **Sürpriz Kapısı:** her seferinde yeni bir dünya üretir; her bitirişte oyun zorlaşır

Her dünyada haritada görünmeyen gizli bir bonus da vardır: taştan taşa zıplayarak çıkılan minik bir kulübe.

## Oynamak

`index.html` dosyasına çift tıklamak yeter. Kurulum gerekmez, tarayıcının WebGL2 desteklemesi yeterlidir. Oyundaki yazılar Türkçedir. Oyun kendini tarayıcıya kaydeder.

| Tuş | Ne yapar |
| --- | --- |
| W A S D / oklar | Yürü |
| Boşluk | Zıpla; kuşun üstüne zıplarsan onu yenersin |
| Boşluk'u basılı tut | Kanat aldıysan uç |
| F / tıkla | Dönerek vur |
| Q | Hızlı koş; tek başına basınca kaplan olduğu yerde koşar |
| Fare | Etrafına bak; tekerlek yakınlaştırır |
| M | Sesi aç, kapat |
| Esc | Oyunu durdur |
| Home | Ekran düğmelerini aç, kapat |
| O (hile) | En yakındaki anahtarı veya kanadı alır, anahtar varsa kafesi açar |
| Shift+O (hile) | Boss'u geçer |

Fare olmayan cihazlarda ekran düğmeleri kendiliğinden görünür; farenin de olduğu cihazlarda ekrana ilk dokunuşta açılır.

## Kod

Düz JavaScript ve [Three.js](https://threejs.org). Derleme adımı yoktur; sesler ve müzikler de dosyadan değil, koddan üretilir.

- `js/renderer.js`: küreleri Three.js ile çizer
- `js/world.js`: adayı üretir; dünya 25 cm'lik bir ızgaradır
- `js/landmarks.js`: elle tasarlanmış yerler
- `js/models.js`: kaplan, timsah, kuş, anahtar ve kafes
- `js/crossing.js`: bölümler arası geçiş animasyonu
- `js/monsters.js`: her dünyanın canavarları ve attıkları
- `js/boss.js`: bölüm sonu canavarları ve hamleleri
- `js/surf.js`: sörf bölümü ve balina
- `js/home.js`: Ana Sayfa köyü
- `js/audio.js`: ses efektleri ve müzikler
- `js/touch.js`: fare olmadan oynamak için ekran düğmeleri
- `js/game.js`: oyun kuralları, kontroller ve ekran
- `js/utils.js`: küçük yardımcı fonksiyonlar
- `vendor/three.min.js`: Three.js 0.187.0, çift tıkla çalışsın diye esbuild ile tek dosyada paketlenmiş hâli (`export * from 'three'`, `--bundle --minify --format=iife --global-name=THREE`)

---

<a id="english"></a>

# English

[Türkçe](#kaplan-macerası--tiger-adventure) · **English**

My kids dreamed this game up, and I helped them.

It's a 3D adventure game where everything is made of spheres. We vibe-coded it together: the kids described what they wanted, I passed it on to Claude Code, and the Claude Opus 5.5 model wrote the code. They named the worlds and decided what was fun. They played the new versions and found many of the bugs, like hurting a monster while flying high above its head.

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
