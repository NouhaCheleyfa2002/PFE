import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';

@Entity('exams')
export class ExamEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  ownerId: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  classLevel: string;

  @Column({ nullable: true })
  subject: string;

  @Column({ nullable: true })
  duration: string;

  @Column('text', { nullable: true })
  instructions: string;

  @Column('jsonb')
  questions: any[];

  @Column('uuid', { nullable: true })
  templateId: string;

  @Column({ nullable: true })
  maxPoints: number;

  @Column({ default: 'draft' })
  status: string; // 'draft', 'published'

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'ownerId' })
  owner: UserEntity;
}
