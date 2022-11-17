import { Element } from 'ltx';
import { Message } from '../../../../core/message';
import { ChatPlugin } from '../../../../core/plugin';
import { MessageWithBodyStanza, Stanza } from '../../../../core/stanza';
import { MessageReceivedEvent } from './message.plugin';

export abstract class AbstractXmppPlugin implements ChatPlugin {

    onBeforeOnline(): PromiseLike<any> {
        return Promise.resolve();
    }

    onOffline() {
    }

    afterSendMessage(message: Message, messageStanza: Element): void {
        return;
    }

    beforeSendMessage(messageStanza: Element, message: Message): void {
        return;
    }

    handleStanza(stanza: Stanza): boolean {
        return false;
    }

    afterReceiveMessage(message: Message, messageStanza: MessageWithBodyStanza, messageReceivedEvent: MessageReceivedEvent): void {
        return;
    }

}
