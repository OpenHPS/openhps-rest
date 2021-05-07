import * as express from 'express';
import { ProcessingNodeOptions } from '@openhps/core';

/**
 * @category Server
 */
export interface ServerOptions extends ProcessingNodeOptions {
    path: string;
    express: express.Express;
    pullTimeout?: number;
    middleware?: Array<express.RequestHandler>;
}
