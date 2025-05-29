import { eq, like, desc } from 'drizzle-orm';
import path from 'path';
import { db } from '../db';
import { media, type Media, type InsertMedia } from '@shared/schema';

// Métodos para manipulação de mídia no banco de dados
export const MediaStorageMethods = {
  // Obter mídia por ID
  async getMedia(id: number): Promise<Media | undefined> {
    try {
      const [result] = await db.select().from(media).where(eq(media.id, id));
      return result;
    } catch (error) {
      console.error('Erro ao buscar mídia por ID:', error);
      return undefined;
    }
  },

  // Obter mídia por usuário
  async getMediaByUser(userId: number): Promise<Media[]> {
    try {
      return await db.select().from(media).where(eq(media.userId, userId));
    } catch (error) {
      console.error('Erro ao buscar mídia do usuário:', error);
      return [];
    }
  },

  // Obter mídia por URL
  async getMediaByUrl(url: string): Promise<Media | undefined> {
    try {
      const [result] = await db.select().from(media).where(eq(media.url, url));
      return result;
    } catch (error) {
      console.error('Erro ao buscar mídia por URL:', error);
      return undefined;
    }
  },

  // Obter todas as mídias
  async getAllMedia(): Promise<Media[]> {
    try {
      return await db.select().from(media);
    } catch (error) {
      console.error('Erro ao buscar todas as mídias:', error);
      return [];
    }
  },

  // Obter mídia por nome de arquivo
  async getMediaByFilename(filename: string): Promise<Media | undefined> {
    try {
      const results = await db
        .select()
        .from(media)
        .where(like(media.url, `%${filename}%`));

      if (results.length === 0) {
        return undefined;
      }

      // Filtrar para encontrar a correspondência exata
      const exactMatch = results.find((item) => {
        if (!item.url) return false;
        return path.basename(item.url) === filename;
      });

      return exactMatch || results[0];
    } catch (error) {
      console.error('Erro ao buscar mídia por nome de arquivo:', error);
      return undefined;
    }
  },

  // Criar mídia
  async createMedia(mediaData: InsertMedia): Promise<Media> {
    try {
      const [result] = await db.insert(media).values(mediaData).returning();
      return result;
    } catch (error) {
      console.error('Erro ao criar mídia:', error);
      throw error;
    }
  },

  // Atualizar mídia
  async updateMedia(id: number, data: Partial<Media>): Promise<Media | undefined> {
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
  },

  // Excluir mídia
  async deleteMedia(id: number): Promise<boolean> {
    try {
      await db.delete(media).where(eq(media.id, id));
      return true;
    } catch (error) {
      console.error('Erro ao excluir mídia:', error);
      return false;
    }
  }
};