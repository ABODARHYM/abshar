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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address_text: string
          created_at: string | null
          id: string
          is_default: boolean | null
          label: string
          lat: number
          lng: number
          user_id: string
        }
        Insert: {
          address_text: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label: string
          lat: number
          lng: number
          user_id: string
        }
        Update: {
          address_text?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label?: string
          lat?: number
          lng?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          created_at: string | null
          id: string
          message: string
          order_id: string | null
          priority: string | null
          resolved_at: string | null
          status: string | null
          subject: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          order_id?: string | null
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          order_id?: string | null
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaints_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          created_at: string | null
          current_lat: number | null
          current_lng: number | null
          id: string
          is_online: boolean | null
          is_verified: boolean | null
          license_number: string
          rating_avg: number | null
          rating_count: number | null
          total_orders: number | null
          updated_at: string | null
          user_id: string
          vehicle_plate: string
          vehicle_type: string
          wallet_balance: number | null
        }
        Insert: {
          created_at?: string | null
          current_lat?: number | null
          current_lng?: number | null
          id?: string
          is_online?: boolean | null
          is_verified?: boolean | null
          license_number: string
          rating_avg?: number | null
          rating_count?: number | null
          total_orders?: number | null
          updated_at?: string | null
          user_id: string
          vehicle_plate: string
          vehicle_type: string
          wallet_balance?: number | null
        }
        Update: {
          created_at?: string | null
          current_lat?: number | null
          current_lng?: number | null
          id?: string
          is_online?: boolean | null
          is_verified?: boolean | null
          license_number?: string
          rating_avg?: number | null
          rating_count?: number | null
          total_orders?: number | null
          updated_at?: string | null
          user_id?: string
          vehicle_plate?: string
          vehicle_type?: string
          wallet_balance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          note: string | null
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          note?: string | null
          order_id: string
          status: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          note?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          base_fare: number
          created_at: string | null
          customer_id: string
          delivered_at: string | null
          distance_fare: number
          distance_km: number | null
          driver_id: string | null
          dropoff_address: string
          dropoff_lat: number
          dropoff_lng: number
          id: string
          image_url: string | null
          notes: string | null
          order_number: string
          order_type: string
          payment_method: string
          payment_status: string | null
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          status: string
          total_price: number
          updated_at: string | null
          weight_kg: number | null
        }
        Insert: {
          base_fare: number
          created_at?: string | null
          customer_id: string
          delivered_at?: string | null
          distance_fare: number
          distance_km?: number | null
          driver_id?: string | null
          dropoff_address: string
          dropoff_lat: number
          dropoff_lng: number
          id?: string
          image_url?: string | null
          notes?: string | null
          order_number: string
          order_type: string
          payment_method: string
          payment_status?: string | null
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          status?: string
          total_price: number
          updated_at?: string | null
          weight_kg?: number | null
        }
        Update: {
          base_fare?: number
          created_at?: string | null
          customer_id?: string
          delivered_at?: string | null
          distance_fare?: number
          distance_km?: number | null
          driver_id?: string | null
          dropoff_address?: string
          dropoff_lat?: number
          dropoff_lng?: number
          id?: string
          image_url?: string | null
          notes?: string | null
          order_number?: string
          order_type?: string
          payment_method?: string
          payment_status?: string | null
          pickup_address?: string
          pickup_lat?: number
          pickup_lng?: number
          status?: string
          total_price?: number
          updated_at?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing: {
        Row: {
          base_fare: number
          created_at: string | null
          id: string
          is_active: boolean | null
          min_fare: number
          name: string
          price_per_km: number
          zone_id: string | null
        }
        Insert: {
          base_fare: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          min_fare: number
          name: string
          price_per_km: number
          zone_id?: string | null
        }
        Update: {
          base_fare?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          min_fare?: number
          name?: string
          price_per_km?: number
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean | null
          phone: string
          role: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name: string
          id: string
          is_active?: boolean | null
          phone: string
          role?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string | null
          customer_id: string
          driver_id: string
          id: string
          order_id: string
          stars: number
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          customer_id: string
          driver_id: string
          id?: string
          order_id: string
          stars: number
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          customer_id?: string
          driver_id?: string
          id?: string
          order_id?: string
          stars?: number
        }
        Relationships: [
          {
            foreignKeyName: "ratings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          driver_id: string
          id: string
          order_id: string | null
          status: string | null
          type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          driver_id: string
          id?: string
          order_id?: string | null
          status?: string | null
          type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          driver_id?: string
          id?: string
          order_id?: string | null
          status?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      zones: {
        Row: {
          center_lat: number
          center_lng: number
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          radius_km: number
        }
        Insert: {
          center_lat: number
          center_lng: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          radius_km: number
        }
        Update: {
          center_lat?: number
          center_lng?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          radius_km?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
