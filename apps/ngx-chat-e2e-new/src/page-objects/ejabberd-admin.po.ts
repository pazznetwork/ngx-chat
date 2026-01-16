// SPDX-License-Identifier: AGPL-3.0-or-later
import { APIRequestContext, expect, Page } from '@playwright/test';

const devXmppDomain = 'local-jabber.entenhausen.pazz.de';
const devXmppJid = 'local-admin@local-jabber.entenhausen.pazz.de';
const devXmppPassword = 'AdminLocalPassword123!';

const devUserName = devXmppJid;
export class EjabberdAdminPage {
  private constructor(private readonly host: string, private readonly context: APIRequestContext) { }
  static async getAllJabberUsersBesidesAdmin(
    page: Page,
    adminUsername = devUserName,
    adminPassword = devXmppPassword
  ): Promise<string[]> {
    const adminBase =
      'https://' + adminUsername + ':' + adminPassword + '@local-jabber.entenhausen.pazz.de:5280';
    const usersPath = '/admin/server/local-jabber.entenhausen.pazz.de/users';
    await page.goto(adminBase + usersPath);
    const userAnchors = page.locator('tbody tr td:first-child a');
    const users = await userAnchors.evaluateAll<string[], HTMLAnchorElement>((anchors) =>
      anchors.map((anchor) => anchor?.href?.split('user/')?.[1]?.replace('/', '') ?? '')
    );
    return users.filter((user) => user.toLowerCase() !== adminUsername.toLowerCase());
  }

  static async deleteUsers(
    page: Page,
    adminUsername = devUserName,
    adminPassword = devXmppPassword,
    users: string[]
  ): Promise<void> {
    const adminBase = `https://${adminUsername}:${adminPassword}@local-jabber.entenhausen.pazz.de:5280`;
    const hostPath = '/admin/server/local-jabber.entenhausen.pazz.de';
    const userPath = (userName: string): string => '/user/' + userName.toLowerCase() + '/';
    const userUrl = (userName: string): string => adminBase + hostPath + userPath(userName);

    const removeUserButton = page.locator('input[name=removeuser]');

    const deleteUser = (): Promise<void> => removeUserButton.click();
    const goToUserSettings = (userName: string): Promise<unknown> => page.goto(userUrl(userName));
    for (const user of users) {
      await goToUserSettings(user);
      const found = await removeUserButton.count();
      expect(found, `No delete for user=${user}`).toBe(1);
      await deleteUser();
    }
  }
  async deleteAllBesidesAdminUser(): Promise<void> {
    try {
      const rooms = await this.getMucRooms();
      for (const room of rooms) {
        if (!room) continue;
        const roomName = room.split('@')[0] ?? '';
        try {
          await this.destroyRoom(roomName);
          console.log(`Destroyed room: ${roomName}`);
        } catch (e) {
          console.warn(`Failed to destroy room ${roomName}:`, e);
        }
      }
    } catch (e) {
      console.warn('Failed to cleanup rooms:', e);
    }

    try {
      const users = await this.registeredUsers();
      // Filter out 'local-admin' but include generated test users
      // Limit to 200 users to prevent timeouts if list is huge
      const usersToDelete = users
        .filter((user) => user.toLowerCase() !== 'local-admin' && user.length < 60);

      if (usersToDelete.length > 0) {
        console.log(`Cleaning up ${usersToDelete.length} users...`);
        const batchSize = 20;
        for (let i = 0; i < usersToDelete.length; i += batchSize) {
          const batch = usersToDelete.slice(i, i + batchSize);
          await Promise.all(
            batch.map(async (user) => {
              if (!user) return;
              const username = user.split('@')[0] ?? '';
              try {
                await this.unregister(username);
              } catch (e) {
                // Ignore individual failures
              }
            })
          );
          // Small throttle between batches to be kind to the server
          await new Promise((r) => setTimeout(r, 20));
        }
      }
    } catch (e) {
      console.warn('Failed to cleanup users:', e);
    }
  }

  async unregister(user: string): Promise<void> {
    await this.executeRequest('unregister', {
      user,
      host: this.host,
    });
  }

  async destroyRoom(room: string, service = 'conference.' + devXmppDomain): Promise<unknown> {
    return this.executeRequest('destroy_room', {
      name: room,
      service,
    });
  }

  async getMucRooms(): Promise<string[]> {
    return this.executeRequest('muc_online_rooms', { service: 'global' });
  }

  async changeRoomOption(room: string, option: string, value: string, service = 'conference.' + devXmppDomain): Promise<void> {
    const res = await this.executeRequest('change_room_option', {
      name: room,
      service,
      option,
      value
    });
    console.log(`[AdminAPI] changeRoomOption ${option}=${value} for ${room}:`, res);
  }

  async sendMessage(from: string, to: string, body: string, subject = ''): Promise<void> {
    await this.executeRequest('send_message', {
      type: 'chat',
      from,
      to,
      subject,
      body,
    });
  }

  async register(user: string, password: string): Promise<void> {
    try {
      await this.executeRequest('register', {
        user,
        password,
        host: this.host,
      });
    } catch (e) {
      console.warn(`Register failed (user likely exists): ${e}`);
    }
    // Ensure password is correct even if user already existed
    await this.executeRequest('change_password', {
      user,
      newpass: password,
      host: this.host,
    });
  }

  async registeredUsers(): Promise<string[]> {
    return this.executeRequest('registered_users', { host: this.host });
  }

  static async create(
    playwright: typeof import('playwright'),
    host = devXmppDomain,
    adminUserName = devUserName,
    adminPassword = devXmppPassword
  ): Promise<EjabberdAdminPage> {
    return new EjabberdAdminPage(
      host,
      await playwright.request.newContext({
        // All requests we send go to this API endpoint.
        // The server is exposed on localhost, even if the XMPP domain is different.
        baseURL: `http://localhost:52810/api/`,
        extraHTTPHeaders: {
          'X-Admin': 'true',
          'Content-Type': 'application/json',
          // Add authorization token to all requests.
          // Assuming personal access token available in the environment.
          Authorization: `Basic ${btoa(String(adminUserName) + ':' + String(adminPassword))}`,
        },
      })
    );
  }

  private async executeRequest<TReturn>(
    path: string,
    json?: Record<string, unknown>
  ): Promise<TReturn> {
    const response = await this.context.post(path, { data: json });
    return (await response.json()) as Promise<TReturn>;
  }
}
