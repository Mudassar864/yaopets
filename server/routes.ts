import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { configureStaticFiles } from "./express/static";
import { createServer, type Server } from "http";
import { storage } from "./storage";
// Importação de memInteractions removida - migrado para PostgreSQL
import { WebSocketServer } from "ws";
import session from "express-session";
import MemoryStore from "memorystore";
import passport from "passport";
import { z } from "zod";
import { configurePassport } from "./auth";
import { createPaymentIntent, retrievePaymentIntent, createSubscription, createOrRetrieveCustomer, stripe } from "./stripe";
import cors from "cors";
import { db } from "./db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Importação das novas rotas simplificadas (Otimizadas para PostgreSQL)
import homeRoutes from "./routes/home";
import userRoutes from "./routes/users";
import { 
  insertUserSchema, 
  insertPetSchema, 
  insertDonationSchema, 
  insertVetHelpSchema,
  insertMessageSchema,
  insertPostInteractionSchema,
  insertPostSchema,
  insertUserRelationshipSchema,
  posts,
  users,
  userRelationships,
  postInteractions
} from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { sendVerificationEmail } from "./utils/emailService";
import { ImageService } from "./utils/imageService";

// Importar rotas simplificadas
import simplePostsRouter from "./routes/simple-posts";
import imageProxyRouter from "./routes/imageProxy";
import commentsRouter from "./routes/comments";
import interactionsRouter from "./routes/interactions";
import mediaStorageRouter from "./routes/media-storage";
import postsWithPermanentStorageRouter from "./routes/posts-with-permanent-storage";
import simpleImageUploadRouter from "./routes/simple-image-upload";

// Extender a interface de sessão para incluir dados personalizados
declare module 'express-session' {
  interface SessionData {
    userData?: {
      loginTime: string;
      email: string;
    };
    flash?: {
      success?: string;
      error?: string;
    };
  }
}

// Configure session store
const SessionStore = MemoryStore(session);

// Importar rotas de upload
import uploadRoutes from "./routes/upload";
import path from "path";

import mediaRoutes from './routes/media';
import mediaDBRouter from "./routes/media-db";
import simpleFeedRouter from './routes/simple-feed';
// importação já feita anteriormente
import postsSimplesRouter from './routes/posts-simples';
import imageMigrationRouter from "./routes/image-migration";
import postsRouter from "./routes/posts";
import imageUtilRouter from "./routes/image-util";
import feedRouter from "./routes/feed";
import mediaOptimizerRouter from "./routes/media-optimizer";
import imagensRouter from "./routes/imagens";
import testPostsRouter from "./routes/test-posts";
import blobConverterRouter from "./routes/blob-converter";

