var express = require('express'),
    router = express.Router(),
    mongoose = require('mongoose'),
    Project = mongoose.model('Project');

module.exports = function (app) {
	app.use('/api/project', router);
}



/*
 * slug: Devpost URL slug for project
 */
var getProject = function (req, res) {
	Project.findOne({
		slug: req.params.slug
	}, function (error, project) {
		if (error)
			return res.send(error);

		return res.json(project);
	});
};

/*
 * slug: Devpost URL slug for a project
 */
var getProjectCriteria = function (req, res) {
	Project.findOne({
		slug: req.params.slug
	}, function (error, project) {
		if (error)
			return res.send(error);

		return res.json(project.criteria);
	});
};

/*
 * slug: Devpost URL slug for project
 * judgement: JSON object with judge username as key, and array of criteria / value as key / value
 */
var postJudge = function (req, res) {
	Project.findOne({
		slug: req.body.slug
	}, function (error, project) {
		if (error)
			return res.status(500).send(error);

		// If judged before remove it
		project.judgements.forEach(function (judgement, index) {
			if (judgement.judge == req.body.username) {
				project.judgements.splice(index, 1);
			}
		});

		try {
			project.judgements.push({
				judge: req.body.username,
				scores: JSON.parse(req.body.judgement)
			});
		} catch (e) {
			return res.status(500).json({ error: "Not JSON" });
		}

		project.save(function (error, project) {
			if (error)
				return res.status(500).send(error);

			return res.json(project);
		});
	});
};

// Middleware
var canJudge = function (req, res, next) {
	Project.findOne({
		slug: req.body.slug
	}, function (error, project) {
		if (error)
			return res.status(500).send(error);

		var Hackathon = mongoose.model('Hackathon');
		Hackathon.findOne({
			serviceId: project.event.serviceId
		}, function (error, hackathon) {
			if (error)
				return res.status(500).send(error);

			if (hackathon.status == "closed")
				return next();
			else
				return res.status(400).json({ error: "Hackathon not closed" });
		});
	});
};

var cors = function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
};

router.get('/p/:slug', cors, getProject);
router.get('/p/:slug/criteria', cors, getProjectCriteria);
router.post('/judge', cors, canJudge, postJudge);