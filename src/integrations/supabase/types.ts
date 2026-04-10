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
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          performed_by: string
          target_user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          performed_by: string
          target_user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          performed_by?: string
          target_user_id?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          photo_id: string | null
          price: number
          resolution: string | null
          session_id: string
          video_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          photo_id?: string | null
          price?: number
          resolution?: string | null
          session_id: string
          video_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          photo_id?: string | null
          price?: number
          resolution?: string | null
          session_id?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "event_photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "event_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_links: {
        Row: {
          created_at: string
          id: string
          label: string
          sort_order: number | null
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          sort_order?: number | null
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          sort_order?: number | null
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      discount_packages: {
        Row: {
          all_photos_price: number | null
          created_at: string
          discount_pct: number
          event_id: string
          id: string
          min_photo_price: number | null
          min_photos: number
        }
        Insert: {
          all_photos_price?: number | null
          created_at?: string
          discount_pct?: number
          event_id: string
          id?: string
          min_photo_price?: number | null
          min_photos?: number
        }
        Update: {
          all_photos_price?: number | null
          created_at?: string
          discount_pct?: number
          event_id?: string
          id?: string
          min_photo_price?: number | null
          min_photos?: number
        }
        Relationships: [
          {
            foreignKeyName: "discount_packages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          event_id: string
          id: string
          max_uses: number
          uses: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          event_id: string
          id?: string
          max_uses?: number
          uses?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          event_id?: string
          id?: string
          max_uses?: number
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_coupons_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_photographers: {
        Row: {
          commission_pct: number
          created_at: string
          event_id: string
          id: string
          photographer_id: string
        }
        Insert: {
          commission_pct?: number
          created_at?: string
          event_id: string
          id?: string
          photographer_id: string
        }
        Update: {
          commission_pct?: number
          created_at?: string
          event_id?: string
          id?: string
          photographer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_photographers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_photos: {
        Row: {
          album: string | null
          created_at: string
          event_id: string
          file_name: string | null
          file_url: string
          id: string
          identified: boolean
          photographer_id: string | null
        }
        Insert: {
          album?: string | null
          created_at?: string
          event_id: string
          file_name?: string | null
          file_url: string
          id?: string
          identified?: boolean
          photographer_id?: string | null
        }
        Update: {
          album?: string | null
          created_at?: string
          event_id?: string
          file_name?: string | null
          file_url?: string
          id?: string
          identified?: boolean
          photographer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_videos: {
        Row: {
          created_at: string
          event_id: string
          file_name: string | null
          file_url: string
          id: string
          photographer_id: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          file_name?: string | null
          file_url: string
          id?: string
          photographer_id?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          file_name?: string | null
          file_url?: string
          id?: string
          photographer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_videos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category: string
          cover_url: string | null
          created_at: string
          event_date: string
          event_time: string | null
          id: string
          location: string
          name: string
          organizer_id: string
          password: string | null
          plan_type: string
          search_type: string[] | null
          status: Database["public"]["Enums"]["event_status"]
          updated_at: string
          visibility: boolean
        }
        Insert: {
          category?: string
          cover_url?: string | null
          created_at?: string
          event_date: string
          event_time?: string | null
          id?: string
          location: string
          name: string
          organizer_id: string
          password?: string | null
          plan_type?: string
          search_type?: string[] | null
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
          visibility?: boolean
        }
        Update: {
          category?: string
          cover_url?: string | null
          created_at?: string
          event_date?: string
          event_time?: string | null
          id?: string
          location?: string
          name?: string
          organizer_id?: string
          password?: string | null
          plan_type?: string
          search_type?: string[] | null
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
          visibility?: boolean
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          photo_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          photo_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          photo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "event_photos"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          photo_id: string | null
          price: number
          video_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          photo_id?: string | null
          price?: number
          video_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          photo_id?: string | null
          price?: number
          video_id?: string | null
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
            foreignKeyName: "order_items_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "event_photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "event_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          asaas_payment_id: string | null
          client_cpf: string | null
          client_email: string
          client_name: string
          created_at: string
          event_id: string
          id: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          status: Database["public"]["Enums"]["order_status"]
          tracking_origin: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          asaas_payment_id?: string | null
          client_cpf?: string | null
          client_email: string
          client_name: string
          created_at?: string
          event_id: string
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          status?: Database["public"]["Enums"]["order_status"]
          tracking_origin?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          asaas_payment_id?: string | null
          client_cpf?: string | null
          client_email?: string
          client_name?: string
          created_at?: string
          event_id?: string
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          status?: Database["public"]["Enums"]["order_status"]
          tracking_origin?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      photographer_sites: {
        Row: {
          allow_custom_links: boolean | null
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          cnpj: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          display_name: string | null
          facebook: string | null
          id: string
          instagram: string | null
          linkedin: string | null
          primary_color: string | null
          secondary_color: string | null
          seo_keywords: string | null
          seo_title: string | null
          slug: string | null
          template: string | null
          tiktok: string | null
          twitter: string | null
          updated_at: string
          user_id: string
          watermark_url: string | null
          whatsapp: string | null
          youtube: string | null
        }
        Insert: {
          allow_custom_links?: boolean | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          cnpj?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          display_name?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          slug?: string | null
          template?: string | null
          tiktok?: string | null
          twitter?: string | null
          updated_at?: string
          user_id: string
          watermark_url?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Update: {
          allow_custom_links?: boolean | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          cnpj?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          display_name?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          slug?: string | null
          template?: string | null
          tiktok?: string | null
          twitter?: string | null
          updated_at?: string
          user_id?: string
          watermark_url?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
      price_grids: {
        Row: {
          created_at: string
          event_id: string
          id: string
          name: string
          photo_high_price: number
          photo_low_price: number
          video_price: number
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          name?: string
          photo_high_price?: number
          photo_low_price?: number
          video_price?: number
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          name?: string
          photo_high_price?: number
          photo_low_price?: number
          video_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_grids_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          asaas_customer_id: string | null
          asaas_wallet_id: string | null
          avatar_url: string | null
          blocked: boolean
          cpf_cnpj: string | null
          created_at: string
          experience_level: string | null
          full_name: string | null
          id: string
          interest: string | null
          last_sign_in_at: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_wallet_id?: string | null
          avatar_url?: string | null
          blocked?: boolean
          cpf_cnpj?: string | null
          created_at?: string
          experience_level?: string | null
          full_name?: string | null
          id?: string
          interest?: string | null
          last_sign_in_at?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_wallet_id?: string | null
          avatar_url?: string | null
          blocked?: boolean
          cpf_cnpj?: string | null
          created_at?: string
          experience_level?: string | null
          full_name?: string | null
          id?: string
          interest?: string | null
          last_sign_in_at?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_event_organizer: { Args: { _event_id: string }; Returns: boolean }
      is_event_photographer: { Args: { _event_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "user" | "photographer" | "organizer" | "super_admin"
      discount_type: "percentual" | "valor_fixo"
      event_status: "ativo" | "em_breve" | "inativo"
      order_status: "aguardando_pagamento" | "pago" | "enviado" | "cancelado"
      payment_method: "pix" | "cartao"
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
      app_role: ["user", "photographer", "organizer", "super_admin"],
      discount_type: ["percentual", "valor_fixo"],
      event_status: ["ativo", "em_breve", "inativo"],
      order_status: ["aguardando_pagamento", "pago", "enviado", "cancelado"],
      payment_method: ["pix", "cartao"],
    },
  },
} as const
