import { useState } from 'react';
import { useLocation } from 'wouter';
import { 
  Globe, 
  FileText, 
  Settings as SettingsIcon, 
  MessageSquare, 
  HelpCircle, 
  Award, 
  Info, 
  LogOut,
  Bell,
  ChevronRight,
  Star,
  Shield,
  User,
  ShoppingBag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

export default function SettingsPage() {
  const [, navigate] = useLocation();
  const { logout, user } = useAuth();
  const { toast } = useToast();
  const [currentLanguage, setCurrentLanguage] = useState('Português');
  
  // Opções de idioma disponíveis
  const languages = ['Português', 'English', 'Español'];
  
  // Função para trocar o idioma
  const changeLanguage = (lang: string) => {
    setCurrentLanguage(lang);
    toast({
      title: "Idioma alterado",
      description: `O idioma foi alterado para ${lang}`,
    });
  };
  
  // Função para logout
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Cabeçalho do perfil */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6 rounded-b-3xl shadow-md">
        <div className="flex items-center mb-4">
          <div className="w-16 h-16 rounded-full bg-white shadow-inner flex items-center justify-center overflow-hidden">
            {user?.profileImage ? (
              <img src={user.profileImage} alt={user?.name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-purple-500" />
            )}
          </div>
          <div className="ml-4">
            <h2 className="text-xl font-bold">{user?.name || 'Usuário'}</h2>
            <p className="text-purple-200">{user?.email || ''}</p>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <div className="text-center">
            <p className="text-xs text-purple-200">Nível</p>
            <p className="font-bold">{user?.level || 'Iniciante'}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-purple-200">Pontos</p>
            <p className="font-bold">{user?.points || '0'}</p>
          </div>
          <div>
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-white/20 text-white border-white/40 hover:bg-white/30"
              onClick={() => navigate('/profile')}
            >
              Ver perfil
            </Button>
          </div>
        </div>
      </div>
      
      {/* Conteúdo principal */}
      <div className="container py-6 max-w-md mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6 text-center text-purple-800">Configurações</h1>
        
        {/* Idioma */}
        <div className="mb-8 bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center mb-3">
            <div className="p-2 bg-purple-100 rounded-full mr-3">
              <Globe className="h-5 w-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-medium text-gray-800">Idioma</h2>
          </div>
          <Separator className="mb-4 bg-purple-100" />
          <div className="grid grid-cols-3 gap-2">
            {languages.map((lang) => (
              <Button 
                key={lang}
                variant={currentLanguage === lang ? "default" : "outline"}
                className={currentLanguage === lang 
                  ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white border-none hover:from-purple-700 hover:to-purple-800" 
                  : "border-purple-200 text-purple-800 hover:bg-purple-50"}
                onClick={() => changeLanguage(lang)}
              >
                {lang}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Seções de configuração */}
        <div className="space-y-3 mb-8">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider pl-2">Configurações Gerais</h3>
          
          {/* Lista de opções de configuração com melhor estilo */}
          <div className="bg-white rounded-xl overflow-hidden shadow-sm divide-y divide-purple-100">
            <SettingsItem 
              icon={<Shield className="text-purple-600" />}
              title="Termos e Privacidade"
              onClick={() => navigate('/privacy-policy')}
            />
            
            <SettingsItem 
              icon={<SettingsIcon className="text-purple-600" />}
              title="Preferências"
              onClick={() => toast({
                title: "Preferências",
                description: "Configurações de preferências em breve."
              })}
            />
            
            <SettingsItem 
              icon={<HelpCircle className="text-purple-600" />}
              title="Suporte"
              onClick={() => toast({
                title: "Suporte",
                description: "Entre em contato com nosso suporte."
              })}
            />
          </div>
        </div>
        
        {/* Seção Comunicações */}
        <div className="space-y-3 mb-8">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider pl-2">Comunicação</h3>
          
          <div className="bg-white rounded-xl overflow-hidden shadow-sm divide-y divide-purple-100">
            <SettingsItem 
              icon={<MessageSquare className="text-purple-600" />}
              title="Feedback"
              badge="Novo"
              onClick={() => toast({
                title: "Feedback",
                description: "Compartilhe sua opinião conosco."
              })}
            />
            
            <SettingsItem 
              icon={<Bell className="text-purple-600" />}
              title="Notificações e Anúncios"
              onClick={() => toast({
                title: "Notificações",
                description: "Gerencie suas preferências de notificação."
              })}
            />
          </div>
        </div>
        
        {/* Seção Insights e Sobre */}
        <div className="space-y-3 mb-8">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider pl-2">Informações</h3>
          
          <div className="bg-white rounded-xl overflow-hidden shadow-sm divide-y divide-purple-100">
            <SettingsItem 
              icon={<Award className="text-purple-600" />}
              title="Insights e Estatísticas"
              onClick={() => toast({
                title: "Insights",
                description: "Estatísticas sobre suas atividades."
              })}
            />
            
            <SettingsItem 
              icon={<Star className="text-purple-600" />}
              title="YaoPets Premium"
              badge="Pro"
              onClick={() => navigate('/payments/subscribe')}
            />
            
            <SettingsItem 
              icon={<ShoppingBag className="text-purple-600" />}
              title="Loja"
              onClick={() => navigate('/store')}
            />
            
            <SettingsItem 
              icon={<Info className="text-purple-600" />}
              title="Sobre o YaoPets"
              onClick={() => toast({
                title: "Sobre",
                description: "YaoPets v1.0 - Ajudando pets desde 2025."
              })}
            />
          </div>
        </div>
        
        {/* Botão de logout */}
        <div className="mt-8">
          <Button 
            variant="destructive" 
            className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl py-6"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-5 w-5" /> Sair da conta
          </Button>
        </div>
        
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>YaoPets v1.0.0</p>
          <p className="mt-1">© 2025 YaoPets. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
}

// Componente de item de configuração reutilizável
function SettingsItem({ 
  icon, 
  title, 
  badge, 
  onClick 
}: { 
  icon: React.ReactNode; 
  title: string; 
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button 
      className="w-full flex items-center justify-between p-4 hover:bg-purple-50 transition-colors duration-200"
      onClick={onClick}
    >
      <div className="flex items-center">
        <div className="p-2 rounded-full bg-purple-50 mr-3">
          {icon}
        </div>
        <span className="text-gray-800 font-medium">{title}</span>
        
        {badge && (
          <span className="ml-2 px-2 py-0.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs rounded-full">
            {badge}
          </span>
        )}
      </div>
      <ChevronRight className="h-5 w-5 text-gray-400" />
    </button>
  );
}