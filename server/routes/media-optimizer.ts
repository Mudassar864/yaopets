import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { optimizeImage, saveOptimizedImage } from '../utils/imageOptimizer';
import { storage } from '../storage';

const router = express.Router();
const unlink = promisify(fs.unlink);
const readFile = promisify(fs.readFile);

// Configuração do multer para upload de arquivos
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/temp');
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, uniqueSuffix + ext);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Aceitar apenas imagens
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Apenas imagens são permitidas'));
    }
    cb(null, true);
  }
});

// Middleware para garantir que o diretório de upload exista
const ensureUploadDirExists = async (req: Request, res: Response, next: express.NextFunction) => {
  try {
    if (!fs.existsSync('uploads')) {
      await promisify(fs.mkdir)('uploads', { recursive: true });
    }
    if (!fs.existsSync('uploads/temp')) {
      await promisify(fs.mkdir)('uploads/temp', { recursive: true });
    }
    if (!fs.existsSync('uploads/optimized')) {
      await promisify(fs.mkdir)('uploads/optimized', { recursive: true });
    }
    next();
  } catch (error) {
    next(error);
  }
};

// Upload e otimização de imagem
router.post('/upload', ensureUploadDirExists, upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    }

    const file = req.file;
    const { width, height, quality, format } = req.body;

    // Ler o arquivo para um buffer
    const imageBuffer = await readFile(file.path);

    // Caminho para salvar a imagem otimizada
    const optimizedFilename = path.parse(file.filename).name + '.jpg'; // Forçar formato JPG para economia
    const optimizedPath = path.join('uploads/optimized', optimizedFilename);

    // Opções de otimização
    const options = {
      width: width ? parseInt(width) : undefined,
      height: height ? parseInt(height) : undefined,
      quality: quality ? parseInt(quality) : 85,
      format: format as ('jpeg' | 'png' | 'webp') || 'jpeg',
    };

    // Otimizar e salvar
    await saveOptimizedImage(imageBuffer, optimizedPath, options);

    // Remover arquivo temporário
    await unlink(file.path);

    // Obter URL pública para acesso via API
    const imageUrl = `/uploads/optimized/${optimizedFilename}`;

    // Registrar no banco de dados para persistência
    const media = await storage.createMedia({
      url: imageUrl,
      mediaType: 'image',
      mimeType: 'image/jpeg',
      fileSize: fs.statSync(optimizedPath).size,
      width: options.width,
      height: options.height,
      // Usar filePath em vez de filename
      filePath: optimizedPath,
      // @ts-ignore Isso é adicionado pelo middleware de autenticação
      userId: req.user?.id || 1, // Default para 1 se não autenticado (apenas para desenvolvimento)
      title: req.body.title || 'Imagem otimizada',
      isOptimized: true,
      originalSize: file.size,
      isActive: true,
    });

    // Retornar informações do arquivo otimizado
    res.json({
      id: media.id,
      url: media.url,
      filePath: media.filePath,
      originalSize: file.size,
      optimizedSize: fs.statSync(optimizedPath).size,
      reduction: Math.round((1 - fs.statSync(optimizedPath).size / file.size) * 100),
    });

  } catch (error) {
    console.error('Erro ao otimizar imagem:', error);
    res.status(500).json({ error: 'Erro ao processar a imagem' });
  }
});

// Salvar imagem já otimizada diretamente no banco de dados
router.post('/save-to-db', ensureUploadDirExists, upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    }

    const file = req.file;
    
    // Ler o arquivo para um buffer
    const imageBuffer = await readFile(file.path);
    
    // Otimizar a imagem (reduzir tamanho)
    const optimizedBuffer = await optimizeImage(imageBuffer, {
      width: 1200, // Dimensão máxima
      quality: 85,
      format: 'jpeg'
    });

    // Criar um ID único para o arquivo
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileIdentifier = `${timestamp}-${randomId}.jpg`;

    // Salvar a imagem diretamente no banco de dados
    const media = await storage.createMedia({
      // @ts-ignore Isso é adicionado pelo middleware de autenticação
      userId: req.user?.id || 1, // Default para desenvolvimento
      url: `/api/media/${fileIdentifier}`, // URL para acessar a imagem
      filePath: fileIdentifier, // Usando filePath em vez de filename
      mediaType: 'image',
      mimeType: 'image/jpeg',
      fileSize: optimizedBuffer.length,
      data: optimizedBuffer.toString('base64'), // Converter para base64 conforme schema
      isOptimized: true,
      originalSize: file.size,
      title: req.body.title || 'Imagem otimizada',
      isActive: true,
    });

    // Remover arquivo temporário
    await unlink(file.path);

    // Retornar informações da imagem salva
    res.json({
      id: media.id,
      url: media.url,
      filePath: media.filePath,
      originalSize: file.size,
      optimizedSize: optimizedBuffer.length,
      reduction: Math.round((1 - optimizedBuffer.length / file.size) * 100),
    });

  } catch (error) {
    console.error('Erro ao salvar imagem no banco de dados:', error);
    res.status(500).json({ error: 'Erro ao processar a imagem' });
  }
});

// Rota para obter uma imagem diretamente do banco de dados
router.get('/:fileId', async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;

    // Buscar a imagem no banco de dados usando filePath ou URL
    const mediaList = await storage.getAllMedia();
    const media = mediaList.find(m => 
      (m.filePath && m.filePath.includes(fileId)) || 
      (m.url && m.url.includes(fileId))
    );
    
    if (!media || !media.data) {
      return res.status(404).json({ error: 'Imagem não encontrada' });
    }

    // Definir o tipo MIME correto
    res.set('Content-Type', media.mimeType || 'image/jpeg');
    
    // Converter de base64 para Buffer
    const imageBuffer = Buffer.from(media.data, 'base64');
    
    // Enviar os dados da imagem diretamente do banco
    res.send(imageBuffer);

  } catch (error) {
    console.error('Erro ao obter imagem do banco de dados:', error);
    res.status(500).json({ error: 'Erro ao obter imagem' });
  }
});

export default router;