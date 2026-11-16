# Kiemelt kép igazítása — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** WordPress-bővítmény, amely a Gutenberg kiemelt kép panelén a választott képet a beállított cél arányú vászonra igazítja (átméretezés + jellemző színnel kitöltés), új médiaelemként menti, és kiemelt képnek állítja.

**Architecture:** A képfeldolgozás teljesen a böngészőben, `<canvas>`-on fut, így az előnézet és a mentett kép ugyanabból a renderelőből jön (pixel-egyezés). A tiszta logika (vászonméret, illesztés, határolás, színválasztás) DOM-mentes JS modulokban van, jest-tel tesztelve. A PHP-oldal vékony: beállítási oldal, attachment-meta regisztráció, script betöltése a beállításokkal.

**Tech Stack:** WordPress 6.x (Gutenberg), PHP ≥ 7.4 (a bővítmény kódja; a fejlesztői gépen 8.5), `@wordpress/scripts` (build + jest), `@wordpress/components`, `@wordpress/hooks`, `@wordpress/api-fetch`, `@wordpress/data`, PHPUnit 11 (csak a tiszta PHP-osztályokra). Kiadás: GitHub Actions → release asset zip (publikus repó).

**Spec:** `docs/superpowers/specs/2026-11-16-featured-image-fit-design.md`

## Global Constraints

- Bővítmény slug / könyvtár: `kmc-featured-image-fit`; PHP prefix `KMC_FIF_`, JS namespace `kmc-fif`, text domain `kmc-fif`. Felület nyelve: magyar.
- Csak blokkszerkesztő (Gutenberg); klasszikus szerkesztő nem cél. Csak `post` típus.
- Nincs torzítás; a kép sosem lóg ki a vászonból; nagyítás a „kitölt” méret fölé nincs.
- Az eredeti médiaelem sosem íródik felül; az igazított kép új attachment.
- Az igazított kép mindenhol a kiemelt kép (`featured_media`).
- Kimenet: az eredetivel azonos MIME (`image/jpeg`, `image/png`, `image/webp`; minden más → `image/png`), átlátszóság nélkül; JPEG/WebP minőség 0.92; fájlnév `<eredeti-alapnév>-igazitott.<ext>`.
- Oldalanként beállítható: cél arány (`ratio_w`, `ratio_h`), minimális kimeneti szélesség (`min_width`), alapértelmezett szín (`default_color`). Alapértékek: `2`, `1`, `300`, `#ffffff` (msotke pilot). Pathology később: `100`, `66`.
- Semmi msotke- vagy témaspecifikus feltételezés a kódban.
- Nincs Docker a fejlesztői gépen — a kézi ellenőrzés helyi WordPresszel, `php -S`-sel és a meglévő MySQL-lel megy (7. feladat).

## Review Focus

1. **Már jó arányú kép** — a felület ne ugorjon fel magától (tűrés: 1 % relatív arányeltérés), de az „Igazítás” gomb elérhető. → 6. feladat, `does not auto-open when ratio already matches`.
2. **Teljesen átlátszó szélű PNG** (tipikus logó) — a színválasztás `null`-t ad, a `default_color` lép életbe, nem fekete. → 3. feladat, `returns null when every edge pixel is transparent` + 4. feladat, `fills background before drawing`.
3. **Már igazított kép újraigazítása** — az eredetiből és a mentett paraméterekből induljon, ne az igazított képet igazítsa újra (különben a kitöltés halmozódik). → 5. és 6. feladat, `resolveSource follows _kmc_fif_source`.
4. **Nagyon nagy kép** (pl. 2560 px-es `-scaled` fotó) — a vászon szélessége legfeljebb `MAX_CANVAS_WIDTH = 2560`, arányosan kicsinyítve. → 2. feladat, `caps canvas width at 2560`.
5. **A minimumnál kisebb kép** (100×100 logó, min 300 széles 2:1) — a vászon 300×150, a kép „kitölt” állapotban 150×150-re nagyítva. → 2. feladat, `upscales small image to the minimum canvas`.

---

