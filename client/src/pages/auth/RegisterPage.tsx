import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel, FormDescription } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Check, X, AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { FaGoogle, FaFacebook, FaLinkedin } from "react-icons/fa";

const passwordSchema = z.string()
  .min(8, { message: "A senha deve ter pelo menos 8 caracteres" })
  .regex(/[A-Z]/, { message: "A senha deve conter pelo menos uma letra maiúscula" })
  .regex(/[a-z]/, { message: "A senha deve conter pelo menos uma letra minúscula" })
  .regex(/[0-9]/, { message: "A senha deve conter pelo menos um número" })
  .regex(/[^A-Za-z0-9]/, { message: "A senha deve conter pelo menos um caractere especial" });

const registerSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres" }),
  email: z.string()
    .email({ message: "Por favor, insira um email válido" })
    .refine(email => {
      // Lista de domínios comuns e válidos (simplificada para exemplo)
      const validDomains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'uol.com.br', 'live.com', 'bol.com.br', 'protonmail.com', 'edu.br', 'gov.br', 'org.br'];
      const domain = email.split('@')[1];
      // Verificar se o domínio existe na nossa lista ou tem pelo menos um ponto (simplificado)
      return domain && (validDomains.includes(domain) || domain.includes('.'));
    }, { message: "Por favor, use um endereço de email válido" }),
  username: z.string()
    .min(3, { message: "O nome de usuário deve ter pelo menos 3 caracteres" })
    .regex(/^[a-zA-Z0-9_]+$/, { message: "O nome de usuário só pode conter letras, números e underscores" }),
  password: passwordSchema,
  confirmPassword: z.string(),
  city: z.string().min(2, { message: "Informe sua cidade" }),
  userType: z.string().default("tutor"),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: "Você precisa aceitar os termos de uso",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecial: false
  });
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
      city: "",
      termsAccepted: false,
    },
    mode: "onChange"
  });
  
  // Verifica a força da senha enquanto o usuário digita
  useEffect(() => {
    const password = form.watch("password");
    if (!password) {
      setPasswordStrength(0);
      setPasswordRequirements({
        minLength: false,
        hasUppercase: false,
        hasLowercase: false,
        hasNumber: false,
        hasSpecial: false
      });
      return;
    }
    
    // Verifica cada requisito
    const reqs = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[^A-Za-z0-9]/.test(password)
    };
    
    setPasswordRequirements(reqs);
    
    // Calcula a força da senha (0-100)
    const meetsReqs = Object.values(reqs).filter(Boolean).length;
    setPasswordStrength(meetsReqs * 20); // 20% para cada requisito atendido
  }, [form.watch("password")]);
  
  // Monitora mudanças no email para verificação
  useEffect(() => {
    const email = form.watch("email");
    const checkEmail = async () => {
      if (!email || !email.includes('@') || !email.includes('.')) {
        setEmailVerified(false);
        return;
      }
      
      // Simples verificação de domínio
      try {
        setEmailVerifying(true);
        // Apenas verificamos se o domínio parece válido
        const domain = email.split('@')[1];
        if (!domain || !domain.includes('.')) {
          setEmailVerified(false);
          setEmailVerifying(false);
          return;
        }
        
        // Verificação mais avançada simulada (normalmente seria feita com um serviço de email)
        setTimeout(() => {
          setEmailVerified(true);
          setEmailVerifying(false);
        }, 1000);
      } catch (error) {
        setEmailVerified(false);
        setEmailVerifying(false);
      }
    };
    
    const debounce = setTimeout(checkEmail, 800);
    return () => clearTimeout(debounce);
  }, [form.watch("email")]);

  const onSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);
    try {
      console.log("Enviando dados de registro: ", values);
      const response = await apiRequest("POST", "/api/auth/register", values);
      
      if (!response.ok) {
        let errorMessage = "Erro ao criar conta";
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const error = await response.json();
            errorMessage = error.message || errorMessage;
          } else {
            errorMessage = await response.text() || errorMessage;
          }
        } catch (jsonError) {
          console.error("Erro ao processar resposta de erro:", jsonError);
        }
        throw new Error(errorMessage);
      }
      
      // Tratamento mais seguro do corpo da resposta
      let userData;
      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const clonedResponse = response.clone();
          const responseText = await clonedResponse.text();
          
          if (responseText && responseText.trim() !== '') {
            userData = JSON.parse(responseText);
            console.log("Registro bem-sucedido:", userData);
          }
        }
      } catch (parseError) {
        console.warn("Aviso: Não foi possível processar o corpo da resposta:", parseError);
        // Continuar mesmo se a resposta não puder ser analisada
      }
      
      // Extrair a mensagem do servidor, se disponível
      const message = userData?.message || "Verifique seu email para ativar sua conta";
      
      // Notificar o usuário sobre o sucesso e a necessidade de verificar o e-mail
      toast({
        title: "Conta criada com sucesso!",
        description: message,
        duration: 5000, // Mostrar por mais tempo para que o usuário possa ler
      });
      
      // Garantir que o estado de loading seja removido antes do redirecionamento
      setIsLoading(false);
      
      // Pequeno atraso para garantir que o toast seja exibido
      setTimeout(() => {
        // Redirecionamento para a página de login após o registro
        setLocation("/auth/login?registered=true");
      }, 3000);
      
    } catch (error: any) {
      console.error("Erro no registro:", error);
      toast({
        title: "Erro ao criar conta",
        description: error.message || "Verifique os dados e tente novamente",
        variant: "destructive",
      });
      setIsLoading(false); // Garantir que o loading seja removido em caso de erro
    } finally {
      // Garantia extra de que o loading será removido em qualquer situação
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    window.location.href = `/api/auth/${provider}`;
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Crie sua conta</h1>
          <p className="mt-2 text-muted-foreground">
            Junte-se à nossa comunidade para ajudar nossos amiguinhos peludos! 🐾
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="Nome completo"
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    Email
                    {emailVerifying && (
                      <span className="ml-2 text-xs text-amber-500 inline-flex items-center">
                        <svg className="animate-spin h-3 w-3 mr-1" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Verificando
                      </span>
                    )}
                    {emailVerified && !emailVerifying && (
                      <span className="ml-2 text-xs text-green-500 inline-flex items-center">
                        <Check className="h-3 w-3 mr-1" />
                        Email válido
                      </span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Email"
                      type="email"
                      autoComplete="email"
                      className={`h-11 ${emailVerified ? "border-green-500 focus-visible:ring-green-300" : ""}`}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Um email de confirmação será enviado após o cadastro.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="Nome de usuário"
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
                        autoComplete="new-password"
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
                  
                  {/* Indicador de força de senha */}
                  {field.value && (
                    <>
                      <div className="mt-2">
                        <Progress value={passwordStrength} className={`h-2 ${
                          passwordStrength < 40 ? "bg-red-500" : 
                          passwordStrength < 80 ? "bg-yellow-500" : 
                          "bg-green-500"
                        }`} />
                      </div>
                      <Card className="mt-2 p-3 bg-slate-50">
                        <div className="text-xs text-slate-700 mb-1 font-semibold">
                          Requisitos de senha:
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          <div className="flex items-center text-xs">
                            {passwordRequirements.minLength ? 
                              <Check className="h-3 w-3 text-green-500 mr-1" /> : 
                              <X className="h-3 w-3 text-red-500 mr-1" />}
                            Pelo menos 8 caracteres
                          </div>
                          <div className="flex items-center text-xs">
                            {passwordRequirements.hasUppercase ? 
                              <Check className="h-3 w-3 text-green-500 mr-1" /> : 
                              <X className="h-3 w-3 text-red-500 mr-1" />}
                            Uma letra maiúscula
                          </div>
                          <div className="flex items-center text-xs">
                            {passwordRequirements.hasLowercase ? 
                              <Check className="h-3 w-3 text-green-500 mr-1" /> : 
                              <X className="h-3 w-3 text-red-500 mr-1" />}
                            Uma letra minúscula
                          </div>
                          <div className="flex items-center text-xs">
                            {passwordRequirements.hasNumber ? 
                              <Check className="h-3 w-3 text-green-500 mr-1" /> : 
                              <X className="h-3 w-3 text-red-500 mr-1" />}
                            Um número
                          </div>
                          <div className="flex items-center text-xs">
                            {passwordRequirements.hasSpecial ? 
                              <Check className="h-3 w-3 text-green-500 mr-1" /> : 
                              <X className="h-3 w-3 text-red-500 mr-1" />}
                            Um caractere especial
                          </div>
                        </div>
                      </Card>
                    </>
                  )}
                  
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="Confirme sua senha"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
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

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="Cidade"
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
              name="termsAccepted"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-2 space-y-0 mb-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <div className="text-sm leading-tight">
                    <FormLabel className="font-normal text-sm">
                      Aceito os <Link href="/termos" className="text-primary hover:underline">Termos de Uso</Link> e a{" "}
                      <Link href="/privacidade" className="text-primary hover:underline">Política de Privacidade</Link>
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full h-11" 
              disabled={isLoading || !emailVerified || passwordStrength < 60}
            >
              {isLoading ? "Criando conta..." : "Criar conta"}
            </Button>
            
            {(passwordStrength < 60 && form.watch("password")) && (
              <div className="text-center text-xs text-amber-600 flex items-center justify-center mt-2">
                <AlertCircle className="h-3 w-3 mr-1 inline" />
                Sua senha precisa ser mais forte para continuar
              </div>
            )}
            
            {(!emailVerified && form.watch("email") && !emailVerifying) && (
              <div className="text-center text-xs text-amber-600 flex items-center justify-center mt-2">
                <AlertCircle className="h-3 w-3 mr-1 inline" />
                Email inválido ou não verificado
              </div>
            )}
          </form>
        </Form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-2 text-muted-foreground">
              ou continue com
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* Google Register Button */}
          <button
            type="button"
            onClick={() => handleSocialLogin("google")}
            className="inline-flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4285F4] transition-colors h-11"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </button>
          
          {/* Facebook Register Button */}
          <button
            type="button"
            onClick={() => handleSocialLogin("facebook")}
            className="inline-flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1877F2] transition-colors h-11"
          >
            <FaFacebook className="w-5 h-5" style={{ color: '#1877F2' }} />
          </button>
          
          {/* LinkedIn Register Button */}
          <button
            type="button"
            onClick={() => handleSocialLogin("linkedin")}
            className="inline-flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0A66C2] transition-colors h-11"
          >
            <FaLinkedin className="w-5 h-5" style={{ color: '#0A66C2' }} />
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Já tem uma conta?{" "}
          <Link href="/auth/login" className="text-primary hover:underline">
            Faça login
          </Link>
        </p>
      </div>
    </div>
  );
}