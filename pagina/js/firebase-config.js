// Importar las funciones principales de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
// la configuracion de mi base de datos
const firebaseConfig = {
  apiKey: "AIzaSyCIsu5nAjYfBlHGxRvGQtmdn3N7H8lJP48",
  authDomain: "app-reportes-web.firebaseapp.com",
  projectId: "app-reportes-web",
  storageBucket: "app-reportes-web.firebasestorage.app",
  messagingSenderId: "947330136674",
  appId: "1:947330136674:web:443429f4d9eaf5f1e6ef3b",
  measurementId: "G-ZYRN07QFN4"
};
// Inicializar la app
const app = initializeApp(firebaseConfig);

// exportar las instancias listas para usarlas
export const auth = getAuth(app);
export const db = getFirestore(app);