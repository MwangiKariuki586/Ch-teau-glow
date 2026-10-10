"use client";

import { useEffect, useState } from "react";
import { X, Loader2, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type PackageType = "curated" | "plan";

type PackageItem = {
  service_id: string;
  quantity: number;
  display_order: number;
};

type PackageFormData = {
  name: string;
  slug: string;
  description: string;
  package_type: PackageType;
  price_cents: string;
  compare_at_cents: string;
  currency: string;
  save_label: string;
  badge: string;
  image_url: string;
  is_active: boolean;
  sort_order: string;
  items: PackageItem[];
};

type ServiceOption = {
  id: string;
  name: string;
  slug: string;
  category: { id: string; name: string } | null;
};

interface PackageFormModalProps {
  packageId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function PackageFormModal({
  packageId,
  onClose,
  onSuccess,
}: PackageFormModalProps) {
  const isEdit = Boolean(packageId);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);
  const [services, setServices] = useState<ServiceOption[]>([]);

  const [formData, setFormData] = useState<PackageFormData>({
    name: "",
    slug: "",
    description: "",
    package_type: "curated",
    price_cents: "",
    compare_at_cents: "",
    currency: "AED",
    save_label: "",
    badge: "",
    image_url: "",
    is_active: true,
    sort_order: "0",
    items: [],
  });

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await fetch("/api/admin/packages/options");
        const result = await res.json();
        if (res.ok) {
          setServices(result.data.services || []);
        }
      } catch (error) {
        toast.error("Failed to load services");
      }
    };
    void fetchOptions();
  }, []);

  useEffect(() => {
    if (!packageId) return;

    const fetchPackage = async () => {
      setLoadingData(true);
      try {
        const res = await fetch(`/api/admin/packages/${packageId}`);
        const result = await res.json();
        if (!res.ok) throw new Error(result.error ?? "Failed to load package");

        const pkg = result.data;
        setFormData({
          name: pkg.name,
          slug: pkg.slug,
          description: pkg.description || "",
          package_type: pkg.package_type,
          price_cents: (pkg.price_cents / 100).toString(),
          compare_at_cents: pkg.compare_at_cents
            ? (pkg.compare_at_cents / 100).toString()
            : "",
          currency: pkg.currency,
          save_label: pkg.save_label || "",
          badge: pkg.badge || "",
          image_url: pkg.image_url || "",
          is_active: pkg.is_active,
          sort_order: pkg.sort_order.toString(),
          items:
            pkg.items?.map((item: any) => ({
              service_id: item.service_id,
              quantity: item.quantity,
              display_order: item.display_order,
            })) || [],
        });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load package",
        );
        onClose();
      } finally {
        setLoadingData(false);
      }
    };

    void fetchPackage();
  }, [packageId, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (formData.items.length === 0) {
        toast.error("Please add at least one service");
        setLoading(false);
        return;
      }

      const payload = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        package_type: formData.package_type,
        price_cents: Math.round(parseFloat(formData.price_cents) * 100),
        compare_at_cents: formData.compare_at_cents
          ? Math.round(parseFloat(formData.compare_at_cents) * 100)
          : null,
        currency: formData.currency,
        save_label: formData.save_label || null,
        badge: formData.badge || null,
        image_url: formData.image_url || null,
        is_active: formData.is_active,
        sort_order: parseInt(formData.sort_order) || 0,
        items: formData.items,
      };

      const url = isEdit
        ? `/api/admin/packages/${packageId}`
        : "/api/admin/packages";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Failed to save package");

      toast.success(isEdit ? "Package updated" : "Package created");
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save package",
      );
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = () => {
    const slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setFormData({ ...formData, slug });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { service_id: "", quantity: 1, display_order: formData.items.length },
      ],
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items
        .filter((_, i) => i !== index)
        .map((item, i) => ({
          ...item,
          display_order: i,
        })),
    });
  };

  const updateItem = (
    index: number,
    field: keyof PackageItem,
    value: string | number,
  ) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === formData.items.length - 1)
    ) {
      return;
    }

    const newItems = [...formData.items];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newItems[index], newItems[targetIndex]] = [
      newItems[targetIndex],
      newItems[index],
    ];
    newItems.forEach((item, i) => {
      item.display_order = i;
    });
    setFormData({ ...formData, items: newItems });
  };

  if (loadingData) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <Loader2 className="w-8 h-8 animate-spin text-[#6B4423]" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {isEdit ? "Edit Package" : "Create Package"}
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
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B4423]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B4423]"
                />
                <button
                  type="button"
                  onClick={generateSlug}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Generate
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B4423]"
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

          {/* Pricing */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Pricing</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.price_cents}
                  onChange={(e) =>
                    setFormData({ ...formData, price_cents: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B4423]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Compare At
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.compare_at_cents}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      compare_at_cents: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B4423]"
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
                  Save Label
                </label>
                <input
                  type="text"
                  value={formData.save_label}
                  onChange={(e) =>
                    setFormData({ ...formData, save_label: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B4423]"
                  placeholder="e.g., Save 20%"
                />
              </div>
            </div>
          </div>

          {/* Publishing */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Publishing</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={formData.package_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      package_type: e.target.value as PackageType,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B4423]"
                >
                  <option value="curated">Curated</option>
                  <option value="plan">Plan</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData({ ...formData, sort_order: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B4423]"
                />
              </div>
              <div className="flex items-end">
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
            </div>
          </div>

          {/* Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Items <span className="text-red-500">*</span>
              </h3>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#6B4423] hover:bg-[#6B4423]/10 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Service
              </button>
            </div>

            {formData.items.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                No services added yet. Click "Add Service" to start.
              </p>
            ) : (
              <div className="space-y-2">
                {formData.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => moveItem(index, "up")}
                        disabled={index === 0}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(index, "down")}
                        disabled={index === formData.items.length - 1}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                    <select
                      required
                      value={item.service_id}
                      onChange={(e) =>
                        updateItem(index, "service_id", e.target.value)
                      }
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B4423] text-sm"
                    >
                      <option value="">Select service...</option>
                      {services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name}{" "}
                          {service.category ? `(${service.category.name})` : ""}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      required
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(index, "quantity", parseInt(e.target.value))
                      }
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B4423] text-sm"
                      placeholder="Qty"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
              {isEdit ? "Update Package" : "Create Package"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
