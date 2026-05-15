import { NextRequest, NextResponse } from "next/server";
import { Sandbox } from "@e2b/code-interpreter";

export const maxDuration = 300;
export const runtime = "nodejs";

const SANDBOX_AUTO_PAUSE_TIMEOUT_MS = 15 * 60 * 1000;

// ---------------------------------------------------------------------------
// Write startup script via sandbox.commands.run only (no sandbox.files API).
// We use printf to write line-by-line — available on every Linux image.
// ---------------------------------------------------------------------------
async function writeAndLaunchNext(sandbox: Sandbox): Promise<void> {
  // Build the script using printf with newline-separated lines
  const writeCmd = [
    `printf '%s\\n' `,
    `'#!/bin/bash' `,
    `'export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin' `,
    `'export HOME=/home/user NODE_ENV=development PORT=3000' `,
    `'cd /home/user' `,
    `'echo "[start-next] begin" >> /tmp/next.log 2>&1' `,
    `'if [ ! -x ./node_modules/.bin/next ]; then' `,
    `'  echo "[start-next] running npm install" >> /tmp/next.log 2>&1' `,
    `'  npm install --prefer-offline >> /tmp/next.log 2>&1 || npm install >> /tmp/next.log 2>&1' `,
    `'fi' `,
    `'echo "[start-next] starting next dev" >> /tmp/next.log 2>&1' `,
    `'exec ./node_modules/.bin/next dev --turbopack -p 3000 >> /tmp/next.log 2>&1' `,
    `> /tmp/start-next.sh && chmod +x /tmp/start-next.sh`,
  ].join("");

  await sandbox.commands.run(writeCmd);

  const verify = await sandbox.commands.run(
    "test -x /tmp/start-next.sh && echo ok || echo fail"
  );
  if (!verify.stdout.includes("ok")) {
    throw new Error("Failed to write /tmp/start-next.sh");
  }

  // Launch detached using node spawn (calls setsid at C level — immune to PTY teardown)
  const launchCmd =
    `node -e "` +
    `var cp=require('child_process'),fs=require('fs'),` +
    `p=cp.spawn('/tmp/start-next.sh',[],` +
    `{detached:true,stdio:'ignore',` +
    `env:Object.assign({},process.env,` +
    `{PATH:'/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',` +
    `HOME:'/home/user',NODE_ENV:'development',PORT:'3000'})});` +
    `p.unref();` +
    `fs.writeFileSync('/tmp/next.pid',''+p.pid);` +
    `fs.appendFileSync('/tmp/next.log','[launcher] pid='+p.pid+'\\n')" `;

  await sandbox.commands.run(launchCmd);
}

async function isNextPidRunning(sandbox: Sandbox): Promise<boolean> {
  try {
    const r = await sandbox.commands.run(
      `bash -c 'if [ -f /tmp/next.pid ] && [ "$(cat /tmp/next.pid)" != "undefined" ] && kill -0 $(cat /tmp/next.pid) 2>/dev/null; then echo RUNNING; else echo NOTRUNNING; fi'`
    );
    return r.stdout.includes("RUNNING");
  } catch {
    return false;
  }
}

async function isNextJsReady(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok && res.status !== 404 && res.status !== 308) return false;
    const text = await res.text();
    return (
      !text.includes("Closed Port Error") &&
      !text.includes("Connection refused") &&
      !text.includes("no service running")
    );
  } catch {
    return false;
  }
}

async function pollForPort(
  url: string,
  maxWaitMs: number,
  pollIntervalMs = 3_000
): Promise<boolean> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    if (await isNextJsReady(url)) return true;
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  return false;
}

async function readNextLog(sandbox: Sandbox, tail = 4000): Promise<string> {
  try {
    const r = await sandbox.commands.run(
      `bash -c 'tail -c ${tail} /tmp/next.log 2>/dev/null; echo "---diag---"; ` +
        `echo "next_bin=$([ -x /home/user/node_modules/.bin/next ] && echo yes || echo no)"; ` +
        `echo "pid_file=$([ -f /tmp/next.pid ] && cat /tmp/next.pid || echo missing)"; ` +
        `echo "pid_alive=$([ -f /tmp/next.pid ] && kill -0 $(cat /tmp/next.pid) 2>/dev/null && echo yes || echo no)"; ` +
        `echo "script=$([ -x /tmp/start-next.sh ] && echo exists || echo missing)"' `
    );
    return r.stdout.trim() || "(no log)";
  } catch {
    return "(unable to read log)";
  }
}

export async function POST(request: NextRequest) {
  try {
    const { sandboxId } = await request.json();
    if (!sandboxId) {
      return NextResponse.json({ error: "sandboxId is required" }, { status: 400 });
    }

    const sandbox = await Sandbox.connect(sandboxId, {
      timeoutMs: SANDBOX_AUTO_PAUSE_TIMEOUT_MS,
    });

    const host = sandbox.getHost(3000);
    const sandboxUrl = `https://${host}`;

    // Fast path: already serving
    if (await pollForPort(sandboxUrl, 15_000, 2_000)) {
      return NextResponse.json({ success: true, sandboxId: sandbox.sandboxId, sandboxUrl });
    }

    // Check project exists
    let hasProject = false;
    try {
      const chk = await sandbox.commands.run(
        "test -f /home/user/package.json && echo yes || echo no"
      );
      hasProject = chk.stdout.trim() === "yes";
    } catch {
      hasProject = true;
    }

    if (!hasProject) {
      return NextResponse.json(
        {
          error: "No Next.js project found. Please start a new conversation to regenerate.",
          noProject: true,
        },
        { status: 422 }
      );
    }

    const nextRunning = await isNextPidRunning(sandbox);

    if (!nextRunning) {
      try {
        await writeAndLaunchNext(sandbox);
        console.log(`[sandbox-resume] launched start-next.sh for ${sandboxId}`);
      } catch (err) {
        console.error(`[sandbox-resume] writeAndLaunchNext failed for ${sandboxId}:`, err);
      }

      // Default to true — if the check throws, safest to assume install is needed
      let needsInstall = true;
      try {
        const bc = await sandbox.commands.run(
          "test -x /home/user/node_modules/.bin/next && echo ok || echo missing"
        );
        needsInstall = bc.stdout.trim() !== "ok";
      } catch {
        needsInstall = true;
      }

      if (needsInstall) {
        console.log(
          `[sandbox-resume] node_modules missing for ${sandboxId}, returning warming`
        );
        return NextResponse.json({
          success: true,
          sandboxId: sandbox.sandboxId,
          sandboxUrl,
          warming: true,
        });
      }
    }

    // Poll up to 90s for Next.js to respond
    const ready = await pollForPort(sandboxUrl, 90_000, 3_000);
    if (!ready) {
      const log = await readNextLog(sandbox);
      console.error(
        `[sandbox-resume] Next.js failed to start for ${sandboxId}. Log:\n${log}`
      );
      return NextResponse.json({
        success: true,
        sandboxId: sandbox.sandboxId,
        sandboxUrl,
        warming: true,
        log,
      });
    }

    return NextResponse.json({ success: true, sandboxId: sandbox.sandboxId, sandboxUrl });
  } catch (error) {
    console.error("Failed to resume sandbox:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    const isNotFound = msg.includes("not found") || msg.includes("does not exist");
    return NextResponse.json(
      {
        error: isNotFound
          ? "Sandbox session expired or not found"
          : "Failed to resume sandbox",
        details: msg,
        expired: isNotFound,
      },
      { status: isNotFound ? 404 : 500 }
    );
  }
}