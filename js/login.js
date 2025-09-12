window.addEventListener('DOMContentLoaded', () => {
    const rememberedUser = localStorage.getItem('rememberedUser');
    const rememberedPassword = localStorage.getItem('rememberedPassword');

    if (rememberedUser && rememberedPassword) {
        document.getElementById('user').value = rememberedUser;
        document.getElementById('password').value = rememberedPassword;
        document.getElementById('rememberMe').checked = true;
    }
});



document.getElementById('btnLogin').addEventListener('click', async function () {
    const user = document.getElementById('user').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    const captchaResponse = grecaptcha.getResponse();

    if (!user || !password) {
        Swal.fire({
            icon: 'warning',
            title: 'Campos vacíos',
            text: 'Por favor ingrese ambos campos.'
        }).then(() => location.reload());
        return;
    }

    if (!captchaResponse) {
        Swal.fire({
            icon: 'warning',
            title: 'Captcha requerido',
            text: 'Por favor verifique que no es un robot.'
        }).then(() => location.reload());
        return;
    }


    if (rememberMe) {
        localStorage.setItem('rememberedUser', user);
        localStorage.setItem('rememberedPassword', password);
    } else {
        localStorage.removeItem('rememberedUser');
        localStorage.removeItem('rememberedPassword');
    }

    try {
        const response = await fetch('http://localhost:5000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user, password, captcha: captchaResponse }),
            credentials: 'include'
        });

        const data = await response.json();

        if (response.status === 429) {
            Swal.fire({
                icon: 'warning',
                title: 'Demasiados intentos',
                text: data.message
            });

            const match = data.message.match(/en (\d+) segundos/);
            if (match) {
                const segundos = parseInt(match[1], 10);
                bloquearBotonLogin(segundos);
            }

            return;
        }

        if (!response.ok) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.message || 'Credenciales incorrectas.'
            }).then(() => location.reload());
            return;
        }

        if (data.token) {
            sessionStorage.setItem('token', data.token);
            sessionStorage.setItem('usuario', user);

            Swal.fire({
                icon: 'success',
                title: 'Bienvenido',
                html: `Usuario <strong>${user.toUpperCase()}</strong> ingresado con éxito.`,
                timer: 2000,
                showConfirmButton: false
            }).then(() => {
                window.location.href = '../pages/dashboard.html';
            });
        }

    } catch (error) {
        console.error('Error en el login:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Ocurrió un error al intentar ingresar.'
        }).then(() => location.reload());
    }
});



document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("loginForm");
    const btnLogin = document.getElementById("btnLogin");

    form.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            btnLogin.click();
        }
    });


});


function bloquearBotonLogin(segundos) {
    const boton = document.getElementById('btnLogin');
    boton.disabled = true;
    let tiempoRestante = segundos;

    const intervalo = setInterval(() => {
        boton.textContent = `Bloqueado (${tiempoRestante}s)`;
        tiempoRestante--;

        if (tiempoRestante < 0) {
            clearInterval(intervalo);
            boton.disabled = false;
            boton.textContent = 'Iniciar Sesión';
        }
    }, 1000);
}



