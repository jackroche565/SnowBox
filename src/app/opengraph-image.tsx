import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// The preview shown when a Snowbox link is shared: the wordmark and one line on the snow ground,
// over a mountain ridgeline. Built once at build time.
export const alt = "Snowbox: find the snow, pick your mountain";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const [display, text, ridge] = await Promise.all([
    readFile(join(process.cwd(), "src/assets/fonts/ArchivoCondensed-ExtraBold.ttf")),
    readFile(join(process.cwd(), "src/assets/fonts/Archivo-Regular.ttf")),
    readFile(join(process.cwd(), "public/terrain/green-mountains.jpg")),
  ]);
  const ridgeSrc = `data:image/jpeg;base64,${ridge.toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#f3f5f8", position: "relative" }}>
        <img src={ridgeSrc} alt="" width={1200} height={300} style={{ position: "absolute", left: 0, bottom: 0, width: 1200, height: 300, objectFit: "cover" }} />
        <div style={{ display: "flex", flexDirection: "column", padding: "72px 80px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <svg width="132" height="88" viewBox="0 0 24 16">
              <path d="M0 16 L8 3 L12 9 L16 4 L24 16 Z" fill="#0f1a2a" />
              <path d="M8 3 L10.4 7 L8.6 6.2 L6.8 7.4 Z M16 4 L18 7.2 L16.4 6.6 L14.8 7.3 Z" fill="#f3f5f8" />
            </svg>
            <div style={{ fontFamily: "Archivo Condensed", fontSize: 150, lineHeight: 1, color: "#0f1a2a", letterSpacing: "-0.02em" }}>Snowbox</div>
          </div>
          <div style={{ fontFamily: "Archivo", fontSize: 40, color: "#4b5668", marginTop: 26 }}>Find the snow. Pick your mountain.</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Archivo Condensed", data: display, weight: 800, style: "normal" },
        { name: "Archivo", data: text, weight: 400, style: "normal" },
      ],
    },
  );
}
