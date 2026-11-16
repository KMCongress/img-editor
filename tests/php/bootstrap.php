<?php

require dirname(__DIR__, 2) . '/vendor/autoload.php';

if (!defined('ABSPATH')) {
    define('ABSPATH', __DIR__ . '/');
}

if (!function_exists('sanitize_hex_color')) {
    function sanitize_hex_color($color)
    {
        if ('' === $color) {
            return '';
        }

        return preg_match('|^#([A-Fa-f0-9]{3}){1,2}$|', $color) ? $color : null;
    }
}

require_once dirname(__DIR__, 2) . '/includes/class-settings.php';

if (!function_exists('add_settings_error')) {
    $GLOBALS['kmc_fif_test_settings_errors'] = [];
    function add_settings_error($setting, $code, $message, $type = 'error')
    {
        $GLOBALS['kmc_fif_test_settings_errors'][] = compact('setting', 'code', 'message', 'type');
    }
}

if (!function_exists('__')) {
    function __($text, $domain = 'default')
    {
        return $text;
    }
}
