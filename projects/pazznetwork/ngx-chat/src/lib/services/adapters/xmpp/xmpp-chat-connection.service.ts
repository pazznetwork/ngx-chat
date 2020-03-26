import { Injectable, NgZone } from '@angular/core';
import { Client, xml } from '@xmpp/client';
import { JID } from '@xmpp/jid';
import { Element } from 'ltx';
import { BehaviorSubject, Subject } from 'rxjs';
import { LogInRequest } from '../../../core/log-in-request';
import { IqResponseStanza, Stanza } from '../../../core/stanza';
import { LogService } from '../../log.service';
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

    public state$ = new BehaviorSubject<XmppChatStates>('disconnected');
    public stanzaUnknown$ = new Subject<Stanza>();

    /**
     * User JID with resouce, not bare.
     */
    public userJid: JID;
    private iqId = new Date().getTime();
    private iqStanzaResponseCallbacks: { [key: string]: ((arg: any) => void) } = {};
    public client: Client;

    constructor(private logService: LogService,
                private ngZone: NgZone,
                private xmppClientFactoryService: XmppClientFactoryService) {}

    public onOnline(jid: JID) {
        this.logService.info('online =', 'online as', jid.toString());
        this.userJid = jid;
        this.state$.next('online');
    }

    public sendPresence() {
        this.send(
            xml('presence')
        );
    }

    public send(content: any): PromiseLike<void> {
        this.logService.debug('>>>', content);
        try {
            return this.client.send(content);
        } catch (e) {
            return Promise.reject(e);
        }
    }

    public sendIq(request: Element): Promise<IqResponseStanza> {
        return new Promise((resolve, reject) => {

            request.attrs = {
                id: this.getNextIqId(),
                from: this.userJid.toString(),
                ...request.attrs,
            };
            const {id} = request.attrs;

            if (!request.attrs.type) {
                throw new Error('iq stanza without type: ' + request.toString());
            }

            this.iqStanzaResponseCallbacks[id] = (response: IqResponseStanza) => {
                if (response.attrs.type === 'result') {
                    resolve(response);
                } else {
                    reject(response);
                }
            };

            this.send(request).then(() => {}, (e) => {
                this.logService.error('error sending iq', e);
                delete this.iqStanzaResponseCallbacks[id];
                reject(e);
            });
        });
    }

    public sendIqAckResult(id: string) {
        this.send(
            xml('iq', {from: this.userJid.toString(), id, type: 'result'})
        );
    }

    public onStanzaReceived(stanza: Stanza) {

        let handled = false;
        if (this.isIqStanzaResponse(stanza)) {
            const iqResponseCallback = this.iqStanzaResponseCallbacks[stanza.attrs.id];
            if (iqResponseCallback) {
                this.logService.debug('<<<', stanza.toString(), 'handled by callback', iqResponseCallback);
                delete this.iqStanzaResponseCallbacks[stanza.attrs.id];
                iqResponseCallback(stanza);
                handled = true;
            }
        }

        if (!handled) {
            this.stanzaUnknown$.next(stanza);
        }

    }

    private isIqStanzaResponse(stanza: Stanza): stanza is IqResponseStanza {
        const stanzaType = stanza.attrs.type;
        return stanza.name === 'iq' && (stanzaType === 'result' || stanzaType === 'error');
    }

    async logIn(logInRequest: LogInRequest) {
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
                    this.onStanzaReceived(stanza);
                });
            });

            this.client.on('disconnect', (stanza: Stanza) => {
                this.ngZone.run(() => {
                    this.state$.next('reconnecting');
                });
            });

            await this.client.start();
        });
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

    getNextIqId() {
        return '' + this.iqId++;
    }

    reconnectSilently() {
        this.logService.warn('hard reconnect...');
        this.state$.next('disconnected');
    }
}
