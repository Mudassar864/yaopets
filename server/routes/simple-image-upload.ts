import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configurar armazenamento simples e eficaz
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join('.', 'uploads', 'images');
    
    // Criar diretório se não existir
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Nome único para evitar conflitos
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Aceitar imagens E GIFs
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens e GIFs são permitidos') as any);
    }
  }
});

// Endpoint simples e funcional para upload de imagens
router.post('/upload-image', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhuma imagem enviada'
      });
    }

    // GERAR URL COMPLETA E CORRETA que funciona no frontend
    const protocol = req.protocol;
    const host = req.get('host');
    const imageUrl = `${protocol}://${host}/uploads/images/${req.file.filename}`;
    
    console.log(`[Simple Upload] Imagem salva com URL completa: ${imageUrl}`);
    
    return res.json({
      success: true,
      url: imageUrl,
      relativePath: `/uploads/images/${req.file.filename}`,
      filename: req.file.filename,
      size: req.file.size,
      message: 'Imagem carregada com sucesso!'
    });
    
  } catch (error: any) {
    console.error('[Simple Upload] Erro:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao processar imagem',
      error: error.message
    });
  }
});

export default router;