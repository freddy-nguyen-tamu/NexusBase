"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  Activity,
  Bell,
  Bookmark,
  Cloud,
  LayoutGrid,
  Search,
  Shield,
  Code,
  ArrowRight,
  Globe,
  Camera,
  Pen,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type Feature = {
  icon: React.ElementType;
  label: string;
  description: string;
};

type IconSetCard = {
  name: string;
  tag: string;
  count: string;
  bgClass: string;
  icons: string[];
};

// ─────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────
const FEATURES: Feature[] = [
  { icon: Shield,     label: "Authentication & access", description: "Google OAuth, protected dashboard routes, account sessions, project roles, and admin-only controls." },
  { icon: LayoutGrid, label: "Project execution",       description: "Projects, task workflows, kanban-style task movement, comments, members, workload summaries, and activity history." },
  { icon: Cloud,      label: "File operations",         description: "S3-oriented file metadata, sharing states, protected presigned upload patterns, and workspace-scoped storage architecture." },
  { icon: Bell,       label: "Team communication",      description: "Channels, messages, notifications, read states, and team activity context." },
  { icon: Search,     label: "Universal search",        description: "Ctrl/Cmd+K command palette and search across projects, tasks, files, milestones, decisions, and messages." },
  { icon: Activity,   label: "Project health",          description: "Risk severity, blocker ownership, mitigation plans, due dates, health signals, and activity-linked risk tracking." },
  { icon: Bookmark,   label: "Admin analytics",         description: "Admin dashboard snapshots for workspace visibility, usage context, and operational oversight." },
  { icon: Code,       label: "Production architecture", description: "Prisma schema, protected API routes, middleware-based access control, PostgreSQL models, and Vercel-ready deployment." },
];

const ICON_SETS: IconSetCard[] = [
  {
    name: "Tasks",
    tag: "KANBAN BOARD",
    count: "Drag. Drop. Done.",
    bgClass: "bg-white border-nb-border",
    icons: ["▣", "◈", "⊞", "◉"],
  },
  {
    name: "Files",
    tag: "CLOUD STORAGE",
    count: "AWS S3 presigned uploads",
    bgClass: "bg-nb-surface-alt border-nb-border",
    icons: ["⬡", "◫", "⬢", "◪"],
  },
  {
    name: "Team",
    tag: "PERMISSIONS",
    count: "Owner · Admin · Editor · Viewer",
    bgClass: "bg-white border-nb-border",
    icons: ["◎", "⊕", "⊗", "⊘"],
  },
  {
    name: "Activity",
    tag: "AUDIT LOGS",
    count: "Every event, timestamped",
    bgClass: "bg-nb-surface-alt border-nb-border",
    icons: ["◂", "▸", "△", "▽"],
  },
];

const NAV_LINKS = ["Dashboard", "Files", "Team", "Pricing"];

const NAV_LINK_ROUTES: Record<string, string> = {
  dashboard: "/dashboard",
  files:     "/dashboard/files",
  team:      "/dashboard/members",
  pricing:   "/pricing",
};

const FOOTER_FREEBIES = [
  "Open source on GitHub",
  "Free for solo use",
  "Self-hostable",
  "Vercel-ready deploy",
];

