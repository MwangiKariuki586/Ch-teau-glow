import type { SupabaseClient } from "@supabase/supabase-js";

export interface BookingValidationError {
  field: string;
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface BookingValidationResult {
  isValid: boolean;
  errors: BookingValidationError[];
  warnings?: BookingValidationError[];
}

/**
 * Validates booking consistency at the application level
 * This provides early validation before database constraints are checked
 */
export async function validateBookingConsistency(
  supabase: SupabaseClient,
  booking: {
    specialist_id: string;
    branch_id: string;
    service_id: string;
  }
): Promise<BookingValidationResult> {
  const errors: BookingValidationError[] = [];

  try {
    // 1. Validate specialist is active and assigned to the selected branch (many-to-many via specialist_branches)
    const { data: specialist } = await supabase
      .from("specialists")
      .select("id, name")
      .eq("id", booking.specialist_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!specialist) {
      errors.push({
        field: "specialist_id",
        code: "SPECIALIST_NOT_FOUND",
        message: "Specialist not found or inactive",
        details: { specialist_id: booking.specialist_id }
      });
    } else {
      const { data: specialistBranch } = await supabase
        .from("specialist_branches")
        .select("specialist_id")
        .eq("specialist_id", booking.specialist_id)
        .eq("branch_id", booking.branch_id)
        .eq("is_active", true)
        .maybeSingle();

      if (!specialistBranch) {
        errors.push({
          field: "specialist_id",
          code: "SPECIALIST_BRANCH_MISMATCH",
          message: `Specialist ${specialist.name} is not assigned to the selected branch`,
          details: {
            specialist_id: booking.specialist_id,
            selected_branch_id: booking.branch_id
          }
        });
      }
    }

    // 2. Validate service is offered at selected branch (many-to-many via service_branches)
    const { data: serviceBranch } = await supabase
      .from("service_branches")
      .select("service_id")
      .eq("branch_id", booking.branch_id)
      .eq("service_id", booking.service_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!serviceBranch) {
      errors.push({
        field: "service_id",
        code: "SERVICE_NOT_OFFERED",
        message: "Service is not offered at the selected branch",
        details: {
          service_id: booking.service_id,
          branch_id: booking.branch_id
        }
      });
    }

    // 3. Validate specialist provides the selected service
    const { data: specialistService } = await supabase
      .from("specialist_services")
      .select("specialist_id, service_id")
      .eq("specialist_id", booking.specialist_id)
      .eq("service_id", booking.service_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!specialistService) {
      errors.push({
        field: "specialist_id",
        code: "SERVICE_NOT_PROVIDED",
        message: "Specialist does not provide the selected service",
        details: {
          specialist_id: booking.specialist_id,
          service_id: booking.service_id
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };

  } catch (error) {
    return {
      isValid: false,
      errors: [{
        field: "general",
        code: "VALIDATION_ERROR",
        message: "Failed to validate booking consistency",
        details: { error: error instanceof Error ? error.message : String(error) }
      }]
    };
  }
}

/**
 * Validates specialist-service assignment compatibility
 */
export async function validateSpecialistServiceAssignment(
  supabase: SupabaseClient,
  specialist_id: string,
  service_id: string
): Promise<BookingValidationResult> {
  const errors: BookingValidationError[] = [];

  try {
    // Verify specialist is active
    const { data: specialist } = await supabase
      .from("specialists")
      .select("id, name")
      .eq("id", specialist_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!specialist) {
      errors.push({
        field: "specialist_id",
        code: "SPECIALIST_NOT_FOUND",
        message: "Specialist not found or inactive",
        details: { specialist_id }
      });
      return { isValid: false, errors };
    }

    // Check if specialist provides this service (via specialist_services junction table)
    const { data: specialistService } = await supabase
      .from("specialist_services")
      .select("service_id")
      .eq("specialist_id", specialist_id)
      .eq("service_id", service_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!specialistService) {
      errors.push({
        field: "service_id",
        code: "SERVICE_INCOMPATIBLE",
        message: `Specialist does not provide this service`,
        details: {
          specialist_id,
          specialist_name: specialist.name,
          service_id
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };

  } catch (error) {
    return {
      isValid: false,
      errors: [{
        field: "general",
        code: "VALIDATION_ERROR",
        message: "Failed to validate specialist-service assignment",
        details: { error: error instanceof Error ? error.message : String(error) }
      }]
    };
  }
}