import { x as xml } from '@xmpp/xml';
import { Element } from 'ltx';
import { IqResponseStanza } from '../../../../core';
import { AbstractXmppPlugin } from './abstract-xmpp-plugin';
import { PublishSubscribePlugin } from './publish-subscribe.plugin';

export interface SavedConference {
    name: string;
    jid: string;
    autojoin: boolean;
}

export const STORAGE_BOOKMARKS = 'storage:bookmarks';

/**
 * XEP-0048
 */
export class BookmarkPlugin extends AbstractXmppPlugin {

    constructor(private publishSubscribePlugin: PublishSubscribePlugin) {
        super();
    }

    async retrieveMultiUserChatRooms(): Promise<SavedConference[]> {
        const itemNodes = await this.publishSubscribePlugin.retrieveNodeItems(STORAGE_BOOKMARKS);
        return itemNodes.map(itemNode => this.convertElementToSavedConference(itemNode));
    }

    private convertElementToSavedConference(itemNode: Element): SavedConference {
        const conferenceNode = itemNode.getChild('storage', STORAGE_BOOKMARKS).getChild('conference');
        return {
            name: conferenceNode.attrs.name,
            jid: conferenceNode.attrs.jid,
            autojoin: conferenceNode.attrs.autojoin === 'true'
        };
    }

    saveConference(conferenceToSave: SavedConference): Promise<IqResponseStanza> {
        return this.publishSubscribePlugin.storePrivatePayloadPersistent(
            STORAGE_BOOKMARKS,
            conferenceToSave.jid,
            xml('storage', {xmlns: STORAGE_BOOKMARKS},
                this.convertSavedConferenceToElement(conferenceToSave)
            )
        );
    }

    private convertSavedConferenceToElement(savedConference: SavedConference) {
        const {name, autojoin, jid} = savedConference;
        return xml('conference', {name, jid, autojoin: autojoin.toString()});
    }

}
