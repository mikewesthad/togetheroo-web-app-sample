/**
 * Main Menu State
 *
 * Load the game's main menu, which gives the option to start a tutorial or play
 * the game. These states are synced across players via firebase.
 */

module.exports = MainMenu;

var MenuModal = require("../components/menu-modal.js");
var GraphicButton = require("../components/graphic-button.js");

function MainMenu(game) {}

MainMenu.prototype.create = function () {

	this.addBackgroundGradient("#daeeff", "#feffff");

	var playspace = this.game.globals.playspace;
	this.fbButtons = playspace.fbRefs.data.child("buttons");

	var modalGroup = this.game.add.group();
	var modal = new MenuModal(this.game, 0, 0, modalGroup);
	modal.centerOnScreen();
	modal.addTitle("Mix & Match!");
	modal.addBody("Earn coins by serving\nsmoothies to the customers\nbefore time runs out!");
	modal.addButton(135, 45, "tutorial", "blue", this._onTutorialClick, this, 
		            this.fbButtons);
	modal.addButton(135, 45, "play", "green", this._onPlayClick, this, 
		            this.fbButtons);
};

MainMenu.prototype._onTutorialClick = function () {	
	$.publish("firebase-changeState", "tutorial");
};	

MainMenu.prototype._onPlayClick = function () {	
	$.publish("firebase-changeState", "difficultySelect");
};	

MainMenu.prototype.addBackgroundGradient = function(fromColor, toColor) {		
	var bitmap = this.add.bitmapData(this.game.width, this.game.height);
	var gradient = bitmap.ctx.createLinearGradient(0, 0, 0, this.game.width);
	gradient.addColorStop(0, "#daeeff");
	gradient.addColorStop(1, "#feffff");
	bitmap.ctx.fillStyle = gradient;
	bitmap.ctx.fillRect(0, 0, this.game.width, this.game.height);
	this.bitmap = bitmap;
	this.morningGradient = this.add.sprite(0, 0, bitmap);
}