## Fájlszerkezet

```
kmc-featured-image-fit/            ← a repó gyökere = a bővítmény könyvtára
  kmc-featured-image-fit.php       bootstrap: hookok bekötése
  includes/class-settings.php      KMC_FIF_Settings — alapértékek, sanitize, beállítási oldal
  includes/class-plugin.php        KMC_FIF_Plugin — meta regisztráció, script enqueue
  src/geometry.js                  vászonméret, kitölt-skála, határolás, arány-egyezés
  src/color.js                     szélső pixelek domináns színe
  src/render.js                    rajzolás canvas-ra + blob export, MIME/fájlnév
  src/media.js                     feltöltés + meta, forrás feloldása (REST)
  src/AdjustModal.js               a modal UI (előnézet, szín, méret, mozgatás)
  src/index.js                     editor.PostFeaturedImage filter, automatikus megnyitás
  tests/php/SettingsTest.php
  src/__tests__/*.test.js
  package.json, composer.json, phpunit.xml.dist, .gitignore, README.md
```

A repó gyökere maga a bővítmény (a `build/` gitignore-olt; a telepítő zip a `npm run plugin-zip` kimenete).

---

### Task 1: Bővítményváz, beállítások, meta

**Files:**
- Create: `readme.txt`, `kmc-featured-image-fit.php`, `includes/class-settings.php`, `includes/class-plugin.php`, `package.json`, `composer.json`, `phpunit.xml.dist`, `.gitignore`, `tests/php/bootstrap.php`, `tests/php/SettingsTest.php`, `src/index.js` (üres belépési pont, a 6. feladat tölti meg)

**Interfaces:**
- Produces:
  - `KMC_FIF_Settings::OPTION = 'kmc_fif_settings'`
  - `KMC_FIF_Settings::defaults(): array` → `['ratio_w'=>2,'ratio_h'=>1,'min_width'=>300,'default_color'=>'#ffffff']`
  - `KMC_FIF_Settings::sanitize($input): array` — tiszta függvény, WP nélkül tesztelhető
  - `KMC_FIF_Settings::get(): array` — `get_option` + defaults merge
  - Post meta az `attachment` típuson, `show_in_rest: true`, `single: true`:
    - `_kmc_fif_source` (`integer`) — az eredeti attachment ID
    - `_kmc_fif_params` (`object`, schema: `scale` number, `x` number, `y` number, `color` string)
    - A `_` prefix miatt `auth_callback` kell: `current_user_can('upload_files')`.
  - JS globál: `window.kmcFifSettings = { ratioW, ratioH, minWidth, defaultColor }` (`wp_add_inline_script` before), csak `post` szerkesztésekor (`enqueue_block_editor_assets` + `get_current_screen()->post_type === 'post'`).
  - Script handle: `kmc-fif-editor`, a `build/index.js` + `build/index.asset.php` alapján.

- [ ] **Step 1: Toolchain** (a plugin headerben `Version: 0.0.0-dev`; mellé WP-formátumú `readme.txt` `Stable tag: 0.0.0-dev`-vel — a 8. feladat írja át kiadáskor)
  `package.json`: devDependency `@wordpress/scripts`, scriptek `build`, `start`, `test` (`wp-scripts test-unit-js`), `plugin-zip`; `files` mező a zip tartalmához (`kmc-featured-image-fit.php`, `includes`, `build`). `composer.json`: dev `phpunit/phpunit ^11.5`. `.gitignore`: `node_modules/ vendor/ build/ *.zip`. Run: `npm install && composer install` → hibátlan.

- [ ] **Step 2: Írd meg a bukó tesztet** — `tests/php/SettingsTest.php` (a bootstrap `define('ABSPATH', __DIR__)`-t és `sanitize_hex_color` polyfillt ad, ha nincs WP):

