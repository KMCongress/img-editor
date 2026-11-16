import { test, expect } from 'vitest';
import { dominantEdgeColor } from '../color';

/** Build [data, width, height] from fn(x, y) → [r, g, b, a]. */
function img( width, height, fn ) {
	const data = new Uint8ClampedArray( width * height * 4 );
	for ( let y = 0; y < height; y++ ) {
		for ( let x = 0; x < width; x++ ) {
			data.set( fn( x, y ), ( y * width + x ) * 4 );
		}
	}
	return [ data, width, height ];
}

test( 'white-bordered logo returns white', () =>
	expect(
		dominantEdgeColor(
			...img( 50, 50, ( x, y ) =>
				x > 10 && x < 40 && y > 10 && y < 40 ? [ 20, 30, 90, 255 ] : [ 255, 255, 255, 255 ]
			)
		)
	).toBe( '#ffffff' ) );

test( 'majority edge colour wins over minority', () =>
	expect(
		dominantEdgeColor(
			...img( 100, 10, ( x ) => ( x < 70 ? [ 0, 23, 115, 255 ] : [ 255, 255, 255, 255 ] ) )
		)
	).toBe( '#001773' ) );

test( 'centre pixels do not count', () =>
	expect(
		dominantEdgeColor(
			...img( 100, 100, ( x, y ) =>
				x >= 5 && x < 95 && y >= 5 && y < 95 ? [ 255, 0, 0, 255 ] : [ 0, 0, 255, 255 ]
			)
		)
	).toBe( '#0000ff' ) );

test( 'returns null when every edge pixel is transparent', () =>
	expect( dominantEdgeColor( ...img( 20, 20, () => [ 0, 0, 0, 0 ] ) ) ).toBeNull() );

test( 'ignores semi-transparent pixels below alpha 128', () =>
	expect(
		dominantEdgeColor(
			...img( 20, 20, ( x ) => ( x % 2 ? [ 255, 0, 0, 100 ] : [ 0, 255, 0, 255 ] ) )
		)
	).toBe( '#00ff00' ) );

test( 'averages near-identical shades within a bucket', () =>
	expect(
		dominantEdgeColor(
			...img( 10, 10, ( x ) => ( x % 2 ? [ 250, 250, 250, 255 ] : [ 254, 254, 254, 255 ] ) )
		)
	).toBe( '#fcfcfc' ) );

test( '1x1 image works', () =>
	expect( dominantEdgeColor( ...img( 1, 1, () => [ 10, 20, 30, 255 ] ) ) ).toBe( '#0a141e' ) );

test( 'mostly transparent edge returns null even if glyphs touch it', () =>
	expect(
		dominantEdgeColor(
			...img( 100, 40, ( x, y ) =>
				// navy strokes touch the top, bottom and left edge; ~21 % of the edge is opaque
				x % 10 === 0 ? [ 0, 23, 115, 255 ] : [ 0, 0, 0, 0 ]
			)
		)
	).toBeNull() );

test( 'opaque majority still wins when some edge pixels are transparent', () =>
	expect(
		dominantEdgeColor(
			...img( 100, 10, ( x ) => ( x < 30 ? [ 0, 0, 0, 0 ] : [ 255, 255, 255, 255 ] ) )
		)
	).toBe( '#ffffff' ) );
