import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";

interface SimplifiedPostFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SimplifiedPostForm({ onClose, onSuccess }: SimplifiedPostFormProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast({
        title: "Atenção",
        description: "Por favor, escreva algo para publicar.",
        variant: "destructive",
      });
      return;
    }
    
    if (!user) {
      toast({
        title: "Atenção",
        description: "Você precisa estar logado para publicar.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Criar post apenas com conteúdo sem imagem
      const postData = {
        content: content.trim(),
        visibilityType: "public",
        postType: "regular",
        // Não usamos imagens - isto é importante para evitar erros
        imageUrl: "",
        // Adicionar campos que podem ser necessários
        timestamp: new Date().toISOString()
      };
      
      console.log("Enviando publicação simplificada:", postData);
      
      // Feedback para o usuário de que a operação iniciou
      toast({
        title: "Processando...",
        description: "Criando sua publicação, aguarde um momento."
      });
      
      // Endpoint para posts
      const endpoint = '/api/posts';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
        credentials: 'include'
      });
        
      if (response.ok) {
        console.log(`Post criado com sucesso`);
        
        // Invalidar todos os caches relacionados para garantir atualização
        queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
        
        // Aguardar um pouco antes de retornar para garantir que a invalidação tenha efeito
        await new Promise(resolve => setTimeout(resolve, 300));
        
        toast({
          title: "Sucesso!",
          description: "Sua publicação foi criada com sucesso. Recarregando a página...",
        });
        
        setContent("");
        
        // Chamar callback com recarregamento completo da página
        if (onSuccess) {
          onSuccess();
        } else {
          // Se não houver callback, forçar recarregamento da página após um breve delay
          setTimeout(() => {
            window.location.href = '/home';
          }, 500);
        }
        
        onClose();
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Falha ao criar postagem");
      }
    } catch (error) {
      console.error("Erro ao publicar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar sua publicação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Textarea
          placeholder="O que você está pensando?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="w-full p-3 border rounded resize-none focus:ring focus:ring-purple-300 focus:outline-none"
        />
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button 
          type="button"
          variant="outline"
          onClick={onClose}
          className="rounded-full"
        >
          Cancelar
        </Button>
        
        <Button 
          type="submit"
          disabled={isSubmitting || !content.trim()}
          className="rounded-full bg-primary hover:bg-primary/90 text-white"
        >
          {isSubmitting ? (
            <div className="flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Publicando...
            </div>
          ) : (
            "Publicar"
          )}
        </Button>
      </div>
    </form>
  );
}