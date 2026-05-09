export default function Home() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">首页仪表盘</h1>
      <p className="text-gray-600">展示系统的核心统计数据、本周待办概览及开发、采购的宏观进度。</p>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center items-center">
          <div className="text-sm text-gray-500 mb-1">供应商总数</div>
          <div className="text-3xl font-bold text-blue-600">-</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center items-center">
          <div className="text-sm text-gray-500 mb-1">本周待办</div>
          <div className="text-3xl font-bold text-orange-500">-</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center items-center">
          <div className="text-sm text-gray-500 mb-1">待审批流程</div>
          <div className="text-3xl font-bold text-red-500">-</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center items-center">
          <div className="text-sm text-gray-500 mb-1">已收录报价</div>
          <div className="text-3xl font-bold text-green-600">-</div>
        </div>
      </div>

      <div className="mt-8 border-2 border-dashed border-gray-200 rounded-lg h-64 flex items-center justify-center">
        <span className="text-gray-400">（仪表盘模块开发中）</span>
      </div>
    </div>
  );
}