```php
public function testDefaultsWhenEmpty(): void {
    self::assertSame(KMC_FIF_Settings::defaults(), KMC_FIF_Settings::sanitize([]));
}
public function testKeepsValidValues(): void {
    $in = ['ratio_w'=>'100','ratio_h'=>'66','min_width'=>'400','default_color'=>'#ABCDEF'];
    self::assertSame(['ratio_w'=>100,'ratio_h'=>66,'min_width'=>400,'default_color'=>'#abcdef'],
        KMC_FIF_Settings::sanitize($in));
}
#[DataProvider('invalid')]
public function testInvalidFallsBackPerField(array $in, string $key): void {
    self::assertSame(KMC_FIF_Settings::defaults()[$key], KMC_FIF_Settings::sanitize($in)[$key]);
}
public static function invalid(): array { return [
    [['ratio_w'=>'0'], 'ratio_w'], [['ratio_h'=>'-3'], 'ratio_h'],
    [['min_width'=>'abc'], 'min_width'], [['min_width'=>'5000'], 'min_width'],
    [['default_color'=>'red'], 'default_color'],
]; }
```
  Szabályok: `ratio_*` egész 1..1000; `min_width` egész 50..2560; szín `#rrggbb`, kisbetűsítve.

- [ ] **Step 3: Futtasd, bukjon** — `vendor/bin/phpunit` → FAIL (`Class "KMC_FIF_Settings" not found`).

- [ ] **Step 4: Implementáld** a `KMC_FIF_Settings`-et (beleértve a `Beállítások › Kiemelt kép igazítása` oldalt a Settings API-val: négy mező, `register_setting` a `sanitize` callbackkel), a `KMC_FIF_Plugin`-t (meta + enqueue) és a bootstrap fájlt (plugin header: `Plugin Name: Kiemelt kép igazítása`, `Requires at least: 6.4`, `Requires PHP: 7.4`).

- [ ] **Step 5: Futtasd** — `vendor/bin/phpunit` → PASS; `php -l` minden PHP fájlra tiszta; `npm run build` → létrejön `build/index.js` és `build/index.asset.php`.

- [ ] **Step 6: Commit** — `git commit -m "feat: bővítményváz, beállítások és attachment-meta"`

---

### Task 2: Geometria

**Files:**
- Create: `src/geometry.js`, `src/__tests__/geometry.test.js`

**Interfaces:**
- Produces (minden szám pixel, a vászon koordinátarendszerében; bal felső sarok = 0,0):
  - `MAX_CANVAS_WIDTH = 2560`
  - `canvasSize({width, height}, {ratioW, ratioH, minWidth}) → {width, height}` — a legkisebb cél arányú téglalap, amibe a kép natív méretben belefér; szélessége ≥ `minWidth`, ≤ `MAX_CANVAS_WIDTH`; `height = Math.round(width * ratioH / ratioW)`; egészekre kerekítve.
  - `fitScale(image, canvas) → number` — `Math.min(canvas.width/image.width, canvas.height/image.height)` (a „kitölt” állapot skálája; lehet > 1 kis képnél).
  - `drawRect(image, canvas, {scale, x, y}) → {x, y, width, height}` — `scale` a kitölt-skálához viszonyított szorzó, `(0, 1]`; a rajzolt méret `image * fitScale * scale`.
  - `clampState(image, canvas, {scale, x, y}) → {scale, x, y}` — `scale` a `[MIN_SCALE=0.1, 1]` sávba; `x ∈ [0, canvas.width − w]`, `y ∈ [0, canvas.height − h]`.
  - `initialState(image, canvas) → {scale: 1, x, y}` — középre.
  - `ratioMatches(image, {ratioW, ratioH}, tolerance = 0.01) → boolean` — relatív eltérés `|img/target − 1| ≤ tolerance`.

- [ ] **Step 1: Bukó tesztek**

