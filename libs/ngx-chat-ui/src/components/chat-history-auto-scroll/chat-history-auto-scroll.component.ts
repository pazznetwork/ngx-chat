// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IntersectionObserverDirective } from '../../directives';

@Component({
  standalone: true,
  imports: [CommonModule, IntersectionObserverDirective],
  selector: 'ngx-chat-history-auto-scroll',
  templateUrl: './chat-history-auto-scroll.component.html',
  styleUrls: ['./chat-history-auto-scroll.component.less'],
})
export class ChatHistoryAutoScrollComponent {
  @Output()
  scrolledToTop = new EventEmitter<void>();
  @Input()
  maxHeight = 'none';
}
