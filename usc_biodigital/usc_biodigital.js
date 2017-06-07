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
		console.log('usc_biodigital> id=', this.id, 'init element=', this.element,
		    'w=', this.element.clientWidth, 'h=', this.element.clientHeight);
		
		/*
		// adding an svg to the element
		this.container = d3.select(this.element)
			.append("svg")
			.attr("id", "biodigitalSVG")
			.attr("width", this.element.clientWidth)
			.attr("height", 0.1 * this.element.clientHeight);
		*/
		
		// generate the interface of the usc_biodigital
		//this.createBioInterface();
		this.addWidgetButtons();

		// Set the background to black
		this.element.style.backgroundColor = '#ADD8E6';			
		
		var iframe = document.createElement('iframe');
		iframe.src = this.state.value;
		iframe.id = IFRAME_ID + this.id;
		iframe.width =  '100%';
		iframe.height =  '100%';//data.height - 0.1 * this.element.clientHeight - 6;
		iframe.setAttribute("style", "float:left");

		this.element.appendChild(iframe);
		this.humanIframe = iframe;
						
		this.activeButtonGroup1 = null;
		this.activeButtonGroup2 = null;
		this.activeButtonGroup3 = null;
		this.humanQuiz = null;
		this.isQuiz = false;
		this.window = 0.0;
		this.interval = 0;
		this.h = 0;
		this.m = 0;
		this.s = 0;
		this.missed = -1;
		this.numQuestions = 0;
		this.correctAnswers = 0;
		this.lenName = 0;

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
		var nRows   = 4;
		var nCols   = 4;
		var padding = 3;

		// setting the image path
		var path = this.resrcPath + "/img/";

		// creating the model of the interface that will be given and interpreted by d3 to create the interface
		this.modelInterface = [
			{ name: "Quiz" + this.id, command: "true", group: 0, parent: this, action: this.btnQuizClick, text: "Quiz", r: 0, c: 3, cSpan: 1, rSpan: 1 },
			
			{ name: "Normal" + this.id, command: "true", group: 1, parent: this, action: this.btnNormalClick, text: "Normal", r: 1, c: 0, cSpan: 1, rSpan: 1 },
			{ name: "XRay" + this.id, command: "true", group: 1, parent: this, action: this.btnXRayClick, text: "X-Ray", r: 1, c: 1, cSpan: 1, rSpan: 1 },
			{ name: "Isolate" + this.id, command: "true", group: 1, parent: this, action: this.btnIsolateClick, text: "Isolate", r: 1, c: 2, cSpan: 1, rSpan: 1 },
			{ name: "SelectGroup" + this.id, command: "true", group: 1, parent: this.id, action: this.btnSelectGroupClick, text: "Select Group", r: 1, c: 3, cSpan: 1, rSpan: 1 },

			{ name: "Select" + this.id, command: "true", group: 2, parent: this, action: this.btnSelectClick, text: "Select", r: 2, c: 0, cSpan: 1, rSpan: 1 },
			{ name: "Dissect" + this.id, command: "true", group: 2, parent: this, action: this.btnDissectClick, text: "Dissect", r: 2, c: 1, cSpan: 1, rSpan: 1 },
			{ name: "Annotate" + this.id, command: "true", group: 2, parent: this, action: this.btnAnnotateClick, text: "Annotate", r: 2, c: 2, cSpan: 1, rSpan: 1 },
			{ name: "Reset" + this.id, command: "true", group: 2, parent: this, action: this.btnResetClick, text: "Reset", r: 2, c: 3, cSpan: 1, rSpan: 1 },
				
			{ name: "Play" + this.id, command: "true", group: 3, parent: this, action: this.playAnimation, image: path + "play.png", text: "play", r: 3, c: 0, cSpan: 1, rSpan: 1 },
			{ name: "Pause" + this.id, command: "true", group: 3, parent: this, action: this.pauseAnimation, image: path + "pause.png", text: "pause", r: 3, c: 1, cSpan: 1, rSpan: 1 },
			{ name: "Previous" + this.id, command: "true", group: 3, parent: this, action: this.previousChapter, image: path + "previous.png", text: "previous", r: 3, c: 2, cSpan: 1, rSpan: 1 },
			{ name: "Next" + this.id, command: "true", group: 3, parent: this, action: this.nextChapter, image: path + "next.png", text: "next", r: 3, c: 3, cSpan: 1, rSpan: 1 }
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
					.style("font-size", elem.h * 2 / 3 + "px")
					.text(elem.text);
			}

			// inserting the image, if present in the model
		/*	if (elem.image) {
				this.container
					.append("image")
					.attr("fill", bg)
					.attr("x", x + 20)
					.attr("y", y + 5)
					.attr("width", elem.h - 5)
					.attr("height", elem.h - 5)
					.attr("xlink:href", elem.image);
			}*/
		}
	},
		
	// adding buttons
	addWidgetButtons: function() {
		// adding widget buttons
		
		
		this.controls.addButton({type: "reset", position: 10, identifier: "Reset", label: "Reset"});
		this.controls.addButton({type: "quiz", position: 4, identifier: "Quiz", Label: "Quiz"});
		this.controls.addButton({type: "play", position: 1, identifier: "PlayButton", label: "Play"});
		this.controls.addButton({type: "play-pause", position: 2, identifier: "play-pause"});
		this.controls.addButton({type: "next", position: 6, identifier: "Next"});
		this.controls.addButton({type: "prev", position: 7, identifier: "Prev"});

		this.viewTypeRadioButton = this.controls.addRadioButton({identifier: "ViewType",
			label: "View",
			options: ["Norm", "X-ray", "Iso"],
			default: "Norm"
		});

		//Would like to add pan in future
		this.pointerTypeRadioButton = this.controls.addRadioButton({identifier: "PointerType",
			label: "Pointer",
			options: ["Sel", "Dis", "Rota"],
			default: "Rota"
		});

		this.controls.finishedAddingControls();
		console.log(this.controls.addButtonType);
		this.enableControls = true;
	},
		
	startClock: function () {
		var self = this;
		var totalSeconds = 0;
		
		this.interval = setInterval(function () {
		totalSeconds += 1;

		document.getElementById("hour" + self.id).textContent = ("Time: " + Math.floor(totalSeconds / 3600) + " : ");
		document.getElementById("min" + self.id).textContent = Math.floor(totalSeconds / 60 % 60) + " : ";
		document.getElementById("sec" + self.id).textContent = parseInt(totalSeconds % 60);
		}, 1000);
	},

	  pauseClock: function () {
		  console.log(this.interval);
	    clearInterval(this.interval);
	    delete this.interval;
	  },
  	  			  	  
	btnQuizClick: function(){
		// read info for the quiz from quiz.json
		var _this = this;
		
		if (!_this.isQuiz) {
			_this.isQuiz = true;
			
			var divQuiz = document.createElement('div');
			divQuiz.id = "quizPanel" + this.id;
			divQuiz.height = _this.humanIframe.height;
			divQuiz.setAttribute("style", "float:right");	
							
			this.h = document.createElement('span');
			this.h.id = "hour" + this.id;
			this.h.style.color = "red";
			//this.h.style.fontSize = (elem.w * 2 / 3 + "px");
			divQuiz.appendChild(this.h);
							
			this.m = document.createElement('span');
			this.m.id = "min" + this.id;
			this.m.style.color = "red";
			divQuiz.appendChild(this.m);
			
			this.s = document.createElement('span');
			this.s.id = "sec" + this.id;
			this.s.style.color = "red";
			divQuiz.appendChild(this.s);	
			
			this.miss = document.createElement('p');
			this.miss.id = "missed" + this.id;
			this.miss.style.color = "red";
			divQuiz.appendChild(this.miss);	
							 	  
			var quizPath = this.resrcPath + "quiz.json";
		//	console.log(quizPath);
			var appId = this.id;

			
			var xhr = new XMLHttpRequest();
			xhr.onreadystatechange = function() {
				if ( xhr.readyState === 4 ) {
					if ( xhr.status === 200 || xhr.status === 0 ) {
						var jsonObject = JSON.parse( xhr.responseText );
						var list = document.createElement('ul');
						
						    var obj = JSON.parse(xhr.responseText);;
						    _this.window = obj.window;
						    _this.numQuestions = obj.number;
						    
						    
							for (var i = 0; i < obj.questions.length; i++){
								
									var liName = obj.questions[i].id + appId;
									var li = document.createElement('p');
									li.setAttribute('id', liName);
									
									li.appendChild(document.createTextNode(obj.questions[i].name + "\n"));
									list.appendChild(li);
									divQuiz.appendChild(list);
									divQuiz.style.fontSize = (_this.element.clientWidth / 30 + "px");
							}
							//var test = _this.element.clientWidth - _this.window * _this.element.clientWidth;
							divQuiz.width = _this.window * _this.element.clientWidth;
							_this.humanIframe.width = _this.element.clientWidth - divQuiz.width;
					}
				}
			};

			xhr.open("GET", quizPath, false);
			xhr.setRequestHeader("Content-Type", "text/plain");
			xhr.send(null);
			
			
		//	d3.select("#" + liName).attr("fill", "blue");;
			//
			this.humanQuiz = divQuiz;
			this.element.appendChild(this.humanQuiz);
			this.startClock();
		}	
	},
		
	/*Not currently used
	btnAnnotateClick: function(){
		this.parent.tool = "annotate"; // select
		console.log('usc_biodigital> Annotate Button');
		this.parent.human.send("input.enable");
		this.parent.changeTool();
	},*/
		
	changeTool: function(){
		var _this = this;
		_this.human.send("scene.pickingMode", _this.tool);
	    
	    _this.human.on("scene.pickingModeUpdated", function(event) {
			console.log("Enabling " + event.pickingMode + " mode. Click to " + event.pickingMode + " an object");
		});
	},

	/*Does nothing different
	selectGroup: function(){
		var _this = this;
		_this.changeTool();
		_this.human.send("scene.selectionMode", "highlight");
		    	
	    _this.human.on("scene.selectionModeUpdated", function(event) {
			console.log("Enabling " + event.selectionMode + " mode. Click to " + event.selectionMode + " an object");
		});
	},*/

	//Replaced by widget events.
		
	load: function(date) {
		console.log('usc_biodigital> Load with state value', this.state.value);
		this.refresh(date);
	},

	draw: function(date) {
	},

	resize: function(date) {
		// Called when window is resized
		var w = this.element.clientWidth;
		var h = this.element.clientHeight;// - 0.1 * this.element.clientHeight - 6;
		
		console.log(this.window + " " + this.isQuiz);
		if (this.isQuiz) {
			this.humanIframe.width = (1-this.window) * w;
			this.btnQuizClick();
		}
		else
			this.humanIframe.width = w;
			//this.btnQuizClick();
		
		//this.createBioInterface();
		//console.log('resize to',  w, h, this.element);
		
		this.humanIframe.setAttribute("style", "width:" + w + "px");
		this.humanIframe.setAttribute("style", "height:" + h + "px");
		if (this.isQuiz) {
			console.log(this.humanQuiz);
			this.humanQuiz.style.fontSize = (this.element.clientWidth / 30 + "px");
		}
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
			console.log(this.activeButton);
			
		// iterating over the model trying to understand if a button was pressed
		for (var i in this.modelInterface) {
			var elem = this.modelInterface[i];
			// check if the click is within the current button
			if (elem.action && y >= elem.y & y <= elem.y + elem.h & x >= elem.x & x <= elem.x + elem.w) {
				// if the button is clickable, change a color
				if (elem.command) {
					// change previous pressed button colour
					if (elem.group == 0)
					{
						d3.select("#" + elem.name).attr("fill", pressedColor);
					//	elem.text = "End Quiz";
					}
					
					if ((this.activeButtonGroup1!=null) && (elem.group == 1))
					{
						d3.select("#" + this.activeButtonGroup1.name).attr("fill", defaultBg);
					}
					
					if ((this.activeButtonGroup2!=null) && (elem.group == 2))
					{
						d3.select("#" + this.activeButtonGroup2.name).attr("fill", defaultBg);
					}
					
					if ((this.activeButtonGroup3!=null) && (elem.group == 3))
					{
						d3.select("#" + this.activeButtonGroup3.name).attr("fill", defaultBg);
					}
				}
				// invoke the button action passing the reference of the main object
				if (elem.group == 1){
					d3.select("#" + elem.name).attr("fill", pressedColor);
					this.activeButtonGroup1 = elem;
				}
				if (elem.group == 2){
					d3.select("#" + elem.name).attr("fill", 'skyblue');
					this.activeButtonGroup2 = elem;
				}
				if (elem.group == 3){
					d3.select("#" + elem.name).attr("fill", pressedColor);
					this.activeButtonGroup3 = elem;
				}
				elem.action(_this);
			}
		}

	},
	
	event: function(eventType, position, user_id, data, date) {
		//console.log('usc_biodigital> eventType, pos, user_id, data, dragging',
		//		eventType, position, user_id, data, this.dragging);
		//console.log(eventType, data.identifier);
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
			//console.log("TEST x:" + position.x + " y: " + position.y);	
			this.leftClickPosition(position.x, position.y);
			var _this = this;
			//console.log(this.element.clientHeight);
			var posY = position.y;// - (this.element.clientHeight * 0.1);
			var posX = position.x;
			// click
			if (this.tool ==  "default"){
				this.dragging = true;
				this.dragFromX = position.x;
				this.dragFromY = position.y;
			} else {
		    	
		    	_this.human.send("scene.pick", { x: posX, y: posY},
			        function (hit) {
			            if (hit) {
			            	var obj = JSON.parse(JSON.stringify(hit))
			            	var str = obj.objectId;
			                //console.log("Hit: " + JSON.stringify(hit));
			                console.log(str);
							/*	
							var li = document.createElement('li');
							li.appendChild(document.createTextNode(str));
							li.style.backgroundColor = 'green';
							console.log(li);
							_this.humanQuiz.appendChild(li);
							_this.refresh(date);
							*/
							var nm = str + _this.id;
							var el = document.getElementById(nm);	
							if (el != null){
								el.style.backgroundColor = "purple";
								_this.correctAnswers++;
								console.log(_this.correctAnswers + " " + _this.numQuestions);
								// finish quiz
								if (_this.correctAnswers == _this.numQuestions){
									var quizClock = this.interval;
									console.log(quizClock);
									_this.pauseClock();
									var win = document.createElement('p');
									win.style.color = "green";
									win.appendChild(document.createTextNode("YOU WIN!"));
									_this.humanQuiz.appendChild(win);	
									//Send the Quiz data to MongoDB Database
									console.log("score = 3");
									var xhr = new XMLHttpRequest();
									xhr.open('GET', 'http://localhost:3000?id=blank+,+score=3+,+quizClock='+quizClock);
									xhr.onreadystatechange = function () {
										var DONE = 4; // readyState 4 means the request is done.
										var OK = 200; // status 200 is a successful return.
										if (xhr.readyState === DONE) {
											if (xhr.status === OK) 	{
												console.log(xhr.responseText); // 'This is the returned text.'
											} else {
												console.log('error'+xhr.responseText);
											}
										} else {
											console.log('Error: ' + xhr.status); // An error occurred during the request.
										}
									}
									xhr.send(null);	
								}
							} else {
								if (_this.isQuiz){
									_this.missed++;
				            		document.getElementById("missed" + _this.id).textContent = "Missed: " + _this.missed;
			            		}
							}
			            } else {
							if (_this.isQuiz){
								_this.missed++;
				            	document.getElementById("missed" + _this.id).textContent = "Missed: " + _this.missed;
			            	}
			                console.log("Miss");
			            }
			        });
			    _this.human.send("scene.pick", { x: posX, y: posY, triggerActions: true});

			}
		} else if (eventType === "pointerMove" && this.dragging) {
			if (this.tool ==  "default"){
				// move (pan camera)
				var dx = (position.x - this.dragFromX) * -1;
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
			this.zoomInOut((data.wheelDelta / 10000.0) * -1);
			this.refresh(date);
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
		} else if (eventType === "pointerDblClick") {
				//Add code to switch between pointer options
		} else if (eventType === "widgetEvent") {
			console.log(data.identifier);
			switch (data.identifier) {
				case "Reset":
					console.log("usc_biodigital> Reset Widget");
					this.human.send("scene.reset");
					this.changeTool();
					console.log(this.pointerTypeRadioButton);
					this.pointerTypeRadioButton.value = "Sel";
					this.viewTypeRadioButton.value = "Norm";
					break;
				case "Quiz":
					console.log("Quiz started!");
					this.btnQuizClick();
					break;
				case "PlayButton":
					console.log('usc_biodigital> Play Widget');
					this.human.send("timeline.play", { loop: true });
					break;
				case "play-pause":
					console.log('usc_biodigital> Pause Widget');
					this.human.send("timeline.pause", { loop: true });
					break;
				case "Next":
					console.log('usc_biodigital> Next Widget');
					this.human.send("timeline.nextChapter");
					break;
				case "Prev":
					console.log('usc_biodigital> Previous Widget');
					this.human.send("timeline.previousChapter");
					break;
				case "ViewType":
					console.log(data.value);
					switch (data.value) {
						case "Norm":
							console.log('usc_biodigital> Normal Option');
							this.human.send("scene.disableXray");
							this.human.send("scene.selectionMode", "highlight");
							break;
						case "X-ray":
							console.log('usc_biodigital> XRay Option');
							this.human.send("scene.enableXray");
							this.human.send("scene.selectionMode", "highlight");
							break;
						case "Iso":
							console.log('usc_biodigital> Isolate Option');
							this.human.send("scene.selectionMode", "isolate");
							break;
						default:
							console.log("Error: unknown option");
							break;
					}	
				 	break;
				case "PointerType":
					switch (data.value) {
						case "Sel":
							this.tool = "highlight";
							console.log('usc_biodigital> Select Option');
							this.changeTool();
							break;
						case "Dis":
							this.tool = "dissect";
							console.log('usc_biodigital> Dissect Option');
							this.changeTool();
							break;
						case "Rota":
							this.tool = "default";
							console.log('usc_biodigital> Dissect Option');
							this.changeTool();
							break;
						//For future development
						/*case "Pan":
							this.tool = "pan";
							console.log('usc_biodigital> Pan Option');
							this.changeTool();
							break;*/
						default:
							console.log("Error: unknown option");
							break;
					}
					break;
				default:
					console.log("Error: unkown widget");
					console.log(eventType, position, user_id, data, date);
					break;
			}
			this.refresh(date);
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