const FOOTER_FEATURES = [
  "Kanban Board",
  "Cloud Files",
  "Team Chat",
  "Notifications",
  "Activity Logs",
  "Admin Console",
];

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const ctaHref = session ? "/dashboard" : "/login";
  const ctaLabel = session ? "Go to Dashboard" : "Sign In";

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 clamp(1rem, 5vw, 3.5rem)",
        height: 64,
        background: "var(--nb-surface)",
        borderBottom: "1px solid var(--nb-border-solid)",
        transition: "box-shadow 0.2s",
        boxShadow: scrolled ? "0 2px 20px rgba(0,0,0,0.06)" : "none",
      }}
    >
      {/* Logo */}
      <a
        href="/"
        style={{
          fontFamily: "'Montserrat', Helvetica, Arial, sans-serif",
          fontWeight: 900,
          fontSize: "1.25rem",
          color: "var(--nb-navy)",
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          letterSpacing: "-0.01em",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 30,
            height: 30,
            background: "var(--nb-navy)",
            borderRadius: 7,
          }}
        >
          <span style={{ color: "var(--nb-green)", fontSize: "1rem", fontWeight: 900 }}>N</span>
        </span>
        NexusBase
      </a>

      {/* Links */}
      <ul
        style={{
          display: "flex",
          gap: "2rem",
          listStyle: "none",
          padding: 0,
          margin: 0,
        }}
      >
        {NAV_LINKS.map((link) => (
          <li key={link}>
            <a
              href={NAV_LINK_ROUTES[link.toLowerCase()] ?? "#"}
              style={{
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--nb-navy)",
                textDecoration: "none",
              }}
              onMouseEnter={(e) =>
                ((e.target as HTMLElement).style.color = "var(--nb-green-dark)")
              }
              onMouseLeave={(e) =>
                ((e.target as HTMLElement).style.color = "var(--nb-navy)")
              }
            >
              {link}
            </a>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Link
        href={ctaHref}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          height: 40,
          paddingInline: "1.25rem",
          borderRadius: 8,
          background: "var(--nb-navy)",
          color: "#fff",
          fontSize: "0.8rem",
          fontWeight: 700,
          textDecoration: "none",
          letterSpacing: "0.02em",
        }}
      >
        {ctaLabel} <ArrowRight size={13} />
      </Link>
    </nav>
  );
}

// ──────────────────────────────
function HeroSection() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <section
      style={{
        background: "var(--nb-bg)",
        padding: "clamp(4rem, 10vw, 8rem) clamp(1rem, 5vw, 5rem)",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "4rem",
        alignItems: "center",
        minHeight: "calc(100vh - 64px)",
      }}
    >
      {/* Left: text */}
      <div
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(28px)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
        }}
      >
        <p
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--nb-navy)",
            marginBottom: "1.5rem",
          }}
        >
          Full-stack workspace platform
        </p>

        <h1
          style={{
            fontFamily: "'Montserrat', Helvetica, Arial, sans-serif",
            fontWeight: 900,
            fontSize: "clamp(3.5rem, 7vw, 7rem)",
            lineHeight: 0.93,
            color: "var(--nb-green)",
            letterSpacing: "-0.02em",
            marginBottom: "2rem",
          }}
        >
          All the workspace
          <br />
          tools you&apos;ll
          <br />
          ever need.
        </h1>

        <p
          style={{
            fontSize: "1.1rem",
            lineHeight: 1.65,
            color: "var(--nb-muted)",
            maxWidth: 480,
            marginBottom: "2.5rem",
          }}
        >
          Stop wasting time juggling five apps. NexusBase gives you projects,
          tasks, files, team chat, notifications, audit logs, milestones,
          decisions, universal search, and project health tracking — wired
          together in one protected workspace.
        </p>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <a
            href="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              height: 52,
              paddingInline: "2rem",
              borderRadius: 10,
              background: "var(--nb-navy)",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.9rem",
              textDecoration: "none",
            }}
          >
            Open workspace <ArrowRight size={15} />
          </a>
          <a
            href="https://github.com"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              height: 52,
              paddingInline: "2rem",
              borderRadius: 10,
              background: "var(--nb-surface-alt)",
              color: "var(--nb-navy)",
              fontWeight: 700,
              fontSize: "0.9rem",
              textDecoration: "none",
              border: "1px solid var(--nb-border-solid)",
            }}
          >
            <Code size={15} /> View architecture
          </a>
        </div>
      </div>

      {/* Right: icon grid preview */}
      <div
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(36px)",
          transition: "opacity 0.85s ease 0.15s, transform 0.85s ease 0.15s",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "0.75rem",
        }}
      >
        {[
          "◈", "⊞", "◉", "⬡", "◫", "⬢",
          "◎", "⊕", "⊗", "▣", "◪", "▸",
        ].map((sym, i) => (
          <div
            key={i}
            style={{
              aspectRatio: "1",
              borderRadius: 14,
              background: "var(--nb-surface)",
              border: "1px solid var(--nb-border-solid)",
              display: "grid",
              placeItems: "center",
              fontSize: "1.6rem",
              color: i % 3 === 0 ? "var(--nb-navy)" : "var(--nb-navy-light)",
              transition: "background 0.2s, border-color 0.2s",
              cursor: "default",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--nb-green-pale)";
              (e.currentTarget as HTMLElement).style.borderColor = "var(--nb-green-dark)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--nb-surface)";
              (e.currentTarget as HTMLElement).style.borderColor = "var(--nb-border-solid)";
            }}
          >
            {sym}
          </div>
        ))}
      </div>
    </section>
  );
}

