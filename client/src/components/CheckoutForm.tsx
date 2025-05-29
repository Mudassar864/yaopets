import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface CheckoutFormProps {
  amount: number;
  title: string;
  onSuccess?: () => void;
}

export function CheckoutForm({ amount, title, onSuccess }: CheckoutFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async () => {
    setIsLoading(true);

    try {
      console.log('🚀 Iniciando checkout do Stripe...');
      
      const response = await apiRequest('POST', '/api/create-checkout-session', {
        amount,
        description: title,
        fundraiser: new URLSearchParams(window.location.search).get('fundraiser') || ''
      });
      
      const data = await response.json();
      console.log('📋 Dados recebidos do backend:', data);
      
      if (data.url) {
        console.log('✅ Redirecionando para Stripe Checkout:', data.url);
        // Redireciona para o checkout seguro do Stripe
        window.location.href = data.url;
      } else {
        console.log('❌ URL não encontrada na resposta:', data);
        throw new Error('Não foi possível criar o checkout - URL não recebida');
      }
      
    } catch (error: any) {
      console.log('❌ Erro no checkout:', error);
      toast({
        title: "Erro no checkout",
        description: "Tente novamente em alguns instantes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Cabeçalho */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white text-center">
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🐾</span>
        </div>
        <h2 className="text-xl font-bold mb-2">{title}</h2>
        <div className="text-3xl font-bold">
          R$ {(amount / 100).toFixed(2)}
        </div>
        <p className="text-blue-100 text-sm mt-1">
          Sua doação faz a diferença! 💙
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Resumo da doação */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
            <span className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs mr-2">✓</span>
            Resumo da Sua Doação
          </h3>
          <div className="space-y-2 text-sm text-blue-800">
            <div className="flex justify-between">
              <span>Causa:</span>
              <span className="font-medium">{title}</span>
            </div>
            <div className="flex justify-between">
              <span>Valor:</span>
              <span className="font-bold text-green-600">R$ {(amount / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Informações de segurança */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-3 flex items-center">
            <span className="text-green-600 mr-2">🔐</span>
            Pagamento 100% Seguro
          </h3>
          <div className="space-y-2 text-sm text-green-800">
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              <span>Processado pelo Stripe (padrão mundial)</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              <span>Cartões de crédito e débito aceitos</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              <span>Criptografia de nível bancário</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              <span>Confirmação instantânea por email</span>
            </div>
          </div>
        </div>

        {/* Botão principal */}
        <Button
          onClick={handleCheckout}
          disabled={isLoading}
          className="w-full py-4 text-lg font-bold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 shadow-lg hover:shadow-xl transition-all duration-200"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3"></div>
              Redirecionando para checkout seguro...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <span className="mr-2">💝</span>
              Doar R$ {(amount / 100).toFixed(2)}
              <span className="ml-2">→</span>
            </div>
          )}
        </Button>

        {/* Informações adicionais */}
        <div className="text-center space-y-2">
          <p className="text-xs text-gray-500 flex items-center justify-center">
            <span className="mr-1">🔒</span>
            Redirecionamento para página oficial do Stripe
          </p>
          <p className="text-xs text-gray-400">
            Seus dados nunca são armazenados em nossos servidores
          </p>
        </div>

        {/* Badges de confiança */}
        <div className="flex justify-center space-x-4 pt-2">
          <div className="flex items-center text-xs text-gray-500">
            <span className="w-4 h-4 bg-blue-500 rounded text-white flex items-center justify-center mr-1 text-[10px]">S</span>
            Stripe
          </div>
          <div className="flex items-center text-xs text-gray-500">
            <span className="text-green-500 mr-1">🔐</span>
            SSL
          </div>
          <div className="flex items-center text-xs text-gray-500">
            <span className="text-blue-500 mr-1">✓</span>
            PCI Compliant
          </div>
        </div>
      </div>
    </div>
  );
}