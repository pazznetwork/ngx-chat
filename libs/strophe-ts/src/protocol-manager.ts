// SPDX-License-Identifier: MIT
import type { Connection } from './connection';
import type { Status } from './status';

export interface ProtocolManager {
  connection: Connection;

  /**
   * Connect to the server using the current protocol manager
   */
  connect(skipAuthentication?: boolean): Promise<void>;

  /**
   *
   * checks for stream:error
   *
   *  Parameters:
   *    (Strophe.Request) bodyWrap - The received stanza.
   */
  connectionStatusCheck(bodyWrap: Element): Status;

  /**
   * Disconnects and handles stanza close / terminate handshake
   *
   * @param {boolean} authenticated
   */
  disconnect(authenticated: boolean): Promise<void>;

  /**
   *  Just closes the Socket for WebSockets
   */
  disconnectFinally(): void;

  /**
   *  Send a stanza.
   *
   *  For BOSH:
   *  This function is called to push data onto the send queue to go out over the wire.  Whenever a request is sent to the BOSH
   *  server, all pending data is sent and the queue is flushed.
   *
   *  For Websocket:
   *  Sends the stanza immediately.
   *
   *  @param elem - The stanza to send.
   */
  send(elem: Element): void;

  /**
   * In general its more of opening a stream in a stream after authenticating
   */
  openNewStream(): Promise<void>;
}
