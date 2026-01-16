import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  firstValueFrom,
  map,
  merge,
  ReplaySubject,
  startWith,
  Subject,
  switchMap,
} from 'rxjs';
import type { AuthRequest, Log } from '@pazznetwork/ngx-chat-shared';
import { makeSafeJidString } from '@pazznetwork/ngx-chat-shared';
import { StanzaBuilder } from '../stanza-builder';
import { $build, Connection, Handler } from '@pazznetwork/strophe-ts';

/**
 * Implementation of the XMPP specification according to RFC 6121.
 *
 * @see https://xmpp.org/rfcs/rfc6121.html
 * @see https://xmpp.org/rfcs/rfc3920.html
 * @see https://xmpp.org/rfcs/rfc3921.html
 */
export class XmppConnectionService {
  private readonly connectionSubject = new ReplaySubject<Connection>(1);
  readonly connection$ = this.connectionSubject.asObservable();

  private readonly userStateSubject = new BehaviorSubject<'online' | 'offline'>('offline');
  private readonly manualOfflineSubject = new Subject<void>();

  readonly isOnline$ = combineLatest([
    this.connection$.pipe(
      switchMap((conn) => conn.isOnline$),
      startWith(false)
    ),
    this.userStateSubject,
  ]).pipe(
    map(([connected, userState]) => connected && userState === 'online'),
    distinctUntilChanged()
  );

  readonly onAuthenticating$ = this.connection$.pipe(switchMap((conn) => conn.onAuthenticating$));
  readonly onOnline$ = this.connection$.pipe(switchMap((conn) => conn.onOnline$));
  readonly onOffline$ = merge(
    this.connection$.pipe(switchMap((conn) => conn.onOffline$)),
    this.manualOfflineSubject
  );
  readonly isOffline$ = this.isOnline$.pipe(
    map((isOnline) => !isOnline),
    startWith(true)
  );
  readonly userJid$ = this.connection$.pipe(switchMap((conn) => conn.userJid$));

  private currentConnection?: Connection;

  constructor(protected readonly logService: Log) { }

  async register(authRequest: AuthRequest): Promise<void> {
    const connection = await this.createConnection(authRequest);
    await connection.register(authRequest.username, authRequest.password, authRequest.domain);
  }

  async unregister(authRequest: Pick<AuthRequest, 'service' | 'domain'>): Promise<void> {
    const connection = await this.createConnection(authRequest);
    await connection.unregister();
  }

  async logIn(authRequest: AuthRequest): Promise<void> {
    const connection = await this.createConnection(authRequest);
    const jid = makeSafeJidString(authRequest.username, authRequest.domain);
    await connection.login(jid, authRequest.password);
  }

  /**
   * Adds handles which return true or false indicating their success in handling the passed element
   *  For received stanzas we call the most specific handler to the last specific handler until one handler returns true
   *
   * @param handler handler to call for stanzas with the specified properties
   * @param identifier all properties to find matching handler by
   *    @property identifier.ns - The namespace to match.
   *    @property identifier.name - The stanza tag name to match.
   *    @property identifier.type - The stanza type to match.
   *    @property identifier.id - The stanza id attribute to match.
   *    @property identifier.from - The stanza from attribute to match.
   *    @property identifier.options - The handler options
   * @param options matchBare match from and to Jid without resource part
   */
  async addHandler(
    handler: (stanza: Element) => boolean | Promise<boolean>,
    identifier?: { ns?: string; name?: string; type?: string; id?: string; from?: string },
    options?: { matchBareFromJid: boolean; ignoreNamespaceFragment: boolean }
  ): Promise<Handler> {
    const connection = await firstValueFrom(this.connection$);
    if (!identifier) {
      return connection.handlerService.addHandler(handler);
    }

    const { ns, name, type, id, from } = identifier;
    return connection.handlerService.addHandler(handler, ns, name, type, id, from, options);
  }

  async deleteHandler(handlerRef: Handler): Promise<undefined> {
    const connection = await firstValueFrom(this.connection$);
    connection.handlerService.deleteHandler(handlerRef);
    return undefined;
  }

  async logOut(emitEvent = true): Promise<void> {
    const connection = this.currentConnection;
    if (connection) {
      try {
        await Promise.race([
          connection.logOut(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000)),
        ]);
      } catch (e) {
        connection.disconnectFinally('force-logout');
      }
      if (this.currentConnection === connection) {
        this.currentConnection = undefined;
      }
    }
    this.userStateSubject.next('offline');
    if (emitEvent) {
      this.manualOfflineSubject.next();
    }
  }

  private async createConnection({
    domain,
    service,
    saslMechanisms,
  }: Pick<AuthRequest, 'service' | 'domain' | 'saslMechanisms'>): Promise<Connection> {
    if (this.currentConnection) {
      await this.logOut(false);
    }
    const connection = await Connection.create(domain, service, saslMechanisms);
    this.currentConnection = connection;
    this.userStateSubject.next('online');
    this.connectionSubject.next(connection);
    return connection;
  }

  private $build(
    name: string,
    attrs: Record<string, string>,
    sendInner: (content: Element) => Promise<Element>,
    sendWithoutResponse: (content: Element) => Promise<void>
  ): StanzaBuilder {
    return new StanzaBuilder($build(name, attrs), sendInner, sendWithoutResponse);
  }

  $iq(attrs?: Record<string, string>): StanzaBuilder {
    const sendInner = async (el: Element): Promise<Element> => {
      const connection = await firstValueFrom(this.connection$);
      return connection.sendIQ(el);
    };

    return this.$build('iq', attrs ?? {}, sendInner, async (el) => {
      const connection = await firstValueFrom(this.connection$);
      return connection.send(el);
    });
  }

  $msg(attrs?: Record<string, string>): StanzaBuilder {
    const sendInner = async (el: Element): Promise<Element> => {
      const connection = await firstValueFrom(this.connection$);

      connection.send(el);
      return el;
    };

    return this.$build('message', attrs ?? {}, sendInner, async (el: Element) => {
      const connection = await firstValueFrom(this.connection$);
      connection.send(el);
    });
  }

  $pres(attrs?: Record<string, string>): StanzaBuilder {
    const sendInner = async (el: Element): Promise<Element> => {
      const connection = await firstValueFrom(this.connection$);
      return connection.sendPresence(el);
    };

    return this.$build('presence', attrs ?? {}, sendInner, async (el) => {
      const connection = await firstValueFrom(this.connection$);
      return connection.send(el);
    });
  }
}
