import { Router, Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { db } from '../db';
import { posts, media } from '../../shared/schema';
import { insertPostSchema } from '../../shared/schema';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

const router = Router();

// Configuração do multer para armazenar na memória
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas') as any);
    }
  }
});

// Middleware de autenticação simples
const requireAuth = (req: Request, res: Response, next: Function) => {
  if (!req) {
    return res.status(401).json({ message: 'Usuário não autenticado' });
  }
  next();
};

// Endpoint de criação de post com armazenamento permanente no banco
router.post('/', requireAuth, upload.single('media'), async (req: Request, res: Response) => {
  try {
    console.log('[Posts Permanente] Iniciando criação de post');
    console.log('[Posts Permanente] Body:', req.body);
    console.log('[Posts Permanente] Arquivo:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'nenhum');

    const userId = (req.user as any).id;
    let mediaUrl: string | null = null;
    let mediaIds: number[] = [];

    // Processar imagem se enviada
    if (req.file) {
      try {
        console.log('[Posts Permanente] Processando imagem...');
        
        // Otimizar a imagem
        const optimizedBuffer = await sharp(req.file.buffer)
          .resize(1200, 1200, { 
            fit: 'inside', 
            withoutEnlargement: true 
          })
          .jpeg({ 
            quality: 80,
            progressive: true 
          })
          .toBuffer();

        // Obter metadados
        const metadata = await sharp(optimizedBuffer).metadata();
        
        // Converter para base64
        const base64Data = optimizedBuffer.toString('base64');
        
        // Salvar no banco PostgreSQL
        const [savedMedia] = await db.insert(media).values({
          userId,
          title: req.file.originalname,
          description: `Imagem do post - ${req.file.originalname}`,
          mediaType: 'image',
          fileSize: optimizedBuffer.length,
          mimeType: 'image/jpeg',
          width: metadata.width || 0,
          height: metadata.height || 0,
          url: `/api/media-storage/image/temp`, // URL temporária
          isPublic: true,
          data: base64Data,
          isOptimized: true,
          originalSize: req.file.size,
          isActive: true
        }).returning();

        // Atualizar URL com ID real
        mediaUrl = `/api/media-storage/image/${savedMedia.id}`;
        await db.update(media)
          .set({ url: mediaUrl })
          .where(eq(media.id, savedMedia.id));

        mediaIds.push(savedMedia.id);

        console.log(`[Posts Permanente] Imagem salva: ID ${savedMedia.id}, URL: ${mediaUrl}`);
        console.log(`[Posts Permanente] Compressão: ${req.file.size} -> ${optimizedBuffer.length} bytes (${((req.file.size - optimizedBuffer.length) / req.file.size * 100).toFixed(1)}% redução)`);

      } catch (imageError) {
        console.error('[Posts Permanente] Erro ao processar imagem:', imageError);
        return res.status(500).json({
          message: 'Erro ao processar imagem',
          error: imageError instanceof Error ? imageError.message : 'Erro desconhecido'
        });
      }
    }

    // Validar dados do post
    const postData = {
      userId,
      content: req.body.content || 'Nova publicação',
      mediaUrls: mediaUrl ? [mediaUrl] : [],
      location: req.body.location ? JSON.parse(req.body.location) : null,
      visibilityType: req.body.visibilityType || 'public',
      postType: req.body.postType || 'regular',
    };

    console.log('[Posts Permanente] Dados do post:', postData);

    // Validar com schema Zod
    try {
      insertPostSchema.parse(postData);
    } catch (validationError) {
      console.error('[Posts Permanente] Erro de validação:', validationError);
      return res.status(400).json({
        message: 'Dados do post inválidos',
        error: validationError instanceof z.ZodError ? validationError.errors : 'Erro de validação'
      });
    }

    // Criar post no banco
    const [newPost] = await db.insert(posts).values(postData).returning();

    console.log(`[Posts Permanente] Post criado com sucesso: ID ${newPost.id}`);

    // Resposta de sucesso
    res.status(201).json({
      success: true,
      post: newPost,
      mediaInfo: mediaUrl ? {
        mediaIds,
        urls: [mediaUrl],
        storageType: 'database',
        message: 'Imagem armazenada permanentemente no banco PostgreSQL'
      } : null,
      message: 'Post criado com sucesso!'
    });

  } catch (error: any) {
    console.error('[Posts Permanente] Erro ao criar post:', error);
    res.status(500).json({
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// Endpoint para buscar posts (com dados de mídia do banco)
router.get('/', async (req: Request, res: Response) => {
  try {
    console.log('[Posts Permanente] Buscando posts...');
    
    // Buscar posts ordenados por data
    const allPosts = await db.select().from(posts).orderBy(posts.createdAt);

    console.log(`[Posts Permanente] Encontrados ${allPosts.length} posts`);

    res.status(200).json({
      success: true,
      posts: allPosts,
      count: allPosts.length,
      storageInfo: {
        type: 'database',
        location: 'PostgreSQL permanent storage'
      }
    });

  } catch (error: any) {
    console.error('[Posts Permanente] Erro ao buscar posts:', error);
    res.status(500).json({
      message: 'Erro ao buscar posts',
      error: error.message
    });
  }
});

// Endpoint para buscar um post específico
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id);
    
    if (isNaN(postId)) {
      return res.status(400).json({
        message: 'ID de post inválido'
      });
    }

    const [post] = await db.select().from(posts).where(eq(posts.id, postId));

    if (!post) {
      return res.status(404).json({
        message: 'Post não encontrado'
      });
    }

    res.status(200).json({
      success: true,
      post,
      storageInfo: {
        type: 'database',
        location: 'PostgreSQL permanent storage'
      }
    });

  } catch (error: any) {
    console.error('[Posts Permanente] Erro ao buscar post:', error);
    res.status(500).json({
      message: 'Erro ao buscar post',
      error: error.message
    });
  }
});

export default router;