import { Inject, Injectable, InjectionToken } from '@angular/core';
import { Client } from '@xmpp/client-core';
import { JID } from '@xmpp/jid';
import { x as xml } from '@xmpp/xml';
import { Element } from 'ltx';
import { BehaviorSubject, Subject } from 'rxjs';
import { IqResponseStanza, LogInRequest, MessageWithBodyStanza, Stanza } from '../../../core';
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

    public stanzaError$ = new Subject<Stanza>();
    public stanzaMessage$ = new Subject<MessageWithBodyStanza>();
    public stanzaUnknown$ = new Subject<Stanza>();

    /**
     * User JID with resouce, not bare.
     */
    public userJid: JID;
    private iqId = new Date().getTime();

    private iqStanzaResponseCallbacks: { [key: string]: ((any) => void) } = {};

    constructor(@Inject(XmppClientToken) public client: Client,
                private logService: LogService) {}

    initialize(): void {

        this.client.on('error', (err: any) => {
            this.logService.error('chat service error =>', err.toString());
        });

        this.client.on('status', (status: any, value: any) => {
            this.logService.debug('status =', status, value ? value.toString() : '');
        });

        this.client.on('online', (jid: JID) => this.onOnline(jid));

        this.client.on('stanza', (stanza: Stanza) => this.onStanzaReceived(stanza));

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

    public sendIqAckResult(id) {
        this.send(
            xml('iq', {from: this.userJid.toString(), id: id, type: 'result'})
        );
    }

    public onStanzaReceived(stanza: Stanza) {

        this.logService.debug('<<<', stanza);

        if (stanza.attrs.type === 'error') {
            this.logService.debug('error <=', stanza.toString());
            this.stanzaError$.next(stanza);
        } else if (this.isMessageStanza(stanza)) {
            this.stanzaMessage$.next(stanza);
        } else if (this.isIqStanzaResponse(stanza)) {
            const callback = this.iqStanzaResponseCallbacks[stanza.attrs.id];
            if (callback) {
                delete this.iqStanzaResponseCallbacks[stanza.attrs.id];
                callback(stanza);
            } else {
                // run plugins
                this.stanzaUnknown$.next(stanza);
            }
        } else {
            this.stanzaUnknown$.next(stanza);
        }
    }

    private isMessageStanza(stanza: Stanza): stanza is MessageWithBodyStanza {
        return stanza.name === 'message' && !!stanza.getChildText('body');
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
