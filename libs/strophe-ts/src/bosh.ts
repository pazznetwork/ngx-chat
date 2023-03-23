// SPDX-License-Identifier: MIT
import type { Connection } from './connection';
import { NS } from './stanza/namespace';
import { BoshRequest } from './bosh-request';
import { $build, $pres } from './stanza/builder-helper';
import { getBareJidFromJid, getDomainFromJid, getNodeFromJid } from './stanza/xml';
import { debug, error, warn } from './log';
import { Status } from './status';
import { SECONDARY_TIMEOUT, TIMEOUT } from './timeout.const';
import type { ProtocolManager } from './protocol-manager';
import { filter, firstValueFrom, share, Subject, switchMap, takeUntil } from 'rxjs';
import type { Builder } from './stanza/builder';
import type { BoshOptions } from './bosh-options';

/**
 *  The Bosh class is used internally by the Connection class to encapsulate BOSH sessions.
 */
export class Bosh implements ProtocolManager {
  /***
   * First request id for XML request elements.
   * The rid will be incremented with each request until the connection resets.
   * An incrementation range check is used to ensure a limit of parallel requests.
   */
  rid = this.getRandomIdForConnection();
  private sid: null | string = null;

  /**
   * This is the time the server will wait before returning an empty result for a request.
   * The default setting of 60 seconds is recommended.
   */
  wait = 60;

  /**
   * This is the amount of allowed parallel request being processed. The default is 5.
   */
  limit = 5;

  // Max retries before disconnecting
  maxRetries = 5;

  private readonly requests: BoshRequest[];

  private readonly destroySubject = new Subject<void>();
  private readonly destroy$ = this.destroySubject.pipe(share());

  private readonly notAbleToResumeBOSHSessionSubject = new Subject<void>();
  readonly notAbleToResumeBOSHSession$ = this.notAbleToResumeBOSHSessionSubject.asObservable();

  jid?: string;

  data?: Element[] = [];

  get primaryTimeout(): number {
    return Math.floor(TIMEOUT * this.wait);
  }

  get secondaryTimeout(): number {
    return Math.floor(SECONDARY_TIMEOUT * this.wait);
  }

  /**
   *  Create and initialize a Strophe.Bosh object.
   *
   *  Parameters:
   *
   *    @param connection connection - The Strophe.Connection that will use BOSH.
   *    @param boshOptions
   *    @param prebindUrl optional for prebinding the connection to speed up the bosh handshake
   *    @param connectionStatusSubject to emit important connection states like Status.Connecting
   */
  constructor(
    readonly connection: Connection,
    private readonly boshOptions: BoshOptions,
    private readonly prebindUrl: string | undefined,
    private readonly connectionStatusSubject: Subject<{
      status: Status;
      reason?: string;
      elem?: Element;
    }>
  ) {
    this.connection.onOnline$
      .pipe(
        switchMap(() => this.connection.userJid$),
        filter(() => !!boshOptions?.keepalive),
        takeUntil(this.destroy$)
      )
      .subscribe((jid) => {
        if (boshOptions.keepalive && this.rid && this.sid) {
          window.sessionStorage.setItem(
            'strophe-bosh-session',
            JSON.stringify({
              jid,
              rid: this.rid,
              sid: this.sid,
            })
          );
        } else {
          window.sessionStorage.removeItem('strophe-bosh-session');
        }
      });

    /* The current session ID. */
    this.sid = null;

    this.requests = [];
  }

  getRandomIdForConnection(): number {
    return Math.floor(Math.random() * 4294967295);
  }

