import React from 'react';

type UserLevelBadgeProps = {
  level: string;
  compact?: boolean;
};

const UserLevelBadge: React.FC<UserLevelBadgeProps> = ({ level, compact = false }) => {
  // Mapeamento de cores por nível
  const getLevelColor = (userLevel: string): string => {
    const colors: Record<string, string> = {
      'Iniciante': 'bg-slate-100 text-slate-800',
      'Protetor': 'bg-blue-100 text-blue-800',
      'Guardião': 'bg-purple-100 text-purple-800',
      'Anjo dos Pets': 'bg-pink-100 text-pink-800',
      'Herói Animal': 'bg-yellow-100 text-yellow-800'
    };
    
    return colors[userLevel] || 'bg-gray-100 text-gray-800';
  };

  // Classe CSS com base no tamanho
  const className = compact 
    ? `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getLevelColor(level)}`
    : `inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(level)}`;

  return (
    <div className={className}>
      <span className="material-icons text-xs mr-1">emoji_events</span>
      {level}
    </div>
  );
};

export default UserLevelBadge;