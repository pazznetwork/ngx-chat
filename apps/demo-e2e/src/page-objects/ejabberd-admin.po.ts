// SPDX-License-Identifier: AGPL-3.0-or-later
import { APIRequestContext, expect, Page } from '@playwright/test';

export class EjabberdAdminPage {
  private constructor(private readonly host: string, private readonly context: APIRequestContext) {}
  static async getAllJabberUsersBesidesAdmin(
    page: Page,
    adminUsername: string,
    adminPassword: string
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
    adminUsername: string,
    adminPassword: string,
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
  async requestDeleteAllUsersBesidesAdmin(): Promise<void> {
    const users = await this.registeredUsers();
    const withoutAdmin = users.filter((user) => user.toLowerCase() !== 'local-admin');
    for (const user of withoutAdmin) {
      await this.unregister(user);
    }
  }

  async unregister(user: string): Promise<void> {
    await this.executeRequest('unregister', {
      user,
      host: this.host,
    });
  }

  async register(user: string, password: string): Promise<void> {
    await this.executeRequest('register', {
      user,
      password,
      host: this.host,
    });
  }

  async registeredUsers(): Promise<string[]> {
    return this.executeRequest('registered_users', { host: this.host });
  }

  static async create(
    playwright: typeof import('playwright-core'),
    host: string,
    adminUserName: string,
    adminPassword: string
  ): Promise<EjabberdAdminPage> {
    return new EjabberdAdminPage(
      host,
      await playwright.request.newContext({
        // All requests we send go to this API endpoint.
        baseURL: `http://${host}:52810/api/`,
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
