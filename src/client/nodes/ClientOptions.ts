import { NodeOptions } from '@openhps/core';
import { AxiosRequestConfig } from 'axios';

/**
 * @category Client
 */
export interface ClientOptions extends NodeOptions {
    url: string;
    /**
     * Additional configuration options for the client request
     */
    config?: AxiosRequestConfig;
}
