import { test, expect, vi, beforeEach } from 'vitest';
import apiFetch from '@wordpress/api-fetch';
import { resolveSource, uploadAdjusted } from '../media';

vi.mock( '@wordpress/api-fetch', () => ( { default: vi.fn() } ) );

beforeEach( () => apiFetch.mockReset() );

test( 'resolveSource follows _kmc_fif_source', async () => {
	apiFetch.mockResolvedValueOnce( { id: 7, source_url: '/orig.png' } );
	const params = { scale: 0.8, x: 1, y: 2, color: '#ffffff' };
	const r = await resolveSource( { id: 9, meta: { _kmc_fif_source: 7, _kmc_fif_params: params } } );
	expect( apiFetch ).toHaveBeenCalledWith( { path: '/wp/v2/media/7?context=edit' } );
	expect( r ).toEqual( { source: { id: 7, source_url: '/orig.png' }, params } );
} );

test( 'resolveSource falls back when source deleted', async () => {
	apiFetch.mockRejectedValueOnce( { code: 'rest_post_invalid_id' } );
	const a = { id: 9, meta: { _kmc_fif_source: 7 } };
	expect( await resolveSource( a ) ).toEqual( { source: a, params: null } );
} );

test( 'plain attachment is its own source', async () => {
	const a = { id: 5, meta: {} };
	expect( await resolveSource( a ) ).toEqual( { source: a, params: null } );
	expect( apiFetch ).not.toHaveBeenCalled();
} );

test( 'attachment without meta is its own source', async () => {
	const a = { id: 5 };
	expect( await resolveSource( a ) ).toEqual( { source: a, params: null } );
} );

test( 'uploadAdjusted uploads then writes meta and alt text', async () => {
	apiFetch
		.mockResolvedValueOnce( { id: 11 } )
		.mockResolvedValueOnce( { id: 11, meta: { _kmc_fif_source: 7 } } );
	const blob = new Blob( [ 'x' ], { type: 'image/png' } );
	const params = { scale: 1, x: 0, y: 0, color: '#ffffff' };

	const result = await uploadAdjusted( blob, 'logo-igazitott.png', { id: 7, alt_text: 'Logó' }, params );

	const [ first, second ] = apiFetch.mock.calls.map( ( c ) => c[ 0 ] );
	expect( first.path ).toBe( '/wp/v2/media' );
	expect( first.method ).toBe( 'POST' );
	expect( first.body ).toBeInstanceOf( FormData );
	expect( first.body.get( 'file' ).name ).toBe( 'logo-igazitott.png' );
	expect( second ).toEqual( {
		path: '/wp/v2/media/11?context=edit',
		method: 'POST',
		data: { alt_text: 'Logó', meta: { _kmc_fif_source: 7, _kmc_fif_params: params } },
	} );
	expect( result ).toEqual( { id: 11, meta: { _kmc_fif_source: 7 } } );
} );
