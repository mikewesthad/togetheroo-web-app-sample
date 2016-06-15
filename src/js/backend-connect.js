/**
 * Backend Connection Manager
 *
 * This class is modified from the original source to be a dummy class that 
 * doesn't actually connect to the real back end.
 */

var utilities = require("./utilities.js");

// Assign the client a random player id
var playerId = utilities.randString(20);

// Get playspace id from query parameter (if it exists)
var params = utilities.getQueryParameters();
var playspaceId = params.id && params.id.replace(/\W/g, "");

// Make a request to the backend to get playspace information
module.exports = function connect(callback) {
	var requestOptions = {
		type: "GET",
		crossDomain: true,
		dataType: "json",
		success: function (responseData, textStatus, jqXHR) {
			// Store new URL in history if hosting a new playspace.
			if (!playspaceId) {
				var url = window.location.href + "?id=" + responseData.id;
				history.pushState({}, null, url);
			}
			
			// Update the playspace url in the nav bar
			var newText = "togetheroo.com/playspace?id=" + responseData.id;
			$("#playspace-clipboard").text(newText);

			// Callback
			playspaceId = responseData.id;
			var firebaseUrl = responseData.firebaseLocation;
			callback(firebaseUrl, playerId, responseData.tokboxSessionId, 
				responseData.tokboxToken);
		},
		error: function (responseData, textStatus, errorThrown) {
			// OMITTED
		}
	};

	// Exisiting playspace
	if (playspaceId) {
		requestOptions.url = "https://dummy.com/playspaces/" + playspaceId + 
			".json";
		requestOptions.type = "GET";
		requestOptions.data = {};
	}
	// New playspace
	else {
		requestOptions.url = "https://dummy.com/playspaces.json";
		requestOptions.type = "POST";
		requestOptions.data = {user_id: playerId};
	}

	dummyAjax(requestOptions);
};

function dummyAjax(options) {
	var dummyFirebaseLocation = 
		"https://popping-inferno-7583.firebaseio.com/playspaces/" + 
		utilities.randString(10);
	var dummyId = utilities.randString(10);

	options.success({
		id: dummyId,
		firebaseLocation: dummyFirebaseLocation,
		tokboxSessionId: null,
		tokboxToken: null
	}, 200, {});
}