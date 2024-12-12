import { DataFrame, SinkNode } from "@openhps/core";

export class CustomServerSink<In extends DataFrame> extends SinkNode<In> {
    onPush(data: In): Promise<void> {
        throw new Error("Method not implemented.");
    }
}
