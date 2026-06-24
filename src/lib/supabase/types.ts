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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      api_tokens: {
        Row: {
          created_at: string
          id: string
          last_used_at: string | null
          name: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          name?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          name?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      job_analyses: {
        Row: {
          analysis_version: number
          analyzed_at: string
          budget_fit: Json | null
          client_analysis: Json | null
          competition_analysis: Json | null
          id: string
          job_id: string
          match_score: number | null
          model_used: string | null
          opportunity_score: number | null
          proposal_tips: string[] | null
          reasoning: string | null
          recommendation: string | null
          red_flags: string[] | null
          skills_match: Json | null
          user_id: string
          win_probability: number | null
        }
        Insert: {
          analysis_version?: number
          analyzed_at?: string
          budget_fit?: Json | null
          client_analysis?: Json | null
          competition_analysis?: Json | null
          id?: string
          job_id: string
          match_score?: number | null
          model_used?: string | null
          opportunity_score?: number | null
          proposal_tips?: string[] | null
          reasoning?: string | null
          recommendation?: string | null
          red_flags?: string[] | null
          skills_match?: Json | null
          user_id: string
          win_probability?: number | null
        }
        Update: {
          analysis_version?: number
          analyzed_at?: string
          budget_fit?: Json | null
          client_analysis?: Json | null
          competition_analysis?: Json | null
          id?: string
          job_id?: string
          match_score?: number | null
          model_used?: string | null
          opportunity_score?: number | null
          proposal_tips?: string[] | null
          reasoning?: string | null
          recommendation?: string | null
          red_flags?: string[] | null
          skills_match?: Json | null
          user_id?: string
          win_probability?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_analyses_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_filters: {
        Row: {
          category: string | null
          client_countries: string[]
          contractor_tier: string | null
          created_at: string
          hourly_max: number | null
          hourly_min: number | null
          id: string
          is_active: boolean
          job_type: string | null
          keywords: string[]
          max_budget: number | null
          max_proposals: number | null
          min_budget: number | null
          min_client_spend: number | null
          name: string
          skills: string[]
          subcategory: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          client_countries?: string[]
          contractor_tier?: string | null
          created_at?: string
          hourly_max?: number | null
          hourly_min?: number | null
          id?: string
          is_active?: boolean
          job_type?: string | null
          keywords?: string[]
          max_budget?: number | null
          max_proposals?: number | null
          min_budget?: number | null
          min_client_spend?: number | null
          name?: string
          skills?: string[]
          subcategory?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          client_countries?: string[]
          contractor_tier?: string | null
          created_at?: string
          hourly_max?: number | null
          hourly_min?: number | null
          id?: string
          is_active?: boolean
          job_type?: string | null
          keywords?: string[]
          max_budget?: number | null
          max_proposals?: number | null
          min_budget?: number | null
          min_client_spend?: number | null
          name?: string
          skills?: string[]
          subcategory?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      job_scores: {
        Row: {
          created_at: string
          id: string
          job_id: string
          match_score: number | null
          opportunity_score: number | null
          recommendation: string | null
          user_id: string
          win_probability: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          match_score?: number | null
          opportunity_score?: number | null
          recommendation?: string | null
          user_id: string
          win_probability?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          match_score?: number | null
          opportunity_score?: number | null
          recommendation?: string | null
          user_id?: string
          win_probability?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_scores_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          budget: number | null
          category: string | null
          client_country: string | null
          client_hire_rate: number | null
          client_spend: number | null
          created_at: string
          description: string | null
          hourly_max: number | null
          hourly_min: number | null
          id: string
          payment_verified: boolean | null
          posted_at: string | null
          proposals_count: number | null
          source: string | null
          subcategory: string | null
          title: string
          upwork_job_id: string
          url: string | null
        }
        Insert: {
          budget?: number | null
          category?: string | null
          client_country?: string | null
          client_hire_rate?: number | null
          client_spend?: number | null
          created_at?: string
          description?: string | null
          hourly_max?: number | null
          hourly_min?: number | null
          id?: string
          payment_verified?: boolean | null
          posted_at?: string | null
          proposals_count?: number | null
          source?: string | null
          subcategory?: string | null
          title: string
          upwork_job_id: string
          url?: string | null
        }
        Update: {
          budget?: number | null
          category?: string | null
          client_country?: string | null
          client_hire_rate?: number | null
          client_spend?: number | null
          created_at?: string
          description?: string | null
          hourly_max?: number | null
          hourly_min?: number | null
          id?: string
          payment_verified?: boolean | null
          posted_at?: string | null
          proposals_count?: number | null
          source?: string | null
          subcategory?: string | null
          title?: string
          upwork_job_id?: string
          url?: string | null
        }
        Relationships: []
      }
      notification_channels: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_active: boolean
          is_verified: boolean
          name: string
          type: Database["public"]["Enums"]["channel_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          is_verified?: boolean
          name: string
          type: Database["public"]["Enums"]["channel_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          is_verified?: boolean
          name?: string
          type?: Database["public"]["Enums"]["channel_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_rules: {
        Row: {
          channel_id: string
          created_at: string
          id: string
          is_active: boolean
          job_filter_id: string | null
          match_score_min: number
          max_proposals: number
          opportunity_score_min: number
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          job_filter_id?: string | null
          match_score_min?: number
          max_proposals?: number
          opportunity_score_min?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          job_filter_id?: string | null
          match_score_min?: number
          max_proposals?: number
          opportunity_score_min?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_rules_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "notification_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_rules_job_filter_id_fkey"
            columns: ["job_filter_id"]
            isOneToOne: false
            referencedRelation: "job_filters"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          channel: string
          created_at: string
          id: string
          job_id: string
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          job_id: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          job_id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_jobs: {
        Row: {
          created_at: string
          id: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      proposals: {
        Row: {
          created_at: string
          final_text: string | null
          generated_text: string
          id: string
          job_id: string
          score: number | null
          status: Database["public"]["Enums"]["proposal_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          final_text?: string | null
          generated_text: string
          id?: string
          job_id: string
          score?: number | null
          status?: Database["public"]["Enums"]["proposal_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          final_text?: string | null
          generated_text?: string
          id?: string
          job_id?: string
          score?: number | null
          status?: Database["public"]["Enums"]["proposal_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      upwork_sessions: {
        Row: {
          captured_at: string
          cookie_string: string
          domain: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          captured_at?: string
          cookie_string: string
          domain?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          captured_at?: string
          cookie_string?: string
          domain?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          daily_digest: boolean
          id: string
          notify_on_contract_updates: boolean
          notify_on_match: boolean
          notify_on_proposal_status: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_digest?: boolean
          id?: string
          notify_on_contract_updates?: boolean
          notify_on_match?: boolean
          notify_on_proposal_status?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_digest?: boolean
          id?: string
          notify_on_contract_updates?: boolean
          notify_on_match?: boolean
          notify_on_proposal_status?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      upwork_profiles: {
        Row: {
          bio: string | null
          client_rating: number | null
          created_at: string
          hourly_rate: number | null
          id: string
          member_since: string | null
          portfolio: Json | null
          skills: string[]
          title: string | null
          total_earnings: number | null
          total_hours: number | null
          total_jobs_done: number | null
          updated_at: string
          upwork_url: string | null
          user_id: string
        }
        Insert: {
          bio?: string | null
          client_rating?: number | null
          created_at?: string
          hourly_rate?: number | null
          id?: string
          member_since?: string | null
          portfolio?: Json | null
          skills?: string[]
          title?: string | null
          total_earnings?: number | null
          total_hours?: number | null
          total_jobs_done?: number | null
          updated_at?: string
          upwork_url?: string | null
          user_id: string
        }
        Update: {
          bio?: string | null
          client_rating?: number | null
          created_at?: string
          hourly_rate?: number | null
          id?: string
          member_since?: string | null
          portfolio?: Json | null
          skills?: string[]
          title?: string | null
          total_earnings?: number | null
          total_hours?: number | null
          total_jobs_done?: number | null
          updated_at?: string
          upwork_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          client_name: string | null
          client_rating: number | null
          client_url: string | null
          created_at: string
          ended_at: string | null
          fixed_price: number | null
          hourly_rate: number | null
          id: string
          started_at: string | null
          status: string
          title: string
          total_earned: number | null
          total_hours: number | null
          type: string
          updated_at: string
          upwork_contract_id: string
          user_id: string
        }
        Insert: {
          client_name?: string | null
          client_rating?: number | null
          client_url?: string | null
          created_at?: string
          ended_at?: string | null
          fixed_price?: number | null
          hourly_rate?: number | null
          id?: string
          started_at?: string | null
          status?: string
          title: string
          total_earned?: number | null
          total_hours?: number | null
          type?: string
          updated_at?: string
          upwork_contract_id: string
          user_id: string
        }
        Update: {
          client_name?: string | null
          client_rating?: number | null
          client_url?: string | null
          created_at?: string
          ended_at?: string | null
          fixed_price?: number | null
          hourly_rate?: number | null
          id?: string
          started_at?: string | null
          status?: string
          title?: string
          total_earned?: number | null
          total_hours?: number | null
          type?: string
          updated_at?: string
          upwork_contract_id?: string
          user_id?: string
        }
        Relationships: []
      }
      work_diary_entries: {
        Row: {
          activity_level: number | null
          contract_id: string
          created_at: string
          date: string
          hours_worked: number
          id: string
          notes: string | null
          screenshot_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_level?: number | null
          contract_id: string
          created_at?: string
          date: string
          hours_worked: number
          id?: string
          notes?: string | null
          screenshot_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_level?: number | null
          contract_id?: string
          created_at?: string
          date?: string
          hours_worked?: number
          id?: string
          notes?: string | null
          screenshot_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_diary_entries_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      channel_type:
        | "email"
        | "telegram"
        | "slack"
        | "discord"
        | "webhook"
        | "sms"
      notification_status: "pending" | "sent" | "failed"
      proposal_status: "draft" | "sent" | "won" | "lost"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      channel_type: ["email", "telegram", "slack", "discord", "webhook", "sms"],
      notification_status: ["pending", "sent", "failed"],
      proposal_status: ["draft", "sent", "won", "lost"],
    },
  },
} as const
