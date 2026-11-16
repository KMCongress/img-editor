// @vitest-environment jsdom
import { test, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

const store = { featured: 0, media: {} };
const editPost = vi.fn();
vi.mock( '@wordpress/data', () => ( {
	useSelect: ( fn ) =>
		fn( ( name ) =>
			name === 'core/editor'
				? { getEditedPostAttribute: () => store.featured }
				: { getMedia: ( id ) => store.media[ id ] ?? null }
		),
	useDispatch: () => ( { editPost } ),
} ) );
vi.mock( '../AdjustModal', () => ( { default: () => <div>MODAL</div> } ) );

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
