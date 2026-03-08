"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Eye, EyeOff, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { CopyCommand } from "@/app/_components/copy-command";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@onecli/ui/components/card";
import { Button } from "@onecli/ui/components/button";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { useAuth } from "@/providers/auth-provider";
import { getUserByAuthId, regenerateApiKey } from "@/lib/actions/user";

export function ApiKeyCard() {
  const { user: authUser } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const { copied, copy } = useCopyToClipboard();

  useEffect(() => {
    if (!authUser?.id) return;
    getUserByAuthId(authUser.id).then((user) => {
      setApiKey(user?.apiKey ?? "");
      setLoading(false);
    });
  }, [authUser?.id]);

  const truncatedKey = apiKey
    ? `${apiKey.slice(0, 8)}${"•".repeat(12)}${apiKey.slice(-4)}`
    : "";

  const handleRegenerate = async () => {
    if (!authUser?.id) return;
    setRegenerating(true);
    try {
      const result = await regenerateApiKey(authUser.id);
      setApiKey(result.apiKey);
      setRevealed(true);
      toast.success("API key regenerated");
    } catch {
      toast.error("Failed to regenerate API key");
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Key</CardTitle>
        <CardDescription className="flex items-center gap-1.5">
          Use this key to authenticate the OneCLI. Run
          <CopyCommand command="oc auth login" />
          to get started.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <code className="bg-muted flex-1 rounded-md border px-3 py-2 font-mono text-sm select-none">
            {loading ? (
              <span className="text-muted-foreground">Loading...</span>
            ) : !apiKey ? (
              <span className="text-muted-foreground">No API key yet</span>
            ) : revealed ? (
              apiKey
            ) : (
              truncatedKey
            )}
          </code>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setRevealed(!revealed)}
            disabled={!apiKey}
          >
            {revealed ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => copy(apiKey)}
            disabled={!apiKey}
          >
            {copied ? (
              <Check className="size-4 text-green-500" />
            ) : (
              <Copy className="size-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRegenerate}
            disabled={regenerating}
          >
            <RefreshCw
              className={`size-4 ${regenerating ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
