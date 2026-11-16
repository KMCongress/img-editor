/**
 * Pure geometry for fitting an image onto a target-ratio canvas.
 * All values are pixels in canvas space; origin is the top-left corner.
 */

export const MAX_CANVAS_WIDTH = 2560;
export const MIN_SCALE = 0.1;

const heightFor = ( width, { ratioW, ratioH } ) =>
	Math.round( ( width * ratioH ) / ratioW );

/**
 * Smallest target-ratio canvas that holds the image at native size,
 * at least `minWidth` wide and at most MAX_CANVAS_WIDTH wide.
 */
export function canvasSize( image, cfg ) {
	let width = Math.max(
		image.width,
		Math.round( ( image.height * cfg.ratioW ) / cfg.ratioH ),
		cfg.minWidth
	);
	let height = heightFor( width, cfg );
	while ( height < image.height && width < MAX_CANVAS_WIDTH ) {
		width++;
		height = heightFor( width, cfg );
	}
	if ( width > MAX_CANVAS_WIDTH ) {
		width = MAX_CANVAS_WIDTH;
		height = heightFor( width, cfg );
	}
	return { width, height };
}

/** Scale at which the whole image just fits the canvas ("kitölt"). */
export function fitScale( image, canvas ) {
	return Math.min( canvas.width / image.width, canvas.height / image.height );
}

/** Rectangle the image occupies; `scale` is relative to fitScale, in (0, 1]. */
export function drawRect( image, canvas, { scale, x, y } ) {
	const s = fitScale( image, canvas ) * scale;
	return { x, y, width: image.width * s, height: image.height * s };
}

const clamp = ( v, lo, hi ) => Math.min( Math.max( v, lo ), hi );

/** Keep the image fully inside the canvas and the scale within bounds. */
export function clampState( image, canvas, { scale, x, y } ) {
	const s = clamp( scale, MIN_SCALE, 1 );
	const r = drawRect( image, canvas, { scale: s, x, y } );
	return {
		scale: s,
		x: clamp( x, 0, Math.max( 0, canvas.width - r.width ) ),
		y: clamp( y, 0, Math.max( 0, canvas.height - r.height ) ),
	};
}

/** Fit, centred. */
export function initialState( image, canvas ) {
	const r = drawRect( image, canvas, { scale: 1, x: 0, y: 0 } );
	return {
		scale: 1,
		x: ( canvas.width - r.width ) / 2,
		y: ( canvas.height - r.height ) / 2,
	};
}

/** Whether the image already has the target ratio (relative tolerance). */
export function ratioMatches( image, { ratioW, ratioH }, tolerance = 0.01 ) {
	const actual = image.width / image.height;
	const target = ratioW / ratioH;
	return Math.abs( actual / target - 1 ) <= tolerance + 1e-9;
}
