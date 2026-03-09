"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Layers,
  Download,
  Heart,
  Users,
  ChevronRight,
  Check,
  Scissors,
  Palette,
  Grid3X3,
} from "lucide-react";
import PatchworkPreview from "@/components/patchwork-preview";

// ─── Nav ───────────────────────────────────────────────────────────────────
function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FAFAF8]/90 backdrop-blur-md border-b border-[#E7E5E4]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid grid-cols-3 gap-0.5 w-7 h-7">
            {["#C2683A","#E8C9B0","#C2683A","#E8C9B0","#C2683A","#E8C9B0","#C2683A","#E8C9B0","#C2683A"].map(
              (c, i) => (
                <div key={i} className="rounded-[1px]" style={{ backgroundColor: c }} />
              )
            )}
          </div>
          <span className="font-semibold text-[#1C1917] text-lg tracking-tight">Patchwork</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-[#78716C] hover:text-[#1C1917] transition-colors">Features</a>
          <a href="#pricing" className="text-sm text-[#78716C] hover:text-[#1C1917] transition-colors">Pricing</a>
          <a href="#gallery" className="text-sm text-[#78716C] hover:text-[#1C1917] transition-colors">Gallery</a>
        </div>

        <div className="flex items-center gap-3">
          <button className="text-sm text-[#78716C] hover:text-[#1C1917] transition-colors px-3 py-1.5 cursor-pointer">Sign in</button>
          <Link href="/studio" className="bg-[#C2683A] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#9A4F28] transition-colors cursor-pointer">
            Get started free
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ───────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 bg-[#F5E6DC] text-[#C2683A] text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <Sparkles size={12} />
            Infinite patterns. Your fabrics. Your vision.
          </div>

          <h1 className="text-5xl lg:text-6xl font-bold text-[#1C1917] leading-[1.1] tracking-tight mb-6">
            Patchwork patterns<br />designed by you.<br />
            Play with blocks, color, and scale —<br />
            <span className="text-[#C2683A]">before you cut into your fabric.</span>
          </h1>

          <p className="text-lg text-[#78716C] leading-relaxed mb-8 max-w-md">
            For quilters of every skill level. Designed for charm squares,
            layer cakes, jelly rolls, and fat quarters — or whatever&apos;s in your stash.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/studio" className="bg-[#C2683A] text-white font-semibold px-6 py-3.5 rounded-xl hover:bg-[#9A4F28] transition-colors flex items-center justify-center gap-2 cursor-pointer">
              Start designing free
              <ChevronRight size={16} />
            </Link>
            <a href="#how-it-works" className="border border-[#E7E5E4] text-[#1C1917] font-medium px-6 py-3.5 rounded-xl hover:border-[#C2683A] hover:text-[#C2683A] transition-colors cursor-pointer flex items-center justify-center">
              See how it works
            </a>
          </div>

          <p className="text-xs text-[#A8A29E] mt-4">Free forever · No credit card required</p>
        </div>

        <div>
          <PatchworkPreview />
        </div>
      </div>
    </section>
  );
}

// ─── Features ───────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Sparkles,
    title: "Endless pattern generation",
    description:
      "Play with classic blocks and timeless patchwork styles — scrappy, gingham, granny square, ombré, and more. Tweak colors, scale, and variations until it feels exactly right. Every combination is unique.",
  },
  {
    icon: Palette,
    title: "Design with your actual fabrics",
    description:
      "Photograph your fabric stash and drop those exact colors into any pattern. Browse hundreds of solids from Kona, Bella, Art Gallery, Confetti Cotton, and Ruby Star Society.",
  },
  {
    icon: Scissors,
    title: "Cut with confidence",
    description:
      "Tell us your square size — 5\" charm, 2.5\" mini, 10\" layer cake, fat quarters, jelly rolls, or custom — and get a precise cutting guide with WOF strips and yardage for every fabric.",
  },
  {
    icon: Grid3X3,
    title: "Plan the whole quilt",
    description:
      "Design your quilt top, then add borders, backing (including wideback options), and binding. See yardage requirements for every element before you touch your scissors.",
  },
  {
    icon: Layers,
    title: "Visualize your quilting",
    description:
      "Overlay straight-line, grid, or diagonal quilting designs on your pattern to see how the finished piece will look — before you commit to a single stitch.",
  },
  {
    icon: Download,
    title: "Export & print",
    description:
      "Generate a beautiful, print-ready PDF with your complete pattern, cutting instructions, and yardage breakdown. Everything you need to walk to your cutting mat.",
  },
];