  /**
   *  function that initializes the BOSH connection.
   *
   *  Creates and sends the Request that initializes the BOSH connection.
   *  No Route:Design:1.1
   */
  async connect(skipAuthentication = false): Promise<void> {
    if (!this.connection.domain) {
      throw new Error('Connecting impossible without domain configuration');
    }
    const body = this.buildBody().attrs({
      to: this.connection.domain,
      'xml:lang': 'en',
      wait: this.wait.toString(10),
      hold: '1',
      content: 'text/xml; charset=utf-8',
      ver: '1.6',
      'xmpp:version': '1.0',
      'xmlns:xmpp': NS.BOSH,
    });

    await new Promise<void>((resolve) => {
      this.requests.push(
        new BoshRequest(
          body.tree(),
          (req) => {
            this.onRequestStateChange(
              (requestElement) =>
                this.connection.connectCallbackBosh(this, requestElement, skipAuthentication),
              req
            );
            resolve();
          },
          Number.parseInt(body.tree().getAttribute('rid') as string, 10)
        )
      );
      this.throttledRequestHandler();
      this.connectionStatusSubject.next({ status: Status.CONNECTING });
    });
  }

  /**
   *  helper function to generate the <body/> wrapper for BOSH.
   *
   *  @returns  A Builder containing a <body/> element.
   */
  buildBody(): Builder {
    const bodyWrap = $build('body', {
      rid: (this.rid++).toString(),
      xmlns: NS.HTTPBIND,
    });
    if (this.sid != null) {
      bodyWrap.attrs({ sid: this.sid });
    }
    return bodyWrap;
  }

  /**
   *  Reset the connection.
   *
   *  This function is called by the reset function of the Strophe Connection
   */
  removeSessionData(): void {
    this.data = [];
    this.rid = this.getRandomIdForConnection();
    this.sid = null;
    globalThis.sessionStorage.removeItem('strophe-bosh-session');
  }

  /**
   *  Attach to an already created and authenticated BOSH session.
   *
   *  This function is provided to allow Strophe to attach to BOSH
   *  sessions which have been created externally, perhaps by a Web
   *  application.  This is often used to support auto-login type features
   *  without putting user credentials into the page.
   *
   *  Parameters:
   *
   *    @param jid - The full JID that is bound by the session.
   *    @param sid - The SID of the BOSH session.
   *    @param rid - The current RID of the BOSH session.  This RID
   *      will be used by the next request.
   */
  attach(jid: string, sid: string, rid: number): void {
    this.connection.jid = jid;
    this.sid = sid;
    this.rid = rid;

    this.connection.domain = getDomainFromJid(this.connection.jid) ?? undefined;
    this.connection.authenticated = true;
    this.connection.connected = true;

    this.connection.changeConnectStatus(Status.ATTACHED);
  }

  /**
   *
   * Attempt to restore a cached BOSH session.
   *
   * This function is only useful in conjunction with providing the
   * “keepalive”:true option when instantiating a new Connection.
   * When “keepalive” is set to true, Strophe will cache the BOSH tokens
   * RID (Request ID) and SID (Session ID) and then when this function is called,
   * it will attempt to restore the session from those cached tokens.
   * This function must therefore be called instead of connect or attach.
   *
   *    @param jid - The user’s JID.  This may be a bare JID or a full JID.
   */
  restore(jid: string): void {
    const stored = window.sessionStorage.getItem('strophe-bosh-session');
    if (!stored) {
      return;
    }

    const session = JSON.parse(stored) as { rid: string; sid: string; jid: string };
    if (
      !(session?.rid && session?.sid && session?.jid) ||
      !(
        jid == null ||
        getBareJidFromJid(session.jid) === getBareJidFromJid(jid) ||
        // If authcid is null, then it's an anonymous login, so
        // we compare only the domains:
        (getNodeFromJid(jid) == null && getDomainFromJid(session.jid) === jid)
      )
    ) {
      throw new Error('restore: no session that can be restored.');
    }

    this.attach(session.jid, session.sid, Number.parseInt(session.rid, 10));
  }

  /**
   *  This handler is used to process the Bosh-part of the initial request.
   *
   *   @param bodyWrap - The received stanza.
   *
   *   @returns Status
   */
  connectionStatusCheck(bodyWrap: Element): Status.CONNECTED | Status.CONNFAIL {
    if (bodyWrap.getAttribute('type') !== 'terminate') {
      return Status.CONNECTED;
    }

    // an error occurred
    const cond = bodyWrap.getAttribute('condition') ?? 'unknown condition';
    error(`BOSH-Connection failed: ${cond}`);
    this.connection.changeConnectStatus(Status.CONNFAIL, cond ?? 'unknown');

    return Status.CONNFAIL;
  }

