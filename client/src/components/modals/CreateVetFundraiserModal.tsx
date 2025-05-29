import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type CreateVetFundraiserModalProps = {
  onSuccess?: () => void;
};

export default function CreateVetFundraiserModal({ onSuccess }: CreateVetFundraiserModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    amount: "",
    daysToComplete: "30",
    motivo: "cirurgia",
    image: null as File | null,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string, name: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    
    if (file) {
      // Verificar se é uma imagem
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Arquivo inválido",
          description: "Por favor, selecione uma imagem.",
          variant: "destructive",
        });
        return;
      }

      setFormData((prev) => ({ ...prev, image: file }));
      
      // Criar preview da imagem
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFormData((prev) => ({ ...prev, image: null }));
      setImagePreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: "Título obrigatório",
        description: "Por favor, insira um título para a campanha.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.description.trim()) {
      toast({
        title: "Descrição obrigatória",
        description: "Por favor, descreva a necessidade da campanha.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, insira um valor válido para a meta.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.image) {
      toast({
        title: "Imagem obrigatória",
        description: "Por favor, adicione uma imagem para a campanha.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Primeiro vamos fazer upload da imagem que o usuário enviou
      let imageUrl = "";
      
      if (formData.image && imagePreview) {
        // Usar a imagem que o usuário carregou (preview)
        imageUrl = imagePreview;
      } else {
        // Fallback: usar imagem padrão baseada no tipo de campanha apenas se não tiver imagem enviada
        switch(formData.motivo) {
          case "cirurgia":
            imageUrl = "https://images.unsplash.com/photo-1584134239909-eb4800257d6a?q=80&w=400";
            break;
          case "medicacao":
            imageUrl = "https://images.unsplash.com/photo-1558956397-7f6aea7aaab4?q=80&w=400";
            break;
          case "consulta":
            imageUrl = "https://images.unsplash.com/photo-1586773245007-349b7fe51abf?q=80&w=400";
            break;
          case "tratamento":
            imageUrl = "https://images.unsplash.com/photo-1526662092594-e98c1e356d6a?q=80&w=400";
            break;
          case "exames":
            imageUrl = "https://images.unsplash.com/photo-1621252179027-1ebe78c26a70?q=80&w=400";
            break;
          case "resgate":
            imageUrl = "https://images.unsplash.com/photo-1527078553122-e37ac4688b37?q=80&w=400";
            break;
          default:
            imageUrl = "https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=400";
        }
      }
      
      // Criar objeto de dados no formato esperado pelo backend
      const vetHelpData = {
        title: `${formData.motivo.charAt(0).toUpperCase() + formData.motivo.slice(1)} para ${formData.title}`,
        description: formData.description,
        targetAmount: parseInt(formData.amount),
        status: "pending",
        location: { address: "Localização não especificada", lat: 0, lng: 0 },
        photos: [imageUrl]
      };

      // Enviar para a API
      const response = await apiRequest("POST", "/api/vet-help", vetHelpData);

      if (response.ok) {
        toast({
          title: "Campanha criada com sucesso!",
          description: "Sua campanha de arrecadação foi criada e já está disponível.",
        });
        
        // Resetar formulário
        setFormData({
          title: "",
          description: "",
          amount: "",
          daysToComplete: "30",
          motivo: "cirurgia",
          image: null,
        });
        setImagePreview(null);
        
        // Fechar modal
        setIsOpen(false);
        
        // Executar callback de sucesso, se fornecido
        if (onSuccess) onSuccess();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao criar campanha");
      }
    } catch (error) {
      toast({
        title: "Erro ao criar campanha",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao criar a campanha. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-primary flex items-center justify-center gap-2">
          <span className="material-icons text-sm">add_circle</span>
          Criar campanha de arrecadação
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Criar campanha de arrecadação</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo da campanha</Label>
            <Select 
              value={formData.motivo} 
              onValueChange={(value) => handleSelectChange(value, "motivo")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cirurgia">Cirurgia</SelectItem>
                <SelectItem value="medicacao">Medicação</SelectItem>
                <SelectItem value="consulta">Consulta</SelectItem>
                <SelectItem value="tratamento">Tratamento</SelectItem>
                <SelectItem value="exames">Exames</SelectItem>
                <SelectItem value="resgate">Resgate</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="title">Nome do pet</Label>
            <Input
              id="title"
              name="title"
              placeholder="Ex: Luna, Max, etc."
              value={formData.title}
              onChange={handleInputChange}
            />
            <p className="text-xs text-neutral-500">
              O título completo da campanha será "{formData.motivo.charAt(0).toUpperCase() + formData.motivo.slice(1)} para {formData.title || '...'}"
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Descrição detalhada</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Descreva a situação do pet e o motivo da necessidade"
              rows={4}
              value={formData.description}
              onChange={handleInputChange}
            />
            <p className="text-xs text-neutral-500">
              Descreva a situação sem mostrar imagens de ferimentos. Explique por que precisa de ajuda.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="amount">Valor necessário (R$)</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              min="1"
              step="0.01"
              placeholder="Ex: 1500.00"
              value={formData.amount}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="daysToComplete">Tempo para arrecadação</Label>
            <Select 
              value={formData.daysToComplete} 
              onValueChange={(value) => handleSelectChange(value, "daysToComplete")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tempo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="15">15 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="60">60 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="image">Foto do pet</Label>
            <div className="border-2 border-dashed border-neutral-300 rounded-lg p-4 text-center">
              {imagePreview ? (
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="mx-auto max-h-40 object-contain rounded"
                  />
                  <button 
                    type="button"
                    className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-md"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, image: null }));
                      setImagePreview(null);
                    }}
                  >
                    <span className="material-icons text-red-500 text-sm">close</span>
                  </button>
                </div>
              ) : (
                <>
                  <Label 
                    htmlFor="file-upload" 
                    className="cursor-pointer text-primary hover:text-primary/80 block"
                  >
                    <span className="material-icons text-2xl">cloud_upload</span>
                    <span className="block text-sm mt-1">Clique para fazer upload</span>
                    <span className="text-xs text-neutral-500 block mt-1">
                      Use uma foto do pet sem mostrar ferimentos ou machucados
                    </span>
                  </Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </>
              )}
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="animate-spin mr-2">
                    <span className="material-icons text-sm">refresh</span>
                  </span>
                  Salvando...
                </>
              ) : (
                "Criar campanha"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}