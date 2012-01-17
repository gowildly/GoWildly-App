var db = null;

var watchID = null;
var latitude = 0;
var longitude = 0;
var altitude = 0;
var accuracy = 0;
var altitudeAccuracy = 0;
var heading = 0;
var speed = 0;
var timestamp = null;

var pictureViewport = null;

// Initialization
// This is our boot up sequence for the create screen.
function init() {
    document.addEventListener('deviceready', onDeviceReady, true);    
}

// Initialization: Step 1
// Wait for the PhoneGap to start up before doing anything, then start up the database, etc.
function onDeviceReady() {
	// Database stuff to initialize - making sure we have the tables, etc
	db = window.openDatabase('Database', '1.0', 'GoWildly', 200000);
    db.transaction(setupDatabase, onSetupDatabaseError, onSetupDatabaseSuccess);
}

// Initialization : Step 1
// Check to make sure our tables exist; if not, create them.
//
function setupDatabase(tx) {
	// Remove this later - START
	tx.executeSql('DROP TABLE IF EXISTS Trails');
	tx.executeSql('DROP TABLE IF EXISTS TrailLocationData');
	tx.executeSql('DROP TABLE IF EXISTS Races');
	tx.executeSql('DROP TABLE IF EXISTS RaceChampionTreasures');
	tx.executeSql('DROP TABLE IF EXISTS Spots');
	// Remove this later - END

	tx.executeSql('CREATE TABLE IF NOT EXISTS Trails (trailId unique, name, comment)');
    tx.executeSql('CREATE TABLE IF NOT EXISTS TrailLocationData (trailId, raceId, spotId, latitude, longitude, altitude, accuracy, altitudeAccuracy, heading, speed, totalTime)');
    tx.executeSql('CREATE TABLE IF NOT EXISTS Races (raceId, name, comment, time, distance)');
    tx.executeSql('CREATE TABLE IF NOT EXISTS RaceChampionTrasures (treasureId, raceId, comment)');
    tx.executeSql('CREATE TABLE IF NOT EXISTS Spots (spotId, name, comment, treasureId)');
}

// Navigates the user to the create trail page and resets the inputs page to the default settings
//
function navigateCreateTrailPage() {
	// Hide the stop button
	$('#create-trail-page-stop-div').hide();

	// Show the start button
	$('#create-trail-page-start-div').show();
	
	// Clear the inputs
	$('#create-trail-page-name').val('');
	$('#create-trail-page-comment').val('');
	
	// Clear the trail id
	$('#create-trail-page-trail-id').val('');
	
	// Navigate the user to the page
	$.mobile.changePage($('#create-trail-page'));
}

function navigateCreateRacePage() {
	// Clear the inputs
	$('create-race-page-name').val('');
	$('create-race-page-comment').val('');

	// Clear the race id
	$('#create-race-page-race-id').val('0');
	
	// Clear the viewports
	$('#create-race-page-treasure-viewport').html('');

	// Navigate the user to the page
	$.mobile.changePage($('#create-race-page'));
}

function navigateCreateSpotPage() {
	// Clear the inputs
	$('create-spot-page-name').val('');
	$('create-spot-page-comment').val('');

	// Clear the spot id
	$('#create-spot-page-spot-id').val('0');
	
	// Clear the viewports
	$('#create-spot-page-treasure-viewport').html('');

	// Navigate the user to the page
	$.mobile.changePage($('#create-spot-page'));
}

// Create Trail: The main entry point method for creating new trails.
//
function createTrail() {
	if ($('#create-trail-page-name').val() == null ||
		$('#create-trail-page-name').val().trim().length == 0) {
		alert('You need to give the trail a name before starting!');
	} else {
		// Kick of the trail callbacks and operations
		db.transaction(getLastTrailId, onGetLastTrailIdError);

		// Show the user that the page is loading
		//$.mobile.pageLoading(false);
	}
}

// Create Trail : Step 1
// Get the latest trail id based on the recordings in the system.  The trail id
// is specific to this device.  Once the trail gets passed back to the server, this id will be recorded
// but not used for indexing.
//
function getLastTrailId(tx) {
    tx.executeSql('SELECT trailId FROM Trails ORDER BY trailId DESC', [], onGetLastTrailIdSuccess, onGetLastTrailIdError);
}

