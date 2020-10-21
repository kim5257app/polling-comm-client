import { EventEmitter as Events } from 'events';
import * as Axios from 'axios';
import Error from '@kim5257/js-error';

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

  public id: string = '';

  private reconnTimer: NodeJS.Timeout | null = null;

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
      this.connected = false;
      this.doReconnect();
    });

    this.events.on('error', (error) => {
      console.log('error', JSON.stringify(error));
      this.events.emit('disconnected');
    });

    this.connect();
  }

  private connect(): void {
    Axios.default({
      url: `${this.host}/comm/connect`,
      method: 'get',
    }).then((resp) => {
      if (resp.data.result === 'success') {
        this.id = resp.data.clientId;
        this.connected = true;

        this.events.emit('connected', this);

        this.wait();
      }
    }).catch((error) => {
      // 에러 발생 시 일정 시간 후 다시 시도
      this.events.emit('error', Error.make(error));
    });
  }

  private doReconnect(): void {
    if (this.reconnTimer == null && this.reconnect) {
      this.reconnTimer = setTimeout(() => {
        this.events.emit('reconnect');
        this.reconnTimer = null;
      }, this.reconnTimeout);
    }
  }

  private wait(): void {
    if (this.id !== '' || this.connected) {
      Axios.default({
        url: `${this.host}/comm/wait`,
        method: 'get',
        headers: { id: this.id },
        params: { timestamp: new Date().getTime() },
        timeout: this.waitTimeout,
      }).then((resp) => {
        // 응답이 있으면 데이터가 있는거
        const { name, data } = resp.data;
        this.events.emit(name, JSON.parse(data));

        // 다시 대기 요청
        this.wait();
      }).catch((error) => {
        if (error.response?.status === 410) {
          // 410 에러라면 재 연결
          this.connected = false;
          this.events.emit('disconnected', this);
        } else {
          // 다시 대기 요청
          this.wait();
        }
      });
    }
  }

  emit(name: string, data: object): void {
    if (this.connected) {
      Axios.default({
        url: `${this.host}/comm/emit`,
        method: 'post',
        headers: {
          id: this.id,
          'Content-Type': 'application/json',
        },
        data: JSON.stringify({name, data}),
      }).then((resp) => {
        // 전송 실패 시 에러 이벤트 전달
        if (resp.data.result !== 'success') {
          this.events.emit('error', Error.make(resp.data));
        }
      }).catch((error) => {
        this.events.emit('error', error);
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
}
