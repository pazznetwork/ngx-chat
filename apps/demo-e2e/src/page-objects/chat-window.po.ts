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

  async write(
    message: string,
    submitMethod: ChatMessageSubmitMethod = 'enter',
    verifyMessage = true
  ): Promise<void> {
    await this.chatInput.waitFor();
    await this.chatInput.fill(message);

    switch (submitMethod) {
      case 'button':
        await this.messageSubmitButton.click();
        break;
      case 'enter':
        await this.chatInput.press('Enter');
        try {
          await expect(this.chatInput).toHaveValue('', { timeout: 1000 });
        } catch (e) {
          // Retry pressing Enter if input was not cleared (flake fix)
          console.log('Retry pressing Enter in chat window...');
          await this.chatInput.press('Enter');
          await expect(this.chatInput).toHaveValue('', { timeout: 5000 });
        }
        break;
      default:
        throw new Error(`unexpected submit type to send a message: ${String(submitMethod)}`);
    }

    if (verifyMessage) {
      // Wait for the message to appear in the output to ensure it was sent (and received/processed by UI)
      // before we close the window or move on.
      await expect(this.outMessage.last()).toContainText(message, { timeout: 30000 });
    }
  }

  async open(): Promise<void> {
    await this.windowLocator.click();
  }

  async focus(): Promise<void> {
    await this.windowLocator.click();
  }

  async close(): Promise<void> {
    await this.closeChatButton.click();
  }

  async waitForVisible(): Promise<void> {
    await this.windowLocator.waitFor();
  }

  async assertLastMessage(
    expectedMessage: string,
    messageDirection: MessageDirection = 'incoming'
  ): Promise<void> {
    const messageLocator = messageDirection === 'incoming' ? this.inMessage : this.outMessage;
    await expect(messageLocator.last()).toHaveText(expectedMessage);
  }

  async assertLastMessageIsNot(
    expectedMessage: string,
    messageDirection: MessageDirection = 'incoming'
  ): Promise<void> {
    const messageLocator = messageDirection === 'incoming' ? this.inMessage : this.outMessage;
    if ((await messageLocator.count()) === 0) {
      return;
    }
    await expect(messageLocator.last()).not.toHaveText(expectedMessage);
  }

  async assertIsOpen(): Promise<void> {
    this.windowLocator.page().on('console', (message) => {
      if (message.type() === 'error') {
        const text = message.text();
        if (text.startsWith('DEBUG:')) {
          console.log('BROWSER_CONSOLE:', text);
        }
      }
    });
    await expect(this.windowTitleLocator).toBeVisible();
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

  async waitForMessageCount(minCount: number): Promise<void> {
    await expect(async () => {
      const incoming = await this.inMessage.count();
      const outgoing = await this.outMessage.count();
      expect(incoming + outgoing).toBeGreaterThanOrEqual(minCount);
    }).toPass({ timeout: 10000 });
  }

  async getAllMessagesText(): Promise<string[]> {
    return this.windowLocator.locator('ngx-chat-message-in ngx-chat-message-text-area, ngx-chat-message-out ngx-chat-message-text-area').allTextContents();
  }

  async getOutMessagesText(): Promise<string[]> {
    return this.outMessage.allTextContents();
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

  async hasAcceptLink(): Promise<boolean> {
    return this.acceptLink.isVisible();
  }

  async isVisible(): Promise<boolean> {
    return this.windowLocator.isVisible();
  }

  async getLogicState(): Promise<any> {
    return this.windowLocator.locator('ngx-chat-window-content').evaluate((el: any) => {
      const component = (window as any).ng?.getComponent(el);
      return component ? component.lastLogicState : { error: 'No component/ng' };
    });
  }

}
