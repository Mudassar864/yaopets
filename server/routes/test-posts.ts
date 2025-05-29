import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import { db } from '../db';
import { posts, users } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// Configuração do multer para uso em memória (sem gravação em disco)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Middleware de autenticação que sempre funciona no modo de teste
const testModeAuth = (req: Request, res: Response, next: Function) => {
  // Sempre permitir no modo de teste
  if (!req) {
    console.log("[TEST MODE] Autenticação simulada ativada");
    // Usar ID 18 como padrão para testes
    req.user = { id: 18 };
  }
  next();
};

// Rota para criar postagem em modo de teste
router.post('/', testModeAuth, upload.single('media'), async (req: Request, res: Response) => {
  try {
    console.log("[TEST MODE] Requisição para criar post recebida");
    console.log("[TEST MODE] Body:", req.body);
    console.log("[TEST MODE] Arquivo:", req.file);
    console.log("[TEST MODE] Usuário:", req.user);
    
    const userId = (req.user as any).id;
    console.log("[TEST MODE] ID do usuário:", userId);
    
    // Verificar se o usuário existe
    const userExists = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
      
    if (userExists.length === 0) {
      return res.status(400).json({ 
        message: 'Usuário não encontrado',
        testMode: true,
        userId
      });
    }
    
    // Gerar um URL de mídia simulada para teste
    const simulatedMediaUrl = `https://yaopets-media-demo/${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`;
    
    // Criar a postagem no banco de dados com valores padrão
    const [newPost] = await db.insert(posts).values({
      userId,
      content: req.body.content || "Nova publicação de teste",
      mediaUrls: JSON.stringify([simulatedMediaUrl]),
      location: req.body.location ? req.body.location : null,
      visibilityType: req.body.visibilityType || 'public',
      isStory: req.body.isStory === 'true' || false,
      postType: req.body.postType || 'regular',
      likesCount: 0,
      commentsCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    console.log("[TEST MODE] Post criado com sucesso:", newPost);
    
    res.status(201).json({
      ...newPost,
      testMode: true,
      success: true
    });
  } catch (error) {
    console.error('[TEST MODE] Erro ao criar post:', error);
    res.status(500).json({ 
      message: 'Erro ao criar postagem em modo de teste', 
      error: String(error),
      testMode: true,
      success: false
    });
  }
});

// Rota para listar posts em modo de teste
router.get('/', async (req: Request, res: Response) => {
  try {
    console.log("[TEST MODE] Buscando posts");
    
    // Buscar apenas posts públicos
    const postsData = await db.select({
      post: posts,
      user: {
        id: users.id,
        username: users.username,
        name: users.name,
        profileImage: users.profileImage,
        level: users.level
      }
    })
    .from(posts)
    .innerJoin(users, eq(posts.userId, users.id))
    .orderBy(desc(posts.createdAt))
    .limit(20);
    
    // Formatar para o frontend
    const formattedPosts = postsData.map(item => {
      // Processamento das imagens
      let mediaUrls: string[] = [];
      
      if (item.post.mediaUrls) {
        try {
          if (typeof item.post.mediaUrls === 'string') {
            mediaUrls = JSON.parse(item.post.mediaUrls);
          } else if (Array.isArray(item.post.mediaUrls)) {
            mediaUrls = item.post.mediaUrls as string[];
          }
        } catch (e) {
          console.error(`[TEST MODE] Erro ao processar mediaUrls do post ${item.post.id}:`, e);
          mediaUrls = [];
        }
      }
      
      return {
        id: item.post.id,
        userId: item.post.userId,
        username: item.user.username,
        userPhotoUrl: item.user.profileImage || `https://i.pravatar.cc/150?img=${item.user.id}`,
        content: item.post.content,
        processedMediaUrls: mediaUrls,
        mediaUrls: item.post.mediaUrls,
        location: item.post.location,
        likes: item.post.likesCount,
        comments: item.post.commentsCount,
        createdAt: item.post.createdAt,
        isStory: item.post.isStory,
        visibilityType: item.post.visibilityType,
        testMode: true
      };
    });
    
    res.json({
      data: formattedPosts,
      testMode: true,
      success: true
    });
  } catch (error) {
    console.error('[TEST MODE] Erro ao listar posts:', error);
    res.status(500).json({ 
      message: 'Erro ao buscar posts em modo de teste',
      error: String(error),
      testMode: true,
      success: false
    });
  }
});

export default router;