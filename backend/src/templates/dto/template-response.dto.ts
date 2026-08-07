export class TemplateResponseDto {
  id: string;
  name: string;
  userId: string;
  institutionName: string | null;
  institutionAddress: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  academicYear: string | null;
  logoUrl: string | null;
  logoPosition: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  footerText: string | null;
  watermarkText: string | null;
  watermarkOpacity: number;
  pageMargins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  pageOrientation: string;
  fontFamily: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  placeholders: Array<{
    key: string;
    label: string;
    position: { x: number; y: number };
    fontSize: number;
    fontWeight: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
  isDefault: boolean;
  headerDocumentUrl: string | null;
}
