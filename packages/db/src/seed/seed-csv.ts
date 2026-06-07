import { getDb } from "../index.js";
import { questions, questionOptions, subjects } from "../schema/index.js";
import * as crypto from "crypto";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

async function main() {
  const db = getDb();
  
  // Get math subject
  const mathSubject = await db.query.subjects.findFirst({
    where: eq(subjects.slug, "math")
  });

  if (!mathSubject) {
    throw new Error("Math subject not found in DB!");
  }

  const csvPath = path.resolve(process.cwd(), "../../matematica/matematica_series.csv");
  console.log(`Reading from: ${csvPath}`);

  const fileStream = fs.createReadStream(csvPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let isFirstLine = true;
  let batchQuestions = [];
  let batchOptions = [];
  let count = 0;

  for await (const line of rl) {
    if (isFirstLine) {
      isFirstLine = false;
      continue;
    }

    const parts = line.split(";");
    if (parts.length < 7) continue;

    const [grade, prompt, optA, optB, optC, optD, correct] = parts;
    const answerIndex = correct === 'A' ? 0 : correct === 'B' ? 1 : correct === 'C' ? 2 : correct === 'D' ? 3 : 0;
    
    const questionId = crypto.randomUUID();
    batchQuestions.push({
      id: questionId,
      subjectId: mathSubject.id,
      grade: grade as any,
      prompt: prompt
    });

    const optionsStr = [optA, optB, optC, optD];
    optionsStr.forEach((optStr, idx) => {
      batchOptions.push({
        id: crypto.randomUUID(),
        questionId: questionId,
        label: optStr,
        isCorrect: idx === answerIndex
      });
    });

    count++;

    // Insert in batches of 100 questions to avoid memory/query limits
    if (batchQuestions.length >= 100) {
      await db.insert(questions).values(batchQuestions);
      await db.insert(questionOptions).values(batchOptions);
      console.log(`Inserted ${count} questions so far...`);
      batchQuestions = [];
      batchOptions = [];
    }
  }

  // Insert remaining
  if (batchQuestions.length > 0) {
    await db.insert(questions).values(batchQuestions);
    await db.insert(questionOptions).values(batchOptions);
    console.log(`Inserted ${count} questions in total!`);
  }

  console.log("Done.");
  process.exit(0);
}

main().catch(console.error);
