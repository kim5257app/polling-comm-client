interface Options {
    reconnect?: boolean;
    waitTimeout?: number;
    reconnTimeout?: number;
}
export default class Socket {
    private readonly reconnect;
    private readonly waitTimeout;
    private readonly reconnTimeout;
    private readonly host;
    private readonly events;
    private readonly cbList;
    private connected;
    private closed;
    id: string;
    private reconnTimer;
    private hookFns;
    constructor(host: string, options?: Options);
    private connect;
    private doReconnect;
    private wait;
    private eventEmit;
    emit(name: string, data: object): void;
    on(name: string, cb: (data: object) => void): void;
    off(name: string): void;
    close(): void;
    hook(fn: (name: string, data?: object) => void): void;
}
export {};
