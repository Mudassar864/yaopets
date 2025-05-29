import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { db } from '../db';
import { media } from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';

// Configurações para otimização de imagens
const IMAGE_QUALITY = 80; // Qualidade JPEG/WebP entre 0-100
const MAX_WIDTH = 1080; // Largura máxima das imagens (estilo Instagram)
const MAX_STORY_WIDTH = 720; // Largura para stories
const THUMBNAIL_WIDTH = 320; // Largura para thumbnails
const WEBP_QUALITY = 75; // Qualidade para WebP
const STORAGE_DIR = path.join(process.cwd(), 'uploads');

// Garantir que o diretório de uploads existe
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Garantir que o diretório de thumbs existe
const THUMBS_DIR = path.join(STORAGE_DIR, 'thumbs');
if (!fs.existsSync(THUMBS_DIR)) {
  fs.mkdirSync(THUMBS_DIR, { recursive: true });
}

// Garantir que o diretório de webp existe
const WEBP_DIR = path.join(STORAGE_DIR, 'webp');
if (!fs.existsSync(WEBP_DIR)) {
  fs.mkdirSync(WEBP_DIR, { recursive: true });
}

// Mapeamento de MIME types para extensões
const mimeToExt: { [key: string]: string } = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mp4', // Convenção para converter MOV para MP4
  'video/webm': 'mp4' // Convenção para converter WebM para MP4
};

export interface OptimizedMedia {
  originalUrl: string;
  optimizedUrl: string;
  thumbnailUrl: string;
  webpUrl: string;
  width: number;
  height: number;
  size: number;
  format: string;
  metadata: any;
}

export class MediaOptimizer {
  /**
   * Otimiza uma imagem a partir de um buffer
   * @param buffer Buffer da imagem original
   * @param mimetype MIME type do arquivo
   * @param isStory Se é uma imagem para story (dimensões diferentes)
   * @returns Dados da mídia otimizada
   */
  static async optimizeImage(
    buffer: Buffer, 
    mimetype: string, 
    isStory: boolean = false,
    userId: number,
    originalFilename?: string
  ): Promise<OptimizedMedia> {
    // Gerar nomes de arquivo baseados em UUID para evitar conflitos
    const fileId = uuidv4();
    const ext = mimeToExt[mimetype] || 'jpg';
    const originalFilePath = path.join(STORAGE_DIR, `original_${fileId}.${ext}`);
    const optimizedFilePath = path.join(STORAGE_DIR, `optimized_${fileId}.jpg`);
    const thumbnailFilePath = path.join(THUMBS_DIR, `thumb_${fileId}.jpg`);
    const webpFilePath = path.join(WEBP_DIR, `webp_${fileId}.webp`);
    
    // Salvar arquivo original
    await fs.promises.writeFile(originalFilePath, buffer);
    
    // Carregar imagem com sharp
    let image = sharp(buffer);
    
    // Obter metadados da imagem
    const metadata = await image.metadata();
    
    // Determinar dimensões para redimensionamento
    const maxWidth = isStory ? MAX_STORY_WIDTH : MAX_WIDTH;
    let width = metadata.width || maxWidth;
    let height = metadata.height || width;
    
    // Calcular novas dimensões proporcionais se a largura exceder o máximo
    if (width > maxWidth) {
      const ratio = maxWidth / width;
      width = maxWidth;
      height = Math.round(height * ratio);
    }
    
    // Otimizar imagem principal (JPEG de alta qualidade)
    await image
      .resize(width, height, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: IMAGE_QUALITY, progressive: true, force: false })
      .toFile(optimizedFilePath);
    
