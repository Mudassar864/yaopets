import { db } from "../db";
import { eq, and, desc, isNull, or, sql } from "drizzle-orm";
import { 
  users, type User, type InsertUser,
  pets, type Pet, type InsertPet,
  donations, type Donation, type InsertDonation,
  vetHelp, type VetHelp, type InsertVetHelp,
  messages, type Message, type InsertMessage,
  conversations, type Conversation, type InsertConversation,
  postInteractions, type PostInteraction, type InsertPostInteraction,
  notifications, type Notification, type InsertNotification,
  posts, type Post, type InsertPost,
  userRelationships, type UserRelationship, type InsertUserRelationship,
  media, type Media, type InsertMedia
} from "@shared/schema";
import { IStorage } from "../storage";

export class DatabaseStorage implements IStorage {
  // Usuários
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByProviderId(provider: string, providerId: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.authProvider, provider),
          eq(users.providerId, providerId)
        )
      );
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.verificationToken, token));
    return user;
  }

  async markUserAsVerified(id: number): Promise<User | undefined> {
    return this.updateUser(id, { 
      isVerified: true, 
      verificationToken: null, 
      verificationTokenExpiry: null 
    });
  }

  // Relacionamentos de usuários
  async getFollowers(userId: number): Promise<User[]> {
    const relationships = await db
      .select({
        follower: users
      })
      .from(userRelationships)
      .innerJoin(users, eq(users.id, userRelationships.followerId))
      .where(eq(userRelationships.followingId, userId));
    
    return relationships.map(r => r.follower);
  }

  async getFollowing(userId: number): Promise<User[]> {
    const relationships = await db
      .select({
        following: users
      })
      .from(userRelationships)
      .innerJoin(users, eq(users.id, userRelationships.followingId))
      .where(eq(userRelationships.followerId, userId));
    
    return relationships.map(r => r.following);
  }

  async getFollowerCount(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(userRelationships)
      .where(eq(userRelationships.followingId, userId));
    
    return result[0]?.count || 0;
  }

  async getFollowingCount(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(userRelationships)
      .where(eq(userRelationships.followerId, userId));
    
    return result[0]?.count || 0;
  }

  async getFriendsCount(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(userRelationships)
      .innerJoin(
        userRelationships as any,
        and(
          eq((userRelationships as any).followerId, userRelationships.followingId),
          eq((userRelationships as any).followingId, userRelationships.followerId)
        )
      )
      .where(eq(userRelationships.followerId, userId));
    
    return result[0]?.count || 0;
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    const [relationship] = await db
      .select()
      .from(userRelationships)
      .where(
        and(
          eq(userRelationships.followerId, followerId),
          eq(userRelationships.followingId, followingId)
        )
      );
    
    return !!relationship;
  }

  async followUser(followerId: number, followingId: number): Promise<UserRelationship> {
    const [relationship] = await db
      .insert(userRelationships)
      .values({
        followerId,
        followingId,
        status: "active"
      })
      .returning();
    
    return relationship;
  }

  async unfollowUser(followerId: number, followingId: number): Promise<boolean> {
    const result = await db
      .delete(userRelationships)
      .where(
        and(
          eq(userRelationships.followerId, followerId),
          eq(userRelationships.followingId, followingId)
        )
      );
    
    return true;
  }

  // Pets
  async getPet(id: number): Promise<Pet | undefined> {
    const [pet] = await db.select().from(pets).where(eq(pets.id, id));
    return pet;
  }

  async getPets(filters?: { status?: string; type?: string; ownerId?: number; city?: string; isActive?: boolean }): Promise<Pet[]> {
    let query = db.select().from(pets);
    
    if (filters) {
      if (filters.status) {
        query = query.where(eq(pets.status, filters.status));
      }
      if (filters.type) {
        query = query.where(eq(pets.type, filters.type));
      }
      if (filters.ownerId) {
        query = query.where(eq(pets.ownerId, filters.ownerId));
      }
      if (filters.isActive !== undefined) {
        query = query.where(eq(pets.isActive, filters.isActive));
      }
    }
    
    return query.orderBy(desc(pets.createdAt));
  }

  async createPet(pet: InsertPet): Promise<Pet> {
    const [newPet] = await db.insert(pets).values(pet).returning();
    return newPet;
  }

  async updatePet(id: number, data: Partial<Pet>): Promise<Pet | undefined> {
    const [updated] = await db
      .update(pets)
      .set(data)
      .where(eq(pets.id, id))
      .returning();
    return updated;
  }

  // Doações
  async getDonation(id: number): Promise<Donation | undefined> {
    const [donation] = await db.select().from(donations).where(eq(donations.id, id));
    return donation;
  }

  async getDonations(filters?: { type?: string; donorId?: number; city?: string; isActive?: boolean }): Promise<Donation[]> {
    let query = db.select().from(donations);
    
    if (filters) {
      if (filters.type) {
        query = query.where(eq(donations.type, filters.type));
      }
      if (filters.donorId) {
        query = query.where(eq(donations.donorId, filters.donorId));
      }
      if (filters.isActive !== undefined) {
        query = query.where(eq(donations.isActive, filters.isActive));
      }
    }
    
    return query.orderBy(desc(donations.createdAt));
  }

  async createDonation(donation: InsertDonation): Promise<Donation> {
    const [newDonation] = await db.insert(donations).values(donation).returning();
    return newDonation;
  }

  async updateDonation(id: number, data: Partial<Donation>): Promise<Donation | undefined> {
    const [updated] = await db
      .update(donations)
      .set(data)
      .where(eq(donations.id, id))
      .returning();
    return updated;
  }

  // Ajuda veterinária
  async getVetHelp(id: number): Promise<VetHelp | undefined> {
    const [help] = await db.select().from(vetHelp).where(eq(vetHelp.id, id));
    return help;
  }

  async getVetHelps(filters?: { status?: string; requesterId?: number; vetId?: number; city?: string }): Promise<VetHelp[]> {
    let query = db.select().from(vetHelp);
    
    if (filters) {
      if (filters.status) {
        query = query.where(eq(vetHelp.status, filters.status));
      }
      if (filters.requesterId) {
        query = query.where(eq(vetHelp.requesterId, filters.requesterId));
      }
      if (filters.vetId) {
        query = query.where(eq(vetHelp.vetId, filters.vetId));
      }
    }
    
    return query.orderBy(desc(vetHelp.createdAt));
  }

  async createVetHelp(vetHelpData: InsertVetHelp): Promise<VetHelp> {
    const [newVetHelp] = await db.insert(vetHelp).values(vetHelpData).returning();
    return newVetHelp;
  }

  async updateVetHelp(id: number, data: Partial<VetHelp>): Promise<VetHelp | undefined> {
    const [updated] = await db
      .update(vetHelp)
      .set(data)
      .where(eq(vetHelp.id, id))
      .returning();
    return updated;
  }

  // Posts
  async getPost(id: number): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post;
  }

  async getPosts(filters?: { userId?: number; postType?: string; isStory?: boolean; visibilityType?: string }): Promise<Post[]> {
    let query = db.select().from(posts);
    
    if (filters) {
      if (filters.userId) {
        query = query.where(eq(posts.userId, filters.userId));
      }
      if (filters.postType) {
        query = query.where(eq(posts.postType, filters.postType));
      }
      if (filters.isStory !== undefined) {
        query = query.where(eq(posts.isStory, filters.isStory));
      }
      if (filters.visibilityType) {
        query = query.where(eq(posts.visibilityType, filters.visibilityType));
      }
    }
    
    return query.orderBy(desc(posts.createdAt));
  }

  async createPost(post: InsertPost): Promise<Post> {
    const [newPost] = await db.insert(posts).values(post).returning();
    return newPost;
  }

  async updatePost(id: number, data: Partial<Post>): Promise<Post | undefined> {
    const [updated] = await db
      .update(posts)
      .set(data)
      .where(eq(posts.id, id))
      .returning();
    return updated;
  }

  async deletePost(id: number): Promise<boolean> {
    await db.delete(posts).where(eq(posts.id, id));
    return true;
  }

  // Mensagens
  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message;
  }

  async getMessages(conversationId: number): Promise<Message[]> {
    const conversation = await this.getConversation(conversationId);
    
    if (!conversation) {
      return [];
    }
    
    return db
      .select()
      .from(messages)
      .where(
        or(
          and(
            eq(messages.senderId, conversation.participant1Id),
            eq(messages.receiverId, conversation.participant2Id)
          ),
          and(
            eq(messages.senderId, conversation.participant2Id),
            eq(messages.receiverId, conversation.participant1Id)
          )
        )
      )
      .orderBy(messages.createdAt);
  }

  async getRecentMessages(userId: number): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(
        or(
          eq(messages.senderId, userId),
          eq(messages.receiverId, userId)
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(10);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    
    // Atualizar ou criar conversa
    const conversation = await this.getConversationByParticipants(
      message.senderId,
      message.receiverId
    );
    
    if (conversation) {
      await this.updateConversation(conversation.id, {
        lastMessageId: newMessage.id,
        updatedAt: new Date()
      });
    } else {
      await this.createConversation({
        participant1Id: message.senderId,
        participant2Id: message.receiverId,
        lastMessageId: newMessage.id
      });
    }
    
    return newMessage;
  }

  // Conversas
  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  }

  async getConversationByParticipants(participant1Id: number, participant2Id: number): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(
        or(
          and(
            eq(conversations.participant1Id, participant1Id),
            eq(conversations.participant2Id, participant2Id)
          ),
          and(
            eq(conversations.participant1Id, participant2Id),
            eq(conversations.participant2Id, participant1Id)
          )
        )
      );
    
    return conversation;
  }

  async getConversationsByUser(userId: number): Promise<Conversation[]> {
    return db
      .select()
      .from(conversations)
      .where(
        or(
          eq(conversations.participant1Id, userId),
          eq(conversations.participant2Id, userId)
        )
      )
      .orderBy(desc(conversations.updatedAt));
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db.insert(conversations).values(conversation).returning();
    return newConversation;
  }

  async updateConversation(id: number, data: Partial<Conversation>): Promise<Conversation | undefined> {
    const [updated] = await db
      .update(conversations)
      .set(data)
      .where(eq(conversations.id, id))
      .returning();
    return updated;
  }

  // Interações com posts
  async getPostInteractions(postType: string, postId: number): Promise<PostInteraction[]> {
    return db
      .select()
      .from(postInteractions)
      .where(
        and(
          eq(postInteractions.postType, postType),
          eq(postInteractions.postId, postId)
        )
      );
  }

  async getLikeCount(postType: string, postId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(postInteractions)
      .where(
        and(
          eq(postInteractions.postType, postType),
          eq(postInteractions.postId, postId),
          eq(postInteractions.type, "like")
        )
      );
    
    return result[0]?.count || 0;
  }

  async getComments(postType: string, postId: number): Promise<PostInteraction[]> {
    return db
      .select()
      .from(postInteractions)
      .where(
        and(
          eq(postInteractions.postType, postType),
          eq(postInteractions.postId, postId),
          eq(postInteractions.type, "comment")
        )
      )
      .orderBy(postInteractions.createdAt);
  }

  async createPostInteraction(interaction: InsertPostInteraction): Promise<PostInteraction> {
    const [newInteraction] = await db.insert(postInteractions).values(interaction).returning();
    
    // Atualizar contadores no post original
    if (interaction.postType === "post") {
      const post = await this.getPost(interaction.postId);
      if (post) {
        if (interaction.type === "like") {
          await this.updatePost(post.id, { likesCount: post.likesCount + 1 });
        } else if (interaction.type === "comment") {
          await this.updatePost(post.id, { commentsCount: post.commentsCount + 1 });
        }
      }
    }
    
    return newInteraction;
  }

  async deletePostInteraction(id: number): Promise<boolean> {
    const [interaction] = await db
      .select()
      .from(postInteractions)
      .where(eq(postInteractions.id, id));
    
    if (interaction && interaction.postType === "post") {
      const post = await this.getPost(interaction.postId);
      if (post) {
        if (interaction.type === "like") {
          await this.updatePost(post.id, { likesCount: Math.max(0, post.likesCount - 1) });
        } else if (interaction.type === "comment") {
          await this.updatePost(post.id, { commentsCount: Math.max(0, post.commentsCount - 1) });
        }
      }
    }
    
    await db.delete(postInteractions).where(eq(postInteractions.id, id));
    return true;
  }

  // Notificações
  async getNotifications(userId: number): Promise<Notification[]> {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return updated;
  }

  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
    return true;
  }

  // Media
  async getMedia(id: number): Promise<Media | undefined> {
    const [mediaItem] = await db.select().from(media).where(eq(media.id, id));
    return mediaItem;
  }

  async getMediaByUser(userId: number): Promise<Media[]> {
    return db
      .select()
      .from(media)
      .where(eq(media.userId, userId))
      .orderBy(desc(media.createdAt));
  }

  async getMediaByUrl(url: string): Promise<Media | undefined> {
    const [mediaItem] = await db.select().from(media).where(eq(media.url, url));
    return mediaItem;
  }

  async getAllMedia(): Promise<Media[]> {
    return db.select().from(media).orderBy(desc(media.createdAt));
  }

  async getMediaByFilename(filename: string): Promise<Media | undefined> {
    const [mediaItem] = await db
      .select()
      .from(media)
      .where(eq(media.filePath, filename));
    return mediaItem;
  }

  async createMedia(mediaItem: InsertMedia): Promise<Media> {
    const [newMedia] = await db.insert(media).values(mediaItem).returning();
    return newMedia;
  }

  async updateMedia(id: number, data: Partial<Media>): Promise<Media | undefined> {
    const [updated] = await db
      .update(media)
      .set(data)
      .where(eq(media.id, id))
      .returning();
    return updated;
  }

  async deleteMedia(id: number): Promise<boolean> {
    await db.delete(media).where(eq(media.id, id));
    return true;
  }
}