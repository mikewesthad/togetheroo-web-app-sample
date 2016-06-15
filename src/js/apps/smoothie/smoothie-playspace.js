/**
 * Entry point for the smoothie game.
 *
 * Creates the phaser game environemtn and handles the extension of the firebase
 * layer to handle game-specific events.
 */

module.exports = SmoothiePlayspace;

var EventSubscriber = require("../../event-subscriber.js");

// Game states
var Boot = require("./states/boot.js");
var Preloader = require("./states/preloader.js");
var DifficultySelect = require("./states/difficulty-select.js");
var Level1 = require("./states/level1.js");
var Tutorial = require("./states/tutorial.js");
var EndScreen = require("./states/end-screen.js");
var MainMenu = require("./states/main-menu.js");
var ConnectMenu = require("./states/connect-menu.js");
var DisconnectMenu = require("./states/disconnect-menu.js");
var JoinMenu = require("./states/join-menu.js");

function SmoothiePlayspace(firebaseLayer) {
    this.firebaseLayer = firebaseLayer;
}

SmoothiePlayspace.prototype = Object.create(EventSubscriber.prototype);

SmoothiePlayspace.prototype.load = function () {
    // Set up necessary DOM elements
    var appDiv = $("#playspace #app");
    var phaserContainer = $("<div id='smoothie-app'></div>")
        .appendTo(appDiv);
    phaserContainer = phaserContainer.get(0); // Get native DOM element
    // Create a game and configure it with states
    this.game = new Phaser.Game(800, 600, Phaser.AUTO, phaserContainer);
    this.game.state.add("boot", Boot);
    this.game.state.add("preloader", Preloader);
    this.game.state.add("difficultySelect", DifficultySelect);
    this.game.state.add("tutorial", Tutorial);
    this.game.state.add("level1", Level1);
    this.game.state.add("endScreen", EndScreen);
    this.game.state.add("mainMenu", MainMenu);
    this.game.state.add("disconnectMenu", DisconnectMenu);
    this.game.state.add("connectMenu", ConnectMenu);
    this.game.state.add("joinMenu", JoinMenu);

    // Global variables shared across all states
    this.game.globals = {};
    this.game.globals.fruitNames = [
        "banana", "blackberry", "orange", "strawberry"
    ];
    this.game.globals.regularCustomerNames = [
        "afrogirl", "asian", "asianman", "banker", "boy", "cop", "dad", 
        "fisher", "girl", "granny", "latina", "mom"
    ];
    this.game.globals.specialCustomerNames = [
        "heart", "monkey"       
    ];

    // For initializing the firebase stuff AFTER boot and preload
    this.game.globals.playspace = this;

    // Start with the boot state
    this.game.state.start("boot");
};

SmoothiePlayspace.prototype.unload = function () {
    this.unsubscribeAllEvents();
    // Phaser 2.4.6 bug - when destroying the game, a event handler on the 
    // window is not unregistered.  See: 
    //  https://github.com/photonstorm/phaser/issues/2387
    var mouse = this.game.input.mouse;
    window.removeEventListener('mouseout', mouse._onMouseOutGlobal, true);    
    this.game.destroy();
    $("#spelling-app").remove();
};

