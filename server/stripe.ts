import Stripe from 'stripe';

// Verificar chaves do Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Chave secreta do Stripe (STRIPE_SECRET_KEY) não configurada no ambiente');
}

console.log('Usando chave Stripe:', process.env.STRIPE_SECRET_KEY.substring(0, 10) + '...');

// Inicializar o cliente Stripe usando a chave do ambiente
let stripeClient: Stripe;
try {
  // Tentativa de usar a chave publicada em STRIPE_SECRET_KEY
  stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16' as any,
  });
} catch (error) {
  console.error('Erro ao inicializar Stripe:', error);
  throw error;
}

export const stripe = stripeClient;

// Função para criar uma intenção de pagamento
export async function createPaymentIntent(amount: number, metadata: Record<string, any> = {}) {
  try {
    console.log(`Criando PaymentIntent para ${amount} centavos`);
    
    const paymentIntent = await stripeClient.paymentIntents.create({
      amount, // Valor em centavos
      currency: 'brl',
      metadata,
      automatic_payment_methods: { 
        enabled: true 
      }
    });
    
    console.log(`PaymentIntent criado: ${paymentIntent.id}`);
    return paymentIntent;
  } catch (error) {
    console.error('Erro ao criar intenção de pagamento:', error);
    throw error;
  }
}

// Função para recuperar uma intenção de pagamento
export async function retrievePaymentIntent(paymentIntentId: string) {
  try {
    return await stripeClient.paymentIntents.retrieve(paymentIntentId);
  } catch (error) {
    console.error('Erro ao recuperar intenção de pagamento:', error);
    throw error;
  }
}

// Função para criar uma assinatura
export async function createSubscription(customerId: string, priceId: string) {
  try {
    return await stripeClient.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });
  } catch (error) {
    console.error('Erro ao criar assinatura:', error);
    throw error;
  }
}

// Função para criar ou recuperar um cliente Stripe
export async function createOrRetrieveCustomer(email: string, name: string, metadata: Record<string, any> = {}) {
  try {
    // Verificar se o cliente já existe
    const customers = await stripeClient.customers.list({
      email,
      limit: 1,
    });
    
    if (customers.data.length > 0) {
      return customers.data[0];
    }
    
    // Criar novo cliente
    return await stripeClient.customers.create({
      email,
      name,
      metadata,
    });
  } catch (error) {
    console.error('Erro ao criar/recuperar cliente:', error);
    throw error;
  }
}