function Features() {
  return (
    <section id="features" className="py-20 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-[#1C1917] tracking-tight mb-4">
            Everything a patchwork quilter needs
          </h2>
          <p className="text-[#78716C] text-lg max-w-xl mx-auto">
            From first spark of inspiration to final cutting guide — all in one clean, simple tool.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map((f) => (
            <div key={f.title} className="group">
              <div className="w-10 h-10 bg-[#F5E6DC] rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#C2683A] transition-colors">
                <f.icon size={18} className="text-[#C2683A] group-hover:text-white transition-colors" />
              </div>
              <h3 className="font-semibold text-[#1C1917] mb-2">{f.title}</h3>
              <p className="text-[#78716C] text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Styles showcase ─────────────────────────────────────────────────────────
const STYLES = [
  "Checkered","Gingham","Plaid / Tartan","Scrappy","Granny Square",
  "Pixel Art","Ombré / Gradient","Diagonal","Medallion","Striped",
  "Log Cabin","Concentric Squares","Pinwheel-Free","Diamonds",
];

function StylesShowcase() {
  return (
    <section className="py-20 px-6 bg-[#FAFAF8]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-[#1C1917] tracking-tight mb-4">
            The style is endless.
          </h2>
          <p className="text-[#78716C] text-lg max-w-xl mx-auto">
            Patchwork celebrates the timeless art of squares-based design.
            No triangles. No flying geese. Just classic, meditative patchwork — in every color and scale imaginable.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 justify-center">
          {STYLES.map((s) => (
            <span
              key={s}
              className="px-4 py-2 bg-white border border-[#E7E5E4] rounded-full text-sm text-[#78716C] font-medium hover:border-[#C2683A] hover:text-[#C2683A] transition-colors cursor-default"
            >
              {s}
            </span>
          ))}
          <span className="px-4 py-2 bg-[#F5E6DC] border border-[#C2683A] rounded-full text-sm text-[#C2683A] font-medium">
            + so much more…
          </span>
        </div>
      </div>
    </section>
  );
}

// ─── How it works ────────────────────────────────────────────────────────────
const STEPS = [
  {
    num: "01",
    title: "Pick a mood & style",
    desc: "Choose from moods like Cozy Warm or Bold & Dramatic, and styles like Scandinavian, Americana, or Scrappy. Patchwork generates a unique pattern instantly.",
  },
  {
    num: "02",
    title: "Make it yours",
    desc: "Swap in colors from Kona, Bella, or your own fabric stash. Change the square size, adjust the grid, and watch your quilt come to life in real time.",
  },
  {
    num: "03",
    title: "Plan the whole quilt",
    desc: "Add borders, choose your backing (wideback or pieced), and select your binding fabric. See full yardage and WOF strip requirements automatically calculated.",
  },
  {
    num: "04",
    title: "Cut with confidence",
    desc: "Export a print-ready PDF with your complete pattern, cutting guide, and fabric breakdown. Walk to your cutting mat knowing exactly what to do.",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-[#1C1917] tracking-tight mb-4">
            From inspiration to cutting mat
          </h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {STEPS.map((s, i) => (
            <div key={s.num} className="relative">
              {i < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-6 left-full w-full h-px bg-[#E7E5E4] z-0" />
              )}
              <div className="relative z-10">
                <div className="text-3xl font-bold text-[#E7E5E4] mb-3">{s.num}</div>
                <h3 className="font-semibold text-[#1C1917] mb-2">{s.title}</h3>
                <p className="text-[#78716C] text-sm leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Community gallery teaser ─────────────────────────────────────────────
const GALLERY_PALETTES = [
  ["#E8DDD0","#C4B5A0","#8B9EA8","#5C7A8C","#3D5A6B","#E8DDD0","#C4B5A0","#8B9EA8"],
  ["#C41E3A","#F5F5F0","#002868","#C41E3A","#F5F5F0","#002868","#C41E3A","#F5F5F0"],
  ["#E8A87C","#9DBEBB","#4A7C59","#F7DB6A","#C94B4B","#7B68EE","#F0E4D4","#8FBC8F"],
  ["#2C2C2C","#E8E8E8","#C2683A","#2C2C2C","#E8E8E8","#C2683A","#2C2C2C","#E8E8E8"],
  ["#D4B5B0","#E8C9C5","#C4856A","#A0624A","#8B4A35","#F0E0D8","#D8A898","#B87A6A"],
];

function GalleryTeaser() {
  return (
    <section id="gallery" className="py-20 px-6 bg-[#FAFAF8]">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#F5E6DC] text-[#C2683A] text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <Users size={12} />
              Community Gallery
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-[#1C1917] tracking-tight mb-4">
              Discover. Save.<br />Share your work.
            </h2>
            <p className="text-[#78716C] text-lg leading-relaxed mb-6">
              Browse an ever-growing library of patterns created and shared by the
              Patchwork community. No recycled Pinterest boards — every pattern is unique,
              generated and curated by real quilters.
            </p>
            <button className="flex items-center gap-2 text-[#C2683A] font-semibold hover:gap-3 transition-all cursor-pointer">
              Browse the gallery <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {GALLERY_PALETTES.slice(0, 5).map((palette, pi) => (
              <div
                key={pi}
                className={`rounded-xl overflow-hidden shadow-md border border-black/5 aspect-square ${pi === 4 ? "col-span-1" : ""}`}
              >
                <div
                  className="w-full h-full"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gridTemplateRows: "repeat(4, 1fr)",
                    gap: "1px",
                    backgroundColor: "#E7E5E4",
                    padding: "1px",
                  }}
                >
                  {Array.from({ length: 16 }, (_, i) => (
                    <div key={i} style={{ backgroundColor: palette[i % palette.length] }} />
                  ))}
                </div>
              </div>
            ))}
            <div className="rounded-xl border-2 border-dashed border-[#E7E5E4] aspect-square flex items-center justify-center group hover:border-[#C2683A] transition-colors cursor-pointer">
              <div className="text-center">
                <Heart size={20} className="text-[#D6D3D1] group-hover:text-[#C2683A] mx-auto mb-1 transition-colors" />
                <span className="text-xs text-[#A8A29E] group-hover:text-[#C2683A] transition-colors">Your pattern</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ─────────────────────────────────────────────────────────────────
const FREE_FEATURES = [
  "10 pattern generations / month",
  "Kona Cotton solid color library (~300 colors)",
  "Personal pattern library (save up to 20)",
  "Browse community gallery",
  "Basic cutting guide",
];

const MAKER_FEATURES = [
  "Unlimited pattern generation",
  "All solid fabric lines (Bella, Art Gallery, Confetti, Ruby Star)",
  "Upload & use your personal fabric stash",
  "Complete quilt planner — borders, backing, binding",
  "Wideback backing calculator",
  "Quilting overlay designer",
  "PDF export with full cutting guide & yardage",
  "Publish patterns to the community gallery",
  "Unlimited pattern library",
];

function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="py-20 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-[#1C1917] tracking-tight mb-4">
            Simple, honest pricing
          </h2>
          <p className="text-[#78716C] text-lg mb-8">Start free. Upgrade when you&apos;re obsessed.</p>

          <div className="inline-flex items-center gap-0 bg-[#F5F5F4] p-1 rounded-lg">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
                !annual ? "bg-white shadow-sm text-[#1C1917]" : "text-[#78716C]"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
                annual ? "bg-white shadow-sm text-[#1C1917]" : "text-[#78716C]"
              }`}
            >
              Annual <span className="text-[#C2683A] font-semibold">Save 20%</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Free */}
          <div className="border border-[#E7E5E4] rounded-2xl p-8">
            <div className="mb-6">
              <h3 className="font-bold text-[#1C1917] text-lg mb-1">Free</h3>
              <div className="text-4xl font-bold text-[#1C1917]">
                $0<span className="text-base font-normal text-[#78716C]"> / month</span>
              </div>
              <p className="text-[#78716C] text-sm mt-2">Everything you need to get started</p>
            </div>
            <button className="w-full border border-[#E7E5E4] text-[#1C1917] font-semibold py-3 rounded-xl hover:border-[#1C1917] transition-colors mb-6 cursor-pointer">
              Get started free
            </button>
            <ul className="space-y-3">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-[#78716C]">
                  <Check size={14} className="text-[#C2683A] mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Maker */}
          <div className="bg-[#1C1917] rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-[#C2683A] text-white text-xs font-bold px-3 py-1 rounded-full">
              Most popular
            </div>
            <div className="mb-6">
              <h3 className="font-bold text-white text-lg mb-1">Maker</h3>
              <div className="text-4xl font-bold text-white">
                {annual ? "$7.19" : "$8.99"}
                <span className="text-base font-normal text-white/60"> / month</span>
              </div>
              {annual && (
                <div className="text-[#C2683A] text-sm mt-1">Billed annually — save $21.60/yr</div>
              )}
              <p className="text-white/60 text-sm mt-2">The full Patchwork experience</p>
            </div>
            <button className="w-full bg-[#C2683A] text-white font-semibold py-3 rounded-xl hover:bg-[#9A4F28] transition-colors mb-6 cursor-pointer">
              Start 14-day free trial
            </button>
            <ul className="space-y-3">
              {MAKER_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-white/80">
                  <Check size={14} className="text-[#C2683A] mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ───────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section className="py-24 px-6 bg-[#FAFAF8]">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-4xl lg:text-5xl font-bold text-[#1C1917] tracking-tight mb-6">
          Stop searching.<br />Start designing.
        </h2>
        <p className="text-[#78716C] text-lg mb-8">
          The inspiration you&apos;ve been endlessly searching for is already here —
          and it&apos;s made for your fabrics.
        </p>
        <Link href="/studio" className="inline-block bg-[#C2683A] text-white font-semibold px-8 py-4 rounded-xl hover:bg-[#9A4F28] transition-colors text-lg cursor-pointer">
          Start designing free →
        </Link>
        <p className="text-xs text-[#A8A29E] mt-4">No credit card required · Cancel anytime</p>
      </div>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-[#E7E5E4] py-12 px-6 bg-white">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="grid grid-cols-3 gap-0.5 w-5 h-5">
            {["#C2683A","#E8C9B0","#C2683A","#E8C9B0","#C2683A","#E8C9B0","#C2683A","#E8C9B0","#C2683A"].map(
              (c, i) => <div key={i} className="rounded-[1px]" style={{ backgroundColor: c }} />
            )}
          </div>
          <span className="font-semibold text-[#1C1917] text-sm">Patchwork</span>
        </div>
        <p className="text-xs text-[#A8A29E]">© 2025 Patchwork Studio. Made with love for quilters everywhere.</p>
        <div className="flex gap-6">
          {["Privacy", "Terms", "Contact"].map((l) => (
            <a key={l} href="#" className="text-xs text-[#A8A29E] hover:text-[#78716C] transition-colors">{l}</a>
          ))}
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <main>
      <Nav />
      <Hero />
      <Features />
      <StylesShowcase />
      <HowItWorks />
      <GalleryTeaser />
      <Pricing />
      <FinalCTA />
      <Footer />
    </main>
  );
}
