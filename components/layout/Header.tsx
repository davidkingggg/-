export default function Header() {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm sticky top-0 z-10">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">锅炉行业集成采购平台</h1>
      </div>
      <div className="flex items-center space-x-4">
        <div className="text-sm text-gray-600">
          你好, 演示用户
        </div>
        <div className="h-8 w-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
          U
        </div>
      </div>
    </header>
  );
}
