# NexusBase

NexusBase is a full-stack collaborative workspace platform: a compact Google Drive + Slack + Trello + Notion style SaaS built for resume-ready engineering depth.

It demonstrates authentication, project/task workflows, cloud file storage, role-based permissions, notifications, audit logs, admin analytics, and a polished responsive dashboard.

## Tech stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Auth.js / NextAuth with Google OAuth
- Prisma ORM
- PostgreSQL
- AWS S3 presigned uploads
- Vercel-ready deployment

## Current features

- Workspace dashboard with responsive sidebar navigation
- Drag-and-drop kanban board for tasks
- File table with S3-oriented metadata and sharing states
- Team chat/comment panel mockup
- Notification feed with read/unread states
- Team member roles and workload summary
- Activity log for audit-style events
- Admin analytics snapshot
- Google OAuth sign-in route
- Prisma schema for users, profiles, projects, members, tasks, comments, files, notifications, activity logs, channels, and messages
- Protected API route patterns for tasks, notifications, and S3 presigned upload URLs

## Project structure

```txt
src/app
  api/auth/[...nextauth]/route.ts     Google OAuth handler
  api/files/presign/route.ts          AWS S3 presigned upload endpoint
  api/tasks/route.ts                  Protected task CRUD API
  api/notifications/read-all/route.ts Protected notification state API
  admin/page.tsx                      Admin dashboard view
  login/page.tsx                      Google OAuth sign-in page
  page.tsx                            Workspace command center

src/components
  auth/                               Sign-in controls
  dashboard/                          Workspace widgets
  shell/                              Sidebar and topbar

src/lib
  auth.ts                             NextAuth configuration
  aws/s3.ts                           S3 client and presigned URL helpers
  prisma.ts                           Prisma client singleton
  sample-data.ts                      Demo workspace content

prisma/schema.prisma                  PostgreSQL data model
```

## Local setup

Use Node.js 20.19+ or 24+. The project uses current Next.js and AWS SDK packages, which intentionally do not support Node 18.

```bash
npm install
cp .env.example .env.local
npm run db:generate
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

Create `.env.local` from `.env.example`.

```txt
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nexusbase?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-openssl-rand-base64-32"
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_S3_BUCKET="nexusbase-files"
```

Generate a local NextAuth secret:

```bash
openssl rand -base64 32
```

## Database

After setting `DATABASE_URL`, push the schema:

```bash
npm run db:push
npm run db:studio
```

The schema includes:

- `User`, `Profile`, `Account`, `Session`, `VerificationToken`
- `Project`, `ProjectMember`
- `Task`, `Comment`
- `FileObject`, `FileShare`
- `Notification`, `ActivityLog`
- `Channel`, `Message`

## Google OAuth

Create a Google OAuth client and add:

```txt
Authorized JavaScript origin:
http://localhost:3000

Authorized redirect URI:
http://localhost:3000/api/auth/callback/google
```

For production, replace the host with the deployed Vercel URL.

## AWS S3

The `/api/files/presign` route returns a temporary PUT URL for direct browser-to-S3 uploads. The app stores the bucket/key pattern needed for metadata persistence in PostgreSQL.

Recommended bucket settings:

- Block public access by default
- Use presigned URLs for private upload/download
- Add CORS for your local and production origins
- Keep object keys scoped by workspace and user

Example CORS:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["http://localhost:3000"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

## Resume title

```txt
Full-Stack Collaborative Workspace Platform
```

## Resume bullets

```txt
Built NexusBase, a full-stack collaborative workspace platform using Next.js,
React, TypeScript, PostgreSQL, Prisma, Google OAuth, and AWS S3.

Implemented secure authentication and authorization patterns with Auth.js,
Google OAuth, protected API routes, project membership roles, and file-sharing
permissions.

Designed a relational PostgreSQL schema for users, projects, members, tasks,
comments, cloud files, notifications, real-time-ready messages, and audit logs.

Integrated AWS S3 presigned upload architecture for private file storage with
workspace-scoped object keys and secure metadata tracking.

Created a responsive SaaS dashboard with drag-and-drop task management,
notifications, activity history, file summaries, team member status, and admin
analytics.
```

## Next build targets

- Persist dashboard widgets from the Prisma API instead of demo data
- Add task comments and file comments with live updates
- Add WebSocket or managed realtime transport for channels and notifications
- Add Postgres full-text search indexes
- Add Playwright coverage for auth redirects, task movement, and upload flow
- Deploy to Vercel with managed Postgres and AWS S3
