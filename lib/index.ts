import { EventEmitter as Events } from 'events';
import * as Axios from 'axios';

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

  private clientId: string = '';

  private connected: boolean = false;

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
      setTimeout(() => {
        this.events.emit('reconnect');
      }, this.reconnTimeout);
    });

    this.connect();
  }

  private connect(): void {
    Axios.default({
      url: `${this.host}/comm/connect`,
      method: 'get',
    }).then((response) => {

    }).catch((error) => {

    });
  }

  private wait(): void {
    Axios.default({
      url: `${this.host}/comm/wait`,
      method: 'get',
    }).then((response) => {

    }).catch((error) => {

    });
  }

  emit(name: string, data: object): void {
    Axios.default({
      url: `${this.host}/comm/emit`,
      method: 'post',
    }).then((response) => {

    }).catch((error) => {

    });
  }

  on(name: string, cb: (data: object) => void): void {

  }
}
