import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "../db";
import { posts, postInteractions, insertPostSchema, media, users } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
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

// Criar um novo post
router.post("/", upload.single("media"), async (req: Request, res: Response) => {
  try {
    // Obter ID do usuário (ou usar ID de teste)
    let userId = 18; // Usar ID padrão para testes
    if (req.user && (req.user as any).id) {
      userId = (req.user as any).id;
    }
    
    // Log para depuração
    console.log("Recebido request para criar post:", {
      usuarioAutenticado: !!req,
      userId,
      body: req.body,
      file: req.file ? `${req.file.originalname} (${req.file.size}bytes)` : 'nenhum'
    });
    
    // Dados do post
    const postData = {
      content: req.body.content || "Nova publicação",
      userId,
      mediaUrls: [] as string[],
      likesCount: 0,
      commentsCount: 0,
      visibilityType: "public",
      postType: "regular",
      isStory: false
    };
    
    // Processar imagem se houver
    if (req.file) {
      try {
        // Otimizar a imagem com sharp
        const fileBuffer = fs.readFileSync(req.file.path);
        
        // Gerar nomes dos arquivos
        const optimizedFilename = `otimizada-${path.basename(req.file.path)}`;
        const optimizedPath = path.join(uploadDir, optimizedFilename);
        
        // Redimensionar e comprimir
        await sharp(fileBuffer)
          .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 75 })
          .toFile(optimizedPath);
          
        // URL que será usada para acesso à imagem
        const mediaUrl = `/uploads/${optimizedFilename}`;
        
        // Adicionar URL ao post
        postData.mediaUrls = [mediaUrl];
        
        console.log(`Imagem otimizada salva em: ${optimizedPath}`);
        console.log(`URL da imagem: ${mediaUrl}`);
      } catch (error) {
        console.error("Erro ao processar imagem:", error);
      }
    }
    
    // Salvar post no banco
    const [newPost] = await db.insert(posts).values(postData).returning();
    
    res.status(201).json({
      ...newPost,
      success: true,
      message: "Post criado com sucesso"
    });
  } catch (error) {
    console.error("Erro ao criar post:", error);
    res.status(500).json({ 
      error: "Erro ao criar post",
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Curtir um post
router.post("/:postId/like", async (req: Request, res: Response) => {
  try {
    const userId = req.user ? (req.user as any).id : 18; // ID de teste
    const postId = parseInt(req.params.postId);
    const { liked: wantsToLike } = req.body;

    console.log(`[LIKE DEBUG] Usuário ${userId} está ${wantsToLike ? 'curtindo' : 'descurtindo'} o post ${postId}`);

    // Verificar se o post existe
    const [post] = await db.select().from(posts).where(eq(posts.id, postId));
    if (!post) {
      return res.status(404).json({ error: "Post não encontrado" });
    }

    // Verificar se o usuário já curtiu
    const [existingLike] = await db.select()
      .from(postInteractions)
      .where(
        and(
          eq(postInteractions.userId, userId),
          eq(postInteractions.postId, postId),
          eq(postInteractions.type, 'like')
        )
      );

    // Se já tem like e quer remover OU se não tem like e quer adicionar
    if ((existingLike && wantsToLike === false) || (!existingLike && wantsToLike === true)) {
      if (existingLike) {
        // Remover curtida
        console.log(`[LIKE DEBUG] Removendo curtida ID ${existingLike.id}`);
        await db.delete(postInteractions)
          .where(eq(postInteractions.id, existingLike.id));
          
        // Atualizar contador
        const newCount = Math.max(0, post.likesCount - 1);
        console.log(`[LIKE DEBUG] Decrementando contador de ${post.likesCount} para ${newCount}`);
        await db.update(posts)
          .set({ likesCount: newCount })
          .where(eq(posts.id, postId));
          
        return res.json({ liked: false, likesCount: newCount });
      } else {
        // Adicionar curtida
        console.log(`[LIKE DEBUG] Adicionando nova curtida`);
        const [newLike] = await db.insert(postInteractions).values({
          userId,
          postId,
          postType: 'post',
          type: 'like',
        }).returning();
        
        console.log(`[LIKE DEBUG] Nova curtida salva com ID ${newLike.id}`);
        
        // Atualizar contador
        const newCount = (post.likesCount || 0) + 1;
        console.log(`[LIKE DEBUG] Incrementando contador de ${post.likesCount} para ${newCount}`);
        await db.update(posts)
          .set({ likesCount: newCount })
          .where(eq(posts.id, postId));
          
        return res.json({ liked: true, likesCount: newCount });
      }
    } else {
      // Nenhuma mudança necessária
      console.log(`[LIKE DEBUG] Nenhuma mudança necessária, estado já é ${!!existingLike}`);
      return res.json({ 
        liked: !!existingLike, 
        likesCount: post.likesCount 
      });
    }
  } catch (error) {
    console.error("Erro ao curtir post:", error);
    res.status(500).json({ error: "Erro ao curtir post" });
  }
});

// Adicionar comentário
router.post("/:postId/comment", async (req: Request, res: Response) => {
  try {
    const userId = req.user ? (req.user as any).id : 18; // ID de teste
    const postId = parseInt(req.params.postId);
    const { content } = req.body;
    
    if (!content || content.trim() === '') {
      return res.status(400).json({ error: "Comentário não pode ser vazio" });
    }

    // Verificar se o post existe
    const [post] = await db.select().from(posts).where(eq(posts.id, postId));
    if (!post) {
      return res.status(404).json({ error: "Post não encontrado" });
    }
    
    // Salvar o comentário
    const [comment] = await db.insert(postInteractions).values({
      userId,
      postId,
      postType: 'post',
      type: 'comment',
      content
    }).returning();
    
    // Atualizar contador de comentários
    await db.update(posts)
      .set({ commentsCount: post.commentsCount + 1 })
      .where(eq(posts.id, postId));
    
    // Buscar informações do usuário para enriquecer o resultado
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    res.status(201).json({
      ...comment,
      username: user?.username || "Usuário",
      userPhotoUrl: user?.profileImage || "/placeholder-image.svg",
    });
  } catch (error) {
    console.error("Erro ao adicionar comentário:", error);
    res.status(500).json({ error: "Erro ao adicionar comentário" });
  }
});

// Obter comentários
router.get("/:postId/comments", async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.postId);
    
    // Buscar comentários
    const comments = await db.select()
      .from(postInteractions)
      .where(
        and(
          eq(postInteractions.postId, postId),
          eq(postInteractions.type, 'comment')
        )
      )
      .orderBy(desc(postInteractions.createdAt));
    
    // Enriquecer com dados do usuário
    const enrichedComments = await Promise.all(
      comments.map(async (comment) => {
        const [user] = await db.select().from(users).where(eq(users.id, comment.userId));
        return {
          ...comment,
          username: user?.username || "Usuário",
          userPhotoUrl: user?.profileImage || "/placeholder-image.svg"
        };
      })
    );
    
    res.json({ data: enrichedComments });
  } catch (error) {
    console.error("Erro ao buscar comentários:", error);
    res.status(500).json({ error: "Erro ao buscar comentários" });
  }
});

