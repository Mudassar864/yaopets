import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { PawPrint } from "lucide-react";

type CommentItemProps = {
  id: number;
  content: string;
  username: string;
  userPhotoUrl?: string;
  createdAt: string;
  likesCount: number;
  isLiked: boolean;
  userId?: number; // ID do usuário para redirecionamento ao perfil
  onLikeToggle: (commentId: number) => void;
};

const CommentItem: React.FC<CommentItemProps> = ({
  id,
  content,
  username,
  userPhotoUrl,
  createdAt,
  likesCount,
  isLiked,
  userId,
  onLikeToggle
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isLikedState, setIsLikedState] = useState(isLiked);
  const [likesCountState, setLikesCountState] = useState(likesCount);
  
  // Função para navegar para o perfil do usuário
  const goToUserProfile = () => {
    if (userId) {
      setLocation(`/profile/${userId}`);
    }
  };

  const handleLikeToggle = () => {
    // Atualizar estado local para feedback imediato
    setIsLikedState(!isLikedState);
    setLikesCountState(prev => isLikedState ? prev - 1 : prev + 1);
    
    // Propagar evento para o componente pai
    onLikeToggle(id);
  };

  // Formatar data relativa (há x minutos, há x horas)
  const formattedDate = createdAt 
    ? formatDistanceToNow(new Date(createdAt), { locale: ptBR, addSuffix: true })
    : '';

  return (
    <div className="flex space-x-2 mb-3 group">
      <Avatar 
        className="h-8 w-8 flex-shrink-0 cursor-pointer" 
        onClick={goToUserProfile}
      >
        <AvatarImage src={userPhotoUrl} />
        <AvatarFallback>
          {username?.charAt(0).toUpperCase() || "U"}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1">
        <div className="bg-gray-50 rounded-xl px-3 py-2">
          <div className="flex items-center mb-1">
            <p 
              className="text-sm font-medium cursor-pointer hover:text-primary transition-colors" 
              onClick={goToUserProfile}
            >
              {username}
            </p>
            <span className="mx-1.5 text-gray-300">•</span>
            <p className="text-xs text-gray-500">{formattedDate}</p>
          </div>
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        </div>
        
        <div className="flex items-center mt-1 px-2 text-xs text-gray-500">
          <button 
            onClick={handleLikeToggle}
            className={`flex items-center ${isLikedState ? 'text-orange-500' : 'text-gray-500'} hover:text-orange-500 transition-colors`}
          >
            <PawPrint size={14} className={`${isLikedState ? 'fill-orange-500' : ''} mr-1`} />
            {likesCountState > 0 && <span>{likesCountState}</span>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentItem;