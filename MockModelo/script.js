// Banco de Questões (Faixa Etária x Matéria)
const questionBank = {
    "7-10": {
        "matematica": [
            { q: "Quanto é 8 x 7?", options: ["54", "56", "58", "60"], answer: 1 },
            { q: "Qual o resultado de 125 + 75?", options: ["190", "200", "210", "220"], answer: 1 },
            { q: "Se João tem 3 caixas de lápis e cada caixa tem 12 lápis, quantos lápis ele tem?", options: ["30", "32", "36", "40"], answer: 2 }
        ],
        "fisica": [
            { q: "O que faz a maçã cair da árvore quando ela se solta?", options: ["O vento", "A gravidade da Terra", "A luz solar", "A pressão da água"], answer: 1 },
            { q: "Qual destes estados da água representa o gelo?", options: ["Gasoso", "Líquido", "Sólido", "Plasma"], answer: 2 },
            { q: "O som se espalha no ar na forma de:", options: ["Ondas", "Luz", "Vento forte", "Partículas sólidas"], answer: 0 }
        ],
        "biologia": [
            { q: "Qual gás os humanos respiram para sobriver?", options: ["Nitrogênio", "Gás Carbônico", "Oxigênio", "Hélio"], answer: 2 },
            { q: "Como as plantas produzem seu próprio alimento?", options: ["Pela respiração", "Pela fotossíntese", "Pela polinização", "Comendo terra"], answer: 1 },
            { q: "Qual é o maior mamífero do planeta?", options: ["Elefante", "Baleia Azul", "Tubarão Baleia", "Girafa"], answer: 1 }
        ]
    },
    "11-14": {
        "matematica": [
            { q: "Qual é a raiz quadrada de 144?", options: ["10", "11", "12", "14"], answer: 2 },
            { q: "Qual o valor de x na equação: 2x + 5 = 15?", options: ["x = 5", "x = 10", "x = 2", "x = 4"], answer: 0 },
            { q: "Qual é a área de um triângulo de base 10cm e altura 6cm?", options: ["60 cm²", "30 cm²", "16 cm²", "20 cm²"], answer: 1 }
        ],
        "fisica": [
            { q: "Qual a velocidade aproximada da luz?", options: ["300.000 km/s", "3.000 km/s", "150.000 km/s", "30.000 km/s"], answer: 0 },
            { q: "Qual instrumento é utilizado para medir a temperatura?", options: ["Barômetro", "Anemômetro", "Termômetro", "Bússola"], answer: 2 },
            { q: "Qual destas é uma fonte de energia renovável?", options: ["Petróleo", "Energia Solar", "Carvão Mineral", "Gás Natural"], answer: 1 }
        ],
        "biologia": [
            { q: "Qual a principal função dos glóbulos vermelhos no sangue?", options: ["Combater vírus", "Transportar oxigênio", "Coagular ferimentos", "Produzir anticorpos"], answer: 1 },
            { q: "Qual organela celular é responsável pela respiração celular?", options: ["Ribossomo", "Núcleo", "Mitocôndria", "Complexo de Golgi"], answer: 2 },
            { q: "Os animais invertebrados caracterizam-se por:", options: ["Ter penas", "Não possuir coluna vertebral", "Ter sangue quente", "Viver apenas na água"], answer: 1 }
        ]
    },
    "15-17": {
        "matematica": [
            { q: "Qual o valor de log10(1000)?", options: ["1", "2", "3", "10"], answer: 2 },
            { q: "Se f(x) = 3x² - 5, qual o valor de f(2)?", options: ["7", "1", "12", "17"], answer: 0 },
            { q: "Qual a probabilidade de tirar um ás em um baralho de 52 cartas?", options: ["1/13", "1/52", "4/13", "1/4"], answer: 0 }
        ],
        "fisica": [
            { q: "De acordo com a Primeira Lei de Newton, um corpo em movimento uniforme tende a:", options: ["Parar após algum tempo", "Continuar em movimento retilíneo uniforme", "Acelerar constantemente", "Mudar de direção espontaneamente"], answer: 1 },
            { q: "Qual a fórmula correta da Segunda Lei de Newton?", options: ["F = m * a", "E = m * c²", "V = d / t", "P = m * g"], answer: 0 },
            { q: "O fenômeno do arco-íris ocorre devido a qual propriedade física da luz?", options: ["Reflexão especular", "Difração extrema", "Dispersão e Refração", "Absorção total"], answer: 2 }
        ],
        "biologia": [
            { q: "Quem é considerado o 'Pai da Genética' por seus estudos com ervilhas?", options: ["Charles Darwin", "Gregor Mendel", "Louis Pasteur", "Watson e Crick"], answer: 1 },
            { q: "Qual a principal diferença entre células procariontes e eucariontes?", options: ["Presença de parede celular", "Presença de material genético", "Presença de carioteca (núcleo delimitado)", "Capacidade de fazer divisão celular"], answer: 2 },
            { q: "O processo de síntese de proteínas a partir do RNA mensageiro é chamado de:", options: ["Transcrição", "Replicação", "Tradução", "Duplicação"], answer: 2 }
        ]
    }
};