// ──────────────────────────────
function ConsistentSetsSection() {
  return (
    <section
      style={{
        borderTop: "1px solid var(--nb-border-solid)",
        padding: "clamp(3rem, 8vw, 6rem) clamp(1rem, 5vw, 5rem)",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "5rem",
        alignItems: "center",
        background: "var(--nb-surface)",
      }}
    >
      {/* Left: icon set cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
        }}
      >
        {ICON_SETS.map((set) => (
          <div
            key={set.name}
            style={{
              border: "1px solid var(--nb-border-solid)",
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            {/* Preview area */}
            <div
              style={{
                padding: "1.25rem",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                background: "var(--nb-surface-alt)",
              }}
            >
              {set.icons.map((ic, i) => (
                <div
                  key={i}
                  style={{
                    aspectRatio: "1",
                    display: "grid",
                    placeItems: "center",
                    fontSize: "1.4rem",
                    color: "var(--nb-navy)",
                    borderRadius: 8,
                    background: "var(--nb-surface)",
                    border: "1px solid var(--nb-border-solid)",
                  }}
                >
                  {ic}
                </div>
              ))}
            </div>
            {/* Label area */}
            <div
              style={{
                padding: "0.75rem 1rem",
                borderTop: "1px solid var(--nb-border-solid)",
                background: "var(--nb-surface)",
              }}
            >
              <p
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--nb-navy)",
                }}
              >
                {set.tag}
              </p>
              <p
                style={{
                  fontSize: "0.7rem",
                  color: "var(--nb-muted)",
                  marginTop: 2,
                }}
              >
                {set.count}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Right: text */}
      <div>
        <h2
          style={{
            fontFamily: "'Montserrat', Helvetica, Arial, sans-serif",
            fontWeight: 900,
            fontSize: "clamp(2rem, 4vw, 3.5rem)",
            lineHeight: 1.05,
            color: "var(--nb-navy)",
            marginBottom: "1.5rem",
          }}
        >
          Designed like a real
          <br />
          SaaS workspace.
        </h2>

        <p
          style={{
            fontSize: "1.05rem",
            lineHeight: 1.65,
            color: "var(--nb-muted)",
            maxWidth: 480,
          }}
        >
          NexusBase was built to demonstrate the engineering depth expected in a
          production team platform: authenticated sessions, protected API routes,
          relational project data, role-based access, S3-oriented file workflows,
          notifications, activity logs, admin-only views, command search, and
          project health monitoring.
        </p>

        <p
          style={{
            fontSize: "1.05rem",
            lineHeight: 1.65,
            color: "var(--nb-muted)",
            maxWidth: 480,
            marginTop: "1rem",
          }}
        >
          Rather than being a static dashboard mockup, the app models the core
          systems behind a collaborative workspace: users, profiles, projects,
          members, tasks, comments, files, shares, channels, messages,
          milestones, decisions, risks, and audit events.
        </p>
      </div>
    </section>
  );
}

