var mockserve = require('../index.js')
var request = require('request');
var chai = require('chai');
var expect = chai.expect;


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
})
