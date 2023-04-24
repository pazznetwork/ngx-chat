// SPDX-License-Identifier: MIT
import type { Connection } from './connection';
import {
  buildOpenStanza,
  NS,
  parseToXml,
  presenceUnavailable,
  serialize,
  streamClose,
} from './stanza';
import { Status } from './status';
import { error } from './log';
import type { ProtocolManager } from './protocol-manager';
import { combineLatest, filter, firstValueFrom, mergeMap, ReplaySubject, Subject } from 'rxjs';
import { ErrorCondition } from './error';

/**
 *  The StropheWebSocket class is used internally by the Connection class to handle protocol changes on demand
 */
export class StropheWebsocket implements ProtocolManager {
  readonly connection: Connection;
  socket?: WebSocket;

  private readonly initialisingSubject = new ReplaySubject<[boolean, boolean]>(1);

  private readonly onMessageSubject = new ReplaySubject<string>(1);

  private readonly isConnectedSubject = new Subject<boolean>();

  /**
   *   @param connection - The Connection owning this protocol manager
   *   @param stanzasInSubject - will be called for incoming messages
   *   @param connectionStatusSubject to emit important connection states like Status.Connecting
   */
  constructor(
    connection: Connection,
    private readonly stanzasInSubject: Subject<Element>,
    private readonly connectionStatusSubject: Subject<{
      status: Status;
      reason?: string;
      elem?: Element;
    }>
  ) {
    this.connection = connection;
    combineLatest([this.onMessageSubject, this.initialisingSubject])
      .pipe(
        mergeMap(([data, [initialising, skipAuthentication]]) =>
          initialising
            ? this.onInitialisingMessages(data, skipAuthentication)
            : this.onMessage(data)
        )
      )
      .subscribe();

    this.connection.service = this.determineWebsocketUrl(this.connection.service);
  }

  /**
   *   checks a message for stream:error
   *
   *    @param stanza - The received stanza.
   */
  checkStreamError(stanza: Element): void {
    if (stanza.namespaceURI === NS.STREAM && stanza.nodeName === 'stream:error') {
      throw new Error(
        `Error in stream occurred error=${stanza?.outerHTML ?? 'empty'} ; errors=${Array.from(
          stanza.children
        ).reduce((acc, err) => acc + err.outerHTML + '\n', '')}`
      );
    }
  }

  /**
   *  Creates a WebSocket for a connection and assigns Callbacks to it.
   *  Does nothing if there already is a WebSocket.
   */
  async connect(skipAuthentication = false): Promise<void> {
    const onConnectedPromise = firstValueFrom(this.isConnectedSubject.pipe(filter((val) => val)));
    this.initialisingSubject.next([true, skipAuthentication]);
    this.socket = new WebSocket(this.connection.service, 'xmpp');
    this.socket.onopen = () => this.onOpen();
    this.socket.onerror = (e) => this.onError(e);
    this.socket.onclose = () => this.onClose();
    this.socket.onmessage = (message) => this.onMessageSubject.next(message.data as string);
    await onConnectedPromise;
  }

  /**
   * checks for stream:error
   *
   *  @param bodyWrap - The received stanza.
   */
  connectionStatusCheck(bodyWrap: Element): Status {
    this.checkStreamError(bodyWrap);

    const statusConnected = Status.AUTHENTICATING;
    this.connection.changeConnectStatus(statusConnected);
    return statusConnected;
  }

  async disconnect(authenticated: boolean): Promise<void> {
    const disconnectPromise = firstValueFrom(this.isConnectedSubject.pipe(filter((val) => !val)));
    if (authenticated) {
      this.send(presenceUnavailable);
    }
    this.send(streamClose);
    await disconnectPromise;
  }

  /**
   *  Removes listeners on the Websocket
   */
  disconnectFinally(): void {
    if (!this.socket) {
      throw new Error('Can not disconnect if WebSocket instance is gone');
    }
    this.socket.onmessage = null;
    this.connection.disconnectFinally();
  }

  /**
   * Handles the websockets closing.
   */
  onClose(): void {
    if (!this.connection.connected || this.connection.disconnecting) {
      return;
    }
    this.disconnectFinally();
    throw new Error('Websocket closed unexpectedly');
  }

