import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer';

@Injectable()
export class ScraperService {
    private readonly logger = new Logger(ScraperService.name);

    async scrape(url: string): Promise<{ title: string; image: string }> {
        this.logger.log(`Scraping URL (Fast): ${url}`);
        let browser;
        try {
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
            });
            const page = await browser.newPage();

            // Speed Optimization: Block heavy resources
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                const type = req.resourceType();
                if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
                    req.abort();
                } else {
                    req.continue();
                }
            });

            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

            // Wait only for DOM to be loaded - meta tags are available early
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

            const data = await page.evaluate(() => {
                const getMeta = (p: string) => document.querySelector(`meta[property="${p}"], meta[name="${p}"]`)?.getAttribute('content');
                return {
                    title: getMeta('og:title') || getMeta('twitter:title') || document.title,
                    image: getMeta('og:image') || getMeta('twitter:image') || ''
                };
            });

            this.logger.log(`Scraped: Title="${data.title}", Image="${data.image?.substring(0, 50)}..."`);
            return { title: data.title || '', image: data.image || '' };

        } catch (error) {
            this.logger.error(`Error scraping URL: ${error.message}`);
            throw error;
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }
}
