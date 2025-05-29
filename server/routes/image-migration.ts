import { Router, Request, Response } from "express";
import { ImageProcessor } from "../utils/imageProcessor";
import { db } from "../db";
import { media } from "@shared/schema";

const router = Router();

// Endpoint para verificar status da tabela de mídia
router.get("/check", async (req: Request, res: Response) => {
  try {
    const allMedia = await db.select().from(media);
    
    return res.status(200).json({
      total: allMedia.length,
      mediaWithData: allMedia.filter(item => item.data).length,
      mediaWithoutData: allMedia.filter(item => !item.data).length,
      mediaTypes: allMedia.reduce((acc, item) => {
        if (!acc[item.mediaType]) {
          acc[item.mediaType] = 0;
        }
        acc[item.mediaType]++;
        return acc;
      }, {} as Record<string, number>)
    });
  } catch (error) {
    console.error("Erro ao verificar status da mídia:", error);
    return res.status(500).json({ 
      error: "Erro ao verificar status da mídia",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Endpoint para migrar imagens para o banco de dados
router.post("/migrate", async (req: Request, res: Response) => {
  try {    
    console.log("Iniciando migração de imagens para o banco de dados...");
    
    // Executar a migração
    const result = await ImageProcessor.migrateImagesToDatabase();
    
    return res.status(200).json({
      success: true,
      message: `Migração concluída: ${result.success} imagens migradas com sucesso, ${result.failed} falhas`,
      successCount: result.success,
      failedCount: result.failed
    });
  } catch (error) {
    console.error("Erro na migração de imagens:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao migrar imagens para o banco de dados",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;