  disconnect(authenticated: boolean): Promise<void> {
    /**
     *  Sends the initial disconnect sequence.
     *
     *  This is the first step in a graceful disconnect.  It sends
     *  the BOSH server a terminated body and includes an unavailable
     *  presence if authentication has completed.
     */
    debug('sendTerminate was called');
    const body = this.buildBody().attrs({ type: 'terminate' });
    if (authenticated) {
      body.cnode(
        $pres({
          xmlns: NS.CLIENT,
          type: 'unavailable',
        }).tree()
      );
    }
    const req = new BoshRequest(
      body.tree(),
      (innerReq) =>
        this.onRequestStateChange(
          (innerInnerReq) => void this.connection.dataReceivedBOSH(this, innerInnerReq),
          innerReq
        ),
      Number.parseInt(body.tree().getAttribute('rid') as string, 10)
    );
    this.requests.push(req);
    this.throttledRequestHandler();
    return Promise.resolve();
  }

  /**
   *  function to disconnect.
   *
   *  Resets the SID and RID.
   */
  disconnectFinally(): void {
    this.removeSessionData();
    this.connection.disconnectFinally();
  }

  /**
   * function to check if the Request queue is empty.
   *
   *  @returns true, if there are no Requests queued, False otherwise.
   */
  emptyQueue(): boolean {
    return this.requests.length === 0;
  }

  /**
   * Called on stream start/restart when no stream:features
   * has been received and sends a blank poll request.
   */
  noAuthReceived(): void {
    warn(
      'Server did not yet offer a supported authentication ' +
        'mechanism. Sending a blank poll request.'
    );
    const body = this.buildBody();
    const rid = Number.parseInt(body.tree().getAttribute('rid') as string, 10);
    this.requests.push(
      new BoshRequest(
        body.tree(),
        (req) => this.connection.connectCallbackBosh(this, req, false),
        rid
      )
    );
    this.throttledRequestHandler();
  }

  /**
   *  timeout handler for handling non-graceful disconnection.
   *
   *  Cancels all remaining Requests and clears the queue.
   */
  onDisconnectTimeout(): void {
    this.abortAllRequests();
  }

  /**
   *  helper function that makes sure all pending requests are aborted.
   */
  abortAllRequests(): void {
    while (this.requests.length > 0) {
      const req = this.requests.pop() as BoshRequest;
      req.abort = true;
      req.xhr.abort();
      req.xhr.onreadystatechange = () => void {};
    }
  }

  /**
   *  handler called by Strophe.Connection._onIdle
   *
   *  Sends all queued Requests or polls with empty Request if there are none.
   */
  onIdle(): void {
    if (!this.connection.domain) {
      throw new Error(
        `can not run bosh.onIdle without connection domain; this.connection.domain=${
          this.connection.domain ?? 'no domain'
        }`
      );
    }
    if (
      this.connection.authenticated &&
      this.requests.length === 0 &&
      this.data &&
      this.data.length === 0 &&
      !this.connection.disconnecting
    ) {
      // if no requests are in progress, poll
      debug('no requests during idle cycle, sending blank request');
      this.data.push(new Element());
    }

    if (this.requests.length < 2 && this.data && this.data.length > 0) {
      const body = this.buildBody();
      for (const dataPart of this.data) {
        if (dataPart !== null && dataPart.tagName !== 'restart') {
          body.cnode(dataPart).up();
          continue;
        }
        body.attrs({
          to: this.connection.domain,
          'xml:lang': 'en',
          'xmpp:restart': 'true',
          'xmlns:xmpp': NS.BOSH,
        });
      }
      delete this.data;
      this.data = [];
      this.requests.push(
        new BoshRequest(
          body.tree(),
          (req) =>
            this.onRequestStateChange(
              (innerReq) => void this.connection.dataReceivedBOSH(this, innerReq),
              req
            ),
          Number.parseInt(body.tree().getAttribute('rid') as string, 10)
        )
      );
      this.throttledRequestHandler();
    }

    const firstReq = this.requests[0];
    if (!firstReq) {
      return;
    }

    if (firstReq.dead && firstReq.timeDead > this.secondaryTimeout) {
      this.throttledRequestHandler();
    }
    if (firstReq.age > this.primaryTimeout) {
      warn(
        `Request ${firstReq.rid} timed out, over ${this.primaryTimeout} seconds since last activity`
      );
      this.throttledRequestHandler();
    }
  }

