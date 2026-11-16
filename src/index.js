import { addFilter } from '@wordpress/hooks';
import { withAdjust } from './editor';
import './editor.css';

addFilter( 'editor.PostFeaturedImage', 'kmc-fif/adjust', withAdjust );
