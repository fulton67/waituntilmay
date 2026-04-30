import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { name, email, message } = await req.json();

  if (!name || !email || !message) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const id = Date.now().toString();
  const inquiry = { id, name, email, message, createdAt: new Date().toISOString() };

  // Store in KV
  try {
    const { kv } = await import("@vercel/kv");
    await kv.set(`inquiry:${id}`, inquiry);
    await kv.sadd("inquiries", id);
  } catch {
    // KV not configured yet — still send email
  }

  // Notify owner
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.RESEND_FROM ?? "waituntilmay <onboarding@resend.dev>",
      to: "naimjohnson67@gmail.com",
      subject: `new inquiry — ${name}`,
      html: `
        <div style="font-family:'Courier New',Courier,monospace;background:#fff;color:#000;padding:40px 32px;max-width:480px;margin:0 auto;">
          <p style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#999;margin:0 0 24px;">waituntilmay — new inquiry</p>
          <p style="font-size:13px;letter-spacing:0.1em;margin:0 0 8px;"><strong>${name}</strong></p>
          <p style="font-size:12px;letter-spacing:0.08em;color:#666;margin:0 0 24px;">${email}</p>
          <p style="font-size:12px;letter-spacing:0.06em;color:#333;line-height:1.8;margin:0 0 32px;border-left:2px solid #eee;padding-left:16px;">${message}</p>
          <p style="font-size:10px;letter-spacing:0.1em;color:#bbb;">waituntilmay.com/studio</p>
        </div>
      `,
    });
  } catch {
    // email send failed, still return ok
  }

  return NextResponse.json({ ok: true });
}
