// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, Input } from '@angular/core';
import type { Contact } from '@pazznetwork/ngx-chat-shared';
import { CommonModule } from '@angular/common';

@Component({
    imports: [CommonModule],
    selector: 'ngx-chat-roster-recipient-presence',
    templateUrl: './roster-recipient-presence.component.html',
    styleUrls: ['./roster-recipient-presence.component.less']
})
export class RosterRecipientPresenceComponent {
  @Input()
  contact?: Contact;
}
