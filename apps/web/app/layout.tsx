import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import { CompanyProfileStore } from "@/lib/enterprise/CompanyProfileStore";
import { resolveCurrentUser } from "@/lib/enterprise/CurrentUserStore";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AINEX | Enterprise Digital Workforce Platform",
  description:
    "AINEX gives enterprises a Digital Workforce that answers business questions, reads company knowledge, and triggers workflows alongside human teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { industry, size, company } = CompanyProfileStore.getCurrent();
  const currentUser = resolveCurrentUser(company);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="flex min-h-screen">
          <Sidebar industry={industry} size={size} users={company.enterpriseUsers} currentUserId={currentUser.id} />
          <main className="flex-1 p-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
