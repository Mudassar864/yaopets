import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, X, Heart, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import CommentItem from "./CommentItem";

// Interface para o comentário do servidor (como recebido da API)
interface ServerComment {
  id: number;
  content: string;
  user?: {
    name?: string;
    username?: string;
    avatar?: string;
    profileImage?: string;
    id?: number;
  };
  userId?: number;
  createdAt: string;
  likes?: number;
  isLiked?: boolean;
  // Potenciais campos já no formato cliente
  username?: string;
  userPhotoUrl?: string;
  likesCount?: number;
}

// Interface para o comentário formatado para o cliente
type Comment = {
  id: number;
  content: string;
  username: string;
  userPhotoUrl?: string;
  createdAt: string;
  likesCount: number;
  isLiked: boolean;
  userId: number;
};

type CommentsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  postId: number;
  commentsCount: number;
  onCommentsCountChange?: (count: number) => void;
};

const CommentsModal: React.FC<CommentsModalProps> = ({
  isOpen,
  onClose,
  postId,
  commentsCount: initialCommentsCount = 0,
  onCommentsCountChange
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentsCount, setCommentsCount] = useState(initialCommentsCount);
  const modalRef = useRef<HTMLDivElement>(null);

  // Fechar modal ao clicar fora dele
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden'; // Prevenir scroll no background
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'auto'; // Restaurar scroll
    };
  }, [isOpen, onClose]);

  // Carregar comentários ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      fetchComments();
      
      // Focar no campo de comentário após um pequeno atraso
      setTimeout(() => {
        if (commentInputRef.current) {
          commentInputRef.current.focus();
        }
      }, 300);
    }
  }, [isOpen, postId]);

  const fetchComments = async () => {
    setIsLoading(true);
    try {
      // Buscar comentários da API
      const response = await fetch(`/api/posts/${postId}/comments`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        // Converter formato de dados para o esperado pelo componente
        const formattedComments = (Array.isArray(data) ? data : (data.data || [])).map((comment: ServerComment) => {
          // Verificar se já está no formato esperado ou se precisa converter
          if ('username' in comment) {
            return comment as Comment;
          }
          
          // Converter do formato servidor para o formato cliente
          return {
            id: comment.id,
            content: comment.content,
            username: comment.user?.username || comment.user?.name || "Usuário",
            userPhotoUrl: comment.user?.avatar || comment.user?.profileImage || "",
            createdAt: comment.createdAt,
            likesCount: comment.likes || 0,
            isLiked: comment.isLiked || false,
            userId: comment.user?.id || comment.userId || 0
          };
        });
        
        setComments(formattedComments);
        
        // Atualizar contagem
        const count = formattedComments.length;
        setCommentsCount(count);
        if (onCommentsCountChange) {
          onCommentsCountChange(count);
        }
      } else {
        console.error("Erro ao carregar comentários:", response.statusText);
      }
    } catch (error) {
      console.error("Erro ao carregar comentários:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os comentários.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommentSubmit = async () => {
    if (!newComment.trim()) return;
    
    setIsSubmitting(true);
    try {
      const commentData = {
        content: newComment.trim(),
        userId: user?.id,
        postId: postId,
        type: 'comment'
      };
      
      // Enviar comentário para a API
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commentData),
        credentials: 'include'
      });
      
      if (response.ok) {
        const savedComment = await response.json();
        
        // Adicionar o novo comentário no topo da lista
        const newCommentObj: Comment = {
          id: savedComment.id || Date.now(),
          content: newComment.trim(),
          username: user?.username || "Você",
          userPhotoUrl: user?.profileImage || '',
          createdAt: new Date().toISOString(),
          likesCount: 0,
          isLiked: false,
          userId: user?.id || 0
        };
        
        setComments(prev => [newCommentObj, ...prev]);
        
        // Atualizar contagem
        setCommentsCount(prev => prev + 1);
        if (onCommentsCountChange) {
          onCommentsCountChange(commentsCount + 1);
        }
        
        // Limpar campo de comentário
        setNewComment("");
        
        toast({
          title: "Comentário adicionado",
          description: "Seu comentário foi publicado com sucesso!",
        });
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível adicionar o comentário. Tente novamente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao adicionar comentário:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao adicionar o comentário.",
        variant: "destructive",
      });
      
      // Mesmo com erro, adicionar localmente para melhor UX
      const tempComment: Comment = {
        id: Date.now(),
        content: newComment.trim(),
        username: user?.username || "Você",
        userPhotoUrl: user?.profileImage || '',
        createdAt: new Date().toISOString(),
        likesCount: 0,
        isLiked: false,
        userId: user?.id || 0
      };
      
      setComments(prev => [tempComment, ...prev]);
      setCommentsCount(prev => prev + 1);
      if (onCommentsCountChange) {
        onCommentsCountChange(commentsCount + 1);
      }
      
      setNewComment("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeToggle = async (commentId: number) => {
    try {
      // Enviar requisição para curtir/descurtir
      const response = await fetch(`/api/comments/${commentId}/toggle-like`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.error("Erro ao curtir comentário:", response.statusText);
      }
      
      // Atualizar o estado local (mesmo se a API falhar)
      setComments(prev =>
        prev.map(comment => {
          if (comment.id === commentId) {
            const newIsLiked = !comment.isLiked;
            return {
              ...comment,
              isLiked: newIsLiked,
              likesCount: newIsLiked 
                ? comment.likesCount + 1 
                : Math.max(0, comment.likesCount - 1)
            };
          }
          return comment;
        })
      );
    } catch (error) {
      console.error("Erro ao curtir comentário:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
      <div 
        ref={modalRef}
        className="bg-white rounded-lg w-full max-w-md max-h-[90vh] flex flex-col animate-slide-up"
        style={{transform: 'translateY(0)'}}
      >
        {/* Cabeçalho do modal */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">Comentários</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        
        {/* Lista de comentários */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  id={comment.id}
                  content={comment.content}
                  username={comment.username}
                  userPhotoUrl={comment.userPhotoUrl}
                  createdAt={comment.createdAt}
                  likesCount={comment.likesCount}
                  isLiked={comment.isLiked}
                  onLikeToggle={handleLikeToggle}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <MessageSquare size={48} className="mb-2" />
              <p>Ainda não há comentários. Seja o primeiro a comentar!</p>
            </div>
          )}
        </div>
        
        {/* Formulário para novo comentário */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={user?.profileImage || ''} />
              <AvatarFallback>{user?.username?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 relative">
              <Textarea
                ref={commentInputRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Adicione um comentário..."
                className="min-h-[40px] py-2 resize-none rounded-xl pr-20"
              />
              
              <Button
                onClick={handleCommentSubmit}
                disabled={!newComment.trim() || isSubmitting}
                className="absolute right-2 bottom-2 h-7 px-2 rounded-full"
                size="sm"
              >
                {isSubmitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  "Publicar"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentsModal;