
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import puppeteer from 'puppeteer-extra';
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import axios from 'axios';

@Injectable()
export class ScraperService {
  private readonly CAPSOLVER_API_KEY = 'CAP-9E43F38FF6E13631D931B85B3944641C6ABFC6F93AA63325605ABFCA8BFD2390';
  private readonly SITE_KEY = '6LcthjAgAAAAAFIQLxy52074zanHv47cIvmIHglH';
  private readonly TARGET_URL = 'https://wsp.registraduria.gov.co/censo/consultar/';

  constructor() {
    puppeteer.use(StealthPlugin());
    puppeteer.use(
      RecaptchaPlugin({
        provider: {
          id: '2captcha',
          token: 'placeholder',
        },
        visualFeedback: true,
      }),
    );
  }

  async extractVoterData(cedula: string): Promise<any> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.goto(this.TARGET_URL, { waitUntil: 'networkidle2' });

      // 1. Fill Cedula
      await page.waitForSelector('#nuip');
      await page.type('#nuip', cedula);
      console.log('Cedula filled');
      // 1b. Handle Election Select if available and not default
      try {
        const selectExists = await page.$('#tipo');
        if (selectExists) {
          // Check if we need to select something. Usually the first non-placeholder.
          // We'll select the second option (index 1) if the first is a placeholder (-1)
          // or just ensure something is selected.
          await page.evaluate(() => {
            const select = document.querySelector('#tipo') as HTMLSelectElement;
            if (select && select.options.length > 1) {
              select.selectedIndex = 1; // Pick the first available election
            }
          });
        }
      } catch (e) {
        console.log('Select handling warning: ', e);
      }
      console.log('Election selected');
      // 2. Resolve Captcha using CapSolver (Axios polling)
      const captchaSolution = await this.solveCaptcha();
      console.log('Captcha solved');
      // 3. Inject Captcha Solution
      await page.evaluate((token) => {
        // @ts-ignore
        document.getElementById('g-recaptcha-response').innerHTML = token;
        // Sometimes strictly necessary to trigger callback if it exists, 
        // but often for standard forms just setting the textarea and submitting is enough.
        // We might also need to find if there is a callback function like `submitForm`.
      }, captchaSolution);
      console.log('Captcha injected');
      // 4. Submit Form
      // Ensure the 'token' hidden field is present (it was in HTML) - usually static or server-generated.
      // We assume it's already there.

      await Promise.all([
        //page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 }).catch(() => null), // Navigation might not happen if it's AJAX
        page.click('#enviar'),
      ]);
      console.log('Form submitted');

      // 5. Extract Results
      // Wait for either success table OR warning/error message
      // Wait for any relevant container
      try {
        await page.waitForSelector('#consulta, #div_warning, #div_error', { timeout: 5000, visible: true });
      } catch (e) {
        console.log('Timeout waiting for results, checking page content...');
      }

      console.log('Processing page results...');

      const result = await page.evaluate((cedula) => {
        // 1. Check for success table FIRST
        const tableEl = document.querySelector('#consulta');

        if (tableEl) {
          // Extraction using data-th attributes
          const getVal = (key: string) => {
            const el = tableEl.querySelector(`td[data-th="${key}"]`) as HTMLElement;
            return el ? el.innerText.trim() : 'Unknown';
          };

          const extractedCedula = getVal('NUIP');
          const pollingStation = getVal('PUESTO');
          const table = getVal('MESA');
          const department = getVal('DEPARTAMENTO');
          const municipality = getVal('MUNICIPIO');
          const address = getVal('DIRECCIÓN');

          return { success: true, data: { cedula: extractedCedula, pollingStation, table, department, municipality, address } };
        }

        // 2. If no table, it MUST be an error/warning
        const warningDiv = document.getElementById('div_warning');
        const errorDiv = document.getElementById('div_error');
        const bodyText = document.body.innerText;
        const notFoundText = `El documento de identidad número ${cedula} no se encuentra en el censo`;

        let errorMessage = 'Unknown error occurred during scraping';

        if (errorDiv && errorDiv.offsetParent !== null && errorDiv.innerText.trim().length > 0) {
          errorMessage = errorDiv.innerText.trim();
        } else if (warningDiv && warningDiv.offsetParent !== null && warningDiv.innerText.trim().length > 0) {
          errorMessage = warningDiv.innerText.trim();
        } else if (bodyText.includes(notFoundText)) {
          errorMessage = notFoundText; // Or capture full sentence if needed
        }

        return { success: false, error: errorMessage };
      }, cedula);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;

    } catch (error) {
      console.error('Scraping error:', error);
      throw new HttpException(
        'Failed to scrape data: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  private async solveCaptcha(): Promise<string> {
    try {
      // 1. Create Task
      const createTaskResponse = await axios.post('https://api.capsolver.com/createTask', {
        clientKey: this.CAPSOLVER_API_KEY,
        task: {
          type: 'ReCaptchaV2TaskProxyLess',
          websiteURL: this.TARGET_URL,
          websiteKey: this.SITE_KEY,
        },
      });

      if (createTaskResponse.data.errorId !== 0) {
        throw new Error(`CapSolver CreateTask Error: ${createTaskResponse.data.errorDescription}`);
      }

      const taskId = createTaskResponse.data.taskId;

      // 2. Poll for Result
      let attempts = 0;
      while (attempts < 30) {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2s
        const resultResponse = await axios.post('https://api.capsolver.com/getTaskResult', {
          clientKey: this.CAPSOLVER_API_KEY,
          taskId: taskId,
        });

        if (resultResponse.data.status === 'ready') {
          return resultResponse.data.solution.gRecaptchaResponse;
        }

        if (resultResponse.data.status === 'failed') {
          throw new Error(`CapSolver Task Failed: ${resultResponse.data.errorDescription}`);
        }

        attempts++;
      }

      throw new Error('CapSolver Timeout');
    } catch (error) {
      throw new Error(`Captcha Solving Failed: ${error.message}`);
    }
  }
}