// Configuração do Estado Global do Protótipo
let currentAge = "7-10";
let currentSubject = "matematica";
let score = 55;
let level = 14; 
let currentCell = null;
let isSignUpMode = false;

// Estatísticas de Duelo (Pre-populadas como teste)
let totalQuestions = 5;
let correctAnswers = 3;
let incorrectAnswers = 2;

// Estado das células do tabuleiro (0 = oculta, 1 = acerto, 2 = erro)
let boardState = [
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0], // (0,0) é erro (água)
    [0, 0, 1, 0, 0, 0, 0, 0, 0, 0], // (1,2) é acerto (Submarine)
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 1, 0, 0, 0, 0], // (3,5) é acerto (Destroyer)
    [0, 0, 0, 0, 0, 1, 0, 0, 0, 0], // (4,5) é acerto (Destroyer)
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 2, 0, 0, 0, 0, 0, 0, 0], // (6,2) é erro (água)
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
];

// Configurações do Tabuleiro Batalha Naval 10x10
const shipsGrid = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, "s", "s", 0, 0, 0, 0, 0, 0], // Submarine na linha 1, cols 2-3
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, "d", 0, 0, 0, 0], // Destroyer na coluna 5, linhas 3-5
    [0, 0, 0, 0, 0, "d", 0, 0, 0, 0],
    [0, 0, 0, 0, 0, "d", 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, "c", "c", "c", "c"], // Cruiser na linha 8, cols 6-9
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
];

let shipStats = {
    "s": { name: "Submarine", total: 2, hits: 1, elementId: "fleet-sub" },
    "d": { name: "Destroyer", total: 3, hits: 2, elementId: "fleet-dest" },
    "c": { name: "Cruiser", total: 4, hits: 0, elementId: "fleet-cru" }
};

const totalShipSegments = 9;
let hitSegments = 3;

// Seletores DOM de Telas
const screenLogin = document.getElementById("screen-login");
const appLayoutContainer = document.getElementById("app-layout-container");
const screenDashboard = document.getElementById("screen-dashboard");
const screenLobby = document.getElementById("screen-lobby");
const screenCreateRoom = document.getElementById("screen-create-room");
const screenGameplay = document.getElementById("screen-gameplay");

// Notificações
const toastContainer = document.getElementById("toast-container");

// ================= NAVEGAÇÃO ENTRE TELAS (SPA) =================
function showScreen(screenId) {
    // Esconde todas as visualizações internas
    const contents = document.querySelectorAll(".screen-content");
    contents.forEach(c => c.classList.remove("screen-active"));
    
    // Configuração de visibilidade do layout
    if (screenId === "login") {
        screenLogin.classList.add("active-view");
        appLayoutContainer.classList.add("hidden-view");
        appLayoutContainer.classList.remove("active-view");
    } else {
        screenLogin.classList.remove("active-view");
        appLayoutContainer.classList.remove("hidden-view");
        appLayoutContainer.classList.add("active-view");
        
        // Ativa a tela correta
        const targetScreen = document.getElementById(`screen-${screenId}`);
        if (targetScreen) {
            targetScreen.classList.add("screen-active");
        }
    }
    
    // Atualiza links ativos no header
    const navButtons = document.querySelectorAll(".nav-link-btn");
    navButtons.forEach(btn => btn.classList.remove("active"));
    
    if (screenId === "dashboard") {
        document.getElementById("nav-btn-dashboard").classList.add("active");
    } else if (screenId === "lobby" || screenId === "create-room") {
        document.getElementById("nav-btn-lobby").classList.add("active");
    }
}

