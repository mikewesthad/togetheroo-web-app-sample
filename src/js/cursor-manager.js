/**
 * Cursor Manager
 *
 * This class handles syncing the client's cursor with firebase and listening
 * for changes to the partner's cursor.
 */

module.exports = CursorManager;

function CursorManager(playspaceCoord) {
    this.playspaceCoord = playspaceCoord;

    // Object for holding on to cursor DOM elements
    this.cursors = {};

    // Subscribe to the client's mouse events
    this.$playspace = this.playspaceCoord.get$Playspace();
    this.$playspace.mousemove(this._onMouseMove.bind(this));

    // Subscribe to the relevant events that will be emitted from firebase
    this.subscribe();

    // Hide default cursors on the playspace
    this.$playspace.css("cursor", "none");
}

CursorManager.prototype._onMouseMove = function (e) {
    var pos = this.playspaceCoord.pageCoordToCenter(e.pageX, e.pageY);
    $.publish("firebase.cursorMove", {
        x: pos.x,
        y: pos.y
    });
};  

CursorManager.prototype.createCursor = function (playerId) {    
    var $cursor = $("<div></div>") // Empty div
        .attr("class", "cursor") // Applies helpful base styling
        .attr("id", playerId)
        .appendTo($("#cursors")); // Cursor container within #playspace
    var cursorData = {
        x: 0, 
        y: 0,
        thickness: 10,
        color: "rgba(255,255,255,255)"
    };
    this.cursors[playerId] = {
        $element: $cursor,
        cursorData: cursorData
    };
    this.updateCursor(playerId, cursorData);
};

CursorManager.prototype.removeCursor = function (playerId) {    
    this.cursors[playerId].$element.remove();
    delete this.cursors[playerId];
};

CursorManager.prototype.getCursorData = function (playerId) {
    return this.cursors[playerId].cursorData;
};

CursorManager.prototype.getCursorOffset = function (playerId) {
    return this.cursors[playerId].$element.offset();
};

CursorManager.prototype.updateCursor = function (playerId, cursorData) {
    var $cursor = this.cursors[playerId].$element;
    var pos = this.playspaceCoord.centerCoordToTopLeft(cursorData.x, 
        cursorData.y);
    $cursor.css("top", pos.y + "px");
    $cursor.css("left", pos.x + "px");
    $cursor.css("width", cursorData.thickness + "px");
    $cursor.css("height", cursorData.thickness + "px");
    $cursor.css("background-color", cursorData.color);
    this.cursors[playerId].cursorData = cursorData;
};

CursorManager.prototype.subscribe = function () {
    $.subscribe("cursor.render", function (_, playerId, playerRole, 
        cursorData) {
        this.updateCursor(playerId, cursorData);
    }.bind(this));
    $.subscribe("cursor.add", function (_, playerId, playerRole, cursorData) {
        this.createCursor(playerId);
    }.bind(this));
    $.subscribe("cursor.remove", function (_, playerId, playerRole, 
        cursorData) {
        this.removeCursor(playerId);
    }.bind(this));
};