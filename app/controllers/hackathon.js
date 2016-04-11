var express = require('express'),
	router = express.Router(),
	Q = require('q'),
	SparkPost = require('sparkpost'),
	sp = new SparkPost('REMOVED'),
	mongoose = require('mongoose'),
	Hackathon = mongoose.model('Hackathon');

module.exports = function (app) {
	app.use('/api/hackathon', router);
}
/*
 * No body elements
 */
var getAll = function (req, res) {
	Hackathon.find()
	.populate('projects')
	.exec(function (error, hackathons) {
		if (error)
			return res.send(error);
		else
			return res.json(hackathons);
	});
};

/*
 * serviceId: Devpost subdomain for the hackathon
 */
var getHackathon = function (req, res) {
	Hackathon.findOne({
		serviceId: req.params.serviceId
	})
	.populate('projects')
	.exec(function (error, hackathon) {
		if (error)
			return res.send(error);

		return res.json(hackathon);
	});
};

/*
 * name: Name of the hackathon
 * service: Project service being used by the hackathon
 * serviceId: Devpost subdomain for the hackathon
 */
var postCreate = function (req, res) {
	var hackathon = new Hackathon(req.body);

	hackathon.save(function (error) {
		if (error)
			return res.status(500).send(error);
		
		return res.json(hackathon);
	});
};

/* 
 * serviceId: Devpost subdomain for the hackathon
 * username: Login name the judge will use
 * email: Email they use to receive notifications
 */
var putJudge = function (req, res) {
	Hackathon.findOne({
		serviceId: req.body.serviceId
	}, function (error, hackathon) {
		if (error)
			return res.status(500).send(error);

		hackathon.judges.push({
			username: req.body.username,
			email: req.body.email
		});

		hackathon.save(function (error, hackathon) {
			if (error)
				return res.status(500).send(error);

			return res.json(hackathon);
		});
	});
};

/*
 * serviceId: Devpost subdomain for the hackathon
 * criteria: JSON array of judging criteria
 */
var postCriteria = function (req, res) {
	Hackathon.findOne({
		serviceId: req.body.serviceId
	}, function (error, hackathon) {
		if (error)
			return res.status(500).send(error);

		try {
			hackathon.criteria = JSON.parse(req.body.criteria);
		} catch (e) {
			console.log(e);
			return res.status(400).json({ error: "Not JSON!" });
		}

		hackathon.save(function (error, hackathon) {
			if (error)
				return res.status(500).send(error);

			return res.json(hackathon);
		});
	});
};

/*
 * serviceId: Devpost subdomain for the hackathon
 */
var postReset = function (req, res) {
	Hackathon.findOne({
		serviceId: req.body.serviceId
	}, function (error, hackathon) {
		if (error)
			return res.status(500).send(error);

		var Project = mongoose.model('Project');
		Q(Project.find( { _id: { $in: hackathon.projects } } ).remove().exec())
		.then(
			function () {
				delete hackathon.projects;

				hackathon.status = "preevent";
				hackathon.save(function (error) {
					if (error)
						return res.send(error);

					return res.json(hackathon);
				});
			},
			function (error) {
				return res.json(error);
			});
	});
};

/*
 * serviceId: Devpost subdomain for the hackathon
 */
var postOpen = function (req, res) {
	Hackathon.findOne({
		serviceId: req.body.serviceId
	}, function (error, hackathon) {
		if (error)
			return res.send(error);

		hackathon.status = "open";
		hackathon.save(function (error) {
			if (error)
				return res.send(error);

			return res.json(hackathon);
		});
	});
};

/*
 * serviceId: Devpost subdomain for the hackathon
 * PLS IGNORE THE MESS
 */
var postClose = function (req, res) {
	Hackathon.findOne({
		serviceId: req.body.serviceId
	}, function (error, hackathon) {
		if (error)
			return res.send(error);

		hackathon.status = "closed";

		// Do scraping now
		hackathon.scrapeDevpost()
		.then(
			function successCallback(data) {
				var unfilledProjects = data[0],
					filters = data[1];

				hackathon.prizeFilters = filters;

				var Project = mongoose.model('Project');
				var projectPromises = [];
				unfilledProjects.forEach(function (project, index) {
					projectPromises.push(Project.scrapeDevpost(project.slug));
				});
				Q.all(projectPromises)
				.then(
					function successCallback(filledProjects) {
						filledProjects.forEach(function (project, index) {
							project.criteria = hackathon.criteria;
							project.pointMinimum = hackathon.pointMinimum;
							project.pointMaximum = hackathon.pointMaximum;

							project.imageUrl = unfilledProjects[index].imageUrl;
						});

						// Create mongoose documents
						Project.create(filledProjects).then(
							function successCallback(data) {
								// Scrape to give projects prize categories
								hackathon.scrapeDevpostFilters()
								.then(
									function successCallback() {
										// Assign them to the hackathon
										hackathon.projects = data;
										hackathon.save(function (error) {
											if (error)
												return res.status(500).send(error);

											hackathon.assignProjects(2);

											var emailRecipients = [];
											hackathon.judges.forEach(function (judge) {
												emailRecipients.push({
													address: judge.email
												});
											});

											sp.transmissions.send({
												transmissionBody: {
													content: {
														from: 'testing@sparkpostbox.com',
														subject: hackathon.name + ': Time to Judge!',
														html: '<html><body><h2>You have been assigned to judge projects at ' + hackathon.name + '!</h2></body></html>'
													},
													recipients: emailRecipients
												}
											}, function (error) {
												if (error)
													console.log(error);

												return res.json(hackathon);
											});
											
										});
									},
									function errorCallback(error) {
										return res.status(400).send(error);
									});
							},
							function errorCallback(error) {
								return res.send(error);
							});
					},
					function errorCallback(error) {
						return res.status(400).json(error);
					});
			},
			function errorCallback(error) {
				return res.status(400).json(result.message);
			});
	});
};

// Middleware
var isPreEvent = function (req, res, next) {
	Hackathon.findOne({
		serviceId: req.body.serviceId
	}, function (error, hackathon) {
		if (error)
			return res.send(error);

		if (hackathon.status == "preevent")
			return next();
		else
			return res.status(400).json({
				error: "Invalid status"
			});
	});
};

var isOpen = function (req, res, next) {
	Hackathon.findOne({
		serviceId: req.body.serviceId
	}, function (error, hackathon) {
		if (error)
			return res.send(error);

		if (hackathon.status == "open")
			return next();
		else
			return res.status(400).json({
				error: "Invalid status"
			});
	});
};

var hasCriteria = function (req, res, next) {
	Hackathon.findOne({
		serviceId: req.body.serviceId
	}, function (error, hackathon) {
		if (error)
			return res.status(500).send(error);

		if (Array.isArray(hackathon.criteria) && hackathon.criteria.length > 0)
			return next();
		else
			return res.status(400).send({ error: "Criteria must be set first" });
	});
}

var cors = function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
}

router.get('/all', cors, getAll);
router.get('/h/all', cors, getAll);
router.get('/h/:serviceId', cors, getHackathon);
router.post('/create', cors, postCreate);

router.put('/judge', cors, putJudge);

router.post('/criteria', cors, postCriteria);
router.post('/reset', cors, postReset);
router.post('/open', cors, isPreEvent, postOpen);
router.post('/close', cors, hasCriteria, postClose);
