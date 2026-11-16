<?php

defined('ABSPATH') || exit;

final class KMC_FIF_Settings
{
    public const OPTION = 'kmc_fif_settings';
    private const PAGE = 'kmc-fif';

    public static function defaults(): array
    {
        return ['ratio_w' => 2, 'ratio_h' => 1, 'min_width' => 300, 'default_color' => '#ffffff'];
    }

    /**
     * @param mixed $input
     */
    public static function sanitize($input): array
    {
        $defaults = self::defaults();
        if (!is_array($input)) {
            return $defaults;
        }

        return [
            'ratio_w' => self::int_in_range($input['ratio_w'] ?? null, 1, 1000, $defaults['ratio_w']),
            'ratio_h' => self::int_in_range($input['ratio_h'] ?? null, 1, 1000, $defaults['ratio_h']),
            'min_width' => self::int_in_range($input['min_width'] ?? null, 50, 2560, $defaults['min_width']),
            'default_color' => self::color($input['default_color'] ?? null, $defaults['default_color']),
        ];
    }

    public static function get(): array
    {
        return self::sanitize(get_option(self::OPTION, self::defaults()));
    }

    public static function register(): void
    {
        add_action('admin_init', [self::class, 'register_setting']);
        add_action('admin_menu', [self::class, 'add_page']);
    }

    public static function register_setting(): void
    {
        register_setting(self::PAGE, self::OPTION, [
            'type' => 'object',
            'sanitize_callback' => [self::class, 'sanitize'],
            'default' => self::defaults(),
        ]);

        add_settings_section('kmc_fif_main', '', '__return_false', self::PAGE);

        $fields = [
            'ratio_w' => __('Cél arány — szélesség', 'kmc-fif'),
            'ratio_h' => __('Cél arány — magasság', 'kmc-fif'),
            'min_width' => __('Minimális kimeneti szélesség (px)', 'kmc-fif'),
            'default_color' => __('Alapértelmezett kitöltő szín', 'kmc-fif'),
        ];
        foreach ($fields as $key => $label) {
            add_settings_field($key, $label, [self::class, 'render_field'], self::PAGE, 'kmc_fif_main', [
                'key' => $key,
                'label_for' => 'kmc_fif_' . $key,
            ]);
        }
    }

    public static function add_page(): void
    {
        add_options_page(
            __('Kiemelt kép igazítása', 'kmc-fif'),
            __('Kiemelt kép igazítása', 'kmc-fif'),
            'manage_options',
            self::PAGE,
            [self::class, 'render_page']
        );
    }

    public static function render_field(array $args): void
    {
        $key = $args['key'];
        $value = self::get()[$key];
        $name = self::OPTION . '[' . $key . ']';
        if ('default_color' === $key) {
            printf('<input type="color" id="kmc_fif_%1$s" name="%2$s" value="%3$s">', esc_attr($key), esc_attr($name), esc_attr($value));

            return;
        }
        printf('<input type="number" class="small-text" min="1" id="kmc_fif_%1$s" name="%2$s" value="%3$d">', esc_attr($key), esc_attr($name), (int) $value);
    }

    public static function render_page(): void
    {
        if (!current_user_can('manage_options')) {
            return;
        }
        echo '<div class="wrap"><h1>' . esc_html__('Kiemelt kép igazítása', 'kmc-fif') . '</h1>';
        echo '<p>' . esc_html__('A hírlista képének aránya (pl. 2 : 1). A kiemelt kép igazítója erre a vászonra illeszti a képet.', 'kmc-fif') . '</p>';
        echo '<form method="post" action="options.php">';
        settings_fields(self::PAGE);
        do_settings_sections(self::PAGE);
        submit_button();
        echo '</form></div>';
    }

    /**
     * @param mixed $value
     */
    private static function int_in_range($value, int $min, int $max, int $fallback): int
    {
        if (is_int($value) || (is_string($value) && preg_match('/^-?\d+$/', trim($value)))) {
            $int = (int) $value;

            return ($int >= $min && $int <= $max) ? $int : $fallback;
        }

        return $fallback;
    }

    /**
     * @param mixed $value
     */
    private static function color($value, string $fallback): string
    {
        if (is_string($value) && preg_match('/^#[0-9a-fA-F]{6}$/', $value)) {
            return strtolower($value);
        }

        return $fallback;
    }
}
