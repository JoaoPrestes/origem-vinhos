import type { CepLookupService } from '../../domains/address/address.service';
import type { CepResult } from '../../domains/address/schema';

export class ViaCepAdapter implements CepLookupService {
  private baseUrl: string;
  private timeoutMs: number;
  private fetchFn: typeof fetch;

  constructor(
    baseUrl = process.env.VIA_CEP_URL || 'https://viacep.com.br/ws',
    timeoutMs = Number(process.env.CEP_TIMEOUT_MS) || 5000,
    customFetch?: typeof fetch
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeoutMs = timeoutMs;
    this.fetchFn = customFetch || fetch;
  }

  async lookupCep(rawZipCode: string): Promise<CepResult> {
    const sanitizedZip = rawZipCode.replace(/\D/g, '');

    if (sanitizedZip.length !== 8) {
      return {
        zipCode: sanitizedZip,
        street: '',
        neighborhood: '',
        city: '',
        state: '',
        found: false,
        error: 'O CEP deve conter exatamente 8 dígitos numéricos.',
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchFn(`${this.baseUrl}/${sanitizedZip}/json/`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          zipCode: sanitizedZip,
          street: '',
          neighborhood: '',
          city: '',
          state: '',
          found: false,
          error: `Falha na requisição ao serviço de CEP (HTTP ${response.status}).`,
        };
      }

      const data = await response.json();

      if (data.erro === true || data.erro === 'true') {
        return {
          zipCode: sanitizedZip,
          street: '',
          neighborhood: '',
          city: '',
          state: '',
          found: false,
          error: 'CEP não encontrado.',
        };
      }

      return {
        zipCode: sanitizedZip,
        street: data.logradouro || '',
        neighborhood: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || '',
        complement: data.complemento || undefined,
        found: true,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        return {
          zipCode: sanitizedZip,
          street: '',
          neighborhood: '',
          city: '',
          state: '',
          found: false,
          error: 'O serviço de consulta de CEP excedeu o tempo limite (timeout).',
        };
      }

      return {
        zipCode: sanitizedZip,
        street: '',
        neighborhood: '',
        city: '',
        state: '',
        found: false,
        error: 'Indisponibilidade ou falha de conexão com o serviço de CEP.',
      };
    }
  }
}
