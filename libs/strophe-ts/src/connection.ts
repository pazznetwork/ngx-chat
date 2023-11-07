// SPDX-License-Identifier: MIT
import type { SASLMechanism } from './sasl-mechanism';
import { Status } from './status';
import {
  $iq,
  type Builder,
  ensureHasId,
  getBareJidFromJid,
  getDomainFromJid,
  getNodeFromJid,
  getResourceFromJid,
  getText,
  NS,
  presenceUnavailable,
} from './stanza';
import { ErrorCondition } from './error';
import { info, log, LogLevel, warn } from './log';
import { Bosh } from './bosh';
import { StropheWebsocket } from './strophe-websocket';
import type { ProtocolManager } from './protocol-manager';
import {
  distinctUntilChanged,
  filter,
  firstValueFrom,
  merge,
  Observable,
  of,
  pairwise,
  ReplaySubject,
  share,
  shareReplay,
  startWith,
  Subject,
  switchMap,
  takeUntil,
} from 'rxjs';
import type { ConnectionOptions } from './connection-options';
import { AuthenticationMode } from './authentication-mode';
import type { Credentials } from './credentials';
import { Sasl } from './sasl';
import { HandlerService } from './handler-service';
import type { BoshRequest } from './bosh-request';
import { map } from 'rxjs/operators';
import { getConnectionsUrls } from './connection-urls';
import type { BoshOptions } from './bosh-options';
import { Handler } from './handler';
import { isValidJID } from './utils';

/**
 *  XMPP Connection manager.
 *
 *  This class is the main part of Strophe.  It manages a BOSH connection
 *  to an XMPP server and dispatches events to the user callbacks as
 *  data arrives.  It supports SASL PLAIN, SASL DIGEST-MD5, SASL SCRAM-SHA1
 *  and legacy authentication.
 *
 *  After creating a Strophe.Connection object, the user will typically
 *  call connect() with a user supplied callback to handle connection level
 *  events like authentication failure, disconnection, or connection
 *  complete.
 *
 *  The user will also have several event handlers defined by using
 *  addHandler() and addTimedHandler().  These will allow the user code to
 *  respond to interesting stanzas or do something periodically with the
 *  connection.  These handlers will be active once authentication is
 *  finished.
 *
 *  To send data to the connection, use send().
 */
export class Connection {
  private readonly userJidSubject = new ReplaySubject<string>(1);

  readonly userJid$: Observable<string> = this.userJidSubject.pipe(
    filter((val): val is string => !!val)
  );

  private readonly stanzasInSubject = new Subject<Element>();
  readonly stanzasIn$ = this.stanzasInSubject.pipe(shareReplay({ bufferSize: 1, refCount: false }));

  private readonly connectionStatusChangedSubject = new Subject<{
    status: Status;
    reason?: string;
    elem?: Element;
  }>();

