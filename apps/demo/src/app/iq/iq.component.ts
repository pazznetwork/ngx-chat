// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, Inject } from '@angular/core';
import { XmppService } from '@pazznetwork/xmpp-adapter';
import { CHAT_SERVICE_TOKEN } from '@pazznetwork/ngx-xmpp';

@Component({
  selector: 'ngx-chat-iq',
  templateUrl: './iq.component.html',
})
export class IqComponent {
  iqRequest?: string;
  iqResponse?: string;

  constructor(@Inject(CHAT_SERVICE_TOKEN) public chatService: XmppService) {}

  async sendIq(): Promise<void> {
    if (!this.iqRequest) {
      return;
    }
    const parser = new globalThis.DOMParser();
    const element = parser.parseFromString(this.iqRequest, 'text/xml').documentElement;
    const attributes = Array.from(element.attributes).reduce(
      (acc, val) => (acc[val.name] = val.value),
      {}
    );
    const response = await this.chatService.chatConnectionService
      .$iq(attributes)
      .cNode(element?.firstElementChild as Element)
      .send();
    this.iqResponse = response.outerHTML;
  }
}
