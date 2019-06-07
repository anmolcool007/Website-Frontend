;( function( window ) {
	
	'use strict';
	
	var docElem = window.document.documentElement,
		transEndEventNames = {
			'WebkitTransition': 'webkitTransitionEnd',
			'MozTransition': 'transitionend',
			'OTransition': 'oTransitionEnd',
			'msTransition': 'MSTransitionEnd',
			'transition': 'transitionend'
		},
		transEndEventName = transEndEventNames[ Modernizr.prefixed( 'transition' ) ],
		support = { transitions : Modernizr.csstransitions };
	function getViewport( axis ) {
		var client, inner;
		if( axis === 'x' ) {
			client = docElem['clientWidth'];
			inner = window['innerWidth'];
		}
		else if( axis === 'y' ) {
			client = docElem['clientHeight'];
			inner = window['innerHeight'];
		}
		
		return client < inner ? inner : client;
	}
	function extend( a, b ) {
		for( var key in b ) { 
			if( b.hasOwnProperty( key ) ) {
				a[key] = b[key];
			}
		}
		return a;
	}
	function DragSlideshow( el, options ) {	
		this.el = el;
		this.options = extend( {}, this.options );
		extend( this.options, options );
		this._init();
	}
	DragSlideshow.prototype.options = {
		perspective : '1200',
		slideshowRatio : 0.3, // between: 0,1
		onToggle : function() { return false; },
		onToggleContent : function() { return false; },
		onToggleContentComplete : function() { return false; }
	}
	DragSlideshow.prototype._init = function() {
		var self = this;
		this.current = 0;
		this.isFullscreen = true;
		this.imgDragger = this.el.querySelector( 'section.dragdealer' );
		this.handle = this.imgDragger.querySelector( 'div.handle' );
		this.slides = [].slice.call( this.handle.children );
		this.slidesCount = this.slides.length;		
		if( this.slidesCount < 1 ) return;
		this.slideshowRatio = this.options.slideshowRatio;
		classie.add( this.slides[ this.current ], 'current' );
		this.pages = this.el.querySelector( 'section.pages' );
		this.handle.style.width = this.slidesCount * 100 + '%';
		this.slides.forEach( function( slide ) {
			slide.style.width = 100 / self.slidesCount + '%';
		} );
		this._initDragDealer();
		this._initEvents();
	}
	DragSlideshow.prototype._initEvents = function() {
		var self = this;
		
		this.slides.forEach( function( slide ) {
			slide.addEventListener( 'click', function() {
				if( self.isFullscreen || self.dd.activity || self.isAnimating ) return false;
				
				if( self.slides.indexOf( slide ) === self.current ) {
					self.toggle();
				}
				else {
					self.dd.setStep( self.slides.indexOf( slide ) + 1 );
				}
			} );
			slide.querySelector( 'button.content-switch' ).addEventListener( 'click', function() { self._toggleContent( slide ); } );
		} );
		document.addEventListener( 'keydown', function( ev ) {
			var keyCode = ev.keyCode || ev.which,
				currentSlide = self.slides[ self.current ];

			if( self.isContent ) {
				switch (keyCode) {
					// up key
					case 38:
						// only if current scroll is 0:
						if( self._getContentPage( currentSlide ).scrollTop === 0 ) {
							self._toggleContent( currentSlide );
						}
						break;
				}
			}
			else {
				switch (keyCode) {
					case 40:
						if( !self.isFullscreen ) return;
						self._toggleContent( currentSlide );
						break;
					case 37:
						self.dd.setStep( self.current );
						break;
					case 39:
						self.dd.setStep( self.current + 2 );
						break;
				}
			}
		} );
	}

	DragSlideshow.prototype._getContentPage = function( slide ) {
		return this.pages.querySelector( 'div.content[data-content = "' + slide.getAttribute( 'data-content' ) + '"]' );
	}
	DragSlideshow.prototype._toggleContent = function( slide ) {
		if( this.isAnimating ) {
			return false;
		}
		this.isAnimating = true;
		this.options.onToggleContent();
		var page = this._getContentPage( slide );
		if( this.isContent ) {
			this.dd.enable();
			classie.remove( this.el, 'show-content' );
		}
		else {
			page.scrollTop = 0;
			this.dd.disable();
			classie.add( this.el, 'show-content' );	
			classie.add( page, 'show' );
		}

		var self = this,
			onEndTransitionFn = function( ev ) {
				if( support.transitions ) {
					if( ev.propertyName.indexOf( 'transform' ) === -1 || ev.target !== this ) return;
					this.removeEventListener( transEndEventName, onEndTransitionFn );
				}
				if( self.isContent ) {
					classie.remove( page, 'show' );	
				}
				self.isContent = !self.isContent;
				self.isAnimating = false;
				// callback
				self.options.onToggleContentComplete();
			};

		if( support.transitions ) {
			this.el.addEventListener( transEndEventName, onEndTransitionFn );
		}
		else {
			onEndTransitionFn();
		}
	}
	DragSlideshow.prototype._initDragDealer = function() {
		var self = this;
		this.dd = new Dragdealer( this.imgDragger, {
			steps: this.slidesCount,
			speed: 0.4,
			loose: true,
			requestAnimationFrame : true,
			callback: function( x, y ) {
				self._navigate( x, y );
			}
		});
	}
	DragSlideshow.prototype._navigate = function( x, y ) {
		classie.remove( this.slides[ this.current || 0 ], 'current' );
		this.current = this.dd.getStep()[0] - 1;
		classie.add( this.slides[ this.current ], 'current' );
	}
	DragSlideshow.prototype.toggle = function() {
		if( this.isAnimating ) {
			return false;
		}
		this.isAnimating = true;
		this._preserve3dSlides( true );
		this.options.onToggle();
		classie.remove( this.el, this.isFullscreen ? 'switch-max' : 'switch-min' );
		classie.add( this.el, this.isFullscreen ? 'switch-min' : 'switch-max' );
		
		var self = this,
			p = this.options.perspective,
			r = this.options.slideshowRatio,
			zAxisVal = this.isFullscreen ? p - ( p / r ) : p - p * r;

		this.imgDragger.style.WebkitTransform = 'perspective(' + this.options.perspective + 'px) translate3d( -50%, -50%, ' + zAxisVal + 'px )';
		this.imgDragger.style.transform = 'perspective(' + this.options.perspective + 'px) translate3d( -50%, -50%, ' + zAxisVal + 'px )';

		var onEndTransitionFn = function( ev ) {
			if( support.transitions ) {
				if( ev.propertyName.indexOf( 'transform' ) === -1 ) return;
				this.removeEventListener( transEndEventName, onEndTransitionFn );
			}

			if( !self.isFullscreen ) {
				self._preserve3dSlides();
			}
			classie.remove( this, self.isFullscreen ? 'img-dragger-large' : 'img-dragger-small' );
			classie.add( this, self.isFullscreen ? 'img-dragger-small' : 'img-dragger-large' );
			self.imgDragger.style.WebkitTransform = 'translate3d( -50%, -50%, 0px )';
			self.imgDragger.style.transform = 'translate3d( -50%, -50%, 0px )';
			this.style.width = self.isFullscreen ? self.options.slideshowRatio * 100 + '%' : '100%';
			this.style.height = self.isFullscreen ? self.options.slideshowRatio * 100 + '%' : '100%';
			self.dd.reflow();
			self.isFullscreen = !self.isFullscreen;
			
			self.isAnimating = false;
		};

		if( support.transitions ) {
			this.imgDragger.addEventListener( transEndEventName, onEndTransitionFn );
		}
		else {
			onEndTransitionFn();
		}
	}
	DragSlideshow.prototype._preserve3dSlides = function( add ) {
		this.slides.forEach( function( slide ) {
			slide.style.transformStyle = add ? 'preserve-3d' : '';
		});
	}
	window.DragSlideshow = DragSlideshow;

} )( window );