  readonly connectionStatusChanged$ = this.connectionStatusChangedSubject.pipe(
    distinctUntilChanged((previous, current) => previous.status === current.status),
    startWith({ status: Status.DISCONNECTED, reason: 'fresh instance' }),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  readonly onAuthenticating$ = this.connectionStatusChanged$.pipe(
    filter(({ status }) => [Status.CONNECTING, Status.AUTHENTICATING].includes(status)),
    map(() => {
      return;
    }),
    share()
  );

  private readonly onOnlineStatus$ = this.connectionStatusChanged$.pipe(
    filter(({ status }) => [Status.CONNECTED, Status.ATTACHED].includes(status))
  );
  /**
   * Triggered after we disconnected from the XMPP server.
   */
  private readonly onOfflineSubject = new Subject<void>();

  readonly isOnline$ = merge(
    this.onOnlineStatus$.pipe(map(() => true)),
    this.onOfflineSubject.pipe(map(() => false))
  ).pipe(startWith(false), shareReplay({ bufferSize: 1, refCount: false }));

  readonly isOffline$ = this.isOnline$.pipe(map((online) => !online));

  private readonly innerOnOffline$ = this.isOnline$.pipe(
    pairwise(),
    filter(([prev, curr]) => prev && !curr),
    map(() => undefined)
  );

  private readonly innerOnOnline$ = this.isOnline$.pipe(
    pairwise(),
    filter(([prev, curr]) => !prev && curr),
    map(() => undefined)
  );

  readonly onOffline$ = this.innerOnOffline$.pipe(
    switchMap(() =>
      of(undefined).pipe(
        takeUntil(this.innerOnOnline$),
        shareReplay({ bufferSize: 1, refCount: true })
      )
    )
  );

  readonly onOnline$ = this.innerOnOnline$.pipe(
    switchMap(() =>
      of(undefined).pipe(
        takeUntil(this.innerOnOffline$),
        shareReplay({ bufferSize: 1, refCount: true })
      )
    )
  );

  /**
   * The domain of the connected JID.
   */
  domain?: string;

  authenticated = false;
  connected = false;
  disconnecting = false;

  disconnectionTimeout?: number;

  /**
   * protocol used for connection
   */
  protocolManager: ProtocolManager;

  idleTimeout: ReturnType<typeof setTimeout>;
  private disconnectTimeout?: ReturnType<typeof setTimeout>;

  readonly sasl = new Sasl(this, this.userJidSubject);

  readonly handlerService = new HandlerService(
    new Handler(
      (iq) => {
        const id = iq.getAttribute('id');
        const attrs = id ? { type: 'error', id } : ({ type: 'error' } as Record<string, string>);
        this.send(
          $iq(attrs).c('error', { type: 'cancel' }).c('service-unavailable', { xmlns: NS.STANZAS })
        );
        return false;
      },
      undefined,
      'iq',
      ['get', 'set']
    )
  );

  private firstLoggedIn = true;
  private firstLoggedOut = true;
  debugWithConsole = false;
  debugWithStream = true;
  readonly debugLog = document.createElement('XML:DEBUG:LOG');
  currentDebugParent: Element = document.createElement('EMPTY');

  /**
   * The connected JID.
   */
  private backingJid?: string;

  /**
   * Stores the passed in JID for the current user, potentially creating a
   * resource if the JID is bare.
   */
  set jid(value: string | undefined) {
    this.backingJid = value;
    this.userJidSubject.next(this.backingJid as string);
  }

  get jid(): string | undefined {
    return this.backingJid;
  }

  /**
   *  Create and initialize a Strophe.Connection object.
   *
   *  The transport-protocol for this connection will be chosen automatically
   *  based on the given service parameter. URLs starting with "ws://" or
   *  "wss://" will use WebSockets, URLs starting with "http://", "https://"
   *  or without a protocol will use BOSH.
   *
   *  To make Strophe connect to the current host you can leave out the protocol
   *  and host part and just pass the path, e.g.
   *
   *  > const conn = new Connection("/http-bind/");
   *
   *  Parameters:
   *
   *    @param service - The BOSH or WebSocket service URL.
   *    @param options - A hash of configuration options
   *    @param boshOptions - A hash of bosh options
   *    @param authenticationMode
   *    @param prebindUrl
   *    @param boshServiceUrl
   *    @param websocketUrl
   *    @param credentialsUrl
   *    @param password
   *
   */
  private constructor(
    public service: string,
    readonly options: ConnectionOptions,
    readonly boshOptions: BoshOptions,
    readonly authenticationMode: AuthenticationMode,
    readonly prebindUrl?: string,
    readonly boshServiceUrl?: string,
    readonly websocketUrl?: string,
    readonly credentialsUrl?: string,
    readonly password?: string
  ) {
    this.protocolManager = this.createProtocolManager();

    // Call onIdle callback every 1/10th of a second
    this.idleTimeout = setTimeout(() => this.onIdle(), 100);
  }

  /**
   *  User overrideable function that receives XML data coming into the connection.
   *  Default logging for debug set to true.
   *
   *  @param elem - XML data received by the connection.
   */
  readonly xmlInput? = (elem: Element): void => {
    const noDebug = !this.debugWithConsole && !this.debugWithStream;
    if (noDebug) {
      return;
    }

    if (this.firstLoggedIn && this.debugWithStream) {
      this.currentDebugParent = this.debugLog.appendChild(document.createElement('incoming:XML'));
    }

    if (this.firstLoggedIn && this.debugWithConsole) {
      // eslint-disable-next-line no-console
      console.log('--INCOMING XML--');
    }

    if (this.firstLoggedIn) {
      this.firstLoggedIn = false;
      this.firstLoggedOut = true;
    }

    if (this.debugWithStream) {
      this.currentDebugParent.appendChild(elem);
    }

    if (this.debugWithConsole) {
      // eslint-disable-next-line no-console
      console.dirxml(elem);
    }
  };

  /**
   *  User overrideable function that receives XML data sent to the connection.
   *  Default logging for debug set to true.
   *
   *    @param elem - XML data sent by the connection.
   */
  readonly xmlOutput = (elem: Element): void => {
    const noDebug = !this.debugWithConsole && !this.debugWithStream;
    if (noDebug) {
      return;
    }

    if (this.firstLoggedOut && this.debugWithStream) {
      this.currentDebugParent = this.debugLog.appendChild(document.createElement('outgoing:XML'));
    }

    if (this.firstLoggedOut && this.debugWithConsole) {
      // eslint-disable-next-line no-console
      console.log('--OUTGOING XML--');
    }

    if (this.firstLoggedOut) {
      this.firstLoggedOut = false;
      this.firstLoggedIn = true;
    }

    if (this.debugWithStream) {
      this.currentDebugParent.appendChild(elem);
    }

    if (this.debugWithConsole) {
      // eslint-disable-next-line no-console
      console.dirxml(elem);
    }
  };

  /**
   * Select protocol based on the connections options or service
   */
  createProtocolManager(): ProtocolManager {
    const shouldBeBosh = !(this.service.startsWith('ws:') || this.service.startsWith('wss:'));
    if (shouldBeBosh) {
      return new Bosh(this, this.boshOptions, this.prebindUrl, this.connectionStatusChangedSubject);
    }

    if (this.protocolManager instanceof StropheWebsocket) {
      return this.protocolManager;
    }

    return new StropheWebsocket(this, this.stanzasInSubject, this.connectionStatusChangedSubject);
  }

  /**
   *  Reset the connection.
   *
   *  This function should be called after a connection is disconnected
   *  before that connection is reused.
   */
  reset(): void {
    if (this.protocolManager instanceof Bosh) {
      this.protocolManager.removeSessionData();
    }

    // SASL
    this.sasl.doSession = false;
    this.sasl.doBind = false;

    this.handlerService.resetHandlers();

    this.onOfflineSubject.next();
    this.connected = false;
    this.disconnecting = false;
  }

  /**
   *  Starts the connection process.
   *
   *  As the connection process proceeds, the connectionStatus$ emits the different status.
   *
   *  The status code will be one of the values in the Status constants.
   *  The error condition will be one of the conditions defined in RFC 3920 or the condition 'strophe-parsererror'.
   *
   *  @param jid - The user's JID.  This may be a bare JID,
   *      or a full JID.  If a node is not supplied, SASL ANONYMOUS
   *      authentication will be attempted.
   *  @param pass - The user's password.
   *  @param authcid - The optional alternative authentication identity
   *      (username) if intending to impersonate another user.
   *      When using the SASL-EXTERNAL authentication mechanism, for example
   *      with client certificates, then the authcid value is used to
   *      determine whether an authorization JID (authzid) should be sent to
   *      the server. The authzid should NOT be sent to the server if the
   *      authzid and authcid are the same. So to prevent it from being sent
   *      (for example when the JID is already contained in the client
   *      certificate), set authcid to that same JID. See XEP-178 for more
   *      details.
   *  @param [disconnectionTimeout=3000] - The optional disconnection timeout in milliseconds before doDisconnect will be called.
   */
  async connect(
    jid: string,
    pass?: string,
    authcid?: string,
    disconnectionTimeout?: number
  ): Promise<void> {
    this.userJidSubject.next(jid);

    this.sasl.setVariables(jid, pass, authcid);

    this.disconnecting = false;
    this.connected = false;
    // this.onAuthenticatingSubject.next(false);
    this.disconnectionTimeout = disconnectionTimeout;

    // parse jid for domain
    this.domain = getDomainFromJid(jid) ?? undefined;

    await this.protocolManager.connect();
  }

  /**
   *  Starts the connection process.
   *
   *  As the connection process proceeds, the connectionStatus$ emits the different status.
   *
   *  The status code will be one of the values in the Status constants.
   *  The error condition will be one of the conditions defined in RFC 3920 or the condition 'strophe-parsererror'.
   *
   *  @param domain - The domain to connect to.
   *  @param [disconnectionTimeout=3000] - The optional disconnection timeout in milliseconds before doDisconnect will be called.
   */
  async connectAnonymous(domain: string, disconnectionTimeout = 3000): Promise<void> {
    this.disconnecting = false;
    this.connected = false;

    this.disconnectionTimeout = disconnectionTimeout;

    this.domain = domain;

    await this.protocolManager.connect(true);
  }

  /**
   *  Immediately send any pending outgoing data.
   *
   *  Normally send() queues outgoing data until the next idle period
   *  (100ms), which optimizes network use in the common cases when
   *  several send()s are called in succession. flush() can be used to
   *  immediately send all pending data.
   */
  flush(): void {
    // cancel the pending idle period and run the idle function
    // immediately
    clearTimeout(this.idleTimeout);
    this.onIdle();
  }

  /**
   *  Send a stanza.
   *
   *  This function is called to push data onto the send queue to
   *  go out over the wire.  Whenever a request is sent to the BOSH
   *  server, all pending data is sent and the queue is flushed.
   *
   *  Parameters:
   *
   *  @param elem - The stanza to send.
   */
  send(elem: Element | Builder): void {
    if (!(elem instanceof Element)) {
      return this.protocolManager.send(elem.tree());
    }

    return this.protocolManager.send(elem);
  }

  /**
   *  Helper function to send presence stanzas. The main benefit is for
   *  sending presence stanzas for which you expect a responding presence
   *  stanza with the same id (for example when leaving a chat room).
   *
   *  Parameters:
   *
   *    @param el - The stanza to send.
   *    @param timeout - The time specified in milliseconds for a
   *      timeout to occur.
   *
   *  Returns:
   *    @returns The id used to send the presence.
   */
  async sendPresence(el: Element | Builder, timeout?: number): Promise<Element> {
    const elem = el instanceof Element ? el : el.tree();

    const id = ensureHasId(elem, 'sendPresence');

    this.send(elem);
    return this.createStanzaResponsePromise(id, timeout);
  }

  /**
   *  Helper function to send IQ stanzas.
   *
   *  Parameters:
   *
   *    @param el - T XMLElement ashe stanza to send.
   *    @param timeout - The time specified in milliseconds for a
   *      timeout to occur.
   *
   *  Returns:
   *    @returns The id used to send the IQ.
   */
  async sendIQ(el: Element | Builder, timeout?: number): Promise<Element> {
    const elem = el instanceof Element ? el : el.tree();

    const id = ensureHasId(elem, 'sendIQ');

    this.send(elem);
    return this.createStanzaResponsePromise(id, timeout);
  }

  private createStanzaResponsePromise(id: string, timeout?: number): Promise<Element> {
    let timeoutHandler: ReturnType<typeof setTimeout>;

    return new Promise<Element>((callback, err) => {
      const handler = this.handlerService.addHandler(
        (stanza) => {
          // remove timeout handler if there is one
          if (timeoutHandler) {
            clearTimeout(timeoutHandler);
          }
          if (stanza.getAttribute('type') === 'error') {
            err(stanza.outerHTML);
          } else {
            callback(stanza);
          }
          return false;
        },
        undefined,
        undefined,
        undefined,
        id
      );

      // if timeout specified, set up a timeout handler.
      if (timeout) {
        timeoutHandler = setTimeout(() => {
          // get rid of normal handler
          this.handlerService.deleteHandler(handler);
          // call err back on timeout with null stanza
          err(null);
          return false;
        }, timeout);
      }
    });
  }

  /**
   *  Start the graceful disconnection process.
   *
   *  This function starts the disconnection process.  This process starts
   *  by sending unavailable presence and sending BOSH body of type
   *  terminate.  A timeout handler makes sure that disconnection happens
   *  even if the BOSH server does not respond.
   *  If the Connection object isn't connected, at least tries to abort all pending requests
   *  so the connection object won't generate successful requests (which were already opened).
   *
   *  The user supplied connection callback will be notified of the
   *  progress as this process happens.
   */
  async disconnect(): Promise<void> {
    info('Disconnect was called');
    if (!this.connected) {
      warn('Disconnect was called before Strophe connected to the server');
      if (this.protocolManager instanceof Bosh) {
        this.protocolManager.abortAllRequests();
      }
      this.disconnectFinally();
      return;
    }

    // setup timeout handler
    const timeOut = this.disconnectionTimeout ?? 3000;
    this.disconnectTimeout = setTimeout(() => {
      this.onDisconnectTimeout();
    }, timeOut);
    this.disconnecting = true;
    await this.protocolManager.disconnect(this.authenticated);
  }

  /**
   *
   *  This is the last piece of the disconnection logic.  This resets the
   *  connection and alerts the user's connection callback.
   */
  disconnectFinally(reason?: string): void {
    clearTimeout(this.idleTimeout);

    // Cancel Disconnect Timeout
    if (this.disconnectTimeout != null) {
      clearTimeout(this.disconnectTimeout);
      this.disconnectTimeout = undefined;
    }

    this.disconnecting = false;

    // tell the parent we disconnected
    this.connectionStatusChangedSubject.next({ status: Status.DISCONNECTED, reason });
    this.connected = false;

    // Properly tear down the session so that it's possible to manually connect again.
    log(LogLevel.DEBUG, 'DISCONNECTED');
    this.reset();
    this.clearSession();

    this.onOfflineSubject.next();
  }

  /**
   *  timeout handler for handling non-graceful disconnection.
   *
   *  If the graceful disconnect process does not complete within the
   *  time allotted, this handler finishes the disconnect anyway.
   *
   *  Returns:
   *    false to remove the handler.
   */
  onDisconnectTimeout(): false {
    this.connectionStatusChangedSubject.next({ status: Status.CONNTIMEOUT });
    if (this.protocolManager instanceof Bosh) {
      this.protocolManager.onDisconnectTimeout();
    }
    // actually disconnect
    this.disconnectFinally();
    return false;
  }

  /**
   * Set up authentication
   *
   *  Continues the initial connection request by setting up authentication
   *  handlers and starting the authentication process.
   *
   *  SASL authentication will be attempted if available, otherwise
   *  the code will fall back to legacy authentication.
   *
   *  Parameters:
   *
   *    @param matched - Array of SASL mechanisms supported.
   *
   */
  async authenticate(matched: SASLMechanism[]): Promise<void> {
    const saslAuth = await this.sasl.attemptSASLAuth(matched);
    if (saslAuth) {
      return;
    }

    await this.attemptLegacyAuth();
  }

  /**
   *  Attempt legacy (i.e. non-SASL) authentication.
   */
  async attemptLegacyAuth(): Promise<void> {
    if (this.jid && getNodeFromJid(this.jid) === null) {
      // we don't have a node, which is required for non-anonymous
      // client connections
      this.connectionStatusChangedSubject.next({
        status: Status.CONNFAIL,
        reason: ErrorCondition.MISSING_JID_NODE,
      });
      await this.disconnect();
      throw new Error(ErrorCondition.MISSING_JID_NODE);
    }

    if (!this.jid) {
      throw new Error(
        `Jid was undefined when attempting legacy auth; connection.attemptLegacyAuth this.jid is undefined`
      );
    }

    // Fall back to legacy authentication
    this.connectionStatusChangedSubject.next({ status: Status.AUTHENTICATING });
    this.handlerService.addSysHandler(
      () => this.onLegacyAuthIQResult(this.jid as string),
      undefined,
      undefined,
      undefined,
      '_auth_1'
    );

    if (!this.domain) {
      throw new Error(
        `Domain was undefined when attempting legacy auth; connection.attemptLegacyAuth this.domain undefined`
      );
    }

    this.send(
      $iq({
        type: 'get',
        to: this.domain,
        id: '_auth_1',
      })
        .c('query', { xmlns: NS.AUTH })
        .c('username', {})
        .t(getNodeFromJid(this.jid))
        .tree()
    );
  }

  /**
   *  handler for legacy authentication.
   *
   *  This handler is called in response to the initial <iq type='get'/>
   *  for legacy authentication.  It builds an authentication <iq/> and
   *  sends it, creating a handler (calling back to _auth2_cb()) to
   *  handle the result
   *
   *   @returns false to remove the handler.
   */
  onLegacyAuthIQResult(jid: string): false {
    // build plaintext auth iq
    const iq = $iq({ type: 'set', id: '_auth_2' })
      .c('query', { xmlns: NS.AUTH })
      .c('username', {})
      .t(getNodeFromJid(jid))
      .up()
      .c('password')
      .t(this.sasl.pass as string);

    if (!getResourceFromJid(jid)) {
      // since the user has not supplied a resource, we pick
      // a default one here.  unlike other auth methods, the server
      // cannot do this for us.
      this.jid = getBareJidFromJid(jid) ?? '' + '/strophe';
    }
    iq.up()
      .c('resource', {})
      .t(getResourceFromJid(this.jid as string) as string);

    this.handlerService.addSysHandler(
      (element) => this.auth2Callback(element),
      undefined,
      undefined,
      undefined,
      '_auth_2'
    );
    this.send(iq.tree());
    return false;
  }

  /**
   *
   *  Sends an IQ to the XMPP server to bind a JID resource for this session.
   *
   *  https://tools.ietf.org/html/rfc6120#section-7.5
   *
   *  If `explicitResourceBinding` was set to a truthy value in the options
   *  passed to the Connection constructor, then this function needs
   *  to be called explicitly by the client author.
   *
   *  Otherwise, it'll be called automatically as soon as the XMPP server
   *  advertises the "urn:ietf:params:xml:ns:xmpp-bind" stream feature.
   */
  bind(resolve: (value: PromiseLike<void> | void) => void): void {
    if (!this.sasl.doBind) {
      return;
    }

    this.handlerService.addSysHandler(
      (element) => this.onResourceBindResultIQ(element, resolve),
      undefined,
      undefined,
      undefined,
      '_bind_auth_2'
    );

    const sendWithoutResource: () => void = () =>
      this.send($iq({ type: 'set', id: '_bind_auth_2' }).c('bind', { xmlns: NS.BIND }).tree());

    if (!this.jid) {
      sendWithoutResource();
      return;
    }

    const resource = getResourceFromJid(this.jid);

    if (!resource) {
      sendWithoutResource();
      return;
    }

    this.send(
      $iq({ type: 'set', id: '_bind_auth_2' })
        .c('bind', { xmlns: NS.BIND })
        .c('resource', {})
        .t(resource)
        .tree()
    );
  }

  /**
   *  Handler for binding result and session start.
   *
   *    @param elem - The matching stanza.
   *
   *    @param resolve
   *    @returns false to remove the handler.
   */
  onResourceBindResultIQ(
    elem: Element,
    resolve: (value: PromiseLike<void> | void) => void
  ): boolean {
    if (elem.getAttribute('type') === 'error') {
      warn('Resource binding failed.');
      const conflict = elem.getElementsByTagName('conflict');
      let reason;
      if (conflict.length > 0) {
        reason = ErrorCondition.CONFLICT;
      }
      resolve();
      void this.disconnect();
      this.connectionStatusChangedSubject.next({ status: Status.AUTHFAIL, reason, elem });
      return false;
    }
    const bind = elem.getElementsByTagName('bind');
    if (bind[0]) {
      const jidNode = bind[0].getElementsByTagName('jid');
      if (jidNode[0]) {
        this.authenticated = true;
        this.jid = getText(jidNode[0]);
        if (this.sasl.doSession) {
          this.establishSession();
        } else {
          this.connectionStatusChangedSubject.next({ status: Status.CONNECTED });
        }
      }
      resolve();
      return true;
    } else {
      warn('Resource binding failed.');
      void this.disconnect();
      this.connectionStatusChangedSubject.next({ status: Status.AUTHFAIL, elem });
      resolve();
      return false;
    }
  }

  /**
   *  Send IQ request to establish a session with the XMPP server.
   *
   *  See https://xmpp.org/rfcs/rfc3921.html#session
   *
   *  Note: The protocol for session establishment has been determined as
   *  unnecessary and removed in RFC-6121.
   */
  establishSession(): void {
    if (!this.sasl.doSession) {
      throw new Error(
        `Strophe.Connection.prototype._establishSession ` +
          `called but apparently ${NS.SESSION} wasn't advertised by the server`
      );
    }
    this.handlerService.addSysHandler(
      (element) => this.onSessionResultIQ(element),
      undefined,
      undefined,
      undefined,
      '_session_auth_2'
    );

    this.send(
      $iq({ type: 'set', id: '_session_auth_2' }).c('session', { xmlns: NS.SESSION }).tree()
    );
  }

  /**
   *  Handler for the server's IQ response to a client's session request.
   *
   *  This sets Authenticated to true on success, which starts the processing of user handlers.
   *
   *  See https://xmpp.org/rfcs/rfc3921.html#session
   *
   *  Note: The protocol for session establishment has been determined as unnecessary and removed in RFC-6121.
   *
   * @param elem - The matching stanza.
   *
   * @returns false to remove the handler.
   */
  onSessionResultIQ(elem: Element): false {
    const type = elem.getAttribute('type');
    if (type === 'result') {
      this.authenticated = true;
      this.connectionStatusChangedSubject.next({ status: Status.CONNECTED });
    } else if (type === 'error') {
      // this.onAuthenticatingSubject.next(false);
      warn('Session creation failed.');
      void this.disconnect();
      this.connectionStatusChangedSubject.next({ status: Status.AUTHFAIL, elem });
    }
    return false;
  }

  /**
   * Finish legacy authentication.
   * This handler is called when the result from the jabber:iq:auth <iq/> stanza is returned.
   *
   * @param elem - The stanza that triggered the callback.
   *
   * @returns false to remove the handler.
   */
  auth2Callback(elem: Element): false {
    const elemType = elem.getAttribute('type');
    if (elemType === 'result') {
      this.authenticated = true;
      this.connectionStatusChangedSubject.next({ status: Status.CONNECTED });
    } else if (elemType === 'error') {
      void this.disconnect();
      throw new Error('authentication failed; elem=' + elem.outerHTML);
    }
    return false;
  }

  /**
   *  helper function that makes sure plugins and the user's callback are notified of connection status changes.
   *
   *    @param status - the new connection status, one of the values in Status
   *    @param reason - the error condition or null
   *    @param elem - The triggering stanza.
   */
  changeConnectStatus(status: number, reason?: string, elem?: Element): void {
    this.connectionStatusChangedSubject.next({ status, reason, elem });
  }

  /**
   *  handler to processes incoming data from the BOSH connection.
   *
   *  Except for connectCb handling the initial connection request,
   *  this function handles the incoming data for all requests.  This
   *  function also fires stanza handlers that match each incoming
   *  stanza.
   *
   *  Parameters:
   *
   *    @param bosh - The bosh connection.
   *    @param req - The request that has data ready.
   */
  async dataReceivedBOSH(bosh: Bosh, req: BoshRequest): Promise<void> {
    const elem: Element = bosh.reqToData(req);
    await this.dataReceived(elem, this.disconnecting && bosh.emptyQueue());
  }

  /**
   *  handler to processes incoming data from the connection.
   *
   *  Except for _connect_cb handling the initial connection request,
   *  this function handles the incoming data for all requests.  This
   *  function also fires stanza handlers that match each incoming
   *  stanza.
   *
   *  Parameters:
   *
   *    @param elem - The request that has data ready.
   */
  async dataReceivedWebsocket(elem: Element): Promise<void> {
    await this.dataReceived(elem, this.disconnecting);
  }

  private async dataReceived(elem: Element, handleDisconnect: boolean): Promise<void> {
    if (elem == null) {
      return;
    }

    this.xmlInput?.(elem);
    this.stanzasInSubject.next(elem);

    this.handlerService.removeScheduledHandlers();
    this.handlerService.addScheduledHandlers();

    // handle graceful disconnect
    if (handleDisconnect) {
      this.disconnectFinally();
      return;
    }

    if (elem.getAttribute('type') !== 'terminate') {
      // send each incoming stanza through the handler chain
      await this.handlerService.checkHandlerChain(elem);
      return;
    }

    // an error occurred
    const reason = elem.getAttribute('condition') ?? ErrorCondition.UNKNOWN_REASON;
    const conflict = elem.getElementsByTagName('conflict');
    this.connectionStatusChangedSubject.next({
      status: Status.CONNFAIL,
      reason: reason === 'remote-stream-error' && conflict.length > 0 ? 'conflict' : reason,
    });
    this.disconnectFinally(reason);
  }

  /**
   *  handler to process events during idle cycle.
   *
   *  This handler is called every 100ms to fire timed handlers that
   *  are ready and keep poll requests going.
   */
  onIdle(): void {
    // pollutes the angularZone and currently not in use.
    // clearTimeout(this.idleTimeout);
    // if (this.protocolManager instanceof Bosh) {
    //   this.protocolManager.onIdle();
    // }
    //
    // if (!this.connected) {
    //   return;
    // }
    // // reactivate the timer only if connected
    // this.idleTimeout = setTimeout(() => this.onIdle(), 100);
  }

  static async create(
    domain: string,
    service?: string,
    saslMechanisms?: string[],
    authenticationMode = AuthenticationMode.LOGIN,
    prebindUrl?: string,
    credentialsUrl?: string
  ): Promise<Connection> {
    const { boshServiceUrl, websocketUrl } = await getConnectionsUrls(domain, service);
    const options = { explicitResourceBinding: true };
    const boshOptions = { keepalive: true };

    if (!boshServiceUrl && authenticationMode === AuthenticationMode.PREBIND) {
      throw new Error("authentication is set to 'prebind' but we don't have a BOSH connection");
    }

    const connection = new Connection(
      (websocketUrl ?? boshServiceUrl) as string,
      options,
      boshOptions,
      authenticationMode,
      prebindUrl,
      boshServiceUrl,
      websocketUrl,
      credentialsUrl
    );

    connection.sasl.registerSASLMechanisms(saslMechanisms);
    return connection;
  }

  /**
   * Logs the user in.
   *
   * If called without any parameters, we will try to log the user in by calling the `prebind_url` or `credentials_url` depending
   * on whether prebinding is used or not.
   *
   * @param [jid]
   * @param [password?]
   */
  async login(jid: string, password?: string): Promise<void> {
    this.userJidSubject.next(jid);
    // See whether there is a BOSH session to re-attach to
    if (this.protocolManager instanceof Bosh && this.protocolManager.restoreBOSHSession(jid)) {
      return;
    }

    const handlePreBind =
      this.authenticationMode === AuthenticationMode.PREBIND && !!this.prebindUrl;
    if (this.protocolManager instanceof Bosh && handlePreBind) {
      return this.protocolManager.startNewPreboundBOSHSession();
    }

    await this.attemptNewSession(this.authenticationMode, jid, password);
  }

  async attemptNewSession(mode: AuthenticationMode, jid: string, password?: string): Promise<void> {
    if ([AuthenticationMode.ANONYMOUS, AuthenticationMode.EXTERNAL].includes(mode)) {
      await this.connect(jid);
      return;
    }

    if (mode !== AuthenticationMode.LOGIN) {
      throw new Error('Invalid mode for new session authentication');
    }

    if (!password) {
      // We give credentials_url preference, because connection.pass might be an expired token.
      const credentials = await this.getLoginCredentials();
      password = credentials?.password;
      jid = credentials?.jid ?? jid;
    }

    // XXX: If EITHER ``keepalive`` or ``auto_login`` is ``true`` and
    // ``authentication`` is set to ``login``, then Converse will try to log the user in,
    // since we don't have a way to distinguish between whether we're
    // restoring a previous session (``keepalive``) or whether we're
    // automatically setting up a new session (``auto_login``).
    // So we can't do the check (!automatic || _converse.api.settings.get("auto_login")) here.
    password = password ?? (this.sasl.pass as string) ?? this.password;

    if (jid == null || password == null) {
      await this.disconnect();
      throw new Error('New session attempt failed');
    }

    await this.connect(jid, password);
  }

  async getLoginCredentialsFromBrowser(): Promise<{ password: string; jid: string } | null> {
    try {
      // https://github.com/microsoft/TypeScript/issues/34550
      const creds = await navigator.credentials.get({ password: true } as CredentialRequestOptions);

      if (creds?.type !== 'password' || !isValidJID(creds.id)) {
        return null;
      }

      this.userJidSubject.next(creds.id);
      return { jid: creds.id, password: creds['password'] as string };
    } catch (e) {
      log(LogLevel.ERROR, (e as Error).toString());
    }
    return null;
  }

  async getLoginCredentials(): Promise<Credentials | null> {
    if ('credentials' in navigator) {
      return this.getLoginCredentialsFromBrowser();
    }
    return null;
  }

  /**
   * Switch to a different transport if a service URL is available for it.
   *
   * When reconnecting with a new transport, we call setUserJID
   * so that a new resource is generated, to avoid multiple
   * server-side sessions with the same resource.
   *
   * We also call `_proto._doDisconnect` so that connection event handlers
   * for the old transport are removed.
   */
  switchTransport(): void {
    this.disconnectFinally();
    if (this.protocolManager instanceof StropheWebsocket && this.boshServiceUrl) {
      this.service = this.boshServiceUrl;
    } else if (this.protocolManager instanceof Bosh && this.websocketUrl) {
      this.service = this.websocketUrl;
    }
    this.protocolManager = this.createProtocolManager();
  }

  async logOut(): Promise<void> {
    await this.disconnect();
  }

  readonly nsRegister = 'jabber:iq:register';

  /**
   * Promise resolves if user account is registered successfully, rejects if an error happens while registering,
   * e.g. the username is already taken.
   */
  async register(jid: string, password: string, domain: string): Promise<void> {
    const onOnlinePromise = firstValueFrom(this.onOnline$);
    const onAuthenticatingPromise = firstValueFrom(this.onAuthenticating$);
    const bareUsername = jid.includes('@') ? (jid.split('@')[0] as string) : jid;
    const safeJid = bareUsername + '@' + domain;
    // anonymous connection
    await this.connectAnonymous(domain);
    await onAuthenticatingPromise;
    const registerFormStanza = await this.sendIQ(
      $iq({ type: 'get' }).c('query', { xmlns: this.nsRegister }).tree()
    );

    // send a get request for registration, to get all required data fields
    const query = registerFormStanza.getElementsByTagName('query');

    if (query.length !== 1) {
      throw new Error('Registration failed, did not get a register form');
    }

    await this.sendIQ(
      $iq({ type: 'set' })
        .c('query', { xmlns: this.nsRegister })
        .c('username', {}, bareUsername)
        .c('password', {}, password)
        .tree()
    );

    await this.logOut();
    await this.login(safeJid, password);
    await onOnlinePromise;
    this.userJidSubject.next(safeJid);
  }

  async unregister(): Promise<void> {
    this.protocolManager.send(presenceUnavailable());
    await this.sendIQ(
      $iq({ type: 'set' }).c('query', { xmlns: this.nsRegister }).c('remove').tree()
    );
    this.authenticated = false;
    this.disconnecting = true;
    this.protocolManager.disconnectFinally();
  }

  clearSession(): void {
    this.protocolManager = this.createProtocolManager();
  }
}
