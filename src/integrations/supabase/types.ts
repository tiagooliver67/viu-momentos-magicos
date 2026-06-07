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
      bib_detection_errors: {
        Row: {
          created_at: string
          error_code: string | null
          error_message: string | null
          event_id: string | null
          id: string
          photo_id: string | null
          retry_count: number
          s3_key: string
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          event_id?: string | null
          id?: string
          photo_id?: string | null
          retry_count?: number
          s3_key: string
        }
        Update: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          event_id?: string | null
          id?: string
          photo_id?: string | null
          retry_count?: number
          s3_key?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          category: string | null
          content: string
          created_at: string
          excerpt: string | null
          featured_image: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          read_minutes: number | null
          slug: string
          status: string
          title: string
          updated_at: string
          views_count: number
        }
        Insert: {
          category?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          read_minutes?: number | null
          slug: string
          status?: string
          title: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          read_minutes?: number | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
          views_count?: number
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
            foreignKeyName: "cart_items_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photo_search_index"
            referencedColumns: ["photo_id"]
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
          active: boolean
          all_photos_price: number | null
          base_photo_price: number | null
          created_at: string
          discount_pct: number
          display_mode: string
          event_id: string
          id: string
          min_photo_price: number | null
          min_photos: number
          package_type: string
        }
        Insert: {
          active?: boolean
          all_photos_price?: number | null
          base_photo_price?: number | null
          created_at?: string
          discount_pct?: number
          display_mode?: string
          event_id: string
          id?: string
          min_photo_price?: number | null
          min_photos?: number
          package_type?: string
        }
        Update: {
          active?: boolean
          all_photos_price?: number | null
          base_photo_price?: number | null
          created_at?: string
          discount_pct?: number
          display_mode?: string
          event_id?: string
          id?: string
          min_photo_price?: number | null
          min_photos?: number
          package_type?: string
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
      event_applications: {
        Row: {
          created_at: string
          event_id: string
          id: string
          message: string | null
          organizer_response: string | null
          photographer_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["application_status"]
          suggested_fee: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          message?: string | null
          organizer_response?: string | null
          photographer_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          suggested_fee?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          message?: string | null
          organizer_response?: string | null
          photographer_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          suggested_fee?: number | null
          updated_at?: string
        }
        Relationships: []
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
      event_face_collections: {
        Row: {
          collection_id: string
          created_at: string
          event_id: string
          faces_indexed: number
          last_indexed_at: string | null
          last_searched_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          event_id: string
          faces_indexed?: number
          last_indexed_at?: string | null
          last_searched_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          event_id?: string
          faces_indexed?: number
          last_indexed_at?: string | null
          last_searched_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_indexing_progress: {
        Row: {
          bibs_done: number
          bibs_errors: number
          created_at: string
          event_id: string
          faces_done: number
          faces_errors: number
          last_updated_at: string
          total_photos: number
        }
        Insert: {
          bibs_done?: number
          bibs_errors?: number
          created_at?: string
          event_id: string
          faces_done?: number
          faces_errors?: number
          last_updated_at?: string
          total_photos?: number
        }
        Update: {
          bibs_done?: number
          bibs_errors?: number
          created_at?: string
          event_id?: string
          faces_done?: number
          faces_errors?: number
          last_updated_at?: string
          total_photos?: number
        }
        Relationships: []
      }
      event_partners: {
        Row: {
          commission_pct: number
          created_at: string
          event_id: string
          id: string
          partner_email: string | null
          partner_name: string
          partner_user_id: string | null
          permissions: Json
        }
        Insert: {
          commission_pct?: number
          created_at?: string
          event_id: string
          id?: string
          partner_email?: string | null
          partner_name: string
          partner_user_id?: string | null
          permissions?: Json
        }
        Update: {
          commission_pct?: number
          created_at?: string
          event_id?: string
          id?: string
          partner_email?: string | null
          partner_name?: string
          partner_user_id?: string | null
          permissions?: Json
        }
        Relationships: [
          {
            foreignKeyName: "event_partners_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_photo_faces: {
        Row: {
          bounding_box: Json
          confidence: number
          event_id: string
          external_image_id: string | null
          face_crop_generated_at: string | null
          face_crop_s3_key: string | null
          id: string
          indexed_at: string
          photo_id: string
          pose: Json | null
          quality: Json | null
          rekognition_face_id: string
        }
        Insert: {
          bounding_box: Json
          confidence: number
          event_id: string
          external_image_id?: string | null
          face_crop_generated_at?: string | null
          face_crop_s3_key?: string | null
          id?: string
          indexed_at?: string
          photo_id: string
          pose?: Json | null
          quality?: Json | null
          rekognition_face_id: string
        }
        Update: {
          bounding_box?: Json
          confidence?: number
          event_id?: string
          external_image_id?: string | null
          face_crop_generated_at?: string | null
          face_crop_s3_key?: string | null
          id?: string
          indexed_at?: string
          photo_id?: string
          pose?: Json | null
          quality?: Json | null
          rekognition_face_id?: string
        }
        Relationships: []
      }
      event_photographers: {
        Row: {
          commission_pct: number
          created_at: string
          event_id: string
          id: string
          invited_at: string
          note: string | null
          photographer_id: string
          status: string
        }
        Insert: {
          commission_pct?: number
          created_at?: string
          event_id: string
          id?: string
          invited_at?: string
          note?: string | null
          photographer_id: string
          status?: string
        }
        Update: {
          commission_pct?: number
          created_at?: string
          event_id?: string
          id?: string
          invited_at?: string
          note?: string | null
          photographer_id?: string
          status?: string
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
          bibs_count: number
          bibs_indexed_at: string | null
          created_at: string
          event_id: string
          faces_indexed_at: string | null
          file_name: string | null
          file_url: string
          id: string
          identified: boolean
          indexing_status: string
          photographer_id: string | null
        }
        Insert: {
          album?: string | null
          bibs_count?: number
          bibs_indexed_at?: string | null
          created_at?: string
          event_id: string
          faces_indexed_at?: string | null
          file_name?: string | null
          file_url: string
          id?: string
          identified?: boolean
          indexing_status?: string
          photographer_id?: string | null
        }
        Update: {
          album?: string | null
          bibs_count?: number
          bibs_indexed_at?: string | null
          created_at?: string
          event_id?: string
          faces_indexed_at?: string | null
          file_name?: string | null
          file_url?: string
          id?: string
          identified?: boolean
          indexing_status?: string
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
      event_registrations: {
        Row: {
          amount_due: number
          birth_date: string | null
          category: string | null
          category_id: string | null
          checked_in_at: string | null
          checkin_status: Database["public"]["Enums"]["registration_checkin_status"]
          city: string | null
          cpf: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          notes: string | null
          payment_proof_url: string | null
          payment_status: Database["public"]["Enums"]["registration_payment_status"]
          phone: string
          price_tier_id: string | null
          qr_token: string
          registration_event_id: string
          senior_discount_applied: boolean
          shirt_size: string | null
          team: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_due?: number
          birth_date?: string | null
          category?: string | null
          category_id?: string | null
          checked_in_at?: string | null
          checkin_status?: Database["public"]["Enums"]["registration_checkin_status"]
          city?: string | null
          cpf?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          notes?: string | null
          payment_proof_url?: string | null
          payment_status?: Database["public"]["Enums"]["registration_payment_status"]
          phone: string
          price_tier_id?: string | null
          qr_token?: string
          registration_event_id: string
          senior_discount_applied?: boolean
          shirt_size?: string | null
          team?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_due?: number
          birth_date?: string | null
          category?: string | null
          category_id?: string | null
          checked_in_at?: string | null
          checkin_status?: Database["public"]["Enums"]["registration_checkin_status"]
          city?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          notes?: string | null
          payment_proof_url?: string | null
          payment_status?: Database["public"]["Enums"]["registration_payment_status"]
          phone?: string
          price_tier_id?: string | null
          qr_token?: string
          registration_event_id?: string
          senior_discount_applied?: boolean
          shirt_size?: string | null
          team?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "registration_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_price_tier_id_fkey"
            columns: ["price_tier_id"]
            isOneToOne: false
            referencedRelation: "registration_price_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_registration_event_id_fkey"
            columns: ["registration_event_id"]
            isOneToOne: false
            referencedRelation: "registration_events"
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
          bib_number_pattern: string
          bib_search_enabled: boolean
          category: string
          collab_note: string | null
          cover_url: string | null
          created_at: string
          event_date: string
          event_time: string | null
          face_index_mode: string
          face_search_enabled: boolean
          id: string
          location: string
          name: string
          organizer_id: string
          owner_commission_pct: number
          password: string | null
          plan_type: string
          progressive_discount_enabled: boolean
          progressive_discount_rules: Json
          search_type: string[] | null
          status: Database["public"]["Enums"]["event_status"]
          updated_at: string
          visibility: boolean
        }
        Insert: {
          bib_number_pattern?: string
          bib_search_enabled?: boolean
          category?: string
          collab_note?: string | null
          cover_url?: string | null
          created_at?: string
          event_date: string
          event_time?: string | null
          face_index_mode?: string
          face_search_enabled?: boolean
          id?: string
          location: string
          name: string
          organizer_id: string
          owner_commission_pct?: number
          password?: string | null
          plan_type?: string
          progressive_discount_enabled?: boolean
          progressive_discount_rules?: Json
          search_type?: string[] | null
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
          visibility?: boolean
        }
        Update: {
          bib_number_pattern?: string
          bib_search_enabled?: boolean
          category?: string
          collab_note?: string | null
          cover_url?: string | null
          created_at?: string
          event_date?: string
          event_time?: string | null
          face_index_mode?: string
          face_search_enabled?: boolean
          id?: string
          location?: string
          name?: string
          organizer_id?: string
          owner_commission_pct?: number
          password?: string | null
          plan_type?: string
          progressive_discount_enabled?: boolean
          progressive_discount_rules?: Json
          search_type?: string[] | null
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
          visibility?: boolean
        }
        Relationships: []
      }
      face_index_jobs: {
        Row: {
          attempts: number
          created_at: string
          enqueued_at: string
          error_code: string | null
          error_message: string | null
          event_id: string
          finished_at: string | null
          id: string
          photo_id: string
          s3_key: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          enqueued_at?: string
          error_code?: string | null
          error_message?: string | null
          event_id: string
          finished_at?: string | null
          id?: string
          photo_id: string
          s3_key?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          enqueued_at?: string
          error_code?: string | null
          error_message?: string | null
          event_id?: string
          finished_at?: string | null
          id?: string
          photo_id?: string
          s3_key?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      face_search_logs: {
        Row: {
          avg_similarity: number | null
          best_similarity: number | null
          created_at: string
          duration_ms: number | null
          event_id: string
          id: string
          ip_address: string | null
          matches_count: number
          selfie_quality: Json | null
          selfie_s3_key: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          avg_similarity?: number | null
          best_similarity?: number | null
          created_at?: string
          duration_ms?: number | null
          event_id: string
          id?: string
          ip_address?: string | null
          matches_count?: number
          selfie_quality?: Json | null
          selfie_s3_key?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          avg_similarity?: number | null
          best_similarity?: number | null
          created_at?: string
          duration_ms?: number | null
          event_id?: string
          id?: string
          ip_address?: string | null
          matches_count?: number
          selfie_quality?: Json | null
          selfie_s3_key?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      face_search_matches: {
        Row: {
          added_to_cart_at: string | null
          clicked_at: string | null
          created_at: string
          event_id: string
          face_id: string | null
          id: string
          photo_id: string
          purchased_at: string | null
          rank: number
          search_log_id: string
          similarity: number
        }
        Insert: {
          added_to_cart_at?: string | null
          clicked_at?: string | null
          created_at?: string
          event_id: string
          face_id?: string | null
          id?: string
          photo_id: string
          purchased_at?: string | null
          rank: number
          search_log_id: string
          similarity: number
        }
        Update: {
          added_to_cart_at?: string | null
          clicked_at?: string | null
          created_at?: string
          event_id?: string
          face_id?: string | null
          id?: string
          photo_id?: string
          purchased_at?: string | null
          rank?: number
          search_log_id?: string
          similarity?: number
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
          {
            foreignKeyName: "favorites_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photo_search_index"
            referencedColumns: ["photo_id"]
          },
        ]
      }
      hero_settings: {
        Row: {
          autoplay: boolean
          created_at: string
          highlight: string
          highlight_color: string
          id: string
          interval_seconds: number
          title: string
          title_color: string
          transition_duration_ms: number
          transition_type: string
          updated_at: string
        }
        Insert: {
          autoplay?: boolean
          created_at?: string
          highlight?: string
          highlight_color?: string
          id?: string
          interval_seconds?: number
          title?: string
          title_color?: string
          transition_duration_ms?: number
          transition_type?: string
          updated_at?: string
        }
        Update: {
          autoplay?: boolean
          created_at?: string
          highlight?: string
          highlight_color?: string
          id?: string
          interval_seconds?: number
          title?: string
          title_color?: string
          transition_duration_ms?: number
          transition_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      hero_slides: {
        Row: {
          active: boolean
          created_at: string
          id: string
          image_path: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          image_path: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          image_path?: string
          sort_order?: number
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          photo_id: string | null
          price: number
          resolution: string
          video_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          photo_id?: string | null
          price?: number
          resolution?: string
          video_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          photo_id?: string | null
          price?: number
          resolution?: string
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
            foreignKeyName: "order_items_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photo_search_index"
            referencedColumns: ["photo_id"]
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
      photo_bib_numbers: {
        Row: {
          bbox: Json
          confidence: number
          detected_at: string
          event_id: string
          id: string
          number: string
          photo_id: string
          raw_text: string
        }
        Insert: {
          bbox?: Json
          confidence: number
          detected_at?: string
          event_id: string
          id?: string
          number: string
          photo_id: string
          raw_text: string
        }
        Update: {
          bbox?: Json
          confidence?: number
          detected_at?: string
          event_id?: string
          id?: string
          number?: string
          photo_id?: string
          raw_text?: string
        }
        Relationships: []
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
          watermark_opacity: number | null
          watermark_position: string | null
          watermark_size: number | null
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
          watermark_opacity?: number | null
          watermark_position?: string | null
          watermark_size?: number | null
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
          watermark_opacity?: number | null
          watermark_position?: string | null
          watermark_size?: number | null
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
          terms_accepted_at: string | null
          terms_version: string | null
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
          terms_accepted_at?: string | null
          terms_version?: string | null
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
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      proposal_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          proposal_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          proposal_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          proposal_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_attachments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          proposal_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          proposal_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          proposal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_comments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          created_at: string
          created_by: string
          deadline: string | null
          description: string | null
          event_id: string
          fee: number | null
          id: string
          organizer_id: string
          photographer_id: string
          status: Database["public"]["Enums"]["proposal_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deadline?: string | null
          description?: string | null
          event_id: string
          fee?: number | null
          id?: string
          organizer_id: string
          photographer_id: string
          status?: Database["public"]["Enums"]["proposal_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deadline?: string | null
          description?: string | null
          event_id?: string
          fee?: number | null
          id?: string
          organizer_id?: string
          photographer_id?: string
          status?: Database["public"]["Enums"]["proposal_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      registration_categories: {
        Row: {
          created_at: string
          id: string
          max_slots: number | null
          name: string
          registration_event_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          max_slots?: number | null
          name: string
          registration_event_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          max_slots?: number | null
          name?: string
          registration_event_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "registration_categories_registration_event_id_fkey"
            columns: ["registration_event_id"]
            isOneToOne: false
            referencedRelation: "registration_events"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_events: {
        Row: {
          categories: Json
          category: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          event_date: string
          event_time: string | null
          id: string
          location: string
          max_slots: number | null
          name: string
          organizer_id: string
          payment_instructions: string | null
          pix_amount: number | null
          pix_key: string | null
          regulation: string | null
          regulation_file_url: string | null
          requires_birth_date: boolean
          requires_city: boolean
          requires_shirt_size: boolean
          senior_discount_enabled: boolean
          senior_discount_min_age: number
          shirt_sizes: Json
          slug: string
          status: Database["public"]["Enums"]["registration_event_status"]
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          categories?: Json
          category?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          event_date: string
          event_time?: string | null
          id?: string
          location: string
          max_slots?: number | null
          name: string
          organizer_id: string
          payment_instructions?: string | null
          pix_amount?: number | null
          pix_key?: string | null
          regulation?: string | null
          regulation_file_url?: string | null
          requires_birth_date?: boolean
          requires_city?: boolean
          requires_shirt_size?: boolean
          senior_discount_enabled?: boolean
          senior_discount_min_age?: number
          shirt_sizes?: Json
          slug: string
          status?: Database["public"]["Enums"]["registration_event_status"]
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          categories?: Json
          category?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          event_date?: string
          event_time?: string | null
          id?: string
          location?: string
          max_slots?: number | null
          name?: string
          organizer_id?: string
          payment_instructions?: string | null
          pix_amount?: number | null
          pix_key?: string | null
          regulation?: string | null
          regulation_file_url?: string | null
          requires_birth_date?: boolean
          requires_city?: boolean
          requires_shirt_size?: boolean
          senior_discount_enabled?: boolean
          senior_discount_min_age?: number
          shirt_sizes?: Json
          slug?: string
          status?: Database["public"]["Enums"]["registration_event_status"]
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      registration_price_tiers: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          name: string
          price: number
          registration_event_id: string
          sort_order: number
          starts_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          name: string
          price?: number
          registration_event_id: string
          sort_order?: number
          starts_at: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          name?: string
          price?: number
          registration_event_id?: string
          sort_order?: number
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registration_price_tiers_registration_event_id_fkey"
            columns: ["registration_event_id"]
            isOneToOne: false
            referencedRelation: "registration_events"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_shirt_stock: {
        Row: {
          created_at: string
          id: string
          quantity: number
          registration_event_id: string
          size: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          quantity?: number
          registration_event_id: string
          size: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          quantity?: number
          registration_event_id?: string
          size?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "registration_shirt_stock_registration_event_id_fkey"
            columns: ["registration_event_id"]
            isOneToOne: false
            referencedRelation: "registration_events"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_response: string | null
          assigned_photographer_id: string | null
          attachment_url: string | null
          category: string
          created_at: string
          escalate_after: string | null
          escalated_at: string | null
          event_id: string | null
          id: string
          message: string
          photo_id: string | null
          photo_url: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          subject: string
          updated_at: string
          user_email: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          admin_response?: string | null
          assigned_photographer_id?: string | null
          attachment_url?: string | null
          category: string
          created_at?: string
          escalate_after?: string | null
          escalated_at?: string | null
          event_id?: string | null
          id?: string
          message: string
          photo_id?: string | null
          photo_url?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_email: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          admin_response?: string | null
          assigned_photographer_id?: string | null
          attachment_url?: string | null
          category?: string
          created_at?: string
          escalate_after?: string | null
          escalated_at?: string | null
          event_id?: string | null
          id?: string
          message?: string
          photo_id?: string | null
          photo_url?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_email?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      sync_state: {
        Row: {
          last_error: string | null
          last_rows_synced: number | null
          last_run_at: string | null
          last_synced_at: string
          table_name: string
          updated_at: string
        }
        Insert: {
          last_error?: string | null
          last_rows_synced?: number | null
          last_run_at?: string | null
          last_synced_at?: string
          table_name: string
          updated_at?: string
        }
        Update: {
          last_error?: string | null
          last_rows_synced?: number | null
          last_run_at?: string | null
          last_synced_at?: string
          table_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      two_factor_codes: {
        Row: {
          action: string
          attempts: number
          blocked_until: string | null
          code: string
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          used: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          attempts?: number
          blocked_until?: string | null
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          used?: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          attempts?: number
          blocked_until?: string | null
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          used?: boolean
          user_agent?: string | null
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
      withdrawal_accounts: {
        Row: {
          account_holder: string | null
          account_number: string | null
          account_type: string
          account_type_bank: string | null
          activated_at: string | null
          agency: string | null
          bank_code: string | null
          bank_name: string | null
          cpf_cnpj: string
          created_at: string
          id: string
          label: string | null
          pix_key: string | null
          pix_key_type: string | null
          status: string
          user_id: string
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          account_type?: string
          account_type_bank?: string | null
          activated_at?: string | null
          agency?: string | null
          bank_code?: string | null
          bank_name?: string | null
          cpf_cnpj: string
          created_at?: string
          id?: string
          label?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          status?: string
          user_id: string
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          account_type?: string
          account_type_bank?: string | null
          activated_at?: string | null
          agency?: string | null
          bank_code?: string | null
          bank_name?: string | null
          cpf_cnpj?: string
          created_at?: string
          id?: string
          label?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_logs: {
        Row: {
          account_id: string | null
          amount: number
          asaas_transfer_id: string | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          ip_address: string | null
          status: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          asaas_transfer_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          status?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          asaas_transfer_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          notification_type: string
          read: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          notification_type: string
          read?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          notification_type?: string
          read?: boolean
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      photo_search_index: {
        Row: {
          bib_count: number | null
          bib_numbers: string[] | null
          event_id: string | null
          face_count: number | null
          face_ids: string[] | null
          photo_created_at: string | null
          photo_id: string | null
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
      photographer_sites_public: {
        Row: {
          allow_custom_links: boolean | null
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          facebook: string | null
          id: string | null
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
          updated_at: string | null
          user_id: string | null
          watermark_opacity: number | null
          watermark_position: string | null
          watermark_size: number | null
          watermark_url: string | null
          whatsapp: string | null
          youtube: string | null
        }
        Insert: {
          allow_custom_links?: boolean | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          facebook?: string | null
          id?: string | null
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
          updated_at?: string | null
          user_id?: string | null
          watermark_opacity?: number | null
          watermark_position?: string | null
          watermark_size?: number | null
          watermark_url?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Update: {
          allow_custom_links?: boolean | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          facebook?: string | null
          id?: string | null
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
          updated_at?: string | null
          user_id?: string | null
          watermark_opacity?: number | null
          watermark_position?: string | null
          watermark_size?: number | null
          watermark_url?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_registration_availability: {
        Args: { _event_id: string }
        Returns: {
          category: string
          category_id: string
          shirt_size: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_blog_views: { Args: { _slug: string }; Returns: undefined }
      is_event_organizer: { Args: { _event_id: string }; Returns: boolean }
      is_event_photographer: { Args: { _event_id: string }; Returns: boolean }
      is_proposal_party: { Args: { _proposal_id: string }; Returns: boolean }
      is_registration_event_organizer: {
        Args: { _event_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
      refresh_photo_search_index: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "user" | "photographer" | "organizer" | "super_admin"
      application_status: "pendente" | "aceita" | "rejeitada" | "cancelada"
      discount_type: "percentual" | "valor_fixo"
      event_status: "ativo" | "em_breve" | "inativo"
      order_status: "aguardando_pagamento" | "pago" | "enviado" | "cancelado"
      payment_method: "pix" | "cartao"
      proposal_status:
        | "rascunho"
        | "enviada"
        | "em_negociacao"
        | "aceita"
        | "rejeitada"
        | "encerrada"
      registration_checkin_status: "ausente" | "presente"
      registration_event_status:
        | "rascunho"
        | "aberto"
        | "encerrado"
        | "cancelado"
      registration_payment_status: "pendente" | "pago" | "cancelado"
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
      application_status: ["pendente", "aceita", "rejeitada", "cancelada"],
      discount_type: ["percentual", "valor_fixo"],
      event_status: ["ativo", "em_breve", "inativo"],
      order_status: ["aguardando_pagamento", "pago", "enviado", "cancelado"],
      payment_method: ["pix", "cartao"],
      proposal_status: [
        "rascunho",
        "enviada",
        "em_negociacao",
        "aceita",
        "rejeitada",
        "encerrada",
      ],
      registration_checkin_status: ["ausente", "presente"],
      registration_event_status: [
        "rascunho",
        "aberto",
        "encerrado",
        "cancelado",
      ],
      registration_payment_status: ["pendente", "pago", "cancelado"],
    },
  },
} as const
