import { addFilter } from '@wordpress/hooks';
import { withAdjust } from './editor';
import { previewImageSize } from './preview-size';
import './editor.css';

addFilter( 'editor.PostFeaturedImage', 'kmc-fif/adjust', withAdjust );
addFilter( 'editor.PostFeaturedImage.imageSize', 'kmc-fif/preview-size', previewImageSize );
