import { useEffect, useRef, useState } from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';
import { Button } from '@wordpress/components';
import AdjustModal from './AdjustModal';
import { shouldAutoOpen } from './auto-open';

const settings = window.kmcFifSettings ?? {
	ratioW: 2,
	ratioH: 1,
	minWidth: 300,
	defaultColor: '#ffffff',
};

function AdjustControl() {
	const featuredId = useSelect( ( select ) => select( 'core/editor' ).getEditedPostAttribute( 'featured_media' ), [] );
	const media = useSelect(
		( select ) => ( featuredId ? select( 'core' ).getMedia( featuredId ) : null ),
		[ featuredId ]
	);
	const { editPost } = useDispatch( 'core/editor' );
	const [ open, setOpen ] = useState( false );
	const lastId = useRef( featuredId );
	const pending = useRef( null );
	// Originals already adjusted in this session: undo must not re-prompt.
	const handled = useRef( new Set() );

	// A newly chosen image is checked once its media record has loaded.
	useEffect( () => {
		if ( featuredId !== lastId.current ) {
			lastId.current = featuredId;
			pending.current = featuredId || null;
		}
		if ( pending.current && media?.id === pending.current ) {
			pending.current = null;
			if ( ! handled.current.has( media.id ) && shouldAutoOpen( media, settings ) ) {
				setOpen( true );
			}
		}
	}, [ featuredId, media ] );

	if ( ! featuredId ) {
		return null;
	}

	return (
		<>
			<Button variant="secondary" className="kmc-fif-open" disabled={ ! media } onClick={ () => setOpen( true ) }>
				Igazítás
			</Button>
			{ open && media && (
				<AdjustModal
					attachment={ media }
					settings={ settings }
					onClose={ () => setOpen( false ) }
					onDone={ ( id ) => {
						handled.current.add( media.meta?._kmc_fif_source || media.id );
						lastId.current = id;
						pending.current = null;
						setOpen( false );
						editPost( { featured_media: id } );
					} }
				/>
			) }
		</>
	);
}

export const withAdjust = ( Original ) =>
	function KmcFifFeaturedImage( props ) {
		return (
			<>
				<Original { ...props } />
				<AdjustControl />
			</>
		);
	};
