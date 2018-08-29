import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';

import { AppComponent } from './app.component';
import { IqComponent } from './iq/iq.component';
import { NgxChatModule } from './ngx-chat-imports';

@NgModule({
    declarations: [
        AppComponent,
        IqComponent,
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
