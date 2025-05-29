/**
 * Sistema de gerenciamento de interações que persiste no PostgreSQL
 * e usa localStorage como cache para operações offline/rápidas
 */
import { queryClient } from "../lib/queryClient";

interface LocalInteraction {
  postId: number;
  type: 'like' | 'save' | 'comment' | 'comment_like';
  timestamp: number;
  // Campos adicionais para comentários
  commentId?: number;
  content?: string;
  parentId?: number; // Para respostas a comentários
}

const STORAGE_KEY = 'yaopets_interactions';

/**
 * Classe para gerenciar interações no PostgreSQL com cache local
 */
class UserInteractionsManager {
  private userId: number | null = null;
  
  /**
   * Define o ID do usuário atual
   */
  setUserId(userId: number): void {
    this.userId = userId;
    console.log(`[Interações] ID do usuário ${userId} configurado`);
    // Carregar dados do servidor para o cache local ao definir o usuário
    this.loadInteractionsFromServer();
  }
  
  /**
   * Carrega as interações do servidor para o cache local
   */
  private async loadInteractionsFromServer(): Promise<void> {
    if (!this.userId) return;
    
    try {
      // Fazer uma chamada à API única para obter todas as interações
      // A API agora recupera automaticamente as interações do usuário autenticado
      const response = await fetch('/api/interactions', {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Falha ao buscar interações');
      const allInteractions = await response.json();
      
      // Como fallback, buscar por tipo específico se a API unificada falhar
      if (!allInteractions || allInteractions.error) {
        console.log('[Interações] Usando fallback para busca de interações por tipo');
        
        // Fazer uma chamada à API para obter interações de likes
        const likesResponse = await fetch('/api/interactions/likes?userId=' + this.userId, {
          credentials: 'include'
        });
        if (!likesResponse.ok) throw new Error('Falha ao buscar likes');
        const likes = await likesResponse.json();
        
        // Fazer uma chamada à API para obter interações de salvamentos
        const savesResponse = await fetch('/api/interactions/saved?userId=' + this.userId, {
          credentials: 'include'
        });
        if (!savesResponse.ok) throw new Error('Falha ao buscar salvos');
        const saves = await savesResponse.json();
        
        // Fazer uma chamada à API para obter comentários
        const commentsResponse = await fetch('/api/interactions/comments?userId=' + this.userId, {
          credentials: 'include'
        });
        const comments = commentsResponse.ok ? await commentsResponse.json() : [];
        
        // Combinar e armazenar no localStorage
        const interactions: LocalInteraction[] = [
          ...likes.map((like: any) => ({
            postId: like.postId,
            type: 'like' as const,
            timestamp: new Date(like.createdAt).getTime()
          })),
          ...saves.map((save: any) => ({
            postId: save.postId,
            type: 'save' as const,
            timestamp: new Date(save.createdAt).getTime()
          })),
          ...comments.map((comment: any) => ({
            postId: comment.postId,
            commentId: comment.id,
            type: 'comment' as const,
            content: comment.content,
            timestamp: new Date(comment.createdAt).getTime()
          }))
        ];
        
        this.saveUserInteractions(interactions);
        console.log(`[Interações] ${interactions.length} interações carregadas do servidor (fallback)`);
        return;
      }
      
      // Se a API unificada funcionar, usar seus dados
      const interactions: LocalInteraction[] = allInteractions.map((interaction: any) => {
        const baseInteraction = {
          postId: interaction.postId,
          type: interaction.type as 'like' | 'save' | 'comment' | 'comment_like',
          timestamp: new Date(interaction.createdAt).getTime()
        };
        
        // Adicionar campos específicos para comentários
        if (interaction.type === 'comment' || interaction.type === 'comment_like') {
          return {
            ...baseInteraction,
            commentId: interaction.commentId,
            content: interaction.content,
            parentId: interaction.parentId
          };
        }
        
        return baseInteraction;
      });
      
      this.saveUserInteractions(interactions);
      console.log(`[Interações] ${interactions.length} interações carregadas do servidor (unificadas)`);
    } catch (error) {
      console.error('[Interações] Erro ao carregar do servidor:', error);
      // Se houver erro, continuar usando os dados do cache
    }
  }
  
  /**
   * Obtém as interações do usuário atual do localStorage (cache)
   */
  private getUserInteractions(): LocalInteraction[] {
    if (!this.userId) return [];
    
    try {
      const storageData = localStorage.getItem(`${STORAGE_KEY}_${this.userId}`);
      return storageData ? JSON.parse(storageData) : [];
    } catch (e) {
      console.error('[Interações] Erro ao ler do cache:', e);
      return [];
    }
  }
  
  /**
   * Salva as interações do usuário atual no localStorage (cache)
   */
  private saveUserInteractions(interactions: LocalInteraction[]): void {
    if (!this.userId) return;
    
    try {
      localStorage.setItem(`${STORAGE_KEY}_${this.userId}`, JSON.stringify(interactions));
    } catch (e) {
      console.error('[Interações] Erro ao salvar no cache:', e);
    }
  }
  
  /**
   * Verifica se um post está curtido pelo usuário atual (verifica cache)
   */
  isPostLiked(postId: number): boolean {
    return this.getUserInteractions().some(
      i => i.postId === postId && i.type === 'like'
    );
  }
  
  /**
   * Verifica se um post está salvo pelo usuário atual (verifica cache)
   */
  isPostSaved(postId: number): boolean {
    return this.getUserInteractions().some(
      i => i.postId === postId && i.type === 'save'
    );
  }
  
  /**
   * Verifica se um comentário está curtido pelo usuário atual (verifica cache)
   */
  isCommentLiked(commentId: number): boolean {
    return this.getUserInteractions().some(
      i => i.commentId === commentId && i.type === 'comment_like'
    );
  }
  
  /**
   * Obtém os comentários de um post pelo usuário atual (verifica cache)
   */
  getUserCommentsForPost(postId: number): LocalInteraction[] {
    return this.getUserInteractions().filter(
      i => i.postId === postId && i.type === 'comment'
    );
  }
  
  /**
   * Adiciona uma curtida a um post no PostgreSQL e cache local
   */
  async likePost(postId: number): Promise<void> {
    if (!this.userId) return;
    
    try {
      // Adicionar ao cache local imediatamente para feedback rápido ao usuário
      const interactions = this.getUserInteractions();
      if (!this.isPostLiked(postId)) {
        interactions.push({
          postId,
          type: 'like',
          timestamp: Date.now()
        });
        this.saveUserInteractions(interactions);
      }
      
      // Enviar para o servidor
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Falha ao curtir no servidor');
      }
      
      // Invalidar queries para atualizar UI
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      console.log(`[Interações] Post ${postId} curtido e persistido no PostgreSQL`);
    } catch (error) {
      console.error('[Interações] Erro ao curtir post:', error);
      // Poderíamos reverter a mudança no localStorage aqui se quiséssemos
    }
  }
  
  /**
   * Remove uma curtida de um post no PostgreSQL e cache local
   */
  async unlikePost(postId: number): Promise<void> {
    if (!this.userId) return;
    
    try {
      // Remover do cache local imediatamente
      let interactions = this.getUserInteractions();
      interactions = interactions.filter(
        i => !(i.postId === postId && i.type === 'like')
      );
      this.saveUserInteractions(interactions);
      
      // Enviar para o servidor
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Falha ao remover curtida no servidor');
      }
      
      // Invalidar queries para atualizar UI
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      console.log(`[Interações] Post ${postId} descurtido e persistido no PostgreSQL`);
    } catch (error) {
      console.error('[Interações] Erro ao remover curtida:', error);
    }
  }
  
