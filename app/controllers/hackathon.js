var express = require('express'),
	router = express.Router(),
	mongoose = require('mongoose'),
	Q = require('q'),
	Hackathon = mongoose.model('Hackathon');

module.exports = function (app) {
	app.use('/api/hackathon', router);
}
/*
 * No body elements
 */
var getAll = function (req, res) {
	Hackathon.find().populate('projects').exec(function (error, hackathons) {
		if (error)
			return res.send(error);
		else
			return res.json(hackathons);
	});
};

var getHackathon = function (req, res) {
	Hackathon.find({
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
 * serviceId: Devpost subdomain for the hackathon
 */
var postReset = function (req, res) {
	Hackathon.findOne({
		serviceId: req.body.serviceId
	}, function (error, hackathon) {
		if (error)
			return res.send(error);

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
				return { status: 'OK', projects: data };
			},
			function errorCallback(error) {
				return { status: 'FAIL', message: error };
			})
		.then(
			function (result) {
				if (result.status == 'OK') {
					var Project = mongoose.model('Project');
					var projectPromises = [];
					result.projects.forEach(function (element, index) {
						projectPromises.push(Project.scrapeDevpost(element.slug));
					});
					Q.all(projectPromises)
					.then(
						function successCallback(data) {
							console.log("hi");
							return data;
						},
						function errorCallback(error) {
							return res.json(error);
						})
					.then(
						function (filledProjects) {
							// Create mongoose documents
							Project.create(filledProjects).then(
								function (data) {
									// Assign them to the hackathon
									hackathon.projects = data;
									hackathon.save(function (error) {
										if (error)
											return res.send(error);

										return res.json(hackathon);
									});
								},
								function (error) {
									return res.send(error);
								});
					})
				}
				else {
					return res.json(result.message);
				}
			});
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
			return res.send(error);
		
		return res.json(hackathon);
	});
};

router.get('/all', getAll);
router.get('/h/:serviceId', getHackathon);
router.post('/create', postCreate);
router.post('/reset', postReset);
router.post('/open', postOpen);
router.post('/close', postClose);