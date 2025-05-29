import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin, Eye } from "lucide-react";
import NativeBottomNavigation from "@/components/mobile/NativeBottomNavigation";

// Definição da interface para Pet
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
}

export default function AdoptionPage() {
  const [adoptionFormOpen, setAdoptionFormOpen] = useState(false);
  
  // Pets para adoção (em um app real, esses dados viriam de uma API)
  const adoptionPets: Pet[] = [
    {
      id: 1,
      name: "Thor",
      species: "Cachorro",
      size: "Médio",
      age: "Filhote",
      location: "Zona Sul",
      description: "Filhote dócil e brincalhão, vacinado e vermifugado.",
      status: "Disponível",
      contactPhone: "5511999999999"
    },
    {
      id: 2,
      name: "Luna",
      species: "Gato",
      size: "Pequeno",
      age: "Adulto",
      location: "Zona Oeste",
      description: "Gata calma e carinhosa, castrada e vacinada.",
      status: "Disponível",
      contactPhone: "5511988888888"
    },
    {
      id: 3,
      name: "Max",
      species: "Cachorro",
      size: "Grande",
      age: "Adulto",
      location: "Zona Norte",
      description: "Cachorro protetor e amigável, ideal para casas com quintal.",
      status: "Disponível",
      contactPhone: "5511977777777"
    }
  ];
  
  const handleAdoptPet = (pet: Pet): void => {
    // Formata a mensagem para o WhatsApp
    const message = encodeURIComponent(`Eu quero esse pet lindo! 🐾
Nome: ${pet.name}
Descrição: ${pet.description}
Local: ${pet.location}`);
    
    // Abre o WhatsApp com a mensagem pré-formatada
    window.open(`https://wa.me/${pet.contactPhone}?text=${message}`, '_blank');
  };

  return (
    <div className="pb-16">
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Adoção de Pets</h1>
          <p className="text-neutral-600 mt-1">
            Encontre um novo amigo para sua família
          </p>
        </div>

        {/* Seção de animais para adoção responsável */}
        <div className="bg-pink-50 p-4 rounded-lg mb-6">
          <h2 className="font-semibold text-lg mb-2 flex items-center">
            <span className="mr-2">🐾</span>
            Animais para adoção responsável
          </h2>
          <p className="text-sm text-neutral-700 mb-3">
            Encontre pets que precisam de um novo lar ou cadastre um animal para doação.
          </p>
          
          {/* Botão para cadastrar pet para doação */}
          <Dialog open={adoptionFormOpen} onOpenChange={setAdoptionFormOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-primary hover:bg-primary/90 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar pet para doação
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Cadastrar pet para doação</DialogTitle>
                <DialogDescription>
                  Preencha todos os campos obrigatórios para cadastrar um pet para adoção.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="petName">Nome do pet *</Label>
                    <Input id="petName" placeholder="Ex: Thor" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="petSpecies">Espécie *</Label>
                    <Select defaultValue="dog">
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
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="petSize">Porte *</Label>
                    <Select defaultValue="medium">
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
                  <div className="space-y-2">
                    <Label htmlFor="petAge">Idade *</Label>
                    <Select defaultValue="puppy">
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
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="petLocation">Localização *</Label>
                  <Input 
                    id="petLocation" 
                    placeholder="Ex: Zona Sul" 
                    required 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="petDescription">Descrição *</Label>
                  <Textarea 
                    id="petDescription" 
                    placeholder="Descreva características do pet, temperamento, vacinas, etc."
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="petPhoto">Foto</Label>
                  <Input id="petPhoto" type="file" accept="image/*" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Telefone/WhatsApp para contato *</Label>
                  <Input 
                    id="contactPhone" 
                    placeholder="Ex: 11999999999 (apenas números)" 
                    required 
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit">Cadastrar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Lista de pets para adoção */}
        <div className="grid grid-cols-1 gap-4">
          {adoptionPets.map((pet) => (
            <Card key={pet.id} className="overflow-hidden">
              <CardContent className="p-0">
                {/* Área da imagem do pet */}
                <div className="h-48 bg-neutral-200 flex items-center justify-center">
                  <span className="material-icons text-neutral-400 text-4xl">pets</span>
                </div>
                
                {/* Informações do pet */}
                <div className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">{pet.name}</h3>
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-0">
                      {pet.status}
                    </Badge>
                  </div>
                  
                  {/* Detalhes do pet em grid */}
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div className="flex items-center">
                      <span className="material-icons text-neutral-500 text-sm mr-1">pets</span>
                      <span className="text-neutral-700">{pet.species}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="material-icons text-neutral-500 text-sm mr-1">straighten</span>
                      <span className="text-neutral-700">{pet.size}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="material-icons text-neutral-500 text-sm mr-1">child_care</span>
                      <span className="text-neutral-700">{pet.age}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="material-icons text-neutral-500 text-sm mr-1">location_on</span>
                      <span className="text-neutral-700">{pet.location}</span>
                    </div>
                  </div>
                  
                  {/* Descrição do pet */}
                  <p className="text-sm text-neutral-600 mb-3">
                    {pet.description}
                  </p>
                  
                  {/* Botões de ação */}
                  <div className="flex justify-end space-x-2">
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-1" />
                      Ver detalhes
                    </Button>
                    <Button size="sm" className="bg-pink-500 hover:bg-pink-600" onClick={() => handleAdoptPet(pet)}>
                      Adotar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <NativeBottomNavigation />
    </div>
  );
}