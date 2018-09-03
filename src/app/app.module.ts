import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';

import { AppComponent } from './app.component';
import { IqComponent } from './iq/iq.component';
import { NgxChatModule } from './ngx-chat-imports';
import { SendStanzaComponent } from './send-stanza/send-stanza.component';

@NgModule({
    declarations: [
        AppComponent,
        IqComponent,
        SendStanzaComponent,
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
