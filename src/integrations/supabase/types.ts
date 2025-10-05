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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      affiliate_clicks: {
        Row: {
          affiliate_id: string
          click_id: string | null
          created_at: string | null
          id: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          affiliate_id: string
          click_id?: string | null
          created_at?: string | null
          id?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          affiliate_id?: string
          click_id?: string | null
          created_at?: string | null
          id?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_clicks_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_commissions: {
        Row: {
          affiliate_id: string
          amount: number
          commission_rate: number
          conversion_id: string
          created_at: string | null
          id: string
          level: number
        }
        Insert: {
          affiliate_id: string
          amount: number
          commission_rate: number
          conversion_id: string
          created_at?: string | null
          id?: string
          level: number
        }
        Update: {
          affiliate_id?: string
          amount?: number
          commission_rate?: number
          conversion_id?: string
          created_at?: string | null
          id?: string
          level?: number
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_conversion_id_fkey"
            columns: ["conversion_id"]
            isOneToOne: false
            referencedRelation: "affiliate_conversions"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_conversions: {
        Row: {
          affiliate_id: string
          amount: number
          created_at: string | null
          id: string
          plan: string
          status: string | null
          user_id: string
        }
        Insert: {
          affiliate_id: string
          amount: number
          created_at?: string | null
          id?: string
          plan: string
          status?: string | null
          user_id: string
        }
        Update: {
          affiliate_id?: string
          amount?: number
          created_at?: string | null
          id?: string
          plan?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_conversions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_payouts: {
        Row: {
          affiliate_id: string
          amount: number
          created_at: string | null
          id: string
          paid_at: string | null
          period: string
          status: string | null
        }
        Insert: {
          affiliate_id: string
          amount: number
          created_at?: string | null
          id?: string
          paid_at?: string | null
          period: string
          status?: string | null
        }
        Update: {
          affiliate_id?: string
          amount?: number
          created_at?: string | null
          id?: string
          paid_at?: string | null
          period?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_payouts_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          active_direct_referrals: number | null
          affiliate_status: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          parent_id: string | null
          payout_method: string | null
          status: string | null
          total_referrals_level_2: number | null
          total_referrals_level_3: number | null
        }
        Insert: {
          active_direct_referrals?: number | null
          affiliate_status?: string | null
          created_at?: string | null
          email: string
          id?: string
          name: string
          parent_id?: string | null
          payout_method?: string | null
          status?: string | null
          total_referrals_level_2?: number | null
          total_referrals_level_3?: number | null
        }
        Update: {
          active_direct_referrals?: number | null
          affiliate_status?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          parent_id?: string | null
          payout_method?: string | null
          status?: string | null
          total_referrals_level_2?: number | null
          total_referrals_level_3?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliates_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          canva_access_token: string | null
          canva_connected: boolean | null
          canva_refresh_token: string | null
          canva_team_id: string | null
          created_at: string | null
          fonts: Json | null
          id: string
          logo_url: string | null
          name: string
          palette: Json | null
          updated_at: string | null
          user_id: string
          voice: string | null
        }
        Insert: {
          canva_access_token?: string | null
          canva_connected?: boolean | null
          canva_refresh_token?: string | null
          canva_team_id?: string | null
          created_at?: string | null
          fonts?: Json | null
          id?: string
          logo_url?: string | null
          name: string
          palette?: Json | null
          updated_at?: string | null
          user_id: string
          voice?: string | null
        }
        Update: {
          canva_access_token?: string | null
          canva_connected?: boolean | null
          canva_refresh_token?: string | null
          canva_team_id?: string | null
          created_at?: string | null
          fonts?: Json | null
          id?: string
          logo_url?: string | null
          name?: string
          palette?: Json | null
          updated_at?: string | null
          user_id?: string
          voice?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brands_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error: string | null
          id: string
          input_data: Json | null
          output_data: Json | null
          status: string | null
          type: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          status?: string | null
          type: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          status?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          brand_key: string | null
          canva_design_id: string | null
          created_at: string | null
          id: string
          planner_deep_link: string | null
          status: string | null
          suggested_slots: Json | null
          template_key: string | null
          title: string | null
          type: string
          user_id: string
        }
        Insert: {
          brand_key?: string | null
          canva_design_id?: string | null
          created_at?: string | null
          id?: string
          planner_deep_link?: string | null
          status?: string | null
          suggested_slots?: Json | null
          template_key?: string | null
          title?: string | null
          type: string
          user_id: string
        }
        Update: {
          brand_key?: string | null
          canva_design_id?: string | null
          created_at?: string | null
          id?: string
          planner_deep_link?: string | null
          status?: string | null
          suggested_slots?: Json | null
          template_key?: string | null
          title?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          plan: string | null
          quota_brands: number | null
          quota_visuals_per_month: number | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          plan?: string | null
          quota_brands?: number | null
          quota_visuals_per_month?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          plan?: string | null
          quota_brands?: number | null
          quota_visuals_per_month?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      templates: {
        Row: {
          canva_template_id: string
          created_at: string | null
          folder_path: string | null
          id: string
          key: string
          ratios: Json | null
          variables: Json | null
        }
        Insert: {
          canva_template_id: string
          created_at?: string | null
          folder_path?: string | null
          id?: string
          key: string
          ratios?: Json | null
          variables?: Json | null
        }
        Update: {
          canva_template_id?: string
          created_at?: string | null
          folder_path?: string | null
          id?: string
          key?: string
          ratios?: Json | null
          variables?: Json | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_mlm_commissions: {
        Args: {
          conversion_amount: number
          conversion_id_param: string
          direct_affiliate_id: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_affiliate_status: {
        Args: { affiliate_id_param: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "user" | "admin" | "affiliate"
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

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "admin", "affiliate"],
    },
  },
} as const
