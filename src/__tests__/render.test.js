import { test, expect } from 'vitest';
import { renderTo, outputMime, outputFilename } from '../render';

function mockCtx( calls ) {
	return {
		set fillStyle( v ) {
			calls.push( [ 'fillStyle', v ] );
		},
		set imageSmoothingEnabled( v ) {},
		set imageSmoothingQuality( v ) {},
		fillRect: ( ...a ) => calls.push( [ 'fillRect', ...a ] ),
		clearRect: ( ...a ) => calls.push( [ 'clearRect', ...a ] ),
		drawImage: ( _img, ...a ) => calls.push( [ 'drawImage', ...a ] ),
	};
}

test( 'fills background before drawing the image', () => {
	const calls = [];
	renderTo(
		mockCtx( calls ),
		{ width: 400, height: 400 },
		{ width: 800, height: 400 },
		{ scale: 1, x: 200, y: 0, color: '#001773' }
	);
	expect( calls ).toEqual( [
		[ 'fillStyle', '#001773' ],
		[ 'fillRect', 0, 0, 800, 400 ],
		[ 'drawImage', 200, 0, 400, 400 ],
	] );
} );

test( 'scaled draw uses fit-relative size', () => {
	const calls = [];
	renderTo(
		mockCtx( calls ),
		{ width: 100, height: 100 },
		{ width: 300, height: 150 },
		{ scale: 0.5, x: 10, y: 20, color: '#ffffff' }
	);
	expect( calls[ 2 ] ).toEqual( [ 'drawImage', 10, 20, 75, 75 ] );
} );

test.each( [
	[ 'image/png', 'image/png' ],
	[ 'image/jpeg', 'image/jpeg' ],
	[ 'image/webp', 'image/webp' ],
	[ 'image/gif', 'image/png' ],
	[ undefined, 'image/png' ],
] )( 'outputMime %s', ( i, o ) => expect( outputMime( i ) ).toBe( o ) );

test.each( [
	[ 'logo.png', 'image/png', 'logo-igazitott.png' ],
	[ 'kep.JPEG', 'image/jpeg', 'kep-igazitott.jpg' ],
	[ 'x.gif', 'image/png', 'x-igazitott.png' ],
	[ 'foto.webp', 'image/webp', 'foto-igazitott.webp' ],
	[ 'noext', 'image/png', 'noext-igazitott.png' ],
	[ 'a.b.c.jpg', 'image/jpeg', 'a.b.c-igazitott.jpg' ],
] )( 'outputFilename %s', ( f, m, o ) => expect( outputFilename( f, m ) ).toBe( o ) );
