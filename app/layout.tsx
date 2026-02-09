// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import { ParticleBackground } from "@/components/ParticleBackground";

export const metadata: Metadata = {
  title: "Grounds — decision-grade reports",
  description: "Clear reasoning for important decisions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/*
        IMPORTANT:
        - Do NOT put `dark` or light classes on <html> or <body>
        - Theme is fully controlled by Shell via:
            document.documentElement.classList.toggle("dark")
      */}
      <body className="min-h-screen antialiased">
        {/* Background layers (CSS controls opacity + blend per theme) */}
        <div className="pointer-events-none fixed inset-0 bg-aurora" />
        <div className="pointer-events-none fixed inset-0 noise" />

        {/* Premium Particle Animation Background
            - Google AI Studio grid pattern with connected nodes
            - Persistent meteor showers (not occasional)
            - Multi-layer depth orbs with brand colors
            - Mouse-reactive grid + orb push */}
        <ParticleBackground
          preset="default"
          shootingStars={true}
          showGrid={true}
          interactionStrength={1}
          speed={0.8}
        />

        {/* App shell (controls theme + header + footer) */}
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
