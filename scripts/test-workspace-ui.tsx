import { renderToStaticMarkup } from 'react-dom/server'
import {
  PageHeader,
  FilterPanel,
  KpiStrip,
  StatusBadge,
} from '../components/ui/WorkspaceShell'
import { normalizeListResponse } from '../lib/list-response'

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

const headerMarkup = renderToStaticMarkup(
  <PageHeader
    title="报价对比"
    eyebrow="采购决策"
    description="跨供应商对比同类产品报价"
    actions={<button type="button">导出 CSV</button>}
  />
)

assert(headerMarkup.includes('报价对比'), 'PageHeader should render the title')
assert(headerMarkup.includes('采购决策'), 'PageHeader should render the eyebrow')
assert(headerMarkup.includes('导出 CSV'), 'PageHeader should render action content')
assert(headerMarkup.includes('workship-page-header'), 'PageHeader should expose the shared shell class')

const filterMarkup = renderToStaticMarkup(
  <FilterPanel
    summary="已筛选 3 个条件"
    actions={<button type="button">重置</button>}
  >
    <label>品类</label>
  </FilterPanel>
)

assert(filterMarkup.includes('已筛选 3 个条件'), 'FilterPanel should render a summary')
assert(filterMarkup.includes('品类'), 'FilterPanel should render children')
assert(filterMarkup.includes('workship-filter-panel'), 'FilterPanel should expose the shared panel class')

const kpiMarkup = renderToStaticMarkup(
  <KpiStrip
    items={[
      { label: '最低价', value: '¥1,280', tone: 'success' },
      { label: '风险提醒', value: '2', tone: 'danger' },
    ]}
  />
)

assert(kpiMarkup.includes('最低价'), 'KpiStrip should render KPI labels')
assert(kpiMarkup.includes('¥1,280'), 'KpiStrip should render KPI values')
assert(kpiMarkup.includes('workship-kpi-strip'), 'KpiStrip should expose the shared strip class')

const badgeMarkup = renderToStaticMarkup(<StatusBadge tone="warning">需决策</StatusBadge>)

assert(badgeMarkup.includes('需决策'), 'StatusBadge should render children')
assert(badgeMarkup.includes('workship-status-badge'), 'StatusBadge should expose the shared badge class')

const normalizedList = normalizeListResponse([{ id: '1' }])
assert(normalizedList.length === 1, 'normalizeListResponse should preserve array responses')

const normalizedError = normalizeListResponse({ error: '未登录' })
assert(Array.isArray(normalizedError), 'normalizeListResponse should always return an array')
assert(normalizedError.length === 0, 'normalizeListResponse should turn non-array responses into an empty array')

console.log('workspace UI component contracts passed')
