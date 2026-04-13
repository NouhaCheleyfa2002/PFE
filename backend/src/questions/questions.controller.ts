import { Controller, Get, Param, Query } from '@nestjs/common';
import { QuestionsService } from './questions.service';

@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('category') category?: string,
  ) {
    return this.questionsService.findAll(search, category);
  }

  @Get('categories')
  getCategories() {
    return this.questionsService.getCategories();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.questionsService.findById(id);
  }
}
