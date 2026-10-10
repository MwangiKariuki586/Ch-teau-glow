import Image from 'next/image';
import Link from 'next/link';
import { SignUpForm } from '@/features/shared/auth/components/sign-up-form';

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen w-full">
      {/* Left Side - Image (60%) */}
      <div className="relative hidden w-3/5 lg:block">
        <Image
          src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1920&q=80"
          alt="Beauty background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-linear-to-br from-primary/60 to-primary/80" />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="max-w-lg space-y-6 text-primary-foreground">
            <h2 className="text-6xl font-bold leading-tight">
              Create your Account
            </h2>
            <p className="text-xl opacity-90">
              Join Château Glow and discover premium beauty and wellness services tailored just for you
            </p>
          </div>
        </div>
        
        {/* Back to Home Link */}
        <Link 
          href="/" 
          className="absolute left-8 top-8 flex items-center gap-2 text-primary-foreground/90 transition hover:text-primary-foreground"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="font-medium">Back to Home</span>
        </Link>
      </div>

      {/* Right Side - Form (40%) */}
      <div className="flex w-full items-center justify-center bg-background px-8 py-12 lg:w-2/5">
        <SignUpForm />
      </div>
    </main>
  );
}
