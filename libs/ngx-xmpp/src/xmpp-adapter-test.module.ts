// SPDX-License-Identifier: AGPL-3.0-or-later
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { XmppAdapterModule } from './xmpp-adapter.module';
import { EmptyServiceComponent } from './empty-service.component';

@NgModule({
  imports: [XmppAdapterModule, BrowserModule],
  declarations: [EmptyServiceComponent],
  bootstrap: [EmptyServiceComponent],
})
export class XmppAdapterTestModule {}
