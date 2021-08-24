import { NgZone } from '@angular/core';
import { xml } from '@xmpp/client';
import { filter } from 'rxjs/operators';
import { timeout } from '../../../../core/utils-timeout';
import { LogService } from '../../../log.service';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { AbstractXmppPlugin } from './abstract-xmpp-plugin';
import { IqResponseStanza } from '../../../../core/stanza';

/**
 * XEP-0199 XMPP Ping (https://xmpp.org/extensions/xep-0199.html)
 */
export class PingPlugin extends AbstractXmppPlugin {

    private timeoutHandle: any;
    private readonly pingInterval = 60_000;

    constructor(
        private readonly xmppChatAdapter: XmppChatAdapter,
        private readonly logService: LogService,
        private readonly ngZone: NgZone,
    ) {
        super();

        this.xmppChatAdapter.state$.pipe(
            filter(newState => newState === 'online'),
        ).subscribe(() => this.schedulePings());

        this.xmppChatAdapter.state$.pipe(
            filter(newState => newState === 'disconnected'),
        ).subscribe(() => this.unschedulePings());
    }

    private schedulePings(): void {
        this.unschedulePings();
        this.ngZone.runOutsideAngular(() => {
            this.timeoutHandle = window.setInterval(() => this.ping(), this.pingInterval);
        });
    }

    private async ping(): Promise<void> {
        this.logService.debug('ping...');
        try {
            await timeout(this.sendPing(), 10_000);
            this.logService.debug('... pong');
        } catch {
            if (this.xmppChatAdapter.state$.getValue() === 'online'
                && this.xmppChatAdapter.chatConnectionService.state$.getValue() === 'online') {
                this.logService.error('... pong errored,  connection should be online, waiting for browser websocket timeout');
            }
        }
    }

    private async sendPing(): Promise<IqResponseStanza<'result'>> {
        return await this.xmppChatAdapter.chatConnectionService.sendIq(
            xml('iq', {type: 'get'},
                xml('ping', {xmlns: 'urn:xmpp:ping'})
            )
        );
    }

    private unschedulePings(): void {
        window.clearInterval(this.timeoutHandle);
    }

}
