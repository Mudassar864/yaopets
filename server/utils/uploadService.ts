import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import { Express, Request, Response } from 'express';
import { optimizeImage, isSupportedFileType, isImage, isVideo } from './imageOptimizer';

// Caminhos para salvar arquivos
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const TEMP_DIR = path.join(UPLOAD_DIR, 'temp');

// Garantir que os diretórios existam
fs.ensureDirSync(UPLOAD_DIR);
fs.ensureDirSync(TEMP_DIR);

// Configurar o armazenamento do multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TEMP_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueFileName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFileName);
  }
});

// Filtro para validar tipos de arquivos
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (isSupportedFileType(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de arquivo não suportado: ${file.mimetype}`));
  }
};

// Criar instância do multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB como limite máximo
  }
});

// Interface para resultado de upload
interface UploadResult {
  success: boolean;
  files?: Array<{
    originalname: string;
    filename: string;
    path: string;
    url: string;
    mimetype: string;
    size: number;
    width?: number;
    height?: number;
    optimized?: boolean;
    originalSize?: number;
  }>;
  error?: string;
}

/**
 * Processa um arquivo enviado, otimizando se for uma imagem
 * @param file Arquivo enviado
 * @returns Resultado do processamento com informações do arquivo
 */
export async function processUploadedFile(file: Express.Multer.File): Promise<any> {
  try {
    const fileInfo = {
      originalname: file.originalname,
      filename: file.filename,
      path: file.path,
      url: `/uploads/temp/${file.filename}`,
      mimetype: file.mimetype,
      size: file.size,
      optimized: false
    };

    // Se for uma imagem, otimizar
    if (isImage(file.mimetype)) {
      const optimizeResult = await optimizeImage(file.path);
      
      if (optimizeResult.success) {
        // Adicionar informações da imagem otimizada
        return {
          ...fileInfo,
          path: optimizeResult.path,
          url: optimizeResult.url,
          size: optimizeResult.size,
          width: optimizeResult.width,
          height: optimizeResult.height,
          optimized: true,
          originalSize: optimizeResult.originalSize
        };
      }
    }
    
    // Se for vídeo ou se a otimização falhou, retornar o arquivo original
    return fileInfo;
  } catch (error) {
    console.error('Erro ao processar arquivo:', error);
    throw error;
  }
}

/**
 * Middleware para upload de um único arquivo
 */
export const uploadSingleFile = upload.single('file');

/**
 * Middleware para upload de múltiplos arquivos
 */
export const uploadMultipleFiles = upload.array('files', 10); // Limite de 10 arquivos

/**
 * Configura as rotas de upload no Express
 * @param app Aplicação Express
 */
export function setupUploadRoutes(app: Express) {
  // Rota para servir arquivos estáticos
  app.use('/uploads', express.static(UPLOAD_DIR));

  // Rota para upload de um único arquivo
  app.post('/api/upload/single', uploadSingleFile, async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'Nenhum arquivo enviado' });
      }

      const processedFile = await processUploadedFile(req.file);
      
      // Registrar no banco de dados
      if (req.user) {
        const result = await saveMediaToDatabase(processedFile, req.user.id);
        return res.status(201).json({ 
          success: true, 
          file: { ...processedFile, id: result.id }
        });
      }
      
      return res.status(201).json({ success: true, file: processedFile });
    } catch (error) {
      console.error('Erro no upload:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // Rota para upload de múltiplos arquivos
  app.post('/api/upload/multiple', uploadMultipleFiles, async (req: Request, res: Response) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ success: false, error: 'Nenhum arquivo enviado' });
      }

      const processedFiles = await Promise.all(
        req.files.map(file => processUploadedFile(file))
      );
      
      // Registrar no banco de dados
      if (req.user) {
        const results = await Promise.all(
          processedFiles.map(file => saveMediaToDatabase(file, req.user.id))
        );
        
        const filesWithIds = processedFiles.map((file, index) => ({
          ...file,
          id: results[index].id
        }));
        
        return res.status(201).json({ success: true, files: filesWithIds });
      }
      
      return res.status(201).json({ success: true, files: processedFiles });
    } catch (error) {
      console.error('Erro no upload múltiplo:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });
}

/**
 * Salva informações do arquivo de mídia no banco de dados
 * @param fileInfo Informações do arquivo processado
 * @param userId ID do usuário que fez o upload
 * @returns Resultado da inserção no banco de dados
 */
async function saveMediaToDatabase(fileInfo: any, userId: number) {
  // Inserir na tabela de mídia
  const media = {
    userId,
    filename: fileInfo.filename,
    originalName: fileInfo.originalname,
    path: fileInfo.path,
    url: fileInfo.url,
    mimeType: fileInfo.mimetype,
    size: fileInfo.size,
    width: fileInfo.width || null,
    height: fileInfo.height || null,
    isOptimized: fileInfo.optimized || false,
    originalSize: fileInfo.originalSize || fileInfo.size,
    createdAt: new Date()
  };

  try {
    // Usar o sistema de storage para salvar
    const result = await storage.createMedia(media);
    return result;
  } catch (error) {
    console.error('Erro ao salvar mídia no banco de dados:', error);
    throw error;
  }
}

// Importar módulos necessários
import express from 'express';