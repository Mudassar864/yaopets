/**
 * Rota dedicada para gerenciar interações (curtidas, comentários, salvos)
 * Centraliza todo o gerenciamento de interações dos usuários com os posts
 */
import express, { Request, Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { posts, postInteractions, users } from '../../shared/schema';

const router = express.Router();

// Obter todas as interações do usuário (curtidas, comentários, salvos)
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    const userId = (req.user as any).id;
    // Simplificando a implementação para resolver os problemas
    console.log(`[Interações] Buscando interações para usuário ${userId}`);
    
    // Buscar interações diretamente com filtro simples
    const interactions = await db.select()
      .from(postInteractions)
      .where(eq(postInteractions.userId, userId));

    console.log(`[Interações] Recuperadas ${interactions.length} interações para usuário ${userId}`);
    res.json(interactions);
  } catch (error) {
    console.error('Erro ao buscar interações:', error);
    res.status(500).json({ message: 'Erro ao buscar interações' });
  }
});

// Obter todas as curtidas do usuário
router.get('/likes', async (req: Request, res: Response) => {
  try {
    if (!req) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    const userId = (req.user as any).id;

    // Buscar todas as curtidas do usuário
    const likes = await db.select()
      .from(postInteractions)
      .where(
        and(
          eq(postInteractions.userId, userId),
          eq(postInteractions.type, 'like')
        )
      );

    res.json(likes);
  } catch (error) {
    console.error('Erro ao buscar curtidas:', error);
    res.status(500).json({ message: 'Erro ao buscar curtidas' });
  }
});

// Obter todos os comentários do usuário
router.get('/comments', async (req: Request, res: Response) => {
  try {
    if (!req) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    const userId = (req.user as any).id;

    // Buscar todos os comentários do usuário
    const comments = await db.select()
      .from(postInteractions)
      .where(
        and(
          eq(postInteractions.userId, userId),
          eq(postInteractions.type, 'comment')
        )
      );

    res.json(comments);
  } catch (error) {
    console.error('Erro ao buscar comentários:', error);
    res.status(500).json({ message: 'Erro ao buscar comentários' });
  }
});

// Obter todos os posts salvos pelo usuário
router.get('/saved', async (req: Request, res: Response) => {
  try {
    if (!req) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    const userId = (req.user as any).id;

    // Buscar todos os posts salvos pelo usuário
    const saved = await db.select()
      .from(postInteractions)
      .where(
        and(
          eq(postInteractions.userId, userId),
          eq(postInteractions.type, 'save')
        )
      );

    res.json(saved);
  } catch (error) {
    console.error('Erro ao buscar posts salvos:', error);
    res.status(500).json({ message: 'Erro ao buscar posts salvos' });
  }
});

// Adicionar uma nova interação (curtir, comentar, salvar)
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    const userId = (req.user as any).id;
    const { postId, postType, type, content } = req.body;

    if (!postId || !postType || !type) {
      return res.status(400).json({ message: 'Parâmetros inválidos' });
    }

    // Verificar se a interação já existe
    const existingInteraction = await db.select()
      .from(postInteractions)
      .where(
        and(
          eq(postInteractions.userId, userId),
          eq(postInteractions.postId, postId),
          eq(postInteractions.postType, postType),
          eq(postInteractions.type, type)
        )
      )
      .limit(1);

    // Se a interação já existe, retornar sem fazer nada (idempotent)
    if (existingInteraction.length > 0) {
      return res.status(200).json({
        message: 'Interação já existe',
        interactionId: existingInteraction[0].id
      });
    }

    // Adicionar a nova interação
    const newInteraction = await db.insert(postInteractions)
      .values({
        userId,
        postId,
        postType,
        type,
        content: content || null,
        createdAt: new Date()
      })
      .returning();

    // Atualizar a contagem de curtidas ou comentários no post, se aplicável
    if (type === 'like' || type === 'comment') {
      const post = await db.select()
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);

      if (post.length > 0) {
        if (type === 'like') {
          // Incrementar a contagem de curtidas
          const currentLikes = post[0].likesCount || 0;
          await db.update(posts)
            .set({ likesCount: currentLikes + 1 })
            .where(eq(posts.id, postId));
        } else if (type === 'comment') {
          // Incrementar a contagem de comentários
          const currentComments = post[0].commentsCount || 0;
          await db.update(posts)
            .set({ commentsCount: currentComments + 1 })
            .where(eq(posts.id, postId));
        }
      }
    }

    res.status(201).json({
      message: 'Interação adicionada com sucesso',
      interaction: newInteraction[0]
    });
  } catch (error) {
    console.error('Erro ao adicionar interação:', error);
    res.status(500).json({ message: 'Erro ao adicionar interação' });
  }
});

// Remover uma interação por ID
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!req) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    const userId = (req.user as any).id;
    const interactionId = parseInt(req.params.id, 10);

    if (isNaN(interactionId)) {
      return res.status(400).json({ message: 'ID de interação inválido' });
    }

    // Verificar se a interação existe e pertence ao usuário
    const interaction = await db.select()
      .from(postInteractions)
      .where(
        and(
          eq(postInteractions.id, interactionId),
          eq(postInteractions.userId, userId)
        )
      )
      .limit(1);

    if (interaction.length === 0) {
      return res.status(404).json({ message: 'Interação não encontrada' });
    }

    // Remover a interação
    await db.delete(postInteractions)
      .where(eq(postInteractions.id, interactionId));

    // Atualizar a contagem de curtidas ou comentários no post, se aplicável
    const { postId, type } = interaction[0];
    
    if (type === 'like' || type === 'comment') {
      const post = await db.select()
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);

      if (post.length > 0) {
        if (type === 'like') {
          // Decrementar a contagem de curtidas
          const currentLikes = post[0].likesCount || 0;
          await db.update(posts)
            .set({ likesCount: Math.max(0, currentLikes - 1) })
            .where(eq(posts.id, postId));
        } else if (type === 'comment') {
          // Decrementar a contagem de comentários
          const currentComments = post[0].commentsCount || 0;
          await db.update(posts)
            .set({ commentsCount: Math.max(0, currentComments - 1) })
            .where(eq(posts.id, postId));
        }
      }
    }

    res.json({ message: 'Interação removida com sucesso' });
  } catch (error) {
    console.error('Erro ao remover interação:', error);
    res.status(500).json({ message: 'Erro ao remover interação' });
  }
});

export default router;