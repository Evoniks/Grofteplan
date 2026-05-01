import { promises as fs } from "fs";

const CANDIDATE_PATHS = [
  "C:\\Users\\mariu\\.cursor\\projects\\c-Users-mariu-OneDrive-Documents-GitHub-Gr-fteplan\\assets\\c__Users_mariu_AppData_Roaming_Cursor_User_workspaceStorage_7f58af6f688e8d03c3ff5ecd710dd4c9_images_image-cc76e9a9-7ae6-4b08-bdf0-41f67590a183.png",
  "C:\\Users\\mariu\\.cursor\\projects\\c-Users-mariu-OneDrive-Documents-GitHub-Gr-fteplan\\assets\\c__Users_mariu_AppData_Roaming_Cursor_User_workspaceStorage_7f58af6f688e8d03c3ff5ecd710dd4c9_images_image-9d914e1e-e977-43ac-bf7e-96d08ad36cc2.png"
];

export async function GET() {
  for (const path of CANDIDATE_PATHS) {
    try {
      const imageBuffer = await fs.readFile(path);
      return new Response(imageBuffer, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "no-store"
        }
      });
    } catch {
      // Try next candidate path.
    }
  }

  return new Response("Reference image not found", { status: 404 });
}

