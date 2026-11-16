import { ratioMatches } from './geometry';

/** Open the adjuster unprompted only for a fresh image of the wrong ratio. */
export function shouldAutoOpen( attachment, settings ) {
	if ( attachment?.meta?._kmc_fif_source ) {
		return false;
	}
	const { width, height } = attachment?.media_details ?? {};
	if ( ! width || ! height ) {
		return false;
	}
	return ! ratioMatches( { width, height }, settings );
}
