import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configurar armazenamento para upload de arquivos
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    
    // Criar diretório de uploads se não existir
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // Usar timestamp para evitar nomes duplicados
    const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname) || '.jpg'; // Usar .jpg como fallback
    cb(null, uniquePrefix + extension);
  }
});

// Criar middleware de upload com configuração
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limite
  },
  fileFilter: (_req, file, cb) => {
    // Verificar tipo de arquivo (aceitar apenas imagens)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Tipo de arquivo não suportado. Apenas imagens são permitidas.'));
    }
    cb(null, true);
  }
});

// Endpoint para converter blobs em arquivos salvos
router.post('/blob-converter', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nenhum arquivo enviado' 
      });
    }
    
    // Construir URL do arquivo salvo
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const filePath = '/uploads/' + req.file.filename;
    const fileUrl = baseUrl + filePath;
    
    // Responder com URL permanente
    return res.status(200).json({
      success: true,
      url: filePath, // URL relativa (para uso interno)
      absoluteUrl: fileUrl, // URL completa (para uso externo)
      mediaUrl: filePath, // Compatibilidade com código existente
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Erro ao processar upload de blob:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao processar o arquivo'
    });
  }
});

export default router;