var express = require('express'),
    router = express.Router(),
    mongoose = require('mongoose'),
    Project = mongoose.model('Project');

module.exports = function (app) {
	app.use('/api/project', router);
}

var getProject = function (req, res) {
	Project.findOne({
		slug: req.params.slug
	}, function (error, project) {
		if (error)
			return res.send(error);

		return res.json(project);
	});
};

router.get('/p/:slug', getProject);
