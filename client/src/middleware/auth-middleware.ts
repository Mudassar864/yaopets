import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Middleware para garantir redirecionamento após autenticação
 * Serve como camada extra para assegurar que o usuário seja direcionado corretamente
 */
export function useAuthMiddleware() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  
  useEffect(() => {
    // Se ainda estiver carregando, não faça nada
    if (isLoading) {
      console.log("[Middleware] Estado de autenticação ainda carregando - aguardando...");
      return;
    }

    console.log("[Middleware] Estado atual:", { isAuthenticated, location, isLoading });
    
    // Evitar redirecionamentos em páginas de login/registro para evitar flashes
    if (location === "/auth/login" || location === "/auth/register") {
      return;
    }
    
    // Verificar se estamos no meio de um processo de login
    const loginProcessActive = localStorage.getItem("yaopets_login_in_progress");
    
    if (loginProcessActive === "true") {
      console.log("[Middleware] Processo de login em andamento - ignorando verificações de middleware");
      // Limpar este flag após um tempo
      setTimeout(() => {
        localStorage.removeItem("yaopets_login_in_progress");
      }, 10000);
      return;
    }
    
    // Verificar se o usuário está autenticado e não está em uma página de autenticação
    if (isAuthenticated && user) {
      // Verificamos apenas login e register, NÃO incluir a rota raiz "/"
      const authPages = ["/auth/login", "/auth/register"];
      
      if (authPages.includes(location)) {
        console.log("[Middleware] Usuário autenticado tentando acessar página de auth, redirecionando");
        setLocation("/home"); // Usar setLocation em vez de window.location para evitar refresh
        return;
      }
    }
    
    // Garantir que páginas protegidas não sejam acessadas por usuários não autenticados
    // Essa é uma camada extra além do componente ProtectedRoute
    // Páginas de perfil são públicas, então não devem estar na lista de protegidas
    if (!isAuthenticated && !user) {
      const protectedPages = [
        "/pets", 
        "/donations", 
        "/vet-help",
        "/chats"
      ];
      
      if (protectedPages.some(page => location.startsWith(page))) {
        console.log("[Middleware] Acesso não autorizado a página protegida, redirecionando");
        // Salvar a página que o usuário tentou acessar para redirecionar após login
        localStorage.setItem("yaopets_redirect_after_login", location);
        setLocation("/auth/login");
        return;
      }
    }
  }, [isAuthenticated, isLoading, user, location, setLocation]);
  
  // Função para obter a URL de redirecionamento após login
  const getRedirectUrl = (): string => {
    const savedRedirect = localStorage.getItem("yaopets_redirect_after_login");
    
    if (savedRedirect) {
      localStorage.removeItem("yaopets_redirect_after_login");
      return savedRedirect;
    }
    
    return "/home";
  };
  
  return { getRedirectUrl };
}