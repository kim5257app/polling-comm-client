"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const Axios = require("axios");
const js_error_1 = require("@kim5257app/js-error");
class Socket {
    constructor(host, options) {
        this.events = new events_1.EventEmitter(); // 이벤트 객체
        this.cbList = new Map();
        this.connected = false;
        this.closed = false;
        this.id = '';
        this.commHash = new Date().getTime();
        this.reconnTimer = null;
        this.hookFns = [];
        // 연결 서버 설정
        this.host = host;
        // 기본 값 설정
        this.reconnect = (options === null || options === void 0 ? void 0 : options.reconnect) ? (options === null || options === void 0 ? void 0 : options.reconnect) : true;
        this.waitTimeout = (options === null || options === void 0 ? void 0 : options.waitTimeout) ? (options === null || options === void 0 ? void 0 : options.waitTimeout) : 10000;
        this.reconnTimeout = (options === null || options === void 0 ? void 0 : options.reconnTimeout) ? (options === null || options === void 0 ? void 0 : options.reconnTimeout) : 10000;
        this.events.on('reconnect', () => {
            this.connect();
        });
        this.events.on('disconnected', () => {
            this.id = '';
            this.doReconnect(this.reconnTimeout);
            this.connected = false;
        });
        this.events.on('retry', (data) => {
            setTimeout(() => {
                data.task(data.args);
            }, 1000);
        });
        this.events.on('error', (error) => {
            this.eventEmit('disconnected');
        });
        this.connect();
    }
    connect() {
        Axios.default({
            url: `${this.host}/comm/connect`,
            headers: {
                'comm-hash': this.commHash,
            },
            method: 'get',
        }).then((resp) => {
            if (resp.data.result === 'success') {
                this.id = resp.data.clientId;
                this.connected = true;
                this.eventEmit('connected', this);
                this.wait();
            }
        }).catch((error) => {
            // 에러 발생 시 일정 시간 후 다시 시도
            this.eventEmit('error', js_error_1.default.make(error));
        });
    }
    doReconnect(delay) {
        if (this.reconnTimer == null && this.reconnect && !this.closed) {
            this.reconnTimer = setTimeout(() => {
                this.eventEmit('reconnect');
                this.reconnTimer = null;
            }, delay);
        }
    }
    wait() {
        if (this.id !== '' || this.connected) {
            Axios.default({
                url: `${this.host}/comm/wait`,
                method: 'get',
                headers: {
                    'comm-hash': this.commHash,
                    id: this.id
                },
                params: { timestamp: new Date().getTime() },
                timeout: this.waitTimeout,
            }).then((resp) => {
                // 응답이 있으면 데이터가 있는거
                const { name, data } = resp.data;
                // data가 string이면 JSON 파싱
                this.eventEmit(name, (typeof data === 'string') ? JSON.parse(data) : data);
                // 다시 대기 요청
                this.wait();
            }).catch((error) => {
                var _a;
                if (((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) === 410) {
                    // 410 에러라면 재 연결
                    this.eventEmit('disconnected', this);
                }
                else {
                    // 다시 대기 요청
                    this.wait();
                }
            });
        }
    }
    eventEmit(name, data) {
        // hook 함수 호출
        this.hookFns.forEach((fn) => {
            fn(name, data);
        });
        this.events.emit(name, data);
    }
    emit(name, data) {
        if (this.connected) {
            Axios.default({
                url: `${this.host}/comm/emit`,
                method: 'post',
                headers: {
                    'comm-hash': this.commHash,
                    id: this.id,
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({ name, data }),
            }).then((resp) => {
                // 전송 실패 시 에러 이벤트 전달
                if (resp.data.result !== 'success') {
                    this.eventEmit('error', js_error_1.default.make(resp.data));
                }
            }).catch((error) => {
                // this.eventEmit('error', error);
                this.eventEmit('retry', { task: this.emit, args: data });
            });
        }
    }
    on(name, cb) {
        if (!this.cbList.has(name)) {
            this.events.on(name, cb);
            this.cbList.set(name, cb);
        }
        else {
            throw js_error_1.default.makeFail('ALREADY_REGISTERED', 'Event has already registered');
        }
    }
    off(name) {
        const cb = this.cbList.get(name);
        if (cb != null) {
            this.events.off(name, cb);
            this.cbList.delete(name);
        }
        else {
            throw js_error_1.default.makeFail('NOT_REGISTERED', 'Event has not registered');
        }
    }
    close() {
        this.closed = true;
        this.connected = false;
        this.eventEmit('disconnected');
    }
    hook(fn) {
        this.hookFns.push(fn);
    }
}
exports.default = Socket;
//# sourceMappingURL=index.js.map