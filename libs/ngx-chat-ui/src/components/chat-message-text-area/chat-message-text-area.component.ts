// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  Input,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { extractUrls } from '@pazznetwork/ngx-chat-shared';
import { ChatMessageTextComponent } from './chat-message-text';
import { ChatMessageLinkComponent } from './chat-message-link';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'ngx-chat-message-text-area',
  templateUrl: './chat-message-text-area.component.html',
})
export class ChatMessageTextAreaComponent implements AfterViewInit {
  @Input()
  textContent?: string;

  @ViewChild('textContainerRef', { read: ViewContainerRef })
  textContainerRef!: ViewContainerRef;

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    this.transform();
    this.cdr.detectChanges();
  }

  private transform(): void {
    const message = this.textContent;

    if (!message) {
      return;
    }

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
