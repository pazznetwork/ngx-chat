import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgxChatModule } from '@pazznetwork/ngx-chat';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { IqComponent } from './iq/iq.component';
import { MultiUserChatComponent } from './multi-user-chat/multi-user-chat.component';
import { IndexComponent } from './routes/index/index.component';
import { UiComponent } from './routes/ui/ui.component';
import { SendStanzaComponent } from './send-stanza/send-stanza.component';

@NgModule({
    declarations: [
        AppComponent,
        IqComponent,
        SendStanzaComponent,
        MultiUserChatComponent,
        IndexComponent,
        UiComponent,
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        NgxChatModule.forRoot(),
        FormsModule,
        AppRoutingModule,
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule {
}
