"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
class Socket {
    constructor() {
        this.events = new events_1.EventEmitter();
    }
}
exports.default = Socket;
//# sourceMappingURL=index.js.map