import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X, Image as ImageIcon, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface ImageUploaderProps {
  onImageUploaded?: (imageUrl: string, thumbnailUrl?: string, webpUrl?: string) => void;
  maxImages?: number;
  showPreview?: boolean;
  previewSize?: number;
  buttonText?: string;
  allowMultiple?: boolean;
  className?: string;
}

export default function ImageUploader({
  onImageUploaded,
  maxImages = 1,
  showPreview = true,
  previewSize = 150,
  buttonText = "Escolher imagem",
  allowMultiple = false,
  className = ""
}: ImageUploaderProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Limitar o tamanho máximo da imagem (10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  
  // Formatos de arquivo permitidos
  const ACCEPTED_FORMATS = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    const newFiles: File[] = [];
    const newPreviews: string[] = [];
    const promises: Promise<void>[] = [];
    
    // Processar cada arquivo selecionado
    for (let i = 0; i < e.target.files.length; i++) {
      const file = e.target.files[i];
      
      // Verificar tamanho do arquivo
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "Arquivo muito grande",
          description: `O arquivo ${file.name} excede o limite de 10MB`,
          variant: "destructive"
        });
        continue;
      }
      
      // Verificar formato do arquivo
      if (!ACCEPTED_FORMATS.includes(file.type)) {
        toast({
          title: "Formato inválido",
          description: `O arquivo ${file.name} não é uma imagem válida`,
          variant: "destructive"
        });
        continue;
      }
      
      // Adicionar à lista de arquivos
      newFiles.push(file);
      
      // Criar preview se necessário
      if (showPreview) {
        const promise = new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            if (e.target?.result) {
              newPreviews.push(e.target.result as string);
            }
            resolve();
          };
          reader.readAsDataURL(file);
        });
        promises.push(promise);
      }
      
      // Respeitar limite de imagens
      if (newFiles.length >= maxImages) break;
    }
    
    // Aguardar todos os previews serem gerados
    Promise.all(promises).then(() => {
      setSelectedFiles(newFiles);
      if (showPreview) setPreviews(newPreviews);
    });
    
    // Limpar input para permitir selecionar o mesmo arquivo novamente
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);
    
    if (showPreview) {
      const newPreviews = [...previews];
      newPreviews.splice(index, 1);
      setPreviews(newPreviews);
    }
  };

  const uploadFiles = async () => {
    if (!selectedFiles.length) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const uploadedUrls: string[] = [];
      
      // Processar cada arquivo
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const formData = new FormData();
        formData.append('image', file);
        formData.append('userId', user?.id?.toString() || '0');
        

        
        // Atualizar progresso
        setUploadProgress(Math.round((i / selectedFiles.length) * 50));
        
        // Enviar para o servidor - usar endpoint existente
        const response = await fetch('/api/media', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Erro ao enviar imagem: ${response.statusText}`);
        }
        
        // Atualizar progresso
        setUploadProgress(Math.round(50 + (i / selectedFiles.length) * 50));
        
        // Processar resposta
        const data = await response.json();
        const imageUrl = data.url || data.mediaUrl || '';
        uploadedUrls.push(imageUrl);
        
        // Notificar callback se existir
        if (onImageUploaded) {
          onImageUploaded(imageUrl, data.thumbnailUrl, data.webpUrl);
        }
      }
      
      // Atualizar estado
      setUploadedImageUrls(uploadedUrls);
      
      toast({
        title: "Upload concluído",
        description: `${uploadedUrls.length} ${uploadedUrls.length === 1 ? 'imagem enviada' : 'imagens enviadas'} com sucesso`
      });
      
      // Limpar seleção
      setSelectedFiles([]);
      setPreviews([]);
    } catch (error) {
      console.error("Erro no upload:", error);
      toast({
        title: "Erro no upload",
        description: `Não foi possível enviar as imagens: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        variant: "destructive"
      });
      
      // Exibir um erro mais amigável que ajude o usuário a resolver o problema
      if (!navigator.onLine) {
        toast({
          title: "Sem conexão",
          description: "Verifique sua conexão com a internet e tente novamente",
          variant: "destructive"
        });
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(100);
    }
  };

  // Estilo para o contêiner de preview
  const previewContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginTop: '10px'
  };

  // Estilo para cada item de preview
  const previewItemStyle: React.CSSProperties = {
    width: `${previewSize}px`,
    height: `${previewSize}px`,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  };

  // Estilo para a imagem de preview
  const previewImageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block'
  };

  // Estilo para o botão de remover
  const removeButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '5px',
    right: '5px',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: '50%',
    padding: '4px',
    cursor: 'pointer'
  };

  // Estilo para o contêiner de upload vazio
  const emptyUploadStyle: React.CSSProperties = {
    width: `${previewSize}px`,
    height: `${previewSize}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px dashed #cbd5e1',
    cursor: 'pointer'
  };

  return (
    <div className={`image-uploader ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        multiple={allowMultiple}
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        aria-label="Seleção de imagem"
      />
      
      {/* Previews de imagens selecionadas */}
      {showPreview && (
        <div className="flex flex-wrap gap-3 mt-3">
          {previews.map((preview, index) => (
            <div 
              key={index} 
              className="relative rounded-lg border border-gray-200 overflow-hidden"
              style={{ width: `${previewSize}px`, height: `${previewSize}px` }}
            >
              <img
                src={preview}
                alt={`Preview ${index}`}
                className="w-full h-full object-cover"
              />
              <button 
                className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-100 transition-colors"
                onClick={() => removeFile(index)}
                aria-label="Remover imagem"
                type="button"
              >
                <X size={16} className="text-gray-600" />
              </button>
            </div>
          ))}
          
          {/* Botão para adicionar mais imagens se ainda não alcançou o limite */}
          {previews.length < maxImages && (
            <div 
              className="flex items-center justify-center bg-gray-50 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
              style={{ width: `${previewSize}px`, height: `${previewSize}px` }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-center">
                <Camera size={24} className="mx-auto text-gray-400" />
                <span className="text-xs text-gray-500 mt-1 block">
                  {buttonText}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Botões - simplificados e mais intuitivos */}
      <div className="flex space-x-2 items-center mt-4">
        {(!showPreview || previews.length === 0) && (
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center rounded-full w-full sm:w-auto justify-center"
            disabled={isUploading}
          >
            <ImageIcon className="mr-2 h-4 w-4" />
            {buttonText}
          </Button>
        )}
        
        {selectedFiles.length > 0 && (
          <Button
            type="button"
            variant="default"
            onClick={uploadFiles}
            disabled={isUploading}
            className="flex items-center bg-primary hover:bg-primary/90 text-white rounded-full w-full sm:w-auto justify-center"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {`Enviando... ${uploadProgress}%`}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Enviar {selectedFiles.length > 1 ? `${selectedFiles.length} imagens` : 'imagem'}
              </>
            )}
          </Button>
        )}
      </div>
      
      {/* Indicador de progresso melhorado */}
      {isUploading && (
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-3">
          <div 
            className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-in-out" 
            style={{ width: `${uploadProgress}%` }}
          ></div>
        </div>
      )}
    </div>
  );
}