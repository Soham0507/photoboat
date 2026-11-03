import React from "react";
import { Link } from "wouter";
import {
  useListGenerations,
  useGetBoothStats,
  getListGenerationsQueryKey,
  getGetBoothStatsQueryKey,
} from "@workspace/api-client-react";
import {
  Anchor,
  Camera,
  ChevronRight,
  ArrowRight,
  Image as ImageIcon,
  Sparkles,
  MousePointerClick,
  Download,
  Timer,
  ShieldCheck,
} from "lucide-react";
import { useBrand } from "@/brand-bridge";
import pontoonImg from "@assets/pontoon_wi.jpg_1780096222900.jpeg";
import wakeImg from "@assets/wakesurfing.jpg_1780096222900.jpeg";
import bassImg from "@assets/bass_fishing.jpg_1780096222901.jpeg";

const STEPS = [
  {
    icon: MousePointerClick,
    title: "Pick a Scene",
    description: "Choose the boat day you want to live out — sunset pontoon, wakesurfing, or bass fishing.",
  },
  {
    icon: Camera,
    title: "Strike a Pose",
    description: "Look at the camera, smile, and we'll drop you right into the scene in seconds.",
  },
  {
    icon: Download,
    title: "Take It Home",
    description: "Get a custom photo instantly — download it or share it right from the booth.",
  },
];

const EXPERIENCES = [
  {
    id: "pontoon-sunset",
    name: "Pontoon Sunset",
    tagline: "Golden hour on the water",
    image: pontoonImg,
  },
  {
    id: "wakesurfing",
    name: "Wakesurfing",
    tagline: "Carve the wake",
    image: wakeImg,
  },
  {
    id: "bass-fishing",
    name: "Bass Fishing",
    tagline: "Reel in the big one",
    image: bassImg,
  },
];

const TRUST_ROW = [
  { icon: Timer, label: "Ready in seconds" },
  { icon: ShieldCheck, label: "No login required" },
  { icon: Sparkles, label: "100% free to try" },
];

