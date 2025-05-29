import fs from 'fs-extra';
import path from 'path';
import sharp from 'sharp';
import { db } from '../db';
import { media } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Serviço para gerenciar imagens do sistema (posts, campanhas, etc.)
 */
export class ImageService {
  private static UPLOADS_DIR = './uploads';
  
  /**
   * Salva uma imagem para um post e retorna o URL
   * @param imageBuffer Buffer da imagem
   * @param userId ID do usuário que está postando
   * @param fileName Nome do arquivo (opcional)
   */
  static async savePostImage(
    imageBuffer: Buffer, 
    userId: number, 
    fileName?: string
  ): Promise<string> {
    return this.saveImage(imageBuffer, userId, 'post', fileName);
  }
  
  /**
   * Salva uma imagem para uma campanha de contribuição e retorna o URL
   * @param imageBuffer Buffer da imagem
   * @param userId ID do usuário que está criando a campanha
   * @param fileName Nome do arquivo (opcional)
   */
  static async saveCampaignImage(
    imageBuffer: Buffer, 
    userId: number, 
    fileName?: string
  ): Promise<string> {
    return this.saveImage(imageBuffer, userId, 'campaign', fileName);
  }
  
  /**
   * Método unificado para salvar imagens de qualquer tipo
   * @param imageBuffer Buffer da imagem
   * @param userId ID do usuário
   * @param type Tipo da imagem (post, campaign, etc.)
   * @param fileName Nome do arquivo (opcional)
   */
  static async saveImage(
    imageBuffer: Buffer, 
    userId: number, 
    type: string = 'generic',
    fileName?: string
  ): Promise<string> {
    try {
      // Criar diretório se não existir
      if (!fs.existsSync(this.UPLOADS_DIR)) {
        fs.mkdirSync(this.UPLOADS_DIR, { recursive: true });
      }
      
      // Gerar nome do arquivo único
      const uniqueFileName = fileName || `${type}_${userId}_${Date.now()}.jpg`;
      const filePath = path.join(this.UPLOADS_DIR, uniqueFileName);
      
      // Processar e otimizar a imagem
      const optimizedImage = await sharp(imageBuffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      
      // Salvar no sistema de arquivos
      await fs.writeFile(filePath, optimizedImage);
      
      // Salvar no banco de dados
      const imageUrl = `/uploads/${uniqueFileName}`;
      
      // Obter dimensões da imagem
      const metadata = await sharp(optimizedImage).metadata();
      
      // Inserir metadados no banco de dados
      const [mediaRecord] = await db.insert(media).values({
        userId,
        title: uniqueFileName,
        description: `Imagem de ${type} carregada em ${new Date().toISOString()}`,
        mediaType: 'image',
        fileSize: optimizedImage.length,
        mimeType: 'image/jpeg',
        width: metadata.width || 0,
        height: metadata.height || 0,
        filePath,
        url: imageUrl,
        isPublic: true,
        data: optimizedImage.toString('base64'),
        isOptimized: true,
        originalSize: imageBuffer.length,
        isActive: true,
      }).returning();
      
      console.log(`Imagem salva: ID ${mediaRecord.id}, URL ${imageUrl}`);
      
      return imageUrl;
    } catch (error) {
      console.error(`Erro ao salvar imagem do ${type}:`, error);
      throw new Error('Falha ao processar imagem');
    }
  }

  /**
   * Carrega uma imagem do sistema de arquivos ou banco de dados
   * @param imageUrl URL da imagem
   */
  static async getImage(imageUrl: string): Promise<Buffer | null> {
    try {
      if (!imageUrl) return null;
      
      // Extrair nome do arquivo da URL
      const fileName = imageUrl.split('/').pop();
      if (!fileName) return null;
      
      // Verificar primeiro no banco de dados
      const mediaItems = await db.select().from(media)
        .where(eq(media.url, imageUrl));
      
      // Se encontrou no banco e tem dados binários, retornar
      if (mediaItems.length > 0 && mediaItems[0].data) {
        return Buffer.from(mediaItems[0].data, 'base64');
      }
      
      // Caso contrário, tentar buscar do sistema de arquivos
      const filePath = path.join(this.UPLOADS_DIR, fileName);
      
      if (fs.existsSync(filePath)) {
        return fs.readFile(filePath);
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao carregar imagem:', error);
      return null;
    }
  }
  
  /**
   * Carrega uma imagem pelo nome do arquivo
   * @param fileName Nome do arquivo
   */
  static async getImageByFileName(fileName: string): Promise<Buffer | null> {
    try {
      if (!fileName) return null;
      
      // Primeiro tentar encontrar no banco de dados
      const mediaItems = await db.select().from(media);
      const mediaItem = mediaItems.find(item => 
        item.url?.includes(fileName) || 
        item.filePath?.includes(fileName)
      );
      
      // Se encontrou no banco e tem dados binários, retornar
      if (mediaItem && mediaItem.data) {
        return Buffer.from(mediaItem.data, 'base64');
      }
      
      // Caso contrário, tentar buscar do sistema de arquivos
      const filePath = path.join(this.UPLOADS_DIR, fileName);
      
      if (fs.existsSync(filePath)) {
        return fs.readFile(filePath);
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao carregar imagem por nome de arquivo:', error);
      return null;
    }
  }
  
  /**
   * Migra todas as imagens do sistema de arquivos para o banco de dados
   */
  static async migrateAllImages(): Promise<{success: number, failed: number}> {
    try {
      console.log('Iniciando migração de imagens para o banco de dados...');
      
      let success = 0;
      let failed = 0;
      
      // Verificar se o diretório de uploads existe
      if (!fs.existsSync(this.UPLOADS_DIR)) {
        console.log('Diretório de uploads não encontrado');
        return { success, failed };
      }
      
      // Listar todos os arquivos no diretório de uploads
      const files = await fs.readdir(this.UPLOADS_DIR);
      const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
      });
      
      console.log(`Encontrados ${imageFiles.length} arquivos de imagem`);
      
      // Para cada arquivo, migrar para o banco de dados
      for (const file of imageFiles) {
        try {
          // Verificar se já existe no banco
          const fileName = file;
          const imageUrl = `/uploads/${fileName}`;
          
          const existingItems = await db.select().from(media)
            .where(eq(media.url, imageUrl));
            
          // Se já existe e tem dados, pular
          if (existingItems.length > 0 && existingItems[0].data) {
            console.log(`Imagem ${fileName} já existe no banco, pulando...`);
            success++;
            continue;
          }
          
          // Ler o arquivo
          const filePath = path.join(this.UPLOADS_DIR, file);
          const fileBuffer = await fs.readFile(filePath);
          
          // Obter metadados da imagem
          const metadata = await sharp(fileBuffer).metadata();
          
          // Inserir ou atualizar no banco
          if (existingItems.length > 0) {
            // Atualizar registro existente
            await db.update(media)
              .set({
                data: fileBuffer.toString('base64'),
                updatedAt: new Date()
              })
              .where(eq(media.id, existingItems[0].id));
              
            console.log(`Imagem ${fileName} atualizada no banco`);
          } else {
            // Criar novo registro
            await db.insert(media).values({
              userId: 1, // Usuário padrão do sistema
              title: fileName,
              description: `Imagem migrada de ${imageUrl}`,
              mediaType: 'image',
              fileSize: fileBuffer.length,
              mimeType: `image/${metadata.format || 'jpeg'}`,
              width: metadata.width || 0,
              height: metadata.height || 0,
              filePath,
              url: imageUrl,
              isPublic: true,
              data: fileBuffer.toString('base64'),
              isOptimized: false,
              originalSize: fileBuffer.length,
              isActive: true,
            });
            
            console.log(`Imagem ${fileName} migrada para o banco`);
          }
          
          success++;
        } catch (err) {
          console.error(`Erro ao migrar imagem ${file}:`, err);
          failed++;
        }
      }
      
      console.log(`Migração concluída: ${success} imagens migradas, ${failed} falhas`);
      return { success, failed };
    } catch (error) {
      console.error('Erro durante a migração de imagens:', error);
      return { success: 0, failed: 0 };
    }
  }
}