'use client';

import { useState, useEffect } from 'react';

export default function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState({
    days: 4,
    hours: 14,
    minutes: 48,
    seconds: 18
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else if (prev.days > 0) {
          return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="w-full py-16 bg-white">
      <div className="px-[55px]">
        <div className="bg-gradient-to-br from-gray-50 via-white to-gray-100 rounded-3xl p-12 relative overflow-hidden">
          {/* Decorative Palm Leaves */}
          <div className="absolute top-0 left-1/4 w-32 h-32 opacity-20">
            <svg viewBox="0 0 100 100" className="text-[#6B4423]">
              <path d="M50 10 Q30 30 10 50" stroke="currentColor" strokeWidth="2" fill="none"/>
              <path d="M50 10 Q40 30 20 50" stroke="currentColor" strokeWidth="2" fill="none"/>
              <path d="M50 10 Q50 30 30 50" stroke="currentColor" strokeWidth="2" fill="none"/>
              <path d="M50 10 Q60 30 40 50" stroke="currentColor" strokeWidth="2" fill="none"/>
            </svg>
          </div>
          
          <div className="absolute bottom-0 right-1/4 w-40 h-40 opacity-20">
            <svg viewBox="0 0 100 100" className="text-[#6B4423]">
              <path d="M50 90 Q30 70 10 50" stroke="currentColor" strokeWidth="2" fill="none"/>
              <path d="M50 90 Q40 70 20 50" stroke="currentColor" strokeWidth="2" fill="none"/>
              <path d="M50 90 Q50 70 30 50" stroke="currentColor" strokeWidth="2" fill="none"/>
              <path d="M50 90 Q60 70 40 50" stroke="currentColor" strokeWidth="2" fill="none"/>
            </svg>
          </div>

          <div className="flex items-center justify-between gap-8">
            {/* Left Image */}
            <div className="hidden lg:block flex-shrink-0">
              <div className="w-64 h-96 rounded-3xl overflow-hidden border-4 border-gray-300 shadow-xl">
                <img 
                  src="https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=400&q=80" 
                  alt="Beauty treatment"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Center Content */}
            <div className="flex-1 text-center relative z-10">
              <p className="text-gray-600 mb-2">Special Savings</p>
              <h2 className="text-4xl font-bold mb-4">
                Summer <span className="text-[#c9a961]">Glow</span> Deals
              </h2>
              <p className="text-lg text-gray-600 mb-8">Get 50% off - Limited Time Offer!</p>
              
              <div className="flex justify-center gap-4 mb-8">
                <div className="text-center">
                  <div className="text-5xl font-bold text-gray-900">{String(timeLeft.days).padStart(2, '0')}</div>
                  <div className="text-sm text-gray-600 mt-1">Days</div>
                </div>
                <div className="flex items-center text-3xl font-bold text-gray-400">:</div>
                <div className="text-center">
                  <div className="text-5xl font-bold text-gray-900">{String(timeLeft.hours).padStart(2, '0')}</div>
                  <div className="text-sm text-gray-600 mt-1">Hours</div>
                </div>
                <div className="flex items-center text-3xl font-bold text-gray-400">:</div>
                <div className="text-center">
                  <div className="text-5xl font-bold text-gray-900">{String(timeLeft.minutes).padStart(2, '0')}</div>
                  <div className="text-sm text-gray-600 mt-1">Minutes</div>
                </div>
                <div className="flex items-center text-3xl font-bold text-gray-400">:</div>
                <div className="text-center">
                  <div className="text-5xl font-bold text-gray-900">{String(timeLeft.seconds).padStart(2, '0')}</div>
                  <div className="text-sm text-gray-600 mt-1">Seconds</div>
                </div>
              </div>
              
              <a href="/products" className="bg-[#6B4423] text-white px-8 py-3 rounded-full hover:bg-[#4A2C1A] transition inline-flex items-center gap-2">
                Shop Now <span>→</span>
              </a>
            </div>

            {/* Right Image */}
            <div className="hidden lg:block flex-shrink-0">
              <div className="w-64 h-96 rounded-3xl overflow-hidden border-4 border-gray-300 shadow-xl">
                <img 
                  src="https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400&q=80" 
                  alt="Beauty treatment"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
