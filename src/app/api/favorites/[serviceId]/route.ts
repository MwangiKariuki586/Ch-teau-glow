import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth/middleware";

const serviceIdSchema = z.string().uuid("Invalid service ID format");

export async function DELETE(
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

  // Verify service exists
  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("id")
    .eq("id", serviceId)
    .maybeSingle();

  if (serviceError) {
    return NextResponse.json(
      { error: "Failed to verify service." },
      { status: 500 }
    );
  }

  if (!service) {
    return NextResponse.json(
      { error: "Service not found." },
      { status: 404 }
    );
  }

  // Delete the favorite
  const { error: deleteError, count } = await supabase
    .from("user_favorites")
    .delete()
    .eq("user_id", user.id)
    .eq("service_id", serviceId);

  if (deleteError) {
    return NextResponse.json(
      { error: "Failed to remove favorite." },
      { status: 500 }
    );
  }

  // Return success regardless of whether the favorite existed
  // This provides idempotent behavior
  return NextResponse.json(
    {
      success: true,
      message: "Favorite removed successfully."
    },
    { status: 200 }
  );
}