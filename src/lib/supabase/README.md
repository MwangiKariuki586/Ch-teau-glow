# Supabase Integration

This directory contains all Supabase-related utilities and configurations for the BROWZ application.

## Files Overview

### Core Files
- **`client.ts`** - Browser-side Supabase client
- **`server.ts`** - Server-side Supabase client (for Server Components and API routes)
- **`middleware.ts`** - Auth session management (used by proxy.ts)
- **`types.ts`** - Database type definitions

### Utility Files
- **`auth.ts`** - Authentication helpers (sign up, sign in, sign out, etc.)
- **`database.ts`** - Generic database query helpers
- **`storage.ts`** - File upload/download helpers
- **`realtime.ts`** - Real-time subscription helpers

## Quick Start

### 1. Authentication

```typescript
import { signUp, signIn, signOut } from '@/lib/supabase/auth';

// Sign up
await signUp('user@example.com', 'password123', {
  full_name: 'John Doe',
  phone: '+1234567890'
});

// Sign in
await signIn('user@example.com', 'password123');

// Sign out
await signOut();
```

### 2. Database Queries

```typescript
import { query, insert, update, deleteRecord } from '@/lib/supabase/database';

// Query records
const bookings = await query('bookings', {
  filter: { user_id: userId },
  order: { column: 'created_at', ascending: false },
  limit: 10
});

// Insert record
const newBooking = await insert('bookings', {
  user_id: userId,
  service_name: 'Facial Treatment',
  booking_date: '2024-03-15',
  booking_time: '14:00'
});

// Update record
await update('bookings', bookingId, {
  status: 'confirmed'
});

// Delete record
await deleteRecord('bookings', bookingId);
```

### 3. File Storage

```typescript
import { uploadFile, getPublicUrl, uploadAvatar } from '@/lib/supabase/storage';

// Upload avatar
const avatarUrl = await uploadAvatar(userId, file);

// Upload any file
await uploadFile('product-images', 'path/to/file.jpg', file);

// Get public URL
const url = getPublicUrl('product-images', 'path/to/file.jpg');
```

### 4. Real-time Subscriptions

```typescript
import { subscribeToTable, subscribeToUserBookings } from '@/lib/supabase/realtime';

// Subscribe to table changes
const channel = subscribeToTable('bookings', (payload) => {
  console.log('Change detected:', payload.eventType);
  console.log('New data:', payload.new);
});

// Subscribe to user's bookings
const bookingsChannel = subscribeToUserBookings(userId, (payload) => {
  // Handle booking changes
});

// Cleanup
return () => {
  channel.unsubscribe();
};
```

### 5. Using Hooks

```typescript
import { useUser, useSupabase } from '@/hooks/use-supabase';

function MyComponent() {
  const { user, loading } = useUser();
  const supabase = useSupabase();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please sign in</div>;

  return <div>Welcome, {user.email}</div>;
}
```

## Client vs Server Usage

### Client Components
```typescript
'use client';

import { createClient } from '@/lib/supabase/client';

export function ClientComponent() {
  const supabase = createClient();
  // Use supabase client
}
```

### Server Components
```typescript
import { createClient } from '@/lib/supabase/server';

export async function ServerComponent() {
  const supabase = await createClient();
  // Use supabase client
}
```

### API Routes
```typescript
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  // Use supabase client
}
```

## Common Patterns

### Protected Route
```typescript
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function ProtectedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  return <div>Protected content</div>;
}
```

### Form with Optimistic Updates
```typescript
'use client';

import { useState } from 'react';
import { insert } from '@/lib/supabase/database';

export function BookingForm() {
  const [bookings, setBookings] = useState([]);

  const handleSubmit = async (data) => {
    // Optimistic update
    const tempBooking = { id: 'temp', ...data };
    setBookings([...bookings, tempBooking]);

    try {
      const newBooking = await insert('bookings', data);
      setBookings(bookings.map(b => 
        b.id === 'temp' ? newBooking : b
      ));
    } catch (error) {
      // Rollback on error
      setBookings(bookings.filter(b => b.id !== 'temp'));
    }
  };
}
```

### Real-time List
```typescript
'use client';

import { useEffect, useState } from 'react';
import { query } from '@/lib/supabase/database';
import { subscribeToTable } from '@/lib/supabase/realtime';

export function BookingsList() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    // Initial fetch
    query('bookings').then(setBookings);

    // Subscribe to changes
    const channel = subscribeToTable('bookings', (payload) => {
      if (payload.eventType === 'INSERT') {
        setBookings(prev => [...prev, payload.new]);
      } else if (payload.eventType === 'UPDATE') {
        setBookings(prev => prev.map(b => 
          b.id === payload.new.id ? payload.new : b
        ));
      } else if (payload.eventType === 'DELETE') {
        setBookings(prev => prev.filter(b => b.id !== payload.old.id));
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return (
    <ul>
      {bookings.map(booking => (
        <li key={booking.id}>{booking.service_name}</li>
      ))}
    </ul>
  );
}
```

## Error Handling

Always wrap Supabase calls in try-catch blocks:

```typescript
try {
  const data = await query('bookings');
  return data;
} catch (error) {
  console.error('Database error:', error);
  // Handle error appropriately
  throw error;
}
```

## Type Safety

Generate types from your database schema:

```bash
npx supabase gen types typescript --project-id your-project-id > src/lib/supabase/database.types.ts
```

Then use them:

```typescript
import type { Database } from './database.types';

type Booking = Database['public']['Tables']['bookings']['Row'];
```

## Best Practices

1. **Always use RLS** - Enable Row Level Security on all tables
2. **Client vs Server** - Use appropriate client for context
3. **Error handling** - Always handle errors gracefully
4. **Type safety** - Generate and use TypeScript types
5. **Cleanup** - Unsubscribe from real-time channels
6. **Optimistic updates** - Improve UX with optimistic updates
7. **Caching** - Consider caching strategies for frequently accessed data

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Integration Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Setup Guide](../../../SUPABASE_SETUP.md)
