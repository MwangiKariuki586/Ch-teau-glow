'use client';

import { useState } from 'react';
import { CalendarClock, Headphones, Mail, PhoneCall } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContactEnquiriesTab } from './contact-enquiries-tab';
import { NewsletterSubscriptionsTab } from './newsletter-tab';
import { FollowUpTab } from './followup-tab';
import { ConsultationsTab } from './consultations-tab';
import type { AdminUser, Consultation, ContactEnquiry, FollowUpBooking, NewsletterSubscription } from '../types';


interface SupportCenterProps {
  enquiries: ContactEnquiry[];
  newsletters: NewsletterSubscription[];
  followUps: FollowUpBooking[];
  admins: AdminUser[];
  consultations: Consultation[];
}


export function SupportCenter({ enquiries, newsletters, followUps, admins, consultations }: SupportCenterProps) {

  const newEnquiriesCount = enquiries.filter((e) => e.status === 'new').length;
  const pendingFollowUpsCount = followUps.filter((f) => f.follow_up_status === 'pending').length;
  const pendingConsultations = consultations.filter((c) => c.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Headphones className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Center</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage contact enquiries, newsletter subscribers, customer follow-ups, and consultation bookings

          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="enquiries" className="space-y-6" id="admin-support-tabs">

        <TabsList className="h-11">
          <TabsTrigger value="enquiries" className="gap-2 px-5">
            <Mail className="h-4 w-4" />
            Contact Enquiries
            {newEnquiriesCount > 0 && (
              <span className="ml-1 rounded-full bg-blue-500 px-2 py-0.5 text-xs font-bold text-white">
                {newEnquiriesCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="newsletter" className="gap-2 px-5">
            <Mail className="h-4 w-4" />
            Newsletter
          </TabsTrigger>
          <TabsTrigger value="followup" className="gap-2 px-5">
            <PhoneCall className="h-4 w-4" />
            Follow-Up
            {pendingFollowUpsCount > 0 && (
              <span className="ml-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
                {pendingFollowUpsCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="consultations" className="gap-2 px-5">
            <CalendarClock className="h-4 w-4" />
            Consultations
            {pendingConsultations > 0 && (
              <span className="ml-1 rounded-full bg-[#6B4423] px-2 py-0.5 text-xs font-bold text-white">
                {pendingConsultations}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="enquiries">
          <ContactEnquiriesTab initialEnquiries={enquiries} admins={admins} />
        </TabsContent>

        <TabsContent value="newsletter">
          <NewsletterSubscriptionsTab subscriptions={newsletters} />
        </TabsContent>

        <TabsContent value="followup">
          <FollowUpTab initialBookings={followUps} admins={admins} />
        </TabsContent>

        <TabsContent value="consultations">
          <ConsultationsTab initialConsultations={consultations} />
        </TabsContent>

      </Tabs>
    </div>
  );
}
