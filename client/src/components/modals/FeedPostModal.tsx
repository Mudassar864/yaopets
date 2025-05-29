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
import { Loader2, Camera, Gift, Video, MapPin, Lock, Globe, ImageIcon } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

interface FeedPostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function FeedPostModal({ open, onOpenChange, onSuccess }: FeedPostModalProps) {
  const [mediaType, setMediaType] = useState<"image" | "gif" | "video">("image");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [location, setLocation] = useState("");
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  // Redefinir o formulário ao fechar
  const resetForm = () => {
    setMediaType("image");
    setFile(null);
    setPreviewUrl(null);
    setDescription("");
    setIsPublic(true);
    setLocation("");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // Manipular seleção de arquivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files && e.target.files[0];
    
    if (!selectedFile) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    // Verificar tamanho (10MB máx)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo é 10MB",
        variant: "destructive"
      });
      return;
    }

    // Verificar tipo com base no mediaType selecionado
    const fileType = selectedFile.type;
    
    if (mediaType === "image" && !fileType.startsWith('image/')) {
      toast({
        title: "Formato não suportado",
        description: "Por favor, selecione uma imagem",
        variant: "destructive"
      });
      return;
    }
    
    if (mediaType === "gif" && fileType !== 'image/gif') {
      toast({
        title: "Formato não suportado",
        description: "Por favor, selecione um arquivo GIF",
        variant: "destructive"
      });
      return;
    }
    
    if (mediaType === "video" && !fileType.startsWith('video/')) {
      toast({
        title: "Formato não suportado",
        description: "Por favor, selecione um vídeo",
        variant: "destructive"
      });
      return;
    }

    // Salvar arquivo e criar preview
    setFile(selectedFile);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar que um arquivo foi selecionado
    if (!file) {
      toast({
        title: "Atenção",
        description: "É necessário adicionar uma imagem ou GIF para publicar.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);

    try {
      // Preparar dados para upload
      const formData = new FormData();
      formData.append('content', description);
      formData.append('file', file);
      formData.append('mediaType', mediaType);
      
      if (location) {
        formData.append('location', JSON.stringify({ address: location }));
      }
      
      formData.append('visibilityType', isPublic ? 'public' : 'private');
      
      // Enviar para o servidor
      const response = await fetch('/api/posts', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao criar postagem: ${response.status}`);
      }
      
      // Invalidar cache para atualizar feed
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      
      toast({
        title: "Publicação criada",
        description: "Sua publicação foi criada com sucesso!",
      });
      
      if (onSuccess) {
        onSuccess();
      }
      
      // Fechar o modal após envio bem-sucedido
      handleClose();
    } catch (error) {
      console.error("Erro ao criar postagem:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao criar a publicação.",
        variant: "destructive",
      });
    } finally {
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
      <DialogContent className="sm:max-w-md max-w-[95vw] p-4 sm:p-6 rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-center text-secondary">Nova Publicação para o Feed</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Tipo de mídia */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setMediaType("image");
                setFile(null);
                setPreviewUrl(null);
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-full transition-all ${mediaType === "image" ? 'bg-purple-bg border-purple-light text-secondary' : 'bg-white border-gray-200 text-gray-600'}`}
            >
              <Camera size={16} />
              <span className="text-xs sm:text-sm">Foto</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setMediaType("gif");
                setFile(null);
                setPreviewUrl(null);
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-full transition-all ${mediaType === "gif" ? 'bg-purple-bg border-purple-light text-secondary' : 'bg-white border-gray-200 text-gray-600'}`}
            >
              <Gift size={16} />
              <span className="text-xs sm:text-sm">GIF</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setMediaType("video");
                setFile(null);
                setPreviewUrl(null);
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-full transition-all ${mediaType === "video" ? 'bg-purple-bg border-purple-light text-secondary' : 'bg-white border-gray-200 text-gray-600'}`}
            >
              <Video size={16} />
              <span className="text-xs sm:text-sm">Vídeo</span>
            </Button>
          </div>

          {/* Upload de arquivo */}
          <div className="p-4 border border-dashed border-purple-light rounded-lg bg-purple-bg/30">
            <Input
              type="file"
              accept={
                mediaType === "image" ? "image/*" : 
                mediaType === "gif" ? "image/gif" : 
                "video/*"
              }
              onChange={handleFileChange}
              className="cursor-pointer file:text-secondary file:bg-purple-bg file:border-0 file:rounded-full"
            />
            
            {/* Preview */}
            {previewUrl && (
              <div className="mt-4 flex justify-center">
                {mediaType === "video" ? (
                  <video src={previewUrl} controls className="max-h-48 max-w-full rounded-lg" />
                ) : (
                  <img src={previewUrl} alt="Preview" className="max-h-48 max-w-full rounded-lg object-contain" />
                )}
              </div>
            )}
            
            {!file && (
              <div className="mt-4 flex flex-col items-center justify-center text-gray-500">
                <ImageIcon size={48} className="mb-2 text-gray-400" />
                <p className="text-xs text-center">
                  {mediaType === "image" ? "Selecione uma imagem para compartilhar" : 
                   mediaType === "gif" ? "Selecione um GIF para compartilhar" : 
                   "Selecione um vídeo para compartilhar"}
                </p>
              </div>
            )}
          </div>

          {/* Visibilidade */}
          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPublic(true)}
              className={`flex-1 border rounded-full transition-all ${isPublic ? 'bg-purple-bg border-purple-light text-secondary' : 'bg-white border-gray-200 text-gray-600'}`}
            >
              <Globe size={16} className="mr-2" />
              Público
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPublic(false)}
              className={`flex-1 border rounded-full transition-all ${!isPublic ? 'bg-purple-bg border-purple-light text-secondary' : 'bg-white border-gray-200 text-gray-600'}`}
            >
              <Lock size={16} className="mr-2" />
              Privado
            </Button>
          </div>

          {/* Localização */}
          <div className="relative">
            <div className="absolute left-3 top-2.5 text-secondary">
              <MapPin size={16} />
            </div>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Adicione sua localização"
              className="pl-9 border-purple-light focus:border-secondary focus:ring-secondary rounded-full"
            />
          </div>

          {/* Descrição */}
          <Textarea
            placeholder="Compartilhe algo sobre sua publicação..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="border-purple-light focus:border-secondary focus:ring-secondary rounded-lg resize-none"
          />

          <DialogFooter className="sm:justify-between gap-2 mt-6 flex items-center">
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
              disabled={isSubmitting || !file} 
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