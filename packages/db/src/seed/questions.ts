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

  // ---- Física ----
  { subjectSlug: "physics", ageBand: "6-8", prompt: "O que faz a maçã cair da árvore?", options: ["O vento", "A gravidade", "A luz solar", "A água"], answerIndex: 1 },
  { subjectSlug: "physics", ageBand: "6-8", prompt: "O Sol é uma...", options: ["Estrela", "Planeta", "Cometa", "Lua"], answerIndex: 0 },
  { subjectSlug: "physics", ageBand: "9-11", prompt: "Qual instrumento mede temperatura?", options: ["Barômetro", "Anemômetro", "Termômetro", "Bússola"], answerIndex: 2 },
  { subjectSlug: "physics", ageBand: "9-11", prompt: "A luz viaja mais rápido que o som?", options: ["Sim", "Não", "Têm a mesma velocidade", "Depende do clima"], answerIndex: 0 },
  { subjectSlug: "physics", ageBand: "15+", prompt: "Fórmula da 2ª Lei de Newton?", options: ["F = m·a", "E = m·c²", "V = d/t", "P = m·g"], answerIndex: 0 },
  { subjectSlug: "physics", ageBand: "15+", prompt: "Qual unidade mede a resistência elétrica?", options: ["Volt", "Ampere", "Ohm", "Watt"], answerIndex: 2 },

  // ---- Biologia ----
  { subjectSlug: "biology", ageBand: "6-8", prompt: "Qual gás respiramos para viver?", options: ["Nitrogênio", "Gás carbônico", "Oxigênio", "Hélio"], answerIndex: 2 },
  { subjectSlug: "biology", ageBand: "6-8", prompt: "Como se chama o animal que come plantas?", options: ["Carnívoro", "Herbívoro", "Onívoro", "Insetívoro"], answerIndex: 1 },
  { subjectSlug: "biology", ageBand: "12-14", prompt: "Qual organela faz a respiração celular?", options: ["Ribossomo", "Núcleo", "Mitocôndria", "Golgi"], answerIndex: 2 },
  { subjectSlug: "biology", ageBand: "12-14", prompt: "Quantos cromossomos tem uma célula humana normal?", options: ["23", "46", "48", "44"], answerIndex: 1 },
  { subjectSlug: "biology", ageBand: "15+", prompt: "Quem é o 'Pai da Genética'?", options: ["Darwin", "Mendel", "Pasteur", "Watson"], answerIndex: 1 },
  { subjectSlug: "biology", ageBand: "15+", prompt: "Qual o tipo de sangue é o doador universal?", options: ["A+", "O-", "AB+", "B-"], answerIndex: 1 },

  // ---- Química ----
  { subjectSlug: "chemistry", ageBand: "9-11", prompt: "Qual o símbolo químico da água?", options: ["O2", "H2O", "CO2", "NaCl"], answerIndex: 1 },
  { subjectSlug: "chemistry", ageBand: "9-11", prompt: "Qual elemento respiramos e é representado pela letra O?", options: ["Ouro", "Oxigênio", "Ósmio", "Ozônio"], answerIndex: 1 },
  { subjectSlug: "chemistry", ageBand: "12-14", prompt: "Quantos prótons tem o átomo de carbono?", options: ["4", "6", "8", "12"], answerIndex: 1 },
  { subjectSlug: "chemistry", ageBand: "12-14", prompt: "O sal de cozinha é...", options: ["Cloreto de Sódio", "Dióxido de Carbono", "Ácido Clorídrico", "Sulfato de Cobre"], answerIndex: 0 },
  { subjectSlug: "chemistry", ageBand: "15+", prompt: "pH 7 a 25°C indica solução:", options: ["Ácida", "Básica", "Neutra", "Salina"], answerIndex: 2 },
  { subjectSlug: "chemistry", ageBand: "15+", prompt: "Qual a massa molar aproximada da água (H2O)?", options: ["16 g/mol", "18 g/mol", "20 g/mol", "22 g/mol"], answerIndex: 1 },

  // ---- Português ----
  { subjectSlug: "portuguese", ageBand: "6-8", prompt: "Plural de 'cão':", options: ["Cãos", "Cães", "Cãoes", "Cans"], answerIndex: 1 },
  { subjectSlug: "portuguese", ageBand: "6-8", prompt: "Quantas sílabas tem a palavra 'CACHORRO'?", options: ["2", "3", "4", "5"], answerIndex: 1 },
  { subjectSlug: "portuguese", ageBand: "12-14", prompt: "'Corri rápido' — a palavra 'rápido' é:", options: ["Substantivo", "Adjetivo", "Advérbio", "Verbo"], answerIndex: 2 },
  { subjectSlug: "portuguese", ageBand: "12-14", prompt: "Qual é o antônimo de 'claro'?", options: ["Branco", "Escuro", "Transparente", "Luz"], answerIndex: 1 },
  { subjectSlug: "portuguese", ageBand: "15+", prompt: "Figura de linguagem em 'morri de rir':", options: ["Metáfora", "Hipérbole", "Ironia", "Metonímia"], answerIndex: 1 },
  { subjectSlug: "portuguese", ageBand: "15+", prompt: "O que é um pronome relativo?", options: ["Que", "Meu", "Ele", "Aquele"], answerIndex: 0 },

  // ---- História ----
  { subjectSlug: "history", ageBand: "9-11", prompt: "Em que ano o Brasil foi 'descoberto'?", options: ["1500", "1492", "1822", "1889"], answerIndex: 0 },
  { subjectSlug: "history", ageBand: "9-11", prompt: "Quem descobriu o Brasil?", options: ["Colombo", "Pedro Álvares Cabral", "Vasco da Gama", "Dom Pedro I"], answerIndex: 1 },
  { subjectSlug: "history", ageBand: "12-14", prompt: "A Independência do Brasil ocorreu em:", options: ["1500", "1808", "1822", "1889"], answerIndex: 2 },
  { subjectSlug: "history", ageBand: "12-14", prompt: "Quem proclamou a República no Brasil?", options: ["Dom Pedro II", "Deodoro da Fonseca", "Getúlio Vargas", "Tiradentes"], answerIndex: 1 },
  { subjectSlug: "history", ageBand: "15+", prompt: "A Revolução Francesa começou em:", options: ["1776", "1789", "1815", "1848"], answerIndex: 1 },
  { subjectSlug: "history", ageBand: "15+", prompt: "Qual o motivo principal da Primeira Guerra Mundial?", options: ["A queda do Muro de Berlim", "O assassinato do Arquiduque Francisco Ferdinando", "A invasão da Polônia", "A crise de 1929"], answerIndex: 1 },

  // ---- Geografia ----
  { subjectSlug: "geography", ageBand: "6-8", prompt: "Qual a capital do Brasil?", options: ["Rio de Janeiro", "São Paulo", "Brasília", "Salvador"], answerIndex: 2 },
  { subjectSlug: "geography", ageBand: "6-8", prompt: "O Brasil fica em qual continente?", options: ["Ásia", "Europa", "América", "África"], answerIndex: 2 },
  { subjectSlug: "geography", ageBand: "12-14", prompt: "Qual o maior oceano do mundo?", options: ["Atlântico", "Índico", "Ártico", "Pacífico"], answerIndex: 3 },
  { subjectSlug: "geography", ageBand: "12-14", prompt: "Qual é o menor país do mundo?", options: ["Mônaco", "Vaticano", "San Marino", "Liechtenstein"], answerIndex: 1 },
  { subjectSlug: "geography", ageBand: "15+", prompt: "Qual rio é o mais extenso do mundo?", options: ["Nilo", "Amazonas", "Mississippi", "Yangtzé"], answerIndex: 1 },
  { subjectSlug: "geography", ageBand: "15+", prompt: "Qual é a montanha mais alta do mundo?", options: ["K2", "Kangchenjunga", "Monte Everest", "Lhotse"], answerIndex: 2 },
];
