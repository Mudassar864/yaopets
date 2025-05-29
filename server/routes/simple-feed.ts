import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "../db";
import { posts, postInteractions, users } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import sharp from 'sharp';

const router = Router();

// Configurar pastas para uploads
const uploadDir = "./uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const uniqueSuffix = `${timestamp}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error("Somente imagens são permitidas") as any);
    }
  }
});

// Lógica simples para gerenciar posts em memória (para desenvolvimento e teste)
interface Post {
  id: number;
  content: string;
  username: string;
  userId: number;
  userPhotoUrl: string;
  createdAt: string;
  mediaUrl?: string;
  likesCount: number;
  commentsCount: number;
}

interface Comment {
  id: number;
  postId: number;
  userId: number;
  username: string;
  userPhotoUrl: string;
  content: string;
  createdAt: string;
}

// Dados em memória para desenvolvimento rápido
let simplePosts: Post[] = [];
let simpleComments: Comment[] = [];
let nextPostId = 1;
let nextCommentId = 1;

// 1. Criar Publicação
router.post("/post", upload.single("media"), async (req: Request, res: Response) => {
  try {
    // Obter ID do usuário (ou usar ID de teste)
    let userId = 18; // Padrão para testes
    let username = "Usuário";
    let userPhotoUrl = "/placeholder-image.svg";
    
    if (req.user) {
      userId = (req.user as any).id;
      username = (req.user as any).username || "Usuário";
      userPhotoUrl = (req.user as any).profileImage || "/placeholder-image.svg";
    }
    
    let mediaUrl = undefined;
    
    // Processar imagem se enviada
    if (req.file) {
      try {
        // Gerar nome de arquivo otimizado
        const filename = path.basename(req.file.path);
        
        // Otimizar a imagem com sharp
        await sharp(req.file.path)
          .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toFile(path.join(uploadDir, `opt-${filename}`));
          
        // URL da imagem (caminho relativo)
        mediaUrl = `/uploads/opt-${filename}`;
        
        console.log("Imagem salva em:", mediaUrl);
      } catch (error) {
        console.error("Erro ao processar imagem:", error);
      }
    }
    
    // Criar novo post
    const newPost: Post = {
      id: nextPostId++,
      content: req.body.content || "",
      username,
      userId,
      userPhotoUrl,
      createdAt: new Date().toISOString(),
      mediaUrl,
      likesCount: 0,
      commentsCount: 0
    };
    
    // Adicionar à lista
    simplePosts.unshift(newPost);
    
    console.log("Post criado:", newPost);
    
    res.status(201).json({
      success: true,
      post: newPost
    });
  } catch (error) {
    console.error("Erro ao criar post:", error);
    res.status(500).json({ 
      success: false,
      error: "Erro ao criar post" 
    });
  }
});

// 2. Obter todas as publicações
router.get("/posts", (req: Request, res: Response) => {
  res.json({ 
    success: true,
    data: simplePosts 
  });
});

// 3. Adicionar comentário
router.post("/comment/:postId", (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.postId);
    const { content } = req.body;
    
    // Validar dados
    if (!content || content.trim() === "") {
      return res.status(400).json({ 
        success: false,
        error: "Conteúdo do comentário é obrigatório" 
      });
    }
    
    // Encontrar o post
    const post = simplePosts.find(p => p.id === postId);
    if (!post) {
      return res.status(404).json({ 
        success: false,
        error: "Post não encontrado" 
      });
    }
    
    // Obter dados do usuário
    let userId = 18; // Padrão para testes
    let username = "Usuário";
    let userPhotoUrl = "/placeholder-image.svg";
    
    if (req.user) {
      userId = (req.user as any).id;
      username = (req.user as any).username || "Usuário";
      userPhotoUrl = (req.user as any).profileImage || "/placeholder-image.svg";
    }
    
    // Criar comentário
    const newComment: Comment = {
      id: nextCommentId++,
      postId,
      userId,
      username,
      userPhotoUrl,
      content,
      createdAt: new Date().toISOString()
    };
    
    // Adicionar à lista
    simpleComments.push(newComment);
    
    // Atualizar contador de comentários
    post.commentsCount++;
    
    console.log("Comentário adicionado:", newComment);
    
    res.status(201).json({
      success: true,
      comment: newComment
    });
  } catch (error) {
    console.error("Erro ao adicionar comentário:", error);
    res.status(500).json({ 
      success: false,
      error: "Erro ao adicionar comentário" 
    });
  }
});

// 4. Obter comentários de um post
router.get("/comments/:postId", (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.postId);
    
    // Filtrar comentários pelo ID do post
    const comments = simpleComments.filter(c => c.postId === postId);
    
    res.json({
      success: true,
      data: comments
    });
  } catch (error) {
    console.error("Erro ao buscar comentários:", error);
    res.status(500).json({ 
      success: false,
      error: "Erro ao buscar comentários" 
    });
  }
});

// 5. Curtir um post
router.post("/like/:postId", (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.postId);
    
    // Encontrar o post
    const post = simplePosts.find(p => p.id === postId);
    if (!post) {
      return res.status(404).json({ 
        success: false,
        error: "Post não encontrado" 
      });
    }
    
    // Incrementar contador de curtidas (em um sistema real, verificaríamos se o usuário já curtiu)
    post.likesCount++;
    
    res.json({
      success: true,
      likesCount: post.likesCount
    });
  } catch (error) {
    console.error("Erro ao curtir post:", error);
    res.status(500).json({ 
      success: false,
      error: "Erro ao curtir post" 
    });
  }
});

// Rota para teste
router.get("/test", (req: Request, res: Response) => {
  res.json({ message: "API de feed simples funcionando!" });
});

export default router;