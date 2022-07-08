import { jid as parseJid, xml } from '@xmpp/client';
import { JID } from '@xmpp/jid';
import { Element } from 'ltx';
import { filter } from 'rxjs/operators';
import { Direction, Message, MessageState } from '../../../../core/message';
import { MessageWithBodyStanza, Stanza } from '../../../../core/stanza';
import { ChatMessageListRegistryService } from '../../../chat-message-list-registry.service';
import { LogService } from '../../../log.service';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { AbstractXmppPlugin } from './abstract-xmpp-plugin';
import { EntityTimePlugin } from './entity-time.plugin';
import { MessageUuidPlugin } from './message-uuid.plugin';
import { MessageReceivedEvent } from './message.plugin';
import { PublishSubscribePlugin } from './publish-subscribe.plugin';

export interface StateDate {
    lastRecipientReceived: Date;
    lastRecipientSeen: Date;
    lastSent: Date;
}

export type JidToMessageStateDate = Map<string, StateDate>;

const STORAGE_NGX_CHAT_CONTACT_MESSAGE_STATES = 'ngxchat:contactmessagestates';
const wrapperNodeName = 'entries';
const nodeName = 'contact-message-state';

/**
 * Plugin using PubSub to persist message read states.
 */
export class MessageStatePlugin extends AbstractXmppPlugin {

    private jidToMessageStateDate: JidToMessageStateDate = new Map();

    constructor(
        private readonly publishSubscribePlugin: PublishSubscribePlugin,
        private readonly xmppChatAdapter: XmppChatAdapter,
        private readonly chatMessageListRegistry: ChatMessageListRegistryService,
        private readonly logService: LogService,
        private readonly entityTimePlugin: EntityTimePlugin,
    ) {
        super();

        this.chatMessageListRegistry.openChats$
            .pipe(
                filter(() => xmppChatAdapter.state$.getValue() === 'online'),
            )
            .subscribe(contacts => {
                contacts.forEach(async contact => {
                    if (contact.mostRecentMessageReceived) {
                        await this.sendMessageStateNotification(
                            contact.jidBare,
                            contact.mostRecentMessageReceived.id,
                            MessageState.RECIPIENT_SEEN);
                    }
                });
            });

        this.publishSubscribePlugin.publish$
            .subscribe((event) => this.handlePubSubEvent(event as Stanza));
    }

    async onBeforeOnline(): Promise<void> {
        this.parseContactMessageStates().catch(err => this.logService.error('error parsing contact message states', err));
    }

    private async parseContactMessageStates(): Promise<void> {
        const itemElement = await this.publishSubscribePlugin.retrieveNodeItems(STORAGE_NGX_CHAT_CONTACT_MESSAGE_STATES);
        this.processPubSub(itemElement);
    }

    private processPubSub(itemElement: Element[]): void {
        let results = [] as [string, StateDate][];
        if (itemElement.length === 1) {
            results = itemElement[0]
                .getChild(wrapperNodeName)
                .getChildren(nodeName)
                .map((contactMessageStateElement: Stanza) => {
                    const {lastRecipientReceived, lastRecipientSeen, lastSent, jid} = contactMessageStateElement.attrs;
                    return [
                        jid,
                        {
                            lastRecipientSeen: new Date(+lastRecipientSeen || 0),
                            lastRecipientReceived: new Date(+lastRecipientReceived || 0),
                            lastSent: new Date(+lastSent || 0),
                        }
                    ];
                });
        }
        this.jidToMessageStateDate = new Map(results);
    }

    private async persistContactMessageStates(): Promise<void> {
        const messageStateElements =
            [...this.jidToMessageStateDate.entries()]
                .map(([jid, stateDates]) =>
                    xml(nodeName, {
                        jid,
                        lastRecipientReceived: String(stateDates.lastRecipientReceived.getTime()),
                        lastRecipientSeen: String(stateDates.lastRecipientSeen.getTime()),
                        lastSent: String(stateDates.lastSent.getTime()),
                    })
                );

        await this.publishSubscribePlugin.storePrivatePayloadPersistent(
            STORAGE_NGX_CHAT_CONTACT_MESSAGE_STATES,
            'current',
            xml(wrapperNodeName, {}, messageStateElements));
    }

    onOffline(): void {
        this.jidToMessageStateDate.clear();
    }

    beforeSendMessage(messageStanza: Element, message: Message): void {
        const {type} = messageStanza.attrs;
        if (type === 'chat' && message) {
            message.state = MessageState.SENDING;
        }
    }

