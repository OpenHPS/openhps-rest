import 'mocha';
import { expect } from 'chai';
import express = require('express');
import * as http from 'http';
import { RESTServerSink } from '../../src';
import { Model, ModelBuilder } from '@openhps/core';

const PORT = 1556;
const PATH = '/api/v1';

function request(method: 'get' | 'post', body: any, callback: (statusCode: number, data: any) => void): void {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const req = http.request(
        {
            host: 'localhost',
            port: PORT,
            path: PATH,
            method: method.toUpperCase(),
            headers:
                payload === undefined
                    ? {}
                    : {
                          'Content-Type': 'application/json',
                          'Content-Length': Buffer.byteLength(payload),
                      },
        },
        (res) => {
            let raw = '';
            res.on('data', (chunk: string) => {
                raw += chunk;
            });
            res.on('end', () => {
                let data: any = null;
                try {
                    data = JSON.parse(raw);
                } catch {
                    data = raw;
                }
                callback(res.statusCode, data);
            });
        },
    );
    if (payload !== undefined) {
        req.write(payload);
    }
    req.end();
}

describe('node server', () => {
    describe('security', () => {
        let serverModel: Model;
        let app: express.Express;
        let server: http.Server;

        before((done) => {
            app = express();
            app.use(express.json());
            server = app.listen(PORT, () => {
                ModelBuilder.create()
                    .from()
                    .to(
                        new RESTServerSink({
                            express: app,
                            path: PATH,
                        }),
                    )
                    .build()
                    .then((model) => {
                        serverModel = model;
                        done();
                    })
                    .catch(done);
            });
        });

        after(() => {
            serverModel.emitAsync('destroy');
            server.close();
        });

        it('should reject a frame with a Function type marker', (done) => {
            request(
                'post',
                {
                    frame: {
                        function: 'globalThis.__openhpsRestRceCanary = true',
                        __type: 'Function',
                    },
                },
                (statusCode) => {
                    expect(statusCode).to.equal(400);
                    expect((globalThis as any).__openhpsRestRceCanary).to.be.undefined;
                    done();
                },
            );
        });

        it('should reject a frame with a nested Object type marker', (done) => {
            request(
                'post',
                {
                    frame: {
                        nested: {
                            __type: 'Object',
                            callback: {
                                function: 'globalThis.__openhpsRestRceCanary = true',
                                __type: 'Function',
                            },
                        },
                    },
                },
                (statusCode) => {
                    expect(statusCode).to.equal(400);
                    expect((globalThis as any).__openhpsRestRceCanary).to.be.undefined;
                    done();
                },
            );
        });

        it('should reject a request without a frame', (done) => {
            request('post', {}, (statusCode) => {
                expect(statusCode).to.equal(400);
                done();
            });
        });
    });

    describe('route cleanup', () => {
        let serverModel: Model;
        let app: express.Express;
        let server: http.Server;

        before((done) => {
            app = express();
            app.use(express.json());
            server = app.listen(PORT, () => {
                ModelBuilder.create()
                    .from()
                    .to(
                        new RESTServerSink({
                            express: app,
                            path: PATH,
                        }),
                    )
                    .build()
                    .then((model) => {
                        serverModel = model;
                        done();
                    })
                    .catch(done);
            });
        });

        after(() => {
            server.close();
        });

        it('should unregister the routes when the node is destroyed', (done) => {
            request('get', undefined, (statusCodeBefore) => {
                expect(statusCodeBefore).to.equal(200);
                serverModel
                    .emitAsync('destroy')
                    .then(() => {
                        request('get', undefined, (statusCodeAfter) => {
                            expect(statusCodeAfter).to.equal(404);
                            request('post', { frame: {} }, (postStatusCode) => {
                                expect(postStatusCode).to.equal(404);
                                done();
                            });
                        });
                    })
                    .catch(done);
            });
        });
    });
});
