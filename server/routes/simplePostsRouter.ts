import express, { Request, Response } from 'express';
import { storage } from '../storage';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Garantir que o diretório de uploads existe
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Middleware simplificado - sempre permite operações
const simpleAuth = (req: Request, res: Response, next: express.NextFunction) => {
  // Definir usuário padrão para testes
  if (!req) {
    req.user = { id: 18 };
  }
  next();
};

// Listar todos os posts (filtráveis)
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters = {
      userId: req.query.userId ? parseInt(req.query.userId as string) : undefined,
      postType: req.query.postType as string | undefined,
      isStory: req.query.isStory ? req.query.isStory === 'true' : undefined,
      visibilityType: req.query.visibilityType as string | undefined,
    };
    
    console.log("Buscando posts com filtros:", filters);
    const posts = await storage.getPosts(filters);
    
    res.json(posts);
  } catch (error) {
    console.error("Erro ao buscar posts:", error);
    res.status(500).json({ message: "Erro ao buscar postagens" });
  }
});

// Criar um novo post - versão ultra simplificada
router.post('/', simpleAuth, async (req: Request, res: Response) => {
  try {
    console.log("Recebendo solicitação para criar post:", req.body);
    
    // Usar o usuário da sessão ou ID padrão
    const userId = (req.user as any)?.id || 18;
    
    // Extrair mediaUrls do corpo da requisição - suporta vários formatos
    let mediaUrls: string[] = [];
    
    // Se vier com mediaUrls como array, usar diretamente
    if (req.body.mediaUrls && Array.isArray(req.body.mediaUrls)) {
      mediaUrls = req.body.mediaUrls;
    } 
    // Se vier como string JSON, parsear
    else if (req.body.mediaUrls && typeof req.body.mediaUrls === 'string') {
      try {
        mediaUrls = JSON.parse(req.body.mediaUrls);
      } catch (e) {
        // Se falhar no parse, tratar como uma única URL
        mediaUrls = [req.body.mediaUrls];
      }
    }
    // Se o mediaUrl vier como propriedade única
    else if (req.body.mediaUrl) {
      mediaUrls = [req.body.mediaUrl];
    }
    
    // Se nenhuma mídia foi fornecida, criar uma URL de placeholder
    if (mediaUrls.length === 0) {
      const timestamp = Date.now();
      const randomId = Math.floor(Math.random() * 1000);
      mediaUrls = [`https://yaopets-media-demo/${timestamp}-${randomId}.jpg`];
    }
    
    // Processar a localização - aceita objeto ou string
    let locationData = null;
    if (req.body.location) {
      if (typeof req.body.location === 'string') {
        try {
          locationData = JSON.parse(req.body.location);
        } catch (e) {
          // Se falhar no parse, usar como texto direto
          locationData = { address: req.body.location };
        }
      } else {
        locationData = req.body.location;
      }
    }
    
    // Construir dados básicos do post
    const postData = {
      userId,
      content: req.body.content || "Nova publicação",
      mediaUrls: JSON.stringify(mediaUrls),
      location: locationData ? JSON.stringify(locationData) : null,
      visibilityType: req.body.visibilityType || "public",
      postType: req.body.postType || "regular",
      isStory: req.body.isStory === true || req.body.isStory === 'true',
    };
    
    console.log("Criando post com dados:", postData);
    
    // Salvar no banco de dados
    const newPost = await storage.createPost(postData);
    console.log("Post criado com sucesso:", newPost);
    
    // Invalidar cache de posts se necessário
    
    res.status(201).json({
      ...newPost,
      success: true,
      message: "Post criado com sucesso"
    });
  } catch (error) {
    console.error("Erro ao criar post:", error);
    res.status(500).json({ 
      message: "Erro ao criar postagem", 
      error: String(error),
      success: false 
    });
  }
});

// Obter post específico
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }
    
    const post = await storage.getPost(id);
    if (!post) {
      return res.status(404).json({ message: "Post não encontrado" });
    }
    
    res.json(post);
  } catch (error) {
    console.error("Erro ao buscar post:", error);
    res.status(500).json({ message: "Erro ao buscar post" });
  }
});

export default router;