import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso — CogniQuest",
  description: "Termos de Uso da plataforma educativa CogniQuest",
};

export default function TermosPage() {
  return (
    <div className="legal-page-wrapper">
      <div className="legal-page-card">
        <div className="legal-header">
          <Link href="/" className="legal-logo-link">
            ← Voltar
          </Link>
          <span className="legal-version-badge">Versão v1.0 — Vigência: 07/06/2026</span>
        </div>

        <h1 className="legal-title">Termos de Uso</h1>
        <p className="legal-subtitle">CogniQuest — Plataforma de Ensino Gamificada</p>

        <div className="legal-content">
          <section>
            <h2>1. Aceitação dos Termos</h2>
            <p>
              Ao criar uma conta e utilizar a plataforma CogniQuest (&quot;Plataforma&quot;), 
              você declara ter lido, compreendido e concordado com estes Termos de Uso. 
              Caso seja menor de 18 anos, o uso da Plataforma deve ser autorizado por 
              seu responsável legal. Para menores de 12 anos, o consentimento específico 
              do responsável é obrigatório conforme o Art. 14 da LGPD.
            </p>
          </section>

          <section>
            <h2>2. Descrição do Serviço</h2>
            <p>
              O CogniQuest é uma plataforma educativa gamificada que oferece jogos de 
              perguntas e respostas (quiz) integrados a mecânicas de jogos clássicos, 
              como Batalha Naval. O objetivo é auxiliar no aprendizado de disciplinas 
              escolares do 6º ano do Ensino Fundamental ao 3º ano do Ensino Médio.
            </p>
            <p>
              Os conteúdos abrangem: Matemática, Física, Biologia, Química, Português, 
              História e Geografia.
            </p>
          </section>

          <section>
            <h2>3. Cadastro e Conta</h2>
            <p>Para utilizar a Plataforma, é necessário criar uma conta informando:</p>
            <ul>
              <li>Nome de exibição (visível a outros jogadores)</li>
              <li>Endereço de e-mail válido</li>
              <li>Senha segura (mínimo 8 caracteres, com letras e números)</li>
              <li>Data de nascimento (para classificação etária)</li>
              <li>Série escolar (opcional, para adequação de conteúdo)</li>
            </ul>
            <p>
              Você é responsável por manter a confidencialidade de suas credenciais. 
              Informações falsas ou fraudulentas podem resultar na suspensão da conta.
            </p>
          </section>

          <section>
            <h2>4. Menores de Idade</h2>
            <p>
              O CogniQuest é voltado para estudantes do ensino fundamental e médio, 
              público majoritariamente menor de idade. Aplicam-se as seguintes regras:
            </p>
            <ul>
              <li>
                <strong>Menores de 12 anos (crianças):</strong> A conta só será ativada 
                após o consentimento específico do responsável legal, realizado via 
                confirmação por e-mail (LGPD, Art. 14, §1º).
              </li>
              <li>
                <strong>Adolescentes (12 a 17 anos):</strong> O tratamento de dados 
                observa o princípio do melhor interesse do menor.
              </li>
              <li>
                Salas de jogo são privadas por padrão para todos os menores.
              </li>
              <li>
                Rankings exibem apenas o nome de exibição (apelido), nunca e-mail 
                ou outros dados pessoais.
              </li>
            </ul>
          </section>

          <section>
            <h2>5. Regras de Conduta</h2>
            <p>Ao utilizar a Plataforma, você se compromete a:</p>
            <ul>
              <li>Não utilizar nomes ofensivos, discriminatórios ou inadequados</li>
              <li>Não tentar burlar os filtros de conteúdo (leetspeak, caracteres especiais, etc.)</li>
              <li>Não incluir URLs ou links em nomes de salas ou perfis</li>
              <li>Tratar outros jogadores com respeito</li>
              <li>Não utilizar a plataforma para fins não educativos</li>
            </ul>
            <p>
              A Plataforma emprega filtros automáticos de conteúdo. Nomes que violem as 
              regras serão rejeitados. Reincidência pode resultar em suspensão da conta.
            </p>
          </section>

          <section>
            <h2>6. Propriedade Intelectual</h2>
            <p>
              Todo o conteúdo da Plataforma (design, código, questões, marcas) é de 
              propriedade do CogniQuest ou de seus licenciadores. O uso é licenciado 
              exclusivamente para fins educativos pessoais, vedada a reprodução, 
              distribuição ou modificação sem autorização.
            </p>
          </section>

          <section>
            <h2>7. Disponibilidade e Limitação de Responsabilidade</h2>
            <p>
              O CogniQuest se esforça para manter a Plataforma disponível, mas não 
              garante disponibilidade ininterrupta. Não nos responsabilizamos por 
              danos decorrentes de indisponibilidades, erros técnicos ou perda de dados 
              de gameplay.
            </p>
          </section>

          <section>
            <h2>8. Exclusão de Conta</h2>
            <p>
              Você pode solicitar a exclusão de sua conta a qualquer momento através 
              da página de Configurações. Ao excluir sua conta:
            </p>
            <ul>
              <li>Seus dados pessoais serão anonimizados</li>
              <li>Suas sessões ativas serão encerradas</li>
              <li>Dados em subprocessadores serão removidos ou anonimizados</li>
              <li>
                Dados mínimos poderão ser retidos conforme obrigação legal (ex.: registros 
                de consentimento para fins de prestação de contas)
              </li>
            </ul>
          </section>

          <section>
            <h2>9. Alterações nos Termos</h2>
            <p>
              Estes Termos podem ser atualizados periodicamente. Alterações significativas 
              serão comunicadas por e-mail ou através de notificação na Plataforma. A 
              continuidade de uso após a notificação constitui aceitação dos novos termos. 
              Caso necessário, será solicitado novo consentimento explícito.
            </p>
          </section>

          <section>
            <h2>10. Lei Aplicável e Foro</h2>
            <p>
              Estes Termos são regidos pelas leis da República Federativa do Brasil. 
              Fica eleito o foro da comarca do domicílio do usuário para dirimir 
              quaisquer controvérsias.
            </p>
          </section>

          <section>
            <h2>11. Contato</h2>
            <p>
              Para dúvidas sobre estes Termos, entre em contato pelo e-mail: {" "}
              <strong>contato@cogniquest.com</strong>
            </p>
          </section>
        </div>

        <div className="legal-footer">
          <Link href="/privacidade" className="legal-link">
            Política de Privacidade →
          </Link>
          <Link href="/register" className="legal-link">
            Criar Conta →
          </Link>
        </div>
      </div>
    </div>
  );
}
