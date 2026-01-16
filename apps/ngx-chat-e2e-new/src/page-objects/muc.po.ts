// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Locator, Page } from 'playwright';

export class MucPageObject {
  private readonly page: Page;
  private readonly domain: string;

  private readonly listRoomNameLocator: Locator;
  private readonly listRoomJidLocator: Locator;
  private readonly listRoomLeaveButtonLocator: Locator;
  private readonly listRoomSelectButtonLocator: Locator;
  private readonly listRoomSubscribeButtonLocator: Locator;
  private readonly listRoomUnsubscribeButtonLocator: Locator;
  private readonly listRoomQueryUserListButtonLocator: Locator;
  private readonly listRoomGetRoomConfigurationButtonLocator: Locator;
  private readonly listRoomDestroyRoomButtonLocator: Locator;

  private readonly roomJoinIdInputLocator: Locator;
  private readonly roomJoinButtonLocator: Locator;

  private readonly roomIdInputLocator: Locator;
  private readonly newRoomNameInputLocator: Locator;
  private readonly roomMembersOnlyCheckboxLocator: Locator;
  private readonly roomNonAnonCheckboxLocator: Locator;
  private readonly roomPersistentCheckboxLocator: Locator;
  private readonly roomPublicCheckboxLocator: Locator;
  private readonly roomAllowSubCheckboxLocator: Locator;
  private readonly roomCreateSubmitButtonLocator: Locator;
  private readonly roomNewIdInputLocator: Locator;
  private readonly roomCreateAndJoinLocator: Locator;
  private readonly roomMemberJidLocator: Locator;

  private readonly roomMemberNickLocator: Locator;
  private readonly roomMemberAffiliationLocator: Locator;
  private readonly roomMemberRoleLocator: Locator;
  private readonly roomMemberKickButtonLocator: Locator;
  private readonly roomMemberBanOrUnbanButtonLocator: Locator;

  private readonly roomGetSubsButtonLocator: Locator;

  private readonly roomSubjectInputLocator: Locator;
  private readonly roomSubjectChangeButtonLocator: Locator;
  private readonly roomMemberNickInputLocator: Locator;
  private readonly roomMemberNickChangeButtonLocator: Locator;
  private readonly roomInviteUserJidInputLocator: Locator;
  private readonly roomInviteUserActionButtonLocator: Locator;
  private readonly roomMembershipUserJidInputLocator: Locator;
  private readonly roomMembershipRevokeButtonLocator: Locator;
  private readonly roomMembershipGrantButtonLocator: Locator;
  private readonly roomModeratorUserJidInputLocator: Locator;
  private readonly roomModeratorRevokeButtonLocator: Locator;
  private readonly roomModeratorGrantButtonLocator: Locator;
  private readonly roomAdminUserJidInputLocator: Locator;
  private readonly roomAdminRevokeButtonLocator: Locator;
  private readonly roomAdminGrantButtonLocator: Locator;
  private readonly roomConfigVariableLocator: Locator;
  private readonly roomConfigValueLocator: Locator;
  private readonly roomConfigLabelLocator: Locator;

