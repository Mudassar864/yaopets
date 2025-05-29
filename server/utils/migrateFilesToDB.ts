import fs from 'fs-extra';
import path from 'path';
import { db } from '../db';
import { media } from '@shared/schema';
import { storage } from '../storage';
import sharp from 'sharp';

// Função para obter as dimensões de uma imagem
async function getImageSize(imagePath: string): Promise<{ width: number; height: number }> {
  try {
    const metadata = await sharp(imagePath).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0
    };
  } catch (error) {
    console.error(`Erro ao obter dimensões da imagem: ${error}`);
    return { width: 0, height: 0 };
  }
}

/**
 * Função para migrar imagens da pasta uploads para o banco de dados
 * Esta função pode ser chamada manualmente para migrar as imagens existentes
 */
export async function migrateFilesToDB() {
  console.log('Iniciando migração de arquivos para o banco de dados...');
  
  const UPLOADS_DIR = './uploads';
  
  try {
    // Verificar se a pasta existe
    if (!fs.existsSync(UPLOADS_DIR)) {
      console.log('Pasta de uploads não encontrada');
      return;
    }
    
    // Listar todos os arquivos na pasta uploads (não recursivamente)
    const files = fs.readdirSync(UPLOADS_DIR).filter(file => {
      // Ignorar diretórios e arquivos temporários
      const stats = fs.statSync(path.join(UPLOADS_DIR, file));
      return stats.isFile() && !file.startsWith('.') && !file.includes('temp');
    });
    
    console.log(`Encontrados ${files.length} arquivos para migrar`);
    
    // Para cada arquivo, ler e inserir no banco de dados
    for (const file of files) {
      const filePath = path.join(UPLOADS_DIR, file);
      
      // Verificar se o arquivo já existe no banco de dados pela URL
      const existingMedia = await storage.getMediaByUrl(`/uploads/${file}`);
      
      if (existingMedia) {
        console.log(`Arquivo ${file} já existe no banco de dados. Atualizando...`);
        
        // Ler o arquivo
        const fileBuffer = await fs.readFile(filePath);
        const base64Data = fileBuffer.toString('base64');
        
        // Atualizar o registro existente para incluir os dados binários
        await db.update(media)
          .set({ 
            data: base64Data,
            updatedAt: new Date()
          })
          .where(`id = ${existingMedia.id}`);
          
        console.log(`Arquivo ${file} atualizado no banco de dados com dados binários`);
      } else {
        console.log(`Migrando arquivo: ${file}`);
        
        // Ler o arquivo
        const fileBuffer = await fs.readFile(filePath);
        const fileStats = fs.statSync(filePath);
        const fileSize = fileStats.size;
        
        // Determinar o tipo MIME com base na extensão
        const ext = path.extname(file).toLowerCase();
        let mimeType = 'application/octet-stream'; // Padrão
        let mediaType = 'image'; // Padrão
        
        // Mapear extensões comuns para tipos MIME
        if (['.jpg', '.jpeg'].includes(ext)) {
          mimeType = 'image/jpeg';
        } else if (ext === '.png') {
          mimeType = 'image/png';
        } else if (ext === '.gif') {
          mimeType = 'image/gif';
        } else if (ext === '.webp') {
          mimeType = 'image/webp';
        } else if (ext === '.mp4') {
          mimeType = 'video/mp4';
          mediaType = 'video';
        } else if (ext === '.webm') {
          mimeType = 'video/webm';
          mediaType = 'video';
        }
        
        // Obter dimensões para imagens
        let width, height;
        if (mediaType === 'image') {
          try {
            const dimensions = await getImageSize(filePath);
            width = dimensions.width;
            height = dimensions.height;
          } catch (error) {
            console.error(`Erro ao obter dimensões da imagem ${file}:`, error);
          }
        }
        
        // Inserir no banco de dados
        // Usar um ID de usuário temporário para imagens sem proprietário
        const defaultUserId = 1; // ID do usuário de sistema ou admin
        
        // Converter para base64
        const base64Data = fileBuffer.toString('base64');
        
        // Inserir no banco de dados
        await storage.createMedia({
          userId: defaultUserId,
          title: file,
          description: `Arquivo migrado de ${filePath}`,
          mediaType,
          fileSize,
          mimeType,
          width,
          height,
          filePath,
          url: `/uploads/${file}`,
          isPublic: true,
          data: base64Data,
          isOptimized: false,
          originalSize: fileSize,
          isActive: true,
        });
        
        console.log(`Arquivo ${file} migrado para o banco de dados`);
      }
    }
    
    console.log('Migração concluída!');
  } catch (error) {
    console.error('Erro durante a migração de arquivos:', error);
    throw error;
  }
}

/**
 * Função para obter mídia do banco de dados por URL
 */
export async function getMediaByUrl(url: string) {
  try {
    const allMedia = await storage.getAllMedia();
    return allMedia.find(m => m.url === url);
  } catch (error) {
    console.error('Erro ao buscar mídia por URL:', error);
    return null;
  }
}