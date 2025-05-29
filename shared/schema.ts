import { pgTable, text, serial, integer, boolean, timestamp, json, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  email: text("email").notNull().unique(),
  password: text("password"),
  name: text("name").notNull(),
  city: text("city").notNull(),
  userType: text("user_type").notNull(), // tutor, doador, voluntário, veterinário
  bio: text("bio"),
  website: text("website"), // Campo para links externos (Instagram, portfólio, etc)
  profileImage: text("profile_image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  authProvider: text("auth_provider"), // google, facebook, linkedin, email
  providerId: text("provider_id"),
  isVerified: boolean("is_verified").default(false).notNull(), // Indica se o email foi verificado
  verificationToken: text("verification_token"), // Token para verificação de email
  verificationTokenExpiry: timestamp("verification_token_expiry"), // Data de expiração do token
  firstLogin: boolean("first_login").default(false).notNull(), // Indica se é o primeiro login do usuário
  points: integer("points").notNull().default(0),
  level: text("level").notNull().default("Iniciante"),
  achievementBadges: text("achievement_badges").array(),
});

// Pet model - Versão aprimorada
export const pets = pgTable("pets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // Nome do pet
  petType: text("pet_type").notNull(), // dog, cat, other
  breed: text("breed"), // Raça
  color: text("color"), // Cor
  age: text("age"), // Idade: puppy, young, adult, senior
  size: text("size").notNull(), // small, medium, large
  gender: text("gender"), // male, female, unknown
  behavior: text("behavior"), // Comportamento 
  petStatus: text("pet_status").notNull(), // lost, found, adoption
  location: json("location").notNull(), // { lat, lng, address }
  photos: json("photos"), // array de urls de fotos
  description: text("description"), // Descrição detalhada
  specialNeeds: text("special_needs"), // Necessidades especiais
  contactPhone: text("contact_phone"), // Telefone para contato
  tags: text("tags").array(), // Tags para facilitar busca
  ownerId: integer("owner_id").references(() => users.id).notNull(), // Usuário que cadastrou
  foundById: integer("found_by_id").references(() => users.id), // Quem encontrou (para pets perdidos)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

// Donation model
export const donations = pgTable("donations", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // pet, food, toy, accessory, medicine
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: json("location").notNull(), // { lat, lng, address }
  photos: json("photos").notNull(), // array of photo URLs
  donorId: integer("donor_id").references(() => users.id).notNull(),
  receiverId: integer("receiver_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

// Veterinary help model
export const vetHelp = pgTable("vet_help", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: json("location").notNull(), // { lat, lng, address }
  photos: json("photos").notNull(), // array of photo URLs
  targetAmount: integer("target_amount").notNull(),
  currentAmount: integer("current_amount").default(0).notNull(),
  petId: integer("pet_id").references(() => pets.id),
  requesterId: integer("requester_id").references(() => users.id).notNull(),
  vetId: integer("vet_id").references(() => users.id),
  status: text("status").notNull(), // pending, in_progress, completed, canceled
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Messages model
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  receiverId: integer("receiver_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  attachmentUrl: text("attachment_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Conversations model (to track conversations between users)
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  participant1Id: integer("participant1_id").references(() => users.id).notNull(),
  participant2Id: integer("participant2_id").references(() => users.id).notNull(),
  lastMessageId: integer("last_message_id").references(() => messages.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Posts interactions (likes, comments, saves)
export const postInteractions = pgTable("post_interactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  postType: text("post_type").notNull(), // pet, donation, vet_help, post
  postId: integer("post_id").notNull(),
  type: text("type").notNull(), // like, comment, save
  content: text("content"), // For comments
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Posts model
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  mediaUrls: json("media_urls"), // array of media URLs (photos, videos)
  location: json("location"), // { lat, lng, address }
  visibilityType: text("visibility_type").default("public").notNull(), // public, followers, private
  postType: text("post_type").default("regular").notNull(), // regular, event
  likesCount: integer("likes_count").default(0).notNull(),
  commentsCount: integer("comments_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // new_message, post_update, new_post_nearby, etc.
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  relatedId: integer("related_id"), // Can be a post ID, message ID, etc.
  relatedType: text("related_type"), // pet, donation, vet_help, message
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User relationships (followers/following)
export const userRelationships = pgTable("user_relationships", {
  id: serial("id").primaryKey(),
  followerId: integer("follower_id").references(() => users.id).notNull(),
  followingId: integer("following_id").references(() => users.id).notNull(),
  status: text("status").default("active").notNull(), // active, pending, blocked
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  points: true,
  level: true,
  achievementBadges: true,
});

// Pet schemas - com validação aprimorada
export const insertPetSchema = createInsertSchema(pets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  petStatus: z.enum(['lost', 'found', 'adoption']),
  petType: z.enum(['dog', 'cat', 'other']),
  size: z.enum(['small', 'medium', 'large']),
  gender: z.enum(['male', 'female', 'unknown']).optional(),
  age: z.enum(['puppy', 'young', 'adult', 'senior']).optional(),
});

// Donation schemas
export const insertDonationSchema = createInsertSchema(donations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Vet help schemas
export const insertVetHelpSchema = createInsertSchema(vetHelp).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Message schemas
export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

// Conversation schemas
export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  updatedAt: true,
});

// Post interaction schemas
export const insertPostInteractionSchema = createInsertSchema(postInteractions).omit({
  id: true,
  createdAt: true,
});

// Post schemas
export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  likesCount: true,
  commentsCount: true,
});

// Notification schemas
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

// User relationship schemas
export const insertUserRelationshipSchema = createInsertSchema(userRelationships).omit({
  id: true,
  createdAt: true,
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Pet = typeof pets.$inferSelect;
export type InsertPet = z.infer<typeof insertPetSchema>;

export type Donation = typeof donations.$inferSelect;
export type InsertDonation = z.infer<typeof insertDonationSchema>;

export type VetHelp = typeof vetHelp.$inferSelect;
export type InsertVetHelp = z.infer<typeof insertVetHelpSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type PostInteraction = typeof postInteractions.$inferSelect;
export type InsertPostInteraction = z.infer<typeof insertPostInteractionSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type UserRelationship = typeof userRelationships.$inferSelect;
export type InsertUserRelationship = z.infer<typeof insertUserRelationshipSchema>;

export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;

export type Location = {
  lat: number;
  lng: number;
  address: string;
};

// Tabela para armazenar arquivos de mídia (imagens e vídeos)
export const media = pgTable("media", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title"),
  description: text("description"),
  mediaType: text("media_type").notNull(), // image, video, audio
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  width: integer("width"),
  height: integer("height"),
  duration: integer("duration"), // Para vídeos ou áudios (em segundos)
  filePath: text("file_path"),
  url: text("url").notNull(),
  isPublic: boolean("is_public").default(true),
  data: text("data"), // Dados do arquivo em base64 para armazenamento no banco
  isOptimized: boolean("is_optimized").default(false),
  originalSize: integer("original_size"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Schema Zod para validação
export const insertMediaSchema = createInsertSchema(media).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Tipos de mídia
export type Media = typeof media.$inferSelect;
export type InsertMedia = z.infer<typeof insertMediaSchema>;
