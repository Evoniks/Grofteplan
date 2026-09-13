import { readFile } from "fs/promises";
import { join } from "path";

/** Enkel referanse-PNG frå prosjektets public-mappe (portabel, ingen lokale Cursor-stiar). */
export async function GET() {
  const path = join(process.cwd(), "public", "skisse", "trench-box-cross.png");
  try {
    const imageBuffer = await readFile(path);
    return new Response(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600"
      }
    });
  } catch {
    return new Response("Reference image not found", { status: 404 });
  }
}
