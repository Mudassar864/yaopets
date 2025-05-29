import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { 
  Home, 
  Search, 
  PlusCircle, 
  Heart, 
  Stethoscope, 
  MoreHorizontal,
  MessageCircle,
  Send,
  Bookmark
} from 'lucide-react';
import { FaPaw } from 'react-icons/fa';
import { Link, useLocation } from 'wouter';
import { useAuth } from "@/hooks/useAuth";
import OptimizedImage from "@/components/media/OptimizedImage";
import PersistentImage from "@/components/media/PersistentImage";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CommentsModal from "@/components/comments/CommentsModal";
import { localInteractions } from "@/lib/localStorageManager";
import Header from "../components/layout/Header";
import { generateInitials } from "@/lib/utils";
// Stories foram removidos


type Post = {
  id: number;
  userId?: number; // ID do usuário para redirecionamento ao perfil
  username: string;
  userPhotoUrl: string;
  content: string;
  imageUrl: string; // Imagem é obrigatória, não opcional
  likesCount: number;
  commentsCount?: number;
  date: string;
  isLiked: boolean;
  isSaved: boolean;
};

const DEMO_POSTS: Post[] = [];

export default function PetFeed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  
  // Inicializar o sistema de interações locais quando o usuário estiver disponível
  useEffect(() => {
    if (user && user.id) {
      localInteractions.setUserId(user.id);
      console.log(`Sistema de interações locais inicializado para o usuário ${user.id}`);
    }
  }, [user]);
  
  // Função de buscar stories foi removida

  // Buscar posts da API e do localStorage
  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      let apiPosts: Post[] = [];
      let localPosts: Post[] = [];
      
      // 1. Primeiro, carregar posts do localStorage (posts mais recentes adicionados pelo usuário)
      try {
        const savedPosts = localStorage.getItem('recentPosts');
        if (savedPosts) {
          const parsedPosts = JSON.parse(savedPosts);
          if (Array.isArray(parsedPosts) && parsedPosts.length > 0) {
            localPosts = parsedPosts.map(post => {
              const postId = post.id;
              // Verificar interações locais salvas
              const isLiked = localInteractions.isPostLiked(postId);
              const isSaved = localInteractions.isPostSaved(postId);
              
              return {
                id: postId,
                userId: post.user?.id || post.userId || user?.id,
                username: post.user?.username || user?.username || 'usuário',
                userPhotoUrl: post.user?.profileImage || user?.profileImage || '',
                content: post.content || '',
                imageUrl: Array.isArray(post.mediaUrls) && post.mediaUrls.length > 0 
                  ? post.mediaUrls[0] 
                  : post.imageUrl || '',
                likesCount: post.likesCount || 0,
                date: post.createdAt 
                  ? formatDistanceToNow(new Date(post.createdAt), { locale: ptBR, addSuffix: true })
                  : 'recentemente',
                isLiked,
                isSaved
              };
            });
            console.log('Posts carregados do localStorage:', localPosts);
          }
        }
      } catch (localError) {
        console.error('Erro ao carregar posts do localStorage:', localError);
      }
      
      // 2. Tentar buscar da API
      try {
        const response = await fetch('/api/posts', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // Sincronizar dados do servidor com localStorage
          if (user && user.id && Array.isArray(data)) {
            // Preparar os dados no formato que a função syncWithServer espera
            const syncData = data.map(post => ({
              id: post.id,
              isLiked: post.isLiked || false,
              isSaved: post.isSaved || false
            }));
            
            // Sincronizar
            localInteractions.syncWithServer(syncData);
          }
          
          // Converter os dados da API para o formato de Post
          if (Array.isArray(data) && data.length > 0) {
            apiPosts = data.map(post => ({
              id: post.id,
              userId: post.userId || post.author?.id || null,
              username: post.author?.username || post.username || 'usuário',
              userPhotoUrl: post.author?.profileImage || post.userImage || '',
              content: post.content || '',
              imageUrl: Array.isArray(post.mediaUrls) && post.mediaUrls.length > 0 
                ? post.mediaUrls[0] 
                : post.imageUrl || '',
              likesCount: post.likesCount || 0,
              date: post.createdAt 
                ? formatDistanceToNow(new Date(post.createdAt), { locale: ptBR, addSuffix: true })
                : 'recentemente',
              isLiked: post.isLiked || false,
              isSaved: post.isSaved || false
            }));
            console.log('Posts carregados da API:', apiPosts);
          }
        }
      } catch (error) {
        console.error('Erro ao buscar posts da API:', error);
      }
      
      // 3. Combinando todos os posts:
      // - Primeiro os posts locais (mais recentes criados pelo usuário)
      // - Depois os posts da API (se houver)
      // - Por fim, os posts de demonstração (se necessário)
      
      let allPosts = [...localPosts];
      
      // Adicionar posts da API (evitando duplicações com os locais)
      if (apiPosts.length > 0) {
        // Filtrar para não incluir os que já estão nos posts locais
        const localPostIds = localPosts.map(p => p.id);
        const uniqueApiPosts = apiPosts.filter(p => !localPostIds.includes(p.id));
        allPosts = [...allPosts, ...uniqueApiPosts];
      }
      
      // Se não houver posts, mostrar mensagem informativa
      if (allPosts.length === 0) {
        toast({
          title: "Nenhuma publicação encontrada",
          description: "Compartilhe sua primeira foto de pet para começar!",
          duration: 5000
        });
      }
      
      // Não filtrar posts sem imagens para permitir posts de texto
      // allPosts = allPosts.filter(post => post.imageUrl && post.imageUrl.trim() !== '');
      
      setPosts(allPosts);
      setIsLoading(false);
    };
    
    fetchPosts();
  }, [location, user]); // Recarrega quando a localização mudar (ex: ao voltar da tela de criação)
  
  const toggleLike = async (postId: number) => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Faça login para curtir posts",
        variant: "destructive",
      });
      setLocation("/auth/login");
      return;
    }

    // Encontrar o post atual e calcular novo estado
    const currentPost = posts.find(p => p.id === postId);
    if (!currentPost) return;
    
    const newIsLiked = !currentPost.isLiked;
    // Preservar a contagem atual de curtidas até recebermos a resposta do servidor
    const oldLikesCount = currentPost.likesCount || 0;
    
    // Primeiro atualizamos apenas o estado visual de curtida, sem alterar a contagem
    setPosts(prev => 
      prev.map(post => {
        if (post.id === postId) {
          // Atualizar localStorage (primeira camada de persistência)
          if (newIsLiked) {
            localInteractions.likePost(postId);
            console.log(`[LocalStorage] Post ${postId} curtido localmente`);
          } else {
            localInteractions.unlikePost(postId);
            console.log(`[LocalStorage] Post ${postId} descurtido localmente`);
          }
          
          return {
            ...post,
            isLiked: newIsLiked,
            // Importante: Manter a contagem atual para evitar zeragem
            likesCount: oldLikesCount
          };
        }
        return post;
      })
    );
    
    // Depois enviamos a ação para o servidor (segunda camada de persistência)
    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: newIsLiked ? 'POST' : 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[Server] Post ${postId} toggle curtida: ${data.liked ? 'curtido' : 'descurtido'}`);
        
        // Atualizar com a contagem real do servidor
        if (data.likesCount !== undefined) {
          setPosts(prev => 
            prev.map(post => {
              if (post.id === postId) {
                return {
                  ...post,
                  likesCount: data.likesCount
                };
              }
              return post;
            })
          );
        } else {
          // Se o servidor não retornar uma contagem, calcular localmente
          const newLikesCount = newIsLiked ? oldLikesCount + 1 : Math.max(0, oldLikesCount - 1);
          setPosts(prev => 
            prev.map(post => {
              if (post.id === postId) {
                return {
                  ...post,
                  likesCount: newLikesCount
                };
              }
              return post;
            })
          );
          console.log(`[LocalStorage] Atualizando contagem de curtidas localmente para ${newLikesCount}`);
        }
      } else {
        console.error('Erro na resposta do servidor ao curtir:', await response.text());
        
        // Em caso de erro na comunicação com o servidor, ainda atualizar a contagem localmente
        // para proporcionar feedback visual imediato ao usuário
        const newLikesCount = newIsLiked ? oldLikesCount + 1 : Math.max(0, oldLikesCount - 1);
        setPosts(prev => 
          prev.map(post => {
            if (post.id === postId) {
              return {
                ...post,
                likesCount: newLikesCount
              };
            }
            return post;
          })
        );
      }
    } catch (error) {
      console.error('Erro ao curtir post no servidor:', error);
      // O estado local ainda está salvo no localStorage
    }
  };
  
  const toggleSave = async (postId: number) => {
    // Primeiro atualizamos o estado local para UI responsiva
    setPosts(prev => 
      prev.map(post => {
        if (post.id === postId) {
          const newIsSaved = !post.isSaved;
          
          // Atualizar localStorage (primeira camada de persistência)
          if (newIsSaved) {
            localInteractions.savePost(postId);
            console.log(`[LocalStorage] Post ${postId} salvo localmente`);
          } else {
            localInteractions.unsavePost(postId);
            console.log(`[LocalStorage] Post ${postId} removido dos salvos localmente`);
          }
          
          return {
            ...post,
            isSaved: newIsSaved
          };
        }
        return post;
      })
    );
    
    // Depois enviamos a ação para o servidor (segunda camada de persistência)
    try {
      // Pegando o estado atual após atualização local
      const currentPost = posts.find(p => p.id === postId);
      const isSaved = currentPost?.isSaved || false;
      
      const response = await fetch(`/api/posts/${postId}/save`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ saved: isSaved }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[Server] Post ${postId} toggle salvamento: ${data.saved ? 'salvo' : 'removido dos salvos'}`);
      } else {
        console.error('Erro na resposta do servidor ao salvar:', await response.text());
        // Não revertemos o estado local mesmo em caso de erro, pois o localStorage mantém a persistência
      }
    } catch (error) {
      console.error('Erro ao salvar post no servidor:', error);
      // O estado local ainda está salvo no localStorage
    }
  };
  
  // Adicionar um novo post localmente
  const addNewPost = (newPost: Post) => {
    setPosts(prev => [newPost, ...prev]);
    toast({
      title: "Post adicionado",
      description: "Sua publicação foi adicionada ao feed",
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-white pb-14">
      {/* Header */}
      <Header title="YaoPets" showFilters={true} />

      {/* Stories foram removidos */}

      {/* Feed */}
      <main className="flex-1 max-w-md mx-auto w-full">
        {posts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-4">Nenhuma publicação disponível no momento.</p>
            <Link href="/create-post">
              <button className="px-4 py-2 bg-orange-500 text-white rounded-full">
                Criar uma publicação
              </button>
            </Link>
          </div>
        ) : (
          posts.map(post => (
          <Card key={post.id} className="mb-6 border-0 shadow-none">
            {/* Post header */}
            <div className="p-3 flex justify-between items-center">
              <div className="flex items-center">
                <Avatar 
                  className="h-8 w-8 mr-2 cursor-pointer hover:opacity-80 transition-opacity" 
                  onClick={() => post.userId && setLocation(`/profile/${post.userId}`)}
                >
                  {post.userPhotoUrl ? <AvatarImage src={post.userPhotoUrl} alt={post.username} /> : null}
                  <AvatarFallback>{post.username?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
                </Avatar>
                <span 
                  className="font-medium text-sm cursor-pointer hover:text-orange-500 transition-colors" 
                  onClick={() => post.userId && setLocation(`/profile/${post.userId}`)}
                >
                  {post.username}
                </span>
              </div>
              <MoreHorizontal size={20} className="text-gray-500" />
            </div>
            
            {/* Post content - imagem ou texto */}
            {post.imageUrl && post.imageUrl.trim() !== '' ? (
              <div className="w-full">
                {/* Usar o novo componente PersistentImage para garantir armazenamento permanente */}
                {post.imageUrl.startsWith('blob:') ? (
                  <PersistentImage
                    src={post.imageUrl}
                    alt="Post content"
                    className="w-full h-auto object-cover"
                    onImageLoad={(permanentUrl: string) => {
                      // Atualizar a URL no post quando a imagem for processada
                      setPosts(currentPosts => {
                        return currentPosts.map((p: Post) => {
                          if (p.id === post.id) {
                            return { ...p, imageUrl: permanentUrl };
                          }
                          return p;
                        });
                      });
                      
                      // Também atualizar no localStorage
                      try {
                        const savedPosts = localStorage.getItem('recentPosts');
                        if (savedPosts) {
                          const parsedPosts = JSON.parse(savedPosts);
                          const postIndex = parsedPosts.findIndex((p: any) => p.id === post.id);
                          if (postIndex >= 0) {
                            if (Array.isArray(parsedPosts[postIndex].mediaUrls)) {
                              parsedPosts[postIndex].mediaUrls[0] = permanentUrl;
                            } else {
                              parsedPosts[postIndex].mediaUrls = [permanentUrl];
                            }
                            localStorage.setItem('recentPosts', JSON.stringify(parsedPosts));
                            console.log(`Post ${post.id}: imagem atualizada para armazenamento permanente`);
                          }
                        }
                      } catch (error) {
                        console.error('Erro ao atualizar localStorage:', error);
                      }
                    }}
                  />
                ) : (
                  <OptimizedImage 
                    src={post.imageUrl} 
                    alt="Post content" 
                    className="w-full h-auto object-cover"
                  />
                )}
              </div>
            ) : (
              <div className="px-4 py-3 bg-gray-50">
                <p className="text-lg">{post.content}</p>
              </div>
            )}
            
            {/* Post actions */}
            <div className="p-3">
              <div className="flex justify-between mb-2">
                <div className="flex space-x-4">
                  <button onClick={() => toggleLike(post.id)}>
                    <FaPaw 
                      className={`h-6 w-6 ${post.isLiked ? 'text-orange-500' : 'text-black'}`} 
                    />
                  </button>
                  <button 
                    onClick={() => {
                      // Abrir o modal de comentários com este post
                      setSelectedPostId(post.id);
                      setIsCommentsModalOpen(true);
                    }}
                  >
                    <MessageCircle size={24} className="fill-black" />
                  </button>
                  <button>
                    <Send size={24} className="fill-black" />
                  </button>
                </div>
                <button onClick={() => toggleSave(post.id)}>
                  <Bookmark 
                    size={24} 
                    className={`transition-colors ${
                      post.isSaved 
                        ? 'text-orange-500 fill-orange-500' 
                        : 'text-black'
                    }`}
                  />
                </button>
              </div>
              
              {/* Likes count */}
              <div className="font-semibold text-sm mb-1">{post.likesCount} curtidas</div>
              
              {/* Caption */}
              <div className="mb-1">
                <span className="font-medium text-sm mr-1">{post.username}</span>
                <span className="text-sm">{post.content}</span>
              </div>
              
              {/* Post date */}
              <div className="text-gray-400 text-xs mb-2">{post.date}</div>
              
              {/* Comment count para abrir o modal */}
              <div id={`comments-section-${post.id}`}>
                <button 
                  onClick={() => {
                    setSelectedPostId(post.id);
                    setIsCommentsModalOpen(true);
                  }}
                  className="text-gray-500 text-sm hover:text-gray-700"
                >
                  {post.commentsCount 
                    ? `Ver todos os ${post.commentsCount} comentários` 
                    : "Adicionar um comentário..."}
                </button>
              </div>
            </div>
          </Card>
        ))
        )}
      </main>
      
      {/* Modal de comentários estilo Instagram */}
      {selectedPostId && (
        <CommentsModal
          isOpen={isCommentsModalOpen}
          onClose={() => setIsCommentsModalOpen(false)}
          postId={selectedPostId}
          commentsCount={posts.find(p => p.id === selectedPostId)?.commentsCount || 0}
          onCommentsCountChange={(count: number) => {
            setPosts(prev => 
              prev.map(p => {
                if (p.id === selectedPostId) {
                  return { ...p, commentsCount: count };
                }
                return p;
              })
            );
          }}
        />
      )}
      
      {/* Modal para criar stories foi removido */}
    </div>
  );
}