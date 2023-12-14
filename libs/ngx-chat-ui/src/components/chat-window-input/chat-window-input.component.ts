// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import type { ChatService, Recipient } from '@pazznetwork/ngx-chat-shared';
import { CommonModule } from '@angular/common';
import { CHAT_SERVICE_TOKEN, XmppAdapterModule } from '@pazznetwork/ngx-xmpp';
import { FormsModule } from '@angular/forms';
import { TextFieldModule } from '@angular/cdk/text-field';

@Component({
  standalone: true,
  imports: [CommonModule, XmppAdapterModule, FormsModule, TextFieldModule],
  selector: 'ngx-chat-window-input',
  templateUrl: './chat-window-input.component.html',
  styleUrls: ['./chat-window-input.component.less'],
})
export class ChatWindowInputComponent {
  @Input()
  recipient?: Recipient;

  @Output()
  messageSent = new EventEmitter<void>();

  @Output()
  fileUploaded = new EventEmitter<File>();

  @ViewChild('chatInput')
  chatInput?: ElementRef<HTMLTextAreaElement>;

  @ViewChild('fileInput', { static: true })
  fileInput!: ElementRef<HTMLInputElement>;

  message = '';

  constructor(@Inject(CHAT_SERVICE_TOKEN) readonly chatService: ChatService) {}

  async onKeydownEnter($event: Event): Promise<void> {
    $event?.preventDefault();
    await this.onSendMessage();
  }

  async onSendMessage(): Promise<void> {
    if (!this.recipient || !this.message || !this.chatInput?.nativeElement) {
      return;
    }

    await this.chatService.messageService.sendMessage(this.recipient, this.message);
    this.message = '';
    this.chatInput.nativeElement.value = '';
    this.messageSent.emit();
  }

  focus(): void {
    if (!this.chatInput?.nativeElement) {
      return;
    }

    this.chatInput.nativeElement.focus();
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  fileSelected($event: Event): void {
    if (!$event || !this.recipient) {
      return;
    }

    const target = $event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      // Emit the file object
      this.fileUploaded.emit(file);
      // Reset the value of the input to allow for the same file to be selected again if necessary
      target.value = '';
    }
  }
}
