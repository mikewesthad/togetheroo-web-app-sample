/**
 * Main Module - Entry point for all JS
 *
 * Omitted features:
 * - MailChimp AJAX
 * - Copy from clipboard
 * - AddThis social integration for invites
 * - Guided tour of UI
 */

var FirebaseLayer = require("./firebase-layer.js");
var PlayspaceCoord = require("./playspace-coord.js");
var CursorManager = require("./cursor-manager.js");
var TokboxUi = require("./tokbox-ui.js");
var backendConnect = require("./backend-connect.js");
var utilities = require("./utilities.js");
var CONSTANTS = require("./constants.js");
var DrawPlayspace = require("./apps/draw/draw-playspace.js");
var SmoothiePlayspace = require("./apps/smoothie/smoothie-playspace.js");

var loadedApp;

backendConnect(function(firebaseUrl, playerId, tokboxSessionId, tokboxToken) {
    var firebaseLayer = new FirebaseLayer(firebaseUrl, playerId);
    var playspaceCoord = new PlayspaceCoord();  
    var cursorManager = new CursorManager(playspaceCoord);

    var tokboxUi = new TokboxUi(playerId, playspaceCoord, cursorManager);

    // Bind UI events to the two active app buttons in this demo
    $("#drawer #drawing-app-button")
        .click(function (event) {
            $.publish("firebase.updateApp", 
                [CONSTANTS.APP_NAME.CREATIVE_CANVAS]);
        });
    $("#drawer #smoothie-app-button")
        .click(function (event) {
            $.publish("firebase.updateApp", 
                [CONSTANTS.APP_NAME.MIX_AND_MATCH]);
        });

    // Listen for any firebase messages to change the app
    $.subscribe("playspace.appChange", function(event, appName) {
        changeApp(appName, firebaseLayer);
    });
});

function changeApp(appName, firebaseLayer) {
    if (!appName) return;

    if (loadedApp) {
        loadedApp.unload();
        $("#playspace #app").empty();
    }

    if (appName === CONSTANTS.APP_NAME.CREATIVE_CANVAS) {
        var drawPlayspace = new DrawPlayspace(firebaseLayer);
        drawPlayspace.load();
        loadedApp = drawPlayspace;
    }
    else if (appName === CONSTANTS.APP_NAME.MIX_AND_MATCH) {
        var smoothiePlayspace = new SmoothiePlayspace(firebaseLayer);
        smoothiePlayspace.load();
        loadedApp = smoothiePlayspace;      
    }
    else {
        console.log("Attempted to load unrecognized app name: %s", appName);
    }
}