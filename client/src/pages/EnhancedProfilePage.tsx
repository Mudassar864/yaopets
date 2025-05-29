import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/Header";
import BottomNavigation from "@/components/layout/BottomNavigation";
import CreatePostModal from "@/components/modals/CreatePostModal";
import AdoptionChatModal from "@/components/modals/AdoptionChatModal";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

// Importação dos novos componentes modernos
import ProfileHeader from "@/components/ui/profile/ProfileHeader";
import ProfileStats from "@/components/ui/profile/ProfileStats";
import ProfileGamification from "@/components/ui/profile/ProfileGamification";

export default function EnhancedProfilePage() {
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
    enabled: Boolean(isOwnProfile && user?.id),
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

  return (
    <div className="app-container bg-neutral-50">
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
            {/* Componente de cabeçalho de perfil moderno */}
            <ProfileHeader
              profileData={profileData}
              isOwnProfile={isOwnProfile}
              isEditingName={isEditingName}
              isEditingCity={isEditingCity}
              isEditingBio={isEditingBio}
              isEditingWebsite={isEditingWebsite}
              newName={newName}
              newCity={newCity}
              newBio={newBio}
              newWebsite={newWebsite}
              isPhotoDialogOpen={isPhotoDialogOpen}
              setIsPhotoDialogOpen={setIsPhotoDialogOpen}
              handleEditName={handleEditName}
              handleEditCity={handleEditCity}
              handleEditBio={handleEditBio}
              handleEditWebsite={handleEditWebsite}
              handleSaveName={handleSaveName}
              handleSaveCity={handleSaveCity}
              handleSaveBio={handleSaveBio}
              handleSaveWebsite={handleSaveWebsite}
              setNewName={setNewName}
              setNewCity={setNewCity}
              setNewBio={setNewBio}
              setNewWebsite={setNewWebsite}
              setIsEditingName={setIsEditingName}
              setIsEditingCity={setIsEditingCity}
              setIsEditingBio={setIsEditingBio}
              setIsEditingWebsite={setIsEditingWebsite}
              followingStatus={followingStatus}
              handleFollowToggle={handleFollowToggle}
              handleMessageUser={handleMessageUser}
              handleLogout={handleLogout}
              followUser={followUser}
              unfollowUser={unfollowUser}
              updateProfile={updateProfile}
              getUserTypeLabel={getUserTypeLabel}
            />
            
            <div className="px-4 mt-4">
              {/* Componente de estatísticas modernizado */}
              <ProfileStats 
                relationshipCounts={relationshipCounts || {}}
                pets={pets}
                savedPosts={savedPosts}
                activeView={activeView}
                handleViewChange={handleViewChange}
              />
              
              {/* Sistema de gamificação modernizado */}
              <div className="mb-4">
                <ProfileGamification 
                  points={profileData?.points || 0} 
                  level={profileData?.level || 'Iniciante'}
                  badges={profileData?.achievementBadges || []}
                />
              </div>
              
              {/* Conteúdo principal baseado na visualização selecionada */}
              {activeView === 'posts' ? (
                <div className="space-y-4">
                  <Tabs value={selectedTab} className="w-full" onValueChange={setSelectedTab}>
                    <TabsList className="w-full mb-4">
                      <TabsTrigger value="posts" className="flex-1">Publicações</TabsTrigger>
                      <TabsTrigger value="pets" className="flex-1">Pets</TabsTrigger>
                      <TabsTrigger value="saved" className="flex-1">Salvos</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="posts" className="space-y-4">
                      {/* Aqui ficaria a lista de publicações do usuário */}
                      <div className="text-center p-6 bg-white rounded-xl shadow-sm">
                        <p className="text-neutral-600">Sem publicações</p>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="pets" className="space-y-4">
                      {/* Aqui ficaria a lista de pets do usuário */}
                      {pets && pets.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                          {/* Lista de pets seria renderizada aqui */}
                        </div>
                      ) : (
                        <div className="text-center p-6 bg-white rounded-xl shadow-sm">
                          <p className="text-neutral-600">Nenhum pet registrado</p>
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="saved" className="space-y-4">
                      {/* Aqui ficaria a lista de posts salvos */}
                      {savedPosts && savedPosts.length > 0 ? (
                        <div className="space-y-4">
                          {/* Lista de posts salvos seria renderizada aqui */}
                        </div>
                      ) : (
                        <div className="text-center p-6 bg-white rounded-xl shadow-sm">
                          <p className="text-neutral-600">Nenhum post salvo</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              ) : activeView === 'followers' ? (
                <div className="bg-white rounded-xl shadow-sm p-4">
                  <h3 className="text-lg font-semibold mb-4">Seguidores</h3>
                  {/* Aqui ficaria a lista de seguidores */}
                </div>
              ) : activeView === 'following' ? (
                <div className="bg-white rounded-xl shadow-sm p-4">
                  <h3 className="text-lg font-semibold mb-4">Seguindo</h3>
                  {/* Aqui ficaria a lista de seguidos */}
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <div className="p-8 text-center">
            <p className="text-neutral-600">Usuário não encontrado</p>
          </div>
        )}
      </main>

      {/* Dialog de upload de foto */}
      <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar foto de perfil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <label 
                htmlFor="profile-photo-upload" 
                className="inline-block px-4 py-2 bg-primary text-white rounded-md cursor-pointer hover:bg-primary/90 transition"
              >
                Selecionar imagem
              </label>
              <input
                id="profile-photo-upload"
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            {updateProfilePhoto.isPending && (
              <div className="text-center">
                <div className="inline-block animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
                <p className="text-sm text-neutral-600 mt-2">Enviando foto...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom Navigation */}
      {activeView === 'posts' && (
        <BottomNavigation
          activeItem="profile"
          onCreatePost={() => setCreatePostModalOpen(true)}
        />
      )}

      {/* Post Creation Modal */}
      <CreatePostModal 
        isOpen={createPostModalOpen} 
        onClose={() => setCreatePostModalOpen(false)}
      />
    </div>
  );
}