SmoothiePlayspace.prototype.configureFirebase = function () {
    var fbGameRef = this.firebaseLayer.fbPlayspace.child("app/mixAndMatch");
    var playerId = this.firebaseLayer.playerId;
    var globals = this.game.globals;
    var playerRole = this.firebaseLayer.playerRole;
    globals.playerRole = playerRole;

    // Initialize data
    fbGameRef.transaction(function update(appData) {
        var hasValidData = appData && appData.players && 
                           Object.keys(appData.players).length !== 0;
        if (!hasValidData) {
            appData = {
                gameState: {
                    current: null,
                    previous: null,
                    clearWorld: null
                },
                gameSettings: {
                    difficulty: "easy",
                },
                gameData: {},
                players: {}
            };
        }
        appData.players[playerId] = playerRole;
        return appData;
    }, function onComplete(error, committed, snapshot) {
        if (error) console.log("There was a problem with Mix & Match:", error);
        if (!committed) console.log("The transaction was not committed.");

        var appData = snapshot.val();

        // Helper variables for pointing to firebase data
        this.fbRefs = {
            root: fbGameRef,
            state: fbGameRef.child("gameState"),
            settings: fbGameRef.child("gameSettings"),
            data: fbGameRef.child("gameData"),
            players: fbGameRef.child("players")
        };

        // When player disconnects, remove them from firebase
        this.fbRefs.players
            .child(playerId)
            .onDisconnect()
            .remove();
        
        this.registerStateChangeEvents();

        // Handling players joining/leaving
        $.subscribe("player.add", this._onPlayerJoinPlayspace.bind(this));
        $.subscribe("player.remove", this._onPlayerLeavePlayspace.bind(this));
        $.subscribe("player.becomeHost", this._onPlayerBecomeHost.bind(this));

        // Difficulty select
        var difficultyRef = this.fbRefs.settings.child("difficulty");
        this.subscribejQueryEvent("firebase-changeDifficulty", function (_, 
            newDifficulty) {
            difficultyRef.set(newDifficulty);
        }, this); 
        this.subscribeFirebaseEvent(difficultyRef, "value", 
            function (snapshot) {
            var newDifficulty = snapshot.val();
            $.publish("game-changeDifficulty", [newDifficulty]);
        }, this);
        this.subscribejQueryEvent("game-changeDifficulty", function (_, 
            newDifficulty) {
            console.log("Difficulty change to:", newDifficulty);
            this.game.globals.difficulty = newDifficulty;
        }, this);

        // If the state is defined, join it directly without talking to firebase
        if (appData.gameState && appData.gameState.current) {
            this.game.state.start(appData.gameState.current);
        }
        else $.publish("firebase-changeState", ["mainMenu"]);

    }.bind(this));
};

SmoothiePlayspace.prototype._onPlayerJoinPlayspace = function (_, playerId, 
    playerData) {
    var playerRole = playerData.role;
    // Update the game list of players
    this.fbRefs.players.child(playerId).set(playerRole);
    // Handle joining of game if a game is already in progress
    this.fbRefs.state.once("value", function (snapshot) {
        var state = snapshot.val().current;
        var gameInProgress = (state === "level1" || state === "tutorial" || 
                              state === "endScreen");
        if (gameInProgress) {
            $.publish("firebase-changeState", ["connectMenu"]);
        }
    });
};

SmoothiePlayspace.prototype._onPlayerLeavePlayspace = function (_, playerId, 
    playerData) {
    var playerRole = playerData.role;
    // Update the game list of players
    this.fbRefs.players.child(playerId).set(null);
    // If the host has left, restart the game
    if (playerRole === "host") {
        $.publish("firebase-changeState", ["disconnectMenu"]);        
    }
};

SmoothiePlayspace.prototype._onPlayerBecomeHost = function (_, playerId) {
    // Check if client is the player who just became host (this should always
    // be true with two players)
    if (this.firebaseLayer.playerId === playerId) {
        this.game.globals.playerRole = "host";
        this.fbRefs.players.child(playerId).set("host");
    }
};

SmoothiePlayspace.prototype.registerStateChangeEvents = function () {
    this.subscribejQueryEvent("firebase-changeState", function (_, newState, 
        clearWorld) {
        if (clearWorld === undefined) clearWorld = true;
        this.fbRefs.state.set({
            current: newState,
            previous: this.game.state.current,
            clearWorld: clearWorld
        });
    }, this); 
    this.subscribeFirebaseEvent(this.fbRefs.state, "value", 
        function (snapshot) {
        if (!snapshot.exists()) return;
        var stateTransition = snapshot.val();
        $.publish("game-changeState", [stateTransition]);
    }, this);
    this.subscribejQueryEvent("game-changeState", function (_, 
        stateTransition) {
        var previous = stateTransition.previous;
        var current = stateTransition.current;
        var clearWorld = stateTransition.clearWorld
        var localState = this.game.state.current;
        // If we are catching up and jumping into a state, default to clearing
        if (localState !== previous) clearWorld = true;
        this.game.state.start(current, clearWorld);
    }, this);
};