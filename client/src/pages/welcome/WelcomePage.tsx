import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { generateInitials } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, ArrowRight, Star, Calendar, MapPin, Heart, LucideIcon, Bell, PawPrint, Users } from "lucide-react";

interface ActivityItem {
  id: number;
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  link: string;
}

export default function WelcomePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [progress, setProgress] = useState(0);
  const [currentTip, setCurrentTip] = useState(0);
  
  // Animação de contador para pontos
  const [pointsCount, setPointsCount] = useState(0);
  // Usar os pontos do usuário ou um valor padrão
  const targetPoints = user?.points || 100;
  
  // Calcular o nível com base nos pontos
  const calculateLevel = () => {
    const points = user?.points || 0;
    if (points >= 500) return "Protetor Master";
    if (points >= 300) return "Protetor Avançado";
    if (points >= 100) return "Protetor";
    return user?.level || "Iniciante";
  };
  
  // Lista de próximas atividades sugeridas
  const activities: ActivityItem[] = [
    {
      id: 1,
      title: "Complete seu perfil",
      description: "Adicione uma foto e mais informações para que outros usuários conheçam você",
      icon: Users,
      iconColor: "text-blue-500",
      link: "/profile"
    },
    {
      id: 2,
      title: "Explore animais próximos",
      description: "Descubra pets que precisam de ajuda na sua região",
      icon: MapPin,
      iconColor: "text-green-500",
      link: "/map"
    },
    {
      id: 3,
      title: "Ative as notificações",
      description: "Para não perder atualizações sobre animais na sua área",
      icon: Bell,
      iconColor: "text-purple-500",
      link: "#notifications"
    },
    {
      id: 4,
      title: "Conheça a comunidade",
      description: "Conecte-se com outros tutores e voluntários",
      icon: PawPrint,
      iconColor: "text-amber-500",
      link: "/home"
    }
  ];

  useEffect(() => {
    // Animação de progresso
    const timer = setTimeout(() => {
      setProgress(100);
    }, 500);

    // Animação de contador
    let start = 0;
    const duration = 1500;
    const interval = 15;
    const increment = targetPoints / (duration / interval);
    
    const counter = setInterval(() => {
      start += increment;
      if (start >= targetPoints) {
        setPointsCount(targetPoints);
        clearInterval(counter);
      } else {
        setPointsCount(Math.floor(start));
      }
    }, interval);
    
    // Alternar entre dicas a cada poucos segundos
    const tipInterval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % activities.length);
    }, 3000);

    // Redirecionar automaticamente após alguns segundos
    const redirect = setTimeout(() => {
      setLocation("/home");
    }, 10000); // Aumentado para 10s para dar tempo de ver as sugestões

    return () => {
      clearTimeout(timer);
      clearInterval(counter);
      clearInterval(tipInterval);
      clearTimeout(redirect);
    };
  }, [targetPoints, setLocation, activities.length]);

  // Determinar a saudação com base na hora do dia
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <div className="mb-6">
          <Avatar className="h-24 w-24 mx-auto mb-4 border-4 border-white shadow-lg">
            {user?.profileImage ? (
              <AvatarImage src={user.profileImage} alt={user.name} />
            ) : (
              <AvatarFallback className="text-2xl">
                {user ? generateInitials(user.name) : "?"}
              </AvatarFallback>
            )}
          </Avatar>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="bg-green-500 text-white rounded-full p-1 absolute -mt-4 ml-16"
          >
            <CheckCircle size={20} />
          </motion.div>
        </div>

        <motion.h1 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold mb-2"
        >
          {getGreeting()}, {user?.name || "Amigo dos Pets"}!
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-gray-600 mb-6"
        >
          Bem-vindo(a) de volta ao YaoPets
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl shadow-md p-5 mb-6 w-full max-w-md mx-auto"
        >
          <h2 className="font-semibold text-lg mb-3 flex items-center">
            <Star className="text-yellow-500 mr-2" size={18} />
            Sua Pontuação
          </h2>
          
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">{calculateLevel()}</span>
            <span className="font-bold text-lg">{pointsCount} pts</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, delay: 0.8 }}
              className="bg-blue-500 h-2.5 rounded-full"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="grid grid-cols-3 gap-4 mb-8 max-w-md mx-auto"
        >
          <div className="bg-white p-3 rounded-lg shadow-sm text-center">
            <Calendar className="mx-auto text-purple-500 mb-1" size={20} />
            <p className="text-xs text-gray-600">Último login</p>
            <p className="text-sm font-semibold">Hoje</p>
          </div>
          
          <div className="bg-white p-3 rounded-lg shadow-sm text-center">
            <MapPin className="mx-auto text-green-500 mb-1" size={20} />
            <p className="text-xs text-gray-600">Sua região</p>
            <p className="text-sm font-semibold">{user?.city || "Brasil"}</p>
          </div>
          
          <div className="bg-white p-3 rounded-lg shadow-sm text-center">
            <Heart className="mx-auto text-red-500 mb-1" size={20} />
            <p className="text-xs text-gray-600">Animais ajudados</p>
            <p className="text-sm font-semibold">{0}</p>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="mb-8 max-w-md mx-auto"
      >
        <h3 className="text-lg font-medium mb-3 text-center">Próximos passos</h3>
        
        <div className="bg-white rounded-xl shadow-md p-5 mb-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTip}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-4"
            >
              <div className={`p-3 rounded-full ${activities[currentTip].iconColor} bg-opacity-10 flex-shrink-0`}>
                {React.createElement(activities[currentTip].icon, { size: 24, className: activities[currentTip].iconColor })}
              </div>
              
              <div className="flex-1">
                <h4 className="font-medium mb-1">{activities[currentTip].title}</h4>
                <p className="text-sm text-gray-600 mb-3">{activities[currentTip].description}</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setLocation(activities[currentTip].link)}
                  className="mt-1"
                >
                  Começar agora
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
          
          <div className="flex justify-center mt-4 gap-1">
            {activities.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full ${i === currentTip ? 'w-4 bg-blue-500' : 'w-1.5 bg-gray-200'}`}
              />
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        <Button 
          onClick={() => setLocation("/home")}
          className="flex items-center"
          size="lg"
        >
          Ir para o início
          <ArrowRight className="ml-2" size={16} />
        </Button>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="text-gray-400 text-xs mt-8"
      >
        Redirecionando automaticamente em alguns segundos...
      </motion.p>
    </div>
  );
}