  constructor(page: Page, domain: string) {
    this.page = page;
    this.domain = domain;
    this.newRoomNameInputLocator = this.page.locator(
      '[data-zid="room-create-room-name-input"]'
    );
    this.listRoomNameLocator = this.page.locator(`[data-zid="list-room-name"]`);
    this.listRoomJidLocator = this.page.locator(`[data-zid="list-room-jid"]`);
    this.listRoomLeaveButtonLocator = this.page.locator(`[data-zid="list-room-leave"]`);
    this.listRoomSelectButtonLocator = this.page.locator(`[data-zid="list-room-select"]`);
    this.listRoomSubscribeButtonLocator = this.page.locator(`[data-zid="list-room-subscribe"]`);
    this.listRoomUnsubscribeButtonLocator = this.page.locator(`[data-zid="list-room-unsubscribe"]`);
    this.listRoomQueryUserListButtonLocator = this.page.locator(
      `[data-zid="list-room-query-user-list"]`
    );
    this.listRoomGetRoomConfigurationButtonLocator = page.locator(
      `[data-zid="list-room-get-room-configuration"]`
    );
    this.listRoomDestroyRoomButtonLocator = page.locator(`[data-zid="list-room-destroy-room"]`);

    this.roomJoinIdInputLocator = page.locator(`[data-zid="room-join-id"]`);
    this.roomJoinButtonLocator = page.locator(`[data-zid="join-room"]`);

    this.roomIdInputLocator = page.locator(`[data-zid="room-id"]`);
    this.newRoomNameInputLocator = page.locator(`[data-zid="new-room-name"]`);
    this.roomMembersOnlyCheckboxLocator = page.locator(`[data-zid="room-members-only"]`);
    this.roomNonAnonCheckboxLocator = page.locator(`[data-zid="room-non-anon"]`);
    this.roomPersistentCheckboxLocator = page.locator(`[data-zid="room-persistent"]`);
    this.roomPublicCheckboxLocator = page.locator(`[data-zid="room-public"]`);
    this.roomAllowSubCheckboxLocator = page.locator(`[data-zid="room-allow-sub"]`);
    this.roomCreateSubmitButtonLocator = page.locator(`[data-zid="room-create-submit"]`);

    this.roomNewIdInputLocator = page.locator(`[data-zid="room-new-id"]`);
    this.roomCreateAndJoinLocator = page.locator(`[data-zid="create-room"]`);

    this.roomMemberJidLocator = page.locator(`[data-zid="room-member-jid"]`);
    this.roomMemberNickLocator = page.locator(`[data-zid="room-member-nick"]`);
    this.roomMemberAffiliationLocator = page.locator(`[data-zid="room-member-affiliation"]`);
    this.roomMemberRoleLocator = page.locator(`[data-zid="room-member-role"]`);
    this.roomMemberKickButtonLocator = page.locator(`[data-zid="room-member-kick"]`);
    this.roomMemberBanOrUnbanButtonLocator = page.locator(`[data-zid="room-member-ban-or-unban"]`);

    this.roomGetSubsButtonLocator = page.locator(`[data-zid="room-get-subs"]`);

    this.roomSubjectInputLocator = page.locator(`[data-zid="room-subject"]`);
    this.roomSubjectChangeButtonLocator = page.locator(`[data-zid="room-subject-change"]`);
    this.roomMemberNickInputLocator = page.locator(`[data-zid="room-member-nick"]`);
    this.roomMemberNickChangeButtonLocator = page.locator(`[data-zid="room-member-nick-change"]`);
    this.roomInviteUserJidInputLocator = page.locator(`[data-zid="room-invite-user-jid"]`);
    this.roomInviteUserActionButtonLocator = page.locator(`[data-zid="room-invite-user-action"]`);

    this.roomMembershipUserJidInputLocator = page.locator(`[data-zid="room-membership-user-jid"]`);
    this.roomMembershipRevokeButtonLocator = page.locator(`[data-zid="room-membership-revoke"]`);
    this.roomMembershipGrantButtonLocator = page.locator(`[data-zid="room-membership-grant"]`);

    this.roomModeratorUserJidInputLocator = page.locator(`[data-zid="room-moderator-user-jid"]`);
    this.roomModeratorRevokeButtonLocator = page.locator(`[data-zid="room-moderator-revoke"]`);
    this.roomModeratorGrantButtonLocator = page.locator(`[data-zid="room-moderator-grant"]`);

    this.roomAdminUserJidInputLocator = page.locator(`[data-zid="room-admin-user-jid"]`);
    this.roomAdminRevokeButtonLocator = page.locator(`[data-zid="room-admin-revoke"]`);
    this.roomAdminGrantButtonLocator = page.locator(`[data-zid="room-admin-grant"]`);

    this.roomConfigVariableLocator = page.locator(`[data-zid="room-config-variable"]`);
    this.roomConfigValueLocator = page.locator(`[data-zid="room-config-value"]`);
    this.roomConfigLabelLocator = page.locator(`[data-zid="room-config-label"]`);
  }

  async getRoomName(index = 0): Promise<string | null | undefined> {
    const all = await this.listRoomNameLocator.all();
    return all[index]?.textContent();
  }

  async getRoomJid(index = 0): Promise<string | null | undefined> {
    const all = await this.listRoomJidLocator.all();
    return all[index]?.textContent();
  }

  async selectRoom(roomName: string = ''): Promise<void> {
    await this.listRoomNameLocator.filter({ hasText: roomName }).click();
  }

  async waitForRoom(roomName: string): Promise<void> {
    await this.page.waitForFunction((name) => {
      const app = (window as any).ng.getComponent(document.querySelector('app-root'));
      if (!app) return false;
      const roomService = app.chatService.roomService;
      // Access private plugin then private map
      const map = (roomService as any).multiUserPlugin?.roomsMap;
      if (map && map instanceof Map) {
        const rooms = Array.from(map.values());
        return rooms.some((r: any) => r.name === name || r.jid.toString().includes(name));
      }
      return false;
    }, roomName);
  }

