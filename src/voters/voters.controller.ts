
import { Controller, Post, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ScraperService } from '../scraper/scraper.service';
import { VoterDto } from './dto/voter.dto';

@ApiTags('voters')
@Controller('voters')
export class VotersController {
    constructor(private readonly scraperService: ScraperService) { }

    @Post('validate/:cedula')
    @ApiOperation({ summary: 'Validate a voter by cedula and retrieve data from external source' })
    @ApiParam({ name: 'cedula', description: 'The cedula to validate' })
    @ApiResponse({ status: 200, description: 'Voter data retrieved successfully.' })
    @ApiResponse({ status: 500, description: 'Internal server error during scraping.' })
    async validateVoter(@Param('cedula') cedula: string, @Body() voterData: VoterDto) {
        try {
            const externalData = await this.scraperService.extractVoterData(cedula);

            // Merge external data with provided data (or just return external depending on logic)
            // Here we assume we want to enrich the incoming DTO or just return the scraped info to confirm
            // For now, returning the combination of what was found

            const result = {
                ...voterData,
                ...externalData, // Overwrite/Add polling station and table from scraper
            };

            // TODO: Save to database using a generic repository interface
            // repository.save(result);

            return result;
        } catch (error) {
            throw new HttpException(
                error.message || 'Failed to validate voter',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
