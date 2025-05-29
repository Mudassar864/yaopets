import fs from 'fs-extra';
import path from 'path';
import sharp from 'sharp';
import { db } from '../db';
import { media } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Classe para processar imagens e salvá-las no banco de dados
 */
export class ImageProcessor {
  /**
   * Salva uma imagem no banco de dados a partir de um arquivo
   * @param filePath Caminho do arquivo
   * @param userId ID do usuário
   * @param options Opções adicionais
   * @returns ID da mídia criada
   */
  static async saveImageToDB(
    filePath: string,
    userId: number,
    options: {
      title?: string;
      description?: string;
      isPublic?: boolean;
    } = {}
  ): Promise<number> {
    try {
      // Ler o arquivo
      const fileBuffer = await fs.readFile(filePath);
      
      // Obter informações do arquivo
      const fileStats = await fs.stat(filePath);
      const fileSize = fileStats.size;
      
      // Obter dimensões da imagem
      let width = 0;
      let height = 0;
      try {
        const metadata = await sharp(fileBuffer).metadata();
        width = metadata.width || 0;
        height = metadata.height || 0;
      } catch (err) {
        console.error('Erro ao obter dimensões da imagem:', err);
      }
      
      // Determinar tipo MIME baseado na extensão
      const ext = path.extname(filePath).toLowerCase();
      let mimeType = 'application/octet-stream'; // Padrão
      
      if (['.jpg', '.jpeg'].includes(ext)) {
        mimeType = 'image/jpeg';
      } else if (ext === '.png') {
        mimeType = 'image/png';
      } else if (ext === '.gif') {
        mimeType = 'image/gif';
      } else if (ext === '.webp') {
        mimeType = 'image/webp';
      } else if (ext === '.svg') {
        mimeType = 'image/svg+xml';
      } else if (ext === '.mp4') {
        mimeType = 'video/mp4';
      }
      
      // Converter para base64
      const base64Data = fileBuffer.toString('base64');
      
      // Gerar URL pública 
      const fileName = path.basename(filePath);
      const url = `/uploads/${fileName}`;
      
      // Inserir no banco de dados
      const [result] = await db.insert(media).values({
        userId,
        title: options.title || fileName,
        description: options.description,
        mediaType: mimeType.startsWith('image/') ? 'image' : 'video',
        fileSize,
        mimeType,
        width,
        height,
        filePath,
        url,
        isPublic: options.isPublic !== false,
        data: base64Data,
        isOptimized: false,
        originalSize: fileSize,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      return result.id;
    } catch (error) {
      console.error('Erro ao salvar imagem no banco de dados:', error);
      throw error;
    }
  }
  
  /**
   * Obter uma imagem do banco de dados por ID
   * @param id ID da mídia
   * @returns Buffer da imagem
   */
  static async getImageFromDB(id: number): Promise<{ buffer: Buffer, mimeType: string } | null> {
    try {
      const [mediaItem] = await db.select().from(media).where(eq(media.id, id));
      
      if (!mediaItem || !mediaItem.data) {
        return null;
      }
      
      // Converter de base64 para buffer
      const buffer = Buffer.from(mediaItem.data, 'base64');
      
      return {
        buffer,
        mimeType: mediaItem.mimeType
      };
    } catch (error) {
      console.error('Erro ao obter imagem do banco de dados:', error);
      return null;
    }
  }
  
  /**
   * Obter uma imagem do banco de dados por nome de arquivo
   * @param filename Nome do arquivo
   */
  static async getImageByFilename(filename: string): Promise<{ buffer: Buffer, mimeType: string } | null> {
    try {
      const allMedia = await db.select().from(media);
      
      // Encontrar o item de mídia que corresponde ao nome do arquivo
      const mediaItem = allMedia.find(item => {
        if (!item.url) return false;
        return path.basename(item.url) === filename || 
               item.url.includes(filename) || 
               (item.filePath && path.basename(item.filePath) === filename);
      });
      
      if (!mediaItem || !mediaItem.data) {
        return null;
      }
      
      // Converter de base64 para buffer
      const buffer = Buffer.from(mediaItem.data, 'base64');
      
      return {
        buffer,
        mimeType: mediaItem.mimeType
      };
    } catch (error) {
      console.error('Erro ao obter imagem por nome de arquivo:', error);
      return null;
    }
  }
  
  /**
   * Migrar todas as imagens da pasta uploads para o banco de dados
   */
  static async migrateImagesToDatabase(): Promise<{ success: number, failed: number }> {
    const UPLOADS_DIR = './uploads';
    let success = 0;
    let failed = 0;
    
    try {
      // Verificar se a pasta existe
      if (!fs.existsSync(UPLOADS_DIR)) {
        console.log('Pasta de uploads não encontrada');
        return { success, failed };
      }
      
      // Listar todos os arquivos de forma recursiva
      const walk = (dir: string): string[] => {
        let results: string[] = [];
        const list = fs.readdirSync(dir);
        
        list.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat && stat.isDirectory() && file !== 'temp' && file !== 'optimized') {
            // Se for um diretório válido, percorrer recursivamente
            results = results.concat(walk(filePath));
          } else if (stat && stat.isFile() && !file.startsWith('.')) {
            // Verificar se é um arquivo de imagem ou vídeo
            const ext = path.extname(file).toLowerCase();
            const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.mp4'];
            
            if (validExtensions.includes(ext)) {
              results.push(filePath);
            }
          }
        });
        
        return results;
      };
      
      const files = walk(UPLOADS_DIR);
      console.log(`Encontrados ${files.length} arquivos para migrar`);
      
      // Para cada arquivo, adicionar ao banco de dados se ainda não existir
      for (const file of files) {
        const fileName = path.basename(file);
        const url = file.replace('./', '/');
        
        try {
          // Verificar se o arquivo já existe no banco de dados
          const allMedia = await db.select().from(media);
          const existingMedia = allMedia.find(item => 
            (item.url && item.url.includes(fileName)) || 
            (item.filePath && item.filePath.includes(fileName))
          );
          
          if (existingMedia) {
            // Se existir mas não tiver dados binários, atualizar
            if (!existingMedia.data) {
              const fileBuffer = await fs.readFile(file);
              const base64Data = fileBuffer.toString('base64');
              
              await db.update(media)
                .set({ 
                  data: base64Data,
                  updatedAt: new Date()
                })
                .where(eq(media.id, existingMedia.id));
                
              console.log(`Arquivo ${fileName} atualizado no banco de dados com dados binários`);
            } else {
              console.log(`Arquivo ${fileName} já existe no banco de dados. Pulando...`);
            }
          } else {
            // Se não existir, adicionar
            await this.saveImageToDB(file, 1, { 
              title: fileName,
              description: `Arquivo migrado de ${url}`
            });
            console.log(`Arquivo ${fileName} migrado para o banco de dados`);
          }
          
          success++;
        } catch (error) {
          console.error(`Erro ao migrar arquivo ${file}:`, error);
          failed++;
        }
      }
      
      return { success, failed };
    } catch (error) {
      console.error('Erro durante a migração de imagens:', error);
      return { success, failed };
    }
  }
}