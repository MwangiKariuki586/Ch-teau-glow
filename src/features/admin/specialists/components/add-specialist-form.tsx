'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, Sparkles, Plus, X, Clock } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { SpecialistBranchSelector } from './SpecialistBranchSelector';
import { SpecialistServiceSelector } from './SpecialistServiceSelector';
import { useSpecialistServices } from '../hooks/useSpecialistServices';

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

interface AvailabilitySlot {
  day: string;
  is_available: boolean;
  start_time: string;
  end_time: string;
}

export function AddSpecialistForm({ initialData }: { initialData?: any }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [specialties, setSpecialties] = useState<string[]>(initialData?.specialties || []);
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  // Load existing services for edit mode
  const { services: existingServices } = useSpecialistServices(initialData?.id);

  // Update selected services when existing services load
  useEffect(() => {
    if (existingServices.length > 0 && selectedServiceIds.length === 0) {
      setSelectedServiceIds(existingServices.map(service => service.id));
    }
  }, [existingServices, selectedServiceIds.length]);

  const defaultAvailability: AvailabilitySlot[] = DAYS_OF_WEEK.map((day) => ({
    day,
    is_available: false,
    start_time: '09:00',
    end_time: '18:00',
  }));

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    title: initialData?.title || '',
    bio: initialData?.bio || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    branch_id: initialData?.branch_id || '',
    is_active: initialData?.is_active ?? true,
    availability: (initialData?.availability as AvailabilitySlot[]) || defaultAvailability,
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addSpecialty = () => {
    if (specialtyInput.trim() && !specialties.includes(specialtyInput.trim())) {
      setSpecialties([...specialties, specialtyInput.trim()]);
      setSpecialtyInput('');
    }
  };

  const removeSpecialty = (specialty: string) => {
    setSpecialties(specialties.filter((s) => s !== specialty));
  };

  const handleAvailabilityChange = (
    index: number,
    field: keyof AvailabilitySlot,
    value: any
  ) => {
    const newAvailability = [...formData.availability];
    newAvailability[index] = { ...newAvailability[index], [field]: value };
    setFormData({ ...formData, availability: newAvailability });
  };

  const handleBranchChange = (branchId: string) => {
    setFormData({ ...formData, branch_id: branchId });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.title) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.branch_id) {
      toast.error('Branch assignment is required');
      return;
    }

    if (selectedServiceIds.length === 0) {
      toast.error('Service assignment is required', {
        description: 'Select at least one service this specialist can perform.',
      });
      return;
    }

    const hasAvailableDay = formData.availability.some((slot) => slot.is_available);
    if (!hasAvailableDay) {
      toast.error('Availability is required', {
        description: 'Enable at least one working day for this specialist.',
      });
      return;
    }

    setLoading(true);

    try {
      let specialistId = initialData?.id;

      if (initialData?.id) {
        // Update existing specialist
        const { error } = await supabase
          .from('specialists')
          .update({
            name: formData.name,
            title: formData.title,
            bio: formData.bio || null,
            email: formData.email || null,
            phone: formData.phone || null,
            branch_id: formData.branch_id,
            ...(imagePreview ? { image_url: imagePreview } : {}),
            specialties,
            availability: formData.availability,
            is_active: formData.is_active,
          })
          .eq('id', initialData.id);

        if (error) throw error;
      } else {
        // Create new specialist
        const { data, error } = await supabase
          .from('specialists')
          .insert([{
            name: formData.name,
            title: formData.title,
            bio: formData.bio || null,
            email: formData.email || null,
            phone: formData.phone || null,
            branch_id: formData.branch_id,
            image_url: imagePreview,
            specialties,
            availability: formData.availability,
            is_active: formData.is_active,
          }])
          .select('id')
          .single();

        if (error) throw error;
        specialistId = data.id;
      }

      // Update service assignments
      if (specialistId && selectedServiceIds.length > 0) {
        // First, deactivate all current services
        await supabase
          .from('specialist_services')
          .update({ is_active: false })
          .eq('specialist_id', specialistId);

        // Then, add/reactivate selected services
        const serviceAssignments = selectedServiceIds.map(serviceId => ({
          specialist_id: specialistId,
          service_id: serviceId,
          is_active: true
        }));

        const { error: serviceError } = await supabase
          .from('specialist_services')
          .upsert(serviceAssignments, {
            onConflict: 'specialist_id,service_id'
          });

        if (serviceError) throw serviceError;
      }

      toast.success(initialData ? 'Specialist updated successfully' : 'Specialist created successfully');
      router.push('/admin/specialists');
      router.refresh();

    } catch (error: any) {
      console.error('Error saving specialist:', error);
      toast.error('Failed to save specialist', {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/specialists">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {initialData ? 'Edit Specialist' : 'Add New Specialist'}
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {initialData ? 'Update specialist profile Details' : 'Create a new specialist profile'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image Upload Card */}
        <Card className="overflow-hidden">
          <div className="bg-linear-to-br from-primary/5 to-primary/10 p-8">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                {imagePreview || initialData?.image_url ? (
                  <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-white shadow-xl">
                    <img
                      src={imagePreview || initialData?.image_url}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-dashed border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800">
                    <Sparkles className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="text-center">
                <Label
                  htmlFor="image"
                  className="cursor-pointer inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-gray-700 shadow-md hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300"
                >
                  <Upload className="h-4 w-4" />
                  Upload Photo
                </Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
                <p className="mt-2 text-xs text-gray-500">
                  PNG, JPG up to 5MB
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Basic Information */}
        <Card className="p-6">
          <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white">
            <Sparkles className="h-5 w-5 text-primary" />
            Basic Information
          </h2>
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="Dr. Sarah Johnson"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Professional Title *</Label>
                <Input
                  id="title"
                  placeholder="Senior Aesthetician"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="sarah@browz.ae"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+971 50 123 4567"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Branch Assignment */}
            <SpecialistBranchSelector
              selectedBranchId={formData.branch_id}
              onBranchChange={handleBranchChange}
              required
            />
          </div>
        </Card>

        {/* Service Assignments - Immediately after branch selection */}
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Service Assignments <span className="text-destructive">*</span>
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Select which services this specialist can perform. Only services offered at their assigned branch will be available.
            </p>
          </div>
          <SpecialistServiceSelector
            branchId={formData.branch_id}
            selectedServiceIds={selectedServiceIds}
            onServiceChange={setSelectedServiceIds}
          />
        </Card>

        {/* Specialties - Descriptive tags */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Specialties
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Add descriptive tags for this specialist's areas of expertise (e.g., "Microblading Expert", "Sensitive Skin Specialist")
          </p>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add a specialty (e.g., Microblading)"
                value={specialtyInput}
                onChange={(e) => setSpecialtyInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
              />
              <Button type="button" onClick={addSpecialty}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {specialties.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {specialties.map((specialty) => (
                  <Badge key={specialty} variant="secondary" className="gap-1">
                    {specialty}
                    <button
                      type="button"
                      onClick={() => removeSpecialty(specialty)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Bio - Detailed description */}
        <Card className="p-6">
          <div className="space-y-2">
            <Label htmlFor="bio">Biography</Label>
            <Textarea
              id="bio"
              placeholder="Tell us about this specialist's experience and expertise..."
              rows={6}
              value={formData.bio}
              onChange={(e) =>
                setFormData({ ...formData, bio: e.target.value })
              }
            />
            <p className="text-xs text-gray-500">
              Brief description of qualifications and experience
            </p>
          </div>
        </Card>

        {/* Availability */}
        <Card className="p-6">
          <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <Clock className="h-5 w-5 text-primary" />
            Specialist Availability <span className="text-destructive">*</span>
          </h2>
          <div className="space-y-4">
            {formData.availability.map((slot, index) => (
              <div key={slot.day} className="flex items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4 last:border-0 last:pb-0">
                <div className="flex w-32 items-center gap-2">
                  <Switch
                    id={`day-${slot.day}`}
                    checked={slot.is_available}
                    onCheckedChange={(checked) =>
                      handleAvailabilityChange(index, 'is_available', checked)
                    }
                  />
                  <Label htmlFor={`day-${slot.day}`} className="font-medium">
                    {slot.day}
                  </Label>
                </div>
                {slot.is_available ? (
                  <div className="flex items-center gap-2 flex-1 max-w-sm">
                    <Input
                      type="time"
                      value={slot.start_time}
                      onChange={(e) =>
                        handleAvailabilityChange(index, 'start_time', e.target.value)
                      }
                      className="w-full"
                    />
                    <span className="text-gray-500">to</span>
                    <Input
                      type="time"
                      value={slot.end_time}
                      onChange={(e) =>
                        handleAvailabilityChange(index, 'end_time', e.target.value)
                      }
                      className="w-full"
                    />
                  </div>
                ) : (
                  <div className="flex-1 max-w-sm text-sm text-gray-500 italic">
                    Not Available
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Status */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="is_active" className="text-base font-semibold">
                Active Status
              </Label>
              <p className="text-sm text-gray-500">
                Make this specialist visible on the website
              </p>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_active: checked })
              }
            />
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? (initialData ? 'Updating...' : 'Creating...') : (initialData ? 'Update Specialist' : 'Create Specialist')}
          </Button>
        </div>
      </form>
    </div>
  );
}
