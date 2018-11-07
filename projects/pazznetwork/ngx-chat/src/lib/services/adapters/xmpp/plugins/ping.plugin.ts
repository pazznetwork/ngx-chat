import { x as xml } from '@xmpp/xml';
import { filter } from 'rxjs/operators';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { AbstractXmppPlugin } from './abstract-xmpp-plugin';

/**
 * xep-0199
 */
export class PingPlugin extends AbstractXmppPlugin {

    private timeoutHandle: any;
    private readonly pingInterval = 5000;

    constructor(private xmppChatAdapter: XmppChatAdapter) {
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
        this.timeoutHandle = window.setInterval(() => this.ping(), this.pingInterval);
    }

    private async ping() {
        await this.xmppChatAdapter.chatConnectionService.sendIq(
            xml('iq', {type: 'get'},
                xml('ping', {xmlns: 'urn:xmpp:ping'})
            )
        );
    }

    private unschedulePings() {
        window.clearInterval(this.timeoutHandle);
    }

}
