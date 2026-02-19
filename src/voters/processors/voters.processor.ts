
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { VotersService } from '../voters.service';

@Processor('voter-verification', {
    concurrency: 5, // Process one by one
})
export class VotersProcessor extends WorkerHost {
    private readonly logger = new Logger(VotersProcessor.name);

    constructor(private readonly votersService: VotersService) {
        super();
    }

    async process(job: Job<any, any, string>): Promise<any> {
        const { voterId } = job.data;
        this.logger.log(`Processing job ${job.id} for voter ${voterId}`);

        try {
            const result = await this.votersService.verifyVoter(voterId);
            this.logger.log(`Voter ${voterId} verified successfully in background.`);
            return result;
        } catch (error) {
            this.logger.error(`Error processing background job for voter ${voterId}: ${error.message}`);
            throw error;
        } finally {
            // Wait 3 seconds before finishing the job (so the next one waits)
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
}
