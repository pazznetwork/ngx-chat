import { Component, Input, OnInit } from '@angular/core';
import { Contact } from '../../core';

@Component({
    selector: 'ngx-chat-roster-contact',
    templateUrl: './roster-contact.component.html',
    styleUrls: ['./roster-contact.component.less']
})
export class RosterContactComponent implements OnInit {

    @Input()
    contact: Contact;

    constructor() { }

    ngOnInit() {
    }

}
