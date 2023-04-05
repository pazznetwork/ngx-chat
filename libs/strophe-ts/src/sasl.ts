// SPDX-License-Identifier: MIT
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { SASLMechanism } from './sasl-mechanism';
import type { Handler } from './handler';
import { SASLAnonymous } from './sasl-anon';
import { SASLExternal } from './sasl-external';
import { SASLOAuthBearer } from './sasl-oauthbearer';
import { SASLXOAuth2 } from './sasl-xoauth2';
import { SASLPlain } from './sasl-plain';
import { SASLSHA1 } from './sasl-sha1';
import { SASLSHA256 } from './sasl-sha256';
import { SASLSHA384 } from './sasl-sha384';
import { SASLSHA512 } from './sasl-sha512';
import {
  $build,
  $iq,
  getBareJidFromJid,
  getNodeFromJid,
  getResourceFromJid,
  getText,
  NS,
} from './stanza';
import { info } from './log';
import { Status } from './status';
import type { Connection } from './connection';
import type { SaslData } from './sasl-data';
import type { ProtocolManager } from './protocol-manager';
import { ErrorCondition } from './error';
import type { Subject } from 'rxjs';
import { Bosh } from './bosh';

export class Sasl {
  saslData: SaslData = {};
  doBind = false;
  doSession = false;
  mechanism: Map<string, SASLMechanism> = new Map<string, SASLMechanism>();

  saslSuccessHandler?: Handler;
  saslFailureHandler?: Handler;
  saslChallengeHandler?: Handler;
  saslMechanism?: SASLMechanism;

  scramKeys: unknown;

  /** Variable: authzid
   *  Set on connection.
   *  Authorization identity.
   */
  authzid?: string | null;

  /** Variable: authcid
   *  Set on connection.
   *  Authentication identity (Username).
   */
  authcid?: string;

  /** Variable: pass
   *  Set on connection.
   *  Authentication identity (User password).
   */
  pass?: string | { name: string; salt: string; iter: number; ck: string; sk: string };

  constructor(
    readonly connection: Connection,
    private readonly connectionJidSubject: Subject<string>
  ) {}

  getMatchedAuthentications(protocolManager: ProtocolManager, element: Element): SASLMechanism[] {
    const connectionCheck = protocolManager.connectionStatusCheck(element);

    if (connectionCheck === Status.CONNFAIL) {
      return [];
    }

    const hasFeatures = element.getAttribute('xmlns:stream') === NS.STREAM;

    if (!hasFeatures && protocolManager instanceof Bosh) {
      protocolManager.noAuthReceived();
      return [];
    }

    return Array.from(element.getElementsByTagName('mechanism'))
      .map((m) => {
        if (!m.textContent) {
          throw new Error('textContent cannot be undefined');
        }
        return this.mechanism[m.textContent]! as SASLMechanism;
      })
      .filter((m) => m);
  }

  /**
   * Register the SASL mechanisms which will be supported by this instance of
   * Connection (i.e. which this XMPP client will support).
   *
   *  Parameters:
   *
   *    @param mechanisms - Array of SASLMechanism Constructors
   *
   */
  registerSASLMechanisms(
    mechanisms: (new () => SASLMechanism)[] = [
      SASLAnonymous,
      SASLExternal,
      SASLOAuthBearer,
      SASLXOAuth2,
      SASLPlain,
      SASLSHA1,
      SASLSHA256,
      SASLSHA384,
      SASLSHA512,
    ]
  ): void {
    mechanisms.forEach((m) => this.registerSASLMechanism(m));
  }

  /**
   * Register a single SASL mechanism, to be supported by this client.
   *
   *  Parameters:
   *
   *    @param mechanism - Constructor for an object with a SASLMechanism prototype
   *
   */
  registerSASLMechanism<T extends SASLMechanism>(mechanism: new () => T): void {
    const tmpMechanism = new mechanism();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.mechanism[tmpMechanism.mechname] = tmpMechanism;
  }

