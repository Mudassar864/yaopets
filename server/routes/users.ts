/**
 * Rotas simplificadas para operações de usuários
 * Usa PostgreSQL diretamente
 */

import { Router, Request, Response } from "express";
import { db } from "../db";
import { users } from "../../shared/schema";
import { eq, sql } from "drizzle-orm";
import { storage } from "../storage";

const router = Router();

// Rota para buscar perfil de usuário
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: "ID inválido" });
    }
    
    // Buscar usuário usando storage
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    
    // Obter dados adicionais do usuário (contagens de seguidores, etc)
    const followerCount = await storage.getFollowerCount(userId);
    const followingCount = await storage.getFollowingCount(userId);
    const friendsCount = await storage.getFriendsCount(userId);
    
    // Se o usuário atual está logado, verificar se segue este usuário
    const currentUserId = req.user ? (req.user as any).id : null;
    let isFollowing = false;
    
    if (currentUserId) {
      isFollowing = await storage.isFollowing(currentUserId, userId);
    }
    
    // Enviar dados completos do usuário
    const userData = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      city: user.city,
      userType: user.userType,
      bio: user.bio,
      website: user.website,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
      points: user.points,
      level: user.level,
      achievementBadges: user.achievementBadges,
      // Adicionar contadores sociais
      followerCount,
      followingCount,
      friendsCount,
      isFollowing
    };
    
    res.status(200).json(userData);
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    res.status(500).json({ error: "Erro interno ao buscar usuário" });
  }
});

// Rota para buscar usuários por nome ou username
router.get("/search/:query", async (req: Request, res: Response) => {
  try {
    const searchQuery = req.params.query;
    
    if (!searchQuery || searchQuery.trim().length < 2) {
      return res.status(400).json({ 
        error: "Termo de busca deve ter pelo menos 2 caracteres" 
      });
    }
    
    // Como o storage não tem método de busca textual, vamos usar o db diretamente aqui
    // Este é um caso em que o uso direto do PostgreSQL é necessário
    const userResults = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        profileImage: users.profileImage,
        city: users.city,
        userType: users.userType
      })
      .from(users)
      .where(sql`
        ${users.username} ILIKE ${`%${searchQuery}%`} OR 
        ${users.name} ILIKE ${`%${searchQuery}%`}
      `)
      .limit(20);
    
    res.status(200).json(userResults);
  } catch (error) {
    console.error("Erro na busca de usuários:", error);
    res.status(500).json({ error: "Erro interno na busca de usuários" });
  }
});

// Rota para usuários mais recentes (para sugestões de amizade, etc)
router.get("/suggestions/recent", async (req: Request, res: Response) => {
  try {
    // Usuário atual (caso esteja autenticado)
    const currentUserId = req.user ? (req.user as any).id : null;
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Buscar todos os usuários
    // Como o storage não tem um método getAllUsers, usamos o db diretamente
    const allUsers = await db.select().from(users);
    
    // Filtrar usuário atual e ordenar por data de criação (mais recentes primeiro)
    const sortedUsers = allUsers
      .filter((user: typeof users.$inferSelect) => !currentUserId || user.id !== currentUserId)
      .sort((a: typeof users.$inferSelect, b: typeof users.$inferSelect) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, limit);
    
    // Mapear apenas os campos necessários
    const recentUserSuggestions = sortedUsers.map((user: typeof users.$inferSelect) => ({
      id: user.id,
      username: user.username,
      name: user.name,
      profileImage: user.profileImage,
      city: user.city,
      userType: user.userType
    }));
    
    res.status(200).json(recentUserSuggestions);
  } catch (error) {
    console.error("Erro ao buscar sugestões de usuários:", error);
    res.status(500).json({ error: "Erro interno ao buscar sugestões de usuários" });
  }
});

export default router;