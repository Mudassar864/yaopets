import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import CommentItem from "./CommentItem";

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

type CommentSectionProps = {
  postId: number;
  commentsCount?: number;
  onCommentsCountChange?: (count: number) => void;
};

const CommentSection: React.FC<CommentSectionProps> = ({ 
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [commentsCount, setCommentsCount] = useState(initialCommentsCount);

  // Carregar comentários ao expandir a seção e focar no campo de texto
  useEffect(() => {
    if (isExpanded) {
      fetchComments();
      
      // Colocar um pequeno atraso para garantir que o componente já está renderizado
      setTimeout(() => {
        if (commentInputRef.current) {
          commentInputRef.current.focus();
        }
      }, 100);
    }
  }, [isExpanded]);

  const fetchComments = async () => {
    setIsLoading(true);
    try {
      // Tentar primeiro com API simples
      const response = await fetch(`/api/posts/${postId}/comments`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setComments(Array.isArray(data) ? data : (data.data || []));
        
        // Atualizar contagem
        const count = Array.isArray(data) ? data.length : (data.data?.length || 0);
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
      
      // Tentar enviar o comentário
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
        
        // Criar um novo comentário temporário para exibição imediata
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
        
        // Adicionar o novo comentário à lista
        setComments(prev => [newCommentObj, ...prev]);
        
        // Atualizar contagem
        setCommentsCount(prev => prev + 1);
        if (onCommentsCountChange) {
          onCommentsCountChange(commentsCount + 1);
        }
        
        // Limpar o campo de comentário
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
      
      // Mesmo com erro, vamos adicionar localmente para melhor experiência do usuário
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
      // Enviar requisição para curtir/descurtir o comentário
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

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="mt-2">
      {/* Botão para expandir/recolher comentários */}
      <button 
        onClick={toggleExpanded}
        className="flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <MessageSquare size={18} className="mr-1" />
        {isExpanded ? "Ocultar comentários" : `Ver ${commentsCount} comentários`}
      </button>
      
      {isExpanded && (
        <>
          {/* Formulário para novo comentário */}
          <div className="flex gap-2 mt-3 mb-4">
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
                className="min-h-[40px] py-2 resize-none rounded-xl"
              />
              
              <Button
                onClick={handleCommentSubmit}
                disabled={!newComment.trim() || isSubmitting}
                className="absolute right-2 bottom-2 h-6 px-2 text-xs"
                variant="default"
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
          
          {/* Lista de comentários */}
          <div className="space-y-2 mb-3">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : comments.length > 0 ? (
              comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  id={comment.id}
                  content={comment.content}
                  username={comment.username}
                  userPhotoUrl={comment.userPhotoUrl}
                  createdAt={comment.createdAt}
                  likesCount={comment.likesCount}
                  isLiked={comment.isLiked}
                  userId={comment.userId}
                  onLikeToggle={handleLikeToggle}
                />
              ))
            ) : (
              <p className="text-center text-sm text-gray-500 py-2">
                Seja o primeiro a comentar!
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CommentSection;