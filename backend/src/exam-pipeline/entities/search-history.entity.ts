import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('search_history')
@Index(['userId'])
@Index(['createdAt'])
export class SearchHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  userId: string;

  @Column('text')
  query: string;

  @Column({ type: 'int', default: 0 })
  resultsCount: number;

  @Column({ type: 'jsonb', nullable: true })
  filters: any;

  @CreateDateColumn()
  createdAt: Date;
}
