import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";

const router = Router();

// Rota para servir imagens diretamente
router.get("/:filename", (req: Request, res: Response) => {
  const filename = req.params.filename;
  const filepath = path.join("./uploads", filename);

  // Verificar se o arquivo existe
  if (fs.existsSync(filepath)) {
    // Definir tipo de conteúdo baseado na extensão do arquivo
    const ext = path.extname(filepath).toLowerCase();
    const mimeTypes: {[key: string]: string} = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml'
    };
    
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    
    // Enviar o arquivo como resposta
    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);
  } else {
    // Se o arquivo não existir, enviar 404
    res.status(404).json({ error: "Imagem não encontrada" });
  }
});

export default router;