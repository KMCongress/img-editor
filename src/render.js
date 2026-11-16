import { drawRect } from './geometry';

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export const QUALITY = 0.92;

/**
 * Paint the adjusted image. Preview and export both call this, so they match.
 */
export function renderTo( ctx, image, canvas, state ) {
	const r = drawRect( image, canvas, state );
	ctx.fillStyle = state.color;
	ctx.fillRect( 0, 0, canvas.width, canvas.height );
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';
	ctx.drawImage( image, r.x, r.y, r.width, r.height );
}

export function outputMime( sourceMime ) {
	return EXT[ sourceMime ] ? sourceMime : 'image/png';
}

export function outputFilename( sourceFilename, mime ) {
	const dot = sourceFilename.lastIndexOf( '.' );
	// WP renames big uploads to `<name>-scaled.<ext>`; that suffix is noise here.
	const base = ( dot > 0 ? sourceFilename.slice( 0, dot ) : sourceFilename ).replace( /-scaled$/, '' );
	return `${ base }-igazitott.${ EXT[ mime ] }`;
}

export function exportBlob( image, canvas, state, mime ) {
	const el = document.createElement( 'canvas' );
	el.width = canvas.width;
	el.height = canvas.height;
	renderTo( el.getContext( '2d' ), image, canvas, state );
	return new Promise( ( resolve, reject ) =>
		el.toBlob(
			( blob ) =>
				blob ? resolve( blob ) : reject( new Error( 'A kép exportálása nem sikerült.' ) ),
			mime,
			QUALITY
		)
	);
}

export async function loadImage( url ) {
	const img = new Image();
	img.crossOrigin = 'anonymous';
	img.src = url;
	await img.decode();
	return img;
}
