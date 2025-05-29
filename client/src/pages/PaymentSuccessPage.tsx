import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { CheckCircle, Heart, Home } from 'lucide-react';

export default function PaymentSuccessPage() {
  const [, navigate] = useLocation();
  const [paymentDetails, setPaymentDetails] = useState({
    amount: '',
    title: 'Doação YaoPets'
  });

  useEffect(() => {
    // Extrair detalhes do pagamento da URL
    const urlParams = new URLSearchParams(window.location.search);
    const amount = urlParams.get('amount');
    const title = urlParams.get('title');

    if (amount) {
      setPaymentDetails({
        amount: `R$ ${(parseInt(amount) / 100).toFixed(2)}`,
        title: title || 'Doação YaoPets'
      });
    }

    // Auto-redirect após 10 segundos
    const timer = setTimeout(() => {
      navigate('/');
    }, 10000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        
        {/* Ícone de sucesso */}
        <div className="mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <div className="flex justify-center space-x-2 mb-4">
            <Heart className="w-6 h-6 text-red-500 animate-pulse" />
            <Heart className="w-6 h-6 text-red-500 animate-pulse" style={{ animationDelay: '0.2s' }} />
            <Heart className="w-6 h-6 text-red-500 animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>

        {/* Mensagem principal */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Pagamento Realizado!
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Sua doação foi processada com sucesso e já está ajudando nossos amigos de quatro patas! 🐾
          </p>

          {/* Detalhes da doação */}
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalhes da Doação</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Causa:</span>
                <span className="font-medium">{paymentDetails.title}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Valor doado:</span>
                <span className="text-2xl font-bold text-green-600">
                  {paymentDetails.amount}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="text-green-600 font-medium">✓ Confirmado</span>
              </div>
            </div>
          </div>

          {/* Mensagem de agradecimento */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800 font-medium">
              Obrigado por fazer a diferença! 💙
            </p>
            <p className="text-blue-700 text-sm mt-1">
              Sua generosidade ajuda a salvar vidas e encontrar lares amorosos para nossos pets.
            </p>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="space-y-4">
          <button
            onClick={() => navigate('/')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center"
          >
            <Home className="w-5 h-5 mr-2" />
            Voltar ao Início
          </button>
          
          <button
            onClick={() => navigate('/vet-help')}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-medium transition-colors"
          >
            Ver Outras Causas
          </button>
        </div>

        {/* Contador de redirecionamento */}
        <div className="mt-8 text-sm text-gray-500">
          <p>Você será redirecionado automaticamente em alguns segundos...</p>
        </div>

        {/* Compartilhamento social (opcional) */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-3">
            Compartilhe sua boa ação e inspire outros!
          </p>
          <div className="flex justify-center space-x-4">
            <button className="text-blue-600 hover:text-blue-800 text-sm">
              Compartilhar no WhatsApp
            </button>
            <button className="text-blue-600 hover:text-blue-800 text-sm">
              Compartilhar no Instagram
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}