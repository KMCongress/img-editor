import apiFetch from '@wordpress/api-fetch';

/**
 * Original image and saved parameters for an attachment. An adjusted image
 * points back to its original, so re-adjusting never stacks padding.
 */
export async function resolveSource( attachment ) {
	const sourceId = attachment.meta?._kmc_fif_source;
	if ( ! sourceId ) {
		return { source: attachment, params: null };
	}
	try {
		// View context: Authors may not read others' media in edit context.
		const source = await apiFetch( { path: `/wp/v2/media/${ sourceId }` } );
		return { source, params: attachment.meta._kmc_fif_params ?? null };
	} catch ( e ) {
		// Only a deleted original falls back; anything else must not silently
		// make the adjusted image its own source (padding would stack).
		if ( e?.code === 'rest_post_invalid_id' ) {
			return { source: attachment, params: null };
		}
		throw e;
	}
}

/** Upload the adjusted image as a new attachment linked to its original. */
export async function uploadAdjusted( blob, filename, source, params ) {
	const body = new FormData();
	body.append( 'file', new File( [ blob ], filename, { type: blob.type } ) );
	const created = await apiFetch( { path: '/wp/v2/media', method: 'POST', body } );

	return apiFetch( {
		path: `/wp/v2/media/${ created.id }?context=edit`,
		method: 'POST',
		data: {
			alt_text: source.alt_text ?? '',
			meta: { _kmc_fif_source: source.id, _kmc_fif_params: params },
		},
	} );
}
