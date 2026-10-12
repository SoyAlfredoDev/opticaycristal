import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Panel interno" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
