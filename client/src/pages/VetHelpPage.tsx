import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import CreateVetFundraiserModal from "@/components/modals/CreateVetFundraiserModal";
import VetHelpDonationModal from "@/components/modals/VetHelpDonationModal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

// Tipo para as campanhas de arrecadação
type Fundraiser = {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  currentAmount: number;
  targetAmount: number;
  daysRemaining: number;
  percentComplete: number;
  createdAt: string;
  userId: number;
  status: string;
};

export default function VetHelpPage() {
  const [activeTab, setActiveTab] = useState("messages");
  const [, setLocation] = useLocation();
  const [fundraisers, setFundraisers] = useState<Fundraiser[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Carregar campanhas de arrecadação
  const loadFundraisers = async () => {
    setLoading(true);
    try {
      // Buscar dados reais do banco de dados
      const response = await apiRequest("GET", "/api/vet-help");
      if (response.ok) {
        const data = await response.json();
        
        // Processar os dados para garantir que as imagens funcionem
        const processedData = data.map((item: any) => {
          // Extrair a URL da imagem do array photos
          let imageUrl = "";
          
          if (item.photos && Array.isArray(item.photos) && item.photos.length > 0) {
            imageUrl = item.photos[0];
          } else {
            // Imagem padrão baseada no título para identificar o tipo de campanha
            const title = item.title.toLowerCase();
            if (title.includes("cirurgia")) {
              imageUrl = "https://images.unsplash.com/photo-1584134239909-eb4800257d6a?q=80&w=400";
            } else if (title.includes("medicacao") || title.includes("medicação")) {
              imageUrl = "https://images.unsplash.com/photo-1558956397-7f6aea7aaab4?q=80&w=400";
            } else if (title.includes("consulta")) {
              imageUrl = "https://images.unsplash.com/photo-1586773245007-349b7fe51abf?q=80&w=400";
            } else if (title.includes("tratamento")) {
              imageUrl = "https://images.unsplash.com/photo-1526662092594-e98c1e356d6a?q=80&w=400";
            } else if (title.includes("exame")) {
              imageUrl = "https://images.unsplash.com/photo-1621252179027-1ebe78c26a70?q=80&w=400";
            } else if (title.includes("resgate")) {
              imageUrl = "https://images.unsplash.com/photo-1527078553122-e37ac4688b37?q=80&w=400";
            } else {
              imageUrl = "https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=400";
            }
          }
          
          // Calcular dados financeiros e progresso
          const currentAmount = item.currentAmount || 0;
          const targetAmount = item.targetAmount || 0;
          const percentComplete = targetAmount > 0 ? Math.min(Math.round((currentAmount / targetAmount) * 100), 100) : 0;
          
          // Calcular dias restantes (30 dias a partir da data de criação)
          const createdDate = new Date(item.createdAt || new Date());
          const endDate = new Date(createdDate);
          endDate.setDate(endDate.getDate() + 30);
          const today = new Date();
          const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
          
          return {
            ...item,
            imageUrl,
            currentAmount,
            targetAmount,
            percentComplete,
            daysRemaining
          };
        });
        
        setFundraisers(processedData);
      } else {
        throw new Error("Falha ao obter campanhas");
      }
      setLoading(false);
    } catch (error) {
      console.error("Erro ao carregar campanhas:", error);
      toast({
        title: "Erro ao carregar campanhas",
        description: "Não foi possível carregar as campanhas de arrecadação.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  // Função para iniciar chat com veterinário
  const handleStartChat = async (vetUserId: number) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para iniciar uma conversa.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Criar ou encontrar conversa existente
      const response = await apiRequest("POST", "/api/conversations", {
        participant2Id: vetUserId
      });

      if (response.ok) {
        const data = await response.json();
        // Redirecionar para o chat
        setLocation(`/chat/${data.id}`);
      } else {
        throw new Error("Falha ao criar conversa");
      }
    } catch (error) {
      console.error("Erro ao iniciar chat:", error);
      toast({
        title: "Erro ao iniciar conversa",
        description: "Não foi possível iniciar a conversa. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Carregar dados quando a página for montada ou quando o tab for alterado
  useEffect(() => {
    if (activeTab === "donations") {
      loadFundraisers();
    }
  }, [activeTab]);

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Ajuda Veterinária</h1>
        <p className="text-neutral-600 mt-1">
          Consulte veterinários online ou ajude em campanhas para tratamentos de pets
        </p>
      </div>

      <Tabs defaultValue={activeTab} className="w-full" onValueChange={setActiveTab}>
        <TabsList className="flex w-full mb-6 p-1 bg-gradient-to-r from-[#CE97E8]/20 to-[#AA7DC7]/20 rounded-2xl">
          <TabsTrigger 
            value="messages" 
            className="flex-1 py-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#CE97E8] data-[state=active]:to-[#AA7DC7] data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
          >
            <div className="flex items-center justify-center space-x-2">
              <span className="material-icons text-sm">medical_services</span>
              <span>Veterinários</span>
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="donations" 
            className="flex-1 py-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#CE97E8] data-[state=active]:to-[#AA7DC7] data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
          >
            <div className="flex items-center justify-center space-x-2">
              <span className="material-icons text-sm">volunteer_activism</span>
              <span>Contribuir</span>
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-4">
          <div className="bg-gradient-to-r from-[#CE97E8]/20 to-[#0BDEC2]/20 p-6 rounded-xl mb-6 shadow-sm border border-[#CE97E8]/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 opacity-10 transform translate-x-10 -translate-y-4">
              <span className="material-icons text-[120px] text-[#CE97E8]">pets</span>
            </div>
            <div className="relative z-10">
              <h2 className="font-bold text-xl mb-3 text-gray-800 flex items-center">
                <span className="material-icons mr-2 text-[#CE97E8]">medical_services</span>
                Tire suas dúvidas com veterinários
              </h2>
              <p className="text-gray-700 mb-4 max-w-2xl">
                Nossa rede de veterinários voluntários está disponível para ajudar com questões simples sobre saúde animal em tempo real.
              </p>
              <Button 
                className="bg-gradient-to-r from-[#CE97E8] to-[#AA7DC7] hover:from-[#CE97E8]/90 hover:to-[#AA7DC7]/90 text-white rounded-xl py-6 px-6 w-full md:w-auto shadow-md transition-all duration-300 flex items-center justify-center gap-2"
                onClick={() => setLocation("/chat/500")} // ID 500 representa o chat geral com veterinários
              >
                <span className="material-icons">chat</span>
                Iniciar conversa com veterinário
              </Button>
            </div>
          </div>
          
          <h3 className="font-bold text-xl text-gray-800 mb-4 flex items-center">
            <span className="material-icons mr-2 text-[#0BDEC2]">group</span>
            Veterinários disponíveis
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Lista de veterinários modernizada */}
            {[
              {
                id: 1,
                userId: 35, // ID real do banco de dados
                name: "Dra. Amanda Silva",
                specialty: "Especialista em pequenos animais",
                rating: 4.8,
                reviews: 156,
                distance: "2,4 km",
                isOnline: true,
                profilePic: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=200"
              },
              {
                id: 2,
                userId: 36, // ID real do banco de dados
                name: "Dr. Carlos Mendes",
                specialty: "Cirurgião veterinário",
                rating: 4.5,
                reviews: 120,
                distance: "3,7 km",
                isOnline: true,
                profilePic: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?q=80&w=200"
              },
              {
                id: 3,
                userId: 37, // ID real do banco de dados
                name: "Dra. Marina Santos",
                specialty: "Animais exóticos e silvestres",
                rating: 4.9,
                reviews: 98,
                distance: "4,1 km",
                isOnline: false,
                profilePic: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=200"
              }
            ].map((vet) => (
              <Card key={vet.id} className="overflow-hidden border-0 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 group">
                <CardContent className="p-0">
                  <div className="relative h-24 overflow-hidden bg-gradient-to-r from-[#CE97E8]/30 to-[#0BDEC2]/30">
                    <div className="absolute top-0 right-0 mt-3 mr-3 z-10">
                      {vet.isOnline ? (
                        <div className="flex items-center bg-white px-2 py-1 rounded-full shadow-sm">
                          <span className="h-2 w-2 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
                          <span className="text-xs font-medium text-green-800">Online</span>
                        </div>
                      ) : (
                        <div className="flex items-center bg-white/80 px-2 py-1 rounded-full">
                          <span className="h-2 w-2 rounded-full bg-gray-400 mr-1.5"></span>
                          <span className="text-xs font-medium text-gray-700">Offline</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="absolute bottom-0 left-0 w-full h-full bg-gradient-to-t from-black/30 to-transparent"></div>
                    
                    <div className="absolute bottom-3 left-24 text-white">
                      <h3 className="font-bold drop-shadow-sm">{vet.name}</h3>
                    </div>
                  </div>
                  
                  <div className="p-4 pt-3 flex">
                    <div className="relative -mt-12 mr-4">
                      <div className="h-20 w-20 rounded-xl overflow-hidden border-4 border-white shadow-md">
                        {vet.profilePic ? (
                          <img 
                            src={vet.profilePic} 
                            alt={vet.name} 
                            className="h-full w-full object-cover" 
                          />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-[#CE97E8] to-[#0BDEC2] flex items-center justify-center text-white text-xl font-bold">
                            {vet.name.charAt(0)}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1 mt-2">
                      <p className="text-gray-600 text-sm">{vet.specialty}</p>
                      
                      <div className="flex items-center mt-2 justify-between">
                        <div className="flex items-center">
                          <div className="flex items-center bg-yellow-50 px-2 py-1 rounded-lg mr-2">
                            <span className="material-icons text-yellow-500 text-sm">star</span>
                            <span className="text-xs font-medium ml-1 text-yellow-700">{vet.rating}</span>
                          </div>
                          <span className="text-xs text-gray-500">({vet.reviews})</span>
                        </div>
                        
                        <div className="flex items-center text-xs text-gray-500">
                          <span className="material-icons text-[#CE97E8] text-sm mr-1">location_on</span>
                          <span>{vet.distance}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="px-4 pb-4 flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 rounded-xl border-[#CE97E8]/30 text-[#CE97E8] hover:bg-[#CE97E8]/10 hover:text-[#CE97E8] transition-colors"
                      onClick={() => setLocation(`/vet-profile/${vet.userId}`)}
                    >
                      <span className="material-icons text-sm mr-1">person</span>
                      Ver perfil
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1 rounded-xl bg-gradient-to-r from-[#CE97E8] to-[#AA7DC7] hover:from-[#CE97E8]/90 hover:to-[#AA7DC7]/90 text-white transition-all duration-300"
                      onClick={() => handleStartChat(vet.userId)}
                    >
                      <span className="material-icons text-sm mr-1">chat</span>
                      Iniciar chat
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="donations" className="space-y-4">
          <div className="bg-gradient-to-br from-[#CE97E8]/20 to-[#AA7DC7]/30 rounded-xl p-6 mb-6 shadow-sm border border-[#CE97E8]/30 relative overflow-hidden">
            <div className="absolute -bottom-8 -right-8 opacity-10">
              <span className="material-icons text-[150px] text-[#CE97E8]">favorite</span>
            </div>
            <div className="relative z-10">
              <h2 className="font-bold text-xl mb-3 text-gray-800 flex items-center">
                <span className="material-icons mr-2 text-[#CE97E8]">volunteer_activism</span>
                Contribua com tratamentos veterinários
              </h2>
              <p className="text-gray-700 mb-4 max-w-2xl">
                Ajude pets carentes ou abandonados a receberem os cuidados médicos necessários através de doações para tratamentos específicos. Cada contribuição faz a diferença na vida de um animal.
              </p>
              <CreateVetFundraiserModal onSuccess={loadFundraisers} />
            </div>
          </div>
          
          <h3 className="font-bold text-xl text-gray-800 mb-4 flex items-center">
            <span className="material-icons mr-2 text-[#CE97E8]">campaign</span>
            Campanhas ativas para contribuição
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Lista de campanhas - design modernizado */}
            {loading ? (
              // Estado de carregamento modernizado
              <div className="col-span-full py-16 flex flex-col items-center justify-center">
                <div className="h-16 w-16 rounded-full bg-gradient-to-r from-[#CE97E8]/30 to-[#0BDEC2]/30 flex items-center justify-center mb-4">
                  <div className="animate-spin">
                    <span className="material-icons text-4xl text-[#CE97E8]">refresh</span>
                  </div>
                </div>
                <span className="text-gray-600 font-medium">Carregando campanhas...</span>
              </div>
            ) : fundraisers.length === 0 ? (
              // Mensagem quando não há campanhas - design modernizado
              <div className="col-span-full py-16 flex flex-col items-center justify-center">
                <div className="h-20 w-20 rounded-full bg-gradient-to-r from-[#CE97E8]/20 to-[#0BDEC2]/20 flex items-center justify-center mb-5">
                  <span className="material-icons text-5xl text-[#CE97E8]">pets</span>
                </div>
                <h4 className="text-xl font-bold text-gray-700 mb-2">Nenhuma campanha ativa</h4>
                <p className="text-center text-gray-600 max-w-md">
                  Não há campanhas de arrecadação no momento.<br />
                  Seja o primeiro a criar uma e ajudar um animal necessitado!
                </p>
              </div>
            ) : (
              // Lista de campanhas com cards modernizados
              fundraisers.map((fundraiser) => (
                <Card key={fundraiser.id} className="overflow-hidden border-0 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group">
                  <CardContent className="p-0">
                    <div className="relative h-48 overflow-hidden">
                      <img 
                        src={fundraiser.imageUrl} 
                        alt={fundraiser.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                      <div className="absolute bottom-0 left-0 p-4">
                        <div className="px-3 py-1 rounded-full bg-white/90 text-[#CE97E8] text-xs font-bold shadow-sm inline-flex items-center">
                          <span className="material-icons text-xs mr-1">volunteer_activism</span>
                          Campanha ativa
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-5">
                      <h3 className="font-bold text-lg mb-2 group-hover:text-[#CE97E8] transition-colors">{fundraiser.title}</h3>
                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {fundraiser.description}
                      </p>
                      
                      <div className="mb-4 bg-gray-50 p-3 rounded-xl">
                        <div className="flex justify-between text-sm mb-2">
                          <div className="flex flex-col">
                            <span className="text-gray-500 text-xs">Arrecadado</span>
                            <span className="font-bold text-[#CE97E8]">R$ {fundraiser.currentAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-gray-500 text-xs">Meta</span>
                            <span className="font-bold text-gray-700">R$ {fundraiser.targetAmount.toFixed(2)}</span>
                          </div>
                        </div>
                        
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-[#CE97E8] to-[#AA7DC7] h-3 rounded-full" 
                            style={{width: `${fundraiser.percentComplete}%`}}
                          ></div>
                        </div>
                        
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs font-medium text-gray-700">{fundraiser.percentComplete}% completo</span>
                          <div className="flex items-center text-xs text-gray-600">
                            <span className="material-icons text-xs mr-1 text-[#0BDEC2]">schedule</span>
                            <span>{fundraiser.daysRemaining} dias restantes</span>
                          </div>
                        </div>
                      </div>
                      
                      <VetHelpDonationModal 
                        fundraiserId={fundraiser.id} 
                        title={fundraiser.title}
                        trigger={
                          <Button className="w-full bg-gradient-to-r from-[#CE97E8] to-[#AA7DC7] hover:from-[#CE97E8]/90 hover:to-[#AA7DC7]/90 text-white rounded-xl py-5 shadow-sm transition-all duration-300">
                            <span className="material-icons text-sm mr-2">favorite</span>
                            Contribuir agora
                          </Button>
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}