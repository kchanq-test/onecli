import { Suspense } from "react";
import type { Metadata } from "next";
import { AuditContent } from "./_components/audit-content";

export const metadata: Metadata = {
  title: "Audit Log",
};

export default function AuditPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground text-sm">
          A full history of actions performed through the OneCLI.
        </p>
      </div>

      <Suspense>
        <AuditContent />
      </Suspense>
    </div>
  );
}
