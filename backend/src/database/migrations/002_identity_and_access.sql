-- 002: users, roles, permissions, sessions

CREATE TABLE users (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 citext UNIQUE,
  phone                 varchar(20) UNIQUE,
  password_hash         text NOT NULL,
  full_name             varchar(120) NOT NULL,
  avatar_url            text,
  status                user_status NOT NULL DEFAULT 'active',
  locale                varchar(5) NOT NULL DEFAULT 'ar',
  email_verified_at     timestamptz,
  phone_verified_at     timestamptz,
  last_login_at         timestamptz,
  failed_login_attempts smallint NOT NULL DEFAULT 0 CHECK (failed_login_attempts >= 0),
  locked_until          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz,
  CONSTRAINT users_contact_required CHECK (email IS NOT NULL OR phone IS NOT NULL),
  CONSTRAINT users_locale_valid CHECK (locale IN ('ar', 'en'))
);
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE roles (
  id          smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code        varchar(40) NOT NULL UNIQUE,
  name_ar     varchar(80) NOT NULL,
  name_en     varchar(80) NOT NULL,
  description text,
  is_system   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE permissions (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code        varchar(80) NOT NULL UNIQUE,
  description text
);

CREATE TABLE role_permissions (
  role_id       smallint NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id integer  NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id     smallint NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  assigned_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

-- Refresh Token Rotation: كل توكن يُخزَّن كـ SHA-256 hash فقط، وكل سلسلة تدوير لها family_id
CREATE TABLE refresh_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id   uuid NOT NULL,
  token_hash  char(64) NOT NULL UNIQUE,
  user_agent  text,
  ip_address  varchar(45),
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  replaced_by uuid REFERENCES refresh_tokens(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE password_reset_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
