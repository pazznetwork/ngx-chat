import { NgZone } from '@angular/core';
import { x as xml } from '@xmpp/xml';
import { filter } from 'rxjs/operators';
import { LogService } from '../../../log.service';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { AbstractXmppPlugin } from './abstract-xmpp-plugin';

/**
 * xep-0199
 */
export class PingPlugin extends AbstractXmppPlugin {

    private timeoutHandle: any;
    private readonly pingInterval = 60_000;

    constructor(private xmppChatAdapter: XmppChatAdapter,
                private logService: LogService,
                private ngZone: NgZone) {
        super();

        this.xmppChatAdapter.state$.pipe(
            filter(newState => newState === 'online')
        ).subscribe(() => {
            this.schedulePings();
        });

        this.xmppChatAdapter.state$.pipe(
            filter(newState => newState === 'disconnected')
        ).subscribe(() => {
            this.unschedulePings();
        });
    }

    private schedulePings() {
        this.unschedulePings();
        this.ngZone.runOutsideAngular(() => {
            this.timeoutHandle = window.setInterval(() => this.ping(), this.pingInterval);
        });
    }

    private async ping() {
        this.logService.debug('ping...');
        try {
            await this.xmppChatAdapter.chatConnectionService.sendIq(
                xml('iq', {type: 'get'},
                    xml('ping', {xmlns: 'urn:xmpp:ping'})
                )
            );
            // TODO: timeout?
            this.logService.debug('... pong');
        } catch (e) {
            this.logService.error('... pong errored!');
        }
    }

    private unschedulePings() {
        window.clearInterval(this.timeoutHandle);
    }

}
