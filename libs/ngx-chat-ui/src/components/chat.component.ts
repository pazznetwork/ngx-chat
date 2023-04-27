// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, Inject, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import type { Observable } from 'rxjs';
import type { ChatService, Contact, Translations } from '@pazznetwork/ngx-chat-shared';
import { defaultTranslations } from '@pazznetwork/ngx-chat-shared';
import { CommonModule } from '@angular/common';
import { CHAT_SERVICE_TOKEN, XmppAdapterModule } from '@pazznetwork/ngx-xmpp';
import { RosterListComponent } from './roster-list';
import { ChatBarWindowsComponent } from './chat-bar-windows';

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
export class ChatComponent implements OnInit, OnChanges {
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

  /**
   * 'shown' shows roster list, 'hidden' hides it.
   */
  @Input()
  rosterState: 'shown' | 'hidden' = 'hidden';

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

  constructor(@Inject(CHAT_SERVICE_TOKEN) readonly chatService: ChatService) {
    // eslint-disable-next-line rxjs-angular/prefer-takeuntil
    this.chatService.isOnline$.subscribe((online) => this.onChatStateChange(online));
  }

  ngOnInit(): void {
    this.onRosterStateChanged(this.rosterState);
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
