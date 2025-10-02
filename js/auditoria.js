document.addEventListener('DOMContentLoaded', () => {
    const usuario = sessionStorage.getItem('usuario');
    const usuariosAutorizados = ['aguapach', 'jotero', 'cifuentm', 'fabian', 'salvarad', 'jdiaz'];
    const token = sessionStorage.getItem('token');
    const paginaActual = window.location.pathname;

    if (!token) {
        Swal.fire({
            icon: 'warning',
            title: 'Sesión expirada',
            text: 'Redirigiendo al login...',
            timer: 3000,
            showConfirmButton: false
        }).then(() => {
            window.location.href = '../pages/sign-in.html';
        });
        return;
    }

    // 🔒 Bloquear acceso si está en auditoria.html
    if (paginaActual.includes('auditoria.html') && !usuariosAutorizados.includes(usuario)) {
        Swal.fire({
            icon: 'error',
            title: 'Acceso denegado',
            text: 'No tienes permisos para ver esta página.'
        }).then(() => {
            window.location.href = '/pages/dashboard.html';
        });
        return;
    }

    // 👁️ Ocultar módulo desde el menú (solo en dashboard u otras páginas donde aparezca)
    const moduloAuditoria = document.getElementById('moduloAuditoria');
    if (moduloAuditoria && !usuariosAutorizados.includes(usuario)) {
        moduloAuditoria.style.display = 'none';
    }

    Swal.fire({
        title: 'Cargando información...',
        text: 'Por favor espera un momento.',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    obtenerAuditoria().then(() => {
        Swal.close();
    }).catch((error) => {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Hubo un problema al cargar los datos.',
        });
        console.error(error);
    });
});



async function obtenerAuditoria() {
    try {
        const token = sessionStorage.getItem('token');
        const url = 'http://localhost:5000/api/auditoria';

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(errorBody.message || 'Error en la solicitud');
        }

        const respuesta = await response.json();
        const auditoria = respuesta;

        if (!Array.isArray(auditoria) || auditoria.length === 0) {
            Swal.fire({
                title: 'Sin registros',
                text: 'No se encontraron auditorías en la base de datos.',
                icon: 'info',
                confirmButtonText: 'Entendido',
                allowOutsideClick: false,
                allowEscapeKey: false
            });
            return;
        }

        mostrar(auditoria);

    } catch (error) {
        console.error('❌ Error en auditoria:', error);
        Swal.fire('Error', 'No se pudo obtener la información.', 'error');
    }
}


const mostrar = (auditoria) => {
    let resultados = '';

    auditoria.forEach((registro) => {
        const fechaFormateada = new Date(registro.fecha).toLocaleString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });

        resultados += `
    <tr>
        <td class="text-center">${registro.id}</td>
        <td class="text-center text-uppercase">${registro.usuario}</td>
        <td class="text-center">${registro.evento}</td>
        <td class="text-center">${registro.ip}</td>
        <td class="text-center">${fechaFormateada}</td>
    </tr>
    `;
    });


    if ($.fn.DataTable.isDataTable('#tablaAuditoria')) {
        $('#tablaAuditoria').DataTable().clear().destroy();
    }

    $("#tablaAuditoria tbody").html(resultados);

    $('#tablaAuditoria').DataTable({
        pageLength: 13,
        lengthMenu: [[13, 20, 45, -1], [13, 20, 45, "Todos"]],
        order: [[0, "desc"]],
        language: {
            sProcessing: "Procesando...",
            sLengthMenu: "Mostrar _MENU_ registros",
            sZeroRecords: "No se encontraron resultados",
            sEmptyTable: "Ningún dato disponible en esta tabla",
            sInfo: "Mostrando del _START_ al _END_ de _TOTAL_ registros",
            sInfoEmpty: "Mostrando 0 a 0 de 0 registros",
            sInfoFiltered: "(filtrado de un total de _MAX_ registros)",
            sSearch: "Buscar:",
            oPaginate: {
                sNext: "Siguiente",
                sPrevious: "Anterior"
            }
        }
    });
};
