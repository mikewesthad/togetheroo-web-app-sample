/**
 * Pausable Component Mixin
 *
 * This mixin allows various key elements of a game element to be paused, 
 * resumed and stopped. It is composed of a series of mixins - one for each 
 * domain.
 */

module.exports = PausableComponent;

var TimerMixin = require("./pausable-timer.js");
var AnimationMixin = require("./pausable-animations.js");
var TweenMixin = require("./pausable-tweens.js");
var InputMixin = require("./pausable-inputs.js");
var SoundMixin = require("./pausable-sounds.js");

// OMITTED