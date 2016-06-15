module.exports = PausableTweens;

function PausableTweens() {}

PausableTweens.prototype.initTweens = function () {
	this._pausableTweens = [];
};

PausableTweens.prototype.createTween = function (object) {
	var tween = this.game.add.tween(object);
	this._pausableTweens.push(tween);
	return tween;
};

PausableTweens.prototype.removeTween = function (tween) {
	for (var i = this._pausableTweens.length - 1; i >= 0; i -= 1) {
		if (this._pausableTweens[i] === tween) {
			this._pausableTweens[i].stop();
			this._pausableTweens.splice(i, 1);
			break;
		}
	}
};

PausableTweens.prototype.removeAllTweens = function () {
	this.stopTweens();
	this._pausableTweens = [];
};

PausableTweens.prototype.pauseTweens = function () {
	for (var i = this._pausableTweens.length - 1; i >= 0; i -= 1) {
		this._pausableTweens[i].pause();
	}
};

PausableTweens.prototype.resumeTweens = function () {
	for (var i = this._pausableTweens.length - 1; i >= 0; i -= 1) {
		this._pausableTweens[i].resume();
	}
};

PausableTweens.prototype.stopTweens = function () {
	for (var i = this._pausableTweens.length - 1; i >= 0; i -= 1) {
		this._pausableTweens[i].stop();
	}
};

PausableTweens.prototype.destroyTweens = function () {
	for (var i = this._pausableTweens.length - 1; i >= 0; i -= 1) {
		this.game.tweens.remove(this._pausableTweens[i]);
	}
	this._pausableTweens = [];
};