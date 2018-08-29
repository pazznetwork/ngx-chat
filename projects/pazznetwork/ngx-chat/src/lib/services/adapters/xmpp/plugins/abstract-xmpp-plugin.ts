import { Element } from 'ltx';

import { ChatPlugin, Message, MessageWithBodyStanza, Stanza } from '../../../../core';

export abstract class AbstractXmppPlugin implements ChatPlugin {

    onBeforeOnline(): PromiseLike<any> {
        return Promise.resolve();
    }

    afterSendMessage(message: Message, messageStanza: Element): void {
        return;
    }

    beforeSendMessage(messageStanza: Element): void {
        return;
    }

    handleStanza(stanza: Stanza): boolean {
        return false;
    }

    afterReceiveMessage(message: Message, messageStanza: MessageWithBodyStanza): void {
        return;
    }

}

