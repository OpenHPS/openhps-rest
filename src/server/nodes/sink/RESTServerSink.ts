import { DataFrame, SinkNode, ModelBuilder } from '@openhps/core';
import { RESTServerNode } from '../RESTServerNode';
import { ServerOptions } from '../ServerOptions';

export class RESTServerSink<In extends DataFrame> extends SinkNode<In> {
    private _remoteNode: RESTServerNode<In, In>;

    constructor(options: ServerOptions, inputType: new () => In) {
        super();
        this._remoteNode = new RESTServerNode<In, In>(options, inputType);
        this.once('build', this._onRemoteBuild.bind(this));
    }

    private _onRemoteBuild(graphBuilder: ModelBuilder<any, any>): Promise<boolean> {
        // Add a remote node before this node
        this._remoteNode.graph = this.graph;
        this._remoteNode.logger = this.logger;
        graphBuilder.addNode(this._remoteNode);
        return this._remoteNode.emitAsync('build', graphBuilder);
    }

    public onPush(data: In): Promise<void> {
        return this._remoteNode.push(data);
    }
}
