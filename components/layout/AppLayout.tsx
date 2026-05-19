import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f6f8fb] flex">
      {/* Sidebar - fixed */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 ml-[220px] flex flex-col min-h-screen">
        {/* Header - sticky */}
        <Header />

        {/* Page Content */}
        <main className="flex-1">
          <div className="max-w-[1440px] mx-auto px-8 py-6 pb-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
