# Admin Calendar Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal administrative calendar workbench and a separate administrative archive with daily, weekly, monthly, and yearly reporting.

**Architecture:** Keep `AdminTask` as the source of truth and extend it with calendar, recurrence, creator, and assignee fields. Add focused utility functions for validation, date ranges, reporting, and ownership checks so API routes and pages stay small. Keep global archive behavior unchanged; administrative archive gets its own API and page under personal data.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 6, SQLite, existing cookie/token auth helpers, lucide-react icons.

---

## File Structure

- Modify `docs/DATA_MODEL.md`: document the new `AdminTask` fields and the independent administrative archive.
- Modify `docs/TEST_PLAN.md`: add calendar, archive, delete, and ownership test cases.
- Modify `prisma/schema.prisma`: extend `AdminTask` and `Person` relations.
- Create `prisma/migrations/20260526_admin_task_calendar_archive/migration.sql`: migrate existing data, backfill `taskDate`, creator, and assignee.
- Create `lib/admin-task-calendar.ts`: date parsing, time parsing, recurrence validation, date-range helpers, and report bucket helpers.
- Modify `lib/admin-task-auth.ts`: expose reusable ownership helpers for active and archived admin tasks.
- Modify `app/api/admin-tasks/route.ts`: support calendar filters and new fields on create/list.
- Modify `app/api/admin-tasks/[id]/route.ts`: support new fields on edit/status/archive.
- Create `app/api/admin-task-archive/route.ts`: list personal archived tasks and report summaries by day/week/month/year.
- Create `app/api/admin-task-archive/[id]/restore/route.ts`: restore only the current person’s archived record.
- Create `app/api/admin-task-archive/[id]/delete/route.ts`: permanently delete only the current person’s archived record with confirmation.
- Modify `app/admin-tasks/page.tsx`: replace table-first UI with calendar + right-side list.
- Create `app/admin-task-archive/page.tsx`: personal administrative archive UI.
- Modify `components/layout/Sidebar.tsx`: add “行政事项归档” under personal data.
- Modify `lib/task-aggregation.ts`: use `taskDate` as the preferred admin-task due/report date.
- Modify `lib/dashboard-utils.ts` and `lib/boss-report-utils.ts`: preserve existing personal admin summaries with the new date field.
- Modify `prisma/seed.ts`: seed examples that cover date-only, timed, completed, archived, and overdue admin tasks.
- Create `scripts/test-admin-calendar-archive.ts`: API regression coverage for ownership, archive, restore, delete, and reports.
- Modify `package.json`: include the new regression script in `npm test`.

## Task 1: Data Model And Documentation

