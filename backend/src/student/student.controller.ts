import { Controller, Get, Post, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StudentService } from './student.service';

@Controller('student')
@UseGuards(JwtAuthGuard)
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get('home-data')
  async getHomeData(@Request() req: any) {
    const userId = req.user.sub;
    return this.studentService.getHomeData(userId);
  }

  @Get('recommendations')
  async getRecommendations(@Request() req: any) {
    const userId = req.user.sub;
    return this.studentService.getRecommendations(userId);
  }

  @Get('performance')
  async getPerformance(@Request() req: any) {
    const userId = req.user.sub;
    return this.studentService.getPerformance(userId);
  }

  @Get('ai-insights')
  async getAiInsights(@Request() req: any) {
    const userId = req.user.sub;
    return this.studentService.getAiInsights(userId);
  }

  @Post('add-free-resource/:resourceId')
  async addFreeResourceToLibrary(
    @Request() req: any,
    @Param('resourceId') resourceId: string,
  ) {
    const userId = req.user.sub;
    return this.studentService.addFreeResourceToLibrary(userId, resourceId);
  }
}
