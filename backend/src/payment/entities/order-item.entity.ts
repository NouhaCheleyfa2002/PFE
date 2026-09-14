import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { OrderEntity } from './order.entity';
import { UserEntity } from '../../auth/entities/user.entity';
import { DocumentEntity } from '../../documents/entities/document.entity';

export type ResourceType = 'document' | 'exam';

@Entity('order_items')
@Index(['orderId'])
@Index(['resourceId'])
@Index(['teacherId'])
export class OrderItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id' })
  orderId: string;

  @Column({ name: 'resource_id' })
  resourceId: string;

  @Column({ name: 'resource_type', type: 'varchar', length: 20, default: 'document' })
  resourceType: ResourceType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ name: 'teacher_id' })
  teacherId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => OrderEntity, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: OrderEntity;

  @ManyToOne(() => DocumentEntity)
  @JoinColumn({ name: 'resource_id' })
  resource: DocumentEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'teacher_id' })
  teacher: UserEntity;
}
