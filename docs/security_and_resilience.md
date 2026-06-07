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
1. **JWT Handshake Authorization:** Nenhum cliente consegue sequer abrir um socket sem injetar um JSON Web Token válido no evento de conexão. O servidor NestJS analisa, decodifica a assinatura criptográfica e só então aceita o client.
2. **Rate Limit em Eventos de Socket:** Mesmo conectado, um usuário mal intencionado poderia disparar o evento `game:answer` milhares de vezes por segundo. Nós acoplamos um limitador específico de WS (*WsThrottlerGuard*) para os eventos do Socket.io. Se o client abusar, a conexão é brutalmente cortada.
3. **Descriptografia de Camada de Aplicação (E2EE), Circuit Breaker e Prevenção de Memory Leaks:** Para dificultar a engenharia reversa via DevTools, implementamos criptografia AES nos payloads utilizando uma chave simétrica (`WS_SECRET`). Em vez de reescrever todas as chamadas manualmente, adotamos a técnica avançada de **Monkey Patching**, sobrescrevendo os métodos nativos `emit`, `on` e `off` do Socket.io tanto no Servidor (Middlewares/Interceptors) quanto no Frontend. 
   - **Circuit Breaker:** Se as chaves estiverem dessincronizadas em produção, um erro é lançado e interceptado no próprio Monkey Patch, bloqueando a entrega do pacote corrompido aos *listeners* originais do React e prevenindo a "Tela Branca da Morte" (`.map is not a function`).
   - **Gestão Segura de Memória:** O interceptador garante a preservação do escopo (`this`) via `listener.apply()` e repassa a mesma referência da função envelopada (wrapper) para o método `socket.off()`. Isso garante que as rotinas internas do Socket.io de limpeza e desconexão funcionem perfeitamente, eliminando riscos de Memory Leaks.
4. **Authoritative Server:** O cliente nunca dita as regras. O websocket do Frontend jamais pode mandar o comando "eu venci". Ele envia "cliquei no radar C4". O servidor processa, verifica se era turno da pessoa e emite o resultado.

## 3. Políticas de Retry e Resiliência a Quedas

Jogos não podem parar se a conexão der um pequeno "soluço".
- **Socket.io Retry Nativo:** A própria biblioteca gerencia reconexão automática com *backoff* exponencial. Se o 4G oscilar por 3 segundos, o Socket entra em standby e se reconecta sem a percepção do usuário.
- **Axios-Retry e FrontEnd Fallbacks:** Requisições HTTP normais, como salvar uma configuração de conta, possuem tratativas de "Retry" implementadas. Se o servidor HTTP der erro 500 ou 502 por um restart do Google Cloud Run, a biblioteca vai tentar novamente até 3 vezes antes de jogar o erro na cara do usuário.
