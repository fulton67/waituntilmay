import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ASSEMBLY_API = "https://api.assemblyai.com/v2";

async function poll(id: string, key: string): Promise<string> {
  for (let i = 0; i < 120; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const res = await fetch(`${ASSEMBLY_API}/transcript/${id}`, {
      headers: { authorization: key },
    });
    const data = await res.json();
    if (data.status === "completed") return data.text ?? "";
    if (data.status === "error") throw new Error(data.error ?? "transcription failed");
  }
  throw new Error("timed out");
}

export async function POST(req: NextRequest) {
  const { url, language_code } = await req.json();
  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) return NextResponse.json({ error: "no api key configured" }, { status: 500 });
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  try {
    const submitRes = await fetch(`${ASSEMBLY_API}/transcript`, {
      method: "POST",
      headers: { authorization: key, "content-type": "application/json" },
      body: JSON.stringify({
        audio_url: url,
        language_code: language_code ?? "en",
        language_detection: !language_code,
      }),
    });
    const submitted = await submitRes.json();
    if (!submitted.id) throw new Error(submitted.error ?? "submit failed");

    const text = await poll(submitted.id, key);
    return NextResponse.json({ text });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
