import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [ConfigModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService], // Export service so other modules can use it
})
export class AiModule {}
