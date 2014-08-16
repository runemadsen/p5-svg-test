/*! p5.sound.js v0.121 2014-08-08 */
/**
 *  p5.sound extends p5 with <a href="http://www.w3.org/TR/webaudio/"
 *  target="_blank">Web Audio</a> functionality including audio input,
 *  playback, analysis and synthesis.
 *  <br/><br/>
 *  Classes include:
 *  <br/>
 *  <a href="#/p5.SoundFile"><b>p5.SoundFile</b></a>: Load and play sound files.<br/>
 *  <a href="#/p5.Amplitude"><b>p5.Amplitude</b></a>: Get the current volume of a sound.<br/>
 *  <a href="#/p5.AudioIn"><b>p5.AudioIn</b></a>: Get sound from an input source, typically
 *    a computer microphone.<br/>
 *  <a href="#/p5.FFT"><b>p5.FFT</b></a>: Analyze the frequency of sound. Returns
 *    results from the frequency spectrum or time domain (waveform).<br/>
 *  <a href="#/p5.Oscillator"><b>p5.Oscillator</b></a>: Generate Sine,
 *    Triangle, Square and Sawtooth waveforms for playback and/or parameter
 *    modulation. Base class of <a href="#/p5.Noise">p5.Noise</a>
 *    (white, pink, brown) and <a href="#/p5.Pulse">p5.Pulse</a>.
 *    <br/>
 *  <a href="#/p5.Env"><b>p5.Env</b></a>: An Envelope is a series
 *    of fades over time. Often used to control an object's
 *    output gain level as an "ADSR Envelope" (Attack, Decay,
 *    Sustain, Release). Can also modulate other parameters.
 *  <br/><br/>
 *  p5.sound is on <a href="https://github.com/therewasaguy/p5.sound/">GitHub</a>.
 *  Download the latest version 
 *  <a href="https://github.com/therewasaguy/p5.sound/blob/master/lib/p5.sound.js">here</a>.
 *  
 *  @module p5.sound
 *  @submodule p5.sound
 *  @for p5.sound
 *  @main
 */
/**
 *  p5.sound developed by Jason Sigal for the Processing Foundation, Google Summer of Code 2014.
 *  
 *  http://github.com/therewasaguy/p5.sound
 *
 *  Some of the many audio libraries & resources that inspire p5.sound:
 *   - TONE.js (c) Yotam Mann, 2014. Licensed under The MIT License (MIT). https://github.com/TONEnoTONE/Tone.js
 *   - buzz.js (c) Jay Salvat, 2013. Licensed under The MIT License (MIT). http://buzz.jaysalvat.com/
 *   - Boris Smus Web Audio API book, 2013. Licensed under the Apache License http://www.apache.org/licenses/LICENSE-2.0
 *   - wavesurfer.js https://github.com/katspaugh/wavesurfer.js
 *   - Wilm Thoben's Sound library for Processing https://github.com/processing/processing/tree/master/java/libraries/sound
 *   
 *   Web Audio API: http://w3.org/TR/webaudio/
 */