    // Criar thumbnail
    await image
      .resize(THUMBNAIL_WIDTH, null, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 70, progressive: true, force: false })
      .toFile(thumbnailFilePath);
    
    // Criar versão WebP (para navegadores modernos)
    await image
      .resize(width, height, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toFile(webpFilePath);
    
    // Obter tamanho do arquivo otimizado
    const stats = await fs.promises.stat(optimizedFilePath);
    
    // Construir URLs relativas
    const originalUrl = `/uploads/original_${fileId}.${ext}`;
    const optimizedUrl = `/uploads/optimized_${fileId}.jpg`;
    const thumbnailUrl = `/uploads/thumbs/thumb_${fileId}.jpg`;
    const webpUrl = `/uploads/webp/webp_${fileId}.webp`;
    
    // Salvar registro no banco de dados
    await db.insert(media).values({
      userId: userId,
      originalFilename: originalFilename || `file-${fileId}.${ext}`,
      storagePath: optimizedFilePath,
      url: optimizedUrl,
      thumbnailUrl: thumbnailUrl,
      webpUrl: webpUrl,
      mimeType: 'image/jpeg',
      fileSize: stats.size,
      width: width,
      height: height,
      isPublic: true,
      createdAt: new Date(),
      metadata: JSON.stringify({
        originalFormat: metadata.format,
        originalWidth: metadata.width,
        originalHeight: metadata.height
      })
    });
    
    return {
      originalUrl,
      optimizedUrl,
      thumbnailUrl,
      webpUrl,
      width,
      height,
      size: stats.size,
      format: 'jpeg',
      metadata
    };
  }
  
  /**
   * Armazena uma imagem otimizada como dado binário no banco de dados
   */
  static async storeImageToDatabase(
    buffer: Buffer, 
    mimetype: string, 
    userId: number,
    originalFilename?: string
  ): Promise<string> {
    try {
      // Primeiro, otimizar a imagem para um tamanho adequado
      let image = sharp(buffer);
      const metadata = await image.metadata();
      
      // Redimensionar para um tamanho razoável
      let width = metadata.width || MAX_WIDTH;
      let height = metadata.height || width;
      
      if (width > MAX_WIDTH) {
        const ratio = MAX_WIDTH / width;
        width = MAX_WIDTH;
        height = Math.round(height * ratio);
      }
      
      // Comprimir como JPEG
      const optimizedBuffer = await image
        .resize(width, height, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: IMAGE_QUALITY, progressive: true })
        .toBuffer();
      
      // Gerar identificador único
      const fileId = uuidv4();
      
      // Inserir no banco de dados com o buffer binário
      const [mediaRecord] = await db.insert(media).values({
        userId: userId,
        originalFilename: originalFilename || `file-${fileId}.jpg`,
        binaryData: optimizedBuffer,
        mimeType: 'image/jpeg',
        fileSize: optimizedBuffer.length,
        width: width,
        height: height,
        isPublic: true,
        createdAt: new Date(),
        metadata: JSON.stringify({
          originalFormat: metadata.format,
          originalWidth: metadata.width,
          originalHeight: metadata.height
        })
      }).returning();
      
      // Retornar URL que pode ser usada para recuperar a imagem
      return `/api/media-db/${mediaRecord.id}`;
    } catch (error) {
      console.error('Erro ao armazenar imagem no banco de dados:', error);
      throw new Error('Falha ao processar a imagem para o banco de dados');
    }
  }
  
  /**
   * Converte uma imagem em formato base64 para uso direto em atributos src
   */
  static async imageToBase64(buffer: Buffer, mimetype: string): Promise<string> {
    try {
      // Otimizar a imagem antes de converter para base64
      const optimizedBuffer = await sharp(buffer)
        .resize(MAX_WIDTH, null, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer();
      
      // Converter o buffer para base64
      const base64Image = optimizedBuffer.toString('base64');
      
      // Retornar como string Data URL
      return `data:image/jpeg;base64,${base64Image}`;
    } catch (error) {
      console.error('Erro ao converter imagem para base64:', error);
      return ''; // Retorna string vazia em caso de erro
    }
  }
  
  /**
   * Gera uma URL para uma imagem de post
   * Usado principalmente para dados de teste ou demonstração
   */
  static generateDummyImageUrl(userId: number, postId?: number): string {
    const placeholderCategories = ['animals', 'cats', 'dogs', 'nature'];
    const category = placeholderCategories[Math.floor(Math.random() * placeholderCategories.length)];
    
    // Usar um serviço externo de placeholder para fins de demonstração
    if (postId) {
      return `https://placeimg.com/640/480/${category}?id=${postId}`;
    } else {
      return `https://placeimg.com/640/480/${category}?user=${userId}&t=${Date.now()}`;
    }
  }
}

// Criar endpoints para expor este serviço
export function createOptimizedImageEndpoints(app: any) {
  // Rota para obter URLs de mídia otimizada para teste
  app.get('/api/media-optimizer/dummy', (req: any, res: any) => {
    const userId = req.query.userId || 1;
    const postId = req.query.postId;
    
    const dummyUrl = MediaOptimizer.generateDummyImageUrl(parseInt(userId as string), postId ? parseInt(postId as string) : undefined);
    
    res.json({
      url: dummyUrl,
      thumbnailUrl: dummyUrl.replace('640/480', '320/240'),
      webpUrl: dummyUrl
    });
  });
}