```js
const cfg = { ratioW: 2, ratioH: 1, minWidth: 300 };
test('square logo gets pillarboxed canvas', () =>
  expect(canvasSize({width:400,height:400}, cfg)).toEqual({width:800,height:400}));
test('wide image keeps its width', () =>
  expect(canvasSize({width:1000,height:200}, cfg)).toEqual({width:1000,height:500}));
test('upscales small image to the minimum canvas', () => {
  const c = canvasSize({width:100,height:100}, cfg);
  expect(c).toEqual({width:300,height:150});
  expect(fitScale({width:100,height:100}, c)).toBe(1.5);
});
test('caps canvas width at 2560', () =>
  expect(canvasSize({width:2560,height:2560}, cfg)).toEqual({width:2560,height:1280}));
test('pathology ratio 100:66', () =>
  expect(canvasSize({width:400,height:400}, {ratioW:100,ratioH:66,minWidth:300}))
    .toEqual({width:606,height:400}));
test('initial state is centred and fully visible', () =>
  expect(drawRect({width:400,height:400},{width:800,height:400}, initialState({width:400,height:400},{width:800,height:400})))
    .toEqual({x:200,y:0,width:400,height:400}));
test('clamp keeps image inside canvas', () => {
  const img={width:400,height:400}, c={width:800,height:400};
  expect(clampState(img,c,{scale:1,x:-50,y:30})).toEqual({scale:1,x:0,y:0});
  expect(clampState(img,c,{scale:2,x:0,y:0}).scale).toBe(1);
  expect(clampState(img,c,{scale:0.5,x:700,y:300})).toEqual({scale:0.5,x:600,y:200});
});
test('ratioMatches within 1 %', () => {
  expect(ratioMatches({width:300,height:150}, cfg)).toBe(true);
  expect(ratioMatches({width:303,height:150}, cfg)).toBe(true);
  expect(ratioMatches({width:400,height:400}, cfg)).toBe(false);
});
```
  Algoritmus (rögzített, a tesztek ebből jönnek):
  ```
  W = max(image.width, round(image.height * ratioW / ratioH), minWidth)
  H = round(W * ratioH / ratioW)
  while H < image.height and W < MAX_CANVAS_WIDTH: W++, H = round(W * ratioH / ratioW)
  if W > MAX_CANVAS_WIDTH: W = MAX_CANVAS_WIDTH, H = round(W * ratioH / ratioW)
  ```
  (400×400 @ 100:66: `round(606.06)=606`, `round(399.96)=400` → 606×400. A cap után a kép a `fitScale`-lel kicsinyül: 2560×2560 @ 2:1 → 2560×1280, `fitScale = 0.5`.)

- [ ] **Step 2: Futtasd, bukjon** — `npm test -- geometry` → FAIL.
- [ ] **Step 3: Implementáld** a fenti függvényeket `src/geometry.js`-ben (named exportok, tiszta függvények).
- [ ] **Step 4: Futtasd** — `npm test -- geometry` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: vászonméret és illesztési geometria"`

---

### Task 3: Domináns szélszín

**Files:**
- Create: `src/color.js`, `src/__tests__/color.test.js`

**Interfaces:**
- Produces: `dominantEdgeColor(data: Uint8ClampedArray, width: number, height: number) → string | null` — `#rrggbb` vagy `null`, ha nincs átlátszatlan szélpixel.

Algoritmus (a spec a fejlesztőre bízta, itt rögzítjük):
```
band = max(1, round(min(width, height) * 0.02))
pixelek: x < band || x >= width-band || y < band || y >= height-band
kihagy: alpha < 128
vödör kulcs: (r>>4, g>>4, b>>4); számlál + r,g,b összeg vödrönként
győztes: legnagyobb darabszámú vödör; visszaadja a vödör átlagszínét hexben
```

- [ ] **Step 1: Bukó tesztek** (segéd: `img(w,h,fn)` ami `fn(x,y) → [r,g,b,a]`-ból ImageData-tömböt épít)

