import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const dynamic = "force-dynamic";

export interface HomeworkItem {
  id: string;
  title: string;
  course: string;
  dueDate: string;
  status: "pending" | "in-progress" | "done";
  notes: string;
  createdAt: string;
}

export interface McGrawCreds {
  email: string;
  password: string;
}

export async function GET() {
  try {
    const [homework, creds] = await Promise.all([
      kv.get<HomeworkItem[]>("homework_items"),
      kv.get<McGrawCreds>("mcgraw_creds"),
    ]);
    return NextResponse.json({ homework: homework ?? [], creds: creds ?? { email: "", password: "" } });
  } catch {
    return NextResponse.json({ homework: [], creds: { email: "", password: "" } });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;
  try {
    if (action === "save_creds") {
      await kv.set("mcgraw_creds", { email: body.email, password: body.password });
      return NextResponse.json({ ok: true });
    }
    if (action === "add") {
      const existing = (await kv.get<HomeworkItem[]>("homework_items")) ?? [];
      const item: HomeworkItem = { ...body.item, id: Date.now().toString(), createdAt: new Date().toISOString() };
      await kv.set("homework_items", [item, ...existing]);
      return NextResponse.json({ ok: true, item });
    }
    if (action === "update") {
      const existing = (await kv.get<HomeworkItem[]>("homework_items")) ?? [];
      const updated = existing.map((i: HomeworkItem) => i.id === body.item.id ? { ...i, ...body.item } : i);
      await kv.set("homework_items", updated);
      return NextResponse.json({ ok: true });
    }
    if (action === "delete") {
      const existing = (await kv.get<HomeworkItem[]>("homework_items")) ?? [];
      await kv.set("homework_items", existing.filter((i: HomeworkItem) => i.id !== body.id));
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "kv error" }, { status: 500 });
  }
}