// Ouvintes de Navegação do Header
document.getElementById("nav-btn-dashboard").addEventListener("click", () => showScreen("dashboard"));
document.getElementById("nav-btn-lobby").addEventListener("click", () => showScreen("lobby"));
document.getElementById("header-logo-click").addEventListener("click", () => showScreen("dashboard"));

// Auxiliar: Toast Notification
function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast-message";
    toast.innerText = message;
    toastContainer.appendChild(toast);
    
    // Remove após terminar animação
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ================= TELA 1: LOGIN / CADASTRO =================
const loginForm = document.getElementById("login-form");
const loginSwitchBtn = document.getElementById("login-switch-btn");
const loginCardTitle = document.getElementById("login-card-title");
const loginCardSubtitle = document.getElementById("login-card-subtitle");
const loginSubmitBtn = document.getElementById("login-submit-btn");
const loginSwitchText = document.getElementById("login-switch-text");

const groupName = document.getElementById("group-name");
const inputName = document.getElementById("signup-name");
const inputEmail = document.getElementById("login-email");

loginSwitchBtn.addEventListener("click", () => {
    isSignUpMode = !isSignUpMode;
    
    if (isSignUpMode) {
        loginCardTitle.innerText = "Criar Nova Conta";
        loginCardSubtitle.innerText = "Inscreva-se para começar a jogar e aprender";
        loginSubmitBtn.innerText = "Cadastrar e Entrar";
        loginSwitchText.innerText = "Já possui uma conta?";
        loginSwitchBtn.innerText = "Fazer Login";
        groupName.classList.remove("hidden-field");
        inputName.required = true;
    } else {
        loginCardTitle.innerText = "Acesse sua Conta";
        loginCardSubtitle.innerText = "Entre na arena do conhecimento gamificado";
        loginSubmitBtn.innerText = "Entrar na Arena";
        loginSwitchText.innerText = "Não tem uma conta?";
        loginSwitchBtn.innerText = "Cadastrar-se";
        groupName.classList.add("hidden-field");
        inputName.required = false;
    }
});

loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    
    const emailValue = inputEmail.value;
    const nameValue = inputName.value || "Sarah J.";
    
    // Atualiza nome do perfil fictício
    document.getElementById("user-profile-name").innerText = isSignUpMode ? nameValue : "Sarah J.";
    document.getElementById("avatar-letter-display").innerText = (isSignUpMode ? nameValue : "Sarah J.").charAt(0).toUpperCase();
    
    showToast(isSignUpMode ? "Conta criada com sucesso! Bem-vindo(a)!" : "Login efetuado com sucesso!");
    showScreen("dashboard");
});

// ================= TELA 2: DASHBOARD (CARROSSEL) =================
const startNavalBtn = document.getElementById("start-naval-btn");

if (startNavalBtn) {
    startNavalBtn.addEventListener("click", () => {
        showScreen("lobby");
    });
}

// ================= TELA 3: FILA DE SALAS =================
const lobbyToCreateBtn = document.getElementById("lobby-to-create-btn");
const roomsListContainer = document.getElementById("rooms-list-container");

lobbyToCreateBtn.addEventListener("click", () => {
    showScreen("create-room");
});

// Delegação de cliques para botões de entrar nas salas
roomsListContainer.addEventListener("click", (e) => {
    if (e.target.classList.contains("join-room-btn")) {
        const roomId = e.target.dataset.roomId;
        let subject = "matematica";
        let age = "11-14";
        
        if (roomId === "1042") {
            subject = "fisica";
            age = "11-14";
        } else if (roomId === "2089") {
            subject = "matematica";
            age = "7-10";
        } else if (roomId === "3041") {
            subject = "biologia";
            age = "15-17";
        }
        
        // Simula conexão
        showToast(`Entrando na Sala #${roomId}...`);
        
        setTimeout(() => {
            currentSubject = subject;
            currentAge = age;
            resetGameState();
            showScreen("gameplay");
            showToast("Partida Iniciada!");
        }, 1000);
    }
});

