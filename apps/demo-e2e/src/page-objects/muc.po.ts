// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Locator, Page } from 'playwright';

export class MucPageObject {
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

  constructor(page: Page) {
    this.listRoomNameLocator = page.locator(`[data-zid="list-room-name"]`);
    this.listRoomJidLocator = page.locator(`[data-zid="list-room-jid"]`);
    this.listRoomLeaveButtonLocator = page.locator(`[data-zid="list-room-leave"]`);
    this.listRoomSelectButtonLocator = page.locator(`[data-zid="list-room-select"]`);
    this.listRoomSubscribeButtonLocator = page.locator(`[data-zid="list-room-subscribe"]`);
    this.listRoomUnsubscribeButtonLocator = page.locator(`[data-zid="list-room-unsubscribe"]`);
    this.listRoomQueryUserListButtonLocator = page.locator(
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

  async selectRoom(index = 0): Promise<void> {
    const all = await this.listRoomSelectButtonLocator.all();
    await all[index]?.click();
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
    roomName?: string,
    membersOnly = true,
    nonAnon = true,
    persistent = true,
    isPublic = false,
    allowSub = false
  ): Promise<void> {
    await this.roomIdInputLocator.fill(roomId);

    if (roomName) {
      await this.newRoomNameInputLocator.fill(roomName);
    }
    if (membersOnly) {
      await this.roomMembersOnlyCheckboxLocator.click();
    }
    if (nonAnon) {
      await this.roomNonAnonCheckboxLocator.click();
    }
    if (persistent) {
      await this.roomPersistentCheckboxLocator.click();
    }
    if (isPublic) {
      await this.roomPublicCheckboxLocator.click();
    }
    if (allowSub) {
      await this.roomAllowSubCheckboxLocator.click();
    }

    await this.roomCreateSubmitButtonLocator.click();
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
  async grantMembership(userJid: string): Promise<void> {
    await this.roomMembershipUserJidInputLocator.fill(userJid);
    await this.roomMembershipGrantButtonLocator.click();
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

  async createRoom(room: string): Promise<void> {
    await this.roomNewIdInputLocator.fill(room);
    await this.roomCreateAndJoinLocator.click();
  }

  async inviteUser(userJid: string): Promise<void> {
    await this.roomInviteUserJidInputLocator.fill(userJid);
    await this.roomInviteUserActionButtonLocator.click();
  }

  async acceptInvite(room: string): Promise<void> {
    await this.roomJoinIdInputLocator.fill(room);
    await this.roomJoinButtonLocator.click();
  }

  async kickUser(userJid: string): Promise<void> {
    await this.roomMemberJidLocator.fill(userJid);
    await this.roomMemberKickButtonLocator.click();
  }

  async destroy(): Promise<void> {
    await this.listRoomDestroyRoomButtonLocator.click();
  }
}
