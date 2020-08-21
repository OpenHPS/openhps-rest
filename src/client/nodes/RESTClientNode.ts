import { DataSerializer, Node, DataFrame } from '@openhps/core';
import Axios, { AxiosResponse } from 'axios';
import { ClientOptions } from './ClientOptions';

export class RESTClientNode<In extends DataFrame, Out extends DataFrame> extends Node<In, Out> {
    protected options: ClientOptions;

    constructor(options: ClientOptions) {
        super(options);

        this.on('push', this._onRemotePush.bind(this));
        this.on('pull', this._onRemotePull.bind(this));
    }

    private _onRemotePush(data: In): Promise<void> {
        return new Promise((resolve, reject) => {
            // Perform a POST push request on the remote node
            Axios.request({
                baseURL: this.options.url,
                url: '/',
                method: 'post',
                data: {
                    frame: DataSerializer.serialize(data),
                },
                responseType: 'json',
            })
                .then((response: AxiosResponse) => {
                    this.logger('debug', {
                        message: 'Remote push performed!',
                        status: response.status,
                    });

                    switch (response.status) {
                        case 200:
                            resolve();
                            break;
                        default:
                            reject(response.statusText);
                    }
                })
                .catch((ex) => {
                    this.logger('error', {
                        message: 'Unable to perform to push!',
                        exception: ex,
                    });
                    reject(ex);
                });
        });
    }

    private _onRemotePull(): Promise<void> {
        return new Promise((resolve, reject) => {
            // Perform a GET pull request on the remote node
            Axios.request({
                baseURL: this.options.url,
                url: '/',
                method: 'get',
                responseType: 'json',
            })
                .then((response: AxiosResponse) => {
                    switch (response.status) {
                        case 200:
                            if (response.data.frame !== undefined) {
                                const pushPromises: Array<Promise<void>> = [];
                                this.outputNodes.forEach((node) => {
                                    pushPromises.push(node.push(response.data.frame));
                                });
                                if (pushPromises.length === 0) {
                                    resolve();
                                } else {
                                    Promise.resolve(pushPromises)
                                        .then(() => {
                                            resolve();
                                        })
                                        .catch(reject);
                                }
                            } else {
                                resolve();
                            }
                            break;
                        default:
                            reject(response.statusText);
                    }
                })
                .catch(reject);
        });
    }
}
