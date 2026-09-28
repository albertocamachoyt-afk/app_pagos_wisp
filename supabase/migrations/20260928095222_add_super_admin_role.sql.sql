-- =====================================================
-- Super Admin Access Control
-- =====================================================
-- Problema: cualquier persona puede registrarse y aunque
-- no sea admin, el flujo actual la ingresa temporalmente.
-- Solucion:
-- 1. Agregar columna 'role' a admins (super_admin / admin)
-- 2. Solo el super_admin puede agregar o remover admins
-- 3. Marcar al primer admin (albertocamacho26@gmail.com) como super_admin
-- 4. Restringir add_admin() y DELETE en admins a super_admin
-- =====================================================

-- 1. Agregar columna role a admins
ALTER TABLE admins ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'admin';

-- 2. Funcion is_super_admin()
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()
      AND admins.role = 'super_admin'
  );
$$;

GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;

-- 3. Marcar al usuario albertocamacho26@gmail.com como super_admin
UPDATE admins
SET role = 'super_admin'
WHERE email = 'albertocamacho26@gmail.com';

-- 4. Reescribir add_admin(): solo super_admin puede agregar
CREATE OR REPLACE FUNCTION add_admin(admin_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_user_id uuid;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Solo el super administrador puede realizar esta accion';
  END IF;

  SELECT id INTO found_user_id FROM auth.users WHERE email = admin_email;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontro un usuario con el correo: %', admin_email;
  END IF;

  INSERT INTO admins (user_id, email, created_by, role)
  VALUES (found_user_id, admin_email, auth.uid(), 'admin')
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- 5. Politica RLS: solo super_admin puede eliminar admins
DROP POLICY IF EXISTS "admins_delete" ON admins;
CREATE POLICY "admins_delete" ON admins
  FOR DELETE TO authenticated
  USING (is_super_admin());

-- 6. Politica RLS: super_admin puede ver todos, admin puede ver todos tambien
-- (ya existe admins_select_all con is_admin(), la mantenemos)
-- Pero agregamos que solo super_admin puede UPDATE
DROP POLICY IF EXISTS "admins_update" ON admins;
CREATE POLICY "admins_update" ON admins
  FOR UPDATE TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());
