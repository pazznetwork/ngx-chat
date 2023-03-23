// SPDX-License-Identifier: MIT
/* eslint-disable @typescript-eslint/naming-convention */
import { Status } from './status';

let manager: ConnectionManager;

/** Class: ConnectionManager
 *
 * Manages the shared websocket connection as well as the ports of the
 * connected tabs.
 */
export class ConnectionManager {
  ports: MessagePort[];
  jid: any;
  socket: any;

  constructor() {
    this.ports = [];
  }

  addPort(port: MessagePort): void {
    this.ports.push(port);
    port.addEventListener('message', (e): void => {
      const method = e.data[0];
      try {
        // @ts-ignore
        this[method](e.data.splice(1));
      } catch (err) {
        // eslint-disable-next-line no-console
        console?.error(err);
      }
    });
    port.start();
  }

  _connect(data: [jid: string, url: string]): void {
    this.jid = data[1];
    this._closeSocket();
    this.socket = new WebSocket(data[0], 'xmpp');
    this.socket.onopen = (): void => this._onOpen();
    this.socket.onerror = (e: CloseEvent): void => this._onError(e);
    this.socket.onclose = (e: CloseEvent): void => this._onClose(e);
    this.socket.onmessage = (message: MessageEvent): void => this._onMessage(message);
  }

  _attach(): void {
    if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
      this.ports.forEach((p): void =>
        p.postMessage(['_attachCallback', Status.ATTACHED, this.jid])
      );
    } else {
      this.ports.forEach((p): void => p.postMessage(['_attachCallback', Status.ATTACHFAIL]));
    }
  }

  send(str: string): void {
    this.socket.send(str);
  }

  close(str: string): void {
    if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
      try {
        this.socket.send(str);
      } catch (e) {
        this.ports.forEach((p): void => p.postMessage(['log', 'error', e]));
        this.ports.forEach((p): void =>
          p.postMessage(['log', 'error', "Couldn't send <close /> tag."])
        );
      }
    }
  }

  _onOpen(): void {
    this.ports.forEach((p): void => p.postMessage(['_onOpen']));
  }

  _onClose(e: CloseEvent): void {
    this.ports.forEach((p): void => p.postMessage(['_onClose', e.reason]));
  }

  _onMessage(message: MessageEvent): void {
    const o = { data: message.data };
    this.ports.forEach((p): void => p.postMessage(['_onMessage', o]));
  }

  _onError(error: CloseEvent): void {
    this.ports.forEach((p): void => p.postMessage(['_onError', error.reason]));
  }

  _closeSocket(): void {
    if (this.socket) {
      try {
        this.socket.onclose = null;
        this.socket.onerror = null;
        this.socket.onmessage = null;
        this.socket.close();
      } catch (e) {
        this.ports.forEach((p): void => p.postMessage(['log', 'error', e]));
      }
    }
    this.socket = null;
  }
}

// @ts-ignore
SharedWorkerGlobalScope.onconnect = function (e: { ports: MessagePort[] }) {
  manager = manager || new ConnectionManager();
  const messagePort = e.ports[0];
  if (!messagePort) {
    throw new Error('messagePort cannot be undefined');
  }
  manager.addPort(messagePort);
};
