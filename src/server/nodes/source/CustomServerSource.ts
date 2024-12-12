import { DataFrame, PullOptions, SourceNode, SourceNodeOptions } from "@openhps/core";
import * as express from "express";

export class CustomServerSource<Out extends DataFrame> extends SourceNode<Out> {
    protected handler: express.RequestHandler;

    /**
     * Create a new custom server source
     * @param handler Express request handler
     * @param options 
     */
    constructor(handler?: express.RequestHandler, options?: SourceNodeOptions) {
        super(options);
        this.handler = handler;
    }

    onPull(options?: PullOptions): Promise<Out> {
        throw new Error("Method not implemented.");
    }

}