// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { ResizeObserverDirective } from '../../directives/resize-observer.directive';
import { IntersectionObserverDirective } from '../../directives';
import { Subject, withLatestFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    imports: [IntersectionObserverDirective, ResizeObserverDirective],
    selector: 'ngx-chat-history-auto-scroll',
    templateUrl: './chat-history-auto-scroll.component.html',
    styleUrls: ['./chat-history-auto-scroll.component.less']
})
export class ChatHistoryAutoScrollComponent {
  private readonly resizedSubject = new Subject<void>();

  @Input()
  maxHeight = 'none';
  @Output()
  scrolledToTop = new EventEmitter<number>();

  @ViewChild('root', { static: true })
  rootElement!: ElementRef<HTMLElement>;

  constructor() {
    this.resizedSubject
      .pipe(withLatestFrom(this.scrolledToTop), takeUntilDestroyed())
      .subscribe(([, lastMessagePosition]) => {
        this.rootElement.nativeElement.scrollTop = lastMessagePosition;
      });
  }

  resized(): void {
    this.resizedSubject.next();
  }

  intersected(): void {
    this.scrolledToTop.next(this.rootElement.nativeElement.scrollTop + 24);
  }
}