export default function Home() {
  const brand = useBrand();
  const { data: stats } = useGetBoothStats({
    query: { queryKey: getGetBoothStatsQueryKey(), refetchInterval: 10000 },
  });
  const { data: recentGenerations } = useListGenerations(
    { limit: 12 },
    { query: { queryKey: getListGenerationsQueryKey({ limit: 12 }), refetchInterval: 10000 } },
  );

  return (
    <div className="min-h-[100dvh] w-full bg-background relative">
      {/* Floating glass nav */}
      <header className="sticky top-0 z-30 flex justify-center pt-6 px-6">
        <div className="w-full max-w-7xl flex items-center justify-between glass-pill py-2 pl-2 pr-3 animate-in fade-in duration-700">
          <div className="flex items-center gap-2">
            {brand.logoUrl ? (
              <img
                src={brand.logoUrl}
                alt={brand.brandName}
                className="object-contain rounded-full"
                style={{ width: brand.logoSize, height: brand.logoSize }}
              />
            ) : (
              <div
                className="rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  width: brand.logoSize,
                  height: brand.logoSize,
                  background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.primaryColor}66)`,
                }}
              >
                <ImageIcon className="text-white/80" size={16} />
              </div>
            )}
            <span
              className="font-semibold tracking-wide text-foreground"
              style={{ fontSize: brand.brandNameSize, fontFamily: "var(--brand-font, inherit)" }}
            >
              {brand.brandName}
            </span>
          </div>
          <Link
            href="/create"
            className="group glass-cta-outline inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold"
          >
            Start Now
            <ChevronRight className="w-4 h-4 motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:translate-x-0.5" />
          </Link>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="relative w-full overflow-hidden px-6 pt-10 pb-24 md:pt-16 md:pb-32">
        <div className="absolute inset-0 pointer-events-none glass-ambient opacity-60 -z-10">
          <img src={pontoonImg} alt="" className="absolute top-[-15%] left-[-10%] w-[55%] rounded-[3rem] object-cover aspect-square" />
          <img src={wakeImg} alt="" className="absolute bottom-[-25%] right-[-10%] w-[50%] rounded-[3rem] object-cover aspect-square" />
          <img src={bassImg} alt="" className="absolute top-[20%] right-[5%] w-[30%] rounded-[3rem] object-cover aspect-square opacity-70" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/80 to-background pointer-events-none -z-10" />

        <div className="relative max-w-4xl mx-auto text-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
          <div className="inline-flex items-center gap-2 bg-primary/15 text-primary px-4 py-2 rounded-full font-medium text-sm tracking-wide uppercase">
            <Anchor className="w-4 h-4" />
            Interactive Booth Experience
          </div>

          <h1
            className="font-black text-foreground tracking-tight leading-[1.05]"
            style={{ fontSize: `clamp(2.75rem, 8vw, ${brand.headingSize}px)`, fontFamily: "var(--brand-font, inherit)" }}
          >
            {brand.heading}
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {brand.tagline}
          </p>

          <div className="flex flex-col items-center gap-6 pt-4">
            <Link
              href="/create"
              className="group glass-cta inline-flex items-center justify-between gap-5 whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-16 md:h-[4.5rem] pl-8 md:pl-9 pr-3 py-2 text-primary-foreground"
            >
              <span className="flex flex-col items-start leading-tight gap-0.5">
                <span className="text-lg md:text-xl font-semibold">Start Your Experience</span>
                <span className="text-xs md:text-sm font-medium text-primary-foreground/70">
                  Free &middot; ready in 60 seconds
                </span>
              </span>
              <span className="flex-shrink-0 w-10 h-10 md:w-11 md:h-11 rounded-full bg-primary-foreground/15 flex items-center justify-center motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:translate-x-0.5">
                <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
              </span>
            </Link>

            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {TRUST_ROW.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Icon className="w-4 h-4 text-primary" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="relative max-w-7xl mx-auto w-full px-6 pb-24 space-y-28">
        {/* ===== LIVE ACTIVITY ===== */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <h2 className="text-3xl md:text-4xl font-black text-foreground">Live From the Booth</h2>
            <p className="text-lg text-muted-foreground">See what today's guests have been creating.</p>
          </div>

          <div className="glass-tile p-6 mb-8 max-w-xs mx-auto flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
              <ImageIcon className="w-4 h-4 text-primary" />
              Photos Today
            </div>
            <div className="text-4xl font-black text-primary">{stats?.totalCreations || 0}</div>
          </div>

          {recentGenerations && recentGenerations.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {recentGenerations.slice(0, 8).map((gen, i) => (
                <div
                  key={gen.id}
                  className="glass-tile aspect-[4/3] overflow-hidden relative group bg-muted animate-in fade-in zoom-in-95 duration-500"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  {gen.photoUrl ? (
                    <img
                      src={gen.photoUrl}
                      alt="Generation"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Camera className="w-8 h-8 opacity-20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                    <span className="text-white font-medium text-sm drop-shadow-md">{gen.sceneName}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-tile p-12 text-center text-muted-foreground">
              <Camera className="w-10 h-10 mx-auto mb-3 opacity-30" />
              No creations yet today — be the first!
            </div>
          )}
        </section>

        {/* ===== HOW IT WORKS ===== */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <h2 className="text-3xl md:text-4xl font-black text-foreground">How It Works</h2>
            <p className="text-lg text-muted-foreground">Three steps between you and your next favorite photo.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="glass-tile p-8 text-center space-y-4 animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${i * 120}ms`, animationDuration: "700ms" }}
              >
                <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center text-primary relative">
                  <step.icon className="w-7 h-7" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-foreground">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== EXPERIENCES ===== */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <h2 className="text-3xl md:text-4xl font-black text-foreground">Choose Your Vibe</h2>
            <p className="text-lg text-muted-foreground">Every experience is a different boat day, ready in seconds.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {EXPERIENCES.map((exp, i) => (
              <Link
                key={exp.id}
                href="/create"
                className="glass-tile group block overflow-hidden relative aspect-[4/5] animate-in fade-in zoom-in-95"
                style={{ animationDelay: `${i * 120}ms`, animationDuration: "700ms" }}
              >
                <img
                  src={exp.image}
                  alt={exp.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 space-y-1">
                  <h3 className="text-2xl font-bold text-white">{exp.name}</h3>
                  <p className="text-white/80 font-medium">{exp.tagline}</p>
                  <div className="flex items-center gap-1 text-white/90 text-sm font-semibold pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    Try this scene
                    <ArrowRight className="w-4 h-4 motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="glass-surface glass-sheen rounded-[2.5rem] px-8 py-16 md:px-16 text-center space-y-6 relative overflow-hidden">
            <h2 className="text-3xl md:text-5xl font-black text-foreground max-w-2xl mx-auto leading-tight">
              Ready to make a splash?
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto">
              Step up to the booth and see yourself on the water — it only takes a minute.
            </p>
            <div className="pt-4">
              <Link
                href="/create"
                className="group glass-cta inline-flex items-center justify-center gap-3 whitespace-nowrap font-semibold h-14 pl-7 pr-3 py-2 text-lg text-primary-foreground"
              >
                Start Your Experience
                <span className="flex-shrink-0 w-9 h-9 rounded-full bg-primary-foreground/15 flex items-center justify-center motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:translate-x-0.5">
                  <ChevronRight className="w-5 h-5" />
                </span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative text-center text-sm text-muted-foreground pb-10 px-6">
        {brand.brandName} · Interactive Booth Experience
      </footer>
    </div>
  );
}
