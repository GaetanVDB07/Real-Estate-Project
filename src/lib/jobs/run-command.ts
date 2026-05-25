import { spawn } from "child_process";

export class CommandError extends Error {
  constructor(
    message: string,
    readonly command: string,
    readonly args: string[],
    readonly stdout: string,
    readonly stderr: string,
    readonly exitCode: number | null
  ) {
    super(message);
    this.name = "CommandError";
  }
}

export function runCommand(
  command: string,
  args: string[],
  options?: { cwd?: string; env?: NodeJS.ProcessEnv; timeoutMs?: number }
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options?.cwd,
      env: { ...process.env, ...options?.env },
      shell: process.platform === "win32",
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timeout = options?.timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          child.kill("SIGTERM");
        }, options.timeoutMs)
      : null;

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      if (timeout) clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      if (timeout) clearTimeout(timeout);

      if (timedOut) {
        reject(
          new CommandError(
            `Command timed out after ${options?.timeoutMs}ms`,
            command,
            args,
            stdout,
            stderr,
            code
          )
        );
        return;
      }

      if (code !== 0) {
        reject(
          new CommandError(
            `Command failed with exit code ${code ?? "unknown"}`,
            command,
            args,
            stdout,
            stderr,
            code
          )
        );
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}

export async function commandExists(name: string): Promise<boolean> {
  const lookup = process.platform === "win32" ? "where" : "which";

  try {
    const { stdout } = await runCommand(lookup, [name], { timeoutMs: 5000 });
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}
