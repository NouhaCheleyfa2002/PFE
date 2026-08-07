import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../auth/entities/user.entity';
import { DocumentEntity } from '../documents/entities/document.entity';
import { ExamQuestionEntity } from '../exam-pipeline/entities/exam-question.entity';
import {
  UpdateProfileDto,
  ChangePasswordDto,
  ProfileResponseDto,
  ProfileStatsDto,
  ProfileWithStatsDto,
} from './dto/profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,
    @InjectRepository(DocumentEntity)
    private documentRepo: Repository<DocumentEntity>,
    @InjectRepository(ExamQuestionEntity)
    private examQuestionRepo: Repository<ExamQuestionEntity>,
  ) {}

  /**
   * Get user profile with stats
   */
  async getProfile(userId: string): Promise<ProfileWithStatsDto> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const stats = await this.calculateStats(userId);

    return {
      user: this.mapUserToProfileResponse(user),
      stats,
    };
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<ProfileResponseDto> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update fields if provided
    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.university !== undefined) user.university = dto.university;
    if (dto.region !== undefined) user.region = dto.region;
    if (dto.specialty !== undefined) user.specialty = dto.specialty;
    if (dto.bio !== undefined) user.bio = dto.bio;

    const updatedUser = await this.userRepo.save(user);

    return this.mapUserToProfileResponse(updatedUser);
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    // Validate passwords match
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('New password and confirmation do not match');
    }

    // Prevent same password
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'password'], // Explicitly select password
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    // Update password
    await this.userRepo.update(userId, { password: hashedPassword });
  }

  /**
   * Calculate user statistics
   */
  private async calculateStats(userId: string): Promise<ProfileStatsDto> {
    // Count total resources uploaded
    const resourcesUploaded = await this.documentRepo.count({
      where: { userId },
    });

    // Count exams created (documents with resource_type = 'exam')
    const examsCreated = await this.documentRepo.count({
      where: {
        userId,
        resourceType: 'exam',
      },
    });

    // Calculate contribution points
    // Formula: 10 points per uploaded resource + 20 points per exam + 5 points per question
    const documentsWithQuestions = await this.documentRepo
      .createQueryBuilder('doc')
      .leftJoinAndSelect('doc.questions', 'question')
      .where('doc.userId = :userId', { userId })
      .getMany();

    let totalQuestions = 0;
    documentsWithQuestions.forEach((doc) => {
      totalQuestions += doc.questions?.length || 0;
    });

    const contributionPoints = resourcesUploaded * 10 + examsCreated * 20 + totalQuestions * 5;

    return {
      resourcesUploaded,
      examsCreated,
      contributionPoints,
    };
  }

  /**
   * Map UserEntity to ProfileResponseDto
   */
  private mapUserToProfileResponse(user: UserEntity): ProfileResponseDto {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      university: user.university,
      region: user.region,
      specialty: user.specialty,
      verified: user.verified,
      verificationStatus: user.verificationStatus || 'unverified',
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };
  }
}
