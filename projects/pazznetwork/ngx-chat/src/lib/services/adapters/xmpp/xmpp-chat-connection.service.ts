import { Inject, Injectable, InjectionToken, NgZone } from '@angular/core';
import { Client } from '@xmpp/client-core';
import { JID } from '@xmpp/jid';
import { x as xml } from '@xmpp/xml';
import { Element } from 'ltx';
import { BehaviorSubject, Subject } from 'rxjs';
import { IqResponseStanza, LogInRequest, Stanza } from '../../../core';
import { LogService } from '../../log.service';

export const XmppClientToken = new InjectionToken('pazznetworkNgxChatXmppClient');

/**
 * Implementation of the XMPP specification according to RFC 6121.
 * @see https://xmpp.org/rfcs/rfc6121.html
 * @see https://xmpp.org/rfcs/rfc3920.html
 * @see https://xmpp.org/rfcs/rfc3921.html
 */
@Injectable()
export class XmppChatConnectionService {

    public state$ = new BehaviorSubject<'disconnected' | 'online'>('disconnected');
    public stanzaUnknown$ = new Subject<Stanza>();
    public id = Math.random().toString();

    /**
     * User JID with resouce, not bare.
     */
    public userJid: JID;
    private iqId = new Date().getTime();
    private iqStanzaResponseCallbacks: { [key: string]: ((arg: any) => void) } = {};

    constructor(@Inject(XmppClientToken) private client: Client,
                private logService: LogService,
                private ngZone: NgZone) {}

    initialize(): void {
        this.client.on('error', (err: any) => {
            this.ngZone.run(() => {
                this.logService.error('chat service error =>', err.toString(), err);
                if (err.toString().indexOf('connection error ') >= 0) { // thrown by iOS when gone offline due to battery saving
                    this.reconnect();
                } else {
                    this.client.stop(); // e.g. kicked
                }
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

        this.client.plugins.reconnect.on('reconnected', () => {
            this.ngZone.run(() => {
                this.sendPresence();
            });
        });
    }

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
        const stanzaType = stanza.attrs['type'];
        return stanza.name === 'iq' && (stanzaType === 'result' || stanzaType === 'error');
    }

    logIn(logInRequest: LogInRequest): void {
        this.ngZone.runOutsideAngular(() => {
            this.client.start({uri: logInRequest.uri, domain: logInRequest.domain});
            this.client.handle('authenticate', (authenticate: any) => {
                return authenticate(logInRequest.jid, logInRequest.password);
            });
        });
    }

    async logOut(): Promise<void> {
        // TODO: move this to a presence plugin in a handler
        this.logService.debug('logging out');
        try {
            await this.send(xml('presence', {type: 'unavailable'}));
        } catch (e) {
            this.logService.error('error sending presence unavailable');
        } finally {
            this.client.stop();
        }
    }

    getNextIqId() {
        return '' + this.iqId++;
    }

    reconnect() {
        this.logService.warn('hard reconnect...');
        this.state$.next('disconnected');
        this.client.plugins.reconnect.reconnect();
    }
}
