// @vitest-environment jsdom
import { test, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

const store = { featured: 0, media: {}, mediaArgs: [] };
const editPost = vi.fn();
vi.mock( '@wordpress/data', () => ( {
	useSelect: ( fn ) =>
		fn( ( name ) =>
			name === 'core/editor'
				? { getEditedPostAttribute: () => store.featured }
				: { getMedia: ( id, ...rest ) => ( store.mediaArgs.push( rest ), store.media[ id ] ?? null ) }
		),
	useDispatch: () => ( { editPost } ),
} ) );
vi.mock( '../AdjustModal', () => ( {
	default: ( { onDone, attachment } ) => <button onClick={ () => onDone( 100 + attachment.id ) }>MODAL</button>,
} ) );

const { withAdjust } = await import( '../editor' );
const Wrapped = withAdjust( () => <div>ORIGINAL</div> );

afterEach( cleanup );

const att = ( id, w, h, meta = {} ) => ( { id, media_details: { width: w, height: h }, meta } );

test( 'no button without featured image', () => {
	store.featured = 0;
	render( <Wrapped /> );
	expect( screen.getByText( 'ORIGINAL' ) ).toBeTruthy();
	expect( screen.queryByText( 'Igazítás' ) ).toBeNull();
} );

test( 'existing featured image on load does not auto-open', () => {
	store.featured = 5;
	store.media = { 5: att( 5, 400, 400 ) };
	render( <Wrapped /> );
	expect( screen.getByText( 'Igazítás' ) ).toBeTruthy();
	expect( screen.queryByText( 'MODAL' ) ).toBeNull();
} );

test( 'choosing a square logo auto-opens once its media loads', () => {
	store.featured = 0;
	store.media = {};
	const { rerender } = render( <Wrapped /> );
	store.featured = 7;
	rerender( <Wrapped /> );
	expect( screen.queryByText( 'MODAL' ) ).toBeNull();
	store.media = { 7: att( 7, 400, 400 ) };
	rerender( <Wrapped /> );
	expect( screen.getByText( 'MODAL' ) ).toBeTruthy();
} );

test( 'choosing a right-ratio image does not auto-open', () => {
	store.featured = 0;
	store.media = { 8: att( 8, 600, 300 ) };
	const { rerender } = render( <Wrapped /> );
	store.featured = 8;
	rerender( <Wrapped /> );
	expect( screen.queryByText( 'MODAL' ) ).toBeNull();
	expect( screen.getByText( 'Igazítás' ) ).toBeTruthy();
} );

test( 'media is read in view context so Authors can load it', () => {
	store.featured = 5;
	store.media = { 5: att( 5, 400, 400 ) };
	store.mediaArgs = [];
	render( <Wrapped /> );
	expect( store.mediaArgs.length ).toBeGreaterThan( 0 );
	for ( const rest of store.mediaArgs ) {
		expect( rest[ 0 ]?.context ?? 'view' ).toBe( 'view' );
	}
} );

test( 'undo after saving does not re-open the adjuster', () => {
	store.featured = 0;
	store.media = { 7: att( 7, 400, 400 ), 107: att( 107, 800, 400, { _kmc_fif_source: 7 } ) };
	const { rerender } = render( <Wrapped /> );
	store.featured = 7;
	rerender( <Wrapped /> );
	fireEvent.click( screen.getByText( 'MODAL' ) );
	expect( editPost ).toHaveBeenCalledWith( { featured_media: 107 } );
	store.featured = 107;
	rerender( <Wrapped /> );
	store.featured = 7; // Ctrl+Z
	rerender( <Wrapped /> );
	expect( screen.queryByText( 'MODAL' ) ).toBeNull();
} );

test( 'a different new image still auto-opens after a save', () => {
	store.featured = 0;
	store.media = { 7: att( 7, 400, 400 ), 107: att( 107, 800, 400, { _kmc_fif_source: 7 } ), 8: att( 8, 300, 300 ) };
	const { rerender } = render( <Wrapped /> );
	store.featured = 7;
	rerender( <Wrapped /> );
	fireEvent.click( screen.getByText( 'MODAL' ) );
	store.featured = 107;
	rerender( <Wrapped /> );
	store.featured = 8;
	rerender( <Wrapped /> );
	expect( screen.getByText( 'MODAL' ) ).toBeTruthy();
} );
