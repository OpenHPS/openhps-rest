import { DataFrame, Node, DataSerializer } from '@openhps/core';
import { ServerOptions } from './ServerOptions';
import * as express from 'express';

export class RESTServerNode<In extends DataFrame, Out extends DataFrame> extends Node<In, Out> {
    private _options: ServerOptions;
    private _inputType: new () => In;

    constructor(options: ServerOptions, inputType: new () => In) {
        super();
        this._options = options;
        this._inputType = inputType;

        this.on('build', this._onBuild.bind(this));
        this.on('destroy', this._onDestroy.bind(this));
    }

    private _onBuild(): Promise<void> {
        return new Promise<void>((resolve) => {
            // Register routes
            this._options.express.get(this._options.path, this._get.bind(this));
            this._options.express.post(this._options.path, this._post.bind(this));

            resolve();
        });
    }

    private _onDestroy(): Promise<void> {
        return new Promise<void>((resolve) => {
            resolve();
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
        this.pull()
            .then(() => {
                if (!res.headersSent)
                    res.status(200).json({
                        message: `Pull performed to node with uid ${this.uid}`,
                    });
            })
            .catch((ex) => {
                if (!res.headersSent) res.status(505).json({ exception: ex });
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
                if (!res.headersSent) res.status(505).json({ exception: ex });
            });
    }
}
