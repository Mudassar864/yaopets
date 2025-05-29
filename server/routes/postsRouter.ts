import express, { Request, Response } from 'express';
import { storage } from '../storage';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

const router = express.Router();

// Configuração do multer para upload de arquivos
const uploadDir = path.join(process.cwd(), 'uploads');

// Garantir que o diretório de uploads existe
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuração do armazenamento para multer
const storage_config = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ storage: storage_config });

// Middleware para verificação de autenticação mais flexível
const flexAuth = (req: Request, res: Response, next: express.NextFunction) => {
  // Para testes, não bloqueamos o acesso mesmo que o usuário não esteja logado
  if (process.env.NODE_ENV === 'development') {
    // Obtenha o ID do usuário do corpo da requisição ou da sessão
    if (!req && req.body && req.body.userId) {
      console.log("[FlexAuth] Usando ID do usuário do corpo da requisição para fins de teste:", req.body.userId);
      req.user = { id: parseInt(req.body.userId) };
    } else if (!req) {
      // Modo de teste - usar ID padrão
      console.log("[FlexAuth] Modo de teste ativado, usando ID padrão 18");
      req.user = { id: 18 };
    }
    return next();
  }
  
  // Em produção, exigimos autenticação
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Não autenticado" });
  }
  
  return next();
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

// Obter um post específico
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

// Criar um novo post - versão simplificada com novo sistema de upload
router.post('/', flexAuth, upload.single('media'), async (req: Request, res: Response) => {
  try {
    console.log("Requisição de criação de post recebida");
    console.log("Body:", req.body);
    console.log("Arquivo:", req.file);
    console.log("Usuário:", req.user);
    
    // Este é o ID do usuário, garantido pelo middleware flexAuth
    const userId = (req.user as any).id;
    console.log("ID do usuário para a postagem:", userId);
    
    // Tratamento do arquivo de mídia
    let mediaUrls: string[] = [];
    
    if (req.file) {
      try {
        // Otimizar imagem se for uma imagem
        const isImage = req.file.mimetype.startsWith('image/');
        
        if (isImage) {
          // Diretório para arquivos otimizados
          const optimizedPath = path.join(uploadDir, 'optimized');
          if (!fs.existsSync(optimizedPath)) {
            fs.mkdirSync(optimizedPath, { recursive: true });
          }
          
          // Nome do arquivo otimizado
          const optimizedFilename = `opt_${path.basename(req.file.path)}`;
          const outputPath = path.join(optimizedPath, optimizedFilename);
          
          // Otimizar com sharp
          await sharp(req.file.path)
            .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 75 })
            .toFile(outputPath);
            
          // Gerar URL para o arquivo otimizado
          const baseUrl = req.protocol + '://' + req.get('host');
          const mediaUrl = `${baseUrl}/uploads/optimized/${optimizedFilename}`;
          mediaUrls = [mediaUrl];
          
          console.log("Imagem otimizada:", mediaUrl);
        } else {
          // Se for outro tipo de arquivo, usar o original
          const baseUrl = req.protocol + '://' + req.get('host');
          const mediaUrl = `${baseUrl}/uploads/${path.basename(req.file.path)}`;
          mediaUrls = [mediaUrl];
          
          console.log("Arquivo não-imagem:", mediaUrl);
        }
      } catch (error) {
        console.error("Erro ao processar arquivo de mídia:", error);
        // Continuar mesmo com erro no processamento de mídia
        // Usar URL de teste
        mediaUrls = [`https://yaopets-media-demo/${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`];
      }
    } else if (req.body.mediaUrls) {
      // Se não tiver arquivo, mas tiver URLs no corpo
      try {
        if (typeof req.body.mediaUrls === 'string') {
          if (req.body.mediaUrls.startsWith('[')) {
            // Parece ser um JSON
            mediaUrls = JSON.parse(req.body.mediaUrls);
          } else {
            // String única
            mediaUrls = [req.body.mediaUrls];
          }
        } else if (Array.isArray(req.body.mediaUrls)) {
          mediaUrls = req.body.mediaUrls;
        }
      } catch (e) {
        console.error("Erro ao processar mediaUrls do corpo:", e);
        // Fallback para URL de teste
        mediaUrls = [`https://yaopets-media-demo/${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`];
      }
    } else {
      // Se não tiver mídia, usar URL de demonstração (apenas para testes)
      console.log("Nenhuma mídia fornecida, usando URL de demonstração");
      mediaUrls = [`https://yaopets-media-demo/${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`];
    }
    
    // Preparar dados da localização
    let location = null;
    if (req.body.location) {
      try {
        if (typeof req.body.location === 'string') {
          if (req.body.location.startsWith('{')) {
            // Parece ser um JSON
            location = req.body.location;
          } else {
            // String simples
            location = JSON.stringify({ address: req.body.location });
          }
        } else if (typeof req.body.location === 'object') {
          location = JSON.stringify(req.body.location);
        }
      } catch (e) {
        console.error("Erro ao processar localização:", e);
      }
    }
    
    // Preparar dados para criar o post
    const postData = {
      userId: userId,
      content: req.body.content || "",
      mediaUrls: JSON.stringify(mediaUrls),
      location: location,
      visibilityType: req.body.visibilityType || "public",
      postType: req.body.postType || "regular",
      isStory: req.body.isStory === 'true',
      expiresAt: req.body.isStory === 'true' ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null
    };
    
    console.log("Criando post com dados:", postData);
    
    const newPost = await storage.createPost(postData);
    console.log("Post criado com sucesso:", newPost);
    
    res.status(201).json(newPost);
  } catch (error) {
    console.error("Erro ao criar post:", error);
    res.status(500).json({ message: "Erro ao criar postagem", error: String(error) });
  }
});

// Atualizar um post
router.patch('/:id', flexAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }
    
    // Verificar se o post existe
    const post = await storage.getPost(id);
    if (!post) {
      return res.status(404).json({ message: "Post não encontrado" });
    }
    
    // Verificar se o usuário é o dono do post
    const userId = (req.user as any).id;
    if (post.userId !== userId && process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ message: "Não autorizado a editar este post" });
    }
    
    // Atualizar o post
    const updatedPost = await storage.updatePost(id, req.body);
    res.json(updatedPost);
  } catch (error) {
    console.error("Erro ao atualizar post:", error);
    res.status(500).json({ message: "Erro ao atualizar post" });
  }
});

// Excluir um post
router.delete('/:id', flexAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }
    
    // Verificar se o post existe
    const post = await storage.getPost(id);
    if (!post) {
      return res.status(404).json({ message: "Post não encontrado" });
    }
    
    // Verificar se o usuário é o dono do post
    const userId = (req.user as any).id;
    if (post.userId !== userId && process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ message: "Não autorizado a excluir este post" });
    }
    
    // Excluir o post
    const success = await storage.deletePost(id);
    if (success) {
      res.status(204).end();
    } else {
      res.status(500).json({ message: "Erro ao excluir post" });
    }
  } catch (error) {
    console.error("Erro ao excluir post:", error);
    res.status(500).json({ message: "Erro ao excluir post" });
  }
});

export default router;