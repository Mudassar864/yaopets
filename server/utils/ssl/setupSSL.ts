// Utilitário para configuração de SSL/HTTPS
import { Express, Request, Response, NextFunction } from 'express';
import { log } from '../../vite';

/**
 * Configura middleware para forçar conexões HTTPS em ambientes de produção
 * @param app Aplicação Express
 */
export function setupSSLRedirects(app: Express) {
  // Configurar Express para confiar em proxies (necessário para detecção de HTTPS atrás de um proxy/load balancer)
  app.set('trust proxy', 1);
  
  // Middleware para redirecionar dos domínios Replit para o domínio principal yaopets.lat
  app.use((req: Request, res: Response, next: NextFunction) => {
    const host = req.headers.host || '';
    
    // Verificar se estamos em um domínio Replit (.replit.app)
    if (host.includes('.replit.app') && process.env.NODE_ENV === 'production') {
      // Redirecionar para o domínio principal yaopets.lat
      const yaopetsUrl = `https://www.yaopets.lat${req.originalUrl}`;
      log(`Redirecionando de domínio Replit para domínio principal: ${yaopetsUrl}`);
      return res.redirect(301, yaopetsUrl);
    }
    
    next();
  });
  
  // Middleware para forçar HTTPS
  app.use((req: Request, res: Response, next: NextFunction) => {
    const host = req.headers.host || '';
    
    // Verificar se estamos em produção (apenas domínio yaopets.lat)
    const isProductionDomain = host.includes('yaopets.lat');
                              
    // Verificar se a conexão já é HTTPS
    const isSecure = req.secure || 
                    req.headers['x-forwarded-proto'] === 'https' || 
                    req.headers['x-forwarded-ssl'] === 'on';
                    
    // Não forçar HTTPS em desenvolvimento ou para desafios ACME (Let's Encrypt)
    const isAcmeChallenge = req.path.includes('/.well-known/acme-challenge/');
    
    // Se estamos em produção, não é HTTPS, e não é um desafio ACME, redirecionar para HTTPS
    if (isProductionDomain && !isSecure && !isAcmeChallenge) {
      const secureUrl = `https://${host}${req.originalUrl}`;
      log(`Redirecionando para conexão segura: ${secureUrl}`);
      return res.redirect(301, secureUrl);
    }
    
    // Adicionar cabeçalhos de segurança para HTTPS
    if (isSecure) {
      // Strict-Transport-Security: Força o navegador a sempre usar HTTPS 
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      
      // X-Content-Type-Options: Previne MIME type sniffing
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // X-Frame-Options: Protege contra clickjacking
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    }
    
    next();
  });
}

/**
 * Adiciona cabeçalhos de segurança para conexões HTTPS
 * @param app Aplicação Express
 */
export function setupSecurityHeaders(app: Express) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Política de segurança de conteúdo
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://maps.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://* http://*; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://* ws://* wss://*;"
    );
    
    // Política de referência
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Prevenir XSS
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    next();
  });
}