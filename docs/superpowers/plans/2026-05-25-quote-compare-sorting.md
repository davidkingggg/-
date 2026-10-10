# Quote Compare Sorting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `/quote-compare` 报价对比页增加排序能力，让用户选择阀门等品类后，可以按价格低高/高低、参数小大/大小查看结果。

**Architecture:** 排序口径放在服务端 `getQuoteCompareData` 中，页面查询、导出 CSV 共用同一套排序结果。新增一个小型排序工具负责价格比较、参数数字解析和兜底中文排序，避免把规则散落在页面和 API 中。

**Tech Stack:** Next.js 16 App Router, React 19, Prisma, TypeScript, SQLite, existing CSV utilities.

---

## File Structure

- Create: `lib/quote-compare-sort.ts`
  - 负责 `sortMode` 类型、报价组排序、组内供应商报价行排序、规格参数数字解析。
- Create: `scripts/test-quote-compare-sort.ts`
  - 用 `tsx` 直接验证排序纯函数，不依赖数据库。
- Modify: `lib/quote-compare.ts`
  - 接收 `sortMode` 查询条件，在代表报价计算完成后排序。
- Modify: `app/api/quote-compare/route.ts`
  - 读取 `sortMode` 参数传给 `getQuoteCompareData`。
- Modify: `app/api/quote-compare/export/route.ts`
  - 读取同一个 `sortMode`，保证导出顺序和页面一致。
- Modify: `app/quote-compare/page.tsx`
  - 增加“排序方式”下拉框，查询和导出时带上 `sortMode`。
- Modify: `CHANGELOG.md`
  - 记录报价对比新增排序。
- Reference only: `node_modules/next/dist/docs/`
  - 编码前按仓库规则查 App Router / Route Handler 相关文档，不假设旧版 Next.js 行为。

## Sorting Behavior

排序方式下拉选项：

- `默认排序`：保持现有 `compareKey` 中文/字母排序。
- `价格从低到高`：报价组按组内最低价升序；组内供应商行按单价升序。
- `价格从高到低`：报价组按组内最高价降序；组内供应商行按单价降序。
- `参数从小到大`：报价组优先从 `compareKey -> model -> productName` 提取规格数字升序，例如 DN50 < DN80 < DN100；组内行优先从 `model -> productName -> compareKey` 提取规格数字升序。
- `参数从大到小`：同上，降序。

参数解析规则：

- 优先识别 `DN50`、`DN 50` 这类口径参数；没有 DN 时再识别 `50mm`、`50` 这类普通数字。
- 一个字符串有多个数字时，优先使用 DN 后面的数字；没有 DN 时使用第一个普通数字。示例：`D71X-16 DN80` 取 `80`，`阀门-DN50-法兰球阀` 取 `50`。
- 没有可解析数字时排在有数字的后面，并用中文 `localeCompare('zh-CN')` 兜底。
- 空价格排在价格排序最后。

### Task 1: Add Sort Helper

**Files:**
- Create: `lib/quote-compare-sort.ts`

- [ ] **Step 1: Create sort helper with explicit modes**

