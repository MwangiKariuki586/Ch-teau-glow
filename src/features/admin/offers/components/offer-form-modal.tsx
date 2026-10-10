"use client";

import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type OfferType = "percent_off" | "fixed_credit" | "free_gift" | "other";

type OfferTarget = {
  target_type: "service" | "category" | "package" | "all_services";
  target_id: string | null;
  include: boolean;
};

type OfferFormData = {
  title: string;
  subtitle: string;
  badge: string;
  offer_type: OfferType;
  code: string;
  value_numeric: string;
  currency: string;
  image_url: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  eligibility_summary: string;
  cta_label: string;
  priority: string;
  targets: OfferTarget[];
};

type OfferListItem = {
  id: string;
  title: string;
  subtitle: string | null;
  badge: string | null;
  offer_type: OfferType;
  code: string | null;
  value_numeric: number | null;
  currency: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  priority: number;
  eligibility_summary: string | null;
  cta_label: string | null;
  image_url: string | null;
  targets: OfferTarget[];
};

type OptionItem = {
  id: string;
  name: string;
  slug: string;
};

type Options = {
  services: OptionItem[];
  categories: OptionItem[];
  packages: OptionItem[];
};

interface OfferFormModalProps {
  offer?: OfferListItem;
  onClose: () => void;
  onSuccess: () => void;
}

