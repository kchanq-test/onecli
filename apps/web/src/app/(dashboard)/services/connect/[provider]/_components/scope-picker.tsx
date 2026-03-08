"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider";
import { getServiceInfo, disconnectService } from "@/lib/actions/services";
import { Button } from "@onecli/ui/components/button";
import { Checkbox } from "@onecli/ui/components/checkbox";
import { Label } from "@onecli/ui/components/label";
import { Badge } from "@onecli/ui/components/badge";
import { Input } from "@onecli/ui/components/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@onecli/ui/components/card";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@onecli/ui/components/tooltip";
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
import { GOOGLE_DEFAULT_SCOPE_IDS } from "@/lib/google";
import type { GoogleScope, GoogleService } from "@/lib/google";

const serviceIcons: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  mail: GmailIcon,
  calendar: CalendarIcon,
  "hard-drive": DriveIcon,
  sheet: SheetsIcon,
};

interface ScopePickerProps {
  provider: string;
  scopes: GoogleScope[];
  services: GoogleService[];
}

export function ScopePicker({ provider, scopes, services }: ScopePickerProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [approvedScopes, setApprovedScopes] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [disconnecting, setDisconnecting] = useState(false);
  const [metadata, setMetadata] = useState<{
    email?: string;
    picture?: string;
    name?: string;
  } | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await disconnectService(provider, user?.id);
      toast.success("Google disconnected");
      router.push("/services");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    getServiceInfo(provider, user.id).then((info) => {
      const defaultSet = new Set(GOOGLE_DEFAULT_SCOPE_IDS);
      const visible = info.scopes.filter((id) => !defaultSet.has(id));
      setApprovedScopes(visible);
      setSelected(new Set(visible.length > 0 ? visible : ["gmail.send"]));
      if (info.metadata)
        setMetadata(
          info.metadata as { email?: string; picture?: string; name?: string },
        );
      setStatus(info.status);
      setLoaded(true);
    });
  }, [user?.id, provider]);

  const hasExisting = approvedScopes.length > 0;
  const isRevoked = status === "revoked";
  const scopeMap = new Map(scopes.map((s) => [s.id, s]));

  const toggleScope = (id: string) => {
    if (approvedScopes.includes(id)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = (scopeIds: string[]) => {
    const toggleable = scopeIds.filter((id) => !approvedScopes.includes(id));
    if (toggleable.length === 0) return;

    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = toggleable.every((id) => next.has(id));
      if (allSelected) {
        toggleable.forEach((id) => next.delete(id));
      } else {
        toggleable.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const newScopes = [...selected].filter((id) => !approvedScopes.includes(id));

  const handleConnect = () => {
    const scopeParam = [...selected].join(",");
    const params = new URLSearchParams({ scopes: scopeParam });
    if (user?.id) params.set("authId", user.id);
    window.location.href = `/api/plugins/connect/${provider}?${params.toString()}`;
  };

  const allScopeIds = services.flatMap((s) => s.scopeIds);
  const allToggleable = allScopeIds.filter(
    (id) => !approvedScopes.includes(id),
  );
  const allGlobalSelected =
    allToggleable.length > 0 && allToggleable.every((id) => selected.has(id));

  const toggleGlobal = () => {
    if (allToggleable.length === 0) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (allGlobalSelected) {
        allToggleable.forEach((id) => next.delete(id));
      } else {
        allToggleable.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const filteredServices = services.filter((service) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const serviceScopes = service.scopeIds
      .map((id) => scopeMap.get(id))
      .filter(Boolean) as GoogleScope[];
    return (
      service.name.toLowerCase().includes(q) ||
      serviceScopes.some(
        (s) =>
          s.label.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q),
      )
    );
  });

  if (!loaded) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
              <GoogleIcon className="size-5" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {isRevoked ? "Reconnect" : "Connect"} Google
              </CardTitle>
              <CardDescription>
                Choose which Google services to connect
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {metadata?.email && (
              <div className="flex items-center gap-2">
                {metadata.picture && (
                  <Image
                    src={metadata.picture}
                    alt=""
                    width={24}
                    height={24}
                    className="rounded-full"
                    referrerPolicy="no-referrer"
                    unoptimized
                  />
                )}
                <span className="text-sm text-muted-foreground">
                  {metadata.email}
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
                      <AlertDialogTitle>Disconnect Google?</AlertDialogTitle>
                      <AlertDialogDescription asChild>
                        <div className="text-sm text-muted-foreground">
                          <p>
                            This will revoke all permissions and disconnect your
                            Google account ({metadata.email}). You can reconnect
                            at any time.
                          </p>
                          <p className="mt-2">
                            You can also{" "}
                            <a
                              href={`https://myaccount.google.com/u/${metadata.email}/connections`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline text-foreground hover:text-foreground/80"
                            >
                              review permissions in your Google account
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
            {allToggleable.length > 0 && (
              <div className="flex items-center gap-2">
                {selected.size > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground cursor-default">
                        {selected.size}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-72 p-3">
                      <p className="font-medium mb-1.5 text-[11px] uppercase tracking-wide opacity-70">
                        Default info
                      </p>
                      <ul className="list-none space-y-1">
                        <li className="flex items-center gap-2">
                          <span className="size-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
                          Profile info
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="size-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
                          Email address
                        </li>
                      </ul>
                      <hr className="my-2 border-muted-foreground/30" />
                      <p className="font-medium mb-1.5 text-[11px] uppercase tracking-wide opacity-70">
                        Extra scopes
                      </p>
                      <ul className="list-none space-y-1">
                        {[...selected].map((id) => {
                          const s = scopeMap.get(id);
                          if (!s) return null;
                          const isReadOnly = id.includes("readonly");
                          return (
                            <li key={id} className="flex items-center gap-2">
                              <span
                                className={`size-1.5 rounded-full shrink-0 ${isReadOnly ? "bg-blue-400" : "bg-red-400"}`}
                              />
                              <span
                                className={
                                  isReadOnly ? "text-blue-400" : "text-red-400"
                                }
                              >
                                {s.label}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                      <hr className="my-2 border-muted-foreground/30" />
                      <div className="flex items-center gap-3 text-[10px] opacity-60">
                        <span className="flex items-center gap-1">
                          <span className="size-1.5 rounded-full bg-blue-400" />{" "}
                          read
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="size-1.5 rounded-full bg-red-400" />{" "}
                          write
                        </span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
                <Checkbox
                  id="select-all-global"
                  checked={allGlobalSelected}
                  onCheckedChange={toggleGlobal}
                  className="size-5"
                />
                <Label
                  htmlFor="select-all-global"
                  className="text-sm text-muted-foreground cursor-pointer whitespace-nowrap"
                >
                  Select all
                </Label>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isRevoked && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-600 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-400">
            <span className="mt-0.5 shrink-0">&#9888;</span>
            <p>
              Your Google connection was lost. Permissions were revoked
              externally. Reconnect to restore access, or disconnect to use a
              different account.
            </p>
          </div>
        )}
        <Input
          placeholder="Search services..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <div className="grid grid-cols-4 gap-3">
          {filteredServices.map((service) => {
            const Icon = serviceIcons[service.icon] ?? GmailIcon;
            const serviceScopes = service.scopeIds
              .map((id) => scopeMap.get(id))
              .filter(Boolean) as GoogleScope[];
            const toggleable = service.scopeIds.filter(
              (id) => !approvedScopes.includes(id),
            );
            const allSelected =
              toggleable.length > 0 &&
              toggleable.every((id) => selected.has(id));

            return (
              <div
                key={service.name}
                className="border rounded-lg flex flex-col"
              >
                <div className="flex items-center justify-between p-3 border-b">
                  <div className="flex items-center gap-2.5">
                    <Icon className="size-5" />
                    <span className="font-medium text-sm">{service.name}</span>
                  </div>
                  {toggleable.length > 0 && (
                    <Checkbox
                      id={`all-${service.name}`}
                      checked={allSelected}
                      onCheckedChange={() => toggleAll(service.scopeIds)}
                      className="size-5"
                    />
                  )}
                </div>
                <div className="p-3 space-y-3 flex-1">
                  {serviceScopes.map((scope) => {
                    const isApproved = approvedScopes.includes(scope.id);
                    return (
                      <div key={scope.id} className="flex items-start gap-2.5">
                        <Checkbox
                          id={scope.id}
                          checked={selected.has(scope.id)}
                          disabled={isApproved}
                          onCheckedChange={() => toggleScope(scope.id)}
                          className="mt-0.5 size-5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Label
                              htmlFor={scope.id}
                              className={`text-sm ${isApproved ? "cursor-default" : "cursor-pointer"}`}
                            >
                              {scope.label}
                            </Label>
                            {isApproved && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0"
                              >
                                Approved
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {scope.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <Button
          className="w-full"
          disabled={
            selected.size === 0 ||
            (hasExisting && !isRevoked && newScopes.length === 0)
          }
          onClick={handleConnect}
        >
          {isRevoked
            ? "Reconnect"
            : hasExisting
              ? "Update permissions"
              : "Connect"}
          {newScopes.length > 0 && ` (${newScopes.length} new)`}
        </Button>
      </CardContent>
    </Card>
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

function GmailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"
        fill="#EA4335"
      />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M18.316 5.684H24v12.632h-5.684V5.684z" fill="#1A73E8" />
      <path d="M5.684 24h12.632v-5.684H5.684V24z" fill="#1A73E8" />
      <path
        d="M18.316 5.684V0H1.895A1.895 1.895 0 0 0 0 1.895v16.421h5.684V5.684h12.632z"
        fill="#EA4335"
      />
      <path
        d="M24 5.684V1.895A1.895 1.895 0 0 0 22.105 0h-3.789v5.684H24z"
        fill="#188038"
      />
      <path
        d="M18.316 18.316V24h3.789A1.895 1.895 0 0 0 24 22.105v-3.789h-5.684z"
        fill="#34A853"
      />
      <path
        d="M0 18.316v3.789A1.895 1.895 0 0 0 1.895 24h3.789v-5.684H0z"
        fill="#4285F4"
      />
      <path d="M0 5.684v12.632h5.684V5.684H0z" fill="#FBBC04" />
      <path d="M5.684 0v5.684h12.632V0H5.684z" fill="#188038" />
      <path fill="#fff" d="M5.684 5.684h12.632v12.632H5.684z" />
      <path
        d="M9.27 15.834a2.63 2.63 0 0 1-1.753-.644 2.46 2.46 0 0 1-.873-1.6l1.1-.453c.08.387.27.72.566.997.296.277.642.416 1.04.416.406 0 .757-.144 1.054-.43.296-.288.444-.644.444-1.068 0-.435-.154-.796-.462-1.082-.308-.286-.67-.43-1.09-.43h-.676v-1.07h.607c.37 0 .688-.13.95-.39.264-.26.396-.59.396-.99 0-.37-.12-.67-.36-.898-.24-.228-.55-.342-.93-.342-.37 0-.665.112-.884.336a1.94 1.94 0 0 0-.464.812l-1.084-.452c.164-.498.46-.92.89-1.264.428-.344.958-.516 1.588-.516.448 0 .852.094 1.212.28.36.188.642.446.848.776.206.33.308.7.308 1.108 0 .42-.098.782-.294 1.086a2.12 2.12 0 0 1-.752.722v.076c.374.178.68.44.914.788.234.348.352.754.352 1.218 0 .466-.118.884-.354 1.254a2.47 2.47 0 0 1-.966.876 2.88 2.88 0 0 1-1.382.33zM14.044 8.456l-1.21.876-.588-.894 2.174-1.57h.81v8.818h-1.186V8.456z"
        fill="#1A73E8"
      />
    </svg>
  );
}

function DriveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M7.71 0L0 13.39l3.98 6.89L11.69 7.17 7.71 0z" fill="#0066DA" />
      <path d="M16.29 0H7.71l7.98 13.39h8.58L16.29 0z" fill="#00AC47" />
      <path d="M0 13.39l3.98 6.89h16.04l3.98-6.89H0z" fill="#FFBA00" />
      <path d="M15.69 13.39L11.71 20.28h8.33l3.98-6.89h-8.33z" fill="#00832D" />
      <path
        d="M7.71 0l-3.98 6.89L11.69 13.39 15.69 6.5 7.71 0z"
        fill="#2684FC"
      />
      <path d="M3.73 6.89L0 13.39h7.96l3.73-6.5H3.73z" fill="#EA4335" />
    </svg>
  );
}

function SheetsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        d="M14.727 0H3.273A1.818 1.818 0 0 0 1.455 1.818v20.364A1.818 1.818 0 0 0 3.273 24h17.454a1.818 1.818 0 0 0 1.818-1.818V7.818L14.727 0z"
        fill="#0F9D58"
      />
      <path d="M14.727 0v6h7.818L14.727 0z" fill="#87CEAC" />
      <path
        d="M5.09 11.454v7.637h13.818v-7.637H5.09zm6 6.182H6.544v-1.818h4.546v1.818zm0-3.272H6.544v-1.819h4.546v1.819zm6.364 3.272h-4.91v-1.818h4.91v1.818zm0-3.272h-4.91v-1.819h4.91v1.819z"
        fill="#fff"
      />
    </svg>
  );
}
