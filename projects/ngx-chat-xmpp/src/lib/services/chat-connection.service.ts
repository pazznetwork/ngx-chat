import { Inject, Injectable, InjectionToken } from '@angular/core';
import { Client } from '@xmpp/client-core';
import { x as xml } from '@xmpp/xml';
import { BehaviorSubject, Subject } from 'rxjs';
import { Contact, LogInRequest, MessageWithBodyStanza, PresenceStanza, Stanza } from '../core';
import { LogService } from './log.service';

export const XmppClientToken = new InjectionToken('XmppClient');

@Injectable()
export class ChatConnectionService {

    public state$ = new BehaviorSubject<'disconnected' | 'online'>('disconnected');

    public stanzaError$ = new Subject<Stanza>();
    public stanzaPresenceRequest$ = new Subject<PresenceStanza>();
    public stanzaPresenceInformation$ = new Subject<PresenceStanza>();
    public stanzaMessage$ = new Subject<MessageWithBodyStanza>();
    public stanzaUnknown$ = new Subject<Stanza>();

    public myJidWithResource: string;
    private iqId = 0;

    constructor(@Inject(XmppClientToken) public client: Client, private logService: LogService) {}

    initialize(): void {

        this.client.on('error', (err: any) => {
            this.logService.error('chat service error =>', err.toString());
        });

        this.client.on('status', (status: any, value: any) => {
            this.logService.debug('status =', status, value ? value.toString() : '');
        });

        this.client.on('online', (jid: any) => {
            this.logService.debug('online =', 'online as', jid.toString());
            this.myJidWithResource = jid.toString();
            this.state$.next('online');

            // TODO: subscribe to contact presence notifications

            this.send(
                xml('presence')
            ).then((resolve) => {
                this.logService.debug('presence resolved', resolve);
            }, (e) => {
                this.logService.debug('presence errored', e);
            });
        });

        this.client.on('stanza', (stanza: Stanza) => {
            if (stanza.attrs.type === 'error') {
                this.logService.debug('error <=', stanza.toString());
                this.stanzaError$.next(stanza);
            } else if (this.isPresenceStanza(stanza)) {
                this.logService.debug('presence stanza <=', stanza.toString());
                if (stanza.attrs.type === 'subscribe' && stanza.attrs.to === this.myJidWithResource) {
                    this.stanzaPresenceRequest$.next(stanza);
                } else if (stanza.attrs.to === this.myJidWithResource) {
                    this.stanzaPresenceInformation$.next(stanza);
                }
            } else if (this.isMessageStanza(stanza)) {
                this.stanzaMessage$.next(stanza);
            } else {
                this.stanzaUnknown$.next(stanza);
            }

        });

    }

    public send(content: any): PromiseLike<void> {
        return this.client.send(content);
    }

    private isPresenceStanza(stanza: Stanza): stanza is PresenceStanza {
        return stanza.name === 'presence';
    }

    private isMessageStanza(stanza: Stanza): stanza is MessageWithBodyStanza {
        return stanza.name === 'message' && !!stanza.getChildText('body');
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

    private subscribeToContactStatus(contact: Contact) {
        this.send(
            xml('presence', {to: contact.jid, type: 'subscribe'})
        ).then(
            (res) => this.logService.debug('subscribeStatusResolved', res),
            (rej) => this.logService.warn('subscribeStatusResolved', rej)
        );
    }

    getNextIqId() {
        return '' + this.iqId++;
    }

}
