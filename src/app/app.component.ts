import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ApiService } from './shared/api.service';
import { AuthTokenService } from './shared/auth-token.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: []
})
export class AppComponent implements OnInit {
  private apiService = inject(ApiService);
  private tokenService = inject(AuthTokenService);
  private router = inject(Router);

  ngOnInit() {
    const token = this.tokenService.getToken();
    if (token) {
      this.apiService.loadBootstrap().subscribe({
        next: () => {
          const url = this.router.url;
          if (url === '/' || url === '' || url === '#/' || url.endsWith('#/')) {
            this.router.navigate(['/dashboard']);
          }
        },
        error: () => this.tokenService.clear()
      });
    }
  }
}