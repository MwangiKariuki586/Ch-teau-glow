'use client';

import { useState } from 'react';
import { Send, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react';
import { createContactEnquiry } from '../api/contact';

// Country codes data
const countryCodes = [
  { code: '+971', flag: '🇦🇪', country: 'UAE' },
  { code: '+1', flag: '🇺🇸', country: 'USA' },
  { code: '+44', flag: '🇬🇧', country: 'UK' },
  { code: '+91', flag: '🇮🇳', country: 'India' },
  { code: '+33', flag: '🇫🇷', country: 'France' },
  { code: '+49', flag: '🇩🇪', country: 'Germany' },
  { code: '+86', flag: '🇨🇳', country: 'China' },
  { code: '+81', flag: '🇯🇵', country: 'Japan' },
  { code: '+82', flag: '🇰🇷', country: 'South Korea' },
  { code: '+61', flag: '🇦🇺', country: 'Australia' },
  { code: '+55', flag: '🇧🇷', country: 'Brazil' },
  { code: '+7', flag: '🇷🇺', country: 'Russia' },
  { code: '+39', flag: '🇮🇹', country: 'Italy' },
  { code: '+34', flag: '🇪🇸', country: 'Spain' },
  { code: '+31', flag: '🇳🇱', country: 'Netherlands' },
  { code: '+41', flag: '🇨🇭', country: 'Switzerland' },
  { code: '+46', flag: '🇸🇪', country: 'Sweden' },
  { code: '+47', flag: '🇳🇴', country: 'Norway' },
  { code: '+45', flag: '🇩🇰', country: 'Denmark' },
  { code: '+358', flag: '🇫🇮', country: 'Finland' },
];

export function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [selectedCountry, setSelectedCountry] = useState(countryCodes[0]); // Default to UAE
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!captchaVerified) {
      setError('Please verify that you are not a robot.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: submitError } = await createContactEnquiry({
        name: formData.name,
        email: formData.email,
        phone: formData.phone ? `${selectedCountry.code}${formData.phone}` : undefined,
        subject: formData.subject,
        message: formData.message
      });

      if (submitError) {
        throw new Error(submitError.message || 'Failed to submit enquiry');
      }

      setSuccess(true);
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      setCaptchaVerified(false);
      
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      console.error('Contact form error:', err);
      setError(err.message || 'Failed to submit your message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCountrySelect = (country: typeof countryCodes[0]) => {
    setSelectedCountry(country);
    setShowCountryDropdown(false);
  };

  const handleCaptchaToggle = () => {
    setCaptchaVerified(!captchaVerified);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="bg-gray-50 rounded-3xl p-8 shadow-lg">
      
      {success && (
        <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-2xl flex items-start gap-3">
          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-900">Message Sent Successfully!</p>
            <p className="text-sm text-green-700 mt-1">
              Thank you for contacting us. We'll get back to you within 24 hours.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Error</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-gray-900 font-medium mb-2">Your Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-full focus:border-[#6B4423] focus:outline-none text-gray-900 font-medium"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label className="block text-gray-900 font-medium mb-2">Email Address *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-full focus:border-[#6B4423] focus:outline-none text-gray-900 font-medium"
            placeholder="john@example.com"
          />
        </div>

        <div>
          <label className="block text-gray-900 font-medium mb-2">Phone Number</label>
          <div className="relative">
            <div className="flex">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                  className="flex items-center bg-gray-100 border-2 border-gray-200 border-r-0 rounded-l-full px-4 py-3 hover:bg-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{selectedCountry.flag}</span>
                    <span className="text-gray-900 font-medium">{selectedCountry.code}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                
                {showCountryDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-white border-2 border-gray-200 rounded-2xl shadow-lg z-10 max-h-60 overflow-y-auto">
                    {countryCodes.map((country) => (
                      <button
                        key={country.code}
                        type="button"
                        onClick={() => handleCountrySelect(country)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                      >
                        <span className="text-lg">{country.flag}</span>
                        <span className="font-medium text-gray-900">{country.code}</span>
                        <span className="text-gray-600">{country.country}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-r-full focus:border-[#6B4423] focus:outline-none text-gray-900 font-medium"
                placeholder="Phone"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-gray-900 font-medium mb-2">Subject *</label>
          <div className="relative">
            <select
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-full focus:border-[#6B4423] focus:outline-none text-gray-900 font-medium appearance-none bg-white pr-12"
            >
              <option value="">Select a subject</option>
              <option value="general">General Inquiry</option>
              <option value="appointment">Appointment Question</option>
              <option value="services">Services Information</option>
              <option value="products">Product Question</option>
              <option value="feedback">Feedback</option>
              <option value="other">Other</option>
            </select>
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
              <ChevronDown className="w-5 h-5 text-gray-500" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-gray-900 font-medium mb-2">Message *</label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            rows={6}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-[#6B4423] focus:outline-none text-gray-900 font-medium resize-none"
            placeholder="Tell us how we can help you..."
          ></textarea>
        </div>

        {/* reCAPTCHA */}
        <div>
          <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4 w-full max-w-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCaptchaToggle}
                  className={`w-6 h-6 border-2 rounded flex items-center justify-center transition-colors ${
                    captchaVerified 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : 'border-gray-400 hover:border-gray-500 bg-white'
                  }`}
                >
                  {captchaVerified && (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                <span className="text-gray-900 font-medium">I'm not a robot</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="relative w-10 h-10 mb-1">
                  <img 
                    src="https://handwritingbot.com/wp-content/uploads/2022/08/recapture-Im-not-a-robot.png"
                    alt="reCAPTCHA"
                    className="w-10 h-10 object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !captchaVerified}
          className="w-full bg-[#6B4423] text-white py-4 rounded-full hover:bg-[#4A2C1A] transition font-semibold text-lg shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Sending...
            </>
          ) : (
            <>
              <Send size={20} />
              Send Message
            </>
          )}
        </button>
      </form>
    </div>
  );
}
