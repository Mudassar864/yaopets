import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { queryClient } from '@/lib/queryClient';

const createPostSchema = z.object({
  content: z.string().min(1, 'O conteúdo do post é obrigatório'),
  image: z.instanceof(FileList).optional(),
  location: z.string().optional(),
  isStory: z.boolean().default(false),
  visibilityType: z.enum(['public', 'followers', 'private']).default('public')
});

type CreatePostFormValues = z.infer<typeof createPostSchema>;

export default function CreatePostButton({ className = '' }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  
  const form = useForm<CreatePostFormValues>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      content: '',
      isStory: false,
      visibilityType: 'public'
    }
  });
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };
  
  const onSubmit = async (values: CreatePostFormValues) => {
    if (!user) {
      toast({
        title: 'Ação restrita',
        description: 'Você precisa estar logado para criar uma postagem',
        variant: 'destructive'
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append('content', values.content);
      
      if (values.location) {
        formData.append('location', JSON.stringify({ address: values.location }));
      }
      
      formData.append('visibilityType', values.visibilityType);
      formData.append('isStory', values.isStory.toString());
      
      // Adicionar imagem se existir
      if (values.image && values.image.length > 0) {
        formData.append('image', values.image[0]);
      }
      
      const response = await fetch('/api/posts', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Falha ao criar postagem');
      }
      
      // Resetar formulário
      form.reset();
      setImagePreview(null);
      setOpen(false);
      
      // Invalidar cache para atualizar feed
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      
      toast({
        title: 'Sucesso!',
        description: 'Sua postagem foi publicada'
      });
    } catch (error) {
      console.error('Erro ao criar post:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível publicar sua postagem',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!user) {
    return (
      <Button className={className} onClick={() => setLocation('/auth/login')}>
        Entrar para compartilhar
      </Button>
    );
  }
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={className}>Criar Publicação</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Publicação</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>O que você deseja compartilhar?</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Escreva aqui sua mensagem..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="image"
              render={({ field: { value, onChange, ...field } }) => (
                <FormItem>
                  <FormLabel>Adicionar Imagem</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        onChange(e.target.files);
                        handleImageChange(e);
                      }}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  
                  {imagePreview && (
                    <div className="mt-2 rounded-md overflow-hidden">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="max-h-[200px] w-auto mx-auto object-cover"
                      />
                    </div>
                  )}
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Localização (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: São Paulo, SP"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="visibilityType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quem pode ver</FormLabel>
                  <FormControl>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                      {...field}
                    >
                      <option value="public">Todos</option>
                      <option value="followers">Apenas seguidores</option>
                      <option value="private">Apenas eu</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-primary text-white"
              >
                {isSubmitting ? 'Publicando...' : 'Publicar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}