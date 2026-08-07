import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EducationSystemController } from './education-system.controller';
import { EducationSystemService } from './education-system.service';
import { EducationLevelEntity } from './entities/education-level.entity';
import { SubjectMappingEntity } from './entities/subject-mapping.entity';
import { TypeMappingEntity } from './entities/type-mapping.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EducationLevelEntity,
      SubjectMappingEntity,
      TypeMappingEntity,
    ]),
  ],
  controllers: [EducationSystemController],
  providers: [EducationSystemService],
  exports: [EducationSystemService], // Export for use in other modules
})
export class EducationSystemModule {}
