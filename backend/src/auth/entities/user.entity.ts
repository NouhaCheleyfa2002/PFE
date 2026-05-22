import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column()
  password: string;

  @Column()
  fullName: string;

  @Column({
    type: 'enum',
    enum: ['admin', 'teacher', 'student'],
    default: 'student',
  })
  @Index()
  role: 'admin' | 'teacher' | 'student';

  @Column({ nullable: true })
  university?: string;

  @Column({ nullable: true })
  region?: string;

  @Column({ nullable: true })
  specialty?: string;

  @Column({ default: false })
  verified: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