```ts
export type QuoteCompareSortMode =
  | ''
  | 'priceAsc'
  | 'priceDesc'
  | 'paramAsc'
  | 'paramDesc'

type SortableQuoteItem = {
  compareKey: string
  productName: string
  model: string | null
  price: number | string | null
}

type SortableCompareGroup<TItem extends SortableQuoteItem> = {
  compareKey: string
  productName: string
  model: string | null
  minPrice: number | null
  maxPrice: number | null
  items: TItem[]
}

export function normalizeQuoteCompareSortMode(value?: string | null): QuoteCompareSortMode {
  if (value === 'priceAsc' || value === 'priceDesc' || value === 'paramAsc' || value === 'paramDesc') {
    return value
  }
  return ''
}

export function extractFirstSpecNumber(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const text = value?.trim()
    if (!text) continue
    const dnMatch = text.match(/\bDN\s*(\d+(?:\.\d+)?)/i)
    if (dnMatch) return Number(dnMatch[1])
    const numberMatch = text.match(/(\d+(?:\.\d+)?)/)
    if (numberMatch) return Number(numberMatch[1])
  }
  return null
}

function priceValue(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function compareNullableNumber(a: number | null, b: number | null, direction: 'asc' | 'desc') {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  return direction === 'asc' ? a - b : b - a
}

function compareText(a: string | null | undefined, b: string | null | undefined) {
  return (a || '').localeCompare(b || '', 'zh-CN')
}

function compareItemParam(a: SortableQuoteItem, b: SortableQuoteItem, direction: 'asc' | 'desc') {
  const paramCompare = compareNullableNumber(
    extractFirstSpecNumber(a.model, a.productName, a.compareKey),
    extractFirstSpecNumber(b.model, b.productName, b.compareKey),
    direction
  )
  if (paramCompare !== 0) return paramCompare
  return compareText(a.model || a.productName || a.compareKey, b.model || b.productName || b.compareKey)
}

function compareGroupParam<TItem extends SortableQuoteItem>(
  a: SortableCompareGroup<TItem>,
  b: SortableCompareGroup<TItem>,
  direction: 'asc' | 'desc'
) {
  const paramCompare = compareNullableNumber(
    extractFirstSpecNumber(a.compareKey, a.model, a.productName),
    extractFirstSpecNumber(b.compareKey, b.model, b.productName),
    direction
  )
  if (paramCompare !== 0) return paramCompare
  return compareText(a.compareKey, b.compareKey)
}

export function sortQuoteCompareGroups<TItem extends SortableQuoteItem>(
  groups: Array<SortableCompareGroup<TItem>>,
  sortMode: QuoteCompareSortMode
) {
  for (const group of groups) {
    if (sortMode === 'priceAsc') {
      group.items.sort((a, b) => compareNullableNumber(priceValue(a.price), priceValue(b.price), 'asc'))
    } else if (sortMode === 'priceDesc') {
      group.items.sort((a, b) => compareNullableNumber(priceValue(a.price), priceValue(b.price), 'desc'))
    } else if (sortMode === 'paramAsc') {
      group.items.sort((a, b) => compareItemParam(a, b, 'asc'))
    } else if (sortMode === 'paramDesc') {
      group.items.sort((a, b) => compareItemParam(a, b, 'desc'))
    }
  }

  if (sortMode === 'priceAsc') {
    groups.sort((a, b) => compareNullableNumber(a.minPrice, b.minPrice, 'asc'))
  } else if (sortMode === 'priceDesc') {
    groups.sort((a, b) => compareNullableNumber(a.maxPrice, b.maxPrice, 'desc'))
  } else if (sortMode === 'paramAsc') {
    groups.sort((a, b) => compareGroupParam(a, b, 'asc'))
  } else if (sortMode === 'paramDesc') {
    groups.sort((a, b) => compareGroupParam(a, b, 'desc'))
  } else {
    groups.sort((a, b) => a.compareKey.localeCompare(b.compareKey, 'zh-CN'))
  }

  return groups
}
```

- [ ] **Step 2: Run TypeScript against the new helper**

Run:

```bash
npx tsc --noEmit
```

Expected: TypeScript passes, or only reports pre-existing unrelated errors. If there are new helper errors, fix them before continuing.

### Task 2: Add Pure Sorting Test Script

**Files:**
- Create: `scripts/test-quote-compare-sort.ts`

- [ ] **Step 1: Write deterministic sorting checks**

