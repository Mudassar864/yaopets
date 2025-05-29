import { Router, Request, Response } from 'express';
import { db } from '../db';
import { storage } from '../storage';
import { users, posts, postInteractions } from '../../shared/schema';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

// Configuração para upload de arquivos
const storage_config = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = './uploads';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage_config,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB em bytes
  },
});

const router = Router();

// Listar posts com paginação e filtragem
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const offset = (page - 1) * limit;
    
    // Identificar usuário autenticado (se houver)
    let userId = null;
    if (req.user) {
      userId = (req.user as any).id;
      console.log(`Usuário autenticado: ${userId}`);
    }
    
    // Buscar todos os posts, ordenados por data (mais recente primeiro)
    let allPosts = await db.select()
      .from(posts)
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);
    
    // Enriquecer com informações de interações do usuário atual e dados de autor
    const enhancedPosts = await Promise.all(allPosts.map(async (post) => {
      // Verificar interações do usuário atual com este post
      let isLiked = false;
      let isSaved = false;
      
      if (userId) {
        // Verificar se o usuário atual curtiu o post
        const likeCheck = await db.select()
          .from(postInteractions)
          .where(
            and(
              eq(postInteractions.userId, userId),
              eq(postInteractions.postId, post.id),
              eq(postInteractions.postType, 'post'),
              eq(postInteractions.type, 'like')
            )
          )
          .limit(1);
        
        isLiked = likeCheck.length > 0;
        
        // Verificar se o usuário atual salvou o post
        const saveCheck = await db.select()
          .from(postInteractions)
          .where(
            and(
              eq(postInteractions.userId, userId),
              eq(postInteractions.postId, post.id),
              eq(postInteractions.postType, 'post'),
              eq(postInteractions.type, 'save')
            )
          )
          .limit(1);
        
        isSaved = saveCheck.length > 0;
      }
      
      // Obter contagem de curtidas
      const likesCountResult = await db.select({
        count: sql`count(*)`
      })
      .from(postInteractions)
      .where(
        and(
          eq(postInteractions.postId, post.id),
          eq(postInteractions.postType, 'post'),
          eq(postInteractions.type, 'like')
        )
      );
      
      const likesCount = Number(likesCountResult[0]?.count || 0);
      
      // Obter contagem de comentários
      const commentsCountResult = await db.select({
        count: sql`count(*)`
      })
      .from(postInteractions)
      .where(
        and(
          eq(postInteractions.postId, post.id),
          eq(postInteractions.postType, 'post'),
          eq(postInteractions.type, 'comment')
        )
      );
      
      const commentsCount = Number(commentsCountResult[0]?.count || 0);
      
      // Extrair URLs de mídia (imagens)
      let mediaUrls = [];
      try {
        if (post.mediaUrls) {
          mediaUrls = typeof post.mediaUrls === 'string' 
            ? JSON.parse(post.mediaUrls) 
            : post.mediaUrls;
        }
      } catch (e) {
        console.error(`Erro ao processar mediaUrls do post ${post.id}:`, e);
        mediaUrls = [];
      }
      
      // Garantir que todas as URLs são absolutas e acessíveis
      mediaUrls = mediaUrls.map((url: string) => {
        if (url.startsWith('http')) {
          return url;
        } else if (url.startsWith('/')) {
          return `${req.protocol}://${req.get('host')}${url}`;
        } else {
          return `${req.protocol}://${req.get('host')}/${url}`;
        }
      });
      
      // Buscar o autor do post
      const authorResult = await db.select()
        .from(users)
        .where(eq(users.id, post.userId))
        .limit(1);
      
      const author = authorResult.length > 0 ? authorResult[0] : null;
      
      return {
        ...post,
        mediaUrls,
        likesCount, 
        commentsCount,
        isLiked,
        isSaved,
        author: author ? {
          id: author.id,
          username: author.username || 'usuario',
          name: author.name || author.username || 'Usuário',
          profileImage: author.profileImage || `https://i.pravatar.cc/150?img=${author.id % 70}`
        } : null
      };
    }));
    
    res.json(enhancedPosts);
  } catch (error) {
    console.error('Erro ao listar posts:', error);
    res.status(500).json({ message: 'Erro ao listar posts' });
  }
});

