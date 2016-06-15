/**
 * Firebase Manager
 *
 * A FirebaseLayer object connects a playspace within the Togetheroo firebase
 * database. Firebase allows for real-time communication between players in a 
 * playspace (e.g. displaying cursor positions, sharing game data, etc.). When
 * an app is loaded, the app then dynamically extends this object with events 
 * and listeners specific to the app. (It cleans up after itself when the app is
 * closed.)
 * 
 * Database Structure
 *
 * togetheroo
 * ├── playspaces
 *     ├── IKSJ4950UR23 (a unique ID for each playspace, assigned by backend)
 *     ├── ...
 *     └── BK03094853D3
 *         ├── app (data for specific apps)
 *             ├── draw
 *             ├── mixAndMatch
 *             └── ...
 *         ├── startTime (when the first playspace user connected to firebase)
 *         ├── currentApp (if defined, indicates that an app is loaded)
 *         ├── players (connected players and their cursors)
 *             ├── playerId (unique ID)
 *                 ├── cursor
 *                     ├── color
 *                     ├── thickness
 *                     ├── x
 *                     └── y    
 *                 ├── ring
 *                     └── color
 *                 ├── role ("host" or "guest")
 *                 └── hasJoined (boolean, indicating if player has joined or 
 *                                they are still in the lobby)
 *             └── ...               
 *         └── messages (requests & replies between users)  
 */

module.exports = FirebaseLayer;

var utilities = require("./utilities.js");
var CONSTANTS = require("./constants.js");

// Useful globals
var playerDataTemplate = {
    cursor: {
        x: 0,
        y: 0,
        thickness: 15,
        color: "rgb(255,255,255)"
    },
    ring: {
        color: "rgb(255,255,255)"
    },
    role: "host",
    hasJoined: true // Auto-join, for now
};


function FirebaseLayer(firebaseUrl, playerId) {
    this.playerId = playerId;
    this.playerRole = undefined;
    this.numPlayers = 0;

    // References for data in the playspace
    this.fbPlayspace = new Firebase(firebaseUrl);
    this.fbPlayers = this.fbPlayspace.child("players");
    this.fbMyPlayerData = this.fbPlayspace.child("players").child(playerId);
    this.fbMyCursor = this.fbMyPlayerData.child("cursor");
    this.fbMyRing = this.fbMyPlayerData.child("ring");
    this.fbMessages = this.fbPlayspace.child("messages");
    this.fbCurrentApp = this.fbPlayspace.child("currentApp");

    this.initializeDatabase(function () {
        // Bind firebase events to handlers
        this.fbPlayers.on("child_added", this._onPlayerConnect, this);
        this.fbPlayers.on("child_removed", this._onPlayerDisconnect, this);
        this.fbPlayers.on("child_changed", this._onPlayerDataChanged, this);
        this.fbCurrentApp.on("value", this._onAppChange, this);
        
        // Subscribe to UI events
        $.subscribe("firebase.ringUpdate", this._updateMyRing.bind(this));
        $.subscribe("firebase.cursorUpdate", this._updateMyCursor.bind(this));
        $.subscribe("firebase.cursorMove", this._updateMyCursor.bind(this));
        $.subscribe("firebase.sendMessage", this._sendMessage.bind(this));
        $.subscribe("firebase.updateApp", this._changeApp.bind(this));

        // Cleanup on disconnect
        this.fbMyPlayerData.onDisconnect().remove();
    }.bind(this));
}

FirebaseLayer.prototype.initializeDatabase = function (callback) {
    this.fbPlayspace.transaction(function update(fbData) {
        // Initialize data, if needed
        var hasValidData = fbData && fbData.startTime;
        if (!hasValidData) {
            fbData = {
                app: null,
                currentApp: CONSTANTS.APP_NAME.LETTER_BLOCKS,
                messages: {},
                players: {},
                startTime: Firebase.ServerValue.TIMESTAMP
            };
        }
        // Assign player role
        if (!fbData.players) fbData.players = {}; 
        var numPlayers = Object.keys(fbData.players).length;
        var playerData = $.extend(true, {}, playerDataTemplate); // Deep copy
        if (numPlayers >= 2) {
            // Playspace is already full
            $("#playspace-full-modal").modal("show");
            throw new Error("Playspace full!");
        }
        if (numPlayers === 0) {
            // Host
            this.playerRole = "host";
            playerData.cursor.color = CONSTANTS.COLORS.HOST;
            playerData.ring.color = CONSTANTS.COLORS.HOST;
            playerData.role = "host";
        }
        else {
            // Guest
            this.playerRole = "guest";
            playerData.cursor.color = CONSTANTS.COLORS.GUEST;
            playerData.ring.color = CONSTANTS.COLORS.GUEST;
            playerData.role = "guest";   
        }
        fbData.players[this.playerId] = playerData;
        // Update the data
        return fbData;
    }.bind(this), function onComplete(error, committed, snapshot) {
        if (error) console.log("There was a problem with joining:", error);
        if (!committed) console.log("FB init transaction was not committed.");
        callback();
    }.bind(this));
};

FirebaseLayer.prototype._onPlayerConnect = function (snapshot) {
    this.numPlayers += 1;
    var playerData = snapshot.val();
    var playerId = snapshot.key();
    $.publish("cursor.add", [playerId, playerData.role, playerData.cursor]);  
    $.publish("ring.add", [playerId, playerData.role, playerData.ring]);   
    $.publish("player.add", [playerId, playerData]);   
};   

FirebaseLayer.prototype._onPlayerDisconnect = function (snapshot) {
    this.numPlayers -= 1;
    var playerData = snapshot.val();
    var playerId = snapshot.key();
    // If the host is leaving, we need to do some work
    if (playerData.role === "host") {
        // Change client to host
        this.fbMyPlayerData.child("role").set("host");
        this.playerRole = "host";
        // Notify any listeners that there is a new host
        $.publish("player.becomeHost", [this.playerId]);
        // If the player's color scheme is the default guest, then recolor them
        // with the default host color scheme 
        this.fbMyRing.once("value", function (snapshot) {
            var ringData = snapshot.val();
            if (ringData.color === CONSTANTS.COLORS.GUEST) {
                this.fbMyRing.child("color").set(CONSTANTS.COLORS.HOST);
                this.fbMyCursor.child("color").set(CONSTANTS.COLORS.HOST);
            }
        }, this);
    }
    // Let any listeners know that a player has left
    $.publish("cursor.remove", [playerId, playerData.role, playerData.cursor]);
    $.publish("ring.remove", [playerId, playerData.role, playerData.ring]);  
    $.publish("player.remove", [playerId, playerData]);  
};

FirebaseLayer.prototype._onPlayerDataChanged = function (snapshot) {
    var playerData = snapshot.val();
    var playerId = snapshot.key();
    $.publish("cursor.render", [playerId, playerData.role, playerData.cursor]); 
    $.publish("ring.render", [playerId, playerData.role, playerData.ring]);   
    $.publish("player.render", [playerId, playerData]);    
}; 

FirebaseLayer.prototype._onAppChange = function (snapshot) {
    if (!snapshot.exists()) return;
    var appName = snapshot.val();
    $.publish("playspace.appChange", [appName]);    
};

FirebaseLayer.prototype._changeApp = function (_, appName) {
    this.fbCurrentApp.set(appName);
};

FirebaseLayer.prototype._updateMyCursor = function (_, cursorPos) {
    this.fbMyCursor.update(cursorPos);
};    

FirebaseLayer.prototype._updateMyRing = function (_, ringData) {
    this.fbMyRing.update(ringData);
};