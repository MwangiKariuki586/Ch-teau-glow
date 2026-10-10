import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface AdminFormShellProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function AdminFormShell({ title, description, children }: AdminFormShellProps) {
  return (
    <main className="w-full px-6 py-6">
      <div className="w-full space-y-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin
        </Link>

        <section className="rounded-3xl bg-white p-8 shadow-sm">
          <h1 className="text-4xl font-bold text-gray-900 md:text-5xl">
            {title.split(' ')[0]}{' '}
            <span className="text-[#c9a961]">{title.split(' ').slice(1).join(' ')}</span>
          </h1>
          <p className="mt-4 text-lg text-gray-600">{description}</p>
        </section>

        {children}
      </div>
    </main>
  );
}
