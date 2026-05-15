import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { helloWorld, runChatAgent } from "@/inngest/functions";
import { NextRequest, NextResponse } from "next/server";

// Allow long-running Inngest steps (the get-sandbox-url step can take ~60 s).
export const maxDuration = 300;
export const runtime = "nodejs";

// Create the base Inngest handlers
const handler = serve({
  client: inngest,
  functions: [helloWorld, runChatAgent],
});

// ---------------------------------------------------------------------------
// Workaround for Next.js 15 + Inngest SDK "Response body object should not
// be disturbed or locked" error.
//
// Root cause: Next.js middleware (Clerk) or the framework itself can consume /
// finalize the Response ReadableStream after the Inngest SDK has already
// written to it, especially after long-running steps (60 s polling).  By
// buffering both the *request* and the *response* body into static
// ArrayBuffers the streams can never be "disturbed" — there are no streams.
// ---------------------------------------------------------------------------

async function bufferRequest(req: NextRequest): Promise<NextRequest> {
  const body = req.method === "GET" || req.method === "HEAD"
    ? null
    : await req.arrayBuffer();
  return new NextRequest(req.url, {
    method: req.method,
    headers: req.headers,
    body,
  });
}

async function bufferResponse(res: Response): Promise<Response> {
  try {
    const body = await res.arrayBuffer();
    return new Response(body, {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    });
  } catch {
    // If the body is already disturbed, return a minimal response with the
    // same status so Inngest can retry cleanly.
    return new Response(null, {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    });
  }
}

export async function GET(req: NextRequest) {
  const res = await handler.GET(await bufferRequest(req));
  return bufferResponse(res);
}

export async function POST(req: NextRequest) {
  const res = await handler.POST(await bufferRequest(req));
  return bufferResponse(res);
}

export async function PUT(req: NextRequest) {
  const res = await handler.PUT(await bufferRequest(req));
  return bufferResponse(res);
}
