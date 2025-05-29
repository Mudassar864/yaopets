import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

interface AdoptionChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: {
    id: number;
    name: string;
  };
  pet?: {
    id: number;
    name: string;
    description: string;
    location: string;
  };
  item?: {
    id: number;
    title: string;
    description: string;
    location: string;
  };
}

export default function AdoptionChatModal({ 
  isOpen, 
  onClose, 
  targetUser, 
  pet, 
  item 
}: AdoptionChatModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [message, setMessage] = useState<string>("");
  const [isSending, setIsSending] = useState(false);

  // Pré-preencher a mensagem baseado no tipo (pet ou item)
  React.useEffect(() => {
    if (pet) {
      setMessage(`Olá! Estou interessado(a) em adotar o pet ${pet.name}.
Local: ${pet.location}
Descrição: ${pet.description}

Podemos conversar mais sobre o processo de adoção?`);
    } else if (item) {
      setMessage(`Olá! Estou interessado(a) no item "${item.title}".
Local: ${item.location}
Descrição: ${item.description}

O item ainda está disponível?`);
    } else {
      // Mensagem padrão para conversa direta entre usuários
      setMessage(`Olá ${targetUser.name}! 

Gostaria de conversar com você sobre adoção de pets ou outros assuntos relacionados à plataforma.

Aguardo seu retorno!`);
    }
  }, [pet, item, targetUser.name]);

  const handleSendMessage = async () => {
    if (!user) {
      toast({
        title: "Você precisa estar logado",
        description: "Por favor, faça login para enviar mensagens",
        variant: "destructive",
      });
      navigate("/auth/login");
      return;
    }

    if (!message.trim()) {
      toast({
        title: "Mensagem vazia",
        description: "Por favor, digite uma mensagem",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      // Primeiro, vamos tentar criar uma conversa entre os usuários
      const conversationResponse = await apiRequest("POST", "/api/conversations", {
        participant2Id: parseInt(targetUser.id.toString()),
        // A API usa o usuário atual como participant1Id automaticamente
      });
      
      // Verifica se o response está OK
      if (!conversationResponse.ok) {
        const errorData = await conversationResponse.json();
        console.error("Erro na criação da conversa:", errorData);
        throw new Error(`Falha ao criar conversa: ${errorData.message || 'Erro desconhecido'}`);
      }
      
      const conversationData = await conversationResponse.json();
      console.log("Conversa criada:", conversationData);
      const conversationId = conversationData?.id;
      
      if (!conversationId) {
        console.error("Conversa criada sem ID:", conversationData);
        throw new Error("Falha ao criar conversa: ID da conversa não foi retornado");
      }
      
      // Agora vamos enviar a mensagem
      const messageResponse = await apiRequest("POST", "/api/messages", {
        recipientId: parseInt(targetUser.id.toString()),
        content: message,
        conversationId: conversationId,
        // Se for um pet ou item, adicionamos metadados para rastreamento
        metadata: pet 
          ? { type: "pet_adoption", petId: pet.id } 
          : item 
          ? { type: "item_interest", itemId: item.id }
          : {}
      });
      
      // Verifica se o envio da mensagem foi bem-sucedido
      if (!messageResponse.ok) {
        const errorData = await messageResponse.json();
        console.error("Erro ao enviar mensagem:", errorData);
        throw new Error(`Falha ao enviar mensagem: ${errorData.message || 'Erro desconhecido'}`);
      }
      
      toast({
        title: "Mensagem enviada",
        description: `Sua mensagem foi enviada para ${targetUser.name}.`,
      });
        
      // Registrar o ID da conversa no console para diagnóstico
      console.log(`Conversa criada com sucesso. ID: ${conversationId}`);
      
      // Fechar o modal primeiro
      onClose();
      
      // Atrasar o redirecionamento para garantir que o modal seja fechado
      setTimeout(() => {
        console.log(`Redirecionando para conversa: /chat/${conversationId}`);
        
        // Usar o hook de navegação para redirecionar (melhor que window.location)
        navigate(`/chat/${conversationId}`);
      }, 500);
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast({
        title: "Erro ao enviar mensagem",
        description: "Não foi possível enviar sua mensagem. Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {pet 
              ? `Adotar ${pet.name}` 
              : item 
              ? `Tenho interesse em ${item.title}`
              : "Iniciar conversa"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="my-4">
          <p className="text-sm text-neutral-500 mb-2">
            Sua mensagem para {targetUser.name}:
          </p>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="min-h-[120px] mb-4"
          />
          
          <p className="text-xs text-neutral-400">
            Ao enviar esta mensagem, você iniciará uma conversa com {targetUser.name}.
            Você poderá continuar a conversa na seção de mensagens.
          </p>
        </div>
        
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSendMessage}
            disabled={isSending || !message.trim()}
            className="bg-primary text-white hover:bg-primary/90"
          >
            {isSending ? "Enviando..." : "Enviar mensagem"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}