// Detalhar um post específico
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const postId = Number(req.params.id);
    
    // Identificar usuário autenticado (se houver)
    let userId = null;
    if (req.user) {
      userId = (req.user as any).id;
    }
    
    // Buscar o post pelo ID
    const postResult = await db.select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);
    
    if (postResult.length === 0) {
      return res.status(404).json({ message: 'Post não encontrado' });
    }
    
    const post = postResult[0];
    
    // Verificar interações do usuário atual com este post
    let isLiked = false;
    let isSaved = false;
    
    if (userId) {
      // Verificar se o usuário atual curtiu o post
      const likeCheck = await db.select()
        .from(postInteractions)
        .where(
          and(
            eq(postInteractions.userId, userId),
            eq(postInteractions.postId, postId),
            eq(postInteractions.postType, 'post'),
            eq(postInteractions.type, 'like')
          )
        )
        .limit(1);
      
      isLiked = likeCheck.length > 0;
      
      // Verificar se o usuário atual salvou o post
      const saveCheck = await db.select()
        .from(postInteractions)
        .where(
          and(
            eq(postInteractions.userId, userId),
            eq(postInteractions.postId, postId),
            eq(postInteractions.postType, 'post'),
            eq(postInteractions.type, 'save')
          )
        )
        .limit(1);
      
      isSaved = saveCheck.length > 0;
    }
    
    // Obter contagem de curtidas
    const likesCountResult = await db.select({
      count: sql`count(*)`
    })
    .from(postInteractions)
    .where(
      and(
        eq(postInteractions.postId, postId),
        eq(postInteractions.postType, 'post'),
        eq(postInteractions.type, 'like')
      )
    );
    
    const likesCount = Number(likesCountResult[0]?.count || 0);
    
    // Obter contagem de comentários
    const commentsCountResult = await db.select({
      count: sql`count(*)`
    })
    .from(postInteractions)
    .where(
      and(
        eq(postInteractions.postId, postId),
        eq(postInteractions.postType, 'post'),
        eq(postInteractions.type, 'comment')
      )
    );
    
    const commentsCount = Number(commentsCountResult[0]?.count || 0);
    
    // Extrair URLs de mídia (imagens)
    let mediaUrls = [];
    try {
      if (post.mediaUrls) {
        mediaUrls = typeof post.mediaUrls === 'string' 
          ? JSON.parse(post.mediaUrls) 
          : post.mediaUrls;
      }
    } catch (e) {
      console.error(`Erro ao processar mediaUrls do post ${post.id}:`, e);
      mediaUrls = [];
    }
    
    // Garantir que todas as URLs são absolutas e acessíveis
    mediaUrls = mediaUrls.map((url: string) => {
      if (url.startsWith('http')) {
        return url;
      } else if (url.startsWith('/')) {
        return `${req.protocol}://${req.get('host')}${url}`;
      } else {
        return `${req.protocol}://${req.get('host')}/${url}`;
      }
    });
    
    // Buscar o autor do post
    const authorResult = await db.select()
      .from(users)
      .where(eq(users.id, post.userId))
      .limit(1);
    
    const author = authorResult.length > 0 ? authorResult[0] : null;
    
    // Resposta com o post enriquecido
    res.json({
      ...post,
      mediaUrls,
      likesCount,
      commentsCount,
      isLiked,
      isSaved,
      author: author ? {
        id: author.id,
        username: author.username || 'usuario',
        name: author.name || author.username || 'Usuário',
        profileImage: author.profileImage || `https://i.pravatar.cc/150?img=${author.id % 70}`
      } : null
    });
  } catch (error) {
    console.error('Erro ao buscar post:', error);
    res.status(500).json({ message: 'Erro ao buscar post' });
  }
});