  /**
   *  Sorts an array of objects with prototype SASLMechanism according to
   *  their priorities.
   *
   *  Parameters:
   *
   *    @param mechanisms - Array of SASL mechanisms.
   *
   */
  sortMechanismsByPriority(mechanisms: SASLMechanism[]): SASLMechanism[] {
    // Sorting mechanisms according to priority.
    for (let i = 0; i < mechanisms.length - 1; ++i) {
      let higher = i;
      for (let j = i + 1; j < mechanisms.length; ++j) {
        if (mechanisms[j]!.priority > mechanisms[higher]!.priority) {
          higher = j;
        }
      }
      if (higher !== i) {
        const swap = mechanisms[i];
        mechanisms[i] = mechanisms[higher]!;
        mechanisms[higher] = swap!;
      }
    }
    return mechanisms;
  }

  /**
   *  Iterate through an array of SASL mechanisms and attempt authentication
   *  with the highest priority (enabled) mechanism.
   *
   *  Parameters:
   *    (Array) mechanisms - Array of SASL mechanisms.
   *
   *  Returns:
   *    (Boolean) mechanism_found - true or false, depending on whether a
   *          valid SASL mechanism was found with which authentication could be
   *          started.
   */
  async attemptSASLAuth(mechanisms: SASLMechanism[]): Promise<boolean> {
    mechanisms = this.sortMechanismsByPriority(mechanisms || []);
    let mechanism_found = false;
    for (const mechanism of mechanisms) {
      if (!mechanism.test(this)) {
        continue;
      }
      const saslChallengePromise = new Promise<void>((resolve, reject) => {
        this.saslSuccessHandler = this.connection.handlerService.addSysHandler(
          (el) => this.saslSuccessCb(el, resolve, reject),
          NS.SASL,
          'success',
          undefined,
          undefined
        );
        this.saslFailureHandler = this.connection.handlerService.addSysHandler(
          (el) => this.saslFailureCb(reject, el),
          NS.SASL,
          'failure',
          undefined,
          undefined
        );
      });

      this.saslChallengeHandler = this.connection.handlerService.addSysHandler(
        (el) => this.saslChallengeCb(el),
        NS.SASL,
        'challenge',
        undefined,
        undefined
      );

      this.saslMechanism = mechanism;
      this.saslMechanism.onStart(this);

      const request_auth_exchange = $build('auth', {
        xmlns: NS.SASL,
        mechanism: this.saslMechanism.mechname,
      });
      if (this.saslMechanism.isClientFirst) {
        const response = await this.saslMechanism.clientChallenge(this);
        if (!response) {
          throw new Error('response cannot be undefined');
        }
        request_auth_exchange.t(btoa(response));
      }
      this.connection.send(request_auth_exchange.tree());
      mechanism_found = true;
      await saslChallengePromise;
      break;
    }
    return mechanism_found;
  }

  /**
   *  handler for the SASL challenge
   *
   */
  async saslChallengeCb(elem: Element): Promise<boolean> {
    const challenge = atob(getText(elem));
    const response = await this.saslMechanism?.onChallenge(this, challenge);
    if (!response) {
      throw new Error('response cannot be undefined');
    }
    const stanza = $build('response', { xmlns: NS.SASL }).t(btoa(response));
    this.connection.send(stanza.tree());
    // To remove handler
    return false;
  }

