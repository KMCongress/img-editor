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
}
