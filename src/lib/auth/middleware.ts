import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface AuthenticatedUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}

export interface AuthMiddlewareResult {
  user: AuthenticatedUser;
  supabase: Awaited<ReturnType<typeof createClient>>;
}

/**
 * Authentication middleware for API routes
 * Validates JWT token and returns user information
 */
export async function withAuth(): Promise<{ success: true; data: AuthMiddlewareResult } | { success: false; response: NextResponse }> {
  try {
    const supabase = await createClient();
    
    // Get user from JWT token
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    // Handle authentication errors
    if (userError) {
      console.error("Authentication error:", userError);
      return {
        success: false,
        response: NextResponse.json(
          { 
            error: "Authentication failed.", 
            code: "AUTH_ERROR",
            details: userError.message 
          },
          { status: 401 }
        ),
      };
    }

    // Handle missing user (unauthenticated)
    if (!user) {
      return {
        success: false,
        response: NextResponse.json(
          { 
            error: "Authentication required.", 
            code: "AUTH_REQUIRED" 
          },
          { status: 401 }
        ),
      };
    }

    // Handle expired or invalid tokens
    if (!user.id || !user.email) {
      return {
        success: false,
        response: NextResponse.json(
          { 
            error: "Invalid authentication token.", 
            code: "INVALID_TOKEN" 
          },
          { status: 401 }
        ),
      };
    }

    // Return authenticated user and supabase client
    return {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          user_metadata: user.user_metadata,
          app_metadata: user.app_metadata,
        },
        supabase,
      },
    };
  } catch (error) {
    console.error("Authentication middleware error:", error);
    return {
      success: false,
      response: NextResponse.json(
        { 
          error: "Internal authentication error.", 
          code: "AUTH_INTERNAL_ERROR" 
        },
        { status: 500 }
      ),
    };
  }
}

/**
 * Higher-order function to wrap API route handlers with authentication
 */
export function requireAuth(
  handler: (
    request: NextRequest,
    context: { params: unknown },
    auth: AuthMiddlewareResult
  ) => Promise<NextResponse>,
) {
  return async (
    request: NextRequest,
    context: { params: unknown }
  ): Promise<NextResponse> => {
    const authResult = await withAuth();
    
    if (!authResult.success) {
      return authResult.response;
    }
    
    return handler(request, context, authResult.data);
  };
}