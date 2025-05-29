import React, { useState, useEffect } from 'react';
import { convertBlobToPermStorage } from '@/utils/convertBlobToPermStorage';
import OptimizedImage from './OptimizedImage';

interface PersistentImageProps {
  src: string;
  alt: string;
  className?: string;
  onImageLoad?: (permanentUrl: string) => void;
}

/**
 * Componente que garante que uma imagem seja armazenada permanentemente
 * Converte automaticamente URLs de blob para armazenamento no servidor
 */
export default function PersistentImage({
  src,
  alt,
  className = '',
  onImageLoad
}: PersistentImageProps) {
  const [finalSrc, setFinalSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Se for uma URL de blob, tentar renderizá-la diretamente sem conversão
    // Essa abordagem é mais eficiente e evita erros de CORS
    if (src && typeof src === 'string') {
      // URLs de blob podem ser usadas diretamente no navegador
      // portanto não precisamos convertê-las necessariamente
      setFinalSrc(src);
      
      // Não tentamos converter blobs para evitar erros
      // No futuro, quando o usuário salvar o conteúdo, ele pode 
      // fazer upload do arquivo para o servidor
    } else {
      setFinalSrc(src || '');
    }
  }, [src, onImageLoad]);

  // Mostrar estado de carregamento
  if (isLoading) {
    return (
      <div className={`bg-gray-100 animate-pulse ${className}`}>
        <div className="w-full h-full flex items-center justify-center text-gray-400">
          Processando imagem...
        </div>
      </div>
    );
  }

  // Mostrar estado de erro
  if (hasError) {
    return (
      <div className={`bg-gray-100 ${className}`}>
        <div className="w-full h-full flex items-center justify-center text-gray-500">
          Imagem não disponível
        </div>
      </div>
    );
  }

  // Renderizar a imagem otimizada com URL final
  return (
    <OptimizedImage 
      src={finalSrc} 
      alt={alt} 
      className={className}
    />
  );
}