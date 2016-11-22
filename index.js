/* global __dirname */
var colors = require('colors');
var debug = require('debug')('mockserve:server');
var fs = require('fs');
var express = require('express');

var Mocks = require('./mocks').Mocks;

class Server {
    constructor() {
        this.connections = {};
        this.mocks = new Mocks(false);
        this.app = this.bootstrap(express());
    }

    bootstrap(app) {
        app.use((req, res, next) => {
            'use strict';
            var isJavaScript = /\.js$/.test(req.url);
            if (isJavaScript) {
                res.setHeader('Content-Type', 'text/javascript');
            } else {
                res.setHeader('Content-Type', 'application/json');
            }
            debug(`${req.method} ${req.url}`);
            var response = this.mocks.consume(req.url);
            if (!response) {

                debug('    ERROR: No mock exists for: ' + (req.method + ' ' + req.url).red);
                res.status(501).end(JSON.stringify({
                    message: 'No mock was found',
                    path: req.url
                }));
            } else {
                if (response.headers) {
                    for (var hKey in response.headers) {
                        res.setHeader(hKey, response.headers[hKey]);
                        debug('            with response header: %s=%s ', hKey, response.headers[hKey]);
                    }
                }

                res.status(response.status);

                if (response.content.startsWith && !response.content.startsWith('{')) {
                    res.setHeader('Content-Type', 'text/plain;charset=UTF-8');
                }

                if (isJavaScript) {
                    return res.end(response.content);
                } else {
                    var body = response.content;
                    debug(body);
                    res.end(body);
                }
            }

            next();
            //debug(req.url + ' -> ' + (body.length < 1024 ? body : 'Lång json-sträng'));
        });

        return app;
    }
    start() {
        return new Promise(resolve => {
            this.server = this.app.listen(process.env.MOCKPORT || 4129, () => {
                var host = this.server.address().address;
                var port = this.server.address().port;

                debug('MockServer listening at http://%s:%s', host, port);

                resolve();
            });

            this.server.on('connection', conn => {
                var key = conn.remoteAddress + ':' + conn.remotePort;
                debug(`Connection established with ${key}`)
                this.connections[key] = conn;
                conn.on('close', function() {
                    try {
                        delete this.connections[key];
                    } catch (e) {
                        //
                    }
                });
            });

            this.server.destroy = () => {
                debug('destroy');
                const clientClosed = [];
                for (var key in this.connections) {
                    debug('destroying client connection');
                    this.connections[key].destroy();
                }
                this.server.close();
                return Promise.resolve();
            };
        });
    }

    addMock(path, status, response, headers) {
        this.mocks.addMock(path, status, response, headers);
    }

    stop() {
        debug('stop');
        const unusedMocks = this.mocks.getUnusedMocks();

        debug('unused mocks: ' + unusedMocks.length);

        if (unusedMocks.length) {
            debug(unusedMocks);
        }

        return this.server.destroy();
    }
}

module.exports.Server = Server;
