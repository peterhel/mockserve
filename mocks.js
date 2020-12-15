const debug = require('debug')('mockserve:mocks');
const _path = require('path');
const fs = require('fs');

var Mocks = function(testSession) {
    'use strict';
    var self = this;
    this._mocks = {};

    this.addMock = function(path, status, response, headers, keep) {
        const content = typeof(response) === 'object' ? JSON.stringify(response) : response;
        const rxp = new RegExp(path).toString();
        if (!self._mocks[rxp]) {
            self._mocks[rxp] = [];
        }
        debug('addMock -> %s, %s, %s', path, status, (headers && JSON.stringify(headers)) || '[]');
        self._mocks[rxp].push({
            status,
            content,
            headers,
            keep
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

    this.clean = function() {
        this._mocks = {};
    };

    this.consume = function(path) {
        let mock;

        for (let rxpl in self._mocks) {
            const rxp = rxpl.substr(1, rxpl.length - 2);
            let apaj = new RegExp(rxp);
            let isMatch = apaj.test(`${path}`);
            debug(`Matching: ${apaj}.test('${path}') === ${isMatch}`);
            if (isMatch === true) {
                //debug(self._mocks[rxpl])
                if (self._mocks[rxpl].length === 0) {
                    throw new Error(`You've run out of mocks!`);
                }
                mock = self._mocks[rxpl].pop();
                console.log(mock)
                if (mock.keep === true) {
                    self._mocks[rxpl].push(mock);
                }
                debug(mock);
                if (!mock) {
                    throw new Error('Could not extract value from property.')
                }
                break;
            }
        }

        if (!mock) {
            //no explicit mock. check for implicit mock.
            var body_filename = _path.resolve(process.cwd(), 'mocks') + path.toLowerCase().replace(/[?&=:]/g, '-').replace('//', '/') + '.body.json';
            var headers_filename = _path.resolve(process.cwd(), 'mocks') + path.toLowerCase().replace(/[?&=:]/g, '-').replace('//', '/') + '.headers.json';

            try {
                let content;
                let headers;
                if(!fs.existsSync(body_filename)) {
                    debug('    ERROR: no content at: ' + body_filename.yellow);
                } else {
                    debug('    INFO: using content from: ' + body_filename.green);
                    content = fs.readFileSync(body_filename, {
                        encoding: 'utf-8'
                    });
                }
                if(!fs.existsSync(headers_filename)) {
                    debug('    ERROR: no headers at: ' + headers_filename.yellow);
                } else {
                    debug('    INFO: using headers from: ' + headers_filename.green);
                    let strHeaders = fs.readFileSync(headers_filename, {
                        encoding: 'utf-8'
                    });
                    headers = JSON.parse(strHeaders)
                }

                mock = {
                    status: 200,
                    content,
                    headers
                };
            } catch (e) {
                console.error(e)
                debug('    ' + e);
            }
        }

        // Is false when run from the command line
        if (testSession) {
            // All responses must be mocked for each request
            //delete self._mocks[path];
            //debug('        delete self._mocks[%s]', path);
        }

        debug('returning mock' /*, mock*/ );
        return mock;
    };
};

module.exports.Mocks = Mocks;
