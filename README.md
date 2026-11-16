# Kiemelt kép igazítása (WordPress-bővítmény)

A blokkszerkesztő kiemelt kép panelén megjelenik egy **Igazítás** gomb. Ha a választott kép aránya eltér a hírlista arányától, az igazító magától megnyílik. A kép torzítás és vágás nélkül a cél arányú vászonra kerül, a maradék helyet a kép szélének jellemző színe tölti ki. A kezelő a színt felülírhatja, a képet kicsinyítheti és a kereten belül mozgathatja.

Mentéskor az igazított kép **új médiaelem** lesz, és ez lesz a hír kiemelt képe. Az eredeti kép megmarad. Ha később újra igazítod, a bővítmény az eredetiből és a mentett beállításokból indul.

Terv: [`docs/superpowers/specs/2026-11-16-featured-image-fit-design.md`](docs/superpowers/specs/2026-11-16-featured-image-fit-design.md)

## Telepítés

1. Töltsd le a legfrissebb kiadás `kmc-featured-image-fit.zip` fájlját a [Releases](../../releases) oldalról.
2. WordPress admin › Bővítmények › Új bővítmény › Bővítmény feltöltése.
3. Aktiválás után: Beállítások › Kiemelt kép igazítása.

Követelmény: WordPress 6.6+, PHP 7.4+, blokkszerkesztő.

## Beállítás

Beállítások › Kiemelt kép igazítása:

| Mező | Jelentés | Alapérték |
|---|---|---|
| Cél arány (szélesség : magasság) | a téma hírlistájában megjelenő kép aránya | 2 : 1 |
| Minimális kimeneti szélesség | legalább akkora legyen, mint a téma által használt képméret, különben a WordPress nem generálja le | 300 px |
| Alapértelmezett kitöltő szín | ha a kép széléből nem állapítható meg a háttérszín (pl. átlátszó szél) | `#ffffff` |

A cél arányt a téma határozza meg. Klasszikus témánál a regisztrált képméret, például `add_image_size( 'loop-thumbnail', 300, 150, true )`, 2 : 1-et ad. Elementor Posts widgetnél az „Image Ratio” beállítás, például 0,66, 100 : 66-ot. Ha a téma változik, a beállítást is követni kell.

## Fejlesztés

```bash
npm install && composer install
npm test                 # Vitest (JS)
php vendor/bin/phpunit   # PHPUnit (PHP)
npm run build            # build/ — ezt tölti be a bővítmény
```

### Helyi WordPress (Docker nélkül)

```bash
export WP_DB_HOST=… WP_DB_USER=… WP_DB_PASSWORD=…
bin/local-wp.sh install   # .wp/site — WP + kmc_fif_wp DB + a bővítmény szimlinkelve, egy 300×150-es hard-crop képméretet regisztráló mu-pluginnal
bin/local-wp.sh serve     # http://127.0.0.1:8899/wp-admin  (admin / admin)
bin/local-wp.sh wp …      # wp-cli
```

## Kiadás

Egy GitHub Release közzététele (`vX.Y.Z` tag) elindítja a `release` workflow-t. Ez teszteli és buildeli a bővítményt, majd a release-hez csatolja a feltölthető `kmc-featured-image-fit.zip`-et. A verziószámot a tagből írja be.
