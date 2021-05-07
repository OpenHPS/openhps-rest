import 'mocha';
import { expect } from 'chai';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as http from 'http';
import {
    ModelBuilder, CallbackSinkNode, DataFrame, Model, DataObject, CallbackSourceNode
} from '@openhps/core';
import {
    RESTServerSource, RESTClientSink, RESTServerSink, RESTClientSource
} from '../../src';

describe('node source', () => {
    describe('server', () => {
        let serverModel: Model;
        let clientModel: Model;
        let callbackSink: CallbackSinkNode<DataFrame>;
        let app: express.Express;
        let server: http.Server;

        before((done) => {
            callbackSink = new CallbackSinkNode();
            // Create HTTP server
            app = express();
            app.use(bodyParser.json());
            server = app.listen(1555, () => {
                ModelBuilder.create()
                    .from(new RESTServerSource({
                        express: app,
                        path: '/api/v1'
                    }))
                    .to(callbackSink)
                    .build().then(model => {
                        serverModel = model;
                        return ModelBuilder.create()
                            .from()
                            .to(new RESTClientSink({
                                url: 'http://localhost:1555/api/v1',
                            }))
                            .build();
                    }).then(model => {
                        clientModel = model;
                        done();
                    }).catch(done);
            });
        });

        after(() => {
            serverModel.emit('destroy');
            clientModel.emit('destroy');
            server.close();
        });

        it('should push data from client to server', (done) => {
            callbackSink.callback = (frame: DataFrame) => {
                expect(frame.source).to.not.be.undefined;
                expect(frame.source.uid).to.equal("Maxim");
                done();
            };

            Promise.resolve(clientModel.push(new DataFrame(new DataObject("Maxim"))));
        });
    });

    describe('client', () => {
        let serverModel: Model;
        let clientModel: Model;
        let callbackSink: CallbackSinkNode<DataFrame>;
        let app: express.Express;
        let server: http.Server;

        before((done) => {
            callbackSink = new CallbackSinkNode();
            // Create HTTP server
            app = express();
            app.use(bodyParser.json());
            server = app.listen(1555, () => {
                ModelBuilder.create()
                    .from(new CallbackSourceNode(() => {
                        return new DataFrame(new DataObject("Maxim"));
                    }))
                    .to(new RESTServerSink({
                        express: app,
                        path: '/api/v1',
                        pullTimeout: 1
                    }))
                    .build().then(model => {
                        serverModel = model;
                        return ModelBuilder.create()
                            .from(new RESTClientSource({
                                url: 'http://localhost:1555/api/v1',
                            }))
                            .to(callbackSink)
                            .build();
                    }).then(model => {
                        clientModel = model;
                        done();
                    }).catch(done);
            });
        });

        after(() => {
            serverModel.emit('destroy');
            clientModel.emit('destroy');
            server.close();
        });

        it('should pull data from client to server', (done) => {
            callbackSink.callback = (frame: DataFrame) => {
                expect(frame.source).to.not.be.undefined;
                expect(frame.source.uid).to.equal("Maxim");
                done();
            };

            Promise.resolve(clientModel.pull());
        });
    });

    describe('middleware', () => {
        let serverModel: Model;
        let clientModel: Model;
        let callbackSink: CallbackSinkNode<DataFrame>;
        let app: express.Express;
        let server: http.Server;

        before((done) => {
            callbackSink = new CallbackSinkNode();
            // Create HTTP server
            app = express();
            app.use(bodyParser.json());
            server = app.listen(1555, () => {
                ModelBuilder.create()
                    .from(new CallbackSourceNode(() => {
                        return new DataFrame(new DataObject("Maxim"));
                    }))
                    .to(new RESTServerSink({
                        express: app,
                        path: '/api/v1',
                        pullTimeout: 1,
                        middleware: [(req, res, next) => {
                            if (req.body.token === "abc") {
                                next();
                            } else {
                                next(new Error('Unauthorized!'));
                            }
                        }]
                    }))
                    .build().then(model => {
                        serverModel = model;
                        return ModelBuilder.create()
                            .from(new RESTClientSource({
                                url: 'http://localhost:1555/api/v1',
                                config: {
                                    data: {
                                        token: "abc"
                                    }
                                }
                            }))
                            .to(callbackSink)
                            .build();
                    }).then(model => {
                        clientModel = model;
                        done();
                    }).catch(done);
            });
        });

        after(() => {
            serverModel.emit('destroy');
            clientModel.emit('destroy');
            server.close();
        });

        it('should support authentication', (done) => {
            callbackSink.callback = (frame: DataFrame) => {
                expect(frame.source).to.not.be.undefined;
                expect(frame.source.uid).to.equal("Maxim");
                done();
            };

            Promise.resolve(clientModel.pull());
        });
    });
});