// Curtir/descurtir um post
router.post('/:id/like', async (req: Request, res: Response) => {
  try {
    // Verificar autenticação
    if (!req) {
      return res.status(401).json({ message: 'Não autenticado' });
    }
    
    const userId = (req.user as any).id;
    const postId = Number(req.params.id);
    
    // Verificar se o post existe
    const postCheck = await db.select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);
    
    if (postCheck.length === 0) {
      return res.status(404).json({ message: 'Post não encontrado' });
    }
    
    // Verificar se já existe uma curtida deste usuário para este post
    const existingLike = await db.select()
      .from(postInteractions)
      .where(
        and(
          eq(postInteractions.userId, userId),
          eq(postInteractions.postId, postId),
          eq(postInteractions.postType, 'post'),
          eq(postInteractions.type, 'like')
        )
      )
      .limit(1);
    
    // Toggle: Se já existir, remove. Se não existir, adiciona.
    if (existingLike.length > 0) {
      // Remover curtida existente
      await db.delete(postInteractions)
        .where(
          and(
            eq(postInteractions.userId, userId),
            eq(postInteractions.postId, postId),
            eq(postInteractions.postType, 'post'),
            eq(postInteractions.type, 'like')
          )
        );
    } else {
      // Adicionar nova curtida
      await db.insert(postInteractions)
        .values({
          userId,
          postId,
          postType: 'post',
          type: 'like',
          content: '',
          createdAt: new Date()
        });
    }
    
    // Obter contagem atualizada de curtidas
    const likeCountResult = await db.select({
      count: sql`count(*)`
    })
    .from(postInteractions)
    .where(
      and(
        eq(postInteractions.postId, postId),
        eq(postInteractions.postType, 'post'),
        eq(postInteractions.type, 'like')
      )
    );
    
    // Atualizar contador no post
    await db.update(posts)
      .set({ likesCount: Number(likeCountResult[0]?.count || 0) })
      .where(eq(posts.id, postId));
      
    // Verificar o novo estado após o toggle
    const userLikeCheck = await db.select()
      .from(postInteractions)
      .where(
        and(
          eq(postInteractions.userId, userId),
          eq(postInteractions.postId, postId),
          eq(postInteractions.postType, 'post'),
          eq(postInteractions.type, 'like')
        )
      )
      .limit(1);
      
    const isLiked = userLikeCheck.length > 0;
    
    // Obter a contagem atualizada de likes
    const updatedLikesCountResult = await db.select({
      count: sql`count(*)`
    })
    .from(postInteractions)
    .where(
      and(
        eq(postInteractions.postType, 'post'),
        eq(postInteractions.postId, postId),
        eq(postInteractions.type, 'like')
      )
    );
    
    const updatedLikesCount = Number(updatedLikesCountResult[0]?.count || 0);
    
    // Resposta baseada no estado atual
    return res.json({ 
      liked: isLiked, 
      likesCount: updatedLikesCount,
      message: isLiked ? 'Post curtido com sucesso' : 'Curtida removida com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao curtir post:', error);
    res.status(500).json({ message: 'Erro ao curtir post' });
  }
});

