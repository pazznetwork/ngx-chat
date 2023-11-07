// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IntersectionObserverDirective } from '@pazznetwork/ngx-chat';
import { combineLatestWith, merge, Observable, Subject } from 'rxjs';
import { debounceTime, filter, map, takeUntil } from 'rxjs/operators';

@Component({
  standalone: true,
  imports: [CommonModule, IntersectionObserverDirective],
  selector: 'ngx-chat-history-auto-scroll',
  templateUrl: './chat-history-auto-scroll.component.html',
  styleUrls: ['./chat-history-auto-scroll.component.less'],
})
export class ChatHistoryAutoScrollComponent implements OnChanges, OnInit, AfterViewInit, OnDestroy {
  @ViewChild('scrollContainer', { static: true })
  private scrollContainer?: ElementRef<HTMLDivElement>;

  @Output()
  scrolledToTop = new EventEmitter<void>();

  @Input()
  scheduleScrollToBottom$?: Observable<void>;

  private readonly scrollToBottomSubject = new Subject<void>();
  private readonly isAtBottomSubject = new Subject<boolean>();
  private readonly scrollToBottomOnNextChange$ = this.scrollToBottomSubject.pipe(
    combineLatestWith(this.isAtBottomSubject),
    filter(([_, isAtBottom]) => !isAtBottom),
    // eslint-disable-next-line arrow-body-style
    map(() => {
      return;
    })
  );
  private readonly ngDestroySubject = new Subject<void>();

  ngOnInit(): void {
    merge(this.scrollToBottomOnNextChange$, this.scheduleScrollToBottom$!)
      .pipe(debounceTime(300), takeUntil(this.ngDestroySubject))
      .subscribe(() => this.scrollToBottom());
  }

  ngAfterViewInit(): void {
    this.scrollToBottom();
  }

  ngOnChanges(): void {
    console.log('ChatHistoryAutoScrollComponent ngOnChanges');
    this.isAtBottomSubject.next(this.isScrolledToBottom());
  }

  ngOnDestroy(): void {
    this.ngDestroySubject.next();
  }

  private isScrolledToBottom(): boolean {
    if (!this.scrollContainer) {
      return false;
    }

    const container = this.scrollContainer.nativeElement;
    const is = container.scrollHeight - container.scrollTop === container.clientHeight;
    console.log('ChatHistoryAutoScrollComponent isScrolledToBottom', is);
    return is;
  }

  private scrollToBottom(): void {
    if (!this.scrollContainer) {
      return;
    }

    const container = this.scrollContainer.nativeElement;
    container.scrollTop = container.scrollHeight;
  }
}
