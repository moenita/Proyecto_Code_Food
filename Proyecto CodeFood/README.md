# CodeFood 🍽️
Sistema de pedidos anticipados para casinos de instituciones educacionales.

---

## Estructura del proyecto

```
codefood/
├── server.js              ← Servidor Node.js + Express
├── package.json
├── .env.example           ← Plantilla de variables de entorno
├── .gitignore
└── public/
    ├── index.html         ← App del cliente (alumnos/funcionarios)
    ├── styles.css
    ├── app.js
    ├── vendedor.html      ← Panel del vendedor
    ├── vendedor-styles.css
    └── vendedor-app.js
```

---

## 1. Configurar Supabase

### Crear la tabla `pedidos`

En el **SQL Editor** de Supabase, ejecuta:

```sql
CREATE TABLE pedidos (
    id          TEXT PRIMARY KEY,
    plato       TEXT NOT NULL,
    bebida      TEXT,
    extra       TEXT,
    hora        TEXT NOT NULL,
    pago        TEXT NOT NULL,
    nombre      TEXT,
    estado      TEXT NOT NULL DEFAULT 'nuevo',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilita Row Level Security
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

-- Permite insertar y leer a cualquier usuario (anon)
CREATE POLICY "Insertar pedidos" ON pedidos FOR INSERT WITH CHECK (true);
CREATE POLICY "Leer pedidos"     ON pedidos FOR SELECT USING (true);
CREATE POLICY "Actualizar estado" ON pedidos FOR UPDATE USING (true);
```

### Habilitar Realtime

En Supabase → **Database** → **Replication** → activa la tabla `pedidos`.

### Obtener las claves

En Supabase → **Settings** → **API**:
- `SUPABASE_URL` → Project URL
- `SUPABASE_SERVICE_KEY` → service_role (secret) ← solo en el servidor
- `SUPABASE_ANON_KEY` → anon (public) ← se puede enviar al navegador

---

## 2. Configurar variables de entorno locales

```bash
cp .env.example .env
# Edita .env con tus credenciales reales
```

---

## 3. Instalar dependencias y correr localmente

```bash
npm install
npm run dev     # con nodemon (recarga automática)
# o
npm start       # producción
```

Abre: http://localhost:3000 (clientes) y http://localhost:3000/vendedor (vendedores)

---

## 4. Deploy en Render

1. Sube el proyecto a **GitHub** (asegúrate de que `.env` esté en `.gitignore`).
2. En [render.com](https://render.com) → **New** → **Web Service**.
3. Conecta tu repositorio de GitHub.
4. Configura:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Node version:** 18 o superior
5. En **Environment Variables** agrega:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `SUPABASE_ANON_KEY`
6. Haz deploy. Render te dará una URL pública.

---

## URLs del sistema

| Página | URL |
|---|---|
| Pedidos (clientes) | `https://tu-app.onrender.com/` |
| Panel vendedor | `https://tu-app.onrender.com/vendedor` |
| API pedidos | `https://tu-app.onrender.com/api/pedidos` |
