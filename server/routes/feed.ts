import { Router, Request, Response } from 'express';
import { db } from '../db';
import { posts, users, media, postInteractions } from '@shared/schema';
import { eq, desc, and } from 'drizzle-orm';

const router = Router();

// Rota para feed simplificado que garante exibição correta de imagens
router.get('/', async (req: Request, res: Response) => {
  try {
    // Consulta posts públicos
    const allPosts = await db.query.posts.findMany({
      where: eq(posts.visibilityType, 'public'),
      orderBy: [desc(posts.createdAt)],
      limit: 20,
      with: {
        user: true
      }
    });
    
    // Processar posts para garantir URLs de imagens válidas
    const processedPosts = await Promise.all(allPosts.map(async (post) => {
      // Processamento das imagens para garantir URLs válidas
      const processedImages: string[] = [];
      
      // Primeiro, verifica mediaUrls
      if (post.mediaUrls) {
        try {
          const urls = typeof post.mediaUrls === 'string'
            ? JSON.parse(post.mediaUrls)
            : post.mediaUrls;
          
          if (Array.isArray(urls)) {
            processedImages.push(...urls);
          } else if (typeof urls === 'object') {
            processedImages.push(...Object.values(urls).filter(url => typeof url === 'string'));
          }
        } catch (error) {
          console.error(`Erro ao processar mediaUrls para post ${post.id}:`, error);
        }
      }
      
      // Converter URLs relativas para URLs absolutas de API
      const imagesWithCorrectPaths = processedImages.map(url => {
        if (typeof url === 'string') {
          if (url.startsWith('/uploads/')) {
            // Extrair o nome do arquivo da URL
            const filename = url.split('/').pop();
            if (filename) {
              return `/api/media/${filename}`;
            }
          }
          return url;
        }
        return '';
      }).filter(Boolean);
      
      // Verificar se o usuário atual curtiu este post
      let isLiked = false;
      
      if (req.user) {
        try {
          // Verificar se este post está na lista de curtidos pelo usuário
          const userId = (req.user as any).id;
          const userLikedPosts = await db.query.postInteractions.findMany({
            where: and(
              eq(postInteractions.userId, userId),
              eq(postInteractions.postId, post.id),
              eq(postInteractions.postType, 'post'),
              eq(postInteractions.type, 'like')
            )
          });
          
          isLiked = userLikedPosts.length > 0;
        } catch (error) {
          console.error(`Erro ao verificar curtidas para post ${post.id}:`, error);
        }
      }
      
      // Retornar post processado com imagens acessíveis e dados persistentes
      return {
        id: post.id,
        userId: post.userId,
        username: post.user?.username,
        userPhotoUrl: post.user?.profileImage,
        content: post.content,
        processedMediaUrls: imagesWithCorrectPaths,
        createdAt: post.createdAt,
        likesCount: post.likesCount || 0,
        commentsCount: post.commentsCount || 0,
        isStory: post.isStory,
        isLiked: isLiked,
        mediaUrls: post.mediaUrls // Incluir URLs originais como backup
      };
    }));
    
    // Retornar posts processados
    return res.status(200).json(processedPosts);
  } catch (error) {
    console.error('Erro ao buscar feed:', error);
    return res.status(500).json({ 
      error: 'Erro ao buscar publicações',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;