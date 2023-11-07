// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  ChangeDetectorRef,
  Component,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import type { Observable } from 'rxjs';
import { combineLatest, merge, Subject, switchMap } from 'rxjs';
import type { ChatService, Contact, Translations } from '@pazznetwork/ngx-chat-shared';
import { defaultTranslations, Room } from '@pazznetwork/ngx-chat-shared';
import { CommonModule } from '@angular/common';
import { CHAT_SERVICE_TOKEN, XmppAdapterModule } from '@pazznetwork/ngx-xmpp';
import { RosterListComponent } from './roster-list';
import { ChatBarWindowsComponent } from './chat-bar-windows';
import { distinctUntilChanged, map, takeUntil } from 'rxjs/operators';

/**
 * The main UI component. Should be instantiated near the root of your application.
 *
 * ```html
 * <!-- plain usage, no configuration -->
 * <ngx-chat></ngx-chat>
 *
 * <!-- if supplied, translations contain an object with the structure of the Translations interface. -->
 * <ngx-chat translations="{'contacts': 'Kontakte', ...}"></ngx-chat>
 *
 * <!-- if supplied, the contacts input attribute takes an Observable<Contact[]> as source for your roster list -->
 * <ngx-chat contacts="..."></ngx-chat>
 *
 * <!-- if supplied, userAvatar$ contains an Observable<string>, which is used as the src attribute of the img for the current user. -->
 * <ngx-chat userAvatar$="Observable.of('http://...')"></ngx-chat>
 * ```
 */
@Component({
  standalone: true,
  imports: [CommonModule, XmppAdapterModule, RosterListComponent, ChatBarWindowsComponent],
  selector: 'ngx-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.less'],
})
export class ChatComponent implements OnInit, OnDestroy, OnChanges {
  /**
   * If supplied, the blocked input attribute takes an [Observable<Contact[]>]{@link Contact} as source for your blocked list.
   */
  @Input()
  blocked$?: Observable<Contact[]>;

  /**
   * If supplied, the contacts input attribute takes an [Observable<Contact[]>]{@link Contact} as source for your roster list.
   */
  @Input()
  contacts$?: Observable<Contact[]>;

  /**
   * If supplied, the contacts input attribute takes an [Observable<Contact[]>]{@link Contact} as source for your incoming contact
   * requests list.
   */
  @Input()
  contactRequestsReceived$?: Observable<Contact[]>;

  /**
   * If supplied, the contacts input attribute takes an [Observable<Contact[]>]{@link Contact} as source for your unaffiliated contact
   * list.
   */
  @Input()
  contactsUnaffiliated$?: Observable<Contact[]>;

  hasNoContacts$?: Observable<boolean>;

  /**
   * 'shown' shows roster list, 'hidden' hides it.
   */
  @Input()
  rosterState: 'shown' | 'hidden' = 'hidden';

  /**
   * If supplied, the rooms input attribute takes an [Observable<Room[]>]{@link rooms$} as source for your rooms list.
   */
  @Input()
  rooms$?: Observable<Room[]>;

  private ngDestroySubject = new Subject<void>();

  private ngDestroy$ = this.ngDestroySubject.asObservable();

  /**
   * If supplied, translations contain an object with the structure of the Translations interface.
   */
  @Input()
  set translations(translations: Partial<Translations>) {
    const defaultTranslation = defaultTranslations();
    if (translations) {
      this.chatService.translations = {
        ...defaultTranslation,
        ...translations,
        presence: {
          ...defaultTranslation.presence,
          ...translations.presence,
        },
      };
    }
  }

  showChatComponent = false;

  constructor(
    @Inject(CHAT_SERVICE_TOKEN) readonly chatService: ChatService,
    private changeDetectorRef: ChangeDetectorRef
  ) {
    // eslint-disable-next-line rxjs-angular/prefer-takeuntil
    this.chatService.isOnline$.subscribe((online) => this.onChatStateChange(online));
  }

  ngOnDestroy(): void {
    this.ngDestroySubject.next();
  }

  ngOnInit(): void {
    this.rooms$ = this.rooms$ ?? this.chatService.roomService.rooms$;
    this.contacts$ = this.contacts$ ?? this.chatService.contactListService.contactsSubscribed$;
    this.contactRequestsReceived$ =
      this.contactRequestsReceived$ ?? this.chatService.contactListService.contactRequestsReceived$;
    this.contactsUnaffiliated$ =
      this.contactsUnaffiliated$ ?? this.chatService.contactListService.contactsUnaffiliated$;
    this.blocked$ = this.blocked$ ?? this.chatService.contactListService.contactsBlocked$;

    this.hasNoContacts$ = combineLatest([
      this.rooms$.pipe(map((arr) => arr.length > 0)),
      this.contacts$.pipe(map((arr) => arr.length > 0)),
    ]).pipe(
      map((results) => results.some((hasContacts) => hasContacts)),
      distinctUntilChanged()
    );
    this.rooms$.pipe(takeUntil(this.ngDestroy$)).subscribe();
    this.contacts$.pipe(takeUntil(this.ngDestroy$)).subscribe();
    this.onRosterStateChanged(this.rosterState);
    merge([this.rooms$, this.contacts$])
      .pipe(
        switchMap((obs$) => obs$),
        takeUntil(this.ngDestroy$)
      )
      .subscribe(() => this.changeDetectorRef.markForCheck());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rosterState']) {
      this.onRosterStateChanged(changes['rosterState'].currentValue as 'shown' | 'hidden');
    }
  }

  private onChatStateChange(online: boolean): void {
    this.showChatComponent = online;
    this.updateBodyClass();
  }

  onRosterStateChanged(state: 'shown' | 'hidden'): void {
    this.rosterState = state;
    this.updateBodyClass();
  }

  private updateBodyClass(): void {
    const rosterClass = 'has-roster';
    if (this.showChatComponent && this.rosterState !== 'hidden') {
      document.body.classList.add(rosterClass);
    } else {
      document.body.classList.remove(rosterClass);
    }
  }
}