// Create Trail : Step 2
// Assuming we were able to get a trail identifier, we then kick off the actual trail recording operation.
//
function onGetLastTrailIdSuccess(tx, results) {
	var assigned = false;
	
	if (results != null &&
		results.rows.length > 0) {
	    for (var i = 0; i < results.rows.length; i++) {
	    	$('#create-trail-page-trail-id').val(results.rows.item(i).trailId + 1);
	    	assigned = true;
	    	break;
	    }
	}
	
	if (assigned == false) {
		$('#create-trail-page-trail-id').val('1');
	}
    
    db.transaction(startTrailRecording, onStartTrailRecordingError, onStartTrailRecordingSuccess);
}

// Create Trail : Step 3
// Create the new trail record in our database with our new trail identifier.
//
function startTrailRecording(tx) {
	tx.executeSql('INSERT INTO Trails (trailId, name, comment) VALUES (' + $('#create-trail-page-trail-id').val() + ', "' + $('#create-trail-page-name').val() + '", "' + $('#create-trail-page-comment').val() + '")');
}

// Create Trail : Step 4
// Assuming the creation SQL executed as expected, we can now kick off the location watcher to begin
// streaming our location data into the database.
//
function onStartTrailRecordingSuccess() {
	// Location based stuff to initialize - record location every 3 seconds
    var options = { frequency: 10000, enableHighAccuracy: true };
    // Assign a reference so we can manage this process
    watchID = navigator.geolocation.watchPosition(onLocationSuccess, onLocationError, options);

	// Hide the page is loading icon as we're done
	//$.mobile.pageLoading(true);
	
	// Navigate the user to the recording page
	$.mobile.changePage($('#record-trail-page'));
}

// Create Trail : Step 5a
// This the callback for the geolocation watcher and will be called every 3 seconds.  The role of this
// is to grab all the location data we can and record it into our local database.
//
function onLocationSuccess(position) {
	// Get the location information from the position
    latitude = position.coords.latitude;
    longitude = position.coords.longitude;
    altitude = position.coords.altitude;
    accuracy = position.coords.accuracy;
    altitudeAccuracy = position.coords.altitudeAccuracy;
    heading = position.coords.heading;
    speed = position.coords.speed;
    timestamp = new Date(position.timestamp);
    
    // Tell the database to record the current location data
    db.transaction(populateLocation, onPopulateLocationError, onPopulateLocationSuccess);
}

// Create Trail : Step 5b
// Record the location data into our database.
//
function populateLocation(tx) {
	tx.executeSql('INSERT INTO TrailLocationData (trailId, raceId, spotId, latitude, longitude, altitude, accuracy, altitudeAccuracy, heading, speed, totalTime) VALUES (' + $('#create-trail-page-trail-id').val() + ', ' + $('#create-race-page-race-id').val() + ', ' + $('#create-spot-page-spot-id').val() + ', ' + latitude + ', ' + longitude + ', ' + altitude + ', ' + accuracy + ', ' + altitudeAccuracy + ', ' + heading + ', ' + speed + ', "' + timestamp + '")');

	// We only want to record the spot once - so we clear the spot id after insert always
	$('#create-spot-page-spot-id').val('0');
}

// Finish Trail : One Step
// Stops the location listener and takes us back to the recording page
//
function finishTrail() {
	// Stop the app from recording location data
	navigator.geolocation.clearWatch(watchID);
	
	// Hide the start button
	$('#create-trail-page-start-div').hide();

	// Show the save button
	$('#create-trail-page-stop-div').show();
	
	// Navigate the user to the recording page
	$.mobile.changePage($('#create-trail-page'));
}

// Save Trail : Step 1
// This is the entry point for saving trails once they are completed
//
function saveTrail() {
	if ($('#create-trail-page-name').val() == null ||
		$('#create-trail-page-name').val().trim().length == 0) {
		alert('You need to give the trail a name before saving!');
	} else {
		// Show the page is loading icon as this may take a sec
		//$.mobile.pageLoading(false);

		db.transaction(saveTrailRecording, onSaveTrailRecordingError, onSaveTrailRecordingSuccess);
	}
}

// Save Trail : Step 2
// Update the trail record in our database with the latest trail info.
//
function saveTrailRecording(tx) {
	tx.executeSql('UPDATE Trails SET name = "' + $('#create-trail-page-name').val() + '", comment = "' + $('#create-trail-page-comment').val() + '" WHERE trailId = ' + $('#create-trail-page-trail-id').val());
}

// Save Trail : Step 3
// Assuming the update SQL executed as expected, we navigate back to the home screen.
//
function onSaveTrailRecordingSuccess() {
	// Hide the page is loading icon as we're done
	//$.mobile.pageLoading(true);
	
	// Navigate the user to the recording page
	$.mobile.changePage($('#intro-page'));
}

