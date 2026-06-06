# Frontend Architecture Rules (Web)

## 1. WebSockets & Game State
- **Decodificação Local**: O servidor (`game.gateway.ts`) envia um estado estático `PublicGameState` idêntico para a sala inteira em broadcast. O cliente React (`useGameSocket.ts`) é o **ÚNICO** responsável por cruzar essas informações (`state.hostId`, `state.hostFleet`, etc.) com a sessão privada (`session.user.id`) para descobrir se o jogador é o Host ou o Guest.
- **Pureza de Estado**: Nenhuma lógica de deduções de quem é o dono do turno deve ser executada para injetar ou mascarar dados no Socket. O pacote que chega via `game:state` sempre tem `hostRevealed` e `guestRevealed` expostos explicitamente.
- **Sincronia Imediata**: O estado `game:state` recebido substitui todo e qualquer acumulo de `game:attackResult`. O Frontend confia primariamente na emissão total do backend para garantir que nenhum grid fique congelado.

## 2. Padrão de Componentização Visual
- **Feedback Interativo**: Para a Batalha Naval e o Quiz, modais (ex: `QuestionModal`) nunca fecham imediatamente após o clique. Eles aguardam um `setTimeout` para que o usuário possa ver as cores de erro (Vermelho) e acerto (Verde) pedagogicamente antes da ação real do jogo tomar curso.
- **Tailwind vs CSS Puro**: Classes brutas como `.feedback-correct` no `globals.css` são preferíveis para sobrepor o Tailwind quando precisamos forçar propriedades baseadas em lógicas condicionais interativas pesadas dentro dos componentes do jogo.

## 3. Renderização do Radar e Estatísticas
- **Estética Neon**: O mapa (RadarPanel) não deve usar marcações genéricas (como a letra 'X' ou círculos opacos). O feedback visual deve ser pautado no estilo Neon (Onda 🌊 para erro, Mina/Explosão 💥 para acerto parcial, Navio 🚢 para navio afundado), construído através de estilos CSS `textShadow` sobre emojis, ou animações Tailwind `animate-pulse/bounce`.
- **Dinamismo de Placar (Estatísticas do Duelo)**: O componente `FleetStatusPanel` não deve ter valores hardcoded (`0`). O número de acertos (`hits`) e erros (`misses`) deve ser derivado exclusivamente filtrando o tamanho do array `enemyRevealed`. O número de Questões Respondidas deve vir de `hostAnswers`/`guestAnswers` mapeados para o socket. Nunca recalcular ou forçar estado artificial fora do fluxo de dados vindo do backend.
