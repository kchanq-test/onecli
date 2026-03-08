import { redirect } from "next/navigation";
import { GOOGLE_SCOPES, GOOGLE_SERVICES } from "@/lib/google";
import { ScopePicker } from "./_components/scope-picker";
import { GitHubConnect } from "./_components/github-connect";
import { ResendConnect } from "./_components/resend-connect";

const SUPPORTED_PROVIDERS = new Set(["google", "github", "resend"]);

export default async function ConnectProviderPage({
  params,
}: {
  params: Promise<{ provider: string }>;
}) {
  const { provider } = await params;

  if (!SUPPORTED_PROVIDERS.has(provider)) {
    redirect("/services");
  }

  return (
    <div className="flex flex-1 flex-col gap-6 max-w-6xl">
      {provider === "google" && (
        <ScopePicker
          provider={provider}
          scopes={GOOGLE_SCOPES}
          services={GOOGLE_SERVICES}
        />
      )}
      {provider === "github" && (
        <div className="max-w-xl">
          <GitHubConnect />
        </div>
      )}
      {provider === "resend" && (
        <div className="max-w-xl">
          <ResendConnect />
        </div>
      )}
    </div>
  );
}
