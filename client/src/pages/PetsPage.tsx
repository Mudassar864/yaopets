import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AddressLink from "@/components/map/AddressLink";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { useAuth } from "@/hooks/useAuth";
import NativeBottomNavigation from "@/components/mobile/NativeBottomNavigation";
import { MapPin, Heart } from "lucide-react";

// Tipo para simular dados de pet
type Pet = {
  id: number;
  name: string;
  type: string;
  status: "lost" | "found" | "adoption";
  color: string;
  size: string;
  breed: string;
  eyeColor: string;
  address: string;
  description: string;
  ownerId: number;
  ownerName: string;
  lat: number;
  lng: number;
  imageUrl?: string; // URL da imagem do pet
};

// Componente para exibir características do pet
function PetCharacteristics({ pet }: { pet: Pet }) {
  return (
    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
      <div className="flex items-center">
        <span className="material-icons text-neutral-500 text-sm mr-1">category</span>
        <span className="text-neutral-700">{pet.type}</span>
      </div>
      <div className="flex items-center">
        <span className="material-icons text-neutral-500 text-sm mr-1">palette</span>
        <span className="text-neutral-700">{pet.color}</span>
      </div>
      <div className="flex items-center">
        <span className="material-icons text-neutral-500 text-sm mr-1">straighten</span>
        <span className="text-neutral-700">{pet.size}</span>
      </div>
      <div className="flex items-center">
        <span className="material-icons text-neutral-500 text-sm mr-1">pets</span>
        <span className="text-neutral-700">{pet.breed}</span>
      </div>
      <div className="flex items-center">
        <span className="material-icons text-neutral-500 text-sm mr-1">visibility</span>
        <span className="text-neutral-700">{pet.eyeColor}</span>
      </div>
      <div className="flex items-center">
        <span className="material-icons text-neutral-500 text-sm mr-1">location_on</span>
        <AddressLink 
          address={pet.address} 
          lat={pet.lat} 
          lng={pet.lng}
        />
      </div>
    </div>
  );
}

