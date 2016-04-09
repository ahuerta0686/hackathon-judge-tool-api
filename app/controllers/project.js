var express = require('express'),
    router = express.Router(),
    mongoose = require('mongoose'),
    Project = mongoose.model('Project');

module.exports = function (app) {
	app.use('/api/project', router);
}

// router.post('/create', )