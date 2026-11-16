<?php

defined('ABSPATH') || exit;

final class KMC_FIF_Plugin
{
    public const SCRIPT = 'kmc-fif-editor';
    public const META_SOURCE = '_kmc_fif_source';
    public const META_PARAMS = '_kmc_fif_params';

    public static function register(): void
    {
        add_action('init', [self::class, 'register_meta']);
        add_action('enqueue_block_editor_assets', [self::class, 'enqueue']);
    }

    public static function register_meta(): void
    {
        $auth = static function (): bool {
            return current_user_can('upload_files');
        };

        register_post_meta('attachment', self::META_SOURCE, [
            'type' => 'integer',
            'single' => true,
            'default' => 0,
            'show_in_rest' => true,
            'auth_callback' => $auth,
        ]);

        register_post_meta('attachment', self::META_PARAMS, [
            'type' => 'object',
            'single' => true,
            'show_in_rest' => [
                'schema' => [
                    'type' => 'object',
                    'properties' => [
                        'scale' => ['type' => 'number'],
                        'x' => ['type' => 'number'],
                        'y' => ['type' => 'number'],
                        'color' => ['type' => 'string'],
                    ],
                    'additionalProperties' => false,
                ],
            ],
            'auth_callback' => $auth,
        ]);
    }

    public static function enqueue(): void
    {
        $screen = function_exists('get_current_screen') ? get_current_screen() : null;
        if (!$screen || 'post' !== $screen->post_type) {
            return;
        }

        $dir = plugin_dir_path(KMC_FIF_FILE) . 'build/';
        $url = plugin_dir_url(KMC_FIF_FILE) . 'build/';
        if (!file_exists($dir . 'index.asset.php')) {
            return;
        }
        $asset = require $dir . 'index.asset.php';

        wp_enqueue_script(self::SCRIPT, $url . 'index.js', $asset['dependencies'], $asset['version'], true);
        if (file_exists($dir . 'index.css')) {
            wp_enqueue_style(self::SCRIPT, $url . 'index.css', ['wp-components'], $asset['version']);
        }

        $s = KMC_FIF_Settings::get();
        $js = [
            'ratioW' => $s['ratio_w'],
            'ratioH' => $s['ratio_h'],
            'minWidth' => $s['min_width'],
            'defaultColor' => $s['default_color'],
        ];
        wp_add_inline_script(self::SCRIPT, 'window.kmcFifSettings = ' . wp_json_encode($js) . ';', 'before');
    }
}
