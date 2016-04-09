var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	devpost = require('devpost-scraper');

var HackathonSchema = new Schema({
	name: { type: String, required: true },
	service: { type: String, default: 'devpost' },
	serviceId: { type: String, required: true, unique: true },
	projects: [{ type: Schema.ObjectId, ref: 'Project' }],
	status: { type: String, default: 'preevent' }
});

HackathonSchema.methods.scrapeDevpost = function (callback) {
	var hackathon = this;
	var Project = mongoose.model('Project');

	devpost.submissions(hackathon.serviceId, 0, null, function (projects) {
		// hackathon.projects = data;
		hackathon.projects = [];
		projects.forEach(function (project) {
			var hackathonProject = new Project(project);
			hackathonProject.save(function (error, project) {
				hackathon.projects.push(hackathonProject);
			});
			
		});

		callback();
	});
};

mongoose.model('Hackathon', HackathonSchema);