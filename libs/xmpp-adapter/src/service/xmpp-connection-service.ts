// SPDX-License-Identifier: MIT
import { firstValueFrom, Observable, startWith, Subject, switchMap } from 'rxjs';
import type { AuthRequest, Log } from '@pazznetwork/ngx-chat-shared';
import { makeSafeJidString } from '@pazznetwork/ngx-chat-shared';
import { StanzaBuilder } from '../stanza-builder';
import { first, shareReplay } from 'rxjs/operators';
import { $build, Connection, Handler, HandlerAsync } from '@pazznetwork/strophets';

/**
 * Implementation of the XMPP specification according to RFC 6121.
 *
 * @see https://xmpp.org/rfcs/rfc6121.html
 * @see https://xmpp.org/rfcs/rfc3920.html
 * @see https://xmpp.org/rfcs/rfc3921.html
 */
export class XmppConnectionService {
  private readonly createConnectionSubject = new Subject<{
    service: undefined | string;
    domain: string;
  }>();
  readonly connection$: Observable<Connection> = this.createConnectionSubject.pipe(
    first(),
    switchMap(({ domain, service }) => Connection.create(domain, service)),
    shareReplay({
      bufferSize: 1,
      refCount: false,
    })
  );

  readonly isOnline$ = this.connection$.pipe(
    switchMap((conn) => conn.isOnline$),
    startWith(false)
  );
  readonly onAuthenticating$ = this.connection$.pipe(switchMap((conn) => conn.onAuthenticating$));
  readonly onOnline$ = this.connection$.pipe(switchMap((conn) => conn.onOnline$));
  readonly onOffline$ = this.connection$.pipe(switchMap((conn) => conn.onOffline$));
  readonly isOffline$ = this.connection$.pipe(
    switchMap((conn) => conn.isOffline$),
    startWith(true)
  );
  readonly userJid$ = this.connection$.pipe(switchMap((conn) => conn.userJid$));

  constructor(protected readonly logService: Log) {}

  async register({ username, password, service, domain }: AuthRequest): Promise<void> {
    this.createConnectionSubject.next({ service, domain });
    const connection = await firstValueFrom(this.connection$);
    await connection.register(username, password, domain);
  }

  async unregister({ service, domain }: Pick<AuthRequest, 'service' | 'domain'>): Promise<void> {
    this.createConnectionSubject.next({ service, domain });
    const connection = await firstValueFrom(this.connection$);
    await connection.unregister();
  }

  async logIn({ username, password, service, domain }: AuthRequest): Promise<void> {
    this.createConnectionSubject.next({ service, domain });
    const jid = makeSafeJidString(username, domain);
    const connection = await firstValueFrom(this.connection$);
    await connection.login(jid, password);
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
    handler: (stanza: Element) => boolean,
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

  async addHandlerAsync(
    handler: (stanza: Element) => Promise<boolean>,
    identifier?: { ns?: string; name?: string; type?: string; id?: string; from?: string },
    options?: { matchBareFromJid: boolean; ignoreNamespaceFragment: boolean }
  ): Promise<HandlerAsync> {
    const connection = await firstValueFrom(this.connection$);
    if (!identifier) {
      return connection.handlerService.addHandlerAsync(handler);
    }

    const { ns, name, type, id, from } = identifier;
    return connection.handlerService.addHandlerAsync(handler, ns, name, type, id, from, options);
  }

  async deleteHandler(handlerRef: Handler): Promise<undefined> {
    const connection = await firstValueFrom(this.connection$);
    connection.handlerService.deleteHandler(handlerRef);
    return undefined;
  }

  async deleteHandlerAsync(handlerRef: HandlerAsync): Promise<undefined> {
    const connection = await firstValueFrom(this.connection$);
    connection.handlerService.deleteHandlerAsync(handlerRef);
    return undefined;
  }

  async logOut(): Promise<void> {
    const connection = await firstValueFrom(this.connection$);
    await connection.logOut();
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
