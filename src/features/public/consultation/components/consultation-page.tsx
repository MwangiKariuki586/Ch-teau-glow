'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Phone, Mail, User, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  submitConsultation,
  getConsultationServices,
  ConsultationService,
} from '../api/consultation';

const FALLBACK_SERVICES: ConsultationService[] = [
  { id: '1', name: 'Facial Aesthetics Consultation', duration_minutes: 45, description: 'Comprehensive skin analysis and treatment planning' },
  { id: '2', name: 'Laser Treatment Consultation', duration_minutes: 30, description: 'Assessment for laser hair removal, skin rejuvenation' },
  { id: '3', name: 'Semi-Permanent Makeup Consultation', duration_minutes: 60, description: 'Design consultation for brows, lips, and lash enhancement' },
  { id: '4', name: 'Medical Aesthetics Consultation', duration_minutes: 45, description: 'Clinical assessment for advanced treatments' },
];

const TIME_SLOTS = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
];

export function ConsultationPage() {
  // ── Form state ─────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    service_type: '',
    preferred_date: '',
    preferred_time: '',
    concerns_or_goals: '',
  });

  // ── UI state ───────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<ConsultationService[]>(FALLBACK_SERVICES);

  // ── Load services from DB on mount ─────────────────────────────────────────
  useEffect(() => {
    getConsultationServices().then(({ data }) => {
      if (data && data.length > 0) {
        setServices(data);
      }
    });
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const { data, error: submitError } = await submitConsultation({
      ...formData,
      concerns_or_goals: formData.concerns_or_goals || undefined,
    });

    if (submitError) {
      setError(submitError.message || 'Failed to submit consultation. Please try again.');
    } else if (data) {
      setSuccess(true);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        service_type: '',
        preferred_date: '',
        preferred_time: '',
        concerns_or_goals: '',
      });
      setTimeout(() => setSuccess(false), 6000);
    }

    setLoading(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-[#6B4423] to-[#8B5A2B] py-20 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1920&q=80"
            alt="Beauty consultation"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#6B4423]/80 to-[#8B5A2B]/80" />
        </div>

        <div className="relative px-[55px]">
          <div className="mx-auto max-w-4xl text-center text-white">

            <h1 className="mb-6 mt-10 text-4xl font-bold md:text-5xl">
              Not Sure Which Service is Right for You?
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-white/90">
              Book a free consultation with our beauty experts and let us guide you to the
              perfect treatment tailored to your needs.
            </p>
          </div>
        </div>
      </section>

      <div className="px-[55px] py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-2">
            {/* Consultation Form */}
            <div>
              <Card className="p-8">
                <h2 className="mb-6 text-2xl font-bold text-gray-900">
                  Book Your Free Consultation
                </h2>

                {/* Success Banner */}
                {success && (
                  <div className="mb-6 flex items-start gap-3 rounded-lg border-2 border-green-200 bg-green-50 p-4">
                    <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-900">Consultation Booked!</p>
                      <p className="mt-1 text-sm text-green-700">
                        Thank you! We&apos;ll confirm your appointment within 24 hours.
                      </p>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {error && (
                  <div className="mb-6 flex items-start gap-3 rounded-lg border-2 border-red-200 bg-red-50 p-4">
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                    <div>
                      <p className="font-semibold text-red-900">Error</p>
                      <p className="mt-1 text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Personal Information */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        First Name *
                      </label>
                      <Input
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        placeholder="Enter your first name"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Last Name *
                      </label>
                      <Input
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        placeholder="Enter your last name"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Email *
                      </label>
                      <Input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="your.email@example.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Phone Number *
                      </label>
                      <Input
                        type="tel"
                        name="phone_number"
                        value={formData.phone_number}
                        onChange={handleChange}
                        placeholder="+1 (555) 000-0000"
                        required
                      />
                    </div>
                  </div>

                  {/* Service Selection */}
                  <div>
                    <label className="mb-3 block text-sm font-medium text-gray-700">
                      What are you interested in? *
                    </label>
                    <div className="grid gap-3 md:grid-cols-2">
                      {services.map((service) => (
                        <div
                          key={service.id}
                          className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${formData.service_type === service.name
                              ? 'border-[#6B4423] bg-[#6B4423]/5'
                              : 'border-gray-200 hover:border-[#6B4423]/50'
                            }`}
                          onClick={() =>
                            setFormData({ ...formData, service_type: service.name })
                          }
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-900">{service.name}</h4>
                              <p className="mt-1 text-sm text-gray-600">{service.description}</p>
                              <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {service.duration_minutes} mins
                                </span>
                                <Badge variant="outline" className="text-green-600">
                                  Free
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Hidden required field to enforce service selection */}
                    <input
                      type="text"
                      name="service_type"
                      value={formData.service_type}
                      onChange={() => { }}
                      required
                      className="sr-only"
                      aria-hidden="true"
                    />
                  </div>

                  {/* Date Selection */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Preferred Date *
                      </label>
                      <Input
                        type="date"
                        name="preferred_date"
                        value={formData.preferred_date}
                        onChange={handleChange}
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Preferred Time *
                      </label>
                      <select
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#6B4423] focus:outline-none focus:ring-1 focus:ring-[#6B4423]"
                        name="preferred_time"
                        value={formData.preferred_time}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select a time</option>
                        {TIME_SLOTS.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Tell us about your concerns or goals (Optional)
                    </label>
                    <Textarea
                      name="concerns_or_goals"
                      value={formData.concerns_or_goals}
                      onChange={handleChange}
                      placeholder="Share any specific concerns, goals, or questions you'd like to discuss during your consultation..."
                      rows={4}
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full bg-[#6B4423] hover:bg-[#5A3A1D]"
                    size="lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                        Booking…
                      </>
                    ) : (
                      'Book Free Consultation'
                    )}
                  </Button>

                  <p className="text-center text-xs text-gray-500">
                    By booking a consultation, you agree to our terms and privacy policy.
                    We'll confirm your appointment within 24 hours.
                  </p>
                </form>
              </Card>
            </div>

            {/* Information Sidebar */}
            <div className="space-y-8">
              {/* What to Expect */}
              <Card className="p-6">
                <h3 className="mb-4 text-xl font-bold text-gray-900">What to Expect</h3>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6B4423]/10">
                      <User className="h-4 w-4 text-[#6B4423]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Personal Assessment</h4>
                      <p className="text-sm text-gray-600">
                        One-on-one consultation with our certified specialists
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6B4423]/10">
                      <MessageSquare className="h-4 w-4 text-[#6B4423]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Treatment Planning</h4>
                      <p className="text-sm text-gray-600">
                        Customized treatment recommendations based on your goals
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6B4423]/10">
                      <Calendar className="h-4 w-4 text-[#6B4423]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">No Pressure</h4>
                      <p className="text-sm text-gray-600">
                        Take time to consider your options - no obligation to book
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Contact Information */}
              <Card className="p-6">
                <h3 className="mb-4 text-xl font-bold text-gray-900">Contact Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-[#6B4423]" />
                    <span className="text-gray-700">+971 50 534 4208</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-[#6B4423]" />
                    <span className="text-gray-700">hello@browz.ae</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-[#6B4423]" />
                    <span className="text-gray-700">Multiple locations available</span>
                  </div>
                </div>
              </Card>

              {/* FAQ */}
              <Card className="p-6">
                <h3 className="mb-4 text-xl font-bold text-gray-900">Frequently Asked</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">How long is the consultation?</h4>
                    <p className="text-sm text-gray-600">
                      Consultations typically last 30-60 minutes depending on the service.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Is it really free?</h4>
                    <p className="text-sm text-gray-600">
                      Yes! All initial consultations are completely free with no hidden fees.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Can I reschedule?</h4>
                    <p className="text-sm text-gray-600">
                      Absolutely. Just give us 24 hours notice to reschedule your appointment.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}