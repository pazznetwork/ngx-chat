import { Element } from 'ltx';
import { Message } from './message';
import { MessageWithBodyStanza, Stanza } from './stanza';

export interface ChatPlugin {

    canHandleStanza(stanza: Stanza): boolean;

    handleStanza(stanza: Stanza): void;

    beforeSendMessage(messageStanza: Element): void;

    afterSendMessage(message: Message, messageStanza: Element): void;

    afterReceiveMessage(message: Message, messageStanza: MessageWithBodyStanza): void;
}
