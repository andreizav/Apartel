import {
  Body,
  Controller,
  Post,
  Headers,
  UseGuards,
  Req,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthGuard } from './auth.guard';
import * as jwt from 'jsonwebtoken';

@Controller('auth')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // Logout is tricky because we need the token to identify user.
  // If we require AuthGuard, we need a valid token. If token is invalid, who cares (already logged out effectively).
  // But legacy code decoded token without verification just to update 'online' status.
  // We'll mimic strict behavior or manual decode.
  @Post('logout')
  logout(
    @Headers('authorization') authHeader: string,
    @Body('token') bodyToken: string,
  ) {
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : bodyToken;
    if (token) {
      try {
        const decoded: any = jwt.decode(token);
        if (decoded?.userId) {
          return this.authService.logout(decoded.userId);
        }
      } catch (e) {}
    }
    return { success: true };
  }
}
