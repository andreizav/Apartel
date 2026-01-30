import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './app/shared/auth.interceptor';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
    providers: [
        provideZonelessChangeDetection(),
        provideRouter(routes, withHashLocation()),
        provideHttpClient(withInterceptors([authInterceptor])),
    ]
}).catch(err => console.error(err));
