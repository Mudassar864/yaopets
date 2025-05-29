
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-6">Política de Privacidade - YaoPets</h1>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">1. Coleta e Uso de Dados</h2>
          <p className="mb-4">
            O YaoPets coleta apenas as informações necessárias para fornecer nossos serviços. Coletamos:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Informações de perfil (nome, email, foto)</li>
            <li>Dados de localização para exibir pets próximos</li>
            <li>Fotos e informações dos pets cadastrados</li>
            <li>Mensagens trocadas entre usuários</li>
            <li>Informações sobre doações e pedidos de ajuda veterinária</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">2. Uso dos Dados</h2>
          <p className="mb-4">Seus dados são utilizados para:</p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Conectar pessoas que perderam pets com aquelas que os encontraram</li>
            <li>Facilitar o processo de adoção responsável</li>
            <li>Viabilizar doações e ajuda veterinária</li>
            <li>Melhorar nossos serviços e experiência do usuário</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">3. Compartilhamento de Dados</h2>
          <p className="mb-4">
            Não vendemos seus dados pessoais. Compartilhamos informações apenas:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Entre usuários envolvidos em uma mesma ação (adoção, doação, etc.)</li>
            <li>Com prestadores de serviço necessários ao funcionamento da plataforma</li>
            <li>Quando exigido por lei ou ordem judicial</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">4. Seus Direitos</h2>
          <p className="mb-4">Você tem direito a:</p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Acessar seus dados pessoais</li>
            <li>Corrigir dados incorretos</li>
            <li>Solicitar a exclusão dos seus dados</li>
            <li>Exportar seus dados em formato legível</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">5. Exclusão de Dados</h2>
          <p className="mb-4">
            Ao solicitar a exclusão dos seus dados:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Sua conta será desativada em até 48 horas</li>
            <li>Seus dados pessoais serão removidos</li>
            <li>Posts e fotos serão anonimizados</li>
            <li>Mensagens serão excluídas</li>
          </ul>
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="font-medium text-red-800 mb-2">Solicitar Exclusão</h3>
            <p className="text-red-700 mb-4 text-sm">
              Esta ação é irreversível. Todos os seus dados serão permanentemente excluídos.
            </p>
            <Button variant="destructive" className="w-full">
              Solicitar Exclusão de Dados
            </Button>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">6. Segurança dos Dados</h2>
          <p className="mb-4">
            Implementamos medidas técnicas e organizacionais para proteger seus dados:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Criptografia em trânsito e em repouso</li>
            <li>Acesso restrito baseado em necessidade</li>
            <li>Monitoramento contínuo de segurança</li>
            <li>Backups regulares e seguros</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">7. Contato</h2>
          <p className="mb-2">
            Para questões sobre privacidade ou solicitações relacionadas aos seus dados:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Email: privacy@yaopets.lat</li>
            <li>Site: yaopets.lat/politicadedados</li>
          </ul>
        </section>
      </Card>
    </div>
  );
}
