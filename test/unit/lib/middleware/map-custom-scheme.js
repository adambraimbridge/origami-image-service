'use strict';

const assert = require('proclaim');
const mockery = require('mockery');
const sinon = require('sinon');

describe('lib/middleware/map-custom-scheme', () => {
	let clock;
	let currentWeekNumber;
	let express;
	let ImageTransform;
	let mapCustomScheme;

	beforeEach(() => {

		express = require('../../mock/n-express.mock');

		ImageTransform = {
			resolveCustomSchemeUri: sinon.stub()
		};
		mockery.registerMock('../image-transform', ImageTransform);

		currentWeekNumber = sinon.stub().returns(1);
		mockery.registerMock('current-week-number', currentWeekNumber);

		clock = sinon.useFakeTimers();

		mapCustomScheme = require('../../../../lib/middleware/map-custom-scheme');
	});

	afterEach(() => {
		clock.restore();
	});

	it('exports a function', () => {
		assert.isFunction(mapCustomScheme);
	});

	describe('mapCustomScheme(config)', () => {
		let config;
		let middleware;

		beforeEach(() => {
			config = {
				customSchemeStore: 'mock-store',
				customSchemeCacheBust: 'mock-bust'
			};
			middleware = mapCustomScheme(config);
		});

		it('returns a middleware function', () => {
			assert.isFunction(middleware);
		});

		describe('middleware(request, response, next)', () => {
			let next;

			beforeEach(() => {
				next = sinon.spy();
				express.mockRequest.params.imageUrl = 'foo:bar';
				ImageTransform.resolveCustomSchemeUri.returns('http://mock-store/foo/bar.svg');
				middleware(express.mockRequest, express.mockResponse, next);
			});

			it('calls `ImageTransform.resolveCustomSchemeUri` with the `imageUrl` request param, the configured base URL, and a cache-buster', () => {
				assert.calledOnce(ImageTransform.resolveCustomSchemeUri);
				assert.calledWithExactly(ImageTransform.resolveCustomSchemeUri, 'foo:bar', 'mock-store', '1970-W1-1+mock-bust');
			});

			it('sets the `imageUrl` request param to the returned URL', () => {
				assert.strictEqual(express.mockRequest.params.imageUrl, ImageTransform.resolveCustomSchemeUri.firstCall.returnValue);
			});

			it('sets the `format` query parameter to the resolved URLs file extension', () => {
				assert.strictEqual(express.mockRequest.query.format, 'svg');
			});

			it('calls `next` with no error', () => {
				assert.calledOnce(next);
				assert.calledWithExactly(next);
			});

			describe('when `ImageTransform.resolveCustomSchemeUri` returns the original URL untouched', () => {

				beforeEach(() => {
					next.reset();
					express.mockRequest.params.imageUrl = 'foo:bar';
					delete express.mockRequest.query.format;
					ImageTransform.resolveCustomSchemeUri.returns(express.mockRequest.params.imageUrl);
					middleware(express.mockRequest, express.mockResponse, next);
				});

				it('does not change the `imageUrl` request param', () => {
					assert.strictEqual(express.mockRequest.params.imageUrl, 'foo:bar');
				});

				it('does not change the `format` query parameter', () => {
					assert.isUndefined(express.mockRequest.query.format);
				});

				it('calls `next` with no error', () => {
					assert.calledOnce(next);
					assert.calledWithExactly(next);
				});

			});

			describe('when the `format` query parameter is already set', () => {

				beforeEach(() => {
					next.reset();
					express.mockRequest.params.imageUrl = 'foo:bar';
					express.mockRequest.query.format = 'foo';
					middleware(express.mockRequest, express.mockResponse, next);
				});

				it('does not change the `format` query parameter', () => {
					assert.strictEqual(express.mockRequest.query.format, 'foo');
				});

				it('calls `next` with no error', () => {
					assert.calledOnce(next);
					assert.calledWithExactly(next);
				});

			});

			describe('when the resolved URL does not have a valid extension', () => {

				beforeEach(() => {
					next.reset();
					express.mockRequest.params.imageUrl = 'foo:bar';
					delete express.mockRequest.query.format;
					ImageTransform.resolveCustomSchemeUri.returns('http://mock-store/foo/bar.img');
					middleware(express.mockRequest, express.mockResponse, next);
				});

				it('does not set the `format` query parameter', () => {
					assert.isUndefined(express.mockRequest.query.format);
				});

				it('calls `next` with no error', () => {
					assert.calledOnce(next);
					assert.calledWithExactly(next);
				});

			});

			describe('when the resolved URL has a querystring', () => {

				beforeEach(() => {
					next.reset();
					express.mockRequest.params.imageUrl = 'foo:bar';
					delete express.mockRequest.query.format;
					ImageTransform.resolveCustomSchemeUri.returns('http://mock-store/foo/bar.svg?foo=bar');
					middleware(express.mockRequest, express.mockResponse, next);
				});

				it('sets the `imageUrl` request param to the returned URL', () => {
					assert.strictEqual(express.mockRequest.params.imageUrl, 'http://mock-store/foo/bar.svg?foo=bar');
				});

				it('sets the `format` query parameter to the resolved URLs file extension', () => {
					assert.strictEqual(express.mockRequest.query.format, 'svg');
				});

				it('calls `next` with no error', () => {
					assert.calledOnce(next);
					assert.calledWithExactly(next);
				});

			});

			describe('when `ImageTransform.resolveCustomSchemeUri` throws', () => {
				let resolutionError;

				beforeEach(() => {
					next.reset();
					resolutionError = new Error('resolution error');
					ImageTransform.resolveCustomSchemeUri.throws(resolutionError);
					middleware(express.mockRequest, express.mockResponse, next);
				});

				it('sets the error status to 400', () => {
					assert.strictEqual(resolutionError.status, 400);
				});

				it('calls `next` with the error', () => {
					assert.calledOnce(next);
					assert.calledWithExactly(next, resolutionError);
				});

			});

		});

	});

});
