import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/Header";
import BottomNavigation from "@/components/layout/BottomNavigation";
import CreatePostModal from "@/components/modals/CreatePostModal";
import AdoptionChatModal from "@/components/modals/AdoptionChatModal";
import GamificationInfo from "@/components/user/GamificationInfo";
import { useAuth } from "@/hooks/useAuth";
import { generateInitials } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { ExternalLink, Edit2, Check, X, UserPlus, UserMinus, MessageCircle } from "lucide-react";

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [createPostModalOpen, setCreatePostModalOpen] = useState(false);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isEditingWebsite, setIsEditingWebsite] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingCity, setIsEditingCity] = useState(false);
  const [newBio, setNewBio] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [newName, setNewName] = useState("");
  const [newCity, setNewCity] = useState("");
  const [activeView, setActiveView] = useState<"posts" | "followers" | "following" | "friends">("posts");
  const [selectedTab, setSelectedTab] = useState("posts");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Determine if viewing own profile or another user's
  const isOwnProfile = !id || (user && parseInt(id) === user.id);
  
  // Get profile data
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: [isOwnProfile ? "/api/auth/me" : `/api/users/${id}`],
  });

  // Get user's pets
  const { data: pets, isLoading: petsLoading } = useQuery({
    queryKey: ["/api/pets", isOwnProfile ? { ownerId: user?.id } : { ownerId: id }],
  });
  
  // Buscar posts salvos
  const { data: savedPostsData, isLoading: savedPostsLoading } = useQuery({
    queryKey: ["/api/interactions/saved"],
    enabled: isOwnProfile && !!user?.id,
  });
  
  // Usar também o LocalStorage com fallback para interações offline
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  
  // Carregar posts salvos do servidor e LocalStorage
  useEffect(() => {
    if (user?.id) {
      try {
        // Se temos dados do servidor, usamos como prioridade
        if (savedPostsData && Array.isArray(savedPostsData)) {
          setSavedPosts(savedPostsData);
          return;
        }
        
        // Importa do LocalStorageManager
        import('@/lib/localStorageManager').then(module => {
          const { localInteractions } = module;
          
          // Buscar posts e IDs salvos no gerenciador de interações locais
          const localSavedPostIds = localInteractions.getSavedPostIds();
          console.log('IDs de posts salvos localmente:', localSavedPostIds);
          
          // Buscar detalhes desses posts
          const recentPostsJson = localStorage.getItem('recentPosts');
          if (recentPostsJson) {
            const allPosts = JSON.parse(recentPostsJson);
            
            // Filtrar apenas os posts salvos localmente
            const savedLocalPosts = allPosts.filter((post: any) => 
              localSavedPostIds.includes(post.id)
            );
            
            if (savedLocalPosts.length > 0) {
              setSavedPosts(savedLocalPosts);
              console.log('Posts salvos carregados do localStorage:', savedLocalPosts);
            }
          }
        });
      } catch (error) {
        console.error('Erro ao carregar posts salvos:', error);
      }
    }
  }, [user?.id, savedPostsData]);

  // Get relationship counts
  const profileUserId = isOwnProfile ? user?.id : parseInt(id as string);
  
  const { data: relationshipCounts, isLoading: relationshipsLoading } = useQuery({
    queryKey: [`/api/users/${profileUserId}/relationship-counts`],
    enabled: !!profileUserId,
  });
  
  // Check if logged in user follows this profile user
  const { data: followingStatus, isLoading: followStatusLoading } = useQuery({
    queryKey: [`/api/users/${user?.id}/check-following/${id}`],
    enabled: !isOwnProfile && !!user?.id && !!id,
  });

  const isLoading = profileLoading || petsLoading || relationshipsLoading;

  // Handle functions
  const handleBack = () => {
    setLocation('/');
  };

  const handleLogout = async () => {
    await logout();
    setLocation('/');
  };
  
  // Mutations for updating profile
  const updateProfile = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PATCH', `/api/users/${user?.id}`, data);
      if (!response.ok) {
        throw new Error('Falha ao atualizar perfil');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso!",
        variant: "default"
      });
      // Reset all editing states
      setIsEditingBio(false);
      setIsEditingWebsite(false);
      setIsEditingName(false);
      setIsEditingCity(false);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar seu perfil. Tente novamente.",
        variant: "destructive"
      });
    }
  });
  
  // Mutation for uploading profile photo
  const updateProfilePhoto = useMutation({
    mutationFn: async (formData: FormData) => {
      try {
        // Primeiro fazemos upload do arquivo para obter a URL
        const uploadResponse = await fetch('/api/upload/single', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Falha ao fazer upload da imagem');
        }
        
        const uploadResult = await uploadResponse.json();
        if (!uploadResult.success) {
          throw new Error(uploadResult.message || 'Erro ao processar a imagem');
        }
        
        // Depois atualizamos o perfil do usuário com a URL da imagem
        const profileUpdateResponse = await apiRequest('PATCH', `/api/users/${user?.id}`, {
          profileImage: uploadResult.file.url
        });
        
        if (!profileUpdateResponse.ok) {
          throw new Error('Falha ao atualizar a URL do perfil');
        }
        
        return profileUpdateResponse.json();
      } catch (error) {
        console.error("Erro ao atualizar foto:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: "Foto atualizada",
        description: "Sua foto de perfil foi atualizada com sucesso!",
        variant: "default"
      });
      setIsPhotoDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar sua foto. Tente novamente.",
        variant: "destructive"
      });
    }
  });
  
  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('file', file); // O endpoint espera 'file', não 'profileImage'
      updateProfilePhoto.mutate(formData);
    }
  };

  // Handle editing functions
  const handleEditBio = () => {
    setNewBio(profileData?.bio || '');
    setIsEditingBio(true);
  };
  
  const handleSaveBio = () => {
    updateProfile.mutate({ bio: newBio });
  };
  
  const handleEditWebsite = () => {
    setNewWebsite(profileData?.website || '');
    setIsEditingWebsite(true);
  };
  
  const handleSaveWebsite = () => {
    updateProfile.mutate({ website: newWebsite });
  };
  
  const handleEditName = () => {
    setNewName(profileData?.name || '');
    setIsEditingName(true);
  };
  
  const handleSaveName = () => {
    updateProfile.mutate({ name: newName });
  };
  
  const handleEditCity = () => {
    setNewCity(profileData?.city || '');
    setIsEditingCity(true);
  };
  
  const handleSaveCity = () => {
    updateProfile.mutate({ city: newCity });
  };
  
  // Handle view change for followers, following, friends
  const handleViewChange = (view: 'posts' | 'followers' | 'following' | 'friends') => {
    setActiveView(view);
  };
  
  // Follow/unfollow mutations
  const followUser = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Você precisa estar logado para seguir alguém");
      const response = await apiRequest('POST', `/api/users/${user.id}/follow/${id}`);
      if (!response.ok) {
        throw new Error('Falha ao seguir usuário');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/check-following/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${profileUserId}/relationship-counts`] });
      toast({
        title: "Sucesso",
        description: "Você começou a seguir este usuário",
        variant: "default"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível seguir este usuário. Tente novamente.",
        variant: "destructive"
      });
    }
  });
  
  const unfollowUser = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Você precisa estar logado para deixar de seguir alguém");
      const response = await apiRequest('POST', `/api/users/${user.id}/unfollow/${id}`);
      if (!response.ok) {
        throw new Error('Falha ao deixar de seguir usuário');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/check-following/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${profileUserId}/relationship-counts`] });
      toast({
        title: "Sucesso",
        description: "Você deixou de seguir este usuário",
        variant: "default"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível deixar de seguir este usuário. Tente novamente.",
        variant: "destructive"
      });
    }
  });
  
  const handleFollowToggle = () => {
    if (followingStatus?.isFollowing) {
      unfollowUser.mutate();
    } else {
      followUser.mutate();
    }
  };
  
  // Estado para o modal de chat
  const [chatModalOpen, setChatModalOpen] = useState(false);
  
  const handleMessageUser = async () => {
    // Iniciar chat diretamente com este usuário e redirecionar
    if (!profileData || !user) return;
    
    try {
      const response = await apiRequest('POST', '/api/chat', {
        members: [user.id, parseInt(id || '0')]
      });
      
      if (!response.ok) {
        throw new Error('Falha ao criar conversa');
      }
      
      const data = await response.json();
      
      // Redirecionar para o chat
      setLocation(`/chat/${data.chatId}`);
      
    } catch (error) {
      console.error('Erro ao criar chat:', error);
      toast({
        title: "Erro ao iniciar conversa",
        description: "Não foi possível iniciar a conversa. Tente novamente mais tarde.",
        variant: "destructive"
      });
      
      // Fallback para o modal caso o endpoint falhe
      setChatModalOpen(true);
    }
  };

  const getUserTypeLabel = (type: string) => {
    switch (type) {
      case 'tutor':
        return 'Tutor';
      case 'doador':
        return 'Doador';
      case 'voluntário':
        return 'Voluntário';
      case 'veterinário':
        return 'Veterinário';
      default:
        return type;
    }
  };
  
  // Get example user posts for display
  const getAllUserPosts = () => {
    return [
      { id: 1, postType: 'pet', content: 'Novo pet resgatado', date: '2025-05-10', likes: 5, comments: 2 },
      { id: 2, postType: 'donation', content: 'Doação para abrigo', date: '2025-05-08', likes: 7, comments: 3 },
      { id: 3, postType: 'vet_help', content: 'Procurando veterinário', date: '2025-05-05', likes: 3, comments: 1 }
    ];
  };

  // Dados de exemplo para relacionamentos
  const mockUsers = {
    followers: [
      { id: 1, name: 'Ana Silva', city: 'São Paulo', profileImage: '' },
      { id: 2, name: 'João Oliveira', city: 'Rio de Janeiro', profileImage: '' },
      { id: 3, name: 'Carla Santos', city: 'Belo Horizonte', profileImage: '' }
    ],
    following: [
      { id: 4, name: 'Pedro Costa', city: 'Salvador', profileImage: '' },
      { id: 5, name: 'Mariana Lima', city: 'Fortaleza', profileImage: '' }
    ],
    friends: [
      { id: 2, name: 'João Oliveira', city: 'Rio de Janeiro', profileImage: '' },
      { id: 5, name: 'Mariana Lima', city: 'Fortaleza', profileImage: '' }
    ]
  };

  return (
    <div className="app-container">
      {/* Header */}
      <Header 
        title={isOwnProfile ? "Meu Perfil" : "Perfil"} 
        showFilters={false}
        showBack={!isOwnProfile}
        onBack={handleBack}
      />
      
      {/* Main Content */}
      <main className={activeView === 'posts' ? "pb-16" : "pb-4"}>
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-neutral-600">Carregando perfil...</p>
          </div>
        ) : profileData ? (
          <>
            {/* Seção comum para todas as visualizações - Informações do perfil */}
            <div className="p-4">
              {/* Seção de informações do perfil */}
              <div className="flex">
                {/* Avatar section */}
                <div className="mr-4">
                  {isOwnProfile ? (
                    <div 
                      className="relative h-20 w-20 cursor-pointer"
                      onClick={() => setIsPhotoDialogOpen(true)}
                    >
                      <Avatar className="h-20 w-20">
                        {profileData?.profileImage ? (
                          <AvatarImage 
                            src={profileData.profileImage}
                            alt={profileData?.name || 'User'} 
                            className="h-full w-full object-cover" 
                          />
                        ) : (
                          <AvatarFallback className="bg-neutral-200 text-neutral-700 text-2xl">
                            {generateInitials(profileData?.name || 'User')}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="absolute bottom-0 right-0 bg-[#F5821D] text-white rounded-full w-6 h-6 flex items-center justify-center">
                        <span className="material-icons text-xs">add_a_photo</span>
                      </div>
                    </div>
                  ) : (
                    <Avatar className="h-20 w-20">
                      {profileData?.profileImage ? (
                        <AvatarImage 
                          src={profileData.profileImage}
                          alt={profileData?.name || 'User'} 
                          className="h-full w-full object-cover" 
                        />
                      ) : (
                        <AvatarFallback className="bg-neutral-200 text-neutral-700 text-2xl">
                          {generateInitials(profileData?.name || 'User')}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  )}
                </div>
                
                {/* Informações do usuário lado a lado */}
                <div className="flex-1">
                  {/* Nome editável */}
                  <div>
                    {isEditingName ? (
                      <div className="flex items-center space-x-2">
                        <Input
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="h-8 py-1 text-lg font-medium"
                          placeholder="Nome"
                        />
                        <Button 
                          size="icon" 
                          className="h-6 w-6" 
                          onClick={handleSaveName}
                          disabled={updateProfile.isPending}
                        >
                          <Check size={14} />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="outline" 
                          className="h-6 w-6" 
                          onClick={() => setIsEditingName(false)}
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <h3 className="text-lg font-medium text-neutral-900">{profileData?.name || 'Usuário'}</h3>
                        {isOwnProfile && (
                          <button 
                            className="text-neutral-500 hover:text-primary ml-2"
                            onClick={handleEditName}
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Cidade editável */}
                  <div className="mt-1">
                    {isEditingCity ? (
                      <div className="flex items-center space-x-2">
                        <Input
                          value={newCity}
                          onChange={(e) => setNewCity(e.target.value)}
                          className="h-7 py-1 text-sm"
                          placeholder="Cidade"
                        />
                        <Button 
                          size="icon" 
                          className="h-6 w-6" 
                          onClick={handleSaveCity}
                          disabled={updateProfile.isPending}
                        >
                          <Check size={14} />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="outline" 
                          className="h-6 w-6" 
                          onClick={() => setIsEditingCity(false)}
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <p className="text-sm text-neutral-600">{profileData?.city || 'Localização não disponível'}</p>
                        {isOwnProfile && (
                          <button 
                            className="text-neutral-500 hover:text-primary ml-2"
                            onClick={handleEditCity}
                          >
                            <Edit2 size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Bio e website na mesma linha horizontal */}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                    {/* Bio */}
                    <div className="flex items-center">
                      {isEditingBio ? (
                        <div className="flex items-center space-x-2">
                          <Input
                            value={newBio}
                            onChange={(e) => setNewBio(e.target.value)}
                            className="h-7 py-1 text-sm max-w-[180px]"
                            placeholder="Descrição"
                          />
                          <Button 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={handleSaveBio}
                            disabled={updateProfile.isPending}
                          >
                            <Check size={14} />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="outline" 
                            className="h-6 w-6" 
                            onClick={() => setIsEditingBio(false)}
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <p className="text-sm text-neutral-600 line-clamp-1 max-w-[150px]">
                            {profileData?.bio || (isOwnProfile ? "Adicione uma descrição..." : "Sem descrição")}
                          </p>
                          {isOwnProfile && (
                            <button 
                              className="text-neutral-500 hover:text-primary ml-2 flex-shrink-0"
                              onClick={handleEditBio}
                            >
                              <Edit2 size={12} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Website */}
                    <div className="flex items-center">
                      {isEditingWebsite ? (
                        <div className="flex items-center space-x-2">
                          <Input
                            value={newWebsite}
                            onChange={(e) => setNewWebsite(e.target.value)}
                            className="h-7 py-1 text-sm max-w-[180px]"
                            placeholder="Link"
                          />
                          <Button 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={handleSaveWebsite}
                            disabled={updateProfile.isPending}
                          >
                            <Check size={14} />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="outline" 
                            className="h-6 w-6" 
                            onClick={() => setIsEditingWebsite(false)}
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          {profileData?.website ? (
                            <a 
                              href={profileData.website.startsWith('http') ? profileData.website : `https://${profileData.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary flex items-center hover:underline truncate max-w-[150px]"
                            >
                              <ExternalLink size={12} className="mr-1 flex-shrink-0" />
                              {profileData.website}
                            </a>
                          ) : (
                            <p className="text-sm text-neutral-500">
                              {isOwnProfile ? "Adicione um link..." : "Sem link"}
                            </p>
                          )}
                          {isOwnProfile && (
                            <button 
                              className="text-neutral-500 hover:text-primary ml-2 flex-shrink-0"
                              onClick={handleEditWebsite}
                            >
                              <Edit2 size={12} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-1 flex items-center text-xs text-neutral-600">
                    <span className="material-icons text-sm mr-1">verified</span>
                    {getUserTypeLabel(profileData?.userType || 'tutor')}
                  </div>
                </div>
                
                {isOwnProfile && (
                  <div className="ml-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleLogout}
                    >
                      Sair
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="mt-4">
                <GamificationInfo 
                  points={profileData?.points || 0} 
                  level={profileData?.level || 1}
                  badges={profileData?.achievementBadges || []}
                />
              </div>
              
              {/* Contadores com clique para mostrar listas - Sempre visíveis */}
              <div className="mt-6 grid grid-cols-4 gap-2 text-center">
                <div 
                  className={`p-2 rounded-lg cursor-pointer hover:bg-neutral-200 transition ${activeView === 'followers' ? 'bg-neutral-200' : 'bg-neutral-100'}`}
                  onClick={() => handleViewChange('followers')}
                >
                  <p className="text-lg font-bold text-primary">
                    {relationshipCounts?.followerCount || 0}
                  </p>
                  <p className="text-xs text-neutral-600">Seguidores</p>
                </div>
                <div 
                  className={`p-2 rounded-lg cursor-pointer hover:bg-neutral-200 transition ${activeView === 'following' ? 'bg-neutral-200' : 'bg-neutral-100'}`}
                  onClick={() => handleViewChange('following')}
                >
                  <p className="text-lg font-bold text-primary">
                    {relationshipCounts?.followingCount || 0}
                  </p>
                  <p className="text-xs text-neutral-600">Seguindo</p>
                </div>
                <div 
                  className={`p-2 rounded-lg cursor-pointer hover:bg-neutral-200 transition ${activeView === 'friends' ? 'bg-neutral-200' : 'bg-neutral-100'}`}
                  onClick={() => handleViewChange('friends')}
                >
                  <p className="text-lg font-bold text-primary">
                    {relationshipCounts?.friendsCount || 0}
                  </p>
                  <p className="text-xs text-neutral-600">Amigos</p>
                </div>
                <div 
                  className={`p-2 rounded-lg cursor-pointer hover:bg-neutral-200 transition ${activeView === 'posts' ? 'bg-neutral-200' : 'bg-neutral-100'}`}
                  onClick={() => handleViewChange('posts')}
                >
                  <p className="text-lg font-bold text-primary">
                    {relationshipCounts?.postsCount || getAllUserPosts().length}
                  </p>
                  <p className="text-xs text-neutral-600">Posts</p>
                </div>
              </div>
            </div>
            
            {/* Conteúdo específico para cada visualização */}
            {/* Visualização de Seguidores */}
            {activeView === 'followers' && (
              <div className="p-4 pt-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Seguidores</h3>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleViewChange('posts')}
                  >
                    Voltar
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {mockUsers.followers.map((user) => (
                    <div 
                      key={user.id}
                      className="flex items-center justify-between p-3 bg-white rounded-lg shadow"
                    >
                      <div className="flex items-center">
                        <Avatar className="h-12 w-12 mr-3">
                          {user.profileImage ? (
                            <AvatarImage 
                              src={user.profileImage}
                              className="h-full w-full object-cover" 
                            />
                          ) : (
                            <AvatarFallback className="bg-neutral-200 text-neutral-700">
                              {generateInitials(user.name || 'User')}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <h5 className="font-medium">{user.name}</h5>
                          <p className="text-xs text-neutral-500">{user.city || 'Localização não informada'}</p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setLocation(`/profile/${user.id}`)}
                      >
                        Ver perfil
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Visualização de Seguindo */}
            {activeView === 'following' && (
              <div className="p-4 pt-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Seguindo</h3>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleViewChange('posts')}
                  >
                    Voltar
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {mockUsers.following.map((user) => (
                    <div 
                      key={user.id}
                      className="flex items-center justify-between p-3 bg-white rounded-lg shadow"
                    >
                      <div className="flex items-center">
                        <Avatar className="h-12 w-12 mr-3">
                          {user.profileImage ? (
                            <AvatarImage 
                              src={user.profileImage}
                              className="h-full w-full object-cover" 
                            />
                          ) : (
                            <AvatarFallback className="bg-neutral-200 text-neutral-700">
                              {generateInitials(user.name || 'User')}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <h5 className="font-medium">{user.name}</h5>
                          <p className="text-xs text-neutral-500">{user.city || 'Localização não informada'}</p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setLocation(`/profile/${user.id}`)}
                      >
                        Ver perfil
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Visualização de Amigos */}
            {activeView === 'friends' && (
              <div className="p-4 pt-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Amigos</h3>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleViewChange('posts')}
                  >
                    Voltar
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {mockUsers.friends.map((user) => (
                    <div 
                      key={user.id}
                      className="flex items-center justify-between p-3 bg-white rounded-lg shadow"
                    >
                      <div className="flex items-center">
                        <Avatar className="h-12 w-12 mr-3">
                          {user.profileImage ? (
                            <AvatarImage 
                              src={user.profileImage}
                              className="h-full w-full object-cover" 
                            />
                          ) : (
                            <AvatarFallback className="bg-neutral-200 text-neutral-700">
                              {generateInitials(user.name || 'User')}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <h5 className="font-medium">{user.name}</h5>
                          <p className="text-xs text-neutral-500">{user.city || 'Localização não informada'}</p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setLocation(`/profile/${user.id}`)}
                      >
                        Ver perfil
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Visualização padrão do perfil - abas e postagens */}
            {activeView === 'posts' && (
              <div className="p-4 pt-0">
                {/* Opções para interagir com outros perfis */}
                {!isOwnProfile && user && (
                  <div className="mt-2 mb-4 flex space-x-2">
                    <Button 
                      onClick={handleFollowToggle}
                      variant={followingStatus?.isFollowing ? "outline" : "default"}
                      className="flex-1"
                      disabled={followUser.isPending || unfollowUser.isPending}
                    >
                      {followingStatus?.isFollowing ? (
                        <>
                          <UserMinus size={16} className="mr-1" />
                          Deixar de seguir
                        </>
                      ) : (
                        <>
                          <UserPlus size={16} className="mr-1" />
                          Seguir
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="secondary"
                      className="flex-1"
                      onClick={handleMessageUser}
                    >
                      <MessageCircle size={16} className="mr-1" />
                      Mensagem
                    </Button>
                  </div>
                )}
                
                {/* Tabs para posts */}
                <Tabs defaultValue="posts" className="w-full mt-4" onValueChange={setSelectedTab}>
                  <div className="px-4 border-b border-neutral-200">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="posts">Publicações</TabsTrigger>
                      <TabsTrigger value="saved">Salvos</TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <TabsContent value="posts" className="mt-4">
                    {getAllUserPosts().length > 0 ? (
                      <div className="space-y-4">
                        {getAllUserPosts().map((post) => (
                          <div 
                            key={post.id}
                            className="p-4 bg-white rounded-lg shadow mb-4"
                          >
                            <div className="flex items-center mb-3">
                              <Avatar className="h-10 w-10 mr-3">
                                {profileData?.profileImage ? (
                                  <AvatarImage 
                                    src={profileData.profileImage}
                                    className="h-full w-full object-cover" 
                                  />
                                ) : (
                                  <AvatarFallback className="bg-neutral-200 text-neutral-700">
                                    {generateInitials(profileData?.name || 'User')}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <div>
                                <h5 className="text-sm font-medium">{profileData?.name}</h5>
                                <p className="text-xs text-neutral-500">{post.postType}</p>
                              </div>
                            </div>
                            
                            <p className="text-sm mb-3">{post.content}</p>
                            
                            <div className="flex justify-between text-xs text-neutral-500">
                              <span>{post.date}</span>
                              <div className="flex space-x-3">
                                <span className="flex items-center">
                                  <span className="material-icons text-sm mr-1">favorite_border</span>
                                  {post.likes}
                                </span>
                                <span className="flex items-center">
                                  <span className="material-icons text-sm mr-1">chat_bubble_outline</span>
                                  {post.comments}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-neutral-500">Nenhum post encontrado</p>
                        {isOwnProfile && (
                          <Button 
                            className="mt-2"
                            onClick={() => setCreatePostModalOpen(true)}
                          >
                            Criar post
                          </Button>
                        )}
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="saved" className="mt-0">
                    {savedPosts && savedPosts.length > 0 ? (
                      <div className="space-y-4 p-4">
                        {savedPosts.map((post) => (
                          <div 
                            key={post.id}
                            className="p-4 bg-white rounded-lg shadow mb-4"
                          >
                            <div className="flex items-center mb-3">
                              <Avatar className="h-10 w-10 mr-3">
                                <AvatarImage 
                                  src={post.userPhotoUrl}
                                  className="h-full w-full object-cover" 
                                />
                                <AvatarFallback className="bg-neutral-200 text-neutral-700">
                                  {generateInitials(post.username || 'User')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h5 className="text-sm font-medium">{post.username}</h5>
                                <p className="text-xs text-neutral-500">
                                  {new Date(post.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            
                            {/* Mídia do post (imagem ou vídeo) */}
                            {post.mediaUrl && (
                              <div className="w-full mb-3">
                                {post.mediaType === 'video' ? (
                                  <video 
                                    src={post.mediaUrl} 
                                    controls 
                                    className="w-full h-auto rounded-md"
                                    playsInline
                                  />
                                ) : (
                                  <img
                                    src={post.mediaUrl}
                                    alt="Post image"
                                    className="w-full h-auto rounded-md"
                                  />
                                )}
                              </div>
                            )}
                            
                            <p className="text-sm mb-3">{post.content}</p>
                            
                            <div className="flex justify-between text-xs text-neutral-500">
                              <span>{post.likesCount} curtidas</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <span className="material-icons text-3xl text-neutral-300 mb-2">
                          bookmark_border
                        </span>
                        <p className="text-neutral-500">Nenhum post salvo</p>
                        <p className="text-sm text-neutral-400 mt-1">
                          Salve posts clicando no ícone de marcador
                        </p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </>
        ) : (
          <div className="p-8 text-center">
            <span className="material-icons text-4xl text-neutral-400 mb-2">error_outline</span>
            <p className="text-neutral-600">Usuário não encontrado</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={handleBack}
            >
              Voltar para o início
            </Button>
          </div>
        )}
      </main>
      
      {/* Navegação inferior só aparece quando estiver na visualização de posts */}
      {isOwnProfile && activeView === 'posts' && (
        <>
          <BottomNavigation />
          
          <CreatePostModal 
            open={createPostModalOpen} 
            onOpenChange={setCreatePostModalOpen} 
          />
          
          <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Atualizar foto de perfil</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-4">
                <Avatar className="h-24 w-24">
                  {profileData?.profileImage ? (
                    <AvatarImage 
                      src={profileData.profileImage}
                      alt={profileData?.name || 'User'} 
                      className="h-full w-full object-cover" 
                    />
                  ) : (
                    <AvatarFallback className="bg-neutral-200 text-neutral-700 text-3xl">
                      {generateInitials(profileData?.name || 'User')}
                    </AvatarFallback>
                  )}
                </Avatar>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={updateProfilePhoto.isPending}
                  className="bg-[#F5821D] hover:bg-[#F5821D]/90"
                >
                  {updateProfilePhoto.isPending ? 'Enviando...' : 'Selecionar nova foto'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Modal de chat com usuário */}
          {chatModalOpen && profileData && (
            <AdoptionChatModal
              isOpen={chatModalOpen}
              onClose={() => setChatModalOpen(false)}
              targetUser={{
                id: parseInt(id || '0'),
                name: profileData.name || 'Usuário'
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
