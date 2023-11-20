// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Locator, Page } from 'playwright';
import { ChatWindowPage } from './chat-window.po';
import type { AuthRequest } from '@pazznetwork/ngx-chat-shared';
import {
  devXmppDomain,
  devXmppJid,
  devXmppPassword,
} from '../../../../libs/ngx-xmpp/src/.secrets-const';
import { Browser } from '@playwright/test';
import { MucPageObject } from './muc.po';

const adminLogin: AuthRequest = {
  domain: devXmppDomain,
  username: devXmppJid?.split('@')[0] as string,
  password: devXmppPassword,
  service: `wss://${devXmppDomain}:5280/websocket`,
};

export class AppPage {
  readonly errorLogs: string[] = [];

  private readonly connectionStateSelector = '[data-zid="chat-connection-state"]';

  private readonly domainInput: Locator;
  private readonly serviceInput: Locator;
  private readonly usernameInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginButton: Locator;
  private readonly registerButton: Locator;
  private readonly logoutButton: Locator;
  private readonly contactJid: Locator;

  private readonly addContactButton: Locator;
  private readonly removeContactButton: Locator;
  private readonly blockContactButton: Locator;
  private readonly unblockContactButton: Locator;
  private readonly openChatButton: Locator;
  private readonly rosterList: Locator;
  private readonly rosterListUnaffiliatedHeader: Locator;
  private readonly rosterListBlockedHeader: Locator;

  private readonly createRoosterEntrySelector: (jid: string) => string;
  private readonly createRoosterEntryLocator: (jid: string) => Locator;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  private readonly createChatBoxInputLocator: (jid: string) => Locator;

  private constructor(private readonly browser: Browser, private readonly page: Page) {
    this.domainInput = page.locator('[name=domain]');
    this.serviceInput = page.locator('[name=service]');
    this.usernameInput = page.locator('[name=username]');
    this.passwordInput = page.locator('[name=password]');
    this.loginButton = page.locator('[name=login]');
    this.registerButton = page.locator('[name=register]');
    this.logoutButton = page.locator('[name=logout]');
    this.contactJid = page.locator('[data-zid="contact-jid"]');

    this.addContactButton = page.locator('[data-zid="add-contact"]');
    this.removeContactButton = page.locator('[data-zid="remove-contact"]');
    this.blockContactButton = page.locator('[data-zid="block-contact"]');
    this.unblockContactButton = page.locator('[data-zid="unblock-contact"]');
    this.openChatButton = page.locator('[data-zid="open-chat"]');
    this.rosterList = page.locator('[data-zid="roster-list-visible"]');
    this.rosterListUnaffiliatedHeader = page.locator(
      '[data-zid="roster-group-header-contacts-unaffiliated"]'
    );
    this.rosterListBlockedHeader = page.locator('[data-zid="roster-group-header-blocked"]');

    this.createRoosterEntrySelector = (username) =>
      `.roster-recipient[title="${username.toLowerCase()}"]`;
    this.createRoosterEntryLocator = (username) =>
      page.locator(this.createRoosterEntrySelector(username));
    this.createChatBoxInputLocator = (username) =>
      page.locator(`[data-zid=chat-input-${username.toLowerCase()}]`);

    page.on('console', (message) => {
      if (message.type() === 'error') {
        this.errorLogs.push(message.text());
      }
    });
    page.on('pageerror', (err) => {
      // eslint-disable-next-line no-console
      console.error(err);
    });
  }

  static async create(browser: Browser): Promise<AppPage> {
    return new AppPage(browser, await browser.newPage());
  }

  createMUCPageObject(): MucPageObject {
    return new MucPageObject(this.page);
  }

  async pause(): Promise<void> {
    await this.page.pause();
  }

  async setupForTest(): Promise<void> {
    await this.navigateToIndex();
    await this.setDomain(adminLogin.domain);
    await this.setService(adminLogin.service as string);
  }

  async loginAdmin(): Promise<void> {
    await this.logIn(adminLogin.username, adminLogin.password);
  }

