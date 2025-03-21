import Link from "next/link";

import { FileTable } from "@/components/dashboard/file-table";
import { GlobalSearch } from "@/components/dashboard/global-search";
import { MembersPanel } from "@/components/dashboard/members-panel";
import { NotificationsPanel } from "@/components/dashboard/notifications-panel";
import { ProjectManager } from "@/components/dashboard/project-manager";
import { TaskBoard } from "@/components/dashboard/task-board";
import { TaskComments } from "@/components/dashboard/task-comments";
import { TeamChat } from "@/components/dashboard/team-chat";
import {
  activity,
  files,
  members,
  messages,
  notifications,
  tasks,
  workspaceStats,
} from "@/lib/sample-data";

const taskColumns = [
  { id: "todo", label: "TODO" },
  { id: "inProgress", label: "IN PROGRESS" },
  { id: "done", label: "DONE" },
] as const;

const featureBands = [
  {
    kicker: "01/04",
    title: "SECURE FILES",
    body: "Private AWS S3 object keys, file metadata, previews, sharing roles, and download-ready cloud storage.",
    tone: "clay",
  },
  {
    kicker: "02/04",
    title: "TASK FLOW",
    body: "Projects, owners, due dates, priorities, assignments, searchable tags, and status movement across the team.",
    tone: "rouge",
  },
  {
    kicker: "03/04",
    title: "LIVE TEAM",
    body: "Realtime-ready messages, comments, notification events, read states, and member presence in one workspace.",
    tone: "blue",
  },
];

function MenuBlock() {
  return (
    <nav className="hupr-menu" aria-label="Primary">
      <span>MENU</span>
      <div className="hupr-burger" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </nav>
  );
}

function ResearchVisual({ tone = "pink" }: { tone?: "pink" | "clay" | "rouge" | "blue" }) {
  return (
    <div className={`hupr-visual hupr-visual--${tone}`} aria-hidden="true">
      <div className="hupr-visual__body" />
      <div className="hupr-visual__axis hupr-visual__axis--x" />
      <div className="hupr-visual__axis hupr-visual__axis--y" />
      <div className="hupr-visual__ring hupr-visual__ring--one" />
      <div className="hupr-visual__ring hupr-visual__ring--two" />
      <div className="hupr-visual__ruler" />
    </div>
  );
}

