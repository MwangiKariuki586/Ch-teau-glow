export interface ContactEnquiryData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export async function createContactEnquiry(enquiryData: ContactEnquiryData) {
  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(enquiryData),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        data: null,
        error: {
          message: result.error || 'Failed to submit enquiry. Please try again.',
          code: String(response.status),
        },
      };
    }

    return { data: result.data, error: null };
  } catch (err: unknown) {
    console.error('Unexpected error creating contact enquiry:', err);
    return {
      data: null,
      error: {
        message: 'An unexpected error occurred. Please try again.',
        code: 'UNKNOWN',
      },
    };
  }
}
