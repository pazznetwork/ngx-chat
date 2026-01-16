// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    imports: [CommonModule],
    selector: 'ngx-chat-file-drop',
    templateUrl: './chat-file-drop.component.html',
    styleUrls: ['./chat-file-drop.component.less']
})
export class ChatFileDropComponent {
  @Output()
  readonly fileDropped = new EventEmitter<File>();

  @Input()
  dropMessage?: string;

  @Input()
  enabled: boolean | null = true;

  isDropTarget = false;

  @HostListener('dragover', ['$event'])
  @HostListener('dragenter', ['$event'])
  onDragOver(event: DragEvent): void {
    if (!this.enabled) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.isDropTarget = true;
  }

  @HostListener('dragleave', ['$event'])
  @HostListener('dragexit', ['$event'])
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDropTarget = false;
  }

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent): void {
    if (!this.enabled || !event?.dataTransfer?.items) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    this.isDropTarget = false;

    for (const dataTransferItem of Array.from(event?.dataTransfer?.items)) {
      if (dataTransferItem.kind !== 'file') {
        continue;
      }

      const file = dataTransferItem.getAsFile();

      if (!file) {
        continue;
      }

      this.fileDropped.emit(file);
    }
  }
}
