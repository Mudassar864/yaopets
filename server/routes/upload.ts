import { Request, Response, Router } from "express";
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs-extra';
import path from "path";

// Configurar diretório de uploads
const UPLOAD_DIR = './uploads';
fs.ensureDirSync(UPLOAD_DIR);

// Configurar storage para multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// Configurar upload
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  }
});

// Middlewares de upload
const uploadSingle = upload.single('file');
const uploadMultiple = upload.array('files', 10); // máximo de 10 arquivos

// Função para obter URL do arquivo
const getFileUrl = (filename: string) => {
  return `/uploads/${filename}`;
};

const router = Router();

// Endpoint para upload de uma única imagem
router.post("/single", (req: Request, res: Response) => {
  uploadSingle(req, res, (err) => {
    if (err) {
      return res.status(400).json({ 
        success: false,
        message: "Erro ao fazer upload da imagem", 
        error: err.message 
      });
    }
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: "Nenhum arquivo enviado"
      });
    }
    
    const fileUrl = getFileUrl(req.file.filename);
    
    return res.status(200).json({
      success: true,
      file: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: fileUrl
      }
    });
  });
});

// Endpoint para upload de múltiplas imagens
router.post("/multiple", (req: Request, res: Response) => {
  uploadMultiple(req, res, (err) => {
    if (err) {
      return res.status(400).json({ 
        success: false,
        message: "Erro ao fazer upload das imagens", 
        error: err.message 
      });
    }
    
    if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
      return res.status(400).json({ 
        success: false,
        message: "Nenhum arquivo enviado"
      });
    }
    
    // Processar arquivos enviados
    const files = Array.isArray(req.files) ? req.files.map(file => {
      return {
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        url: getFileUrl(file.filename)
      };
    }) : [];
    
    return res.status(200).json({
      success: true,
      files: files
    });
  });
});

export default router;