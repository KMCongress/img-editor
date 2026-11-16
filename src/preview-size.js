/**
 * The featured-image panel falls back to the `thumbnail` size when `large`
 * does not exist (images under 1024 px). `thumbnail` is a square hard crop,
 * which cuts off exactly the padding this plugin adds — the adjusted image
 * then looks unchanged. `medium` keeps the aspect ratio.
 */
export function previewImageSize( size ) {
	return size === 'thumbnail' ? 'medium' : size;
}
