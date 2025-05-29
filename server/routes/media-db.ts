import { Router, Request, Response } from "express";
import path from "path";
import { ImageProcessor } from "../utils/imageProcessor";

const router = Router();

// Endpoint para servir mídia do banco de dados
router.get("/:filename", async (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;
    
    console.log(`Buscando imagem ${filename} no banco de dados`);
    
    // Buscar a imagem no banco de dados pelo nome do arquivo
    const mediaData = await ImageProcessor.getImageByFilename(filename);
    
    if (!mediaData) {
      console.error(`Imagem ${filename} não encontrada no banco de dados`);
      return res.status(404).send("Imagem não encontrada");
    }
    
    // Configurar cabeçalhos apropriados para a resposta
    res.set("Content-Type", mediaData.mimeType);
    res.set("Content-Length", mediaData.buffer.length.toString());
    
    // Adicionar um cache de 1 dia (86400 segundos)
    res.set("Cache-Control", "public, max-age=86400");
    
    // Enviar a imagem como resposta
    return res.send(mediaData.buffer);
  } catch (error) {
    console.error("Erro ao servir imagem do banco de dados:", error);
    return res.status(500).send("Erro ao processar a imagem");
  }
});

// Endpoint para migrar todas as imagens para o banco de dados
router.post("/migrate", async (req: Request, res: Response) => {
  try {
    // Verificar se o usuário está autenticado
    if (!req) {
      return res.status(403).send({
        success: false,
        message: "Apenas usuários autenticados podem executar esta operação"
      });
    }
    
    console.log("Iniciando migração de imagens para o banco de dados...");
    
    // Executar a migração
    const result = await ImageProcessor.migrateImagesToDatabase();
    
    return res.status(200).send({
      success: true,
      message: `Migração concluída: ${result.success} imagens migradas com sucesso, ${result.failed} falhas`,
      successCount: result.success,
      failedCount: result.failed
    });
  } catch (error) {
    console.error("Erro na migração de imagens:", error);
    return res.status(500).send({
      success: false,
      message: "Erro ao migrar imagens para o banco de dados"
    });
  }
});

export default router;