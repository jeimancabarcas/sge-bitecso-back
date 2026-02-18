import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Solver } from '2captcha';
import { HttpsProxyAgent } from 'https-proxy-agent'; // <--- Importante

@Injectable()
export class ScraperService {
  private readonly TWOCAPTCHA_API_KEY: string;
  private readonly SITE_KEY: string;
  private readonly TARGET_URL: string;
  private readonly API_ENDPOINT = 'https://apiweb-eleccionescolombia.infovotantes.com/api/v1/citizen/get-information';

  // Configuración de Proxy
  private readonly PROXY_URL: string;

  constructor(private configService: ConfigService) {
    this.TWOCAPTCHA_API_KEY = this.configService.get<string>('TWOCAPTCHA_API_KEY') || '';
    this.SITE_KEY = this.configService.get<string>('RECAPTCHA_SITE_KEY') || '';
    this.TARGET_URL = this.configService.get<string>('TARGET_URL') || '';

    // Construcción de la URL del Proxy: http://user:pass@host:port
    const host = this.configService.get<string>('PROXY_HOST');
    const port = this.configService.get<string>('PROXY_PORT');
    const user = this.configService.get<string>('PROXY_USER');
    const pass = this.configService.get<string>('PROXY_PASS');
    this.PROXY_URL = `http://${user}:${pass}@${host}:${port}`;
  }

  async extractVoterData(cedula: string): Promise<any> {
    const startTime = Date.now();

    // Creamos el agente que obligará a axios a salir por el proxy
    const httpsAgent = new HttpsProxyAgent(this.PROXY_URL);

    try {
      // 1. Resolver el captcha (PASANDO EL PROXY PARA EVITAR EL 403)
      console.log(`[${Date.now() - startTime}ms] Solicitando token a 2Captcha (vía Proxy)...`);
      const token = await this.solveCaptcha();

      // 2. Petición POST final con el Agente del Proxy
      console.log(`[${Date.now() - startTime}ms] Enviando consulta a la API con Proxy...`);

      const response = await axios.post(
        this.API_ENDPOINT,
        {
          identification: cedula,
          identification_type: "CC",
          election_code: "congreso",
          platform: "web",
          module: "polling_place"
        },
        {
          httpsAgent, // <--- Aplicamos el proxy aquí
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain, */*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Origin': 'https://eleccionescolombia.registraduria.gov.co',
            'Referer': 'https://eleccionescolombia.registraduria.gov.co/'
          },
          proxy: false, // Deshabilitamos el proxy nativo de axios para que no choque con el agente
          timeout: 20000 // Aumentamos el tiempo porque los proxies pueden ser más lentos
        }
      );

      const apiData = response.data.data;

      if (apiData.is_in_census === false) {
        return { success: false, error: `Cédula ${cedula} no está en el censo.` };
      }

      const mappedData = {
        cedula: apiData.voter?.identification || cedula,
        pollingStation: apiData.polling_place?.stand || 'Unknown',
        table: apiData.polling_place?.table?.toString() || 'Unknown',
        department: apiData.polling_place?.place_address?.state || 'Unknown',
        municipality: apiData.polling_place?.place_address?.town || 'Unknown',
        address: apiData.polling_place?.place_address?.address || 'Unknown'
      };

      console.log(mappedData);
      return { success: true, data: mappedData };

    } catch (error) {
      const status = error.response?.status;
      const errorDetail = error.response?.data || error.message;
      console.error(`[Error ${status}]`, errorDetail);

      // Si el proxy falla o Akamai bloquea el túnel
      if (error.message.includes('tunneling socket could not be established')) {
        throw new HttpException('Error de conexión con el Proxy de DataImpulse.', HttpStatus.BAD_GATEWAY);
      }

      throw new HttpException(
        status === 403 ? 'Bloqueo de Akamai vía Proxy.' : 'Error en la consulta.',
        status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async solveCaptcha(): Promise<string> {
    const solver = new Solver(this.TWOCAPTCHA_API_KEY);
    try {
      // 2Captcha necesita que el proxy no lleve el protocolo 'http://' en su campo proxy
      const proxyFor2Captcha = this.PROXY_URL.replace('http://', '');
      console.log(proxyFor2Captcha);
      const result = await solver.recaptcha(this.SITE_KEY, this.TARGET_URL, {
        proxy: proxyFor2Captcha,
        proxytype: 'http'
      });
      return result.data;
    } catch (error) {
      throw new Error(`2Captcha Falló: ${error.message}`);
    }
  }
}