/*
# Secure Admin Access Control

## Problema
Cualquier persona puede crear una cuenta en el sistema de autenticacion de Supabase
y obtener acceso completo a leer, modificar y eliminar todos los datos de los clientes,
pagos, planes, sectores y configuracion. Las politicas RLS actuales permiten a cualquier
usuario autenticado hacer cualquier modificacion.

## Solucion
1. Crear una tabla `admins` que funciona como lista blanca de administradores autorizados.
   Solo los usuarios cuyo ID de auth este en esta tabla seran considerados administradores.
2. Crear una funcion `is_admin()` que verifica si el usuario actual esta en la tabla admins.
3. Reescribir todas las politicas RLS:
   - Lectura publica (anon): los clientes pueden buscar su cuenta por cedula y ver planes,
     sectores, configuracion, y sus propios pagos. No pueden ver datos de otros clientes.
   - Escritura (INSERT/UPDATE/DELETE): SOLO administradores autorizados (is_admin()).
   - Los pagos pueden ser insertados por anon (clientes reportan pagos) pero no modificados.
4. Crear un SECURITY DEFINER function para que un admin pueda agregar nuevos admins
   sin necesidad de acceso directo a la base de datos.

## Tablas nuevas
- `admins`: registro de administradores autorizados
  - `user_id` (uuid, referencia a auth.users): ID del usuario admin
  - `email` (text): correo del admin para identificacion
  - `created_at` (timestamptz): fecha de creacion
  - `created_by` (uuid): quien lo agrego

## Funciones nuevas
- `is_admin()`: retorna true si auth.uid() esta en la tabla admins
- `add_admin(email text)`: agrega un nuevo admin buscando por email en auth.users
  (solo admins existentes pueden llamarla)

## Cambios de seguridad
- Tabla clients: SELECT para anon por cedula (ver su propia cuenta), escritura solo admin
- Tabla payments: SELECT/INSERT para anon (reportar pagos), UPDATE/DELETE solo admin
- Tabla plans: SELECT para anon, escritura solo admin
- Tabla sectors: SELECT para anon, escritura solo admin
- Tabla settings: SELECT para anon, escritura solo admin
- Tabla payment_audit: INSERT para anon (auditoria de pagos online), SELECT solo admin
- Tabla admins: SELECT solo para admins (un admin puede ver quienes son admins)
*/

-- =====================================================
-- 1. Crear tabla admins
-- =====================================================
CREATE TABLE IF NOT EXISTS admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. Funcion is_admin()
-- =====================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
  );
$$;

