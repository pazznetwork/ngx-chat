// SPDX-License-Identifier: MIT
import type { ChatPlugin, IqResponseStanza } from '../core';
import { removeDuplicates } from '@pazznetwork/ngx-chat-shared';
import { Subject } from 'rxjs';
import type { XmppService } from '../xmpp.service';
import type { XmppConnectionService } from '../service';
import type { StanzaBuilder } from '../stanza-builder';

export interface SavedConference {
  name: string;
  jid: string;
  autojoin: boolean;
}

const nsBookmarks = 'storage:bookmarks';

const nsPEPNativeBookmarks = 'urn:xmpp:bookmarks:1';

/**
 * XEP-0402 (https://xmpp.org/extensions/xep-0402.html)
 *  replaces XEP-0048 Bookmarks (https://xmpp.org/extensions/xep-0048.html)
 */
export class BookmarkPlugin implements ChatPlugin {
  private readonly bookmarkSubject = new Subject<Bookmark[]>();

  readonly bookmarks$ = this.bookmarkSubject.asObservable();

  readonly nameSpace = nsPEPNativeBookmarks;

  private pendingAddConference: Promise<IqResponseStanza<'result'>> | null = null;

  constructor(private readonly chatAdapter: XmppService) {
    // chatAdapter.onOnline$.subscribe(async () => this.bookmarkSubject.next(await this.getBooksMarks()))
  }

  registerHandler(_connection: XmppConnectionService): Promise<void> {
    throw new Error('Method not implemented.');
  }

  onOffline(): void {
    this.pendingAddConference = null;
  }

  async getBooksMarks(): Promise<Bookmark[]> {
    const bookMarks = await this.chatAdapter.pluginMap.pubSub.retrieveNodeItems(
      nsPEPNativeBookmarks
    );
    return bookMarks.map((item) => {
      const conference = item.querySelector('conference');

      const extensionsFromEl = conference?.querySelector('extensions')?.children;
      const extensions = extensionsFromEl ? Array.from(extensionsFromEl) : [];
      return {
        id: item.getAttribute('id'),
        conference: {
          name: conference?.getAttribute('name'),
          autojoin: !!conference?.getAttribute('autojoin'),
          nick: conference?.querySelector('nick')?.textContent,
          password: conference?.querySelector('password')?.textContent,
          extensions,
        },
      } as Bookmark;
    });
  }

  async retrieveMultiUserChatRooms(): Promise<SavedConference[]> {
    const nodeItems = await this.chatAdapter.pluginMap.pubSub.retrieveNodeItems(nsBookmarks);

    if (nodeItems[0] == null) {
      return [];
    }

    const storageNode = Array.from(nodeItems[0].querySelectorAll('storage')).find(
      (el) => el.getAttribute('xmlns') === nsBookmarks
    );

    if (!storageNode) {
      return [];
    }

    const conferenceNodes = Array.from(storageNode.querySelectorAll('conference'));
    return conferenceNodes.reduce((acc, node) => {
      const name = node.getAttribute('name');
      const jid = node.getAttribute('jid');
      const autojoin = node.getAttribute('autojoin') === 'true';

      if (name != null && jid != null) {
        acc.push({ name, jid, autojoin });
      }
      return acc;
    }, [] as SavedConference[]);
  }

  saveConferences(conferences: SavedConference[]): Promise<IqResponseStanza<'result'>> {
    const deduplicatedConferences = removeDuplicates(conferences, (x, y) => x.jid === y.jid);
    return this.chatAdapter.pluginMap.pubSub.storePrivatePayloadPersistent(
      nsBookmarks,
      undefined,
      (builder: StanzaBuilder) => {
        builder.c('storage', { xmlns: nsBookmarks });
        deduplicatedConferences.map((conference) => {
          const { name, autojoin, jid } = conference;
          builder.c('conference', { name, jid, autojoin: autojoin.toString() });
        });
        return builder;
      }
    );
  }

  async addConference(conferenceToSave: SavedConference): Promise<IqResponseStanza<'result'>> {
    while (this.pendingAddConference) {
      await this.pendingAddConference; // serialize the writes, so that in case of multiple conference adds all get added
    }

    this.pendingAddConference = this.addConferenceInternal(conferenceToSave);

    try {
      return await this.pendingAddConference;
    } finally {
      this.pendingAddConference = null;
    }
  }

  private async addConferenceInternal(
    conferenceToSave: SavedConference
  ): Promise<IqResponseStanza<'result'>> {
    const savedConferences = await this.retrieveMultiUserChatRooms();
    const conferences = [...savedConferences, conferenceToSave];

    return this.saveConferences(conferences);
  }
}

export interface Bookmark {
  /**
   * jid from a muc as item id from items
   */
  id: string;
  conference: Conference;
}

export interface Conference {
  /**
   * A set of child elements (of potentially any namespace). Clients MUST preserve these (particularly preserving unknown elements) when editing items.
   */
  extensions?: Element[];

  /**
   * A password used to access the chatroom. Note this is not intended to be a secure storage.
   */
  password?: string;

  /**
   * A friendly name for the bookmark, specified by the user. Clients SHOULD NOT attempt to autogenerate this from the JID.
   */
  name?: string;

  /**
   * The user's preferred roomnick for the chatroom, if different to that specified by User Nickname (XEP-0172) [1].
   * In the absence of this element being present, the nickname from User Nickname (XEP-0172) [1] SHOULD be used if present.
   *
   * Links:
   *  [1] https://xmpp.org/extensions/xep-0172.html
   */
  nick?: string;

  /**
   * Whether the client should automatically join the conference room on login.
   *  defaults to false
   */
  autojoin: boolean;
}
