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
          stripe_connect_account_id: string | null
          stripe_connect_charges_enabled: boolean | null
          stripe_connect_onboarding_complete: boolean | null
          stripe_connect_payouts_enabled: boolean | null
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
          stripe_connect_account_id?: string | null
          stripe_connect_charges_enabled?: boolean | null
          stripe_connect_onboarding_complete?: boolean | null
          stripe_connect_payouts_enabled?: boolean | null
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
          stripe_connect_account_id?: string | null
          stripe_connect_charges_enabled?: boolean | null
          stripe_connect_onboarding_complete?: boolean | null
          stripe_connect_payouts_enabled?: boolean | null
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
      alfie_cache: {
        Row: {
          created_at: string | null
          id: string
          prompt_hash: string
          prompt_type: string
          response: Json
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          prompt_hash: string
          prompt_type: string
          response: Json
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          prompt_hash?: string
          prompt_type?: string
          response?: Json
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      alfie_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      alfie_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          image_url: string | null
          role: string
          video_url: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          role: string
          video_url?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          role?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alfie_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "alfie_conversations"
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
          images_used: number | null
          is_addon: boolean | null
          logo_url: string | null
          name: string
          palette: Json | null
          plan: string | null
          quota_images: number | null
          quota_videos: number | null
          quota_woofs: number | null
          resets_on: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
          videos_used: number | null
          voice: string | null
          woofs_used: number | null
        }
        Insert: {
          canva_access_token?: string | null
          canva_connected?: boolean | null
          canva_refresh_token?: string | null
          canva_team_id?: string | null
          created_at?: string | null
          fonts?: Json | null
          id?: string
          images_used?: number | null
          is_addon?: boolean | null
          logo_url?: string | null
          name: string
          palette?: Json | null
          plan?: string | null
          quota_images?: number | null
          quota_videos?: number | null
          quota_woofs?: number | null
          resets_on?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
          videos_used?: number | null
          voice?: string | null
          woofs_used?: number | null
        }
        Update: {
          canva_access_token?: string | null
          canva_connected?: boolean | null
          canva_refresh_token?: string | null
          canva_team_id?: string | null
          created_at?: string | null
          fonts?: Json | null
          id?: string
          images_used?: number | null
          is_addon?: boolean | null
          logo_url?: string | null
          name?: string
          palette?: Json | null
          plan?: string | null
          quota_images?: number | null
          quota_videos?: number | null
          quota_woofs?: number | null
          resets_on?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
          videos_used?: number | null
          voice?: string | null
          woofs_used?: number | null
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
      canva_designs: {
        Row: {
          canva_url: string
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string
          title: string
          updated_at: string
        }
        Insert: {
          canva_url: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          title: string
          updated_at?: string
        }
        Update: {
          canva_url?: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_requests: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      credit_packs: {
        Row: {
          created_at: string | null
          credits: number
          discount_percentage: number | null
          id: string
          name: string
          price_cents: number
          stripe_price_id: string
        }
        Insert: {
          created_at?: string | null
          credits: number
          discount_percentage?: number | null
          id?: string
          name: string
          price_cents: number
          stripe_price_id: string
        }
        Update: {
          created_at?: string | null
          credits?: number
          discount_percentage?: number | null
          id?: string
          name?: string
          price_cents?: number
          stripe_price_id?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          action: string | null
          amount: number
          created_at: string | null
          id: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          action?: string | null
          amount: number
          created_at?: string | null
          id?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          action?: string | null
          amount?: number
          created_at?: string | null
          id?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_logs: {
        Row: {
          brand_id: string | null
          created_at: string
          duration_seconds: number | null
          engine: string | null
          error_code: string | null
          id: string
          metadata: Json | null
          prompt_summary: string | null
          status: string
          type: string
          user_id: string
          woofs_cost: number | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          engine?: string | null
          error_code?: string | null
          id?: string
          metadata?: Json | null
          prompt_summary?: string | null
          status: string
          type: string
          user_id: string
          woofs_cost?: number | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          engine?: string | null
          error_code?: string | null
          id?: string
          metadata?: Json | null
          prompt_summary?: string | null
          status?: string
          type?: string
          user_id?: string
          woofs_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "generation_logs_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
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
          max_retries: number | null
          output_data: Json | null
          progress: number | null
          retry_count: number | null
          short_id: string | null
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
          max_retries?: number | null
          output_data?: Json | null
          progress?: number | null
          retry_count?: number | null
          short_id?: string | null
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
          max_retries?: number | null
          output_data?: Json | null
          progress?: number | null
          retry_count?: number | null
          short_id?: string | null
          status?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      media_generations: {
        Row: {
          brand_id: string | null
          created_at: string | null
          duration_seconds: number | null
          engine: string | null
          expires_at: string | null
          file_size_bytes: number | null
          id: string
          input_url: string | null
          is_source_upload: boolean | null
          job_id: string | null
          metadata: Json | null
          output_url: string
          progress: number
          prompt: string | null
          status: string
          thumbnail_url: string | null
          type: string
          updated_at: string | null
          user_id: string
          woofs: number | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          engine?: string | null
          expires_at?: string | null
          file_size_bytes?: number | null
          id?: string
          input_url?: string | null
          is_source_upload?: boolean | null
          job_id?: string | null
          metadata?: Json | null
          output_url: string
          progress?: number
          prompt?: string | null
          status?: string
          thumbnail_url?: string | null
          type: string
          updated_at?: string | null
          user_id: string
          woofs?: number | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          engine?: string | null
          expires_at?: string | null
          file_size_bytes?: number | null
          id?: string
          input_url?: string | null
          is_source_upload?: boolean | null
          job_id?: string | null
          metadata?: Json | null
          output_url?: string
          progress?: number
          prompt?: string | null
          status?: string
          thumbnail_url?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
          woofs?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_generations_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          published?: boolean
          title?: string
          updated_at?: string
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
          active_brand_id: string | null
          ai_credits_from_affiliation: number | null
          ai_credits_monthly: number | null
          ai_credits_purchased: number | null
          alfie_requests_reset_date: string | null
          alfie_requests_this_month: number | null
          avatar_url: string | null
          created_at: string | null
          credits_reset_date: string | null
          email: string
          full_name: string | null
          generations_reset_date: string | null
          generations_this_month: number | null
          id: string
          plan: string | null
          quota_brands: number | null
          quota_videos: number | null
          quota_visuals_per_month: number | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          videos_this_month: number | null
          woofs_consumed_this_month: number | null
        }
        Insert: {
          active_brand_id?: string | null
          ai_credits_from_affiliation?: number | null
          ai_credits_monthly?: number | null
          ai_credits_purchased?: number | null
          alfie_requests_reset_date?: string | null
          alfie_requests_this_month?: number | null
          avatar_url?: string | null
          created_at?: string | null
          credits_reset_date?: string | null
          email: string
          full_name?: string | null
          generations_reset_date?: string | null
          generations_this_month?: number | null
          id: string
          plan?: string | null
          quota_brands?: number | null
          quota_videos?: number | null
          quota_visuals_per_month?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          videos_this_month?: number | null
          woofs_consumed_this_month?: number | null
        }
        Update: {
          active_brand_id?: string | null
          ai_credits_from_affiliation?: number | null
          ai_credits_monthly?: number | null
          ai_credits_purchased?: number | null
          alfie_requests_reset_date?: string | null
          alfie_requests_this_month?: number | null
          avatar_url?: string | null
          created_at?: string | null
          credits_reset_date?: string | null
          email?: string
          full_name?: string | null
          generations_reset_date?: string | null
          generations_this_month?: number | null
          id?: string
          plan?: string | null
          quota_brands?: number | null
          quota_videos?: number | null
          quota_visuals_per_month?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          videos_this_month?: number | null
          woofs_consumed_this_month?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_brand_id_fkey"
            columns: ["active_brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
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
      video_segments: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          id: string
          is_temporary: boolean | null
          parent_video_id: string | null
          segment_index: number
          segment_url: string
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          is_temporary?: boolean | null
          parent_video_id?: string | null
          segment_index: number
          segment_url: string
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          is_temporary?: boolean | null
          parent_video_id?: string | null
          segment_index?: number
          segment_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_segments_parent_video_id_fkey"
            columns: ["parent_video_id"]
            isOneToOne: false
            referencedRelation: "media_generations"
            referencedColumns: ["id"]
          },
        ]
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
      generate_short_job_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_active_plan: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_alfie_requests: {
        Args: { user_id_param: string }
        Returns: number
      }
      update_affiliate_status: {
        Args: { affiliate_id_param: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "user" | "admin" | "affiliate"
      asset_engine: "nano" | "sora" | "veo3"
      brand_plan: "starter" | "pro" | "studio"
      plan_type: "starter" | "pro" | "studio"
      video_engine: "sora" | "seededance" | "kling"
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
      asset_engine: ["nano", "sora", "veo3"],
      brand_plan: ["starter", "pro", "studio"],
      plan_type: ["starter", "pro", "studio"],
      video_engine: ["sora", "seededance", "kling"],
    },
  },
} as const
