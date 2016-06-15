/**
 * Entry point for the drawing app.
 *
 * Loads the UI and handles the extension of the firebase layer to handle
 * drawing app specific events.
 */

module.exports = DrawPlayspace;
var EventSubscriber = require("../../event-subscriber.js");

function DrawPlayspace(firebaseLayer) {
    this.firebaseLayer = firebaseLayer;
    this.drawHtmlUrl = "./playspace-html/drawing-playspace.html"
}

DrawPlayspace.prototype = Object.create(EventSubscriber.prototype);

DrawPlayspace.prototype.load = function () {
    $("#playspace #app").load(this.drawHtmlUrl, function() {
        this.loadUi();
        this.configureFirebase();
    }.bind(this));
};

DrawPlayspace.prototype.unload = function () {
    this.unsubscribeAllEvents();
    this.canvasUI.unload();    
    this.toolboxUI.unload();    
    $.publish("firebase.cursorUpdate", [{thickness: 15}]); // Reset cursor size 
};

DrawPlayspace.prototype.configureFirebase = function () {
    // Ref for draw actions for the current playspace
    var fbDrawRef = this.firebaseLayer.fbPlayspace.child("app/draw");
    // Push incoming draw actions into the draw location in the database    
    this.subscribejQueryEvent("firebase.drawAction", function (_, drawAction) {
        fbDrawRef.push(drawAction);
    });
    // When a draw action is added to firebase, publish a canvas message    
    this.subscribeFirebaseEvent(fbDrawRef, "child_added", function (snapshot) {
        var drawAction = snapshot.val();
        $.publish("canvas.renderDrawAction", [drawAction]);
    });
}

DrawPlayspace.prototype.loadUi = function () {
    var ToolboxUI = require("./toolbox-ui.js");
    this.toolboxUI = new ToolboxUI();
    var CanvasUI = require("./canvas-ui.js");
    this.canvasUI = new CanvasUI(this.toolboxUI);
}