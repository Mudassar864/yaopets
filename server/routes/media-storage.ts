import { Router, Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { db } from '../db';
import { media } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Configuração do multer para armazenar arquivos temporariamente na memória
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Aceitar apenas imagens
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas') as any);
    }
  }
});

// Endpoint para armazenar imagem permanentemente no banco PostgreSQL
router.post('/store-image', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhuma imagem enviada'
      });
    }

    if (!req) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const userId = (req.user as any).id;
    const file = req.file;

    console.log(`[Media Storage] Processando imagem: ${file.originalname} (${file.size} bytes)`);

    // Otimizar a imagem usando Sharp
    const optimizedBuffer = await sharp(file.buffer)
      .resize(1200, 1200, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .jpeg({ 
        quality: 80,
        progressive: true 
      })
      .toBuffer();

    // Obter metadados da imagem otimizada
    const metadata = await sharp(optimizedBuffer).metadata();
    
    // Converter para base64 para armazenar no banco
    const base64Data = optimizedBuffer.toString('base64');
    
    // Criar URL única para a imagem
    const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const imageUrl = `/api/media-storage/image/${imageId}`;

    // Salvar no banco PostgreSQL
    const [savedMedia] = await db.insert(media).values({
      userId,
      title: file.originalname,
      description: req.body.description || `Imagem enviada por usuário ${userId}`,
      mediaType: 'image',
      fileSize: optimizedBuffer.length,
      mimeType: 'image/jpeg',
      width: metadata.width || 0,
      height: metadata.height || 0,
      url: imageUrl,
      isPublic: true,
      data: base64Data,
      isOptimized: true,
      originalSize: file.size,
      isActive: true
    }).returning();

    console.log(`[Media Storage] Imagem salva no banco: ID ${savedMedia.id}, URL: ${imageUrl}`);

    // Atualizar a URL com o ID real do banco
    const finalUrl = `/api/media-storage/image/${savedMedia.id}`;
    await db.update(media)
      .set({ url: finalUrl })
      .where(eq(media.id, savedMedia.id));

    return res.status(200).json({
      success: true,
      mediaId: savedMedia.id,
      url: finalUrl,
      originalSize: file.size,
      optimizedSize: optimizedBuffer.length,
      compressionRatio: ((file.size - optimizedBuffer.length) / file.size * 100).toFixed(1),
      width: metadata.width,
      height: metadata.height,
      message: 'Imagem armazenada permanentemente no banco de dados'
    });

  } catch (error: any) {
    console.error('[Media Storage] Erro ao armazenar imagem:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao armazenar imagem',
      error: error.message
    });
  }
});

// Endpoint para servir imagens do banco PostgreSQL
router.get('/image/:id', async (req: Request, res: Response) => {
  try {
    const mediaId = parseInt(req.params.id);
    
    if (isNaN(mediaId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de mídia inválido'
      });
    }

    // Buscar a imagem no banco
    const [imageData] = await db.select()
      .from(media)
      .where(eq(media.id, mediaId));

    if (!imageData) {
      return res.status(404).json({
        success: false,
        message: 'Imagem não encontrada'
      });
    }

    if (!imageData.data) {
      return res.status(404).json({
        success: false,
        message: 'Dados da imagem não disponíveis'
      });
    }

    // Converter base64 de volta para buffer
    const imageBuffer = Buffer.from(imageData.data, 'base64');

    // Configurar headers para cache
    res.set({
      'Content-Type': imageData.mimeType || 'image/jpeg',
      'Content-Length': imageBuffer.length.toString(),
      'Cache-Control': 'public, max-age=31536000', // Cache por 1 ano
      'ETag': `"${mediaId}-${imageData.fileSize}"`
    });

    // Verificar ETag para cache
    const clientETag = req.headers['if-none-match'];
    if (clientETag === `"${mediaId}-${imageData.fileSize}"`) {
      return res.status(304).end();
    }

    return res.send(imageBuffer);

  } catch (error: any) {
    console.error('[Media Storage] Erro ao servir imagem:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao carregar imagem',
      error: error.message
    });
  }
});

// Endpoint para listar todas as imagens de um usuário
router.get('/user/:userId/images', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuário inválido'
      });
    }

    // Buscar todas as imagens do usuário
    const userImages = await db.select({
      id: media.id,
      title: media.title,
      url: media.url,
      fileSize: media.fileSize,
      width: media.width,
      height: media.height,
      createdAt: media.createdAt
    })
    .from(media)
    .where(eq(media.userId, userId));

    return res.status(200).json({
      success: true,
      images: userImages,
      count: userImages.length
    });

  } catch (error: any) {
    console.error('[Media Storage] Erro ao listar imagens:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao listar imagens',
      error: error.message
    });
  }
});

export default router;