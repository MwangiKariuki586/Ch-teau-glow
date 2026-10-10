import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";

const serviceIdSchema = z.string().uuid("Invalid service ID format");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  // Authentication check using middleware
  const authResult = await withAuth();
  if (!authResult.success) {
    return authResult.response;
  }
  
  const { user, supabase } = authResult.data;

  const { serviceId } = await params;

  // Validate serviceId format
  try {
    serviceIdSchema.parse(serviceId);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: "Invalid service ID format.", 
          issues: error.issues 
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Invalid service ID." },
      { status: 400 }
    );
  }

  // Verify service exists and is published
  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("id, status")
    .eq("id", serviceId)
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

  // Check if service is favorited by the user
  const { data: favorite, error: favoriteError } = await supabase
    .from("user_favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("service_id", serviceId)
    .maybeSingle();

  if (favoriteError) {
    return NextResponse.json(
      { error: "Failed to check favorite status." },
      { status: 500 }
    );
  }

  const isFavorite = !!favorite;
  
  // Generate ETag for caching
  const etag = `"favorite-status-${user.id}-${serviceId}-${isFavorite}"`;
  
  // Check if client has cached version
  const clientETag = request.headers.get('if-none-match');
  if (clientETag === etag) {
    return new NextResponse(null, { 
      status: 304,
      headers: {
        'Cache-Control': 'private, max-age=600, must-revalidate',
        'ETag': etag,
      }
    });
  }

  // Return boolean favorite status
  return NextResponse.json(
    {
      is_favorite: isFavorite,
      service_id: serviceId
    },
    { 
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=600, must-revalidate', // Cache for 10 minutes
        'ETag': etag,
        'Vary': 'Authorization',
      },
    }
  );
}