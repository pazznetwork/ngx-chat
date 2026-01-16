import { bootstrapApplication, enableDebugTools } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { ApplicationRef } from '@angular/core';

bootstrapApplication(App, appConfig)
    .then((appRef: ApplicationRef) => {
        if (appRef.components[0]) {
            enableDebugTools(appRef.components[0]);
        }
    })
    .catch((err) => console.error(err));
