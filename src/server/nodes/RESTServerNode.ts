import { DataFrame, Node, DataSerializer } from '@openhps/core';
import { ServerOptions } from './ServerOptions';
import * as express from 'express';

/**
 * @category Server
 */
export class RESTServerNode<In extends DataFrame, Out extends DataFrame> extends Node<In, Out> {
    protected options: ServerOptions;
    private _inputType: new () => In;
    private _pullQueue: Array<QueueItem> = [];

    constructor(options: ServerOptions, inputType: new () => In) {
        super(options);
        this._inputType = inputType;
        this.logger = () => undefined;
        this.options.middleware = this.options.middleware || [];

        this.on('build', this._onBuild.bind(this));
        this.on('push', this._localPush.bind(this));
        this.on('pull', this._onLocalPull.bind(this));
    }

    private _onBuild(): Promise<void> {
        return new Promise<void>((resolve) => {
            // Register routes
            this.options.express.get(this.options.path, ...this.options.middleware, this._get.bind(this));
            this.options.express.post(this.options.path, ...this.options.middleware, this._post.bind(this));
            resolve();
        });
    }

    private _localPush(frame: In): Promise<void> {
        return new Promise((resolve) => {
            if (this._pullQueue.length > 0) {
                const queueItem = this._pullQueue.pop();
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
     *
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
                if (!res.headersSent) {
                    res.status(200).json({
                        message: `Pull performed to node with uid ${this.uid}`,
                    });
                }
            })
            .catch((ex) => {
                res.status(505).json({ exception: ex });
            });
    }

    /**
     * Push request
     *
     * @param {express.Request} req POST request
     * @param {express.Response} res Response of POST request
     */
    private _post(req: express.Request, res: express.Response): void {
        // Parse frame
        const frameSerialized = req.body.frame;
        const frameDeserialized = DataSerializer.deserialize(frameSerialized, this._inputType);

        // Perform a push
        this.push(frameDeserialized)
            .then(() => {
                if (!res.headersSent)
                    res.status(200).json({
                        message: `Push performed to node with uid ${this.uid}`,
                    });
            })
            .catch((ex) => {
                res.status(505).json({ exception: ex });
            });
    }
}

interface QueueItem {
    res: express.Response;
    time: number;
}
