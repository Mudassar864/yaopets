import { db } from "../db";
import { media, type Media, type InsertMedia } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Classe para gerenciar o armazenamento de mídia no banco de dados
 * Esta classe garante persistência das imagens e vídeos
 */
export class MediaStorageDB {
  /**
   * Busca uma mídia específica por ID
   */
  async getMedia(id: number): Promise<Media | undefined> {
    try {
      const [result] = await db.select().from(media).where(eq(media.id, id));
      return result;
    } catch (error: any) {
      console.error("Erro ao buscar mídia:", error.message);
      return undefined;
    }
  }
  
  /**
   * Busca todas as mídias de um usuário
   */
  async getMediaByUser(userId: number): Promise<Media[]> {
    try {
      const results = await db.select().from(media).where(eq(media.userId, userId));
      return results || [];
    } catch (error: any) {
      console.error("Erro ao buscar mídias do usuário:", error.message);
      return [];
    }
  }
  
  /**
   * Busca todas as mídias no sistema
   */
  async getAllMedia(): Promise<Media[]> {
    try {
      const results = await db.select().from(media);
      return results || [];
    } catch (error: any) {
      console.error("Erro ao buscar todas as mídias:", error.message);
      return [];
    }
  }
  
  /**
   * Cria um novo registro de mídia no banco de dados
   */
  async createMedia(mediaData: InsertMedia): Promise<Media> {
    try {
      const [result] = await db.insert(media).values(mediaData).returning();
      
      console.log(`Mídia armazenada com sucesso! ID: ${result.id}, Tamanho: ${mediaData.fileSize} bytes`);
      
      if (mediaData.isOptimized) {
        console.log(`Imagem otimizada: tamanho original ${mediaData.originalSize} bytes, redução de ${
          ((mediaData.originalSize! - mediaData.fileSize) / mediaData.originalSize!) * 100
        }%`);
      }
      
      return result;
    } catch (error: any) {
      console.error("Erro ao criar registro de mídia:", error.message);
      throw new Error(`Falha ao armazenar mídia: ${error.message}`);
    }
  }
  
  /**
   * Atualiza um registro de mídia existente
   */
  async updateMedia(id: number, data: Partial<Media>): Promise<Media | undefined> {
    try {
      const [result] = await db
        .update(media)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(media.id, id))
        .returning();
      
      return result;
    } catch (error: any) {
      console.error("Erro ao atualizar mídia:", error.message);
      return undefined;
    }
  }
  
  /**
   * Remove um registro de mídia
   */
  async deleteMedia(id: number): Promise<boolean> {
    try {
      const [result] = await db
        .delete(media)
        .where(eq(media.id, id))
        .returning({ id: media.id });
      
      return !!result;
    } catch (error: any) {
      console.error("Erro ao excluir mídia:", error.message);
      return false;
    }
  }
}

// Instância para uso em toda a aplicação
export const mediaStorage = new MediaStorageDB();