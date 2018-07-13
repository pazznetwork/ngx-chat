import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

import { AppComponent } from './app.component';
import { NgxChatModule } from './ngx-chat-imports';
import {ChatMessagesComponent} from '../../projects/pazz/ngx-chat/src/lib/components/chat-messages/chat-messages.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

@NgModule({
    declarations: [
        AppComponent,
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        NgxChatModule.forRoot(),
        FormsModule,
        RouterModule.forRoot([]),
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule {
}