```js
test('white-bordered logo returns white', () =>
  expect(dominantEdgeColor(...img(50,50,(x,y)=> (x>10&&x<40&&y>10&&y<40)?[20,30,90,255]:[255,255,255,255]))).toBe('#ffffff'));
test('majority edge colour wins over minority', () =>
  expect(dominantEdgeColor(...img(100,10,(x)=> x<70?[0,23,115,255]:[255,255,255,255]))).toBe('#001773'));
test('returns null when every edge pixel is transparent', () =>
  expect(dominantEdgeColor(...img(20,20,()=>[0,0,0,0]))).toBeNull());
test('ignores semi-transparent pixels below alpha 128', () =>
  expect(dominantEdgeColor(...img(20,20,(x)=> x%2?[255,0,0,100]:[0,255,0,255]))).toBe('#00ff00'));
test('1x1 image works', () =>
  expect(dominantEdgeColor(...img(1,1,()=>[10,20,30,255]))).toBe('#0a141e'));
```
- [ ] **Step 2: Futtasd, bukjon** — `npm test -- color` → FAIL.
- [ ] **Step 3: Implementáld** `src/color.js`-ben.
- [ ] **Step 4: Futtasd** — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: a kép szélének domináns színe"`

---

### Task 4: Renderelés és export

**Files:**
- Create: `src/render.js`, `src/__tests__/render.test.js`

**Interfaces:**
- Consumes: `drawRect` (Task 2).
- Produces:
  - `renderTo(ctx: CanvasRenderingContext2D, image: CanvasImageSource & {width,height}, canvas: {width,height}, state: {scale,x,y,color}) → void` — `fillStyle=color; fillRect(0,0,W,H)`, majd `imageSmoothingQuality='high'; drawImage(image, r.x, r.y, r.width, r.height)`. Az előnézet és a mentés **ugyanezt** hívja (az előnézet CSS-sel kicsinyít, nem külön renderel).
  - `outputMime(sourceMime: string) → 'image/jpeg'|'image/png'|'image/webp'`
  - `outputFilename(sourceFilename: string, mime) → string` — `logo.png` → `logo-igazitott.png`; `kep.JPEG` → `kep-igazitott.jpg`; `x.gif` → `x-igazitott.png`.
  - `exportBlob(image, canvas, state, mime) → Promise<Blob>` — `document.createElement('canvas')` a teljes vászonmérettel, `renderTo`, `toBlob(mime, 0.92)`.
  - `loadImage(url: string) → Promise<HTMLImageElement>` — `crossOrigin='anonymous'`, `decode()`.

- [ ] **Step 1: Bukó tesztek** — mock ctx, ami a hívásokat rögzíti:

```js
test('fills background before drawing the image', () => {
  const calls=[]; const ctx=mockCtx(calls);
  renderTo(ctx, {width:400,height:400}, {width:800,height:400}, {scale:1,x:200,y:0,color:'#001773'});
  expect(calls).toEqual([
    ['fillStyle','#001773'], ['fillRect',0,0,800,400], ['drawImage',200,0,400,400],
  ]);
});
test.each([['image/png','image/png'],['image/jpeg','image/jpeg'],['image/webp','image/webp'],['image/gif','image/png']])
  ('outputMime %s', (i,o)=>expect(outputMime(i)).toBe(o));
test.each([['logo.png','image/png','logo-igazitott.png'],['kep.JPEG','image/jpeg','kep-igazitott.jpg'],['x.gif','image/png','x-igazitott.png']])
  ('outputFilename %s', (f,m,o)=>expect(outputFilename(f,m)).toBe(o));
```
  (A `mockCtx` a `drawImage` első, kép argumentumát elhagyja a rögzítésből; a `imageSmoothing*` setterek nem kerülnek a listába.)
- [ ] **Step 2–4:** fut-bukik / implementál / PASS (`npm test -- render`).
- [ ] **Step 5: Commit** — `git commit -m "feat: renderelés és export a vászonra"`

---

### Task 5: Médiaműveletek (REST)

**Files:**
- Create: `src/media.js`, `src/__tests__/media.test.js`

