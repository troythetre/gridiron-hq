"use client";

import { useState, useTransition } from "react";
import { respondToTrade } from "@/app/actions/trades";
import { PosBadge } from "@/components/pos-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TradeVerdict } from "@/lib/scoring";
import { ArrowRight, Check, X, Ban } from "lucide-react";

export interface OfferPlayerView {
  id: number;
  name: string;
  pos: string;
}

export interface OfferView {
  id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";
  note: string | null;
  createdAt: string;
  proposerTeamName: string;
  recipientTeamName: string;
  isProposer: boolean;
  proposerGives: OfferPlayerView[];
  recipientGives: OfferPlayerView[];
  givingValue: number;
  receivingValue: number;
  verdict: TradeVerdict;
  percentDiff: number;
}

const STATUS_VARIANT: Record<OfferView["status"], "warning" | "success" | "danger" | "secondary"> = {
  PENDING: "warning",
  ACCEPTED: "success",
  REJECTED: "danger",
  CANCELLED: "secondary",
};

function PlayerChips({ players }: { players: OfferPlayerView[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {players.map((p) => (
        <span key={p.id} className="inline-flex items-center gap-1 rounded-full border border-border bg-background/40 px-2 py-0.5 text-xs">
          <PosBadge pos={p.pos} className="h-5 min-w-0 px-1" />
          {p.name}
        </span>
      ))}
    </div>
  );
}

export function TradeOffersList({ offers }: { offers: OfferView[] }) {
  if (offers.length === 0) {
    return <p className="text-sm text-muted">No trade offers yet.</p>;
  }
  return (
    <div className="space-y-3">
      {offers.map((offer) => (
        <OfferCard key={offer.id} offer={offer} />
      ))}
    </div>
  );
}

function OfferCard({ offer }: { offer: OfferView }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function act(action: "ACCEPT" | "REJECT" | "CANCEL") {
    setError(null);
    startTransition(async () => {
      const res = await respondToTrade(offer.id, action);
      if (res?.error) setError(res.error);
    });
  }

  const canRespond = offer.status === "PENDING" && !offer.isProposer;
  const canCancel = offer.status === "PENDING" && offer.isProposer;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm font-semibold">
            {offer.proposerTeamName} <ArrowRight className="mx-1 inline h-3.5 w-3.5" /> {offer.recipientTeamName}
          </CardTitle>
          <CardDescription>{new Date(offer.createdAt).toLocaleString()}</CardDescription>
        </div>
        <Badge variant={STATUS_VARIANT[offer.status]}>{offer.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-medium text-muted">{offer.proposerTeamName} sends</p>
            <PlayerChips players={offer.proposerGives} />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted">{offer.recipientTeamName} sends</p>
            <PlayerChips players={offer.recipientGives} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-[var(--radius)] border border-border bg-background/30 px-3 py-2 text-sm">
          <span className="text-muted">
            Value {offer.givingValue} <ArrowRight className="mx-1 inline h-3 w-3" /> {offer.receivingValue}
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-semibold",
              offer.verdict === "FAIR" && "bg-success/10 text-success",
              offer.verdict !== "FAIR" && "bg-warning/10 text-warning"
            )}
          >
            {offer.verdict === "FAIR"
              ? "Fair trade"
              : `Lopsided by ${Math.abs(offer.percentDiff)}% (${offer.verdict === "FAVORS_YOU" ? "favors proposer" : "favors recipient"})`}
          </span>
        </div>

        {offer.note && <p className="text-sm italic text-muted">&quot;{offer.note}&quot;</p>}
        {error && <p className="text-sm text-danger">{error}</p>}

        {(canRespond || canCancel) && (
          <div className="flex gap-2">
            {canRespond && (
              <>
                <Button size="sm" className="gap-1.5" disabled={pending} onClick={() => act("ACCEPT")}>
                  <Check className="h-3.5 w-3.5" /> Accept
                </Button>
                <Button size="sm" variant="secondary" className="gap-1.5" disabled={pending} onClick={() => act("REJECT")}>
                  <X className="h-3.5 w-3.5" /> Reject
                </Button>
              </>
            )}
            {canCancel && (
              <Button size="sm" variant="ghost" className="gap-1.5 text-muted" disabled={pending} onClick={() => act("CANCEL")}>
                <Ban className="h-3.5 w-3.5" /> Cancel offer
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