// Listar todos os posts curtidos pelo usuário
router.get('/liked', async (req: Request, res: Response) => {
  try {
    // Verificar autenticação
    if (!req) {
      return res.status(401).json({ message: 'Não autenticado' });
    }
    
    const userId = (req.user as any).id;
    
    // Buscar IDs de posts curtidos do banco de dados PostgreSQL
    const likedInteractions = await db.select({
      postId: postInteractions.postId
    })
    .from(postInteractions)
    .where(
      and(
        eq(postInteractions.userId, userId),
        eq(postInteractions.type, 'like'),
        eq(postInteractions.postType, 'post')
      )
    );
    
    // Extrair apenas os IDs dos posts
    const likedPostIds = likedInteractions.map(interaction => interaction.postId);
    console.log(`[GetLikedPosts] Usuário ${userId} tem ${likedPostIds.length} posts curtidos`);
    
    if (likedPostIds.length === 0) {
      return res.json([]);
    }
    
    // Buscar os posts completos no banco de dados
    let likedPosts = await db.select()
      .from(posts)
      .where(inArray(posts.id, likedPostIds))
      .orderBy(desc(posts.createdAt));
    
    // Retorna a lista de posts curtidos com informações de curtidas e salvamentos
    const enhancedPosts = await Promise.all(likedPosts.map(async (post) => {
      // Verificar se o usuário atual curtiu o post (sempre true neste caso)
      const isLiked = true; // Já sabemos que todos os posts foram curtidos
      
      // Verificar se o usuário atual salvou o post
      const savedCheck = await db.select()
        .from(postInteractions)
        .where(
          and(
            eq(postInteractions.userId, userId),
            eq(postInteractions.postId, post.id),
            eq(postInteractions.postType, 'post'),
            eq(postInteractions.type, 'save')
          )
        )
        .limit(1);
      
      const isSaved = savedCheck.length > 0;
      
      // Obter contagem de curtidas
      const likesCountResult = await db.select({
        count: sql`count(*)`
      })
      .from(postInteractions)
      .where(
        and(
          eq(postInteractions.postId, post.id),
          eq(postInteractions.postType, 'post'),
          eq(postInteractions.type, 'like')
        )
      );
      
      const likesCount = Number(likesCountResult[0]?.count || 0);
      
      // Obter contagem de comentários
      const commentsCountResult = await db.select({
        count: sql`count(*)`
      })
      .from(postInteractions)
      .where(
        and(
          eq(postInteractions.postId, post.id),
          eq(postInteractions.postType, 'post'),
          eq(postInteractions.type, 'comment')
        )
      );
      
      const commentsCount = Number(commentsCountResult[0]?.count || 0);
      
      // Extrair URLs de mídia (imagens)
      let mediaUrls = [];
      try {
        if (post.mediaUrls) {
          mediaUrls = typeof post.mediaUrls === 'string' 
            ? JSON.parse(post.mediaUrls) 
            : post.mediaUrls;
        }
      } catch (e) {
        console.error(`Erro ao processar mediaUrls do post ${post.id}:`, e);
        mediaUrls = [];
      }
      
      // Garantir que todas as URLs são absolutas e acessíveis
      mediaUrls = mediaUrls.map((url: string) => {
        if (url.startsWith('http')) {
          return url;
        } else if (url.startsWith('/')) {
          return `${req.protocol}://${req.get('host')}${url}`;
        } else {
          return `${req.protocol}://${req.get('host')}/${url}`;
        }
      });
      
      // Buscar o autor do post
      const authorResult = await db.select()
        .from(users)
        .where(eq(users.id, post.userId))
        .limit(1);
      
      const author = authorResult.length > 0 ? authorResult[0] : null;
      
      return {
        ...post,
        mediaUrls,
        likesCount, 
        commentsCount,
        isLiked,
        isSaved,
        author: author ? {
          id: author.id,
          username: author.username || 'usuario',
          name: author.name || author.username || 'Usuário',
          profileImage: author.profileImage || `https://i.pravatar.cc/150?img=${author.id % 70}`
        } : null
      };
    }));
    
    res.json(enhancedPosts);
  } catch (error) {
    console.error('Erro ao listar posts curtidos:', error);
    res.status(500).json({ message: 'Erro ao listar posts curtidos' });
  }
});

