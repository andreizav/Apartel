import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ScraperService } from './scraper.service';

@Controller('scraper')
export class ScraperController {
    constructor(private readonly scraperService: ScraperService) { }

    @Get()
    async scrape(@Query('url') url: string) {
        if (!url) {
            throw new HttpException('URL is required', HttpStatus.BAD_REQUEST);
        }
        try {
            const data = await this.scraperService.scrape(url);
            return data;
        } catch (error) {
            throw new HttpException('Failed to scrape URL', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
