import { Suspense } from "react";
import type { Metadata } from "next";
import { ServicesGrid } from "./_components/services-grid";

export const metadata: Metadata = {
  title: "Services",
};

export default function ServicesPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Services</h1>
        <p className="text-muted-foreground text-sm">
          Manage the services connected to your OneCLI account.
        </p>
      </div>

      <Suspense>
        <ServicesGrid />
      </Suspense>
    </div>
  );
}
