// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'ngx-chat-root',
    template: `<router-outlet></router-outlet>`,
    styleUrls: ['./app.component.css'],
    imports: [RouterOutlet]
})
export class AppComponent {}
