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
	prizeFilters: [ {
		paramKey: { type: String },
		paramValue: { type: String },
		text: { type: String }
	} ],
	judges: [{
		username: { type: String },
		email: { type: String },
		specialty: { type: String },
		projects: [{ type: Schema.ObjectId, ref: 'Project' }],
		judgedProjects: [{ type: String }]
	}],

	criteria: [ { type: String } ],
	pointMinimum: { type: String, default: 1 },
	pointMaximum: { type: String, default: 10 }
});

HackathonSchema.methods.assignProjects = function (minJudging) {
	var hackathon = this;

	var currentJudgeIndex = 0;
	hackathon.projects.forEach(function (project) {
		while (project.judges.length < minJudging) {
			project.judges.push(hackathon.judges[currentJudgeIndex].username);
			hackathon.judges[currentJudgeIndex].projects.push(project);
			currentJudgeIndex += 1;

			if (currentJudgeIndex >= hackathon.judges.length)
				currentJudgeIndex = 0;
		}
	});
};

HackathonSchema.methods.scrapeDevpostFilters = function () {
	var deferred = Q.defer();
	var hackathon = this;

	var promises = [];
	hackathon.prizeFilters.forEach(function (prizeFilter) {
		promises.push(devpost.hackathon.projects.all(hackathon.serviceId, [prizeFilter]));
	});

	Q.all(promises)
	.then(
		function successCallback(data) {
			var Project = mongoose.model('Project');

			var morePromises = [];

			data.forEach(function (filteredProjects, index) {
				var projectSlugs = [];
				filteredProjects.forEach(function (project) {
					projectSlugs.push(project.slug);
				});
				morePromises.push((function () {
					var deferred = Q.defer();

					morePromises.push(Project.update(
						{ slug: { $in: projectSlugs } },
						{ $push: { prizeCategories: hackathon.prizeFilters[index].text } },
						{ multi: true },
						function (error, raw) {
							// console.log(hackathon.prizeFilters[index].paramValue);
							deferred.resolve();
						})
					);

					return deferred.promise;
				})());
				
			});

			// setInterval(function () {
			// 	console.log(morePromises);
			// }, 1000);

			Q.all(morePromises)
			.then(
				function successCallback(data) {
					var evenMorePromises = [];
					// data.forEach(function (projects, index) {
					// 	projects.forEach(function (project) {
					// 		project.prizeCategories.push(hackathon.prizeFilters[index].paramValue);
					// 		evenMorePromises.push(project.save());
					// 	});
					// });

					Q.all(evenMorePromises)
					.then(
						function successCallback(data) {
							// console.log(data);
							deferred.resolve(data);
						},
						function errorCallback(error) {
							deferred.reject(error);
						});
				},
				function errorCallback(error) {
					deferred.reject(error);
				});
		},
		function errorCallback(error) {
			deferred.reject(error);
		});

	return deferred.promise;
};

HackathonSchema.methods.scrapeDevpost = function () {
	var deferred = Q.defer();
	var hackathon = this;

	Q.all([
		devpost.hackathon.projects.all(hackathon.serviceId),
		devpost.hackathon.filters(hackathon.serviceId)])
	.then(
		function successCallback(data) {
			deferred.resolve(data);
		},
		function errorCallback(error) {
			deferred.reject(error);
		});

	return deferred.promise;
};

mongoose.model('Hackathon', HackathonSchema);