export default function Home() {
  return (
    <div className="hupr-app">
      <MenuBlock />

      <header className="hupr-hero">
        <div className="hupr-brand">
          <p className="hupr-logo">NEXUSBASE *</p>
          <p className="hupr-brand__caption">
            Collaborative workspace platform
          </p>
        </div>

        <div className="hupr-hero__image">
          <ResearchVisual />
        </div>

        <aside className="hupr-service-card">
          <div className="hupr-service-card__menu">
            <span>MENU</span>
            <span className="hupr-mini-burger" />
          </div>
          <p className="hupr-kicker">Platform offer</p>
          <p className="hupr-service-card__copy">
            NexusBase brings tasks, files, chat, search, permissions,
            notifications, and admin analytics into one focused workspace.
          </p>
          <Link href="/login" className="hupr-button">
            SIGN IN WITH GOOGLE
          </Link>
        </aside>

        <h1 className="hupr-hero__word hupr-hero__word--left">TEAM</h1>
        <h1 className="hupr-hero__word hupr-hero__word--right">BASE</h1>
      </header>

      <main>
        <section className="hupr-section hupr-section--intro">
          <div className="hupr-fact">
            <div className="hupr-section-label">
              <span>HIGHLIGHTS</span>
              <span>03/04</span>
            </div>
            <p className="hupr-fact__number">+ {tasks.length * 14}</p>
            <p className="hupr-fact__copy">
              Workspace records connect project ownership, assignment flow,
              secure files, realtime-ready collaboration, and audit history.
            </p>
            <div className="hupr-arrows">
              <button type="button" aria-label="Previous highlight">
                ←
              </button>
              <button type="button" aria-label="Next highlight">
                →
              </button>
            </div>
          </div>

          <div className="hupr-intro-copy">
            <div className="hupr-section-label">
              <span>ABOUT</span>
              <span>WORKSPACE</span>
            </div>
            <h2>WHEN WORK MOVES TEAMS MOVE FASTER</h2>
            <p>
              A production-minded dashboard for files, projects, comments,
              permissions, notifications, and administration without the usual
              soft SaaS wrapper.
            </p>
          </div>
        </section>

        <section className="hupr-stats" aria-label="Workspace metrics">
          {workspaceStats.map((stat) => (
            <article key={stat.label}>
              <p>{stat.label}</p>
              <strong>{stat.value}</strong>
              <span>{stat.detail}</span>
            </article>
          ))}
        </section>

        {featureBands.map((feature) => (
          <section
            className={`hupr-band hupr-band--${feature.tone}`}
            key={feature.title}
          >
            <div className="hupr-band__header">
              <span>{feature.kicker}</span>
              <span>PRODUCT MODULE</span>
            </div>
            <h2>{feature.title}</h2>
            <div className="hupr-band__content">
              <ResearchVisual tone={feature.tone as "clay" | "rouge" | "blue"} />
              <p>{feature.body}</p>
            </div>
          </section>
        ))}

        <section className="hupr-section hupr-section--modules">
          <div>
            <div className="hupr-section-label">
              <span>WORKSPACE MODULES</span>
              <span>INDEXED</span>
            </div>
            <ul className="hupr-module-list">
              <li>
                <span>GOOGLE OAUTH</span>
                <span>↗</span>
              </li>
              <li>
                <span>AWS STORAGE</span>
                <span>↗</span>
              </li>
              <li>
                <span>POSTGRES SEARCH</span>
                <span>↗</span>
              </li>
              <li>
                <span>RBAC AUDIT LOGS</span>
                <span>↗</span>
              </li>
            </ul>
          </div>

          <div className="hupr-module-copy">
            <ResearchVisual tone="pink" />
            <p>
              The app keeps the resume stack visible: Next.js, TypeScript,
              Prisma, PostgreSQL, Auth.js, Google OAuth, AWS S3, protected API
              routes, and deployment-ready configuration.
            </p>
          </div>
        </section>

        <section className="hupr-dashboard">
          <div className="hupr-section-label">
            <span>OPERATIONS</span>
            <span>LIVE SURFACE</span>
          </div>

          <div className="hupr-crud-stack">
            <ProjectManager />
            <GlobalSearch />
            <MembersPanel />
            <TaskBoard />
            <TaskComments />
            <FileTable />
            <TeamChat />
            <NotificationsPanel />
          </div>

          <div className="hupr-operations-grid">
            <article className="hupr-panel hupr-panel--wide">
              <div className="hupr-panel__header">
                <h3>TASKS</h3>
                <span>{tasks.length} RECORDS</span>
              </div>
              <div className="hupr-kanban">
                {taskColumns.map((column) => (
                  <div key={column.id}>
                    <p>{column.label}</p>
                    {tasks
                      .filter((task) => task.status === column.id)
                      .map((task) => (
                        <div className="hupr-task-row" key={task.id}>
                          <span>{task.title}</span>
                          <small>{task.assignee} / {task.priority}</small>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </article>

            <article className="hupr-panel">
              <div className="hupr-panel__header">
                <h3>NOTIFICATIONS</h3>
                <span>{notifications.length}</span>
              </div>
              <div className="hupr-list">
                {notifications.map((item) => (
                  <div key={item.title}>
                    <strong>{item.title}</strong>
                    <p>{item.body}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="hupr-panel hupr-panel--files">
              <div className="hupr-panel__header">
                <h3>FILES</h3>
                <span>AWS S3</span>
              </div>
              <div className="hupr-file-table">
                {files.map((file) => (
                  <div key={file.name}>
                    <span>{file.name}</span>
                    <span>{file.permission}</span>
                    <span>{file.size}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="hupr-panel">
              <div className="hupr-panel__header">
                <h3>CHAT</h3>
                <span>CHANNEL</span>
              </div>
              <div className="hupr-list">
                {messages.map((message) => (
                  <div key={`${message.author}-${message.time}`}>
                    <strong>{message.author}</strong>
                    <p>{message.body}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="hupr-panel">
              <div className="hupr-panel__header">
                <h3>TEAM</h3>
                <span>ROLES</span>
              </div>
              <div className="hupr-member-grid">
                {members.map((member) => (
                  <div key={member.name}>
                    <strong>{member.name}</strong>
                    <span>{member.role}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="hupr-panel hupr-panel--wide">
              <div className="hupr-panel__header">
                <h3>AUDIT LOG</h3>
                <Link href="/admin">ADMIN ↗</Link>
              </div>
              <div className="hupr-audit">
                {activity.map((event) => (
                  <div key={`${event.actor}-${event.subject}`}>
                    <span>{event.time}</span>
                    <p>
                      {event.actor} {event.action} {event.subject}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}
