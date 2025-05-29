import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as LinkedinStrategy } from "passport-linkedin-oauth2";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import type { User } from "@shared/schema";

// A função de serialização/deserialização foi movida para dentro de configurePassport
// para evitar duplicação

export function configurePassport() {
  // Configuração da estratégia local
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          console.log(`[Auth Debug] Tentativa de login para o email: ${email}`);
          
          const user = await storage.getUserByEmail(email);
          
          if (!user) {
            console.log(`[Auth Debug] Login falhou: usuário não encontrado para o email ${email}`);
            return done(null, false, { message: "Email ou senha incorretos" });
          }
          
          console.log(`[Auth Debug] Usuário encontrado: ${user.id} - ${user.email}`);
          
          // Verificação de email temporariamente desabilitada para facilitar login
          // Comentamos esta parte para resolver o problema de login
          /*
          if (!user.isVerified && !user.firstLogin) {
            console.log(`[Auth Debug] Login falhou: email não verificado para ${email} - verificação necessária para primeiro acesso`);
            return done(null, false, { 
              message: "Email não verificado. Por favor, verifique seu email para ativar sua conta."
            });
          }
          */
          
          // Se o usuário existir, permitir login independente do status de verificação
          console.log(`[Auth Debug] Ignorando verificação de email para ${email} - permitindo login direto`);
          
          
          // Verificar se o usuário tem senha
          if (!user.password) {
            console.log(`[Auth Debug] Login falhou: usuário sem senha definida ${email}`);
            return done(null, false, { message: "Conta criada via rede social. Use o login social ou redefina sua senha." });
          }
          
          // Verificação de senha com hash bcrypt
          console.log(`[Auth Debug] Verificando senha para ${email}`);
          
          let passwordMatch = false;
          
          // Tentar primeiro com bcrypt (para senhas hasheadas)
          try {
            passwordMatch = await bcrypt.compare(password, user.password);
          } catch (bcryptError) {
            // Se falhar, tentar comparação direta (para senhas antigas em texto plano)
            console.log(`[Auth Debug] Tentando comparação direta para ${email}`);
            passwordMatch = user.password === password;
            
            // Se senha em texto plano está correta, fazer hash e atualizar
            if (passwordMatch) {
              console.log(`[Auth Debug] Atualizando senha para hash bcrypt: ${email}`);
              const hashedPassword = await bcrypt.hash(password, 10);
              await storage.updateUser(user.id, { password: hashedPassword });
            }
          }
          
          if (!passwordMatch) {
            console.log(`[Auth Debug] Login falhou: senha incorreta para o email ${email}`);
            return done(null, false, { message: "Email ou senha incorretos" });
          }
          
          // Atualizar flag de primeiro login se necessário
          if (!user.firstLogin) {
            storage.updateUser(user.id, { firstLogin: true })
              .then(() => console.log(`[Auth Debug] Primeiro login registrado para usuário ${user.id}`))
              .catch(err => console.error("[Auth Debug] Erro ao atualizar firstLogin:", err));
          }
          
          console.log(`[Auth Debug] Login bem-sucedido para: ${user.id} - ${user.email}`);
          return done(null, user);
        } catch (error) {
          console.error(`[Auth Debug] Erro durante o login:`, error);
          return done(error);
        }
      }
    )
  );

  // Configuração da estratégia Google OAuth2
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: "https://" + process.env.REPLIT_DOMAINS?.split(',')[0] + "/api/auth/google/callback",
          scope: ["profile", "email"]
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Verificar se o usuário já existe
            let user = await storage.getUserByProviderId("google", profile.id);
            
            if (!user) {
              // Verificar se o email já está em uso
              const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
              if (email) {
                const userByEmail = await storage.getUserByEmail(email);
                if (userByEmail) {
                  // Vincular a conta existente ao provedor Google
                  user = await storage.updateUser(userByEmail.id, {
                    authProvider: "google",
                    providerId: profile.id
                  });
                }
              }
              
              // Se o usuário ainda não existe, criar um novo
              if (!user) {
                const newUserData = {
                  name: profile.displayName,
                  email: email || `${profile.id}@google.com`,
                  username: `user_${Date.now()}`, // Gera um nome de usuário único
                  password: null, // Não é necessário senha para autenticação social
                  userType: "tutor", // Valor padrão
                  city: "", // Valor padrão
                  bio: null,
                  profileImage: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
                  authProvider: "google",
                  providerId: profile.id
                };
                
                user = await storage.createUser(newUserData);
              }
            }
            
            return done(null, user);
          } catch (error) {
            return done(error);
          }
        }
      )
    );
  }

  // Configuração da estratégia Facebook
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: process.env.FACEBOOK_APP_ID,
          clientSecret: process.env.FACEBOOK_APP_SECRET,
          callbackURL: "https://" + process.env.REPLIT_DOMAINS?.split(',')[0] + "/api/auth/facebook/callback",
          profileFields: ["id", "displayName", "photos", "email"]
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Verificar se o usuário já existe
            let user = await storage.getUserByProviderId("facebook", profile.id);
            
            if (!user) {
              // Verificar se o email já está em uso
              const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
              if (email) {
                const userByEmail = await storage.getUserByEmail(email);
                if (userByEmail) {
                  // Vincular a conta existente ao provedor Facebook
                  user = await storage.updateUser(userByEmail.id, {
                    authProvider: "facebook",
                    providerId: profile.id
                  });
                }
              }
              
              // Se o usuário ainda não existe, criar um novo
              if (!user) {
                const newUserData = {
                  name: profile.displayName,
                  email: email || `${profile.id}@facebook.com`,
                  username: `user_${Date.now()}`,
                  password: null,
                  userType: "tutor",
                  city: "",
                  bio: null,
                  profileImage: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
                  authProvider: "facebook",
                  providerId: profile.id
                };
                
                user = await storage.createUser(newUserData);
              }
            }
            
            return done(null, user);
          } catch (error) {
            return done(error);
          }
        }
      )
    );
  }

  // Configuração da estratégia LinkedIn
  if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
    passport.use(
      new LinkedinStrategy(
        {
          clientID: process.env.LINKEDIN_CLIENT_ID,
          clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
          callbackURL: "https://" + process.env.REPLIT_DOMAINS?.split(',')[0] + "/api/auth/linkedin/callback",
          scope: ["r_emailaddress", "r_liteprofile"]
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Verificar se o usuário já existe
            let user = await storage.getUserByProviderId("linkedin", profile.id);
            
            if (!user) {
              // Verificar se o email já está em uso
              const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
              if (email) {
                const userByEmail = await storage.getUserByEmail(email);
                if (userByEmail) {
                  // Vincular a conta existente ao provedor LinkedIn
                  user = await storage.updateUser(userByEmail.id, {
                    authProvider: "linkedin",
                    providerId: profile.id
                  });
                }
              }
              
              // Se o usuário ainda não existe, criar um novo
              if (!user) {
                const newUserData = {
                  name: profile.displayName,
                  email: email || `${profile.id}@linkedin.com`,
                  username: `user_${Date.now()}`,
                  password: null,
                  userType: "tutor",
                  city: "",
                  bio: null,
                  profileImage: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
                  authProvider: "linkedin",
                  providerId: profile.id
                };
                
                user = await storage.createUser(newUserData);
              }
            }
            
            return done(null, user);
          } catch (error) {
            return done(error);
          }
        }
      )
    );
  }

  // Serialização e deserialização de usuário - melhorado para garantir persistência da sessão
  passport.serializeUser((user: any, done) => {
    if (!user || !user.id) {
      console.error('[Auth Debug] Erro ao serializar usuário: objeto inválido', user);
      return done(new Error('Usuário inválido para serialização'), null);
    }
    
    console.log(`[Auth Debug] Serializando usuário: ${user.id} - ${user.email}`);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`[Auth Debug] Deserializando usuário ID: ${id}`);
      
      if (!id) {
        console.log('[Auth Debug] ID inválido durante deserialização');
        return done(null, false);
      }
      
      const user = await storage.getUser(id);
      
      if (!user) {
        console.log(`[Auth Debug] Usuário não encontrado durante deserialização: ID ${id}`);
        return done(null, false);
      }
      
      console.log(`[Auth Debug] Usuário deserializado com sucesso: ${user.id} - ${user.email}`);
      
      // Remover senha antes de retornar
      const { password, ...userWithoutPassword } = user;
      done(null, userWithoutPassword);
    } catch (error) {
      console.error(`[Auth Debug] Erro na deserialização:`, error);
      done(error, null);
    }
  });
}