// ================= TELA 4: CRIAÇÃO DE SALA =================
const createToLobbyBtn = document.getElementById("create-to-lobby-btn");
const generateInviteBtn = document.getElementById("generate-invite-btn");
const launchGameBtn = document.getElementById("launch-game-btn");
const inviteInput = document.getElementById("invite-link-input");

const setupSubjectBtns = document.querySelectorAll("[data-setup-subject]");
const setupAgeBtns = document.querySelectorAll("[data-setup-age]");

let setupSubject = "matematica";
let setupAge = "7-10";

createToLobbyBtn.addEventListener("click", () => {
    showScreen("lobby");
});

// Seleção de Matéria para a Sala
setupSubjectBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        setupSubjectBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        setupSubject = btn.dataset.setupSubject;
    });
});

// Seleção de Idade para a Sala
setupAgeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        setupAgeBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        setupAge = btn.dataset.setupAge;
    });
});

// Gerador de Convite
generateInviteBtn.addEventListener("click", () => {
    const randomId = Math.floor(Math.random() * 9000) + 1000;
    const generatedUrl = `https://cogniquest.com/join/sala-${randomId}`;
    inviteInput.value = generatedUrl;
    
    // Copiar para área de transferência
    navigator.clipboard.writeText(generatedUrl).then(() => {
        showToast("Link de convite copiado para a área de transferência!");
    }).catch(() => {
        showToast("Link gerado com sucesso!");
    });
});

// Lançar Partida a partir do Criar Sala
launchGameBtn.addEventListener("click", () => {
    currentSubject = setupSubject;
    currentAge = setupAge;
    
    showToast("Criando sala pública... Iniciando!");
    
    setTimeout(() => {
        resetGameState();
        showScreen("gameplay");
    }, 1000);
});

// ================= TELA 5: PARTIDA (DEFESA NAVAL) =================
const gridElement = document.getElementById("battleship-grid");
const ageTelemetryEl = document.getElementById("telemetry-age-display");
const subjectTelemetryEl = document.getElementById("telemetry-subject-display");

const gameplayExitBtn = document.getElementById("gameplay-exit-btn");
const gameplayHintBtn = document.getElementById("gameplay-hint-btn");
const gameplayInfoBtn = document.getElementById("gameplay-info-btn");

// Elementos adicionais do Radar e Modal
const statusText = document.getElementById("game-status-text");
const modal = document.getElementById("question-modal");
const questionSubjectEl = document.getElementById("question-subject");
const questionAgeEl = document.getElementById("question-age");
const questionTextEl = document.getElementById("question-text");
const optionsContainer = document.getElementById("options-container");

// Elementos de Estatísticas do Duelo
const statTotalQuestions = document.getElementById("stat-total-questions");
const statCorrectAnswers = document.getElementById("stat-correct-answers");
const statIncorrectAnswers = document.getElementById("stat-incorrect-answers");

// Função para inicializar o estado de teste
function initTestState() {
    hitSegments = 3;
    score = 55;
    totalQuestions = 5;
    correctAnswers = 3;
    incorrectAnswers = 2;

    shipStats.s.hits = 1;
    shipStats.d.hits = 2;
    shipStats.c.hits = 0;

    boardState = [
        [2, 0, 0, 0, 0, 0, 0, 0, 0, 0], // (0,0) é erro (água)
        [0, 0, 1, 0, 0, 0, 0, 0, 0, 0], // (1,2) é acerto (Submarine)
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 0, 0, 0, 0], // (3,5) é acerto (Destroyer)
        [0, 0, 0, 0, 0, 1, 0, 0, 0, 0], // (4,5) é acerto (Destroyer)
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 2, 0, 0, 0, 0, 0, 0, 0], // (6,2) é erro (água)
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ];
}

