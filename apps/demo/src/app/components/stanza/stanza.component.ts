// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, Inject } from '@angular/core';
import { XmppService } from '@pazznetwork/xmpp-adapter';
import { CHAT_SERVICE_TOKEN } from '@pazznetwork/ngx-xmpp';

@Component({
  selector: 'ngx-chat-demo-stanza',
  templateUrl: './stanza.component.html',
})
export class StanzaComponent {
  request?: string;
  response?: string;

  constructor(@Inject(CHAT_SERVICE_TOKEN) public chatService: XmppService) {}

  async sendIq(): Promise<void> {
    if (!this.request) {
      return;
    }
    const { attributes, element } = this.parse(this.request);
    const response = await this.chatService.chatConnectionService
      .$iq(attributes)
      .cNode(element?.firstElementChild as Element)
      .send();
    this.response = response.outerHTML;
  }

  async sendMessage(): Promise<void> {
    if (!this.request) {
      return;
    }
    const { attributes, element } = this.parse(this.request);
    const response = await this.chatService.chatConnectionService
      .$msg(attributes)
      .cNode(element?.firstElementChild as Element)
      .send();
    this.response = response.outerHTML;
  }

  async sendPresence(): Promise<void> {
    if (!this.request) {
      return;
    }
    const { attributes, element } = this.parse(this.request);
    const response = await this.chatService.chatConnectionService
      .$pres(attributes)
      .cNode(element?.firstElementChild as Element)
      .send();
    this.response = response.outerHTML;
  }

  private parse(request: string): { attributes: Record<string, string>; element: Element } {
    const parser = new globalThis.DOMParser();
    const element = parser.parseFromString(request, 'text/xml').documentElement;
    const attributeArray = Array.from(element.attributes);
    const attributes = attributeArray.reduce((acc, val) => {
      acc[`${val.name}`] = val.value;
      return acc;
    }, {});

    return { attributes, element };
  }
}
