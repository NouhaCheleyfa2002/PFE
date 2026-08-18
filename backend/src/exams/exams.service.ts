import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExamEntity } from './entities/exam.entity';
import { CreateExamDto, UpdateExamDto } from './dto/exam.dto';
import { ResourceCollaboratorEntity } from '../collaboration/entities/resource-collaborator.entity';

@Injectable()
export class ExamsService {
  constructor(
    @InjectRepository(ExamEntity)
    private readonly examRepository: Repository<ExamEntity>,
    @InjectRepository(ResourceCollaboratorEntity)
    private readonly collaboratorRepository: Repository<ResourceCollaboratorEntity>,
  ) {}

  async create(userId: string, dto: CreateExamDto) {
    const exam = this.examRepository.create({
      ownerId: userId,
      title: dto.title,
      classLevel: dto.classLevel,
      subject: dto.subject,
      duration: dto.duration,
      instructions: dto.instructions,
      questions: dto.questions,
      templateId: dto.templateId,
      maxPoints: dto.maxPoints,
      status: 'draft',
    });

    return this.examRepository.save(exam);
  }

  async findAll(userId: string) {
    const exams = await this.examRepository.find({
      where: { ownerId: userId },
      order: { updatedAt: 'DESC' },
    });

    return {
      exams,
      total: exams.length,
    };
  }

  async findOne(id: string, userId: string) {
    const exam = await this.examRepository.findOne({ where: { id } });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // Check ownership or collaboration access
    if (exam.ownerId !== userId) {
      const collaborator = await this.collaboratorRepository.findOne({
        where: {
          resourceId: id,
          userId,
          status: 'accepted',
        },
      });

      if (!collaborator) {
        throw new ForbiddenException('You do not have access to this exam');
      }
    }

    return exam;
  }

  async update(id: string, userId: string, dto: UpdateExamDto) {
    // First check if exam exists and user has access
    const exam = await this.findOne(id, userId);

    // Update exam with provided fields
    Object.assign(exam, dto);

    return this.examRepository.save(exam);
  }

  async delete(id: string, userId: string) {
    const exam = await this.examRepository.findOne({ where: { id } });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    if (exam.ownerId !== userId) {
      throw new ForbiddenException('Only the exam owner can delete it');
    }

    await this.examRepository.remove(exam);
  }
}
