import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupSSLRedirects, setupSecurityHeaders } from "./utils/ssl/setupSSL";
import blobConverterRoutes from './routes/blobConverter';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Aplicar configurações de SSL e segurança
setupSSLRedirects(app);
setupSecurityHeaders(app);

// Configurar rota do conversor de blob
app.use('/api', blobConverterRoutes);

// Middleware simplificado para redirecionamentos (otimizado para funcionar no ambiente Replit)
app.use((req, res, next) => {
  const host = req.headers.host;
  const path = req.originalUrl || req.url;
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Se estiver na raiz, redirecione para /home (funciona no preview e em produção)
  if (path === '/' || path === '') {
    log(`Redirecting root page to /home`);
    return res.redirect('/home');
  }
  
  // Apenas continue para os demais caminhos
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Environment detection
  const isReplit = !!(process.env.REPLIT_ENV || process.env.REPL_ID || process.env.REPL_SLUG);
  const isLocal = !isReplit;
  const port = process.env.PORT || 5000;

  // Different approaches based on environment
  if (isReplit) {
    // Replit-specific configuration
    server.listen({
      port: parseInt(port.toString()),
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`🚀 Replit server running on port ${port}`);
    });
  } else {
    // Local development configuration
    // Try different approaches for maximum compatibility
    
    // Approach 1: Simple listen (most compatible)
    try {
      server.listen(port, () => {
        log(`🚀 Local server running on http://localhost:${port}`);
        log(`🌐 Network access: http://0.0.0.0:${port}`);
      });
    } catch (error) {
      log(`❌ Failed to start server with simple config: ${error}`);
      
      // Approach 2: Explicit localhost binding
      try {
        server.listen(port, 'localhost', () => {
          log(`🚀 Local server running on http://localhost:${port} (localhost only)`);
        });
      } catch (fallbackError) {
        log(`❌ Failed to start server on localhost: ${fallbackError}`);
        
        // Approach 3: Let the system choose
        server.listen(0, () => {
          const address = server.address();
          const actualPort = typeof address === 'object' ? address?.port : port;
          log(`🚀 Local server running on http://localhost:${actualPort} (system assigned port)`);
        });
      }
    }
  }

  // Graceful shutdown handling
  process.on('SIGTERM', () => {
    log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    log('SIGINT received, shutting down gracefully');
    server.close(() => {
      log('Server closed');
      process.exit(0);
    });
  });
})();