// Verificar status de curtida de um post
router.get("/:postId/like-status", async (req: Request, res: Response) => {
  try {
    const userId = req.user ? (req.user as any).id : 18; // ID de teste
    const postId = parseInt(req.params.postId);

    // Verificar se o post existe
    const [post] = await db.select().from(posts).where(eq(posts.id, postId));
    if (!post) {
      return res.status(404).json({ error: "Post não encontrado" });
    }

    // Verificar se o usuário já curtiu
    const [existingLike] = await db.select()
      .from(postInteractions)
      .where(
        and(
          eq(postInteractions.userId, userId),
          eq(postInteractions.postId, postId),
          eq(postInteractions.type, 'like')
        )
      );

    res.json({ 
      isLiked: !!existingLike, 
      likesCount: post.likesCount 
    });
  } catch (error) {
    console.error("Erro ao verificar status de curtida:", error);
    res.status(500).json({ error: "Erro ao verificar status de curtida" });
  }
});

// Obter todos os posts
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user ? (req.user as any).id : null;
    
    // Buscar posts mais recentes primeiro
    const allPosts = await db
      .select()
      .from(posts)
      .orderBy(desc(posts.createdAt))
      .limit(20);
    
    // Adicionar informações do usuário e status de curtida
    const postsWithUserInfo = await Promise.all(
      allPosts.map(async (post) => {
        const [user] = await db.select().from(users).where(eq(users.id, post.userId));
        
        // Verificar se o usuário atual curtiu este post
        let isLiked = false;
        if (userId) {
          const [existingLike] = await db.select()
            .from(postInteractions)
            .where(
              and(
                eq(postInteractions.userId, userId),
                eq(postInteractions.postId, post.id),
                eq(postInteractions.type, 'like')
              )
            );
          isLiked = !!existingLike;
        }
        
        return {
          ...post,
          username: user?.username || "Usuário",
          userPhotoUrl: user?.profileImage || "/placeholder-image.svg",
          isLiked
        };
      })
    );
    
    res.json({ data: postsWithUserInfo });
  } catch (error) {
    console.error("Erro ao buscar posts:", error);
    res.status(500).json({ error: "Erro ao buscar posts" });
  }
});

