var request = require('request');
var chai = require('chai');
var expect = chai.expect;
var Server = require('../index.js').Server;

describe('tests', () => {
    let mockserve;

    beforeEach(done => {
        mockserve = new Server();
        mockserve.start().then(done);
    });

    afterEach(done => {
        mockserve.stop().then(() => done());
    });

    it('is plain', done => {
        mockserve.addMock('/plain', 200, 'I am plains texts.');
        request.get('http://localhost:4129/plain', (a, b, c) => {
            expect(b.headers['content-type']).to.equal('text/plain;charset=UTF-8');
            done()
        });
    });

    it('is kept', done => {
        mockserve.addMock('/plain', 200, 'I am plains texts.', {}, true);
        request.get('http://localhost:4129/plain', (a, b, c) => {
            request.get('http://localhost:4129/plain', (a, b, c) => {
                expect(b.headers['content-type']).to.equal('text/plain;charset=UTF-8');
                done()
            });
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
});
