import { Injectable, NgZone } from '@angular/core';
import { Client, xml } from '@xmpp/client';
import { JID } from '@xmpp/jid';
import { Element } from 'ltx';
import { BehaviorSubject, Subject } from 'rxjs';
import { LogInRequest } from '../../../core/log-in-request';
import { IqResponseStanza, Stanza } from '../../../core/stanza';
import { LogService } from '../../log.service';
import { XmppResponseError } from './xmpp-response.error';
import { XmppClientFactoryService } from './xmpp-client-factory.service';

export type XmppChatStates = 'disconnected' | 'online' | 'reconnecting';

/**
 * Implementation of the XMPP specification according to RFC 6121.
 * @see https://xmpp.org/rfcs/rfc6121.html
 * @see https://xmpp.org/rfcs/rfc3920.html
 * @see https://xmpp.org/rfcs/rfc3921.html
 */
@Injectable()
export class XmppChatConnectionService {

    public readonly state$ = new BehaviorSubject<XmppChatStates>('disconnected');
    public readonly stanzaUnknown$ = new Subject<Stanza>();

    /**
     * User JID with resource, not bare.
     */
    public userJid?: JID;
    private requestId = new Date().getTime();
    private readonly stanzaResponseHandlers = new Map<string, [(stanza: Stanza) => void, (e: Error) => void]>();
    public client?: Client;

    constructor(
        private readonly logService: LogService,
        private readonly ngZone: NgZone,
        private readonly xmppClientFactoryService: XmppClientFactoryService,
    ) {}

    public onOnline(jid: JID): void {
        this.logService.info('online =', 'online as', jid.toString());
        this.userJid = jid;
        this.state$.next('online');
    }

    private onOffline(): void {
        this.stanzaResponseHandlers.forEach(([, reject]) => reject(new Error('offline')));
        this.stanzaResponseHandlers.clear();
    }

    public async sendPresence(): Promise<void> {
        await this.send(
            xml('presence'),
        );
    }

    public async send(content: any): Promise<void> {
        this.logService.debug('>>>', content);
        await this.client.send(content);
    }

    public sendAwaitingResponse(request: Element): Promise<Stanza> {
        return new Promise((resolve, reject) => {
            request.attrs = {
                id: this.getNextRequestId(),
                from: this.userJid.toString(),
                ...request.attrs,
            };
            const {id} = request.attrs;

            this.stanzaResponseHandlers.set(id, [
                (response) => {
                    if (response.attrs.type === 'error') {
                        reject(new XmppResponseError(response));
                        return;
                    }

                    resolve(response);
                },
                reject,
            ]);

            this.send(request).catch((e: unknown) => {
                this.logService.error('error sending stanza', e);
                this.stanzaResponseHandlers.delete(id);
                reject(e);
            });
        });
    }

    public onStanzaReceived(stanza: Stanza): void {
        let handled = false;

        const [handleResponse] = this.stanzaResponseHandlers.get(stanza.attrs.id) ?? [];
        if (handleResponse) {
            this.logService.debug('<<<', stanza.toString(), 'handled by response handler');
            this.stanzaResponseHandlers.delete(stanza.attrs.id);
            handleResponse(stanza);
            handled = true;
        }

        if (!handled) {
            this.stanzaUnknown$.next(stanza);
        }
    }

    public async sendIq(request: Element): Promise<IqResponseStanza<'result'>> {
        const requestType: string | undefined = request.attrs.type;
        // see https://datatracker.ietf.org/doc/html/draft-ietf-xmpp-3920bis#section-8.2.3
        if (!requestType || (requestType !== 'get' && requestType !== 'set')) {
            const message = `iq stanza without type: ${request.toString()}`;
            this.logService.error(message);
            throw new Error(message);
        }

        const response = await this.sendAwaitingResponse(request);
        if (!this.isIqStanzaResponse(response)) {
            throw new Error(`received unexpected stanza as iq response: type=${response.attrs.type}, stanza=${response.toString()}`);
        }
        return response as IqResponseStanza<'result'>;
    }

    private isIqStanzaResponse(stanza: Stanza): stanza is IqResponseStanza {
        const stanzaType = stanza.attrs.type;
        return stanza.name === 'iq' && (stanzaType === 'result' || stanzaType === 'error');
    }

    public async sendIqAckResult(id: string): Promise<void> {
        await this.send(
            xml('iq', {from: this.userJid.toString(), id, type: 'result'}),
        );
    }

    async logIn(logInRequest: LogInRequest): Promise<void> {
        await this.ngZone.runOutsideAngular(async () => {
            if (logInRequest.username.indexOf('@') >= 0) {
                this.logService.warn('username should not contain domain, only local part, this can lead to errors!');
            }

            this.client = this.xmppClientFactoryService.client(logInRequest);

            this.client.on('error', (err: any) => {
                this.ngZone.run(() => {
                    this.logService.error('chat service error =>', err.toString(), err);
                });
            });

            this.client.on('status', (status: any, value: any) => {
                this.ngZone.run(() => {
                    this.logService.info('status update =', status, value ? JSON.stringify(value) : '');
                    if (status === 'offline') {
                        this.state$.next('disconnected');
                    }
                });
            });

            this.client.on('online', (jid: JID) => {
                return this.ngZone.run(() => {
                    return this.onOnline(jid);
                });
            });

            this.client.on('stanza', (stanza: Stanza) => {
                this.ngZone.run(() => {
                    if (this.skipXmppClientResponses(stanza)) {
                        return;
                    }
                    this.onStanzaReceived(stanza);
                });
            });

            this.client.on('disconnect', () => {
                this.ngZone.run(() => {
                    this.state$.next('reconnecting');
                });
            });

            this.client.on('offline', () => {
                this.ngZone.run(() => {
                    this.onOffline();
                });
            });

            await this.client.start();
        });
    }

    /**
     * We should skip our iq handling for the following xmpp/client response:
     * - resource bind on start by https://xmpp.org/rfcs/rfc6120.html#bind
     */
    private skipXmppClientResponses(stanza: Stanza) {
        const xmppBindNS = 'urn:ietf:params:xml:ns:xmpp-bind';
        return stanza.getChild('bind')?.getNS() === xmppBindNS;
    }

    async logOut(): Promise<void> {
        // TODO: move this to a presence plugin in a handler
        this.logService.debug('logging out');
        if (this.client) {
            this.client.reconnect.stop();
            try {
                await this.send(xml('presence', {type: 'unavailable'}));
            } catch (e) {
                this.logService.error('error sending presence unavailable');
            } finally {
                this.client.stop();
            }
        }
    }

    getNextRequestId(): string {
        return String(this.requestId++);
    }

    reconnectSilently(): void {
        this.logService.warn('hard reconnect...');
        this.state$.next('disconnected');
    }
}
