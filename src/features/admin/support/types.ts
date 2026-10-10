export interface ContactEnquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assigned_to: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  admin_notes: string | null;
  follow_up_sent: boolean | null;
  follow_up_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewsletterSubscription {
  id: string;
  email: string;
  status: string;
  source: string | null;
  //user_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface FollowUpBooking {
  id: string;
  booking_number: string | null;
  // booking_date: string;
  booking_time: string | null;
  status: string;
  service_name: string | null;
  venue_name: string | null;
  // customer info from join
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  // follow-up fields
  follow_up: boolean | null;
  follow_up_status: 'pending' | 'contacted' | 'completed' | null;
  follow_up_due_date: string | null;
  follow_up_assigned_to: string | null;
  follow_up_notes: string | null;
  created_at: string;
}

export interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

export type EnquiryStatus = ContactEnquiry['status'];
export type EnquiryPriority = ContactEnquiry['priority'];
export type FollowUpStatus = 'pending' | 'contacted' | 'completed';

export interface EnquiryFilters {
  status: string;
  priority: string;
  assignedTo: string;
  dateFrom: string;
  dateTo: string;
}

export interface FollowUpFilters {
  status: string;
  assignedTo: string;
  dueDateFrom: string;
  dueDateTo: string;
  overdueOnly: boolean;
}

export interface Consultation {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  service_type: string;
  preferred_date: string;
  preferred_time: string;
  concerns_or_goals: string | null;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
  updated_at: string;
}

export type ConsultationStatus = Consultation['status'];

export interface ConsultationFilters {
  status: string;
  serviceType: string;
  dateFrom: string;
  dateTo: string;
}