// Listar todos os posts salvos pelo usuário
router.get('/saved', async (req: Request, res: Response) => {
  try {
    // Verificar autenticação
    if (!req) {
      return res.status(401).json({ message: 'Não autenticado' });
    }
    
    const userId = (req.user as any).id;
    
    // Buscar IDs de posts salvos do banco de dados PostgreSQL
    const savedInteractions = await db.select({
      postId: postInteractions.postId
    })
    .from(postInteractions)
    .where(
      and(
        eq(postInteractions.userId, userId),
        eq(postInteractions.type, 'save'),
        eq(postInteractions.postType, 'post')
      )
    );
    
    // Extrair apenas os IDs dos posts
    const savedPostIds = savedInteractions.map(interaction => interaction.postId);
    console.log(`[GetSavedPosts] Usuário ${userId} tem ${savedPostIds.length} posts salvos`);
    
    if (savedPostIds.length === 0) {
      return res.json([]);
    }
    
    // Buscar os posts completos no banco de dados
    let savedPosts = await db.select()
      .from(posts)
      .where(inArray(posts.id, savedPostIds))
      .orderBy(desc(posts.createdAt));
    
    // Retorna a lista de posts salvos com informações de curtidas e salvamentos
    const enhancedPosts = await Promise.all(savedPosts.map(async (post) => {
      // Verificar se o usuário atual curtiu o post
      const likeCheck = await db.select()
        .from(postInteractions)
        .where(
          and(
            eq(postInteractions.userId, userId),
            eq(postInteractions.postId, post.id),
            eq(postInteractions.postType, 'post'),
            eq(postInteractions.type, 'like')
          )
        )
        .limit(1);
      
      const isLiked = likeCheck.length > 0;
      
      // Verificar se o usuário atual salvou o post (sempre true neste caso)
      const isSaved = true; // Já sabemos que todos os posts foram salvos
      
      // Obter contagem de curtidas
      const likesCountResult = await db.select({
        count: sql`count(*)`
      })
      .from(postInteractions)
      .where(
        and(
          eq(postInteractions.postId, post.id),
          eq(postInteractions.postType, 'post'),
          eq(postInteractions.type, 'like')
        )
      );
      
      const likesCount = Number(likesCountResult[0]?.count || 0);
      
      // Obter contagem de comentários
      const commentsCountResult = await db.select({
        count: sql`count(*)`
      })
      .from(postInteractions)
      .where(
        and(
          eq(postInteractions.postId, post.id),
          eq(postInteractions.postType, 'post'),
          eq(postInteractions.type, 'comment')
        )
      );
      
      const commentsCount = Number(commentsCountResult[0]?.count || 0);
      
      // Extrair URLs de mídia (imagens)
      let mediaUrls = [];
      try {
        if (post.mediaUrls) {
          mediaUrls = typeof post.mediaUrls === 'string' 
            ? JSON.parse(post.mediaUrls) 
            : post.mediaUrls;
        }
      } catch (e) {
        console.error(`Erro ao processar mediaUrls do post ${post.id}:`, e);
        mediaUrls = [];
      }
      
      // Garantir que todas as URLs são absolutas e acessíveis
      mediaUrls = mediaUrls.map((url: string) => {
        if (url.startsWith('http')) {
          return url;
        } else if (url.startsWith('/')) {
          return `${req.protocol}://${req.get('host')}${url}`;
        } else {
          return `${req.protocol}://${req.get('host')}/${url}`;
        }
      });
      
      // Buscar o autor do post
      const authorResult = await db.select()
        .from(users)
        .where(eq(users.id, post.userId))
        .limit(1);
      
      const author = authorResult.length > 0 ? authorResult[0] : null;
      
      return {
        ...post,
        mediaUrls,
        likesCount, 
        commentsCount,
        isLiked,
        isSaved,
        author: author ? {
          id: author.id,
          username: author.username || 'usuario',
          name: author.name || author.username || 'Usuário',
          profileImage: author.profileImage || `https://i.pravatar.cc/150?img=${author.id % 70}`
        } : null
      };
    }));
    
    res.json(enhancedPosts);
  } catch (error) {
    console.error('Erro ao listar posts salvos:', error);
    res.status(500).json({ message: 'Erro ao listar posts salvos' });
  }
});

// Salvar/remover um post dos favoritos
router.post('/:id/save', async (req: Request, res: Response) => {
  try {
    // Verificar autenticação
    if (!req) {
      return res.status(401).json({ message: 'Não autenticado' });
    }
    
    const userId = (req.user as any).id;
    const postId = Number(req.params.id);
    
    // Verificar se o post existe
    const postCheck = await db.select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);
    
    if (postCheck.length === 0) {
      return res.status(404).json({ message: 'Post não encontrado' });
    }
    
    // Verificar se já existe um salvamento deste usuário para este post
    const existingSave = await db.select()
      .from(postInteractions)
      .where(
        and(
          eq(postInteractions.userId, userId),
          eq(postInteractions.postId, postId),
          eq(postInteractions.postType, 'post'),
          eq(postInteractions.type, 'save')
        )
      )
      .limit(1);
    
    // Toggle: Se já existir, remove. Se não existir, adiciona.
    if (existingSave.length > 0) {
      // Remover salvamento existente
      await db.delete(postInteractions)
        .where(
          and(
            eq(postInteractions.userId, userId),
            eq(postInteractions.postId, postId),
            eq(postInteractions.postType, 'post'),
            eq(postInteractions.type, 'save')
          )
        );
        
      return res.json({ 
        saved: false, 
        message: 'Post removido dos salvos com sucesso' 
      });
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
        
      return res.json({ 
        saved: true, 
        message: 'Post salvo com sucesso' 
      });
    }
  } catch (error) {
    console.error('Erro ao salvar post:', error);
    res.status(500).json({ message: 'Erro ao salvar post' });
  }
});

export default router;