**Interfaces:**
- Consumes: `@wordpress/api-fetch`.
- Produces:
  - `resolveSource(attachment) → Promise<{source: Attachment, params: {scale,x,y,color}|null}>` — ha `attachment.meta._kmc_fif_source` > 0, lekéri `GET /wp/v2/media/<id>?context=edit`-tel, és a `params` az `attachment.meta._kmc_fif_params`; ha a forrás már nem létezik (404), az aktuális attachmentet adja `params: null`-lal. Különben `{source: attachment, params: null}`.
  - `uploadAdjusted(blob, filename, sourceId, params) → Promise<Attachment>` — `POST /wp/v2/media` FormData-val (`file`), majd `POST /wp/v2/media/<új id>` `{ meta: {_kmc_fif_source: sourceId, _kmc_fif_params: params}, alt_text: <forrás alt_text> }`.
  - Az `Attachment` a REST válasz: `{id, source_url, mime_type, media_details:{width,height}, meta, alt_text, title}`.

- [ ] **Step 1: Bukó tesztek** (`jest.mock('@wordpress/api-fetch')`):

```js
test('resolveSource follows _kmc_fif_source', async () => {
  apiFetch.mockResolvedValueOnce({id: 7, source_url:'/orig.png'});
  const r = await resolveSource({id: 9, meta:{_kmc_fif_source:7,_kmc_fif_params:{scale:.8,x:1,y:2,color:'#fff'}}});
  expect(apiFetch).toHaveBeenCalledWith({path:'/wp/v2/media/7?context=edit'});
  expect(r).toEqual({source:{id:7,source_url:'/orig.png'}, params:{scale:.8,x:1,y:2,color:'#fff'}});
});
test('resolveSource falls back when source deleted', async () => {
  apiFetch.mockRejectedValueOnce({code:'rest_post_invalid_id'});
  const a={id:9, meta:{_kmc_fif_source:7}};
  expect(await resolveSource(a)).toEqual({source:a, params:null});
});
test('plain attachment is its own source', async () =>
  expect(await resolveSource({id:5, meta:{}})).toEqual({source:{id:5,meta:{}}, params:null}));
test('uploadAdjusted uploads then writes meta', async () => { /* két hívás, a második path '/wp/v2/media/11', method POST, data.meta._kmc_fif_source === 7 */ });
```
- [ ] **Step 2–4:** fut-bukik / implementál / PASS (`npm test -- media`).
- [ ] **Step 5: Commit** — `git commit -m "feat: igazított kép feltöltése és forrás feloldása"`

---

### Task 6: Modal és szerkesztő-integráció

**Files:**
- Create: `src/AdjustModal.js`, `src/editor.css` (importálva az `index.js`-ből), `src/__tests__/integration.test.js`
- Modify: `src/index.js`
- Dev dependency: `@testing-library/react`

**Interfaces:**
- Consumes: Task 2–5 összes exportja; `window.kmcFifSettings`.
- Produces:
  - `<AdjustModal attachment={Attachment} settings={...} onDone={(newId)=>void} onClose={()=>void} />`
  - `shouldAutoOpen(attachment, settings) → boolean` — `!attachment.meta?._kmc_fif_source && !ratioMatches(...)` (exportálva a teszthez).
  - `addFilter('editor.PostFeaturedImage', 'kmc-fif/adjust', withAdjust)`

**A modal tartalma (felirat-szövegek rögzítve):**
- Cím: „Kiemelt kép igazítása”.
- Előnézet: a `renderTo` egy, a teljes vászonméretű `<canvas>`-ra rajzol, CSS-ben `max-width:100%`; alatta szürke felirat: „Így jelenik meg a hírlistában: {W}×{H} px, {ratioW}:{ratioH}”.
- Mozgatás: egérhúzás/érintés a canvason (Pointer Events), a delta a megjelenített→valós skálával szorozva, minden lépés `clampState`-en át.
- „Méret” `RangeControl` 10–100 % (`scale`), a középpont körül skáláz, majd `clampState`.
- „Háttérszín” `ColorPicker` (alfa nélkül), alapértéke `dominantEdgeColor(...) ?? settings.defaultColor`; mellette „Automatikus” gomb, ami visszaállítja.
- Gombok: „Alaphelyzet” (initialState + automatikus szín), „Mégse”, „Mentés és beállítás kiemelt képként” (primary; mentés közben `isBusy`, hibánál `Notice` a hibaszöveggel, a modal nyitva marad).
- A színt a `loadImage`-elt forrás egy legfeljebb 512 px-re kicsinyített segédvásznából olvassa (`getImageData`), ne a teljes képből.