var sndcore;
sndcore = function () {
  'use strict';
  /**
   * Web Audio SHIMS and helper functions to ensure compatability across browsers
   */
  // If window.AudioContext is unimplemented, it will alias to window.webkitAudioContext.
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  // Create the Audio Context
  var audiocontext = new window.AudioContext();
  /**
   * <p>Returns the Audio Context for this sketch. Useful for users
   * who would like to dig deeper into the <a target='_blank' href=
   * 'http://webaudio.github.io/web-audio-api/'>Web Audio API
   * </a>.</p>
   *
   * @method getAudioContext
   * @return {Object}    AudioContext for this sketch
   */
  p5.prototype.getAudioContext = function () {
    return audiocontext;
  };
  // Polyfills & SHIMS (inspired by tone.js and the AudioContext MonkeyPatch https://github.com/cwilso/AudioContext-MonkeyPatch/ (c) 2013 Chris Wilson, Licensed under the Apache License) //
  if (typeof audiocontext.createGain !== 'function') {
    window.audioContext.createGain = window.audioContext.createGainNode;
  }
  if (typeof audiocontext.createDelay !== 'function') {
    window.audioContext.createDelay = window.audioContext.createDelayNode;
  }
  if (typeof window.AudioBufferSourceNode.prototype.start !== 'function') {
    window.AudioBufferSourceNode.prototype.start = window.AudioBufferSourceNode.prototype.noteGrainOn;
  }
  if (typeof window.AudioBufferSourceNode.prototype.stop !== 'function') {
    window.AudioBufferSourceNode.prototype.stop = window.AudioBufferSourceNode.prototype.noteOff;
  }
  if (typeof window.OscillatorNode.prototype.start !== 'function') {
    window.OscillatorNode.prototype.start = window.OscillatorNode.prototype.noteOn;
  }
  if (typeof window.OscillatorNode.prototype.stop !== 'function') {
    window.OscillatorNode.prototype.stop = window.OscillatorNode.prototype.noteOff;
  }
  if (!window.AudioContext.prototype.hasOwnProperty('createScriptProcessor')) {
    window.AudioContext.prototype.createScriptProcessor = window.AudioContext.prototype.createJavaScriptNode;
  }
  // Polyfill for AudioIn, also handled by p5.dom createCapture
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
  /**
   * Determine which filetypes are supported (inspired by buzz.js)
   * The audio element (el) will only be used to test browser support for various audio formats
   */
  var el = document.createElement('audio');
  p5.prototype.isSupported = function () {
    return !!el.canPlayType;
  };
  var isOGGSupported = function () {
    return !!el.canPlayType && el.canPlayType('audio/ogg; codecs="vorbis"');
  };
  var isMP3Supported = function () {
    return !!el.canPlayType && el.canPlayType('audio/mpeg;');
  };
  var isWAVSupported = function () {
    return !!el.canPlayType && el.canPlayType('audio/wav; codecs="1"');
  };
  var isAACSupported = function () {
    return !!el.canPlayType && (el.canPlayType('audio/x-m4a;') || el.canPlayType('audio/aac;'));
  };
  var isAIFSupported = function () {
    return !!el.canPlayType && el.canPlayType('audio/x-aiff;');
  };
  p5.prototype.isFileSupported = function (extension) {
    switch (extension.toLowerCase()) {
    case 'mp3':
      return isMP3Supported();
    case 'wav':
      return isWAVSupported();
    case 'ogg':
      return isOGGSupported();
    case 'aac', 'm4a', 'mp4':
      return isAACSupported();
    case 'aif', 'aiff':
      return isAIFSupported();
    default:
      return false;
    }
  };
}();
var master;
master = function () {
  'use strict';
  /**
   * Master contains AudioContext and the master sound output.
   */
  var Master = function () {
    var audiocontext = p5.prototype.getAudioContext();
    this.input = audiocontext.createGain();
    this.output = audiocontext.createGain();
    //put a hard limiter on the output
    this.limiter = audiocontext.createDynamicsCompressor();
    this.limiter.threshold.value = 0;
    this.limiter.ratio.value = 100;
    this.audiocontext = audiocontext;
    this.output.disconnect(this.audiocontext.destination);
    // an array of input sources
    this.inputSources = [];
    // connect input to limiter
    this.input.connect(this.limiter);
    // connect limiter to output
    this.limiter.connect(this.output);
    // meter is just for measuring global Amplitude
    this.meter = audiocontext.createGain();
    this.output.connect(this.meter);
    // connect output to destination
    this.output.connect(this.audiocontext.destination);
    // an array of all sounds in the sketch
    this.soundArray = [];
    // file extensions to search for
    this.extensions = [];
  };
  // create a single instance of the p5Sound / master output for use within this sketch
  var p5sound = new Master();
  /**
   *  p5.soundOut is the p5.sound master output. It sends output to
   *  the destination of this window's web audio context. It contains 
   *  Web Audio API nodes including a dyanmicsCompressor (<code>.limiter</code>),
   *  and Gain Nodes for <code>.input</code> and <code>.output</code>.
   *  
   *  @property p5.soundOut
   *  @type {Object}
   */
  p5.soundOut = p5sound;
  return p5sound;
}(sndcore);
var helpers;
helpers = function () {
  'use strict';
  var p5sound = master;
  /**
   *  <p>Set the master amplitude (volume) for sound in this sketch.</p>
   *
   *  <p>Note that values greater than 1.0 may lead to digital distortion.</p>
   * 
   *  <p><b>How This Works</b>: When you load the p5Sound module, it
   *  creates a single instance of p5sound. All sound objects in this
   *  module output to p5sound before reaching your computer's output.
   *  So if you change the amplitude of p5sound, it impacts all of the
   *  sound in this module.</p>
   *
   *  @method masterVolume
   *  @param {Number} volume   Master amplitude (volume) for sound in
   *                           this sketch. Should be between 0.0
   *                           (silence) and 1.0. Values greater than
   *                           1.0 may lead to digital distortion.
   *  @example
   *  <div><code>
   *  masterVolume(.5);
   *  </code></div>
   *   
   */
  p5.prototype.masterVolume = function (vol) {
    p5sound.output.gain.value = vol;
  };
  /**
   * Returns a number representing the sample rate, in samples per second,
   * of all sound objects in this audio context. It is determined by the
   * sampling rate of your operating system's sound card, and it is not
   * currently possile to change.
   * It is often 44100, or twice the range of human hearing.
   *
   * @method sampleRate
   * @return {Number} samplerate samples per second
   */
  p5.prototype.sampleRate = function () {
    return p5sound.audiocontext.sampleRate;
  };
  p5.prototype.getMasterVolume = function () {
    return p5sound.output.gain.value;
  };
  /**
   *  Returns the closest MIDI note value for
   *  a given frequency.
   *  
   *  @param  {Number} frequency A freqeuncy, for example, the "A"
   *                             above Middle C is 440Hz
   *  @return {Number}   MIDI note value
   */
  p5.prototype.freqToMidi = function (f) {
    var mathlog2 = Math.log(f / 440) / Math.log(2);
    var m = Math.round(12 * mathlog2) + 57;
    return m;
  };
  /**
   *  Returns the frequency value of a MIDI note value.
   *  General MIDI treats notes as integers where middle C
   *  is 60, C# is 61, D is 62 etc. Useful for generating
   *  musical frequencies with oscillators.
   *  
   *  @method  midiToFreq
   *  @param  {Number} midiNote The number of a MIDI note
   *  @return {Number} Frequency value of the given MIDI note
   *  @example
   *  <div><code>
   *  var notes = [60, 64, 67, 72];
   *  var i = 0;
   *  
   *  function setup() {
   *    osc = new p5.Oscillator('Triangle');
   *    osc.start();
   *    frameRate(1);
   *  }
   *  
   *  function draw() {
   *    var freq = midiToFreq(notes[i]);
   *    osc.freq(freq);
   *    i++;
   *    if (i >= notes.length){
   *      i = 0;
   *    }
   *  }
   *  </code></div>
   */
  p5.prototype.midiToFreq = function (m) {
    return 440 * Math.pow(2, (m - 69) / 12);
  };
  /**
   *  List the SoundFile formats that you will include. LoadSound 
   *  will search your directory for these extensions, and will pick
   *  a format that is compatable with the client's web browser.
   *  <a href="http://media.io/">Here</a> is a free online file
   *  converter.
   *  
   *  @method soundFormats
   *  @param {String|Strings} formats i.e. 'mp3', 'wav', 'ogg'
   *  @example
   *  <div><code>
   *  function preload() {
   *    // set the global sound formats
   *    soundFormats('mp3', 'ogg');
   *    
   *    // load either beatbox.mp3, or .ogg, depending on browser
   *    mySound = loadSound('../sounds/beatbox.mp3');
   *  }
   *
   *  function setup() {
   *    mySound.play();
   *  }
   *  </code></div>
   */
  p5.prototype.soundFormats = function () {
    // reset extensions array
    p5sound.extensions = [];
    // add extensions
    for (var i = 0; i < arguments.length; i++) {
      arguments[i] = arguments[i].toLowerCase();
      if ([
          'mp3',
          'wav',
          'ogg',
          'm4a',
          'aac'
        ].indexOf(arguments[i]) > -1) {
        p5sound.extensions.push(arguments[i]);
      } else {
        throw arguments[i] + ' is not a valid sound format!';
      }
    }
  };
  // register removeSound to dispose of p5sound SoundFiles and Oscillators when sketch ends
  p5.prototype._registerRemoveFunc('disposeSound');
  p5.prototype.disposeSound = function () {
    for (var i = 0; i < p5sound.soundArray.length; i++) {
      console.log(p5sound.soundArray[i]);
      p5sound.soundArray[i].dispose();
      console.log(p5sound.soundArray[i]);
    }
  };
}(master);
var soundfile;
soundfile = function () {
  'use strict';
  var p5sound = master;
  /**
   *  <p>SoundFile object with a path to a file.</p>
   *  
   *  <p>The p5.SoundFile may not be available immediately because
   *  it loads the file information asynchronously.</p>
   * 
   *  <p>To do something with the sound as soon as it loads
   *  pass the name of a function as the second parameter.</p>
   *  
   *  <p>Only one file path is required. However, audio file formats 
   *  (i.e. mp3, ogg, wav and m4a/aac) are not supported by all
   *  web browsers. If you want to ensure compatability, instead of a single
   *  file path, you may include an Array of filepaths, and the browser will
   *  choose a format that works.</p>
   * 
   *  @class p5.SoundFile
   *  @constructor
   *  @param {String/Array} path   path to a sound file (String). Optionally,
   *                               you may include multiple file formats in
   *                               an array.
   *  @param {Function} [callback]   Name of a function to call once file loads
   *  @return {Object}    p5.SoundFile Object
   *  @example 
   *  <div><code>
   *  function preload() {
   *    mySound = loadSound('assets/drum.mp3');
   *  }
   *
   *  function setup() {
   *    mySound.play();
   *  }
   * 
   * </code></div>
   */
  p5.SoundFile = function (paths, onload) {
    var path;
    // if path is a single string, check to see if extension is provided
    if (typeof paths === 'string') {
      path = paths;
      // see if extension is provided
      var extTest = path.split('.').pop();
      // if an extension is provided...
      if ([
          'mp3',
          'wav',
          'ogg',
          'm4a',
          'aac'
        ].indexOf(extTest) > -1) {
        var supported = p5.prototype.isFileSupported(extTest);
        if (supported) {
          path = path;
        } else {
          var pathSplit = path.split('.');
          var pathCore = pathSplit[pathSplit.length - 2];
          for (var i = 0; i < p5sound.extensions.length; i++) {
            var extension = p5sound.extensions[i];
            var supported = p5.prototype.isFileSupported(extension);
            if (supported) {
              pathCore = '';
              for (var i = 0; i <= pathSplit.length - 2; i++) {
                pathCore.push(pathSplit[i]);
              }
              path = pathCore + '.' + extension;
              console.log(path);
              break;
            }
          }
        }
      } else {
        for (var i = 0; i < p5sound.extensions.length; i++) {
          var extension = p5sound.extensions[i];
          var supported = p5.prototype.isFileSupported(extension);
          if (supported) {
            path = path + '.' + extension;
            break;
          }
        }
      }
    } else if (typeof paths === 'object') {
      for (var i = 0; i < paths.length; i++) {
        var extension = paths[i].split('.').pop();
        var supported = p5.prototype.isFileSupported(extension);
        if (supported) {
          console.log('.' + extension + ' is ' + supported + ' supported by your browser.');
          path = paths[i];
          break;
        }
      }
    }
    // player variables
    this.url = path;
    // array of sources so that they can all be stopped!
    this.sources = [];
    // current source
    this.source = null;
    this.buffer = null;
    this.playbackRate = 1;
    this.gain = 1;
    this.input = p5sound.audiocontext.createGain();
    this.output = p5sound.audiocontext.createGain();
    this.reversed = false;
    // start and end of playback / loop
    this.startTime = 0;
    this.endTime = null;
    // playing - defaults to false
    this.playing = false;
    // paused - defaults to true
    this.paused = null;
    // "restart" would stop playback before retriggering
    this.mode = 'sustain';
    // time that playback was started, in millis
    this.startMillis = null;
    this.amplitude = new p5.Amplitude();
    this.output.connect(this.amplitude.input);
    // stereo panning
    this.panPosition = 0;
    this.panner = p5sound.audiocontext.createPanner();
    this.panner.panningModel = 'equalpower';
    this.panner.distanceModel = 'linear';
    this.panner.setPosition(0, 0, 0);
    this.output.connect(this.panner);
    // by default, the panner is connected to the p5s destination
    this.panner.connect(p5sound.input);
    this.load(onload);
    // add this p5.SoundFile to the soundArray
    p5sound.soundArray.push(this);
  };
  // register preload handling of loadSound
  p5.prototype._registerPreloadFunc('loadSound');
  /**
   *  loadSound() returns a new p5.SoundFile from a specified
   *  path. If called during preload(), the p5.SoundFile will be ready
   *  to play in time for setup() and draw(). If called outside of
   *  preload, the p5.SoundFile will not be ready immediately, so
   *  loadSound accepts a callback as the second parameter. Using a
   *  <a href="https://github.com/lmccart/p5.js/wiki/Local-server">
   *  local server</a> is recommended when loading external files.
   *  
   *  @method loadSound
   *  @param  {String/Array}   path     Path to the sound file, or an array with
   *                                    paths to soundfiles in multiple formats
   *                                    i.e. ['sound.ogg', 'sound.mp3']
   *  @param {Function} [callback]   Name of a function to call once file loads
   *  @return {SoundFile}            Returns a p5.SoundFile
   *  @example 
   *  <div><code>
   *  function preload() {
   *   mySound = loadSound('assets/drum.mp3');
   *  }
   *
   *  function setup() {
   *    mySound.loop();
   *  }
   *  </code></div>
   */
  p5.prototype.loadSound = function (path, callback) {
    // if loading locally without a server
    if (window.location.origin.indexOf('file://') > -1) {
      alert('This sketch may require a server to load external files. Please see http://bit.ly/1qcInwS');
    }
    var s = new p5.SoundFile(path, callback);
    return s;
  };
  /**
   * This is a helper function that the p5.SoundFile calls to load
   * itself. Accepts a callback (the name of another function)
   * as an optional parameter.
   *
   * @private
   * @param {Function} [callback]   Name of a function to call once file loads
   */
  p5.SoundFile.prototype.load = function (callback) {
    if (!this.buffer) {
      var request = new XMLHttpRequest();
      request.open('GET', this.url, true);
      request.responseType = 'arraybuffer';
      // decode asyncrohonously
      var self = this;
      request.onload = function () {
        var ac = p5.prototype.getAudioContext();
        ac.decodeAudioData(request.response, function (buff) {
          self.buffer = buff;
          if (callback) {
            callback(self);
          }
        });
      };
      request.send();
    } else {
      if (callback) {
        callback(this);
      }
    }
  };
  /**
   *  Returns true if the sound file finished loading successfully.
   *  
   *  @method  isLoaded
   *  @return {Boolean} 
   */
  p5.SoundFile.prototype.isLoaded = function () {
    if (this.buffer) {
      return true;
    } else {
      return false;
    }
  };
  /**
   * Play the p5.SoundFile
   *
   * @method play
   * @param {Number} [rate]             (optional) playback rate
   * @param {Number} [amp]              (optional) amplitude (volume)
   *                                     of playback
   * @param {Number} [startTime]        (optional) startTime in seconds
   * @param {Number} [endTime]          (optional) endTime in seconds
   */
  p5.SoundFile.prototype.play = function (rate, amp, startTime, endTime) {
    var now = p5sound.audiocontext.currentTime;
    // TO DO: if already playing, create array of buffers for easy stop()
    if (this.buffer) {
      // handle restart playmode
      if (this.mode === 'restart' && this.buffer && this.source) {
        this.source.stop();
      }
      if (startTime) {
        if (startTime >= 0 && startTime < this.buffer.duration) {
          this.startTime = startTime;
        } else {
          throw 'start time out of range';
        }
      }
      if (endTime) {
        if (endTime >= 0 && endTime <= this.buffer.duration) {
          this.endTime = endTime;
        } else {
          throw 'end time out of range';
        }
      } else {
        this.endTime = this.buffer.duration;
      }
      // make a new source
      this.source = p5sound.audiocontext.createBufferSource();
      this.source.buffer = this.buffer;
      this.source.loop = this.looping;
      if (this.source.loop === true) {
        this.source.loopStart = this.startTime;
        this.source.loopEnd = this.endTime;
      }
      this.source.onended = function () {
        if (this.playing) {
          this.playing = !this.playing;
          this.stop();
        }
      };
      // firefox method of controlling gain without resetting volume
      if (!this.source.gain) {
        this.source.gain = p5sound.audiocontext.createGain();
        this.source.connect(this.source.gain);
        // set local amp if provided, otherwise 1
        this.source.gain.gain.value = amp || 1;
        this.source.gain.connect(this.output);
      } else {
        this.source.gain.value = amp || 1;
        this.source.connect(this.output);
      }
      this.source.playbackRate.cancelScheduledValues(now);
      rate = rate || Math.abs(this.playbackRate);
      this.source.playbackRate.setValueAtTime(rate, now);
      if (this.paused) {
        this.wasUnpaused = true;
      }
      // play the sound
      if (this.paused && this.wasUnpaused) {
        this.source.start(0, this.pauseTime, this.endTime);
      } else {
        this.wasUnpaused = false;
        this.pauseTime = 0;
        this.source.start(0, this.startTime, this.endTime);
      }
      this.startSeconds = now;
      this.playing = true;
      this.paused = false;
      // add the source to sources array
      this.sources.push(this.source);
    } else {
      throw 'not ready to play file, buffer has yet to load. Try preload()';
    }
  };
  /**
   *  p5.SoundFile has two play modes: <code>restart</code> and
   *  <code>sustain</code>. Play Mode determines what happens to a
   *  p5.SoundFile if it is triggered while in the middle of playback.
   *  In sustain mode, playback will continue simultaneous to the
   *  new playback. In restart mode, play() will stop playback
   *  and start over. Sustain is the default mode. 
   *  
   *  @method  playMode
   *  @param  {String} str 'restart' or 'sustain'
   *  @example
   *  <div><code>
   *  function setup(){
   *    mySound = loadSound('assets/Damscray_DancingTiger.mp3');
   *  }
   *  function mouseClicked() {
   *    mySound.playMode('sustain');
   *    mySound.play();
   *  }
   *  function keyPressed() {
   *    mySound.playMode('restart');
   *    mySound.play();
   *  }
   * 
   * </code></div>
   */
  p5.SoundFile.prototype.playMode = function (str) {
    var s = str.toLowerCase();
    // if restart, stop all other sounds from playing
    if (s === 'restart' && this.buffer && this.source) {
      for (var i = 0; i < this.sources.length - 1; i++) {
        this.sources[i].stop();
      }
    }
    // set play mode to effect future playback
    if (s === 'restart' || s === 'sustain') {
      this.mode = s;
    } else {
      throw 'Invalid play mode. Must be either "restart" or "sustain"';
    }
  };
  /**
   *  Toggle whether a sound file is playing or paused.
   * 
   *  Pauses a file that is currently playing. If the file is not
   *  playing, then nothing will happen.
   *
   *  Resume playback with .play(), will play from the paused
   *  position. If p5.SoundFile had been set to loop before it was
   *  paused, it will continue to loop after it is unpaused with
   *  .play().
   *
   *  @method pause
   *  @example
   *  <div><code>
   *  var soundFile;
   *  
   *  function preload() {
   *    soundFormats('ogg', 'mp3');
   *    soundFile = loadSound('../_files/Damscray_-_Dancing_Tiger_02');
   *  }
   *  function setup() {
   *    background(0, 255, 0);
   *    soundFile.loop();
   *  }
   *  function keyTyped() {
   *    if (key == 'p') {
   *      soundFile.pause();
   *      background(255, 0, 0);
   *    }
   *  }
   *  
   *  function keyReleased() {
   *    if (key == 'p') {
   *      soundFile.play();
   *      background(0, 255, 0);
   *    }
   */
  p5.SoundFile.prototype.pause = function () {
    var keepLoop = this.looping;
    if (this.isPlaying() && this.buffer && this.source) {
      this.pauseTime = this.currentTime();
      this.source.stop();
      this.paused = true;
      this.wasUnpaused = false;
      this.playing = false;
    }
  };
  /**
   * Loop the p5.SoundFile. Accepts optional parameters to set the
   * playback rate, playback volume, loopStart, loopEnd.
   *
   * @method loop
   * @param {Number} [rate]             (optional) playback rate
   * @param {Number} [amp]              (optional) playback volume
   * @param {Number} [loopStart]        (optional) startTime in seconds
   * @param {Number} [loopEnd]          (optional) endTime in seconds
   */
  p5.SoundFile.prototype.loop = function (rate, amp, loopStart, loopEnd) {
    this.looping = true;
    this.play(rate, amp, loopStart, loopEnd);
  };
  /**
   * Set a p5.SoundFile's looping flag to true or false. If the sound
   * is currently playing, this change will take effect when it
   * reaches the end of the current playback. 
   * 
   * @param {Boolean} Boolean   set looping to true or false
   */
  p5.SoundFile.prototype.setLoop = function (bool) {
    if (bool === true) {
      this.looping = true;
    } else if (bool === false) {
      this.looping = false;
    } else {
      throw 'Error: setLoop accepts either true or false';
    }
    if (this.source) {
      this.source.loop = this.looping;
    }
  };
  /**
   * Returns 'true' if a p5.SoundFile is looping, 'false' if not.
   *
   * @return {Boolean}
   */
  p5.SoundFile.prototype.isLooping = function () {
    if (!this.source) {
      return false;
    }
    if (this.looping === true && this.isPlaying() === true) {
      return true;
    }
    return false;
  };
  /**
   *  Returns true if a p5.SoundFile is playing, false if not (i.e.
   *  paused or stopped).
   *
   *  @method isPlaying
   *  @return {Boolean}
   */
  p5.SoundFile.prototype.isPlaying = function () {
    return this.playing;
  };
  /**
   *  Returns true if a p5.SoundFile is paused, false if not (i.e.
   *  playing or stopped).
   *
   *  @method  isPaused
   *  @return {Boolean}
   */
  p5.SoundFile.prototype.isPaused = function () {
    if (!this.paused) {
      return false;
    }
    return this.paused;
  };
  /**
   * Stop soundfile playback.
   *
   * @method stop
   */
  p5.SoundFile.prototype.stop = function () {
    if (this.mode == 'sustain') {
      this.stopAll();
      this.playing = false;
      this.pauseTime = 0;
      this.wasUnpaused = false;
      this.paused = false;
    } else if (this.buffer && this.source) {
      this.source.stop();
      this.playing = false;
      this.pauseTime = 0;
      this.wasUnpaused = false;
      this.paused = false;
    }
  };
  /**
   *  Stop playback on all of this soundfile's sources.
   *  @private
   */
  p5.SoundFile.prototype.stopAll = function () {
    if (this.buffer && this.source) {
      for (var i = 0; i < this.sources.length; i++) {
        if (this.sources[i] !== null) {
          this.sources[i].stop();
        }
      }
    }
  };
  /**
   *  Multiply the output volume (amplitude) of a sound file
   *  between 0.0 (silence) and 1.0 (full volume).
   *  1.0 is the maximum amplitude of a digital sound, so multiplying
   *  by greater than 1.0 may cause digital distortion. To
   *  fade, provide a <code>rampTime</code> parameter. For more
   *  complex fades, see the Env class.
   *
   *  @method  setVolume
   *  @param {Number} volume  Volume (amplitude) between 0.0 and 1.0
   *  @param {Number} [rampTime]  Fade for t seconds
   *  @param {Number} [timeFromNow]  Schedule this event to happen at
   *                                 t seconds in the future
   */
  p5.SoundFile.prototype.setVolume = function (vol, rampTime, tFromNow) {
    var rampTime = rampTime || 0;
    var tFromNow = tFromNow || 0;
    var now = p5sound.audiocontext.currentTime;
    var currentVol = this.output.gain.value;
    this.output.gain.cancelScheduledValues(now);
    this.output.gain.setValueAtTime(currentVol, now + tFromNow);
    this.output.gain.linearRampToValueAtTime(vol, now + tFromNow + rampTime);
  };
  // same as setVolume, to match Processing Sound
  p5.SoundFile.prototype.amp = p5.SoundFile.prototype.setVolume;
  // these are the same thing
  p5.SoundFile.prototype.fade = p5.SoundFile.prototype.setVolume;
  /**
   * Set the stereo panning of a p5Sound object to
   * a floating point number between -1.0 (left) and 1.0 (right).
   * Default is 0.0 (center).
   *
   * @method pan
   * @param {Number} [panValue]     Set the stereo panner
   * @example
   * <div><code>
   *
   *  var ball = {};
   *  var soundFile;
   *
   *  function setup() {
   *    soundFormats('ogg', 'mp3');
   *    soundFile = loadSound('assets/beatbox.mp3');
   *  }
   *  
   *  function draw() {
   *    background(0);
   *    ball.x = constrain(mouseX, 0, width);
   *    ellipse(ball.x, height/2, 20, 20)
   *  }
   *  
   *  function mousePressed(){
   *    // map the ball's x location to a panning degree 
   *    // between -1.0 (left) and 1.0 (right)
   *    var panning = map(ball.x, 0., width,-1.0, 1.0);
   *    soundFile.pan(panning);
   *    soundFile.play();
   *  }
   *  </div></code>
   */
  p5.SoundFile.prototype.pan = function (pval) {
    this.panPosition = pval;
    pval = pval * 90;
    var xDeg = parseInt(pval);
    var zDeg = xDeg + 90;
    if (zDeg > 90) {
      zDeg = 180 - zDeg;
    }
    var x = Math.sin(xDeg * (Math.PI / 180));
    var z = Math.sin(zDeg * (Math.PI / 180));
    this.panner.setPosition(x, 0, z);
  };
  /**
   * Returns the current stereo pan position (-1.0 to 1.0)
   *
   * @return {Number} Returns the stereo pan setting of the Oscillator
   *                          as a number between -1.0 (left) and 1.0 (right).
   *                          0.0 is center and default.
   */
  p5.SoundFile.prototype.getPan = function () {
    return this.panPosition;
  };
  /**
   *  Set the playback rate of a sound file. Will change the speed and the pitch.
   *  Values less than zero will reverse the audio buffer.
   *
   *  @method rate
   *  @param {Number} [playbackRate]     Set the playback rate. 1.0 is normal,
   *                                     .5 is half-speed, 2.0 is twice as fast.
   *                                     Must be greater than zero.
   *  @example
   *  <div><code>
   *  var song;
   *  
   *  function preload() {
   *    song = loadSound('assets/Damscray_DancingTiger.mp3');
   *  }
   *
   *  function setup() {
   *    song.loop();
   *  }
   *
   *  function draw() {
   *    background(200);
   *    
   *    // Set the rate to a range between 0.1 and 4
   *    // Changing the rate also alters the pitch
   *    var speed = map(mouseY, 0.1, height, 0, 2);
   *    speed = constrain(speed, 0.01, 4);
   *    song.rate(speed);
   *    
   *    // Draw a circle to show what is going on
   *    stroke(0);
   *    fill(51, 100);
   *    ellipse(mouseX, 100, 48, 48);
   *  }
   *  
   * </code>
   * </div>
   *  
   */
  p5.SoundFile.prototype.rate = function (playbackRate) {
    if (this.playbackRate === playbackRate && this.source.playbackRate.value === playbackRate) {
      return;
    }
    this.playbackRate = playbackRate;
    var rate = playbackRate;
    if (this.playbackRate === 0 && this.playing) {
      this.pause();
    }
    if (this.playbackRate < 0 && !this.reversed) {
      var cPos = this.currentTime();
      var cRate = this.source.playbackRate.value;
      this.pause();
      this.reverseBuffer();
      rate = Math.abs(playbackRate);
      var newPos = (cPos - this.duration()) / rate;
      this.pauseTime = newPos;
      this.play();
    } else if (this.playbackRate > 0 && this.reversed) {
      this.reverseBuffer();
    }
    if (this.source) {
      var now = p5sound.audiocontext.currentTime;
      this.source.playbackRate.cancelScheduledValues(now);
      this.source.playbackRate.linearRampToValueAtTime(Math.abs(rate), now);
    }
  };
  p5.SoundFile.prototype.getPlaybackRate = function () {
    return this.playbackRate;
  };
  /**
   * Returns the duration of a sound file.
   *
   * @method duration
   * @return {Number}     The duration of the soundFile in seconds.
   */
  p5.SoundFile.prototype.duration = function () {
    // Return Duration
    if (this.buffer) {
      return this.buffer.duration;
    } else {
      return 0;
    }
  };
  /**
   * Return the current position of the p5.SoundFile playhead, in seconds.
   * Note that if you change the playbackRate while the p5.SoundFile is
   * playing, the results may not be accurate.
   *
   * @method currentTime
   * @return {Number}   currentTime of the soundFile in seconds.
   */
  p5.SoundFile.prototype.currentTime = function () {
    // TO DO --> make reverse() flip these values appropriately ?
    var howLong;
    if (this.isPlaying()) {
      var timeSinceStart = p5sound.audiocontext.currentTime - this.startSeconds + this.startTime + this.pauseTime;
      howLong = timeSinceStart * this.playbackRate % (this.duration() * this.playbackRate);
      // howLong = ( (p5sound.audiocontext.currentTime - this.startSeconds + this.startTime) * this.source.playbackRate.value ) % this.duration();
      return howLong;
    } else if (this.paused) {
      return this.pauseTime;
    } else {
      return this.startTime;
    }
  };
  /**
   * Move the playhead of the song to a position, in seconds. Start
   * and Stop time. If none are given, will reset the file to play
   * entire duration from start to finish.
   *
   * @method jump
   * @param {Number} cueTime    cueTime of the soundFile in seconds.
   * @param {Number} endTime    endTime of the soundFile in seconds.
   */
  p5.SoundFile.prototype.jump = function (cueTime, endTime) {
    if (cueTime < 0 || cueTime > this.buffer.duration) {
      throw 'jump time out of range';
    }
    if (endTime < cueTime || endTime > this.buffer.duration) {
      throw 'end time out of range';
    }
    this.startTime = cueTime || 0;
    if (endTime) {
      this.endTime = endTime;
    } else {
      this.endTime = this.buffer.duration;
    }
    // this.endTime = endTime || this.buffer.duration;
    if (this.isPlaying()) {
      this.stop();
      this.play(cueTime, this.endTime);
    }
  };
  /**
  * Return the number of channels in a sound file.
  * For example, Mono = 1, Stereo = 2.
  *
  * @method channels
  * @return {Number} [channels]
  */
  p5.SoundFile.prototype.channels = function () {
    return this.buffer.numberOfChannels;
  };
  /**
  * Return the sample rate of the sound file.
  *
  * @method sampleRate
  * @return {Number} [sampleRate]
  */
  p5.SoundFile.prototype.sampleRate = function () {
    return this.buffer.sampleRate;
  };
  /**
  * Return the number of samples in a sound file.
  * Equal to sampleRate * duration.
  *
  * @method frames
  * @return {Number} [sampleCount]
  */
  p5.SoundFile.prototype.frames = function () {
    return this.buffer.length;
  };
  /**
   * Returns an array of amplitude peaks in a p5.SoundFile that can be
   * used to draw a static waveform. Scans through the p5.SoundFile's
   * audio buffer to find the greatest amplitudes. Accepts one
   * parameter, 'length', which determines size of the array.
   * Larger arrays result in more precise waveform visualizations.
   * 
   * Inspired by Wavesurfer.js.
   * 
   * @method  getPeaks
   * @params {Number} [length] length is the size of the returned array.
   *                          Larger length results in more precision.
   *                          Defaults to 5*width of the browser window.
   * @returns {Float32Array} Array of peaks.
   */
  p5.SoundFile.prototype.getPeaks = function (length) {
    if (this.buffer) {
      // set length to window's width if no length is provided
      if (!length) {
        length = window.width * 5;
      }
      if (this.buffer) {
        var buffer = this.buffer;
        var sampleSize = buffer.length / length;
        var sampleStep = ~~(sampleSize / 10) || 1;
        var channels = buffer.numberOfChannels;
        var peaks = new Float32Array(length);
        for (var c = 0; c < channels; c++) {
          var chan = buffer.getChannelData(c);
          for (var i = 0; i < length; i++) {
            var start = ~~(i * sampleSize);
            var end = ~~(start + sampleSize);
            var max = 0;
            for (var j = start; j < end; j += sampleStep) {
              var value = chan[j];
              if (value > max) {
                max = value;
              } else if (-value > max) {
                max = value;
              }
            }
            if (c === 0 || max > peaks[i]) {
              peaks[i] = max;
            }
          }
        }
        return peaks;
      }
    } else {
      throw 'Cannot load peaks yet, buffer is not loaded';
    }
  };
  /**
   *  Reverses the p5.SoundFile's buffer source.
   *  Playback must be handled separately (see example).
   *
   *  @method  reverseBuffer
   *  @example
   *  <div><code>
   *  var drum;
   *  
   *  function preload() {
   *    drum = loadSound('assets/drum.mp3');
   *  }
   *
   *  function setup() {
   *    drum.reverseBuffer();
   *    drum.play();
   *  }
   *  
   * </code>
   * </div>
   */
  p5.SoundFile.prototype.reverseBuffer = function () {
    if (this.buffer) {
      Array.prototype.reverse.call(this.buffer.getChannelData(0));
      Array.prototype.reverse.call(this.buffer.getChannelData(1));
      // set reversed flag
      this.reversed = !this.reversed;
    } else {
      throw 'SoundFile is not done loading';
    }
  };
  // private function for onended behavior
  p5.SoundFile.prototype._onEnded = function (s) {
    s.onended = function (s) {
      s.stop();
    };
  };
  p5.SoundFile.prototype.add = function () {
  };
  p5.SoundFile.prototype.dispose = function () {
    if (this.buffer && this.source) {
      for (var i = 0; i < this.sources.length - 1; i++) {
        if (this.sources[i] !== null) {
          // this.sources[i].disconnect();
          this.sources[i].stop();
          this.sources[i] = null;
        }
      }
    }
    if (this.output !== null) {
      this.output.disconnect();
      this.output = null;
    }
    if (this.panner !== null) {
      this.panner.disconnect();
      this.panner = null;
    }
  };
  /**
   * Connects the output of a p5sound object to input of another
   * p5Sound object. For example, you may connect a p5.SoundFile to an
   * FFT or an Effect. If no parameter is given, it will connect to
   * the master output. Most p5sound objects connect to the master
   * output when they are created.
   *
   * @method connect
   * @param {Object} [object] Audio object that accepts an input
   */
  p5.SoundFile.prototype.connect = function (unit) {
    if (!unit) {
      this.panner.connect(p5sound.input);
    } else if (this.buffer && this.source) {
      if (unit.hasOwnProperty('input')) {
        this.panner.connect(unit.input);
      } else {
        this.panner.connect(unit);
      }
    }
  };
  /**
   * Disconnects the output of this p5sound object.
   *
   * @method disconnect
   */
  p5.SoundFile.prototype.disconnect = function (unit) {
    this.panner.disconnect(unit);
  };
  /**
   *  Read the Amplitude (volume level) of a p5.SoundFile. The
   *  p5.SoundFile class contains its own instance of the Amplitude
   *  class to help make it easy to get a microphone's volume level.
   *  Accepts an optional smoothing value (0.0 < 1.0).
   *  
   *  @method  getLevel
   *  @param  {Number} [smoothing] Smoothing is 0.0 by default.
   *                               Smooths values based on previous values.
   *  @return {Number}           Volume level (between 0.0 and 1.0)
   */
  p5.SoundFile.prototype.getLevel = function (smoothing) {
    if (smoothing) {
      this.amplitude.smoothing = smoothing;
    }
    return this.amplitude.getLevel();
  };
}(sndcore, master);
var amplitude;
amplitude = function () {
  'use strict';
  var p5sound = master;
  /**
   *  Amplitude measures volume between 0.0 and 1.0.
   *  Listens to all p5sound by default, or use setInput()
   *  to listen to a specific sound source. Accepts an optional
   *  smoothing value, which defaults to 0. 
   *
   *  @class p5.Amplitude
   *  @constructor
   *  @param {Number} [smoothing] between 0.0 and .999 to smooth
   *                             amplitude readings (defaults to 0)
   *  @return {Object}    Amplitude Object
   *  @example
   *  <div><code>
   *  function preload(){
   *    sound = loadSound('assets/beat.mp3');
   *  }
   *  function setup() { 
   *    amplitude = new p5.Amplitude();
   *    sound.loop();
   *  }
   *  function draw() {
   *    background(0);
   *    fill(255);
   *    var level = amplitude.getLevel();
   *    var size = map(level, 0, 1, 0, 200);
   *    ellipse(width/2, height/2, size, size);
   *  }
   *  function mouseClicked(){
   *    sound.stop();
   *  }
   *  </code></div>
   */
  p5.Amplitude = function (smoothing) {
    // Set to 2048 for now. In future iterations, this should be inherited or parsed from p5sound's default
    this.bufferSize = 2048;
    // set audio context
    this.audiocontext = p5sound.audiocontext;
    this.processor = this.audiocontext.createScriptProcessor(this.bufferSize);
    // for connections
    this.input = this.processor;
    this.output = this.audiocontext.createGain();
    // smoothing defaults to 0
    this.smoothing = smoothing || 0;
    // the variables to return
    this.volume = 0;
    this.average = 0;
    this.volMax = 0.001;
    this.normalize = false;
    this.processor.onaudioprocess = this.volumeAudioProcess.bind(this);
    this.processor.connect(this.output);
    this.output.gain.value = 0;
    // this may only be necessary because of a Chrome bug
    this.output.connect(this.audiocontext.destination);
    // connect to p5sound master output by default, unless set by input()
    p5sound.meter.connect(this.processor);
  };
  /**
   *  Connects to the p5sound instance (master output) by default.
   *  Optionally, you can pass in a specific source (i.e. a soundfile).
   *
   *  @method setInput
   *  @param {soundObject|undefined} [snd] set the sound source
   *                                       (optional, defaults to
   *                                       master output)
   *  @param {Number|undefined} [smoothing] a range between 0.0 and 1.0
   *                                        to smooth amplitude readings
   *  @example
   *  <div><code>
   *  function preload(){
   *    sound1 = loadSound('assets/beat.mp3');
   *    sound2 = loadSound('assets/drum.mp3');
   *  }
   *  function setup(){
   *    amplitude = new p5.Amplitude();
   *    sound1.loop();
   *    sound2.loop();
   *    amplitude.setInput(sound2);
   *  }
   *  function draw() {
   *    background(0);
   *    fill(255);
   *    var level = amplitude.getLevel();
   *    var size = map(level, 0, 1, 0, 200);
   *    ellipse(width/2, height/2, size, size);
   *  }
   *  function mouseClicked(){
   *    sound1.stop();
   *    sound2.stop();
   *  }
   *  </code></div>
   */
  p5.Amplitude.prototype.setInput = function (source, smoothing) {
    p5sound.meter.disconnect(this.processor);
    if (smoothing) {
      this.smoothing = smoothing;
    }
    // connect to the master out of p5s instance if no snd is provided
    if (source == null) {
      console.log('Amplitude input source is not ready! Connecting to master output instead');
      p5sound.meter.connect(this.processor);
    } else if (source) {
      source.connect(this.processor);
      this.processor.disconnect();
      this.processor.connect(this.output);
      console.log('source connected');
    } else {
      p5sound.meter.connect(this.processor);
    }
  };
  p5.Amplitude.prototype.connect = function (unit) {
    if (unit) {
      if (unit.hasOwnProperty('input')) {
        this.output.connect(unit.input);
      } else {
        this.output.connect(unit);
      }
    } else {
      this.output.connect(this.panner.connect(p5sound.input));
    }
  };
  p5.Amplitude.prototype.disconnect = function (unit) {
    this.output.disconnect();
  };
  // Should this be a private function?
  // TO DO make this stereo / dependent on # of audio channels
  p5.Amplitude.prototype.volumeAudioProcess = function (event) {
    // return result
    var inputBuffer = event.inputBuffer.getChannelData(0);
    var bufLength = inputBuffer.length;
    var total = 0;
    var sum = 0;
    var x;
    for (var i = 0; i < bufLength; i++) {
      x = inputBuffer[i];
      if (this.normalize) {
        total += p5.prototype.constrain(x / this.volMax, -1, 1);
        sum += p5.prototype.constrain(x / this.volMax, -1, 1) * p5.prototype.constrain(x / this.volMax, -1, 1);
      } else {
        total += x;
        sum += x * x;
      }
    }
    var average = total / bufLength;
    // ... then take the square root of the sum.
    var rms = Math.sqrt(sum / bufLength);
    this.volume = Math.max(rms, this.volume * this.smoothing);
    this.volMax = Math.max(this.volume, this.volMax);
    // normalized values
    this.volNorm = p5.prototype.constrain(this.volume / this.volMax, 0, 1);
  };
  /**
   *  Returns a single Amplitude reading at the moment it is called.
   *  For continuous readings, run in the draw loop.
   *
   *  @method getLevel
   *  @return {Number}       Amplitude as a number between 0.0 and 1.0
   *  @example
   *  <div><code>
   *  function preload(){
   *    sound = loadSound('assets/beat.mp3');
   *  }
   *  function setup() { 
   *    amplitude = new p5.Amplitude();
   *    sound.loop();
   *  }
   *  function draw() {
   *    background(0);
   *    fill(255);
   *    var level = amplitude.getLevel();
   *    var size = map(level, 0, 1, 0, 200);
   *    ellipse(width/2, height/2, size, size);
   *  }
   *  function mouseClicked(){
   *    sound.stop();
   *  }
   *  </code></div>
   */
  p5.Amplitude.prototype.getLevel = function () {
    if (this.normalize) {
      return this.volNorm;
    } else {
      return this.volume;
    }
  };
  /**
   * Determines whether the results of Amplitude.process() will be
   * Normalized. To normalize, Amplitude finds the difference the
   * loudest reading it has processed and the maximum amplitude of
   * 1.0. Amplitude adds this difference to all values to produce
   * results that will reliably map between 0.0 and 1.0. However,
   * if a louder moment occurs, the amount that Normalize adds to
   * all the values will change. Accepts an optional boolean parameter
   * (true or false). Normalizing is off by default.
   *
   * @method toggleNormalize
   * @param {boolean} [boolean] set normalize to true (1) or false (0)
   */
  p5.Amplitude.prototype.toggleNormalize = function (bool) {
    if (typeof bool === 'boolean') {
      this.normalize = bool;
    } else {
      this.normalize = !this.normalize;
    }
  };
  /**
   *  Smooth Amplitude analysis by averaging with the last analysis 
   *  frame. Off by default.
   *
   *  @method smooth
   *  @param {Number} set smoothing from 0.0 <= 1
   */
  p5.Amplitude.prototype.smooth = function (s) {
    if (s >= 0 && s < 1) {
      this.smoothing = s;
    } else {
      console.log('Error: smoothing must be between 0 and 1');
    }
  };
}(master);
var fft;
fft = function () {
  'use strict';
  var p5sound = master;
  /**
   *  <p>FFT (Fast Fourier Transform) is an analysis algorithm that
   *  isolates individual
   *  <a href="https://en.wikipedia.org/wiki/Audio_frequency">
   *  audio frequencies</a> within a waveform.</p>
   *
   *  <p>Once instantiated, a p5.FFT object can return an array based on
   *  two types of analyses: <br> • <code>FFT.waveform()</code> computes
   *  amplitude values along the time domain. The array indices correspond
   *  to samples across a brief moment in time. Each value represents
   *  amplitude of the waveform at that sample of time.<br>
   *  • <code>FFT.analyze() </code> computes amplitude values along the
   *  frequency domain. The array indices correspond to frequencies (i.e.
   *  pitches), from the lowest to the highest that humans can hear. Each
   *  value represents amplitude at that slice of the frequency spectrum.
   *  Use with <code>getEnergy()</code> to measure amplitude at specific
   *  frequencies, or within a range of frequencies. </p>
   *
   *  <p>FFT analyzes a very short snapshot of sound called a sample
   *  buffer. It returns an array of amplitude measurements, referred
   *  to as <code>bins</code>. The array is 1024 bins long by default.
   *  You can change the bin array length, but it must be a power of 2
   *  between 16 and 1024 in order for the FFT algorithm to function
   *  correctly. The actual size of the FFT buffer is twice the 
   *  number of bins, so given a standard sample rate, the buffer is
   *  2048/44100 seconds long.</p>
   *  
   * 
   *  @class p5.FFT
   *  @constructor
   *  @param {Number} [smoothing]   Smooth results of Freq Spectrum.
   *                                0.0 < smoothing < 1.0.
   *                                Defaults to 0.8.
   *  @param {Number} [bins]    Length of resulting array.
   *                            Must be a power of two between
   *                            16 and 1024. Defaults to 1024.
   *  @return {Object}    FFT Object
   *  @example
   *  <div><code>
   *  function preload(){
   *    sound = loadSound('assets/Damscray_DancingTiger.mp3');
   *  }
   *
   *  function setup(){
   *    createCanvas(100,100);
   *    sound.loop();
   *    fft = new p5.FFT();
   *  }
   *
   *  function draw(){
   *    background(0);
   *
   *    var spectrum = fft.analyze(); 
   *    noStroke();
   *    fill(0,255,0); // spectrum is green
   *    for (var i = 0; i< spectrum.length; i++){
   *      var x = map(i, 0, spectrum.length, 0, width);
   *      var h = -height + map(spectrum[i], 0, 255, height, 0);
   *      rect(x, height, width / spectrum.length, h )
   *    }
   *
   *    var waveform = fft.waveform();
   *    beginShape();
   *    stroke(255,0,0); // waveform is red
   *    strokeWeight(1);
   *    for (var i = 0; i< waveform.length; i++){
   *      var x = map(i, 0, waveform.length, 0, width);
   *      var y = map( waveform[i], 0, 255, 0, height);
   *      vertex(x,y);
   *    }
   *    endShape();
   *  }
   *  
   *  function mouseClicked(){
   *    sound.stop();
   *  }
   *  </code></div>
   */
  p5.FFT = function (smoothing, bins) {
    var SMOOTHING = smoothing || 0.8;
    if (smoothing === 0) {
      SMOOTHING = smoothing;
    }
    var FFT_SIZE = bins * 2 || 2048;
    this.analyser = p5sound.audiocontext.createAnalyser();
    // default connections to p5sound master
    p5sound.output.connect(this.analyser);
    this.analyser.smoothingTimeConstant = SMOOTHING;
    this.analyser.fftSize = FFT_SIZE;
    this.freqDomain = new Uint8Array(this.analyser.frequencyBinCount);
    this.timeDomain = new Uint8Array(this.analyser.frequencyBinCount);
    // predefined frequency ranages, these will be tweakable
    this.bass = [
      20,
      140
    ];
    this.lowMid = [
      140,
      400
    ];
    this.mid = [
      400,
      2600
    ];
    this.highMid = [
      2600,
      5200
    ];
    this.treble = [
      5200,
      14000
    ];
  };
  /**
   *  Set the input source for the FFT analysis. If no source is
   *  provided, FFT will analyze all sound in the sketch.
   *
   *  @method  setInput
   *  @param {Object} [source] p5.sound object (or web audio API source node)
   *  @param {Number} [bins]  Must be a power of two between 16 and 1024
   */
  p5.FFT.prototype.setInput = function (source, bins) {
    if (bins) {
      this.analyser.fftSize = bins * 2;
    }
    if (source.output) {
      source.output.connect(this.analyser);
    } else {
      source.connect(this.analyser);
    }
  };
  /**
   *  Returns an array of amplitude values (between 0-255) that represent
   *  a snapshot of amplitude readings in a single buffer. Length will be
   *  equal to bins (defaults to 1024). Can be used to draw the waveform
   *  of a sound. 
   *  
   *  @method waveform
   *  @param {Number} [bins]    Must be a power of two between
   *                            16 and 1024. Defaults to 1024.
   *  @return {Array}  Array    Array of amplitude values (0-255)
   *                            over time. Array length = bins.
   *
   */
  p5.FFT.prototype.waveform = function (bins) {
    if (bins) {
      this.analyser.fftSize = bins * 2;
    }
    this.analyser.getByteTimeDomainData(this.timeDomain);
    var normalArray = Array.apply([], this.timeDomain);
    normalArray.length === this.analyser.fftSize;
    normalArray.constructor === Array;
    return normalArray;
  };
  /**
   *  Returns an array of amplitude values (between 0 and 255)
   *  across the frequency spectrum. Length is equal to FFT bins
   *  (1024 by default). The array indices correspond to frequencies
   *  (i.e. pitches), from the lowest to the highest that humans can
   *  hear. Each value represents amplitude at that slice of the
   *  frequency spectrum. Must be called prior to using
   *  <code>getEnergy()</code>.
   *
   *  @method analyze
   *  @param {Number} [bins]    Must be a power of two between
   *                             16 and 1024. Defaults to 1024.
   *  @return {Array} spectrum    Array of amplitude values across
   *                              the frequency spectrum.
   *  @example
   *  <div><code>
   *  var osc;
   *  var fft;
   *
   *  function setup(){
   *    createCanvas(100,100);
   *    osc = new p5.Oscillator();
   *    osc.start();
   *    fft = new p5.FFT();
   *  }
   *
   *  function draw(){
   *    background(0);
   *
   *    var freq = map(mouseX, 0, 800, 20, 15000);
   *    freq = constrain(freq, 1, 20000);
   *    osc.freq(freq);
   *
   *    var spectrum = fft.analyze(); 
   *    noStroke();
   *    fill(0,255,0); // spectrum is green
   *    for (var i = 0; i< spectrum.length; i++){
   *      var x = map(i, 0, spectrum.length, 0, width);
   *      var h = -height + map(spectrum[i], 0, 255, height, 0);
   *      rect(x, height, width / spectrum.length, h )
   *    }
   *
   *    stroke(255);
   *    text('Freq: ' + round(freq)+'Hz', 10, 10); 
   *  }
   *  </code></div>
   *                                   
   *
   */
  p5.FFT.prototype.analyze = function (bins) {
    if (bins) {
      this.analyser.fftSize = bins * 2;
    }
    this.analyser.getByteFrequencyData(this.freqDomain);
    var normalArray = Array.apply([], this.freqDomain);
    normalArray.length === this.analyser.fftSize;
    normalArray.constructor === Array;
    return normalArray;
  };
  /**
   *  Returns the amount of energy (volume) at a specific
   *  <a href="en.wikipedia.org/wiki/Audio_frequency" target="_blank">
   *  frequency</a>, or the average amount of energy between two
   *  frequencies. Accepts Number(s) corresponding
   *  to frequency (in Hz), or a String corresponding to predefined
   *  frequency ranges ("bass", "lowMid", "mid", "highMid", "treble").
   *  <em>NOTE: analyze() must be called prior to getEnergy(). Analyze()
   *  tells the FFT to analyze frequency data, and getEnergy() uses
   *  the results determine the value at a specific frequency or
   *  range of frequencies.</em></p>
   *  
   *  @method  getEnergy
   *  @param  {Number|String} frequency1   Will return a value representing
   *                                energy at this frequency. Alternately,
   *                                the strings "bass", "lowMid" "mid",
   *                                "highMid", and "treble" will return
   *                                predefined frequency ranges.
   *  @param  {Number} [frequency2] If a second frequency is given,
   *                                will return average amount of
   *                                energy that exists between the
   *                                two frequencies.
   *  @return {Number}           
   */
  p5.FFT.prototype.getEnergy = function (frequency1, frequency2) {
    var nyquist = p5sound.audiocontext.sampleRate / 2;
    if (frequency1 === 'bass') {
      frequency1 = this.bass[0];
      frequency2 = this.bass[1];
    } else if (frequency1 === 'lowMid') {
      frequency1 = this.lowMid[0];
      frequency2 = this.lowMid[1];
    } else if (frequency1 === 'mid') {
      frequency1 = this.mid[0];
      frequency2 = this.mid[1];
    } else if (frequency1 === 'highMid') {
      frequency1 = this.highMid[0];
      frequency2 = this.highMid[1];
    } else if (frequency1 === 'treble') {
      frequency1 = this.treble[0];
      frequency2 = this.treble[1];
    }
    if (typeof frequency1 !== 'number') {
      throw 'invalid input for getEnergy()';
    } else if (!frequency2) {
      var index = Math.round(frequency1 / nyquist * this.freqDomain.length);
      return this.freqDomain[index];
    } else if (frequency1 && frequency2) {
      // if second is higher than first
      if (frequency1 > frequency2) {
        var swap = frequency2;
        frequency2 = frequency1;
        frequency1 = swap;
      }
      var lowIndex = Math.round(frequency1 / nyquist * this.freqDomain.length);
      var highIndex = Math.round(frequency2 / nyquist * this.freqDomain.length);
      var total = 0;
      var numFrequencies = 0;
      // add up all of the values for the frequencies
      for (var i = lowIndex; i <= highIndex; i++) {
        total += this.freqDomain[i];
        numFrequencies += 1;
      }
      // divide by total number of frequencies
      var toReturn = total / numFrequencies;
      return toReturn;
    } else {
      throw 'invalid input for getEnergy()';
    }
  };
  // compatability with v.012, changed to getEnergy in v.0121. Will be deprecated...
  p5.FFT.prototype.getFreq = function (freq1, freq2) {
    console.log('getFreq() is deprecated. Please use getEnergy() instead.');
    var x = this.getEnergy(freq1, freq2);
    return x;
  };
  /**
   *  Smooth FFT analysis by averaging with the last analysis frame.
   *  
   *  @method smooth
   *  @param {Number} smoothing    0.0 < smoothing < 1.0.
   *                               Defaults to 0.8.
   */
  p5.FFT.prototype.smooth = function (s) {
    this.analyser.smoothingTimeConstant = s;
  };
}(master);
var oscillator;
oscillator = function () {
  'use strict';
  var p5sound = master;
  /**
   *  <p>Creates a signal that oscillates between -1.0 and 1.0.
   *  By default, the oscillation takes the form of a sinusoidal
   *  shape ('sine'). Additional types include 'triangle',
   *  'sawtooth' and 'square'. The frequency defaults to
   *  440 oscillations per second (440Hz, equal to the pitch of an
   *  'A' note).</p> 
   *
   *  <p>Set the type of oscillation with setType(), or by creating a
   *  specific oscillator.</p> For example:
   *  <code>new p5.SinOsc(freq)</code>
   *  <code>new p5.TriOsc(freq)</code>
   *  <code>new p5.SqrOsc(freq)</code>
   *  <code>new p5.SawOsc(freq)</code>.
   *  </p>
   *  
   *  @class p5.Oscillator
   *  @constructor
   *  @param {Number} [freq] frequency defaults to 440Hz
   *  @param {String} [type] type of oscillator. Options:
   *                         'sine' (default), 'triangle',
   *                         'sawtooth', 'square'
   *  @return {Object}    Oscillator object
   */
  p5.Oscillator = function (freq, type) {
    this.started = false;
    p5sound = p5sound;
    // components
    this.oscillator = p5sound.audiocontext.createOscillator();
    this.f = freq || 440;
    // frequency
    this.oscillator.frequency.value = this.f;
    this.oscillator.type = type || 'sine';
    var o = this.oscillator;
    // connections
    this.input = p5sound.audiocontext.createGain();
    this.output = p5sound.audiocontext.createGain();
    // param nodes for modulation
    // this.freqNode = o.frequency;
    this.ampNode = this.output.gain;
    this.freqNode = this.oscillator.frequency;
    // set default output gain
    this.output.gain.value = 0.5;
    // sterep panning
    this.panPosition = 0;
    this.panner = p5sound.audiocontext.createPanner();
    this.panner.panningModel = 'equalpower';
    this.panner.distanceModel = 'linear';
    this.panner.setPosition(0, 0, 0);
    // connect to p5sound by default
    this.oscillator.connect(this.output);
    this.output.connect(this.panner);
    this.panner.connect(p5sound.input);
    this.connection = p5sound.input;
    // add to the soundArray so we can dispose of the osc later
    p5sound.soundArray.push(this);
  };
  /**
   *  Start an oscillator. Accepts an optional parameter to
   *  determine how long (in seconds from now) until the
   *  oscillator starts.
   *
   *  @method  start
   *  @param  {Number} [time] startTime in seconds from now.
   *  @param  {Number} [frequency] frequency in Hz.
   */
  p5.Oscillator.prototype.start = function (f, time) {
    if (this.started) {
      this.stop();
    }
    if (!this.started) {
      var freq = f || this.f;
      var type = this.oscillator.type;
      // var detune = this.oscillator.frequency.value;
      this.oscillator = p5sound.audiocontext.createOscillator();
      this.oscillator.frequency.exponentialRampToValueAtTime(Math.abs(freq), p5sound.audiocontext.currentTime);
      this.oscillator.type = type;
      // this.oscillator.detune.value = detune;
      this.oscillator.connect(this.output);
      this.started = true;
      time = time || 0;
      this.oscillator.start(time + p5sound.audiocontext.currentTime);
      this.freqNode = this.oscillator.frequency;
      // if LFO connections depend on this oscillator
      if (this.mods !== undefined && this.mods.frequency !== undefined) {
        this.mods.frequency.connect(this.freqNode);
      }
    }
  };
  /**
   *  Stop an oscillator. Accepts an optional parameter
   *  to determine how long (in seconds from now) until the
   *  oscillator stops.
   *
   *  @method  stop
   *  @param  {Number} time, in seconds from now.
   */
  p5.Oscillator.prototype.stop = function (time) {
    if (this.started) {
      var t = time || 0;
      var now = p5sound.audiocontext.currentTime;
      this.oscillator.stop(t + now);
      this.started = false;
    }
  };
  /**
   *  Set amplitude (volume) of an oscillator between 0 and 1.0
   *
   *  @method  amp
   *  @param  {Number} vol between 0 and 1.0
   *  @param {Number} [rampTime] create a fade that lasts rampTime 
   *  @param {Number} [timeFromNow] schedule this event to happen
   *                                seconds from now
   */
  p5.Oscillator.prototype.amp = function (vol, rampTime, tFromNow) {
    if (typeof vol === 'number') {
      var rampTime = rampTime || 0;
      var tFromNow = tFromNow || 0;
      var now = p5sound.audiocontext.currentTime;
      var currentVol = this.output.gain.value;
      this.output.gain.cancelScheduledValues(now);
      this.output.gain.linearRampToValueAtTime(currentVol, now + tFromNow + 0.001);
      this.output.gain.linearRampToValueAtTime(vol, now + tFromNow + rampTime + 0.001);
      // disconnect any oscillators that were modulating this param
      if (this.ampMod) {
        this.ampMod.output.disconnect();
        this.ampMod = null;
      }
    } else if (vol.output) {
      vol.output.disconnect();
      vol.output.connect(this.output.gain);
      // keep track of any oscillators that were modulating this param
      this.ampMod = vol;
    }
  };
  // these are now the same thing
  p5.Oscillator.prototype.fade = p5.Oscillator.prototype.amp;
  p5.Oscillator.prototype.getAmp = function () {
    return this.output.gain.value;
  };
  /**
   *  Set frequency of an oscillator.
   *
   *  @method  freq
   *  @param  {Number} Frequency Frequency in Hz
   *  @param  {Number} [rampTime] Ramp time (in seconds)
   *  @param  {Number} [timeFromNow] Schedule this event to happen
   *                                   at x seconds from now
   *  @example
   *  <div><code>
   *  var osc = new p5.Oscillator(300);
   *  osc.start();
   *  osc.freq(40, 10);
   *  </code></div>
   */
  p5.Oscillator.prototype.freq = function (val, rampTime, tFromNow) {
    if (typeof val === 'number') {
      this.f = val;
      var now = p5sound.audiocontext.currentTime;
      var rampTime = rampTime || 0;
      var tFromNow = tFromNow || 0;
      var currentFreq = this.oscillator.frequency.value;
      this.oscillator.frequency.cancelScheduledValues(now);
      this.oscillator.frequency.setValueAtTime(currentFreq, now + tFromNow);
      this.oscillator.frequency.exponentialRampToValueAtTime(val, tFromNow + rampTime + now);
      // disconnect if frequencies are too low or high, otherwise connect
      // if (val < 20 || val > 20000) {
      //   this.panner.disconnect();
      // } else {
      //   this.connect(this.connection);
      // }
      if (this.freqMod) {
        this.freqMod.output.disconnect();
        this.freqMod = null;
      }
    } else if (val.output) {
      val.output.disconnect();
      val.output.connect(this.oscillator.frequency);
      // keep track of what is modulating this param
      this.freqMod = val;
    }
  };
  p5.Oscillator.prototype.getFreq = function () {
    return this.oscillator.frequency.value;
  };
  /**
   *  Set type to 'sine', 'triangle', 'sawtooth' or 'square'.
   *
   *  @method  setType
   *  @param {String} type 'sine', 'triangle', 'sawtooth' or 'square'.
   */
  p5.Oscillator.prototype.setType = function (type) {
    this.oscillator.type = type;
  };
  p5.Oscillator.prototype.getType = function () {
    return this.oscillator.type;
  };
  /**
   *  Connect to a p5.Sound / Web Audio object.
   *
   *  @method  connect
   *  @param  {Object} unit A p5.Sound or Web Audio object
   */
  p5.Oscillator.prototype.connect = function (unit) {
    if (!unit) {
      this.panner.connect(p5sound.input);
    } else if (unit.hasOwnProperty('input')) {
      this.panner.connect(unit.input);
      this.connection = unit.input;
    } else {
      this.panner.connect(unit);
      this.connection = unit;
    }
  };
  /**
   *  Disconnect all outputs
   *
   *  @method  disconnect
   */
  p5.Oscillator.prototype.disconnect = function (unit) {
    this.panner.disconnect(unit);
  };
  /**
   *  Pan between Left (-1) and Right (1)
   *
   *  @method  pan
   *  @param  {Number} panning Number between -1 and 1
   */
  p5.Oscillator.prototype.pan = function (pval) {
    if (!pval) {
      pval = 0;
    }
    this.panPosition = pval;
    pval = pval * 90;
    var xDeg = parseInt(pval);
    var zDeg = xDeg + 90;
    if (zDeg > 90) {
      zDeg = 180 - zDeg;
    }
    var x = Math.sin(xDeg * (Math.PI / 180));
    var z = Math.sin(zDeg * (Math.PI / 180));
    this.panner.setPosition(x, 0, z);
  };
  p5.Oscillator.prototype.getPan = function () {
    return this.panPosition;
  };
  // get rid of the oscillator
  p5.Oscillator.prototype.dispose = function () {
    if (this.oscillator) {
      this.stop();
      this.disconnect();
      this.oscillator.disconnect();
      this.panner = null;
      this.oscillator = null;
    }
    // if it is a Pulse
    if (this.osc2) {
      this.osc2.dispose();
    }
  };
  /**
   *  Modulate any audio param.
   *
   *  @method  mod
   *  @param  {AudioParam} AudioParam The param to modulate
   */
  p5.Oscillator.prototype.mod = function (unit) {
    unit.cancelScheduledValues(p5sound.audiocontext.currentTime);
    this.output.connect(unit);
  };
  /**
   *  Set the phase of an oscillator between 0.0 and 1.0
   *  
   *  @method  phase
   *  @param  {Number} phase float between 0.0 and 1.0
   */
  p5.Oscillator.prototype.phase = function (p) {
    if (!this.dNode) {
      // create a delay node
      this.dNode = p5sound.audiocontext.createDelay();
      // put the delay node in between output and panner
      this.output.disconnect();
      this.output.connect(this.dNode);
      this.dNode.connect(this.panner);
    }
    // set delay time based on PWM width
    var now = p5sound.audiocontext.currentTime;
    this.dNode.delayTime.linearRampToValueAtTime(map(p, 0, 1, 0, 1 / this.oscillator.frequency.value), now);
  };
  // Extending
  p5.SinOsc = function (freq) {
    p5.Oscillator.call(this, freq, 'sine');
  };
  p5.SinOsc.prototype = Object.create(p5.Oscillator.prototype);
  p5.TriOsc = function (freq) {
    p5.Oscillator.call(this, freq, 'triangle');
  };
  p5.TriOsc.prototype = Object.create(p5.Oscillator.prototype);
  p5.SawOsc = function (freq) {
    p5.Oscillator.call(this, freq, 'sawtooth');
  };
  p5.SawOsc.prototype = Object.create(p5.Oscillator.prototype);
  p5.SqrOsc = function (freq) {
    p5.Oscillator.call(this, freq, 'square');
  };
  p5.SqrOsc.prototype = Object.create(p5.Oscillator.prototype);
}(master);
var pulse;
pulse = function () {
  'use strict';
  var p5sound = master;
  /**
   *  Creates a Pulse object, an oscillator that implements
   *  Pulse Width Modulation.
   *  The pulse is created with two oscillators.
   *  Accepts a parameter for frequency, and to set the
   *  width between the pulses. See <code>Oscillator</code>
   *  for a full list of methods.
   *  
   *  @class p5.Pulse
   *  @constructor
   *  @param {Number} [freq] Frequency in oscillations per second (Hz)
   *  @param {Number} [w]    Width between the pulses (0 to 1.0,
   *                         defaults to 0)
   */
  p5.Pulse = function (freq, w) {
    p5.Oscillator.call(this, freq, 'sawtooth');
    // width of PWM, should be betw 0 to 1.0
    this.w = w || 0;
    // create a second oscillator with inverse frequency
    this.osc2 = new p5.SawOsc(freq);
    // create a delay node
    this.dNode = p5sound.audiocontext.createDelay();
    // set delay time based on PWM width
    this.dNode.delayTime.value = map(this.w, 0, 1, 0, 1 / this.oscillator.frequency.value);
    // disconnect osc2 and connect it to delay, which is connected to output
    this.osc2.disconnect();
    this.osc2.panner.connect(this.dNode);
    this.dNode.connect(this.output);
  };
  p5.Pulse.prototype = Object.create(p5.Oscillator.prototype);
  /**
   *  Set the width of a Pulse object (an oscillator that implements
   *  Pulse Width Modulation).
   *
   *  @method  width
   *  @param {Number} [width]    Width between the pulses (0 to 1.0,
   *                         defaults to 0)
   */
  p5.Pulse.prototype.width = function (w) {
    if (w <= 1 && w >= 0) {
      this.w = w;
      // set delay time based on PWM width
      this.dNode.delayTime.value = map(this.w, 0, 1, 0, 1 / this.oscillator.frequency.value);
    }
  };
  p5.Pulse.prototype.start = function (f, time) {
    var now = p5sound.audiocontext.currentTime;
    var t = time || 0;
    if (!this.started) {
      var freq = f || this.f;
      var type = this.oscillator.type;
      // var detune = this.oscillator.frequency.value;
      this.oscillator = p5sound.audiocontext.createOscillator();
      this.oscillator.frequency.setValueAtTime(freq, now);
      this.oscillator.type = type;
      // this.oscillator.detune.value = detune;
      this.oscillator.connect(this.output);
      this.oscillator.start(t + now);
      // set up osc2
      this.osc2.oscillator = p5sound.audiocontext.createOscillator();
      this.osc2.oscillator.frequency.setValueAtTime(freq, now);
      this.osc2.oscillator.type = type;
      this.osc2.start(t + now);
      this.freqNode = [
        this.oscillator.frequency,
        this.osc2.oscillator.frequency
      ];
      // if LFO connections depend on these oscillators
      if (this.mods !== undefined && this.mods.frequency !== undefined) {
        this.mods.frequency.connect(this.freqNode[0]);
        this.mods.frequency.connect(this.freqNode[1]);
      }
      this.started = true;
      this.osc2.started = true;
    }
  };
  p5.Pulse.prototype.stop = function (time) {
    if (this.started) {
      var t = time || 0;
      var now = p5sound.audiocontext.currentTime;
      this.oscillator.stop(t + now);
      this.osc2.oscillator.stop(t + now);
      this.started = false;
      this.osc2.started = false;
    }
  };
  p5.Pulse.prototype.freq = function (val, rampTime, tFromNow) {
    if (typeof val === 'number') {
      this.f = val;
      var now = p5sound.audiocontext.currentTime;
      var rampTime = rampTime || 0;
      var tFromNow = tFromNow || 0;
      var currentFreq = this.oscillator.frequency.value;
      this.oscillator.frequency.cancelScheduledValues(now);
      this.oscillator.frequency.setValueAtTime(currentFreq, now + tFromNow);
      this.oscillator.frequency.exponentialRampToValueAtTime(val, tFromNow + rampTime + now);
      this.osc2.oscillator.frequency.cancelScheduledValues(now);
      this.osc2.oscillator.frequency.setValueAtTime(currentFreq, now + tFromNow);
      this.osc2.oscillator.frequency.exponentialRampToValueAtTime(val, tFromNow + rampTime + now);
      // disconnect if frequencies are too low or high, otherwise connect
      // if (val < 20 || val > 20000) {
      //   this.panner.disconnect();
      // } else {
      //   this.connect(this.connection);
      // }
      if (this.freqMod) {
        this.freqMod.output.disconnect();
        this.freqMod = null;
      }
    } else if (val.output) {
      val.output.disconnect();
      val.output.connect(this.oscillator.frequency);
      val.output.connect(this.osc2.oscillator.frequency);
      this.freqMod = val;
    }
  };
}(master, oscillator);
var noise;
noise = function () {
  'use strict';
  var p5sound = master;
  /**
   *  Noise is a type of oscillator that generates a buffer with random values.
   *
   *  @class p5.Noise
   *  @constructor
   *  @param {String} type Type of noise can be 'white' (default),
   *                       'brown' or 'pink'.
   *  @return {Object}    Noise Object
   */
  p5.Noise = function (type) {
    this.started = false;
    this.buffer = _whiteNoise;
    this.output = p5sound.audiocontext.createGain();
    // set default output gain
    this.output.gain.value = 0.5;
    // sterep panning
    this.panPosition = 0;
    this.panner = p5sound.audiocontext.createPanner();
    this.panner.panningModel = 'equalpower';
    this.panner.distanceModel = 'linear';
    this.panner.setPosition(0, 0, 0);
    this.output.connect(this.panner);
    this.panner.connect(p5sound.input);
    // maybe not connected to output default?
    // add to soundArray so we can dispose on close
    p5sound.soundArray.push(this);
  };
  // generate noise buffers
  var _whiteNoise = function () {
      var bufferSize = 2 * p5sound.audiocontext.sampleRate;
      var whiteBuffer = p5sound.audiocontext.createBuffer(1, bufferSize, p5sound.audiocontext.sampleRate);
      var noiseData = whiteBuffer.getChannelData(0);
      for (var i = 0; i < bufferSize; i++) {
        noiseData[i] = Math.random() * 2 - 1;
      }
      return whiteBuffer;
    }();
  var _pinkNoise = function () {
      var bufferSize = 2 * p5sound.audiocontext.sampleRate;
      var pinkBuffer = p5sound.audiocontext.createBuffer(1, bufferSize, p5sound.audiocontext.sampleRate);
      var noiseData = pinkBuffer.getChannelData(0);
      var b0, b1, b2, b3, b4, b5, b6;
      b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0;
      for (var i = 0; i < bufferSize; i++) {
        var white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        noiseData[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        noiseData[i] *= 0.11;
        // (roughly) compensate for gain
        b6 = white * 0.115926;
      }
      return pinkBuffer;
    }();
  var _brownNoise = function () {
      var bufferSize = 2 * p5sound.audiocontext.sampleRate;
      var brownBuffer = p5sound.audiocontext.createBuffer(1, bufferSize, p5sound.audiocontext.sampleRate);
      var noiseData = brownBuffer.getChannelData(0);
      var lastOut = 0;
      for (var i = 0; i < bufferSize; i++) {
        var white = Math.random() * 2 - 1;
        noiseData[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = noiseData[i];
        noiseData[i] *= 3.5;
      }
      return brownBuffer;
    }();
  p5.Noise.prototype.ampMod = function (unit) {
    unit.output.gain.cancelScheduledValues(p5sound.audiocontext.currentTime);
    this.output.connect(unit.output.gain);
  };
  /**
   *  Set type of noise to 'white', 'pink' or 'brown'.
   *  White is the default.
   *
   *  @method setType
   *  @param {String} [type] 'white', 'pink' or 'brown'
   */
  p5.Noise.prototype.setType = function (type) {
    switch (type) {
    case 'white':
      this.buffer = _whiteNoise;
      break;
    case 'pink':
      this.buffer = _pinkNoise;
      break;
    case 'brown':
      this.buffer = _brownNoise;
      break;
    default:
      this.buffer = _whiteNoise;
    }
    if (this.started) {
      this.stop();
      this.start();
    }
  };
  /**
   *  Start the noise
   *
   *  @method start
   */
  p5.Noise.prototype.start = function () {
    if (this.started) {
      this.stop();
    }
    this.noise = p5sound.audiocontext.createBufferSource();
    this.noise.buffer = this.buffer;
    this.noise.loop = true;
    this.noise.connect(this.output);
    console.log(this.output);
    this.noise.start();
    this.started = true;
  };
  /**
   *  Stop the noise.
   *
   *  @method  stop
   */
  p5.Noise.prototype.stop = function () {
    this.noise.stop();
    this.started = false;
  };
  /**
   *  Pan the noise.
   *
   *  @method  pan
   *  @param  {Number} panning Number between -1 (left)
   *                           and 1 (right)
   */
  p5.Noise.prototype.pan = function (pval) {
    this.panPosition = pval;
    pval = pval * 90;
    var xDeg = parseInt(pval);
    var zDeg = xDeg + 90;
    if (zDeg > 90) {
      zDeg = 180 - zDeg;
    }
    var x = Math.sin(xDeg * (Math.PI / 180));
    var z = Math.sin(zDeg * (Math.PI / 180));
    this.panner.setPosition(x, 0, z);
  };
  /**
   *  Set the amplitude of the noise between 0 and 1.0
   *  
   *  @param  {Number} volume amplitude between 0 and 1.0
   *  @param {Number} [rampTime] create a fade that lasts rampTime 
   *  @param {Number} [timeFromNow] schedule this event to happen
   *                                seconds from now
   */
  p5.Noise.prototype.amp = function (vol, rampTime, tFromNow) {
    var rampTime = rampTime || 0;
    var tFromNow = tFromNow || 0;
    var now = p5sound.audiocontext.currentTime;
    var currentVol = this.output.gain.value;
    this.output.gain.cancelScheduledValues(now);
    this.output.gain.linearRampToValueAtTime(currentVol, now + tFromNow + 0.001);
    this.output.gain.linearRampToValueAtTime(vol, now + tFromNow + rampTime + 0.001);
  };
  /**
   *  Send output to a p5.sound or web audio object
   *  
   *  @method  connect
   *  @param  {Object} unit
   */
  p5.Noise.prototype.connect = function (unit) {
    if (!unit) {
      this.panner.connect(p5sound.input);
    } else if (unit.hasOwnProperty('input')) {
      this.panner.connect(unit.input);
    } else {
      this.panner.connect(unit);
    }
  };
  /**
   *  Disconnect all output.
   *  
   *  @method disconnect
   */
  p5.Noise.prototype.disconnect = function (unit) {
    this.output.disconnect();
    this.panner.disconnect();
    this.output.connect(this.panner);
  };
  p5.Noise.prototype.dispose = function () {
    this.stop();
    this.output.disconnect();
    this.panner.disconnect();
    this.output = null;
    this.panner = null;
    this.buffer = null;
    this.noise.disconnect();
    this.noise = null;
  };
}(master);
var audioin;
audioin = function () {
  'use strict';
  var p5sound = master;
  /**
   *  <p>Get audio from an input, i.e. your computer's microphone.</p>
   *
   *  <p>Turn the mic on/off with the start() and stop() methods. When the mic
   *  is on, its volume can be measured with getLevel or by connecting an
   *  FFT object.</p>
   *  
   *  <p>If you want to hear the AudioIn, use the .connect() method. 
   *  AudioIn does not connect to p5.sound output by default to prevent
   *  feedback.</p> 
   *
   *  @class p5.AudioIn
   *  @constructor
   *  @return {Object} AudioIn
   *  @example
   *  <div><code>
   *  function setup(){
   *    mic = new p5.AudioIn()
   *    mic.start();
   *  }
   *  function draw(){
   *    background(0);
   *    micLevel = mic.getLevel();
   *    ellipse(width/2, constrain(height-micLevel*height*5, 0, height), 10, 10);
   *  }
   *  </code></div>
   */
  p5.AudioIn = function () {
    // set up audio input
    p5sound = p5sound;
    this.input = p5sound.audiocontext.createGain();
    this.output = p5sound.audiocontext.createGain();
    this.stream = null;
    this.mediaStream = null;
    this.currentSource = 0;
    // create an amplitude, connect to it by default but not to master out
    this.amplitude = new p5.Amplitude();
    this.output.connect(this.amplitude.input);
    // Some browsers let developer determine their input sources
    if (typeof window.MediaStreamTrack === 'undefined') {
      window.alert('This browser does not support MediaStreamTrack');
    } else if (typeof window.MediaStreamTrack.getSources !== 'undefined') {
      // Chrome supports getSources to list inputs. Dev picks default
      window.MediaStreamTrack.getSources(this._gotSources);
    } else {
    }
    // add to soundArray so we can dispose on close
    p5sound.soundArray.push(this);
  };
  /**
   *  Start processing audio input. This enables the use of other
   *  AudioIn methods like getLevel(). Note that by default, AudioIn
   *  is not connected to p5.sound's output. So you won't hear
   *  anything unless you use the connect() method.<br/>
   *
   *  @method start
   */
  p5.AudioIn.prototype.start = function () {
    var self = this;
    // if _gotSources() i.e. developers determine which source to use
    if (p5sound.inputSources[self.currentSource]) {
      // set the audio source
      var audioSource = p5sound.inputSources[self.currentSource].id;
      var constraints = { audio: { optional: [{ sourceId: audioSource }] } };
      navigator.getUserMedia(constraints, this._onStream = function (stream) {
        self.stream = stream;
        // Wrap a MediaStreamSourceNode around the live input
        self.mediaStream = p5sound.audiocontext.createMediaStreamSource(stream);
        self.mediaStream.connect(self.output);
        // only send to the Amplitude reader, so we can see it but not hear it.
        self.amplitude.setInput(self.output);
      }, this._onStreamError = function (stream) {
        console.error(stream);
      });
    } else {
      // if Firefox where users select their source via browser
      // if (typeof MediaStreamTrack.getSources === 'undefined') {
      // Only get the audio stream.
      window.navigator.getUserMedia({ 'audio': true }, this._onStream = function (stream) {
        self.stream = stream;
        // Wrap a MediaStreamSourceNode around the live input
        self.mediaStream = p5sound.audiocontext.createMediaStreamSource(stream);
        self.mediaStream.connect(self.output);
        // only send to the Amplitude reader, so we can see it but not hear it.
        self.amplitude.setInput(self.output);
      }, this._onStreamError = function (stream) {
        console.error(stream);
      });
    }
  };
  /**
   *  Turn the AudioIn off. If the AudioIn is stopped, it cannot getLevel().<br/>
   *
   *  @method stop
   */
  p5.AudioIn.prototype.stop = function () {
    if (this.stream) {
      this.stream.stop();
    }
  };
  /**
   *  Connect to an audio unit. If no parameter is provided, will
   *  connect to the master output (i.e. your speakers).<br/>
   *  
   *  @method  connect
   *  @param  {Object} [unit] An object that accepts audio input,
   *                          such as an FFT
   */
  p5.AudioIn.prototype.connect = function (unit) {
    if (unit) {
      if (unit.hasOwnProperty('input')) {
        this.output.connect(unit.input);
      } else if (unit.hasOwnProperty('analyser')) {
        this.output.connect(unit.analyser);
      } else {
        this.output.connect(unit);
      }
    } else {
      this.output.connect(p5sound.input);
    }
  };
  /**
   *  Disconnect the AudioIn from all audio units. For example, if
   *  connect() had been called, disconnect() will stop sending 
   *  signal to your speakers.<br/>
   *
   *  @method  disconnect
   */
  p5.AudioIn.prototype.disconnect = function (unit) {
    this.output.disconnect(unit);
    // stay connected to amplitude even if not outputting to p5
    this.output.connect(this.amplitude.input);
  };
  /**
   *  Read the Amplitude (volume level) of an AudioIn. The AudioIn
   *  class contains its own instance of the Amplitude class to help
   *  make it easy to get a microphone's volume level. Accepts an
   *  optional smoothing value (0.0 < 1.0). <em>NOTE: AudioIn must
   *  .start() before using .getLevel().</em><br/>
   *  
   *  @method  getLevel
   *  @param  {Number} [smoothing] Smoothing is 0.0 by default.
   *                               Smooths values based on previous values.
   *  @return {Number}           Volume level (between 0.0 and 1.0)
   */
  p5.AudioIn.prototype.getLevel = function (smoothing) {
    if (smoothing) {
      this.amplitude.smoothing = smoothing;
    }
    return this.amplitude.getLevel();
  };
  /**
   *  Add input sources to the list of available sources.
   *  
   *  @private
   */
  p5.AudioIn.prototype._gotSources = function (sourceInfos) {
    for (var i = 0; i !== sourceInfos.length; i++) {
      var sourceInfo = sourceInfos[i];
      if (sourceInfo.kind === 'audio') {
        // add the inputs to inputSources
        p5sound.inputSources.push(sourceInfo);
      }
    }
  };
  /**
   *  Set amplitude (volume) of a mic input between 0 and 1.0. <br/>
   *
   *  @method  amp
   *  @param  {Number} vol between 0 and 1.0
   *  @param {Number} [time] ramp time (optional)
   */
  p5.AudioIn.prototype.amp = function (vol, t) {
    if (t) {
      var rampTime = t || 0;
      var currentVol = this.output.gain.value;
      this.output.gain.cancelScheduledValues(p5sound.audiocontext.currentTime);
      this.output.gain.setValueAtTime(currentVol, p5sound.audiocontext.currentTime);
      this.output.gain.linearRampToValueAtTime(vol, rampTime + p5sound.audiocontext.currentTime);
    } else {
      this.output.gain.cancelScheduledValues(p5sound.audiocontext.currentTime);
      this.output.gain.setValueAtTime(vol, p5sound.audiocontext.currentTime);
    }
  };
  /**
   *  Returns a list of available input sources. Some browsers
   *  give the client the option to set their own media source.
   *  Others allow JavaScript to determine which source,
   *  and for this we have listSources() and setSource().<br/>
   *
   *  @method  listSources
   *  @return {Array}
   */
  p5.AudioIn.prototype.listSources = function () {
    console.log('input sources: ');
    console.log(p5sound.inputSources);
    if (p5sound.inputSources.length > 0) {
      return p5sound.inputSources;
    } else {
      return 'This browser does not support MediaStreamTrack.getSources()';
    }
  };
  /**
   *  Set the input source. Accepts a number representing a
   *  position in the array returned by listSources().
   *  This is only available in browsers that support 
   *  MediaStreamTrack.getSources(). Instead, some browsers
   *  give users the option to set their own media source.<br/>
   *  
   *  @method setSource
   *  @param {number} num position of input source in the array
   */
  p5.AudioIn.prototype.setSource = function (num) {
    // TO DO - set input by string or # (array position)
    var self = this;
    if (p5sound.inputSources.length > 0 && num < p5sound.inputSources.length) {
      // set the current source
      self.currentSource = num;
      console.log('set source to ' + p5sound.inputSources[self.currentSource].id);
    } else {
      console.log('unable to set input source');
    }
  };
  // private method
  p5.AudioIn.prototype.dispose = function () {
    this.stop();
    this.output.disconnect();
    this.amplitude.disconnect();
    this.amplitude = null;
    this.output = null;
  };
}(master);
var env;
env = function () {
  'use strict';
  var p5sound = master;
  /**
   *  <p>Envelopes are pre-defined amplitude distribution over time. 
   *  The p5.Env accepts up to four time/level pairs, where time
   *  determines how long of a ramp before value reaches level.
   *  Typically, envelopes are used to control the output volume
   *  of an object, a series of fades referred to as Attack, Decay,
   *  Sustain and Release (ADSR). But p5.Env can control any
   *  Web Audio Param.</p>
   *  
   *  @class p5.Env
   *  @constructor
   *  @param {Number} attackTime     Time (in seconds) before level
   *                                 reaches attackLevel
   *  @param {Number} attackLevel    Typically an amplitude between
   *                                 0.0 and 1.0
   *  @param {Number} decayTime      Time
   *  @param {Number} [decayLevel]   Amplitude (In a standard ADSR envelope,
   *                                 decayLevel = sustainLevel)
   *  @param {Number} [sustainTime]   Time
   *  @param {Number} [sustainLevel]  Amplitude
   *  @param {Number} [releaseTime]   Time
   *  @param {Number} [releaseLevel]  Amplitude
   *  @example
   *  <div><code>
   *  var aT = 0.1; // attack time
   *  var aL = 0.7; // attack level
   *  var dT = 0.3; // decay time
   *  var dL = 0.1; // decay level
   *  var sT = 0.2; // sustain time
   *  var sL = dL; // sustain level
   *  var rT = 0.5; // release time
   *  // release level defaults to zero
   *
   *  var env;
   *  var triOsc;
   *  
   *  function setup() {
   *    env = new p5.Env(aT, aL, dT, dL, sT, sL, rT);
   *    triOsc = new p5.TriOsc();
   *    triOsc.amp(0);
   *    triOsc.start();
   *    env.play(triOsc);
   *  }
   *  </code></div>
   */
  p5.Env = function (attackTime, attackLevel, decayTime, decayLevel, sustainTime, sustainLevel, releaseTime, releaseLevel) {
    /**
     * @property attackTime
     */
    this.attackTime = attackTime;
    /**
     * @property attackLevel
     */
    this.attackLevel = attackLevel;
    /**
     * @property decayTime
     */
    this.decayTime = decayTime || 0;
    /**
     * @property decayLevel
     */
    this.decayLevel = decayLevel || 0;
    /**
     * @property sustainTime
     */
    this.sustainTime = sustainTime || 0;
    /**
     * @property sustainLevel
     */
    this.sustainLevel = sustainLevel || 0;
    /**
     * @property releaseTime
     */
    this.releaseTime = releaseTime || 0;
    /**
     * @property releaseLevel
     */
    this.releaseLevel = releaseLevel || 0;
    this.control = null;
  };
  /**
   *  
   *  @param  {Object} input       A p5Sound object or
   *                                Web Audio Param
   */
  p5.Env.prototype.setInput = function (input) {
    // assume we're talking about output gain, unless given a different audio param
    if (input.output !== undefined) {
      input = input.output.gain;
    }
    this.control = input;
  };
  /**
   *  Play tells the envelope to start acting on a given input.
   *  If the input is a p5Sound object (i.e. AudioIn, Oscillator,
   *  SoundFile), then Env will control its output volume.
   *  Envelopes can also be used to control any Web Audio Param.
   *
   *  @method  play
   *  @param  {Object} input        A p5Sound object or
   *                                Web Audio Param
   */
  p5.Env.prototype.play = function (input) {
    // if no input is given, input is this Envelope's input
    if (!input) {
      input = this.control;
    }
    // assume we're talking about output gain, unless given a different audio param
    if (input.output !== undefined) {
      input = input.output.gain;
    }
    this.control = input;
    var now = p5sound.audiocontext.currentTime;
    input.cancelScheduledValues(now);
    input.setValueAtTime(0, now);
    // attack
    input.linearRampToValueAtTime(this.attackLevel, now + this.attackTime);
    // decay to decay level
    input.linearRampToValueAtTime(this.decayLevel, now + this.attackTime + this.decayTime);
    // hold sustain level
    input.linearRampToValueAtTime(this.sustainLevel, now + this.attackTime + this.decayTime + this.sustainTime);
    // release
    input.linearRampToValueAtTime(this.releaseLevel, now + this.attackTime + this.decayTime + this.sustainTime + this.releaseTime);
  };
  /**
   *  Trigger the Attack, Decay, and Sustain of the Envelope.
   *  Similar to holding down a key on a piano, but it will
   *  hold the sustain level until you let go.
   *
   *  @method  triggerAttack
   *  @param  {Object} input p5.Sound Object or Web Audio Param
   */
  p5.Env.prototype.triggerAttack = function (input) {
    var now = p5sound.audiocontext.currentTime;
    // if no input is given, input is this Envelope's input
    if (!input) {
      input = this.control;
    }
    // assume we're talking about output gain, unless given a different audio param
    if (input.output !== undefined) {
      input = input.output.gain;
    }
    this.control = input;
    var currentVal = input.value;
    input.cancelScheduledValues(now);
    input.setValueAtTime(currentVal, now);
    input.linearRampToValueAtTime(this.attackLevel, now + this.attackTime);
    // attack
    input.linearRampToValueAtTime(this.attackLevel, now + this.attackTime);
    // decay to sustain level
    input.linearRampToValueAtTime(this.decayLevel, now + this.attackTime + this.decayTime);
    // hold sustain level
    input.linearRampToValueAtTime(this.sustainLevel, now + this.attackTime + this.decayTime + this.sustainTime);
  };
  /**
   *  Trigger the Release of the Envelope. This is similar to release
   *  the key on a piano and letting the sound fade according to the
   *  release level and release time.
   *
   *  @method  triggerRelease
   *  @param  {Object} input p5.Sound Object or Web Audio Param
   */
  p5.Env.prototype.triggerRelease = function (input) {
    var now = p5sound.audiocontext.currentTime;
    // if no input is given, input is this Envelope's input
    if (!input) {
      input = this.control;
    }
    // assume we're talking about output gain, unless given a different audio param
    if (input.output !== undefined) {
      input = input.output.gain;
    }
    if (input.output !== undefined) {
      input = input.output.gain;
    }
    var currentVal = input.value;
    input.cancelScheduledValues(p5sound.audiocontext.currentTime);
    input.setValueAtTime(currentVal, now);
    // release
    input.linearRampToValueAtTime(this.releaseLevel, now + this.releaseTime);
  };
}(master);
var src_app;
src_app = function () {
  'use strict';
  var p5SOUND = sndcore;
  return p5SOUND;
}(sndcore, master, helpers, soundfile, amplitude, fft, oscillator, pulse, noise, audioin, env);
