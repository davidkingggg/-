import Link from 'next/link'

const templateLinks = [
  {
    title: '报价明细导入模板',
    description: '正式支持导入，包含示例行、必填字段和报价合并规则。',
    href: '/api/csv-templates?type=quote-items',
    status: '可导入',
  },
  {
    title: '供应商导入预研模板',
    description: '用于理解供应商字段结构，第 8C 第一版暂不开放供应商 CSV 导入。',
    href: '/api/csv-templates?type=suppliers',
    status: '模板预研',
  },
]

const exportLinks = [
  { title: '报价数据 CSV', href: '/api/quotes/export', description: '导出报价单与报价明细。' },
  { title: '报价对比 CSV', href: '/quote-compare', description: '进入报价对比页后按筛选条件导出。' },
  { title: '老板汇报 CSV', href: '/boss-report', description: '进入老板汇报页后按周期导出。' },
  { title: '销售/商务资料', href: '/sales-materials', description: '支持 CSV 和 Markdown 导出。' },
]

export default function Page() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">数据导入导出</h1>
        <p className="text-sm text-gray-500 mt-1">
          管理 CSV 模板下载、报价导入入口和各类数据导出。数据库备份恢复请使用本地备份恢复页面。
        </p>
      </div>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">CSV 模板下载</h2>
            <p className="text-sm text-gray-500 mt-1">模板使用 UTF-8 BOM，适合用 Excel 打开并保留中文表头。</p>
          </div>
          <Link
            href="/quotes"
            className="px-4 py-2 text-sm text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            前往报价导入
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templateLinks.map((item) => (
            <div key={item.href} className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-800">{item.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                </div>
                <span className="shrink-0 px-2 py-1 text-xs rounded bg-gray-100 text-gray-600">{item.status}</span>
              </div>
              <a
                href={item.href}
                className="inline-block mt-4 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                下载 CSV
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">导出入口</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exportLinks.map((item) => (
            <div key={item.title} className="border border-gray-100 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800">{item.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{item.description}</p>
              <Link
                href={item.href}
                className="inline-block mt-4 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                打开
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">报价导入规则</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="font-medium text-gray-800 mb-1">严格校验</div>
            <p>导入前完整检查所有行，任意错误都会整文件失败。</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="font-medium text-gray-800 mb-1">错误报告</div>
            <p>失败时显示行号、字段、原始值、错误原因和修改建议，并可下载 CSV。</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="font-medium text-gray-800 mb-1">格式统一</div>
            <p>导出 CSV 统一使用中文表头、UTF-8 BOM 和标准 CSV 转义。</p>
          </div>
        </div>
      </section>
    </div>
  )
}