    async afterSendMessage(message: Message, messageStanza: Element): Promise<void> {
        const {type, to} = messageStanza.attrs;
        if (type === 'chat') {
            this.updateContactMessageState(
                parseJid(to).bare().toString(),
                MessageState.SENT,
                new Date(await this.entityTimePlugin.getNow()));
            delete message.state;
        }
    }

    afterReceiveMessage(messageReceived: Message, stanza: MessageWithBodyStanza, messageReceivedEvent: MessageReceivedEvent): void {
        const messageStateElement = stanza.getChild('message-state', STORAGE_NGX_CHAT_CONTACT_MESSAGE_STATES);
        if (messageStateElement) {
            // we received a message state or a message via carbon from another resource, discard it
            messageReceivedEvent.discard = true;
        } else if (messageReceived.direction === Direction.in && !messageReceived.fromArchive && stanza.attrs.type !== 'groupchat') {
            this.acknowledgeReceivedMessage(stanza);
        }
    }

    private acknowledgeReceivedMessage(stanza: MessageWithBodyStanza): void {
        const {from} = stanza.attrs;
        const isChatWithContactOpen = this.chatMessageListRegistry.isChatOpen(this.xmppChatAdapter.getOrCreateContactById(from));
        const state = isChatWithContactOpen ? MessageState.RECIPIENT_SEEN : MessageState.RECIPIENT_RECEIVED;
        const messageId = MessageUuidPlugin.extractIdFromStanza(stanza);
        this.sendMessageStateNotification(parseJid(from), messageId, state).catch(e => this.logService.error('error sending state notification', e));
    }

    private async sendMessageStateNotification(recipient: JID, messageId: string, state: MessageState): Promise<void> {
        const messageStateResponse = xml('message', {
                to: recipient.bare().toString(),
                from: this.xmppChatAdapter.chatConnectionService.userJid.toString(),
                type: 'chat'
            },
            xml('message-state', {
                xmlns: STORAGE_NGX_CHAT_CONTACT_MESSAGE_STATES,
                messageId,
                date: new Date(await this.entityTimePlugin.getNow()).toISOString(),
                state
            })
        );
        await this.xmppChatAdapter.chatConnectionService.send(messageStateResponse);
    }

    handleStanza(stanza: Stanza): boolean {
        const {type, from} = stanza.attrs;
        const stateElement = stanza.getChild('message-state', STORAGE_NGX_CHAT_CONTACT_MESSAGE_STATES);
        if (type === 'chat' && stateElement) {
            this.handleStateNotificationStanza(stateElement, from);
            return true;
        }
        return false;
    }

    private handleStateNotificationStanza(stateElement: Element, from: string): void {
        const {state, date} = stateElement.attrs;
        const contact = this.xmppChatAdapter.getOrCreateContactById(from);
        const stateDate = new Date(date);
        this.updateContactMessageState(contact.jidBare.toString(), state, stateDate);
    }

    private updateContactMessageState(contactJid: string, state: MessageState, stateDate: Date): void {
        const current = this.getContactMessageState(contactJid);
        let changed = false;
        if (state === MessageState.RECIPIENT_RECEIVED && current.lastRecipientReceived < stateDate) {
            current.lastRecipientReceived = stateDate;
            changed = true;
        } else if (state === MessageState.RECIPIENT_SEEN && current.lastRecipientSeen < stateDate) {
            current.lastRecipientReceived = stateDate;
            current.lastRecipientSeen = stateDate;
            changed = true;
        } else if (state === MessageState.SENT && current.lastSent < stateDate) {
            current.lastSent = stateDate;
            changed = true;
        }
        if (changed) {
            this.persistContactMessageStates().catch(err => this.logService.error('error persisting contact message states', err));
        }
    }

    public getContactMessageState(contactJid: string): StateDate | undefined {
        if (!this.jidToMessageStateDate.has(contactJid)) {
            this.jidToMessageStateDate.set(
                contactJid,
                {
                    lastRecipientReceived: new Date(0),
                    lastRecipientSeen: new Date(0),
                    lastSent: new Date(0),
                }
            );
        }
        return this.jidToMessageStateDate.get(contactJid);
    }

    private handlePubSubEvent(event: Element): void {
        const items: Element | undefined = event.getChild('items');
        const itemsNode = items?.attrs.node;
        const itemElements: Element[] | undefined = items?.getChildren('item');
        if (itemsNode === STORAGE_NGX_CHAT_CONTACT_MESSAGE_STATES && itemElements) {
            this.processPubSub(itemElements);
        }
    }
}
