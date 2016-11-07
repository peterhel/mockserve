let mockserve;
var request = require('request');
var chai = require('chai');
var expect = chai.expect;

beforeEach(() => {
	mockserve = require('../index.js')
});

afterEach(() => {
	mockserve.stop();
});

it('is plain', done => {
	mockserve.addMock('/plain', 200, 'I am plains texts.');
	request.get('http://localhost:4129/plain', (a, b, c) => {
		expect(b.headers['content-type']).to.equal('text/plain;charset=UTF-8');
		done()
	});
});

it('is json', done => {
	mockserve.addMock('/json', 200, JSON.stringify({
		"type": "json"
	}));
	request.get('http://localhost:4129/json', (a, b, c) => {
		expect(b.headers['content-type']).to.equal('application/json');
		JSON.parse(c)
		done()
	});
});

it('is json and added as an object', done => {
	mockserve.addMock('/json', 200, {
		"type": "json"
	});
	request.get('http://localhost:4129/json', (a, b, c) => {
		expect(b.headers['content-type']).to.equal('application/json');
		JSON.parse(c)
		done()
	});
});

it('can get implicit', done => {
	request.get('http://localhost:4129/implicit', (a, b, c) => {
		console.log(c)
		expect(b.headers['content-type']).to.equal('application/json');
		expect(JSON.parse(c).path).to.equal('/implicit');
		done()
	});
})
