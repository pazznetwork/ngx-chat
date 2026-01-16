// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, Inject } from '@angular/core';
import { CHAT_SERVICE_TOKEN } from './injection-token';
import type { ChatService } from '@pazznetwork/ngx-chat-shared';

@Component({
    selector: 'test-empty',
    template: '',
    standalone: false
})
export class EmptyServiceComponent {
  constructor(@Inject(CHAT_SERVICE_TOKEN) readonly chatService: ChatService) {}
}
