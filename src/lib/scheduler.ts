import { BrandAnalysisPipeline, IndustryAnalysisResult } from './pipeline';

export interface ScheduledJob {
  id: string;
  name: string;
  type: 'industry' | 'all-industries';
  industryId?: string;
  schedule: string; // Cron expression
  isActive: boolean;
  lastRun?: string;
  nextRun?: string;
  results?: IndustryAnalysisResult[];
  config?: Partial<{
    maxConcurrentBrands: number;
    delayBetweenRequests: number;
    timeoutMs: number;
    retryAttempts: number;
  }>;
}

export interface PipelineScheduler {
  jobs: Map<string, ScheduledJob>;
  isRunning: boolean;
  addJob: (job: Omit<ScheduledJob, 'id'>) => string;
  removeJob: (jobId: string) => boolean;
  updateJob: (jobId: string, updates: Partial<ScheduledJob>) => boolean;
  startScheduler: () => void;
  stopScheduler: () => void;
  executeJob: (jobId: string) => Promise<void>;
  getJobHistory: (jobId: string) => ScheduledJob[];
}

class SimplePipelineScheduler implements PipelineScheduler {
  jobs = new Map<string, ScheduledJob>();
  isRunning = false;
  private intervalId?: NodeJS.Timeout;
  private jobHistory = new Map<string, ScheduledJob[]>();

  addJob(job: Omit<ScheduledJob, 'id'>): string {
    const id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newJob: ScheduledJob = {
      ...job,
      id,
      nextRun: this.calculateNextRun(job.schedule)
    };
    
    this.jobs.set(id, newJob);
    return id;
  }

  removeJob(jobId: string): boolean {
    return this.jobs.delete(jobId);
  }

  updateJob(jobId: string, updates: Partial<ScheduledJob>): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    const updatedJob = { ...job, ...updates };
    if (updates.schedule) {
      updatedJob.nextRun = this.calculateNextRun(updates.schedule);
    }
    
    this.jobs.set(jobId, updatedJob);
    return true;
  }

  startScheduler(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('Pipeline scheduler started');

    // Check every minute for jobs that need to run
    this.intervalId = setInterval(() => {
      this.checkAndRunJobs();
    }, 60000); // Check every minute
  }

  stopScheduler(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    console.log('Pipeline scheduler stopped');
  }

  async executeJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (!job.isActive) {
      console.log(`Job ${jobId} is not active, skipping`);
      return;
    }

    console.log(`Executing scheduled job: ${job.name} (${jobId})`);
    const startTime = Date.now();

    try {
      const pipeline = new BrandAnalysisPipeline(job.config);
      let results: IndustryAnalysisResult[];

      if (job.type === 'industry' && job.industryId) {
        results = [await pipeline.analyzeIndustry(job.industryId)];
      } else if (job.type === 'all-industries') {
        results = await pipeline.analyzeAllIndustries();
      } else {
        throw new Error('Invalid job configuration');
      }

      const executionTime = Date.now() - startTime;
      console.log(`Job ${jobId} completed in ${executionTime}ms`);

      // Update job with results
      const updatedJob: ScheduledJob = {
        ...job,
        lastRun: new Date().toISOString(),
        nextRun: this.calculateNextRun(job.schedule),
        results
      };

      this.jobs.set(jobId, updatedJob);

      // Add to history
      const history = this.jobHistory.get(jobId) || [];
      history.push(updatedJob);
      this.jobHistory.set(jobId, history.slice(-10)); // Keep last 10 runs

    } catch (error) {
      console.error(`Job ${jobId} failed:`, error);
      
      // Update job with error info
      const updatedJob: ScheduledJob = {
        ...job,
        lastRun: new Date().toISOString(),
        nextRun: this.calculateNextRun(job.schedule)
      };

      this.jobs.set(jobId, updatedJob);
    }
  }

  getJobHistory(jobId: string): ScheduledJob[] {
    return this.jobHistory.get(jobId) || [];
  }

  private checkAndRunJobs(): void {
    const now = new Date();
    
    for (const [jobId, job] of this.jobs) {
      if (!job.isActive || !job.nextRun) continue;

      const nextRunTime = new Date(job.nextRun);
      if (now >= nextRunTime) {
        // Run job asynchronously without blocking
        this.executeJob(jobId).catch(error => {
          console.error(`Scheduled job execution failed: ${jobId}`, error);
        });
      }
    }
  }

  private calculateNextRun(cronExpression: string): string {
    // Simple cron parser for basic expressions
    // Supports: "0 */6 * * *" (every 6 hours), "0 0 * * *" (daily), "0 0 * * 0" (weekly)
    
    const now = new Date();
    const parts = cronExpression.split(' ');
    
    if (parts.length !== 5) {
      // Default to next day if invalid cron
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow.toISOString();
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    const nextRun = new Date(now);

    // Handle basic patterns
    if (hour === '*/6') {
      // Every 6 hours
      nextRun.setHours(now.getHours() + 6, 0, 0, 0);
    } else if (hour === '0' && dayOfWeek === '0') {
      // Weekly on Sunday
      nextRun.setDate(nextRun.getDate() + (7 - nextRun.getDay()));
      nextRun.setHours(0, 0, 0, 0);
    } else if (hour === '0') {
      // Daily
      nextRun.setDate(nextRun.getDate() + 1);
      nextRun.setHours(0, 0, 0, 0);
    } else {
      // Default to next day
      nextRun.setDate(nextRun.getDate() + 1);
      nextRun.setHours(0, 0, 0, 0);
    }

    return nextRun.toISOString();
  }
}

// Global scheduler instance
export const pipelineScheduler = new SimplePipelineScheduler();

// Helper functions for common schedules
export const SCHEDULES = {
  EVERY_6_HOURS: '0 */6 * * *',
  DAILY: '0 0 * * *',
  WEEKLY: '0 0 * * 0',
  MONTHLY: '0 0 1 * *'
};

export function createScheduledIndustryJob(
  name: string,
  industryId: string,
  schedule: string,
  config?: Partial<ScheduledJob['config']>
): Omit<ScheduledJob, 'id'> {
  return {
    name,
    type: 'industry',
    industryId,
    schedule,
    isActive: true,
    config
  };
}

export function createScheduledAllIndustriesJob(
  name: string,
  schedule: string,
  config?: Partial<ScheduledJob['config']>
): Omit<ScheduledJob, 'id'> {
  return {
    name,
    type: 'all-industries',
    schedule,
    isActive: true,
    config
  };
}
