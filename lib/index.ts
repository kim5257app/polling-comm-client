import { EventEmitter as Events } from 'events';
import * as Axios from 'axios';
import Error from '@kim5257app/js-error';

interface Options {
  reconnect?: boolean; // 재연결 시도

  waitTimeout?: number; // wait 대기 시간

  reconnTimeout?: number; // 재 연결 주기
}

export default class Socket {
  private readonly reconnect: boolean; // 재연결 시도

  private readonly waitTimeout: number; // wait 대기 시간

  private readonly reconnTimeout: number; // 재 연결 주기

  private readonly host: string; // 연결 서버 주소

  private readonly events: Events = new Events(); // 이벤트 객체

  private readonly cbList = new Map<string, (data: object) => void>();

  private connected: boolean = false;

  private closed: boolean = false;

  public id: string = '';

  private commHash: number = new Date().getTime();

  private reconnTimer: NodeJS.Timeout | null = null;

  private hookFns: ((event: string, data?: object) => void)[] = [];

  constructor(host: string, options?: Options) {
    // 연결 서버 설정
    this.host = host;

    // 기본 값 설정
    this.reconnect = (options?.reconnect) ? (options?.reconnect) : true;
    this.waitTimeout = (options?.waitTimeout) ? (options?.waitTimeout) : 10000;
    this.reconnTimeout = (options?.reconnTimeout) ? (options?.reconnTimeout) : 10000;

    this.events.on('reconnect', () => {
      this.connect();
    });

    this.events.on('disconnected', () => {
      this.id = '';
      this.doReconnect(this.reconnTimeout);
      this.connected = false;

    });

    this.events.on('retry', (data: {
      task: (args: any) => void,
      args: any
    }) => {
      setTimeout(() => {
        data.task(data.args);
      }, 1000);
    });

    this.events.on('error', (error) => {
      this.eventEmit('disconnected');
    });

    this.connect();
  }

  private connect(): void {
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
      this.eventEmit('error', Error.make(error));
    });
  }

  private doReconnect(delay: number): void {
    if (this.reconnTimer == null && this.reconnect && !this.closed) {
      this.reconnTimer = setTimeout(() => {
        this.eventEmit('reconnect');
        this.reconnTimer = null;
      }, delay);
    }
  }

  private wait(): void {
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
        this.eventEmit(
          name,
          (typeof data === 'string') ? JSON.parse(data): data
        );

        // 다시 대기 요청
        this.wait();
      }).catch((error) => {
        if (error.response?.status === 410) {
          // 410 에러라면 재 연결
          this.eventEmit('disconnected', this);
        } else {
          // 다시 대기 요청
          this.wait();
        }
      });
    }
  }

  private eventEmit(name: string, data?: object): void {
    // hook 함수 호출
    this.hookFns.forEach((fn) => {
      fn(name, data);
    });

    this.events.emit(name, data);
  }

  emit(name: string, data: object): void {
    if (this.connected) {
      Axios.default({
        url: `${this.host}/comm/emit`,
        method: 'post',
        headers: {
          'comm-hash': this.commHash,
          id: this.id,
          'Content-Type': 'application/json',
        },
        data: JSON.stringify({name, data}),
      }).then((resp) => {
        // 전송 실패 시 에러 이벤트 전달
        if (resp.data.result !== 'success') {
          this.eventEmit('error', Error.make(resp.data));
        }
      }).catch((error) => {
        // this.eventEmit('error', error);
        this.eventEmit('retry', { task: this.emit, args: data });
      });
    }
  }

  on(name: string, cb: (data: object) => void): void {
    if (!this.cbList.has(name)) {
      this.events.on(name, cb);
      this.cbList.set(name, cb);
    } else {
      throw Error.makeFail('ALREADY_REGISTERED', 'Event has already registered');
    }
  }

  off(name: string): void {
    const cb = this.cbList.get(name);
    if (cb != null) {
      this.events.off(name, cb);
      this.cbList.delete(name);
    } else {
      throw Error.makeFail('NOT_REGISTERED', 'Event has not registered');
    }
  }

  close(): void {
    this.closed = true;
    this.connected = false;
    this.eventEmit('disconnected');
  }

  hook(fn: (name: string, data?: object) => void) {
    this.hookFns.push(fn);
  }
}
