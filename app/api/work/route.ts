import { NextRequest, NextResponse } from "next/server";
import { put, list } from "@vercel/blob";

export const dynamic = "force-dynamic";

const DATA_PATH = "data/work.json";

export interface WorkItem {
  id: string;
  title: string;
  role: string;
  year: string;
  category: "clothing-production" | "movies-video" | "fine-arts" | "consulting";
  visible: boolean;
  image?: string;
  images?: string[];
  video?: string;
  preface?: boolean;
  bio?: string;
  context?: string;
  sold?: boolean;
  slug?: string;
  listed?: boolean;
}

export function makeSlug(item: WorkItem): string {
  if (item.slug) return item.slug;
  const base = item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return base ? `${base}-${item.id}` : item.id;
}

const img = (hash: string, file: string) =>
  `https://freight.cargo.site/w/1000/i/${hash}/${file}`;

const DEFAULT_ITEMS: WorkItem[] = [
  // ── clothing production ────────────────────────────────────────────────────
  { id: "1",  title: "Hollywood Bounty Matt Ox Casting",            role: "production & casting",                              year: "2022", category: "clothing-production", visible: true, image: img("X2777014219218667061526092914703", "IMG_7536.jpg") },
  { id: "2",  title: "Animation & Score Production",                 role: "production",                                        year: "2024", category: "clothing-production", visible: true, video: "https://freight.cargo.site/i/Q2777014219310900781894955672783/MMA-short.MOV" },
  { id: "3",  title: "Lazerdim Atlanta Concert Merch",               role: "merch production",                                  year: "2024", category: "clothing-production", visible: true, image: img("N2777044489846076672984161428687", "IMG_3378.jpg") },
  { id: "3b", title: "Country Artist Lazerdim in Said Merch",        role: "",                                                  year: "2024", category: "clothing-production", visible: true, image: img("K2777044408735742980883262973135", "IMG_3377.jpg") },
  { id: "4",  title: "6Supreme Concept Graphic",                     role: "graphic design",                                    year: "2023", category: "clothing-production", visible: true, image: img("O2777042011673584322695578232015", "IMG_2570.JPG") },
  { id: "5",  title: "Hollywood Bounty",                             role: "production logistics & manufacturing",               year: "",     category: "clothing-production", visible: true, image: img("O2777014219200220317452698363087", "IMG_7519.jpg") },
  { id: "6",  title: "Great4life",                                   role: "production, casting, location scout & coordinator", year: "2024", category: "clothing-production", visible: true, image: img("H2777025075478042576998015411407", "CleanShot-2026-02-03-at-04.27.042x.png") },
  { id: "7",  title: "Coffeys",                                      role: "casting & production",                              year: "2025", category: "clothing-production", visible: true, image: img("K2777044101173179039923908879567", "IMG_3380.jpg") },
  { id: "8",  title: "Waituntilmay Bespoke Twitter Shoe Commission", role: "Shelly, Fewture, Diego",                            year: "2024", category: "clothing-production", visible: true, image: img("I2777050745985542295283753788623", "IMG_0610.JPEG") },
  // ── movies & video ─────────────────────────────────────────────────────────
  { id: "9",  title: "Europa Gallery — Brandon Morris Dresses",      role: "direction & production",                            year: "2025", category: "movies-video",        visible: true, video: "https://freight.cargo.site/i/J2777072704122690667669648549071/INHALE_PROMO.MOV" },
  { id: "10", title: "YN SHIT by Noon",                              role: "styling & location scout",                          year: "",     category: "movies-video",        visible: true, video: "https://freight.cargo.site/i/B2777023214957882046726348973263/d8bf0f0ca67f4560a93a874cf88b2ea0.MOV" },
  // ── fine arts ──────────────────────────────────────────────────────────────
  {
    id: "boli", slug: "boli",
    title: "Boli", role: "", year: "2026",
    category: "fine-arts", visible: true, sold: true,
    images: [],
    context: "A boli is a type of Bamana power object, an object charged with spiritual energy that can affect human life. The primary function of a boli is to accumulate and control the naturally occurring life force called nyama for the spiritual benefit of the community. The composition of the encrusted patina varies, but all the ingredients possess this inherent and important spiritual energy. A boli can be created with images.",
  },
  {
    id: "pobrane", slug: "pobrane",
    title: "Pobrane", role: "", year: "2026",
    category: "fine-arts", visible: true, sold: true,
    images: [],
    context: "Pobrane is a Polish word meaning downloaded, taken, or collected.",
  },
  { id: "fa1",  title: "Homogeny pt. 1 and 2",                             role: "", year: "2026", category: "fine-arts", visible: true, image: img("G2776540655308697249529089991887", "book-2-main_Page_08.jpg") },
  { id: "fa2",  title: "Untitled pt. 1 and 2",                             role: "", year: "",     category: "fine-arts", visible: true, image: img("M2776540655271803761381670888655", "book-2-main_Page_06.jpg") },
  { id: "fa4",  title: "Screen Poem",                                      role: "", year: "",     category: "fine-arts", visible: true, image: "https://freight.cargo.site/w/1000/i/N2776538228510387144521608045775/burn_this_image_into_the_screen_1e0d200e-7448-4078-adc2-c7eb54d644de.jpeg" },
  { id: "fa6",  title: "Fractalization on Mars, A Critique on Fiction",    role: "", year: "2026", category: "fine-arts", visible: true, image: img("O2776538149226281115717955200207", "aply_these_textures_to_the_silks.jpeg") },
  { id: "fa7",  title: "They Can't Grow Because They Are Tied by the Bow", role: "", year: "2024", category: "fine-arts", visible: true, image: img("M2777014219126433341157860156623", "CleanShot-2024-01-20-at-21.39.512x.JPEG") },
  { id: "fa8",  title: "Black Sand Beach / San Francisco Texture Studio",  role: "", year: "2026", category: "fine-arts", visible: true, image: img("N2777056088789815340076026537167", "CleanShot-2026-02-03-at-04.54.182x.png") },
  { id: "fa9",  title: "Wood Sculpture",                                   role: "", year: "2025", category: "fine-arts", visible: true, image: img("Z2777047179086214714657434215631", "CleanShot-2026-02-03-at-04.46.172x.png") },
  { id: "fa10", title: "Untitled",                                         role: "", year: "",     category: "fine-arts", visible: true, image: img("C2776540655327143993602799543503", "book-2-main_Page_09.jpg") },
  { id: "fa11", title: "Untitled",                                         role: "", year: "",     category: "fine-arts", visible: true, image: img("M2776540655290250505455380440271", "book-2-main_Page_07.jpg") },
  { id: "fa12", title: "Untitled",                                         role: "", year: "",     category: "fine-arts", visible: true, image: img("L2776540655234910273234251785423", "book-2-main_Page_03.jpg") },
  { id: "fa13", title: "Untitled",                                         role: "", year: "",     category: "fine-arts", visible: true, image: img("K2776540655216463529160542233807", "book-2-main_Page_02.jpg") },
  { id: "fa14", title: "Untitled",                                         role: "", year: "",     category: "fine-arts", visible: true, image: img("J2777044007131677752152614741199", "IMG_3379.jpg") },
  { id: "fa15", title: "Untitled",                                         role: "", year: "",     category: "fine-arts", visible: true, image: img("G2777051306508307719022189192399", "IMG_3381.jpg") },
  // ── consulting ─────────────────────────────────────────────────────────────
  { id: "c1",  title: "Post Modern Essay on Estrangement on Names",  role: "consulting",  year: "2025", category: "consulting", visible: true, image: img("G2776538276508815224313861350607", "Copy-of-Instructions-.png"), preface: true },
  { id: "c2",  title: "Peak NYU Ad Campaign",                        role: "consulting",  year: "2026", category: "consulting", visible: true, image: "https://freight.cargo.site/w/1000/i/H2776538801816746211340762719439/make_this_image_wheat_pasted_on_the_wall_aefd6b78-0a61-4b25-adf9-c03b3c50ca60.jpeg" },
  { id: "c3",  title: "Shelly",                                      role: "consulting",  year: "",     category: "consulting", visible: true },
  { id: "c4",  title: "X",                                           role: "consulting",  year: "",     category: "consulting", visible: true },
];

async function readItems(): Promise<WorkItem[]> {
  try {
    const { blobs } = await list({ prefix: DATA_PATH, limit: 1 });
    if (blobs.length === 0) return DEFAULT_ITEMS;
    const res = await fetch(blobs[0].url, { cache: "no-store" });
    return res.json();
  } catch {
    return DEFAULT_ITEMS;
  }
}

async function writeItems(items: WorkItem[]): Promise<void> {
  await put(DATA_PATH, JSON.stringify(items), {
    access: "public",
    contentType: "application/json",
    allowOverwrite: true,
  });
}

export async function GET() {
  const items = await readItems();
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, items, item } = body;
  try {
    if (action === "save_all") {
      await writeItems(items);
      return NextResponse.json({ ok: true });
    }
    if (action === "add") {
      const current = await readItems();
      const newItem: WorkItem = { ...item, id: Date.now().toString() };
      await writeItems([...current, newItem]);
      return NextResponse.json({ ok: true, item: newItem });
    }
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
