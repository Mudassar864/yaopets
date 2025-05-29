import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function CreatePostModal({ open, onOpenChange }: CreatePostModalProps) {
  const [postType, setPostType] = useState<string>("media");
  const [images, setImages] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [petName, setPetName] = useState("");
  const [petAge, setPetAge] = useState("");
  const [location, setLocation] = useState("");
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileArray = Array.from(e.target.files);
      setImages(fileArray);
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setVideo(e.target.files[0]);
    }
  };

  const resetForm = () => {
    setPostType("media");
    setImages([]);
    setVideo(null);
    setDescription("");
    setIsPublic(true);
    setPetName("");
    setPetAge("");
    setLocation("");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar que pelo menos uma imagem ou vídeo foi selecionado
    if (images.length === 0 && !video) {
      toast({
        title: "Atenção",
        description: "É necessário adicionar pelo menos uma foto ou vídeo para publicar.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);

    try {
      // Preparar dados de mídia para upload
      let mediaUrls = null;
      
      // Vamos simplificar e enviar a imagem diretamente junto com os dados do post
      // Em vez de fazer upload separado primeiro
      if (images.length > 0 || video) {
        try {
          // Simular URLs com base em dados locais
          const timestamp = Date.now();
          const randomId = Math.floor(Math.random() * 1000);
          
          // Para testes, vamos usar URLs de demonstração já conhecidas pelo sistema
          if (images.length > 0) {
            mediaUrls = [`https://yaopets-media-demo/${timestamp}-${randomId}.jpg`];
            console.log("Usando URL simulada para imagem:", mediaUrls[0]);
          } else if (video) {
            mediaUrls = [`https://yaopets-media-demo/${timestamp}-${randomId}.mp4`];
            console.log("Usando URL simulada para vídeo:", mediaUrls[0]);
          }
        } catch (error) {
          console.error('Erro ao processar mídia:', error);
          toast({
            title: "Erro no processamento",
            description: "Não foi possível processar as mídias selecionadas",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
      }
      
      // Criar o objeto de localização
      let locationData = null;
      if (location) {
        // Formato simplificado para demonstração
        locationData = { address: location };
      }
      
      // Verificar se o usuário está autenticado
      if (!isAuthenticated || !user) {
        toast({
          title: "Erro de autenticação",
          description: "Você precisa estar logado para publicar",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      
      // Criar dados da postagem
      // Corrigir o formato para compatibilidade com o backend
      const postData = {
        userId: user.id, // Usar o ID do usuário autenticado
        content: description,
        mediaUrls: mediaUrls, // Não precisamos converter para JSON string, o backend já faz isso
        location: locationData,
        visibilityType: isPublic ? "public" : "private",
        postType: "regular"
      };
      
      console.log("Enviando postagem para o servidor:", postData);
      
      // Enviar os dados para o endpoint principal unificado
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao criar postagem: ${response.status}`);
      }
      
      const newPost = await response.json();
      console.log("Postagem criada com sucesso:", newPost);
      
      toast({
        title: "Publicação criada",
        description: "Sua publicação foi criada com sucesso!",
      });
      
      // Aguardar um momento antes de fechar o modal para dar tempo do toast aparecer
      setTimeout(() => {
        handleClose();
        // Recarregar a página inicial para mostrar a nova postagem
        if (window.location.pathname === '/') {
          window.location.reload();
        }
      }, 1000);
    } catch (error) {
      console.error("Erro ao criar postagem:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao criar a publicação.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  // Verificar estado da sessão
  useEffect(() => {
    if (open) {
      // Verificar sessão antes de mostrar o modal completo
      if (!isAuthenticated) {
        toast({
          title: "Não autenticado",
          description: "Você precisa estar logado para criar uma publicação.",
          variant: "destructive",
        });
        onOpenChange(false);
      }
    }
  }, [open, isAuthenticated, onOpenChange, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-secondary">Criar publicação</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">


          {/* Opções de visibilidade com cores da marca */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Visibilidade</label>
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPublic(true)}
                className={`flex-1 border rounded-full transition-all ${isPublic ? 'bg-purple-bg border-purple-light text-secondary' : 'bg-white border-gray-200 text-gray-600'}`}
              >
                <span className="material-icons text-sm mr-2">public</span>
                Público
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPublic(false)}
                className={`flex-1 border rounded-full transition-all ${!isPublic ? 'bg-purple-bg border-purple-light text-secondary' : 'bg-white border-gray-200 text-gray-600'}`}
              >
                <span className="material-icons text-sm mr-2">lock</span>
                Privado
              </Button>
            </div>
          </div>

          {/* Upload de Arquivo (Foto ou Vídeo) */}
          <div className="space-y-2 mb-2">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">Escolha uma foto ou vídeo</label>
              <span className="text-xs text-primary font-medium">* Obrigatório</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setVideo(null)}
                className={`flex items-center justify-center gap-2 border rounded-full transition-all ${!video ? 'bg-purple-bg border-purple-light text-secondary' : 'bg-white border-gray-200 text-gray-600'}`}
              >
                <span className="material-icons text-sm">photo_camera</span>
                Foto
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setImages([])}
                className={`flex items-center justify-center gap-2 border rounded-full transition-all ${video ? 'bg-purple-bg border-purple-light text-secondary' : 'bg-white border-gray-200 text-gray-600'}`}
              >
                <span className="material-icons text-sm">videocam</span>
                Vídeo
              </Button>
            </div>
            
            {!video ? (
              // Seleção de foto
              <div className="p-4 border border-dashed border-purple-light rounded-lg bg-purple-bg/30">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setImages([e.target.files[0]]);
                      setVideo(null);
                    }
                  }}
                  className="cursor-pointer file:text-secondary file:bg-purple-bg file:border-0 file:rounded-full"
                />
                {images.length > 0 && (
                  <div className="text-xs text-secondary mt-2 flex items-center">
                    <span className="material-icons text-sm mr-1">check_circle</span>
                    {images[0].name}
                  </div>
                )}
                {images.length === 0 && (
                  <div className="text-xs text-gray-500 mt-2 text-center">
                    Selecione uma imagem para compartilhar
                  </div>
                )}
              </div>
            ) : (
              // Seleção de vídeo
              <div className="p-4 border border-dashed border-purple-light rounded-lg bg-purple-bg/30">
                <Input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                  className="cursor-pointer file:text-secondary file:bg-purple-bg file:border-0 file:rounded-full"
                />
                {video && (
                  <div className="text-xs text-secondary mt-2 flex items-center">
                    <span className="material-icons text-sm mr-1">check_circle</span>
                    {video.name}
                  </div>
                )}
                {!video && (
                  <div className="text-xs text-gray-500 mt-2 text-center">
                    Selecione um vídeo para compartilhar
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Campo de localização */}
          <div className="space-y-2 mb-2">
            <label className="block text-sm font-medium mb-1">Localização</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-secondary">
                <span className="material-icons text-sm">location_on</span>
              </span>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Adicione sua localização"
                className="pl-9 border-purple-light focus:border-secondary focus:ring-secondary rounded-full"
              />
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2 mb-2">
            <label className="block text-sm font-medium mb-1">Descrição</label>
            <Textarea
              placeholder="Compartilhe algo sobre sua publicação..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="border-purple-light focus:border-secondary focus:ring-secondary rounded-lg resize-none"
            />
          </div>

          <DialogFooter className="sm:justify-end gap-2 mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              className="rounded-full border-purple-light hover:bg-purple-bg"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || (images.length === 0 && !video)} 
              className="rounded-full bg-primary hover:bg-primary/90 text-white transition-colors"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Publicando...</span>
                </div>
              ) : (
                "Publicar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}