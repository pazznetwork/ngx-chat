import { Element } from 'ltx';
import { Message } from './message';
import { MessageWithBodyStanza, Stanza } from './stanza';

export interface ChatPlugin {

    /**
     * All onBeforeOnline-Promises have to be resolved before the chat service will emit the 'connected' state.
     * @returns
     */
    onBeforeOnline(): PromiseLike<any>;

    /**
     * Hook for plugins to clear up data.
     */
    onOffline(): void;

    /**
     * True if the given stanza was handled by this plugin, false otherwise.
     * @param stanza
     * @returns
     */
    handleStanza(stanza: Stanza): boolean;

    beforeSendMessage(messageStanza: Element): void;

    afterSendMessage(message: Message, messageStanza: Element): void;

    afterReceiveMessage(message: Message, messageStanza: MessageWithBodyStanza): void;
}
