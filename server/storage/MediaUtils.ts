import { eq, like, desc } from 'drizzle-orm';
import path from 'path';
import { db } from '../db';
import { media, type Media, type InsertMedia } from '@shared/schema';

/**
 * Classe de utilidades para manipulação de mídia no banco de dados
 * Fornece métodos para criar, recuperar, atualizar e excluir mídias
 */
export class MediaUtils {
  /**
   * Retorna uma mídia pelo ID
   */
  static async getMedia(id: number): Promise<Media | undefined> {
    try {
      const [result] = await db.select().from(media).where(eq(media.id, id));
      return result;
    } catch (error) {
      console.error('Erro ao buscar mídia por ID:', error);
      return undefined;
    }
  }

  /**
   * Retorna todas as mídias de um usuário
   */
  static async getMediaByUser(userId: number): Promise<Media[]> {
    try {
      return await db.select().from(media).where(eq(media.userId, userId));
    } catch (error) {
      console.error('Erro ao buscar mídias do usuário:', error);
      return [];
    }
  }

  /**
   * Retorna uma mídia pela URL
   */
  static async getMediaByUrl(url: string): Promise<Media | undefined> {
    try {
      const [result] = await db.select().from(media).where(eq(media.url, url));
      return result;
    } catch (error) {
      console.error('Erro ao buscar mídia por URL:', error);
      return undefined;
    }
  }

  /**
   * Retorna todas as mídias
   */
  static async getAllMedia(): Promise<Media[]> {
    try {
      return await db.select().from(media).orderBy(desc(media.createdAt));
    } catch (error) {
      console.error('Erro ao buscar todas as mídias:', error);
      return [];
    }
  }

  /**
   * Retorna uma mídia pelo nome do arquivo
   */
  static async getMediaByFilename(filename: string): Promise<Media | undefined> {
    try {
      // Buscar pela URL ou filePath que contenha o nome do arquivo
      const results = await db.select().from(media).where(
        like(media.url, `%${filename}%`)
      );

      if (results.length === 0) {
        return undefined;
      }

      // Encontrar a correspondência mais próxima (exata, se possível)
      return results.find(item => {
        const itemFilename = path.basename(item.url || '');
        return itemFilename === filename;
      }) || results[0]; // Se não encontrar correspondência exata, retornar o primeiro item
    } catch (error) {
      console.error('Erro ao buscar mídia por nome de arquivo:', error);
      return undefined;
    }
  }

  /**
   * Cria uma nova mídia
   */
  static async createMedia(mediaData: InsertMedia): Promise<Media> {
    try {
      const [result] = await db.insert(media).values(mediaData).returning();
      return result;
    } catch (error) {
      console.error('Erro ao criar mídia:', error);
      throw error;
    }
  }

  /**
   * Atualiza uma mídia existente
   */
  static async updateMedia(id: number, data: Partial<Media>): Promise<Media | undefined> {
    try {
      const [result] = await db
        .update(media)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(media.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error('Erro ao atualizar mídia:', error);
      return undefined;
    }
  }

  /**
   * Exclui uma mídia
   */
  static async deleteMedia(id: number): Promise<boolean> {
    try {
      await db.delete(media).where(eq(media.id, id));
      return true;
    } catch (error) {
      console.error('Erro ao excluir mídia:', error);
      return false;
    }
  }
}