  async leaveRoom(index = 0): Promise<void> {
    const all = await this.listRoomLeaveButtonLocator.all();
    await all[index]?.click();
  }

  async subscribeToRoom(index = 0): Promise<void> {
    const all = await this.listRoomSubscribeButtonLocator.all();
    await all[index]?.click();
  }

  async unsubscribeToRoom(index = 0): Promise<void> {
    const all = await this.listRoomUnsubscribeButtonLocator.all();
    await all[index]?.click();
  }

  async queryUserListRoom(index = 0): Promise<void> {
    const all = await this.listRoomQueryUserListButtonLocator.all();
    await all[index]?.click();
  }

  async getConfigurationForRoom(index = 0): Promise<void> {
    const all = await this.listRoomGetRoomConfigurationButtonLocator.all();
    await all[index]?.click();
  }

  async createRoomWithConfiguration(
    roomId: string,
    roomName: string | undefined,
    membersOnly = true,
    nonAnon = true,
    persistent = true,
    isPublic = false,
    allowSub = false
  ): Promise<void> {
    await this.page.waitForFunction(() => !!(window as any).app).catch(() => console.warn('Timed out waiting for window.app in acceptInvite'));
    await this.page.evaluate(
      async ({ roomId, roomName, membersOnly, nonAnon, persistent, isPublic, allowSub }) => {
        const app = (window as any).app; // Access exposed App component
        if (!app || !app.chatService) {
          throw new Error('window.app or chatService not found. App might not be initialized.');
        }
        const options = {
          roomId,
          name: roomName,
          membersOnly,
          nonAnonymous: nonAnon,
          persistentRoom: persistent,
          public: isPublic,
          allowSubscription: allowSub,
          enableLogging: persistent,
          mam: persistent // Ensure MAM is enabled for persistence
        };
        await app.chatService.roomService.createRoom(options);
      },
      { roomId, roomName, membersOnly, nonAnon, persistent, isPublic, allowSub }
    );
  }

  async getUserListNick(index = 0): Promise<string | null | undefined> {
    const all = await this.roomMemberNickLocator.all();
    return all[index]?.textContent();
  }

  async getUserListAffiliation(index = 0): Promise<string | null | undefined> {
    const all = await this.roomMemberAffiliationLocator.all();
    return all[index]?.textContent();
  }

  async getUserListRole(index = 0): Promise<string | null | undefined> {
    const all = await this.roomMemberRoleLocator.all();
    return all[index]?.textContent();
  }

  async kickByUserList(index = 0): Promise<void> {
    const all = await this.roomMemberKickButtonLocator.all();
    await all[index]?.click();
  }

  async banOrUnbanByUserList(index = 0): Promise<void> {
    const all = await this.roomMemberBanOrUnbanButtonLocator.all();
    await all[index]?.click();
  }

  async getRoomSubscriptions(): Promise<void> {
    await this.roomGetSubsButtonLocator.click();
  }

  async changeRoomsSubject(subject: string): Promise<void> {
    await this.roomSubjectInputLocator.fill(subject);
    await this.roomSubjectChangeButtonLocator.click();
  }

  async changeNickForRoom(nick: string): Promise<void> {
    await this.roomMemberNickInputLocator.fill(nick);
    await this.roomMemberNickChangeButtonLocator.click();
  }

  async revokeMembership(userJid: string): Promise<void> {
    await this.roomMembershipUserJidInputLocator.fill(userJid);
    await this.roomMembershipRevokeButtonLocator.click();
  }
  async grantMembership(userJid: string, roomJid: string): Promise<void> {
    const fullRoomJid = roomJid;
    await this.page.waitForFunction(() => {
      const root = document.querySelector('app-root');
      return root && (window as any).ng && (window as any).ng.getComponent(root);
    });

    await this.page.evaluate(
      async ({ userJid, fullRoomJid }) => {
        // @ts-ignore
        const app = (window as any).ng.getComponent(document.querySelector('app-root'));
        if (!app) throw new Error('App not initialized');
        await app.chatService.roomService.grantMembershipForRoom(userJid, fullRoomJid);
      },
      { userJid, fullRoomJid }
    );
  }

  async revokeModerator(userJid: string): Promise<void> {
    await this.roomModeratorUserJidInputLocator.fill(userJid);
    await this.roomModeratorRevokeButtonLocator.click();
  }
  async grantModerator(userJid: string): Promise<void> {
    await this.roomModeratorUserJidInputLocator.fill(userJid);
    await this.roomModeratorGrantButtonLocator.click();
  }

