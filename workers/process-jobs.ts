import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { processingJobs } from "../src/lib/db/schema";
import { getWorkerMode, gpuToolsAvailable } from "../src/lib/jobs/splat-pipeline";
import { processJob } from "../src/lib/jobs/processor";

let isProcessing = false;

async function pollQueuedJobs() {
  if (isProcessing) {
    return;
  }

  const queued = await db
    .select()
    .from(processingJobs)
    .where(eq(processingJobs.status, "queued"))
    .limit(1);

  if (queued.length === 0) {
    return;
  }

  isProcessing = true;

  try {
    for (const job of queued) {
      console.log(`Processing job ${job.id}…`);
      await processJob(job.id);
      console.log(`Job ${job.id} finished.`);
    }
  } finally {
    isProcessing = false;
  }
}

async function main() {
  const mode = getWorkerMode();
  const gpuReady = mode === "gpu" || mode === "auto" ? await gpuToolsAvailable() : false;

  console.log(`Job worker started (mode=${mode}${gpuReady ? ", gpu tools detected" : ""}).`);
  console.log("Polling for queued jobs…");

  await pollQueuedJobs();
  setInterval(pollQueuedJobs, 5000);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