// Create Race
//
function startCreateRace() {
	if ($('#create-race-page-name').val() == null ||
		$('#create-race-page-name').val().trim().length == 0) {
		alert('You need to give the race a name before starting!');
	} else {
		// Kick of the race callbacks and operations
		db.transaction(getLastRaceId, onGetLastRaceIdError);

		// Show the user that the page is loading
		//$.mobile.pageLoading(false);
	}
}

// Create Race : Step 1
// Get the last race id recorded in the system so we have a unique index to work with.  This is used
// on the mobile app end only - it's not the id used when persisted to the server.
//
function getLastRaceId(tx) {
    tx.executeSql('SELECT raceId FROM Races ORDER BY raceId DESC', [], onGetLastRaceIdSuccess, onGetLastRaceIdError);
}

// Create Race : Step 2
// Now that we have the race id, we need to update the page with the value - this will then be incorporated
// into the location stats as they are recorded.
//
function onGetLastRaceIdSuccess(tx, results) {
	var assigned = false;
	
	// Check to see if we have any existing races in the system
	if (results != null &&
		results.rows.length > 0) {
	    for (var i = 0; i < results.rows.length; i++) {
	    	$('#create-race-page-race-id').val(results.rows.item(i).raceId + 1);
	    	assigned = true;
	    	break;
	    }
	}
	
	// If we haven't assigned a race id, assign it to 1
	if (assigned == false) {
		$('#create-race-page-race-id').val('1');
	}
	
	db.transaction(startRaceRecording, onStartRaceRecordingError, onStartRaceRecordingSuccess);
}

// Create Race : Step 3
// Create the new race record in our database with our new trail identifier.
//
function startRaceRecording(tx) {
	tx.executeSql('INSERT INTO Races (raceId, name, comment) VALUES (' + $('#create-race-page-race-id').val() + ', "' + $('#create-race-page-name').val() + '", "' + $('#create-race-page-comment').val() + '")');
}

// Create Race : Step 4
// Once the save of the race has been successful, we can take the user to the record race page
//
function onStartRaceRecordingSuccess() {
	// Hide the user that the page is loading
	//$.mobile.pageLoading(true);

	// Now finally, send the user to the race recording page
	$.mobile.changePage($('#record-race-page'));
}

// Finish Race : Step 1
// Now that we have the race id, we need to update the page with the value - this will then be incorporated
// into the location stats as they are recorded.
//
function finishCreateRace() {
	$('#create-race-page-race-id').val('0');
	
	// Tell the user the race is done
	alert('Awesome race!');

	// Navigate the user to the recording page
	$.mobile.changePage($('#record-trail-page'));
}

// Create Spot
//
function finishCreateSpot() {
	if ($('#create-spot-page-name').val() == null ||
		$('#create-spot-page-name').val().trim().length == 0) {
		alert('You need to give the spot a name!');
	} else {
		// Kick of the spot callbacks and operations
		db.transaction(getLastSpotId, onGetLastSpotIdError);

		// Show the user that the page is loading
		//$.mobile.pageLoading(false);
	}
}

// Create Spot : Step 1
// Get the last spot id recorded in the system so we have a unique index to work with.  This is used
// on the mobile app end only - it's not the id used when persisted to the server.
//
function getLastSpotId(tx) {
    tx.executeSql('SELECT spotId FROM Spots ORDER BY spotId DESC', [], onGetLastSpotIdSuccess, onGetLastSpotIdError);
}

// Create Spot : Step 2
// Now that we have the spot id, we need to update the page with the value - this will then be incorporated
// into the location stats as they are recorded.
//
function onGetLastSpotIdSuccess(tx, results) {
	var assigned = false;
	
	// Check to see if we have any existing races in the system
	if (results != null &&
		results.rows.length > 0) {
	    for (var i = 0; i < results.rows.length; i++) {
	    	$('#create-spot-page-spot-id').val(results.rows.item(i).spotId + 1);
	    	assigned = true;
	    	break;
	    }
	}
	
	// If we haven't assigned a spot id, assign it to 1
	if (assigned == false) {
		$('#create-race-page-spot-id').val('1');
	}
	
	db.transaction(startSpotRecording, onStartSpotRecordingError, onStartSpotRecordingSuccess);
}

