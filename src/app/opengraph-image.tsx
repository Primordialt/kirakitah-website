import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const alt = "KIRAKITAH";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

/**
 * Default Open Graph image using the purple KIRAKITAH mark.
 * Avoids white logo assets that disappear on light social-preview backgrounds.
 */
export default async function OpenGraphImage() {
  const logoBytes = await readFile(
    join(process.cwd(), "public", "brand", "logo-mark.png"),
  );
  const logoSrc = `data:image/png;base64,${logoBytes.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#F7F5FB",
        }}
      >
        <img src={logoSrc} width={280} height={280} alt="" />
        <div
          style={{
            marginTop: 32,
            fontSize: 56,
            fontWeight: 700,
            letterSpacing: 4,
            color: "#40217C",
          }}
        >
          KIRAKITAH
        </div>
      </div>
    ),
    { ...size },
  );
}
