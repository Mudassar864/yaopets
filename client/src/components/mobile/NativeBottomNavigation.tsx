import React from 'react';
import { useLocation, Link } from 'wouter';
import { Home, PawPrint, PlusCircle, Heart, Stethoscope, Settings } from 'lucide-react';

/**
 * Componente de navegação inferior para o aplicativo YaoPets
 * Implementação conforme novo design:
 * 1. Início (casinha)
 * 2. Pets (pata de animal)
 * 3. Botão central para criar postagem - redireciona para página de criação
 * 4. Doações (coração)
 * 5. Veterinário & Ajuda (estetoscópio)
 */
export default function NativeBottomNavigation() {
  const [location] = useLocation();
  
  return (
    <>
      
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-purple-bg flex justify-evenly items-center h-16 px-2 z-50">
        {/* Início */}
        <div className="flex items-center justify-center">
          <Link to="/home" className="text-center">
            <div className="flex items-center justify-center">
              <Home size={28} className={location === '/home' ? 'text-primary' : 'text-dark-purple/70'} />
            </div>
          </Link>
        </div>
        
        {/* Pets */}
        <div className="flex items-center justify-center">
          <Link to="/pets" className="text-center">
            <div className="flex items-center justify-center">
              <PawPrint size={28} className={location === '/pets' ? 'text-primary' : 'text-dark-purple/70'} />
            </div>
          </Link>
        </div>
        
        {/* Botão central para criar postagem - escondido nas páginas específicas */}
        {location !== '/pets' && location !== '/vet-help' && location !== '/donations' && (
          <div className="flex items-center justify-center">
            <Link to="/create-post" className="text-center">
              <div className="flex items-center justify-center relative">
                <div className="bg-primary rounded-full p-3 shadow-md">
                  <PlusCircle size={28} className="text-white" />
                </div>
              </div>
            </Link>
          </div>
        )}
        {/* Removido o espaçador flexível, agora usando justify-evenly para distribuição uniforme */}
        
        {/* Doações - coração */}
        <div className="flex items-center justify-center">
          <Link to="/donations" className="text-center">
            <div className="flex items-center justify-center">
              <Heart size={28} className={location === '/donations' ? 'text-primary' : 'text-dark-purple/70'} />
            </div>
          </Link>
        </div>
        
        {/* Veterinário & Ajuda */}
        <div className="flex items-center justify-center">
          <Link to="/vet-help" className="text-center">
            <div className="flex items-center justify-center">
              <Stethoscope size={28} className={location === '/vet-help' ? 'text-primary' : 'text-dark-purple/70'} />
            </div>
          </Link>
        </div>
        
        {/* Ícone de configuração (apenas nas páginas específicas) */}
        {(location === '/pets' || location === '/vet-help' || location === '/donations') && (
          <div className="flex items-center justify-center">
            <Link to="/settings" className="text-center">
              <div className="flex items-center justify-center">
                <Settings size={28} className="text-dark-purple/70" />
              </div>
            </Link>
          </div>
        )}
      </div>
    </>
  );
}