import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";

const addFavoriteSchema = z.object({
  service_id: z.string().uuid("Invalid service ID format"),
});

export async function POST(request: NextRequest) {
  // Authentication check using middleware
  const authResult = await withAuth();
  if (!authResult.success) {
    return authResult.response;
  }
  
  const { user, supabase } = authResult.data;

  // Request validation
  let payload;
  try {
    const body = await request.json();
    payload = addFavoriteSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: "Invalid request payload.", 
          issues: error.issues 
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const { service_id } = payload;

  // Verify service exists and is published
  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("id, status")
    .eq("id", service_id)
    .eq("status", "published")
    .maybeSingle();

  if (serviceError) {
    return NextResponse.json(
      { error: "Failed to verify service." },
      { status: 500 }
    );
  }

  if (!service) {
    return NextResponse.json(
      { error: "Service not found or unavailable." },
      { status: 404 }
    );
  }

  // Insert favorite with duplicate prevention
  const { data, error } = await supabase
    .from("user_favorites")
    .insert({
      user_id: user.id,
      service_id: service_id,
    })
    .select("id, user_id, service_id, created_at")
    .single();

  if (error) {
    // Handle duplicate constraint violation
    if (error.code === "23505") {
      // Return success for idempotent behavior - service is already favorited
      return NextResponse.json(
        { 
          success: true,
          message: "Service is already in favorites.",
          favorite: null
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: "Failed to add favorite." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      favorite: data
    },
    { status: 201 }
  );
}


const getFavoritesSchema = z.object({
  page: z.string().nullable().transform(val => val ? Math.max(1, parseInt(val, 10)) : 1),
  limit: z.string().nullable().transform(val => val ? Math.min(50, Math.max(1, parseInt(val, 10))) : 10),
});

export async function GET(request: NextRequest) {
  // Authentication check using middleware
  const authResult = await withAuth();
  if (!authResult.success) {
    return authResult.response;
  }
  
  const { user, supabase } = authResult.data;

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  
  const pageParam = searchParams.get('page');
  const limitParam = searchParams.get('limit');
  
  let queryParams;
  try {
    queryParams = getFavoritesSchema.parse({
      page: pageParam,
      limit: limitParam,
    });
  } catch (error) {
    console.error('Query parameter parsing error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid query parameters.",
          issues: error.issues,
          received: { page: pageParam, limit: limitParam }
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Invalid query parameters." },
      { status: 400 }
    );
  }

  const { page, limit } = queryParams;
  const offset = (page - 1) * limit;

  // Get user's favorites with service information
  const { data: favorites, error: favoritesError } = await supabase
    .from("user_favorites")
    .select(`
      id,
      created_at,
      service:services!inner(
        id,
        name,
        slug,
        description,
        min_price_cents,
        max_price_cents,
        currency,
        duration_minutes,
        cover_image_url,
        is_featured,
        category_id,
        status
      )
    `)
    .eq("user_id", user.id)
    .eq("service.status", "published")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (favoritesError) {
    return NextResponse.json(
      { error: "Failed to retrieve favorites." },
      { status: 500 }
    );
  }

  // Get total count for pagination metadata using a more efficient count query
  const { count, error: countError } = await supabase
    .from("user_favorites")
    .select("*, service:services!inner(status)", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("service.status", "published");

  if (countError) {
    return NextResponse.json(
      { error: "Failed to retrieve favorites count." },
      { status: 500 }
    );
  }

  // Format the response
  const formattedFavorites = favorites.map((favorite) => {
    // Supabase types !inner joins as arrays, but they return a single object
    const service = favorite.service as unknown as {
      id: string;
      name: string;
      slug: string;
      description: string;
      min_price_cents: number;
      max_price_cents: number;
      currency: string;
      duration_minutes: number;
      cover_image_url: string | null;
      is_featured: boolean;
      category_id: string;
      status: string;
    };

    return {
      favorite_id: favorite.id,
      favorited_at: favorite.created_at,
      id: service.id,
      name: service.name,
      slug: service.slug,
      description: service.description,
      min_price_cents: service.min_price_cents,
      max_price_cents: service.max_price_cents,
      currency: service.currency,
      duration_minutes: service.duration_minutes,
      cover_image_url: service.cover_image_url,
      is_featured: service.is_featured,
      category_id: service.category_id,
      status: service.status,
    };
  });

  const totalPages = Math.ceil((count || 0) / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  // Generate ETag for caching
  const etag = `"favorites-${user.id}-${page}-${limit}-${count}-${favorites.length > 0 ? favorites[0].created_at : 'empty'}"`;
  
  // Check if client has cached version
  const clientETag = request.headers.get('if-none-match');
  if (clientETag === etag) {
    return new NextResponse(null, { 
      status: 304,
      headers: {
        'Cache-Control': 'private, max-age=300, must-revalidate',
        'ETag': etag,
      }
    });
  }

  return NextResponse.json({
    favorites: formattedFavorites,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    },
  }, {
    headers: {
      'Cache-Control': 'private, max-age=300, must-revalidate', // Cache for 5 minutes
      'ETag': etag,
      'Vary': 'Authorization',
    },
  });
}