export function OfferFormModal({
  offer,
  onClose,
  onSuccess,
}: OfferFormModalProps) {
  const isEdit = Boolean(offer);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<Options | null>(null);
  const [targetingMode, setTargetingMode] = useState<"all" | "specific">("all");
  const [specificType, setSpecificType] = useState<
    "service" | "category" | "package"
  >("service");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [formData, setFormData] = useState<OfferFormData>({
    title: offer?.title || "",
    subtitle: offer?.subtitle || "",
    badge: offer?.badge || "",
    offer_type: offer?.offer_type || "percent_off",
    code: offer?.code || "",
    value_numeric: offer?.value_numeric?.toString() || "",
    currency: offer?.currency || "AED",
    image_url: offer?.image_url || "",
    starts_at: offer?.starts_at ? offer.starts_at.split("T")[0] : "",
    ends_at: offer?.ends_at ? offer.ends_at.split("T")[0] : "",
    is_active: offer?.is_active ?? true,
    eligibility_summary: offer?.eligibility_summary || "",
    cta_label: offer?.cta_label || "",
    priority: offer?.priority?.toString() || "0",
    targets: offer?.targets || [],
  });

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await fetch("/api/admin/offers/options");
        const result = await res.json();
        if (res.ok) {
          setOptions(result.data);
        }
      } catch (error) {
        toast.error("Failed to load options");
      }
    };
    void fetchOptions();
  }, []);

  useEffect(() => {
    if (offer?.targets) {
      const allServicesTarget = offer.targets.find(
        (t) => t.target_type === "all_services",
      );
      if (allServicesTarget) {
        setTargetingMode("all");
      } else if (offer.targets.length > 0) {
        setTargetingMode("specific");
        const firstTarget = offer.targets[0];
        setSpecificType(
          firstTarget.target_type as "service" | "category" | "package",
        );
        setSelectedIds(
          offer.targets.map((t) => t.target_id).filter(Boolean) as string[],
        );
      }
    }
  }, [offer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Build targets
      let targets: OfferTarget[] = [];
      if (targetingMode === "all") {
        targets = [
          { target_type: "all_services", target_id: null, include: true },
        ];
      } else {
        targets = selectedIds.map((id) => ({
          target_type: specificType,
          target_id: id,
          include: true,
        }));
      }

      if (targets.length === 0) {
        toast.error("Please select at least one target");
        setLoading(false);
        return;
      }

      const payload = {
        title: formData.title,
        subtitle: formData.subtitle || null,
        badge: formData.badge || null,
        offer_type: formData.offer_type,
        code: formData.code || null,
        value_numeric: formData.value_numeric
          ? parseFloat(formData.value_numeric)
          : null,
        currency: formData.currency,
        image_url: formData.image_url || null,
        starts_at: formData.starts_at || null,
        ends_at: formData.ends_at || null,
        is_active: formData.is_active,
        eligibility_summary: formData.eligibility_summary || null,
        cta_label: formData.cta_label || null,
        priority: parseInt(formData.priority) || 0,
        targets,
      };

      const url =
        isEdit && offer ? `/api/admin/offers/${offer.id}` : "/api/admin/offers";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Failed to save offer");

      toast.success(isEdit ? "Offer updated" : "Offer created");
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save offer",
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const generatePromoCode = () => {
    if (targetingMode === "all") {
      // Generate generic code for all services
      const randomSuffix = Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase();
      setFormData({ ...formData, code: `SAVE${randomSuffix}` });
      toast.success(`Generated code: SAVE${randomSuffix}`);
      return;
    }

    if (selectedIds.length === 0) {
      toast.error("Please select at least one target to generate a code");
      return;
    }

    // Get the first selected item's name
    const firstId = selectedIds[0];
    let itemName = "";

    if (specificType === "service") {
      const service = options?.services.find((s) => s.id === firstId);
      itemName = service?.name || "";
    } else if (specificType === "category") {
      const category = options?.categories.find((c) => c.id === firstId);
      itemName = category?.name || "";
    } else if (specificType === "package") {
      const pkg = options?.packages.find((p) => p.id === firstId);
      itemName = pkg?.name || "";
    }

    if (!itemName) {
      toast.error("Could not find selected item name");
      return;
    }

    // Generate code from name: take first word, remove special chars, uppercase, add random suffix
    const cleanName = itemName
      .split(" ")[0]
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .substring(0, 8);

    const randomSuffix = Math.random()
      .toString(36)
      .substring(2, 4)
      .toUpperCase();
    const code = `${cleanName}${randomSuffix}`;

    setFormData({ ...formData, code });
    toast.success(`Generated code: ${code}`);
  };

  const currentOptions =
    specificType === "service"
      ? options?.services || []
      : specificType === "category"
        ? options?.categories || []
        : options?.packages || [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {isEdit ? "Edit Offer" : "Create Offer"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basics */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Basics</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B4423]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subtitle
              </label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) =>
                  setFormData({ ...formData, subtitle: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B4423]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Badge
                </label>
                <input
                  type="text"
                  value={formData.badge}
                  onChange={(e) =>
                    setFormData({ ...formData, badge: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B4423]"
                  placeholder="e.g., BEST VALUE"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image URL
                </label>
                <input
                  type="text"
                  value={formData.image_url}
                  onChange={(e) =>
                    setFormData({ ...formData, image_url: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B4423]"
                />
              </div>
            </div>
          </div>

          {/* Benefit */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Benefit</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.offer_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      offer_type: e.target.value as OfferType,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B4423]"
                >
                  <option value="percent_off">Percent Off</option>
                  <option value="fixed_credit">Fixed Credit</option>
                  <option value="free_gift">Free Gift</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Value
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.value_numeric}
                  onChange={(e) =>
                    setFormData({ ...formData, value_numeric: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B4423]"
                  placeholder={
                    formData.offer_type === "percent_off"
                      ? "e.g., 20"
                      : "e.g., 50"
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <input
                  type="text"
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData({ ...formData, currency: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B4423]"
                />
              </div>
            </div>
          </div>

          {/* Code */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Promo Code (Optional)
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B4423]"
                  placeholder="e.g., SAVE20"
                />
                <button
                  type="button"
                  onClick={generatePromoCode}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors whitespace-nowrap"
                >
                  Generate from Service
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Leave empty for automatic offers. Must be unique.
              </p>
            </div>
          </div>

          {/* Scheduling */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Scheduling</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Starts At
                </label>
                <input
                  type="date"
                  value={formData.starts_at}
                  onChange={(e) =>
                    setFormData({ ...formData, starts_at: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B4423]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ends At
                </label>
                <input
                  type="date"
                  value={formData.ends_at}
                  onChange={(e) =>
                    setFormData({ ...formData, ends_at: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B4423]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Active
                  </span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B4423]"
                />
              </div>
            </div>
          </div>

          {/* Targeting */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Targeting <span className="text-red-500">*</span>
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={targetingMode === "all"}
                  onChange={() => setTargetingMode("all")}
                  className="border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">
                  All services
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={targetingMode === "specific"}
                  onChange={() => setTargetingMode("specific")}
                  className="border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">
                  Specific targets
                </span>
              </label>
            </div>

            {targetingMode === "specific" && (
              <div className="space-y-3 pl-6">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSpecificType("service")}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                      specificType === "service"
                        ? "bg-[#6B4423] text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                    )}
                  >
                    Services
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpecificType("category")}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                      specificType === "category"
                        ? "bg-[#6B4423] text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                    )}
                  >
                    Categories
                  </button>
                  {/* <button
                    type="button"
                    onClick={() => setSpecificType("package")}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                      specificType === "package"
                        ? "bg-[#6B4423] text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                    )}
                  >
                    Packages
                  </button> */}
                </div>

                <div className="border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto">
                  {currentOptions.length === 0 ? (
                    <p className="text-sm text-gray-400">
                      No options available
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {currentOptions.map((option) => (
                        <label
                          key={option.id}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(option.id)}
                            onChange={() => toggleSelection(option.id)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-700">
                            {option.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Selected: {selectedIds.length} {specificType}
                  {selectedIds.length !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>

          {/* Optional fields */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Optional</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Eligibility Summary
              </label>
              <textarea
                value={formData.eligibility_summary}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    eligibility_summary: e.target.value,
                  })
                }
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B4423]"
                placeholder="e.g., Valid for first-time customers only"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CTA Label
              </label>
              <input
                type="text"
                value={formData.cta_label}
                onChange={(e) =>
                  setFormData({ ...formData, cta_label: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B4423]"
                placeholder="e.g., Book Now"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium bg-[#6B4423] hover:bg-[#4A2C1A] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Update Offer" : "Create Offer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
