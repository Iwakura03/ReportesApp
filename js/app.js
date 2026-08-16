import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    serverTimestamp, 
    GeoPoint,
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    let userLat = 20.9080;
    let userLng = -103.9950;

    const map = L.map('map', { zoomControl: false }).setView([userLat, userLng], 15);

    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    const markerPrincipal = L.marker([userLat, userLng], { draggable: true }).addTo(map);
    markerPrincipal.bindPopup("<b>Ubicación del reporte</b><br>Arrastra este pin si deseas ajustar el punto exacto.").openPopup();

    // Lógica para colapsar / desplegar el panel flotante
    const panelReporte = document.getElementById("panel-reporte");
    const btnTogglePanel = document.getElementById("btn-toggle-panel");
    const toggleText = document.getElementById("toggle-text");

    if (btnTogglePanel && panelReporte) {
        btnTogglePanel.addEventListener("click", () => {
            const isCollapsed = panelReporte.classList.toggle("is-collapsed");
            toggleText.textContent = isCollapsed ? "Crear nuevo reporte" : "Ocultar formulario";
        });
    }

    const obtenerUbicacion = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    userLat = position.coords.latitude;
                    userLng = position.coords.longitude;

                    map.setView([userLat, userLng], 17);
                    markerPrincipal.setLatLng([userLat, userLng]);
                    markerPrincipal.getPopup().setContent("<b>¡Ubicación encontrada!</b><br>Arrastra el pin si deseas mover el punto.").openPopup();
                },
                (error) => {
                    console.warn("No se pudo obtener la geolocalización:", error.message);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        }
    };

    obtenerUbicacion();

    const btnRecenter = document.getElementById("btn-recenter");
    if (btnRecenter) {
        btnRecenter.addEventListener("click", () => {
            map.flyTo([userLat, userLng], 17);
            markerPrincipal.setLatLng([userLat, userLng]);
        });
    }

    const capaReportes = L.layerGroup().addTo(map);

    onSnapshot(collection(db, "reports"), (snapshot) => {
        capaReportes.clearLayers();

        snapshot.forEach((doc) => {
            const data = doc.data();
            
            if (data.location) {
                const lat = data.location.latitude;
                const lng = data.location.longitude;

                let fechaFormateada = "Fecha desconocida";
                if (data.createdAt) {
                    const dateObj = data.createdAt.toDate();
                    fechaFormateada = dateObj.toLocaleDateString('es-MX') + ' ' + dateObj.toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'});
                }

                const statusClass = (data.status || 'Pendiente').replace(/\s+/g, "-");

                const popupContent = `
                    <div class="custom-popup">
                        <span class="custom-popup-badge badge-${statusClass}">${data.status || 'Pendiente'}</span>
                        <h4>${data.category}</h4>
                        <p>${data.description}</p>
                        <span class="popup-date">Fecha: ${fechaFormateada}</span>
                    </div>
                `;

                const reporteMarker = L.marker([lat, lng]);
                reporteMarker.bindPopup(popupContent);
                capaReportes.addLayer(reporteMarker);
            }
        });
    });

    const btnEnviar = document.getElementById("btn-enviar");
    const userAlert = document.getElementById("user-alert");
    
    btnEnviar.addEventListener("click", async () => {
        const category = document.getElementById("categoria").value;
        const description = document.getElementById("descripcion").value.trim();
        const position = markerPrincipal.getLatLng();

        if (userAlert) userAlert.hidden = true;

        if (!description) {
            if (userAlert) {
                userAlert.textContent = "Por favor, escribe una breve descripción del problema.";
                userAlert.hidden = false;
            } else {
                alert("Por favor, escribe una descripción.");
            }
            return;
        }

        btnEnviar.textContent = "Enviando reporte...";
        btnEnviar.disabled = true;

        try {
            await addDoc(collection(db, "reports"), {
                category: category,
                description: description,
                imageUrl: "https://via.placeholder.com/150", 
                location: new GeoPoint(position.lat, position.lng), 
                addressText: "Ubicación detectada automáticamente", 
                status: "Pendiente",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            document.getElementById("descripcion").value = "";
            alert("¡Reporte enviado exitosamente!");

            // Ocultamos el panel automáticamente después de enviar el reporte
            panelReporte.classList.add("is-collapsed");
            if (toggleText) toggleText.textContent = "Crear nuevo reporte";

        } catch (error) {
            console.error("Error al guardar el reporte: ", error);
            alert("Hubo un error al guardar el reporte.");
        } finally {
            btnEnviar.textContent = "Enviar Reporte";
            btnEnviar.disabled = false;
        }
    });
});