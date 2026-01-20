import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex items-center justify-center bg-dark-900 p-4">
      <div class="w-full max-w-md bg-dark-800 rounded-2xl shadow-2xl border border-dark-700 overflow-hidden">
        
        <!-- Header -->
        <div class="p-8 text-center border-b border-dark-700 bg-gradient-to-b from-dark-800 to-dark-900">
          <div class="w-16 h-16 bg-brand-600 rounded-xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-brand-500/20">
            <span class="material-symbols-rounded text-white text-3xl">apartment</span>
          </div>
          <h1 class="text-3xl font-display font-bold text-white mb-2">apartEl</h1>
          <p class="text-slate-400">Property Management System</p>
        </div>

        <!-- Form -->
        <div class="p-8 space-y-6">
          <div class="space-y-2">
            <label class="text-sm font-medium text-slate-300">Email Address</label>
            <input 
              type="email" 
              class="w-full bg-dark-900 border border-dark-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all placeholder-slate-600"
              placeholder="admin@apartel.com"
              [(ngModel)]="email"
            >
          </div>
          
          <div class="space-y-2">
            <label class="text-sm font-medium text-slate-300">Password</label>
            <input 
              type="password" 
              class="w-full bg-dark-900 border border-dark-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all placeholder-slate-600"
              placeholder="••••••••"
              [(ngModel)]="password"
            >
            <div class="flex justify-end">
              <a href="#" class="text-xs text-brand-500 hover:text-brand-400">Forgot password?</a>
            </div>
          </div>

          <button 
            (click)="login()"
            class="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3.5 rounded-lg transition-all transform active:scale-[0.98] shadow-lg shadow-brand-900/50 flex items-center justify-center gap-2">
            <span>Sign In</span>
            <span class="material-symbols-rounded text-lg">arrow_forward</span>
          </button>

          <div class="relative py-2">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-dark-700"></div>
            </div>
            <div class="relative flex justify-center text-xs uppercase">
              <span class="bg-dark-800 px-2 text-slate-500">Or continue with</span>
            </div>
          </div>

          <button class="w-full bg-white text-dark-900 font-semibold py-3 rounded-lg hover:bg-slate-100 transition-colors flex items-center justify-center gap-2">
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </button>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  email = '';
  password = '';
  private router = inject(Router);

  login() {
    // Simulate login for Demo
    this.router.navigate(['/app']);
  }
}