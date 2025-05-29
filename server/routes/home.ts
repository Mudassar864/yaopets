/**
 * Rotas simplificadas para o Feed Principal
 * Usa PostgreSQL diretamente para operações básicas
 */

import { Router, Request, Response } from "express";
import { db } from "../db";
import { posts, users, postInteractions } from "../../shared/schema";
import { eq, desc, and, sql, asc, count } from "drizzle-orm";
import { storage } from "../storage";

const router = Router();

// Rota simplificada para buscar posts recentes
router.get("/posts", async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    
    // Utilizando a camada de storage para garantir compatibilidade
    const allPosts = await storage.getPosts();
    
    // Ordenar por data de criação (mais recentes primeiro)
    const sortedPosts = allPosts
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(offset, offset + limit);
    
    // Para cada post, buscar informações do usuário
    const enhancedPosts = await Promise.all(
      sortedPosts.map(async (post) => {
        // Buscar usuário
        const user = await storage.getUser(post.userId);
        
        // Buscar likes e comentários usando os métodos corretos
        const likes = await storage.getLikeCount('post', post.id);
        const comments = await storage.getComments('post', post.id);
        
        return {
          id: post.id,
          userId: post.userId,
          content: post.content,
          mediaUrls: post.mediaUrls,
          createdAt: post.createdAt,
          username: user?.username || 'usuário',
          userName: user?.name || 'Usuário',
          userPhotoUrl: user?.profileImage || '',
          likesCount: likes,
          commentsCount: comments.length
        };
      })
    );
    
    res.status(200).json(enhancedPosts);
  } catch (error) {
    console.error("Erro ao buscar posts:", error);
    res.status(500).json({ error: "Erro interno ao buscar posts" });
  }
});

// Rota para buscar um post específico
router.get("/posts/:id", async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id);
    
    if (isNaN(postId)) {
      return res.status(400).json({ error: "ID inválido" });
    }
    
    // Usar o storage para buscar o post por ID
    const post = await storage.getPost(postId);
    
    if (!post) {
      return res.status(404).json({ error: "Post não encontrado" });
    }
    
    // Buscar informações do usuário
    const user = await storage.getUser(post.userId);
    
    // Buscar likes e comentários usando os métodos corretos
    const likes = await storage.getLikeCount('post', post.id);
    const comments = await storage.getComments('post', post.id);
    
    // Formatar a resposta
    const formattedPost = {
      id: post.id,
      userId: post.userId,
      content: post.content,
      mediaUrls: post.mediaUrls,
      createdAt: post.createdAt,
      username: user?.username || 'usuário',
      userName: user?.name || 'Usuário',
      userPhotoUrl: user?.profileImage || '',
      likesCount: likes,
      commentsCount: comments
    };
    
    res.status(200).json(formattedPost);
  } catch (error) {
    console.error("Erro ao buscar post:", error);
    res.status(500).json({ error: "Erro interno ao buscar post" });
  }
});

