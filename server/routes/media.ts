import { Router, Request, Response } from "express";
import { mediaStorage } from "../storage/MediaStorageDB";
import multer from "multer";
import path from "path";
import fs from "fs-extra";
import * as imageOptimizer from "../utils/imageOptimizer";
import { z } from "zod";

const router = Router();

// Configurar pasta de uploads temporários
const UPLOAD_DIR = "./uploads/temp";
fs.ensureDirSync(UPLOAD_DIR);

// Configurar armazenamento para o multer
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB
  },
  fileFilter: (_req, file, cb) => {
    // Aceitar apenas imagens e vídeos
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Formato de arquivo não suportado. Apenas imagens e vídeos são permitidos.") as any);
    }
  }
});

// Schema para validação de parâmetros de otimização
const optimizationParamsSchema = z.object({
  maxWidth: z.number().optional(),
  quality: z.number().min(1).max(100).optional(),
  format: z.enum(["jpeg", "png", "webp", "original"]).optional()
});

// Endpoint para upload e otimização de imagem
router.post("/upload", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Nenhum arquivo enviado"
      });
    }
    
    if (!req?.id) {
      return res.status(401).json({
        success: false,
        message: "Usuário não autenticado"
      });
    }
    
    const userId = req.user.id;
    const file = req.file;
    
    // Parâmetros opcionais de otimização
    const optimizationParams = req.body.optimizationParams 
      ? JSON.parse(req.body.optimizationParams) 
      : {};
      
    // Validar parâmetros de otimização
    try {
      optimizationParamsSchema.parse(optimizationParams);
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: `Parâmetros de otimização inválidos: ${error.message}`
      });
    }
    
    // Verificar se é uma imagem ou vídeo
    const isImage = file.mimetype.startsWith("image/");
    
    let mediaUrl;
    let mediaInfo: any = {};
    
    if (isImage) {
      // Otimizar e armazenar imagem usando as novas funções de otimização
      const optimizedBuffer = await imageOptimizer.optimizeImage(
        fs.readFileSync(file.path),
        {
          quality: 85,
          format: 'jpeg',
          width: 1200 // Limitar largura máxima para economizar espaço
        }
      );
      
      // Criar um ID único para o arquivo
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const fileIdentifier = `${timestamp}-${randomId}.jpg`;
      const optimizedPath = path.join('uploads/optimized', fileIdentifier);
      
      // Garantir que o diretório existe
      fs.ensureDirSync(path.dirname(optimizedPath));
      
      // Salvar a imagem otimizada
      fs.writeFileSync(optimizedPath, optimizedBuffer);
      
      // Salvar no banco de dados
      const media = await mediaStorage.createMedia({
        userId,
        title: req.body.title || file.originalname,
        description: req.body.description,
        mediaType: "image",
        fileSize: optimizedBuffer.length,
        mimeType: "image/jpeg",
        width: 1200, // Assumindo largura máxima
        filePath: optimizedPath,
        url: `/api/media/${fileIdentifier}`,
        isPublic: req.body.isPublic !== "false",
        data: optimizedBuffer.toString("base64"),
        isOptimized: true,
        originalSize: file.size,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      mediaUrl = media.url;
      
      // Obter informações de otimização para resposta
      const fileSizeBefore = fs.statSync(file.path).size;
      const optimizedMedia = await mediaStorage.getMediaByUser(userId);
      const latestMedia = optimizedMedia.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      
      if (latestMedia) {
        mediaInfo = {
          id: latestMedia.id,
          originalSize: fileSizeBefore,
          optimizedSize: latestMedia.fileSize,
          reduction: ((fileSizeBefore - latestMedia.fileSize) / fileSizeBefore) * 100,
          width: latestMedia.width,
          height: latestMedia.height
        };
      }
    } else {
      // Para vídeos, armazenar sem otimização por enquanto
      // (otimização de vídeo poderia ser implementada em versões futuras)
      const fileBuffer = fs.readFileSync(file.path);
      
      // Armazenar no banco de dados
      const media = await mediaStorage.createMedia({
        userId,
        title: req.body.title || file.originalname,
        description: req.body.description,
        mediaType: "video",
        fileSize: file.size,
        mimeType: file.mimetype,
        filePath: file.path,
        url: `/api/media/${file.filename}`,
        isPublic: req.body.isPublic !== "false",
        data: fileBuffer.toString("base64"),
        isOptimized: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      mediaUrl = media.url;
      mediaInfo = {
        id: media.id,
        originalSize: file.size,
        optimizedSize: file.size,
        reduction: 0,
        duration: null // Duração seria calculada em implementação futura
      };
    }
    
    return res.status(200).json({
      success: true,
      url: mediaUrl,
      mediaInfo
    });
  } catch (error: any) {
    console.error("Erro no upload e otimização:", error);
    return res.status(500).json({
      success: false,
      message: `Erro ao processar arquivo: ${error.message}`
    });
  } finally {
    // Limpar arquivos temporários após o processamento
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error("Erro ao remover arquivo temporário:", err);
      }
    }
  }
});

// Endpoint para servir mídia do banco de dados por ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    // Verifica se é um ID numérico
    const idParam = req.params.id;
    let media;
    
    if (/^\d+$/.test(idParam)) {
      // Se for um número, busca por ID
      const id = parseInt(idParam);
      media = await mediaStorage.getMedia(id);
    } else {
      // Se não for um número, assume que é um nome de arquivo
      const filename = idParam;
      // Busca todas as mídias e filtra por URL que contenha o nome do arquivo
      const allMedia = await mediaStorage.getAllMedia();
      console.log(`Buscando arquivo de mídia: ${filename}`);
      console.log(`Total de arquivos de mídia no banco: ${allMedia.length}`);
      
      // Busca por correspondência exata ou parcial na URL ou filePath
      media = allMedia.find(m => {
        // Verifica se url ou filePath existem e contêm o nome do arquivo
        const matchUrl = m.url && m.url.includes(filename);
        const matchFilePath = m.filePath && m.filePath.includes(filename);
        
        // Se encontrar, mostra informações de debug
        if (matchUrl || matchFilePath) {
          console.log(`Arquivo encontrado! ID: ${m.id}, URL: ${m.url}`);
        }
        
        return matchUrl || matchFilePath;
      });
    }
    
    if (!media || !media.data) {
      console.log(`Mídia não encontrada: ${idParam}`);
      return res.status(404).json({
        success: false,
        message: "Mídia não encontrada"
      });
    }
    
    // Verificar se é pública ou se o usuário tem acesso
    if (!media.isPublic && (!req || req.user.id !== media.userId)) {
      return res.status(403).json({
        success: false,
        message: "Acesso negado"
      });
    }
    
    // Converter dados base64 para buffer
    const buffer = Buffer.from(media.data, "base64");
    
    // Definir cabeçalhos apropriados
    res.set("Content-Type", media.mimeType);
    res.set("Content-Length", buffer.length.toString());
    
    // Cache por 1 dia (86400 segundos)
    res.set("Cache-Control", "public, max-age=86400");
    
    // Enviar o buffer como resposta
    return res.send(buffer);
  } catch (error: any) {
    console.error("Erro ao servir mídia:", error);
    return res.status(500).json({
      success: false,
      message: `Erro ao servir mídia: ${error.message}`
    });
  }
});

export default router;