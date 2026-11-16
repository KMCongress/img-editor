// @vitest-environment jsdom
import { test, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { shouldAutoOpen } from '../auto-open';
import AdjustModal from '../AdjustModal';
import * as renderMod from '../render';
import * as media from '../media';

afterEach( cleanup );

const s = { ratioW: 2, ratioH: 1, minWidth: 300, defaultColor: '#ffffff' };
const att = ( w, h, meta = {} ) => ( { id: 1, media_details: { width: w, height: h }, meta } );

test( 'auto-opens for a square logo', () => expect( shouldAutoOpen( att( 400, 400 ), s ) ).toBe( true ) );
test( 'does not auto-open when ratio already matches', () =>
	expect( shouldAutoOpen( att( 600, 300 ), s ) ).toBe( false ) );
test( 'does not auto-open for its own output', () =>
	expect( shouldAutoOpen( att( 800, 400, { _kmc_fif_source: 3 } ), s ) ).toBe( false ) );
test( 'does not auto-open without known dimensions', () =>
	expect( shouldAutoOpen( { id: 1, media_details: {} }, s ) ).toBe( false ) );

const logo = {
	id: 7,
	source_url: 'http://x/logo.png',
	mime_type: 'image/png',
	alt_text: '',
	media_details: { width: 400, height: 400, file: '2026/11/logo.png' },
	meta: {},
};

function mockImage() {
	vi.spyOn( renderMod, 'loadImage' ).mockResolvedValue( { naturalWidth: 400, naturalHeight: 400, width: 400, height: 400 } );
}

test( 'modal shows target size line', async () => {
	mockImage();
	render( <AdjustModal attachment={ logo } settings={ s } onDone={ () => {} } onClose={ () => {} } /> );
	expect( await screen.findByText( 'Így jelenik meg a hírlistában: 800×400 px, 2:1' ) ).toBeTruthy();
	expect( screen.getByText( 'Kiemelt kép igazítása' ) ).toBeTruthy();
} );

test( 'save exports, uploads and reports the new id', async () => {
	mockImage();
	const blob = new Blob( [ 'x' ], { type: 'image/png' } );
	const exp = vi.spyOn( renderMod, 'exportBlob' ).mockResolvedValue( blob );
	const up = vi.spyOn( media, 'uploadAdjusted' ).mockResolvedValue( { id: 42 } );
	const onDone = vi.fn();
	render( <AdjustModal attachment={ logo } settings={ s } onDone={ onDone } onClose={ () => {} } /> );
	fireEvent.click( await screen.findByText( 'Mentés és beállítás kiemelt képként' ) );
	await waitFor( () => expect( onDone ).toHaveBeenCalledWith( 42 ) );
	expect( exp.mock.calls[ 0 ][ 1 ] ).toEqual( { width: 800, height: 400 } );
	expect( exp.mock.calls[ 0 ][ 2 ] ).toEqual( { scale: 1, x: 200, y: 0, color: '#ffffff' } );
	expect( exp.mock.calls[ 0 ][ 3 ] ).toBe( 'image/png' );
	expect( up.mock.calls[ 0 ][ 1 ] ).toBe( 'logo-igazitott.png' );
	expect( up.mock.calls[ 0 ][ 2 ] ).toBe( logo );
} );

test( 'save failure keeps the modal open with the error', async () => {
	mockImage();
	vi.spyOn( renderMod, 'exportBlob' ).mockRejectedValue( new Error( 'boom' ) );
	const onDone = vi.fn();
	render( <AdjustModal attachment={ logo } settings={ s } onDone={ onDone } onClose={ () => {} } /> );
	fireEvent.click( await screen.findByText( 'Mentés és beállítás kiemelt képként' ) );
	expect( await screen.findByText( /boom/ ) ).toBeTruthy();
	expect( onDone ).not.toHaveBeenCalled();
} );

test( 're-adjust starts from the original and saved params', async () => {
	mockImage();
	const params = { scale: 0.5, x: 0, y: 0, color: '#001773' };
	vi.spyOn( media, 'resolveSource' ).mockResolvedValue( { source: logo, params } );
	const exp = vi.spyOn( renderMod, 'exportBlob' ).mockResolvedValue( new Blob( [ 'x' ] ) );
	vi.spyOn( media, 'uploadAdjusted' ).mockResolvedValue( { id: 43 } );
	const adjusted = { ...logo, id: 9, meta: { _kmc_fif_source: 7, _kmc_fif_params: params } };
	render( <AdjustModal attachment={ adjusted } settings={ s } onDone={ () => {} } onClose={ () => {} } /> );
	fireEvent.click( await screen.findByText( 'Mentés és beállítás kiemelt képként' ) );
	await waitFor( () => expect( exp ).toHaveBeenCalled() );
	expect( exp.mock.calls[ 0 ][ 2 ] ).toEqual( params );
} );
