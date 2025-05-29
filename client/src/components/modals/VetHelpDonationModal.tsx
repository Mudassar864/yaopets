import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";

type DonationModalProps = {
  fundraiserId: number;
  title: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
};

export default function VetHelpDonationModal({ 
  fundraiserId, 
  title, 
  trigger,
  onSuccess 
}: DonationModalProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Valores predefinidos para doação rápida
  const predefinedAmounts = [10, 20, 50, 100];

  // Função para processar a doação com valor específico
  const handleDonate = (amount: number) => {
    if (!amount || amount <= 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, selecione ou digite um valor maior que zero.",
        variant: "destructive",
      });
      return;
    }

    // Convertendo para centavos para o Stripe
    const amountInCents = Math.round(amount * 100);
    
    toast({
      title: "Processando doação",
      description: `Preparando pagamento de R$ ${amount.toFixed(2)}...`,
    });
    
    // Redirecionando para a página de checkout
    navigate(`/checkout?amount=${amountInCents}&fundraiser=${fundraiserId}&title=${encodeURIComponent(title)}`);
    
    if (onSuccess) {
      onSuccess();
    }
  };

  // Componente do botão de Contribuir que abre a área de pagamento
  const ContributeButton = () => {
    const [expanded, setExpanded] = React.useState(false);
    const [customAmount, setCustomAmount] = React.useState("");

    const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      // Permitir apenas números e decimais
      if (/^(\d+\.?\d*)?$/.test(value)) {
        setCustomAmount(value);
      }
    };

    if (!expanded) {
      // Se tiver um trigger personalizado, usamos ele diretamente
      if (trigger) {
        return (
          <div onClick={() => setExpanded(true)}>
            {trigger}
          </div>
        );
      }
      
      // Caso contrário, usa o botão padrão
      return (
        <Button 
          onClick={() => setExpanded(true)}
          className="w-full sm:w-auto bg-primary hover:bg-primary/90"
        >
          Contribuir
        </Button>
      );
    }

    return (
      <Card className="p-3 space-y-3 border border-primary/20 bg-primary/5">
        <div className="text-sm font-medium">{title}</div>
        
        <div className="grid grid-cols-2 gap-2">
          {predefinedAmounts.map((amount) => (
            <Button
              key={amount}
              variant="outline"
              className="py-2"
              onClick={() => handleDonate(amount)}
            >
              R$ {amount.toFixed(2)}
            </Button>
          ))}
        </div>
        
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">R$</span>
            <Input
              type="number"
              min="1"
              step="any"
              className="pl-10"
              placeholder="Outro valor"
              value={customAmount}
              onChange={handleCustomAmountChange}
            />
          </div>
          <Button 
            onClick={() => {
              const amount = parseFloat(customAmount);
              if (amount > 0) {
                handleDonate(amount);
              } else {
                toast({
                  title: "Valor inválido",
                  description: "Por favor, digite um valor maior que zero.",
                  variant: "destructive",
                });
              }
            }}
            disabled={!customAmount || parseFloat(customAmount) <= 0}
          >
            Doar
          </Button>
        </div>
        
        <Button 
          variant="link" 
          className="text-xs text-neutral-500 p-0 h-auto"
          onClick={() => setExpanded(false)}
        >
          Cancelar
        </Button>
      </Card>
    );
  };

  return <ContributeButton />;
}