**Integráció (`withAdjust`):**
- A `PostFeaturedImage` eredeti komponens alatt egy „Igazítás” gomb, ha van kiemelt kép.
- A `featured_media` változását (`useSelect(core/editor).getEditedPostAttribute('featured_media')`) figyeli; ha új ID jön és `shouldAutoOpen` igaz, magától megnyitja a modalt. A saját mentése után (`onDone`) ez nem nyílik újra (a meta miatt `shouldAutoOpen` hamis).
- `onDone(newId)` → `dispatch('core/editor').editPost({featured_media: newId})`.
- Újraigazításkor a `resolveSource` adja a forrást és a mentett paramétereket; a modal azokkal indul (clamp-elve).

- [ ] **Step 1: Bukó tesztek**

```js
const s={ratioW:2,ratioH:1,minWidth:300,defaultColor:'#ffffff'};
const att=(w,h,meta={})=>({id:1,media_details:{width:w,height:h},meta});
test('auto-opens for a square logo', ()=>expect(shouldAutoOpen(att(400,400),s)).toBe(true));
test('does not auto-open when ratio already matches', ()=>expect(shouldAutoOpen(att(600,300),s)).toBe(false));
test('does not auto-open for its own output', ()=>expect(shouldAutoOpen(att(800,400,{_kmc_fif_source:3}),s)).toBe(false));
test('modal shows target size line', async ()=>{
  // loadImage mockolva {width:400,height:400}; render → getByText('Így jelenik meg a hírlistában: 800×400 px, 2:1')
});
```
- [ ] **Step 2: Futtasd, bukjon** — `npm test -- integration` → FAIL.
- [ ] **Step 3: Implementáld** `AdjustModal.js`-t és `index.js`-t.
- [ ] **Step 4: Futtasd** — `npm test` (az összes) → PASS; `npm run build` → hibátlan.
- [ ] **Step 5: Commit** — `git commit -m "feat: igazító modal a kiemelt kép panelen"`

---

### Task 7: Kézi ellenőrzés helyi WordPressen + kiadás

**Files:**
- Create: `README.md` (telepítés, beállítás, msotke/pathology alapértékek, ismert korlátok), `bin/local-wp.sh`

- [ ] **Step 1: `bin/local-wp.sh`** — letölti a WordPresst a gitignore-olt `.wp/` alá (`curl https://wordpress.org/latest.tar.gz`), létrehozza a `kmc_fif_wp` adatbázist a meglévő MySQL-en (hozzáférés: env `WP_DB_USER`/`WP_DB_PASSWORD`/`WP_DB_HOST`), `wp-config.php`-t ír, a bővítményt szimlinkeli a `wp-content/plugins/kmc-featured-image-fit`-be, és `php -S 127.0.0.1:8899 -t .wp` szervert indít. A WP-telepítő varázslót böngészőben kell végigkattintani (nincs wp-cli). `.gitignore` += `.wp/`.

- [ ] **Step 2: Forgatókönyv** (mind kötelező, eredményt a PR-ba):
  1. Bővítmény aktiválása, Beállítások oldal: 2 : 1, 300, `#ffffff` mentve; hibás érték visszaesik.
  2. Új bejegyzés, kiemelt kép: a msotke `szegyor-logo.png` (400×400) → a modal magától nyílik, előnézet 800×400, fehér kitöltés, a logó teljesen látszik.
  3. Kicsinyítés 60 %-ra, mozgatás jobbra a szélig — nem lóg ki. Szín átállítása, „Automatikus” visszaállítja.
  4. Mentés → a kiemelt kép az új `szegyor-logo-igazitott.png`; a médiatárban az eredeti is megvan; a WP generált `-300x150` mérete (ha a teszttémán regisztrálva van egy 300×150 hard-crop méret — `add_image_size('loop-thumbnail',300,150,true)` egy mu-pluginban) **nem vág le semmit**.
  5. „Igazítás” újra → a modal az eredetiből és a mentett beállításokkal indul; újramentés után nincs dupla kitöltés.
  6. Egy 600×300-as kép → a modal nem nyílik magától; a gomb elérhető.
  7. Átlátszó szélű PNG → fehér háttér (nem fekete).
  8. Bejegyzés mentése, frontend: a kiemelt kép az igazított.

