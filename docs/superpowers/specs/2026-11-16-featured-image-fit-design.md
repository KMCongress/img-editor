# Kiemelt kép igazítása a hírkártya arányához — WordPress-bővítmény

Dátum: 2026-11-16 · Repó: `KMCongress/img-editor` (privát) · Munkakönyvtár: `/server/www/kmcongress.com/img-editor`

## Szándék

Két WordPress-oldal (https://msotke.hu, https://pathology.hu) főoldali hírlistája a hír kiemelt képét **fix arányban** mutatja. A kezelő jellemzően kívülről kapott képeket (logókat, plakátokat) tesz be, amelyek aránya teljesen más. A téma ilyenkor középről vág, és az eredmény **csak élesítés után** derül ki.

Konkrét eset (msotke, 2026-11): a kapott kép egy 400×400-as négyzetes egyetemi logó volt (`szegyor-logo.png`). A téma `loop-thumbnail` mérete 300×150-re vágta, így a felső ív és a „SZÉCHENYI EGYETEM” felirat nagy része eltűnt.

**A cél:** a kezelő a kiemelt kép kiválasztásakor lássa, mi lesz a főoldalon, és kapjon egy jó arányú képet, amelyből a téma már nem tud levágni semmit.

**Nem képszerkesztő kell.** Elég az átméretezés, és a kép kiegészítése egy jellemző színnel a cél arányra (letterbox/pillarbox).

## Célok

- A kiemelt kép beállításakor egy előnézet mutatja a képet a cél arányú keretben, a kitöltő színnel együtt.
- A kitöltő színt az eszköz automatikusan választja: a kép széleinek leggyakoribb színét, ami logóknál a háttér.
- A kezelő belenyúlhat:
  - **szín:** felülírhatja színválasztóval;
  - **elhelyezés:** a képet a kereten belül mozgathatja és nagyíthatja/kicsinyítheti.
- Mentéskor a bővítmény elkészíti a cél arányú képet, és ez lesz a hír kiemelt képe.
- **Az eredeti kép megmarad** a médiatárban, az igazított kép új médiaelem lesz. *(Tervezői döntés: így semmi nem vész el, és később újra lehet igazítani.)*
- Egy bővítmény fut mindkét oldalon. Ami oldalanként eltér, azt beállítás adja.
- **Az igazított kép mindenhol a kiemelt kép** (főoldali lista, a hír saját oldala, megosztási előnézet). Ez a felhasználó döntése: nem kell listára korlátozott csere.

## Bevezetés

- **Pilot: msotke.hu.** Az első verzió itt élesedik.
- Ha beválik, **a pathology.hu-ra** csak beállítással (cél arány, minimális méret) kerül át, kódváltozás nélkül. Ezért a bővítmény a msotke-n sem tartalmazhat msotke-specifikus feltételezést.

## Nem cél (egyelőre)

- Kivágás (crop) — a felhasználó kifejezetten nem kéri most.
- Bármilyen további szerkesztés: szöveg, szűrők, forgatás.
- A cím által takart sáv kezelése a msotke-n. Felmerült, de elvetettük: mobil nézetben a cím a kép alatt van, nincs takarás.
- Önálló, WordPress nélküli verzió. Rögtön bővítmény készül, és szükség szerint fejlesztjük tovább.
- Tömeges utólagos átalakítás a meglévő hírekre.

## Anti-célok (ha ez történik, a funkció kudarc akkor is, ha „működik”)

- A kép torzul, vagy a téma a kész képből mégis levág valamit.
- A kezelő eredeti képe elveszik vagy felülíródik.
- Az előnézet mást mutat, mint ami a főoldalon megjelenik.
- A kezelőnek a megszokottnál több lépés kell, ha a kép eleve jó arányú. Ilyenkor az igazítás ne legyen útban.

## Mért tények a két oldalról (2026-11-16)

| | msotke.hu | pathology.hu |
|---|---|---|
| Téma | saját `msotke` téma | `hello-elementor` (+child), Elementor Pro |
| Hírkép a főoldalon | `loop-thumbnail` képméret, `<img width=300 height=150>`, **2:1** (WP hard crop) | Elementor Posts widget (`elementor-element-5f2d2f1`, oldal: 321), `padding-bottom: calc(0.66 * 100%)` → **kb. 3:2** (1 : 0,66), a kép a keretben középre igazítva kitölt/vágódik |
| Megjegyzés | a böngésző a 300×150-et a sávszélességre kicsinyíti (pl. 260×130) | a widget a `medium` képméretet használja; a kártya háttere fehér (`#ffffff`) |

A cél arány tehát oldalanként beállítás. Javasolt alapértékek: msotke **2:1**, pathology **100:66**. Telepítéskor ellenőrizni kell, mert a téma vagy a widget beállítása változhat.

## Felhasználói út

1. A kezelő a hír szerkesztésében megnyitja a kiemelt kép választót, és kiválaszt vagy feltölt egy képet. Ez a szokásos WordPress-folyamat.
2. Ha a kép aránya eltér a beállított cél aránytól, megjelenik az igazító felület, benne:
   - előnézet a cél arányú keretben;
   - a kép alapból teljes egészében látszik, középre igazítva;
   - a fennmaradó terület az automatikusan választott színnel van kitöltve;
   - színválasztó az automatikus színnel előtöltve;
   - a kép mozgatható (húzással) és méretezhető (csúszkával vagy görgővel);
   - egy „Alaphelyzet” gomb.
3. Mentés: új médiaelem jön létre a kész képből, és ez lesz a kiemelt kép.
4. A kezelő kihagyhatja az igazítást, és az eredeti képet állíthatja be, ahogy eddig.
5. Egy már beállított kiemelt képhez is elérhető az igazítás (a kiemelt kép panelen egy „Igazítás” gomb), így régebbi hírek képe is javítható egyenként. *(Tervezői döntés.)* Ha a kép egy korábbi igazítás eredménye, a felület az eredetiből és a mentett beállításokból (szín, pozíció, méret) indul.

### Mozgatás és méretezés szabályai *(tervezői döntés)*

- **A kép sosem lóghat ki a keretből** — a mozgatás a keret széleinél megáll. Így a mozgatás/méretezés nem tud vágni, ami összhangban van azzal, hogy kivágás nem cél.
- A méretezés tartománya: a legnagyobb, még teljesen beférő mérettől („kitölt”, ez az alapállapot) lefelé; nagyítás a beférő méret fölé nincs.
- Kicsinyítéskor a kép a kitöltő színen áll, szabadon mozgatható a kereten belül.

## Képszabályok

- **Nincs torzítás:** a kép mindig az eredeti arányában méreteződik.
- **A színválasztás alapja:** a kép keretének (szélső pixelsorainak) leggyakoribb színe, kvantálva. *(Tervezői döntés; a pontos algoritmus a fejlesztőre marad.)*
- **Átlátszó képek (PNG):** az átlátszó részek is a kitöltő színt kapják, mert a kész kép nem lehet átlátszó. Az automatikus színválasztás az átlátszó pixeleket figyelmen kívül hagyja; ha a kép kerete teljesen átlátszó, az alapszín fehér. *(Tervezői döntés.)*
- **A kimenet mérete** *(tervezői döntés)*:
  - a vászon a lehető legkisebb cél arányú téglalap, amelybe a kép **„kitölt” állapotban, a saját felbontásán** belefér, de legalább akkora, mint a beállított minimális méret (msotke: 300×150, különben a WordPress nem generálja le a téma képméretét);
  - ha a kép kisebb a minimumnál, „kitölt” állapotban felnagyítódik a keret méretére (egy apró logó kicsit elmosódhat, de nem marad egy bélyegnyi folt a közepén); a kezelő kicsinyítéssel visszaveheti;
  - a vászon mérete a kezelő méretezésétől nem függ: a kicsinyítés a képet kicsinyíti a fix vásznon belül;
  - az előnézet ugyanezt a vásznat mutatja arányosan lekicsinyítve, így előnézet és végeredmény egyezik.
- **Kimeneti formátum:** az eredetivel azonos típus (JPEG/PNG/WebP), átlátszóság nélkül. A fájlnév az eredetiből képzett, egyértelmű utótaggal.

## Beállítások (oldalanként, admin-felületen)

- Cél arány (szélesség : magasság).
- Minimális kimeneti méret.
- (Opcionális) Alapértelmezett kitöltő szín, ha az automatikus választás nem ad eredményt.

## Korlátok

- WordPress-bővítmény, amely mindkét oldalon fut. A két oldal témája eltér (saját téma, illetve Elementor). A bővítmény nem függhet egyik témától sem, csak a kiemelt kép szabványos mechanizmusától.
- **Csak a blokkszerkesztő (Gutenberg)** kell, a kezelő ebben dolgozik (a felhasználó szerint). A klasszikus szerkesztő nem cél.
- Hatókör: a `post` típus kiemelt képe. *(Tervezői döntés; más típus később beállításként jöhet.)*
- A repó: `KMCongress/img-editor`, privát.

## A fejlesztőre bízott döntések

- Hol történik a képfeldolgozás: böngészőben (canvas) vagy szerveren (GD/Imagick). A követelmény csak az, hogy az előnézet és a végeredmény pixelre egyezzen.
- Az igazító UI pontos elhelyezése és kinézete a szerkesztőben (modal, oldalsáv-panel stb.).
- A kész médiaelem és az eredeti kapcsolatának tárolása (pl. post meta), ha később újra akarjuk szerkeszteni.
- A színkvantálás és a szélső pixelsáv szélessége.
- Tesztelési stratégia és fejlesztői környezet (pl. wp-env / Docker).
