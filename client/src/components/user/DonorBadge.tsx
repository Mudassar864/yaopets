import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Tipos de distintivos de doador
export enum DonorBadgeLevel {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  DIAMOND = 'diamond'
}

// Informações sobre cada nível de distintivo
export const DONOR_BADGE_INFO = {
  [DonorBadgeLevel.BRONZE]: {
    label: 'Doador Bronze',
    description: 'Fez pelo menos 1 doação para ajudar os animais',
    icon: '🥉',
    color: 'bg-amber-600 hover:bg-amber-700'
  },
  [DonorBadgeLevel.SILVER]: {
    label: 'Doador Prata',
    description: 'Fez pelo menos 3 doações para ajudar os animais',
    icon: '🥈',
    color: 'bg-slate-400 hover:bg-slate-500'
  },
  [DonorBadgeLevel.GOLD]: {
    label: 'Doador Ouro',
    description: 'Fez pelo menos 5 doações para ajudar os animais',
    icon: '🥇',
    color: 'bg-yellow-500 hover:bg-yellow-600'
  },
  [DonorBadgeLevel.PLATINUM]: {
    label: 'Doador Platina',
    description: 'Fez pelo menos 10 doações para ajudar os animais',
    icon: '💎',
    color: 'bg-blue-500 hover:bg-blue-600'
  },
  [DonorBadgeLevel.DIAMOND]: {
    label: 'Doador Diamante',
    description: 'Fez pelo menos 20 doações para ajudar os animais',
    icon: '💖',
    color: 'bg-pink-500 hover:bg-pink-600'
  }
};

type DonorBadgeProps = {
  level: DonorBadgeLevel;
  size?: 'sm' | 'md' | 'lg';
};

export const DonorBadge: React.FC<DonorBadgeProps> = ({ level, size = 'md' }) => {
  const badgeInfo = DONOR_BADGE_INFO[level];
  
  if (!badgeInfo) return null;
  
  const sizeClasses = {
    sm: 'text-xs py-0 px-2',
    md: 'text-sm py-1 px-2.5',
    lg: 'text-base py-1.5 px-3'
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`${badgeInfo.color} ${sizeClasses[size]} font-medium cursor-help`}>
            <span className="mr-1">{badgeInfo.icon}</span>
            {badgeInfo.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{badgeInfo.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Componente para exibir todos os distintivos de um usuário
type DonorBadgesCollectionProps = {
  badges: DonorBadgeLevel[];
  size?: 'sm' | 'md' | 'lg';
};

export const DonorBadgesCollection: React.FC<DonorBadgesCollectionProps> = ({ 
  badges, 
  size = 'md' 
}) => {
  if (!badges || badges.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge, index) => (
        <DonorBadge key={index} level={badge} size={size} />
      ))}
    </div>
  );
};

export default DonorBadge;