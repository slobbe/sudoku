import { generatePuzzleCandidate } from "../src/index.ts";

const sampleCount = Number.parseInt(process.argv[2] ?? "300", 10);
const samples = Number.isFinite(sampleCount) && sampleCount > 0 ? sampleCount : 300;

const hints = ["easy", "medium", "hard", "expert"];

for (const hint of hints) {
  const byDifficulty = {
    easy: 0,
    medium: 0,
    hard: 0,
    expert: 0,
  };

  const scores = [];
  let unsolvedByTechniques = 0;

  for (let index = 0; index < samples; index += 1) {
    const candidate = generatePuzzleCandidate(hint);
    byDifficulty[candidate.difficulty] += 1;
    scores.push(candidate.score);
    if (!candidate.solvedByTechniques) {
      unsolvedByTechniques += 1;
    }
  }

  scores.sort((left, right) => left - right);
  const percentile = (value) => scores[Math.floor((scores.length - 1) * value)] ?? 0;

  console.log(`\nHint: ${hint}`);
  console.log("Distribution:", byDifficulty);
  console.log(
    "Scores:",
    {
      min: scores[0] ?? 0,
      p25: percentile(0.25),
      p50: percentile(0.5),
      p75: percentile(0.75),
      p90: percentile(0.9),
      max: scores[scores.length - 1] ?? 0,
      unsolvedByTechniques,
    },
  );
}
