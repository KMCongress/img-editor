import { test, expect } from 'vitest';
import { previewImageSize } from '../preview-size';

test( 'square-cropped thumbnail fallback becomes the aspect-preserving medium size', () =>
	expect( previewImageSize( 'thumbnail' ) ).toBe( 'medium' ) );

test( 'other sizes pass through', () => {
	expect( previewImageSize( 'large' ) ).toBe( 'large' );
	expect( previewImageSize( 'post-thumbnail' ) ).toBe( 'post-thumbnail' );
} );
