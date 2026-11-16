import { test, expect } from 'vitest';
import {
	canvasSize,
	fitScale,
	drawRect,
	clampState,
	initialState,
	ratioMatches,
	MAX_CANVAS_WIDTH,
} from '../geometry';

const cfg = { ratioW: 2, ratioH: 1, minWidth: 300 };
const sq = { width: 400, height: 400 };

test( 'square logo gets pillarboxed canvas', () =>
	expect( canvasSize( sq, cfg ) ).toEqual( { width: 800, height: 400 } ) );

test( 'wide image keeps its width', () =>
	expect( canvasSize( { width: 1000, height: 200 }, cfg ) ).toEqual( {
		width: 1000,
		height: 500,
	} ) );

test( 'upscales small image to the minimum canvas', () => {
	const c = canvasSize( { width: 100, height: 100 }, cfg );
	expect( c ).toEqual( { width: 300, height: 150 } );
	expect( fitScale( { width: 100, height: 100 }, c ) ).toBe( 1.5 );
} );

test( 'caps canvas width at 2560', () => {
	expect( MAX_CANVAS_WIDTH ).toBe( 2560 );
	const c = canvasSize( { width: 2560, height: 2560 }, cfg );
	expect( c ).toEqual( { width: 2560, height: 1280 } );
	expect( fitScale( { width: 2560, height: 2560 }, c ) ).toBe( 0.5 );
} );

test( 'pathology ratio 100:66 contains the image', () => {
	const c = canvasSize( sq, { ratioW: 100, ratioH: 66, minWidth: 300 } );
	expect( c ).toEqual( { width: 606, height: 400 } );
	expect( c.height ).toBeGreaterThanOrEqual( 400 );
} );

test( 'odd sizes always contain the image', () => {
	for ( const [ w, h ] of [ [ 333, 777 ], [ 1, 1 ], [ 1999, 3 ], [ 641, 427 ] ] ) {
		const c = canvasSize( { width: w, height: h }, { ratioW: 100, ratioH: 66, minWidth: 50 } );
		expect( c.width ).toBeGreaterThanOrEqual( w );
		expect( c.height ).toBeGreaterThanOrEqual( h );
	}
} );

test( 'initial state is centred and fully visible', () => {
	const c = { width: 800, height: 400 };
	expect( drawRect( sq, c, initialState( sq, c ) ) ).toEqual( {
		x: 200,
		y: 0,
		width: 400,
		height: 400,
	} );
} );

test( 'clamp keeps image inside canvas', () => {
	const c = { width: 800, height: 400 };
	expect( clampState( sq, c, { scale: 1, x: -50, y: 30 } ) ).toEqual( { scale: 1, x: 0, y: 0 } );
	expect( clampState( sq, c, { scale: 2, x: 0, y: 0 } ).scale ).toBe( 1 );
	expect( clampState( sq, c, { scale: 0.01, x: 0, y: 0 } ).scale ).toBe( 0.1 );
	expect( clampState( sq, c, { scale: 0.5, x: 700, y: 300 } ) ).toEqual( {
		scale: 0.5,
		x: 600,
		y: 200,
	} );
} );

test( 'ratioMatches within 1 %', () => {
	expect( ratioMatches( { width: 300, height: 150 }, cfg ) ).toBe( true );
	expect( ratioMatches( { width: 303, height: 150 }, cfg ) ).toBe( true );
	expect( ratioMatches( { width: 310, height: 150 }, cfg ) ).toBe( false );
	expect( ratioMatches( sq, cfg ) ).toBe( false );
} );
