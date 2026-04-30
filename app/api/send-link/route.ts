import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { to, name, project, link } = await req.json();

  if (!to || !link) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const projectLabel = project === "lunch-bells" ? "lunch bells" : project === "essdee" ? "essdee kid mask" : project;

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM ?? "waituntilmay <onboarding@resend.dev>",
    to,
    subject: `you've gotten access to ${projectLabel} — waituntilmay`,
    html: `
      <div style="font-family: 'Courier New', Courier, monospace; background: #fff; color: #000; padding: 48px 32px; max-width: 480px; margin: 0 auto;">
        <p style="font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #999; margin: 0 0 32px;">waituntilmay</p>

        ${name ? `<p style="font-size: 13px; letter-spacing: 0.1em; margin: 0 0 16px;">${name},</p>` : ""}

        <p style="font-size: 12px; letter-spacing: 0.08em; color: #444; line-height: 1.7; margin: 0 0 32px;">
          you've been given access to <strong>${projectLabel}</strong> — a curated collection of photographic work, formatted for print on 8.5 × 11.
        </p>

        <a href="${link}" style="display: inline-block; border: 1px solid #000; padding: 14px 28px; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #000; text-decoration: none; margin-bottom: 40px;">
          open your page
        </a>

        <p style="font-size: 10px; letter-spacing: 0.1em; color: #bbb; margin: 0;">
          waituntilmay.com
        </p>
      </div>
    `,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
