import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';

/**
 * Logo position configuration for the template
 */
interface LogoPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Page margins configuration
 */
interface PageMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Placeholder configuration with position and styling
 */
interface PlaceholderConfig {
  key: string;
  label: string;
  position: { x: number; y: number };
  fontSize: number;
  fontWeight: string;
}

/**
 * Layout settings for typography and alignment
 */
interface LayoutSettings {
  institutionNameSize: number;
  institutionNameAlign: 'left' | 'center' | 'right';
  addressSize: number;
  addressAlign: 'left' | 'center' | 'right';
  contactSize: number;
  contactAlign: 'left' | 'center' | 'right';
  academicYearSize: number;
  academicYearAlign: 'left' | 'center' | 'right';
  headerSpacing: number;
  lineHeight: number;
  showInstitutionName: boolean;
  showAddress: boolean;
  showContact: boolean;
  showAcademicYear: boolean;
}

@Entity('exam_templates')
export class ExamTemplateEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'uuid', name: 'user_id', nullable: true })
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  // Institutional Metadata
  @Column({ nullable: true, name: 'institution_name' })
  institutionName: string;

  @Column({ type: 'text', nullable: true, name: 'institution_address' })
  institutionAddress: string;

  @Column({ nullable: true, name: 'contact_phone' })
  contactPhone: string;

  @Column({ nullable: true, name: 'contact_email' })
  contactEmail: string;

  @Column({ nullable: true, name: 'academic_year' })
  academicYear: string;

  @Column({ nullable: true, name: 'logo_url' })
  logoUrl: string;

  // Template Configuration
  @Column({ type: 'jsonb', name: 'logo_position' })
  logoPosition: LogoPosition;

  @Column({ type: 'text', nullable: true, name: 'footer_text' })
  footerText: string;

  @Column({ type: 'text', nullable: true, name: 'watermark_text' })
  watermarkText: string;

  @Column({ type: 'int', default: 30, name: 'watermark_opacity' })
  watermarkOpacity: number;

  @Column({ type: 'jsonb', name: 'page_margins' })
  pageMargins: PageMargins;

  @Column({ type: 'enum', enum: ['portrait', 'landscape'], default: 'portrait', name: 'page_orientation' })
  pageOrientation: string;

  @Column({ default: 'Times New Roman', name: 'font_family' })
  fontFamily: string;

  @Column({ nullable: true, name: 'primary_color' })
  primaryColor: string;

  @Column({ nullable: true, name: 'secondary_color' })
  secondaryColor: string;

  // Placeholders configuration
  @Column({ type: 'jsonb', default: '[]' })
  placeholders: PlaceholderConfig[];

  // Layout settings for typography and alignment
  @Column({ type: 'jsonb', name: 'layout_settings', default: '{}' })
  layoutSettings: LayoutSettings;

  // Metadata
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ default: false, name: 'is_default' })
  isDefault: boolean;

  @Column({ nullable: true, name: 'header_document_url' })
  headerDocumentUrl: string;
}
