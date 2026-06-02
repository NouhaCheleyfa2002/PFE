import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DocumentEntity } from '../../documents/entities/document.entity';

@Entity('exam_questions')
@Index(['topic'])
@Index(['difficulty'])
@Index(['documentId'])
export class ExamQuestionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  text: string;

  @Column('jsonb', { nullable: true })
  options: string[] | null;

  @Column('text', { nullable: true })
  correctAnswer: string | null;

  @Column('varchar', { length: 255, nullable: true })
  topic: string | null;

  @Column('varchar', { length: 50, nullable: true })
  difficulty: string | null;

  @Column('text', { nullable: true })
  explanation: string | null;

  // Vector embedding column for semantic search
  // pgvector stores embeddings as vector type
  // BAAI/bge-small-en-v1.5 produces 384-dimensional vectors
  @Column({
    type: 'vector',
    length: 384, // BAAI/bge-small-en-v1.5 dimension
    nullable: true,
  })
  embedding: string | null;

  // Link back to source document
  @Column('uuid')
  documentId: string;

  @ManyToOne(() => DocumentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'documentId' })
  document: DocumentEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
