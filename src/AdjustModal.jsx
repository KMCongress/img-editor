import { useEffect, useRef, useState, useCallback } from '@wordpress/element';
import { Button, ColorPicker, Modal, Notice, RangeControl, Spinner } from '@wordpress/components';
import { canvasSize, clampState, drawRect, initialState } from './geometry';
import { dominantEdgeColor } from './color';
import { renderTo, exportBlob, loadImage, outputMime, outputFilename } from './render';
import { resolveSource, uploadAdjusted } from './media';

const SAMPLE_MAX = 512;

function sampleColor( image, dims ) {
	try {
		const k = Math.min( 1, SAMPLE_MAX / Math.max( dims.width, dims.height ) );
		const w = Math.max( 1, Math.round( dims.width * k ) );
		const h = Math.max( 1, Math.round( dims.height * k ) );
		const el = document.createElement( 'canvas' );
		el.width = w;
		el.height = h;
		const ctx = el.getContext( '2d', { willReadFrequently: true } );
		if ( ! ctx ) {
			return null;
		}
		ctx.drawImage( image, 0, 0, w, h );
		return dominantEdgeColor( ctx.getImageData( 0, 0, w, h ).data, w, h );
	} catch ( e ) {
		return null;
	}
}

function sourceFilename( source ) {
	const path = source.media_details?.file || source.source_url || 'kep';
	return path.split( '?' )[ 0 ].split( '/' ).pop();
}

export default function AdjustModal( { attachment, settings, onDone, onClose } ) {
	const [ ready, setReady ] = useState( null ); // { source, image, dims, canvas, autoColor }
	const [ state, setState ] = useState( null );
	const [ busy, setBusy ] = useState( false );
	const [ error, setError ] = useState( null );
	const canvasRef = useRef();
	const drag = useRef( null );

	useEffect( () => {
		let live = true;
		( async () => {
			try {
				const { source, params } = await resolveSource( attachment );
				const image = await loadImage( source.source_url );
				const dims = {
					width: image.naturalWidth || image.width,
					height: image.naturalHeight || image.height,
				};
				const canvas = canvasSize( dims, settings );
				const autoColor = sampleColor( image, dims ) ?? settings.defaultColor;
				if ( ! live ) {
					return;
				}
				setReady( { source, image, dims, canvas, autoColor } );
				setState(
					params
						? { ...clampState( dims, canvas, params ), color: params.color || autoColor }
						: { ...initialState( dims, canvas ), color: autoColor }
				);
			} catch ( e ) {
				if ( live ) {
					setError( e?.message || 'A kép betöltése nem sikerült.' );
				}
			}
		} )();
		return () => {
			live = false;
		};
	}, [ attachment, settings ] );

	useEffect( () => {
		const ctx = canvasRef.current?.getContext?.( '2d' );
		if ( ready && state && ctx ) {
			renderTo( ctx, ready.image, ready.canvas, state );
		}
	}, [ ready, state ] );

	const update = useCallback(
		( next ) =>
			setState( ( prev ) => ( {
				...clampState( ready.dims, ready.canvas, { ...prev, ...next } ),
				color: next.color ?? prev.color,
			} ) ),
		[ ready ]
	);

	const onScale = ( percent ) => {
		const r = drawRect( ready.dims, ready.canvas, state );
		const scale = percent / 100;
		const n = drawRect( ready.dims, ready.canvas, { ...state, scale } );
		update( {
			scale,
			x: r.x + r.width / 2 - n.width / 2,
			y: r.y + r.height / 2 - n.height / 2,
		} );
	};

	const onPointerDown = ( e ) => {
		const el = canvasRef.current;
		el.setPointerCapture?.( e.pointerId );
		drag.current = {
			px: e.clientX,
			py: e.clientY,
			x: state.x,
			y: state.y,
			k: ready.canvas.width / ( el.clientWidth || ready.canvas.width ),
		};
	};
	const onPointerMove = ( e ) => {
		const d = drag.current;
		if ( d ) {
			update( { x: d.x + ( e.clientX - d.px ) * d.k, y: d.y + ( e.clientY - d.py ) * d.k } );
		}
	};
	const onPointerUp = () => {
		drag.current = null;
	};

	const save = async () => {
		setBusy( true );
		setError( null );
		try {
			const mime = outputMime( ready.source.mime_type );
			const blob = await exportBlob( ready.image, ready.canvas, state, mime );
			const params = { scale: state.scale, x: state.x, y: state.y, color: state.color };
			const created = await uploadAdjusted(
				blob,
				// A browser that cannot encode the requested type returns PNG.
				outputFilename( sourceFilename( ready.source ), outputMime( blob.type || mime ) ),
				ready.source,
				params
			);
			onDone( created.id );
		} catch ( e ) {
			setError( e?.message || 'A mentés nem sikerült.' );
			setBusy( false );
		}
	};

	return (
		<Modal
			title="Kiemelt kép igazítása"
			onRequestClose={ onClose }
			className="kmc-fif-modal"
			size="large"
		>
			{ error && (
				<Notice status="error" isDismissible={ false }>
					{ error }
				</Notice>
			) }
			{ ! ready || ! state ? (
				! error && <Spinner />
			) : (
				<div className="kmc-fif-body">
					<div className="kmc-fif-preview">
						<canvas
							ref={ canvasRef }
							width={ ready.canvas.width }
							height={ ready.canvas.height }
							onPointerDown={ onPointerDown }
							onPointerMove={ onPointerMove }
							onPointerUp={ onPointerUp }
							onPointerCancel={ onPointerUp }
						/>
						<p className="kmc-fif-caption">
							{ `Így jelenik meg a hírlistában: ${ ready.canvas.width }×${ ready.canvas.height } px, ${ settings.ratioW }:${ settings.ratioH }` }
						</p>
					</div>
					<div className="kmc-fif-controls">
						<RangeControl
							__nextHasNoMarginBottom
							__next40pxDefaultSize
							label="Méret"
							value={ Math.round( state.scale * 100 ) }
							min={ 10 }
							max={ 100 }
							onChange={ ( v ) => onScale( v ?? 100 ) }
						/>
						<p className="kmc-fif-label">Háttérszín</p>
						<ColorPicker
							color={ state.color }
							enableAlpha={ false }
							onChange={ ( color ) => update( { color } ) }
						/>
						<Button variant="link" onClick={ () => update( { color: ready.autoColor } ) }>
							Automatikus
						</Button>
					</div>
				</div>
			) }
			<div className="kmc-fif-actions">
				<Button
					variant="tertiary"
					disabled={ ! ready || busy }
					onClick={ () =>
						setState( { ...initialState( ready.dims, ready.canvas ), color: ready.autoColor } )
					}
				>
					Alaphelyzet
				</Button>
				<Button variant="secondary" onClick={ onClose } disabled={ busy }>
					Mégse
				</Button>
				<Button variant="primary" onClick={ save } isBusy={ busy } disabled={ ! ready || ! state || busy }>
					Mentés és beállítás kiemelt képként
				</Button>
			</div>
		</Modal>
	);
}
