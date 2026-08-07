import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { EducationLevelEntity } from './education-level.entity';

@Entity('subject_mappings')
@Index(['educationLevelId'])
@Index(['stream'])
@Index(['subjectCode'])
@Index(['isActive'])
export class SubjectMappingEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'education_level_id' })
  educationLevelId: number;

  @Column({ type: 'varchar', length: 50, name: 'subject_code' })
  subjectCode: string;

  @Column({ type: 'varchar', length: 100, name: 'subject_name' })
  subjectName: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  stream: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => EducationLevelEntity, level => level.subjects, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'education_level_id' })
  educationLevel: EducationLevelEntity;
}
