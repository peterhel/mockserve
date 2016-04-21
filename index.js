/* global __dirname */
var colors = require('colors');
var debug = require('debug')('mockserve');
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
        debug('addMock -> %s, %s, %s', path, status, (headers && JSON.stringify(headers)) || '[]');
        self._mocks[rxp].push({
            status: status,
            content: response,
            headers: headers
        });
        debug(`        ${self._mocks[rxp].length} mocks total.`)
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

        for(let rxpl in self._mocks) {
            const rxp = rxpl.substr(1, rxpl.length -2);
            let apaj = new RegExp(rxp);
            let isMatch = apaj.test(`${path}`);
            debug(`Matching: ${apaj}.test('${path}') === ${isMatch}`);
            if (isMatch === true) {
                //debug(self._mocks[rxpl])
                if(self._mocks[rxpl].length === 0) {
                    throw new Error(`You've run out of mocks!`);
                }
                mock = self._mocks[rxpl].pop();
                debug(mock);
                if(!mock) {
                    throw new Error('Could not extract value from property.')
                }
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
                debug('    INFO: using implicit mock at: ' + filename.green);
                mock = {
                    status: 200,
                    content: content
                };
            } catch (e) {
                debug('    ' + e);
                debug('    ERROR: no implicit mock at: ' + filename.red);
            }
        }

        // Is false when run from the command line
        if (testSession) {
            // All responses must be mocked for each request
            //delete self._mocks[path];
            //debug('        delete self._mocks[%s]', path);
        }

        debug('returning mock'/*, mock*/);
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
    debug(`${req.method} ${req.url}`);
    var response = mocks.consume(req.url);
    if (!response) {

        debug('    ERROR: No mock exists for: ' + (req.method + ' ' + req.url).red);
        res.status(501).end(JSON.stringify({
            message: '    No mocked content for: ' + req.url
        }));
    } else {
        if (response.headers) {
            for (var hKey in response.headers) {
                res.setHeader(hKey, response.headers[hKey]);
                debug('            with response header: %s=%s ', hKey, response.headers[hKey]);
            }
        }
        res.status(response.status);

        if (isJavaScript) {
            return res.end(response.content);
        } else {
            var body = JSON.stringify(response.content);
            debug(body);
            res.end(body);
        }
    }

    next();
    //debug(req.url + ' -> ' + (body.length < 1024 ? body : 'Lång json-sträng'));
});

var server = null;

function startServer() {
    'use strict';
    server = app.listen(process.env.PORT || 4129, function() {
        var host = server.address().address;
        var port = server.address().port;

        debug('Example app listening at http://%s:%s', host, port);
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

    debug('unused mocks: ' + unusedMocks.length);

    if (unusedMocks.length) {
        debug(unusedMocks);
    }

    server.close();
    server = null;
};

module.exports.addMock = function(path, status, response, headers) {
    'use strict';
    mocks.addMock(path, status, response, headers);
};