// ──────────────────────────────
function DesignBandSection() {
  return (
    <section
      style={{
        background: "var(--nb-dark)",
        color: "#fff",
        padding: "clamp(3rem, 7vw, 5rem) clamp(1rem, 5vw, 5rem)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Step counter */}
      <p
        style={{
          fontFamily: "'Montserrat', Helvetica, Arial, sans-serif",
          fontWeight: 900,
          fontSize: "1rem",
          color: "var(--nb-green)",
          letterSpacing: "0.05em",
          marginBottom: "1rem",
        }}
      >
        02
      </p>

      <h2
        style={{
          fontFamily: "'Montserrat', Helvetica, Arial, sans-serif",
          fontWeight: 900,
          fontSize: "clamp(2.5rem, 6vw, 5.5rem)",
          lineHeight: 0.97,
        }}
      >
        <span style={{ color: "var(--nb-green)" }}>Engineering so clean,</span>
        <br />
        they&apos;ll ask where it&apos;s from.
      </h2>

      {/* Cohesiveness block */}
      <div
        style={{
          marginTop: "4rem",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "3rem",
          alignItems: "start",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          paddingTop: "3rem",
        }}
      >
        <div>
          <h3
            style={{
              fontFamily: "'Montserrat', Helvetica, Arial, sans-serif",
              fontWeight: 900,
              fontSize: "1.75rem",
              color: "#fff",
              marginBottom: "1rem",
            }}
          >
            Unparalleled
            <br />
            Architecture depth
          </h3>
          <p
            style={{
              fontSize: "0.95rem",
              lineHeight: 1.65,
              color: "rgba(255,255,255,0.55)",
            }}
          >
            Every route is protected by middleware. Every action is logged to
            the activity trail. Roles propagate from project membership down to
            file-share permissions. The Prisma schema enforces referential
            integrity so no record is orphaned. OAuth sessions, audit events,
            notifications, and search all share a single PostgreSQL database.
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
          }}
        >
          {["Prisma schema", "Google OAuth", "AWS S3 presign", "Protected APIs", "Command palette", "Risk tracking"].map((label) => (
            <div
              key={label}
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "var(--nb-green)",
                  display: "block",
                }}
              />
              <p
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────
function TestimonialsSection() {
  return null;
}

// ──────────────────────────────
function FeaturesSection() {
  return (
    <section
      style={{
        background: "var(--nb-dark)",
        color: "#fff",
        padding: "clamp(3rem, 8vw, 6rem) clamp(1rem, 5vw, 5rem)",
      }}
    >
      {/* Header */}
      <p
        style={{
          fontFamily: "'Montserrat', Helvetica, Arial, sans-serif",
          fontWeight: 900,
          fontSize: "1rem",
          color: "var(--nb-green)",
          letterSpacing: "0.05em",
          marginBottom: "0.75rem",
        }}
      >
        03
      </p>

      <h2
        style={{
          fontFamily: "'Montserrat', Helvetica, Arial, sans-serif",
          fontWeight: 900,
          fontSize: "clamp(2rem, 4.5vw, 4rem)",
          lineHeight: 1.0,
          marginBottom: "3.5rem",
        }}
      >
        <span style={{ color: "var(--nb-green)" }}>Production-grade features,</span>
        <br />
        built with real engineering depth.
      </h2>

      {/* 4-column × 2-row grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {FEATURES.map(({ icon: Icon, label, description }, i) => (
          <div
            key={label}
            style={{
              padding: "2rem 1.5rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: "1rem",
              borderRight: i % 4 !== 3 ? "1px solid rgba(255,255,255,0.08)" : "none",
              borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.08)" : "none",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "rgba(191,251,79,0.05)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            <Icon
              style={{ color: "var(--nb-green)", width: 36, height: 36 }}
            />
            <p
              style={{
                fontSize: "0.9rem",
                fontWeight: 700,
                color: "#fff",
                marginBottom: "0.25rem",
              }}
            >
              {label}
            </p>
            <p
              style={{
                fontSize: "0.75rem",
                lineHeight: 1.5,
                color: "rgba(255,255,255,0.5)",
              }}
            >
              {description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ──────────────────────────────
function CtaPanelsSection() {
  const panels = [
    {
      sub: "Dashboard",
      title: "Web App",
      desc: "Full workspace in your browser. Google OAuth sign-in, instant access to every feature.",
      btnLabel: "Go to Dashboard",
      href: "/dashboard",
    },
    {
      sub: "Open Source",
      title: "GitHub",
      desc: "Fork, extend, and self-host NexusBase on your own infrastructure. MIT licensed.",
      btnLabel: "View Source",
      href: "https://github.com",
    },
    {
      sub: "Developers",
      title: "REST API",
      desc: "Protected routes for tasks, files, notifications, projects, and audit logs. No friction.",
      btnLabel: "Explore API",
      href: "/api",
    },
  ];

  return (
    <section
      style={{
        background: "#111",
        padding: "clamp(3rem, 8vw, 6rem) clamp(1rem, 5vw, 5rem)",
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "1px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {panels.map((panel) => (
        <div
          key={panel.title}
          style={{
            background: "#1a1a1a",
            padding: "2.5rem 2rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {/* Green line */}
          <div
            style={{
              width: 40,
              height: 3,
              background: "var(--nb-green)",
              borderRadius: 2,
            }}
          />
          <p
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--nb-navy-light)",
            }}
          >
            {panel.sub}
          </p>
          <h3
            style={{
              fontFamily: "'Montserrat', Helvetica, Arial, sans-serif",
              fontWeight: 900,
              fontSize: "2rem",
              color: "#fff",
            }}
          >
            {panel.title}
          </h3>
          <p
            style={{
              fontSize: "0.875rem",
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.5)",
              flex: 1,
            }}
          >
            {panel.desc}
          </p>
          <a
            href={panel.href}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              height: 48,
              paddingInline: "1.5rem",
              borderRadius: 8,
              border: "1.5px solid rgba(255,255,255,0.18)",
              color: "#fff",
              fontSize: "0.8rem",
              fontWeight: 700,
              textDecoration: "none",
              width: "fit-content",
              marginTop: "0.5rem",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--nb-green)";
              (e.currentTarget as HTMLElement).style.color = "var(--nb-green)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "rgba(255,255,255,0.18)";
              (e.currentTarget as HTMLElement).style.color = "#fff";
            }}
          >
            {panel.btnLabel} <ArrowRight size={13} />
          </a>
        </div>
      ))}
    </section>
  );
}

