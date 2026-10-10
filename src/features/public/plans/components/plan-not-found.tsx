import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function PlanNotFound({
  title = "Membership plan not found",
  message = "The membership tier you requested is unavailable right now.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <main className="min-h-screen bg-[#FAF6F0] px-4 pb-24 pt-36 sm:px-[55px]">
      <div className="mx-auto max-w-2xl">
        <Card className="rounded-[32px] border border-[#E8DED2] bg-white py-0 text-center shadow-[0_20px_70px_rgba(61,34,18,0.08)]">
          <CardContent className="px-8 py-14">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F5E7DA] text-[#6B4423]">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h1 className="mt-6 text-3xl font-semibold text-[#2C1A12]">{title}</h1>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[#6B5A4D]">{message}</p>
            <div className="mt-8 flex justify-center">
              <Button
                asChild
                className="h-11 rounded-full bg-[#6B4423] px-6 text-white hover:bg-[#4A2C1A]"
              >
                <Link href="/plans">Back to membership plans</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
