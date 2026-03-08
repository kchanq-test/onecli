"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, ExternalLink } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import {
  getServiceInfo,
  disconnectService,
  connectResendService,
  getResendDomains,
} from "@/lib/actions/services";
import type { ResendDomain } from "@/lib/resend";
import { Button } from "@onecli/ui/components/button";
import { Badge } from "@onecli/ui/components/badge";
import { Input } from "@onecli/ui/components/input";
import { Skeleton } from "@onecli/ui/components/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@onecli/ui/components/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@onecli/ui/components/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@onecli/ui/components/tooltip";

export function ResendConnect() {
  const { user } = useAuth();
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [keyPreview, setKeyPreview] = useState<string | null>(null);

  // Connect form state
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Manage state
  const [domains, setDomains] = useState<ResendDomain[]>([]);
  const [domainsLoading, setDomainsLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    getServiceInfo("resend", user.id).then((info) => {
      setStatus(info.status);
      if (info.metadata) {
        const meta = info.metadata as {
          domains?: ResendDomain[];
          keyPreview?: string;
        };
        if (meta.keyPreview) setKeyPreview(meta.keyPreview);
      }
      setLoaded(true);

      if (info.status === "connected") {
        setDomainsLoading(true);
        getResendDomains(user.id)
          .then(setDomains)
          .finally(() => setDomainsLoading(false));
      }
    });
  }, [user?.id]);

  const isConnected = status === "connected";
  const isRevoked = status === "revoked";

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      toast.error("Please enter your API key");
      return;
    }

    if (!apiKey.startsWith("re_")) {
      toast.error("Resend API keys start with re_");
      return;
    }

    setConnecting(true);
    try {
      await connectResendService(apiKey, user?.id);
      toast.success("Resend connected successfully");
      router.push("/services?connected=resend");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to connect Resend",
      );
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await disconnectService("resend", user?.id);
      toast.success("Resend disconnected");
      router.push("/services");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  };

  if (!loaded) return null;

  // Connected / manage state
  if (isConnected) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
                <ResendIcon className="size-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Manage Resend</CardTitle>
                <CardDescription>
                  Transactional emails, domains, and contacts
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {keyPreview && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded font-mono cursor-default">
                      {keyPreview}
                    </code>
                  </TooltipTrigger>
                  <TooltipContent>
                    For security, full API keys are only shown once at creation.
                  </TooltipContent>
                </Tooltip>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    Disconnect
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disconnect Resend?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="text-sm text-muted-foreground">
                        <p>
                          This will remove your stored API key and disconnect
                          Resend. You can reconnect at any time with a new key.
                        </p>
                        <p className="mt-2">
                          To revoke the key itself, visit your{" "}
                          <a
                            href="https://resend.com/api-keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline text-foreground hover:text-foreground/80"
                          >
                            Resend API keys dashboard
                          </a>
                          .
                        </p>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                    >
                      {disconnecting ? "Disconnecting..." : "Disconnect"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Domains</h3>

            {domainsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : domains.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Domains are not visible with sending-only API keys. View your
                domains on the Resend dashboard.
              </p>
            ) : (
              <div className="space-y-1.5">
                {domains.map((domain) => (
                  <div
                    key={domain.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <span className="text-sm font-medium">{domain.name}</span>
                    <Badge
                      variant={
                        domain.status === "verified" ? "default" : "secondary"
                      }
                      className="text-[10px] px-1.5 py-0"
                    >
                      {domain.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            <a
              href="https://resend.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="w-full mt-2">
                <ExternalLink className="mr-2 size-3.5" />
                Manage on Resend
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not connected / revoked state
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
            <ResendIcon className="size-5" />
          </div>
          <div>
            <CardTitle className="text-lg">Connect Resend</CardTitle>
            <CardDescription>
              Transactional emails, domains, and contacts
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isRevoked && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-600 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-400">
            <span className="mt-0.5 shrink-0">&#9888;</span>
            <p>
              Your Resend API key is no longer valid. Enter a new key to
              reconnect.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="resend-api-key" className="text-sm font-medium">
            API Key
          </label>
          <div className="relative">
            {showKey ? (
              <Input
                id="resend-api-key"
                type="text"
                placeholder="re_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConnect();
                }}
                className="pr-10 font-mono"
              />
            ) : (
              <div
                className="flex items-center border rounded-md px-3 h-9 bg-background cursor-text pr-10 font-mono text-sm"
                onClick={() => setShowKey(true)}
              >
                <span className="text-muted-foreground">
                  {apiKey ? apiKey.slice(0, 12) + "..." : "re_..."}
                </span>
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? (
                <EyeOff className="size-4 text-muted-foreground" />
              ) : (
                <Eye className="size-4 text-muted-foreground" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter your Resend API key (starts with{" "}
            <code className="bg-muted px-1 rounded">re_</code>).{" "}
            <a
              href="https://resend.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Create one on Resend
            </a>
          </p>
        </div>

        <Button
          className="w-full"
          onClick={handleConnect}
          disabled={connecting || !apiKey.trim()}
        >
          {connecting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Validating...
            </>
          ) : isRevoked ? (
            "Reconnect"
          ) : (
            "Connect"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function ResendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1800 1800" fill="currentColor">
      <path d="M1000.46 450C1174.77 450 1278.43 553.669 1278.43 691.282C1278.43 828.896 1174.77 932.563 1000.46 932.563H912.382L1350 1350H1040.82L707.794 1033.48C683.944 1011.47 672.936 985.781 672.935 963.765C672.935 932.572 694.959 905.049 737.161 893.122L908.712 847.244C973.85 829.812 1018.81 779.353 1018.81 713.298C1018.8 632.567 952.745 585.78 871.095 585.78H450V450H1000.46Z" />
    </svg>
  );
}
