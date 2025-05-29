import { Router, Request, Response } from 'express';
import { db } from '../db';
import { posts, media, users } from '@shared/schema';
import { desc, eq } from 'drizzle-orm';

const router = Router();

// Endpoint para carregar posts com imagens otimizadas para exibição
router.get('/', async (req: Request, res: Response) => {
  try {
    // Buscar posts ordenados pelo mais recente
    const allPosts = await db.query.posts.findMany({
      orderBy: [desc(posts.createdAt)],
      limit: 20,
      where: eq(posts.visibilityType, 'public')
    });
    
    // Lista para armazenar os posts processados
    const processedPosts = [];
    
    // Processar cada post para garantir que as imagens sejam carregadas corretamente
    for (const post of allPosts) {
      // Clone o post para modificação
      const processedPost = { ...post };
      
      // Processar fotos para garantir que sejam URLs válidas
      if (post.photos) {
        let photoUrls = [];
        try {
          // Se photos for uma string, tente converter para objeto
          if (typeof post.photos === 'string') {
            photoUrls = JSON.parse(post.photos);
          } else if (Array.isArray(post.photos)) {
            photoUrls = post.photos;
          } else if (typeof post.photos === 'object') {
            photoUrls = Object.values(post.photos);
          }
          
          // Para cada URL de foto, verifique se precisa ser convertida para uma rota de API
          const processedPhotos = await Promise.all(photoUrls.map(async (url) => {
            if (typeof url === 'string') {
              // Se a URL não começa com http e não é uma rota de API, tente encontrar a imagem no banco
              if (!url.startsWith('http') && !url.startsWith('/api/')) {
                // Extrair o nome do arquivo da URL
                const filename = url.split('/').pop();
                if (filename) {
                  // Verificar se existe no banco de dados
                  const mediaItem = await db.query.media.findFirst({
                    where: eq(media.filename, filename)
                  });
                  
                  if (mediaItem && mediaItem.id) {
                    return `/api/media-db/${mediaItem.id}`;
                  }
                }
              }
              return url;
            }
            return '';
          }));
          
          // Atualizar as fotos do post processado
          processedPost.photos = processedPhotos.filter(url => url);
        } catch (error) {
          console.error(`Erro ao processar fotos do post ${post.id}:`, error);
          processedPost.photos = [];
        }
      }
      
      processedPosts.push(processedPost);
    }
    
    return res.status(200).json(processedPosts);
  } catch (error) {
    console.error('Erro ao buscar posts simplificados:', error);
    return res.status(500).json({ 
      error: 'Erro ao carregar posts',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;