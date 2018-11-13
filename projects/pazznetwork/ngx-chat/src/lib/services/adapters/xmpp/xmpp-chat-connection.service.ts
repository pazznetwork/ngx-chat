import { Inject, Injectable, InjectionToken } from '@angular/core';
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

    constructor(@Inject(XmppClientToken) public client: Client,
                private logService: LogService) {}

    initialize(): void {

        this.client.on('error', (err: any) => {
            this.logService.error('chat service error =>', err.toString());
        });

        this.client.on('status', (status: any, value: any) => {
            this.logService.info('status update =', status, value ? value.toString() : '');
        });

        this.client.on('online', (jid: JID) => this.onOnline(jid));

        this.client.on('stanza', (stanza: Stanza) => {
            this.onStanzaReceived(stanza);
        });

    }

    public onOnline(jid: JID) {
        this.logService.debug('online =', 'online as', jid.toString());
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
        return this.client.send(content);
    }

    public sendIq(request: Element): Promise<IqResponseStanza> {
        return new Promise((resolve, reject) => {

            if (!request.attrs.id) {
                request.attrs.id = this.getNextIqId();
            }

            if (!request.attrs.type) {
                throw new Error('iq stanza without type: ' + request.toString());
            }

            request.attrs.from = this.userJid.toString();
            this.iqStanzaResponseCallbacks[request.attrs.id] = (response: IqResponseStanza) => {
                if (response.attrs.type === 'result') {
                    resolve(response);
                } else {
                    reject(response);
                }
            };
            this.send(request);
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
        this.client.start({uri: logInRequest.uri, domain: logInRequest.domain});
        this.client.handle('authenticate', (authenticate: any) => {
            return authenticate(logInRequest.jid, logInRequest.password);
        });
    }

    logOut(): void {
        this.state$.next('disconnected');
        const presenceStanza = xml('presence', {type: 'unavailable'});
        Promise.resolve(this.send(presenceStanza))
            .then(() => {
                return Promise.resolve(this.client.stop());
            })
            .then(() => {
                this.logService.debug('logged out');
            })
            .catch(() => {
                this.logService.warn('error while logging out');
            });
    }

    getNextIqId() {
        return '' + this.iqId++;
    }

}
