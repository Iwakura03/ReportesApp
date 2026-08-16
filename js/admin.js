import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
    collection, 
    onSnapshot, 
    doc, 
    getDoc, 
    updateDoc, 
    deleteDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { db } from './firebase-config.js';

const auth = getAuth();

// Verificar auth y rol admin
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html"; 
        return;
    }

    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists() || userDoc.data().rol !== "admin") {
        alert("No tienes permisos de administrador para ver esta página.");
        window.location.href = "index.html"; 
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const tablaBody = document.getElementById("tabla-body");
    const filtroCategoria = document.getElementById("filtro-categoria");
    const filtroEstado = document.getElementById("filtro-estado");
    const btnLogout = document.getElementById("btn-logout");
    
    let listaReportes = [];
    let marcadorActivo = null;

    if (btnLogout) {
        btnLogout.addEventListener("click", () => {
            signOut(auth).then(() => window.location.href = "login.html");
        });
    }

    // Mapa centrado en Magdalena
    const adminMap = L.map('admin-map').setView([20.9080, -103.9950], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
    }).addTo(adminMap);

    const actualizarEstadisticas = (reportes) => {
        const total = document.getElementById("stat-total");
        const pendientes = document.getElementById("stat-pendientes");
        const proceso = document.getElementById("stat-proceso");
        const solucionados = document.getElementById("stat-solucionados");

        if (!total) return;

        total.textContent = reportes.length;
        pendientes.textContent = reportes.filter(r => r.data.status === "Pendiente").length;
        proceso.textContent = reportes.filter(r => r.data.status === "En proceso" || r.data.status === "Recibido").length;
        solucionados.textContent = reportes.filter(r => r.data.status === "Solucionado").length;
    };

    const renderizarTabla = () => {
        tablaBody.innerHTML = "";
        const cat = filtroCategoria.value;
        const est = filtroEstado.value;

        actualizarEstadisticas(listaReportes);

        listaReportes.forEach(({ id, data }) => {
            if (cat !== "Todas" && data.category !== cat) return;
            if (est !== "Todos" && data.status !== est) return;

            let fecha = "Sin fecha";
            if (data.createdAt) {
                const dateObj = data.createdAt.toDate();
                fecha = dateObj.toLocaleDateString('es-MX') + ' ' + dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
            }

            const tr = document.createElement("tr");
            tr.dataset.id = id;
            tr.innerHTML = `
                <td>${fecha}</td>
                <td><strong>${data.category || 'Sin categoría'}</strong></td>
                <td>${data.description || 'Sin descripción'}</td>
                <td>
                    <select class="estado-dropdown estado-${(data.status || 'Pendiente').replace(/\s+/g, "-")}" data-id="${id}">
                        <option value="Pendiente" ${data.status === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                        <option value="Recibido" ${data.status === 'Recibido' ? 'selected' : ''}>Recibido</option>
                        <option value="En proceso" ${data.status === 'En proceso' ? 'selected' : ''}>En proceso</option>
                        <option value="Solucionado" ${data.status === 'Solucionado' ? 'selected' : ''}>Solucionado</option>
                    </select>
                </td>
                <td>
                    <button class="btn-eliminar" data-id="${id}" title="Eliminar reporte">Eliminar</button>
                </td>
            `;
            tablaBody.appendChild(tr);
        });
    };

    filtroCategoria.addEventListener("change", renderizarTabla);
    filtroEstado.addEventListener("change", renderizarTabla);

    onSnapshot(collection(db, "reports"), (snapshot) => {
        listaReportes = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));
        renderizarTabla();
    });

    // Delegación de eventos única para la tabla (clicks y selección de filas/botones)
    tablaBody.addEventListener("click", async (e) => {
        const btnEliminar = e.target.closest(".btn-eliminar");
        
        // 1. Lógica para eliminar reporte
        if (btnEliminar) {
            e.stopPropagation();
            const id = btnEliminar.getAttribute("data-id");

            if (!confirm("¿Estás seguro de que deseas eliminar este reporte?")) return;

            try {
                btnEliminar.disabled = true;
                btnEliminar.textContent = "Eliminando...";

                if (marcadorActivo && btnEliminar.closest("tr").classList.contains("seleccionado")) {
                    adminMap.removeLayer(marcadorActivo);
                    marcadorActivo = null;
                }

                await deleteDoc(doc(db, "reports", id));
            } catch (error) {
                console.error("Error al eliminar:", error);
                alert("Hubo un problema al intentar eliminar el reporte.");
                btnEliminar.disabled = false;
                btnEliminar.textContent = "Eliminar";
            }
            return;
        }

        // Ignorar clicks si son en el dropdown de estado
        if (e.target.classList.contains("estado-dropdown")) return;

        // 2. Lógica para enfocar reporte en el mapa al hacer click en la fila
        const fila = e.target.closest("tr");
        if (fila) {
            const reporte = listaReportes.find(r => r.id === fila.dataset.id);
            if (reporte?.data?.location) {
                const { latitude: lat, longitude: lng } = reporte.data.location;

                if (marcadorActivo) adminMap.removeLayer(marcadorActivo);

                marcadorActivo = L.marker([lat, lng]).addTo(adminMap);
                marcadorActivo.bindPopup(`
                    <b>${reporte.data.category}</b><br>
                    ${reporte.data.description}
                `).openPopup();

                adminMap.flyTo([lat, lng], 17);

                tablaBody.querySelectorAll("tr").forEach(f => f.classList.remove("seleccionado"));
                fila.classList.add("seleccionado");
            }
        }
    });

    // Actualización de estado del reporte
    tablaBody.addEventListener("change", async (e) => {
        if (!e.target.classList.contains("estado-dropdown")) return;

        const select = e.target;
        const id = select.getAttribute("data-id");
        const nuevoEstado = select.value;

        select.disabled = true;

        try {
            await updateDoc(doc(db, "reports", id), {
                status: nuevoEstado,
                updatedAt: serverTimestamp()
            });
            select.className = `estado-dropdown estado-${nuevoEstado.replace(/\s+/g, "-")}`;
        } catch (error) {
            console.error("Error al actualizar estado:", error);
            alert("Hubo un error al actualizar el estado.");
        } finally {
            select.disabled = false;
        }
    });
});