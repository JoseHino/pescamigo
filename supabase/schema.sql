-- Enrola · esquema para el backend real (Supabase / PostgreSQL)
-- BORRADOR: todavía no se ha ejecutado contra ningún proyecto.
-- Las contraseñas NO se guardan aquí: las gestiona Supabase Auth (auth.users),
-- tanto para correo+contraseña como para el acceso con Google.

create type user_role as enum ('owner', 'fisher');
create type outing_status as enum ('open', 'cancelled');
create type booking_status as enum ('pending_payment', 'confirmed', 'cancelled', 'refunded');

-- Registro de usuarios: correo y nombre de usuario (la credencial vive en auth.users)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null unique,
  username text not null unique check (username ~ '^[a-z0-9._-]{3,20}$'),
  full_name text not null,
  role user_role,
  notify_new_outings boolean not null default true,
  pref_ports text[] not null default '{}',
  pref_types text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table ports (
  id text primary key,
  name text not null,
  town text not null,
  lat double precision not null,
  lng double precision not null
);

create table boats (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references profiles on delete cascade, -- un barco por propietario (decisión provisional)
  name text not null,
  model text not null default '',
  length_m numeric(4,1) not null check (length_m > 0),
  capacity int not null check (capacity between 1 and 12),
  port_id text not null references ports,
  description text not null default '',
  photos text[] not null default '{}', -- rutas en Supabase Storage
  insurance_declared boolean not null default false,
  license_declared boolean not null default false,
  created_at timestamptz not null default now()
);

create table outings (
  id uuid primary key default gen_random_uuid(),
  boat_id uuid not null references boats on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  seats int not null check (seats >= 1),
  fishing_type text not null,
  cost_share_eur numeric(6,2) not null check (cost_share_eur >= 0), -- efectivo al propietario
  notes text not null default '',
  status outing_status not null default 'open',
  created_at timestamptz not null default now()
);
create index on outings (starts_at) where status = 'open';

create table bookings (
  id uuid primary key default gen_random_uuid(),
  outing_id uuid not null references outings on delete cascade,
  fisher_id uuid not null references profiles on delete cascade,
  seats int not null check (seats >= 1),
  fee_eur numeric(6,2) not null,          -- comisión cobrada con tarjeta
  payment_intent_id text,                 -- identificador del cobro en la pasarela
  status booking_status not null default 'pending_payment',
  created_at timestamptz not null default now(),
  unique (outing_id, fisher_id)
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  boat_id uuid not null references boats on delete cascade,
  booking_id uuid not null unique references bookings on delete cascade,
  author_id uuid not null references profiles on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) >= 10),
  photo text,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  title text not null,
  body text not null,
  link text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Dispositivos suscritos a avisos push
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz not null default now()
);

-- Plazas libres de una salida
create function seats_left(o outings) returns int language sql stable as $$
  select o.seats - coalesce(sum(b.seats), 0)::int
  from bookings b where b.outing_id = o.id and b.status = 'confirmed'
$$;

-- ---------- Seguridad por filas ----------
alter table profiles enable row level security;
alter table ports enable row level security;
alter table boats enable row level security;
alter table outings enable row level security;
alter table bookings enable row level security;
alter table reviews enable row level security;
alter table notifications enable row level security;
alter table push_subscriptions enable row level security;

-- Perfil: cada uno lee y edita el suyo. El nombre público se expone con una vista aparte, sin correo.
create policy "perfil propio" on profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create view public_profiles with (security_invoker = false) as
  select id, username, full_name, role from profiles;
grant select on public_profiles to authenticated;

create policy "puertos visibles" on ports for select to authenticated using (true);

create policy "barcos visibles" on boats for select to authenticated using (true);
create policy "barco propio" on boats for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "salidas visibles" on outings for select to authenticated using (true);
create policy "salidas del propietario" on outings for all to authenticated
  using (exists (select 1 from boats b where b.id = boat_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from boats b where b.id = boat_id and b.owner_id = auth.uid()));

-- Reservas: las ve el pescador y el propietario del barco. Se crean y confirman SOLO desde el servidor
-- (función que cobra la comisión y comprueba las plazas), nunca desde la app directamente.
create policy "reservas propias o de mi barco" on bookings for select to authenticated
  using (
    fisher_id = auth.uid()
    or exists (select 1 from outings o join boats b on b.id = o.boat_id where o.id = outing_id and b.owner_id = auth.uid())
  );

create policy "valoraciones visibles" on reviews for select to authenticated using (true);
create policy "valorar una salida propia ya realizada" on reviews for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from bookings bk join outings o on o.id = bk.outing_id
      where bk.id = booking_id and bk.fisher_id = auth.uid() and bk.status = 'confirmed'
        and o.ends_at < now() and o.boat_id = reviews.boat_id
    )
  );

create policy "avisos propios" on notifications for select to authenticated using (user_id = auth.uid());
create policy "marcar avisos leídos" on notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "suscripciones propias" on push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
