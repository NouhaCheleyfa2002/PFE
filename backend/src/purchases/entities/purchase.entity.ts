import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import { DocumentEntity } from '../../documents/entities/document.entity';

@Entity('purchases')
@Index(['userId', 'documentId'])
@Index(['userId'])
@Index(['documentId'])
@Index(['status'])
export class PurchaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'userId' })
  @Index()
  userId: string;

  @Column({ name: 'documentId' })
  @Index()
  documentId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'TND' })
  currency: string;

  @Column({ name: 'payment_method', type: 'varchar', length: 20, default: 'card' })
  paymentMethod: string;

  @Column({ name: 'transaction_id', type: 'varchar', length: 255, nullable: true, unique: true })
  transactionId: string;

  @Column({ type: 'varchar', length: 20, default: 'completed' })
  @Index()
  status: string; // completed, pending, failed, refunded

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @ManyToOne(() => DocumentEntity)
  @JoinColumn({ name: 'documentId' })
  document: DocumentEntity;
}
