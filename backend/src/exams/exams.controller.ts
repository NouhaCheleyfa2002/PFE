import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { CreateExamDto, UpdateExamDto } from './dto/exam.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('exams')
@UseGuards(JwtAuthGuard)
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  async create(@Request() req: any, @Body() dto: CreateExamDto) {
    return this.examsService.create(req.user.sub, dto);
  }

  @Get()
  async findAll(@Request() req: any) {
    return this.examsService.findAll(req.user.sub);
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.examsService.findOne(id, req.user.sub);
  }

  @Put(':id')
  async update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateExamDto) {
    return this.examsService.update(id, req.user.sub, dto);
  }

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    await this.examsService.delete(id, req.user.sub);
    return { message: 'Exam deleted successfully' };
  }
}
