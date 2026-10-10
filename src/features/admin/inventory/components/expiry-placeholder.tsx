import { CalendarX2 } from "lucide-react";

export function ExpiryPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="rounded-full bg-gray-100 p-6 mb-6">
        <CalendarX2 className="h-12 w-12 text-gray-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">
        Expiry Tracking Not Yet Enabled
      </h2>
      <p className="text-gray-500 max-w-md">
        Expiry tracking requires batch and lot tracking to be configured for
        your inventory items. Once batch/lot tracking is enabled, this dashboard
        will show items sorted by soonest expiry date with quick write-off
        actions.
      </p>
      <p className="text-sm text-gray-400 mt-4">
        Contact your system administrator to enable batch/lot tracking.
      </p>
    </div>
  );
}