// Rota para curtir/descurtir um post
router.post("/posts/:id/like", async (req: Request, res: Response) => {
  try {
    // Verificar autenticação - mais detalhes para depuração
    console.log("[LIKE] Requisição de like recebida:", {
      sessionID: req.sessionID,
      hasSession: !!req.session,
      hasUser: !!req,
      cookies: !!req.headers.cookie,
      method: req.method,
      path: req.path
    });
    
    // Autenticação
    let userId = req.user ? (req.user as any).id : null;

    if (!userId) {
      console.log("[LIKE] Usuário não autenticado. Header cookies:", req.headers.cookie);
      // Para ambiente de desenvolvimento, permitir usar userId do corpo
      if (process.env.NODE_ENV === 'development' && req.body && req.body.userId) {
        userId = req.body.userId;
        console.log("[TESTE] Usando userId:", userId, "do corpo da requisição");
      } else {
        return res.status(401).json({ message: "Não autenticado" });
      }
    } else {
      console.log("[LIKE] Usuário autenticado:", userId);
    }
    
    const postId = parseInt(req.params.id);
    
    if (isNaN(postId)) {
      return res.status(400).json({ message: "ID inválido" });
    }
    
    // Verificar se o post existe
    const post = await storage.getPost(postId);
    if (!post) {
      return res.status(404).json({ message: "Post não encontrado" });
    }
    
    console.log(`[LIKE] Processando like para post ${postId} pelo usuário ${userId}`);
    
    // Buscar todas as interações deste post
    const interactions = await storage.getPostInteractions('post', postId);
    
    // Verificar se o usuário já curtiu o post
    const existingLike = interactions.find(
      i => i.userId === userId && i.type === 'like'
    );
    
    // Se já curtiu, remover a curtida
    if (existingLike) {
      console.log(`[LIKE] Removendo like existente id=${existingLike.id}`);
      await storage.deletePostInteraction(existingLike.id);
      
      // Obter contagem atualizada de likes
      const updatedLikeCount = await storage.getLikeCount('post', postId);
      
      return res.status(200).json({
        liked: false,
        likesCount: updatedLikeCount
      });
    }
    
    console.log(`[LIKE] Adicionando novo like`);
    
    // Se não curtiu, adicionar curtida usando Drizzle diretamente
    const [newInteraction] = await db.insert(postInteractions)
      .values({
        postId: postId,
        userId: userId,
        postType: "post",
        type: "like",
        content: null,
        createdAt: new Date()
      })
      .returning();
    
    console.log(`[LIKE] Novo like inserido com ID ${newInteraction.id}`);
    
    // Obter contagem atualizada de likes
    const updatedLikeCount = await storage.getLikeCount('post', postId);
    
    res.status(200).json({
      liked: true,
      likesCount: updatedLikeCount
    });
  } catch (error) {
    console.error("Erro ao curtir post:", error);
    res.status(500).json({ message: "Erro interno ao curtir post" });
  }
});

// Rota para adicionar comentário a um post
router.post("/posts/:id/comment", async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = req.user ? (req.user as any).id : null;
    const { content } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: "Não autenticado" });
    }
    
    if (isNaN(postId)) {
      return res.status(400).json({ error: "ID inválido" });
    }
    
    if (!content || typeof content !== "string" || content.trim() === "") {
      return res.status(400).json({ error: "Conteúdo inválido" });
    }
    
    // Verificar se o post existe
    const post = await storage.getPost(postId);
    if (!post) {
      return res.status(404).json({ error: "Post não encontrado" });
    }
    
    // Adicionar comentário usando Drizzle diretamente para garantir a inserção correta
    const [newComment] = await db.insert(postInteractions)
      .values({
        postId: postId,
        userId: userId,
        postType: "post",
        type: "comment",
        content: content.trim(),
        createdAt: new Date()
      })
      .returning();
    
    // Buscar informações do usuário que comentou
    const user = await storage.getUser(userId);
    
    res.status(201).json({
      id: newComment.id,
      postId,
      userId,
      content: content.trim(),
      createdAt: newComment.createdAt,
      user: {
        id: user?.id,
        username: user?.username,
        name: user?.name,
        profileImage: user?.profileImage
      }
    });
  } catch (error) {
    console.error("Erro ao adicionar comentário:", error);
    res.status(500).json({ error: "Erro interno ao adicionar comentário" });
  }
});

// Rota para listar comentários de um post
router.get("/posts/:id/comments", async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id);
    
    if (isNaN(postId)) {
      return res.status(400).json({ error: "ID inválido" });
    }
    
    // Verificar se o post existe
    const post = await storage.getPost(postId);
    if (!post) {
      return res.status(404).json({ error: "Post não encontrado" });
    }
    
    // Buscar comentários do post usando o storage
    const comments = await storage.getComments('post', postId);
    
    // Para cada comentário, buscar informações do usuário
    const formattedComments = await Promise.all(
      comments.map(async (comment) => {
        const user = await storage.getUser(comment.userId);
        
        return {
          id: comment.id,
          postId: comment.postId,
          userId: comment.userId,
          content: comment.content,
          createdAt: comment.createdAt,
          user: {
            id: user?.id,
            username: user?.username,
            name: user?.name,
            profileImage: user?.profileImage
          }
        };
      })
    );
    
    // Ordenar comentários por data (mais antigos primeiro)
    const sortedComments = formattedComments.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    
    res.status(200).json(sortedComments);
  } catch (error) {
    console.error("Erro ao buscar comentários:", error);
    res.status(500).json({ error: "Erro interno ao buscar comentários" });
  }
});

export default router;