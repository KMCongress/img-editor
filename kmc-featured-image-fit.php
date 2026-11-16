<?php
/**
 * Plugin Name:       Kiemelt kép igazítása
 * Description:       A kiemelt képet a hírlista arányára igazítja: átméretezés és kitöltés a kép jellemző színével, előnézettel.
 * Version:           0.0.0-dev
 * Requires at least: 6.4
 * Requires PHP:      7.4
 * Author:            KMCongress
 * License:           GPL-2.0-or-later
 * Text Domain:       kmc-fif
 * Update URI:        false
 */

defined('ABSPATH') || exit;

define('KMC_FIF_FILE', __FILE__);

require_once __DIR__ . '/includes/class-settings.php';
require_once __DIR__ . '/includes/class-plugin.php';

KMC_FIF_Settings::register();
KMC_FIF_Plugin::register();
