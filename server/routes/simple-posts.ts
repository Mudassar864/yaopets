import express, { Request, Response } from 'express';
import { db } from '../db';
import { desc, eq } from 'drizzle-orm';
import { posts, users, media } from '@shared/schema';

const router = express.Router();

// Rota para obter todos os posts formatados para exibição simples
router.get('/', async (req: Request, res: Response) => {
  try {
    // Usar a consulta do Drizzle para buscar posts com informações do usuário
    const allPosts = await db.select({
      id: posts.id,
      content: posts.content,
      mediaUrls: posts.mediaUrls,
      createdAt: posts.createdAt,
      likesCount: posts.likesCount,
      commentsCount: posts.commentsCount,
      userId: posts.userId,
      username: users.username,
      userImage: users.profileImage
    })
    .from(posts)
    .leftJoin(users, eq(posts.userId, users.id))
    .orderBy(desc(posts.createdAt))
    .limit(50);
    
    // Processar URLs de mídia para garantir que estejam acessíveis
    const processedPosts = await Promise.all(allPosts.map(async (post) => {
      // Extrair URLs de mídia
      let mediaUrls: string[] = [];
      try {
        if (post.mediaUrls) {
          if (typeof post.mediaUrls === 'string') {
            mediaUrls = JSON.parse(post.mediaUrls);
          } else if (Array.isArray(post.mediaUrls)) {
            mediaUrls = post.mediaUrls;
          }
        }
      } catch (error) {
        console.error(`Erro ao processar mediaUrls do post ${post.id}:`, error);
        mediaUrls = [];
      }

      return {
        ...post,
        processedMediaUrls: mediaUrls,
        // Garantir avatar de fallback se userImage não existir
        userImage: post.userImage || `https://i.pravatar.cc/150?img=${post.userId}`,
      };
    }));
    
    // Retornar dados formatados
    return res.status(200).json({
      success: true,
      data: processedPosts
    });
  } catch (error) {
    console.error('Erro ao buscar posts simplificados:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erro ao carregar posts',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;