
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import puppeteer from 'puppeteer-extra';
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class ScraperService {
  private readonly CAPSOLVER_API_KEY: string;
  private readonly SITE_KEY: string;
  private readonly TARGET_URL: string;

  // DataImpulse Proxies
  private readonly PROXY_HOST: string;
  private readonly PROXY_PORT: string;
  private readonly PROXY_USER: string;
  private readonly PROXY_PASS: string;

  constructor(private configService: ConfigService) {
    this.CAPSOLVER_API_KEY = this.configService.get<string>('CAPSOLVER_API_KEY') || '';
    this.SITE_KEY = this.configService.get<string>('RECAPTCHA_SITE_KEY') || '';
    this.TARGET_URL = this.configService.get<string>('TARGET_URL') || '';
    this.PROXY_HOST = this.configService.get<string>('PROXY_HOST') || '';
    this.PROXY_PORT = this.configService.get<string>('PROXY_PORT') || '';
    this.PROXY_USER = this.configService.get<string>('PROXY_USER') || '';
    this.PROXY_PASS = this.configService.get<string>('PROXY_PASS') || '';

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
    const startTime = Date.now();
    console.log(`[${Date.now() - startTime}ms] Starting scraper for cedula: ${cedula}`);

    // Local Browser Launch (Direct Connection)
    // We only use proxy for CapSolver
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });

    try {
      const page = await browser.newPage();

      await page.goto(this.TARGET_URL, { waitUntil: 'networkidle2' });
      console.log(`[${Date.now() - startTime}ms] Page loaded`);

      // 1. Fill Cedula
      await page.waitForSelector('#nuip');
      await page.type('#nuip', cedula);
      console.log(`[${Date.now() - startTime}ms] Cedula filled`);

      // 1b. Handle Election Select if available
      try {
        const selectExists = await page.$('#tipo');
        if (selectExists) {
          await page.evaluate(() => {
            const select = document.querySelector('#tipo') as HTMLSelectElement;
            if (select && select.options.length > 1) {
              select.selectedIndex = 1;
            }
          });
        }
      } catch (e) {
        console.log(`[${Date.now() - startTime}ms] Select handling warning: `, e);
      }
      console.log(`[${Date.now() - startTime}ms] Election selected`);

      // 2. Resolve Captcha using CapSolver (Axios polling)
      console.log(`[${Date.now() - startTime}ms] Solving Captcha with CapSolver...`);
      const captchaSolution = await this.solveCaptcha();
      console.log(`[${Date.now() - startTime}ms] Captcha solved`);

      // 3. Inject Captcha Solution
      try {
        await page.waitForSelector('#g-recaptcha-response, [name="g-recaptcha-response"]', { hidden: true, timeout: 5000 });
      } catch (e) {
        console.log(`[${Date.now() - startTime}ms] Warning: g-recaptcha-response textarea not found after wait.`);
      }

      await page.evaluate((token) => {
        let el = document.getElementById('g-recaptcha-response');
        if (!el) {
          el = document.querySelector('[name="g-recaptcha-response"]');
        }

        if (el) {
          el.innerHTML = token;
        } else {
          console.error('ERROR: g-recaptcha-response element NOT found in DOM.');
        }
      }, captchaSolution);
      console.log(`[${Date.now() - startTime}ms] Captcha injected`);

      // 4. Submit Form
      await Promise.all([
        page.click('#enviar'),
      ]);
      console.log(`[${Date.now() - startTime}ms] Form submitted`);

      // 5. Extract Results
      try {
        await page.waitForSelector('#consulta, #div_warning, #div_error', { timeout: 5000, visible: true });
      } catch (e) {
        console.log(`[${Date.now() - startTime}ms] Timeout waiting for results, checking page content...`);
      }

      console.log(`[${Date.now() - startTime}ms] Processing page results...`);

      const result = await page.evaluate((cedula) => {
        // 1. Check for success table FIRST
        const tableEl = document.querySelector('#consulta');

        if (tableEl) {
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
          // Note: console.log inside evaluate goes to browser console, not node console
          return { success: true, data: { cedula: extractedCedula, pollingStation, table, department, municipality, address } };
        }

        // 2. If no table, it MUST be an error/warning
        const warningDiv = document.getElementById('div_warning');
        const errorDiv = document.getElementById('div_error');
        const bodyText = document.body.innerText;
        const notFoundText = `El documento de identidad número ${cedula} no se encuentra en el censo`;

        let errorMessage = 'Ocurrió un error desconocido durante el scraping';

        if (errorDiv && errorDiv.offsetParent !== null && errorDiv.innerText.trim().length > 0) {
          errorMessage = errorDiv.innerText.trim();
        } else if (warningDiv && warningDiv.offsetParent !== null && warningDiv.innerText.trim().length > 0) {
          errorMessage = warningDiv.innerText.trim();
        } else if (bodyText.includes(notFoundText)) {
          errorMessage = notFoundText;
        }

        return { success: false, error: errorMessage };
      }, cedula);

      if (result.success) {
        console.log(`[${Date.now() - startTime}ms] Data extracted successfully`);
      } else {
        console.log(`[${Date.now() - startTime}ms] Scraping finished with logic rejection: ${result.error}`);
      }
      return result;

    } catch (error) {
      console.error(`[${Date.now() - startTime}ms] Scraping error:`, error);
      throw new HttpException(
        'Error al extraer datos: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      if (browser) {
        await browser.close();
      }
      console.log(`[${Date.now() - startTime}ms] Browser closed`);
    }
  }

  private async solveCaptcha(): Promise<string> {
    try {
      // 1. Create Task
      const request = {
        type: 'ReCaptchaV2EnterpriseTask',
        websiteURL: this.TARGET_URL,
        websiteKey: this.SITE_KEY,
        proxyType: 'http',
        proxyAddress: this.PROXY_HOST,
        proxyPort: parseInt(this.PROXY_PORT),
        proxyLogin: this.PROXY_USER,
        proxyPassword: this.PROXY_PASS,
      }
      console.log("task request", request)
      const createTaskResponse = await axios.post('https://api.capsolver.com/createTask', {
        clientKey: this.CAPSOLVER_API_KEY,
        task: request,
      });

      console.log('CapSolver CreateTask Response:', JSON.stringify(createTaskResponse.data));

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

      throw new Error('Tiempo de espera de CapSolver agotado');
    } catch (error) {
      throw new Error(`Error al resolver el Captcha: ${error.message}`);
    }
  }
}
