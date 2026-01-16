// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { extractUrls } from '@pazznetwork/ngx-chat-shared';
import { ChatMessageTextComponent } from './chat-message-text';
import { ChatMessageLinkComponent } from './chat-message-link';
import { CommonModule } from '@angular/common';

@Component({
    imports: [CommonModule],
    selector: 'ngx-chat-message-text-area',
    templateUrl: './chat-message-text-area.component.html',
    styleUrls: ['chat-message-text-area.component.less']
})
export class ChatMessageTextAreaComponent implements OnChanges {
  @Input()
  textContent?: string;

  @ViewChild('textContainerRef', { read: ViewContainerRef, static: true })
  textContainerRef!: ViewContainerRef;

  ngOnChanges(_changes: SimpleChanges): void {
    this.transform();
  }

  private transform(): void {
    if (!this.textContent) {
      return;
    }
    this.textContainerRef.clear();

    const message = this.textContent;
    const links = extractUrls(message);
    let lastIndex = 0;
    for (const link of links) {
      const currentIndex = message.indexOf(link, lastIndex);

      const textBeforeLink = message.substring(lastIndex, currentIndex);
      if (textBeforeLink) {
        const textBeforeLinkComponent =
          this.textContainerRef.createComponent(ChatMessageTextComponent);
        textBeforeLinkComponent.instance.text = textBeforeLink;
      }

      const linkRef = this.textContainerRef.createComponent(ChatMessageLinkComponent);
      linkRef.instance.link = link;
      linkRef.instance.text = this.shorten(link);

      lastIndex = currentIndex + link.length;
    }

    const textAfterLastLink = message.substring(lastIndex);
    if (textAfterLastLink) {
      const textAfterLastLinkComponent =
        this.textContainerRef.createComponent(ChatMessageTextComponent);
      textAfterLastLinkComponent.instance.text = textAfterLastLink;
    }
  }

  private shorten(url: string): string {
    const parser = document.createElement('a');
    parser.href = url;

    if (parser.href.length < 50) {
      return parser.href;
    }

    let shortenedPathname = parser.pathname;
    if (shortenedPathname.length > 17) {
      shortenedPathname =
        shortenedPathname.substring(0, 5) +
        '...' +
        shortenedPathname.substring(shortenedPathname.length - 10);
    }

    return parser.protocol + '//' + parser.host + shortenedPathname;
  }
}
