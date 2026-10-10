"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { subscribeToNewsletter } from "../api/newsletter";

export function Footer() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes("@")) {
      setMessage({ type: "error", text: "Please enter a valid email address" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await subscribeToNewsletter(email, "footer");

      if (result.success) {
        setMessage({ type: "success", text: result.message });
        setEmail("");

        setTimeout(() => setMessage(null), 5000);
      } else {
        setMessage({ type: "error", text: result.message });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "Failed to subscribe. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="w-full bg-gray-50 pt-16 pb-8">
      <div className="container mx-auto px-4 md:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold mb-2 text-gray-900">
            Subscribe to Our Newsletter to
          </h2>
          <h2 className="text-3xl font-bold mb-4 text-gray-900">
            Get{" "}
            <span className="text-[#c9a961]">Updates on Our Latest Offers</span>
          </h2>
          <p className="text-gray-600 mb-6">
            Be the first to know about our newest products and treatments.
          </p>

          <form onSubmit={handleSubscribe} className="max-w-xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter Email Address"
                disabled={loading}
                className="flex-1 px-6 py-3 rounded-full border border-gray-300 focus:outline-none focus:border-[#6B4423] text-gray-900 font-medium placeholder:text-gray-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-[#6B4423] text-white px-8 py-3 rounded-full hover:bg-[#4A2C1A] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Subscribing...
                  </>
                ) : (
                  "Subscribe"
                )}
              </button>
            </div>

            {message && (
              <div
                className={`flex items-center justify-center gap-2 p-3 rounded-full text-sm ${
                  message.type === "success"
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {message.type === "success" ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span>{message.text}</span>
              </div>
            )}
          </form>
        </div>

        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <span className="text-2xl font-bold text-[#6B4423]">Château Glow</span>
            </Link>
            <p className="text-gray-600 text-sm mb-4">
              Château Glow is a multi-branch beauty and aesthetics business delivering
              medical aesthetics, advanced facials, semi-permanent makeup,
              grooming services, and premium skincare products.
            </p>
            <div className="flex gap-3">
              <a
                href="https://www.facebook.com/browz.ae"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 bg-[#6B4423] rounded-full flex items-center justify-center text-white hover:bg-[#4A2C1A] transition"
              >
                <span className="text-sm font-bold">f</span>
              </a>
              <a
                href="https://twitter.com/browz_ae"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 bg-[#6B4423] rounded-full flex items-center justify-center text-white hover:bg-[#4A2C1A] transition"
              >
                <span className="text-sm font-bold">X</span>
              </a>
              <a
                href="https://www.instagram.com/browz.ae"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 bg-[#6B4423] rounded-full flex items-center justify-center text-white hover:bg-[#4A2C1A] transition"
              >
                <span className="text-sm font-bold">in</span>
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-4 text-gray-900">Company</h3>
            <ul className="space-y-2 text-gray-600">
              <li>
                <Link href="/about" className="hover:text-[#6B4423] transition">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/blogs" className="hover:text-[#6B4423] transition">
                  Blogs
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="hover:text-[#6B4423] transition"
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-4 text-gray-900">Customer Services</h3>
            <ul className="space-y-2 text-gray-600">
              <li>
                <Link
                  href="/customer"
                  className="hover:text-[#6B4423] transition"
                >
                  My Account
                </Link>
              </li>
              <li>
                <Link
                  href="/customer/bookings"
                  className="hover:text-[#6B4423] transition"
                >
                  My Bookings
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-[#6B4423] transition">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-4 text-gray-900">Contact Info</h3>
            <ul className="space-y-2 text-gray-600 text-sm">
              <li>Call Center: +971 50 534 4208</li>
              <li>hello@browz.ae</li>
              <li>
                Multiple Locations
                <br />
                Across UAE
                <br />
                Visit us today
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-600">
          <p>
            Copyright © 2025{" "}
            <span className="text-[#c9a961]">Château Glow Beauty & Aesthetics</span>.
            All Rights Reserved.
          </p>
          <div className="flex gap-4">
            <span>English ▼</span>
            <span>AED ▼</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