// Novas rotas simplificadas usando PostgreSQL diretamente
import homeRouter from "./routes/home";
import usersRouter from "./routes/users";
import testsRouter from "./routes/tests";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // CONFIGURAÇÃO ESSENCIAL: Servir imagens estáticas ANTES de outras rotas
  
  // Servir arquivos de upload com configurações corretas - PÚBLICO para todos usuários autenticados
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
    maxAge: '1d', // Cache por 1 dia
    etag: true,
    index: false, // Não permitir listagem de diretórios
    dotfiles: 'deny', // Negar arquivos ocultos
    setHeaders: (res: any, filePath: string) => {
      // CORS essencial para imagens aparecerem para todos os usuários
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
      
      // Cache público para melhor performance
      res.setHeader('Cache-Control', 'public, max-age=86400');
      
      // Tipos MIME corretos
      if (filePath.endsWith('.png')) res.setHeader('Content-Type', 'image/png');
      else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) res.setHeader('Content-Type', 'image/jpeg');
      else if (filePath.endsWith('.gif')) res.setHeader('Content-Type', 'image/gif');
      else if (filePath.endsWith('.webp')) res.setHeader('Content-Type', 'image/webp');
      else if (filePath.endsWith('.svg')) res.setHeader('Content-Type', 'image/svg+xml');
    }
  }));
  
  // Sistema de upload direto para imagens aparecerem no feed
  app.use('/api/simple-upload', simpleImageUploadRouter);
  
  // Registrar rotas para gerenciamento de mídia
  app.use('/api/media', mediaRoutes);
  
  // Rota para mídia armazenada no banco de dados
  app.use('/api/media-db', mediaDBRouter);
  
  // Rota para otimização de imagens
  app.use('/api/media-optimizer', mediaOptimizerRouter);
  
  // Rota para migração e verificação de imagens
  app.use('/api/image-migration', imageMigrationRouter);
  
  // Rota para converter blobs em armazenamento permanente
  app.use('/api/blob-converter', blobConverterRouter);
  
  // Rota para armazenamento permanente de imagens no banco PostgreSQL
  app.use('/api/media-storage', mediaStorageRouter);
  
  // Nova rota para posts com armazenamento permanente no banco
  app.use('/api/posts-permanent', postsWithPermanentStorageRouter);
  
  // Rotas para posts - Rota principal unificada
  app.use('/api/posts', postsRouter);
  
  // Rotas para comentários
  app.use('/api/comments', commentsRouter);
  
  // Novas rotas para comentários em posts (usando armazenamento em memória)
  app.use('/api/posts/:postId/comments', commentsRouter);
  
  // Rota centralizada para interações (curtidas, comentários, salvos)
  app.use('/api/interactions', interactionsRouter);
  
  // Utilitários para imagens
  app.use('/api/image-util', imageUtilRouter);
  
  // Feed otimizado para exibição de imagens
  app.use('/api/feed', feedRouter);
  app.use('/api/simple-feed', simpleFeedRouter);
  
  // Rota para servir imagens
  app.use('/api/imagens', imagensRouter);
  
  // Novas rotas simplificadas com PostgreSQL direto (para substituir backend do /home)
  app.use('/api/home', homeRoutes);
  app.use('/api/users-pg', userRoutes);
  
  // Rota de testes para diagnóstico
  app.use('/api/tests', testsRouter);
  
  // Rota simples para testar inserção na tabela post_interactions
  app.post('/api/test-interaction', async (req: Request, res: Response) => {
    try {
      const { userId, postId, type } = req.body;
      
      console.log("[TESTE DIRETO] Tentando criar interação:", { userId, postId, type });
      
      // Tentativa com camelCase
      try {
        const result = await db.insert(postInteractions).values({
          userId,
          postId,
          postType: "post",
          type,
          content: null
        }).returning();
        
        console.log("[TESTE DIRETO] Resultado camelCase:", result);
        
        return res.status(200).json({
          success: true,
          method: "camelCase",
          result
        });
      } catch (error) {
        console.error("[TESTE DIRETO] Erro camelCase:", error);
        
        // Se falhar, tenta com snake_case
        try {
          // @ts-ignore - ignorando o erro de tipagem para testar
          const result = await db.insert(postInteractions).values({
            user_id: userId,
            post_id: postId,
            post_type: "post",
            type,
            content: null
          }).returning();
          
          console.log("[TESTE DIRETO] Resultado snake_case:", result);
          
          return res.status(200).json({
            success: true,
            method: "snake_case",
            result
          });
        } catch (error2) {
          console.error("[TESTE DIRETO] Erro snake_case:", error2);
          
          return res.status(500).json({
            success: false,
            errors: {
              camelCase: String(error),
              snake_case: String(error2)
            }
          });
        }
      }
    } catch (error) {
      console.error("[TESTE DIRETO] Erro geral:", error);
      res.status(500).json({ error: "Erro ao executar teste" });
    }
  });
  
  // Rota para proxy de imagens
  app.use('/api', imageProxyRouter);
  
  // Configurar a rota para servir imagens da pasta uploads
  app.use('/uploads', express.static(path.join('.', 'uploads')));
  // Configurar arquivos estáticos para uploads
  configureStaticFiles(app);
  
  // Registrar as rotas de upload
  app.use('/api/upload', uploadRoutes);
  // Configurar CORS para permitir solicitações de domínios específicos
  // Configuração simplificada de CORS para ambiente de desenvolvimento
  app.use(cors({
    origin: true, // Aceitar todas as origens (mais permissivo para desenvolvimento)
    credentials: true, // Crucial para permitir cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires']
  }));
  
  // Adicionar cabeçalhos adicionais para garantir que os cookies sejam aceitos
  app.use((req, res, next) => {
    // Importante: definir esses cabeçalhos em cada resposta
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    next();
  });

  // Configuração de sessão super robusta para garantir autenticação persistente
  app.use(session({
    secret: process.env.SESSION_SECRET || "yaopets-secret-key-2023",
    resave: true, 
    saveUninitialized: true,
    name: 'yaopets.sid',
    rolling: true, // Renovar cookie em cada requisição
    cookie: { 
      maxAge: 90 * 24 * 60 * 60 * 1000, // 90 dias para garantir login duradouro
      // Em desenvolvimento, desabilitar segurança para facilitar testes
      secure: false, // Desabilitado para compatibilidade com conexões HTTP em desenvolvimento
      httpOnly: false, // Permitir acesso via JavaScript para depuração
      sameSite: 'lax', // Mais permissivo para melhor compatibilidade entre domínios
      path: '/'
    },
    store: new SessionStore({
      checkPeriod: 86400000, // limpar entradas expiradas a cada 24h
      ttl: 90 * 24 * 60 * 60 * 1000, // 90 dias
      // Opções adicionais para aumentar resiliência do armazenamento
      stale: false, // Não retornar sessões expiradas
    })
  }));

  // Set up passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Configure passport strategies
  configurePassport();
  
  // Adicionar logs para depuração e manter sessão (EXCETO para arquivos estáticos)
  app.use((req, res, next) => {
    // Pular logs e verificações para arquivos estáticos (imagens, CSS, JS, etc.)
    if (req.path.startsWith('/uploads') || 
        req.path.startsWith('/assets') || 
        req.path.startsWith('/static') ||
        req.path.match(/\.(css|js|png|jpg|jpeg|gif|webp|svg|ico|woff|woff2)$/)) {
      return next();
    }
    
    console.log(`[Auth Debug] ${req.method} ${req.path} - Autenticado: ${req.isAuthenticated()}`);
    
    if (req.isAuthenticated()) {
      console.log(`[Auth Debug] Usuário: ${(req.user as any)?.id} - ${(req.user as any)?.email}`);
      
      // Renovar a sessão em cada requisição autenticada para evitar logout automático
      req.session.touch();
      
      // Verificar se a sessão está prestes a expirar e renová-la
      const remainingTime = req.session.cookie.maxAge;
      if (remainingTime && remainingTime < 24 * 60 * 60 * 1000) { // Se menos de 24 horas
        console.log(`[Auth Debug] Renovando sessão para o usuário ${(req.user as any)?.id}`);
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 dias
        req.session.save();
      }
    }
    
    next();
  });


  
  // Auth routes
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const userSchema = insertUserSchema.extend({
        confirmPassword: z.string(),
      }).refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });

      const userData = userSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email já está em uso" });
      }
      
      // Gerar token de verificação
      const verificationToken = crypto.randomBytes(32).toString('hex');
      
      // Definir data de expiração (24 horas a partir de agora)
      const tokenExpiry = new Date();
      tokenExpiry.setHours(tokenExpiry.getHours() + 24);
      
      // Hash da senha antes de criar o usuário
      const hashedPassword = await bcrypt.hash(userData.password || '', 10);
      
      // Create the user without confirmPassword, but with verification data
      const { confirmPassword, ...userToCreate } = userData;
      const newUser = await storage.createUser({
        ...userToCreate,
        password: hashedPassword, // Usar a senha hasheada
        isVerified: false,
        firstLogin: false, // Adicionar flag para primeiro login
        verificationToken,
        verificationTokenExpiry: tokenExpiry
      });
      
      // Enviar email de verificação
      try {
        await sendVerificationEmail(newUser.email, verificationToken);
        console.log(`Email de verificação enviado para ${newUser.email}`);
      } catch (emailError) {
        console.error("Erro ao enviar email de verificação:", emailError);
        // Continuar mesmo se o email falhar
      }
      
      // Do not return password and sensitive data
      const { password, verificationToken: token, ...userWithoutSensitive } = newUser;
      
      // Não fazer login automático - o usuário precisa verificar o email primeiro
      return res.status(201).json({ 
        ...userWithoutSensitive,
        message: "Cadastro realizado com sucesso! Por favor, verifique seu email para ativar sua conta."
      });
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      return res.status(500).json({ message: "Erro ao registrar usuário" });
    }
  });

  app.post("/api/auth/login", (req: Request, res: Response, next) => {
    console.log("[Auth Debug] Recebida requisição de login:", {
      email: req.body.email,
      bodyPresente: !!req.body,
      hasRedirect: !!req.body.redirect,
      acceptsJson: req.accepts('json'),
      sessionID: req.sessionID,
      headers: req.headers['user-agent'],
      cookies: req.headers.cookie ? 'Presentes' : 'Ausentes'
    });
    
    // Configurar sessão para durar 90 dias, mesmo antes da autenticação completa
    req.session.cookie.maxAge = 90 * 24 * 60 * 60 * 1000; // 90 dias
    
    // Verificar se o cliente pediu redirecionamento direto
    const redirectTo = req.body.redirect || '/profile';
    const wantsRedirect = !!req.body.redirect || req.accepts('html');
    
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("[Auth Debug] Erro durante autenticação:", err);
        return res.status(500).json({ message: "Erro interno de autenticação", error: err.message });
      }
      
      if (!user) {
        console.log("[Auth Debug] Autenticação falhou:", info?.message || "Motivo desconhecido");
        
        if (wantsRedirect) {
          return res.redirect('/auth/login?error=invalid_credentials');
        } else {
          return res.status(401).json({ message: info?.message || "Credenciais inválidas" });
        }
      }
      
      console.log("[Auth Debug] Usuário autenticado, criando sessão...");
      
      // Usar método login melhorado
      req.login(user, (loginErr: any) => {
        if (loginErr) {
          console.error("[Auth Debug] Erro ao criar sessão:", loginErr);
          
          if (wantsRedirect) {
            return res.redirect('/auth/login?error=session_error');
          } else {
            return res.status(500).json({ message: "Erro ao criar sessão de usuário" });
          }
        }
        
        // Configurar a sessão com duração longa para evitar deslogamento automático
        req.session.cookie.maxAge = 90 * 24 * 60 * 60 * 1000; // 90 dias
        
        // Definir dados úteis na sessão
        // Usar um objeto para dados personalizados para evitar typings inconsistentes
        req.session.userData = {
          loginTime: new Date().toISOString(),
          email: user.email
        };
        
        // Forçar salvamento da sessão com verificação de integridade
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("[Auth Debug] Erro ao salvar sessão:", saveErr);
            
            if (wantsRedirect) {
              return res.redirect('/auth/login?error=session_save_error');
            } else {
              return res.status(500).json({ message: "Erro ao salvar sessão" });
            }
          }
          
          // Log de sessão
          console.log("[Auth Debug] ✓ Sessão criada e salva com sucesso:", {
            sessionID: req.sessionID,
            cookieMaxAge: req.session?.cookie?.maxAge,
            isAuthenticated: req.isAuthenticated(),
            redirectTo: redirectTo
          });
          
          // Remover senha do objeto usuário
          const { password, ...userWithoutPassword } = user;
          
          // Configurar cabeçalhos anti-cache mais rigorosos e seguros
          res.set({
            'X-Auth-Status': 'authenticated',
            'X-Auth-User-Id': user.id.toString(),
            'Cache-Control': 'private, no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store',
            'Vary': 'Cookie, Authorization',
            'X-Auth-Session-ID': req.sessionID
          });
          
          // Responder diferentemente com base no formato aceito pelo cliente
          if (wantsRedirect) {
            console.log("[Auth Debug] Redirecionando para:", redirectTo);
            return res.redirect(redirectTo);
          } else {
            console.log("[Auth Debug] Retornando JSON com informações de usuário");
            return res.json({
              success: true,
              redirectTo,
              message: "Login bem-sucedido",
              user: userWithoutPassword
            });
          }
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.logout(() => {
      res.status(200).json({ message: "Logout realizado com sucesso" });
    });
  });

  // Rota para reenvio de email de verificação
  app.post("/api/auth/resend-verification", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email é obrigatório" });
      }
      
      // Buscar usuário pelo email
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Por questões de segurança, não revelamos se o usuário existe ou não
        return res.status(200).json({ 
          message: "Se o email existir em nossa base de dados, um novo link de verificação será enviado." 
        });
      }
      
      // Se o usuário já está verificado, não precisa reenviar
      if (user.isVerified) {
        return res.status(200).json({ 
          message: "Este email já foi verificado. Você pode fazer login agora." 
        });
      }
      
      // Gerar novo token de verificação
      const verificationToken = crypto.randomBytes(32).toString('hex');
      
      // Definir nova data de expiração (24 horas)
      const tokenExpiry = new Date();
      tokenExpiry.setHours(tokenExpiry.getHours() + 24);
      
      // Atualizar token e data de expiração
      await storage.updateUser(user.id, {
        verificationToken,
        verificationTokenExpiry: tokenExpiry
      });
      
      // Enviar email de verificação
      await sendVerificationEmail(user.email, verificationToken);
      
      return res.status(200).json({ 
        message: "Um novo link de verificação foi enviado para o seu email." 
      });
    } catch (error) {
      console.error("Erro ao reenviar email de verificação:", error);
      return res.status(500).json({ 
        message: "Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente mais tarde." 
      });
    }
  });

  // Rota para verificação de email
  app.get("/api/auth/verify-email", async (req: Request, res: Response) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).send("Token de verificação inválido ou ausente");
      }
      
      // Buscar usuário pelo token de verificação
      const user = await storage.getUserByVerificationToken(token);
      
      if (!user) {
        return res.status(400).send("Token de verificação inválido ou expirado");
      }
      
      // Verificar se o token expirou
      if (user.verificationTokenExpiry && new Date(user.verificationTokenExpiry) < new Date()) {
        return res.status(400).send("Token de verificação expirado. Por favor, solicite um novo token.");
      }
      
      // Marcar o usuário como verificado
      await storage.markUserAsVerified(user.id);
      
      // Redirecionar para a página de login com mensagem de sucesso
      return res.redirect('/auth/login?verified=true');
    } catch (error) {
      console.error("Erro na verificação de email:", error);
      return res.status(500).send("Ocorreu um erro ao verificar seu email. Por favor, tente novamente mais tarde.");
    }
  });

  app.get("/api/auth/me", (req: Request, res: Response) => {
    console.log("[Auth Debug] GET /api/auth/me - Session:", {
      sessionID: req.sessionID,
      cookieMaxAge: req.session?.cookie?.maxAge,
      hasUser: !!req,
      isAuthenticated: req.isAuthenticated(),
      cookies: req.headers.cookie ? 'Presentes' : 'Ausentes'
    });
    
    // Renovar a sessão a cada chamada para evitar expiração
    if (req.session) {
      // Definir tempo de expiração longo para a sessão
      req.session.cookie.maxAge = 90 * 24 * 60 * 60 * 1000; // 90 dias
      
      // Garantir que a sessão seja mantida
      req.session.touch();
    }
    
    if (!req.isAuthenticated()) {
      console.log("[Auth Debug] Usuário não autenticado");
      return res.status(401).json({ message: "Não autenticado" });
    }
    
    // Do not return password
    const { password, ...userWithoutPassword } = req.user as any;
    console.log("[Auth Debug] Usuário autenticado:", userWithoutPassword.id);
    
    // Configurar cabeçalhos anti-cache para evitar problemas com navegadores
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'X-Auth-Status': 'authenticated',
      'X-Auth-User-Id': userWithoutPassword.id.toString()
    });
    
    return res.json(userWithoutPassword);
  });
  
  // Rota de diagnóstico para verificar o problema de autenticação
  app.get("/api/auth/diagnose", (req: Request, res: Response) => {
    const cookies = req.headers.cookie || 'nenhum cookie';
    const sessionData = {
      sessionID: req.sessionID,
      hasSession: !!req.session,
      user: req.user ? { id: (req.user as any).id } : null,
      isAuthenticated: req.isAuthenticated(),
      cookies: cookies,
      headers: {
        host: req.headers.host,
        origin: req.headers.origin,
        referer: req.headers.referer,
        'user-agent': req.headers['user-agent']
      }
    };
    
    console.log("[Auth Diagnose] Diagnóstico de sessão:", JSON.stringify(sessionData, null, 2));
    
    res.json({
      message: "Diagnóstico de autenticação",
      sessionExists: !!req.sessionID,
      isAuthenticated: req.isAuthenticated(),
      sessionID: req.sessionID,
      hasUser: !!req,
      cookiesExist: cookies !== 'nenhum cookie'
    });
  });
  
  // Rotas para autenticação social - Google
  app.get('/api/auth/google', passport.authenticate('google'));
  
  app.get('/api/auth/google/callback', 
    passport.authenticate('google', { 
      failureRedirect: '/auth/login',
      successRedirect: '/home'
    })
  );
  
  // Rotas para autenticação social - Facebook
  app.get('/api/auth/facebook', passport.authenticate('facebook'));
  
  app.get('/api/auth/facebook/callback',
    passport.authenticate('facebook', {
      failureRedirect: '/auth/login',
      successRedirect: '/home'
    })
  );
  
  // Rotas para autenticação social - LinkedIn
  app.get('/api/auth/linkedin', passport.authenticate('linkedin'));
  
  app.get('/api/auth/linkedin/callback',
    passport.authenticate('linkedin', {
      failureRedirect: '/auth/login',
      successRedirect: '/home'
    })
  );

  // Users routes
  app.get("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(parseInt(req.params.id));
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Do not return password
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Erro ao buscar usuário" });
    }
  });

  app.patch("/api/users/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const userId = parseInt(req.params.id);
      const currentUser = req.user as any;
      
      // Only allow users to update their own profile
      if (currentUser.id !== userId) {
        return res.status(403).json({ message: "Não autorizado" });
      }
      
      const updatedUser = await storage.updateUser(userId, req.body);
      if (!updatedUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Do not return password
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Erro ao atualizar usuário" });
    }
  });

  // Pets routes
  app.get("/api/pets", async (req: Request, res: Response) => {
    try {
      const filters = {
        status: req.query.status as string | undefined,
        petType: req.query.petType as string | undefined, // Usando o nome correto do parâmetro
        ownerId: req.query.ownerId ? parseInt(req.query.ownerId as string) : undefined,
        city: req.query.city as string | undefined,
        isActive: req.query.isActive ? req.query.isActive === 'true' : true,
      };
      
      const pets = await storage.getPets(filters);
      res.json(pets);
    } catch (error) {
      console.error("Get pets error:", error);
      res.status(500).json({ message: "Erro ao buscar pets" });
    }
  });

  app.get("/api/pets/:id", async (req: Request, res: Response) => {
    try {
      const pet = await storage.getPet(parseInt(req.params.id));
      if (!pet) {
        return res.status(404).json({ message: "Pet não encontrado" });
      }
      res.json(pet);
    } catch (error) {
      console.error("Get pet error:", error);
      res.status(500).json({ message: "Erro ao buscar pet" });
    }
  });

  // Rota unificada para criar qualquer tipo de pet (adoção, perdido ou encontrado)
  app.post("/api/pets", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      console.log("Dados recebidos para criação de pet:", req.body);
      
      // Garantir que os dados incluam o status correto
      if (!req.body.petStatus || !['lost', 'found', 'adoption'].includes(req.body.petStatus)) {
        return res.status(400).json({ 
          message: "Status do pet inválido. Use 'lost', 'found' ou 'adoption'." 
        });
      }
      
      // Processar arquivos de imagem, se presentes
      let photos = [];
      if (req.files && Array.isArray(req.files)) {
        photos = req.files.map((file: any) => ({
          url: file.path || file.location,
          filename: file.originalname || file.filename
        }));
      } else if (req.file) {
        photos = [{
          url: req.file.path || req.file.location,
          filename: req.file.originalname || req.file.filename
        }];
      }
      
      const location = req.body.location || req.body.lastLocation;
      let locationData = null;
      
      // Processar os dados de localização
      try {
        if (typeof location === 'string') {
          locationData = JSON.parse(location);
        } else if (location && typeof location === 'object') {
          locationData = location;
        } else {
          // Localização padrão
          locationData = {
            lat: 0,
            lng: 0,
            address: req.body.address || 'Localização não informada'
          };
        }
      } catch (e) {
        console.error("Erro ao processar localização:", e);
        locationData = {
          lat: 0,
          lng: 0,
          address: req.body.address || 'Localização não informada'
        };
      }
      
      const petData = insertPetSchema.parse({
        ...req.body,
        photos: photos.length > 0 ? photos : null,
        location: locationData,
        ownerId: (req.user as any).id,
        isActive: true
      });
      
      console.log("Dados validados do pet:", petData);
      
      const newPet = await storage.createPet(petData);
      
      // Após criar o pet, também criar um post correspondente para mostrar no feed
      try {
        const petPostContent = petData.petStatus === 'lost' 
          ? `Pet perdido: ${petData.name}. Por favor, ajude a encontrá-lo!` 
          : petData.petStatus === 'found'
            ? `Encontrei este pet! Ajude a encontrar o dono.`
            : `${petData.name} disponível para adoção. Entre em contato!`;
            
        const postData = {
          userId: (req.user as any).id,
          content: petPostContent,
          mediaUrls: photos.length > 0 ? photos : null,
          location: locationData,
          visibilityType: 'public',
          postType: 'pet',
          petId: newPet.id, // Referência ao pet
          petMetadata: JSON.stringify({
            petId: newPet.id,
            petName: petData.name,
            petType: petData.petType,
            petStatus: petData.petStatus,
            petSize: petData.size,
            petColor: petData.color || 'Não informado',
            petBreed: petData.breed || 'Não informado'
          })
        };
        
        const post = await storage.createPost(postData);
        console.log("Post criado para o pet:", post.id);
      } catch (postError) {
        console.error("Erro ao criar post para o pet:", postError);
        // Continuamos mesmo se falhar a criação do post
      }
      
      res.status(201).json(newPet);
    } catch (error) {
      console.error("Erro completo ao criar pet:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors,
          fields: error.format() 
        });
      }
      res.status(500).json({ message: "Erro ao criar pet" });
    }
  });

  app.patch("/api/pets/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const petId = parseInt(req.params.id);
      const currentUser = req.user as any;
      
      // Get the pet
      const pet = await storage.getPet(petId);
      if (!pet) {
        return res.status(404).json({ message: "Pet não encontrado" });
      }
      
      // Check if user is the owner
      if (pet.ownerId !== currentUser.id) {
        return res.status(403).json({ message: "Não autorizado" });
      }
      
      const updatedPet = await storage.updatePet(petId, req.body);
      res.json(updatedPet);
    } catch (error) {
      console.error("Update pet error:", error);
      res.status(500).json({ message: "Erro ao atualizar pet" });
    }
  });

  // Donations routes
  app.get("/api/donations", async (req: Request, res: Response) => {
    try {
      const filters = {
        type: req.query.type as string | undefined,
        donorId: req.query.donorId ? parseInt(req.query.donorId as string) : undefined,
        city: req.query.city as string | undefined,
        isActive: req.query.isActive ? req.query.isActive === 'true' : true,
      };
      
      const donations = await storage.getDonations(filters);
      res.json(donations);
    } catch (error) {
      console.error("Get donations error:", error);
      res.status(500).json({ message: "Erro ao buscar doações" });
    }
  });

  app.get("/api/donations/:id", async (req: Request, res: Response) => {
    try {
      const donation = await storage.getDonation(parseInt(req.params.id));
      if (!donation) {
        return res.status(404).json({ message: "Doação não encontrada" });
      }
      res.json(donation);
    } catch (error) {
      console.error("Get donation error:", error);
      res.status(500).json({ message: "Erro ao buscar doação" });
    }
  });

  app.post("/api/donations", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const donationData = insertDonationSchema.parse({
        ...req.body,
        donorId: (req.user as any).id
      });
      
      const newDonation = await storage.createDonation(donationData);
      res.status(201).json(newDonation);
    } catch (error) {
      console.error("Create donation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar doação" });
    }
  });

  app.patch("/api/donations/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const donationId = parseInt(req.params.id);
      const currentUser = req.user as any;
      
      // Get the donation
      const donation = await storage.getDonation(donationId);
      if (!donation) {
        return res.status(404).json({ message: "Doação não encontrada" });
      }
      
      // Check if user is the donor
      if (donation.donorId !== currentUser.id) {
        return res.status(403).json({ message: "Não autorizado" });
      }
      
      const updatedDonation = await storage.updateDonation(donationId, req.body);
      res.json(updatedDonation);
    } catch (error) {
      console.error("Update donation error:", error);
      res.status(500).json({ message: "Erro ao atualizar doação" });
    }
  });

  // Vet help routes
  app.get("/api/vet-help", async (req: Request, res: Response) => {
    try {
      const filters = {
        status: req.query.status as string | undefined,
        requesterId: req.query.requesterId ? parseInt(req.query.requesterId as string) : undefined,
        vetId: req.query.vetId ? parseInt(req.query.vetId as string) : undefined,
        city: req.query.city as string | undefined,
      };
      
      const vetHelps = await storage.getVetHelps(filters);
      res.json(vetHelps);
    } catch (error) {
      console.error("Get vet helps error:", error);
      res.status(500).json({ message: "Erro ao buscar ajudas veterinárias" });
    }
  });

  app.get("/api/vet-help/:id", async (req: Request, res: Response) => {
    try {
      const vetHelp = await storage.getVetHelp(parseInt(req.params.id));
      if (!vetHelp) {
        return res.status(404).json({ message: "Ajuda veterinária não encontrada" });
      }
      res.json(vetHelp);
    } catch (error) {
      console.error("Get vet help error:", error);
      res.status(500).json({ message: "Erro ao buscar ajuda veterinária" });
    }
  });

  app.post("/api/vet-help", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const userId = (req.user as any).id;
      
      const vetHelpData = insertVetHelpSchema.parse({
        ...req.body,
        requesterId: userId
      });
      
      // Processar imagens base64 se existirem
      if (vetHelpData.photos && Array.isArray(vetHelpData.photos)) {
        // Array para armazenar as URLs das imagens processadas
        const processedPhotos = [];
        
        for (let i = 0; i < vetHelpData.photos.length; i++) {
          const photo = vetHelpData.photos[i];
          
          // Verificar se é uma URL externa ou base64
          if (photo && photo.startsWith('data:image')) {
            try {
              // Extrair dados base64 e converter para buffer
              const matches = photo.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
              
              if (matches && matches.length === 3) {
                const buffer = Buffer.from(matches[2], 'base64');
                
                // Usar o serviço de imagens unificado
                const imageUrl = await ImageService.saveCampaignImage(buffer, userId);
                processedPhotos.push(imageUrl);
              } else {
                console.warn("Formato base64 inválido para imagem de campanha");
                // Adicionar a URL original como fallback
                processedPhotos.push(photo);
              }
            } catch (imgError) {
              console.error("Erro ao processar imagem para campanha:", imgError);
              // Adicionar a URL original como fallback
              processedPhotos.push(photo);
            }
          } else {
            // Manter URLs externas como estão
            processedPhotos.push(photo);
          }
        }
        
        // Substituir as fotos originais pelas processadas
        vetHelpData.photos = processedPhotos;
      }
      
      const newVetHelp = await storage.createVetHelp(vetHelpData);
      res.status(201).json(newVetHelp);
    } catch (error) {
      console.error("Create vet help error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar ajuda veterinária" });
    }
  });

  app.patch("/api/vet-help/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const vetHelpId = parseInt(req.params.id);
      const currentUser = req.user as any;
      
      // Get the vet help
      const vetHelp = await storage.getVetHelp(vetHelpId);
      if (!vetHelp) {
        return res.status(404).json({ message: "Ajuda veterinária não encontrada" });
      }
      
      // Check if user is the requester or the vet
      if (vetHelp.requesterId !== currentUser.id && vetHelp.vetId !== currentUser.id) {
        return res.status(403).json({ message: "Não autorizado" });
      }
      
      const updatedVetHelp = await storage.updateVetHelp(vetHelpId, req.body);
      res.json(updatedVetHelp);
    } catch (error) {
      console.error("Update vet help error:", error);
      res.status(500).json({ message: "Erro ao atualizar ajuda veterinária" });
    }
  });


  






  // Chat/Messages routes
  app.get("/api/conversations", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const currentUser = req.user as any;
      console.log(`[DEBUG] Buscando conversas para usuário ${currentUser.id}`);
      
      const conversations = await storage.getConversationsByUser(currentUser.id);
      console.log(`[DEBUG] Encontradas ${conversations.length} conversas:`, conversations);
      
      // Enhance conversations with participant info and last message
      const enhancedConversations = await Promise.all(
        conversations.map(async (conversation) => {
          const participantId = 
            conversation.participant1Id === currentUser.id 
              ? conversation.participant2Id 
              : conversation.participant1Id;
          
          const participant = await storage.getUser(participantId);
          let lastMessage = null;
          
          if (conversation.lastMessageId) {
            lastMessage = await storage.getMessage(conversation.lastMessageId);
          }
          
          const enhanced = {
            ...conversation,
            participant: participant ? {
              id: participant.id,
              name: participant.name,
              profileImage: participant.profileImage
            } : null,
            lastMessage
          };
          
          console.log(`[DEBUG] Conversa processada:`, enhanced);
          return enhanced;
        })
      );
      
      console.log(`[DEBUG] Retornando ${enhancedConversations.length} conversas processadas`);
      res.json(enhancedConversations);
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(500).json({ message: "Erro ao buscar conversas" });
    }
  });

  app.get("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const conversationId = parseInt(req.params.id);
      const currentUser = req.user as any;
      
      // Get the conversation
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversa não encontrada" });
      }
      
      // Check if user is a participant
      if (conversation.participant1Id !== currentUser.id && conversation.participant2Id !== currentUser.id) {
        return res.status(403).json({ message: "Não autorizado" });
      }
      
      // Get the other participant info
      const participantId = 
        conversation.participant1Id === currentUser.id 
          ? conversation.participant2Id 
          : conversation.participant1Id;
      
      const participant = await storage.getUser(participantId);
      
      // Get the last message if there is one
      let lastMessage = null;
      if (conversation.lastMessageId) {
        lastMessage = await storage.getMessage(conversation.lastMessageId);
      }
      
      res.json({
        ...conversation,
        participant: participant ? {
          id: participant.id,
          name: participant.name,
          profileImage: participant.profileImage
        } : null,
        lastMessage
      });
    } catch (error) {
      console.error("Get conversation error:", error);
      res.status(500).json({ message: "Erro ao buscar conversa" });
    }
  });

  app.get("/api/messages/:conversationId", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const conversationId = parseInt(req.params.conversationId);
      const currentUser = req.user as any;
      
      // Get the conversation
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversa não encontrada" });
      }
      
      // Check if user is a participant
      if (conversation.participant1Id !== currentUser.id && conversation.participant2Id !== currentUser.id) {
        return res.status(403).json({ message: "Não autorizado" });
      }
      
      const messages = await storage.getMessages(conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ message: "Erro ao buscar mensagens" });
    }
  });

  app.post("/api/conversations", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const currentUserId = (req.user as any).id;
      const { participant2Id } = req.body;
      
      if (!participant2Id || isNaN(participant2Id)) {
        return res.status(400).json({ message: "ID do participante inválido" });
      }
      
      // Verifica se já existe uma conversa entre os usuários
      let conversation = await storage.findConversation(currentUserId, participant2Id);
      
      // Se não existir, cria uma nova
      if (!conversation) {
        conversation = await storage.createConversation({
          participant1Id: currentUserId,
          participant2Id
        });
      }
      
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Create conversation error:", error);
      res.status(500).json({ message: "Erro ao criar conversa" });
    }
  });

  app.post("/api/messages", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const { conversationId, content, recipientId, metadata } = req.body;
      const senderId = (req.user as any).id;
      
      if (!recipientId) {
        return res.status(400).json({ message: "Destinatário não informado" });
      }
      
      if (!content || content.trim() === '') {
        return res.status(400).json({ message: "Conteúdo da mensagem não pode estar vazio" });
      }
      
      // Cria a mensagem
      const messageData = {
        senderId,
        receiverId: recipientId,
        content,
        isRead: false,
        metadata: metadata || {}
      };
      
      const newMessage = await storage.createMessage(messageData);
      
      // Atualiza a conversa com a última mensagem
      if (conversationId) {
        await storage.updateConversationLastMessage(conversationId, newMessage.id);
      }
      
      // Cria uma notificação para o destinatário
      await storage.createNotification({
        userId: recipientId,
        type: 'new_message',
        content: `Nova mensagem de ${(req.user as any).name || (req.user as any).username || 'alguém'}`,
        isRead: false,
        relatedId: newMessage.id,
        relatedType: 'message'
      });
      
      res.status(201).json({
        ...newMessage,
        conversationId
      });
    } catch (error) {
      console.error("Create message error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao enviar mensagem" });
    }
  });

  // Post interactions (likes, comments)
  app.get("/api/interactions", async (req: Request, res: Response) => {
    try {
      const postType = req.query.postType as string;
      const postId = parseInt(req.query.postId as string);
      
      if (!postType || isNaN(postId)) {
        return res.status(400).json({ message: "Parâmetros inválidos" });
      }
      
      const interactions = await storage.getPostInteractions(postType, postId);
      res.json(interactions);
    } catch (error) {
      console.error("Get interactions error:", error);
      res.status(500).json({ message: "Erro ao buscar interações" });
    }
  });

  app.get("/api/interactions/likes", async (req: Request, res: Response) => {
    try {
      // Se temos userId, retornamos todas as curtidas do usuário
      if (req.query.userId) {
        const userId = parseInt(req.query.userId as string);
        
        if (isNaN(userId)) {
          return res.status(400).json({ message: "ID de usuário inválido" });
        }
        
        // Obter todas as curtidas do usuário
        const likes = await db
          .select()
          .from(postInteractions)
          .where(
            and(
              eq(postInteractions.userId, userId),
              eq(postInteractions.type, "like")
            )
          );
        
        return res.json(likes);
      }
      
      // Caso contrário, obter contagem para um post específico
      const postType = req.query.postType as string;
      const postId = parseInt(req.query.postId as string);
      
      if (!postType || isNaN(postId)) {
        return res.status(400).json({ message: "Parâmetros inválidos" });
      }
      
      const count = await storage.getLikeCount(postType, postId);
      res.json({ count });
    } catch (error) {
      console.error("Get likes count error:", error);
      res.status(500).json({ message: "Erro ao buscar contagem de likes" });
    }
  });

  app.get("/api/interactions/comments", async (req: Request, res: Response) => {
    try {
      const postType = req.query.postType as string;
      const postId = parseInt(req.query.postId as string);
      
      if (!postType || isNaN(postId)) {
        return res.status(400).json({ message: "Parâmetros inválidos" });
      }
      
      const comments = await storage.getComments(postType, postId);
      
      // Enhance comments with user info
      const enhancedComments = await Promise.all(
        comments.map(async (comment) => {
          const user = await storage.getUser(comment.userId);
          
          return {
            ...comment,
            user: user ? {
              id: user.id,
              name: user.name,
              profileImage: user.profileImage
            } : null
          };
        })
      );
      
      res.json(enhancedComments);
    } catch (error) {
      console.error("Get comments error:", error);
      res.status(500).json({ message: "Erro ao buscar comentários" });
    }
  });

  // Rota para obter interações salvas de um usuário
  app.get("/api/interactions/saved", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const userId = (req.user as any).id;
      
      // Buscar todas as interações do tipo "save" para o usuário
      const savedInteractions = await db
        .select()
        .from(postInteractions)
        .where(
          and(
            eq(postInteractions.userId, userId),
            eq(postInteractions.type, "save")
          )
        );
      
      res.json(savedInteractions);
    } catch (error) {
      console.error("Erro ao buscar posts salvos:", error);
      res.status(500).json({ message: "Erro ao buscar posts salvos" });
    }
  });

  app.post("/api/interactions", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const interactionData = insertPostInteractionSchema.parse({
        ...req.body,
        userId: (req.user as any).id
      });
      
      // For likes, check if user already liked the post
      if (interactionData.type === "like") {
        const interactions = await storage.getPostInteractions(
          interactionData.postType,
          interactionData.postId
        );
        
        const existingLike = interactions.find(
          i => i.userId === interactionData.userId && i.type === "like"
        );
        
        if (existingLike) {
          // Unlike - remove the like
          await storage.deletePostInteraction(existingLike.id);
          return res.json({ message: "Like removido", liked: false });
        }
      }
      
      const newInteraction = await storage.createPostInteraction(interactionData);
      res.status(201).json(newInteraction);
    } catch (error) {
      console.error("Create interaction error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar interação" });
    }
  });

  // Notifications
  app.get("/api/notifications", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const currentUser = req.user as any;
      const notifications = await storage.getNotifications(currentUser.id);
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Erro ao buscar notificações" });
    }
  });

  app.post("/api/notifications/read/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const notificationId = parseInt(req.params.id);
      const updatedNotification = await storage.markNotificationAsRead(notificationId);
      
      if (!updatedNotification) {
        return res.status(404).json({ message: "Notificação não encontrada" });
      }
      
      res.json(updatedNotification);
    } catch (error) {
      console.error("Mark notification as read error:", error);
      res.status(500).json({ message: "Erro ao marcar notificação como lida" });
    }
  });

  app.post("/api/notifications/read-all", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const currentUser = req.user as any;
      await storage.markAllNotificationsAsRead(currentUser.id);
      res.json({ message: "Todas as notificações marcadas como lidas" });
    } catch (error) {
      console.error("Mark all notifications as read error:", error);
      res.status(500).json({ message: "Erro ao marcar todas as notificações como lidas" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // For initial development, let's disable WebSocket to focus on rendering the main app
  // We'll implement proper WebSocket chat later once the basic app is running
  console.log("WebSocket chat functionality temporarily disabled during initial development");
  
  // Create a simple messaging endpoint instead of WebSockets for now
  app.post("/api/messages/send", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      console.log("Message sent via HTTP endpoint:", req.body);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error sending message:", error);
      return res.status(500).json({ message: "Error sending message" });
    }
  });
  
  // Stripe payment routes
  app.post("/api/create-payment-intent", async (req: Request, res: Response) => {
    try {
      const { amount, description, paymentId, items } = req.body;
      
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ 
          message: "Valor do pagamento inválido. Forneça um número positivo." 
        });
      }
      
      console.log(`Processando pagamento: R$ ${amount} (${description || 'Doação'})`);
      
      // Metadados opcionais do pagamento
      const metadata: Record<string, any> = {
        items: items ? JSON.stringify(items) : ''
      };
      
      // Se o usuário estiver autenticado, adicione o ID do usuário aos metadados
      if (req.isAuthenticated()) {
        const userId = (req.user as any).id;
        metadata.userId = userId.toString();
      }
      
      // Adicionar descrição e ID de pagamento aos metadados, se fornecidos
      if (description) {
        metadata.description = description;
      }
      
      if (paymentId) {
        metadata.paymentId = paymentId.toString();
      }
      
      // Criar intenção de pagamento
      const paymentIntent = await createPaymentIntent(amount, metadata);
      
      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        paymentDetails: {
          id: paymentIntent.id,
          amount: amount,
          description: description || "Doação para YaoPets",
          created: new Date().toISOString()
        }
      });
    } catch (error: any) {
      console.error("Payment intent error:", error);
      res.status(500).json({ 
        message: "Erro ao criar intenção de pagamento",
        error: error.message 
      });
    }
  });
  
  // Rota para assinaturas (planos mensais/anuais)
  app.post("/api/create-subscription", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const user = req.user as any;
      const { priceId } = req.body;
      
      if (!priceId) {
        return res.status(400).json({ message: "ID do preço não fornecido" });
      }
      
      // Obter ou criar o cliente no Stripe
      const customer = await createOrRetrieveCustomer(
        user.email,
        user.name || "Usuário YaoPets",
        { userId: user.id.toString() }
      );
      
      // Criar a assinatura
      const subscription = await createSubscription(customer.id, priceId);
      
      // @ts-ignore - TS doesn't recognize the expanded invoice property
      const clientSecret = subscription.latest_invoice?.payment_intent?.client_secret;
      
      if (!clientSecret) {
        throw new Error("Não foi possível criar a intenção de pagamento para a assinatura");
      }
      
      res.json({
        subscriptionId: subscription.id,
        clientSecret,
        customerId: customer.id
      });
    } catch (error: any) {
      console.error("Subscription error:", error);
      res.status(500).json({
        message: "Erro ao criar assinatura",
        error: error.message
      });
    }
  });
  
  // Página de confirmação de pagamento
  app.get("/api/payment-success", async (req: Request, res: Response) => {
    const { payment_intent } = req.query;
    
    if (!payment_intent) {
      return res.status(400).json({ message: "Parâmetro payment_intent ausente" });
    }
    
    try {
      // Redirecionar para página de agradecimento
      res.redirect(`/payment-success?intent=${payment_intent}`);
    } catch (error: any) {
      console.error("Payment success error:", error);
      res.status(500).json({ message: "Erro ao processar confirmação de pagamento" });
    }
  });

  // ----- Rotas para Posts -----
  // Obter todos os posts (com filtros opcionais)
  app.get("/api/posts", async (req: Request, res: Response) => {
    try {
      const filters: { 
        userId?: number; 
        postType?: string; 
        isStory?: boolean;
        visibilityType?: string;
      } = {};
      
      if (req.query.userId) {
        filters.userId = parseInt(req.query.userId as string);
      }
      
      if (req.query.postType) {
        filters.postType = req.query.postType as string;
      }
      
      if (req.query.isStory !== undefined) {
        filters.isStory = req.query.isStory === 'true';
      }
      
      // Adicionar filtro de visibilidade, se fornecido
      if (req.query.visibilityType) {
        filters.visibilityType = req.query.visibilityType as string;
        console.log(`Filtrando posts por visibilidade: ${filters.visibilityType}`);
      }
      
      // Buscar posts diretamente do PostgreSQL
      // Construir filtros 
      let conditions = [];
      
      if (filters.userId) {
        conditions.push(eq(posts.userId, filters.userId));
      }
      
      if (filters.postType) {
        conditions.push(eq(posts.postType, filters.postType));
      }
      
      // Filtro de stories foi removido
      
      if (filters.visibilityType) {
        conditions.push(eq(posts.visibilityType, filters.visibilityType));
      }
      
      // Executar a consulta com JOIN para incluir informações do usuário
      let postsResult = [];
      
      if (conditions.length > 0) {
        postsResult = await db.select({
          id: posts.id,
          userId: posts.userId,
          content: posts.content,
          mediaUrls: posts.mediaUrls,
          location: posts.location,
          visibilityType: posts.visibilityType,
          postType: posts.postType,
          likesCount: posts.likesCount,
          commentsCount: posts.commentsCount,
          createdAt: posts.createdAt,
          updatedAt: posts.updatedAt,
          // Informações do usuário
          username: users.username,
          userPhotoUrl: users.profileImage,
          userName: users.name,
          userLevel: users.level
        })
          .from(posts)
          .leftJoin(users, eq(posts.userId, users.id))
          .where(and(...conditions))
          .orderBy(desc(posts.createdAt));
      } else {
        postsResult = await db.select({
          id: posts.id,
          userId: posts.userId,
          content: posts.content,
          mediaUrls: posts.mediaUrls,
          location: posts.location,
          visibilityType: posts.visibilityType,
          postType: posts.postType,
          likesCount: posts.likesCount,
          commentsCount: posts.commentsCount,
          createdAt: posts.createdAt,
          updatedAt: posts.updatedAt,
          // Informações do usuário
          username: users.username,
          userPhotoUrl: users.profileImage,
          userName: users.name,
          userLevel: users.level
        })
          .from(posts)
          .leftJoin(users, eq(posts.userId, users.id))
          .orderBy(desc(posts.createdAt));
      }
      console.log(`Encontrados ${postsResult.length} posts com os filtros aplicados`);
      
      // Verificar interações se o usuário estiver autenticado
      const userId = req.isAuthenticated() ? (req.user as any).id : null;
      
      // Adicionar informações de interações a cada post
      const postsWithInteractions = await Promise.all(postsResult.map(async (post) => {
        let isLiked = false;
        let isSaved = false;
        
        // Se tem usuário autenticado, verificar interações
        if (userId) {
          // Verificar se curtiu
          const likeResult = await db.select()
            .from(postInteractions)
            .where(and(
              eq(postInteractions.userId, userId),
              eq(postInteractions.postId, post.id),
              eq(postInteractions.postType, 'post'),
              eq(postInteractions.type, 'like')
            ))
            .limit(1);
          
          isLiked = likeResult.length > 0;
          
          // Verificar se salvou
          const saveResult = await db.select()
            .from(postInteractions)
            .where(and(
              eq(postInteractions.userId, userId),
              eq(postInteractions.postId, post.id),
              eq(postInteractions.postType, 'post'),
              eq(postInteractions.type, 'save')
            ))
            .limit(1);
          
          isSaved = saveResult.length > 0;
        }
        
        return {
          ...post,
          isLiked,
          isSaved,
          likesCount: post.likesCount || 0,
          commentsCount: post.commentsCount || 0
        };
      }));
      
      res.json(postsWithInteractions);
    } catch (error) {
      console.error("Error getting posts:", error);
      res.status(500).json({ message: "Erro ao obter postagens" });
    }
  });
  
  // Obter um post pelo ID
  app.get("/api/posts/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }
    
    try {
      const post = await storage.getPost(id);
      
      if (!post) {
        return res.status(404).json({ message: "Post não encontrado" });
      }
      
      res.json(post);
    } catch (error) {
      console.error("Error getting post:", error);
      res.status(500).json({ message: "Erro ao obter post" });
    }
  });
  
  // Criar um novo post
  app.post("/api/posts", async (req: Request, res: Response) => {
    try {
      // Verificar sessão e cookies para debug
      console.log("Headers:", req.headers);
      console.log("Cookies:", req.cookies);
      console.log("Session:", req.session);
      console.log("Autenticado:", req.isAuthenticated());
      console.log("Usuário:", req.user);
      
      // Implementar verificação dupla de autenticação
      // 1. Verificar autenticação normal
      // 2. Em modo de desenvolvimento, permitir fallback para testes
      
      // Obter ID do usuário
      let userId = 0;
      let isTestMode = false;
      
      if (req.isAuthenticated() && req.user) {
        // Método normal - usuário autenticado
        // @ts-ignore - acessamos id diretamente do usuário
        userId = req.user.id;
        console.log("Usuário autenticado via sessão:", userId);
      } else {
        // Modo de teste - permite criação mesmo sem autenticação completa
        // Isso facilita testes e desenvolvimento
        isTestMode = true;
        
        if (req.body && req.body.userId) {
          // Usar ID fornecido pelo cliente (apenas em modo de teste)
          userId = parseInt(req.body.userId);
          console.log("MODO TESTE - Usando ID do corpo da requisição:", userId);
        } else {
          // Fallback para um ID padrão em último caso (ID 18)
          userId = 18; 
          console.log("MODO TESTE - Usando ID padrão (18)");
        }
      }
      
      const postData = req.body;
      postData.userId = userId;
      
      // Log para debug
      console.log("Recebido dados para criação de post:", JSON.stringify(postData, null, 2));
      
      // Verificar e normalizar os dados do post
      console.log("Iniciando processamento do post - dados recebidos:", postData);
      
      // Garantir que o campo content sempre esteja presente (é obrigatório no banco)
      if (!postData.content || postData.content.trim() === '') {
        // Se o campo petName estiver presente, usar ele como base
        if (postData.petName) {
          postData.content = `${postData.petName} para adoção`;
        } else {
          // Fallback para qualquer caso
          postData.content = 'Novo pet para adoção';
        }
        console.log("Campo content estava vazio, usando valor padrão:", postData.content);
      }
      
      // Corrigir o postType para pet APENAS se for um cadastro explícito de pet
      // Isso garante que apenas posts de /new-pet apareçam na seção de pets
      if (postData.petName || postData.petSpecies || postData.petStatus || postData.petMetadata) {
        postData.postType = 'pet';
        console.log("Tipo de post definido para 'pet' - cadastro explícito de pet");
      } else {
        // Garantir que posts normais da home não sejam categorizados como pets
        postData.postType = postData.postType || 'regular';
        console.log("Tipo de post definido para 'regular' - post normal da home");
      }
      
      // Preparar dados e ativar modo especial para testes
      if (isTestMode) {
        console.log("Executando em modo de teste - ignorando validações estritas");
      }
      
      // Verificar se temos metadados de pet para incluir na postagem
      // Importante para garantir que os dados do pet sejam armazenados corretamente
      
      // IMPORTANTE: Capturar petStatus diretamente do body primeiro
      if (req.body.petStatus) {
        postData.petStatus = req.body.petStatus;
        console.log("Status do pet recebido diretamente:", req.body.petStatus);
      }

      // Verificar se já temos metadados formatados corretamente enviados pelo cliente
      if (req.body.petMetadata) {
        try {
          // Tenta analisar os metadados se estiverem em formato de string
          let metadata;
          if (typeof req.body.petMetadata === 'string') {
            metadata = JSON.parse(req.body.petMetadata);
          } else if (typeof req.body.petMetadata === 'object') {
            metadata = req.body.petMetadata;
          }
          
          if (metadata) {
            // Garantir que o petStatus dos metadados não sobrescreva o direto
            if (postData.petStatus) {
              metadata.petStatus = postData.petStatus;
            }
            
            // Garantir que os metadados estejam no formato string para armazenamento
            postData.petMetadata = typeof metadata === 'string' ? metadata : JSON.stringify(metadata);
            
            // Adicionar também individualmente para compatibilidade
            for (const [key, value] of Object.entries(metadata)) {
              postData[key] = value;
            }
            
            console.log("Metadados completos enviados pelo cliente:", metadata);
          }
        } catch (e) {
          console.error("Erro ao processar petMetadata:", e);
        }
      } 
      // Se não temos metadados completos, construímos a partir dos campos individuais
      else if (req.body.petName || req.body.petSpecies || req.body.petSize || req.body.petAge || req.body.petLocation) {
        // Criar objeto de metadados de pet
        const petMetadata = {
          petName: req.body.petName || 'Pet para adoção',
          petSpecies: req.body.petSpecies || 'Não especificado',
          petSize: req.body.petSize || 'Médio',
          petAge: req.body.petAge || 'Não especificado',
          petBreed: req.body.petBreed || '',
          petEyeColor: req.body.petEyeColor || '',
          petLocation: req.body.petLocation || 'Localização não informada',
          adoptionInfo: req.body.adoptionInfo || '',
          contactPhone: req.body.contactPhone || '',
          petStatus: req.body.petStatus || 'adoption', // IMPORTANTE: Incluir o status do pet
          // Adicionar versões traduzidas dos campos para exibição direta
          petSpeciesDisplay: translatePetSpecies(req.body.petSpecies),
          petSizeDisplay: translatePetSize(req.body.petSize),
          petAgeDisplay: translatePetAge(req.body.petAge)
        };
        
        // Adicionar metadados ao post
        postData.petMetadata = JSON.stringify(petMetadata);
        
        // Adicionar também individualmente para compatibilidade
        for (const [key, value] of Object.entries(petMetadata)) {
          postData[key] = value;
        }
        
        console.log("Metadados de pet construídos a partir de campos individuais:", petMetadata);
      }
      
      // Usar versões já traduzidas se enviadas pelo cliente
      const petSpeciesDisplay = req.body.petSpeciesDisplay || translatePetSpecies(req.body.petSpecies);
      const petSizeDisplay = req.body.petSizeDisplay || translatePetSize(req.body.petSize);
      const petAgeDisplay = req.body.petAgeDisplay || translatePetAge(req.body.petAge);
      
      // Funções de tradução locais
      function translatePetSpecies(code: string | undefined): string {
        if (!code) return 'Não especificado';
        const speciesMap: { [key: string]: string } = {
          'dog': 'Cachorro',
          'cat': 'Gato',
          'other': 'Outro'
        };
        return speciesMap[code] || code;
      }
      
      function translatePetSize(code: string | undefined): string {
        if (!code) return 'Médio';
        const sizeMap: { [key: string]: string } = {
          'small': 'Pequeno',
          'medium': 'Médio',
          'large': 'Grande'
        };
        return sizeMap[code] || code;
      }
      
      function translatePetAge(code: string | undefined): string {
        if (!code) return 'Não especificado';
        const ageMap: { [key: string]: string } = {
          'puppy': 'Filhote',
          'young': 'Jovem',
          'adult': 'Adulto',
          'senior': 'Idoso'
        };
        return ageMap[code] || code;
      }
      
      // Adicionar versões traduzidas aos dados do post
      postData.petSpeciesDisplay = petSpeciesDisplay;
      postData.petSizeDisplay = petSizeDisplay;
      postData.petAgeDisplay = petAgeDisplay;
      
      // Validação e normalização de mídia
      let hasMedia = false;
      
      // Verificar se mediaUrls existe e tem conteúdo
      if (postData.mediaUrls) {
        if (Array.isArray(postData.mediaUrls) && postData.mediaUrls.length > 0) {
          hasMedia = true;
          console.log("Detectado array de mídia com", postData.mediaUrls.length, "itens");
        } else if (typeof postData.mediaUrls === 'string' && postData.mediaUrls.trim() !== '') {
          hasMedia = true;
          console.log("Detectada string de mídia");
        }
      }
      
      // Em modo de teste ou desenvolvimento, sempre permitir criação de posts
      if (!hasMedia) {
        console.log("Gerando URL de mídia de demonstração para fins de teste");
        // Gerar URL simulada para testes
        const timestamp = Date.now();
        const randomId = Math.floor(Math.random() * 1000);
        postData.mediaUrls = [`https://yaopets-media-demo/${timestamp}-${randomId}.jpg`];
      }
      
      // Normalização de mediaUrls 
      // Primeiro, verificamos se é uma string que parece JSON
      if (typeof postData.mediaUrls === 'string') {
        if (postData.mediaUrls.startsWith('[')) {
          try {
            // Tentar converter para array se for string de JSON
            postData.mediaUrls = JSON.parse(postData.mediaUrls);
            console.log("Convertido string JSON para array:", postData.mediaUrls);
          } catch (e) {
            console.log("Falha ao converter como JSON, usando como URL única");
            postData.mediaUrls = [postData.mediaUrls];
          }
        } else {
          // Assumir que é uma URL única e colocar em array
          postData.mediaUrls = [postData.mediaUrls];
          console.log("Convertido URL única para array:", postData.mediaUrls);
        }
      }
      
      // Garantir que mediaUrls seja armazenado como JSON
      if (Array.isArray(postData.mediaUrls)) {
        console.log("Convertendo array para JSON string:", postData.mediaUrls);
        postData.mediaUrls = JSON.stringify(postData.mediaUrls);
      }
      
      // Tratamento de localização
      if (postData.location) {
        if (typeof postData.location === 'object') {
          console.log("Convertendo objeto de localização para JSON string");
          postData.location = JSON.stringify(postData.location);
        } else if (typeof postData.location === 'string') {
          // Verificar se já é uma string JSON
          if (postData.location.startsWith('{')) {
            // Já parece estar em formato JSON, manter como está
            console.log("Mantendo string JSON de localização");
          } else if (postData.location.trim() === '') {
            // String vazia, definir como nulo
            postData.location = null;
            console.log("Localização vazia definida como null");
          } else {
            // String simples, criar objeto simples
            postData.location = JSON.stringify({ address: postData.location });
            console.log("Convertido string simples para objeto de localização");
          }
        }
      }
      
      const newPost = await storage.createPost(postData);
      console.log("Post criado com sucesso:", newPost);
      res.status(201).json(newPost);
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ message: "Erro ao criar postagem", error: String(error) });
    }
  });
  
  // Atualizar um post existente
  app.patch("/api/posts/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }
    
    try {
      const data = req.body;
      const updatedPost = await storage.updatePost(id, data);
      
      if (!updatedPost) {
        return res.status(404).json({ message: "Post não encontrado" });
      }
      
      res.json(updatedPost);
    } catch (error) {
      console.error("Error updating post:", error);
      res.status(500).json({ message: "Erro ao atualizar post" });
    }
  });
  
  // Apagar um post
  app.delete("/api/posts/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }
    
    try {
      const success = await storage.deletePost(id);
      
      if (!success) {
        return res.status(500).json({ message: "Erro ao apagar post" });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting post:", error);
      res.status(500).json({ message: "Erro ao apagar post" });
    }
  });
  
  // Criar postagens para todos os usuários
  app.post("/api/posts/create-for-all-users", async (req: Request, res: Response) => {
    try {
      // Obter todos os usuários
      const allUsers = await db.select().from(users);
      const createdPosts = [];
      
      // Conteúdos para diferentes tipos de postagens
      const postContents = [
        {
          content: "Adotei um novo amigo peludo hoje! 🐶 Ele já está se adaptando super bem à sua nova casa.",
          mediaUrls: JSON.stringify(["https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"]),
          location: JSON.stringify({ lat: -23.5558, lng: -46.6396, address: "São Paulo, SP" }),
          postType: "regular"
        },
        {
          content: "Estou procurando indicação de veterinários na região. Alguém conhece um bom profissional?",
          mediaUrls: null,
          location: null,
          postType: "question"
        },
        {
          content: "Levei meu gato ao veterinário hoje. Tudo bem com ele! Apenas checkup de rotina. 😺",
          mediaUrls: JSON.stringify(["https://images.unsplash.com/photo-1511044568932-338cba0ad803?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"]),
          location: null,
          postType: "regular"
        },
        {
          content: "Meu cachorro está aprendendo novos truques! 🐕 Tão inteligente!",
          mediaUrls: JSON.stringify(["https://images.unsplash.com/photo-1562176566-e9afd27531d4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"]),
          location: null,
          postType: "regular"
        },
        {
          content: "Acabei de doar ração para um abrigo local de animais. Se puderem, ajudem também! Eles estão precisando muito.",
          mediaUrls: null,
          location: JSON.stringify({ lat: -23.5505, lng: -46.6333, address: "São Paulo, SP" }),
          postType: "event"
        },
        {
          content: "Bom dia! Hoje é dia de passear com meu companheiro peludo no parque 🌳🐕",
          mediaUrls: JSON.stringify(["https://images.unsplash.com/photo-1534361960057-19889db9621e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"]),
          location: JSON.stringify({ lat: -23.5874, lng: -46.6576, address: "Parque Ibirapuera, São Paulo, SP" }),
          isStory: true,
          postType: "story"
        }
      ];
      
      // Para cada usuário, criar 2-3 postagens aleatórias
      for (const user of allUsers) {
        // Criar 2-3 postagens por usuário
        const numberOfPosts = Math.floor(Math.random() * 2) + 2; // 2-3 posts
        
        for (let i = 0; i < numberOfPosts; i++) {
          // Selecionar um conteúdo aleatório
          const randomContentIndex = Math.floor(Math.random() * postContents.length);
          const postContent = postContents[randomContentIndex];
          
          // Criar a postagem
          const post = {
            userId: user.id,
            content: postContent.content,
            mediaUrls: postContent.mediaUrls,
            location: postContent.location,
            visibilityType: "public",
            postType: postContent.postType,
            isStory: postContent.isStory || false,
            expiresAt: postContent.isStory ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null, // 24h para stories
          };
          
          const newPost = await storage.createPost(post);
          createdPosts.push(newPost);
        }
      }
      
      res.status(201).json({ 
        message: `Foram criadas ${createdPosts.length} postagens para ${allUsers.length} usuários`, 
        postsCount: createdPosts.length 
      });
    } catch (error) {
      console.error("Error creating posts for all users:", error);
      res.status(500).json({ message: "Erro ao criar postagens para todos os usuários" });
    }
  });
  
  // Apagar todas as postagens (apenas para uso de desenvolvimento)
  app.delete("/api/posts/delete-all", async (req: Request, res: Response) => {
    try {
      console.log("Iniciando exclusão de todas as postagens...");
      
      // Obter todas as postagens
      const allPosts = await db.select().from(posts);
      console.log(`Encontradas ${allPosts.length} postagens para excluir`);
      
      let deletedCount = 0;
      
      // Usar o serviço de armazenamento para apagar cada postagem
      for (const post of allPosts) {
        try {
          console.log(`Tentando excluir postagem ID: ${post.id}`);
          const success = await storage.deletePost(post.id);
          if (success) {
            deletedCount++;
          } else {
            console.log(`Não foi possível excluir a postagem ID: ${post.id}`);
          }
        } catch (err) {
          console.error(`Erro ao excluir postagem ID: ${post.id}`, err);
        }
      }
      
      console.log(`Exclusão concluída: ${deletedCount} de ${allPosts.length} postagens removidas`);
      
      res.status(200).json({ 
        message: `Foram apagadas ${deletedCount} postagens`, 
        deletedCount,
        totalCount: allPosts.length
      });
    } catch (error) {
      console.error("Error deleting all posts:", error);
      res.status(500).json({ message: "Erro ao apagar todas as postagens" });
    }
  });
  
  // Rotas de pagamento com Stripe
  app.post("/api/create-payment-intent", async (req: Request, res: Response) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ message: "Stripe não configurado" });
      }
      
      const { amount, description, paymentId } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Valor inválido" });
      }
      
      // Já esperamos o valor em centavos do cliente
      const amountInCents = Math.round(amount);
      
      console.log(`Processando pagamento: R$ ${amountInCents} (${description})`);
      
      // Metadados para rastreamento da doação
      const metadata: Record<string, string> = {
        description: description || "Doação para YaoPets",
      };
      
      if (paymentId) {
        metadata.paymentId = paymentId;
      }
      
      if (req.user) {
        metadata.userId = String((req.user as any).id);
      }
      
      try {
        // Criar a intenção de pagamento usando o serviço configurado
        const paymentIntent = await createPaymentIntent(amountInCents, metadata);
        
        console.log(`PaymentIntent criado com sucesso: ${paymentIntent.id}`);
        
        res.status(200).json({
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
        });
      } catch (stripeError: any) {
        console.error("Payment intent error:", stripeError);
        
        // Verificar se o erro é específico de chave expirada
        if (stripeError.code === 'api_key_expired') {
          return res.status(500).json({ 
            message: "Erro na configuração do Stripe", 
            error: "api_key_expired",
            details: "A chave do Stripe está expirada e precisa ser atualizada."
          });
        }
        
        res.status(500).json({ 
          message: "Erro ao processar pagamento no Stripe",
          error: stripeError.message
        });
      }
    } catch (error: any) {
      console.error("Erro ao criar payment intent:", error);
      res.status(500).json({ 
        message: "Erro ao processar pagamento", 
        error: error.message 
      });
    }
  });
  
  // Verificar status de um pagamento
  app.get("/api/payment-success", async (req: Request, res: Response) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ message: "Stripe não configurado" });
      }
      
      const { payment_intent } = req.query;
      
      if (!payment_intent) {
        return res.status(400).json({ message: "ID de pagamento não fornecido" });
      }
      
      try {
        // Buscar detalhes do pagamento usando o serviço já configurado
        const paymentIntent = await retrievePaymentIntent(payment_intent as string);
        
        // Se o pagamento for bem-sucedido, registrar a doação no sistema
        if (paymentIntent.status === 'succeeded') {
          // Verificar se já existe uma doação com este ID de pagamento
          // para evitar duplicação de registros
          const donationAmount = paymentIntent.amount / 100; // Converter centavos para reais
          
          try {
            // Criar uma nova entrada de doação no banco de dados
            if (req.isAuthenticated()) {
              const user = req.user as any;
              
              await storage.createDonation({
                donorId: user.id,
                amount: donationAmount,
                type: "monetary",
                details: `Doação via Stripe: ${paymentIntent.id}`,
                status: "completed",
                createdAt: new Date(),
                updatedAt: new Date(),
                location: null,
                isActive: true
              });
              console.log(`Doação registrada com sucesso: R$ ${donationAmount} do usuário ${user.id}`);
            } else {
              console.log(`Doação anônima registrada: R$ ${donationAmount}`);
            }
          } catch (dbError) {
            console.error("Erro ao registrar doação no banco de dados:", dbError);
            // Continuamos mesmo com erro no registro da doação
          }
        }
        
        // Retornar informações filtradas
        res.json({
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          status: paymentIntent.status,
          created: new Date(paymentIntent.created * 1000).toISOString(),
          metadata: paymentIntent.metadata,
        });
      } catch (stripeError) {
        console.error("Erro ao acessar o Stripe:", stripeError);
        res.status(500).json({ message: "Erro ao verificar pagamento no Stripe" });
      }
    } catch (error: any) {
      console.error("Erro ao verificar pagamento:", error);
      res.status(500).json({ 
        message: "Erro ao verificar status do pagamento", 
        error: error.message 
      });
    }
  });

  // Criar sessão do Stripe Checkout
  app.post("/api/create-checkout-session", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Não autenticado' });
      }

      const { amount, description, fundraiser } = req.body;
      console.log(`Criando Checkout Session: R$ ${amount/100} (${description})`);
      console.log('🔧 Headers da requisição:', req.headers.origin);
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Valor inválido' });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'brl',
              product_data: {
                name: description || 'Doação YaoPets',
                description: `Contribuição para: ${description}`,
              },
              unit_amount: Math.round(amount),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${req.headers.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/vet-help`,
        metadata: {
          fundraiser: fundraiser || '',
          userId: (req.user as any)?.id?.toString() || 'anonymous'
        }
      });

      console.log(`Checkout Session criado: ${session.id}`);
      
      res.json({ 
        sessionId: session.id,
        url: session.url
      });
      
    } catch (error: any) {
      console.error('Erro ao criar Checkout Session:', error);
      res.status(500).json({ 
        message: 'Erro interno do servidor',
        error: error.message 
      });
    }
  });

  // ===== ENDPOINTS DE COMENTÁRIOS =====
  
  // Listar comentários de um post
  app.get("/api/posts/:postId/comments", async (req: Request, res: Response) => {
    try {
      const { postId } = req.params;
      const parsedPostId = parseInt(postId);
      
      if (isNaN(parsedPostId)) {
        return res.status(400).json({ error: "ID do post inválido" });
      }
      
      // Buscar comentários reais do banco de dados
      const comments = await db
        .select()
        .from(postInteractions)
        .where(
          and(
            eq(postInteractions.postId, parsedPostId),
            eq(postInteractions.type, 'comment')
          )
        )
        .orderBy(desc(postInteractions.createdAt));
      
      // Enriquecer com dados do usuário
      const enrichedComments = await Promise.all(
        comments.map(async (comment) => {
          const [user] = await db.select().from(users).where(eq(users.id, comment.userId));
          return {
            id: comment.id,
            content: comment.content || "",
            username: user?.username || "Usuário",
            userPhotoUrl: user?.profileImage || "",
            createdAt: comment.createdAt.toISOString(),
            likesCount: 0, // Implementar contagem de likes para comentários quando necessário
            isLiked: false, // Implementar verificação de like quando necessário
            userId: comment.userId
          };
        })
      );
      
      res.status(200).json(enrichedComments);
    } catch (error: any) {
      console.error("Erro ao listar comentários:", error);
      res.status(500).json({ 
        message: "Erro ao buscar comentários", 
        error: error.message 
      });
    }
  });
  
  // Adicionar um comentário
  app.post("/api/posts/:postId/comments", async (req: Request, res: Response) => {
    try {
      const { postId } = req.params;
      const { content, userId, type = 'comment' } = req.body;
      
      if (!content || !content.trim()) {
        return res.status(400).json({ message: "Conteúdo do comentário é obrigatório" });
      }
      
      // Na implementação real, isso adicionaria ao banco de dados
      // Aqui estamos retornando um mock de comentário adicionado
      const newComment = {
        id: Date.now(),
        content: content.trim(),
        username: req.user?.username || "Usuário",
        userPhotoUrl: req.user?.profileImage || null,
        createdAt: new Date().toISOString(),
        likesCount: 0,
        isLiked: false,
        userId: req.user?.id || 0
      };
      
      res.status(200).json(newComment);
    } catch (error: any) {
      console.error("Erro ao adicionar comentário:", error);
      res.status(500).json({ 
        message: "Erro ao adicionar comentário", 
        error: error.message 
      });
    }
  });
  
  // Dar like ou remover like de um comentário
  app.post("/api/comments/:commentId/toggle-like", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const userId = (req.user as any).id;
      const commentId = parseInt(req.params.commentId);
      
      if (isNaN(commentId)) {
        return res.status(400).json({ message: "ID de comentário inválido" });
      }
      
      // Verificar se o comentário existe
      const commentCheck = await db.select()
        .from(postInteractions)
        .where(
          and(
            eq(postInteractions.id, commentId),
            eq(postInteractions.type, 'comment')
          )
        )
        .limit(1);
      
      if (commentCheck.length === 0) {
        return res.status(404).json({ message: "Comentário não encontrado" });
      }
      
      const comment = commentCheck[0];
      const postId = comment.postId;
      
      // Verificar se já existe um like deste usuário para este comentário
      const existingLike = await db.select()
        .from(postInteractions)
        .where(
          and(
            eq(postInteractions.userId, userId),
            eq(postInteractions.postId, postId),
            eq(postInteractions.type, 'comment_like'),
            sql`${postInteractions.content} = ${commentId.toString()}`
          )
        )
        .limit(1);
      
      let liked = false;
      
      // Toggle: Se já existir, remove. Se não existir, adiciona.
      if (existingLike.length > 0) {
        // Remover like existente
        await db.delete(postInteractions)
          .where(eq(postInteractions.id, existingLike[0].id));
      } else {
        // Adicionar novo like
        await db.insert(postInteractions)
          .values({
            userId,
            postId,
            postType: 'post',
            type: 'comment_like',
            content: commentId.toString(),
            createdAt: new Date()
          });
        liked = true;
      }
      
      // Obter contagem atualizada de likes para este comentário
      const likeCountResult = await db.select({
        count: sql<number>`count(*)`
      })
      .from(postInteractions)
      .where(
        and(
          eq(postInteractions.postType, 'post'),
          eq(postInteractions.type, 'comment_like'),
          sql`${postInteractions.content} = ${commentId.toString()}`
        )
      );
      
      const likesCount = Number(likeCountResult[0]?.count || 0);
      
      res.json({
        success: true,
        liked,
        likesCount,
        postId
      });
    } catch (error: any) {
      console.error("Erro ao processar like:", error);
      res.status(500).json({ 
        message: "Erro ao processar like no comentário", 
        error: error.message 
      });
    }
  });
  
  // Rotas adicionais para compatibilidade com o cliente frontend
  
  // Rota para curtir um post
  app.post('/api/posts/:id/like', async (req: Request, res: Response) => {
    try {
      // Verificar autenticação
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      // Obter o ID do usuário a partir da sessão
      const userId = (req.user as any).id;
      
      console.log("[API LIKES] Verificação de autenticação bem sucedida:", {
        userId: userId,
        sessionID: req.sessionID,
        postId: req.params.id
      });
      
      const postId = parseInt(req.params.id);
      
      console.log(`[DEBUG] POST /api/posts/${postId}/like pelo usuário ${userId}`);
      
      // Verificar se o post existe na tabela posts do banco de dados
      const existingPosts = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
      
      if (existingPosts.length === 0) {
        return res.status(404).json({ message: 'Post não encontrado' });
      }
      
      // Verificar se o usuário já curtiu o post
      const existingLikes = await db.select()
        .from(postInteractions)
        .where(
          and(
            eq(postInteractions.userId, userId),
            eq(postInteractions.postId, postId),
            eq(postInteractions.type, 'like')
          )
        );
      
      const existingLike = existingLikes.length > 0 ? existingLikes[0] : null;
      const wasLiked = !!existingLike;
      
      // Adicionar ou remover like (comportamento de toggle)
      let isLiked;
      let likesCount = 0;
      
      // Obter a contagem atual de likes do post
      if (existingPosts.length > 0) {
        likesCount = existingPosts[0].likesCount || 0;
      }
      
      if (wasLiked) {
        // Se já tem like, remover
        try {
          await db.delete(postInteractions)
            .where(and(
              eq(postInteractions.userId, userId),
              eq(postInteractions.postId, postId),
              eq(postInteractions.type, 'like')
            ));
          
          // Decrementar contagem de likes no post
          if (existingPosts.length > 0) {
            const newCount = Math.max(0, likesCount - 1);
            await db.update(posts)
              .set({ likesCount: newCount })
              .where(eq(posts.id, postId));
            likesCount = newCount;
          }
          
          isLiked = false;
          console.log(`[LIKE] Like removido do post ${postId} pelo usuário ${userId}`);
        } catch (e) {
          console.error('Erro ao remover like do banco:', e);
        }
      } else {
        // Se não tem like, adicionar
        try {
          await db.insert(postInteractions).values({
            userId,
            postId,
            postType: 'post',
            type: 'like',
            content: null,
            createdAt: new Date()
          });
          
          // Incrementar contagem de likes no post
          if (existingPosts.length > 0) {
            const newCount = likesCount + 1;
            await db.update(posts)
              .set({ likesCount: newCount })
              .where(eq(posts.id, postId));
            likesCount = newCount;
          }
          
          isLiked = true;
          console.log(`[LIKE] Like adicionado ao post ${postId} pelo usuário ${userId}`);
        } catch (e) {
          console.error('Erro ao adicionar like ao banco:', e);
        }
      }
      
      // Já não precisamos mais atualizar no armazenamento em memória
      // Os dados já estão persistidos no PostgreSQL
      
      res.json({ 
        liked: isLiked, 
        likesCount,
        message: isLiked ? 'Post curtido com sucesso' : 'Curtida removida com sucesso' 
      });
    } catch (error) {
      console.error('Erro ao curtir post:', error);
      res.status(500).json({ message: 'Erro ao curtir post' });
    }
  });
  
  // Rota para descurtir um post
  app.delete('/api/posts/:id/like', async (req: Request, res: Response) => {
    try {
      // Verificar autenticação
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      // Obter o ID do usuário a partir da sessão
      const userId = (req.user as any).id;
      const postId = parseInt(req.params.id);
      
      console.log(`[DEBUG] DELETE /api/posts/${postId}/like pelo usuário ${userId}`);
      
      // Verificar se o post existe
      const existingPosts = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
      
      if (existingPosts.length === 0) {
        return res.status(404).json({ message: 'Post não encontrado' });
      }
      
      // Verificar se o usuário curtiu o post
      const existingLikes = await db.select()
        .from(postInteractions)
        .where(
          and(
            eq(postInteractions.userId, userId),
            eq(postInteractions.postId, postId),
            eq(postInteractions.type, 'like')
          )
        );
      
      if (existingLikes.length === 0) {
        return res.json({ 
          liked: false, 
          likesCount: existingPosts[0].likesCount || 0,
          message: 'Post não estava curtido pelo usuário' 
        });
      }
      
      // Remover a curtida
      await db.delete(postInteractions)
        .where(
          and(
            eq(postInteractions.userId, userId),
            eq(postInteractions.postId, postId),
            eq(postInteractions.type, 'like')
          )
        );
      
      // Atualizar contagem de likes no post
      const likesCount = existingPosts[0].likesCount || 0;
      const newCount = Math.max(0, likesCount - 1);
      
      await db.update(posts)
        .set({ likesCount: newCount })
        .where(eq(posts.id, postId));
      
      console.log(`[DEBUG] Curtida removida com sucesso do post ${postId}`);
      
      res.json({ 
        liked: false, 
        likesCount: newCount,
        message: 'Post descurtido com sucesso' 
      });
    } catch (error) {
      console.error('Erro ao remover curtida:', error);
      res.status(500).json({ message: 'Erro ao remover curtida' });
    }
  });
  
  // Rota para salvar/remover um post dos favoritos
  app.post('/api/posts/:id/save', async (req: Request, res: Response) => {
    try {
      // Verificar autenticação
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      // Obter o ID do usuário a partir da sessão
      const userId = (req.user as any).id;
      const postId = parseInt(req.params.id);
      const wantsToSave = req.body?.saved === true;
      
      console.log(`[DEBUG] POST /api/posts/${postId}/save - Usuário ${userId}, quer salvar: ${wantsToSave}`);
      
      // Verificar se o post existe
      const existingPost = await db.select()
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);
      
      if (existingPost.length === 0) {
        return res.status(404).json({ message: 'Post não encontrado' });
      }
      
      // Verificar se já existe um salvamento para este post/usuário
      const existingSaves = await db.select()
        .from(postInteractions)
        .where(
          and(
            eq(postInteractions.userId, userId),
            eq(postInteractions.postId, postId),
            eq(postInteractions.type, 'save')
          )
        );
        
      const existingSave = existingSaves.length > 0;
      
      // Se o status atual for diferente do desejado, atualizar
      if (existingSave !== wantsToSave) {
        if (existingSave) {
          // Remover salvamento existente
          await db.delete(postInteractions)
            .where(
              and(
                eq(postInteractions.userId, userId),
                eq(postInteractions.postId, postId),
                eq(postInteractions.type, 'save')
              )
            );
        } else {
          // Adicionar novo salvamento
          await db.insert(postInteractions)
            .values({
              userId,
              postId,
              postType: 'post',
              type: 'save',
              content: '',
              createdAt: new Date()
            });
        }
      }
      
      // O status após a operação
      const isSaved = wantsToSave;
      
      res.json({ 
        saved: isSaved, 
        message: isSaved ? 'Post salvo com sucesso' : 'Post removido dos salvos com sucesso' 
      });
    } catch (error) {
      console.error('Erro ao salvar post:', error);
      res.status(500).json({ message: 'Erro ao salvar post' });
    }
  });
  
  // Rota para remover um post dos salvos
  app.delete('/api/posts/:id/save', async (req: Request, res: Response) => {
    try {
      // Verificar autenticação
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      // Obter o ID do usuário a partir da sessão
      const userId = (req.user as any).id;
      const postId = parseInt(req.params.id);
      
      console.log(`[DEBUG] DELETE /api/posts/${postId}/save pelo usuário ${userId}`);
      
      // Verificar se o post existe
      const existingPost = await db.select()
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);
      
      if (existingPost.length === 0) {
        return res.status(404).json({ message: 'Post não encontrado' });
      }
      
      // Verificar se o post está salvo pelo usuário
      const existingSaves = await db.select()
        .from(postInteractions)
        .where(
          and(
            eq(postInteractions.userId, userId),
            eq(postInteractions.postId, postId),
            eq(postInteractions.type, 'save')
          )
        );
      
      if (existingSaves.length === 0) {
        return res.json({ 
          saved: false, 
          message: 'Post já não estava nos salvos' 
        });
      }
      
      // Remover dos salvos
      await db.delete(postInteractions)
        .where(
          and(
            eq(postInteractions.userId, userId),
            eq(postInteractions.postId, postId),
            eq(postInteractions.type, 'save')
          )
        );
      
      console.log(`[DEBUG] Post ${postId} removido dos salvos com sucesso`);
      
      res.json({ 
        saved: false, 
        message: 'Post removido dos salvos com sucesso' 
      });
    } catch (error) {
      console.error('Erro ao salvar post:', error);
      res.status(500).json({ message: 'Erro ao salvar post' });
    }
  });

  return httpServer;
}
