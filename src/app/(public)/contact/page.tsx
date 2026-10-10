import { Mail, Phone, MessageCircle } from 'lucide-react';
import { ContactForm } from '@/features/public/contact';

export default function ContactPage() {
  return (
    <main className="w-full overflow-x-hidden min-h-screen bg-white">
      {/* Hero Section */}
      <section className="w-full pt-32 pb-20 bg-gradient-to-br from-[#6B4423]/10 to-white">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <p className="text-[#c9a961] font-medium mb-4 text-lg tracking-wide">Get In Touch</p>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Contact Us
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </div>
        </div>
      </section>

      {/* Locations Section */}
      <section className="w-full py-20 bg-white">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <p className="text-[#c9a961] font-medium mb-4 text-lg tracking-wide">Our locations</p>
            <h2 className="text-4xl md:text-3xl font-bold text-gray-900 mb-6">Visit Château Glow</h2>
          </div>
          
          <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
            {/* Dubai Location */}
            <div className="relative h-96 rounded-2xl overflow-hidden shadow-xl group">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-10"></div>
              <img 
                src="https://browz.ae/cdn/shop/files/IMG_1088.jpg?v=1730881747&width=1070" 
                alt="Dubai Location" 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 z-20 flex flex-col justify-end p-8 text-white">
                <h3 className="text-3xl font-bold mb-3">Dubai</h3>
                <p className="text-white/90 mb-6 leading-relaxed text-lg">
                  Al Wasl Road, Opposite ENOC Petrol Station<br />
                  Umm Suqeim 3, Dubai, UAE
                </p>
                <a 
                  href="https://www.google.com/maps/place/BROWZ/@25.133213,55.199952,15z/data=!4m6!3m5!1s0x3e5f6a51c9323467:0x50d47431809d7820!8m2!3d25.1331745!4d55.1985788!16s%2Fg%2F11c0rlzthl?coh=164777&shorturl=1&entry=tts&g_ep=EgoyMDI0MTIwMi4wIPu8ASoASAFQAw%3D%3D"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center bg-white text-gray-900 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors duration-300 w-fit"
                >
                  View on Google Maps
                </a>
              </div>
            </div>

            {/* Dubai Clinic Location */}
            <div className="relative h-96 rounded-2xl overflow-hidden shadow-xl group">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-10"></div>
              <img 
                src="https://browz.ae/cdn/shop/files/browzbannerexterior.jpg?v=1729143396&width=1780" 
                alt="Dubai Clinic Location" 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 z-20 flex flex-col justify-end p-8 text-white">
                <h3 className="text-3xl font-bold mb-3">Dubai Clinic</h3>
                <p className="text-white/90 mb-6 leading-relaxed text-lg">
                  Al Wasl Road, Opposite ENOC Petrol Station<br />
                  Umm Suqeim 3, Dubai, UAE
                </p>
                <a 
                  href="https://www.google.com/maps/place/BROWZ/@25.133213,55.199952,15z/data=!4m6!3m5!1s0x3e5f6a51c9323467:0x50d47431809d7820!8m2!3d25.1331745!4d55.1985788!16s%2Fg%2F11c0rlzthl?entry=tts&g_ep=EgoyMDI0MTIwMi4wIPu8ASoASAFQAw%3D%3D"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center bg-white text-gray-900 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors duration-300 w-fit"
                >
                  View on Google Maps
                </a>
              </div>
            </div>

            {/* Abu Dhabi Location */}
            <div className="relative h-96 rounded-2xl overflow-hidden shadow-xl group">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-10"></div>
              <img 
                src="https://browz.ae/cdn/shop/files/2023-03-20.jpg?v=1733378507&width=720" 
                alt="Abu Dhabi Location" 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 z-20 flex flex-col justify-end p-8 text-white">
                <h3 className="text-3xl font-bold mb-3">Abu Dhabi</h3>
                <p className="text-white/90 mb-6 leading-relaxed text-lg">
                  Jumeirah Saadiyat Hotel Spa<br />
                  Abu Dhabi, UAE
                </p>
                <a 
                  href="https://www.google.com/maps/place/BROWZ+%7C+Abu+Dhabi/@24.56081,54.453468,15z/data=!4m6!3m5!1s0x3e5e5d52f44bc331:0xbd597984c0cafc17!8m2!3d24.56081!4d54.4534683!16s%2Fg%2F11mv6k1qfv?entry=tts&g_ep=EgoyMDI0MTIwMi4wIPu8ASoASAFQAw%3D%3D"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center bg-white text-gray-900 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors duration-300 w-fit"
                >
                  View on Google Maps
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="w-full py-20 bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Contact Us</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Ready to book your appointment or have questions?
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            {/* Contact Cards */}
            <div className="grid md:grid-cols-3 gap-8 mb-20">
              {/* Phone Card */}
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 group">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Phone className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Call Us</h3>
                  <p className="text-gray-600 mb-4">Speak directly with our team</p>
                  <p className="text-xl font-bold text-blue-600 mb-6">+971 50 534 4208</p>
                  <a 
                    href="tel:+971505344208"
                    className="inline-flex items-center justify-center w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 hover:shadow-lg"
                  >
                    Call Now
                  </a>
                </div>
              </div>

              {/* Email Card */}
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 group">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Mail className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Email Us</h3>
                  <p className="text-gray-600 mb-4">Send us your inquiries</p>
                  <p className="text-xl font-bold text-purple-600 mb-6">hello@browz.ae</p>
                  <a 
                    href="mailto:hello@browz.ae"
                    className="inline-flex items-center justify-center w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 hover:shadow-lg"
                  >
                    Send Email
                  </a>
                </div>
              </div>

              {/* WhatsApp Card */}
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 group">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                    <MessageCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">WhatsApp</h3>
                  <p className="text-gray-600 mb-4">Quick chat with our team</p>
                  <p className="text-xl font-bold text-green-600 mb-6">Message Us</p>
                  <a 
                    href="https://wa.me/971505344208"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 hover:shadow-lg"
                  >
                    Start Chat
                  </a>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="max-w-3xl mx-auto">
              <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-gray-100">
                <div className="text-center mb-10">
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">Get in Touch</h3>
                  <p className="text-lg text-gray-600 leading-relaxed">
                    Fill out the form below and our team will get back to you within 24 hours.
                  </p>
                </div>
                <ContactForm />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}