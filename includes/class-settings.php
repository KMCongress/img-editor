<?php

defined('ABSPATH') || exit;

final class KMC_FIF_Settings
{
    public const OPTION = 'kmc_fif_settings';
    private const PAGE = 'kmc-fif';
    private const LIMITS = [
        'ratio_w' => ['min' => 1, 'max' => 1000],
        'ratio_h' => ['min' => 1, 'max' => 1000],
        'min_width' => ['min' => 50, 'max' => 2560],
    ];

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

        $out = [];
        foreach (self::LIMITS as $key => $limit) {
            $out[$key] = self::int_in_range($input[$key] ?? null, $limit['min'], $limit['max'], $defaults[$key]);
            if (self::was_rejected($input, $key, $out[$key])) {
                self::report($key, sprintf(
                    /* translators: 1: field label, 2: minimum, 3: maximum, 4: value kept */
                    __('%1$s: %2$d és %3$d közötti egész szám lehet; a mentett érték %4$d.', 'kmc-fif'),
                    self::label($key), $limit['min'], $limit['max'], $out[$key]
                ));
            }
        }
        $out['default_color'] = self::color($input['default_color'] ?? null, $defaults['default_color']);
        if (self::was_rejected($input, 'default_color', $out['default_color'])) {
            self::report('default_color', sprintf(
                __('%1$s: #rrggbb formátumú szín lehet; a mentett érték %2$s.', 'kmc-fif'),
                self::label('default_color'), $out['default_color']
            ));
        }

        return $out;
    }

    /**
     * @return array{min: int, max: int}
     */
    public static function field_limits(string $key): array
    {
        return self::LIMITS[$key];
    }

    private static function label(string $key): string
    {
        $labels = [
            'ratio_w' => __('Cél arány — szélesség', 'kmc-fif'),
            'ratio_h' => __('Cél arány — magasság', 'kmc-fif'),
            'min_width' => __('Minimális kimeneti szélesség (px)', 'kmc-fif'),
            'default_color' => __('Alapértelmezett kitöltő szín', 'kmc-fif'),
        ];

        return $labels[$key];
    }

    /**
     * A value was submitted but did not survive sanitising.
     *
     * @param mixed $kept
     */
    private static function was_rejected(array $input, string $key, $kept): bool
    {
        if (!array_key_exists($key, $input) || '' === $input[$key] || null === $input[$key]) {
            return false;
        }
        $given = is_string($input[$key]) ? strtolower(trim($input[$key])) : $input[$key];

        return (string) $given !== (string) $kept;
    }

    private static function report(string $key, string $message): void
    {
        if (!function_exists('add_settings_error')) {
            return;
        }
        // WP runs the sanitize callback twice when the option is first created.
        if (function_exists('get_settings_errors')) {
            foreach (get_settings_errors(self::OPTION) as $existing) {
                if ($existing['code'] === 'kmc_fif_' . $key) {
                    return;
                }
            }
        }
        add_settings_error(self::OPTION, 'kmc_fif_' . $key, $message);
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

        foreach (['ratio_w', 'ratio_h', 'min_width', 'default_color'] as $key) {
            add_settings_field($key, self::label($key), [self::class, 'render_field'], self::PAGE, 'kmc_fif_main', [
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
        $limit = self::field_limits($key);
        printf(
            '<input type="number" class="small-text" min="%4$d" max="%5$d" step="1" id="kmc_fif_%1$s" name="%2$s" value="%3$d">',
            esc_attr($key), esc_attr($name), (int) $value, $limit['min'], $limit['max']
        );
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