  /**
   * @param webSocketError - The websocket error.
   */
  onError(webSocketError: Event): void {
    error('Websocket error ' + JSON.stringify(webSocketError));
    this.connection.changeConnectStatus(
      Status.CONNFAIL,
      'The WebSocket connection could not be established or was disconnected.'
    );
    this.disconnectFinally();
  }

  /**
   * This function handles the websocket messages and parses each of the messages as if they are full documents.
   *
   * Since all XMPP traffic starts with
   *  <stream:stream version='1.0'
   *                 xml:lang='en'
   *                 xmlns='jabber:client'
   *                 xmlns:stream='http://etherx.jabber.org/streams'
   *                 id='3697395463'
   *                 from='SERVER'>
   *
   * The first stanza will always fail to be parsed.
   *
   * Additionally, the seconds stanza will always be <stream:features> with
   * the stream NS defined in the previous stanza, so we need to 'force'
   * the inclusion of the NS in this stanza.
   *
   * @param xmlData - The websocket data load.
   */
  async onMessage(xmlData: string): Promise<void> {
    const isCloseStanza = xmlData.startsWith('<close');
    const elem = parseToXml(xmlData);

    this.checkStreamError(elem);

    if (isCloseStanza) {
      this.connection.xmlInput?.(elem);
      this.stanzasInSubject.next(elem);
      this.disconnectFinally();
      this.isConnectedSubject.next(false);
      return;
    }

    await this.connection.dataReceivedWebsocket(elem);
  }

  async onInitialisingMessages(xmlData: string, skipAuthentication: boolean): Promise<void> {
    const isOpenStanza = xmlData.startsWith('<open');
    const isCloseStanza = xmlData.startsWith('<close');
    const elem = parseToXml(xmlData);

    this.checkStreamError(elem);

    this.connection.xmlInput?.(elem);
    this.stanzasInSubject.next(elem);

    if (isOpenStanza) {
      return;
    }

    if (isCloseStanza) {
      const seeUri = elem.getAttribute('see-other-uri');
      if (!seeUri) {
        this.connection.changeConnectStatus(Status.CONNFAIL, 'Received closing stream');
        this.disconnectFinally();
        return;
      }
      const service = this.connection.service;
      // Valid scenarios: WSS->WSS, WS->ANY
      const isSecureRedirect =
        (service !== seeUri && service.startsWith('wss:') && seeUri.startsWith('wss:')) ||
        service.startsWith('ws:');
      if (!isSecureRedirect) {
        return;
      }
      this.connection.changeConnectStatus(
        Status.REDIRECT,
        'Received see-other-uri, resetting connection'
      );
      this.connection.reset();
      this.connection.service = seeUri;
      await this.connect();
      return;
    }

    this.initialisingSubject.next([false, skipAuthentication]);
    this.isConnectedSubject.next(true);
    this.connection.connected = true;

    if (skipAuthentication) {
      this.connectionStatusSubject.next({ status: Status.AUTHENTICATING });
      return;
    }

    const matched = this.connection.sasl.getMatchedAuthentications(this, elem);
    if (matched.length > 0) {
      await this.connection.sasl.authenticate(matched);
      this.connection.changeConnectStatus(Status.CONNECTED, 'Authenticated successfully');
      return;
    }

    this.connection.changeConnectStatus(Status.CONNFAIL, ErrorCondition.NO_AUTH_MECH);
    this.disconnectFinally();
    throw new Error('Server did not offer a supported authentication mechanism');
  }

  /**
   * Handles websockets connection setup and sends the opening stream tag.
   */
  onOpen(): void {
    this.send(buildOpenStanza(this.connection.domain as string));
    this.connectionStatusSubject.next({ status: Status.CONNECTING });
  }

  async openNewStream(): Promise<void> {
    this.send(buildOpenStanza(this.connection.domain as string));
    await firstValueFrom(
      this.connection.stanzasIn$.pipe(filter((el) => el.tagName === 'stream:features'))
    );
  }

  /**
   * Sends the elem and resets the idle timer
   */
  send(stanza: Element): void {
    this.connection.flush();
    this.connection.xmlOutput?.(stanza);
    const data = serialize(stanza);
    if (!data) {
      throw new Error('serialized data is undefined');
    }
    this.socket?.send(data);
  }

  private determineWebsocketUrl(service: string): string {
    if (service.startsWith('ws:') || service.startsWith('wss:')) {
      return service;
    }

    const path = service.startsWith('/') ? service : window.location.pathname + service;

    return `wss://${window.location.host}${path}`;
  }
}
