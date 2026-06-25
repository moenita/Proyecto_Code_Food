const { createApp, ref, reactive, computed, onMounted, onUnmounted } = Vue;

// ── Supabase Realtime client (solo anon key, solo lectura en tiempo real) ──
// La SUPABASE_URL y SUPABASE_ANON_KEY se inyectan desde el servidor en vendedor.html
const supabase = window.__SUPABASE_CLIENT__;

function tiempoRelativo(date) {
    const diff = Math.floor((Date.now() - new Date(date)) / 1000);
    if (diff < 60)  return `hace ${diff}s`;
    const min = Math.floor(diff / 60);
    if (min < 60)   return `hace ${min} min`;
    return `hace ${Math.floor(min / 60)}h`;
}

function generarId() {
    return 'A' + Math.floor(1000 + Math.random() * 9000);
}

createApp({
    setup() {
        const pedidos      = reactive([]);
        const filtro       = ref('todos');
        const busqueda     = ref('');
        const mostrarModal = ref(false);
        const toast        = reactive({ visible: false, msg: '', tipo: 'green' });
        const horaActual   = ref('');
        const tickerRef    = ref(null);
        let   realtimeChannel = null;
        let   toastTimer      = null;

        const form = reactive({
            plato: 'Pollo a la Plancha', bebida: '', extra: '',
            hora: '13:20 Hrs', pago: 'Pagar en el Casino (Tarjeta)'
        });

        // ── Reloj ──
        function actualizarHora() {
            horaActual.value = new Date().toLocaleTimeString('es-CL', {
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
        }

        // ── Stats ──
        const totalNuevos     = computed(() => pedidos.filter(p => p.estado === 'nuevo').length);
        const totalPreparando = computed(() => pedidos.filter(p => p.estado === 'preparando').length);
        const totalListos     = computed(() => pedidos.filter(p => p.estado === 'listo').length);
        const totalEntregados = computed(() => pedidos.filter(p => p.estado === 'entregado').length);

        // ── Filtrado ──
        const pedidosFiltrados = computed(() => {
            let lista = [...pedidos];
            if (filtro.value === 'todos') {
                lista = lista.filter(p => p.estado !== 'entregado' && p.estado !== 'cancelado');
            } else if (filtro.value !== 'historial') {
                lista = lista.filter(p => p.estado === filtro.value);
            }
            if (busqueda.value.trim()) {
                const q = busqueda.value.toLowerCase();
                lista = lista.filter(p =>
                    p.id.toLowerCase().includes(q) || p.plato.toLowerCase().includes(q)
                );
            }
            return lista.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        });

        // ── Cargar pedidos del día desde la API ──
        async function cargarPedidos() {
            try {
                const res  = await fetch('/api/pedidos');
                const data = await res.json();
                pedidos.splice(0, pedidos.length, ...data);
            } catch (e) {
                mostrarToast('Error al cargar pedidos', 'red');
            }
        }

        // ── Supabase Realtime: escucha INSERT en tiempo real ──
        function suscribirRealtime() {
            if (!supabase) return; // si no está disponible, no hace nada

            realtimeChannel = supabase
                .channel('pedidos-live')
                .on('postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'pedidos' },
                    (payload) => {
                        const existe = pedidos.find(p => p.id === payload.new.id);
                        if (!existe) {
                            pedidos.unshift(payload.new);
                            mostrarToast(`🔔 Nuevo pedido ${payload.new.id}`, 'orange');
                        }
                    }
                )
                .subscribe();
        }

        // ── Acciones ──
        async function cambiarEstado(pedido, nuevoEstado) {
            try {
                const res = await fetch(`/api/pedidos/${pedido.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ estado: nuevoEstado })
                });
                if (!res.ok) throw new Error();
                pedido.estado = nuevoEstado;
            } catch {
                mostrarToast('Error al actualizar el pedido', 'red');
            }
        }

        const marcarListo     = (p) => { cambiarEstado(p, 'listo');     mostrarToast(`Pedido ${p.id} listo ✓`, 'green'); };
        const marcarEntregado = (p) => { cambiarEstado(p, 'entregado'); mostrarToast(`Pedido ${p.id} entregado`, 'muted'); };
        const cancelarPedido  = (p) => {
            if (!confirm(`¿Cancelar el pedido #${p.id}?`)) return;
            cambiarEstado(p, 'cancelado');
            mostrarToast(`Pedido ${p.id} cancelado`, 'red');
        };

        // ── Modal: agregar pedido manual ──
        function abrirModal()  { mostrarModal.value = true;  }
        function cerrarModal() { mostrarModal.value = false; }

        async function agregarPedido() {
            if (!form.plato) return;
            try {
                const res = await fetch('/api/pedidos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id:     generarId(),
                        plato:  form.plato,
                        bebida: form.bebida || null,
                        extra:  form.extra  || null,
                        hora:   form.hora,
                        pago:   form.pago,
                        nombre: 'Manual (vendedor)'
                    })
                });
                const nuevo = await res.json();
                pedidos.unshift(nuevo);
                mostrarModal.value = false;
                mostrarToast('Pedido agregado manualmente', 'green');
                form.bebida = ''; form.extra = '';
            } catch {
                mostrarToast('Error al agregar pedido', 'red');
            }
        }

        // ── Toast ──
        function mostrarToast(msg, tipo = 'green') {
            if (toastTimer) clearTimeout(toastTimer);
            toast.msg = msg; toast.tipo = tipo; toast.visible = true;
            toastTimer = setTimeout(() => { toast.visible = false; }, 3500);
        }

        // ── Helpers template ──
        function estadoLabel(estado) {
            return { nuevo: 'Nuevo', preparando: 'Preparando', listo: 'Listo', entregado: 'Entregado', cancelado: 'Cancelado' }[estado] || estado;
        }
        function tiempoRel(date) { return tiempoRelativo(date); }

        // ── Lifecycle ──
        onMounted(async () => {
            actualizarHora();
            tickerRef.value = setInterval(actualizarHora, 1000);
            await cargarPedidos();
            suscribirRealtime();
        });

        onUnmounted(() => {
            clearInterval(tickerRef.value);
            if (realtimeChannel) supabase?.removeChannel(realtimeChannel);
        });

        return {
            pedidos, pedidosFiltrados,
            filtro, busqueda, mostrarModal, form, toast, horaActual,
            totalNuevos, totalPreparando, totalListos, totalEntregados,
            marcarListo, marcarEntregado, cancelarPedido,
            abrirModal, cerrarModal, agregarPedido,
            estadoLabel, tiempoRel
        };
    }
}).mount('#app');
