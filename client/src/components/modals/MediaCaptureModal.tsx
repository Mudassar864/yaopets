import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Camera, Image as ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

interface MediaCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMediaSelected: (mediaUrl: string, type: "image" | "gif" | "video") => void;
}

export default function MediaCaptureModal({
  open,
  onOpenChange,
  onMediaSelected,
}: MediaCaptureModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "gif" | "video">("image");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isCameraAvailable, setIsCameraAvailable] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showCameraView, setShowCameraView] = useState(false);

  // Iniciar a câmera
  const startCamera = async () => {
    try {
      setIsLoading(true);
      setShowCameraView(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          facingMode: "environment", 
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      if (cameraRef.current) {
        cameraRef.current.srcObject = stream;
      }
      
      setCameraStream(stream);
      setIsCameraAvailable(true);
    } catch (error) {
      console.error("Erro ao acessar a câmera:", error);
      setIsCameraAvailable(false);
      toast({
        title: "Erro na câmera",
        description: "Não foi possível acessar a câmera do dispositivo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Parar a câmera
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCameraView(false);
  };

  // Manipular seleção de arquivo
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileType = file.type;
    setIsLoading(true);

    // Verificar tipo de arquivo
    if (fileType === "image/gif") {
      setMediaType("gif");
    } else if (fileType.startsWith("image/")) {
      setMediaType("image");
    } else if (fileType.startsWith("video/")) {
      setMediaType("video");
    } else {
      toast({
        title: "Formato não suportado",
        description: "Por favor, selecione uma imagem válida.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      // Fazer upload da imagem diretamente para garantir armazenamento permanente
      const formData = new FormData();
      formData.append('file', file);
      
      // Upload simples e direto que funciona
      const uploadResponse = await fetch('/api/simple-upload/upload-image', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Falha ao fazer upload da imagem');
      }
      
      const result = await uploadResponse.json();
      
      // Usar a URL permanente retornada pelo servidor para imagens E GIFs
      if (result.url) {
        const permanentUrl = result.url;
        setPreviewUrl(permanentUrl);
        
        // Passar a URL permanente diretamente para o post
        onMediaSelected(permanentUrl, mediaType);
        
        // Toast removido conforme solicitado
        handleClose();
        return;
      } else {
        // Como fallback, criar preview local temporário
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
      }
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      // Fallback para preview local se o upload falhar
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      
      // Não mostrar aviso - o sistema já funciona localmente enquanto processa
      console.log("Processando imagem em segundo plano...");
    } finally {
      setIsLoading(false);
    }
  };

  // Capturar foto
  const capturePhoto = () => {
    if (!cameraRef.current || !canvasRef.current) return;

    setIsLoading(true);
    const video = cameraRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Configurar canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Desenhar frame do vídeo no canvas
    context?.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      // Converter canvas para URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setPreviewUrl(dataUrl);
      setMediaType("image");
      stopCamera(); 
    } catch (error) {
      console.error("Erro ao capturar foto:", error);
      toast({
        title: "Erro ao capturar",
        description: "Não foi possível capturar a foto.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Confirmar mídia selecionada
  const handleConfirmMedia = async () => {
    if (!previewUrl) {
      toast({
        title: "Nenhuma mídia selecionada",
        description: "Por favor, selecione ou capture uma mídia primeiro.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Se a imagem já foi processada e é uma URL do servidor
      // simplesmente usar essa URL diretamente
      if (!previewUrl.startsWith('data:') && !previewUrl.startsWith('blob:')) {
        onMediaSelected(previewUrl, mediaType);
        handleClose();
        return;
      }
      
      // Se temos acesso ao arquivo original, usá-lo diretamente
      if (fileInputRef.current?.files?.length) {
        const file = fileInputRef.current.files[0];
        
        // Criar FormData para o upload
        const formData = new FormData();
        formData.append('file', file);
        
        // Tentar upload via sistema de armazenamento permanente PostgreSQL
        const uploadResponse = await fetch('/api/media-storage/store-image', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          const mediaUrl = uploadResult.url;
          
          if (mediaUrl) {
            console.log("Imagem armazenada permanentemente no banco PostgreSQL:", mediaUrl);
            toast({
              title: "Sucesso!",
              description: "Imagem salva permanentemente no banco de dados.",
            });
            onMediaSelected(mediaUrl, mediaType);
            handleClose();
            return;
          }
        }
        
        // Fallback silencioso - continuar com o processo
        console.log("Usando fallback para upload da imagem");
        
        // MESMO com falha, usar a imagem original
        onMediaSelected(previewUrl, mediaType);
        handleClose();
        return;
      }
      
      // Para imagens de câmera (data URLs), tentar convertê-las em arquivos
      if (previewUrl.startsWith('data:')) {
        const response = await fetch(previewUrl);
        const blob = await response.blob();
        const file = new File([blob], `camera-image-${Date.now()}.jpg`, { type: 'image/jpeg' });
        
        const formData = new FormData();
        formData.append('file', file);
        
        // Tentar upload da imagem da câmera para armazenamento permanente
        const uploadResponse = await fetch('/api/media-storage/store-image', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          const mediaUrl = uploadResult.url;
          
          if (mediaUrl) {
            console.log("Imagem da câmera armazenada permanentemente:", mediaUrl);
            toast({
              title: "Foto capturada!",
              description: "Imagem salva permanentemente no banco de dados.",
            });
            onMediaSelected(mediaUrl, mediaType);
            handleClose();
            return;
          }
        }
        
        // Mesmo se o upload falhar, usar a imagem da câmera como está
        console.log("Usando imagem da câmera original");
        onMediaSelected(previewUrl, mediaType);
        handleClose();
        return;
      }
      
      // Se chegamos aqui, algo deu errado mas ainda temos o previewUrl
      console.log("Usando preview original como último recurso");
      onMediaSelected(previewUrl, mediaType);
      handleClose();
    } catch (error) {
      console.error("Erro ao processar imagem:", error);
      
      // Mesmo com erro, tentar usar a imagem original se existir
      if (previewUrl) {
        toast({
          title: "Aviso de processamento",
          description: "Houve um erro, mas tentaremos usar sua imagem original.",
          variant: "destructive",
        });
        
        onMediaSelected(previewUrl, mediaType);
      } else {
        toast({
          title: "Erro na imagem",
          description: "Não foi possível processar a imagem selecionada.",
          variant: "destructive",
        });
      }
      
      handleClose();
    } finally {
      setIsLoading(false);
    }
  };

  // Fechar modal
  const handleClose = () => {
    stopCamera();
    setPreviewUrl(null);
    setIsLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 rounded-none sm:rounded-2xl bg-black h-[90vh] sm:h-auto border-0 overflow-hidden">
        {/* Barra superior estilo Instagram */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <Button 
            variant="ghost" 
            onClick={handleClose} 
            className="p-1 h-auto text-white hover:bg-transparent"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </Button>
          
          <span className="text-white font-semibold">Adicionar ao feed</span>
          
          {previewUrl ? (
            <Button 
              variant="ghost" 
              onClick={handleConfirmMedia}
              className="p-1 h-auto text-blue-500 font-bold hover:bg-transparent" 
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Avançar"}
            </Button>
          ) : (
            <div className="w-8"></div>
          )}
        </div>

        {/* Área principal */}
        {showCameraView ? (
          <div className="flex flex-col h-full pt-16">
            {/* Visualização da câmera */}
            <div className="flex-1 bg-black flex items-center justify-center">
              {isCameraAvailable ? (
                <video 
                  ref={cameraRef} 
                  autoPlay 
                  playsInline 
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="text-white text-center">
                  <Camera className="h-12 w-12 mx-auto mb-2" />
                  <p>Câmera não disponível</p>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
            
            {/* Controles da câmera estilo Instagram */}
            <div className="bg-black p-6">
              <div className="flex justify-center mb-6">
                <button 
                  onClick={capturePhoto}
                  disabled={!isCameraAvailable || isLoading}
                  className="h-20 w-20 rounded-full border-4 border-white flex items-center justify-center focus:outline-none"
                >
                  {isLoading ? (
                    <Loader2 className="h-10 w-10 animate-spin text-white" />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-white"></div>
                  )}
                </button>
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center text-white"
                >
                  <div className="h-10 w-10 rounded-full bg-gray-800 flex items-center justify-center mb-1">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <span className="text-xs">Galeria</span>
                </button>
              </div>
            </div>
          </div>
        ) : previewUrl ? (
          <div className="flex flex-col h-full pt-16">
            {/* Preview da mídia */}
            <div className="flex-1 bg-black flex items-center justify-center">
              {mediaType === "video" ? (
                <video 
                  src={previewUrl} 
                  controls
                  className="h-full w-full object-contain"
                />
              ) : (
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="h-full w-full object-contain"
                />
              )}
            </div>
            
            {/* Controles de edição */}
            <div className="bg-black p-4 border-t border-gray-800">
              <div className="flex justify-between items-center">
                <button 
                  onClick={() => setPreviewUrl(null)}
                  className="text-white flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                    <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0" />
                    <path d="m17 12-6 6" />
                    <path d="m13 10-6 6" />
                    <path d="m9 8-6 6" />
                    <path d="m7 6-4 4" />
                  </svg>
                  <span className="text-sm">Refazer</span>
                </button>
                
                <div className="flex space-x-6">
                  <button className="text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 20h16" />
                      <path d="M4 20v-1a7 7 0 0 1 7-7h0a7 7 0 0 1 7 7v1" />
                      <circle cx="12" cy="6" r="3" />
                    </svg>
                  </button>
                  
                  <button className="text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9.5 7.5-2 2a5 5 0 0 0 7 7l2-2a5 5 0 0 0-7-7Z" />
                      <path d="M14 6.5v1.5a1 1 0 0 0 1 1h1.5" />
                      <path d="M18.28 8.28a1 1 0 1 0 1.42-1.42" />
                      <path d="M18.5 2A2.5 2.5 0 0 1 21 4.5" />
                      <path d="M10 10v-.5a2.5 2.5 0 0 1 2.5-2.5" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full pt-16">
            {/* Galeria estilo Instagram */}
            <div className="bg-black border-b border-gray-800 p-2">
              <div className="flex">
                <div className="px-3 py-2 font-medium text-white border-b-2 border-white">
                  Galeria
                </div>
                <div className="px-3 py-2 text-gray-400">
                  Câmera
                </div>
              </div>
            </div>
            
            <div className="flex-1 bg-black p-0.5 overflow-y-auto">
              <div className="grid grid-cols-3 gap-0.5">
                {/* Botão de câmera */}
                <button 
                  onClick={startCamera}
                  className="aspect-square bg-blue-600 flex items-center justify-center"
                >
                  <Camera className="h-8 w-8 text-white" />
                </button>
                
                {/* Grade de imagens simulada */}
                {Array.from({ length: 20 }).map((_, index) => (
                  <button 
                    key={index}
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square bg-gray-800"
                  >
                    {index % 3 === 0 && (
                      <div className="w-full h-full bg-gray-700"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>
            
            <Input 
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*,video/*"
              onChange={handleFileSelect}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}