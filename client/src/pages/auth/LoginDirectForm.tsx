import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email({ message: "Por favor, insira um email válido" }),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Componente de formulário mais simples e direto
export default function LoginDirectForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Marcar início do processo de login para o middleware não interferir
      localStorage.setItem("yaopets_login_in_progress", "true");
      
      // Usar abordagem direta com fetch para melhor controle e diagnóstico
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Essencial para cookies de sessão
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          redirect: '/profile'
        }),
      });
      
      if (response.ok) {
        // Login bem-sucedido - criando sinais para o middleware reconhecer
        localStorage.setItem("yaopets_auth_success", "true");
        localStorage.setItem("yaopets_auth_time", Date.now().toString());
        
        // Redirecionar para o perfil
        window.location.href = '/profile';
      } else {
        // Erro de login - tentar obter detalhes
        try {
          const errorData = await response.json();
          setError(errorData.message || 'Falha no login. Verifique suas credenciais.');
        } catch (e) {
          setError('Erro ao fazer login. Tente novamente.');
        }
        localStorage.removeItem("yaopets_login_in_progress");
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Erro ao submeter login:", err);
      setError("Problema de conexão. Tente novamente.");
      localStorage.removeItem("yaopets_login_in_progress");
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  placeholder="Email"
                  type="email"
                  autoComplete="email"
                  className="h-11"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="relative">
                  <Input
                    placeholder="Senha"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className="h-11 pr-10"
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full h-11" disabled={isLoading}>
          {isLoading ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </Form>
  );
}