  /**
   *  handler for successful SASL authentication.
   *
   *  @param elem - The matching stanza.
   *  @param resolve
   *  @param reject
   *
   *  Returns:
   *    false to remove the handler.
   */
  async saslSuccessCb(
    elem: Element,
    resolve: (value: PromiseLike<void> | void) => void,
    reject: (reason?: Error) => void
  ): Promise<false> {
    if (this.saslData.serverSignature) {
      let serverSignature;
      const success = atob(getText(elem));
      const attribMatch = /([a-z]+)=([^,]+)(,|$)/;
      const matches = success.match(attribMatch);
      if (matches?.[1] === 'v') {
        serverSignature = matches[2];
      }
      if (serverSignature !== this.saslData.serverSignature) {
        this.removeOldHandlers();
        this.saslData = {};
        this.saslFailureCb(reject);
        return false;
      }
    }
    info('SASL authentication succeeded.');

    if (this.saslData.keys) {
      this.scramKeys = this.saslData.keys;
    }

    if (this.saslMechanism) {
      this.saslMechanism.onSuccess();
    }
    this.removeOldHandlers();
    const streamFeatureHandlers: Handler[] = [];
    const wrapper = (handlers: Handler[], el: Element): boolean => {
      while (handlers.length) {
        this.connection.handlerService.deleteHandler(handlers.pop()!);
      }
      this.onStreamFeaturesAfterSASL(el, resolve);
      return false;
    };
    streamFeatureHandlers.push(
      this.connection.handlerService.addSysHandler(
        (el) => wrapper(streamFeatureHandlers, el),
        undefined,
        'stream:features',
        undefined,
        undefined
      )
    );

    streamFeatureHandlers.push(
      this.connection.handlerService.addSysHandler(
        (el) => wrapper(streamFeatureHandlers, el),
        NS.STREAM,
        'features',
        undefined,
        undefined
      )
    );

    // we must open a new stream after authenticating
    // see: https://xmpp.org/extensions/xep-0175.html for example
    await this.connection.protocolManager.openNewStream();
    return false;
  }

  private removeOldHandlers(): void {
    if (!this.saslFailureHandler) {
      throw new Error('saslFailureHandler cannot be undefined');
    }
    this.connection.handlerService.deleteHandler(this.saslFailureHandler);
    this.saslFailureHandler = undefined;
    if (this.saslChallengeHandler) {
      this.connection.handlerService.deleteHandler(this.saslChallengeHandler);
      this.saslChallengeHandler = undefined;
    }
  }

  /**
   *  @param elem - The matching stanza.
   * @param resolve
   */
  onStreamFeaturesAfterSASL(
    elem: Element,
    resolve: (value: PromiseLike<void> | void) => void
  ): false {
    for (const child of Array.from(elem.childNodes)) {
      if (child.nodeName === 'bind') {
        this.doBind = true;
      }
      if (child.nodeName === 'session') {
        this.doSession = true;
      }
    }

    if (!this.doBind) {
      this.connection.changeConnectStatus(Status.AUTHFAIL);
      return false;
    } else {
      this.connection.bind(resolve);
    }

    return false;
  }

  /**
   *  _Private_ handler for SASL authentication failure.
   *
   *  Parameters:
   *    (XMLElement) elem - The matching stanza.
   *
   *  Returns:
   *    false to remove the handler.
   */
  saslFailureCb(reject: (reason?: Error) => void, elem?: Element): boolean {
    // delete unneeded handlers
    if (this.saslSuccessHandler) {
      this.connection.handlerService.deleteHandler(this.saslSuccessHandler);
      this.saslSuccessHandler = undefined;
    }
    if (this.saslChallengeHandler) {
      this.connection.handlerService.deleteHandler(this.saslChallengeHandler);
      this.saslChallengeHandler = undefined;
    }

    if (this.saslMechanism) {
      this.saslMechanism.onFailure();
    }
    this.connection.changeConnectStatus(Status.AUTHFAIL, undefined, elem);
    reject(new Error('Failed in SASL challenge  Status.AUTHFAIL'));
    return false;
  }

  setVariables(
    jid: string | undefined,
    pass: string | undefined,
    authcid?: string | undefined
  ): void {
    /** Variable: authzid
     *  Authorization identity.
     */
    this.authzid = jid ? getBareJidFromJid(jid) : undefined;

    /** Variable: authcid
     *  Authentication identity (User name).
     */
    this.authcid = authcid || getNodeFromJid(jid);

    /** Variable: pass
     *  Authentication identity (User password).
     *
     */
    this.pass = pass;

    /** Variable: scramKeys
     *  The SASL SCRAM client and server keys. This variable will be populated with a non-null
     *  object of the above described form after a successful SCRAM connection
     *
     */
    this.scramKeys = null;
  }

