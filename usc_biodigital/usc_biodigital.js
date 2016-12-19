//
// SAGE2 application: usc_biodigital
// by: Mark Utting <utting@usc.edu.au>
//
// Copyright (c) 2016
//

"use strict";

/* global HumanAPI */
var IFRAME_ID = 'embedded-human';
var PAN_STEP = 1.0;

var usc_biodigital = SAGE2_App.extend({
	init: function(data) {
		console.log('usc_biodigital> init with data', data, ' id=', data.id);
		// Create div into the DOM
		this.SAGE2Init("div", data);

		// load the BioDigital HumanAPI
		var s = document.createElement('script');
		s.type = 'text/javascript';
		s.src = 'https://developer.biodigital.com/builds/api/2/human-api.min.js';
		document.body.appendChild(s);

		// Set the DOM id
		this.element.id = "div_" + "usc_biodigital";
		console.log('usc_biodigital> init element ', this.element);
		// Set the background to black
		this.element.style.backgroundColor = 'black';
		var iframe = document.createElement('iframe');
		iframe.src = this.state.value;
		iframe.id = IFRAME_ID;
		iframe.width = data.width;
		iframe.height = data.height;
		this.element.appendChild(iframe);

		// initialise our own object state.
		this.currentZoom = 0.3;

		// move and resize callbacks
		this.resizeEvents = "continuous"; // onfinish
		// this.moveEvents   = "continuous";

		// SAGE2 Application Settings
		//
		// Control the frame rate for an animation application
		this.maxFPS = 2.0;
		// Not adding controls but making the default buttons available
		this.controls.finishedAddingControls();
		this.enableControls = true;
	},

	load: function(date) {
		console.log('usc_biodigital> Load with state value', this.state.value);
		this.refresh(date);
	},

	draw: function(date) {
		console.log('usc_biodigital> DRAW state value', this.state.value);
	},

	resize: function(date) {
		// Called when window is resized
		this.refresh(date);
	},

	move: function(date) {
		// Called when window is moved (set moveEvents to continuous)
		this.refresh(date);
	},

	quit: function() {
		// Make sure to delete stuff (timers, ...)
	},

	event: function(eventType, position, user_id, data, date) {
		console.log('usc_biodigital> eventType, pos, user_id, data, dragging',
				eventType, position, user_id, data, this.dragging);
		if (!('human' in this)) {
			this.human = new HumanAPI(IFRAME_ID);
			console.log('usc_biodigital> CREATED human:', this.human);
			var _this = this;
			this.human.send("camera.info", function(camera) {
				console.log("Gathering camera info:");
				console.log(JSON.stringify(camera));
				_this.currentZoom = camera.zoom;
			});
		}
		if (eventType === "pointerPress" && (data.button === "left")) {
			// click
			this.dragging = true;
			this.dragFromX = position.x;
			this.dragFromY = position.y;
		} else if (eventType === "pointerMove" && this.dragging) {
			// move (pan camera)
			var dx = position.x - this.dragFromX;
			var dy = position.y - this.dragFromY;
			this.human.send('camera.orbit', { yaw: dx, pitch: dy });
			this.dragFromX = position.x;
			this.dragFromY = position.y;
			console.log('usc_biodigital> camera.orbit!!', dx, dy);
			this.refresh(date);
		} else if (eventType === "pointerRelease" && (data.button === "left")) {
			// click release
			this.dragging = false;
		} else if (eventType === "pointerScroll") {
			// Scroll events for zoom
			this.zoomInOut(data.wheelDelta / 1000.0);
			this.refresh(date);
		} else if (eventType === "widgetEvent") {
			// widget events
		} else if (eventType === "keyboard") {
			if (data.character === "r") {
				this.human.send('camera.reset');
				this.refresh(date);
			}
		} else if (eventType === "specialKey") {
			if (data.code === 37 && data.state === "down") {
				// left
				this.human.send('camera.pan', { x: -PAN_STEP, y: 0.0 });
				console.log('usc_biodigital> camera.pan down');
				this.refresh(date);
			} else if (data.code === 38 && data.state === "down") {
				// up
				this.human.send('camera.pan', { x: 0.0, y: -PAN_STEP });
				console.log('usc_biodigital> camera.pan down');
				this.refresh(date);
			} else if (data.code === 39 && data.state === "down") {
				// right
				this.human.send('camera.pan', { x: PAN_STEP, y: 0.0 });
				console.log('usc_biodigital> camera.pan down');
				this.refresh(date);
			} else if (data.code === 40 && data.state === "down") {
				// down
				this.human.send('camera.pan', { x: 0.0, y: PAN_STEP });
				console.log('usc_biodigital> camera.pan down');
				this.refresh(date);
			}
		}
	},

	zoomInOut: function(delta) {
		// Zoom IN (positive delta) or OUT (negative delta)
		// Zoom levels are from 0.0 .. 1.0, so use small delta values!
		this.currentZoom = Math.max(0.0, Math.min(1.0, this.currentZoom + delta));
		this.human.send('camera.zoom', this.currentZoom);
		console.log('usc_biodigital> scroll to zoom', this.currentZoom);
	}
});
