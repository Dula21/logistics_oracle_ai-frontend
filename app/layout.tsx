import type { Metadata } from "next";
import "./globals.css";
 
export const metadata: Metadata = {
  title: "Oracle Logistics · Dubai SME Intelligence Engine",
  description: "AI-powered inventory forecasting and reorder intelligence for Dubai SMEs in JAFZA and D3.",
};
 
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
 