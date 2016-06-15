/**
 * Button Class
 *
 * This class creates a phaser button that can be synced across players. E.g. if
 * one player hovers over the button, both players will see the button in its
 * hover state. This class can also be used to create normal, single-player buttons.
 */


module.exports = SpriteButton;

var SubscriberMixin = require("./mixins/event-subscriber-game-object.js");

// Prototype
SpriteButton.prototype = Object.create(Phaser.Button.prototype);
SpriteButton.prototype.constructor = SpriteButton;

// Mixins
$.extend(SpriteButton.prototype, new SubscriberMixin());

var STATE_OVER = "Over";
var STATE_OUT = "Out";
var STATE_DOWN = "Down";
var STATE_UP = "Up";

function SpriteButton(game, x, y, atlas, basekey, callback, callbackContext, 
                      soundKey, fbParentRef, parent) {
    var overKey = basekey + "-over";
    var upKey = basekey + "-up";
    var outKey = basekey + "-out";
    var downKey = basekey + "-down";

    // Assume there is an over frame.  If any other frames are missing, use 
    // over by default.
    if (!game.cache.getFrameByName(atlas, upKey)) upKey = overKey;
    if (!game.cache.getFrameByName(atlas, downKey)) downKey = overKey;
    // Out frame should default to the up frame if it doesn't exist.  If up does
    // not exist, this will be the over frame.
    if (!game.cache.getFrameByName(atlas, outKey)) outKey = upKey;

    Phaser.Button.call(this, game, x, y, atlas, callback, callbackContext, 
                       overKey, upKey, downKey, upKey);
    if (!parent) game.add.existing(this);
    else parent.add(this);

    // Set sound
    if (soundKey) {
        this.sound = this.game.sound.add(soundKey);
        // Schedule a destroy event that takes care of cleaning up the sound
        // when the button is destroyed
        this.events.onDestroy.add(function () {
            if (!this.sound.isPlaying) {
                this.sound.destroy();
                return;
            }
            // If the sound is player, we need to schedule a destroy...
            var destroyOnStop = function () {
                // Destroying a sound triggers a stop, so if we don't unregister
                // this can lead to recursively hit max call depth
                this.onStop.removeAll(this); 
                this.destroy();
            }
            this.sound.onStop.add(destroyOnStop, this.sound);
        }, this);   
    }

    // Disable cursor over the button
    this.input.useHandCursor = false;

    this.stateCallbacks = {};

    // Only do firebase stuff when a fbRef is passed in
    if (fbParentRef) {
        this.initSubscriber();
        this.fbRef = fbParentRef.child("button-" + basekey + Math.round(x) + 
            Math.round(y));
        this.firebaseSetup();
    }
    else {
        // If we aren't using firebase, trigger the sound using the normal 
        // button way
        this.setDownSound(this.sound);
    }
};


SpriteButton.prototype.firebaseSetup = function () {
    // Host initializes button state
    if (this.game.globals.playerRole === "host") {
        this.fbRef.set(STATE_UP);
    }

    this.onInputOver.add(function () { this.changeState(STATE_OVER); }, this);
    this.onInputOut.add(function () { this.changeState(STATE_OUT); }, this);
    this.onInputDown.add(function () { this.changeState(STATE_DOWN); }, this);
    this.onInputUp.add(function () { this.changeState(STATE_UP); }, this);

    this.subscribeFirebaseEvent(this.fbRef, "value", function (snapshot) {
        if (!snapshot.exists()) return;
        var buttonState = snapshot.val();
        this._localChangeState(buttonState);
    }, this);
};

SpriteButton.prototype.changeState = function (state) {
    this.fbRef.set(state);
};

SpriteButton.prototype._localChangeState = function (state) {
    this.changeStateFrame(state);
    if (state === STATE_DOWN && this.sound) this.sound.play();
};