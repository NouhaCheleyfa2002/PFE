import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';
import { EmailPreferencesEntity } from './entities/email-preferences.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EmailPreferencesEntity])],
  providers: [MailService],
  controllers: [MailController],
  exports: [MailService],
})
export class MailModule {}