**Files:**
- Modify: `docs/DATA_MODEL.md`
- Modify: `docs/TEST_PLAN.md`
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260526_admin_task_calendar_archive/migration.sql`

- [ ] **Step 1: Update `docs/DATA_MODEL.md` before schema changes**

Add the new `AdminTask` fields to section 11:

```markdown
- `taskDate`: 事项所属日期，用于日历落点和日/周/月/年统计；旧数据由 `dueDate` 回填。
- `startTime`: 可选开始时间，格式为 `HH:mm`。
- `endTime`: 可选结束时间，格式为 `HH:mm`，必须晚于 `startTime`。
- `recurrenceType`: 重复规则，取值为 `none` / `daily` / `weekly` / `monthly` / `yearly`。
- `recurrenceEndDate`: 重复结束日期，可为空。
- `createdByPersonId`: 创建人。
- `assigneePersonId`: 负责人，第一版默认等于当前登录人员。
```

Add a note that “行政事项归档” is a personal-data archive and supports owner-only permanent deletion.

- [ ] **Step 2: Update `docs/TEST_PLAN.md`**

Add a new subsection under administrative tasks:

```markdown
## 15A. 行政事项日历与归档测试
- [ ] `/admin-tasks` 默认显示今天的日历工作台
- [ ] 新增只有日期的行政待办后，可在对应日期看到
- [ ] 新增带开始/结束时间的事项后，可按时间排序显示
- [ ] 完成事项后仍参与统计，但不再算超期
- [ ] 归档事项后，从工作台隐藏，并进入 `/admin-task-archive`
- [ ] `/admin-task-archive` 支持日/周/月/年切换
- [ ] 本人可恢复自己的归档行政事项
- [ ] 本人可输入“确认彻底删除”后彻底删除自己的归档行政事项
- [ ] A 用户不能查看、恢复、彻底删除 B 用户的行政归档
- [ ] 未绑定人员账号不能创建或查看个人行政事项
```

- [ ] **Step 3: Modify `prisma/schema.prisma`**

Update `Person` relations:

```prisma
model Person {
  // existing fields...
  adminTasks                 AdminTask[]                  @relation("AdminTaskOwner")
  createdAdminTasks          AdminTask[]                  @relation("AdminTaskCreator")
  assignedAdminTasks         AdminTask[]                  @relation("AdminTaskAssignee")
  user                       User?
}
```

Update `AdminTask`:

```prisma
model AdminTask {
  id                 String    @id @default(uuid())
  title              String
  type               String
  ownerPersonId      String?
  createdByPersonId  String?
  assigneePersonId   String?
  priority           String?
  dueDate            DateTime?
  taskDate           DateTime?
  startTime          String?
  endTime            String?
  recurrenceType     String    @default("none")
  recurrenceEndDate  DateTime?
  isRecurring        Boolean   @default(false)
  status             String
  completedAt        DateTime?
  notes              String?
  isArchived         Boolean   @default(false)
  archivedAt         DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  ownerPerson        Person?   @relation("AdminTaskOwner", fields: [ownerPersonId], references: [id])
  createdByPerson    Person?   @relation("AdminTaskCreator", fields: [createdByPersonId], references: [id])
  assigneePerson     Person?   @relation("AdminTaskAssignee", fields: [assigneePersonId], references: [id])

  @@index([ownerPersonId, isArchived, taskDate])
  @@index([assigneePersonId])
  @@index([createdByPersonId])
}
```

- [ ] **Step 4: Create the migration**

Create `prisma/migrations/20260526_admin_task_calendar_archive/migration.sql`:

```sql
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AdminTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ownerPersonId" TEXT,
    "createdByPersonId" TEXT,
    "assigneePersonId" TEXT,
    "priority" TEXT,
    "dueDate" DATETIME,
    "taskDate" DATETIME,
    "startTime" TEXT,
    "endTime" TEXT,
    "recurrenceType" TEXT NOT NULL DEFAULT 'none',
    "recurrenceEndDate" DATETIME,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "completedAt" DATETIME,
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AdminTask_ownerPersonId_fkey" FOREIGN KEY ("ownerPersonId") REFERENCES "Person" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AdminTask_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES "Person" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AdminTask_assigneePersonId_fkey" FOREIGN KEY ("assigneePersonId") REFERENCES "Person" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AdminTask" (
    "id", "title", "type", "ownerPersonId", "createdByPersonId", "assigneePersonId",
    "priority", "dueDate", "taskDate", "isRecurring", "status", "completedAt",
    "notes", "isArchived", "archivedAt", "createdAt", "updatedAt"
)
SELECT
    "id", "title", "type", "ownerPersonId", "ownerPersonId", "ownerPersonId",
    "priority", "dueDate", COALESCE("dueDate", "createdAt"), "isRecurring", "status", "completedAt",
    "notes", "isArchived", "archivedAt", "createdAt", "updatedAt"
