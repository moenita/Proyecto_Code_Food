const { createApp, ref, reactive, computed } = Vue;

// ── Helper: genera ID de pedido ──
function generarId() {
    return 'A' + Math.floor(1000 + Math.random() * 9000);
}

createApp({
    setup() {
        const pedidoGenerado = ref(false);
        const cargando       = ref(false);
        const errorMsg       = ref('');

        // ── Acordeón ──
        const openSections = reactive({ principales: true, bebidas: false, extras: false });
        const toggleSection = (s) => { openSections[s] = !openSections[s]; };

        // ── Menú ──
        const menu = reactive([
            { id: 1, nombre: 'Pollo a la Plancha',  precio: 3500, img: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=300&q=80', selected: false },
            { id: 2, nombre: 'Pasta Boloñesa',       precio: 3200, img: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=300&q=80', selected: false },
            { id: 3, nombre: 'Ensalada Vegetariana', precio: 2800, img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=300&q=80', selected: false },
            { id: 4, nombre: 'Completo Italiano',    precio: 2600, img: 'https://images.unsplash.com/photo-1612392062126-2ec3e7ece585?auto=format&fit=crop&w=300&q=80', selected: false },
            { id: 5, nombre: 'Salchipapas',          precio: 3000, img: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=300&q=80', selected: false }
        ]);

        const bebidas = reactive([
            { id: 1, nombre: 'Agua Mineral',   precio: 1000, icono: 'fas fa-tint',           selected: false },
            { id: 2, nombre: 'Bebida en Lata', precio: 1000, icono: 'fas fa-wine-glass-alt', selected: false },
            { id: 3, nombre: 'Jugo Natural',   precio: 1200, icono: 'fas fa-glass-whiskey',  selected: false }
        ]);

        const extras = reactive([
            { id: 1, nombre: 'Postre del Día', precio: 900, icono: 'fas fa-ice-cream',   selected: false },
            { id: 2, nombre: 'Pan Amasado',    precio: 500, icono: 'fas fa-bread-slice', selected: false }
        ]);

        // ── Reserva ──
        const reserva = reactive({
            nombre: '',
            hora:   '13:20 Hrs',
            pago:   'Pagar en el Casino (Tarjeta)',
            id:     generarId()
        });

        // ── Computed ──
        const itemSeleccionado   = computed(() => menu.find(m => m.selected)    || null);
        const bebidaSeleccionada = computed(() => bebidas.find(b => b.selected) || null);
        const extraSeleccionado  = computed(() => extras.find(e => e.selected)  || null);

        const totalPedido = computed(() => {
            let t = 0;
            if (itemSeleccionado.value)   t += itemSeleccionado.value.precio;
            if (bebidaSeleccionada.value) t += bebidaSeleccionada.value.precio;
            if (extraSeleccionado.value)  t += extraSeleccionado.value.precio;
            return t;
        });

        const puedeConfirmar = computed(() =>
            itemSeleccionado.value && reserva.nombre.trim().length > 0 && !cargando.value
        );

        // ── Selección ──
        const seleccionar       = (i) => { menu.forEach(m => m.selected = false);    i.selected = true; };
        const seleccionarBebida = (b) => { bebidas.forEach(x => x.selected = false); b.selected = true; };
        const seleccionarExtra  = (e) => { extras.forEach(x => x.selected = false);  e.selected = true; };

        // ── Confirmar pedido → POST /api/pedidos ──
        const confirmarPedido = async () => {
            if (!puedeConfirmar.value) return;
            cargando.value = true;
            errorMsg.value = '';

            try {
                const res = await fetch('/api/pedidos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id:     reserva.id,
                        plato:  itemSeleccionado.value.nombre,
                        bebida: bebidaSeleccionada.value?.nombre || null,
                        extra:  extraSeleccionado.value?.nombre  || null,
                        hora:   reserva.hora,
                        pago:   reserva.pago,
                        nombre: reserva.nombre.trim()
                    })
                });

                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || 'Error al registrar el pedido.');
                }

                pedidoGenerado.value = true;

            } catch (e) {
                errorMsg.value = e.message;
            } finally {
                cargando.value = false;
            }
        };

        return {
            menu, bebidas, extras, reserva,
            openSections, toggleSection,
            seleccionar, seleccionarBebida, seleccionarExtra,
            confirmarPedido, pedidoGenerado, cargando, errorMsg,
            itemSeleccionado, bebidaSeleccionada, extraSeleccionado,
            totalPedido, puedeConfirmar
        };
    }
}).mount('#app');
