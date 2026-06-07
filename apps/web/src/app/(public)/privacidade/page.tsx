import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade — CogniQuest",
  description: "Política de Privacidade e Proteção de Dados da plataforma CogniQuest",
};

export default function PrivacidadePage() {
  return (
    <div className="legal-page-wrapper">
      <div className="legal-page-card">
        <div className="legal-header">
          <Link href="/" className="legal-logo-link">
            ← Voltar
          </Link>
          <span className="legal-version-badge">Versão v1.0 — Vigência: 07/06/2026</span>
        </div>

        <h1 className="legal-title">Política de Privacidade</h1>
        <p className="legal-subtitle">CogniQuest — Plataforma de Ensino Gamificada</p>

        <div className="legal-content">
          <section>
            <h2>1. Introdução</h2>
            <p>
              Esta Política de Privacidade descreve como o CogniQuest (&quot;nós&quot;, 
              &quot;Plataforma&quot;) coleta, utiliza, armazena e protege os dados pessoais 
              dos usuários, em conformidade com a Lei Geral de Proteção de Dados Pessoais 
              (Lei nº 13.709/2018 — LGPD).
            </p>
            <p>
              Dada a natureza educativa da Plataforma, voltada para estudantes do 6º ano 
              ao 3º ano do Ensino Médio (público majoritariamente menor de idade), todas 
              as práticas de tratamento de dados observam o <strong>princípio do melhor 
              interesse da criança e do adolescente</strong> (Art. 14 da LGPD).
            </p>
          </section>

          <section>
            <h2>2. Dados Coletados</h2>
            <p>Coletamos apenas os dados estritamente necessários para o funcionamento da Plataforma:</p>
            
            <table className="legal-table">
              <thead>
                <tr>
                  <th>Dado</th>
                  <th>Finalidade</th>
                  <th>Base Legal</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>E-mail</td>
                  <td>Autenticação, comunicações sobre a conta</td>
                  <td>Execução de contrato</td>
                </tr>
                <tr>
                  <td>Nome de exibição</td>
                  <td>Identificação no jogo (visível a outros jogadores)</td>
                  <td>Execução de contrato</td>
                </tr>
                <tr>
                  <td>Senha (hash)</td>
                  <td>Autenticação segura (armazenada em hash irreversível)</td>
                  <td>Execução de contrato</td>
                </tr>
                <tr>
                  <td>Data de nascimento</td>
                  <td>Classificação etária, acionamento de proteções para menores</td>
                  <td>Obrigação legal (Art. 14 LGPD)</td>
                </tr>
                <tr>
                  <td>Série escolar</td>
                  <td>Adequação do conteúdo educativo (matchmaking)</td>
                  <td>Legítimo interesse</td>
                </tr>
                <tr>
                  <td>E-mail do responsável</td>
                  <td>Consentimento parental para menores de 12 anos</td>
                  <td>Obrigação legal (Art. 14, §1º LGPD)</td>
                </tr>
                <tr>
                  <td>Histórico de partidas</td>
                  <td>Ranking educativo, histórico de aprendizado</td>
                  <td>Execução de contrato</td>
                </tr>
                <tr>
                  <td>IP (handshake)</td>
                  <td>Segurança, prevenção de abuso, rate limiting</td>
                  <td>Legítimo interesse</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h2>3. Tratamento de Dados de Menores</h2>
            <p>
              O CogniQuest reconhece que seu público-alvo é majoritariamente composto 
              por menores de idade. Por isso:
            </p>
            <ul>
              <li>
                <strong>Crianças (menores de 12 anos):</strong> A criação de conta 
                exige o <strong>consentimento específico e em destaque</strong> de ao 
                menos um responsável legal, realizado via confirmação por e-mail. A 
                conta permanece inativa até a confirmação (Art. 14, §1º da LGPD).
              </li>
              <li>
                <strong>Adolescentes (12 a 17 anos):</strong> O tratamento observa o 
                melhor interesse do menor, com defaults de privacidade restritivos.
              </li>
              <li>
                A coleta é <strong>minimizada</strong> ao estritamente necessário para 
                a experiência educativa.
              </li>
              <li>
                Nenhum dado é utilizado para fins de marketing, publicidade ou 
                perfilamento comercial.
              </li>
            </ul>
          </section>

          <section>
            <h2>4. Compartilhamento de Dados</h2>
            <p>
              Os dados pessoais <strong>não são compartilhados com terceiros para fins 
              comerciais</strong>. Os subprocessadores utilizados exclusivamente para 
              operação técnica da Plataforma são:
            </p>
            <ul>
              <li><strong>Supabase</strong> — Banco de dados (PostgreSQL) — Região: América do Sul</li>
              <li><strong>Upstash</strong> — Cache e estado volátil (Redis)</li>
              <li><strong>Google Cloud</strong> — Hospedagem e infraestrutura</li>
              <li><strong>Cloudflare</strong> — CDN, proteção anti-bot (Turnstile)</li>
              <li><strong>Sentry</strong> — Monitoramento de erros (sem PII)</li>
              <li><strong>Provedor SMTP</strong> — Envio de e-mails transacionais</li>
            </ul>
            <p>
              Todos os subprocessadores operam sob obrigações contratuais de proteção 
              de dados compatíveis com a LGPD.
            </p>
          </section>

          <section>
            <h2>5. Segurança dos Dados</h2>
            <ul>
              <li>Senhas armazenadas em hash irreversível (bcrypt/Argon2)</li>
              <li>Comunicação criptografada (HTTPS/TLS)</li>
              <li>Tokens JWT com rotação automática</li>
              <li>Rate limiting contra ataques de força bruta</li>
              <li>Validação de entrada em todas as fronteiras (Zod)</li>
              <li>Headers de segurança (CSP, HSTS, X-Frame-Options)</li>
              <li>Monitoramento de erros sem dados pessoais identificáveis</li>
            </ul>
          </section>

          <section>
            <h2>6. Direitos do Titular (Art. 18 da LGPD)</h2>
            <p>Você tem direito a:</p>
            <ul>
              <li>
                <strong>Acesso e portabilidade:</strong> Exportar todos os seus dados 
                em formato estruturado (JSON) através da página de Configurações.
              </li>
              <li>
                <strong>Retificação:</strong> Corrigir dados pessoais incorretos.
              </li>
              <li>
                <strong>Exclusão:</strong> Solicitar a eliminação dos seus dados pessoais 
                a qualquer momento. A exclusão inclui anonimização de dados em registros 
                históricos e purga de dados em cache/subprocessadores.
              </li>
              <li>
                <strong>Revogação do consentimento:</strong> Revogar consentimentos 
                concedidos, o que pode implicar na desativação da conta.
              </li>
              <li>
                <strong>Informação:</strong> Saber quais dados são coletados, para 
                quais finalidades e com quem são compartilhados (este documento).
              </li>
            </ul>
            <p>
              Estes direitos podem ser exercidos diretamente na página de 
              <strong> Configurações</strong> da sua conta ou por e-mail para{" "}
              <strong>privacidade@cogniquest.com</strong>.
            </p>
          </section>

          <section>
            <h2>7. Retenção de Dados</h2>
            <ul>
              <li>
                Dados de conta são mantidos enquanto a conta estiver ativa.
              </li>
              <li>
                Ao excluir a conta, dados pessoais são anonimizados. Registros de 
                consentimento são retidos pelo prazo legal para fins de prestação de contas.
              </li>
              <li>
                Dados voláteis (estado de partida em Redis) são efêmeros e automaticamente 
                removidos após o término da sessão de jogo.
              </li>
            </ul>
          </section>

          <section>
            <h2>8. Cookies e Armazenamento Local</h2>
            <p>
              A Plataforma utiliza cookies estritamente necessários para autenticação 
              (tokens de sessão). Não utilizamos cookies de rastreamento, analytics de 
              terceiros ou tecnologias de perfilamento.
            </p>
          </section>

          <section>
            <h2>9. Registro de Consentimento</h2>
            <p>
              Todos os consentimentos são registrados com: versão da política aceita, 
              data/hora, endereço IP e método de coleta. Quando a Política de 
              Privacidade for atualizada, um novo consentimento poderá ser solicitado.
            </p>
          </section>

          <section>
            <h2>10. Alterações nesta Política</h2>
            <p>
              Esta Política pode ser atualizada periodicamente. Alterações significativas 
              serão comunicadas por e-mail e/ou notificação na Plataforma, com 
              solicitação de novo consentimento quando necessário. A versão vigente 
              estará sempre disponível nesta página.
            </p>
          </section>

          <section>
            <h2>11. Encarregado de Proteção de Dados (DPO)</h2>
            <p>
              Para exercer seus direitos, esclarecer dúvidas ou realizar reclamações 
              sobre o tratamento de dados pessoais, entre em contato com o Encarregado:
            </p>
            <p>
              <strong>E-mail:</strong> privacidade@cogniquest.com
            </p>
          </section>

          <section>
            <h2>12. Autoridade Nacional de Proteção de Dados</h2>
            <p>
              Se considerar que o tratamento de seus dados infringe a LGPD, você pode 
              apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD):
              {" "}<strong>www.gov.br/anpd</strong>
            </p>
          </section>
        </div>

        <div className="legal-footer">
          <Link href="/termos" className="legal-link">
            Termos de Uso →
          </Link>
          <Link href="/register" className="legal-link">
            Criar Conta →
          </Link>
        </div>
      </div>
    </div>
  );
}
