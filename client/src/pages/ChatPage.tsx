import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDateTime, generateInitials } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, MoreVertical, Send, Paperclip } from "lucide-react";

// Tipos de dados para as mensagens
interface MessageType {
  id: number;
  content: string;
  createdAt: string;
  senderId: number;
  recipientId: number;
  conversationId: number;
  attachmentUrl?: string;
}

interface Participant {
  id: number;
  name: string;
  profileImage: string | null;
}

interface ConversationData {
  id: number;
  participant1Id: number;
  participant2Id: number;
  lastMessageId: number | null;
  createdAt: string;
  participant?: {
    id: number;
    name: string;
    profileImage: string | null;
  };
  lastMessage?: MessageType;
}

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Fetch conversation data
  const { data: conversationData, isLoading: isConversationLoading } = useQuery({
    queryKey: [`/api/conversations/${id}`],
    enabled: !!id,
  });
  
  // Determine recipient based on current user
  const recipientId = conversationData && currentUser ? 
    (conversationData.participant1Id === currentUser.id 
      ? conversationData.participant2Id 
      : conversationData.participant1Id)
    : null;
  
  // Fetch messages for this conversation
  const { 
    data: messagesData, 
    isLoading: isMessagesLoading,
    refetch: refetchMessages
  } = useQuery({
    queryKey: [`/api/messages/${id}`],
    enabled: !!id,
  });
  
  // Fetch recipient user data
  const { data: recipientData, isLoading: isRecipientLoading } = useQuery({
    queryKey: [`/api/users/${recipientId}`],
    enabled: !!recipientId,
  });
  
  // Set messages when data is loaded
  useEffect(() => {
    if (messagesData && Array.isArray(messagesData)) {
      setMessages(messagesData);
      setIsLoading(false);
    }
  }, [messagesData]);

  // Rolar para a última mensagem quando novos mensagens chegarem
  useEffect(() => {
    if (messageContainerRef.current && !isLoading) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Agrupar mensagens por data
  const groupMessagesByDate = (messages: MessageType[]) => {
    if (!messages || !Array.isArray(messages)) return [];
    
    const grouped: any[] = [];
    let currentDate = '';
    
    messages.forEach(message => {
      const messageDate = new Date(message.createdAt).toLocaleDateString();
      
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        grouped.push({ type: 'date', value: messageDate });
      }
      
      grouped.push({ type: 'message', value: message });
    });
    
    return grouped;
  };
  
  // Mutation for sending messages
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!currentUser || !id) {
        throw new Error("Você precisa estar logado para enviar mensagens");
      }
      
      if (!content.trim()) {
        throw new Error("A mensagem não pode estar vazia");
      }
      
      const response = await apiRequest('POST', "/api/messages", {
        conversationId: parseInt(id),
        recipientId: recipientId,
        content: content.trim()
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao enviar mensagem");
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Limpar o campo de mensagem
      setMessage("");
      
      // Recarregar mensagens
      refetchMessages();
      
      // Focar novamente no input após enviar
      if (inputRef.current) {
        inputRef.current.focus();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message || "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  const handleBack = () => {
    setLocation('/chats');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getDateSeparator = (dateString: string) => {
    const messageDate = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (messageDate.toDateString() === today.toDateString()) {
      return "Hoje";
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return "Ontem";
    } else {
      return messageDate.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    }
  };
  
  // Handle sending a message
  const handleSendMessage = () => {
    if (!message.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(message);
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Chat header */}
      <header className="bg-white py-3 px-4 border-b border-gray-200 flex items-center shadow-sm">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleBack}
          className="rounded-full h-9 w-9 mr-3"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </Button>
        
        <div className="flex items-center flex-1 min-w-0">
          <Avatar className="h-9 w-9 mr-3">
            {recipientData?.profileImage ? (
              <AvatarImage 
                src={recipientData.profileImage}
                alt={recipientData.name} 
                className="h-full w-full object-cover" 
              />
            ) : (
              <AvatarFallback className="bg-blue-100 text-blue-600 font-medium">
                {recipientData?.name ? generateInitials(recipientData.name) : "?"}
              </AvatarFallback>
            )}
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">{recipientData?.name || "Contato"}</h3>
            <p className="text-xs text-gray-500 truncate">
              {recipientData?.city || ""}
            </p>
          </div>
        </div>
        
        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 ml-1.5">
          <MoreVertical size={20} className="text-gray-700" />
        </Button>
      </header>
      
      {/* Container de mensagens */}
      <div 
        ref={messageContainerRef} 
        className="flex-1 py-4 px-4 overflow-y-auto bg-gray-50 scroll-smooth"
      >
        {isLoading || isConversationLoading || isMessagesLoading || isRecipientLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : messages && messages.length > 0 ? (
          groupMessagesByDate(messages).map((item, index) => {
            if (item.type === 'date') {
              return (
                <div key={`date-${index}`} className="flex justify-center my-4">
                  <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    {getDateSeparator(item.value)}
                  </span>
                </div>
              );
            } else {
              const message = item.value;
              const isCurrentUser = currentUser && message.senderId === currentUser.id;
              
              return (
                <div 
                  key={`msg-${message.id}`} 
                  className={`mb-3 flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="flex flex-col max-w-[85%]">
                    <div 
                      className={`px-4 py-2.5 rounded-2xl inline-block ${
                        isCurrentUser 
                          ? 'bg-blue-600 text-white rounded-tr-none' 
                          : 'bg-white text-gray-900 border border-gray-200 rounded-tl-none'
                      }`}
                    >
                      {message.attachmentUrl && (
                        <div className="rounded-lg overflow-hidden mb-2">
                          <img 
                            src={message.attachmentUrl} 
                            alt="Anexo" 
                            className="w-full max-h-48 object-cover"
                          />
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                    <span 
                      className={`text-xs mt-1 ${
                        isCurrentUser ? 'text-gray-500 self-end' : 'text-gray-500 self-start'
                      }`}
                    >
                      {formatMessageTime(message.createdAt)}
                    </span>
                  </div>
                </div>
              );
            }
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <h3 className="text-gray-800 font-medium">Nenhuma mensagem</h3>
            <p className="text-gray-500 text-sm mt-1 max-w-xs">
              Comece a conversar enviando uma mensagem para {recipientData?.name}.
            </p>
          </div>
        )}
      </div>
      
      {/* Área de input de mensagem fixa na parte inferior */}
      <div className="bg-white py-3 px-4 border-t border-gray-200 shadow-[0_-1px_2px_rgba(0,0,0,0.05)]">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon"
            className="rounded-full h-10 w-10 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            <Paperclip size={20} />
          </Button>
          
          <div className="flex-1 mx-2">
            <Input
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              className="w-full px-4 py-2.5 border-gray-300 rounded-full bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <Button 
            variant={message.trim() ? "default" : "ghost"}
            size="icon"
            className={`rounded-full h-10 w-10 flex items-center justify-center ${
              message.trim() ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'text-gray-400'
            }`}
            disabled={!message.trim() || sendMessageMutation.isPending}
            onClick={handleSendMessage}
          >
            {sendMessageMutation.isPending ? (
              <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <Send size={18} className={message.trim() ? 'text-white' : ''} />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
