#!/usr/bin/env bash
# Helyi WordPress a bővítmény kézi kipróbálásához (Docker nélkül).
#   WP_DB_HOST, WP_DB_USER, WP_DB_PASSWORD  — meglévő MySQL hozzáférés
#   WP_DB_NAME (alap: kmc_fif_wp), WP_PORT (alap: 8899)
# Használat: bin/local-wp.sh install | bin/local-wp.sh serve | bin/local-wp.sh wp <wp-cli args>
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WP_DIR="$ROOT/.wp"
DB_NAME="${WP_DB_NAME:-kmc_fif_wp}"
PORT="${WP_PORT:-8899}"
URL="http://127.0.0.1:$PORT"
WPCLI="$WP_DIR/wp-cli.phar"

wp() { php -d memory_limit=512M "$WPCLI" --path="$WP_DIR/site" "$@"; }

install() {
  : "${WP_DB_HOST:?WP_DB_HOST kell}" "${WP_DB_USER:?WP_DB_USER kell}" "${WP_DB_PASSWORD:?WP_DB_PASSWORD kell}"
  mkdir -p "$WP_DIR/site"
  [ -f "$WPCLI" ] || curl -fsSL -o "$WPCLI" https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
  [ -f "$WP_DIR/site/wp-load.php" ] || wp core download
  MYSQL_PWD="$WP_DB_PASSWORD" mysql -h "$WP_DB_HOST" -u "$WP_DB_USER" \
    -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
  [ -f "$WP_DIR/site/wp-config.php" ] || wp config create --dbname="$DB_NAME" --dbuser="$WP_DB_USER" \
    --dbpass="$WP_DB_PASSWORD" --dbhost="$WP_DB_HOST" --skip-check
  wp core is-installed 2>/dev/null || wp core install --url="$URL" --title="KMC FIF teszt" \
    --admin_user=admin --admin_password=admin --admin_email=admin@example.invalid --skip-email
  wp option update siteurl "$URL" >/dev/null; wp option update home "$URL" >/dev/null
  ln -sfn "$ROOT" "$WP_DIR/site/wp-content/plugins/kmc-featured-image-fit"
  # A msotke téma képméretének utánzata: 300x150 hard crop.
  mkdir -p "$WP_DIR/site/wp-content/mu-plugins"
  cat > "$WP_DIR/site/wp-content/mu-plugins/loop-thumbnail.php" <<'PHP'
<?php
add_action('after_setup_theme', function () {
    add_theme_support('post-thumbnails');
    add_image_size('loop-thumbnail', 300, 150, true);
});
PHP
  wp plugin activate kmc-featured-image-fit
  echo "Kész: $URL/wp-admin  (admin / admin) — indítás: bin/local-wp.sh serve"
}

case "${1:-}" in
  install) install ;;
  serve) exec php -S "127.0.0.1:$PORT" -t "$WP_DIR/site" ;;
  wp) shift; wp "$@" ;;
  *) echo "usage: $0 install|serve|wp ..." >&2; exit 2 ;;
esac
