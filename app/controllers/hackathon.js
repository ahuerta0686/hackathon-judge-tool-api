var express = require('express'),
	router = express.Router(),
	mongoose = require('mongoose'),
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

/*
 * serviceId: Devpost subdomain for the hackathon
 */
var postOpen = function (req, res) {
	Hackathon.find({
		serviceId: req.body.serviceId
	}, function (error, hackathon) {
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

		console.log(hackathon);

		hackathon.status = "closed";

		// Do scraping now
		hackathon.scrapeDevpost(save);

		function save() {
			hackathon.save(function (error) {
				if (error)
					return res.send(error);

				return res.json(hackathon);
			});
		}
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
router.post('/create', postCreate);
router.post('/close', postClose);