// Salvar um post em favoritos
router.post("/:postId/save", async (req: Request, res: Response) => {
  try {
    const userId = req.user ? (req.user as any).id : 18; // ID de teste
    const postId = parseInt(req.params.postId);
    const { saved: wantsToSave } = req.body;

    console.log(`[SAVE DEBUG] Usuário ${userId} está ${wantsToSave ? 'salvando' : 'removendo'} o post ${postId}`);

    // Verificar se o post existe
    const [post] = await db.select().from(posts).where(eq(posts.id, postId));
    if (!post) {
      return res.status(404).json({ error: "Post não encontrado" });
    }

    // Verificar se o post já está salvo
    const [existingSave] = await db.select()
      .from(postInteractions)
      .where(
        and(
          eq(postInteractions.userId, userId),
          eq(postInteractions.postId, postId),
          eq(postInteractions.type, 'save')
        )
      );

    // Se já tem salvo e quer remover OU se não tem salvo e quer adicionar
    if ((existingSave && wantsToSave === false) || (!existingSave && wantsToSave === true)) {
      if (existingSave) {
        // Remover dos salvos
        console.log(`[SAVE DEBUG] Removendo salvamento ID ${existingSave.id}`);
        await db.delete(postInteractions)
          .where(eq(postInteractions.id, existingSave.id));
          
        return res.json({ saved: false });
      } else {
        // Adicionar aos salvos
        console.log(`[SAVE DEBUG] Adicionando novo salvamento`);
        const [newSave] = await db.insert(postInteractions).values({
          userId,
          postId,
          postType: 'post',
          type: 'save',
        }).returning();
        
        console.log(`[SAVE DEBUG] Novo salvamento com ID ${newSave.id}`);
        return res.json({ saved: true });
      }
    } else {
      // Nenhuma mudança necessária
      console.log(`[SAVE DEBUG] Nenhuma mudança necessária, estado já é ${!!existingSave}`);
      return res.json({ saved: !!existingSave });
    }
  } catch (error) {
    console.error("Erro ao salvar post:", error);
    res.status(500).json({ error: "Erro ao salvar post" });
  }
});

// Verificar status de curtida de um post
router.get("/:postId/like-status", async (req: Request, res: Response) => {
  try {
    const userId = req.user ? (req.user as any).id : 18; // ID de teste
    const postId = parseInt(req.params.postId);

    console.log(`[LIKE DEBUG] Verificando status de curtida para usuário ${userId} no post ${postId}`);

    // Verificar se o post existe
    const [post] = await db.select().from(posts).where(eq(posts.id, postId));
    if (!post) {
      return res.status(404).json({ error: "Post não encontrado" });
    }

    // Verificar se o post já está curtido
    const [existingLike] = await db.select()
      .from(postInteractions)
      .where(
        and(
          eq(postInteractions.userId, userId),
          eq(postInteractions.postId, postId),
          eq(postInteractions.type, 'like')
        )
      );

    console.log(`[LIKE DEBUG] Status de curtida: ${!!existingLike}, contagem: ${post.likesCount}`);
    
    res.json({ 
      isLiked: !!existingLike,
      likesCount: post.likesCount || 0
    });
  } catch (error) {
    console.error("Erro ao verificar status de curtida:", error);
    res.status(500).json({ error: "Erro ao verificar status de curtida" });
  }
});

// Verificar se um post está salvo
router.get("/:postId/save-status", async (req: Request, res: Response) => {
  try {
    const userId = req.user ? (req.user as any).id : 18; // ID de teste
    const postId = parseInt(req.params.postId);

    console.log(`[SAVE DEBUG] Verificando status de salvamento para usuário ${userId} no post ${postId}`);

    // Verificar se o post existe
    const [post] = await db.select().from(posts).where(eq(posts.id, postId));
    if (!post) {
      return res.status(404).json({ error: "Post não encontrado" });
    }

    // Verificar se o post está salvo
    const [existingSave] = await db.select()
      .from(postInteractions)
      .where(
        and(
          eq(postInteractions.userId, userId),
          eq(postInteractions.postId, postId),
          eq(postInteractions.type, 'save')
        )
      );

    console.log(`[SAVE DEBUG] Status de salvamento: ${!!existingSave}`);
    
    res.json({ isSaved: !!existingSave });
  } catch (error) {
    console.error("Erro ao verificar status de salvamento:", error);
    res.status(500).json({ error: "Erro ao verificar status de salvamento" });
  }
});

export default router;