```ts
import assert from 'node:assert/strict'
import { extractFirstSpecNumber, sortQuoteCompareGroups, type QuoteCompareSortMode } from '../lib/quote-compare-sort'

type Item = {
  id: string
  compareKey: string
  productName: string
  model: string | null
  price: number | string | null
}

function groups() {
  return [
    {
      compareKey: '阀门-DN100-截止阀',
      productName: 'DN100截止阀',
      model: 'J41H-16C DN100',
      minPrice: 520,
      maxPrice: 680,
      items: [
        { id: 'a', compareKey: '阀门-DN100-截止阀', productName: 'DN100截止阀', model: 'J41H-16C DN100', price: 680 },
        { id: 'b', compareKey: '阀门-DN100-截止阀', productName: 'DN100截止阀', model: 'J41H-16C DN100', price: 520 },
      ],
    },
    {
      compareKey: '阀门-DN50-法兰球阀',
      productName: 'DN50法兰球阀',
      model: 'Q41F-16C DN50',
      minPrice: 285,
      maxPrice: 300,
      items: [
        { id: 'c', compareKey: '阀门-DN50-法兰球阀', productName: 'DN50法兰球阀', model: 'Q41F-16C DN50', price: 300 },
        { id: 'd', compareKey: '阀门-DN50-法兰球阀', productName: 'DN50法兰球阀', model: 'Q41F-16C DN50', price: 285 },
      ],
    },
    {
      compareKey: '阀门-DN80-蝶阀',
      productName: 'DN80蝶阀',
      model: 'D71X-16 DN80',
      minPrice: 180,
      maxPrice: 220,
      items: [
        { id: 'e', compareKey: '阀门-DN80-蝶阀', productName: 'DN80蝶阀', model: 'D71X-16 DN80', price: 220 },
        { id: 'f', compareKey: '阀门-DN80-蝶阀', productName: 'DN80蝶阀', model: 'D71X-16 DN80', price: 180 },
      ],
    },
  ]
}

function sortedKeys(mode: QuoteCompareSortMode) {
  return sortQuoteCompareGroups<Item>(groups(), mode).map((group) => group.compareKey)
}

assert.equal(extractFirstSpecNumber('阀门-DN50-法兰球阀'), 50)
assert.equal(extractFirstSpecNumber('D71X-16 DN80'), 80)
assert.deepEqual(sortedKeys('priceAsc'), ['阀门-DN80-蝶阀', '阀门-DN50-法兰球阀', '阀门-DN100-截止阀'])
assert.deepEqual(sortedKeys('priceDesc'), ['阀门-DN100-截止阀', '阀门-DN50-法兰球阀', '阀门-DN80-蝶阀'])
assert.deepEqual(sortedKeys('paramAsc'), ['阀门-DN50-法兰球阀', '阀门-DN80-蝶阀', '阀门-DN100-截止阀'])
assert.deepEqual(sortedKeys('paramDesc'), ['阀门-DN100-截止阀', '阀门-DN80-蝶阀', '阀门-DN50-法兰球阀'])

const priceSorted = sortQuoteCompareGroups<Item>(groups(), 'priceAsc')
assert.deepEqual(priceSorted[0].items.map((item) => item.price), [180, 220])

console.log('quote compare sorting tests passed')
```

- [ ] **Step 2: Run the script**

Run:

```bash
npx tsx scripts/test-quote-compare-sort.ts
```

Expected:

```text
quote compare sorting tests passed
```

### Task 3: Wire Sorting into Quote Compare Data

**Files:**
- Modify: `lib/quote-compare.ts`

- [ ] **Step 1: Import and type the sort mode**

Add imports:

```ts
import {
  normalizeQuoteCompareSortMode,
  sortQuoteCompareGroups,
  type QuoteCompareSortMode,
} from '@/lib/quote-compare-sort'
```

Extend `QuoteCompareFilter`:

```ts
  sortMode?: QuoteCompareSortMode | string | null;
```

- [ ] **Step 2: Normalize sort mode in `getQuoteCompareData`**

Add near the other normalized filter values:

```ts
  const sortMode = normalizeQuoteCompareSortMode(filter.sortMode)
```

- [ ] **Step 3: Replace final sort with shared sorter**

Replace:

```ts
  result.sort((a, b) => a.compareKey.localeCompare(b.compareKey));

  return result;
```

With:

```ts
  return sortQuoteCompareGroups(result, sortMode);
```

- [ ] **Step 4: Run tests and type check**

Run:

```bash
npx tsx scripts/test-quote-compare-sort.ts
npx tsc --noEmit
```

Expected: sorting test passes; TypeScript has no new errors from the changed files.

### Task 4: Pass Sort Mode Through APIs

**Files:**
- Modify: `app/api/quote-compare/route.ts`
- Modify: `app/api/quote-compare/export/route.ts`

- [ ] **Step 1: Add `sortMode` to the query filter in both route files**

In each filter object, add:

```ts
      sortMode: searchParams.get('sortMode'),
```

- [ ] **Step 2: Verify API and export share the same order**

Run with the local dev server active:

```bash
curl "http://localhost:3000/api/quote-compare?sortMode=priceAsc"
curl -I "http://localhost:3000/api/quote-compare/export?sortMode=priceAsc"
```

Expected:

- JSON endpoint returns `200`.
- CSV export returns `200` with `Content-Type: text/csv; charset=utf-8`.

### Task 5: Add Sort Control to the Page

**Files:**
- Modify: `app/quote-compare/page.tsx`

- [ ] **Step 1: Extend filter state**

