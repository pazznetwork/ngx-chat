import { Element } from 'ltx';
import { ChatPlugin, Message, MessageWithBodyStanza, Stanza } from '../core';

export abstract class AbstractPlugin implements ChatPlugin {

    afterSendMessage(message: Message, messageStanza: Element): void {
        return;
    }

    beforeSendMessage(messageStanza: Element): void {
        return;
    }

    canHandleStanza(stanza: Stanza): any {
        return false;
    }

    handleStanza(stanza: Stanza): void {
        return;
    }

    afterReceiveMessage(message: Message, messageStanza: MessageWithBodyStanza): void {
        return;
    }

}

