import Image from "next/image";
import Link from "next/link";

const PROJECTS = [
  { slug: "essdee",      title: "essdee kid mask", description: "16 images — 8.5 × 11", href: "/essdee" },
  { slug: "lunch-bells", title: "lunch bells",     description: "159 images — 8.5 × 11", href: "/lunch-bells" },
];

export default function ProjectsPage() {
  return (
    <main
      style={{ fontFamily: "'Courier New', Courier, monospace" }}
      className="min-h-screen bg-white text-black flex flex-col items-center justify-center px-6 py-16"
    >
      <div className="flex flex-col items-center gap-12 w-full max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex flex-col items-center gap-5 text-center">
          <Link href="/">
            <Image src="/logo.jpg" alt="waituntilmay" width={80} height={80}
              style={{ objectFit: "contain", cursor: "pointer" }} />
          </Link>
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-xs tracking-widest uppercase">waituntilmay</h1>
            <p className="text-xs tracking-widest text-gray-400 uppercase">collections</p>
          </div>
        </div>

        <div className="w-full border-t border-gray-100" />

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 w-full">
          {PROJECTS.map(p => (
            <Link
              key={p.slug}
              href={p.href}
              className="flex flex-col gap-4 border border-gray-100 hover:border-black transition-colors duration-200 group"
              style={{ padding: "24px 20px" }}
            >
              <div className="flex flex-col gap-2">
                <h2 className="text-xs tracking-widest uppercase group-hover:underline underline-offset-4">
                  {p.title}
                </h2>
                <p style={{ fontSize: 10, letterSpacing: "0.08em", color: "#aaa" }}>{p.description}</p>
              </div>
              <span style={{ fontSize: 10, letterSpacing: "0.1em", color: "#ccc", textTransform: "uppercase", marginTop: "auto" }}>
                view →
              </span>
            </Link>
          ))}
        </div>

        <p style={{ fontSize: 10, letterSpacing: "0.1em", color: "#ddd" }}>waituntilmay.com/projects</p>

      </div>
    </main>
  );
}