// ──────────────────────────────
function FounderSection() {
  return (
    <section
      style={{
        borderTop: "1px solid var(--nb-border-solid)",
        padding: "clamp(3rem, 8vw, 6rem) clamp(1rem, 5vw, 5rem)",
        display: "grid",
        gridTemplateColumns: "0.6fr 1fr",
        gap: "6rem",
        alignItems: "center",
        background: "var(--nb-surface)",
      }}
    >
      {/* Left: green vertical bar placeholder */}
      <div
        style={{
          position: "relative",
          paddingLeft: "1.5rem",
          borderLeft: "4px solid var(--nb-green)",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            minHeight: "28rem",
            width: "100%",
            backgroundImage: "url('/assets/background.avif')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            borderRadius: 16,
            border: "1px solid var(--nb-border-solid)",
          }}
        />
      </div>

      {/* Right: text */}
      <div>
        <h2
          style={{
            fontFamily: "'Montserrat', Helvetica, Arial, sans-serif",
            fontWeight: 900,
            fontSize: "clamp(2rem, 4vw, 3.5rem)",
            lineHeight: 1.05,
            color: "var(--nb-navy)",
            marginBottom: "1.5rem",
          }}
        >
          A portfolio-grade SaaS platform
          <br />
          demonstrating production
          <br />
          full-stack architecture.
        </h2>
        <p
          style={{
            fontSize: "1rem",
            lineHeight: 1.7,
            color: "var(--nb-muted)",
            maxWidth: 520,
          }}
        >
          NexusBase is intentionally built beyond a simple CRUD dashboard. The
          project shows how separate product systems work together inside a
          realistic SaaS app: authentication protects the workspace, project
          membership controls access, tasks and files create operational data,
          messages and notifications support collaboration, audit logs preserve
          activity history, search helps users move quickly, and project health
          tracking adds delivery-risk visibility.
        </p>
        <p
          style={{
            fontSize: "1rem",
            lineHeight: 1.7,
            color: "var(--nb-muted)",
            maxWidth: 520,
            marginTop: "1rem",
          }}
        >
          The result is a compact but complete workspace platform that
          demonstrates both frontend polish and backend architecture.
        </p>
        <div
          style={{
            marginTop: "1.5rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          {["12+ relational models", "OAuth-protected routes", "S3 upload architecture", "Command palette search", "Risk tracking workflow", "Admin analytics"].map((stat) => (
            <span
              key={stat}
              style={{
                fontSize: "0.65rem",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--nb-navy)",
                background: "var(--nb-surface-alt)",
                padding: "0.4rem 0.75rem",
                borderRadius: 6,
                border: "1px solid var(--nb-border-solid)",
              }}
            >
              {stat}
            </span>
          ))}
        </div>
        <p
          style={{
            fontSize: "1rem",
            lineHeight: 1.7,
            color: "var(--nb-muted)",
            maxWidth: 520,
            marginTop: "1.5rem",
            paddingTop: "1.5rem",
            borderTop: "1px solid var(--nb-border-solid)",
          }}
        >
          The stack: Next.js 16 · React 19 · TypeScript · Tailwind CSS · Auth.js ·
          Prisma · PostgreSQL · AWS S3 · Vercel
        </p>
      </div>
    </section>
  );
}

