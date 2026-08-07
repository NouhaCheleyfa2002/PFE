import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from 'typeorm';
import { SubjectMappingEntity } from './subject-mapping.entity';
import { TypeMappingEntity } from './type-mapping.entity';

export enum EducationStage {
  PRIMARY = 'primary',
  BASIC = 'basic',
  SECONDARY = 'secondary',
  BACCALAUREATE = 'baccalaureate',
}

@Entity('education_levels')
@Index(['stage'])
@Index(['orderIndex'])
@Index(['code'])
export class EducationLevelEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 100, name: 'display_name' })
  displayName: string;

  @Column({
    type: 'enum',
    enum: EducationStage,
  })
  stage: EducationStage;

  @Column({ name: 'order_index', unique: true })
  orderIndex: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => SubjectMappingEntity, mapping => mapping.educationLevel)
  subjects: SubjectMappingEntity[];

  @OneToMany(() => TypeMappingEntity, mapping => mapping.educationLevel)
  types: TypeMappingEntity[];
}
