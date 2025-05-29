import { useEffect, useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { CheckoutForm } from '@/components/CheckoutForm';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

// Carrega o Stripe com a chave pública
console.log('🔑 Carregando Stripe com chave:', import.meta.env.VITE_STRIPE_PUBLIC_KEY ? 'Chave encontrada' : 'Chave não encontrada');
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY!);

export default function CheckoutPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Extrair parâmetros da URL
  const urlParams = new URLSearchParams(window.location.search);
  const amount = parseInt(urlParams.get('amount') || '1000');
  const title = urlParams.get('title') || 'Doação YaoPets';
  const fundraiserId = urlParams.get('fundraiser') || '';

  useEffect(() => {
    createPaymentIntent();
  }, [amount]);

  const createPaymentIntent = async () => {
    try {
      setLoading(true);
      
      const response = await apiRequest('POST', '/api/create-payment-intent', {
        amount,
        description: title,
        fundraiser: fundraiserId
      });
      
      const data = await response.json();
      
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        // Salva no localStorage para o CheckoutForm acessar
        localStorage.setItem('clientSecret', data.clientSecret);
      } else {
        throw new Error('Não foi possível criar o pagamento');
      }
      
    } catch (error) {
      console.error('Erro ao criar PaymentIntent:', error);
      toast({
        title: "Erro no checkout",
        description: "Não foi possível preparar o pagamento. Tente novamente.",
        variant: "destructive",
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Preparando checkout...</p>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Erro no checkout</p>
            <p>Não foi possível carregar o pagamento</p>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#3B82F6',
      colorBackground: '#ffffff',
      colorText: '#1F2937',
      colorDanger: '#EF4444',
      fontFamily: 'system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px'
    }
  };

  const options = {
    clientSecret,
    appearance,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout Seguro</h1>
            <p className="text-gray-600">Powered by Stripe</p>
          </div>
        </div>

        {/* Resumo da doação */}
        <div className="max-w-md mx-auto mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Resumo da Doação</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Causa:</span>
                <span className="font-medium">{title}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Valor:</span>
                <span className="text-2xl font-bold text-blue-600">
                  R$ {(amount / 100).toFixed(2)}
                </span>
              </div>
              
              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total:</span>
                  <span className="text-blue-600">R$ {(amount / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Formulário de pagamento */}
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Informações de Pagamento</h3>
            
            <Elements stripe={stripePromise} options={options}>
              <CheckoutForm 
                amount={amount} 
                title={title}
                onSuccess={() => navigate('/payment-success')}
              />
            </Elements>
          </div>
        </div>

        {/* Segurança */}
        <div className="max-w-md mx-auto mt-6">
          <div className="text-center text-sm text-gray-500">
            <div className="flex items-center justify-center mb-2">
              <svg className="w-4 h-4 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Pagamento 100% seguro
            </div>
            <p>Seus dados são protegidos com criptografia SSL</p>
          </div>
        </div>
      </div>
    </div>
  );
}