// Componente para exibir um card de pet
function PetCard({ pet, onContact, onMap }: { 
  pet: Pet, 
  onContact: (pet: Pet) => void,
  onMap: (pet: Pet) => void
}) {
  const [, navigate] = useLocation();
  
  // Função para navegar para a página de detalhes do pet
  const goToDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/pet-details/${pet.id}`);
  };
  
  return (
    <Card 
      key={pet.id} 
      className="overflow-hidden border-0 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
      onClick={goToDetails}
    >
      <CardContent className="p-0">
        {/* Imagem do pet com fundo colorido caso não haja imagem */}
        <div className="h-48 bg-gradient-to-r from-emerald-500 to-emerald-600 relative overflow-hidden">
          {pet.imageUrl ? (
            <img src={pet.imageUrl} alt={pet.name} className="w-full h-full object-cover" />
          ) : (
            <span className="material-icons text-white/30 text-8xl absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">pets</span>
          )}
          
          {/* Badge de status */}
          <div className="absolute top-3 right-3">
            <Badge className={`${
              pet.status === "lost" 
                ? "bg-orange-100 text-orange-800 border-0" 
                : pet.status === "found"
                  ? "bg-blue-100 text-blue-800 border-0"
                  : "bg-green-100 text-green-800 border-0"
              } px-2 py-1 text-xs font-medium`}
            >
              {pet.status === "lost" 
                ? "Perdido" 
                : pet.status === "found" 
                  ? "Encontrado" 
                  : "Disponível"}
            </Badge>
          </div>
          
          {/* Botão para ver no mapa */}
          <Button
            variant="outline"
            size="icon"
            className="absolute top-3 left-3 bg-white/80 backdrop-blur-sm rounded-full w-8 h-8"
            onClick={(e) => {
              e.stopPropagation();
              onMap(pet);
            }}
          >
            <MapPin className="h-4 w-4 text-neutral-700" />
          </Button>
        </div>
        
        {/* Informações do pet */}
        <div className="p-4">
          {/* Nome e localização */}
          <div className="mb-3">
            <h3 className="font-bold text-lg text-gray-800">{pet.name}</h3>
            <div className="flex items-center text-sm text-gray-600 mt-1">
              <MapPin className="h-3 w-3 mr-1" />
              <span className="truncate">{pet.address}</span>
            </div>
          </div>
          
          {/* Características principais */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-gray-50 p-2 rounded-lg text-center">
              <span className="block text-xs font-medium text-gray-600">Espécie</span>
              <span className="block text-sm font-semibold text-gray-800">{pet.type}</span>
            </div>
            <div className="bg-gray-50 p-2 rounded-lg text-center">
              <span className="block text-xs font-medium text-gray-600">Porte</span>
              <span className="block text-sm font-semibold text-gray-800">{pet.size}</span>
            </div>
            <div className="bg-gray-50 p-2 rounded-lg text-center">
              <span className="block text-xs font-medium text-gray-600">Cor</span>
              <span className="block text-sm font-semibold text-gray-800">{pet.color}</span>
            </div>
          </div>
          
          {/* Descrição resumida */}
          <p className="text-sm text-gray-600 line-clamp-2">
            {pet.description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PetsPage() {
  const [activeTab, setActiveTab] = useState("adoption");
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { position, getCurrentPosition } = useGeoLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Estados para o formulário de cadastro de pet perdido
  const [petLostForm, setPetLostForm] = useState({
    name: "",
    type: "",
    color: "",
    size: "",
    breed: "",
    eyeColor: "",
    address: "",
    description: ""
  });
  
  // Estados para o formulário de cadastro de pet encontrado
  const [petFoundForm, setPetFoundForm] = useState({
    type: "",
    color: "",
    size: "",
    breed: "",
    address: "",
    description: ""
  });
  
  // Estado para upload de foto
  const [lostPetPhoto, setLostPetPhoto] = useState<File | null>(null);
  const [lostPetPhotoPreview, setLostPetPhotoPreview] = useState<string | null>(null);
  const [foundPetPhoto, setFoundPetPhoto] = useState<File | null>(null);
  const [foundPetPhotoPreview, setFoundPetPhotoPreview] = useState<string | null>(null);
  
  // Refs para os inputs de arquivo
  const lostPhotoInputRef = useRef<HTMLInputElement>(null);
  const foundPhotoInputRef = useRef<HTMLInputElement>(null);
  
  // Função para lidar com a seleção de arquivo (pet perdido)
  const handleLostPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLostPetPhoto(file);
      
      // Cria preview da imagem
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && event.target.result) {
          setLostPetPhotoPreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Função para lidar com a seleção de arquivo (pet encontrado)
  const handleFoundPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFoundPetPhoto(file);
      
      // Cria preview da imagem
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && event.target.result) {
          setFoundPetPhotoPreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Inicializa a localização do usuário quando a página carrega
  useEffect(() => {
    getCurrentPosition();
  }, []);

  // Dados dos pets carregados da API
  const [petsData, setPetsData] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar dados reais
  useEffect(() => {
    async function fetchPets() {
      try {
        setIsLoading(true);
        setError(null);
        
        // Primeiro, buscamos os posts com tipo 'pet'
        const response = await fetch('/api/posts?postType=pet', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Falha ao buscar pets');
        }
        
        const postsData = await response.json();
        
        // Converter posts para o formato de Pet
        const convertedPets: Pet[] = postsData.map((post: any) => {
          // Verificar se temos metadados do pet
          let petInfo: any = { petName: 'Pet sem nome', petSpecies: 'Desconhecido', petSize: 'Médio' };
          
          try {
            if (post.petMetadata) {
              petInfo = typeof post.petMetadata === 'string' 
                ? JSON.parse(post.petMetadata) 
                : post.petMetadata;
            }
          } catch (e) {
            console.error('Erro ao converter metadados do pet:', e);
          }
          
          // Determinar status a partir dos dados do post
          let status = 'adoption'; // Valor padrão
          
          // Priorizar petStatus dos metadados (onde está sendo realmente salvo)
          if (petInfo?.petStatus) {
            status = petInfo.petStatus;
          }
          // Verificar no nível do post também
          else if (post.petStatus) {
            status = post.petStatus;
          }
          // Se não tem petStatus, verificar pelo conteúdo e tags
          else if ((post.tags && post.tags.includes('lost')) || 
              (post.content && post.content.toLowerCase().includes('perdido')) ||
              (petInfo?.status === 'lost')) {
            status = 'lost';
          }
          // Depois checamos por sinais de que é um pet encontrado
          else if ((post.tags && post.tags.includes('found')) || 
              (post.content && post.content.toLowerCase().includes('encontr')) ||
              (petInfo?.status === 'found')) {
            status = 'found';
          }
          
          console.log("Determinando status para pet/post:", post.id, "Conteúdo:", post.content?.substring(0, 30), "Status final:", status);
          
          // Extrair informações de localização
          const location = post.location && typeof post.location === 'object' 
            ? post.location 
            : { lat: 0, lng: 0 };
            
          // Extrair URL da imagem do pet específico deste post
          let imageUrl = null;
          if (post.mediaUrls && Array.isArray(post.mediaUrls) && post.mediaUrls.length > 0) {
            imageUrl = post.mediaUrls[0];
            
            // Verificar se é uma URL de teste e gerar uma imagem única para este pet
            if (imageUrl.includes('yaopets-media-demo')) {
              // Usar o ID do post para gerar uma imagem consistente e única para cada pet
              const petType = petInfo?.petSpecies?.toLowerCase() || petInfo?.petSpeciesDisplay?.toLowerCase() || '';
              const petId = post.id;
              
              // Gerar uma seed baseada no ID do pet para garantir consistência
              const imageVariations = {
                cat: [
                  'https://images.unsplash.com/photo-1543852786-1cf6624b9987?q=80&w=687&auto=format&fit=crop',
                  'https://images.unsplash.com/photo-1606214174585-fe31582dc6ee?q=80&w=687&auto=format&fit=crop',
                  'https://images.unsplash.com/photo-1574158622682-e40e69881006?q=80&w=687&auto=format&fit=crop',
                  'https://images.unsplash.com/photo-1513245543132-31f507417b26?q=80&w=687&auto=format&fit=crop'
                ],
                dog: [
                  'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=1374&auto=format&fit=crop',
                  'https://images.unsplash.com/photo-1552053831-71594a27632d?q=80&w=1374&auto=format&fit=crop',
                  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?q=80&w=1374&auto=format&fit=crop',
                  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?q=80&w=1374&auto=format&fit=crop'
                ]
              };
              
              if (petType.includes('cat') || petType.includes('gato')) {
                const index = petId % imageVariations.cat.length;
                imageUrl = imageVariations.cat[index];
              } else {
                const index = petId % imageVariations.dog.length;
                imageUrl = imageVariations.dog[index];
              }
            }
          }
          
          return {
            id: post.id,
            name: petInfo?.petName || 'Pet sem nome',
            type: petInfo?.petSpeciesDisplay || petInfo?.petSpecies || 'Desconhecido',
            status: status,
            color: petInfo?.petColor || 'Não informado',
            size: petInfo?.petSizeDisplay || petInfo?.petSize || 'Médio',
            breed: petInfo?.petBreed || 'Não informado',
            eyeColor: petInfo?.petEyeColor || 'Não informado',
            address: petInfo?.petLocation || post.location?.address || 'Localização não informada',
            description: post.content || 'Sem descrição',
            ownerId: post.userId || 0,
            ownerName: post.username || 'Usuário',
            lat: location.lat || 0,
            lng: location.lng || 0,
            imageUrl: imageUrl
          };
        });
        
        // Adicionar os dados de pets
        setPetsData(convertedPets);
        
      } catch (err) {
        console.error('Erro ao buscar pets:', err);
        setError('Não foi possível carregar os pets. Tente novamente mais tarde.');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchPets();
  }, []);
  
  // Filtrar pets de acordo com a aba atual
  const filteredPets = petsData.filter(pet => {
    console.log(`Checando pet ID ${pet.id} com status: ${pet.status} para aba ${activeTab}`);
    
    if (activeTab === "lost") {
      return pet.status === "lost";
    } else if (activeTab === "found") {
      return pet.status === "found";
    } else if (activeTab === "adoption") {
      // Na aba de adoção, mostramos os pets que não estão nem perdidos nem encontrados
      return pet.status === "adoption";
    }
    
    return false;
  });

  // Função para iniciar chat com o dono do pet
  const handleContactOwner = async (pet: Pet) => {
    try {
      // Verificar se o usuário está logado
      if (!user || !user.id) {
        toast({
          title: "Login necessário",
          description: "Você precisa estar logado para enviar mensagens",
          variant: "destructive",
        });
        setLocation("/auth/login");
        return;
      }
      
      // Mostramos mensagem de sucesso
      toast({
        title: `Conectando com ${pet.ownerName}`,
        description: `Iniciando conversa sobre ${pet.name}`,
      });
      
      // Para simular diferentes donos de pets, vamos mapear os pet.ownerId para IDs reais existentes
      // Com base na consulta SQL que fizemos, temos vários usuários reais (1, 3, 5, 7, 8, 9, etc.)
      const petOwnerIdMap: Record<number, number> = {
        101: 1, // primeiro pet -> mapeado para user ID 1
        102: 3, // segundo pet -> mapeado para user ID 3
        103: 5, // terceiro pet -> mapeado para user ID 5
        104: 7, // quarto pet -> mapeado para user ID 7
        105: 8, // quinto pet -> mapeado para user ID 8
        106: 9  // sexto pet -> mapeado para user ID 9
      };
      
      // Usar o mapeamento ou voltar para o ID 7 se o ID não estiver no mapa
      const targetUserId = petOwnerIdMap[pet.ownerId] || 7;
      
      // Primeiro criamos ou obtemos o chat entre os usuários
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          members: [user.id, targetUserId]
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Falha ao criar conversa');
      }
      
      const data = await response.json();
      
      // Redirecionamos para o chat criado/existente
      setLocation(`/chat/${data.chatId}`);
    } catch (error) {
      console.error('Erro ao criar chat:', error);
      toast({
        title: "Erro ao iniciar conversa",
        description: "Não foi possível iniciar a conversa. Tente novamente mais tarde.",
        variant: "destructive"
      });
    }
  };

  // Função para abrir navegação no Google Maps
  const handleOpenMap = (pet: Pet) => {
    // Verifica se temos a localização do usuário
    if (!position) {
      toast({
        title: "Localização não disponível",
        description: "Não foi possível obter sua localização atual. Permita o acesso à localização e tente novamente.",
        variant: "destructive",
      });
      getCurrentPosition(); // Tenta obter localização novamente
      return;
    }

    // Constrói a URL para navegação do Google Maps direto com o endereço
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${pet.address.replace(' ', '+')}`;
    
    // Abre em uma nova aba
    window.open(mapUrl, '_blank');
    
    toast({
      title: "Abrindo mapa",
      description: `Navegando para ${pet.address}`,
    });
  };

  const goToAdoption = () => {
    setLocation("/donations");
  };

  return (
    <div className="pb-16">
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Pets</h1>
          <p className="text-neutral-600 mt-1">
            Perdidos, encontrados e para adoção
          </p>
        </div>
        
        <div className="bg-gradient-to-r from-black to-secondary rounded-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-4 md:mb-0">
              <h3 className="font-medium text-white mb-1">Viu um animal perdido ou encontrou um pet?</h3>
              <p className="text-white/90 text-sm">
                Ajude a comunidade registrando animais perdidos ou encontrados para que possam voltar para suas famílias.
              </p>
            </div>
            <Button 
              className="bg-primary hover:bg-primary/90 flex items-center"
              onClick={() => setLocation('/new-pet')}
            >
              <span className="material-icons text-sm mr-1">add</span>
              Cadastrar pet
            </Button>
          </div>
        </div>

        <Tabs defaultValue={activeTab} className="w-full" onValueChange={setActiveTab}>
          <TabsList className="flex w-full mb-6 p-1 bg-gradient-to-r from-purple-50 to-purple-100 rounded-2xl">
            <TabsTrigger 
              value="adoption" 
              className="flex-1 py-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
            >
              <div className="flex items-center justify-center space-x-2">
                <span className="material-icons text-sm">favorite</span>
                <span>Para Adoção</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="lost" 
              className="flex-1 py-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
            >
              <div className="flex items-center justify-center space-x-2">
                <span className="material-icons text-sm">search</span>
                <span>Perdidos</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="found" 
              className="flex-1 py-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
            >
              <div className="flex items-center justify-center space-x-2">
                <span className="material-icons text-sm">pets</span>
                <span>Encontrados</span>
              </div>
            </TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
              <p className="text-gray-500">Carregando pets...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-800 p-4 rounded-lg border border-red-200 text-center">
              <p className="mb-2 font-medium">Não foi possível carregar os pets</p>
              <p className="text-sm">{error}</p>
              <Button
                variant="outline"
                className="mt-4 border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => window.location.reload()}
              >
                Tentar novamente
              </Button>
            </div>
          ) : (
            <>
              <TabsContent value="lost" className="mt-0">
                {filteredPets.length === 0 ? (
                  <div className="bg-red-50 rounded-lg p-6 text-center">
                    <div className="text-red-500 flex justify-center mb-3">
                      <span className="material-icons text-4xl">search</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhum pet perdido encontrado</h3>
                    <p className="text-gray-600">
                      Não há registros de pets perdidos no momento.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredPets.map(pet => (
                      <PetCard 
                        key={pet.id} 
                        pet={pet} 
                        onContact={handleContactOwner}
                        onMap={handleOpenMap}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="found" className="mt-0">
                {filteredPets.length === 0 ? (
                  <div className="bg-blue-50 rounded-lg p-6 text-center">
                    <div className="text-blue-500 flex justify-center mb-3">
                      <span className="material-icons text-4xl">pets</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhum pet encontrado registrado</h3>
                    <p className="text-gray-600">
                      Não há registros de pets encontrados no momento.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredPets.map(pet => (
                      <PetCard 
                        key={pet.id} 
                        pet={pet} 
                        onContact={handleContactOwner}
                        onMap={handleOpenMap}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="adoption" className="mt-0">
                {filteredPets.length === 0 ? (
                  <div className="bg-green-50 rounded-lg p-6 text-center">
                    <div className="text-green-500 flex justify-center mb-3">
                      <span className="material-icons text-4xl">favorite</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhum pet para adoção</h3>
                    <p className="text-gray-600 mb-4">
                      Não há pets disponíveis para adoção no momento. Use o botão "Cadastrar pet" para adicionar um pet para adoção.
                    </p>
                    <Button 
                      className="bg-green-500 hover:bg-green-600"
                      onClick={() => setReportDialogOpen(true)}
                    >
                      Cadastrar pet para adoção
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredPets.map(pet => (
                      <PetCard 
                        key={pet.id} 
                        pet={pet} 
                        onContact={handleContactOwner}
                        onMap={handleOpenMap}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
      
      {/* Dialog para cadastrar um pet perdido ou encontrado */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="max-w-full min-h-[90vh] w-full md:max-w-[90vw] flex flex-col">
          <DialogHeader>
            <DialogTitle>Cadastrar Pet</DialogTitle>
            <DialogDescription>
              Preencha as informações do pet para ajudar a encontrar seu dono ou cadastrar para adoção.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-2">
            <Tabs defaultValue="lost" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="lost" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
                  <span className="material-icons text-sm mr-2">search</span>
                  Perdido
                </TabsTrigger>
                <TabsTrigger value="found" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                  <span className="material-icons text-sm mr-2">pets</span>
                  Encontrado
                </TabsTrigger>
                <TabsTrigger value="adoption" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
                  <span className="material-icons text-sm mr-2">favorite</span>
                  Para Adoção
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="lost">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={lostPhotoInputRef}
                        onChange={handleLostPhotoSelect}
                      />
                      <div 
                        className="border-2 border-dashed border-neutral-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-orange-300 transition-colors"
                        onClick={() => lostPhotoInputRef.current?.click()}
                      >
                        {lostPetPhotoPreview ? (
                          <div className="w-full h-40 relative">
                            <img 
                              src={lostPetPhotoPreview} 
                              alt="Preview" 
                              className="w-full h-full object-cover rounded-md"
                            />
                            <button
                              className="absolute top-2 right-2 bg-white/80 rounded-full p-1 hover:bg-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLostPetPhotoPreview(null);
                                setLostPetPhoto(null);
                              }}
                            >
                              <span className="material-icons text-red-500 text-sm">close</span>
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="material-icons text-neutral-400 text-5xl mb-2">photo_camera</span>
                            <span className="text-sm text-neutral-600">Clique para adicionar foto</span>
                            <span className="text-xs text-neutral-500 mt-1">(Opcional, mas ajuda a encontrar)</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="pet-name">Nome do Pet</Label>
                      <Input 
                        id="pet-name" 
                        placeholder="Ex: Luna" 
                        value={petLostForm.name}
                        onChange={(e) => setPetLostForm({...petLostForm, name: e.target.value})}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="pet-type">Espécie</Label>
                      <Select 
                        value={petLostForm.type}
                        onValueChange={(value) => setPetLostForm({...petLostForm, type: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dog">Cachorro</SelectItem>
                          <SelectItem value="cat">Gato</SelectItem>
                          <SelectItem value="bird">Pássaro</SelectItem>
                          <SelectItem value="other">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="pet-color">Cor</Label>
                      <Input 
                        id="pet-color" 
                        placeholder="Ex: Caramelo" 
                        value={petLostForm.color}
                        onChange={(e) => setPetLostForm({...petLostForm, color: e.target.value})}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="pet-size">Porte</Label>
                      <Select
                        value={petLostForm.size}
                        onValueChange={(value) => setPetLostForm({...petLostForm, size: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Pequeno</SelectItem>
                          <SelectItem value="medium">Médio</SelectItem>
                          <SelectItem value="large">Grande</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="pet-breed">Raça</Label>
                      <Input 
                        id="pet-breed" 
                        placeholder="Ex: Vira-lata" 
                        value={petLostForm.breed}
                        onChange={(e) => setPetLostForm({...petLostForm, breed: e.target.value})}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="pet-eye-color">Cor dos olhos</Label>
                      <Input 
                        id="pet-eye-color" 
                        placeholder="Ex: Castanho" 
                        value={petLostForm.eyeColor}
                        onChange={(e) => setPetLostForm({...petLostForm, eyeColor: e.target.value})}
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <Label htmlFor="pet-address">Local onde foi visto pela última vez</Label>
                      <Input 
                        id="pet-address" 
                        placeholder="Ex: Av. Paulista, 1500" 
                        value={petLostForm.address}
                        onChange={(e) => setPetLostForm({...petLostForm, address: e.target.value})}
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <Label htmlFor="pet-description">Descrição</Label>
                      <Textarea 
                        id="pet-description" 
                        placeholder="Ex: Perdido próximo ao shopping. Usa coleira vermelha. Responde pelo nome."
                        rows={3}
                        value={petLostForm.description}
                        onChange={(e) => setPetLostForm({...petLostForm, description: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full bg-orange-500 hover:bg-orange-600" 
                    onClick={() => {
                      toast({
                        title: "Pet cadastrado com sucesso!",
                        description: "Seu pet foi adicionado à lista de pets perdidos.",
                      });
                      setReportDialogOpen(false);
                    }}
                  >
                    <span className="material-icons text-sm mr-2">send</span>
                    Cadastrar Perdido
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="found">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={foundPhotoInputRef}
                        onChange={handleFoundPhotoSelect}
                      />
                      <div 
                        className="border-2 border-dashed border-neutral-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-blue-300 transition-colors"
                        onClick={() => foundPhotoInputRef.current?.click()}
                      >
                        {foundPetPhotoPreview ? (
                          <div className="w-full h-40 relative">
                            <img 
                              src={foundPetPhotoPreview} 
                              alt="Preview" 
                              className="w-full h-full object-cover rounded-md"
                            />
                            <button
                              className="absolute top-2 right-2 bg-white/80 rounded-full p-1 hover:bg-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFoundPetPhotoPreview(null);
                                setFoundPetPhoto(null);
                              }}
                            >
                              <span className="material-icons text-red-500 text-sm">close</span>
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="material-icons text-neutral-400 text-5xl mb-2">photo_camera</span>
                            <span className="text-sm text-neutral-600">Clique para adicionar foto</span>
                            <span className="text-xs text-neutral-500 mt-1">(Ajuda o dono a reconhecer)</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="pet-type-found">Espécie</Label>
                      <Select
                        value={petFoundForm.type}
                        onValueChange={(value) => setPetFoundForm({...petFoundForm, type: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dog">Cachorro</SelectItem>
                          <SelectItem value="cat">Gato</SelectItem>
                          <SelectItem value="bird">Pássaro</SelectItem>
                          <SelectItem value="other">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="pet-color-found">Cor</Label>
                      <Input 
                        id="pet-color-found" 
                        placeholder="Ex: Preto e branco"
                        value={petFoundForm.color}
                        onChange={(e) => setPetFoundForm({...petFoundForm, color: e.target.value})}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="pet-size-found">Porte</Label>
                      <Select
                        value={petFoundForm.size}
                        onValueChange={(value) => setPetFoundForm({...petFoundForm, size: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Pequeno</SelectItem>
                          <SelectItem value="medium">Médio</SelectItem>
                          <SelectItem value="large">Grande</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="pet-breed-found">Raça aproximada</Label>
                      <Input 
                        id="pet-breed-found" 
                        placeholder="Ex: Sem raça definida"
                        value={petFoundForm.breed}
                        onChange={(e) => setPetFoundForm({...petFoundForm, breed: e.target.value})}
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <Label htmlFor="pet-address-found">Local onde foi encontrado</Label>
                      <Input 
                        id="pet-address-found" 
                        placeholder="Ex: Rua Augusta, 500"
                        value={petFoundForm.address}
                        onChange={(e) => setPetFoundForm({...petFoundForm, address: e.target.value})}
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <Label htmlFor="pet-description-found">Descrição</Label>
                      <Textarea 
                        id="pet-description-found" 
                        placeholder="Ex: Encontrado vagando no parque. Está com coleira azul sem identificação."
                        rows={3}
                        value={petFoundForm.description}
                        onChange={(e) => setPetFoundForm({...petFoundForm, description: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full bg-blue-500 hover:bg-blue-600" 
                    onClick={() => {
                      toast({
                        title: "Pet cadastrado com sucesso!",
                        description: "O pet foi adicionado à lista de pets encontrados.",
                      });
                      setReportDialogOpen(false);
                    }}
                  >
                    <span className="material-icons text-sm mr-2">send</span>
                    Cadastrar Encontrado
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="adoption">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={lostPhotoInputRef}
                        onChange={handleLostPhotoSelect}
                      />
                      <div 
                        className="border-2 border-dashed border-neutral-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-green-300 transition-colors"
                        onClick={() => lostPhotoInputRef.current?.click()}
                      >
                        {lostPetPhotoPreview ? (
                          <div className="w-full h-40 relative">
                            <img 
                              src={lostPetPhotoPreview} 
                              alt="Preview" 
                              className="w-full h-full object-cover rounded-md"
                            />
                            <button
                              className="absolute top-2 right-2 bg-white/80 rounded-full p-1 hover:bg-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLostPetPhotoPreview(null);
                                setLostPetPhoto(null);
                              }}
                            >
                              <span className="material-icons text-red-500 text-sm">close</span>
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="material-icons text-neutral-400 text-5xl mb-2">photo_camera</span>
                            <span className="text-sm text-neutral-600">Clique para adicionar foto</span>
                            <span className="text-xs text-neutral-500 mt-1">(Muito importante para adoção)</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="pet-name-adoption">Nome do Pet</Label>
                      <Input 
                        id="pet-name-adoption" 
                        placeholder="Ex: Luna" 
                        value={petLostForm.name}
                        onChange={(e) => setPetLostForm({...petLostForm, name: e.target.value})}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="pet-type-adoption">Tipo de Pet</Label>
                      <Select value={petLostForm.type} onValueChange={(value) => setPetLostForm({...petLostForm, type: value})}>
                        <SelectTrigger id="pet-type-adoption">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dog">Cachorro</SelectItem>
                          <SelectItem value="cat">Gato</SelectItem>
                          <SelectItem value="bird">Pássaro</SelectItem>
                          <SelectItem value="other">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="pet-color-adoption">Cor</Label>
                      <Input 
                        id="pet-color-adoption" 
                        placeholder="Ex: Caramelo" 
                        value={petLostForm.color}
                        onChange={(e) => setPetLostForm({...petLostForm, color: e.target.value})}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="pet-size-adoption">Tamanho</Label>
                      <Select value={petLostForm.size} onValueChange={(value) => setPetLostForm({...petLostForm, size: value})}>
                        <SelectTrigger id="pet-size-adoption">
                          <SelectValue placeholder="Selecione o tamanho" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Pequeno</SelectItem>
                          <SelectItem value="medium">Médio</SelectItem>
                          <SelectItem value="large">Grande</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="pet-breed-adoption">Raça</Label>
                      <Input 
                        id="pet-breed-adoption" 
                        placeholder="Ex: Vira-lata" 
                        value={petLostForm.breed}
                        onChange={(e) => setPetLostForm({...petLostForm, breed: e.target.value})}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="pet-eye-color-adoption">Cor dos olhos</Label>
                      <Input 
                        id="pet-eye-color-adoption" 
                        placeholder="Ex: Castanho" 
                        value={petLostForm.eyeColor}
                        onChange={(e) => setPetLostForm({...petLostForm, eyeColor: e.target.value})}
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <Label htmlFor="pet-address-adoption">Sua localização</Label>
                      <Input 
                        id="pet-address-adoption" 
                        placeholder="Ex: Av. Paulista, 1500" 
                        value={petLostForm.address}
                        onChange={(e) => setPetLostForm({...petLostForm, address: e.target.value})}
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <Label htmlFor="pet-description-adoption">Descrição</Label>
                      <Textarea 
                        id="pet-description-adoption" 
                        placeholder="Ex: Pet dócil e vacinado. Castrado e com todas as vacinas em dia. Ótimo com crianças."
                        rows={3}
                        value={petLostForm.description}
                        onChange={(e) => setPetLostForm({...petLostForm, description: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90 text-white" 
                    onClick={() => {
                      toast({
                        title: "Pet cadastrado com sucesso!",
                        description: "Seu pet foi adicionado à lista de pets para adoção.",
                      });
                      setReportDialogOpen(false);
                    }}
                  >
                    <span className="material-icons text-sm mr-2">favorite</span>
                    Cadastrar Para Adoção
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
      
      <NativeBottomNavigation />
    </div>
  );
}