- [ ] **Step 3: Commit** — `git commit -m "docs: README, helyi WP ellenőrző script"`

---

### Task 8: Kiadás GitHub Release-ből

A repó **publikus** (`KMCongress/img-editor`). Egy GitHub Release közzétételekor a GitHub Actions állítja elő a WordPressbe közvetlenül feltölthető zipet, és csatolja a release-hez.

**Files:**
- Create: `.github/workflows/release.yml`, `bin/check-zip.sh`
- Modify: `README.md` (kiadási folyamat)

**Követelmények a zipre („proper WP plugin zip”):**
- Neve `kmc-featured-image-fit.zip`, benne **egyetlen gyökérkönyvtár** `kmc-featured-image-fit/` (így a WP a jó könyvtárba telepít, és frissítéskor felülírja).
- Tartalom: `kmc-featured-image-fit.php`, `includes/`, `build/` (benne `index.asset.php`), `readme.txt`. **Nincs** benne `src/`, `node_modules/`, `tests/`, `docs/`, `vendor/`, `.github/`, dotfile.
- A plugin header `Version:` értéke = a tag `v` nélkül; a workflow a tagből írja be a zip-be kerülő példányba (a repóban `Version: 0.0.0-dev` áll), így elfelejteni sem lehet.
- `readme.txt` WP-formátumban (`Stable tag` = verzió, ugyanígy beírva).

- [ ] **Step 1: `bin/check-zip.sh <zip> <version>`** — `unzip -Z1`-gyel ellenőrzi: minden bejegyzés `kmc-featured-image-fit/`-tal kezdődik; megvan a `kmc-featured-image-fit/kmc-featured-image-fit.php` és a `build/index.asset.php`; nincs `src/|node_modules/|tests/|docs/|/\.` találat; a zipben lévő header `Version: <version>`. Nem nulla exit kód hibánál, a hiba okával.

- [ ] **Step 2: Futtasd helyben bukni, majd átmenni** — egy kézzel összerakott rossz zipre (gyökérkönyvtár nélkül) FAIL; a Step 3 csomagoló lépéseit helyben lefuttatva (`VERSION=0.1.0`) PASS.

- [ ] **Step 3: `.github/workflows/release.yml`**
  - Trigger: `release: types: [published]`; `permissions: contents: write`.
  - Lépések: checkout → `actions/setup-node` (Node 24, npm cache) → `npm ci` → `npm test` → `npm run build` → `VERSION=${GITHUB_REF_NAME#v}` → staging könyvtár `dist/kmc-featured-image-fit/` a fenti tartalommal, `sed`-del beírt `Version:` és `Stable tag:` → `(cd dist && zip -r ../kmc-featured-image-fit.zip kmc-featured-image-fit)` → `bin/check-zip.sh kmc-featured-image-fit.zip "$VERSION"` → `gh release upload "$GITHUB_REF_NAME" kmc-featured-image-fit.zip --clobber` (`GH_TOKEN: ${{ github.token }}`).
  - A csomagolás saját staginggel megy, nem a `wp-scripts plugin-zip`-pel, mert annak a gyökérkönyvtár-viselkedése verziófüggő.

- [ ] **Step 4: Próbakiadás** — `gh release create v0.1.0 --prerelease --title "0.1.0" --notes "Pilot (msotke)"` → a workflow zöld, a release-en ott a `kmc-featured-image-fit.zip`; letöltve `bin/check-zip.sh` PASS. (Csak a felhasználó jóváhagyásával — kifelé látható művelet.)

- [ ] **Step 5: Commit** — `git commit -m "ci: release-kor feltölthető WP plugin zip"`
