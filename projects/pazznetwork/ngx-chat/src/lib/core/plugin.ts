import { Element } from 'ltx';
import { MessageReceivedEvent } from '../services/adapters/xmpp/plugins/message.plugin';
import { Message } from './message';
import { MessageWithBodyStanza, Stanza } from './stanza';

export interface ChatPlugin {

    /**
     * All onBeforeOnline-Promises have to be resolved before the chat service will emit the 'connected' state.
     */
    onBeforeOnline(): PromiseLike<any>;

    /**
     * Hook for plugins to clear up data.
     */
    onOffline(): void;

    /**
     * True if the given stanza was handled by this plugin, false otherwise.
     */
    handleStanza(stanza: Stanza): boolean;

    beforeSendMessage(messageStanza: Element, message?: Message): void;

    afterSendMessage(message: Message, messageStanza: Element): void;

    afterReceiveMessage(message: Message, messageStanza: MessageWithBodyStanza, MessageReceivedEvent: MessageReceivedEvent): void;
}
