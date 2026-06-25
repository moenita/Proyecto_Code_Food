require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
const { createClient } = require('@supabase/supabase-js');

// ── Supabase (service key: solo en el servidor, nunca al cliente) ──
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ── Sirve archivos estáticos EXCEPTO vendedor.html (se sirve dinámicamente) ──
app.use(express.static(path.join(__dirname, 'public'), {
    index: 'index.html',
}));

// ══════════════════════════════════════════════════════════
//  RUTA ESPECIAL: vendedor.html — inyecta la ANON key
// ══════════════════════════════════════════════════════════
app.get('/vendedor', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'vendedor.html');
    let html = fs.readFileSync(filePath, 'utf-8');

    // Reemplaza los placeholders con las variables de entorno
    html = html
        .replace('%%SUPABASE_URL%%',      process.env.SUPABASE_URL      || '')
        .replace('%%SUPABASE_ANON_KEY%%', process.env.SUPABASE_ANON_KEY || '');

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
});

// ══════════════════════════════════════════════════════════
//  API DE PEDIDOS
// ══════════════════════════════════════════════════════════

// GET /api/pedidos — pedidos del día actual
app.get('/api/pedidos', async (req, res) => {
    const hoy = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .gte('created_at', `${hoy}T00:00:00`)
        .lte('created_at', `${hoy}T23:59:59`)
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// POST /api/pedidos — nuevo pedido desde index.html
app.post('/api/pedidos', async (req, res) => {
    const { id, plato, bebida, extra, hora, pago, nombre } = req.body;

    if (!plato || !hora || !pago) {
        return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }

    const { data, error } = await supabase
        .from('pedidos')
        .insert([{ id, plato, bebida, extra, hora, pago, nombre, estado: 'nuevo' }])
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
});

// PATCH /api/pedidos/:id — actualiza estado desde vendedor.html
app.patch('/api/pedidos/:id', async (req, res) => {
    const { id }     = req.params;
    const { estado } = req.body;

    const estadosValidos = ['nuevo', 'preparando', 'listo', 'entregado', 'cancelado'];
    if (!estadosValidos.includes(estado)) {
        return res.status(400).json({ error: 'Estado no válido.' });
    }

    const { data, error } = await supabase
        .from('pedidos')
        .update({ estado })
        .eq('id', id)
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.listen(PORT, () => {
    console.log(`✅ CodeFood corriendo en http://localhost:${PORT}`);
});
