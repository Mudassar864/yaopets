import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    await mailService.send({
      to: params.to,
      from: "noreply@yaopets.lat", // Este domínio deve ser verificado no SendGrid
      subject: params.subject,
      text: params.text || '', // Garantir que nunca seja undefined
      html: params.html || '', // Garantir que nunca seja undefined
    });
    console.log(`Email enviado com sucesso para ${params.to}`);
    return true;
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return false;
  }
}

export async function sendVerificationEmail(email: string, verificationToken: string): Promise<boolean> {
  // Garantir que temos um domínio válido
  const domain = process.env.REPLIT_DOMAINS 
    ? process.env.REPLIT_DOMAINS.split(',')[0] 
    : 'yaopets.lat';
  
  const verificationUrl = `https://${domain}/api/auth/verify-email?token=${verificationToken}`;
  
  // A template string precisa ter todas as variáveis definidas dentro dela
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 5px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="https://yaopets.lat/logo.png" alt="YaoPets Logo" style="max-width: 150px;">
      </div>
      <h2 style="color: #fa6400; text-align: center;">Confirme seu email no YaoPets</h2>
      <p style="margin-bottom: 20px; line-height: 1.5;">Olá,</p>
      <p style="margin-bottom: 20px; line-height: 1.5;">Obrigado por se cadastrar no YaoPets. Para completar seu cadastro e poder acessar todas as funcionalidades da plataforma, confirme seu email clicando no botão abaixo:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" style="background-color: #fa6400; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Confirmar meu email</a>
      </div>
      <p style="margin-bottom: 20px; line-height: 1.5;">Se você não solicitou este email, por favor, ignore-o.</p>
      <p style="margin-bottom: 20px; line-height: 1.5;">Se o botão acima não funcionar, copie e cole o link abaixo no seu navegador:</p>
      <p style="margin-bottom: 20px; word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 3px; font-size: 14px;">${verificationUrl}</p>
      <p style="margin-bottom: 20px; line-height: 1.5;">Atenciosamente,<br>Equipe YaoPets</p>
      <div style="text-align: center; border-top: 1px solid #e1e1e1; padding-top: 20px; font-size: 12px; color: #888;">
        <p>&copy; 2025 YaoPets. Todos os direitos reservados.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: "Confirme seu email no YaoPets",
    html: emailHtml,
    text: `Confirme seu email no YaoPets acessando o link: ${verificationUrl}`
  });
}