  /**
   *  Continues the initial connection request by setting up authentication
   *  handlers and starting the authentication process.
   *
   *  SASL authentication will be attempted if available, otherwise
   *  the code will fall back to legacy authentication.
   *
   *  @param matched - Array of SASL mechanisms supported.
   *
   */
  async authenticate(matched: SASLMechanism[]): Promise<void> {
    if (await this.attemptSASLAuth(matched)) {
      return;
    }

    await this.attemptLegacyAuth();
  }

  /**
   *
   *  Attempt legacy (i.e. non-SASL) authentication.
   */
  async attemptLegacyAuth(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (getNodeFromJid(this.connection.jid) == null) {
        // we don't have a node, which is required for non-anonymous
        // client connections
        this.connection.changeConnectStatus(Status.CONNFAIL, ErrorCondition.MISSING_JID_NODE);
        void this.connection.disconnect();
        reject(new Error('ErrorCondition.MISSING_JID_NODE'));
      }

      // Fall back to legacy authentication
      this.connection.handlerService.addSysHandler(
        (_) => this.onLegacyAuthIQResult(resolve, reject),
        undefined,
        undefined,
        undefined,
        '_auth_1'
      );
      if (!this.connection.domain) {
        throw new Error('connection.domain cannot be undefined');
      }
      this.connection.send(
        $iq({
          type: 'get',
          to: this.connection.domain,
          id: '_auth_1',
        })
          .c('query', { xmlns: NS.AUTH })
          .c('username', {})
          .t(getNodeFromJid(this.connection.jid))
          .tree()
      );
    });
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
  onLegacyAuthIQResult(
    resolve: (value: PromiseLike<void> | void) => void,
    reject: (reason?: Error) => void
  ): false {
    // build plaintext auth iq
    const iq = $iq({ type: 'set', id: '_auth_2' })
      .c('query', { xmlns: NS.AUTH })
      .c('username', {})
      .t(getNodeFromJid(this.connection.jid))
      .up()
      .c('password')
      .t(this.pass as string);

    if (!getResourceFromJid(this.connection.jid) && this.connection.jid != null) {
      // since the user has not supplied a resource, we pick
      // a default one here.  unlike other auth methods, the server
      // cannot do this for us.
      this.connectionJidSubject.next(getBareJidFromJid(this.connection.jid) + '/strophe');
    }
    const resourceFromJid = getResourceFromJid(this.connection.jid);
    if (!resourceFromJid) {
      throw new Error('resourceFromJid cannot be undefined');
    }
    iq.up().c('resource', {}).t(resourceFromJid);

    this.connection.handlerService.addSysHandler(
      (element) => this.auth2Callback(element, resolve, reject),
      undefined,
      undefined,
      undefined,
      '_auth_2'
    );
    this.connection.send(iq.tree());
    return false;
  }

  /**
   * Finish legacy authentication.
   * This handler is called when the result from the jabber:iq:auth <iq/> stanza is returned.
   *
   * @param elem - The stanza that triggered the callback.
   *
   * @param resolve
   * @param reject
   * @returns false to remove the handler.
   */
  auth2Callback(
    elem: Element,
    resolve: (value: PromiseLike<void> | void) => void,
    reject: (reason?: Error) => void
  ): false {
    if (elem.getAttribute('type') === 'result') {
      this.connection.authenticated = true;
      this.connection.changeConnectStatus(Status.CONNECTED);
      resolve();
    } else if (elem.getAttribute('type') === 'error') {
      this.connection.changeConnectStatus(Status.AUTHFAIL, undefined, elem);
      void this.connection.disconnect();
      reject(new Error('Status.AUTHFAIL'));
    }
    return false;
  }
}
