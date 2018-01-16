    var Server = require('mockserve').Server;

    describe('whatever', () => {

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
                done();
            });
        });
    });
