import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import fs from "fs";
import path from "path";
import * as schema from "../schema/index.js";
import { eq } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/cogniquest";
const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function seed() {
  console.log("Starting CSV seed...");

  // Ensure "math" subject exists
  let mathSubject = await db.query.subjects.findFirst({
    where: eq(schema.subjects.slug, "math")
  });

  if (!mathSubject) {
    console.log("Creating math subject...");
    const [inserted] = await db.insert(schema.subjects).values({
      slug: "math",
      name: "Matemática",
      icon: "/assets/math-icon.svg"
    }).returning();
    mathSubject = inserted;
  }

  const csvPath = path.resolve(process.cwd(), "../../matematica/matematica_completo.csv");
  console.log(`Reading CSV from ${csvPath}...`);
  
  if (!fs.existsSync(csvPath)) {
    console.error("CSV file not found!");
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const lines = csvContent.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  
  // Skip header
  const dataLines = lines.slice(1);
  console.log(`Found ${dataLines.length} questions in CSV. Processing...`);

  const questionsData = [];
  const optionsData = [];

  for (const line of dataLines) {
    // Expected: Faixa_Etaria;Enunciado;Opcao_A;Opcao_B;Opcao_C;Opcao_D;Resposta_Correta
    const [ageBand, prompt, optA, optB, optC, optD, correct] = line.split(";");
    
    if (!prompt || !optA) continue; // Skip malformed lines

    // Generate question ID upfront to link options
    const questionId = crypto.randomUUID();
    
    questionsData.push({
      id: questionId,
      subjectId: mathSubject.id,
      ageBand: ageBand,
      prompt: prompt
    });

    // Determine correct option
    optionsData.push({ questionId, label: optA, isCorrect: correct === "A" });
    optionsData.push({ questionId, label: optB, isCorrect: correct === "B" });
    optionsData.push({ questionId, label: optC, isCorrect: correct === "C" });
    optionsData.push({ questionId, label: optD, isCorrect: correct === "D" });
  }

  // Insert in batches
  const BATCH_SIZE = 500;
  
  for (let i = 0; i < questionsData.length; i += BATCH_SIZE) {
    const qBatch = questionsData.slice(i, i + BATCH_SIZE);
    await db.insert(schema.questions).values(qBatch);
    console.log(`Inserted questions ${i + 1} to ${Math.min(i + BATCH_SIZE, questionsData.length)}`);
  }

  // Options are 4x the questions, batch them too
  const OPT_BATCH_SIZE = 2000;
  for (let i = 0; i < optionsData.length; i += OPT_BATCH_SIZE) {
    const oBatch = optionsData.slice(i, i + OPT_BATCH_SIZE);
    await db.insert(schema.questionOptions).values(oBatch);
    console.log(`Inserted options ${i + 1} to ${Math.min(i + OPT_BATCH_SIZE, optionsData.length)}`);
  }

  console.log("CSV Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Error seeding DB:", err);
  process.exit(1);
});
