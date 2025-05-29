import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Gift, DollarSign, ArrowLeft, Image, X, Heart } from "lucide-react";
import NativeBottomNavigation from "@/components/mobile/NativeBottomNavigation";

// Definindo a interface para os itens de doação
interface DonationItem {
  id: number;
  title: string;
  description: string;
  category: string;
  condition: string;
  location: string;
  image?: string;
  donorName: string;
  donorId: number;
}

export default function DonationsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  // Itens para doação
  const [donationItems, setDonationItems] = useState<DonationItem[]>([]);
  
  // Estados para doação de itens
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DonationItem | null>(null);
  
  // Form para doação de itens
  const [itemForm, setItemForm] = useState({
    title: "",
    description: "",
    category: "",
    condition: "",
    location: ""
  });
  
  // Foto do item
  const [itemPhoto, setItemPhoto] = useState<File | null>(null);
  const [itemPhotoPreview, setItemPhotoPreview] = useState<string | null>(null);
  const itemPhotoInputRef = useRef<HTMLInputElement>(null);
  
  // Função para adicionar um item para doação
  const handleAddItem = () => {
    setItemForm({
      title: "",
      description: "",
      category: "",
      condition: "",
      location: ""
    });
    setItemPhoto(null);
    setItemPhotoPreview(null);
    setItemFormOpen(true);
  };
  
  // Função para selecionar uma foto do item
  const handleItemPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setItemPhoto(file);
      
      // Criar preview da imagem
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && event.target.result) {
          setItemPhotoPreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Carregar itens para doação
  useEffect(() => {
    const fetchDonationItems = async () => {
      try {
        setIsLoading(true);
        
        // Simulando uma chamada de API para buscar itens para doação
        setTimeout(() => {
          const mockItems: DonationItem[] = [
            {
              id: 1,
              title: "Ração Premium para Cães",
              description: "Pacote de ração premium para cães adultos, 10kg. Aberto mas quase completo.",
              category: "Alimento",
              condition: "Novo",
              location: "São Paulo, SP",
              image: "https://yaopets-media-demo/1747882882851-714.jpg",
              donorName: "Maria Silva",
              donorId: 2
            },
            {
              id: 2,
              title: "Caixa de Transporte para Gatos",
              description: "Caixa de transporte para gatos de pequeno porte, usada apenas uma vez.",
              category: "Acessório",
              condition: "Usado - Em ótimo estado",
              location: "Rio de Janeiro, RJ",
              image: "https://yaopets-media-demo/1747883030624-652.jpg",
              donorName: "João Pedro",
              donorId: 3
            },
            {
              id: 3,
              title: "Coleira Antiparasitária",
              description: "Coleira antiparasitária para cães médios. Não foi utilizada, apenas aberta.",
              category: "Saúde",
              condition: "Novo",
              location: "Belo Horizonte, MG",
              image: "https://yaopets-media-demo/1747883451711-830.jpg",
              donorName: "Ana Luiza",
              donorId: 4
            }
          ];
          
          setDonationItems(mockItems);
          setIsLoading(false);
        }, 1000);
      } catch (error) {
        console.error("Erro ao buscar itens para doação:", error);
        setIsLoading(false);
      }
    };
    
    fetchDonationItems();
  }, []);
  
  // Função para demonstrar interesse em um item
  const handleItemInterest = async (item: DonationItem) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para demonstrar interesse.",
        variant: "destructive",
      });
      return;
    }

    if (user.id === item.donorId) {
      toast({
        title: "Aviso",
        description: "Você não pode demonstrar interesse no seu próprio item.",
        variant: "destructive",
      });
      return;
    }

    try {
      // 1. Criar ou encontrar conversa existente
      const conversationResponse = await apiRequest("POST", "/api/conversations", {
        participant2Id: item.donorId
      });

      if (!conversationResponse.ok) {
        throw new Error("Falha ao criar conversa");
      }

      const conversationData = await conversationResponse.json();
      const conversationId = conversationData.id;

      // 2. Enviar mensagem automática de interesse
      const messageText = `Olá! Tenho interesse no item "${item.title}" que você está doando. Podemos conversar sobre os detalhes?`;
      
      const messageResponse = await apiRequest("POST", "/api/messages", {
        conversationId: conversationId,
        recipientId: item.donorId,
        content: messageText
      });

      if (!messageResponse.ok) {
        throw new Error("Falha ao enviar mensagem");
      }

      // 3. Redirecionar para o chat
      navigate(`/chat/${conversationId}`);

      toast({
        title: "Interesse enviado!",
        description: `Uma conversa foi iniciada com ${item.donorName} sobre o item "${item.title}".`,
      });

    } catch (error) {
      console.error("Erro ao demonstrar interesse:", error);
      toast({
        title: "Erro ao demonstrar interesse",
        description: "Não foi possível iniciar a conversa. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-6">Doações</h1>
      
      <div className="w-full">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="material-icons text-xl text-[#F5821D]">inventory_2</span>
            <h2 className="text-xl font-semibold">Itens para Doação</h2>
          </div>
          <Button
            onClick={handleAddItem}
            className="bg-gradient-to-r from-[#F5821D] to-[#CE97E8] hover:from-[#CE97E8] hover:to-[#F5821D] text-white"
          >
            <Plus className="mr-2 h-4 w-4" /> Doar item
          </Button>
        </div>

        {isLoading ? (
          <div className="py-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F5821D]"></div>
          </div>
        ) : donationItems.length === 0 ? (
          <div className="text-center py-8">
            <div className="bg-[#F5821D]/10 p-6 rounded-lg inline-flex flex-col items-center">
              <Gift className="h-12 w-12 text-[#F5821D] mb-3" />
              <h3 className="text-lg font-medium mb-2">Nenhum item para doação</h3>
              <p className="text-gray-600 mb-4 max-w-md">
                Não há itens disponíveis para doação no momento. Você pode cadastrar um item para doação clicando no botão acima.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {donationItems.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="h-48 bg-amber-100 relative overflow-hidden">
                    {item.image ? (
                      <img 
                        src={item.image} 
                        alt={item.title} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-gradient-to-br from-[#F5821D]/30 to-[#CE97E8]/30">
                        <Gift className="h-16 w-16 text-[#F5821D]" />
                      </div>
                    )}
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-black/50"></div>
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-gradient-to-r from-[#F5821D] to-[#CE97E8]">
                        {item.category}
                      </Badge>
                    </div>
                    <div className="absolute bottom-3 left-3 text-white">
                      <h3 className="font-bold text-lg">{item.title}</h3>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">{item.condition}</span>
                      <span className="text-sm text-gray-600">{item.location}</span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {item.description}
                    </p>
                    
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        className="flex-1 border-[#F5821D] text-[#F5821D] hover:bg-[#F5821D]/10"
                        onClick={() => handleItemInterest(item)}
                      >
                        <Heart className="mr-2 h-4 w-4" /> Tenho interesse
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog para doação de itens */}
      <Dialog open={itemFormOpen} onOpenChange={setItemFormOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Doar um Item</DialogTitle>
            <DialogDescription>
              Preencha as informações do item que você deseja doar.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="item-title">Título</Label>
              <Input 
                id="item-title" 
                value={itemForm.title} 
                onChange={(e) => setItemForm({...itemForm, title: e.target.value})}
                placeholder="Ex: Ração para gatos adultos"
              />
            </div>
            
            <div>
              <Label htmlFor="item-category">Categoria</Label>
              <Select value={itemForm.category} onValueChange={(value) => setItemForm({...itemForm, category: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alimento">Alimento</SelectItem>
                  <SelectItem value="acessorio">Acessório</SelectItem>
                  <SelectItem value="higiene">Higiene</SelectItem>
                  <SelectItem value="medicamento">Medicamento</SelectItem>
                  <SelectItem value="brinquedo">Brinquedo</SelectItem>
                  <SelectItem value="equipamento">Equipamento</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="item-condition">Estado de Conservação</Label>
              <Select value={itemForm.condition} onValueChange={(value) => setItemForm({...itemForm, condition: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o estado do item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="seminovo">Seminovo</SelectItem>
                  <SelectItem value="usado">Usado - Bom estado</SelectItem>
                  <SelectItem value="desgastado">Usado - Com desgaste</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="item-location">Localização</Label>
              <Input 
                id="item-location" 
                value={itemForm.location} 
                onChange={(e) => setItemForm({...itemForm, location: e.target.value})}
                placeholder="Ex: São Paulo, SP"
              />
            </div>
            
            <div>
              <Label htmlFor="item-description">Descrição</Label>
              <Textarea 
                id="item-description" 
                value={itemForm.description} 
                onChange={(e) => setItemForm({...itemForm, description: e.target.value})}
                placeholder="Descreva detalhes sobre o item, como marca, tamanho, quantidade, etc."
                rows={3}
              />
            </div>
            
            <div>
              <Label className="block mb-2">Foto do Item</Label>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={itemPhotoInputRef}
                onChange={handleItemPhotoSelect}
              />
              
              {itemPhotoPreview ? (
                <div className="relative h-40 bg-gray-100 rounded-md overflow-hidden">
                  <img 
                    src={itemPhotoPreview} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                  <button
                    className="absolute top-2 right-2 bg-white/80 rounded-full p-1 hover:bg-white transition-colors"
                    onClick={() => {
                      setItemPhoto(null);
                      setItemPhotoPreview(null);
                    }}
                  >
                    <X className="h-4 w-4 text-red-500" />
                  </button>
                </div>
              ) : (
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center cursor-pointer hover:border-[#F5821D] transition-colors"
                  onClick={() => itemPhotoInputRef.current?.click()}
                >
                  <Image className="h-10 w-10 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">Clique para adicionar uma foto</p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG ou WEBP (max. 5MB)</p>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setItemFormOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              className="bg-gradient-to-r from-[#F5821D] to-[#CE97E8]"
              onClick={() => {
                toast({
                  title: "Item cadastrado com sucesso!",
                  description: "Seu item foi cadastrado para doação e está disponível para visualização."
                });
                setItemFormOpen(false);
              }}
            >
              Cadastrar Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <NativeBottomNavigation />
    </div>
  );
}