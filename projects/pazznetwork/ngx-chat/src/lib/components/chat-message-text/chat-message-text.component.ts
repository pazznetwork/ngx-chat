import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'ngx-chat-message-text',
  template: `<span *ngFor="let line of lines; last as isLast">{{line}}<br *ngIf="!isLast"/></span>`
})
export class ChatMessageTextComponent implements OnInit {

  @Input() text: String;
  lines: string[];

  constructor() { }

  ngOnInit() {
    if (this.text) {
      this.lines = this.text.split('\n');
    }
  }

}