  async navigateToIndex(): Promise<void> {
    await this.page.goto('/');
  }

  async setDomain(domain: string): Promise<void> {
    await this.domainInput.fill(domain);
  }

  async setService(service: string): Promise<void> {
    await this.serviceInput.fill(service);
  }

  async newPage(): Promise<AppPage> {
    const context = await this.browser.newContext();
    const newPage = await context.newPage();
    await newPage.goto('https://local.entenhausen.pazz.de:4200/');
    const newAppPage = new AppPage(this.browser, newPage);
    await newAppPage.setupForTest();
    return newAppPage;
  }

  async logInInNewPage(username: string, password: string): Promise<AppPage> {
    const newAppPage = await this.newPage();
    await newAppPage.logIn(username, password);
    return newAppPage;
  }

  async logIn(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await this.rosterList.isVisible();
  }

  async logOut(): Promise<void> {
    await this.logoutButton.click();
    await this.page.locator(this.connectionStateSelector, { hasText: 'offline' }).isVisible();
    // fails without this pause, no time to investigate
    await this.page.waitForTimeout(100);
  }

  async addContact(jid: string): Promise<void> {
    await this.contactJid.fill(jid);
    await this.addContactButton.click();
  }

  async removeContact(jid: string): Promise<void> {
    await this.contactJid.fill(jid);
    await this.removeContactButton.click();
  }

  async blockContact(jid: string): Promise<void> {
    await this.contactJid.fill(jid);
    await this.blockContactButton.click();
  }

  async unblockContact(jid: string): Promise<void> {
    await this.contactJid.fill(jid);
    await this.unblockContactButton.scrollIntoViewIfNeeded();
    await this.unblockContactButton.click();
  }

  async isRegistrationForUserSuccessful(username: string): Promise<boolean> {
    const selector = `[data-zid="registration-success"]:has-text("${username.toLowerCase()}")`;
    await this.page.waitForSelector(selector);
    return (await this.page.locator(selector).count()) > 0;
  }

  async getOfflineStateText(): Promise<string | null> {
    const locator = this.page.locator(this.connectionStateSelector, { hasText: 'offline' });
    return locator.textContent();
  }

  async getOnlineStateText(): Promise<string | null> {
    const locator = this.page.locator(this.connectionStateSelector, { hasText: 'online' });
    return locator.textContent();
  }

  async isContactInRoster(jid: string): Promise<boolean> {
    const locator = this.createRoosterEntryLocator(jid);
    await locator.first().waitFor();
    return locator.first().isVisible();
  }

  async isUnaffiliatedListHidden(): Promise<boolean> {
    await this.rosterListUnaffiliatedHeader.waitFor({ state: 'hidden' });
    return true;
  }

  async isBlockedListVisible(): Promise<boolean> {
    await this.rosterListBlockedHeader.waitFor();
    return this.rosterListBlockedHeader.isVisible();
  }

  async isBlockedListHidden(): Promise<boolean> {
    await this.rosterListBlockedHeader.waitFor({ state: 'hidden' });
    return !(await this.rosterListBlockedHeader.isVisible());
  }

  async selectChatWithContact(jid: string): Promise<ChatWindowPage> {
    const locator = this.createRoosterEntryLocator(jid);
    await locator.first().waitFor();
    await locator.nth(0).click();
    return this.getChatWindow(jid);
  }

  getChatWindow(jid: string): ChatWindowPage {
    return new ChatWindowPage(this.page, jid);
  }

  async openChatWithUnaffiliatedContact(jid: string): Promise<ChatWindowPage> {
    await this.contactJid.fill(jid);
    await this.openChatButton.click();
    return this.getChatWindow(jid);
  }

  async openChatWith(jid: string): Promise<ChatWindowPage> {
    await this.rosterList.getByText(jid).click();
    return this.getChatWindow(jid);
  }

  async reload(): Promise<void> {
    await this.page.reload();
  }

  // TODO: register and unregister in demo app still does not work properly in automation
  async register(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.registerButton.click();
  }
}
