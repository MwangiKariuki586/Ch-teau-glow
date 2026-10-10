export interface ConsultationFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  service_type: string;
  preferred_date: string;
  preferred_time: string;
  concerns_or_goals?: string;
}

export interface ConsultationService {
  id: string;
  name: string;
  duration_minutes: number;
  description: string;
}

export async function submitConsultation(formData: ConsultationFormData) {
  try {
    const response = await fetch('/api/consultation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        data: null,
        error: {
          message: result.error || 'Failed to submit consultation. Please try again.',
          code: String(response.status),
        },
      };
    }

    return { data: result.data, error: null };
  } catch (err: unknown) {
    console.error('Unexpected error submitting consultation:', err);
    return {
      data: null,
      error: {
        message: 'An unexpected error occurred. Please try again.',
        code: 'UNKNOWN',
      },
    };
  }
}

export async function getConsultationServices() {
  try {
    const response = await fetch('/api/consultation/services', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        data: null,
        error: {
          message: result.error || 'Failed to load consultation services.',
          code: String(response.status),
        },
      };
    }

    return { data: result.data as ConsultationService[], error: null };
  } catch (err: unknown) {
    console.error('Unexpected error fetching consultation services:', err);
    return {
      data: null,
      error: {
        message: 'An unexpected error occurred while loading services.',
        code: 'UNKNOWN',
      },
    };
  }
}
