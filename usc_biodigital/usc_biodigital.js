//
// SAGE2 application: usc_biodigital
// by: Mark Utting <utting@usc.edu.au>
//     Svetlana Mandler
//     Levi Kotzur <lkotzur@usc.edu.au>
//
// This app extends BioDigital Human to support timed quizzes.
// The widgets have the following behaviour:
//    "post" / "ante" loads .json file and starts to load that model.
//    "start" should be done after model is fully loaded.
//                (cannot find a way to automate this in the API).
//           It matches .json body part names to the model body part IDs.
//           It displays the quiz panel and the items.
//           It starts the clock timer and sets misses to zero.
//    "stop" stops the counter, leaving display unchanged.
//           And prevents users answering more questions.
//
// Copyright (c) 2016

"use strict";

/* global HumanAPI */
var IFRAME_ID = 'embedded-human';
var PAN_STEP = 1.0;
// For Quiz": a list of scene objects
var sceneObjects = {};


var usc_biodigital = SAGE2_App.extend({
	init: function(data) {
		// Create div into the DOM
		this.SAGE2Init("div", data);
		this.data = data;
		this.defaultTool = "highlight"; // default tool
		this.tool = this.defaultTool;

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
		// we display a blank page until quizSetup chooses a quiz model.
		//var source = `${this.state.value}&dk=${this.state.dk}`;
		var source = "about:blank";
		//console.log("developer key", source);
		this.element.innerHTML = `<iframe id="${iframe_id}" src="${source}" width="${this.element.clientWidth}" height="${this.element.clientHeight}">
			<link type="text/css" href="${this.resrcPath}css.css" rel="stylesheet"></link>
			</iframe>
			<script src="https://developer.biodigital.com/builds/api/2/human-api.min.js"></script>
			<div id="quizPanel_${this.id}" class="quizPanel">
				<h2><b><span id="quizResponse_${this.id}" class="quizResponse"></span></b></h2>
				<!-- display only after response -->
				<h3 id="quizSel_${this.id}" class="quizSel"><b><span id="quizTarget_${this.id}" class="quizTarget"></span></b></h3>
				<div id="quizItems_${this.id}" class="quizItems"><ul id="quizList_${this.id}" class="quizList"></ul></div>
				<div id="quizClock_${this.id}" class="quizClock">Clock
					<span id="min_${this.id}" class="min">00</span>:
					<span id="sec_${this.id}" class="sec">00</span>
					<span id="quizMisses_${this.id}" class="quizMisses">Misses: 
						<span id="misses_${this.id}" class="misses">00</span>
					</span>
				</div>
				<div id="quizDisplaySelected_${this.id}" class="quizDisplaySelected">Last selected:<br/>
					<span id="quizLastSelected_${this.id}" class="quizLastSelected"></span>
				</div>
			</div>
			<div id="brandingPanel">
				<h4>SLICE Project 2017</h4>
				<p>Mark Utting, Svetlana Mandler, Levi Kotzur, Jacqui Blake, Dion Keetley</p>
			</div>`;

		// DOM Elements
		this.quizResponseDOM = document.getElementById("quizResponse_" + this.id);
		this.quizPanelDOM = document.getElementById("quizPanel_" + this.id);
		this.quizRestartBtnDOM = document.getElementById("quizRestartBtn_" + this.id);
		this.quizTargetDOM = document.getElementById("quizTarget_" + this.id);
		this.quizSelDOM = document.getElementById("quizLastSelected_" + this.id);
		this.quizListDOM = document.getElementById("quizList_" + this.id);
		this.quizClockDOM = document.getElementById("quizClock_" + this.id);
		this.quizMissesDOM = document.getElementById("misses_" + this.id);
		this.quizMinDOM = document.getElementById("min_" + this.id);
		this.quizSecDOM = document.getElementById("sec_" + this.id);
		this.humanIframe = document.getElementById(iframe_id);

		this.quizName = null;
		this.setQuizState("Quiz Unknown");
		this.isQuizRunning = false;
		this.window = 0.0;
		this.interval = 0; // not a valid timer ID.
		this.fontSize = this.element.clientHeight * 0.015;
		this.missed = -1;
		this.numQuestions = 0;
		this.correctAnswers = 0;

		// audio
		this.soundCorrect = new Audio(this.resrcPath + "correct_sound.wav");
		this.soundIncorrect = new Audio(this.resrcPath + "incorrect_sound.wav");

		// initialise our own object state.
		this.currentZoom = 0.3;

		// move and resize callbacks
		this.resizeEvents = "continuous"; // onfinish
		// this.moveEvents   = "continuous";

		// SAGE2 Application Settings
		//
		// Control the frame rate for an animation application
		this.maxFPS = 2.0;
		// Set up the default quiz
		this.quizSetup();
		this.invariant();
	},

	// private helper function
	getQuizState: function() {
		// currently, we use this visible-on-screen field for the quiz state.
		return this.quizResponseDOM.innerHTML;
	},

	// private helper function
	setQuizState: function(state) {
		this.quizResponseDOM.innerHTML = state;
	},

	// This checks the invariant properties of the current quiz state.
	invariant: function() {
		var i = 0;
		var qState = this.getQuizState();
		switch (qState) {
		  case "Quiz Unknown":
			// only at the very start of the program.
			this.assertEquals(null, this.quizName);
			this.assertEquals(0, this.interval);
			break;

		  case "Quiz Loaded":
			// the quiz name and item names (but maybe not IDs) are known.
			this.assertTrue(typeof(this.quizName) == "string", "quizName");
			this.assertEquals(7, this.QUIZ_OBJECTS.length);
			break;

		  case "Quiz Starting":
			// all quiz details are known, including item IDs.
			this.assertEquals(7, this.QUIZ_OBJECTS.length); // ONLY FOR LFS122 QUIZZES
			this.assertEquals(this.numQuestions, this.QUIZ_OBJECTS.length);
			this.assertEquals(0, this.missed);
			this.assertEquals(0, this.correctAnswers);
			this.assertEquals(0, this.interval); // no timer running
			for (i = 0; i < this.QUIZ_OBJECTS.length; i++) {
				var obj = this.QUIZ_OBJECTS[0];
				this.assertTrue(typeof(obj.id) === "string", "Q[0].id"); // id is known
				this.assertTrue(!obj.found, "Q[0].found");  // found is false/undef
				var liId = obj.id + _this.id;
				var li = document.getElementById(liId);
				if (li) {
					this.assertTrue(li.style.color !== "green", "li.style.color"); // not green
				}
			}
			break;

		  case "Quiz Started":
		  case "Anterior Quiz":
		  case "Posterior Quiz":
			// quiz is running, with timer ticking.
			console.log(typeof(this.interval));
			this.assertTrue(this.interval !== 0, "interval"); // timer is running
			this.checkQuizItems();
			break;

		  case "Quiz Stopped":
			// quiz has stopped (but still displayed) and timer is stopped.
			this.assertEquals(0, this.interval);
			this.checkQuizItems();
			break;

		default:
			this.showError("Illegal quiz state: " + qState);
		}
	},

	// private helper function for assertions.
	assertTrue: function(truth, msg) {
		if (!truth) {
			this.showError("incorrect " + msg);
		}
	},

	// private helper function for assertions.
	assertEquals: function(expected, actual) {
		if (expected !== actual) {
			this.showError("Expected " + expected + " !== " + actual);
		}
	},

	showError: function (msg) {
		var err = "ASSERT ERROR: " + msg;
		console.log(err);
		// we also show error messages on the quiz panel (temporarily?)
		this.quizTargetDOM.innerHTML = err;
		// and (in development mode) we throw an exception:
		throw err;
	},

	// private helper function to check quiz items in Quiz Started/Stopped state.
	checkQuizItems: function() {
		var i = 0;
		var countFound = 0;
		console.log(this.QUIZ_OBJECTS);
		for (i = 0; i < this.QUIZ_OBJECTS.length; i++) {
			var quizItem = this.QUIZ_OBJECTS[i];
			this.assertTrue(typeof(quizItem.id) === "string", "Q[i].id"); // id is known
			var liId = quizItem.id + this.id;
			var li = document.getElementById(liId);
			this.assertTrue(li != null, "li");  // list item is created
			if (quizItem.found) {
				countFound++;
				this.assertEquals("green", li.style.color); // found items are green
			} else {
				this.assertTrue(li.style.color !== "green"); // others are not green
			}
		}
		this.assertEquals(this.correctAnswers, countFound); // correct number found
	},

	addWidgetButtons: function() {

		// adding widget buttons
		// this.controls.addButton({type: "reset", position: 1, identifier: "Reset", label: "Reset"});
		this.controls.addButton({type: "quizAnte", position: 4, identifier: "Ante", label: "Ante"});
		this.controls.addButton({type: "quizPost", position: 10, identifier: "Post", label: "Post"});
		this.controls.addButton({type: "quizStart", position: 7, identifier: "Start", label: "Start"});
		/*
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
			default: "Sel"
		});

		this.modelTypeRadioButton = this.controls.addRadioButton({identifier: "ModelType",
			label: "Model",
			options: ["Heart", "Male", "Quiz"],
			default: "Quiz"
		});
		

		this.modelTypeRadioButton = this.controls.addRadioButton({identifier: "QuizType",
			label: "Quiz",
			options: ["Ante", "Post"],
			default: "Ante"
		});
		*/
		

		this.controls.finishedAddingControls();
		//console.log(this.controls.addButtonType);
		this.enableControls = true;
	},

	// private helper function that pads out a given number to two digits.
	checkTime: function(i) {
		if (i < 10) {
			i = "0" + i;
		}
		return i;
	},

	// private helper function to start the clock ticking.
	startClock: function () {
		var _this = this;
		var totalSeconds = 0;
		var min = 0;
		var sec = 0;
		
		this.interval = setInterval(function () {
			totalSeconds += 1;

			min = Math.floor(totalSeconds / 60 % 60);
			sec = parseInt(totalSeconds % 60);

			//document.getElementById("hour" + self.id).textContent = ("Time: " + Math.floor(totalSeconds / 3600) + " : ");
			_this.quizMinDOM.textContent = _this.checkTime(min);
			_this.quizSecDOM.textContent = _this.checkTime(sec);
			
			// Stop clock at timelimit
			console.log(min, typeof(min), _this.quizTimeLimit, typeof(_this.quizTimeLimit));
			if (min === _this.quizTimeLimit) {
				_this.pauseClock();
			}
		}, 1000);
	},

	// private helper function to stop the clock.
	pauseClock: function () {
		//console.log(this.interval);
		if (this.interval !== 0) {
		    clearInterval(this.interval);
			this.interval = 0;
		}
		this.setQuizState("Quiz Stopped");
	},

	quizSetup: function(){
		if (this.quizBeenSetup) {
			this.pauseClock();
			this.quizMinDOM.textContent = "00";
			this.quizSecDOM.textContent = "00";
			this.quizListDOM.innerHTML = "";
			this.correctAnswers = 0;
			this.quizListDOM.style.color = "black";
		}
		var _this = this;
		this.quizBeenSetup = true;
		this.missed = 0;
		this.quizMissesDOM.innerHTML = this.checkTime(this.missed);
		//reads quiz .json file and adds items to quizList
		var quizPath = this.resrcPath + this.state.quizName + ".json";

		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if ( xhr.readyState === 4 ) {
				if ( xhr.status === 200 || xhr.status === 0 ) {
					var obj = JSON.parse(xhr.responseText);
					
					_this.window = obj.window;
					_this.numQuestions = obj.number;
					_this.quizTimeLimit = obj.timeLimitMin;

					_this.quizName = obj.name;
					_this.setQuizState("Quiz Loaded");
					_this.quizTargetDOM.innerHTML = "Find all these items:";
					
					_this.QUIZ_OBJECTS = obj.questions;
					_this.model = obj.model + _this.state.dk;
					_this.humanIframe.src = _this.model;
				}
			}
			_this.invariant();
		};
		
		xhr.open("GET", quizPath, true);
		xhr.setRequestHeader("Content-Type", "text/plain");
		xhr.send(null);
		this.invariant();
	},

	quizStart : function() {
		var _this = this;
		this.isQuizRunning = true;

		// a list of object selections
		this.selectedIndex = 0;
		// this.quizResponseDOM.innerHTML = "Setting up Quiz..."; ???
		// TODO: check that quiz has not already been started?

		this.quizPanelDOM.style.fontSize = this.fontSize + "px";
		this.quizResponseDOM.style.fontSize = this.fontSize * 1.05 +"px";
		this.quizTargetDOM.style.fontSize = this.fontSize+"px";
		this.quizSelDOM.style.fontSize = this.fontSize+"px";
		this.quizListDOM.style.fontSize = this.fontSize+"px";
		this.quizListDOM.innerHTML = "";
		this.quizPanelDOM.style.display = "block";

		console.log("starting quiz with iframe: " + (IFRAME_ID + this.id), this.human);
		this.quizMissesDOM.innerHTML = this.checkTime(this.missed);
		// disable labels + tooltips + annotations
		// this.human.send("labels.setEnabled", {enable: false});
		this.getHumanAPI().send("tooltips.setEnabled", {enable: false});
		this.getHumanAPI().send("annotations.setShown", {enable: false});
		this.getHumanAPI().send("ui.setDisplay", { all: false, info: false });
		this.getHumanAPI().send("camera.info", function(camera) {
			// console.log("Gathering camera info:");
			// console.log(JSON.stringify(camera));
			_this.currentZoom = camera.zoom;
		});

		this.setQuizState("Quiz Starting");
		console.log("on human ready...");
		this.getHumanAPI().on("human.ready", function() {
			var i = 0;
			// get a list of objects
			console.log("send scene.info...");
			this.send("scene.info", function(data) {
				for (i = 0; i < _this.QUIZ_OBJECTS.length; i++) {
					var quizObject = _this.QUIZ_OBJECTS[i];
					quizObject.count = 0;
				}
				// get global objects
				sceneObjects = data.objects;
				console.log("body parts: " + Object.keys(sceneObjects).length);
				for (var s in sceneObjects) {
					if (sceneObjects.hasOwnProperty(s)) {
						var object = sceneObjects[s];
						// for each of our quiz objects, find matching scene object
						for (i = 0; i < _this.QUIZ_OBJECTS.length; i++) {
							quizObject = _this.QUIZ_OBJECTS[i];
							var objectFound = _this.matchNames(object.name, quizObject.name);
							if (objectFound) {
								if (object.shown){
									quizObject.count++;
									quizObject.id = object.objectId;
									// console.log(quizObject, object);
								}
							}
						}
					}
				}
				for (i = 0; i < _this.QUIZ_OBJECTS.length; i++) {
					quizObject = _this.QUIZ_OBJECTS[i];
					if (quizObject.count !== 1) {
						console.log("ambiguous/unknown item: ", quizObject);
					};
				}
				// start quiz
				for (i = 0; i < _this.QUIZ_OBJECTS.length; i++){
						
					var liId = _this.QUIZ_OBJECTS[i].id + _this.id;
					console.log(liId);
					var li = document.createElement('li');
					li.setAttribute('id', liId);
					
					li.appendChild(document.createTextNode(_this.QUIZ_OBJECTS[i].name + "\n"));
					_this.quizListDOM.appendChild(li);
				}
				_this.invariant();
			});
			_this.startClock();
			_this.setQuizState("Quiz Started"); // or _this.quizName
			this.invariant();
		});
		this.invariant();
	},

	// private helper function, for Quiz
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

	// private helper function
	changeTool: function(tool){
		var oldTool = this.tool;
		this.getHumanAPI().send("scene.pickingMode", tool);
		this.tool = tool;
	    this.getHumanAPI().on("scene.pickingModeUpdated", function(event) {
			console.log("changed tool to " + event.pickingMode + " (from " + oldTool + ")");
		});
	},

	load: function(date) {
		console.log('usc_biodigital> Load with state value', this.state.value);
		this.refresh(date);
		this.invariant();
	},

	draw: function(date) {
	},

	resize: function(date) {
		// Called when window is resized
		var w = this.element.clientWidth;
		var h = this.element.clientHeight;
		this.fontSize = this.element.clientHeight * 0.015;
		this.quizPanelDOM.style.fontSize = this.fontSize + "px";
		this.quizResponseDOM.style.fontSize = this.fontSize+"px";
		this.quizTargetDOM.style.fontSize = this.fontSize+"px";
		this.quizSelDOM.style.fontSize = this.fontSize+"px";
		this.quizListDOM.style.fontSize = this.fontSize+"px";

		this.humanIframe.width = w;
		//this.quizSetup();
		
		this.humanIframe.setAttribute("style", "width:" + w + "px");
		this.humanIframe.setAttribute("style", "height:" + h + "px");
		this.refresh(date);
		this.invariant();
	},

	move: function(date) {
		// Called when window is moved (set moveEvents to continuous)
		this.refresh(date);
		this.invariant();
	},

	quit: function() {
		// Make sure to delete stuff (timers, ...)
	},

	// private helper function to handle clicks on body parts during a quiz
	submitClick: function(object) {
		// Object is the ID of the body part clicked on
		// check if quiz selection matches user selection
		var isCorrectOut = false;

		for (var i = 0; i < this.QUIZ_OBJECTS.length; i++) {
			var quizItem = this.QUIZ_OBJECTS[i];
			if (this.matchNames(object, quizItem.id)){
				isCorrectOut = true;
				if (!(quizItem.found)) {
					this.answer = document.getElementById(quizItem.id+this.id);
					this.answer.style.color = "green";
					this.correctAnswers++;
					quizItem.found = true;
					this.soundCorrect.play();
				};
			};
		};
		if (!isCorrectOut) {
			this.missed++;
			this.quizMissesDOM.innerHTML = this.checkTime(this.missed);
			this.soundIncorrect.play();
		};
	},

	reset: function() {
		this.getHumanAPI().send("scene.reset");
		this.changeTool(this.defaultTool);
		// this.pointerTypeRadioButton.value = "Sel";
		// this.viewTypeRadioButton.value = "Norm";
		this.isQuizRunning = false;
		this.quizPanelDOM.style.display = "none";
		this.quizListDOM.innerHTML = "";
		this.humanIframe.width = this.element.clientWidth;
		this.pauseClock();
		var displayConfig = { all: false, info: false };
		this.getHumanAPI().send("ui.setDisplay", displayConfig);
		this.invariant();
	},

	restartAllQuiz: function() {
		this.isQuizRunning = false;
		for (i = 0; i++; i < 10) {
			document.getElementById("quizPanel_app" + i) = "none";
			document.getElementById("quizList_app" + i) = "";
			// this.pauseClock();
			// var displayConfig = { all: false, info: false };
			// this.getHumanAPI().send("ui.setDisplay", displayConfig);
		};
		this.invariant();
	},

	// private helper function
	toCamelCase: function(str){
		return str.split("_").map(function(word,index){
			// If it not the first word only upper case the first char and lowercase the rest.
			return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
		}).join(" ");
	},
	
	// private helper function
	// gets the BioDigital API, and creates it if necessary.
	getHumanAPI: function() {
		if (!('human' in this)) {
			// NOTE: we append this.id so that each instance has a unique id.
			// Otherwise the second, third,... instances do not respond to events.
			this.human = new HumanAPI(IFRAME_ID + this.id);
			console.log('CREATED human:', this.human, 'this.id=', this.id);
			//var _this = this;
			//this.human.send("camera.info", function(camera) {
			//	_this.currentZoom = camera.zoom;
			//});

			// Removing Navigation from Biodigital UI
			var displayConfig = { all: false, info: false };
			this.human.send("ui.setDisplay", displayConfig);
		}
		// } else if ('human' in this && !(this.quizBeenSetup)){
		// 	this.human.on("human.ready", function() {
		// 		_this.quizSetup();
		// 	});
		// };
		return this.human;
	},

	event: function(eventType, position, user_id, data, date) {
		// console.log('usc_biodigital> eventType, pos, user_id, data, dragging',
		// 		eventType, position, user_id, data, this.dragging);
		var _this = this;

		if (eventType === "pointerMove") {
			if (this.tool ==  "default" && this.dragging){
				// move (orbit camera)
				var dx = (position.x - this.dragFromX) * -1;
				var dy = (position.y - this.dragFromY)*200/this.element.clientHeight;
				this.getHumanAPI().send('camera.orbit', { yaw: dx});
				this.dragFromX = position.x;
				this.getHumanAPI().send("camera.pan", {y: dy});
				this.dragFromY = position.y;
				this.refresh(date);
			}
			// All other events check the invariant.
			// But pointer moves are common and usually boring, so we skip the invariant.
			return;
		}

		console.log(eventType, data.identifier);
		if (eventType === "pointerPress" && (data.button === "left")) {

		// TODO: startQuiz here if not already running?

			//console.log("TEST x:" + position.x + " y: " + position.y);	
			//console.log(this.element.clientHeight);
			var posY = position.y;
			var posX = position.x;
			// click
			if (this.tool ==  "default"){
				this.dragging = true;
				this.dragFromX = position.x;
				this.dragFromY = position.y;
			// 	console.log("You got the Quiz Restart button");
			} else {
		    	this.getHumanAPI().send("scene.pick", { x: posX, y: posY}, function (hit) {
					if (hit) {
						var obj = JSON.parse(JSON.stringify(hit))
						var str = obj.objectId;
						// console.log("Hit: " + JSON.stringify(hit));
						if (_this.isQuizRunning){
							_this.submitClick(str);
							// console.log("Hit Submited " + str);
							var str1 = str.split("-");
							var str2 = str1[1].substring(0, str1[1].length-3);
							_this.quizSelDOM.innerHTML = _this.toCamelCase(str2);
						};
						var nm = str + _this.id;
						var el = document.getElementById(nm);	
						if (el == null){
							hit = null;
						} else {
							//el.style.backgroundColor = "purple";
							// finish quiz
							if (_this.correctAnswers == _this.numQuestions && _this.isQuizRunning){
								_this.isQuizRunning = false;
								var quizClock = _this.interval;
								_this.pauseClock();
								_this.quizListDOM.style.fontSize = (_this.fontSize*2)+"px";
								_this.quizListDOM.style.color = "green";
								_this.quizListDOM.innerHTML = "Success!";	
								// var misses = document.createElement("li");
								// misses.style.color = "red";
								// misses.appendChild(document.createTextNode("Misses: "+_this.missed));
								// _this.quizListDOM.appendChild(misses);
								//Send the Quiz data to MongoDB Database
								console.log("score = "+_this.correctAnswers);

								// code for database connection
								// var xhr = new XMLHttpRequest();
								// xhr.open('GET', 'http://localhost:3000?id=blank+,+score=3+,+quizClock='+quizClock);
								// xhr.onreadystatechange = function () {
								// 	var DONE = 4; // readyState 4 means the request is done.
								// 	var OK = 200; // status 200 is a successful return.
								// 	if (xhr.readyState === DONE) {
								// 		if (xhr.status === OK) 	{
								// 			console.log(xhr.responseText); // 'This is the returned text.'
								// 		} else {
								// 			console.log('error'+xhr.responseText);
								// 		}
								// 	} else {
								// 		console.log('Error: ' + xhr.status); // An error occurred during the request.
								// 	}
								// }
								// xhr.send(null);	
							};
						};
					};
					_this.invariant();
				});
				// todo is this needed?
				_this.getHumanAPI().send("scene.pick", {x: posX, y: posY, triggerActions: true});
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
				this.getHumanAPI().send('camera.reset');
				this.refresh(date);
			}
		} else if (eventType === "specialKey") {
			if (data.code === 37 && data.state === "down") {
				// left
				this.getHumanAPI().send('camera.pan', { x: -PAN_STEP, y: 0.0 });
				// console.log('usc_biodigital> camera.pan left');
				this.refresh(date);
			} else if (data.code === 38 && data.state === "down") {
				// up
				this.getHumanAPI().send('camera.pan', { x: 0.0, y: -PAN_STEP });
				// console.log('usc_biodigital> camera.pan up');
				this.refresh(date);
			} else if (data.code === 39 && data.state === "down") {
				// right
				this.getHumanAPI().send('camera.pan', { x: PAN_STEP, y: 0.0 });
				// console.log('usc_biodigital> camera.pan right');
				this.refresh(date);
			} else if (data.code === 40 && data.state === "down") {
				// down
				this.getHumanAPI().send('camera.pan', { x: 0.0, y: PAN_STEP });
				// console.log('usc_biodigital> camera.pan down');
				this.refresh(date);
			}	
		} else if (eventType === "pointerDblClick") {
				//Add code to switch between pointer options
		} else if (eventType === "widgetEvent") {
			//console.log(data.identifier);
			switch (data.identifier) {
				case "Reset":
					console.log("usc_biodigital> Reset Widget");
					this.reset();
					break;
				case "Quiz":
					console.log("Quiz started!");
					this.quizSetup();
					break;
				case "PlayButton":
					console.log('usc_biodigital> Play Widget');
					this.getHumanAPI().send("timeline.play", { loop: true });
					break;
				case "play-pause":
					console.log('usc_biodigital> Pause Widget');
					this.getHumanAPI().send("timeline.pause", { loop: true });
					break;
				case "Next":
					console.log('usc_biodigital> Next Widget');
					this.getHumanAPI().send("timeline.nextChapter");
					break;
				case "Prev":
					console.log('usc_biodigital> Previous Widget');
					this.getHumanAPI().send("timeline.previousChapter");
					break;
				case "Ante":
					console.log("usc_biodigital> Starting Anterior Quiz");
					this.state.quizName = "quiz_anterior";
					this.quizSetup();
					this.reset();
					this.quizBeenSetup = false;
					break;
				case "Post":
					console.log("usc_biodigital> Starting Posterior Quiz");
					this.state.quizName = "quiz_posterior";
					this.quizSetup();
					this.reset();
					this.quizBeenSetup = false;
					break;
				case "Start":
					console.log("usc_biodigital> Starting the quiz");
					this.quizStart();
					break;
				case "ViewType":
					console.log(data.value);
					switch (data.value) {
						case "Norm":
							console.log('usc_biodigital> Normal Option');
							this.getHumanAPI().send("scene.disableXray");
							this.getHumanAPI().send("scene.selectionMode", "highlight");
							break;
						case "X-ray":
							console.log('usc_biodigital> XRay Option');
							this.getHumanAPI().send("scene.enableXray");
							this.getHumanAPI().send("scene.selectionMode", "highlight");
							break;
						case "Iso":
							console.log('usc_biodigital> Isolate Option');
							this.getHumanAPI().send("scene.selectionMode", "isolate");
							break;
						default:
							console.log("Error: unknown option");
							break;
					}	
				 	break;
				case "PointerType":
					switch (data.value) {
						case "Sel":
							console.log('usc_biodigital> Select Option');
							this.changeTool("highlight");
							break;
						case "Dis":
							console.log('usc_biodigital> Dissect Option');
							this.changeTool("dissect");
							break;
						case "Spin":
							console.log('usc_biodigital> Spin Option');
							this.changeTool("default");
							break;
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
						case "Ante":
							console.log("usc_biodigital> Starting Anterior Quiz");
							this.state.quizName = "quiz_anterior";
							this.quizSetup();
							break;
						case "Post":
							console.log("usc_biodigital> Starting Posterior Quiz");
							this.state.quizName = "quiz_posterior";
							this.quizSetup();
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
		this.invariant();
	},

	zoomInOut: function(delta) {
		// Zoom IN (positive delta) or OUT (negative delta)
		// Zoom levels are from 0.0 .. 1.0, so use small delta values!
		this.currentZoom = Math.max(0.0, Math.min(1.0, this.currentZoom + delta));
		this.getHumanAPI().send('camera.zoom', this.currentZoom);
		//console.log('usc_biodigital> scroll to zoom', this.currentZoom);
		this.invariant();
	}
});