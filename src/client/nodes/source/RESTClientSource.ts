import { DataFrame, SourceNode, ModelBuilder, EdgeBuilder } from '@openhps/core';
import { RESTClientNode } from '../RESTClientNode';
import { ClientOptions } from '../ClientOptions';

export class RESTClientSource<Out extends DataFrame> extends SourceNode<Out> {
    private _remoteNode: RESTClientNode<Out, Out>;

    constructor(options: ClientOptions) {
        super(options);
        this._remoteNode = new RESTClientNode<Out, Out>(options);

        this.once('build', this._onRemoteBuild.bind(this));
    }

    private _onRemoteBuild(graphBuilder: ModelBuilder<any, any>): Promise<boolean> {
        // Add a remote node before this node
        this._remoteNode.graph = this.graph;
        this._remoteNode.logger = this.logger;
        graphBuilder.addNode(this._remoteNode);
        graphBuilder.addEdge(EdgeBuilder.create().from(this._remoteNode).to(this).build());
        return this._remoteNode.emitAsync('build', graphBuilder);
    }

    public onPull(): Promise<Out> {
        return new Promise((resolve, reject) => {
            this._remoteNode
                .pull()
                .then(() => {
                    resolve(undefined);
                })
                .catch(reject);
        });
    }
}
