import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { DocumentEntity } from '../../documents/entities/document.entity';

@Entity('bookmarks')
export class BookmarkEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  documentId: string;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => DocumentEntity)
  @JoinColumn({ name: 'documentId' })
  document: DocumentEntity;
}
