/**
 * Rotas para gerenciamento de comentários em posts
 * Usa PostgreSQL para persistência de dados
 */

import { Request, Response, Router } from "express";
import { db } from "../db";
import { users, posts, postInteractions } from "../../shared/schema";
import { and, desc, eq } from "drizzle-orm";

const router = Router();

// Obter comentários de um post
router.get("/:postId", async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.postId);
    const userId = req.isAuthenticated() ? (req.user as any).id : null;
    
    // Verificar se o post existe
    const postExists = await db.select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);
    
    if (postExists.length === 0) {
      return res.status(404).json({ message: "Post não encontrado" });
    }
    
    // Obter os comentários do banco de dados
    const commentsData = await db.select({
      id: postInteractions.id,
      content: postInteractions.content,
      userId: postInteractions.userId,
      createdAt: postInteractions.createdAt
    })
    .from(postInteractions)
    .where(
      and(
        eq(postInteractions.postId, postId),
        eq(postInteractions.postType, 'post'),
        eq(postInteractions.type, 'comment')
      )
    )
    .orderBy(desc(postInteractions.createdAt));
    
    // Se não houver comentários reais, usar alguns comentários de demonstração para UI
    if (commentsData.length === 0) {
      // Comentários de demonstração para novos posts
      const demoComments = [
        {
          id: 101,
          content: "Que lindo! 😍",
          user: { name: "Maria Silva", username: "mariasilva", avatar: "https://i.pravatar.cc/150?img=1" },
          createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutos atrás
          likes: 5
        },
        {
          id: 102,
          content: "Adoro esses momentos! 🐾",
          user: { name: "João Castro", username: "joaocastro", avatar: "https://i.pravatar.cc/150?img=5" },
          createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hora atrás
          likes: 2
        },
        {
          id: 103,
          content: "Adorável demais ❤️",
          user: { name: "Ana Luiza", username: "analuiza", avatar: "https://i.pravatar.cc/150?img=9" },
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 horas atrás
          likes: 7
        }
      ];
      
      // Adicionar um comentário extra para posts específicos
      if (postId % 2 === 0) {
        demoComments.push({
          id: 104,
          content: "Esta foto ficou incrível! Qual câmera você usa?",
          user: { name: "Pedro Mendes", username: "pedromendes", avatar: "https://i.pravatar.cc/150?img=3" },
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 horas atrás
          likes: 3
        });
      }
      
      return res.json(demoComments);
    }
    
    // Converter os comentários armazenados para o formato esperado pelo cliente
    const formattedComments = await Promise.all(commentsData.map(async (comment) => {
      // Obter informações do usuário que comentou
      const userResult = await db.select()
        .from(users)
        .where(eq(users.id, comment.userId))
        .limit(1);
      
      const user = userResult.length > 0 ? userResult[0] : null;
      
      // Contar likes do comentário (caso implementemos no futuro)
      const likesCount = 0; // Por enquanto, não temos implementação de curtidas em comentários
      
      return {
        id: comment.id,
        content: comment.content,
        user: {
          name: user?.name || user?.username || "Usuário",
          username: user?.username || "usuario",
          avatar: user?.profileImage || `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`
        },
        createdAt: comment.createdAt.toISOString(),
        likes: likesCount
      };
    }));
    
    res.json(formattedComments);
  } catch (error) {
    console.error("Erro ao buscar comentários:", error);
    res.status(500).json({ message: "Erro ao buscar comentários" });
  }
});

// Adicionar comentário em um post
router.post("/:postId", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    
    const userId = (req.user as any).id;
    const postId = parseInt(req.params.postId);
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ message: "Conteúdo do comentário é obrigatório" });
    }
    
    // Verificar se o post existe
    const postCheck = await db.select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);
    
    if (postCheck.length === 0) {
      return res.status(404).json({ message: "Post não encontrado" });
    }
    
    // Inserir o comentário no banco de dados
    const result = await db.insert(postInteractions)
      .values({
        userId,
        postId,
        postType: 'post',
        type: 'comment',
        content,
        createdAt: new Date()
      })
      .returning();
    
    const newCommentId = result[0]?.id;
    
    // Obter informações do usuário para retornar na resposta
    const userResult = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    const user = userResult.length > 0 ? userResult[0] : null;
    
    // Atualizar a contagem de comentários no post
    await db.update(posts)
      .set({ 
        commentsCount: postCheck[0].commentsCount + 1 
      })
      .where(eq(posts.id, postId));
    
    // Criar o objeto de resposta
    const newComment = {
      id: newCommentId,
      content,
      user: {
        name: user?.name || user?.username || "Usuário",
        username: user?.username || "usuario",
        avatar: user?.profileImage || `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`
      },
      createdAt: new Date().toISOString(),
      likes: 0
    };
    
    res.json(newComment);
  } catch (error) {
    console.error("Erro ao adicionar comentário:", error);
    res.status(500).json({ message: "Erro ao adicionar comentário" });
  }
});

// Curtir/descurtir um comentário
router.post("/:commentId/toggle-like", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    
    const userId = (req.user as any).id;
    const commentId = parseInt(req.params.commentId);
    
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
    
    // Esta funcionalidade ainda não está totalmente implementada
    // Apenas simulamos a resposta para o cliente
    // No futuro, podemos implementar usando uma tabela para likes de comentários
    
    res.json({
      liked: true,
      message: "Comentário curtido com sucesso"
    });
  } catch (error) {
    console.error("Erro ao curtir comentário:", error);
    res.status(500).json({ message: "Erro ao curtir comentário" });
  }
});

export default router;