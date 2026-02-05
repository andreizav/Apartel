import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [SharedModule],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService], // Export if needed by other modules or guards
})
export class AuthModule {}
