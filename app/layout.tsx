import type { Metadata } from "next";
import "./globals.css";
import { ClientProviders } from "@/components/layout/ClientProviders";
import { LayoutGate } from "@/components/layout/LayoutGate";

export const metadata: Metadata = {
  title: "供采管家",
  description: "本地优先的供应商与采购管理平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="bg-gray-50 text-gray-900">
        <ClientProviders>
          <LayoutGate>
            {children}
          </LayoutGate>
        </ClientProviders>
      </body>
    </html>
  );
}
