import { cookies } from "next/headers";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { auth } from "../(auth)/auth";
import Script from "next/script";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import NoiseBackground from "@/components/noise-background";

export const experimental_ppr = true;

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const isCollapsed = cookieStore.get("sidebar:state")?.value !== "true";

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      <DataStreamProvider>
        <SidebarProvider defaultOpen={!isCollapsed}>
          <SidebarInset>
            <Navbar />
            {children}
            <Footer />
          </SidebarInset>
        </SidebarProvider>
      </DataStreamProvider>
    </>
  );
}
