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
		// Create div into the DOM
		this.SAGE2Init("div", data);
		this.data = data;
		

		this.addWidgetButtons();
		this.addFormButtons();
		
		// load the BioDigital HumanAPI
		var s = document.createElement('script');
		s.type = 'text/javascript';
		s.src = 'https://developer.biodigital.com/builds/api/2/human-api.min.js';
		document.body.appendChild(s);


		// Set the DOM id
		this.element.id = "div_" + "usc_biodigital";
		console.log('usc_biodigital> id=', this.id, 'init element=', this.element);
		

		// Set the background to black
		this.element.style.backgroundColor = '#ADD8E6';
		var iframe = document.createElement('iframe');
		iframe.src = this.state.value;
		iframe.id = IFRAME_ID + this.id;
		iframe.width = "100%"; //data.width;
		iframe.height = "100%"; // data.height;

		this.element.appendChild(iframe);
		this.humanIframe = iframe;

		// initialise our own object state.
		this.currentZoom = 0.3;

		// move and resize callbacks
		this.resizeEvents = "continuous"; // onfinish
		// this.moveEvents   = "continuous";

		// SAGE2 Application Settings
		//
		// Control the frame rate for an animation application
		this.maxFPS = 2.0;
	},

	// adding widget buttons
	addWidgetButtons: function() {
		// adding widget buttons
		this.controls.addButton({ label: "Start", identifier: "start", position: 4 });
		this.controls.addButton({ label: "Stop", identifier: "stop", position: 8 });
		this.controls.addButton({ label: "Pause", identifier: "pause", position: 12 });
		
		this.controls.finishedAddingControls();
		this.enableControls = true;
	},
		
	// adding buttons
	addWidgetButtons: function() {
		// adding widget buttons
		this.controls.addButton({ label: "Normal", identifier: "normal", position: 1 });
		this.controls.addButton({ label: "X-ray", identifier: "xray", position: 2 });
		this.controls.addButton({ label: "Isolate", identifier: "isolate", position: 3 });

		this.controls.addButton({ label: "Select", identifier: "select", position: 8 });
		this.controls.addButton({ label: "Dissect", identifier: "dissect", position: 9 });
				
		this.controls.finishedAddingControls();
		this.enableControls = true;
	},

	// adding form buttons
	addFormButtons: function() {
		//Views
		var div = document.createElement('div'); 
		
		var btnNormal = document.createElement('input');
		btnNormal.type = 'button';
		btnNormal.class = "btn";
		btnNormal.value = 'Normal';
		btnNormal.style.padding = '5px';
		btnNormal.onclick = this.btnNormalClick();
		div.appendChild(btnNormal);	
		
		var btnXRay = document.createElement('input');
		btnXRay.type = 'button';
		btnXRay.class = "btn";
		btnXRay.value = 'X-ray';
		btnXRay.style.padding = '5px';
		btnXRay.onclick = this.btnXRayClick();
		div.appendChild(btnXRay);	
		
		var btnIsolate = document.createElement('input');
		btnIsolate.type = 'button';
		btnIsolate.class = "btn";
		btnIsolate.value = 'Isolate';
		btnIsolate.style.padding = '5px';
		btnIsolate.onclick = this.btnIsolateClick();
		div.appendChild(btnIsolate);	
		
		this.element.appendChild(div);
		
		//Tools
		var div = document.createElement('div');
		var btnSelect = document.createElement('input');
		btnSelect.type = 'button';
		btnSelect.class = "btn";
		btnSelect.value = 'Select';
		btnSelect.onclick = this.btnSelectClick();
		div.appendChild(btnSelect);	
		
		var btnDissect = document.createElement('input');
		btnDissect.type = 'button';
		btnDissect.class = "btn";
		btnDissect.value = 'Dissect';
		btnDissect.onclick = this.btnDissectClick();
		div.appendChild(btnDissect);	
		
		this.element.appendChild(div);
	},
	
	btnNormalClick: function(){
		console.log('usc_biodigital> Normal Button');
	},

	btnXRayClick: function(){
		console.log('usc_biodigital> XRay Button');
	},
		
	btnIsolateClick: function(){
		console.log('usc_biodigital> Isolate Button');
	},
		
	btnDissectClick: function(){
		console.log('usc_biodigital> Dissect Button');
	},
		
	btnSelectClick: function(){
		console.log('usc_biodigital> Select Button');
	},	
						
	load: function(date) {
		console.log('usc_biodigital> Load with state value', this.state.value);
		this.refresh(date);
	},

	draw: function(date) {
	},

	resize: function(date) {
		// Called when window is resized
		var w = this.element.clientWidth;
		var h = this.element.clientHeight;

		//console.log('resize to',  w, h, this.element);
		//this.humanIframe.setAttribute("style", "width:" + w + "px");
		//this.humanIframe.setAttribute("style", "height:" + h + "px");
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
		//console.log('usc_biodigital> eventType, pos, user_id, data, dragging',
		//		eventType, position, user_id, data, this.dragging);
		if (!('human' in this)) {
			// NOTE: we append this.id so that each instance has a unique id.
			// Otherwise the second, third,... instances do not respond to events.
			this.human = new HumanAPI(IFRAME_ID + this.id);
			console.log('usc_biodigital> CREATED human:', this.human, 'this.id=', this.id);
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
			// console.log('usc_biodigital> camera.orbit!!', dx, dy);
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
				// console.log('usc_biodigital> camera.pan left');
				this.refresh(date);
			} else if (data.code === 38 && data.state === "down") {
				// up
				this.human.send('camera.pan', { x: 0.0, y: -PAN_STEP });
				// console.log('usc_biodigital> camera.pan up');
				this.refresh(date);
			} else if (data.code === 39 && data.state === "down") {
				// right
				this.human.send('camera.pan', { x: PAN_STEP, y: 0.0 });
				// console.log('usc_biodigital> camera.pan right');
				this.refresh(date);
			} else if (data.code === 40 && data.state === "down") {
				// down
				this.human.send('camera.pan', { x: 0.0, y: PAN_STEP });
				// console.log('usc_biodigital> camera.pan down');
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
