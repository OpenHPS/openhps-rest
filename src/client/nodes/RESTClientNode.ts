import { DataSerializer, Node, DataFrame } from '@openhps/core';
import Axios, { AxiosResponse } from 'axios';
import { ClientOptions } from './ClientOptions';

export class RESTClientNode<In extends DataFrame, Out extends DataFrame> extends Node<In, Out> {
    protected options: ClientOptions;

    constructor(options: ClientOptions) {
        super(options);
        this.logger = () => undefined;

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
                                const deserializedFrame = DataSerializer.deserialize<Out>(response.data.frame);
                                this.outlets.forEach((outlet) => outlet.push(deserializedFrame));
                                resolve();
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
