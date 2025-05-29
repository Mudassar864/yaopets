import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
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
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { PawPrint, MapPin, ArrowLeft, X, Check } from "lucide-react";
import NativeBottomNavigation from "@/components/mobile/NativeBottomNavigation";

export default function NewPetPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [formStep, setFormStep] = useState(1);
  const [formSuccess, setFormSuccess] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Lidar com a seleção de foto
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
      
      // Dados essenciais para o pet
      const petName = formData.get('petName') as string || 'Pet para adoção';
      const petDescription = formData.get('petDescription') as string || '';
      const petUsefulInfo = formData.get('petUsefulInfo') as string || '';
      const petSpecies = formData.get('petSpecies') as string || 'dog';
      const petSize = formData.get('petSize') as string || 'medium';
      const petAge = formData.get('petAge') as string || 'adult';
      const petLocation = formData.get('petLocation') as string || 'Não informado';
      const contactPhone = formData.get('contactPhone') as string || '';
      
      console.log("Dados do formulário:", {
        petName, petSpecies, petSize, petAge, petLocation
      });
      
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
      
      // Criar conteúdo para o post
      let content = 'Novo pet para adoção';
      
      // Se temos descrição, usamos ela
      if (petDescription && petDescription.trim() !== '') {
        content = petDescription;
      } else {
        // Se não, criamos um conteúdo básico com o nome do pet
        content = `${petName} para adoção`;
      }
      
      // Adicionar informações úteis se disponíveis
      if (petUsefulInfo && petUsefulInfo.trim() !== '') {
        content += '\n\n**Informações Úteis:**\n' + petUsefulInfo;
      }
      
      console.log("Conteúdo a ser enviado:", content);
      
      // Criar objeto com metadados completos do pet, incluindo versões traduzidas
      const petData = {
        petName,
        petSpecies,
        petSpeciesDisplay,
        petSize,
        petSizeDisplay, 
        petAge,
        petAgeDisplay,
        petLocation,
        contactPhone
      };
      
      console.log("Metadados completos do pet:", petData);
      
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
      uploadData.append('petStatus', 'adoption'); // Define status como adoção
      
      // Adicionar campos individuais para compatibilidade e diretamente acessíveis
      Object.entries(petData).forEach(([key, value]) => {
        uploadData.append(key, value);
      });
      
      // Visibilidade do post - sempre pública para facilitar adoção
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
      
      // Feedback positivo ao usuário
      toast({
        title: 'Pet cadastrado com sucesso',
        description: 'Seu pet foi cadastrado e está disponível na página de pets. Obrigado por ajudar!',
      });
      
      // Após 2 segundos, redirecionar para doações
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

  // Avançar para o próximo passo do formulário
  const goToNextStep = () => {
    setFormStep(2);
    window.scrollTo(0, 0);
  };

  // Voltar para o passo anterior
  const goToPreviousStep = () => {
    setFormStep(1);
    window.scrollTo(0, 0);
  };

  // Verificar se o primeiro passo está válido
  const isFirstStepValid = () => {
    const requiredFields = ['petName', 'petSpecies', 'petSize', 'petAge', 'petLocation'];
    const form = document.querySelector('form') as HTMLFormElement;
    if (!form) return false;
    
    const formData = new FormData(form);
    // Para debugging
    console.log("Validação do formulário:", 
      requiredFields.map(field => ({ 
        field, 
        value: formData.get(field),
        valid: Boolean(formData.get(field))
      }))
    );
    
    // Verifica se todos os campos requeridos estão preenchidos
    const isValid = requiredFields.every(field => Boolean(formData.get(field)));
    console.log("Formulário válido:", isValid);
    
    return true; // Temporariamente retornando true para permitir o avanço
  };

  // Renderiza tela de sucesso
  if (formSuccess) {
    return (
      <div className="container max-w-md mx-auto px-4 py-8">
        <Card className="border-green-100 bg-green-50">
          <CardHeader>
            <CardTitle className="text-center text-green-700">
              <Check className="h-16 w-16 mx-auto mb-2 text-green-500" />
              Cadastro realizado com sucesso!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-green-600 mb-4">
              Seu pet foi cadastrado para doação e já está disponível para adoção.
            </p>
            <p className="text-sm text-gray-500">
              Redirecionando para página de doações...
            </p>
          </CardContent>
        </Card>
        
        <NativeBottomNavigation />
      </div>
    );
  }

  return (
    <div className="container max-w-md mx-auto px-4 pb-20">
      <div className="flex items-center py-4 mb-2">
        <Button
          variant="ghost"
          className="mr-2 px-0"
          onClick={() => navigate('/donations')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">Cadastrar pet para doação</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <PawPrint className="h-5 w-5 mr-2 text-pink-500" />
            {formStep === 1 ? "Informações básicas" : "Detalhes do pet"}
          </CardTitle>
          <CardDescription>
            {formStep === 1 
              ? "Preencha os dados básicos do seu pet"
              : "Adicione mais detalhes e uma foto do pet"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formStep === 1 ? (
              // Passo 1: Informações básicas
              <>
                <div className="space-y-2">
                  <Label htmlFor="petName">Nome do pet *</Label>
                  <Input 
                    id="petName" 
                    name="petName"
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
                    <Label htmlFor="petLocation">Localização *</Label>
                    <Input 
                      id="petLocation" 
                      name="petLocation"
                      placeholder="Ex: Zona Sul" 
                      required 
                    />
                  </div>
                </div>
                
                <Button 
                  type="button" 
                  className="w-full bg-pink-500 hover:bg-pink-600 mt-4"
                  onClick={goToNextStep}
                  disabled={false} // Removida a validação para permitir o avanço
                >
                  Continuar
                </Button>
              </>
            ) : (
              // Passo 2: Detalhes e foto
              <>
                <div className="space-y-2">
                  <Label htmlFor="petDescription" className="flex items-center">
                    <span>Descrição do Pet *</span>
                    <span className="ml-2 text-xs text-neutral-500">(características principais)</span>
                  </Label>
                  <Textarea 
                    id="petDescription" 
                    name="petDescription"
                    placeholder="Descreva as características principais do pet, como temperamento, comportamento, etc."
                    rows={4}
                    defaultValue="Pet para adoção" 
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="petUsefulInfo" className="flex items-center">
                    <span>Informações Úteis</span>
                    <span className="ml-2 text-xs text-neutral-500">(opcional)</span>
                  </Label>
                  <Textarea 
                    id="petUsefulInfo" 
                    name="petUsefulInfo"
                    placeholder="Informe detalhes sobre vacinas, cuidados especiais, alimentação e outras informações relevantes."
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="petPhoto" className="flex items-center">
                    <span>Imagem do Pet</span>
                    <span className="ml-2 text-xs text-pink-500 font-medium">(importante para adoção)</span>
                  </Label>
                  <div 
                    className="border-2 border-dashed border-pink-300 rounded-lg p-6 text-center cursor-pointer hover:bg-pink-50 transition-colors"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    {!photoPreview ? (
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <PawPrint className="h-10 w-10 text-neutral-400" />
                        <p className="text-sm text-neutral-500">
                          Clique para adicionar uma foto do pet
                        </p>
                        <p className="text-xs text-neutral-400">
                          Formatos suportados: JPG, PNG, WEBP (Máx. 10MB)
                        </p>
                      </div>
                    ) : (
                      <div className="relative h-48 w-full overflow-hidden rounded-md">
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
              
                <div className="flex flex-col sm:flex-row justify-between gap-2 mt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full sm:w-auto"
                    onClick={goToPreviousStep}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                  <Button 
                    type="submit" 
                    className="w-full sm:w-auto bg-pink-500 hover:bg-pink-600"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Cadastrando...' : 'Finalizar cadastro'}
                  </Button>
                </div>
              </>
            )}
          </form>
        </CardContent>
      </Card>
      
      <NativeBottomNavigation />
    </div>
  );
}