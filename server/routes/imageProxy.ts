import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import Sharp from 'sharp';
import { log } from '../vite';

const router = Router();

// Função para verificar se a URL é válida
function isValidUrl(url: string) {
  try {
    new URL(url);
    // URLs de blob não podem ser processadas pelo servidor
    if (url.startsWith('blob:')) {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
}

// Endpoint para converter e otimizar imagens
router.get('/image-proxy', async (req: Request, res: Response) => {
  try {
    const imageUrl = req.query.url as string;
    
    if (!imageUrl || !isValidUrl(imageUrl)) {
      return res.status(400).json({ error: 'URL de imagem inválida ou não fornecida' });
    }
    
    log(`Processando imagem: ${imageUrl}`, 'image-proxy');
    
    // Buscar a imagem original
    const imageResponse = await fetch(imageUrl);
    
    if (!imageResponse.ok) {
      return res.status(imageResponse.status).json({ 
        error: `Falha ao buscar imagem original: ${imageResponse.statusText}` 
      });
    }
    
    const imageBuffer = await imageResponse.buffer();
    
    // Processar a imagem com Sharp
    try {
      // Detectar formato e converter para JPEG se necessário
      const processedImage = await Sharp(imageBuffer)
        .resize({
          width: 1200,
          height: 1200,
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85 })
        .toBuffer();
      
      // Definir cabeçalhos de cache e tipo de conteúdo
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 horas de cache
      
      // Enviar a imagem processada
      return res.send(processedImage);
    } catch (sharpError) {
      log(`Erro ao processar imagem com Sharp: ${sharpError}`, 'image-proxy');
      
      // Se o processamento falhar, tentar enviar a imagem original
      res.setHeader('Content-Type', imageResponse.headers.get('content-type') || 'image/jpeg');
      return res.send(imageBuffer);
    }
  } catch (error) {
    log(`Erro no proxy de imagem: ${error}`, 'image-proxy');
    return res.status(500).json({ error: 'Falha ao processar imagem' });
  }
});

export default router;