import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatTimeAgo, generateInitials, getLocationString } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type VetHelpCardProps = {
  vetHelp: any;
  onDonateClick?: () => void;
};

export default function VetHelpCard({ vetHelp, onDonateClick }: VetHelpCardProps) {
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  
  // Get user information
  const { data: user } = useQuery({
    queryKey: [`/api/users/${vetHelp.requesterId}`],
  });

  // Get likes count
  const { data: likesData } = useQuery({
    queryKey: [`/api/interactions/likes?postType=vet_help&postId=${vetHelp.id}`],
  });

  // Get comments count
  const { data: comments } = useQuery({
    queryKey: [`/api/interactions/comments?postType=vet_help&postId=${vetHelp.id}`],
  });

  const likesCount = likesData?.count || 0;
  const commentsCount = comments?.length || 0;
  
  // Handle like/unlike mutation
  const likeMutation = useMutation({
    mutationFn: () => {
      return apiRequest("POST", "/api/interactions", {
        postType: "vet_help",
        postId: vetHelp.id,
        type: "like"
      });
    },
    onSuccess: () => {
      setIsLiked(!isLiked);
      queryClient.invalidateQueries({ queryKey: [`/api/interactions/likes?postType=vet_help&postId=${vetHelp.id}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: "Não foi possível curtir a publicação",
        variant: "destructive",
      });
    }
  });

  const handleLike = () => {
    likeMutation.mutate();
  };

  // Calculate progress percentage
  const progressPercentage = Math.min(
    Math.round((vetHelp.currentAmount / vetHelp.targetAmount) * 100),
    100
  );
  
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);
  };
  
  return (
    <article className="p-4 border-b border-neutral-200">
      <div className="flex items-start space-x-3">
        <Link href={`/profile/${user?.id}`}>
          <Avatar className="h-10 w-10 cursor-pointer">
            {user?.profileImage ? (
              <AvatarImage 
                src={user.profileImage}
                alt={user?.name} 
                className="h-full w-full object-cover" 
              />
            ) : (
              <AvatarFallback className="bg-neutral-200 text-neutral-700">
                {user?.name ? generateInitials(user.name) : "?"}
              </AvatarFallback>
            )}
          </Avatar>
        </Link>
        
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-neutral-900">{user?.name || "Usuário"}</h3>
            <div className="flex items-center space-x-2">
              <span className="status-pill status-pill-vet-help">AJUDA VET</span>
              <span className="text-neutral-500 text-xs">
                {formatTimeAgo(vetHelp.createdAt)}
              </span>
            </div>
          </div>
          
          <p className="mt-1 text-sm text-neutral-700">{vetHelp.description}</p>
          
          <div className="mt-3 rounded-lg overflow-hidden bg-neutral-100 card-shadow">
            {vetHelp.photos && vetHelp.photos.length > 0 ? (
              <img 
                src={vetHelp.photos[0]} 
                alt={vetHelp.title} 
                className="w-full h-60 object-cover" 
              />
            ) : (
              <div className="w-full h-60 flex items-center justify-center bg-neutral-200">
                <span className="material-icons text-4xl text-neutral-400">healing</span>
              </div>
            )}
          </div>
          
          <div className="mt-3">
            <Progress value={progressPercentage} className="h-2" />
            <div className="flex justify-between text-sm mt-1">
              <span className="text-neutral-700">
                {formatCurrency(vetHelp.currentAmount)} arrecadados
              </span>
              <span className="text-neutral-700">
                Meta: {formatCurrency(vetHelp.targetAmount)}
              </span>
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between">
            <div className="flex space-x-4">
              <button 
                className="flex items-center text-neutral-600"
                onClick={handleLike}
              >
                <span className={`material-icons text-neutral-500 mr-1 ${isLiked ? 'text-primary' : ''}`}>
                  {isLiked ? "favorite" : "favorite_border"}
                </span>
                <span className="text-xs">{likesCount}</span>
              </button>
              <button className="flex items-center text-neutral-600">
                <span className="material-icons text-neutral-500 mr-1">chat_bubble_outline</span>
                <span className="text-xs">{commentsCount}</span>
              </button>
              <button className="flex items-center text-neutral-600">
                <span className="material-icons text-neutral-500 mr-1">share</span>
              </button>
            </div>
            
            <Button 
              className="flex items-center text-white bg-secondary px-3 py-1 rounded-full text-xs font-medium"
              onClick={onDonateClick}
            >
              <span className="material-icons text-xs mr-1">paid</span>
              Doar agora
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
