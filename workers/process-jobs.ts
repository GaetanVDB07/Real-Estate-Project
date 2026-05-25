import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { processingJobs } from "../src/lib/db/schema";
import { processJob } from "../src/lib/jobs/processor";

async function pollQueuedJobs() {
  const queued = await db
    .select()
    .from(processingJobs)
    .where(eq(processingJobs.status, "queued"));

  for (const job of queued) {
    console.log(`Processing job ${job.id}…`);
    await processJob(job.id);
    console.log(`Job ${job.id} finished.`);
  }
}

async function main() {
  console.log("Job worker started. Polling for queued jobs…");
  await pollQueuedJobs();
  setInterval(pollQueuedJobs, 5000);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
