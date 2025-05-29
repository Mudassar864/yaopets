import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs-extra";
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Configurar pasta de uploads para arquivos permanentes
const UPLOAD_DIR = "./uploads/permanent";
fs.ensureDirSync(UPLOAD_DIR);

// Configurar storage para multer
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    const ext = path.extname(file.originalname) || '.jpg'; // Usar .jpg como padrão se não houver extensão
    cb(null, `post-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (_req, file, cb) => {
    // Aceitar apenas imagens
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Formato de arquivo não suportado. Apenas imagens são permitidas.") as any);
    }
  }
});

// Endpoint para receber uma imagem blob e convertê-la em armazenamento permanente
router.post("/", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Nenhum arquivo enviado"
      });
    }
    
    const file = req.file;
    
    // Criar URL para acesso à imagem
    const fileUrl = `/uploads/permanent/${file.filename}`;
    
    console.log(`[BlobConverter] Imagem convertida e salva permanentemente: ${fileUrl}`);
    
    return res.status(200).json({
      success: true,
      url: fileUrl,
      mediaUrl: fileUrl, // Para compatibilidade com diferentes partes do código
      message: "Imagem armazenada permanentemente"
    });
    
  } catch (error: any) {
    console.error("[BlobConverter] Erro ao processar arquivo:", error);
    return res.status(500).json({
      success: false,
      message: `Erro ao processar arquivo: ${error.message}`
    });
  }
});

export default router;