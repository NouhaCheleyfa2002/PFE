import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getTypeOrmConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get<string>('DATABASE_HOST', 'localhost'),
  port: configService.get<number>('DATABASE_PORT', 5432),
  username: configService.get<string>('DATABASE_USER', 'edushare_user'),
  password: configService.get<string>('DATABASE_PASSWORD', 'edushare_password'),
  database: configService.get<string>('DATABASE_NAME', 'edushare'),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: true, // Auto-create tables (disable in production, use migrations)
  logging: configService.get<string>('NODE_ENV') === 'development',
  autoLoadEntities: true,
});
