import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserEntity } from './entities/user.entity';
import { PremiumGuard } from './guards/premium.guard';
import { UserNotificationsModule } from '../user-notifications/user-notifications.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([UserEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'your-super-secret-key-change-in-production'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
    UserNotificationsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PremiumGuard],
  exports: [AuthService, JwtModule, PremiumGuard],
})
export class AuthModule {}
