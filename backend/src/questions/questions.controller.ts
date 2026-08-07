import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('questions')
@UseGuards(JwtAuthGuard)
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

  @Post()
  create(@Body() createDto: any, @Request() req: any) {
    return this.questionsService.create({
      ...createDto,
      userId: req.user.userId,
    });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any, @Request() req: any) {
    return this.questionsService.update(id, updateDto, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.questionsService.remove(id, req.user.userId);
  }
}