  /**
   * Adiciona um post aos salvos no PostgreSQL e cache local
   */
  async savePost(postId: number): Promise<void> {
    if (!this.userId) return;
    
    try {
      // Adicionar ao cache local imediatamente
      const interactions = this.getUserInteractions();
      if (!this.isPostSaved(postId)) {
        interactions.push({
          postId,
          type: 'save',
          timestamp: Date.now()
        });
        this.saveUserInteractions(interactions);
      }
      
      // Enviar para o servidor com credenciais
      const response = await fetch(`/api/posts/${postId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Falha ao salvar no servidor');
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      console.log(`[Interações] Post ${postId} salvo e persistido no PostgreSQL`);
    } catch (error) {
      console.error('[Interações] Erro ao salvar post:', error);
    }
  }
  
  /**
   * Remove um post dos salvos no PostgreSQL e cache local
   */
  async unsavePost(postId: number): Promise<void> {
    if (!this.userId) return;
    
    try {
      // Remover do cache local imediatamente
      let interactions = this.getUserInteractions();
      interactions = interactions.filter(
        i => !(i.postId === postId && i.type === 'save')
      );
      this.saveUserInteractions(interactions);
      
      // Enviar para o servidor com credenciais
      const response = await fetch(`/api/posts/${postId}/save`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Falha ao remover dos salvos no servidor');
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      console.log(`[Interações] Post ${postId} removido dos salvos e persistido no PostgreSQL`);
    } catch (error) {
      console.error('[Interações] Erro ao remover dos salvos:', error);
    }
  }
  
  /**
   * Alterna o estado de curtida de um post no PostgreSQL e cache local
   */
  async toggleLike(postId: number): Promise<boolean> {
    const isLiked = this.isPostLiked(postId);
    
    if (isLiked) {
      await this.unlikePost(postId);
    } else {
      await this.likePost(postId);
    }
    
    return !isLiked; // Retorna o novo estado esperado
  }
  
  /**
   * Alterna o estado de salvamento de um post no PostgreSQL e cache local
   */
  async toggleSave(postId: number): Promise<boolean> {
    const isSaved = this.isPostSaved(postId);
    
    if (isSaved) {
      await this.unsavePost(postId);
    } else {
      await this.savePost(postId);
    }
    
    return !isSaved; // Retorna o novo estado esperado
  }
  
  /**
   * Obtém os IDs de todos os posts curtidos pelo usuário do cache local
   */
  getLikedPostIds(): number[] {
    return this.getUserInteractions()
      .filter(i => i.type === 'like')
      .map(i => i.postId);
  }
  
  /**
   * Obtém os IDs de todos os posts salvos pelo usuário do cache local
   */
  getSavedPostIds(): number[] {
    return this.getUserInteractions()
      .filter(i => i.type === 'save')
      .map(i => i.postId);
  }
  
  /**
   * Adiciona um comentário a um post e salva no cache local e servidor
   */
  async addComment(postId: number, content: string, parentId?: number): Promise<any> {
    if (!this.userId) return null;
    
    try {
      // Enviar para o servidor primeiro para obter o ID do comentário
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content, parentId })
      });
      
      if (!response.ok) {
        throw new Error('Falha ao adicionar comentário no servidor');
      }
      
      const commentData = await response.json();
      
      // Adicionar ao cache local após sucesso no servidor
      const interactions = this.getUserInteractions();
      interactions.push({
        postId,
        commentId: commentData.id,
        type: 'comment',
        content,
        parentId,
        timestamp: Date.now()
      });
      
      this.saveUserInteractions(interactions);
      
      // Invalidar queries para atualizar UI
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${postId}/comments`] });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      
      console.log(`[Interações] Comentário adicionado ao post ${postId} e persistido no PostgreSQL`);
      return commentData;
    } catch (error) {
      console.error('[Interações] Erro ao adicionar comentário:', error);
      return null;
    }
  }
  
  /**
   * Adiciona uma curtida a um comentário e salva no cache local e servidor
   */
  async likeComment(commentId: number): Promise<void> {
    if (!this.userId) return;
    
    try {
      // Adicionar ao cache local imediatamente para feedback rápido
      const interactions = this.getUserInteractions();
      if (!this.isCommentLiked(commentId)) {
        interactions.push({
          commentId,
          postId: 0, // Será atualizado quando receber resposta do servidor
          type: 'comment_like',
          timestamp: Date.now()
        });
        this.saveUserInteractions(interactions);
      }
      
      // Enviar para o servidor
      const response = await fetch(`/api/comments/${commentId}/toggle-like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Falha ao curtir comentário no servidor');
      }
      
      const likeData = await response.json();
      
      // Atualizar o postId no cache local após receber do servidor
      const updatedInteractions = this.getUserInteractions().map(interaction => {
        if (interaction.type === 'comment_like' && interaction.commentId === commentId) {
          return { ...interaction, postId: likeData.postId };
        }
        return interaction;
      });
      
      this.saveUserInteractions(updatedInteractions);
      
      // Invalidar queries para atualizar UI
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${likeData.postId}/comments`] });
      
      console.log(`[Interações] Comentário ${commentId} curtido e persistido no PostgreSQL`);
    } catch (error) {
      console.error('[Interações] Erro ao curtir comentário:', error);
    }
  }
  
  /**
   * Remove uma curtida de um comentário e atualiza no cache local e servidor
   */
  async unlikeComment(commentId: number): Promise<void> {
    if (!this.userId) return;
    
    try {
      // Remover do cache local imediatamente
      let interactions = this.getUserInteractions();
      
      // Guardar o postId antes de remover a interação
      const likedComment = interactions.find(i => i.commentId === commentId && i.type === 'comment_like');
      const postId = likedComment?.postId || 0;
      
      interactions = interactions.filter(
        i => !(i.commentId === commentId && i.type === 'comment_like')
      );
      this.saveUserInteractions(interactions);
      
      // Enviar para o servidor
      const response = await fetch(`/api/comments/${commentId}/toggle-like`, {
        method: 'POST', // O mesmo endpoint alterna o estado
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Falha ao remover curtida do comentário no servidor');
      }
      
      // Invalidar queries para atualizar UI
      if (postId) {
        queryClient.invalidateQueries({ queryKey: [`/api/posts/${postId}/comments`] });
      }
      
      console.log(`[Interações] Curtida removida do comentário ${commentId} e persistido no PostgreSQL`);
    } catch (error) {
      console.error('[Interações] Erro ao remover curtida de comentário:', error);
    }
  }
  
  /**
   * Alterna o estado de curtida de um comentário
   */
  async toggleCommentLike(commentId: number): Promise<boolean> {
    const isLiked = this.isCommentLiked(commentId);
    
    if (isLiked) {
      await this.unlikeComment(commentId);
    } else {
      await this.likeComment(commentId);
    }
    
    return !isLiked; // Retorna o novo estado esperado
  }
  
  /**
   * Sincroniza os estados locais com o servidor
   * @param posts Lista de posts com informações de curtidas/salvamentos do servidor
   */
  syncWithServer(posts: {id: number, isLiked: boolean, isSaved: boolean}[]): void {
    if (!this.userId) return;
    
    let interactions = this.getUserInteractions();
    let changed = false;
    
    // Para cada post do servidor, verificar se precisa sincronizar com localStorage
    for (const post of posts) {
      const { id: postId, isLiked, isSaved } = post;
      
      // Verificar status de curtida
      const isLocallyLiked = this.isPostLiked(postId);
      if (isLiked && !isLocallyLiked) {
        // Post está curtido no servidor mas não localmente
        interactions.push({
          postId,
          type: 'like',
          timestamp: Date.now()
        });
        changed = true;
        console.log(`[Interações] Sincronizando: adicionando curtida do post ${postId}`);
      } else if (!isLiked && isLocallyLiked) {
        // Post não está curtido no servidor
        // Enviar a curtida para o servidor
        this.likePost(postId).catch(console.error);
        console.log(`[Interações] Enviando curtida local para servidor: post ${postId}`);
      }
      
      // Verificar status de salvamento
      const isLocallySaved = this.isPostSaved(postId);
      if (isSaved && !isLocallySaved) {
        // Post está salvo no servidor mas não localmente
        interactions.push({
          postId,
          type: 'save',
          timestamp: Date.now()
        });
        changed = true;
        console.log(`[Interações] Sincronizando: adicionando salvamento do post ${postId}`);
      } else if (!isSaved && isLocallySaved) {
        // Post não está salvo no servidor
        // Enviar o salvamento para o servidor
        this.savePost(postId).catch(console.error);
        console.log(`[Interações] Enviando salvamento local para servidor: post ${postId}`);
      }
    }
    
    // Se houve alterações, salvar
    if (changed) {
      this.saveUserInteractions(interactions);
      console.log(`[Interações] Cache sincronizado com o servidor`);
    }
  }
}

// Exporta uma instância única para ser usada em toda a aplicação
export const localInteractions = new UserInteractionsManager();