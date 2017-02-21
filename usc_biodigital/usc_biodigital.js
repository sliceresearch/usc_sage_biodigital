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
		
		this.tool = "default"; // default tool
		
		// load the BioDigital HumanAPI
		var s = document.createElement('script');
		s.type = 'text/javascript';
		s.src = 'https://developer.biodigital.com/builds/api/2/human-api.min.js';
		document.body.appendChild(s);

		// Set the DOM id
		this.element.id = "div_" + "usc_biodigital";
		console.log('usc_biodigital> id=', this.id, 'init element=', this.element);
		
		// adding an svg to the element
		this.container = d3.select(this.element)
			.append("svg")
			.attr("id", "biodigitalSVG")
			.attr("width", this.element.clientWidth)
			.attr("height", 100);

		// generate the interface of the usc_biodigital
		this.createBioInterface();		
		this.addWidgetButtons();
		
		// Set the background to black
		this.element.style.backgroundColor = '#ADD8E6';
		var iframe = document.createElement('iframe');
		iframe.src = this.state.value;
		iframe.id = IFRAME_ID + this.id;
		iframe.width = "100%"; //data.width;
		iframe.height =  data.height - 100;

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

	// functionused to create the interface of the timer
	createBioInterface: function() {
		// clear the current svg
		this.container.selectAll("*").remove();

		// setting the number of rows, cols and the padding size of the table
		var nRows   = 3;
		var nCols   = 4;
		var padding = 3;

		// setting the image path
		var path = this.resrcPath + "/img/";

		// creating the model of the interface that will be given and interpreted by d3 to create the interface
		this.modelInterface = [
			{ name: "Normal", command: "true", parent: this, action: this.btnNormalClick, text: "Normal", r: 0, c: 0, cSpan: 1, rSpan: 1 },
			{ name: "XRay", command: "true", parent: this, action: this.btnXRayClick, text: "X-Ray", r: 0, c: 1, cSpan: 1, rSpan: 1 },
			{ name: "Isolate", command: "true", parent: this, action: this.btnIsolateClick, text: "Isolate", r: 0, c: 2, cSpan: 1, rSpan: 1 },
			{ name: "SelectGroup", command: "true", parent: this, action: this.btnSelectGroupClick, text: "Select Group", r: 0, c: 3, cSpan: 1, rSpan: 1 },

			{ name: "Select", command: "true", parent: this, action: this.btnSelectClick, text: "Select", r: 1, c: 0, cSpan: 1, rSpan: 1 },
			{ name: "Dissect", command: "true", parent: this, action: this.btnDissectClick, text: "Dissect", r: 1, c: 1, cSpan: 1, rSpan: 1 },
			{ name: "Annotate", command: "true", parent: this, action: this.btnAnnotateClick, text: "Annotate", r: 1, c: 2, cSpan: 1, rSpan: 1 },
			{ name: "Reset", command: "true", parent: this, action: this.btnResetClick, text: "Reset", r: 1, c: 3, cSpan: 1, rSpan: 1 },
				
			{ name: "Play", command: "true", parent: this, action: this.playAnimation, image: path + "play.png", text: "play", r: 2, c: 0, cSpan: 1, rSpan: 1 },
			{ name: "Pause", command: "true", parent: this, action: this.pauseAnimation, image: path + "pause.png", text: "pause", r: 2, c: 1, cSpan: 1, rSpan: 1 },
			{ name: "Previous", command: "true", parent: this, action: this.previousChapter, image: path + "previous.png", text: "previous", r: 2, c: 2, cSpan: 1, rSpan: 1 },
			{ name: "Next", command: "true", parent: this, action: this.nextChapter, image: path + "next.png", text: "next", r: 2, c: 3, cSpan: 1, rSpan: 1 }
		];

		// getting the height and width of the current container
		var w = parseInt(this.container.style("width"));
		var h = parseInt(this.container.style("height"));

		// calculating the heght and width of a single col and row
		var colW = (w - ((nCols + 2) * padding)) / nCols;
		var rowH = (h - ((nRows) * padding)) / nRows;

		// setting default stroke and background variables
		var defaultBg = "#77DD77";
		var defaultStroke = "white";

		// iterate over the interface model and generates every single item specified before
		for (var i in this.modelInterface) {

			// getting the styles contained into the model for the current item.
			// If a style is not specified, it is set to the default value
			var elem   = this.modelInterface[i];
			var rSpan  = elem.rSpan || 1;
			var cSpan  = elem.cSpan || 1;
			var bg     = elem.backgroundColor || defaultBg;
			var stroke = elem.stroke || defaultStroke;

			// calculate the actual size with respect to the proportions specified in the model
			var x = elem.c * (colW + padding) + padding;
			var y = elem.r * (rowH + padding) + padding;
			var elemH = rowH * rSpan + (rSpan - 1) * padding;
			var elemW = colW * cSpan + (cSpan - 1) * padding;

			elem.y = y;
			elem.h = elemH;
			elem.x = x;
			elem.w = elemW;

			// generating the svg item with the specified properties and styles
			this.container
				.append("rect")
				.attr("id", elem.name)
				.attr("fill", bg)
				.attr("x", x)
				.attr("y", y)
				.attr("width", elemW)
				.attr("height", elemH)
				.style("stroke", stroke);

			// adding special attribute
			if (elem.text) {
				var t = this.container.append("text")
					.attr("x", x + elem.w / 2)
					.attr("y", y + elem.h / 2)
					.style("dominant-baseline", "middle")
					.style("text-anchor", "middle")
					.style("font-size", "24px")
					.text(elem.text);
			}

			// inserting the image, if present in the model
			if (elem.image) {
				this.container
					.append("image")
					.attr("fill", bg)
					.attr("x", x + 20)
					.attr("y", y + 5)
					.attr("width", 20)
					.attr("height", 20)
					.attr("xlink:href", elem.image);
			}
		}
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
	
	btnNormalClick: function(){
		console.log('usc_biodigital> Normal Button');
		this.parent.human.send( 'scene.disableXray');
		this.parent.human.send("scene.selectionMode", "highlight");
	},

	btnXRayClick: function(){
		console.log('usc_biodigital> XRay Button');
		this.parent.human.send( 'scene.enableXray');
	},
		
	btnIsolateClick: function(){
		console.log('usc_biodigital> Isolate Button');
		this.parent.human.send("scene.selectionMode", "isolate");
	},

	btnSelectGroupClick: function(){
		this.parent.tool = "highlight"; // select mode
		console.log('usc_biodigital> Select Group');
		this.parent.selectGroup();
	},
		
	btnDissectClick: function(){
		this.parent.tool = "dissect"; // dissect
		console.log('usc_biodigital> Dissect Button');
		this.parent.changeTool();
		
	},
		
	btnSelectClick: function(){
		this.parent.tool = "highlight"; // select
		console.log('usc_biodigital> Select Button');
		this.parent.changeTool();
	},	
		
	btnAnnotateClick: function(){
		this.parent.tool = "annotate"; // select
		console.log('usc_biodigital> Annotate Button');
		this.parent.human.send("input.enable");
		this.parent.changeTool();
	},
		
	changeTool: function(){
		var _this = this;
		_this.human.send("scene.pickingMode", _this.tool);
	    console.log("PICK");
	    
	    _this.human.on("scene.pickingModeUpdated", function(event) {
			console.log("Enabling " + event.pickingMode + " mode. Click to " + event.pickingMode + " an object");
		});
	},

	selectGroup: function(){
		var _this = this;
		_this.changeTool();
		_this.human.send("scene.selectionMode", _this.tool);
		    	
	    _this.human.on("scene.selectionModeUpdated", function(event) {
			console.log("Enabling " + event.selectionMode + " mode. Click to " + event.selectionMode + " an object");
		});
	},

	playAnimation: function(){
		var _this = this;
		_this.human.send("timeline.play", { loop: true });
	},

	pauseAnimation: function(){
		var _this = this;
		_this.human.send("timeline.pause", { loop: true });
	},
		
	nextChapter: function(){
		var _this = this;
		_this.human.send("timeline.nextChapter");		    	
	},

	previousChapter: function(){
		var _this = this;
		_this.human.send("timeline.previousChapter");
	},
							
	btnResetClick: function(){
		this.parent.tool = "default"; // select
		console.log('usc_biodigital> Select Button');
		this.parent.human.send( 'scene.reset');
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
		var h = this.element.clientHeight - 100;
		
		this.container
			.attr("width",  this.element.clientWidth)
			.attr("height", 100);
		
		this.createBioInterface();
		//console.log('resize to',  w, h, this.element);
		this.humanIframe.setAttribute("style", "width:" + w + "px");
		this.humanIframe.setAttribute("style", "height:" + h + "px");
		this.refresh(date);
	},

	move: function(date) {
		// Called when window is moved (set moveEvents to continuous)
		this.refresh(date);
	},

	quit: function() {
		// Make sure to delete stuff (timers, ...)
	},

	// function used to invoke button actions
	leftClickPosition: function(x, y) {
		// setting the feedback button color
		var pressedColor = "white";
		var defaultBg    = "#77DD77";

		// taking a reference of the main object
		var _this = this;

		// iterating over the model trying to understand if a button was pressed
		for (var i in this.modelInterface) {
			var elem = this.modelInterface[i];

			// check if the click is within the current button
			if (elem.action && y >= elem.y & y <= elem.y + elem.h & x >= elem.x & x <= elem.x + elem.w) {
				// if the button is clickable, generates a color transition feedback
				if (elem.command) {
					var oldColor = elem.backgroundColor || defaultBg;
					d3.select("#" + elem.name).attr("fill", pressedColor).transition().duration(500).attr("fill", oldColor);
				}

				// invoke the button action passing the reference of the main object
				elem.action(_this);
			}
		}

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
			console.log("TEST x:" + position.x + " y: " + position.y);	
			this.leftClickPosition(position.x, position.y);
			var _this = this;
			var posY = position.y - 100;
			// click
			if (this.tool ==  "default"){
				this.dragging = true;
				this.dragFromX = position.x;
				this.dragFromY = position.y;
			} else {
		    /*	
		    	_this.human.send("scene.pick", { x: position.x, y: posY},
			        function (hit) {
			            if (hit) {
			            	var obj = JSON.parse(JSON.stringify(hit))
			            	var str = obj.objectId;
			            	_this.human.send("scene.selectObjects", {
								str: true
    						});
			                console.log("Hit: " + JSON.stringify(hit));
			            } else {
			                console.log("Miss");
			            }
			        });*/
			    _this.human.send("scene.pick", { x: position.x, y: posY, triggerActions: true});

			}
		} else if (eventType === "pointerMove" && this.dragging) {
			if (this.tool ==  "default"){
				// move (pan camera)
				var dx = position.x - this.dragFromX;
				var dy = position.y - this.dragFromY;
				this.human.send('camera.orbit', { yaw: dx, pitch: dy });
				this.dragFromX = position.x;
				this.dragFromY = position.y;
				// console.log('usc_biodigital> camera.orbit!!', dx, dy);
				this.refresh(date);
			}
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
