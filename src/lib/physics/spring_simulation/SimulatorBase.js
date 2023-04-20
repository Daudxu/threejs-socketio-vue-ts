export class SimulatorBase {
	constructor(fps, mass, damping) {
	  this.mass = mass
	  this.damping = damping
	  this.frameTime = 1 / fps
	  this.offset = 0
	}
  
	setFPS(value) {
	  this.frameTime = 1 / value
	}
  
	lastFrame() {
	  return this.cache[this.cache.length - 1]
	}
  
	/**
	 * Generates frames between last simulation call and the current one
	 * @param {timeStep} timeStep
	 */
	generateFrames(timeStep) {
	  // Update cache
	  // Find out how many frames needs to be generated
	  let totalTimeStep = this.offset + timeStep
	  let framesToGenerate = Math.floor(totalTimeStep / this.frameTime)
	  this.offset = totalTimeStep % this.frameTime
  
	  // Generate simulation frames
	  if (framesToGenerate > 0) {
		for (let i = 0; i < framesToGenerate; i++) {
		  this.cache.push(this.getFrame(i + 1 === framesToGenerate))
		}
		this.cache = this.cache.slice(-2)
	  }
	}
  }
  

// "use strict";
// Object.defineProperty(exports, "__esModule", { value: true });
// exports.SimulatorBase = void 0;
// var SimulatorBase = /** @class */ (function () {
//     function SimulatorBase(fps, mass, damping) {
//         this.mass = mass;
//         this.damping = damping;
//         this.frameTime = 1 / fps;
//         this.offset = 0;
//     }
//     SimulatorBase.prototype.setFPS = function (value) {
//         this.frameTime = 1 / value;
//     };
//     SimulatorBase.prototype.lastFrame = function () {
//         return this.cache[this.cache.length - 1];
//     };
//     /**
//      * Generates frames between last simulation call and the current one
//      * @param {timeStep} timeStep
//      */
//     SimulatorBase.prototype.generateFrames = function (timeStep) {
//         // Update cache
//         // Find out how many frames needs to be generated
//         var totalTimeStep = this.offset + timeStep;
//         var framesToGenerate = Math.floor(totalTimeStep / this.frameTime);
//         this.offset = totalTimeStep % this.frameTime;
//         // Generate simulation frames
//         if (framesToGenerate > 0) {
//             for (var i = 0; i < framesToGenerate; i++) {
//                 this.cache.push(this.getFrame(i + 1 === framesToGenerate));
//             }
//             this.cache = this.cache.slice(-2);
//         }
//     };
//     return SimulatorBase;
// }());
// exports.SimulatorBase = SimulatorBase;
