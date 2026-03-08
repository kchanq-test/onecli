"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider";
import {
  getServiceInfo,
  disconnectService,
  getGitHubOrgs,
  getGitHubOrgAccessUrl,
} from "@/lib/actions/services";
import type { GitHubOrgInfo } from "@/lib/actions/services";
import { GITHUB_SCOPES } from "@/lib/github";
import { Button } from "@onecli/ui/components/button";
import { Badge } from "@onecli/ui/components/badge";
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

export function GitHubConnect() {
  const { user } = useAuth();
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [metadata, setMetadata] = useState<{
    login?: string;
    email?: string;
    name?: string;
    avatar_url?: string;
  } | null>(null);
  const [approvedScopes, setApprovedScopes] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<GitHubOrgInfo[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [orgAccessUrl, setOrgAccessUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    getServiceInfo("github", user.id).then((info) => {
      if (info.metadata) {
        setMetadata(
          info.metadata as {
            login?: string;
            email?: string;
            name?: string;
            avatar_url?: string;
          },
        );
      }
      setApprovedScopes(info.scopes);
      setStatus(info.status);
      setLoaded(true);

      // Fetch orgs + org access URL once connected
      if (info.status === "connected") {
        setOrgsLoading(true);
        Promise.all([getGitHubOrgs(user.id), getGitHubOrgAccessUrl()])
          .then(([orgsList, url]) => {
            setOrgs(orgsList);
            setOrgAccessUrl(url);
          })
          .finally(() => setOrgsLoading(false));
      }
    });
  }, [user?.id]);

  const isConnected = status === "connected";
  const isRevoked = status === "revoked";

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await disconnectService("github", user?.id);
      toast.success("GitHub disconnected");
      router.push("/services");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  };

  if (!loaded) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
              <GitHubIcon className="size-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Manage GitHub</CardTitle>
              <CardDescription>
                Repositories, issues, pull requests, and commits
              </CardDescription>
            </div>
          </div>
          {metadata?.login && (
            <div className="flex items-center gap-2">
              {metadata.avatar_url && (
                <Image
                  src={metadata.avatar_url}
                  alt=""
                  width={24}
                  height={24}
                  className="rounded-full"
                  referrerPolicy="no-referrer"
                  unoptimized
                />
              )}
              <span className="text-sm text-muted-foreground">
                {metadata.login}
              </span>
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
                    <AlertDialogTitle>Disconnect GitHub?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="text-sm text-muted-foreground">
                        <p>
                          This will revoke all permissions and disconnect your
                          GitHub account (@{metadata.login}). You can reconnect
                          at any time.
                        </p>
                        <p className="mt-2">
                          You can also{" "}
                          <a
                            href={
                              orgAccessUrl ??
                              "https://github.com/settings/apps/authorizations"
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline text-foreground hover:text-foreground/80"
                          >
                            review permissions in your GitHub settings
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
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isRevoked && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-600 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-400">
            <span className="mt-0.5 shrink-0">&#9888;</span>
            <p>
              Your GitHub connection was lost. Permissions were revoked
              externally. Reconnect to restore access, or disconnect to use a
              different account.
            </p>
          </div>
        )}

        {approvedScopes.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Permissions</h3>
            {GITHUB_SCOPES.filter((s) => approvedScopes.includes(s.id)).map(
              (scope) => (
                <div
                  key={scope.id}
                  className="flex items-center gap-2 rounded-lg border p-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{scope.label}</span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0"
                      >
                        Approved
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {scope.description}
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>
        )}

        {isConnected && !isRevoked && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Organizations</h3>

            {orgsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <Skeleton className="size-6 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : orgs.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No organization memberships found. Personal account access is
                always included.
              </p>
            ) : (
              <div className="space-y-1.5">
                {orgs.map((org) => (
                  <a
                    key={org.id}
                    href={`https://github.com/${org.login}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <Image
                      src={org.avatar_url}
                      alt=""
                      width={24}
                      height={24}
                      className="rounded-full"
                      unoptimized
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{org.login}</span>
                      {org.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {org.description}
                        </p>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            )}

            {orgAccessUrl && (
              <a href={orgAccessUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="w-full">
                  Grant access to more organizations
                </Button>
              </a>
            )}
          </div>
        )}

        {(isRevoked || !isConnected) && (
          <Button
            className="w-full"
            onClick={() => {
              window.location.href = "/api/plugins/connect/github";
            }}
          >
            {isRevoked ? "Reconnect" : "Connect"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}
