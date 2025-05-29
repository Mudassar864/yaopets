import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Image, X } from "lucide-react";
import { useQueryClient } from '@tanstack/react-query';

export default function SimplifiedPostCreator() {
  const [content, setContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Função para selecionar imagem
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setSelectedImage(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Remover imagem selecionada
  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Publicar post
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Não autenticado",
        description: "Você precisa estar logado para publicar",
        variant: "destructive"
      });
      return;
    }
    
    if (!content.trim() && !selectedImage) {
      toast({
        title: "Publicação vazia",
        description: "Adicione um texto ou uma imagem para publicar",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Criar FormData para envio multipart
      const formData = new FormData();
      formData.append('content', content);
      formData.append('visibilityType', 'public');
      
      // Adicionar imagem se existir
      if (selectedImage) {
        formData.append('media', selectedImage);
      }
      
      // Enviar para a API
      const response = await fetch('/api/posts', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Falha ao criar publicação');
      }
      
      // Limpar formulário após publicação
      setContent('');
      setSelectedImage(null);
      setImagePreview(null);
      
      // Atualizar feed - invalidar cache
      queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
      
      toast({
        title: "Publicação criada",
        description: "Sua publicação foi compartilhada com sucesso!"
      });
      
      // Atualizar feed manualmente para mostrar a nova postagem imediatamente
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
      }, 500);
      
    } catch (error) {
      console.error('Erro ao criar publicação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar sua publicação. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card className="p-4 mb-6 shadow-md">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <Textarea
            placeholder="O que você quer compartilhar?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-3 border rounded resize-none"
            rows={3}
          />
        </div>
        
        {/* Preview da imagem */}
        {imagePreview && (
          <div className="relative mb-4">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="w-full max-h-64 object-cover rounded-md"
            />
            <button
              type="button"
              className="absolute top-2 right-2 bg-gray-800 bg-opacity-50 text-white rounded-full p-1"
              onClick={removeImage}
            >
              <X size={16} />
            </button>
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
              className="mr-2"
            >
              <Image size={16} className="mr-2" />
              Adicionar Imagem
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              className="hidden"
              accept="image/*"
            />
          </div>
          
          <Button 
            type="submit" 
            disabled={isSubmitting || (!content.trim() && !selectedImage)}
            className="bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Publicando...
              </>
            ) : (
              "Publicar"
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}