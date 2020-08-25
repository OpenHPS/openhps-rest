import * as express from 'express';
import { ProcessingNodeOptions } from '@openhps/core';

export interface ServerOptions extends ProcessingNodeOptions {
    path: string;
    express: express.Express;
    pullTimeout?: number;
}