// Create Spot : Step 3
// Create the new spot record in our database with our new trail identifier.
//
function startSpotRecording(tx) {
	tx.executeSql('INSERT INTO Spots (spotId, name, comment) VALUES (' + $('#create-spot-page-spot-id').val() + ', "' + $('#create-spot-page-name').val() + '", "' + $('#create-spot-page-comment').val() + '")');
}

// Create Spot : Step 4
// Once the save of the spot has been successful, we can take the user back to the record trail page
//
function onStartSpotRecordingSuccess() {
	// Hide the user that the page is loading
	//$.mobile.pageLoading(true);

	// Now finally, send the user to the race recording page
	$.mobile.changePage($('#record-trail-page'));
}








function cancelCreateTrailChooseTreasurePage() {
	// Navigate the user back to the reference back location
	$.mobile.changePage($('#' + $('#create-trail-choose-treasure-page-back-location').val()));
}

function navigateCreateTrailChooseTreasure(returnPage) {
	$('#create-trail-choose-treasure-page-back-location').val(returnPage);
	
	// Navigate the user to the choose treasure page
	$.mobile.changePage($('#create-trail-choose-treasure-page'));
}

function navigateTrailPickTreasurePage() {
	alert('Not done!');
}

function doneCreateTrailChooseTreasurePage() {
	if ($('#create-trail-choose-treasure-page-comment').val() == null ||
		$('#create-trail-choose-treasure-page-comment').val().trim().length == 0) {
		alert('A treasure must contain a personal note!');
	} else {
		// Navigate the user back to the reference back location
		$.mobile.changePage($('#' + $('#create-trail-choose-treasure-page-back-location').val()));
	}
}

function getPictureForTrail(imgLocation) {
	pictureViewport = imgLocation;
	
    navigator.camera.getPicture(capturePictureForTrail, capturePictureForTrailError, {
        quality : 50
    });
}

function capturePictureForTrail(data) {
	var image = document.getElementById('' + pictureViewport + '');
    image.src = 'data:image/jpeg;base64,' + data;
}

function capturePictureForTrailError(err) {
    alert(err);
}





function myTrails() {
    db.transaction(getMyTrails, onGetMyTrailsError);
}

function getMyTrails(tx) {
	alert('Getting trails');
    tx.executeSql('SELECT trailId, name FROM Trails ORDER BY trailId DESC', [], onGetMyTrailsSuccess, onGetMyTrailsError);
}



// Create Trail : Step 2
// Assuming we were able to get a trail identifier, we then kick off the actual trail recording operation.
//
function onGetMyTrailsSuccess(tx, results) {
	alert('Getting trails success');
	var trailList = '';
	
	if (results != null &&
		results.rows.length > 0) {
		trailList += '<ul data-role="listview">';

		for (var i = 0; i < results.rows.length; i++) {
	    	trailList += '<li><a href="#" onclick="showTrail(' + results.rows.item(i).trailId + '); return false">' + results.rows.item(i).name + '</a></li>';
	    }
		
		trailList += '</ul>';
	}
	
	$('#my-trails-list').html(trailList);
	
    $.mobile.changePage($('#find-my-trails'));
}

function showTrail(id) {
	trailId = id;
	alert(id);
}




function onPopulateLocationSuccess() {
	alert('onPopulateLocationSuccess');
}

function onSetupDatabaseSuccess() {
	
}

function onSetupDatabaseError(tx, err) {
	alert('onSetupDatabaseError: ' + err);
}

function onStartTrailRecordingError(err) {
    alert('onStartTrailRecordingError: '+err.code);
}

function onStartRaceRecordingError(err) {
    alert('onStartRaceRecordingError: '+err.code);
}

function onStartSpotRecordingError(err) {
    alert('onStartRaceRecordingError: '+err.code);
}

function onGetLastTrailIdError(err) {
    alert('onGetLastTrailIdError: '+err.code);
}

function onGetLastRaceIdError(err) {
    alert('onGetLastRaceIdError: '+err.code);
}

function onGetLastSpotIdError(err) {
    alert('onGetLastSpotIdError: '+err.code);
}

function onPopulateLocationError(tx, err) {
    alert('onPopulateLocationError: ' + err);
}

function onLocationError(err) {
	alert('onLocationError: ' + err.code + ' ' + err.message);
}

function onSaveTrailRecordingError(err) {
    alert('onSaveTrailRecordingError: '+err.code);
}


function onGetMyTrailsError(err) {
	alert('onGetMyTrailsError: ' + err.code + ' ' + err.message);
}