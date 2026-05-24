import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { ChatDto, SummarizeDto, TranslateDto, GenerateEmailDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(@Body() chatDto: ChatDto) {
    const response = await this.aiService.chat(chatDto.prompt, chatDto.context);
    return {
      success: true,
      response,
    };
  }

  @Post('summarize')
  @HttpCode(HttpStatus.OK)
  async summarize(@Body() summarizeDto: SummarizeDto) {
    const response = await this.aiService.summarize(summarizeDto.text);
    return {
      success: true,
      summary: response,
    };
  }

  @Post('translate')
  @HttpCode(HttpStatus.OK)
  async translate(@Body() translateDto: TranslateDto) {
    const response = await this.aiService.translate(
      translateDto.text,
      translateDto.targetLanguage,
    );
    return {
      success: true,
      translation: response,
      targetLanguage: translateDto.targetLanguage,
    };
  }

  @Post('generate-email')
  @HttpCode(HttpStatus.OK)
  async generateEmail(@Body() generateEmailDto: GenerateEmailDto) {
    const response = await this.aiService.generateEmail(
      generateEmailDto.purpose,
      generateEmailDto.tone || 'professional',
    );
    return {
      success: true,
      email: response,
      tone: generateEmailDto.tone || 'professional',
    };
  }

  @Get('status')
  async getStatus() {
    const status = await this.aiService.getServiceStatus();
    return {
      success: true,
      ...status,
    };
  }
}