// Resetar o estado da partida
function resetGameState() {
    initTestState();
    
    // Reseta danos
    Object.keys(shipStats).forEach(key => {
        updateFleetStatusUI(key);
    });
    
    // Atualiza telemetrias
    if (ageTelemetryEl) {
        ageTelemetryEl.innerText = `Idade: ${currentAge === '7-10' ? '7-10 anos' : currentAge === '11-14' ? '11-14 anos' : '15-17 anos'}`;
    }
    if (subjectTelemetryEl) {
        subjectTelemetryEl.innerText = `Matéria: ${currentSubject.charAt(0).toUpperCase() + currentSubject.slice(1)}`;
    }
    if (statusText) {
        statusText.innerText = "Radar Active - Waiting Engagement";
    }

    // Reset stats UI
    if (statTotalQuestions) statTotalQuestions.innerText = totalQuestions;
    if (statCorrectAnswers) statCorrectAnswers.innerText = correctAnswers;
    if (statIncorrectAnswers) statIncorrectAnswers.innerText = incorrectAnswers;
    
    createBoard();
}

// Inicia/cria o tabuleiro 10x10 no DOM
function createBoard() {
    if (!gridElement) return;
    gridElement.innerHTML = "";
    
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
            const cell = document.createElement("button");
            cell.className = "grid-cell";
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.innerText = "·";
            
            // Renderiza estado inicial (Hits e Misses pre-existentes no boardState)
            if (boardState[r][c] === 1) {
                cell.classList.add("hit");
                cell.innerHTML = "💥";
            } else if (boardState[r][c] === 2) {
                cell.classList.add("miss");
                cell.innerHTML = "🌊";
            } else {
                // Adiciona os blips pré-posicionados decorativos do mockup
                if (r === 1 && c === 1) {
                    cell.innerHTML = `
                        <div class="blip-container">
                            <div class="hud-blip-ring"></div>
                            <div class="hud-blip-dot"></div>
                            <span class="hud-blip-label">Base do Jogador</span>
                        </div>
                    `;
                } else if (r === 1 && c === 4) {
                    cell.innerHTML = `
                        <div class="blip-container">
                            <div class="hud-blip-ring"></div>
                            <div class="hud-blip-dot"></div>
                            <span class="hud-blip-label">Alvo 1</span>
                        </div>
                    `;
                } else if (r === 5 && c === 6) {
                    cell.innerHTML = `
                        <div class="blip-container">
                            <div class="hud-blip-ring"></div>
                            <div class="hud-blip-dot"></div>
                            <span class="hud-blip-label">Sinal A</span>
                        </div>
                    `;
                }
            }

            cell.addEventListener("click", () => handleCellClick(cell, r, c));
            gridElement.appendChild(cell);
        }
    }
    
    const userLevelEl = document.getElementById("user-level");
    if (userLevelEl) userLevelEl.innerText = level;
    
    const userScoreEl = document.getElementById("user-score");
    if (userScoreEl) userScoreEl.innerText = score;
}

// Clique em célula do grid
function handleCellClick(cell, r, c) {
    if (cell.classList.contains("hit") || cell.classList.contains("miss")) {
        return; 
    }
    
    currentCell = { cell, row: r, col: c };
    openQuestionModal();
}

// Abrir modal de perguntas
function openQuestionModal() {
    const list = questionBank[currentAge][currentSubject];
    const randomIndex = Math.floor(Math.random() * list.length);
    const questionData = list[randomIndex];
    
    questionSubjectEl.innerText = currentSubject.toUpperCase();
    questionAgeEl.innerText = `${currentAge === '7-10' ? '7-10 anos' : currentAge === '11-14' ? '11-14 anos' : '15-17 anos'}`;
    questionTextEl.innerText = questionData.q;
    
    optionsContainer.innerHTML = "";
    questionData.options.forEach((opt, idx) => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.innerText = opt;
        btn.addEventListener("click", () => handleAnswer(idx, questionData.answer));
        optionsContainer.appendChild(btn);
    });
    
    modal.classList.add("open");
}

// Responder à pergunta
function handleAnswer(selectedIndex, correctIndex) {
    const options = optionsContainer.querySelectorAll(".option-btn");
    options.forEach(opt => opt.style.pointerEvents = "none");
    
    totalQuestions++;
    if (statTotalQuestions) statTotalQuestions.innerText = totalQuestions;
    
    if (selectedIndex === correctIndex) {
        correctAnswers++;
        if (statCorrectAnswers) statCorrectAnswers.innerText = correctAnswers;
        options[selectedIndex].classList.add("correct");
        if (statusText) statusText.innerText = "Resposta correta! Disparando torpedo...";
        
        setTimeout(() => {
            closeModal();
            resolveShot(true);
        }, 1200);
    } else {
        incorrectAnswers++;
        if (statIncorrectAnswers) statIncorrectAnswers.innerText = incorrectAnswers;
        options[selectedIndex].classList.add("incorrect");
        options[correctIndex].classList.add("correct");
        if (statusText) statusText.innerText = "Resposta errada! O disparo falhou.";
        
        setTimeout(() => {
            closeModal();
            resolveShot(false);
        }, 1800);
    }
}