FROM "AdminTask";
DROP TABLE "AdminTask";
ALTER TABLE "new_AdminTask" RENAME TO "AdminTask";
CREATE INDEX "AdminTask_ownerPersonId_isArchived_taskDate_idx" ON "AdminTask"("ownerPersonId", "isArchived", "taskDate");
CREATE INDEX "AdminTask_assigneePersonId_idx" ON "AdminTask"("assigneePersonId");
CREATE INDEX "AdminTask_createdByPersonId_idx" ON "AdminTask"("createdByPersonId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
```

- [ ] **Step 5: Validate Prisma schema**

Run: `npx prisma validate`

Expected: output contains `The schema at prisma\schema.prisma is valid`.

- [ ] **Step 6: Commit data model changes**

```powershell
git add docs/DATA_MODEL.md docs/TEST_PLAN.md prisma/schema.prisma prisma/migrations/20260526_admin_task_calendar_archive/migration.sql
git commit -m "feat: extend admin task calendar model"
```

## Task 2: Calendar Utilities And Ownership Helpers

**Files:**
- Create: `lib/admin-task-calendar.ts`
- Modify: `lib/admin-task-auth.ts`

- [ ] **Step 1: Create `lib/admin-task-calendar.ts`**

```ts
import type { AdminTask } from '@prisma/client'

export const ADMIN_RECURRENCE_TYPES = ['none', 'daily', 'weekly', 'monthly', 'yearly'] as const
export type AdminRecurrenceType = (typeof ADMIN_RECURRENCE_TYPES)[number]

export function parseDateOnly(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') return undefined
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export function parseTime(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') return undefined
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : undefined
}

export function validateTimeRange(startTime: string | null, endTime: string | null) {
  if (startTime && endTime && endTime <= startTime) {
    return '结束时间必须晚于开始时间'
  }
  return null
}

export function normalizeRecurrence(value: unknown): AdminRecurrenceType | undefined {
  if (value === undefined || value === null || value === '') return 'none'
  if (typeof value !== 'string') return undefined
  return ADMIN_RECURRENCE_TYPES.includes(value as AdminRecurrenceType)
    ? (value as AdminRecurrenceType)
    : undefined
}

export function startOfTodayUtcDateOnly() {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
}

export function getTaskCalendarDate(task: Pick<AdminTask, 'taskDate' | 'dueDate' | 'createdAt'>) {
  return task.taskDate ?? task.dueDate ?? task.createdAt
}

export function dateRangeForPeriod(period: string, anchorValue: string | null) {
  const anchor = parseDateOnly(anchorValue)
  if (!anchor) throw new Error('统计日期格式不正确')
  const start = new Date(anchor)
  const end = new Date(anchor)

  if (period === 'day') {
    end.setUTCDate(start.getUTCDate() + 1)
  } else if (period === 'week') {
    const day = start.getUTCDay() || 7
    start.setUTCDate(start.getUTCDate() - day + 1)
    end.setTime(start.getTime())
    end.setUTCDate(start.getUTCDate() + 7)
  } else if (period === 'month') {
    start.setUTCDate(1)
    end.setUTCFullYear(start.getUTCFullYear(), start.getUTCMonth() + 1, 1)
  } else if (period === 'year') {
    start.setUTCFullYear(start.getUTCFullYear(), 0, 1)
    end.setUTCFullYear(start.getUTCFullYear() + 1, 0, 1)
  } else {
    throw new Error('统计周期无效')
  }

  return { start, end }
}

export function isCompletedStatus(status: string) {
  return status === '已完成'
}
```

- [ ] **Step 2: Extend `lib/admin-task-auth.ts`**

```ts
import { prisma } from './db'
import { requireBoundPerson } from './auth-utils'

export async function ensureAdminTaskOwnerPersonId() {
  const currentUser = await requireBoundPerson()
  return currentUser.personId
}

export async function findOwnedAdminTask(id: string, ownerPersonId: string, includeArchived = false) {
  return prisma.adminTask.findFirst({
    where: {
      id,
      ownerPersonId,
      ...(includeArchived ? {} : { isArchived: false }),
    },
  })
}

export async function findOwnedArchivedAdminTask(id: string, ownerPersonId: string) {
  return prisma.adminTask.findFirst({
    where: {
      id,
      ownerPersonId,
      isArchived: true,
    },
  })
}
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`

Expected: no TypeScript errors from the new utility files.

- [ ] **Step 4: Commit utility changes**

```powershell
git add lib/admin-task-calendar.ts lib/admin-task-auth.ts
git commit -m "feat: add admin calendar utilities"
```

## Task 3: Admin Task API Calendar Fields

**Files:**
- Modify: `app/api/admin-tasks/route.ts`
- Modify: `app/api/admin-tasks/[id]/route.ts`
- Modify: `lib/task-aggregation.ts`
- Modify: `lib/dashboard-utils.ts`
- Modify: `lib/boss-report-utils.ts`

- [ ] **Step 1: Update request validation in `app/api/admin-tasks/route.ts`**

Replace local date parsing with imports:

```ts
import {
  normalizeRecurrence,
  parseDateOnly,
  parseTime,
  startOfTodayUtcDateOnly,
  validateTimeRange,
} from '@/lib/admin-task-calendar'
```

In `validateTaskBody`, parse new fields:

```ts
const taskDate = parseDateOnly(body.taskDate ?? body.dueDate)
const dueDate = parseDateOnly(body.dueDate ?? body.taskDate)
const startTime = parseTime(body.startTime)
const endTime = parseTime(body.endTime)
const recurrenceType = normalizeRecurrence(body.recurrenceType)
const recurrenceEndDate = parseDateOnly(body.recurrenceEndDate)

if (taskDate === undefined) return { error: '事项日期格式不正确' }
if (!taskDate) return { error: '事项日期不能为空' }
if (dueDate === undefined) return { error: '截止日期格式不正确' }
if (startTime === undefined) return { error: '开始时间格式不正确' }
if (endTime === undefined) return { error: '结束时间格式不正确' }
if (recurrenceType === undefined) return { error: '重复规则无效' }
if (recurrenceEndDate === undefined) return { error: '重复结束日期格式不正确' }
const timeError = validateTimeRange(startTime, endTime)
if (timeError) return { error: timeError }
```

Return:

```ts
return {
  data: {
    title,
    type,
    priority: priority || null,
    status,
    dueDate,
    taskDate,
    startTime,
    endTime,
    recurrenceType,
    recurrenceEndDate,
    notes: notes || null,
    isRecurring: recurrenceType !== 'none',
  },
}
```

- [ ] **Step 2: Update create data**

In `POST`, add creator and assignee:

```ts
data: {
  ...result.data,
  ownerPersonId,
  createdByPersonId: ownerPersonId,
  assigneePersonId: ownerPersonId,
  completedAt: result.data.status === '已完成' ? new Date() : null,
  isArchived: false,
  archivedAt: null,
}
```

- [ ] **Step 3: Add calendar filters in `GET`**

Support `from` and `to` query params:

```ts
const from = parseDateOnly(searchParams.get('from'))
const to = parseDateOnly(searchParams.get('to'))
if (from === undefined || to === undefined) {
  return NextResponse.json({ error: '日期筛选格式不正确' }, { status: 400 })
}
if (from || to) {
  where.taskDate = {
    ...(from ? { gte: from } : {}),
    ...(to ? { lt: new Date(to.getTime() + 24 * 60 * 60 * 1000) } : {}),
  }
}
```

Order by:

```ts
orderBy: [{ taskDate: 'asc' }, { startTime: 'asc' }, { createdAt: 'desc' }]
```

- [ ] **Step 4: Mirror validation in `app/api/admin-tasks/[id]/route.ts`**

Use the same parsing imports and update `PUT` data:

```ts
data: {
  title,
  type,
  priority: priority || null,
  dueDate,
  taskDate,
  startTime,
  endTime,
  recurrenceType,
  recurrenceEndDate,
  isRecurring: recurrenceType !== 'none',
  status,
  completedAt: completedAtForStatus(status, existing.status, existing.completedAt),
  notes: notes || null,
}
```

- [ ] **Step 5: Preserve existing aggregations**

In task/dashboard/report utilities, use `task.taskDate ?? task.dueDate` when calculating admin due date:

```ts
const adminDate = item.taskDate ?? item.dueDate
```

Use `adminDate` for `dueDate`, `isOverdue`, and `isThisWeek`.

- [ ] **Step 6: Run API type check**

Run: `npx tsc --noEmit`

Expected: no TypeScript errors.

- [ ] **Step 7: Commit API changes**

```powershell
git add app/api/admin-tasks/route.ts app/api/admin-tasks/[id]/route.ts lib/task-aggregation.ts lib/dashboard-utils.ts lib/boss-report-utils.ts
git commit -m "feat: support admin task calendar fields"
```

## Task 4: Personal Administrative Archive API

**Files:**
- Create: `app/api/admin-task-archive/route.ts`
- Create: `app/api/admin-task-archive/[id]/restore/route.ts`
- Create: `app/api/admin-task-archive/[id]/delete/route.ts`

- [ ] **Step 1: Create archive list and summary route**

`app/api/admin-task-archive/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AUTH_ERROR, PERSON_BINDING_ERROR, isAuthError, isPersonBindingError } from '@/lib/auth-utils'
import { ensureAdminTaskOwnerPersonId } from '@/lib/admin-task-auth'
import { dateRangeForPeriod, isCompletedStatus } from '@/lib/admin-task-calendar'

function authErrorResponse(error: unknown) {
  if (isAuthError(error)) return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
  if (isPersonBindingError(error)) return NextResponse.json({ error: PERSON_BINDING_ERROR }, { status: 400 })
  return null
}

export async function GET(request: NextRequest) {
  try {
    const ownerPersonId = await ensureAdminTaskOwnerPersonId()
    const period = request.nextUrl.searchParams.get('period') || 'month'
    const anchor = request.nextUrl.searchParams.get('anchor') || new Date().toISOString().slice(0, 10)
    const { start, end } = dateRangeForPeriod(period, anchor)

    const tasks = await prisma.adminTask.findMany({
      where: {
        ownerPersonId,
        isArchived: true,
        taskDate: { gte: start, lt: end },
      },
      orderBy: [{ taskDate: 'desc' }, { startTime: 'asc' }, { archivedAt: 'desc' }],
    })

    const totalCount = tasks.length
    const completedCount = tasks.filter((task) => isCompletedStatus(task.status)).length
    const overdueCount = tasks.filter((task) => {
      const taskDate = task.taskDate ?? task.dueDate
      return Boolean(taskDate && taskDate < new Date() && !isCompletedStatus(task.status))
    }).length
    const typeCounts = tasks.reduce<Record<string, number>>((acc, task) => {
      acc[task.type] = (acc[task.type] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      period,
      anchor,
      range: { start: start.toISOString(), end: end.toISOString() },
      summary: { totalCount, completedCount, overdueCount, typeCounts },
      tasks,
    })
  } catch (error) {
    const authResponse = authErrorResponse(error)
    if (authResponse) return authResponse
    return NextResponse.json({ error: '获取行政事项归档失败' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create restore route**

`app/api/admin-task-archive/[id]/restore/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { AUTH_ERROR, PERSON_BINDING_ERROR, isAuthError, isPersonBindingError } from '@/lib/auth-utils'
import { ensureAdminTaskOwnerPersonId, findOwnedArchivedAdminTask } from '@/lib/admin-task-auth'
import { prisma } from '@/lib/db'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ownerPersonId = await ensureAdminTaskOwnerPersonId()
    const { id } = await params
    const body = await request.json()
    if (body.confirmation !== '确认恢复') {
      return NextResponse.json({ error: '请输入“确认恢复”以继续' }, { status: 400 })
    }
    const existing = await findOwnedArchivedAdminTask(id, ownerPersonId)
    if (!existing) {
      return NextResponse.json({ error: '行政事项归档不存在' }, { status: 404 })
    }
    const task = await prisma.adminTask.update({
      where: { id },
      data: { isArchived: false, archivedAt: null },
    })
    return NextResponse.json(task)
  } catch (error) {
    if (isAuthError(error)) return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    if (isPersonBindingError(error)) return NextResponse.json({ error: PERSON_BINDING_ERROR }, { status: 400 })
    return NextResponse.json({ error: '恢复行政事项归档失败' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Create permanent delete route**

`app/api/admin-task-archive/[id]/delete/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { AUTH_ERROR, PERSON_BINDING_ERROR, isAuthError, isPersonBindingError } from '@/lib/auth-utils'
import { ensureAdminTaskOwnerPersonId, findOwnedArchivedAdminTask } from '@/lib/admin-task-auth'
import { prisma } from '@/lib/db'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ownerPersonId = await ensureAdminTaskOwnerPersonId()
    const { id } = await params
    const body = await request.json()
    if (body.confirmation !== '确认彻底删除') {
      return NextResponse.json({ error: '请输入“确认彻底删除”以继续' }, { status: 400 })
    }
    const existing = await findOwnedArchivedAdminTask(id, ownerPersonId)
    if (!existing) {
      return NextResponse.json({ error: '行政事项归档不存在' }, { status: 404 })
    }
    await prisma.adminTask.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (isAuthError(error)) return NextResponse.json({ error: AUTH_ERROR }, { status: 401 })
    if (isPersonBindingError(error)) return NextResponse.json({ error: PERSON_BINDING_ERROR }, { status: 400 })
    return NextResponse.json({ error: '彻底删除行政事项归档失败' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run route type check**

Run: `npx tsc --noEmit`

Expected: no TypeScript errors.

- [ ] **Step 5: Commit archive API**

```powershell
git add app/api/admin-task-archive lib/admin-task-auth.ts
git commit -m "feat: add personal admin archive api"
```

## Task 5: Calendar Workbench UI

**Files:**
- Modify: `app/admin-tasks/page.tsx`

- [ ] **Step 1: Update frontend task types**

Add fields to `AdminTask` and `TaskForm`:

```ts
interface AdminTask {
  id: string
  title: string
  type: string
  priority: string | null
  dueDate: string | null
  taskDate: string | null
  startTime: string | null
  endTime: string | null
  recurrenceType: string
  recurrenceEndDate: string | null
  isRecurring: boolean
  status: string
  completedAt: string | null
  notes: string | null
  isArchived: boolean
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

interface TaskForm {
  title: string
  type: string
  priority: string
  taskDate: string
  startTime: string
  endTime: string
  recurrenceType: string
  recurrenceEndDate: string
  status: string
  notes: string
}
```

- [ ] **Step 2: Add date helpers**

```ts
function toDateKey(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function startOfMonthGrid(value: Date) {
  const first = new Date(value.getFullYear(), value.getMonth(), 1)
  const day = first.getDay() || 7
  first.setDate(first.getDate() - day + 1)
  return first
}

function buildMonthCells(value: Date) {
  const start = startOfMonthGrid(value)
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
}
```

- [ ] **Step 3: Load tasks for visible month**

Use `selectedDate` and `visibleMonth` state. Fetch:

```ts
const cells = buildMonthCells(visibleMonth)
const from = toDateKey(cells[0])
const to = toDateKey(cells[cells.length - 1])
const response = await fetch(`/api/admin-tasks?from=${from}&to=${to}`)
```

- [ ] **Step 4: Render A3 layout**

Use a two-column layout:

```tsx
<div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.8fr)]">
  <section className="rounded-[20px] border border-[#e5eaf3] bg-white p-4">
    {/* month toolbar and 42-cell calendar grid */}
  </section>
  <section className="rounded-[20px] border border-[#e5eaf3] bg-white p-4">
    {/* selected date list, no-time group, timed group */}
  </section>
</div>
```

- [ ] **Step 5: Create task modal fields**

Include:

```tsx
<input type="date" value={form.taskDate} onChange={(event) => setForm({ ...form, taskDate: event.target.value })} required />
<input type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} />
<input type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} />
<select value={form.recurrenceType} onChange={(event) => setForm({ ...form, recurrenceType: event.target.value })}>
  <option value="none">不重复</option>
  <option value="daily">每天</option>
  <option value="weekly">每周</option>
  <option value="monthly">每月</option>
  <option value="yearly">每年</option>
</select>
<input type="date" value={form.recurrenceEndDate} onChange={(event) => setForm({ ...form, recurrenceEndDate: event.target.value })} />
```

- [ ] **Step 6: Preserve status update and archive behavior**

Keep status dropdown and archive confirmation, but after archive reload the calendar range rather than table data.

- [ ] **Step 7: Browser check**

Run: `npm run dev`

Open `/admin-tasks`, verify:

- no text overlap at desktop width
- selected date list changes after clicking another date
- date-only and timed items display in separate groups

- [ ] **Step 8: Commit workbench UI**

```powershell
git add app/admin-tasks/page.tsx
git commit -m "feat: add admin calendar workbench"
```

## Task 6: Administrative Archive UI And Navigation

**Files:**
- Create: `app/admin-task-archive/page.tsx`
- Modify: `components/layout/Sidebar.tsx`

- [ ] **Step 1: Add sidebar item**

In the personal-data group:

```ts
{ name: '行政事项', path: '/admin-tasks', icon: CalendarClock },
{ name: '行政事项归档', path: '/admin-task-archive', icon: Archive },
```

- [ ] **Step 2: Create page state**

`app/admin-task-archive/page.tsx` should keep:

```ts
const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month')
const [anchor, setAnchor] = useState(() => new Date().toISOString().slice(0, 10))
const [data, setData] = useState<ArchiveResponse | null>(null)
const [restoreTarget, setRestoreTarget] = useState<ArchivedAdminTask | null>(null)
const [deleteTarget, setDeleteTarget] = useState<ArchivedAdminTask | null>(null)
```

- [ ] **Step 3: Fetch archive data**

```ts
const response = await fetch(`/api/admin-task-archive?period=${period}&anchor=${anchor}`)
```

- [ ] **Step 4: Render report controls**

Use four buttons:

```tsx
{(['day', 'week', 'month', 'year'] as const).map((key) => (
  <button
    key={key}
    type="button"
    onClick={() => setPeriod(key)}
    className={period === key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}
  >
    {{ day: '日', week: '周', month: '月', year: '年' }[key]}
  </button>
))}
```

- [ ] **Step 5: Render summary cards**

Cards:

- 归档事项
- 已完成
- 超期
- 完成率

- [ ] **Step 6: Add restore and delete dialogs**

Use existing `ConfirmDialog` for restore. For permanent delete, use `Modal` with an input requiring `确认彻底删除`.

Permanent delete request:

```ts
await fetch(`/api/admin-task-archive/${deleteTarget.id}/delete`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ confirmation: deleteConfirmation }),
})
```

- [ ] **Step 7: Browser check**

Open `/admin-task-archive`, verify:

- day/week/month/year buttons do not overflow
- restore dialog requires confirmation
- permanent delete dialog clearly says deletion cannot be recovered

- [ ] **Step 8: Commit archive UI**

```powershell
git add app/admin-task-archive/page.tsx components/layout/Sidebar.tsx
git commit -m "feat: add personal admin archive page"
```

## Task 7: Seed And Regression Tests

**Files:**
- Modify: `prisma/seed.ts`
- Create: `scripts/test-admin-calendar-archive.ts`
- Modify: `package.json`

- [ ] **Step 1: Update `ensureAdminTask` in `prisma/seed.ts`**

Extend the helper input:

```ts
const ensureAdminTask = async (data: {
  title: string
  type: string
  priority: string
  dueDate: Date
  status: string
  notes: string
  startTime?: string
  endTime?: string
  recurrenceType?: string
  isArchived?: boolean
}) => {
```

Extend `taskData`:

```ts
const taskData = {
  ownerPersonId: primaryAdminPerson?.id ?? null,
  createdByPersonId: primaryAdminPerson?.id ?? null,
  assigneePersonId: primaryAdminPerson?.id ?? null,
  priority: data.priority,
  dueDate: data.dueDate,
  taskDate: data.dueDate,
  startTime: data.startTime ?? null,
  endTime: data.endTime ?? null,
  recurrenceType: data.recurrenceType ?? 'none',
  recurrenceEndDate: null,
  isRecurring: Boolean(data.recurrenceType && data.recurrenceType !== 'none'),
  status: data.status,
  notes: data.notes,
  completedAt: data.status === '已完成' ? data.dueDate : null,
  isArchived: Boolean(data.isArchived),
  archivedAt: data.isArchived ? data.dueDate : null,
}
```

If the seed file does not already define `primaryAdminPerson`, create it before `ensureAdminTask`:

```ts
const primaryAdminPerson = await prisma.person.findFirst({
  where: { role: '行政', isActive: true },
  orderBy: { createdAt: 'asc' },
})
```

- [ ] **Step 2: Add seed records**

Add examples after existing `ensureAdminTask` calls:

```ts
await ensureAdminTask({
  title: '日历演示-无时间待办',
  type: '会议',
  priority: '中',
  dueDate: new Date('2026-05-26T00:00:00.000Z'),
  status: '未开始',
  notes: '用于验证只有日期的行政待办',
})

await ensureAdminTask({
  title: '日历演示-带时间接待',
  type: '接待',
  priority: '高',
  dueDate: new Date('2026-05-26T00:00:00.000Z'),
  startTime: '09:30',
  endTime: '10:30',
  status: '进行中',
  notes: '用于验证带时间的行政事项排序',
})

await ensureAdminTask({
  title: '归档演示-已完成周报',
  type: '周报',
  priority: '中',
  dueDate: new Date('2026-05-20T00:00:00.000Z'),
  recurrenceType: 'weekly',
  status: '已完成',
  notes: '用于验证行政事项归档统计',
  isArchived: true,
})
```

- [ ] **Step 3: Create API regression script**

`scripts/test-admin-calendar-archive.ts`:

```ts
const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000'

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const body = await res.json().catch(() => null)
  return { res, body }
}

async function main() {
  const unauthArchive = await request('/api/admin-task-archive')
  if (unauthArchive.res.status !== 401) {
    throw new Error(`/api/admin-task-archive unauth expected 401, got ${unauthArchive.res.status}`)
  }

  const unauthCreate = await request('/api/admin-tasks', {
    method: 'POST',
    body: JSON.stringify({
      title: '未登录不应创建',
      type: '会议',
      taskDate: '2026-05-26',
      status: '未开始',
    }),
  })
  if (unauthCreate.res.status !== 401) {
    throw new Error(`/api/admin-tasks unauth create expected 401, got ${unauthCreate.res.status}`)
  }

  console.log('admin calendar archive unauth smoke passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

- [ ] **Step 4: Update `package.json`**

Change test script:

```json
"test": "tsx scripts/test-hardening.ts && tsx scripts/test-agent-api-token.ts && tsx scripts/test-admin-calendar-archive.ts"
```

- [ ] **Step 5: Run seed and tests**

Run:

```powershell
npm run prisma:seed
npm test
```

Expected: seed completes and the new unauth smoke test prints `admin calendar archive unauth smoke passed`.

- [ ] **Step 6: Commit tests**

```powershell
git add prisma/seed.ts scripts/test-admin-calendar-archive.ts package.json
git commit -m "test: cover admin calendar archive smoke"
```

## Task 8: Final Verification

**Files:**
- No new files; verification only.

- [ ] **Step 1: Run project verification**

```powershell
npm test
npx tsc --noEmit
npm run build
git diff --check
```

Expected: all commands exit with code 0.

- [ ] **Step 2: Browser verification**

Start the app:

```powershell
npm run dev
```

Verify these pages:

- `/admin-tasks`
- `/admin-task-archive`
- `/tasks`
- `/`

Expected:

- no visible overlap
- Chinese copy displays correctly
- personal admin tasks still appear in dashboard and task center
- archived admin tasks do not appear in active workbench

- [ ] **Step 3: Final commit if verification changes docs or tests**

If verification required small fixes, stage the exact files shown by `git status --short` for those fixes. For example, if the final polish only touched the two UI pages:

```powershell
git add app/admin-tasks/page.tsx app/admin-task-archive/page.tsx
git commit -m "fix: polish admin calendar archive"
```

If no files changed, do not create an empty commit.

## Self-Review

- Spec coverage: data model, calendar UI, personal archive, period reporting, owner-only permanent deletion, restore, existing dashboard/task-center compatibility, docs, and tests are covered by Tasks 1-8.
- Red-flag scan: this plan contains no unresolved tokens or unspecified implementation steps.
- Type consistency: `taskDate`, `startTime`, `endTime`, `recurrenceType`, `recurrenceEndDate`, `createdByPersonId`, and `assigneePersonId` are used consistently across schema, APIs, UI, and tests.
