import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { BanUserDto, RestrictUserDto, UpdateUserRoleDto, ModerateRatingDto, DeleteUserDto } from './dto/admin.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('tasks')
  async getTasks() {
    return this.adminService.getTasks();
  }

  @Get('tasks/stats')
  async getTaskStats() {
    return this.adminService.getTaskStats();
  }

  @Get('users')
  async getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Get('users/:id')
  async getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id/ban')
  async banUser(
    @Param('id') userId: string,
    @Body() banUserDto: BanUserDto,
    @Request() req,
  ) {
    return this.adminService.banUser(userId, banUserDto, req.user.id);
  }

  @Patch('users/:id/unban')
  async unbanUser(@Param('id') userId: string) {
    return this.adminService.unbanUser(userId);
  }

  @Patch('users/:id/restrict')
  async restrictUser(
    @Param('id') userId: string,
    @Body() restrictUserDto: RestrictUserDto,
    @Request() req,
  ) {
    return this.adminService.restrictUser(userId, restrictUserDto, req.user.id);
  }

  @Patch('users/:id/unrestrict')
  async unrestrictUser(@Param('id') userId: string) {
    return this.adminService.unrestrictUser(userId);
  }

  @Patch('users/:id/role')
  async updateUserRole(
    @Param('id') userId: string,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
  ) {
    return this.adminService.updateUserRole(userId, updateUserRoleDto);
  }

  @Delete('users/:id')
  async deleteUser(
    @Param('id') userId: string,
    @Body() deleteUserDto: DeleteUserDto,
    @Request() req,
  ) {
    return this.adminService.deleteUser(userId, deleteUserDto, req.user.id);
  }

  // Rating Moderation
  @Get('ratings/flagged')
  async getFlaggedRatings() {
    return this.adminService.getFlaggedRatings();
  }

  @Get('ratings/pending')
  async getPendingRatings() {
    return this.adminService.getPendingRatings();
  }

  @Patch('ratings/:id/moderate')
  async moderateRating(
    @Param('id') ratingId: string,
    @Body() moderateRatingDto: ModerateRatingDto,
    @Request() req,
  ) {
    return this.adminService.moderateRating(ratingId, moderateRatingDto, req.user.id);
  }

  @Delete('ratings/:id')
  async deleteRating(@Param('id') ratingId: string, @Request() req) {
    return this.adminService.deleteRating(ratingId, req.user.id);
  }

  @Get('ratings/stats')
  async getModerationStats() {
    return this.adminService.getModerationStats();
  }
}