  /**
   *  handler for Strophe.Request state changes.
   *
   *  This function is called when the XMLHttpRequest readyState changes.
   *  It contains a lot of error handling logic for the many ways that
   *  requests can fail, and calls the request callback when requests
   *  succeed.
   *
   *  Parameters:
   *
   *    @param func - The handler for the request.
   *    @param req - The request that is changing readyState.
   */
  onRequestStateChange(func: (req: BoshRequest) => void, req: BoshRequest): void {
    debug(`request id ${req.rid}.${req.sends} state changed to ${req.xhr.readyState}`);
    if (req.abort) {
      req.abort = false;
      return;
    }
    if (req.xhr.readyState !== 4) {
      // The request is not yet complete
      return;
    }
    const reqStatus = req.getRequestStatus();
    if (this.connection.disconnecting && reqStatus >= 400) {
      // TODO: Check if hit error is necessary, error count for escalating error was 5
      return;
    }

    const reqIs0 = this.requests[0] === req;
    const reqIs1 = this.requests[1] === req;

    const valid_request = reqStatus > 0 && reqStatus < 500;
    const too_many_retries = req.sends > this.maxRetries;
    if (valid_request || too_many_retries) {
      // remove from internal queue
      this.removeRequest(req);
      debug(`request id ${req.rid} should now be removed`);
    }

    if (reqStatus === 200) {
      // request succeeded
      // if request 1 finished, or request 0 finished and request
      // 1 is over SECONDARY_TIMEOUT seconds old, we need to
      // restart the other - both will be in the first spot, as the
      // completed request has been removed from the queue already
      if (
        reqIs1 ||
        (reqIs0 &&
          this.requests[0] &&
          this.requests[0].age > Math.floor(SECONDARY_TIMEOUT * this.wait))
      ) {
        this.restartRequest(0);
      }
      debug(`request id ${req.rid}.${req.sends} got 200`);
      func(req); // call handler
    } else if (reqStatus === 0 || (reqStatus >= 400 && reqStatus < 600)) {
      // request failed
      error(`request id ${req.rid}.${req.sends} error ${reqStatus} happened`);
      // TODO: Check if hit error is necessary, error count for escalating error was 5
      if (reqStatus >= 400 && reqStatus < 500) {
        this.connection.changeConnectStatus(Status.DISCONNECTING);
        this.disconnectFinally();
      }
    } else {
      error(`request id ${req.rid}.${req.sends} error ${reqStatus} happened`);
    }

    if (!valid_request && !too_many_retries) {
      this.throttledRequestHandler();
    } else if (too_many_retries && !this.connection.connected) {
      this.connection.changeConnectStatus(Status.CONNFAIL, 'giving-up');
    }
  }

  /**
   *  function to process a request in the queue.
   *
   *  This function takes requests off the queue and sends them and restarts dead requests.
   *
   *  Parameters:
   *
   *   @param i - The index of the request in the queue.
   */
  processRequest(i: number): void {
    const request = this.requests[i];
    if (!request) {
      return;
    }

    // make sure we limit the number of retries
    if (request.sends > this.maxRetries) {
      this.connection.onDisconnectTimeout();
      return;
    }

    const aliveRequest = this.ensureAliveRequest(request);
    this.requests[i] = aliveRequest;

    aliveRequest.process(i, this.connection, this.boshOptions, this.primaryTimeout);
  }

