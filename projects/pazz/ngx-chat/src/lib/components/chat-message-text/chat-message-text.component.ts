import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'lib-chat-message-text',
  template: `{{text}}`
})
export class ChatMessageTextComponent implements OnInit {

  @Input() text: String;

  constructor() { }

  ngOnInit() {
  }

}
