var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	Q = require('q'),
	devpost = require('devpost-scraper');

var schemaOptions = {
    toObject: {
      virtuals: true
    }
    ,toJSON: {
      virtuals: true
    }
  };

var ProjectSchema = new Schema({
	title: { type: String, required: true },
	description: { type: String },
	imageUrl: { type: String },
	details: [ {
		heading: { type: String },
		text: { type: String }
	} ],
	tags: [ { type: String } ],
	imageUrls: [ { type: String } ],
	members: [ { 
		name: { type: String },
		avatarUrl: { type: String }
	} ],
	event: {
		name: { type: String },
		image_url: { type: String },
		serviceId: { type: String }
	},
	teamSize: { type: Number },
	slug: { type: String, unique: true },
	prizeCategories: [ { type: String } ],

	criteria: [ String ],
	pointMinimum: Number,
	pointMaximum: Number,
	judgements: [ {
		judge: { type: String },
		scores: [ {
			criteria: String,
			score: Number
		} ]
	} ]
}, schemaOptions);

ProjectSchema.virtual('compiledScore')
	.get(function () {
		var project = this;
		var overallScore = 0;
		var totalScores = 0;
		project.judgements.forEach(function (judgement) {
			project.criteria.forEach(function (criterion) {
				judgement.scores.forEach(function (score) {
					if (score.criteria == criterion) {
						overallScore += score.score;
						totalScores += 1;
					}
				})
			});
		});

		return overallScore / totalScores;
	});

ProjectSchema.statics.scrapeDevpost = function (projectSlug) {
	var deferred = Q.defer();

	devpost.project.findBySlug(projectSlug)
	.then(
		function successCallback(data) {
			deferred.resolve(data);
		},
		function errorCallback(error) {
			deferred.reject(error);
		});

	return deferred.promise;
};

mongoose.model('Project', ProjectSchema);