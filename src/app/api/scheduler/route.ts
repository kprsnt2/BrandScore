import { NextRequest, NextResponse } from "next/server";
import { pipelineScheduler, SCHEDULES, createScheduledIndustryJob, createScheduledAllIndustriesJob } from "@/lib/scheduler";

function errorResponse(message: string, status: number, code?: string) {
    return NextResponse.json(
        { error: message, code: code || "ERROR" },
        { status }
    );
}

export async function GET() {
    try {
        const jobs = Array.from(pipelineScheduler.jobs.values());
        
        return NextResponse.json({
            scheduler: {
                isRunning: pipelineScheduler.isRunning,
                totalJobs: jobs.length,
                activeJobs: jobs.filter(job => job.isActive).length
            },
            jobs: jobs.map(job => ({
                id: job.id,
                name: job.name,
                type: job.type,
                industryId: job.industryId,
                schedule: job.schedule,
                isActive: job.isActive,
                lastRun: job.lastRun,
                nextRun: job.nextRun,
                hasResults: !!job.results
            })),
            schedules: SCHEDULES
        });
    } catch (error) {
        console.error("Error in scheduler GET:", error);
        return errorResponse("Failed to fetch scheduler status", 500, "SCHEDULER_ERROR");
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, jobId, jobData } = body;

        switch (action) {
            case 'start':
                pipelineScheduler.startScheduler();
                return NextResponse.json({ message: "Scheduler started" });

            case 'stop':
                pipelineScheduler.stopScheduler();
                return NextResponse.json({ message: "Scheduler stopped" });

            case 'add':
                if (!jobData) {
                    return errorResponse("Job data is required", 400, "MISSING_JOB_DATA");
                }

                let newJob;
                if (jobData.type === 'industry' && jobData.industryId) {
                    newJob = createScheduledIndustryJob(
                        jobData.name,
                        jobData.industryId,
                        jobData.schedule,
                        jobData.config
                    );
                } else if (jobData.type === 'all-industries') {
                    newJob = createScheduledAllIndustriesJob(
                        jobData.name,
                        jobData.schedule,
                        jobData.config
                    );
                } else {
                    return errorResponse("Invalid job configuration", 400, "INVALID_JOB_CONFIG");
                }

                const jobId_returned = pipelineScheduler.addJob(newJob);
                return NextResponse.json({ 
                    message: "Job added successfully", 
                    jobId: jobId_returned 
                });

            case 'remove':
                if (!jobId) {
                    return errorResponse("Job ID is required", 400, "MISSING_JOB_ID");
                }

                const removed = pipelineScheduler.removeJob(jobId);
                if (!removed) {
                    return errorResponse("Job not found", 404, "JOB_NOT_FOUND");
                }

                return NextResponse.json({ message: "Job removed successfully" });

            case 'update':
                if (!jobId || !jobData) {
                    return errorResponse("Job ID and data are required", 400, "MISSING_JOB_PARAMS");
                }

                const updated = pipelineScheduler.updateJob(jobId, jobData);
                if (!updated) {
                    return errorResponse("Job not found", 404, "JOB_NOT_FOUND");
                }

                return NextResponse.json({ message: "Job updated successfully" });

            case 'execute':
                if (!jobId) {
                    return errorResponse("Job ID is required", 400, "MISSING_JOB_ID");
                }

                // Execute job asynchronously
                pipelineScheduler.executeJob(jobId).catch(error => {
                    console.error(`Manual job execution failed: ${jobId}`, error);
                });

                return NextResponse.json({ message: "Job execution started" });

            case 'history':
                if (!jobId) {
                    return errorResponse("Job ID is required", 400, "MISSING_JOB_ID");
                }

                const history = pipelineScheduler.getJobHistory(jobId);
                return NextResponse.json({ history });

            default:
                return errorResponse("Invalid action", 400, "INVALID_ACTION");
        }
    } catch (error) {
        console.error("Error in scheduler POST:", error);
        return errorResponse("Scheduler operation failed", 500, "SCHEDULER_ERROR");
    }
}