// Resolver o disparo no radar
function resolveShot(wasCorrectAnswer) {
    const { cell, row, col } = currentCell;
    
    if (wasCorrectAnswer) {
        const targetType = shipsGrid[row][col];
        
        if (targetType !== 0) {
            boardState[row][col] = 1;
            cell.classList.add("hit");
            cell.innerHTML = "💥";
            score += 15;
            hitSegments++;
            
            const ship = shipStats[targetType];
            ship.hits++;
            
            updateFleetStatusUI(targetType);
            
            if (statusText) statusText.innerText = `💥 ALVO ATINGIDO! Dano causado no ${ship.name}!`;
            showToast(`Dano no ${ship.name}!`);
            
            if (hitSegments === totalShipSegments) {
                if (statusText) statusText.innerText = "🏆 VITÓRIA! Setor defendido com sucesso!";
                level++;
                const userLevelEl = document.getElementById("user-level");
                if (userLevelEl) userLevelEl.innerText = level;
                score += 100;
                showToast("Vitória! Subiu de nível!");
            }
        } else {
            boardState[row][col] = 2;
            cell.classList.add("miss");
            cell.innerHTML = "🌊";
            score += 5;
            if (statusText) statusText.innerText = "🌊 ÁGUA! Disparo caiu no oceano.";
        }
    } else {
        boardState[row][col] = 2;
        cell.classList.add("miss");
        cell.innerHTML = "✕";
        if (statusText) statusText.innerText = "✕ FALHOU! Radar perdeu contato pelo erro de resposta.";
    }
    
    const userScoreEl = document.getElementById("user-score");
    if (userScoreEl) userScoreEl.innerText = score;
    currentCell = null;
}

// Atualiza UI de status de danos dos barcos na barra lateral
function updateFleetStatusUI(shipType) {
    const ship = shipStats[shipType];
    const itemEl = document.getElementById(ship.elementId);
    if (!itemEl) return;
    
    const statusTextEl = itemEl.querySelector(".fleet-status");
    const progressRing = itemEl.querySelector(".fleet-progress-ring");
    
    if (ship.hits === ship.total) {
        statusTextEl.innerText = "💥 Afundado";
        statusTextEl.className = "fleet-status status-deployed";
        statusTextEl.style.color = "#EF4444";
        progressRing.className = "fleet-progress-ring ring-sunk";
        progressRing.style.borderColor = "#EF4444";
        progressRing.style.transform = "";
    } else {
        statusTextEl.innerText = `${ship.hits}/${ship.total} Danos`;
        statusTextEl.className = "fleet-status status-active";
        statusTextEl.style.color = "#00F0FF";
        const percent = (ship.hits / ship.total) * 360;
        progressRing.style.transform = `rotate(${percent}deg)`;
    }
}

function closeModal() {
    modal.classList.remove("open");
}

// Ações rápidas dos botões de controle dentro da partida
gameplayExitBtn.addEventListener("click", () => {
    showScreen("dashboard");
});

gameplayHintBtn.addEventListener("click", () => {
    showToast("Dica: Destrua o Destroyer localizado na coluna F.");
});

gameplayInfoBtn.addEventListener("click", () => {
    showToast("Objetivo: Encontre todos os 3 navios inimigos escondidos.");
});

// Inicialização Geral com Estado de Teste
initTestState();
createBoard();

// Configura dados de testes na UI ao iniciar
Object.keys(shipStats).forEach(key => {
    updateFleetStatusUI(key);
});
if (statTotalQuestions) statTotalQuestions.innerText = totalQuestions;
if (statCorrectAnswers) statCorrectAnswers.innerText = correctAnswers;
if (statIncorrectAnswers) statIncorrectAnswers.innerText = incorrectAnswers;