  private ensureAliveRequest(request: BoshRequest): BoshRequest {
    const reqStatus = request.getRequestStatus();
    const primaryTimeout = !isNaN(request.age) && request.age > this.primaryTimeout;
    const secondaryTimeout =
      request.dead && request.timeDead > Math.floor(SECONDARY_TIMEOUT * this.wait);
    const serverError = request.xhr.readyState === 4 && (reqStatus < 1 || reqStatus >= 500);

    if (secondaryTimeout) {
      error(`Request ${this.rid} timed out (secondary), restarting`);
    }

    if (primaryTimeout || secondaryTimeout || serverError) {
      request.abort = true;
      request.xhr.abort();
      // setting to null fails on IE6, so set to empty function
      request.xhr.onreadystatechange = () => void {};
      const req = new BoshRequest(request.xmlData, request.func, this.rid);
      req.sends = request.sends;
      return req;
    }

    return request;
  }

  /**
   *  function to remove a request from the queue.
   *
   *  Parameters:
   *
   *    @param req - The request to remove.
   */
  removeRequest(req: BoshRequest): void {
    debug('removing request');
    const i = this.requests.indexOf(req);
    if (i === -1) {
      return;
    }
    this.requests.splice(i, 1);

    // IE6 fails on setting to null, so set to empty function
    req.xhr.onreadystatechange = () => void {};
    this.throttledRequestHandler();
  }

  /**
   *  function to restart a request that is presumed dead.
   *
   *  Parameters:
   *
   *    @param i - The index of the request in the queue.
   */
  restartRequest(i: number): void {
    const req = this.requests[i];
    if (!req) {
      return;
    }
    req.dead = req.dead ?? new Date().getTime();
    this.processRequest(i);
  }

  /**
   function to get a stanza out of a request.
   *
   * Tries to extract a stanza out of a Request Object.
   * When this fails the current connection will be disconnected.
   *
   *  Parameters:
   *    (Object) req - The Request.
   *
   *  Returns:
   *    The stanza that was passed.
   */
  reqToData(req: BoshRequest): Element {
    try {
      return req.getResponse();
    } catch (e) {
      if ((e as Error).message !== 'parsererror') {
        throw e;
      }
      void this.connection.disconnect();
      throw new Error('strophe-parsererror; req=' + JSON.stringify(req));
    }
  }

  /**
   * Triggers the RequestHandler to send the messages that are in the queue
   */
  send(elem: Element): void {
    if (!this.data) {
      throw new Error(
        `Data array was not set to empty array after delete; bosh.send this.data=${this.data ?? ''}`
      );
    }
    this.data.push(elem);
    clearTimeout(this.connection.idleTimeout);
    this.throttledRequestHandler();
    this.connection.idleTimeout = setTimeout(() => this.connection.onIdle(), 100);
  }

  /**
   *  Send an xmpp:restart stanza.
   */
  async openNewStream(): Promise<void> {
    this.throttledRequestHandler();
    clearTimeout(this.connection.idleTimeout);
    await firstValueFrom(
      this.connection.stanzasIn$.pipe(filter((el) => el.tagName === 'stream:features'))
    );
  }

  /**
   *  function to throttle requests to the connection window.
   *
   *  This function makes sure we don't send requests so fast that the
   *  request ids overflow the connection window in the case that one
   *  request died.
   */
  throttledRequestHandler(): void {
    if (this.requests.length === 0) {
      return;
    }

    this.processRequest(0);

    if (!this.requests[0]?.rid || !this.requests[1]?.rid) {
      return;
    }

    const parallelRequestLimitHit =
      Math.abs(this.requests[0].rid - this.requests[1].rid) > this.limit;
    if (this.requests.length > 1 && !parallelRequestLimitHit) {
      this.processRequest(1);
    }
  }

  restoreBOSHSession(jid: string): boolean {
    if (!jid) {
      return false;
    }
    this.restore(jid);
    return true;
  }

  async startNewPreboundBOSHSession(): Promise<void> {
    if (!this.prebindUrl) {
      return;
    }
    try {
      const { jid, sid, rid } = await BoshRequest.get<{ jid: string; sid: string; rid: number }>(
        this.prebindUrl
      );
      this.connection.jid = jid;
      this.attach(jid, sid, rid);
    } catch (e) {
      this.connection.clearSession();
      this.destroySubject.next();
      /**
       * Triggered when fetching prebind tokens failed
       */
      this.notAbleToResumeBOSHSessionSubject.next();
    }
  }
}
