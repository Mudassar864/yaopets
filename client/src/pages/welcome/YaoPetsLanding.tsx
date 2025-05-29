import React from 'react';
import { Button } from "@/components/ui/button";
import { useLocation } from 'wouter';

const YaoPetsLanding = () => {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-primary/10">
      {/* Header */}
      <header className="py-4 px-6 flex justify-between items-center">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold font-display text-primary">YaoPets</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={() => navigate('/auth/login')}
          >
            Entrar
          </Button>
          <Button 
            onClick={() => navigate('/auth/register')}
          >
            Cadastre-se
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24 flex flex-col md:flex-row items-center gap-12">
        <div className="md:w-1/2 space-y-6">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-neutral-900">
            Conectando <span className="text-primary">pessoas</span> e <span className="text-primary">animais</span> com amor
          </h2>
          <p className="text-lg text-neutral-600 max-w-lg">
            Um espaço seguro para adoção, doação, ajuda veterinária e 
            muito mais para todos os amantes de pets.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button 
              size="lg" 
              onClick={() => navigate('/auth/register')}
              className="px-8"
            >
              Começar agora
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate('/about')}
              className="px-8"
            >
              Saiba mais
            </Button>
          </div>
        </div>
        <div className="md:w-1/2">
          <img 
            src="https://source.unsplash.com/random/800x600?pet,dog,cat" 
            alt="Pets felizes" 
            className="rounded-2xl shadow-xl w-full h-auto object-cover"
          />
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <h3 className="text-3xl font-bold text-center mb-16">Como o YaoPets pode te ajudar</h3>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <span className="material-icons text-primary">pets</span>
            </div>
            <h4 className="text-xl font-semibold mb-3">Adoção responsável</h4>
            <p className="text-neutral-600">
              Encontre o pet perfeito para sua família ou ajude a encontrar um lar para animais resgatados.
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <span className="material-icons text-primary">local_hospital</span>
            </div>
            <h4 className="text-xl font-semibold mb-3">Assistência veterinária</h4>
            <p className="text-neutral-600">
              Conectamos veterinários voluntários e profissionais para ajudar pets em necessidade.
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <span className="material-icons text-primary">favorite</span>
            </div>
            <h4 className="text-xl font-semibold mb-3">Doações e campanhas</h4>
            <p className="text-neutral-600">
              Contribua para campanhas de tratamentos, cirurgias e medicamentos para animais necessitados.
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <span className="material-icons text-primary">chat</span>
            </div>
            <h4 className="text-xl font-semibold mb-3">Comunidade ativa</h4>
            <p className="text-neutral-600">
              Compartilhe experiências, tire dúvidas e conecte-se com outros amantes de animais.
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <span className="material-icons text-primary">map</span>
            </div>
            <h4 className="text-xl font-semibold mb-3">Localização próxima</h4>
            <p className="text-neutral-600">
              Encontre pets e serviços perto de você com nosso sistema de geolocalização.
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <span className="material-icons text-primary">emoji_events</span>
            </div>
            <h4 className="text-xl font-semibold mb-3">Gamificação</h4>
            <p className="text-neutral-600">
              Ganhe reconhecimento e recompensas por suas contribuições para a comunidade animal.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-primary/10 py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl md:text-4xl font-bold mb-6">Pronto para fazer a diferença?</h3>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto mb-8">
            Junte-se a milhares de pessoas que já estão transformando vidas de animais através do YaoPets.
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate('/auth/register')}
            className="px-8"
          >
            Comece agora gratuitamente
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-100 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h5 className="font-bold text-lg mb-4">YaoPets</h5>
              <p className="text-neutral-600">
                Conectando pessoas e animais com amor e cuidado desde 2023.
              </p>
            </div>
            
            <div>
              <h5 className="font-bold text-lg mb-4">Links Rápidos</h5>
              <ul className="space-y-2">
                <li><a href="/about" className="text-neutral-600 hover:text-primary">Sobre nós</a></li>
                <li><a href="/pets" className="text-neutral-600 hover:text-primary">Adoção</a></li>
                <li><a href="/donations" className="text-neutral-600 hover:text-primary">Doações</a></li>
                <li><a href="/vet-help" className="text-neutral-600 hover:text-primary">Ajuda Veterinária</a></li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-bold text-lg mb-4">Legal</h5>
              <ul className="space-y-2">
                <li><a href="/privacy-policy" className="text-neutral-600 hover:text-primary">Política de Privacidade</a></li>
                <li><a href="/terms" className="text-neutral-600 hover:text-primary">Termos de Uso</a></li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-bold text-lg mb-4">Contato</h5>
              <ul className="space-y-2">
                <li className="text-neutral-600">contato@yaopets.com</li>
                <li className="text-neutral-600">Siga-nos nas redes sociais</li>
                <li className="flex gap-4 mt-2">
                  <a href="#" className="text-neutral-600 hover:text-primary">
                    <span className="material-icons">facebook</span>
                  </a>
                  <a href="#" className="text-neutral-600 hover:text-primary">
                    <span className="material-icons">instagram</span>
                  </a>
                  <a href="#" className="text-neutral-600 hover:text-primary">
                    <span className="material-icons">twitter</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-neutral-200 mt-12 pt-8 text-center text-neutral-500">
            <p>© {new Date().getFullYear()} YaoPets. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default YaoPetsLanding;