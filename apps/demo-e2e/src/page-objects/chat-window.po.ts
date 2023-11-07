// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Locator, Page } from 'playwright';
import { expect } from '@playwright/test';

type ChatMessageSubmitMethod = 'button' | 'enter';
type MessageDirection = 'incoming' | 'outgoing';

export class ChatWindowPage {
  private readonly windowLocator: Locator;
  private readonly windowTitleLocator: Locator;
  private readonly closeChatButton: Locator;

  private readonly acceptLink: Locator;
  private readonly denyLink: Locator;
  private readonly blockLink: Locator;
  // private readonly blockAndReportLink: Locator; todo needed?
  private readonly addLink: Locator;

  private readonly inMessage: Locator;
  private readonly outMessage: Locator;
  private readonly chatInput: Locator;
  private readonly messageSubmitButton: Locator;

  constructor(page: Page, jid: string) {
    this.windowLocator = page.locator(`.window`, { hasText: jid.toLowerCase() });
    this.windowTitleLocator = page.getByTestId(jid).getByText(jid.split('@')?.[0] ?? jid);
    this.closeChatButton = this.windowLocator.locator('[data-zid="close-chat"]');
    this.inMessage = this.windowLocator.locator('ngx-chat-message-in ngx-chat-message-text-area');
    this.outMessage = this.windowLocator.locator('ngx-chat-message-out ngx-chat-message-text-area');

    this.acceptLink = this.windowLocator.locator('[data-zid="accept-user"]');
    this.denyLink = this.windowLocator.locator('[data-zid="deny-user"]');
    this.blockLink = this.windowLocator.locator('[data-zid="block-user"]');
    // this.blockAndReportLink = this.windowLocator.locator('[data-zid="block-and-report-user"]'); todo needed?
    this.addLink = this.windowLocator.locator('[data-zid="add-user"]');

    this.chatInput = this.windowLocator.locator(`[data-zid="chat-input"]`);
    this.messageSubmitButton = this.windowLocator.locator('.chat-window-send');
  }

  async write(message: string, submitMethod: ChatMessageSubmitMethod = 'enter'): Promise<void> {
    await this.chatInput.fill(message);

    switch (submitMethod) {
      case 'button':
        await this.messageSubmitButton.click();
        break;
      case 'enter':
        await this.windowLocator.press('Enter');
        break;
      default:
        throw new Error(`unexpected submit type to send a message: ${String(submitMethod)}`);
    }
  }

  async open(): Promise<void> {
    await this.windowLocator.click();
  }

  async close(): Promise<void> {
    await this.closeChatButton.click();
  }

  async assertLastMessage(
    expectedMessage: string,
    messageDirection: MessageDirection = 'incoming'
  ): Promise<void> {
    const messageCount = await (messageDirection === 'incoming'
      ? this.inMessage
      : this.outMessage
    ).count();

    const lastMessage = await this.getNthMessage(messageCount - 1, messageDirection);

    expect(lastMessage).toBe(expectedMessage);
  }

  assertIsOpen(): void {
    expect(this.windowTitleLocator.isVisible()).toBeTruthy();
  }

  async getNthMessage(
    n: number,
    messageDirection: MessageDirection = 'incoming'
  ): Promise<string | null> {
    const messageLocator = messageDirection === 'incoming' ? this.inMessage : this.outMessage;

    const count = await messageLocator.count();

    if (n > count) {
      throw new Error('There are less requested incoming messages than the requested N');
    }

    return messageLocator.nth(n).textContent();
  }

  async block(): Promise<void> {
    await this.blockLink.waitFor();
    await this.blockLink.click();
  }

  async hasLinkWithUrl(url: string): Promise<boolean> {
    const found = await this.windowLocator.locator(`a[href="${url}"]`).count();
    return found > 0;
  }

  async hasImageWithUrl(url: string): Promise<boolean> {
    const found = await this.windowLocator.locator(`img[src="${url}"]`).count();
    return found > 0;
  }

  async denyContactRequest(): Promise<void> {
    await this.denyLink.click();
  }

  hasBlockLink(): Promise<boolean> {
    return this.blockLink.isVisible();
  }

  async addContact(): Promise<void> {
    await this.addLink.click();
  }

  async acceptContactRequest(): Promise<void> {
    await this.acceptLink.click();
  }

  async blockOrAddMessageIsVisible(): Promise<boolean> {
    await this.blockLink.waitFor();
    await this.addLink.waitFor();
    return (await this.hasBlockLink()) && (await this.hasAddLink());
  }

  async blockOrAddMessageWaitForHidden(): Promise<void> {
    await this.blockLink.waitFor({ state: 'hidden' });
    await this.addLink.waitFor({ state: 'hidden' });
  }

  async hasAddLink(): Promise<boolean> {
    return this.addLink.isVisible();
  }
}
