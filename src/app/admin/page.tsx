import Link from "next/link";

import { activity, adminMetrics, members, notifications } from "@/lib/sample-data";

export default function AdminPage() {
  return (
    <main className="hupr-admin">
      <nav className="hupr-menu" aria-label="Admin">
        <span>MENU</span>
        <div className="hupr-burger" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </nav>

      <header className="hupr-admin__header">
        <Link href="/">NEXUSBASE *</Link>
        <div className="hupr-section-label">
          <span>ADMIN DASHBOARD</span>
          <span>SECURE AREA</span>
        </div>
        <h1>USERS ROLES AUDIT CONTROLS</h1>
        <p>
          Protected administration for user status, role changes, project
          activity, storage visibility, and notification events.
        </p>
      </header>

      <section className="hupr-stats" aria-label="Admin metrics">
        {adminMetrics.map((metric) => (
          <article key={metric.label}>
            <p>{metric.label}</p>
            <strong>{metric.value}</strong>
            <span>{metric.detail}</span>
          </article>
        ))}
      </section>

      <section className="hupr-dashboard">
        <div className="hupr-operations-grid">
          <article className="hupr-panel hupr-panel--wide">
            <div className="hupr-panel__header">
              <h3>AUDIT</h3>
              <span>{activity.length} EVENTS</span>
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

          <article className="hupr-panel">
            <div className="hupr-panel__header">
              <h3>USERS</h3>
              <span>{members.length}</span>
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
              <h3>EVENTS</h3>
              <span>NOTIFICATIONS</span>
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
        </div>
      </section>
    </main>
  );
}
