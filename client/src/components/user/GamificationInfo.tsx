import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface GamificationInfoProps {
  points: number;
  level: string;
  badges?: string[];
}

const LEVELS = {
  'Iniciante': { min: 0, max: 99, next: 'Protetor' },
  'Protetor': { min: 100, max: 299, next: 'Guardião' },
  'Guardião': { min: 300, max: 599, next: 'Anjo dos Pets' },
  'Anjo dos Pets': { min: 600, max: 999, next: 'Herói Animal' },
  'Herói Animal': { min: 1000, max: Number.MAX_SAFE_INTEGER, next: null }
};

export default function GamificationInfo({ points, level, badges = [] }: GamificationInfoProps) {
  // Calcular progresso para o próximo nível
  const currentLevelInfo = LEVELS[level as keyof typeof LEVELS] || LEVELS.Iniciante;
  const nextLevel = currentLevelInfo.next;
  
  let progressPercent = 0;
  let pointsToNextLevel = 0;
  
  if (nextLevel) {
    const nextLevelInfo = LEVELS[nextLevel as keyof typeof LEVELS];
    const totalPointsInLevel = currentLevelInfo.max - currentLevelInfo.min;
    const pointsInCurrentLevel = points - currentLevelInfo.min;
    
    progressPercent = Math.min(100, Math.floor((pointsInCurrentLevel / totalPointsInLevel) * 100));
    pointsToNextLevel = currentLevelInfo.max - points + 1;
  } else {
    progressPercent = 100; // Nível máximo
  }
  
  const getBadgeColor = (badge: string) => {
    const colors: Record<string, string> = {
      'Resgatador': 'bg-blue-100 text-blue-800',
      'Doador Generoso': 'bg-green-100 text-green-800',
      'Anjo de Patas': 'bg-purple-100 text-purple-800',
      'Voluntário Dedicado': 'bg-orange-100 text-orange-800',
      'Protetor Iniciante': 'bg-pink-100 text-pink-800',
    };
    
    return colors[badge] || 'bg-neutral-100 text-neutral-800';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Seu Progresso</CardTitle>
        <CardDescription>
          Continue ajudando a comunidade para ganhar mais pontos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-2">
          <div className="space-y-1">
            <div className="text-2xl font-bold">{points}</div>
            <div className="text-xs text-neutral-500">pontos acumulados</div>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium">
              <span className="material-icons text-sm mr-1">emoji_events</span>
              {level}
            </div>
          </div>
        </div>
        
        {nextLevel && (
          <div className="mb-5">
            <div className="flex justify-between text-xs mb-1">
              <span>{level}</span>
              <span>{nextLevel}</span>
            </div>
            <div className="space-y-1">
              <Progress value={progressPercent} className="h-2" />
              <div className="text-xs text-neutral-500 text-right">
                Faltam {pointsToNextLevel} pontos para o próximo nível
              </div>
            </div>
          </div>
        )}
        
        {badges.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Conquistas</h4>
            <div className="flex flex-wrap gap-2">
              {badges.map((badge, index) => (
                <Badge key={index} className={getBadgeColor(badge)}>{badge}</Badge>
              ))}
            </div>
          </div>
        )}
        
        <div className="mt-4 border-t pt-4">
          <h4 className="text-sm font-medium mb-2">Como ganhar pontos</h4>
          <ul className="text-xs text-neutral-600 space-y-2">
            <li className="flex items-start">
              <span className="material-icons text-primary text-sm mr-1">add_circle</span>
              <span>Compartilhar posts: <span className="font-medium">+5 pontos</span></span>
            </li>
            <li className="flex items-start">
              <span className="material-icons text-primary text-sm mr-1">add_circle</span>
              <span>Contribuir pagamentos: <span className="font-medium">+10 a +100 pontos</span></span>
            </li>
            <li className="flex items-start">
              <span className="material-icons text-primary text-sm mr-1">add_circle</span>
              <span>Doar itens: <span className="font-medium">+15 pontos</span></span>
            </li>
            <li className="flex items-start">
              <span className="material-icons text-primary text-sm mr-1">add_circle</span>
              <span>Adotar pets: <span className="font-medium">+50 pontos</span></span>
            </li>
            <li className="flex items-start">
              <span className="material-icons text-primary text-sm mr-1">add_circle</span>
              <span>Criar posts: <span className="font-medium">+10 pontos</span></span>
            </li>
            <li className="flex items-start">
              <span className="material-icons text-primary text-sm mr-1">add_circle</span>
              <span>Comentar: <span className="font-medium">+3 pontos</span></span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}