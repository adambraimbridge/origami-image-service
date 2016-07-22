'use strict';

const ImageTransform = require('../image-transform');
const imgixTransform = require('../transformers/imgix');
const cloudinaryTransform = require('../transformers/cloudinary');
const httpError = require('http-errors');

module.exports = processImage;

function processImage(config) {
	return (request, response, next) => {
		let transform;

		// Add the URI from the path to the query so we can
		// pass it into the transform as one object
		request.query.uri = request.params[0];

		// Create an image transform based on the query. This
		// includes some validation
		try {
			transform = new ImageTransform(request.query);
		} catch (error) {
			error.status = 400;
			return next(error);
		}
		if (!request.query.source) {
			return next(httpError(400, 'The source parameter is required'));
		}

		// Switch on the `transformer` query parameter, and
		// build an applied transform based on the specified
		// third-party image service
		let appliedTransform;
		switch (request.query.transformer) {
			case 'imgix':
				appliedTransform = imgixTransform(transform, {
					imgixSecureUrlToken: config.imgixSecureUrlToken,
					imgixSourceName: config.imgixSourceName
				});
				break;
			default:
				appliedTransform = cloudinaryTransform(transform, {
					cloudinaryAccountName: config.cloudinaryAccountName
				});
				break;
		}

		// Store the transform and applied transform for
		// use in later middleware
		request.transform = transform;
		request.appliedTransform = appliedTransform;
		next();
	};
}