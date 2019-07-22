'use strict';

const request = require('request');

var restDBBaseUrl = "https://rajkapadia-f8d1.restdb.io/rest/";
var restDBApiKey = process.env.REST_DB_API_KEY;

exports.webhook = function (req, res) {

	try {
		var action = req.body.queryResult.action;

		if (action == 'getSum') {
			getSum(req, res);
		}
		else if (action == 'getChuckNorrisJoke') {
			getChuckNorrisJoke(req, res);
		}
		else if (action == 'getDateTrivia') {
			getDateTrivia(req, res);
		}
		else if (action == 'getPlanetAttribute') {
			getPlanetAttribute(req, res);
		}
		else if (action == 'saveFeedback') {
			saveFeedback(req, res);
		}
		else if (action == 'checkDateOfBirth') {
			checkDateOfBirth(req, res);
		}
		else {
			flightBooking(req, res);
		}
	} catch (ex) {
		res.status(500).send(ex.message);
	}
};

function sendFunctionNotImplementedError(mainResponse) {
	var response = {};
	response.fulfillmentText = "No matching function found.";
	mainResponse.status(404).send(response);
}

function getSum(mainRequest, mainResponse) {
	var num1 = mainRequest.body.queryResult.parameters.number;
	var num2 = mainRequest.body.queryResult.parameters.number1;

	var outputString = "The sum of the numbers is " + (num1 + num2) + ".";

	var response = {};
	response.fulfillmentText = outputString;

	mainResponse.status(200).send(response);
}

function getChuckNorrisJoke(mainRequest, mainResponse) {
	var url = 'http://api.icndb.com/jokes/random';

	request(url, { json: true }, (err, res, body) => {

		var output = "";

		if (!err && res.statusCode == 200) {
			output = body.value.joke;
		} else {
			output = "Chunk Norris Joke is not available, please try after sometime.";
		}

		var response = {};
		response.fulfillmentText = output;

		mainResponse.status(200).send(response);
	});
}

function getDateTrivia(mainRequest, mainResponse) {
	var date = String(mainRequest.body.queryResult.parameters.date);

	var month = date.substring(5, 7);
	var day = date.substring(8, 10);

	var url = 'http://numbersapi.com/' + month + '/' + day + '/date';

	request(url, { json: true }, (err, res, body) => {

		var output = "";

		if (!err && res.statusCode == 200) {
			output = body;
		} else {
			output = "Date trivia is not available, please try after sometime.";
		}

		var response = {};
		response.fulfillmentText = output;

		mainResponse.status(200).send(response);
	});
}

function getPlanetAttribute(mainRequest, mainResponse) {
	var planet = mainRequest.body.queryResult.parameters.planet;
	var attribute = mainRequest.body.queryResult.parameters.attribute;

	var url = restDBBaseUrl + "planets?q={\"Name\":\"" + planet + "\"}";

	var headers = {
		'x-apikey': restDBApiKey,
		'cache-control': "no-cache"
	};

	request({ headers: headers, url: url, method: 'GET' }, (err, res, body) => {
		var output = "Planet data is not available, please try after sometime.";

		if (!err && res.statusCode == 200) {
			var data = JSON.parse(body);

			if (Object.keys(data).length > 0) {
				var val = data[0][attribute];

				if (typeof val != 'undefined') {
					output = "The " + attribute.toLowerCase() + " of " + planet + " is " + val + ".";
				}
			}
		}

		var response = {};
		response.fulfillmentText = output;

		mainResponse.status(200).send(response);
	});
}

