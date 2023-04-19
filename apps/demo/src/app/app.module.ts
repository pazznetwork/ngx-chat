// SPDX-License-Identifier: AGPL-3.0-or-later
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { IndexComponent } from './routes/index/index.component';
import { IqComponent } from './iq/iq.component';
import { MucComponent } from './routes/muc/muc.component';
import { MultiUserChatComponent } from './multi-user-chat/multi-user-chat.component';
import { NgModule } from '@angular/core';
import { NgxChatModule } from '@pazznetwork/ngx-chat';
import { UiComponent } from './routes/ui/ui.component';

@NgModule({
  declarations: [
    AppComponent,
    IndexComponent,
    IqComponent,
    MucComponent,
    MultiUserChatComponent,
    UiComponent,
  ],
  imports: [AppRoutingModule, BrowserAnimationsModule, BrowserModule, FormsModule, NgxChatModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}