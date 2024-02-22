// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, Input } from '@angular/core';

@Component({
  standalone: true,
  selector: 'ngx-chat-message-text',
  template: `{{ text }}`,
  styles: [
    `
      :host {
        white-space: pre-wrap;
      }
    `,
  ],
})
export class ChatMessageTextComponent {
  @Input()
  text?: string;
}
