import { x as xml } from '@xmpp/xml';
import { Element } from 'ltx';
import { IqResponseStanza } from '../../../../core';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { AbstractXmppPlugin } from './abstract-xmpp-plugin';
import { PublishSubscribePlugin } from './publish-subscribe.plugin';

export interface SavedConference {
    name: string;
    jid: string;
    autojoin: boolean;
}

export class BookmarkPlugin extends AbstractXmppPlugin {

    private static readonly STORAGE_BOOKMARKS = 'storage:bookmarks';

    constructor(private xmppChatAdapter: XmppChatAdapter) {
        super();
    }

    async retrieveMultiUserChatRooms(): Promise<SavedConference[]> {
        const itemNodes = await this.xmppChatAdapter.getPlugin(PublishSubscribePlugin).retrieveNodeItems(BookmarkPlugin.STORAGE_BOOKMARKS);
        return itemNodes.map(itemNode => this.convertElementToSavedConference(itemNode));
    }

    private convertElementToSavedConference(itemNode: Element): SavedConference {
        const conferenceNode = itemNode.getChild('storage', BookmarkPlugin.STORAGE_BOOKMARKS).getChild('conference');
        return {
            name: conferenceNode.attrs.name,
            jid: conferenceNode.attrs.jid,
            autojoin: conferenceNode.attrs.autojoin === 'true'
        };
    }

    saveConference(conferenceToSave: SavedConference): Promise<IqResponseStanza> {
        return this.xmppChatAdapter.getPlugin(PublishSubscribePlugin).publishPrivate(
            'storage:bookmarks',
            conferenceToSave.jid,
            xml('storage', {xmlns: BookmarkPlugin.STORAGE_BOOKMARKS},
                this.convertSavedConferenceToElement(conferenceToSave)
            )
        );
    }

    private convertSavedConferenceToElement(savedConference: SavedConference) {
        const {name, autojoin, jid} = savedConference;
        return xml('conference', {name, jid, autojoin: autojoin.toString()});
    }

}