Add to `FilterState`:

```ts
  sortMode: string
```

Add to `emptyFilter`:

```ts
  sortMode: '',
```

Add to `appendFilterParams`:

```ts
  if (filter.sortMode) query.append('sortMode', filter.sortMode)
```

Add to `hasFilters`:

```ts
      filter.sortMode ||
```

- [ ] **Step 2: Add the sorting select in the filter grid**

Change the grid from `xl:grid-cols-8` to `xl:grid-cols-9`, then add this block after “报价阶段”:

```tsx
          <div>
            <label className={labelClass}>排序方式</label>
            <select
              value={filter.sortMode}
              onChange={(event) => updateFilter({ sortMode: event.target.value })}
              className={selectClass}
            >
              <option value="">默认排序</option>
              <option value="priceAsc">价格从低到高</option>
              <option value="priceDesc">价格从高到低</option>
              <option value="paramAsc">参数从小到大</option>
              <option value="paramDesc">参数从大到小</option>
            </select>
          </div>
```

- [ ] **Step 3: Confirm query and export include sort mode**

No extra code is needed beyond `appendFilterParams`; `loadData` and `handleExport` already reuse it.

- [ ] **Step 4: Browser check**

Run:

```bash
npm run dev
```

Open:

```text
http://localhost:3000/quote-compare
```

Manual checks:

- 选择“阀门”品类后，默认结果仍能加载。
- 选择“价格从低到高”，较低价格的对比组在前，组内供应商单价也从低到高。
- 选择“价格从高到低”，较高价格的对比组在前，组内供应商单价也从高到低。
- 选择“参数从小到大”，DN50、DN80、DN100 这类结果按参数递增。
- 点击“导出对比结果 (CSV)”后，CSV 顺序与页面排序一致。
- 筛选区在桌面和移动宽度下不重叠。

### Task 6: Update Documentation and Changelog

**Files:**
- Modify: `CHANGELOG.md`
- Optional Modify: `docs/TEST_PLAN.md`

- [ ] **Step 1: Add changelog entry**

Add near the top under the current unreleased/latest section:

```md
- **报价对比排序**：
  - `/quote-compare` 新增排序方式，可按价格从低到高、价格从高到低、参数从小到大、参数从大到小查看报价对比结果。
  - 页面查询与 CSV 导出共用同一排序口径。
```

- [ ] **Step 2: Add manual test note if this becomes a committed feature**

In `docs/TEST_PLAN.md` section `## 7. 报价对比测试`, add:

```md
- [x] 能否按价格从低到高、价格从高到低排序报价对比结果
- [x] 能否按参数从小到大、参数从大到小排序报价对比结果
- [x] 报价对比 CSV 导出顺序是否与页面排序一致
```

### Task 7: Final Verification

**Files:**
- Verify only

- [ ] **Step 1: Run focused sorting test**

```bash
npx tsx scripts/test-quote-compare-sort.ts
```

Expected:

```text
quote compare sorting tests passed
```

- [ ] **Step 2: Run project checks**

```bash
npm test
npx tsc --noEmit
npm run build
git diff --check
```

Expected: all commands pass.

- [ ] **Step 3: Browser verification**

Use the browser to verify `/quote-compare` with at least:

- 阀门 + 默认排序
- 阀门 + 价格从低到高
- 阀门 + 价格从高到低
- 阀门 + 参数从小到大
- 阀门 + 参数从大到小
- CSV export for one sorted state

- [ ] **Step 4: Commit**

```bash
git add lib/quote-compare-sort.ts scripts/test-quote-compare-sort.ts lib/quote-compare.ts app/api/quote-compare/route.ts app/api/quote-compare/export/route.ts app/quote-compare/page.tsx CHANGELOG.md docs/TEST_PLAN.md
git commit -m "feat: add quote compare sorting"
```

## Self-Review

- Spec coverage: 价格低到高、高到低、参数小到大、大到小均有 UI、API、导出和测试任务覆盖。
- Placeholder scan: 无 TBD/TODO/“稍后实现”等占位内容。
- Type consistency: `sortMode`、`QuoteCompareSortMode`、`priceAsc`、`priceDesc`、`paramAsc`、`paramDesc` 在计划中保持一致。
- Scope check: 只改报价对比排序，不碰报价导入、供应商数据模型、Prisma schema 或部署脚本。
