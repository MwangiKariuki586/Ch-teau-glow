export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      aftercare_jobs: {
        Row: {
          attempts: number
          booking_id: string
          created_at: string
          delay_hours: number
          delay_minutes: number
          id: string
          last_error: string | null
          payload: Json
          processing_started_at: string | null
          scheduled_for: string
          sent_at: string | null
          service_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          booking_id: string
          created_at?: string
          delay_hours: number
          delay_minutes?: number
          id?: string
          last_error?: string | null
          payload?: Json
          processing_started_at?: string | null
          scheduled_for: string
          sent_at?: string | null
          service_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          booking_id?: string
          created_at?: string
          delay_hours?: number
          delay_minutes?: number
          id?: string
          last_error?: string | null
          payload?: Json
          processing_started_at?: string | null
          scheduled_for?: string
          sent_at?: string | null
          service_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aftercare_jobs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aftercare_jobs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      booking_actions: {
        Row: {
          action_type: string
          actor_role: string
          actor_user_id: string
          booking_id: string
          created_at: string
          decision: string
          decision_reason: string
          id: string
          metadata: Json
          policy_snapshot: Json
        }
        Insert: {
          action_type: string
          actor_role: string
          actor_user_id: string
          booking_id: string
          created_at?: string
          decision: string
          decision_reason: string
          id?: string
          metadata?: Json
          policy_snapshot?: Json
        }
        Update: {
          action_type?: string
          actor_role?: string
          actor_user_id?: string
          booking_id?: string
          created_at?: string
          decision?: string
          decision_reason?: string
          id?: string
          metadata?: Json
          policy_snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "booking_actions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_change_requests: {
        Row: {
          booking_id: string
          created_at: string
          customer_message: string | null
          customer_proposed_ends_at: string | null
          customer_proposed_starts_at: string | null
          customer_response: string | null
          id: string
          proposed_ends_at: string
          proposed_starts_at: string
          reason: string
          requested_at: string
          requested_by: string
          responded_at: string | null
          responded_by: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          customer_message?: string | null
          customer_proposed_ends_at?: string | null
          customer_proposed_starts_at?: string | null
          customer_response?: string | null
          id?: string
          proposed_ends_at: string
          proposed_starts_at: string
          reason: string
          requested_at?: string
          requested_by: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          customer_message?: string | null
          customer_proposed_ends_at?: string | null
          customer_proposed_starts_at?: string | null
          customer_response?: string | null
          id?: string
          proposed_ends_at?: string
          proposed_starts_at?: string
          reason?: string
          requested_at?: string
          requested_by?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_change_requests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_reschedules: {
        Row: {
          booking_id: string
          changed_at: string
          changed_by: string
          id: string
          is_admin_override: boolean
          new_ends_at: string
          new_starts_at: string
          old_ends_at: string
          old_starts_at: string
          reason: string | null
        }
        Insert: {
          booking_id: string
          changed_at?: string
          changed_by: string
          id?: string
          is_admin_override?: boolean
          new_ends_at: string
          new_starts_at: string
          old_ends_at: string
          old_starts_at: string
          reason?: string | null
        }
        Update: {
          booking_id?: string
          changed_at?: string
          changed_by?: string
          id?: string
          is_admin_override?: boolean
          new_ends_at?: string
          new_starts_at?: string
          old_ends_at?: string
          old_starts_at?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_reschedules_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          branch_id: string
          booking_kind: "service" | "package"
          booking_channel: Database["public"]["Enums"]["booking_channel"]
          booking_channel_meta: Json
          completed_at: string | null
          created_at: string
          ends_at: string
          follow_up: boolean | null
          follow_up_assigned_to: string | null
          follow_up_due_date: string | null
          follow_up_notes: string | null
          follow_up_status: string | null
          id: string
          notes: string | null
          package_id: string | null
          payment_amount_cents: number | null
          payment_currency: string | null
          payment_intent_id: string | null
          payment_status: string
          rejection_reason: string | null
          service_id: string
          specialist_id: string
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          branch_id: string
          booking_kind?: "service" | "package"
          booking_channel?: Database["public"]["Enums"]["booking_channel"]
          booking_channel_meta?: Json
          completed_at?: string | null
          created_at?: string
          ends_at: string
          follow_up?: boolean | null
          follow_up_assigned_to?: string | null
          follow_up_due_date?: string | null
          follow_up_notes?: string | null
          follow_up_status?: string | null
          id?: string
          notes?: string | null
          package_id?: string | null
          payment_amount_cents?: number | null
          payment_currency?: string | null
          payment_intent_id?: string | null
          payment_status?: string
          rejection_reason?: string | null
          service_id: string
          specialist_id: string
          starts_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          branch_id?: string
          booking_kind?: "service" | "package"
          booking_channel?: Database["public"]["Enums"]["booking_channel"]
          booking_channel_meta?: Json
          completed_at?: string | null
          created_at?: string
          ends_at?: string
          follow_up?: boolean | null
          follow_up_assigned_to?: string | null
          follow_up_due_date?: string | null
          follow_up_notes?: string | null
          follow_up_status?: string | null
          id?: string
          notes?: string | null
          package_id?: string | null
          payment_amount_cents?: number | null
          payment_currency?: string | null
          payment_intent_id?: string | null
          payment_status?: string
          rejection_reason?: string | null
          service_id?: string
          specialist_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialists"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string
          city: string
          country: string
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          phone: string | null
          postal_code: string | null
          state: string | null
          updated_at: string | null
        }
        Insert: {
          address: string
          city: string
          country: string
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          city?: string
          country?: string
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contact_enquiries: {
        Row: {
          admin_notes: string | null
          assigned_to: string | null
          created_at: string
          email: string
          follow_up_sent: boolean | null
          follow_up_sent_at: string | null
          id: string
          message: string
          name: string
          phone: string | null
          priority: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          assigned_to?: string | null
          created_at?: string
          email: string
          follow_up_sent?: boolean | null
          follow_up_sent_at?: string | null
          id?: string
          message: string
          name: string
          phone?: string | null
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          assigned_to?: string | null
          created_at?: string
          email?: string
          follow_up_sent?: boolean | null
          follow_up_sent_at?: string | null
          id?: string
          message?: string
          name?: string
          phone?: string | null
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_subscriptions: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          item_type: string
          name: string
          product_id: string | null
          sku: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          item_type?: string
          name: string
          product_id?: string | null
          sku?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          item_type?: string
          name?: string
          product_id?: string | null
          sku?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_inventory: {
        Row: {
          branch_id: string
          inventory_item_id: string
          low_stock_threshold: number
          on_hand: number
          reorder_point: number | null
          updated_at: string
        }
        Insert: {
          branch_id: string
          inventory_item_id: string
          low_stock_threshold?: number
          on_hand?: number
          reorder_point?: number | null
          updated_at?: string
        }
        Update: {
          branch_id?: string
          inventory_item_id?: string
          low_stock_threshold?: number
          on_hand?: number
          reorder_point?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_inventory_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_inventory_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          actor_user_id: string | null
          branch_id: string
          created_at: string
          dedupe_key: string | null
          id: string
          inventory_item_id: string
          movement_type: string
          notes: string | null
          quantity_delta: number
          reason_code: string | null
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          actor_user_id?: string | null
          branch_id: string
          created_at?: string
          dedupe_key?: string | null
          id?: string
          inventory_item_id: string
          movement_type: string
          notes?: string | null
          quantity_delta: number
          reason_code?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          actor_user_id?: string | null
          branch_id?: string
          created_at?: string
          dedupe_key?: string | null
          id?: string
          inventory_item_id?: string
          movement_type?: string
          notes?: string | null
          quantity_delta?: number
          reason_code?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      specialists: {
        Row: {
          availability: Json | null
          bio: string | null
          branch_id: string | null
          created_at: string | null
          email: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          phone: string | null
          specialties: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          availability?: Json | null
          bio?: string | null
          branch_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          phone?: string | null
          specialties?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          availability?: Json | null
          bio?: string | null
          branch_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          phone?: string | null
          specialties?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "specialists_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          currency: string
          id: string
          line_total_amount_cents: number
          order_id: string
          product_id: string | null
          product_image_url: string | null
          product_name: string
          product_slug: string | null
          quantity: number
          unit_price_amount_cents: number
        }
        Insert: {
          created_at?: string
          currency: string
          id?: string
          line_total_amount_cents: number
          order_id: string
          product_id?: string | null
          product_image_url?: string | null
          product_name: string
          product_slug?: string | null
          quantity: number
          unit_price_amount_cents: number
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          line_total_amount_cents?: number
          order_id?: string
          product_id?: string | null
          product_image_url?: string | null
          product_name?: string
          product_slug?: string | null
          quantity?: number
          unit_price_amount_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          contact_email: string
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          currency: string
          fulfillment_type: Database["public"]["Enums"]["order_fulfillment_type"]
          id: string
          payment_status: Database["public"]["Enums"]["order_payment_status"]
          pickup_notes: string | null
          placed_at: string | null
          shipping_address_line1: string | null
          shipping_address_line2: string | null
          shipping_city: string | null
          shipping_country: string | null
          shipping_postal_code: string | null
          shipping_state: string | null
          status: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id: string | null
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          subtotal_amount_cents: number
          total_amount_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_email: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          currency: string
          fulfillment_type: Database["public"]["Enums"]["order_fulfillment_type"]
          id?: string
          payment_status?: Database["public"]["Enums"]["order_payment_status"]
          pickup_notes?: string | null
          placed_at?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_postal_code?: string | null
          shipping_state?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal_amount_cents: number
          total_amount_cents: number
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_email?: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string
          fulfillment_type?: Database["public"]["Enums"]["order_fulfillment_type"]
          id?: string
          payment_status?: Database["public"]["Enums"]["order_payment_status"]
          pickup_notes?: string | null
          placed_at?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_postal_code?: string | null
          shipping_state?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal_amount_cents?: number
          total_amount_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          branch_id: string | null
          category_id: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          images: string[] | null
          is_active: boolean
          is_featured: boolean
          name: string
          price_display: string
          price_value: number | null
          rating: number | null
          slug: string
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          category_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          is_featured?: boolean
          name: string
          price_display: string
          price_value?: number | null
          rating?: number | null
          slug: string
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          category_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          is_featured?: boolean
          name?: string
          price_display?: string
          price_value?: number | null
          rating?: number | null
          slug?: string
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category_id: string
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          duration_minutes: number
          id: string
          is_featured: boolean
          max_price_cents: number
          min_price_cents: number
          name: string
          slug: string
          status: Database["public"]["Enums"]["service_status"]
          updated_at: string
        }
        Insert: {
          category_id: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          duration_minutes: number
          id?: string
          is_featured?: boolean
          max_price_cents: number
          min_price_cents: number
          name: string
          slug: string
          status?: Database["public"]["Enums"]["service_status"]
          updated_at?: string
        }
        Update: {
          category_id?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_featured?: boolean
          max_price_cents?: number
          min_price_cents?: number
          name?: string
          slug?: string
          status?: Database["public"]["Enums"]["service_status"]
          updated_at?: string
        }
        Relationships: []
      }
      consultation_services: {
        Row: {
          created_at: string
          description: string
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description: string
          duration_minutes: number
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      consultations: {
        Row: {
          concerns_or_goals: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone_number: string
          preferred_date: string
          preferred_time: string
          service_type: string
          status: string
          updated_at: string
        }
        Insert: {
          concerns_or_goals?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          phone_number: string
          preferred_date: string
          preferred_time: string
          service_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          concerns_or_goals?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone_number?: string
          preferred_date?: string
          preferred_time?: string
          service_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      branch_services: {
        Row: {
          branch_id: string
          created_at: string
          duration_minutes: number | null
          is_active: boolean
          max_price_cents: number | null
          min_price_cents: number | null
          service_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          duration_minutes?: number | null
          is_active?: boolean
          max_price_cents?: number | null
          min_price_cents?: number | null
          service_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          duration_minutes?: number | null
          is_active?: boolean
          max_price_cents?: number | null
          min_price_cents?: number | null
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_services_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      specialist_services: {
        Row: {
          created_at: string
          is_active: boolean
          service_id: string
          specialist_id: string
        }
        Insert: {
          created_at?: string
          is_active?: boolean
          service_id: string
          specialist_id: string
        }
        Update: {
          created_at?: string
          is_active?: boolean
          service_id?: string
          specialist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "specialist_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_services_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialists"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_inventory_asset: {
        Args: {
          p_payload: Json
        }
        Returns: Json
      }
      finalize_order_checkout_session: {
        Args: {
          p_contact_email?: string | null
          p_contact_name?: string | null
          p_contact_phone?: string | null
          p_order_id: string
          p_pickup_notes?: string | null
          p_placed_at?: string | null
          p_shipping_address_line1?: string | null
          p_shipping_address_line2?: string | null
          p_shipping_city?: string | null
          p_shipping_country?: string | null
          p_shipping_postal_code?: string | null
          p_shipping_state?: string | null
          p_stripe_checkout_session_id: string
          p_stripe_customer_id?: string | null
          p_stripe_payment_intent_id?: string | null
        }
        Returns: Json
      }
      reserve_order_inventory: {
        Args: {
          p_order_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      booking_channel:
        | "web"
        | "admin"
        | "phone"
        | "whatsapp"
        | "instagram"
        | "tiktok"
        | "facebook"
        | "partner"
        | "api"
        | "other"
      booking_change_customer_response: "accepted" | "declined" | "proposed_new_time"
      booking_change_request_status:
        | "pending"
        | "accepted"
        | "declined"
        | "expired"
        | "cancelled"
      order_fulfillment_type: "shipping" | "pickup"
      order_payment_status: "pending" | "paid" | "failed" | "cancelled" | "refunded"
      order_status: "pending" | "paid" | "cancelled" | "fulfilled"
      booking_status:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "rejected"
        | "completed"
        | "no_show"
        | "rescheduled"
      service_status: "draft" | "published" | "archived"
      user_role: "customer" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
    DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
    DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never
export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never
