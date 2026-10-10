"use client";

import { Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailTemplatesSection } from "./email-templates-section";
import { NotificationsSection } from "./notifications-section";
import { PaymentSettingsSection } from "./payment-settings-section";
import { FulfillmentSettingsSection } from "./fulfillment-settings-section";

export function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-[#6B4423]" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">
            Configure system preferences and business settings
          </p>
        </div>
      </div>

      <Tabs defaultValue="email-templates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="email-templates">Email Templates</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="payments">Payment Settings</TabsTrigger>
          <TabsTrigger value="fulfillment">Fulfillment</TabsTrigger>
        </TabsList>

        <TabsContent value="email-templates" className="space-y-6">
          <EmailTemplatesSection />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <NotificationsSection />
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <PaymentSettingsSection />
        </TabsContent>

        <TabsContent value="fulfillment" className="space-y-6">
          <FulfillmentSettingsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
