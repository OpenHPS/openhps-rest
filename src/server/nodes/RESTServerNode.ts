import { DataFrame, Node, DataSerializer } from '@openhps/core';
import { ServerOptions } from './ServerOptions';
import * as express from 'express';

/**
 * @category Server
 *
 * Routes are registered on the express app at build and unregistered again when
 * the node is destroyed, so do not run two live nodes on the same app and path.
 *
 * There is no built-in authentication: POST bodies are deserialized and pushed
 * into the graph by anyone who can reach the route. Mount authenticating
 * `middleware` for every deployment that is not fully trusted.
 */
export class RESTServerNode<In extends DataFrame, Out extends DataFrame> extends Node<In, Out> {
    protected options: ServerOptions;
    private _inputType: new () => In;
    private _pullQueue: Array<QueueItem> = [];
    private _registeredLayers: Array<express.Router['stack'][number]> = [];

    constructor(options: ServerOptions, inputType: new () => In) {
        super(options);
        this._inputType = inputType;
        this.logger = () => undefined;
        this.options.middleware = this.options.middleware || [];

        this.on('build', this._onBuild.bind(this));
        this.on('push', this._localPush.bind(this));
        this.on('pull', this._onLocalPull.bind(this));
        this.once('destroy', this._onDestroy.bind(this));
    }

    /**
     * The route layer stack that receives handlers added via `get` and `post`:
     * `app.router.stack` for an express app, or the router's own `stack` when a
     * bare `express.Router()` was passed, which has no `.router` property.
     * @returns {Array<express.Router['stack'][number]>|undefined} The route layer stack, or undefined when not accessible
     */
    private getRouteStack(): Array<express.Router['stack'][number]> | undefined {
        const express = this.options.express as { router?: express.Router } & express.Router;
        return (express.router ?? express).stack;
    }

    private _onBuild(): Promise<void> {
        return new Promise<void>((resolve) => {
            // Register routes, remembering the added layers so they can be unregistered again
            const stack = this.getRouteStack();
            const registeredAt = stack ? stack.length : 0;
            this.options.express.get(this.options.path, ...this.options.middleware, this._get.bind(this));
            this.options.express.post(this.options.path, ...this.options.middleware, this._post.bind(this));
            if (stack) {
                this._registeredLayers = stack.slice(registeredAt);
            }
            resolve();
        });
    }

    private _localPush(frame: In): Promise<void> {
        return new Promise((resolve) => {
            // Drop long-polls that were already answered, then serve the oldest one (FIFO).
            while (this._pullQueue.length > 0 && this._pullQueue[0].res.headersSent) {
                this._pullQueue.shift();
            }
            const queueItem = this._pullQueue.shift();
            if (queueItem) {
                const res = queueItem.res;
                res.status(200).json({
                    message: `Pull performed to node with uid ${this.uid}`,
                    frame: DataSerializer.serialize(frame),
                });
                resolve();
            } else {
                this.outlets.forEach((outlet) => outlet.push(frame as any));
                resolve();
            }
        });
    }

    private _onLocalPull(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            Promise.all(this.inlets.map((inlet) => inlet.pull()))
                .then(() => {
                    resolve();
                })
                .catch(reject);
        });
    }

    /**
     * Pull request
     * @param {express.Request} req GET request
     * @param {express.Response} res Response of GET request
     */
    private _get(req: express.Request, res: express.Response): void {
        // Perform a pull
        if (this.options.pullTimeout) {
            this._pullQueue.push({
                res,
                time: new Date().getTime(),
            });
        }

        this.pull()
            .then(() => {
                this.removeQueuedResponse(res);
                if (!res.headersSent) {
                    res.status(200).json({
                        message: `Pull performed to node with uid ${this.uid}`,
                    });
                }
            })
            .catch((ex) => {
                this.removeQueuedResponse(res);
                if (!res.headersSent) {
                    res.status(500).json({ exception: ex });
                }
            });
    }

    /**
     * Remove a long-poll from the pull queue once its response has been settled.
     * @param {express.Response} res Response of the settled GET request
     */
    private removeQueuedResponse(res: express.Response): void {
        const index = this._pullQueue.findIndex((queueItem) => queueItem.res === res);
        if (index > -1) {
            this._pullQueue.splice(index, 1);
        }
    }

    private _onDestroy(): void {
        // Unregister the express routes added on build
        const stack = this.getRouteStack();
        if (stack) {
            for (const layer of this._registeredLayers) {
                const index = stack.indexOf(layer);
                if (index > -1) {
                    stack.splice(index, 1);
                }
            }
        }
        this._registeredLayers = [];

        // Fail any still pending long-poll requests
        for (const queueItem of this._pullQueue) {
            if (!queueItem.res.headersSent) {
                queueItem.res.status(503).json({ exception: 'Server node was destroyed.' });
            }
        }
        this._pullQueue = [];
    }

    /**
     * Push request
     * @param {express.Request} req POST request
     * @param {express.Response} res Response of POST request
     */
    private _post(req: express.Request, res: express.Response): void {
        // Parse frame
        const frameSerialized = req.body && req.body.frame;
        if (frameSerialized === undefined) {
            res.status(400).json({ exception: 'Request body must contain a serialized frame.' });
            return;
        }

        // Reject Function type markers: the data serializer evaluates them at
        // deserialization, so deserializing untrusted payloads with them would
        // allow remote code execution.
        if (containsUnsafeTypeMarker(frameSerialized)) {
            res.status(400).json({ exception: 'Frame contains a type that cannot be deserialized.' });
            return;
        }

        let frameDeserialized: In;
        try {
            frameDeserialized = DataSerializer.deserialize(frameSerialized, this._inputType);
        } catch (ex) {
            res.status(400).json({ exception: ex });
            return;
        }

        // Perform a push
        this.push(frameDeserialized)
            .then(() => {
                if (!res.headersSent)
                    res.status(200).json({
                        message: `Push performed to node with uid ${this.uid}`,
                    });
            })
            .catch((ex) => {
                res.status(500).json({ exception: ex });
            });
    }
}

/**
 * Look for `__type: 'Function'` markers, which the data serializer evaluates at
 * deserialization. `Object` markers are left alone: the serializer itself emits
 * them for any plain-object value, so legitimate frames carry them too.
 * @param {any} value Serialized frame received from a client
 * @returns {boolean} Whether the value carries an unsafe type marker
 */
function containsUnsafeTypeMarker(value: any): boolean {
    const stack: Array<any> = [value];
    while (stack.length > 0) {
        const current = stack.pop();
        if (Array.isArray(current)) {
            for (const element of current) {
                stack.push(element);
            }
        } else if (typeof current === 'object' && current !== null) {
            if (current['__type'] === 'Function') {
                return true;
            }
            for (const key of Object.keys(current)) {
                stack.push(current[key]);
            }
        }
    }
    return false;
}

interface QueueItem {
    res: express.Response;
    time: number;
}
