"use client";

import {Star} from "lucide-react";
import {useState} from "react";

import {Button} from "@/components/ui/button";
import {Textarea} from "@/components/ui/textarea";
import {cn} from "@/lib/utils";

type RatingPromptProps = {
  disabled?: boolean;
  onRate: (rating: number, feedback?: string | null) => Promise<void>;
};

export function RatingPrompt({disabled, onRate}: RatingPromptProps) {
  const [feedback, setFeedback] = useState("");
  const [pending, setPending] = useState(false);
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="border-t border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        Thanks for the feedback.
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t border-border bg-muted/40 p-4">
      <p className="text-sm font-semibold text-foreground">Rate this conversation</p>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            aria-label={`Rate ${value} out of 5`}
            className={cn(
              "rounded-md border border-border bg-card p-2 text-muted-foreground transition-colors hover:text-accent",
              rating >= value && "border-accent bg-accent/10 text-accent"
            )}
            disabled={disabled || pending}
            onClick={() => setRating(value)}
            type="button"
          >
            <Star aria-hidden="true" className="h-4 w-4 fill-current" />
          </button>
        ))}
      </div>
      <Textarea
        className="min-h-[76px]"
        disabled={disabled || pending}
        onChange={(event) => setFeedback(event.target.value)}
        placeholder="Optional feedback"
        value={feedback}
      />
      <Button
        disabled={disabled || pending || rating === 0}
        onClick={async () => {
          setPending(true);
          await onRate(rating, feedback || null);
          setSubmitted(true);
          setPending(false);
        }}
        size="sm"
        type="button"
      >
        {pending ? "Saving..." : "Submit rating"}
      </Button>
    </div>
  );
}
