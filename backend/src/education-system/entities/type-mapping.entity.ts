import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { EducationLevelEntity } from './education-level.entity';

@Entity('type_mappings')
@Index(['educationLevelId'])
@Index(['typeCode'])
@Index(['isActive'])
export class TypeMappingEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'education_level_id' })
  educationLevelId: number;

  @Column({ type: 'varchar', length: 50, name: 'type_code' })
  typeCode: string;

  @Column({ type: 'varchar', length: 100, name: 'type_name' })
  typeName: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => EducationLevelEntity, level => level.types, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'education_level_id' })
  educationLevel: EducationLevelEntity;
}
