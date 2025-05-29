/**
 * Sistema de armazenamento em memória para interações de posts
 * Mantém os dados enquanto o servidor estiver rodando usando um padrão Singleton
 */

interface Interaction {
  userId: number;
  postId: number;
  type: 'like' | 'save' | 'comment';
  content?: string;
  timestamp: Date;
}

// Armazenamento global para manter dados entre reinicializações de rotas
// Isso ajuda a manter os dados mesmo quando partes do código são recarregadas
const globalInteractionsStore: Record<string, any> = global as any;

// Garantir que o storage existe globalmente
if (!globalInteractionsStore.__interactions) {
  globalInteractionsStore.__interactions = [];
  console.log('[MemInteractionsStorage] Inicializado armazenamento global de interações');
}

class MemInteractionsStorage {
  // Usar armazenamento global para persistir entre hot reloads
  private get interactions(): Interaction[] {
    return globalInteractionsStore.__interactions;
  }
  
  // Adicionar uma interação com comportamento de toggle para likes e saves
  addInteraction(userId: number, postId: number, type: 'like' | 'save' | 'comment', content?: string): boolean {
    // Para comentários, sempre adicionamos um novo
    if (type === 'comment') {
      this.interactions.push({
        userId,
        postId,
        type,
        content,
        timestamp: new Date()
      });
      console.log(`[MemInteractionsStorage] Adicionado comentário do usuário ${userId} no post ${postId}`);
      return true; // Indica que foi adicionado
    }
    
    // Para likes e saves, verificamos se já existe e aplicamos comportamento de toggle
    const existingIndex = this.interactions.findIndex(
      i => i.userId === userId && i.postId === postId && i.type === type
    );
    
    // Se já existe, removemos (comportamento de toggle)
    if (existingIndex >= 0) {
      this.interactions.splice(existingIndex, 1);
      console.log(`[MemInteractionsStorage] Toggle: Removida interação ${type} do usuário ${userId} no post ${postId}`);
      console.log(`[MemInteractionsStorage] Total de interações: ${this.interactions.length}`);
      return false; // Indica que foi removido
    }
    
    // Adicionar nova interação
    this.interactions.push({
      userId,
      postId,
      type,
      content,
      timestamp: new Date()
    });
    
    console.log(`[MemInteractionsStorage] Toggle: Adicionada interação ${type} do usuário ${userId} no post ${postId}`);
    console.log(`[MemInteractionsStorage] Total de interações: ${this.interactions.length}`);
    return true; // Indica que foi adicionado
  }
  
  // Remover uma interação específica
  removeInteraction(userId: number, postId: number, type: 'like' | 'save' | 'comment'): void {
    const index = this.interactions.findIndex(
      i => i.userId === userId && i.postId === postId && i.type === type
    );
    
    if (index >= 0) {
      this.interactions.splice(index, 1);
      console.log(`[MemInteractionsStorage] Removida interação ${type} do usuário ${userId} no post ${postId}`);
      console.log(`[MemInteractionsStorage] Total de interações: ${this.interactions.length}`);
    } else {
      console.log(`[MemInteractionsStorage] Tentativa de remover interação inexistente: ${type} usuário ${userId} post ${postId}`);
    }
  }
  
  // Verificar se um usuário interagiu com um post
  hasInteraction(userId: number, postId: number, type: 'like' | 'save' | 'comment'): boolean {
    const result = this.interactions.some(
      i => i.userId === userId && i.postId === postId && i.type === type
    );
    
    console.log(`[MemInteractionsStorage] Verificando se usuário ${userId} tem interação ${type} no post ${postId}: ${result}`);
    return result;
  }
  
  // Obter contagem de likes para um post
  getLikesCount(postId: number): number {
    const count = this.interactions.filter(i => i.postId === postId && i.type === 'like').length;
    console.log(`[MemInteractionsStorage] Contagem de likes para post ${postId}: ${count}`);
    return count;
  }
  
  // Obter contagem de comentários para um post
  getCommentsCount(postId: number): number {
    const count = this.interactions.filter(i => i.postId === postId && i.type === 'comment').length;
    console.log(`[MemInteractionsStorage] Contagem de comentários para post ${postId}: ${count}`);
    return count;
  }
  
  // Obter todos os comentários para um post
  getComments(postId: number): {userId: number, content: string, timestamp: Date}[] {
    const comments = this.interactions
      .filter(i => i.postId === postId && i.type === 'comment' && i.content)
      .map(({ userId, content, timestamp }) => ({ 
        userId, 
        content: content || '', 
        timestamp 
      }))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Mais recentes primeiro
    
    console.log(`[MemInteractionsStorage] Retornando ${comments.length} comentários para o post ${postId}`);
    return comments;
  }
  
  // Obter todos os posts salvos por um usuário
  getSavedPostIds(userId: number): number[] {
    const savedIds = this.interactions
      .filter(i => i.userId === userId && i.type === 'save')
      .map(i => i.postId);
    
    console.log(`[MemInteractionsStorage] Usuário ${userId} tem ${savedIds.length} posts salvos: ${savedIds.join(', ')}`);
    return savedIds;
  }
  
  // Obter posts curtidos por um usuário
  getLikedPostIds(userId: number): number[] {
    const likedIds = this.interactions
      .filter(i => i.userId === userId && i.type === 'like')
      .map(i => i.postId);
    
    console.log(`[MemInteractionsStorage] Usuário ${userId} tem ${likedIds.length} posts curtidos: ${likedIds.join(', ')}`);
    return likedIds;
  }
  
  // Método de diagnóstico para verificar o estado do armazenamento
  debugStorage(): void {
    console.log(`[MemInteractionsStorage] === DIAGNÓSTICO DO ARMAZENAMENTO ===`);
    console.log(`[MemInteractionsStorage] Total de interações: ${this.interactions.length}`);
    
    const likes = this.interactions.filter(i => i.type === 'like').length;
    const saves = this.interactions.filter(i => i.type === 'save').length;
    const comments = this.interactions.filter(i => i.type === 'comment').length;
    
    console.log(`[MemInteractionsStorage] Curtidas: ${likes}, Salvamentos: ${saves}, Comentários: ${comments}`);
  }
}

// Exportar uma instância única para ser usada em toda a aplicação
export const memInteractions = new MemInteractionsStorage();