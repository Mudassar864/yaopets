import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Star, MapPin, Clock, Phone, Mail, Award, MessageCircle } from "lucide-react";

interface VetProfile {
  id: number;
  name: string;
  email: string;
  username: string;
  userType: string;
  city: string;
  bio?: string;
  profileImage?: string;
  specialty?: string;
  experience?: string;
  clinic?: string;
  phone?: string;
  rating: number;
  reviewCount: number;
  isOnline: boolean;
}

interface Review {
  id: number;
  reviewerName: string;
  reviewerImage?: string;
  reviewerId: number;
  rating: number;
  comment: string;
  date: string;
  serviceType: string;
}

export default function VetProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  // Dados simulados baseados nos IDs reais dos veterinários
  const getVetProfileData = (vetId: string): VetProfile => {
    const profiles = {
      "35": {
        id: 35,
        name: "Dra. Amanda Silva",
        email: "amanda.silva@vetclinic.com",
        username: "dra_amanda",
        userType: "veterinario",
        city: "São Paulo",
        bio: "Veterinária especializada em pequenos animais com mais de 8 anos de experiência. Formada pela USP, pós-graduada em Clínica Médica e Cirúrgica de Pequenos Animais. Atendo casos de emergência e consultas de rotina com muito carinho e dedicação.",
        profileImage: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=200",
        specialty: "Especialista em pequenos animais",
        experience: "8 anos",
        clinic: "Clínica VetCare São Paulo",
        phone: "(11) 99999-1234",
        rating: 4.8,
        reviewCount: 156,
        isOnline: true
      },
      "36": {
        id: 36,
        name: "Dr. Carlos Mendes",
        email: "carlos.mendes@vetclinic.com",
        username: "dr_carlos",
        userType: "veterinario",
        city: "São Paulo", 
        bio: "Cirurgião veterinário com especialização em cirurgias de emergência e ortopedia veterinária. Mais de 10 anos salvando vidas de pets. Formado pela FMVZ-USP com residência em cirurgia no Hospital Veterinário da Anhembi Morumbi.",
        profileImage: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?q=80&w=200",
        specialty: "Cirurgião veterinário",
        experience: "10 anos",
        clinic: "Hospital Veterinário São Paulo",
        phone: "(11) 99999-5678",
        rating: 4.5,
        reviewCount: 120,
        isOnline: true
      },
      "37": {
        id: 37,
        name: "Dra. Marina Santos",
        email: "marina.santos@vetclinic.com", 
        username: "dra_marina",
        userType: "veterinario",
        city: "São Paulo",
        bio: "Especialista em animais exóticos e silvestres. Trabalho com aves, répteis, mamíferos exóticos e animais silvestres em reabilitação. Formada pela UNESP com mestrado em Medicina Veterinária de Animais Exóticos pela FMVZ-USP.",
        profileImage: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=200",
        specialty: "Animais exóticos e silvestres",
        experience: "6 anos",
        clinic: "Centro de Reabilitação de Fauna",
        phone: "(11) 99999-9012",
        rating: 4.9,
        reviewCount: 98,
        isOnline: false
      }
    };
    
    return profiles[vetId as keyof typeof profiles] || profiles["35"];
  };

  const getVetReviews = (vetId: string): Review[] => {
    const reviews = {
      "35": [
        {
          id: 1,
          reviewerName: "Maria Silva",
          reviewerImage: "https://images.unsplash.com/photo-1494790108755-2616b612b830?q=80&w=50",
          reviewerId: 19,
          rating: 5,
          comment: "Excelente profissional! A Dra. Amanda cuidou muito bem da minha gata Luna. Muito atenciosa e explicou tudo detalhadamente.",
          date: "2024-01-15",
          serviceType: "Consulta de rotina"
        },
        {
          id: 2,
          reviewerName: "João Santos",
          reviewerImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=50",
          reviewerId: 20,
          rating: 5,
          comment: "Salvou a vida do meu cão Rex! Atendimento de emergência impecável, muito profissional e carinhosa.",
          date: "2024-01-10",
          serviceType: "Emergência"
        },
        {
          id: 3,
          reviewerName: "Ana Costa",
          reviewerImage: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=50",
          reviewerId: 21,
          rating: 4,
          comment: "Muito boa veterinária, explica bem os procedimentos. Só achei o preço um pouco alto.",
          date: "2024-01-05",
          serviceType: "Vacinação"
        }
      ],
      "36": [
        {
          id: 4,
          reviewerName: "Pedro Lima",
          reviewerImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=50",
          reviewerId: 22,
          rating: 5,
          comment: "Dr. Carlos operou meu golden retriever e foi perfeito! Cirurgia complexa feita com maestria.",
          date: "2024-01-12",
          serviceType: "Cirurgia"
        },
        {
          id: 5,
          reviewerName: "Lucia Ferreira",
          reviewerImage: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=50",
          reviewerId: 23,
          rating: 4,
          comment: "Profissional muito competente, mas às vezes demora um pouco no atendimento.",
          date: "2024-01-08",
          serviceType: "Consulta"
        }
      ],
      "37": [
        {
          id: 6,
          reviewerName: "Roberto Silva",
          reviewerImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=50",
          reviewerId: 24,
          rating: 5,
          comment: "Única veterinária da região que atende aves! Salvou meu papagaio, muito especializada.",
          date: "2024-01-14",
          serviceType: "Consulta especializada"
        },
        {
          id: 7,
          reviewerName: "Carla Mendoza",
          reviewerImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=50",
          reviewerId: 25,
          rating: 5,
          comment: "Excelente com animais exóticos! Cuidou muito bem da minha iguana.",
          date: "2024-01-09",
          serviceType: "Tratamento especializado"
        }
      ]
    };
    
    return reviews[vetId as keyof typeof reviews] || reviews["35"];
  };

  const vetProfile = getVetProfileData(id || "35");
  const vetReviews = getVetReviews(id || "35");

  const handleStartChat = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para iniciar uma conversa.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiRequest("POST", "/api/conversations", {
        participant2Id: vetProfile.id
      });

      if (response.ok) {
        const data = await response.json();
        setLocation(`/chat/${data.id}`);
      } else {
        throw new Error("Falha ao criar conversa");
      }
    } catch (error) {
      console.error("Erro ao iniciar chat:", error);
      toast({
        title: "Erro ao iniciar conversa",
        description: "Não foi possível iniciar a conversa. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        size={16} 
        className={i < Math.floor(rating) ? "text-yellow-400 fill-current" : "text-gray-300"} 
      />
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/vet-help")}
            className="flex items-center text-gray-600"
          >
            <ArrowLeft size={20} className="mr-2" />
            Voltar
          </Button>
          <h1 className="text-lg font-semibold text-gray-900">Perfil do Veterinário</h1>
          <div className="w-16"></div>
        </div>
      </div>

      <div className="container mx-auto p-4 max-w-4xl">
        {/* Profile Header */}
        <Card className="mb-6 overflow-hidden">
          <div className="relative h-32 bg-gradient-to-r from-[#CE97E8] to-[#0BDEC2]">
            <div className="absolute bottom-4 left-4 flex items-end space-x-4">
              <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                <AvatarImage src={vetProfile.profileImage} alt={vetProfile.name} />
                <AvatarFallback className="text-xl font-bold bg-white text-[#CE97E8]">
                  {vetProfile.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="text-white pb-2">
                <h2 className="text-2xl font-bold drop-shadow-sm">{vetProfile.name}</h2>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge className={`${vetProfile.isOnline ? 'bg-green-500' : 'bg-gray-500'} text-white`}>
                    {vetProfile.isOnline ? 'Online' : 'Offline'}
                  </Badge>
                  <div className="flex items-center space-x-1">
                    {renderStars(vetProfile.rating)}
                    <span className="text-sm font-medium ml-1">
                      {vetProfile.rating} ({vetProfile.reviewCount} avaliações)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <CardContent className="pt-16 pb-6">
            <div className="max-w-md">
              <h3 className="font-semibold text-gray-900 mb-3">Informações Profissionais</h3>
              <div className="space-y-3">
                <div className="flex items-center text-gray-600">
                  <Award size={18} className="mr-3 text-[#CE97E8]" />
                  <span>{vetProfile.specialty}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Clock size={18} className="mr-3 text-[#CE97E8]" />
                  <span>{vetProfile.experience} de experiência</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <MapPin size={18} className="mr-3 text-[#CE97E8]" />
                  <span>{vetProfile.clinic}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <MapPin size={18} className="mr-3 text-[#0BDEC2]" />
                  <span>{vetProfile.city}</span>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-semibold text-gray-900 mb-3">Sobre</h3>
              <p className="text-gray-600 leading-relaxed">{vetProfile.bio}</p>
            </div>

            <div className="flex gap-3 mt-6">
              <Button 
                onClick={handleStartChat}
                className="w-full bg-gradient-to-r from-[#CE97E8] to-[#AA7DC7] hover:from-[#CE97E8]/90 hover:to-[#AA7DC7]/90 text-white"
              >
                <MessageCircle size={18} className="mr-2" />
                Iniciar Conversa
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reviews Section */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Avaliações ({vetProfile.reviewCount})
              </h3>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  {renderStars(vetProfile.rating)}
                </div>
                <span className="text-lg font-semibold text-gray-900">{vetProfile.rating}</span>
              </div>
            </div>

            <div className="space-y-6">
              {vetReviews.map((review) => (
                <div key={review.id} className="border-b border-gray-100 last:border-0 pb-6 last:pb-0">
                  <div className="flex items-start space-x-4">
                    <Avatar 
                      className="h-12 w-12 cursor-pointer hover:ring-2 hover:ring-[#CE97E8] transition-all"
                      onClick={() => setLocation(`/profile?userId=${review.reviewerId}`)}
                    >
                      <AvatarImage src={review.reviewerImage} alt={review.reviewerName} />
                      <AvatarFallback>
                        {review.reviewerName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 
                            className="font-medium text-gray-900 cursor-pointer hover:text-[#CE97E8] transition-colors"
                            onClick={() => setLocation(`/profile?userId=${review.reviewerId}`)}
                          >
                            {review.reviewerName}
                          </h4>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="flex items-center space-x-1">
                              {renderStars(review.rating)}
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {review.serviceType}
                            </Badge>
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(review.date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-gray-600 leading-relaxed">{review.comment}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}