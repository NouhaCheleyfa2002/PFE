import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { JobType } from 'bullmq';

export interface TaskInfo {
  id: string | undefined;
  name: string;
  data: Record<string, unknown>;
  status: string;
  attempts: number;
  createdAt: number;
  processedAt: number | undefined;
  finishedAt: number | undefined;
  failedReason: string | undefined;
}

const JOB_TYPES: JobType[] = ['waiting', 'active', 'delayed', 'completed', 'failed'];

@Injectable()
export class AdminService {
  constructor(
    @InjectQueue('notification-queue') private readonly notificationQueue: Queue,
  ) {}

  async getTasks(): Promise<TaskInfo[]> {
    const allJobs = await this.notificationQueue.getJobs(JOB_TYPES);

    const tasks: TaskInfo[] = await Promise.all(
      allJobs.map(async (job) => {
        const state = await job.getState();
        return {
          id: job.id,
          name: job.name,
          data: job.data as Record<string, unknown>,
          status: state,
          attempts: job.attemptsMade,
          createdAt: job.timestamp,
          processedAt: job.processedOn,
          finishedAt: job.finishedOn,
          failedReason: job.failedReason,
        };
      }),
    );

    return tasks.sort((a, b) => b.createdAt - a.createdAt);
  }

  async getTaskStats(): Promise<Record<string, number>> {
    const [active, completed, failed, waiting, delayed] = await Promise.all([
      this.notificationQueue.getActiveCount(),
      this.notificationQueue.getCompletedCount(),
      this.notificationQueue.getFailedCount(),
      this.notificationQueue.getWaitingCount(),
      this.notificationQueue.getDelayedCount(),
    ]);
    return { active, completed, failed, waiting, delayed };
  }
}
