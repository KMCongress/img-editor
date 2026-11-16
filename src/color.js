/**
 * Dominant colour of an image's outer band — for logos this is the background.
 *
 * @param {Uint8ClampedArray} data   RGBA pixels (ImageData.data).
 * @param {number}            width
 * @param {number}            height
 * @return {string|null} `#rrggbb`, or null when no opaque edge pixel exists.
 */
export function dominantEdgeColor( data, width, height ) {
	const band = Math.max( 1, Math.round( Math.min( width, height ) * 0.02 ) );
	const buckets = new Map();
	let best = null;

	for ( let y = 0; y < height; y++ ) {
		const inRowBand = y < band || y >= height - band;
		for ( let x = 0; x < width; x++ ) {
			if ( ! inRowBand && x >= band && x < width - band ) {
				// Jump over the interior of this row.
				x = width - band - 1;
				continue;
			}
			const i = ( y * width + x ) * 4;
			if ( data[ i + 3 ] < 128 ) {
				continue;
			}
			const r = data[ i ];
			const g = data[ i + 1 ];
			const b = data[ i + 2 ];
			const key = ( ( r >> 4 ) << 8 ) | ( ( g >> 4 ) << 4 ) | ( b >> 4 );
			let bucket = buckets.get( key );
			if ( ! bucket ) {
				bucket = { n: 0, r: 0, g: 0, b: 0 };
				buckets.set( key, bucket );
			}
			bucket.n++;
			bucket.r += r;
			bucket.g += g;
			bucket.b += b;
			if ( ! best || bucket.n > best.n ) {
				best = bucket;
			}
		}
	}

	if ( ! best ) {
		return null;
	}
	const hex = ( sum ) =>
		Math.round( sum / best.n )
			.toString( 16 )
			.padStart( 2, '0' );
	return `#${ hex( best.r ) }${ hex( best.g ) }${ hex( best.b ) }`;
}