  async revokeAdmin(userJid: string): Promise<void> {
    await this.roomAdminUserJidInputLocator.fill(userJid);
    await this.roomAdminRevokeButtonLocator.click();
  }
  async grantAdmin(userJid: string): Promise<void> {
    await this.roomAdminUserJidInputLocator.fill(userJid);
    await this.roomAdminGrantButtonLocator.click();
  }

  async getConfigRow(index = 0): Promise<{
    variable: string | null | undefined;
    value: string | null | undefined;
    label: string | null | undefined;
  }> {
    const allVar = await this.roomConfigVariableLocator.all();
    const variable = await allVar[index]?.textContent();
    const allValue = await this.roomConfigValueLocator.all();
    const value = await allValue[index]?.textContent();
    const allLabel = await this.roomConfigLabelLocator.all();
    const label = await allLabel[index]?.textContent();
    return { variable, value, label };
  }

  async createRoom(
    room: string,
    nick: string,
    options: {
      membersOnly?: boolean;
      nonAnon?: boolean;
      persistent?: boolean;
      isPublic?: boolean;
      mam?: boolean;
      moderated?: boolean;
    } = {}
  ): Promise<void> {
    // Note: Nick is currently ignored by the UI (uses logged in user), but kept for signature compatibility
    await this.page.waitForFunction(() => !!(window as any).app).catch(() => console.warn('Timed out waiting for window.app in acceptInvite'));
    await this.page.evaluate(
      async ({ room, options }) => {
        const app = (window as any).app;
        if (!app) throw new Error('App not initialized');

        await app.chatService.roomService.createRoom({
          roomId: room,
          name: room,
          membersOnly: options.membersOnly,
          nonAnonymous: options.nonAnon,
          public: options.isPublic,
          enableLogging: options.persistent, // usually paired
          mam: options.mam,
          moderated: options.moderated
        });
        // Auto-join after creation to match UI behavior
        await app.chatService.roomService.joinRoom(`${room}@conference.${app.domain}`);
      },
      { room, options }
    );
  }

  async inviteUser(userJid: string, roomJidPrefix: string): Promise<void> {
    await this.page.waitForFunction(() => !!(window as any).app).catch(() => console.warn('Timed out waiting for window.app in acceptInvite'));
    await this.page.evaluate(
      async ({ userJid, roomJidPrefix }) => {
        const app = (window as any).app;
        if (!app) throw new Error('App not initialized');
        await app.inviteUser(roomJidPrefix, userJid);
      },
      { userJid, roomJidPrefix }
    );
  }

  async joinRoom(room: string, nick?: string): Promise<void> {
    const jidToJoin = nick && !room.includes('/') ? `${room}/${nick}` : room;
    await this.page.waitForFunction(() => {
      const root = document.querySelector('app-root');
      return root && (window as any).ng && (window as any).ng.getComponent(root);
    });
    await this.page.evaluate(async (roomJid) => {
      // @ts-ignore
      const app = (window as any).ng.getComponent(document.querySelector('app-root'));
      await app.chatService.roomService.joinRoom(roomJid);
    }, jidToJoin);
  }

  async acceptInvite(room: string): Promise<void> {
    const fullRoomJid = room.includes('@') ? room : `${room}@conference.${this.domain}`;
    await this.page.waitForFunction(() => {
      const root = document.querySelector('app-root');
      return root && (window as any).ng && (window as any).ng.getComponent(root);
    });
    await this.page.evaluate(
      async ({ fullRoomJid }) => {
        try {
          // @ts-ignore
          const app = (window as any).ng.getComponent(document.querySelector('app-root'));
          if (!app) throw new Error('App not initialized');
          await app.chatService.roomService.joinRoom(fullRoomJid);
        } catch (e: any) {
          throw e; // Re-throw to fail test
        }
      },
      { fullRoomJid }
    );
  }

  async kickUser(userJid: string, roomJidPrefix: string): Promise<void> {
    await this.page.waitForFunction(() => !!(window as any).app).catch(() => console.warn('Timed out waiting for window.app in acceptInvite'));
    await this.page.evaluate(
      async ({ userJid, roomJidPrefix, domain }) => {
        const app = (window as any).app;
        const roomJid = `${roomJidPrefix}@conference.${domain}`;
        const nick = userJid; // Simplified assumption for test
        await app.chatService.roomService.kickFromRoom(nick, roomJid);
      },
      { userJid, roomJidPrefix, domain: this.domain }
    );
  }

  async destroy(): Promise<void> {
    await this.listRoomDestroyRoomButtonLocator.click();
  }
}
