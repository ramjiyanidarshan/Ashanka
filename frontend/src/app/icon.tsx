import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import path from "path";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  const svg = readFileSync(path.join(process.cwd(), "src/logo.svg"), "utf-8");
  const b64 = Buffer.from(svg).toString("base64");

  return new ImageResponse(
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`data:image/svg+xml;base64,${b64}`}
      width={32}
      height={32}
      alt="Veshtit"
    />,
    { width: 32, height: 32 }
  );
}
