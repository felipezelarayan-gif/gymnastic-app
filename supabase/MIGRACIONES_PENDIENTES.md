# Migraciones Pendientes

Este archivo documenta las migraciones SQL que deben ejecutarse manualmente en Supabase para activar funcionalidades completas.

## Migración 007: Agregar columna `created_at` a `rutina_ejercicios` y `rutina_entrada_calor`

**Fecha de creación**: 2026-07-09
**Propósito**: Corregir el error `column rutina_ejercicios.created_at does not exist` al editar rutinas desde `/alumnos/[id]/rutinas`

### ¿Qué hace esta migración?

Agrega la columna `created_at` (timestamp with time zone, default `now()`) a las tablas `rutina_ejercicios` y `rutina_entrada_calor`. Estas tablas no tenían esa columna, pero el código de duplicación de rutinas la consulta al copiar ejercicios.

### ¿Cuándo ejecutarla?

**Inmediatamente**. Sin esta migración, la función "Editar" rutina desde el perfil de un alumno falla con el error mencionado.

### Pasos para ejecutar:

1. **Abrir Supabase Dashboard**
   - Ve a https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Ir al SQL Editor**
   - En el menú lateral, click en "SQL Editor"
   - Click en "New query"

3. **Copiar y ejecutar el SQL**
   ```sql
   BEGIN;

   ALTER TABLE rutina_ejercicios
     ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NULL DEFAULT now();

   ALTER TABLE rutina_entrada_calor
     ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NULL DEFAULT now();

   COMMIT;
   ```

4. **Ejecutar**
   - Click en "Run" (o presiona Cmd/Ctrl + Enter)
   - Deberías ver: "Success. No rows returned"

5. **Verificar**
   - Recarga la aplicación
   - Ve a Alumnos → Rutinas → Editar rutina
   - Ahora debería funcionar sin error

### Notas importantes

- La migración es **segura** y no borra datos existentes
- Si la columna ya existe, el `IF NOT EXISTS` previene errores
- Los registros existentes quedan con `created_at = NULL` (no se backfill)
- Los nuevos registros se crean automáticamente con la fecha actual

## Migración 006: Agregar columna `creado_por` a profesores

**Fecha de creación**: 2026-07-06
**Propósito**: Registrar qué administrador creó cada profesor

### ¿Qué hace esta migración?

Agrega una columna `creado_por` a la tabla `profiles` que almacena el ID del administrador que creó cada profesor. Esto permite mostrar en la lista de profesores quién los creó.

### ¿Cuándo ejecutarla?

Ejecuta esta migración cuando quieras activar la funcionalidad de mostrar "Creado por: vos" o "Creado por: otro administrador" en la lista de profesores.

**Nota**: La aplicación funciona perfectamente sin esta migración. Solo se muestra la información básica de profesores (nombre, email, ID).

### Pasos para ejecutar:

1. **Abrir Supabase Dashboard**
   - Ve a https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Ir al SQL Editor**
   - En el menú lateral, click en "SQL Editor"
   - Click en "New query"

3. **Copiar y ejecutar el SQL**
   ```sql
   -- Agregar columna para registrar quién creó cada profesor
   ALTER TABLE profiles 
   ADD COLUMN IF NOT EXISTS creado_por UUID REFERENCES profiles(id) ON DELETE SET NULL;

   -- Comentario para documentación
   COMMENT ON COLUMN profiles.creado_por IS 'ID del administrador que creó este profesor (solo para rol=profe)';

   -- Índice para mejorar consultas
   CREATE INDEX IF NOT EXISTS idx_profiles_creado_por ON profiles(creado_por) WHERE rol = 'profe';
   ```

4. **Ejecutar**
   - Click en "Run" (o presiona Cmd/Ctrl + Enter)
   - Deberías ver: "Success. No rows returned"

5. **Verificar**
   - Recarga la aplicación
   - Ve a Configuración → Profesores
   - Ahora deberías ver "Creado por: vos" o "Creado por: otro administrador" debajo del ID de cada profesor

### Código actualizado

Después de ejecutar la migración, actualiza el archivo `src/app/configuracion/page.tsx`:

1. En el tipo `Profe`, agregar:
   ```typescript
   type Profe = {
     id: string;
     nombre?: string | null;
     email?: string | null;
     rol?: string | null;
     creado_por?: string | null;  // ← Agregar esta línea
   };
   ```

2. En la consulta de profesores, cambiar:
   ```typescript
   .select("id,nombre,email,rol")  // ← Actual
   ```
   por:
   ```typescript
   .select("id,nombre,email,rol,creado_por")  // ← Nuevo
   ```

3. En el renderizado, descomentar el código de `creado_por`:
   ```typescript
   {profesor.creado_por && (
     <p className="text-zinc-600 text-xs mt-1">
       Creado por: {profesor.creado_por === profile?.id ? "vos" : "otro administrador"}
     </p>
   )}
   ```

### Notas importantes

- La migración es **segura** y no borra datos existentes
- Si la columna ya existe, el `IF NOT EXISTS` previene errores
- La relación `ON DELETE SET NULL` significa que si se borra un administrador, el campo se pone en null (no se borra el profesor)
- El índice mejora el rendimiento de las consultas que filtran por `creado_por`

### Solución de problemas

**Error: "column profiles.creado_por does not exist"**
- La migración no se ejecutó correctamente
- Verifica que no haya errores en el SQL Editor
- Ejecuta el script nuevamente

**No se muestra "Creado por: ..."**
- Verifica que el código esté actualizado según los pasos de "Código actualizado"
- Recarga la página (Ctrl/Cmd + Shift + R para limpiar caché)