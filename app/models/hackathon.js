var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	Q = require('q'),
	devpost = require('devpost-scraper');

var HackathonSchema = new Schema({
	name: { type: String, required: true },
	service: { type: String, default: 'devpost' },
	serviceId: { type: String, required: true, unique: true },
	projects: [{ type: Schema.ObjectId, ref: 'Project' }],
	status: { type: String, default: 'preevent' }
});

HackathonSchema.methods.scrapeDevpost = function (callback) {
	var deferred = Q.defer();
	var hackathon = this;

	devpost.submissions(hackathon.serviceId).then(
		function successCallback(data) {
			// console.log(data);
			deferred.resolve(data);
		},
		function errorCallback(error) {
			deferred.reject(error);
			console.log(error)
		});

	return deferred.promise;
};

mongoose.model('Hackathon', HackathonSchema);