import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IndexComponent } from './routes/index/index.component';
import { UiComponent } from './routes/ui/ui.component';
import {MucComponent} from './routes/muc/muc.component';

@NgModule({
    imports: [
        RouterModule.forRoot([
            {path: '', component: IndexComponent},
            {path: 'ui', component: UiComponent},
            {path: 'muc', component: MucComponent},
            {path: '**', redirectTo: '/'},
        ], {}),
    ],
    exports: [
        RouterModule,
    ],
})
export class AppRoutingModule {}
