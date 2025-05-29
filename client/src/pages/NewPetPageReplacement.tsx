import React, { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { PawPrint, ArrowLeft, X, Heart, Search, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function NewPetPageReplacement() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const [activeTab, setActiveTab] = useState("adoption"); // adoption, lost, found
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [petName, setPetName] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Função para lidar com a seleção de foto
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Verificar tamanho (10MB máx)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O tamanho máximo de imagem é 10MB",
          variant: "destructive"
        });
        return;
      }
      
      // Verificar tipo
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Formato não suportado",
          description: "Por favor, selecione apenas imagens",
          variant: "destructive"
        });
        return;
      }
      
      // Salvar arquivo e criar preview
      setSelectedPhoto(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Remover foto selecionada
  const removePhoto = () => {
    setSelectedPhoto(null);
    setPhotoPreview(null);
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      
      // Adicionar a foto selecionada
      if (selectedPhoto) {
        formData.append('media', selectedPhoto);
      }
      
      // Dados essenciais para o pet
      const petName = formData.get('petName') as string || 'Pet sem nome';
      const petDescription = formData.get('petDescription') as string || '';
      const petSpecies = formData.get('petSpecies') as string || 'dog';
      const petSize = formData.get('petSize') as string || 'medium';
      const petAge = formData.get('petAge') as string || 'adult';
      const petBreed = formData.get('petBreed') as string || '';
      const petEyeColor = formData.get('petEyeColor') as string || '';
      const petLocation = formData.get('petLocation') as string || 'Não informado';
      const adoptionInfo = formData.get('adoptionInfo') as string || '';
      const contactPhone = formData.get('contactPhone') as string || '';
      
      // Traduzir os valores dos selects para exibição amigável
      const speciesTranslation: Record<string, string> = {
        'dog': 'Cachorro',
        'cat': 'Gato',
        'other': 'Outro'
      };
      
      const sizeTranslation: Record<string, string> = {
        'small': 'Pequeno',
        'medium': 'Médio',
        'large': 'Grande'
      };
      
      const ageTranslation: Record<string, string> = {
        'puppy': 'Filhote',
        'young': 'Jovem',
        'adult': 'Adulto',
        'senior': 'Idoso'
      };
      
      // Versões traduzidas
      const petSpeciesDisplay = speciesTranslation[petSpecies] || petSpecies;
      const petSizeDisplay = sizeTranslation[petSize] || petSize;
      const petAgeDisplay = ageTranslation[petAge] || petAge;
      
      // Criar conteúdo para o post com base na aba ativa
      let content = "";
      let petStatus = activeTab; // Usar o status da aba ativa (lost, found, adoption)
      
      switch(activeTab) {
        case "lost":
          content = petDescription.trim() !== '' 
            ? petDescription 
            : `${petName} - Pet perdido, por favor ajude a encontrá-lo`;
          break;
        case "found":
          content = petDescription.trim() !== '' 
            ? petDescription 
            : `Pet encontrado em ${petLocation}, ajude a encontrar o dono`;
          break;
        default: // adoption
          content = petDescription.trim() !== '' 
            ? petDescription 
            : `${petName} disponível para adoção`;
      }
        
      // Criar objeto com metadados completos do pet, incluindo versões traduzidas
      const petData = {
        petName,
        petSpecies,
        petSpeciesDisplay,
        petSize,
        petSizeDisplay, 
        petAge,
        petAgeDisplay,
        petBreed,
        petEyeColor,
        petLocation,
        adoptionInfo,
        contactPhone,
        petStatus // Adicionar o status
      };
      
      // Converter para string JSON para armazenar no banco
      const petMetadata = JSON.stringify(petData);
      
      // Criar FormData para envio ao servidor
      const uploadData = new FormData();
      
      // Adicionar todos os dados necessários
      uploadData.append('content', content);
      uploadData.append('petMetadata', petMetadata);
      
      // Tipo de post e status para garantir que apareça na aba correta
      uploadData.append('postType', 'pet');
      uploadData.append('post_type', 'pet'); // Garantir compatibilidade
      uploadData.append('petStatus', petStatus); // Define status com base na aba ativa
      
      // Adicionar campos individuais para compatibilidade e diretamente acessíveis
      Object.entries(petData).forEach(([key, value]) => {
        uploadData.append(key, value);
      });
      
      // Visibilidade do post - sempre pública
      uploadData.append('visibilityType', 'public');
      
      // Adicionar foto do pet se disponível
      if (selectedPhoto) {
        uploadData.append('media', selectedPhoto);
      }
      
      const response = await fetch('/api/posts', {
        method: 'POST',
        body: uploadData,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Falha ao cadastrar pet');
      }

      const data = await response.json();
      
      // Mostrar tela de sucesso
      setFormSuccess(true);
      
      // Feedback positivo ao usuário com base na aba
      let toastTitle = "";
      let toastMessage = "";
      
      switch(activeTab) {
        case "lost":
          toastTitle = "Pet perdido cadastrado com sucesso";
          toastMessage = "As informações sobre seu pet perdido foram registradas. Esperamos que seja encontrado em breve!";
          break;
        case "found":
          toastTitle = "Pet encontrado cadastrado com sucesso";
          toastMessage = "Obrigado por registrar o pet encontrado. Isso ajudará o dono a localizá-lo.";
          break;
        default: // adoption
          toastTitle = "Pet cadastrado para adoção com sucesso";
          toastMessage = "Seu pet foi cadastrado e está disponível na página de pets. Obrigado por ajudar!";
      }
      
      toast({
        title: toastTitle,
        description: toastMessage,
      });
      
      // Após 2 segundos, redirecionar para página de pets
      setTimeout(() => {
        // Antes de navegar, atualizar os cookies de sessão para evitar problemas de autenticação
        fetch('/api/auth/me', {
          credentials: 'include'
        }).then(() => {
          // Redirecionar para a página de pets onde o animal será exibido
          navigate('/pets');
        });
      }, 2000);
    } catch (error) {
      console.error('Erro ao cadastrar pet:', error);
      toast({
        title: 'Erro ao cadastrar pet',
        description: 'Ocorreu um erro ao cadastrar o pet. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tela de sucesso após cadastro
  if (formSuccess) {
    let successMessage = "";
    let successTitle = "";
    
    switch(activeTab) {
      case "lost":
        successTitle = "Pet perdido cadastrado com sucesso!";
        successMessage = "As informações sobre seu pet perdido estão disponíveis para ajudar a encontrá-lo.";
        break;
      case "found":
        successTitle = "Pet encontrado cadastrado com sucesso!";
        successMessage = "Obrigado por registrar este pet encontrado. Isso ajudará o dono a localizá-lo.";
        break;
      default: // adoption
        successTitle = "Pet cadastrado com sucesso!";
        successMessage = "Seu pet está agora disponível para adoção na nossa plataforma.";
    }
    
    return (
      <div className="container mx-auto max-w-md p-4 h-screen flex flex-col items-center justify-center">
        <Card className="w-full p-6 text-center space-y-4">
          <div className="mx-auto bg-green-100 rounded-full p-4 w-20 h-20 flex items-center justify-center">
            <PawPrint className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold">{successTitle}</h1>
          <p className="text-neutral-600">
            {successMessage}
          </p>
          <Button 
            className="bg-primary hover:bg-primary/90 w-full mt-4"
            onClick={() => navigate('/pets')}
          >
            Ver todos os pets
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-md p-4 pb-20">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          className="mb-2 flex items-center text-neutral-600"
          onClick={() => navigate('/pets')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        
        <div className="flex items-center space-x-2 mb-1">
          <PawPrint className="h-5 w-5 text-pink-600" />
          <h1 className="text-2xl font-bold">Cadastrar pet</h1>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger 
            value="adoption" 
            className="flex items-center justify-center py-3"
          >
            <div className="flex flex-col items-center space-y-1">
              <Heart className="h-4 w-4" />
              <span className="text-xs">Adoção</span>
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="lost" 
            className="flex items-center justify-center py-3"
          >
            <div className="flex flex-col items-center space-y-1">
              <Search className="h-4 w-4" />
              <span className="text-xs">Perdido</span>
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="found" 
            className="flex items-center justify-center py-3"
          >
            <div className="flex flex-col items-center space-y-1">
              <MapPin className="h-4 w-4" />
              <span className="text-xs">Encontrado</span>
            </div>
          </TabsTrigger>
        </TabsList>
        
        {/* Título e badge conforme a aba selecionada */}
        <div className="flex items-center space-x-2 mb-1">
          {activeTab === "adoption" && (
            <Badge variant="outline" className="bg-green-100 text-green-800 border-0 px-2.5 py-0.5">
              Disponível para adoção
            </Badge>
          )}
          {activeTab === "lost" && (
            <Badge variant="outline" className="bg-orange-100 text-orange-800 border-0 px-2.5 py-0.5">
              Pet perdido
            </Badge>
          )}
          {activeTab === "found" && (
            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-0 px-2.5 py-0.5">
              Pet encontrado
            </Badge>
          )}
        </div>
        
        {/* Texto de ajuda conforme a aba */}
        <p className="text-neutral-600 my-3">
          {activeTab === "adoption" && 
            "Preencha os dados do pet que você deseja cadastrar para adoção. Quanto mais informações você fornecer, maiores as chances de encontrar um lar amoroso."
          }
          {activeTab === "lost" && 
            "Informe os detalhes do seu pet perdido. Isso ajudará a comunidade a encontrá-lo e devolvê-lo para você."
          }
          {activeTab === "found" && 
            "Registre informações sobre um pet que você encontrou. Isso ajudará o dono a localizá-lo e fazer o resgate."
          }
        </p>
      </Tabs>
      
      <Card className="border-0 shadow-md">
        <CardContent className="p-6">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Campo oculto para enviar o status do pet */}
            <input type="hidden" name="petStatus" value={activeTab} />
            
            <div className="space-y-2">
              <Label htmlFor="petName">Nome do pet *</Label>
              <Input 
                id="petName" 
                name="petName"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                placeholder="Ex: Rex" 
                required 
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="petSpecies">Espécie *</Label>
                <Select name="petSpecies" defaultValue="dog">
                  <SelectTrigger id="petSpecies">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dog">Cachorro</SelectItem>
                    <SelectItem value="cat">Gato</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="petSize">Porte *</Label>
                <Select name="petSize" defaultValue="medium">
                  <SelectTrigger id="petSize">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Pequeno</SelectItem>
                    <SelectItem value="medium">Médio</SelectItem>
                    <SelectItem value="large">Grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="petAge">Idade *</Label>
                <Select name="petAge" defaultValue="adult">
                  <SelectTrigger id="petAge">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="puppy">Filhote</SelectItem>
                    <SelectItem value="adult">Adulto</SelectItem>
                    <SelectItem value="senior">Idoso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="petBreed">Raça</Label>
                <Input 
                  id="petBreed" 
                  name="petBreed"
                  placeholder="Ex: Labrador, SRD, Persa" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="petEyeColor">Cor dos Olhos</Label>
                <Select name="petEyeColor">
                  <SelectTrigger id="petEyeColor">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="marrom">Marrom</SelectItem>
                    <SelectItem value="preto">Preto</SelectItem>
                    <SelectItem value="azul">Azul</SelectItem>
                    <SelectItem value="verde">Verde</SelectItem>
                    <SelectItem value="amarelo">Amarelo</SelectItem>
                    <SelectItem value="heterocromia">Heterocromia (cores diferentes)</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="petLocation">Localização *</Label>
                <Input 
                  id="petLocation" 
                  name="petLocation"
                  placeholder="Ex: Zona Sul" 
                  required 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="petDescription">
                {activeTab === "adoption" 
                  ? `Sobre ${petName || "o pet"} para adoção *`
                  : "Descrição *"
                }
              </Label>
              <Textarea 
                id="petDescription" 
                name="petDescription"
                placeholder={
                  activeTab === "adoption"
                    ? "Conte sobre a personalidade, temperamento, brincadeiras favoritas, se é sociável com outros pets e crianças, histórico de saúde e vacinas..."
                    : activeTab === "lost"
                    ? "Descreva o pet perdido: onde foi visto pela última vez, características físicas, comportamento, coleira/acessórios..."
                    : "Descreva o pet encontrado: onde foi encontrado, estado de saúde, comportamento, se tem coleira/chip..."
                }
                required
                className="min-h-[120px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adoptionInfo">
                {activeTab === "adoption" ? "Informações para adoção" : "Informações úteis"}
              </Label>
              <Textarea 
                id="adoptionInfo" 
                name="adoptionInfo"
                placeholder={
                  activeTab === "adoption"
                    ? "Requisitos para adoção, processo de entrevista, se é castrado/vacinado, cuidados especiais necessários, se tem chip de identificação..."
                    : activeTab === "lost"
                    ? "Informações que ajudem a identificar o pet: comandos que conhece, brinquedos favoritos, hábitos, medos, alimentos preferidos..."
                    : "Informações para o dono reconhecer: como o pet reagiu quando encontrado, se estava com fome/sede, ferimentos, comportamento..."
                }
                className="min-h-[100px]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="petPhoto">Foto do pet</Label>
              <div 
                className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center cursor-pointer hover:bg-neutral-50 transition-colors"
                onClick={() => photoInputRef.current?.click()}
              >
                {!photoPreview ? (
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <PawPrint className="h-10 w-10 text-pink-400" />
                    <p className="text-sm text-neutral-500">
                      Clique para adicionar uma foto do pet
                    </p>
                    <p className="text-xs text-neutral-400">
                      Formatos suportados: JPG, PNG, WEBP (Máx. 10MB)
                    </p>
                  </div>
                ) : (
                  <div className="relative h-40 w-full overflow-hidden rounded-md">
                    <img 
                      src={photoPreview} 
                      alt="Preview" 
                      className="h-full w-full object-cover" 
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePhoto();
                      }}
                      className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white hover:bg-black/90"
                      aria-label="Remover imagem"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                
                <Input 
                  id="petPhoto" 
                  name="petPhoto" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handlePhotoSelect}
                  ref={photoInputRef}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Telefone para contato (opcional)</Label>
              <Input 
                id="contactPhone" 
                name="contactPhone"
                placeholder="Ex: 11999999999 (apenas números)" 
              />
            </div>
          
            <Button 
              type="submit" 
              className={`w-full flex items-center justify-center gap-2 ${
                activeTab === 'adoption' ? 'bg-pink-500 hover:bg-pink-600' :
                activeTab === 'lost' ? 'bg-orange-500 hover:bg-orange-600' :
                'bg-blue-500 hover:bg-blue-600'
              }`}
              disabled={isSubmitting}
            >
              {activeTab === 'adoption' && <Heart className="h-4 w-4" />}
              {activeTab === 'lost' && <Search className="h-4 w-4" />}
              {activeTab === 'found' && <MapPin className="h-4 w-4" />}
              {isSubmitting ? 'Cadastrando...' : 
                activeTab === 'adoption' ? 'Cadastrar pet para adoção' :
                activeTab === 'lost' ? 'Cadastrar pet perdido' :
                'Cadastrar pet encontrado'
              }
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}