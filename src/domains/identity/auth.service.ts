import crypto from 'crypto';

const SESSION_SECRET = process.env.SESSION_SECRET || 'origem-vinhos-super-secret-key-that-is-at-least-32-chars-long';
const COOKIE_NAME = 'session_token';
const EXPIRATION_TIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export interface SessionPayload {
  userId: string;
  expiresAt: number;
}

export class AuthService {
  // Hashing seguro de senha usando a API nativa e otimizada do Bun (Bcrypt sob o capô)
  async hashPassword(password: string): Promise<string> {
    return await Bun.password.hash(password);
  }

  // Validação da senha digitada contra o hash do banco usando a API nativa do Bun
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await Bun.password.verify(password, hash);
  }

  // Gera o token de sessão assinado com HMAC-SHA256 (Stateless Session)
  generateSessionToken(userId: string): string {
    const expiresAt = Date.now() + EXPIRATION_TIME_MS;
    const payload: SessionPayload = { userId, expiresAt };
    
    const payloadStr = JSON.stringify(payload);
    const payloadBase64 = Buffer.from(payloadStr).toString('base64');
    
    const signature = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payloadBase64)
      .digest('hex');
      
    return `${payloadBase64}.${signature}`;
  }

  // Verifica e valida a integridade e expiração do token de sessão
  verifySessionToken(token: string): string | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 2) return null;
      
      const [payloadBase64, signature] = parts;
      if (!payloadBase64 || !signature) return null;

      // Valida assinatura
      const expectedSignature = crypto
        .createHmac('sha256', SESSION_SECRET)
        .update(payloadBase64)
        .digest('hex');
        
      if (signature !== expectedSignature) {
        return null; // Assinatura inválida / Token adulterado
      }
      
      // Converte payload e valida expiração
      const payloadStr = Buffer.from(payloadBase64, 'base64').toString('utf-8');
      const payload: SessionPayload = JSON.parse(payloadStr);
      
      if (Date.now() > payload.expiresAt) {
        return null; // Token expirado
      }
      
      return payload.userId;
    } catch {
      return null;
    }
  }

  // Constrói o cabeçalho Set-Cookie correspondente para salvar a sessão de 7 dias
  getSetCookieHeader(userId: string): string {
    const token = this.generateSessionToken(userId);
    const maxAge = Math.floor(EXPIRATION_TIME_MS / 1000);
    // Configurações recomendadas: HttpOnly, Path=/, SameSite=Lax
    // Nota: 'Secure' omitido por padrão no localhost caso não use HTTPS, mas pode ser configurado conforme ambiente
    const secureFlag = process.env.NODE_ENV === 'production' ? ' Secure;' : '';
    return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax;${secureFlag}`;
  }

  // Constrói o cabeçalho Set-Cookie para invalidar/limpar a sessão
  getClearCookieHeader(): string {
    const secureFlag = process.env.NODE_ENV === 'production' ? ' Secure;' : '';
    return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax;${secureFlag}`;
  }

  // Extrai o token de sessão do cabeçalho de Cookie da requisição HTTP
  extractTokenFromHeader(cookieHeader: string | null): string | null {
    if (!cookieHeader) return null;
    
    const cookies = cookieHeader.split(';').map(c => c.trim());
    const sessionCookie = cookies.find(c => c.startsWith(`${COOKIE_NAME}=`));
    
    if (!sessionCookie) return null;
    return sessionCookie.substring(COOKIE_NAME.length + 1);
  }
}
