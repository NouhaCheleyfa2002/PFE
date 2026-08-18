import { IsUUID, IsEnum, IsOptional } from 'class-validator';

export class JoinSessionDto {
  @IsUUID()
  examId: string;

  @IsOptional()
  socketId?: string;
}

export class UpdateSessionStatusDto {
  @IsEnum(['active', 'idle', 'disconnected'])
  status: 'active' | 'idle' | 'disconnected';
}

export class LockQuestionDto {
  @IsUUID()
  examId: string;

  @IsUUID()
  questionId: string;
}

export class UnlockQuestionDto {
  @IsUUID()
  examId: string;

  @IsUUID()
  questionId: string;
}
