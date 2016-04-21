/* global __dirname */
var colors = require('colors');
var fs = require('fs');
var _path = require('path');
var Mocks = function(testSession) {
    'use strict';
    var self = this;
    this._mocks = {};

    this.addMock = function(path, status, response, headers) {
        const rxp = new RegExp(path).toString();
        if (!self._mocks[rxp]) {
            self._mocks[rxp] = [];
        }
        console.log('    addMock -> %s, %s, %s', path, status, (headers && JSON.stringify(headers)) || '[]');
        self._mocks[rxp].push({
            status: status,
            content: response,
            headers: headers
        });
        console.log(`        ${self._mocks[rxp].length} mocks total.`)
    };

    this.getUnusedMocks = function() {
        var unused = [];

        Object.keys(self._mocks).forEach(function(mockPath) {
            // if there are still mocks unused for this path
            if (self._mocks[mockPath].length) {
                unused.push(mockPath);
            }
        });
        return unused;
    };

    this.consume = function(path) {
        let mock;
        console.log('    consume -> %s', path);

        for(let rxpl in self._mocks) {
            const rxp = rxpl.substr(1, rxpl.length -2);
        //Object.keys(self._mocks).forEach(function(rxp) {
            let apaj = new RegExp(rxp);
            let isMatch = apaj.test(`${path}`);
            console.log(`        -> ${apaj}.test('${path}') === ${isMatch}`);
            if (isMatch === true) {
                mock = self._mocks[rxpl].shift();
                break;
            }
        }

        if (!mock) {
            //no explicit mock. check for implicit mock.
            var filename = _path.resolve(process.cwd(), 'mocks') + path.toLowerCase().replace(/[?&=:]/g, '-').replace('//', '/') + '.json';

            try {
                var contentString = fs.readFileSync(filename, {
                    encoding: 'utf-8'
                });
                var content = JSON.parse(contentString);
                console.log('    INFO: using implicit mock at: ' + filename.green);
                mock = {
                    status: 200,
                    content: content
                };
            } catch (e) {
                console.log('    ' + e);
                console.log('    ERROR: no implicit mock at: ' + filename.red);
            }
        }

        // Is false when run from the command line
        if (testSession) {
            // All responses must be mocked for each request
            //delete self._mocks[path];
            //console.log('        delete self._mocks[%s]', path);
        }

        console.log('        return mock data' /*, mock*/ );
        return mock;
    };
};

var mocks = new Mocks(false);

var express = require('express');
var app = express();
app.use(function(req, res, next) {
    'use strict';
    var isJavaScript = /\.js$/.test(req.url);
    if (isJavaScript) {
        res.setHeader('Content-Type', 'text/javascript');
    } else {
        res.setHeader('Content-Type', 'application/json');
    }
    console.log('MOCK-SERVER incoming: ', req.method, req.url);
    var response = mocks.consume(req.url);
    if (!response) {

        console.log('    ERROR: No mock exists for: ' + (req.method + ' ' + req.url).red);
        res.status(501).end(JSON.stringify({
            message: '    No mocked content for: ' + req.url
        }));
    } else {
        if (response.headers) {
            for (var hKey in response.headers) {
                res.setHeader(hKey, response.headers[hKey]);
                console.log('            with response header: %s=%s ', hKey, response.headers[hKey]);
            }
        }
        res.status(response.status);

        if (isJavaScript) {
            return res.end(response.content);
        } else {
            var body = JSON.stringify(response.content);
            res.end(body);
        }
    }

    next();
    //console.log(req.url + ' -> ' + (body.length < 1024 ? body : 'Lång json-sträng'));
});

var server = null;

function startServer() {
    'use strict';
    server = app.listen(process.env.PORT || 4129, function() {
        var host = server.address().address;
        var port = server.address().port;

        console.log('Example app listening at http://%s:%s', host, port);
    });
}

startServer();

module.exports.mocks = mocks;

module.exports.start = function() {
    'use strict';
    if (server === null) {
        startServer();
    }
    mocks = new Mocks(true);
};

module.exports.stop = function() {
    'use strict';
    var unusedMocks = mocks.getUnusedMocks();

    console.log('unused mocks: ' + unusedMocks.length);

    if (unusedMocks.length) {
        console.log(unusedMocks);
    }

    server.close();
    server = null;
};

module.exports.addMock = function(path, status, response, headers) {
    'use strict';
    mocks.addMock(path, status, response, headers);
};
