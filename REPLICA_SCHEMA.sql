-- ============================================================
-- VIUFOTO — Schema Espelho para Réplica/Backup
-- Execute este SQL UMA VEZ no seu Supabase pessoal
-- (Project: hdhgpzkutsjakshvcbte)
--
-- Não contém RLS, triggers ou funções — apenas estrutura
-- para receber dados via UPSERT da edge function replica-sync.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS replica;

-- Marcador de última sincronização vinda do banco principal
CREATE TABLE IF NOT EXISTS replica._sync_log (
  id           bigserial PRIMARY KEY,
  table_name   text NOT NULL,
  rows_synced  integer NOT NULL DEFAULT 0,
  watermark    timestamptz,
  finished_at  timestamptz NOT NULL DEFAULT now(),
  error        text
);
CREATE INDEX IF NOT EXISTS sync_log_table_idx ON replica._sync_log(table_name, finished_at DESC);

-- ---------- Usuários / Perfis ----------
CREATE TABLE IF NOT EXISTS replica.profiles (
  id uuid PRIMARY KEY, user_id uuid, full_name text, phone text, avatar_url text,
  cpf_cnpj text, experience_level text, interest text, asaas_customer_id text,
  asaas_wallet_id text, blocked boolean, last_sign_in_at timestamptz,
  terms_accepted_at timestamptz, terms_version text,
  created_at timestamptz, updated_at timestamptz, _replicated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS replica.user_roles (
  id uuid PRIMARY KEY, user_id uuid, role text, created_at timestamptz,
  _replicated_at timestamptz DEFAULT now()
);

-- ---------- Eventos ----------
CREATE TABLE IF NOT EXISTS replica.events (
  id uuid PRIMARY KEY, organizer_id uuid, name text, location text, category text,
  event_date date, event_time time, cover_url text, password text, visibility boolean,
  status text, owner_commission_pct numeric, plan_type text, collab_note text,
  progressive_discount_enabled boolean, progressive_discount_rules jsonb,
  bib_search_enabled boolean, bib_number_pattern text, search_type text[],
  created_at timestamptz, updated_at timestamptz, _replicated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS replica.event_photos (
  id uuid PRIMARY KEY, event_id uuid, photographer_id uuid, file_url text, file_name text,
  album text, identified boolean, indexing_status text, bibs_count integer,
  bibs_indexed_at timestamptz, faces_indexed_at timestamptz, created_at timestamptz,
  _replicated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS event_photos_event_idx ON replica.event_photos(event_id);

CREATE TABLE IF NOT EXISTS replica.event_videos (
  id uuid PRIMARY KEY, event_id uuid, photographer_id uuid, file_url text, file_name text,
  created_at timestamptz, _replicated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS replica.event_photographers (
  id uuid PRIMARY KEY, event_id uuid, photographer_id uuid, commission_pct numeric,
  status text, note text, invited_at timestamptz, created_at timestamptz,
  _replicated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS replica.event_partners (
  id uuid PRIMARY KEY, event_id uuid, partner_user_id uuid, partner_name text,
  partner_email text, commission_pct numeric, permissions jsonb, created_at timestamptz,
  _replicated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS replica.event_applications (
  id uuid PRIMARY KEY, event_id uuid, photographer_id uuid, status text, message text,
  suggested_fee numeric, organizer_response text, responded_at timestamptz,
  created_at timestamptz, updated_at timestamptz, _replicated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS replica.event_coupons (
  id uuid PRIMARY KEY, event_id uuid, code text, discount_type text, discount_value numeric,
  max_uses integer, uses integer, active boolean, created_at timestamptz,
  _replicated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS replica.price_grids (
  id uuid PRIMARY KEY, event_id uuid, name text, photo_high_price numeric,
  photo_low_price numeric, video_price numeric, created_at timestamptz,
  _replicated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS replica.discount_packages (
  id uuid PRIMARY KEY, event_id uuid, package_type text, display_mode text,
  min_photos integer, discount_pct numeric, base_photo_price numeric,
  min_photo_price numeric, all_photos_price numeric, active boolean,
  created_at timestamptz, _replicated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS replica.photo_bib_numbers (
  id uuid PRIMARY KEY, event_id uuid, photo_id uuid, number text, raw_text text,
  bbox jsonb, confidence numeric, detected_at timestamptz,
  _replicated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bib_event_idx ON replica.photo_bib_numbers(event_id, number);

CREATE TABLE IF NOT EXISTS replica.event_indexing_progress (
  event_id uuid PRIMARY KEY, total_photos integer, bibs_done integer, bibs_errors integer,
  faces_done integer, faces_errors integer, last_updated_at timestamptz,
  created_at timestamptz, _replicated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS replica.bib_detection_errors (
  id uuid PRIMARY KEY, event_id uuid, photo_id uuid, s3_key text, error_code text,
  error_message text, retry_count integer, created_at timestamptz,
  _replicated_at timestamptz DEFAULT now()
);

-- ---------- Pedidos ----------
CREATE TABLE IF NOT EXISTS replica.orders (
  id uuid PRIMARY KEY, event_id uuid, client_name text, client_email text, client_cpf text,
  amount numeric, status text, payment_method text, asaas_payment_id text,
  tracking_origin text, created_at timestamptz, updated_at timestamptz,
  _replicated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_event_idx ON replica.orders(event_id);
CREATE INDEX IF NOT EXISTS orders_email_idx ON replica.orders(client_email);

CREATE TABLE IF NOT EXISTS replica.order_items (
  id uuid PRIMARY KEY, order_id uuid, photo_id uuid, video_id uuid, price numeric,
  resolution text, created_at timestamptz, _replicated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON replica.order_items(order_id);

-- ---------- Sites / Portfolio ----------
CREATE TABLE IF NOT EXISTS replica.photographer_sites (
  id uuid PRIMARY KEY, user_id uuid, slug text, display_name text, bio text,
  avatar_url text, banner_url text, watermark_url text, watermark_size integer,
  watermark_opacity integer, watermark_position text, primary_color text,
  secondary_color text, template text, instagram text, tiktok text, whatsapp text,
  facebook text, youtube text, linkedin text, twitter text, contact_email text,
  contact_phone text, cnpj text, seo_title text, seo_keywords text,
  allow_custom_links boolean, created_at timestamptz, updated_at timestamptz,
  _replicated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS replica.custom_links (
  id uuid PRIMARY KEY, user_id uuid, label text, url text, sort_order integer,
  created_at timestamptz, _replicated_at timestamptz DEFAULT now()
);

-- ---------- Propostas / Oportunidades ----------
CREATE TABLE IF NOT EXISTS replica.proposals (
  id uuid PRIMARY KEY, event_id uuid, organizer_id uuid, photographer_id uuid,
  created_by uuid, title text, description text, fee numeric, deadline date,
  status text, created_at timestamptz, updated_at timestamptz,
  _replicated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS replica.proposal_comments (
  id uuid PRIMARY KEY, proposal_id uuid, author_id uuid, content text,
  created_at timestamptz, _replicated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS replica.proposal_attachments (
  id uuid PRIMARY KEY, proposal_id uuid, uploaded_by uuid, file_name text,
  file_path text, file_size integer, mime_type text, created_at timestamptz,
  _replicated_at timestamptz DEFAULT now()
);

-- ---------- Financeiro ----------
CREATE TABLE IF NOT EXISTS replica.withdrawal_accounts (
  id uuid PRIMARY KEY, user_id uuid, label text, account_type text, status text,
  cpf_cnpj text, account_holder text, pix_key text, pix_key_type text,
  bank_code text, bank_name text, agency text, account_number text,
  account_type_bank text, activated_at timestamptz, created_at timestamptz,
  _replicated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS replica.withdrawal_logs (
  id uuid PRIMARY KEY, user_id uuid, account_id uuid, amount numeric, status text,
  asaas_transfer_id text, error_message text, ip_address text, user_agent text,
  completed_at timestamptz, created_at timestamptz, _replicated_at timestamptz DEFAULT now()
);

-- ---------- Auditoria / Admin ----------
CREATE TABLE IF NOT EXISTS replica.admin_audit_log (
  id uuid PRIMARY KEY, action text, target_user_id uuid, performed_by uuid,
  details jsonb, created_at timestamptz, _replicated_at timestamptz DEFAULT now()
);

-- ---------- Inscrições ----------
CREATE TABLE IF NOT EXISTS replica.registration_events (
  id uuid PRIMARY KEY, organizer_id uuid, slug text, name text, description text,
  cover_url text, event_date date, event_time time, location text, category text,
  max_slots integer, status text, regulation text, regulation_file_url text,
  categories jsonb, shirt_sizes jsonb, requires_birth_date boolean,
  requires_city boolean, requires_shirt_size boolean, senior_discount_enabled boolean,
  senior_discount_min_age integer, pix_key text, pix_amount numeric,
  payment_instructions text, whatsapp text, created_at timestamptz, updated_at timestamptz,
  _replicated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS replica.event_registrations (
  id uuid PRIMARY KEY, registration_event_id uuid, user_id uuid, full_name text,
  email text, phone text, cpf text, birth_date date, city text, category text,
  category_id uuid, shirt_size text, team text, price_tier_id uuid,
  amount_due numeric, senior_discount_applied boolean, payment_status text,
  payment_proof_url text, checkin_status text, checked_in_at timestamptz,
  qr_token uuid, notes text, created_at timestamptz, updated_at timestamptz,
  _replicated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS replica.registration_categories (
  id uuid PRIMARY KEY, registration_event_id uuid, name text, max_slots integer,
  sort_order integer, created_at timestamptz, _replicated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS replica.registration_price_tiers (
  id uuid PRIMARY KEY, registration_event_id uuid, name text, price numeric,
  starts_at timestamptz, ends_at timestamptz, sort_order integer,
  created_at timestamptz, _replicated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS replica.registration_shirt_stock (
  id uuid PRIMARY KEY, registration_event_id uuid, size text, quantity integer,
  sort_order integer, created_at timestamptz, _replicated_at timestamptz DEFAULT now()
);

-- ---------- Hero / Conteúdo público ----------
CREATE TABLE IF NOT EXISTS replica.hero_settings (
  id uuid PRIMARY KEY, title text, highlight text, title_color text, highlight_color text,
  transition_type text, transition_duration_ms integer, interval_seconds integer,
  autoplay boolean, created_at timestamptz, updated_at timestamptz,
  _replicated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS replica.hero_slides (
  id uuid PRIMARY KEY, image_path text, sort_order integer, active boolean,
  created_at timestamptz, _replicated_at timestamptz DEFAULT now()
);

-- Pronto. Execute, depois é só esperar a edge function rodar.