export interface User {
  id: string;
  email: string;
  password: string;
  fullName: string;
  role: 'teacher' | 'student';
  university?: string;
  region?: string;
  specialty?: string;
  verified: boolean;
  createdAt: Date;
}
