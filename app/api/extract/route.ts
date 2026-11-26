import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Reads text out of an uploaded PDF resume. The file is processed in memory and
// never stored or logged; only the extracted text goes back to the browser.
export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 4 * 1024 * 1024;
const MAX_CHARS = 15_000;

export async function POST(request: Request) {
  const limit = checkRateLimit(`extract:${getClientIp(request)}`);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many uploads from this address. Please wait a few minutes." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let file: File | null = null;
  try {
    const form = await request.formData();
    const entry = form.get("file");
    if (entry instanceof File) file = entry;
  } catch {
    return NextResponse.json({ error: "Could not read the upload." }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: "No file received." }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "That file is over 4 MB." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  // A real PDF starts with "%PDF".
  if (bytes.length < 5 || String.fromCharCode(...bytes.slice(0, 4)) !== "%PDF") {
    return NextResponse.json({ error: "That does not look like a PDF file." }, { status: 400 });
  }

  try {
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    const clean = (Array.isArray(text) ? text.join("\n") : text).replace(/[ \t]+\n/g, "\n").trim();
    if (!clean) {
      return NextResponse.json(
        { error: "No selectable text found. Scanned PDFs are not supported; paste the text instead." },
        { status: 422 },
      );
    }
    return NextResponse.json({ text: clean.slice(0, MAX_CHARS) });
  } catch {
    return NextResponse.json(
      { error: "Could not read that PDF. Try pasting the text instead." },
      { status: 422 },
    );
  }
}
