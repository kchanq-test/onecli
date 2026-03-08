"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider";
import { getConnectedServices } from "@/lib/actions/services";
import { Card } from "@onecli/ui/components/card";
import { Skeleton } from "@onecli/ui/components/skeleton";
import { GOOGLE_DEFAULT_SCOPE_IDS } from "@/lib/google";
import { ServiceCard } from "./service-card";

interface ConnectedService {
  id: string;
  provider: string;
  status: string;
  scopes: string[];
  connectedAt: Date;
}

const allServices = [
  {
    provider: "google",
    name: "Google",
    description: "Gmail, Calendar, Drive, and more.",
    icon: GoogleIcon,
  },
  {
    provider: "github",
    name: "GitHub",
    description: "Issues, PRs, repos, and actions.",
    icon: GitHubIcon,
  },
  {
    provider: "resend",
    name: "Resend",
    description: "Transactional emails, domains, and contacts.",
    icon: ResendIcon,
  },
  {
    provider: "slack",
    name: "Slack",
    description: "Messages, channels, and workflows.",
    icon: SlackIcon,
    comingSoon: true,
  },
  {
    provider: "linear",
    name: "Linear",
    description: "Issues, projects, and cycles.",
    icon: LinearIcon,
    comingSoon: true,
  },
];

export function ServicesGrid() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [connectedServices, setConnectedServices] = useState<
    ConnectedService[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    getConnectedServices(user.id).then((services) => {
      setConnectedServices(services);
      setLoading(false);
    });
  }, [user?.id]);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");

    if (connected) {
      const name =
        allServices.find((s) => s.provider === connected)?.name ?? connected;
      toast.success(`${name} connected successfully`);
      window.history.replaceState({}, "", "/services");
      // Refetch to show updated state
      if (user?.id) {
        getConnectedServices(user.id).then(setConnectedServices);
      }
    }

    if (error) {
      const messages: Record<string, string> = {
        missing_params: "OAuth callback was missing required parameters.",
        invalid_state: "Invalid OAuth state. Please try again.",
        token_exchange_failed: "Failed to exchange authorization code.",
        callback_failed: "Something went wrong during connection.",
        account_mismatch:
          "You selected a different Google account. Please use the same account you originally connected with.",
      };
      toast.error(messages[error] ?? `Connection failed: ${error}`);
      window.history.replaceState({}, "", "/services");
    }
  }, [searchParams, user?.id]);

  const connectedMap = new Map(connectedServices.map((s) => [s.provider, s]));

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {allServices.map((service) => (
          <Card key={service.provider} className="overflow-hidden">
            <div className="p-6 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-lg" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
            <div className="px-6 pb-6 space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-8 w-full rounded-md" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {allServices.map((service) => {
        const connected = connectedMap.get(service.provider);
        return (
          <ServiceCard
            key={service.provider}
            provider={service.provider}
            name={service.name}
            description={service.description}
            icon={service.icon}
            status={
              connected?.status === "connected"
                ? "connected"
                : connected?.status === "revoked"
                  ? "revoked"
                  : undefined
            }
            scopeCount={
              service.provider === "google"
                ? (connected?.scopes?.filter(
                    (s) => !GOOGLE_DEFAULT_SCOPE_IDS.includes(s),
                  ).length ?? 0)
                : (connected?.scopes?.length ?? 0)
            }
            comingSoon={service.comingSoon}
          />
        );
      })}
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function SlackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52z"
        fill="#E01E5A"
      />
      <path
        d="M6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"
        fill="#E01E5A"
      />
      <path
        d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834z"
        fill="#36C5F0"
      />
      <path
        d="M8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"
        fill="#36C5F0"
      />
      <path
        d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834z"
        fill="#2EB67D"
      />
      <path
        d="M17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"
        fill="#2EB67D"
      />
      <path
        d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52z"
        fill="#ECB22E"
      />
      <path
        d="M15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"
        fill="#ECB22E"
      />
    </svg>
  );
}

function ResendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1800 1800" fill="currentColor">
      <path d="M1000.46 450C1174.77 450 1278.43 553.669 1278.43 691.282C1278.43 828.896 1174.77 932.563 1000.46 932.563H912.382L1350 1350H1040.82L707.794 1033.48C683.944 1011.47 672.936 985.781 672.935 963.765C672.935 932.572 694.959 905.049 737.161 893.122L908.712 847.244C973.85 829.812 1018.81 779.353 1018.81 713.298C1018.8 632.567 952.745 585.78 871.095 585.78H450V450H1000.46Z" />
    </svg>
  );
}

function LinearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#5E6AD2">
      <path d="M2.886 4.18A11.982 11.982 0 0 1 11.99 0C18.624 0 24 5.376 24 12.009c0 3.64-1.62 6.903-4.18 9.105L2.887 4.18ZM1.817 5.626l16.556 16.556c-.524.33-1.075.62-1.65.866L.951 7.277c.247-.575.537-1.126.866-1.65ZM.322 9.163l14.515 14.515c-.71.172-1.443.282-2.195.322L0 11.358a12 12 0 0 1 .322-2.195Zm-.17 4.862 9.823 9.824a12.02 12.02 0 0 1-9.824-9.824Z" />
    </svg>
  );
}
