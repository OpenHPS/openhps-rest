import { DataFrame, SinkNode } from '@openhps/core';
import { RESTClientNode } from '../RESTClientNode';
import { ClientOptions } from '../ClientOptions';

export class RESTClientSink<In extends DataFrame> extends SinkNode<In> {
    private _remoteNode: RESTClientNode<In, In>;

    constructor(options: ClientOptions) {
        super(options);
        this._remoteNode = new RESTClientNode<In, In>(options);
    }

    public onPush(data: In): Promise<void> {
        return this._remoteNode.push(data);
    }
}
