import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatTimeAgo, generateInitials, getLocationString } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type DonationCardProps = {
  donation: any;
  onMessageClick?: () => void;
};

export default function DonationCard({ donation, onMessageClick }: DonationCardProps) {
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  
  // Get user information
  const { data: user } = useQuery({
    queryKey: [`/api/users/${donation.donorId}`],
  });

  // Get likes count
  const { data: likesData } = useQuery({
    queryKey: [`/api/interactions/likes?postType=donation&postId=${donation.id}`],
  });

  // Get comments count
  const { data: comments } = useQuery({
    queryKey: [`/api/interactions/comments?postType=donation&postId=${donation.id}`],
  });

  const likesCount = likesData?.count || 0;
  const commentsCount = comments?.length || 0;
  
  // Handle like/unlike mutation
  const likeMutation = useMutation({
    mutationFn: () => {
      return apiRequest("POST", "/api/interactions", {
        postType: "donation",
        postId: donation.id,
        type: "like"
      });
    },
    onSuccess: () => {
      setIsLiked(!isLiked);
      queryClient.invalidateQueries({ queryKey: [`/api/interactions/likes?postType=donation&postId=${donation.id}`] });
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
  
  return (
    <article className="p-5 bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-neutral-100 mb-4 transform hover:-translate-y-1">
      <div className="flex items-start space-x-4">
        <Link href={`/profile/${user?.id}`}>
          <Avatar className="h-12 w-12 cursor-pointer ring-2 ring-[#CE97E8]/20 transition-all hover:ring-[#CE97E8]/50">
            {user?.profileImage ? (
              <AvatarImage 
                src={user.profileImage}
                alt={user?.name} 
                className="h-full w-full object-cover" 
              />
            ) : (
              <AvatarFallback className="bg-gradient-to-br from-[#CE97E8]/20 to-[#0BDEC2]/20 text-neutral-700 font-medium">
                {user?.name ? generateInitials(user.name) : "?"}
              </AvatarFallback>
            )}
          </Avatar>
        </Link>
        
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-neutral-900 text-base">{user?.name || "Usuário"}</h3>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 bg-[#F5821D]/10 text-[#F5821D] text-xs font-medium rounded-full">DOAÇÃO</span>
              <span className="text-neutral-500 text-xs">
                {formatTimeAgo(donation.createdAt)}
              </span>
            </div>
          </div>
          
          <h2 className="mt-1 font-semibold text-lg text-neutral-900">{donation.title || "Item para doação"}</h2>
          <p className="mt-1 text-sm text-neutral-700 line-clamp-2">{donation.description}</p>
          
          <div className="mt-4 rounded-xl overflow-hidden bg-neutral-50 card-shadow">
            {donation.photos && donation.photos.length > 0 ? (
              <img 
                src={donation.photos[0]} 
                alt={donation.title} 
                className="w-full h-64 object-cover transition-all hover:scale-105" 
              />
            ) : (
              <div className="w-full h-64 flex items-center justify-center bg-gradient-to-r from-[#CE97E8]/10 to-[#0BDEC2]/10">
                <span className="material-icons text-5xl text-[#F5821D]">
                  {donation.type === "pet" ? "pets" : "volunteer_activism"}
                </span>
              </div>
            )}
          </div>
          
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-full px-3 py-1 bg-[#CE97E8]/10 border-[#CE97E8] text-[#CE97E8] font-medium">
                {donation.type === "pet" ? "Animal para adoção" : donation.type}
              </Badge>
              {donation.location && (
                <Badge variant="outline" className="rounded-full px-3 py-1 bg-[#0BDEC2]/10 border-[#0BDEC2] text-[#0BDEC2] font-medium">
                  {getLocationString(donation.location)}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-4">
            <div className="flex space-x-6">
              <button 
                className="flex items-center text-neutral-600 hover:text-[#CE97E8] transition-colors"
                onClick={handleLike}
              >
                <span className={`material-icons mr-1.5 ${isLiked ? 'text-[#CE97E8]' : 'text-neutral-400'}`}>
                  {isLiked ? "favorite" : "favorite_border"}
                </span>
                <span className="text-sm font-medium">{likesCount}</span>
              </button>
              <button className="flex items-center text-neutral-600 hover:text-[#0BDEC2] transition-colors">
                <span className="material-icons text-neutral-400 mr-1.5">chat_bubble_outline</span>
                <span className="text-sm font-medium">{commentsCount}</span>
              </button>
              <button className="flex items-center text-neutral-600 hover:text-[#F5821D] transition-colors">
                <span className="material-icons text-neutral-400 mr-1.5">share</span>
              </button>
            </div>
            
            <Button 
              className="flex items-center gap-1.5 text-white bg-gradient-to-r from-[#F5821D] to-[#F5821D]/90 hover:from-[#F5821D]/90 hover:to-[#F5821D]/80 px-4 py-2 rounded-full text-sm font-medium transition-all shadow-sm hover:shadow"
              onClick={onMessageClick}
            >
              <span className="material-icons text-sm">chat</span>
              Tenho interesse
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
