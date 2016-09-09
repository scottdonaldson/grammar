import React from 'react';
import ReactDOM from 'react-dom';

import CanvasComponent from './components/CanvasComponent';

console.log('about to render canvas component');

ReactDOM.render(
	<CanvasComponent />,
	document.getElementById('canvas')
);
