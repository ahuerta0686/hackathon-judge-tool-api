var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var ProjectSchema = new Schema({
	title: { type: String, required: true },
	description: { type: String },
	imageUrl: { type: String },
	teamSize: { type: Number },
	serviceId: String,
	criteria: [ String ],
	pointMinimum: Number,
	pointMaximum: Number,
	pointValues: [ Number ]
});

mongoose.model('Project', ProjectSchema);