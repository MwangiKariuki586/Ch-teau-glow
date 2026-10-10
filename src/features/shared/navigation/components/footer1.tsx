import Link from "next/link";
import { Instagram, Facebook, Twitter } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-white border-t border-stone-100 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-1">
            <Link
              href="/"
              className="text-2xl font-serif tracking-wider text-stone-900 mb-6 block"
            >
              Château Glow<span className="text-[#C9A96E]">.</span>
            </Link>
            <p className="text-stone-500 text-sm leading-relaxed mb-6">
              The ultimate destination for luxury beauty enhancement and
              confidence in UAE.
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                className="text-stone-400 hover:text-stone-900 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="text-stone-400 hover:text-stone-900 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="text-stone-400 hover:text-stone-900 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-stone-900 mb-6">Explore</h4>
            <ul className="space-y-4 text-sm text-stone-500">
              <li>
                <Link
                  href="/services"
                  className="hover:text-stone-900 transition-colors"
                >
                  Services
                </Link>
              </li>
              <li>
                <Link
                  href="/products"
                  className="hover:text-stone-900 transition-colors"
                >
                  Shop Products
                </Link>
              </li>
              <li>
                <Link
                  href="/offers"
                  className="hover:text-stone-900 transition-colors"
                >
                  Packages & Offers
                </Link>
              </li>
              <li>
                <Link
                  href="/book"
                  className="hover:text-stone-900 transition-colors"
                >
                  Book Appointment
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-stone-900 mb-6">Company</h4>
            <ul className="space-y-4 text-sm text-stone-500">
              <li>
                <Link
                  href="/coming-soon"
                  className="hover:text-stone-900 transition-colors"
                >
                  Our Space
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="hover:text-stone-900 transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/blogs"
                  className="hover:text-stone-900 transition-colors"
                >
                  Blogs
                </Link>
              </li>
              <li>
                <Link
                  href="/coming-soon"
                  className="hover:text-stone-900 transition-colors"
                >
                  Press
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="text-sm text-stone-500 space-y-6">
              <div>
                <p className="font-medium text-stone-900 mb-3">Contact</p>
                <div className="space-y-2">
                  <p>
                    <a
                      href="tel:+971600564668"
                      className="hover:text-stone-900 transition-colors"
                    >
                      600 564 668
                    </a>
                  </p>
                  <p>
                    <a
                      href="mailto:hello@browz.ae"
                      className="hover:text-stone-900 transition-colors"
                    >
                      hello@browz.ae
                    </a>
                  </p>
                </div>
              </div>
              
              <div>
                <p className="font-medium text-stone-900 mb-3">Patient Advisor (Surgery)</p>
                <div className="space-y-2">
                  <p>
                    <a
                      href="tel:+971501587253"
                      className="hover:text-stone-900 transition-colors"
                    >
                      +971 50 1587 253
                    </a>
                  </p>
                  <p>
                    <a
                      href="mailto:surgicalcare@browz.ae"
                      className="hover:text-stone-900 transition-colors"
                    >
                      surgicalcare@browz.ae
                    </a>
                  </p>
                </div>
              </div>
              
              <div>
                <p className="font-medium text-stone-900 mb-3">Working Hours</p>
                <p>9:00 AM - 8:00 PM</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-stone-100 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-stone-400">
          <p>&copy; {new Date().getFullYear()} Château Glow. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link
              href="/coming-soon"
              className="hover:text-stone-900 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/coming-soon"
              className="hover:text-stone-900 transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
