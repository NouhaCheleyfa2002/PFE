import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('notification-queue')
export class NotificationProcessor extends WorkerHost {
  async process(job: Job<{ username: string; email: string }>) {
    const { username, email } = job.data;

    // Simulate a time-consuming task (3 seconds)
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log(
      `[NotificationProcessor] Simulated task completed for user "${username}" (${email})`,
    );
  }
}
