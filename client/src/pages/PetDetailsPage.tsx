import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Heart, ArrowLeft } from "lucide-react";
import NativeBottomNavigation from "@/components/mobile/NativeBottomNavigation";

// Definindo a interface para os pets
interface Pet {
  id: number;
  name: string;
  species: string;
  size: string;
  age: string;
  location: string;
  description: string;
  status: string;
  contactPhone: string;
  image?: string;
}

export default function PetDetailsPage() {
  const [pet, setPet] = useState<Pet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, navigate] = useLocation();
  const [match, params] = useRoute<{ id: string }>("/pet-details/:id");
  
  // Buscar os dados do pet pelo ID do post
  useEffect(() => {
    const petId = params?.id;
    
    if (!match || !petId) {
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    
    const fetchPetDetails = async () => {
      try {
        setIsLoading(true);
        
        // Buscar o post completo
        const response = await fetch(`/api/posts/${params.id}`);
        
        if (!response.ok) {
          throw new Error('Post não encontrado');
        }
        
        const postData = await response.json();
        
        if (isCancelled) return;
        
        // Verificar se é um post do tipo pet ou com conteúdo relacionado a pet
        const isPetByType = postData.postType === 'pet' || postData.postType === 'pet-donation';
        const isPetByProperties = postData.petName || postData.petSpecies || postData.petMetadata;
        const isPetByContent = postData.content && (
          postData.content.includes('pet') || 
          postData.content.includes('adoção') || 
          postData.content.toLowerCase().includes('cachorro') || 
          postData.content.toLowerCase().includes('gato')
        );
        
        if (!postData || (!isPetByType && !isPetByProperties && !isPetByContent)) {
          throw new Error('Este post não é um pet para adoção');
        }
        
        // Extrair dados do pet
        const petName = postData.petName || 'Pet para adoção';
        let petType = postData.petSpecies || 'Não especificado';
        let petSize = postData.petSize || 'Médio';
        let petAge = postData.petAge || 'Não especificado';
        let petLocation = postData.petLocation || postData.location?.address || 'Localização não informada';
        
        // Traduzir valores se necessário
        if (petType === 'dog') petType = 'Cachorro';
        if (petType === 'cat') petType = 'Gato';
        if (petType === 'other') petType = 'Outro';
        
        if (petSize === 'small') petSize = 'Pequeno';
        if (petSize === 'medium') petSize = 'Médio';
        if (petSize === 'large') petSize = 'Grande';
        
        if (petAge === 'puppy') petAge = 'Filhote';
        if (petAge === 'adult') petAge = 'Adulto';
        if (petAge === 'senior') petAge = 'Idoso';
        
        // Extrair a imagem
        let petImage = null;
        if (postData.mediaUrls && Array.isArray(postData.mediaUrls) && postData.mediaUrls.length > 0) {
          petImage = postData.mediaUrls[0];
          
          // Substituir URLs de teste por imagens reais
          if (petImage && petImage.includes('yaopets-media-demo')) {
            petImage = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=400';
          }
        }
        
        // Criar objeto pet completo
        const petDetails: Pet = {
          id: postData.id,
          name: petName,
          species: petType,
          size: petSize,
          age: petAge,
          location: petLocation,
          description: postData.content || postData.description || 'Novo pet para adoção',
          status: 'Disponível',
          contactPhone: postData.contactPhone || '(xx) xxxxx-xxxx',
          image: petImage
        };
        
        if (!isCancelled) {
          setPet(petDetails);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Erro ao buscar detalhes do pet:', error);
          // Log more detailed error information
          if (error instanceof Error) {
            console.error('Error message:', error.message);
          }
          setPet(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };
    
    fetchPetDetails();

    return () => {
      isCancelled = true;
    };
  }, [params?.id]);
  
  const handleGoBack = () => {
    navigate("/pets");
  };
  
  const handleAdoptPet = () => {
    if (!pet) return;
    
    // Mensagem pré-formatada para enviar no inbox
    const message = `Eu quero esse pet lindo! 🐾
Nome: ${pet.name}
Descrição: ${pet.description}
Local: ${pet.location}`;
    
    // Simula o envio da mensagem para o chat interno (inbox)
    alert("Mensagem enviada para o inbox: \n\n" + message);
    
    // Em uma implementação real, enviaria a mensagem para o backend
    // e redirecionaria para a conversa com o dono do pet
    // navigate(`/chat/${pet.id}`);
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!pet) {
    return (
      <div className="container mx-auto p-4 pb-16">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Pet não encontrado</h1>
          <p className="text-neutral-600 mb-6">O pet que você está procurando não está disponível.</p>
          <Button onClick={handleGoBack}>Voltar para adoções</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-16 bg-gray-100">
      {/* Imagem de capa com altura completa */}
      <div className="relative">
        {/* Imagem de fundo com altura fixa */}
        <div className="w-full h-60 bg-gradient-to-b from-emerald-600 to-emerald-700 relative">
          {pet.image ? (
            <img 
              src={pet.image} 
              alt={pet.name} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="material-icons text-white/80 text-8xl">pets</span>
            </div>
          )}
          
          {/* Botão voltar */}
          <Button
            variant="outline"
            size="icon"
            className="absolute top-4 left-4 bg-white/80 backdrop-blur-sm rounded-full w-10 h-10 z-10"
            onClick={handleGoBack}
          >
            <ArrowLeft className="h-5 w-5 text-neutral-700" />
          </Button>
        </div>
      </div>
      
      {/* Conteúdo principal em card */}
      <div className="px-4 -mt-3">
        <div className="bg-white rounded-t-xl p-6 shadow-sm">
          {/* Nome do pet e badge de status */}
          <div className="mb-2 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">{pet.name}</h1>
            <Badge className="bg-green-100 text-green-800 border-0 px-3 py-1">
              Disponível
            </Badge>
          </div>
          
          {/* Localização do pet */}
          <div className="flex items-center mb-4 text-gray-600">
            <MapPin className="h-4 w-4 mr-1" />
            <span className="text-sm">{pet.location}</span>
          </div>
          
          {/* Botão Quero adotar */}
          <Button 
            className="w-full bg-pink-500 hover:bg-pink-600 text-white py-6 rounded-md mb-6 h-12"
            onClick={handleAdoptPet}
          >
            <Heart className="h-5 w-5 mr-2" /> Quero adotar
          </Button>
          
          {/* Características do pet em cartões */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <span className="block text-sm font-medium text-gray-600">Espécie</span>
              <span className="block text-base font-semibold text-gray-800">{pet.species}</span>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <span className="block text-sm font-medium text-gray-600">Porte</span>
              <span className="block text-base font-semibold text-gray-800">{pet.size}</span>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <span className="block text-sm font-medium text-gray-600">Idade</span>
              <span className="block text-base font-semibold text-gray-800">{pet.age}</span>
            </div>
          </div>
          
          {/* Sobre o pet */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2 text-gray-800">Sobre {pet.name}</h2>
            <p className="text-gray-700 text-sm leading-relaxed">
              {pet.description}
            </p>
          </div>
          
          {/* Informações para adoção */}
          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold mb-3 text-gray-800">Informações para adoção</h2>
            <div className="space-y-3">
              <div>
                <p className="text-gray-700 text-sm">
                  <span className="font-medium">Processo de adoção:</span> Entrevista com possível adotante, preenchimento de formulário e assinatura de termo de adoção responsável.
                </p>
              </div>
              <div>
                <p className="text-gray-700 text-sm">
                  <span className="font-medium">Requisitos:</span> Maior de 18 anos, comprometimento com o bem-estar do animal, ambiente adequado para o pet.
                </p>
              </div>
              <div>
                <p className="text-gray-700 text-sm">
                  <span className="font-medium">Contato:</span> Entre em contato pelo botão "Quero adotar" acima para iniciar o processo de adoção.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <NativeBottomNavigation />
    </div>
  );
}