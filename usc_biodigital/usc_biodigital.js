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
// For Quiz
// a list of scene objects
var sceneObjects = {};


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
		var l = document.createElement("link");
		l.type = "text/css";
		l.href = this.resrcPath + "css.css";
		l.rel = "stylesheet";
		document.head.appendChild(l);
		document.body.appendChild(s);

		// Set the DOM id
		this.element.id = "div_" + "usc_biodigital";
		//console.log('usc_biodigital> id=', this.id, 'init element=', this.element,
		//    'w=', this.element.clientWidth, 'h=', this.element.clientHeight);
		
		// generate the widget interface of the usc_biodigital
		this.addWidgetButtons();

		// Set the background to black
		this.element.style.backgroundColor = '#87CEEB';			
		
		/*var iframe = document.createElement('iframe');
		iframe.src = this.state.value;
		iframe.id = IFRAME_ID + this.id;
		iframe.width =  '100%';
		iframe.height =  '100%';
		iframe.setAttribute("style", "float:left");*/
		var iframe_id = IFRAME_ID + this.id;
		//this.element.appendChild(iframe);
		var source = `${this.state.value}&dk=${this.state.dk}`;
		//console.log("developer key", source);
		this.element.innerHTML = `<iframe id="${iframe_id}" src="${source}" width="600" height="1000">
			</iframe>
			<script src="https://developer.biodigital.com/builds/api/2/human-api.min.js"></script>
			<div id="quizPanel">
				<h2><b><span id="quizResponse"></span></b></h2>
				<!-- display only after response -->
				<h3 id="quizSel"><b><span id="quizTarget"></span></b></h3>
				<div id="quizItems"><ul id="quizList"></ul></div>
				<form id="questions-form">
					<button id="quizSubmitBtn">Submit</button>
				</form>
				<div id="quizClock">Clock 
					<span id="min"></span>:
					<span id="sec"></span>
				</div>

			</div>`;

		// DOM Elements
		this.quizResponseDOM = document.getElementById("quizResponse");
		this.quizPanelDOM = document.getElementById("quizPanel");
		this.quizSubmitBtnDOM = document.getElementById("quizSubmitBtn");
		this.quizTargetDOM = document.getElementById("quizTarget");
		this.quizSelDOM = document.getElementById("quizSel");
		this.quizListDOM = document.getElementById("quizList");
		this.quizClockDOM = document.getElementById("quizClock");
		this.humanIframe = document.getElementById(iframe_id);

		//console.log(this.humanIframe);
						
		this.humanQuiz = null;
		this.isQuiz = false;
		this.window = 0.0;
		this.interval = 0;
		this.fontSize = this.element.clientHeight * 0.03;
		//this.h = 0;
		//this.m = 0;
		//this.s = 0;
		this.missed = -1;
		this.numQuestions = 0;
		this.correctAnswers = 0;
		//this.lenName = 0;

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
		
	addWidgetButtons: function() {

		// adding widget buttons
		this.controls.addButton({type: "reset", position: 10, identifier: "Reset", label: "Reset"});
		this.controls.addButton({type: "quiz", position: 4, identifier: "Quiz", label: "Quiz"});
		this.controls.addButton({type: "play", position: 1, identifier: "PlayButton", label: "Play"});
		this.controls.addButton({type: "play-pause", position: 2, identifier: "play-pause"});
		this.controls.addButton({type: "next", position: 6, identifier: "Next"});
		this.controls.addButton({type: "prev", position: 7, identifier: "Prev"});

		// adding radio options
		this.viewTypeRadioButton = this.controls.addRadioButton({identifier: "ViewType",
			label: "View",
			options: ["Norm", "X-ray", "Iso"],
			default: "Norm"
		});

		//Would like to add pan in future
		this.pointerTypeRadioButton = this.controls.addRadioButton({identifier: "PointerType",
			label: "Pointer",
			options: ["Sel", "Dis", "Spin"],
			default: "Spin"
		});

		this.modelTypeRadioButton = this.controls.addRadioButton({identifier: "ModelType",
			label: "Model",
			options: ["Heart", "Male", "Quiz"],
			default: "Quiz"
		});

		this.modelTypeRadioButton = this.controls.addRadioButton({identifier: "QuizType",
			label: "Quiz",
			options: ["Q1", "Q2"],
			default: "Q1"
		});

		this.controls.finishedAddingControls();
		//console.log(this.controls.addButtonType);
		this.enableControls = true;
	},
		
	startClock: function () {
		var totalSeconds = 0;
		
		this.interval = setInterval(function () {
		totalSeconds += 1;

		//document.getElementById("hour" + self.id).textContent = ("Time: " + Math.floor(totalSeconds / 3600) + " : ");
		document.getElementById("min").textContent = Math.floor(totalSeconds / 60 % 60);
		document.getElementById("sec").textContent = parseInt(totalSeconds % 60);
		}, 1000);
	},

	pauseClock: function () {
		console.log(this.interval);
	    clearInterval(this.interval);
	    delete this.interval;
	},
  	  			  	  
	btnQuizClick: function(){
		if (!this.isQuiz) {
			var _this = this;
			this.isQuiz = true;
			this.quizList = [];
			this.missed = 0;
			//reads quiz .json file and adds items to quizList
			var quizPath = this.resrcPath + "quiz.json";
			//	console.log(quizPath);
			var appId = this.id;
			
			
			var xhr = new XMLHttpRequest();
			xhr.onreadystatechange = function() {
				if ( xhr.readyState === 4 ) {
					if ( xhr.status === 200 || xhr.status === 0 ) {
						var jsonObject = JSON.parse( xhr.responseText );
						
						var list = document.createElement('ul');
						var obj = JSON.parse(xhr.responseText);
						_this.window = obj.window;
						_this.numQuestions = obj.number;

						_this.quizResponseDOM.innerHTML = obj.name;
						_this.quizTargetDOM.innerHTML = "Find all these items:";
						
						for (var i = 0; i < obj.questions.length; i++){
							
								var liName = obj.questions[i].id + appId;
								var li = document.createElement('li');
								li.setAttribute('id', liName);
								
								li.appendChild(document.createTextNode(obj.questions[i].name + "\n"));
								_this.quizListDOM.appendChild(li);
								_this.quizList.push(obj.questions[i]);
						}
						
						//var test = _this.element.clientWidth - _this.window * _this.element.clientWidth;
						// divQuiz.width = _this.window * _this.element.clientWidth;
						// _this.humanIframe.width = _this.element.clientWidth - divQuiz.width;
					}
				}
			};
				
			xhr.open("GET", quizPath, false);
			xhr.setRequestHeader("Content-Type", "text/plain");
			xhr.send(null);
			// changes iframe to the example quiz code widget
			// todo load src from quiz.json model + dk
			// declare objects to select
			console.log(this.quizListDOM);
			this["QUIZ_OBJECTS"] = this.quizList;
			console.log(this.QUIZ_OBJECTS);
			// a list of object selections
			this.selectedIndex = 0;
			this.quizResponseDOM.innerHTML = "Starting Quiz!";
			this.quizPanelDOM.style.fontSize = this.fontSize + "px";
			/*
			this.quizResponseDOM.style.fontSize = this.fontSize * 1.05 +"px";
			this.quizTargetDOM.style.fontSize = this.fontSize+"px";
			this.quizSelDOM.style.fontSize = this.fontSize+"px";
			*/
			this.quizListDOM.style.fontSize = this.fontSize+"px";
			this.quizPanelDOM.style.display = "block";
			
			// get a random object in the list
			function getRandomObject(objects) {
				var object = objects[Math.floor(Math.random() * objects.length)];
				return object;
			}

			// track human selection vs user selection
			this.selectedObject = null;
	

			// disable labels + tooltips + annotations
			//this.human.send("labels.setEnabled", {enable: false});
			this.human.send("tooltips.setEnabled", {enable: false});
			this.human.send("annotations.setShown", {enable: false});

			this.startClock();
		} 

		/*this.human.on("human.ready", function() {
			// get a list of objects
			this.send("scene.info", function(data) {
				// get global objects
				sceneObjects = data.objects;
				for (var objectId in sceneObjects) {
					var object = sceneObjects[objectId];
					// for each of our quiz objects, find matching scene object
					for (var i = 0; i < _this.QUIZ_OBJECTS.length; i++) {
						var quizObject = _this.QUIZ_OBJECTS[i];
						var objectFound = _this.matchNames(object.name, quizObject);
						if (objectFound) {
							quizObject.objectId = objectId;
						}
					}
				}
				// start quiz
				_this.nextSelection();
			});
		});
		*/

		// // listen to object pick event
		// _this.human.on("scene.picked", function(event) {
		// 	console.log("'scene.picked' event: " + JSON.stringify(event));
		// 	var pickedObjectId = event.objectId;
		// 	var pickedObject = sceneObjects[pickedObjectId];
		// 	_this.setUserSelection(pickedObject);  
		// });

		// nextBtn.addEventListener('click', function(e) {
		// 	// reset selections
		// 	_this.human.send('scene.selectObjects', { replace: true });
		// 	// reset camera and proceed to next
		// 	_this.human.send('camera.reset', function() {
		// 		_this.nextSelection();
		// 	});
		// 	// prevent submit
		// 	e.preventDefault();
		// });
		
		// old quiz code starts here
		/*// read info for the quiz from quiz.json
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
			*/				 	  
			
			
			
			//	d3.select("#" + liName).attr("fill", "blue");;
			//
			//this.humanQuiz = divQuiz;
			//this.element.appendChild(this.humanQuiz);
			
		//}	
	},

	// For Quiz
	// selects the next object in the list
	nextSelection : function(){
		// get the next object (within range)
		var objectIndex = this.selectedIndex % this.QUIZ_OBJECTS.length;
		this.selectedObject = this.QUIZ_OBJECTS[objectIndex];
		this.selectedIndex++;
		//this.quizTargetDOM.innerHTML = this.selectedObject.name;
	},

	// For Quiz
	// returns if a names match or contains b as a substring
	matchNames: function(a, b){
		return a === b || a.trim().toLowerCase().indexOf(b.trim().toLowerCase()) > -1;
	},

	/*Not currently used
	btnAnnotateClick: function(){
		this.parent.tool = "annotate"; // select
		console.log('usc_biodigital> Annotate Button');
		this.parent.human.send("input.enable");
		this.parent.changeTool();
	},*/
		
	changeTool: function(){
		this.human.send("scene.pickingMode", this.tool);
	    
	    this.human.on("scene.pickingModeUpdated", function(event) {
			console.log("Enabling " + event.pickingMode + " mode. Click to " + event.pickingMode + " an object");
		});
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
		this.fontSize = this.element.clientHeight * 0.03;
		this.quizPanelDOM.style.fontSize = this.fontSize + "px";
		/*
		this.quizResponseDOM.style.fontSize = this.fontSize+"px";
		this.quizTargetDOM.style.fontSize = this.fontSize+"px";
		this.quizSelDOM.style.fontSize = this.fontSize+"px";
		this.quizListDOM.style.fontSize = this.fontSize+"px";
		*/
		
		console.log(this.window + " " + this.isQuiz);
		// if (this.isQuiz) {
		// 	this.humanIframe.width = (1-this.window) * w;
		// 	this.btnQuizClick();
		// }
		// else
		this.humanIframe.width = w;
		//this.btnQuizClick();
		
		this.humanIframe.setAttribute("style", "width:" + w + "px");
		this.humanIframe.setAttribute("style", "height:" + h + "px");
		// if (this.isQuiz) {
		// 	this.humanQuiz.style.fontSize = (this.element.clientWidth / 30 + "px");
		// }
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
	inButton: function(x, y, buttonId) {
		var btn = document.getElementById(buttonId);
		if (btn) {
			var findBtn = btn.getBoundingClientRect();
			console.log("Checking button", btn, findBtn);
			return (findBtn.top <= y && y <= findBtn.bottom && findBtn.left <= x && x <= findBtn.right);
		} else {
			return false;
		}
	},

	submitClick: function(object) {
		// check if quiz selection matches user selection
		var isCorrect = false;
		// console.log(this.selectedObject);
		// console.log(object, this.selectedObject.id, isCorrect);
		for (var objectListId in this.QUIZ_OBJECTS) {
			var objectList = this.QUIZ_OBJECTS[objectListId];
			isCorrect = this.matchNames(object, objectList.id);
			if (isCorrect) {
				this.answer = document.getElementById(objectList.id+this.id);
				this.answer.style.color = "green";
				this.correctAnswers++;
				console.log(this.QUIZ_OBJECTS);
				this.QUIZ_OBJECTS.splice(objectListId, 1);
				console.log(this.QUIZ_OBJECTS);
				break;
			};
		}
		if (!isCorrect) {
			this.missed++
		};
		// if (isCorrect) {
		// 	this.quizResponseDOM.innerHTML = "Correct";
		// 	this.nextSelection();
		// } else {
		// 	//todo need to improve object string
		// 	this.quizResponseDOM.innerHTML = "Incorrect. That is " + object;
		// }
		
	},

	reset: function() {
		this.human.send("scene.reset");
		this.changeTool();
		this.pointerTypeRadioButton.value = "Sel";
		this.viewTypeRadioButton.value = "Norm";
		this.isQuiz = false;
		this.quizPanelDOM.style.display = "none";
		this.humanIframe.width = this.element.clientWidth;
		//this.element.removeChild(this.humanQuiz);
		this.humanQuiz = null;
		this.pauseClock();
	},
	
	event: function(eventType, position, user_id, data, date) {
		//console.log('usc_biodigital> eventType, pos, user_id, data, dragging',
		//		eventType, position, user_id, data, this.dragging);
		//console.log(eventType, data.identifier);
		if (!('human' in this)) {
			// NOTE: we append this.id so that each instance has a unique id.
			// Otherwise the second, third,... instances do not respond to events.
			this.human = new HumanAPI(IFRAME_ID + this.id);
			//console.log('usc_biodigital> CREATED human:', this.human, 'this.id=', this.id);
			var _this = this;
			this.human.send("camera.info", function(camera) {
				console.log("Gathering camera info:");
				console.log(JSON.stringify(camera));
				_this.currentZoom = camera.zoom;
			});
		}

		if (eventType === "pointerPress" && (data.button === "left")) {
			//console.log("TEST x:" + position.x + " y: " + position.y);	
			var _this = this;
			//console.log(this.element.clientHeight);
			var posY = position.y;
			var posX = position.x;
			// click
			if (this.tool ==  "default"){
				this.dragging = true;
				this.dragFromX = position.x;
				this.dragFromY = position.y;
			} else if (this.inButton(posX, posY, "submitBtn")){
				console.log("You got the submit button");
			} else {
		    	_this.human.send("scene.pick", { x: posX, y: posY}, function (hit) {
					if (hit) {
						var obj = JSON.parse(JSON.stringify(hit))
						var str = obj.objectId;
						//console.log("Hit: " + JSON.stringify(hit));
						if (_this.isQuiz){
							_this.submitClick(str);
							console.log("Hit Submited "+str);
						};
						var nm = str + _this.id;
						var el = document.getElementById(nm);	
						if (el == null){
							hit = null;
						} else {
							//el.style.backgroundColor = "purple";
							// finish quiz
							if (_this.correctAnswers == _this.numQuestions && _this.isQuiz){
								_this.isQuiz = false;
								var quizClock = this.interval;
								console.log(quizClock);
								_this.pauseClock();
								var win = document.createElement("li");
								win.style.color = "green";
								win.appendChild(document.createTextNode("YOU WIN!"));
								_this.quizListDOM.appendChild(win);	
								var misses = document.createElement("li");
								misses.style.color = "red";
								misses.appendChild(document.createTextNode("Misses: "+_this.missed));
								_this.quizListDOM.appendChild(misses);
								//Send the Quiz data to MongoDB Database
								console.log("score = "+_this.correctAnswers);
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
							};
						};
					};
					if (!hit) {
						if (_this.isQuiz){
							//_this.missed++;
							//document.getElementById("missed" + _this.id).textContent = "Missed: " + _this.missed;
						};
					};
				});
				// todo is this needed?
				_this.human.send("scene.pick", {x: posX, y: posY, triggerActions: true});
			}
		} else if (eventType === "pointerMove" && this.dragging) {
			if (this.tool ==  "default"){
				// move (orbit camera)
				var dx = (position.x - this.dragFromX) * -1;
				var dy = (position.y - this.dragFromY)*200/this.element.clientHeight;
				this.human.send('camera.orbit', { yaw: dx});
				this.dragFromX = position.x;
				this.human.send("camera.pan", {y: dy});
				this.dragFromY = position.y;
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
					this.reset();
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
						case "Spin":
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
				case "ModelType":
					switch (data.value) {
						case "Heart":
							console.log("usc_biodigital> Reinitalising with heart model");
							this.humanIframe.src = "https://human.biodigital.com/widget?be=1to1&pre=false&background=255,255,255,51,64,77&dk="+this.state.dk;
							this.reset();
							this.pointerTypeRadioButton.value = "Spin";
							break;
						case "Male":
							console.log("usc_biodigital> Reinitalising with male model");
							this.humanIframe.src = "https://human.biodigital.com/widget?be=1ud8&pre=false&background=255,255,255,51,64,77&dk="+this.state.dk;
							this.reset();
							this.pointerTypeRadioButton.value = "Spin";
							break;
						case "Quiz":
							console.log("usc_biodigital> Reinitalising with quiz model");
							this.humanIframe.src = "https://human.biodigital.com/widget?be=1fLs&pre=false&background=255,255,255,51,64,77&dk="+this.state.dk;
							this.reset();
							this.pointerTypeRadioButton.value = "Spin";
						default:
							console.log("Error: unknown option");
							break;
					}
					break;
				case "QuizType":
					switch (data.value) {
						case "Q1":
							console.log("usc_biodigital> Starting Quiz 1");
							break;
						case "Q2":
							console.log("usc_biodigital> Starting Quiz 2")
							break;
						default:
							console.log("Error: unkown quiz");
							break;
					}
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