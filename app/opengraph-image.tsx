import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  const imgData = readFileSync(join(process.cwd(), "public", "logo.jpg"));
  const base64 = imgData.toString("base64");

  return new ImageResponse(
    (
      <div
        style={{
          background: "white",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:image/jpeg;base64,${base64}`}
          style={{ width: 280, height: 280, objectFit: "contain" }}
          alt=""
        />
        <div
          style={{
            fontSize: 18,
            color: "#999",
            fontFamily: "monospace",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
          }}
        >
          waituntilmay
        </div>
      </div>
    ),
    { ...size }
  );
}
