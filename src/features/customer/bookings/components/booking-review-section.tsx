"use client";

import { Loader2, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { type BookingStatus } from "@/lib/constants/booking-status";

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review_text: z
    .string()
    .max(1000, "Review text must be 1000 characters or less.")
    .optional()
    .transform((value) => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : null;
    }),
});

type BookingReview = {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
};

type BookingReviewSectionProps = {
  bookingId: string;
  bookingStatus: BookingStatus;
  initialReview: BookingReview | null;
  inlinePrompt?: boolean;
  triggerLabel?: string;
};

function ReviewStars({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange?: (next: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          disabled={disabled || !onChange}
          className={cn(
            "rounded p-1 transition-colors",
            onChange ? "hover:bg-muted" : "",
            disabled ? "cursor-not-allowed opacity-70" : "",
          )}
          aria-label={`Set rating to ${star}`}
        >
          <Star
            className={cn(
              "h-5 w-5",
              star <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground",
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function BookingReviewSection({
  bookingId,
  bookingStatus,
  initialReview,
  inlinePrompt = true,
  triggerLabel = "Rate & review",
}: BookingReviewSectionProps) {
  const [review, setReview] = useState<BookingReview | null>(initialReview);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [saving, setSaving] = useState(false);

  const canCreateReview = bookingStatus === "completed" && !review;
  const characterCount = useMemo(() => reviewText.length, [reviewText]);

  const handleSubmit = async () => {
    const parsed = reviewSchema.safeParse({
      rating,
      review_text: reviewText,
    });

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const field = firstIssue?.path?.[0];
      if (field === "review_text") {
        toast.error("Your review is too long. Please keep it under 1000 characters.");
      } else {
        toast.error("Please select a star rating before submitting.");
      }
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const json = (await response.json().catch(() => null)) as
        | {
            error?: string;
            data?: {
              review?: BookingReview | null;
            };
          }
        | null;

      if (!response.ok) {
        if (response.status === 409 && json?.data?.review) {
          setReview(json.data.review);
          setDialogOpen(false);
          toast.info("You already submitted a review for this booking.");
          return;
        }

        if (response.status === 401) {
          toast.error("Please sign in and try again.");
          return;
        }

        if (response.status === 404) {
          toast.error("We couldn't find this booking.");
          return;
        }

        toast.error(
          json?.error ?? "We couldn't submit your review right now. Please try again.",
        );
        return;
      }

      const created = json?.data?.review;
      if (created) {
        setReview(created);
      }
      setDialogOpen(false);
      setRating(0);
      setReviewText("");
      toast.success("Thanks for your feedback.");
    } catch {
      toast.error("We couldn't submit your review right now. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!canCreateReview && !review) {
    return null;
  }

  if (review) {
    return (
      <div className="rounded-lg border bg-muted/20 p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Your review</p>
          <Badge variant="secondary">{review.rating}/5</Badge>
        </div>
        <ReviewStars value={review.rating} disabled />
        {review.review_text ? (
          <p className="mt-2 text-sm text-muted-foreground">{review.review_text}</p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No written feedback provided.</p>
        )}
      </div>
    );
  }

  return (
    <>
      {inlinePrompt ? (
        <div className="rounded-lg border bg-primary/5 p-4">
          <p className="text-base font-semibold">Rate your experience</p>
          <p className="mt-1 text-sm text-muted-foreground">Your feedback helps us improve.</p>
          <Button className="mt-3" onClick={() => setDialogOpen(true)}>
            {triggerLabel}
          </Button>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setDialogOpen(true)}>
          {triggerLabel}
        </Button>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate your experience</DialogTitle>
            <DialogDescription>
              Leave a quick rating and optional feedback (max 1000 characters).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rating</Label>
              <ReviewStars value={rating} onChange={setRating} disabled={saving} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="booking-review-text">Review (optional)</Label>
              <Textarea
                id="booking-review-text"
                value={reviewText}
                onChange={(event) => setReviewText(event.target.value)}
                maxLength={1000}
                disabled={saving}
                placeholder="Tell us what went well."
              />
              <p className="text-right text-xs text-muted-foreground">{characterCount}/1000</p>
            </div>

          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit review"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
