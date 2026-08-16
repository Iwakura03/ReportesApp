import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

import { auth, db } from './firebase-config.js';



const loginForm = document.getElementById("login-form");

const btnLogin = document.getElementById("btn-login");

const errormensaje = document.getElementById("mensaje-error");



//  Mostrar/Ocultar Contraseña

const passwordInput = document.getElementById("password");

const btnTogglePassword = document.getElementById("btn-toggle-password");

const iconEyeOpen = document.getElementById("icon-eye-open");

const iconEyeClosed = document.getElementById("icon-eye-closed");



btnTogglePassword.addEventListener("click", () => {

    const isPassword = passwordInput.type === "password";

   

    // Alternar tipo de input

    passwordInput.type = isPassword ? "text" : "password";

   

    // Alternar iconos de ojo

    iconEyeOpen.classList.toggle("hidden", isPassword);

    iconEyeClosed.classList.toggle("hidden", !isPassword);



    // Accesibilidad

    btnTogglePassword.setAttribute("aria-label", isPassword ? "Ocultar contraseña" : "Mostrar contraseña");

});



// Lógica del Submit del Formulario

loginForm.addEventListener("submit", async (e) => {

    e.preventDefault();

   

    errormensaje.hidden = true;

    btnLogin.disabled = true;

    btnLogin.querySelector(".btn-text").textContent = "Cargando...";



    const email = document.getElementById("email").value;

    const password = passwordInput.value;



    try {

        const userCredential = await signInWithEmailAndPassword(auth, email, password);

        const user = userCredential.user;



        const userDoc = await getDoc(doc(db, "users", user.uid));

       

        if (userDoc.exists()) {

            const rol = userDoc.data().rol;

            if (rol === "admin") {

                window.location.href = "admin.html";

            } else {

                window.location.href = "index.html";

            }

        } else {

            showError("Usuario autenticado, pero no tiene rol asignado en Firestore.");

            resetButton();

        }

    } catch (error) {

        console.error("Error al autenticar:", error);

       

        let msg = "Error al iniciar sesión. Intenta de nuevo.";

        if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {

            msg = "Correo o contraseña incorrectos.";

        } else if (error.code === "auth/too-many-requests") {

            msg = "Demasiados intentos fallidos. Inténtalo más tarde.";

        }

       

        showError(msg);

        resetButton();

    }

});



function showError(msg) {

    errormensaje.textContent = msg;

    errormensaje.hidden = false;

}

function resetButton() {
    btnLogin.disabled = false;
    btnLogin.querySelector(".btn-text").textContent = "Entrar";
} 

