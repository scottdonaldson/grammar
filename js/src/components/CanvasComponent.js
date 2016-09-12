import React from 'react';
import ReactDOM from 'react-dom';
import uuid from 'uuid';

class CanvasComponent extends React.Component {

	constructor() {
		super();

		this.state = {
			height: window.innerHeight,
			width: window.innerWidth,
			shapes: {},
			ovals: [],
			eyes: [],
			noses: [],
			mouths: []
		};
	}

	componentDidMount() {

		let t = 0; // time incrementer
		let s = 0; // slower than t
		const rate = 32;
		let mouseX, mouseY;
		let activeShape;

		let context = this.refs.canvas.getContext('2d');
		context.fillStyle = '#fff';
		const unit = 75;

		function _onResize() {
			this.setState({
				height: window.innerHeight,
				width: window.innerWidth
			});
		}

		function mid(pt1, pt2) {
			return { x: 0.5 * (pt2.x - pt1.x) + pt1.x, y: 0.5 * (pt2.y - pt1.y) + pt1.y };
		}
		
		function distance(pt1, pt2) {
			const xdiff = pt2.x - pt1.x;
			const ydiff = pt1.y - pt2.y;
			return Math.round(Math.sqrt(xdiff * xdiff + ydiff * ydiff));
		}

		// rotate pt2 about pt1 by angle
		function rotateAboutPoint(pt2, pt1, angle, log) {
			let p = { x: pt2.x, y: pt2.y }; // copy of pt2
			angle *= -1;
			const s = Math.sin(angle * Math.PI / 180);
			const c = Math.cos(angle * Math.PI / 180);

			p.x -= pt1.x;
			p.y -= pt1.y;

			const nx = p.x * c - p.y * s;
			const ny = p.x * s + p.y * c;

			p.x = nx + pt1.x;
			p.y = ny + pt1.y;

			return p;
		}

		const isOccupied = (pt) => {

			for ( var id in this.state.shapes ) {
			
				let shape = this.state.shapes[id];
				// console.log(Math.abs(shape.x - pt.x), Math.abs(shape.y - pt.y));
				if ( Math.abs(shape.x - pt.x) < unit / 2 && Math.abs(shape.y - pt.y) < unit / 2 ) return true;
			
			}

			return false;
		};

		function mouseLeftOrRight(shape) {
			let pt = rotateAboutPoint({ x: mouseX, y: mouseY }, shape, -shape.angle);
			return ( pt.x - shape.x <= 0 ) ? 'left' : 'right'; 
		}

		function mouseTopOrBottom(shape) {
			let pt = rotateAboutPoint({ x: mouseX, y: mouseY }, shape, -shape.angle);
			return ( pt.y - shape.y >= 0 ) ? 'bottom' : 'top';
		}

		const considerShape = (shape) => {

			if ( near({ x: mouseX, y: mouseY  }, { x: shape.x, y: shape.y }) ) {

				activeShape = shape;

				if ( shape.type === 'oval' ) {
				
					let possibility = 'oval';
					if ( s % 4 === 1 ) possibility = 'eye';
					if ( s % 4 === 2 ) possibility = 'mouth';
					if ( s % 4 === 3 ) possibility = 'nose';
					return shape.possibility = possibility;
				
				} else if ( shape.type === 'eye' ) {

					// if mouse is to "left" of center vertical axis (rotated by angle), then possibility is left
					let dir = mouseLeftOrRight(shape);
					let considerPt = { x: shape.x, y: shape.y };

					if ( dir === 'left' ) {
						if ( shape.left ) {
							// if mouse left and there is a left eye, considering a nose
							considerPt.x -= 0.75 * unit;
							considerPt.y += (mouseTopOrBottom(shape) === 'top' ? 1 : -1) * unit;
						} else {
							// if mouse left and no left eye, considering a left eye
							considerPt.x -= 1.5 * unit;
						}
					} else if ( dir === 'right' ) {
						if ( shape.right ) {
							considerPt.x += 0.75 * unit;
							considerPt.y += (mouseTopOrBottom(shape) === 'top' ? -1 : 1) * unit
						} else {
							considerPt.x += 1.5 * unit;
						}
					}

					considerPt = rotateAboutPoint(considerPt, shape, shape.angle);

					if ( isOccupied(considerPt) ) return delete shape.possibility; 

					// given if mouse left or right of eye, if there's an eye in that direction,
					// consider the pair of eyes
					if ( shape[dir] ) return shape.possibility = 'pair'; // i.e. eye.possibility = 'left' or 'right' 

					// if no eye in that direction, consider a new eye
					return shape.possibility = dir;
				
				} else if ( shape.type === 'mouth' ) {

					let considerPt = { x: shape.x, y: shape.y + unit };
					considerPt = rotateAboutPoint(considerPt, shape, shape.angle);

					if ( isOccupied(considerPt) ) return delete shape.possibility;

					return shape.possibility = mouseTopOrBottom(shape); // possibility is "top" or "bottom"

				} else if ( shape.type === 'nose' ) {

					let considerPt = { x: shape.x, y: shape.y };
					// embarrassing...
					let dir = mouseLeftOrRight(shape) === 'left' ? 'top' : 'bottom';
				
					if ( dir === 'bottom' ) {
						considerPt.y += unit;
						considerPt = rotateAboutPoint(considerPt, shape, shape.angle + 90);
						if ( isOccupied(considerPt) ) return delete shape.possibility;
					}

					return shape.possibility = dir; 
				
				}

			}

			delete shape.possibility;
		}

		function renderPreview(shape) {

			let x = Math.round(shape.x);
			let y = Math.round(shape.y);
			context.translate(x, y);
			context.rotate(-shape.angle * Math.PI / 180);

			let path = '/img/' + shape.type + '.png';
			let img = document.createElement('img');
			img.src = path;

			if ( shape.possibility ) {

				context.globalAlpha = 0.3;

				if ( shape.type === 'oval' ) {

					img.src = '/img/' + shape.possibility + '.png';
				
				} else if ( shape.type === 'eye' ) {
			
					// considering another eye to the left or right
					if ( shape.possibility !== 'pair' ) {	

						let posX = unit;
						
						if ( shape.possibility === 'left' ) posX *= -2;
					
						context.drawImage(img, posX, -unit / 2, unit, unit);

					// looking at an eye pair and considering a nose
					} else {
						
						let nose = document.createElement('img');
						nose.src = '/img/nose.png';
						let xDir = mouseLeftOrRight(shape);
						let posX = (xDir === 'left' ? -1 : 1) * 0.75 * unit;
						let yDir = mouseTopOrBottom(shape);
						let posY = (yDir === 'top' ? -1 : 1 ) * unit;
						
						context.translate(posX, posY);
						context.rotate((yDir === 'top' ? -1 : 1 ) * Math.PI / 2);
						context.drawImage(nose, -unit / 2, -unit / 2, unit, unit);
						context.rotate((yDir === 'top' ? 1 : -1 ) * Math.PI / 2);
						context.translate(-posX, -posY);
					}
				
				} else if ( shape.type === 'nose' ) {

					context.rotate(-Math.PI / 2);

					if ( shape.possibility === 'bottom' ) {

						let mouth = document.createElement('img');
						mouth.src = '/img/mouth.png';

						context.drawImage(mouth, -unit / 2, unit / 2, unit, unit);

					// previewing a pair of eyes
					} else {
						
						let eye = document.createElement('img');
						eye.src = '/img/eye.png';

						context.drawImage(eye, -1.25 * unit, -1.5 * unit, unit, unit);
						context.drawImage(eye, 0.25 * unit, -1.5 * unit, unit, unit);
					}

					context.rotate(Math.PI / 2);

				} else if ( shape.type === 'mouth' ) {

					let nose = document.createElement('img');
					nose.src = '/img/nose.png';

					if ( shape.possibility === 'bottom' && !shape['bottom'] ) {
						context.rotate(-Math.PI / 2);
						context.drawImage(nose, -1.5 * unit, -unit / 2, unit, unit);
						context.rotate(Math.PI / 2);	
					} else if ( shape.possibility === 'top' && !shape['top'] ) {
						context.rotate(Math.PI / 2);
						context.drawImage(nose, -1.5 * unit, -unit / 2, unit, unit);
						context.rotate(-Math.PI / 2);
					}
				
				}
			}

			context.globalAlpha = 1.0;

			context.drawImage(img, -unit / 2, -unit / 2, unit, unit);
			context.rotate(shape.angle * Math.PI / 180);
			context.translate(-x, -y);
		}

		const addShape = (type, x, y, angle = 0, data) => {
			
			let state = {};
			state[type + 's'] = this.state[type + 's'];

			state.shapes = this.state.shapes;

			let id = uuid.v4();
			state.shapes[id] = {
				type,
				x,
				y,
				angle,
				id
			};

			for (let d in data) {
				state.shapes[id][d] = data[d];
			}

			state[type + 's'].push(id);

			this.setState(state);

			return id;
		};

		const removeShape = id => {
			
			let state = this.state;
			let shape = state.shapes[id];
			let type = shape.type;

			// remove from both shapes and its type of shape (oval, eye, etc.)
			delete state.shapes[id];
			state[type + 's'] = state[type + 's'].filter(_id => _id !== id);

			this.setState(state);
		};

		let randomShape = () => {
			let i = 0;
			let generate = () => {
				i++;
				let pt = { 
					x: Math.random() * (this.state.width - 2 * unit) + unit,
				   	y: Math.random() * (this.state.height - 2 * unit) + unit
			   	};
				pt.x = Math.round(pt.x);
				pt.y = Math.round(pt.y);
				if ( i > 10000 ) alert('There appears to be no more space left!');
				if ( isOccupied(pt) ) return generate();
				return pt;
			}
			let pt = generate();
			addShape('oval', pt.x, pt.y, Math.round( Math.random() * 360 ));
		};

		let download = () => {
			let canvas = this.refs.canvas;
			let url = canvas.toDataURL(),
				a = document.createElement('a');
			a.href = url;
			a.download = 'shapegrammar.png';
			return a.click();
		};

		const _init = () => {
			randomShape(); 
			randomShape();
		};

		function near(pt1, pt2) {
			return Math.abs(pt2.x - pt1.x) <= unit * 0.5 && Math.abs(pt2.y - pt1.y) <= unit * 0.5; 
		}

		const _onMouseMove = (e) => {
			mouseX = e.pageX;
			mouseY = e.pageY;
		};

		const _onClick = (e) => {
			// need to double check that mouse is over activeShape
			if ( near({ x: mouseX, y: mouseY }, { x: activeShape.x, y: activeShape.y }) ) {

				if ( activeShape.type === 'oval' ) {

					addShape( activeShape.possibility, activeShape.x, activeShape.y, activeShape.angle );
					removeShape( activeShape.id );

				} else if ( activeShape.type === 'eye' ) {

					if ( activeShape.possibility === 'pair' ) {

						let xDir = mouseLeftOrRight(activeShape);
						let yDir = mouseTopOrBottom(activeShape);

						let otherEye = this.state.shapes[activeShape[xDir]];
						let eyes = [activeShape, otherEye];

						if ( yDir === 'top' && activeShape['top'] ) return;
						if ( yDir === 'bottom' && activeShape['bottom'] ) return;

						let x = activeShape.x + (xDir === 'right' ? 1 : -1) * 0.75 * unit;
						let y = activeShape.y + (yDir === 'top' ? -1 : 1) * unit;

						let pt = rotateAboutPoint( { x, y }, activeShape, activeShape.angle);

						let id = addShape('nose', pt.x, pt.y, activeShape.angle + (yDir === 'top' ? 1 : -1) * 90, { 'top': eyes });
						otherEye[yDir] = activeShape[yDir] = id; // eye.top or eye.bottom = nose ID
						return;
					}
				
					let x = activeShape.x + (activeShape.possibility === 'right' ? 1 : -1) * 1.5 * unit;
					let y = activeShape.y;
					let pt = rotateAboutPoint( { x, y }, activeShape, activeShape.angle);

					// add shape and set eye.left or eye.right to the new eye ID
					let id = addShape( 'eye', pt.x, pt.y, activeShape.angle);
					activeShape[activeShape.possibility] = id;
					// set new eye's left or right to the clicked-on eye ID
				    this.state.shapes[id][activeShape.possibility === 'left' ? 'right' : 'left'] = activeShape.id;	

					return;

				} else if ( activeShape.type === 'nose' ) {

					if ( activeShape.possibility === 'bottom' ) {
						
						let x = activeShape.x;
						let y = activeShape.y + unit;
						let pt = rotateAboutPoint( { x, y }, activeShape, activeShape.angle + 90);

						let id = addShape('mouth', pt.x, pt.y, activeShape.angle + 90, { 'top': activeShape.id });
						// now the nose has a mouth
						activeShape.mouth = id;

						// set a key mouth.top or mouth.bottom that is nose ID
						// let angle = this.state.shapes[id].angle;
						// this.state.shapes[id][angle - 90 === activeShape.angle ? 'top' : 'bottom'] = activeShape.id;

						return;
				
					} else if ( activeShape.possibility === 'top' ) {

						let x1 = activeShape.x - 0.75 * unit;
						let x2 = x1 + 1.5 * unit;
						let y = activeShape.y - unit;

						let pt1 = rotateAboutPoint( { x: x1, y }, activeShape, activeShape.angle + 90);
						let pt2 = rotateAboutPoint( { x: x2, y }, activeShape, activeShape.angle + 90);

						let eye1 = addShape('eye', pt1.x, pt1.y, activeShape.angle + 90);
						let eye2 = addShape('eye', pt2.x, pt2.y, activeShape.angle + 90);

						activeShape['top'] = [eye1, eye2];

						// now get the actual eyes and give them a bottom -- this nose ID
						eye1 = this.state.shapes[eye1];
						eye2 = this.state.shapes[eye2];

						eye1.right = eye2.id;
						eye2.left = eye1.id;
						eye1.bottom = eye2.bottom = activeShape.id;
					}
				} else if ( activeShape.type === 'mouth' ) {

					let dir = mouseTopOrBottom(activeShape);
					if ( dir === 'top' && activeShape['top'] ) return;
					if ( dir === 'bottom' && activeShape['bottom'] ) return;

					let x = activeShape.x;
					let y = activeShape.y + ( dir === 'bottom' ? 1 : -1 ) * unit;
					let pt = rotateAboutPoint( { x, y }, activeShape, activeShape.angle);

					let id = addShape('nose', pt.x, pt.y, activeShape.angle + ( dir === 'bottom' ? 1 : -1 ) * 90, { bottom: activeShape.id });
					// set a key mouth.top or mouth.bottom that is nose ID
					activeShape[mouseTopOrBottom(activeShape)] = id;

					return;
				}
			}
		};

		const _render = () => {
			
			context.clearRect(0, 0, this.state.width, this.state.height);
			context.fillStyle = '#fff';
			context.fillRect(0, 0, this.state.width, this.state.height);

			for ( let id in this.state.shapes ) considerShape(this.state.shapes[id]);
			for ( let id in this.state.shapes ) renderPreview(this.state.shapes[id]);

			t++;
			if ( t % rate === 0 ) s++;

			window.requestAnimationFrame(_render);
		};


		this.randomShape = randomShape;
		this.download = download;

		this.refs.canvas.addEventListener('mousemove', _onMouseMove);
		this.refs.canvas.addEventListener('click', _onClick);
		window.addEventListener('resize', _onResize.bind(this));
		_init();
		_render();
	}
	
	render() {

		let style = {
			display: 'block', 
			height: this.state.height,
			width: this.state.width 
		};

		let buttonStyle = {
			fontSize: 30,
			textAlign: 'center',
			fontFamily: 'sans',
			display: 'block',
			position: 'absolute',
			bottom: 20,
			left: 20,
			borderRadius: 25,
			border: '2px solid #000',
			height: 50,
			width: 50,
			background: '#fff',
			cursor: 'pointer'
		};

		let downloadStyle = Object.assign({}, buttonStyle);
		downloadStyle.left = 90;
		downloadStyle.backgroundImage = 'url(/img/download.png)';
		downloadStyle.backgroundSize = '100% 100%';

		return (
			<div style={style}>
				<canvas ref="canvas" style={style} width={this.state.width} height={this.state.height}></canvas>
				<div style={buttonStyle} onClick={this.randomShape}>+</div>
				<div style={downloadStyle} onClick={this.download}></div>
			</div>
		);
	}

}

export default CanvasComponent;
