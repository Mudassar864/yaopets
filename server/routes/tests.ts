/**
 * Rotas de teste para diagnóstico de problemas
 */

import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { postInteractions } from "../../shared/schema";

const router = Router();

// Rota para testar a inserção de interações
router.post("/interaction-test", async (req: Request, res: Response) => {
  try {
    const { userId, postId, type, content } = req.body;
    
    if (!userId || !postId || !type) {
      return res.status(400).json({ error: "Dados incompletos", 
        required: "userId, postId, type (like ou comment), content (opcional)" });
    }
    
    console.log(`[TESTE] Tentando criar interação: userId=${userId}, postId=${postId}, type=${type}`);
    
    // Tentativa 1: Usando o storage
    try {
      console.log("[TESTE] Método 1: Usando storage.createPostInteraction");
      const newInteraction = await storage.createPostInteraction({
        userId,
        postId,
        postType: "post",
        type,
        content: content || null
      });
      console.log("[TESTE] Sucesso método 1:", newInteraction);
    } catch (error) {
      console.error("[TESTE] Erro método 1:", error);
    }
    
    // Tentativa 2: Inserção direta
    try {
      console.log("[TESTE] Método 2: Inserção direta com Drizzle");
      const result = await db.insert(postInteractions).values({
        userId,
        postId,
        postType: "post",
        type,
        content: content || null
      }).returning();
      console.log("[TESTE] Sucesso método 2:", result);
    } catch (error) {
      console.error("[TESTE] Erro método 2:", error);
    }
    
    // Tentativa 3: Usando objeto com nomenclatura snake_case
    try {
      console.log("[TESTE] Método 3: Usando nomenclatura snake_case");
      const result = await db.insert(postInteractions).values({
        user_id: userId,
        post_id: postId,
        post_type: "post",
        type,
        content: content || null
      }).returning();
      console.log("[TESTE] Sucesso método 3:", result);
    } catch (error) {
      console.error("[TESTE] Erro método 3:", error);
    }
    
    res.status(200).json({ 
      message: "Testes completados, verifique os logs do servidor",
      userId,
      postId,
      type 
    });
  } catch (error) {
    console.error("[TESTE] Erro geral:", error);
    res.status(500).json({ error: "Erro ao executar testes de interação" });
  }
});

export default router;