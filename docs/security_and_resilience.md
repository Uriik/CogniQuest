# Segurança e Resiliência do Sistema

No CogniQuest, implementamos múltiplas camadas de segurança para contornar abusos sistemáticos e garantir que falhas isoladas de rede não destruam a experiência do usuário.

## 1. Mitigação de DDoS, Phishing e Ataques Massivos

### Cloudflare (DDoS & DNS Edge)
O Cloudflare atua na camada 7 do modelo OSI interceptando qualquer tráfego antes de atingir o Google Cloud Run. Isso significa que ataques de negação de serviço (DDoS) são mitigados pela vasta rede Anycast do Cloudflare.

### Cloudflare Turnstile (Ataques Massivos / Bots)
Para impedir que bots criem contas fraudulentas ou inundem o banco de dados via scripts automatizados (mass account creation), utilizamos o **Turnstile**. 
Diferente de captchas tradicionais, ele atua analisando a telemetria do navegador silenciosamente, bloqueando ferramentas automatizadas sem fricção para o usuário real. Ele protege a rota `POST /api/auth/register`.

### NestJS Throttler & Redis (Rate Limiting HTTP)
Tanto as rotas de API no Next.js quanto o servidor de jogo possuem política de Rate Limit. Um usuário comum não pode disparar 1.000 requisições por minuto. Usando o `@nestjs/throttler` (ou KV do Upstash Redis no Next.js), limitamos o tráfego a números humanamente razoáveis, barrando ataques de força-bruta em senhas ou inundação de Lobbys.

### Combate a Phishing
Utilizamos headers de segurança restritos (Content Security Policy) via `middleware.ts` para mitigar ataques XSS. Além disso, as rotas que enviam tokens sensíveis só trafegam em conexões TLS (HTTPS), tornando a interceptação impossível.

## 2. O Problema Crônico do Websocket

Manter uma conexão WebSocket aberta é inerentemente arriscado: uma porta bidirecional fica exposta, e pacotes chegam sem os tradicionais Headers HTTP após o Handshake inicial.

**Como contornamos:**
1. **JWT Handshake Authorization:** Nenhum cliente consegue sequer abrir um socket sem injetar um JSON Web Token válido no evento de conexão. O servidor NestJS analisa, decodifica a assinatura criptográfica e só então aceita o client. O `userId` usado em toda checagem de autorização vem das *claims verificadas* do token — nunca de algo que o cliente envia.
2. **Rate Limit em Eventos de Socket:** Mesmo conectado, um usuário mal intencionado poderia disparar o evento `game:answer` milhares de vezes por segundo. Nós acoplamos um limitador específico de WS (*WsThrottlerGuard*) para os eventos do Socket.io. Se o client abusar, a conexão é brutalmente cortada.
3. **Confidencialidade na Camada de Transporte (TLS / `wss://`):** Todo o tráfego do Socket.io trafega sobre `wss://`, com o TLS terminado pelo Google Cloud Run. Payloads, tokens e eventos já são cifrados de ponta a ponta na rede — *sniffing* e MITM ficam inviáveis sem nenhuma camada extra de aplicação. Esta é a fonte real de confidencialidade do canal.
4. **Validação de Entrada (Zod):** Todo payload recebido é validado por schema (`lobbyCreateSchema`, `lobbyJoinSchema`, etc.) na fronteira do gateway. Mensagem malformada é rejeitada antes de tocar a lógica de negócio. É *esta* a defesa concreta contra adulteração via DevTools — não a ofuscação de payload.
5. **Authoritative Server:** O cliente nunca dita as regras. O websocket do Frontend jamais pode mandar o comando "eu venci". Ele envia "cliquei no radar C4". O servidor processa, verifica se era turno da pessoa, resolve a resposta correta e a posição dos navios *somente no servidor*, e emite apenas o resultado público. Respostas corretas e posições de navio nunca chegam ao cliente.

> [!NOTE]
> ### Decisão: remoção da cifra AES de camada de aplicação (2026-06-07)
> Uma versão anterior aplicava criptografia AES nos payloads do Socket.io via *monkey patching* de `emit`/`on`/`off`, usando uma chave simétrica compartilhada (`WS_SECRET`). Essa camada foi **removida** por dois motivos:
> - **Não agregava segurança real.** O design obrigava a mesma chave simétrica a ser enviada ao navegador (via `/api/config` ou `NEXT_PUBLIC_`), ou seja, qualquer usuário a extraía no DevTools e podia decifrar/forjar mensagens do mesmo jeito. Confidencialidade na rede já é garantida pelo TLS (`wss://`); integridade e identidade, pelo JWT + Zod + servidor-autoritativo.
> - **Era um ponto único de falha.** Uma divergência de chave entre web e game-server quebrava 100% da comunicação (criação de sala travava em "Criando..." indefinidamente). Ver o incidente correspondente em [`deployment_incident_report.md`](deployment_incident_report.md).
>
> O modelo de segurança do WebSocket passou a se apoiar exclusivamente em **TLS + JWT + Zod + servidor-autoritativo**, eliminando a superfície de bug sem reduzir a proteção efetiva.

## 3. Políticas de Retry e Resiliência a Quedas

Jogos não podem parar se a conexão der um pequeno "soluço".
- **Socket.io Retry Nativo:** A própria biblioteca gerencia reconexão automática com *backoff* exponencial. Se o 4G oscilar por 3 segundos, o Socket entra em standby e se reconecta sem a percepção do usuário.
- **Axios-Retry e FrontEnd Fallbacks:** Requisições HTTP normais, como salvar uma configuração de conta, possuem tratativas de "Retry" implementadas. Se o servidor HTTP der erro 500 ou 502 por um restart do Google Cloud Run, a biblioteca vai tentar novamente até 3 vezes antes de jogar o erro na cara do usuário.
