import { db } from "../db";
import { eq } from "drizzle-orm";
import { media, type Media, type InsertMedia } from "@shared/schema";

/**
 * Implementação de operações de media storage
 */
export class MediaStorage {
  /**
   * Retorna a mídia com o ID especificado
   */
  async getMedia(id: number): Promise<Media | undefined> {
    try {
      const [result] = await db.select().from(media).where(eq(media.id, id));
      return result;
    } catch (error) {
      console.error("Erro ao buscar mídia:", error);
      return undefined;
    }
  }

  /**
   * Retorna todas as mídias do usuário especificado
   */
  async getMediaByUser(userId: number): Promise<Media[]> {
    try {
      return await db.select().from(media).where(eq(media.userId, userId));
    } catch (error) {
      console.error("Erro ao buscar mídias do usuário:", error);
      return [];
    }
  }

  /**
   * Cria um novo registro de mídia
   */
  async createMedia(mediaData: InsertMedia): Promise<Media> {
    try {
      const [result] = await db.insert(media).values(mediaData).returning();
      return result;
    } catch (error) {
      console.error("Erro ao criar mídia:", error);
      throw error;
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
    } catch (error) {
      console.error("Erro ao atualizar mídia:", error);
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
    } catch (error) {
      console.error("Erro ao excluir mídia:", error);
      return false;
    }
  }
}