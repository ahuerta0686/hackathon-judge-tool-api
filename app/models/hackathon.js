var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	Q = require('q'),
	devpost = require('devpost-scraper');

var HackathonSchema = new Schema({
	name: { type: String, required: true },
	service: { type: String, default: 'devpost' },
	serviceId: { type: String, required: true, unique: true },
	projects: [{ type: Schema.ObjectId, ref: 'Project' }],
	status: { type: String, default: 'preevent' },

	criteria: [ { type: String } ],
	pointMinimum: { type: String, default: 1 },
	pointMaximum: { type: String, default: 10 }
});

HackathonSchema.methods.scrapeDevpost = function (callback) {
	var deferred = Q.defer();
	var hackathon = this;

	devpost.hackathon.projects.all(hackathon.serviceId).then(
		function successCallback(data) {
			deferred.resolve(data);
		},
		function errorCallback(error) {
			deferred.reject(error);
		});

	return deferred.promise;
};

mongoose.model('Hackathon', HackathonSchema);