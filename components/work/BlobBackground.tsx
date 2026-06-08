"use client";

const BLOBS = [
  { top: "8%",  left: "12%",  size: 320 },
  { top: "60%", left: "5%",   size: 260 },
  { top: "20%", left: "72%",  size: 400 },
  { top: "75%", left: "60%",  size: 220 },
  { top: "45%", left: "40%",  size: 180 },
  { top: "10%", left: "45%",  size: 150 },
];

export default function BlobBackground() {
  return (
    <>
      {BLOBS.map((b, i) => (
        <div
          key={i}
          className="work-blob"
          style={{
            top: b.top,
            left: b.left,
            width: b.size,
            height: b.size,
          }}
        />
      ))}
    </>
  );
}