function saveFeedback(mainRequest, mainResponse) {
	var output = "Sorry, your feedback is not saved, try again later.";

	var outputContexts = mainRequest.body.queryResult.outputContexts;

	var arrayOfSplitText = outputContexts[0]['name'].split('/');

	var lastValue = arrayOfSplitText[arrayOfSplitText.length - 1];

	if (lastValue == 'session-vars') {
		var firstName = outputContexts[0]['parameters']['given-name'];
		var emailAddress = outputContexts[0]['parameters']['email'];
		var comment = outputContexts[0]['parameters']['any'];

		var url = restDBBaseUrl + "feedback";

		var payload = {};
		payload.FirstName = firstName;
		payload.EmailAddress = emailAddress;
		payload.Comment = comment;

		var headers = {
			'x-apikey': restDBApiKey,
			'cache-control': "no-cache"
		};

		request({ headers: headers, url: url, form: payload, method: 'POST' }, (err, res, body) => {
			if (!err && res.statusCode == 201) {
				output = "Thank you! Your feedback was successfully received!";
			}

			var response = {};
			response.fulfillmentText = output;

			mainResponse.status(200).send(response);
		});
	} else {
		var response = {};
		response.fulfillmentText = output;
		mainResponse.status(200).send(response);
	}
}

function checkDateOfBirth(mainRequest, mainResponse) {
	var date = String(mainRequest.body.queryResult.parameters.date);

	var response = {};

	if (date.substring(0, 4) == "UUUU") {
		var session = mainRequest.body.session;
		var contextToAdd = session + "/contexts/awaiting_year_of_birth";
		var contextToDelete = session + "/contexts/awaiting_patient_name"
		var outputContexts = [{ "name": contextToAdd, "lifespanCount": 1 }, { "name": contextToDelete, "lifespanCount": 0 }]

		response.fulfillmentText = "What is the year of birth?";
		response.outputContexts = outputContexts;
	} else {
		response.fulfillmentText = "What is the patient's name?";
	}

	mainResponse.status(200).send(response);
}

function flightBooking(mainRequest, mainResponse) {
	var slots = ["nop", "dep", "dest", "depdt", "retdt", "class"];

	var actionToSlot = {
		"bookFlight": "nop",
		"inputs.numpassengers": "dep",
		"inputs.departurecity": "dest",
		"inputs.destinationcity": "depdt",
		"inputs.departuredate": "retdt",
		"inputs.returndate": "class"
	};

	var slotMessages = {
		"nop": "How many passengers?",
		"dep": "Where from?",
		"dest": "Where to?",
		"depdt": "What date do you leave?",
		"retdt": "What date do you return?",
		"class": "What flight class do you wish to fly?"
	};

	var expectedSlot = actionToSlot[mainRequest.body.queryResult.action];

	var output = getFilledSlots(mainRequest);

	var actualSlot = expectedSlot;

	for (var index in slots) {
		var slot = slots[index];
		if (output.filledSlots.indexOf(slot) < 0) {
			actualSlot = slot;
			break;
		}
	}

	var session = mainRequest.body.session;
	var contextName = session + "/contexts/awaiting_" + actualSlot;

	var response = {};
	response.fulfillmentText = slotMessages[actualSlot];
	response.outputContexts = [{ "name": contextName, "lifespanCount": 1 }];

	mainResponse.status(200).send(response);
}

function getFilledSlots(mainRequest) {
	var outputContexts = mainRequest.body.queryResult.outputContexts;

	var slotValues = {
		"nop": null,
		"dep": null,
		"dest": null,
		"depdt": null,
		"retdt": null,
		"class": null
	};

	var filledSlots = [];

	outputContexts.forEach(outputContext => {
		var arrayOfSplitText = outputContext['name'].split('/');
		var lastValue = arrayOfSplitText[arrayOfSplitText.length - 1];
		if (lastValue == 'session-vars') {
			try {
				var params = outputContext["parameters"];
				for (var param in params) {
					if (!String(param).includes('original')) {
						slotValues[param] = params[param];
						filledSlots.push(param);
					}
				}
			} catch (ex) {

			}
		}
	});

	var output = {};
	output.filledSlots = filledSlots;
	output.slotValues = slotValues;

	return output;
}
