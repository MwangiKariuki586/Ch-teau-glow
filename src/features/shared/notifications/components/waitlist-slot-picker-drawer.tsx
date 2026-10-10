"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { WaitlistOfferSelector } from "./waitlist-offer-selector";

type WaitlistSlotPickerDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notificationId?: string | null;
  serviceName: string;
  branchName: string;
  offerGroupId: string | null;
  linkUrl?: string | null;
  expiresAt?: string | null;
};

export function WaitlistSlotPickerDrawer({
  open,
  onOpenChange,
  notificationId,
  serviceName,
  branchName,
  offerGroupId,
  linkUrl,
  expiresAt,
}: WaitlistSlotPickerDrawerProps) {
  const router = useRouter();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DrawerTitle className="text-xl">Choose a time</DrawerTitle>
              <DrawerDescription className="mt-2">
                New times opened for {serviceName} at {branchName}.
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-4">
          <WaitlistOfferSelector
            offerGroupId={offerGroupId}
            linkUrl={linkUrl}
            notificationId={notificationId}
            fallbackServiceName={serviceName}
            fallbackBranchName={branchName}
            fallbackExpiresAt={expiresAt}
          />
        </div>

        <DrawerFooter className="border-t pt-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              onOpenChange(false);
              router.push("/customer/waitlists");
            }}
          >
            Manage waitlist
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
