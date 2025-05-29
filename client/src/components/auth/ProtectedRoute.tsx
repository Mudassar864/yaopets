import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // Protege rotas após verificação completa do estado de autenticação
    // Se estiver carregando, não fazemos nada ainda
    if (isLoading) {
      console.log("[ProtectedRoute] Aguardando verificação de autenticação...");
      return;
    }
    
    // Verificamos se o usuário vem de um processo de login
    const isLoginRedirect = sessionStorage.getItem("isRedirectingAfterLogin") === "true";
    const loginTimestamp = sessionStorage.getItem("loginTimestamp");
    const isRecentLogin = loginTimestamp && (Date.now() - parseInt(loginTimestamp)) < 10000; // 10 segundos
    
    // Se não está autenticado E não está em processo de login recente, redirecionar
    if (!isAuthenticated && !(isLoginRedirect && isRecentLogin)) {
      console.log("[ProtectedRoute] Redirecionando para login: usuário não autenticado", {isAuthenticated, isLoginRedirect, isRecentLogin});
      // Usar setLocation para manter o estado do aplicativo
      setLocation("/auth/login");
    } else if (isAuthenticated) {
      console.log("[ProtectedRoute] Usuário autenticado com sucesso:", isAuthenticated);
    }
    
    // Se autenticado, podemos limpar as flags de redirecionamento
    if (isAuthenticated && isLoginRedirect) {
      console.log("[ProtectedRoute] Autenticação confirmada, limpando flags de redirecionamento");
      sessionStorage.removeItem("isRedirectingAfterLogin");
      sessionStorage.removeItem("loginTimestamp");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  // Mostra um loader enquanto está verificando a autenticação
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
          <p className="text-neutral-500">Carregando...</p>
        </div>
      </div>
    );
  }

  // Só exibe o conteúdo se estiver autenticado
  return isAuthenticated ? <>{children}</> : null;
}