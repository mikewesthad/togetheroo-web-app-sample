/**
 * Coin Class
 *
 * This class creates a coin pickup on the screen that can be collected. When it
 * is collected, it tweens to the scoreboard on both player's screens.
 */

module.exports = Coin;

var PausableMixin = require("./mixins/pausable-component.js");
var SubscriberMixin = require("./mixins/event-subscriber-game-object.js");

// Prototype
Coin.prototype = Object.create(Phaser.Sprite.prototype);
Coin.prototype.constructor = Coin;

// Mixins
$.extend(Coin.prototype, new PausableMixin({
	animation: true, sound: true, tween: true, input: true
}));
$.extend(Coin.prototype, new SubscriberMixin());

function Coin(game, cx, cy, firebaseId, fbCoinRef) {
	Phaser.Sprite.call(this, game, cx, cy, "assets", "coin-1");
	this.anchor.set(0.5, 0.5);
	this.initPausable();
    this.initSubscriber();

	this.firebaseId = firebaseId;

	var spinFrames = Phaser.Animation.generateFrameNames("coin-", 1, 6);
	this.animations.add("spin", spinFrames, 15, true);
	this.play("spin");

	this.inputEnabled = true;
	this.events.onInputDown.add(this.collectCoin, this);

	this.pickUpSound = this.createSound("chaChing");
	this.addToScoreSound = this.createSound("coinPick-up");

	// FIREBASE LOGIC
    var playspace = this.game.globals.playspace;
	this.fbSelf = fbCoinRef;
	this.fbIsCollected = fbCoinRef.child("isCollected");

    if (this.game.globals.playerRole === "host") {
        // Initialize the smoothie state
        this.fbIsCollected.set(null);
    }
    else {
        // Guest does nothing special
    }

    // Both host & guest listen for firebase events 
    this.subscribeFirebaseEvent(this.fbIsCollected, "value", 
        function (snapshot) {
        var isCollected = snapshot.val();
        if (isCollected) this._localCollectCoin();
    }, this);
}

Coin.prototype.update = function () {
	this.bringToTop();
};

Coin.prototype.collectCoin = function () {
	this.fbIsCollected.set(true);
};

Coin.prototype._localCollectCoin = function () {
	if (this.collectCallback) this.collectCallback();
	var gameComponents = this.game.globals.components;
	this.inputEnabled = false; 
	this.pickUpSound.play();

	// The coin is in the CustomerGrid coordinate system while the scoreboard is
	// in another group.  To find the position of the scoreboard in the coin's
	// coordinate system, we have to do some conversion.
	var scoreboard = gameComponents.scoreboard;
	// Take the world position of the scoreboard and convert it to the coin's
	// coordinate system.
	var scoreboardOffset = this.toLocal(scoreboard.worldPosition, 
        this.game.world); 
	// Now that we know the coords of the scoreboard relative to the coin, we
	// add that offset to the coin's position to find where the coin now needs 
	// to go.
	var target = Phaser.Point.add(this.position, scoreboardOffset);
	// The scoreboard is positioned using the top left as the anchor, 
	// but we want to center the coin over the scoreboard
	target.add(scoreboard.width/2, scoreboard.height/2);

	var speed = 900/1000; // px/ms
	var distance = Phaser.Math.distance(this.x, this.y, target.x, target.y);
	var duration = distance / speed;
	var tween = this.createTween(this.position);

	tween.to({x: target.x, y: target.y}, duration, "Cubic");
	tween.onComplete.add(function () {
		this.addToScoreSound.play();
		scoreboard.addPoints(10);
		this.removeTween(tween);
		if (this.game.globals.playerRole === "host") {
			// Host is responsible for adding points, so host should also be
			// responsible for destroying the coin.  Otherwise, the guest could
			// prematurely remove the coin before the host adds the points.
			gameComponents.customerGrid.removeElement(this);
		}
	}, this);
	tween.start();
};