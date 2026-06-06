/**
 * Starter question bank (seed manual). Adapted/expanded from the mock's
 * questionBank. Age bands: '6-8' | '9-11' | '12-14' | '15+'.
 *
 * This is a STARTER set — not every subject×band bucket is full yet. The
 * content team fills the gaps. Keep options at OPTIONS_PER_QUESTION (4).
 */
import type { AgeBand, SubjectSlug } from "@cogniquest/shared";

export interface SeedQuestion {
  subjectSlug: SubjectSlug;
  ageBand: AgeBand;
  prompt: string;
  options: [string, string, string, string];
  answerIndex: 0 | 1 | 2 | 3;
}

export const seedQuestions: SeedQuestion[] = [
  // ---- Matemática ----
  { subjectSlug: "math", ageBand: "6-8", prompt: "Quanto é 8 x 7?", options: ["54", "56", "58", "60"], answerIndex: 1 },
  { subjectSlug: "math", ageBand: "9-11", prompt: "Qual é a raiz quadrada de 144?", options: ["10", "11", "12", "14"], answerIndex: 2 },
  { subjectSlug: "math", ageBand: "12-14", prompt: "Qual o valor de x em 2x + 5 = 15?", options: ["5", "10", "2", "4"], answerIndex: 0 },
  { subjectSlug: "math", ageBand: "15+", prompt: "Qual o valor de log10(1000)?", options: ["1", "2", "3", "10"], answerIndex: 2 },

  // ---- Física ----
  { subjectSlug: "physics", ageBand: "6-8", prompt: "O que faz a maçã cair da árvore?", options: ["O vento", "A gravidade", "A luz solar", "A água"], answerIndex: 1 },
  { subjectSlug: "physics", ageBand: "9-11", prompt: "Qual instrumento mede temperatura?", options: ["Barômetro", "Anemômetro", "Termômetro", "Bússola"], answerIndex: 2 },
  { subjectSlug: "physics", ageBand: "15+", prompt: "Fórmula da 2ª Lei de Newton?", options: ["F = m·a", "E = m·c²", "V = d/t", "P = m·g"], answerIndex: 0 },

  // ---- Biologia ----
  { subjectSlug: "biology", ageBand: "6-8", prompt: "Qual gás respiramos para viver?", options: ["Nitrogênio", "Gás carbônico", "Oxigênio", "Hélio"], answerIndex: 2 },
  { subjectSlug: "biology", ageBand: "12-14", prompt: "Qual organela faz a respiração celular?", options: ["Ribossomo", "Núcleo", "Mitocôndria", "Golgi"], answerIndex: 2 },
  { subjectSlug: "biology", ageBand: "15+", prompt: "Quem é o 'Pai da Genética'?", options: ["Darwin", "Mendel", "Pasteur", "Watson"], answerIndex: 1 },

  // ---- Química ----
  { subjectSlug: "chemistry", ageBand: "9-11", prompt: "Qual o símbolo químico da água?", options: ["O2", "H2O", "CO2", "NaCl"], answerIndex: 1 },
  { subjectSlug: "chemistry", ageBand: "12-14", prompt: "Quantos prótons tem o átomo de carbono?", options: ["4", "6", "8", "12"], answerIndex: 1 },
  { subjectSlug: "chemistry", ageBand: "15+", prompt: "pH 7 a 25°C indica solução:", options: ["Ácida", "Básica", "Neutra", "Salina"], answerIndex: 2 },

  // ---- Português ----
  { subjectSlug: "portuguese", ageBand: "6-8", prompt: "Plural de 'cão':", options: ["Cãos", "Cães", "Cãoes", "Cans"], answerIndex: 1 },
  { subjectSlug: "portuguese", ageBand: "12-14", prompt: "'Corri rápido' — a palavra 'rápido' é:", options: ["Substantivo", "Adjetivo", "Advérbio", "Verbo"], answerIndex: 2 },
  { subjectSlug: "portuguese", ageBand: "15+", prompt: "Figura de linguagem em 'morri de rir':", options: ["Metáfora", "Hipérbole", "Ironia", "Metonímia"], answerIndex: 1 },

  // ---- História ----
  { subjectSlug: "history", ageBand: "9-11", prompt: "Em que ano o Brasil foi 'descoberto'?", options: ["1500", "1492", "1822", "1889"], answerIndex: 0 },
  { subjectSlug: "history", ageBand: "12-14", prompt: "A Independência do Brasil ocorreu em:", options: ["1500", "1808", "1822", "1889"], answerIndex: 2 },
  { subjectSlug: "history", ageBand: "15+", prompt: "A Revolução Francesa começou em:", options: ["1776", "1789", "1815", "1848"], answerIndex: 1 },

  // ---- Geografia ----
  { subjectSlug: "geography", ageBand: "6-8", prompt: "Qual a capital do Brasil?", options: ["Rio de Janeiro", "São Paulo", "Brasília", "Salvador"], answerIndex: 2 },
  { subjectSlug: "geography", ageBand: "12-14", prompt: "Qual o maior oceano do mundo?", options: ["Atlântico", "Índico", "Ártico", "Pacífico"], answerIndex: 3 },
  { subjectSlug: "geography", ageBand: "15+", prompt: "Qual rio é o mais extenso do mundo?", options: ["Nilo", "Amazonas", "Mississippi", "Yangtzé"], answerIndex: 1 },
];
