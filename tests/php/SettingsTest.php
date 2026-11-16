<?php

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class SettingsTest extends TestCase
{
    public function testDefaultsWhenEmpty(): void
    {
        self::assertSame(KMC_FIF_Settings::defaults(), KMC_FIF_Settings::sanitize([]));
    }

    public function testNonArrayInputGivesDefaults(): void
    {
        self::assertSame(KMC_FIF_Settings::defaults(), KMC_FIF_Settings::sanitize('garbage'));
    }

    public function testKeepsValidValues(): void
    {
        $in = ['ratio_w' => '100', 'ratio_h' => '66', 'min_width' => '400', 'default_color' => '#ABCDEF'];
        self::assertSame(
            ['ratio_w' => 100, 'ratio_h' => 66, 'min_width' => 400, 'default_color' => '#abcdef'],
            KMC_FIF_Settings::sanitize($in)
        );
    }

    #[DataProvider('invalid')]
    public function testInvalidFallsBackPerField(array $in, string $key): void
    {
        self::assertSame(KMC_FIF_Settings::defaults()[$key], KMC_FIF_Settings::sanitize($in)[$key]);
    }

    public static function invalid(): array
    {
        return [
            [['ratio_w' => '0'], 'ratio_w'],
            [['ratio_h' => '-3'], 'ratio_h'],
            [['ratio_w' => '1001'], 'ratio_w'],
            [['min_width' => 'abc'], 'min_width'],
            [['min_width' => '5000'], 'min_width'],
            [['min_width' => '49'], 'min_width'],
            [['default_color' => 'red'], 'default_color'],
            [['default_color' => '#fff'], 'default_color'],
        ];
    }

    protected function setUp(): void
    {
        $GLOBALS['kmc_fif_test_settings_errors'] = [];
    }

    public function testFieldLimitsMatchSanitizeRanges(): void
    {
        self::assertSame(['min' => 1, 'max' => 1000], KMC_FIF_Settings::field_limits('ratio_w'));
        self::assertSame(['min' => 1, 'max' => 1000], KMC_FIF_Settings::field_limits('ratio_h'));
        self::assertSame(['min' => 50, 'max' => 2560], KMC_FIF_Settings::field_limits('min_width'));
    }

    public function testRejectedValueIsReported(): void
    {
        KMC_FIF_Settings::sanitize(['ratio_w' => '2', 'ratio_h' => '1', 'min_width' => '5000', 'default_color' => '#ffffff']);
        $errors = $GLOBALS['kmc_fif_test_settings_errors'];
        self::assertCount(1, $errors);
        self::assertSame('kmc_fif_min_width', $errors[0]['code']);
        self::assertStringContainsString('50', $errors[0]['message']);
        self::assertStringContainsString('2560', $errors[0]['message']);
    }

    public function testValidOrMissingValuesAreNotReported(): void
    {
        KMC_FIF_Settings::sanitize(['ratio_w' => '2', 'ratio_h' => '1', 'min_width' => '300', 'default_color' => '#ffffff']);
        KMC_FIF_Settings::sanitize([]);
        self::assertSame([], $GLOBALS['kmc_fif_test_settings_errors']);
    }
}
