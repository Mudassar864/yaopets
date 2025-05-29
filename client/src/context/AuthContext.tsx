import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@shared/schema";

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  // Estado para controle manual de autenticação
  const [manualAuthState, setManualAuthState] = useState<{
    isAuthenticated: boolean;
    hasCheckedAuth: boolean;
    lastCheck: Date | null;
  }>({
    isAuthenticated: false,
    hasCheckedAuth: false,
    lastCheck: null
  });
  
  // Função para verificar estado de autenticação manualmente (independente da query)
  const checkAuthState = async () => {
    try {
      console.log("[AuthContext] Verificando autenticação manualmente...");
      
      const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        console.log("[AuthContext] Verificação manual: Autenticado", userData);
        
        setManualAuthState({
          isAuthenticated: true,
          hasCheckedAuth: true,
          lastCheck: new Date()
        });
        
        // Forçar atualização do cache do React Query
        queryClient.setQueryData(["/api/auth/me"], userData);
        
        return userData;
      } else {
        console.log("[AuthContext] Verificação manual: Não autenticado");
        
        setManualAuthState({
          isAuthenticated: false,
          hasCheckedAuth: true,
          lastCheck: new Date()
        });
        
        return null;
      }
    } catch (error) {
      console.error("[AuthContext] Erro na verificação manual:", error);
      
      setManualAuthState(prev => ({
        ...prev,
        hasCheckedAuth: true
      }));
      
      return null;
    }
  };
  
  // Verificar manualmente na montagem do componente e a cada 2 minutos (reduzindo frequência)
  useEffect(() => {
    checkAuthState();
    
    const interval = setInterval(checkAuthState, 120000); // 2 minutos
    return () => clearInterval(interval);
  }, []);

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        console.log("[AuthContext] Verificação via React Query...");
        
        // Usar fetch diretamente em vez de apiRequest para ter mais controle
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "X-Requested-With": "XMLHttpRequest",
            "Accept": "application/json"
          }
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            console.log("[AuthContext] Query: Não autenticado (401)");
            return null;
          }
          throw new Error("Falha ao obter dados do usuário");
        }
        
        // Autenticação bem-sucedida
        const userData = await response.json();
        console.log("[AuthContext] Query: Autenticado", userData);
        
        // Verificar se encontramos uma sessão ativa recente no localStorage
        const authSuccess = localStorage.getItem("yaopets_auth_success");
        if (authSuccess === "true") {
          console.log("[AuthContext] Sessão ativa encontrada no localStorage");
        }
        
        // Atualizar estado manual também
        setManualAuthState({
          isAuthenticated: true,
          hasCheckedAuth: true,
          lastCheck: new Date()
        });
        
        return userData;
      } catch (error) {
        console.error("[AuthContext] Erro na query:", error);
        return null;
      }
    },
    retry: 1, // Reduzir tentativas para evitar sobrecarga
    retryDelay: 2000, // Aumentar delay entre tentativas
    refetchOnWindowFocus: false, // Desabilitar refetch ao focar na janela
    refetchInterval: 60000, // Reduzir frequência de verificação para 1 minuto
    refetchOnMount: true,
    staleTime: 30000, // Aumentar tempo de validade dos dados
  });

  const logout = async () => {
    try {
      console.log("[AuthContext] Iniciando processo de logout");
      
      // Limpar flags de redirecionamento para evitar conflitos
      sessionStorage.removeItem("isRedirectingAfterLogin");
      sessionStorage.removeItem("loginTimestamp");
      
      // Enviar requisição de logout para o servidor
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      
      console.log("[AuthContext] Logout processado pelo servidor");
      
      // Invalidar cache de autenticação
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      
      // Redirecionamento com refresh completo
      window.location.href = "/auth/login";
    } catch (error) {
      console.error("[AuthContext] Erro durante logout:", error);
      
      // Em caso de erro, tentar redirecionamento mesmo assim
      window.location.href = "/auth/login";
    }
  };

  // Efeito para configurar o ID do usuário no gerenciador de localStorage quando autenticado
  useEffect(() => {
    if (user && user.id) {
      // Importar e configurar o gerenciador de localStorage
      import('@/lib/localStorageManager').then(({ localInteractions }) => {
        localInteractions.setUserId(user.id);
        console.log(`[AuthContext] ID do usuário ${user.id} configurado no gerenciador de localStorage`);
      });
    }
  }, [user]);
  
  // Usar estado combinado entre verificação manual e React Query
  const isEffectivelyAuthenticated = !!user || manualAuthState.isAuthenticated;
  
  const authValue = {
    user: user || null,
    isAuthenticated: isEffectivelyAuthenticated,
    isLoading: isLoading && !manualAuthState.hasCheckedAuth,
    logout,
  };

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}