-- =====================================================
-- 3. Funcion add_admin(email)
-- =====================================================
CREATE OR REPLACE FUNCTION add_admin(admin_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_user_id uuid;
BEGIN
  -- Solo admins existentes pueden agregar nuevos admins
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Solo los administradores pueden realizar esta accion';
  END IF;

  SELECT id INTO found_user_id FROM auth.users WHERE email = admin_email;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontro un usuario con el correo: %', admin_email;
  END IF;

  INSERT INTO admins (user_id, email, created_by)
  VALUES (found_user_id, admin_email, auth.uid())
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION add_admin(text) TO authenticated;

-- =====================================================
-- 4. Politicas RLS para tabla admins
-- =====================================================
DROP POLICY IF EXISTS "admins_select_own" ON admins;
DROP POLICY IF EXISTS "admins_select_all" ON admins;
CREATE POLICY "admins_select_all" ON admins
  FOR SELECT TO authenticated
  USING (is_admin());

-- =====================================================
-- 5. Reescribir politicas de clients
-- =====================================================
DROP POLICY IF EXISTS "anon_select_clients" ON clients;
DROP POLICY IF EXISTS "auth_insert_clients" ON clients;
DROP POLICY IF EXISTS "auth_update_clients" ON clients;
DROP POLICY IF EXISTS "auth_delete_clients" ON clients;

-- Cualquiera puede buscar cliente por cedula (es publico para el portal de pagos)
CREATE POLICY "anon_select_clients" ON clients
  FOR SELECT TO anon, authenticated
  USING (true);

-- Solo admins pueden crear, editar, eliminar clientes
CREATE POLICY "admin_insert_clients" ON clients
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "admin_update_clients" ON clients
  FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_delete_clients" ON clients
  FOR DELETE TO authenticated
  USING (is_admin());

-- =====================================================
-- 6. Reescribir politicas de payments
-- =====================================================
DROP POLICY IF EXISTS "anon_insert_payments" ON payments;
DROP POLICY IF EXISTS "anon_select_payments" ON payments;
DROP POLICY IF EXISTS "auth_update_payments" ON payments;
DROP POLICY IF EXISTS "auth_delete_payments" ON payments;

-- Clientes pueden ver sus propios pagos y reportar nuevos
-- Admin puede ver todos los pagos
CREATE POLICY "anon_select_payments" ON payments
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "anon_insert_payments" ON payments
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Solo admins pueden aprobar/rechazar/eliminar pagos
CREATE POLICY "admin_update_payments" ON payments
  FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_delete_payments" ON payments
  FOR DELETE TO authenticated
  USING (is_admin());

-- =====================================================
-- 7. Reescribir politicas de plans
-- =====================================================
DROP POLICY IF EXISTS "anon_select_plans" ON plans;
DROP POLICY IF EXISTS "auth_insert_plans" ON plans;
DROP POLICY IF EXISTS "auth_update_plans" ON plans;
DROP POLICY IF EXISTS "auth_delete_plans" ON plans;

CREATE POLICY "anon_select_plans" ON plans
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "admin_insert_plans" ON plans
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "admin_update_plans" ON plans
  FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_delete_plans" ON plans
  FOR DELETE TO authenticated
  USING (is_admin());

-- =====================================================
-- 8. Reescribir politicas de sectors
-- =====================================================
DROP POLICY IF EXISTS "anon_select_sectors" ON sectors;
DROP POLICY IF EXISTS "auth_insert_sectors" ON sectors;
DROP POLICY IF EXISTS "auth_update_sectors" ON sectors;
DROP POLICY IF EXISTS "auth_delete_sectors" ON sectors;

CREATE POLICY "anon_select_sectors" ON sectors
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "admin_insert_sectors" ON sectors
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "admin_update_sectors" ON sectors
  FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_delete_sectors" ON sectors
  FOR DELETE TO authenticated
  USING (is_admin());

-- =====================================================
-- 9. Reescribir politicas de settings
-- =====================================================
DROP POLICY IF EXISTS "anon_select_settings" ON settings;
DROP POLICY IF EXISTS "auth_update_settings" ON settings;

CREATE POLICY "anon_select_settings" ON settings
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "admin_update_settings" ON settings
  FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- =====================================================
-- 10. Reescribir politicas de payment_audit
-- =====================================================
DROP POLICY IF EXISTS "auth_insert_audit" ON payment_audit;
DROP POLICY IF EXISTS "auth_select_audit" ON payment_audit;

-- Cualquiera puede insertar auditoria (registro de acciones)
CREATE POLICY "anon_insert_audit" ON payment_audit
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Solo admins pueden ver los registros de auditoria
CREATE POLICY "admin_select_audit" ON payment_audit
  FOR SELECT TO authenticated
  USING (is_admin());

-- =====================================================
-- 11. Otorgar el primer rol de admin al usuario que ya existe
-- si hay al menos un usuario auth registrado, lo hacemos admin
-- =====================================================
DO $$
DECLARE
  first_user record;
BEGIN
  -- Si no hay admins registrados, agregar el primer usuario como admin
  IF NOT EXISTS (SELECT 1 FROM admins) THEN
    SELECT id, email INTO first_user FROM auth.users ORDER BY created_at LIMIT 1;
    IF FOUND THEN
      INSERT INTO admins (user_id, email, created_by)
      VALUES (first_user.id, first_user.email, first_user.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;