// ──────────────────────────────
function Footer() {
  const socialLinks = [
    { icon: Globe,  label: "TWITTER" },
    { icon: Camera, label: "INSTAGRAM" },
    { icon: Code,   label: "GITHUB" },
    { icon: Pen,    label: "FIGMA" },
  ];

  return (
    <footer
      style={{
        background: "var(--nb-dark)",
        color: "#fff",
        padding: "clamp(3rem, 7vw, 5rem) clamp(1rem, 5vw, 5rem)",
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: "3rem",
      }}
    >
      {/* Column 1: Logo + social */}
      <div>
        <a
          href="/"
          style={{
            fontFamily: "'Montserrat', Helvetica, Arial, sans-serif",
            fontWeight: 900,
            fontSize: "1.5rem",
            color: "#fff",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "2rem",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              background: "var(--nb-navy)",
              borderRadius: 7,
            }}
          >
            <span style={{ color: "var(--nb-green)", fontWeight: 900 }}>N</span>
          </span>
          nexusbase
        </a>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {socialLinks.map(({ icon: Icon, label }) => (
            <a
              key={label}
              href={label === "GITHUB" ? "https://github.com" : "#"}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.6rem 0",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                fontSize: "0.8rem",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#fff",
                textDecoration: "none",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.color = "var(--nb-green)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.color = "#fff")
              }
            >
              <Icon size={14} />
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* Column 2: Freebies */}
      <div>
        <p
          style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--nb-green)",
            marginBottom: "1.25rem",
            paddingBottom: "0.5rem",
            borderBottom: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          FREEBIES
        </p>
        {FOOTER_FREEBIES.map((link) => (
          <a
            key={link}
            href={link === "Open source on GitHub" ? "https://github.com" : "#"}
            target={link === "Open source on GitHub" ? "_blank" : undefined}
            rel={link === "Open source on GitHub" ? "noreferrer" : undefined}
            style={{
              display: "block",
              fontSize: "1rem",
              fontWeight: 500,
              color: "#fff",
              textDecoration: "none",
              paddingBlock: "0.35rem",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.color = "var(--nb-green)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.color = "#fff")
            }
          >
            {link}
          </a>
        ))}
      </div>

      {/* Column 3: Features */}
      <div>
        <p
          style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--nb-green)",
            marginBottom: "1.25rem",
            paddingBottom: "0.5rem",
            borderBottom: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          FEATURES
        </p>
        {FOOTER_FEATURES.map((link) => (
          <a
            key={link}
            href="#"
            style={{
              display: "block",
              fontSize: "1rem",
              fontWeight: 500,
              color: "#fff",
              textDecoration: "none",
              paddingBlock: "0.35rem",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.color = "var(--nb-green)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.color = "#fff")
            }
          >
            {link}
          </a>
        ))}

        <div
          style={{
            marginTop: "2rem",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
            padding: "0.75rem 1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--nb-green)",
            }}
          >
            WINNER
          </span>
          <span
            style={{
              fontSize: "0.7rem",
              color: "rgba(255,255,255,0.5)",
              lineHeight: 1.35,
            }}
          >
            Favourite Full-Stack
            <br />
            Portfolio Project
          </span>
        </div>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", overflowX: "clip" }}>
      <NavBar />
      <HeroSection />
      <ConsistentSetsSection />
      <DesignBandSection />
      <TestimonialsSection />
      <FeaturesSection />
      <CtaPanelsSection />
      <FounderSection />
      <Footer />
    </div>
  );
}
