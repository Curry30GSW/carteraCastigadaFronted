let resultados = '';



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

    obtenerasociadosResumen().then(() => {
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

async function obtenerasociadosResumen() {
    try {
        const token = sessionStorage.getItem('token');
        const url = 'http://localhost:5000/api/resumen-agencias';

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Error en la solicitud');


        const respuesta = await response.json();
        const asociados = respuesta.data;


        if (!Array.isArray(asociados) || asociados.length === 0) {
            Swal.fire({
                title: 'Sin registros',
                text: 'No se encontraron asociados en la base de datos.',
                icon: 'info',
                confirmButtonText: 'Entendido',
                allowOutsideClick: false,
                allowEscapeKey: false
            });
            return;
        }

        mostrar(asociados);

    } catch (error) {
        console.error('❌ Error en asociados:', error);
        Swal.fire('Error', 'No se pudo obtener la información.', 'error');
    }
}


const mostrar = (asociados) => {

    let resultados = '';


    // Determinar zona jurídica
    const determinarZonaJuridica = (agencia) => {
        const agenciaNum = parseInt(agencia);
        const zonas = {
            centro: [48, 80, 89, 94, 83, 13, 68, 73, 76, 90, 91, 92, 96, 93, 95],
            norte: [87, 86, 85, 81, 84, 88, 98, 97, 82],
            sur: [77, 49, 70, 42, 46, 45, 47, 78, 74, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 43, 44, 29]
        };

        if (zonas.centro.includes(agenciaNum)) return '21 - JURIDICO ZONA CENTRO';
        if (zonas.norte.includes(agenciaNum)) return '22 - JURIDICO ZONA NORTE';
        if (zonas.sur.includes(agenciaNum)) return '23 - JURIDICO ZONA SUR';
        return 'No determinada';
    };


    asociados.forEach((asociado) => {
        const centroOperacion = `${asociado.CODIGO_AGENCIA} - ${asociado.NOMBRE_AGENCIA}`;
        resultados += `
        <tr>
            <td>${centroOperacion}</td>
            <td class="text-center">${asociado.TOTAL_CUENTAS}</td>
            <td class="text-center">$ ${Number(asociado.TOTAL_DEUDA).toLocaleString('es-CO')}</td>
            <td class="text-center">
                <button class="btn btn-md ver-mas" data-id="${asociado.CODIGO_AGENCIA}" title="Ver más">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
        `;
    });

    if ($.fn.DataTable.isDataTable('#tablaCastigados')) {
        $('#tablaCastigados').DataTable().clear().destroy();
    }

    $("#tablaCastigados tbody").html(resultados);

    const table = $('#tablaCastigados').DataTable({
        pageLength: 7,
        lengthMenu: [[7, 20, 45, -1], [7, 20, 45, "Todos"]],
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



    $('#tablaCastigados').on('click', '.ver-mas', async function () {
        const codigoAgencia = $(this).data('id');
        await cargarDetallesAsociado(codigoAgencia);

        const modal = new bootstrap.Modal(document.getElementById('modalDetalleAsociado'));
        modal.show();
    });

    mostrarTotalesPorZona(asociados);


};



async function cargarDetallesAsociado(codigoAgencia) {
    try {
        const token = sessionStorage.getItem('token');
        const response = await fetch(`http://localhost:5000/api/por-agencia/${codigoAgencia}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar los datos');
        }

        const data = await response.json();

        mostrarDetallesEnModal(data.data);

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('contenidoModalAsociado').innerHTML = `
            <div class="alert alert-danger">
                Error al cargar los detalles del asociado: ${error.message}
            </div>
        `;
    }
}


function mostrarDetallesEnModal(data) {
    const determinarZonaJuridica = (agencia) => {
        const agenciaNum = parseInt(agencia);
        const zonas = {
            centro: [48, 80, 89, 94, 83, 13, 68, 73, 76, 90, 91, 92, 96, 93, 95],
            norte: [87, 86, 85, 81, 84, 88, 98, 97, 82],
            sur: [77, 49, 70, 42, 46, 45, 47, 78, 74, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 43, 44, 29]
        };

        if (zonas.centro.includes(agenciaNum)) return '21 - JURIDICO ZONA CENTRO';
        if (zonas.norte.includes(agenciaNum)) return '22 - JURIDICO ZONA NORTE';
        if (zonas.sur.includes(agenciaNum)) return '23 - JURIDICO ZONA SUR';
        return 'No determinada';
    };

    const tabla = $('#tablaDetallesAsociado');

    // 🔁 Destruir DataTable existente si ya fue inicializado
    if ($.fn.DataTable.isDataTable(tabla)) {
        tabla.DataTable().clear().destroy();
    }

    // 🧼 Limpiar el cuerpo de la tabla
    tabla.find('tbody').empty();

    let filas = '';
    data.forEach(item => {
        let fechaFormateada = 'No disponible';
        if (item.FTAG05) {
            const fechaRaw = String(19000000 + parseInt(item.FTAG05));
            const anio = fechaRaw.substring(0, 4);
            const mesNumero = parseInt(fechaRaw.substring(4, 6)) - 1;
            const dia = fechaRaw.substring(6, 8);
            const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            fechaFormateada = `${dia}/${meses[mesNumero]}/${anio}`;
        }
        const zona = determinarZonaJuridica(item.AAUX93);
        filas += `
            <tr>
                <td>${item.AAUX93} - ${item.DESC03}</td>
                <td>${zona}</td>
                <td>${Number(item.NNIT93).toLocaleString('es-CO')}</td>
                <td>${item.DCTA93}</td>
                <td class="text-center">${item.NCTA93}</td>
                <td>${item.DNOM93}</td>
                <td class="text-center">$ ${Number(item.SALDO_TOTAL).toLocaleString('es-CO')}</td>
                <td class="text-center">${fechaFormateada}</td>
            </tr>
        `;
    });

    tabla.find('tbody').html(filas);

    tabla.DataTable({
        pageLength: 15,
        lengthMenu: [[15, 25, 50, -1], [15, 25, 50, "Todos"]],
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
        },
        dom: 'Bfrtip', // ⬅️ Habilita los botones
        buttons: [
            {
                extend: 'excelHtml5',
                text: '<i class="fas fa-file-excel"></i> Exportar a Excel',
                title: 'Castigados por Agencia',
                className: 'btn btn-success text-dark fw-bold',
                exportOptions: {
                    columns: ':visible'
                }
            }
        ]
    });

}




function actualizarFechaCorte() {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const ahora = new Date();

    const dia = ahora.getDate().toString().padStart(2, '0');
    const mes = meses[ahora.getMonth()];
    const anio = ahora.getFullYear();

    let horas = ahora.getHours();
    const minutos = ahora.getMinutes().toString().padStart(2, '0');
    const ampm = horas >= 12 ? 'P.M' : 'A.M';
    horas = horas % 12;
    horas = horas ? horas : 12;

    const horaFormateada = `${horas}:${minutos} ${ampm}`;
    const fechaFormateada = `${dia}/${mes}/${anio} ${horaFormateada}`;

    document.getElementById('fechaCorte').textContent = `Corte: ${fechaFormateada}`;
}

// Llamar al cargar la página
actualizarFechaCorte();



function mostrarTotalesPorZona(asociados) {
    const zonas = {
        norte: [87, 86, 85, 81, 84, 88, 98, 97, 82],
        centro: [48, 80, 89, 94, 83, 13, 68, 73, 76, 90, 91, 92, 96, 93, 95],
        sur: [77, 49, 70, 42, 46, 45, 47, 78, 74, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 43, 44, 29]
    };

    let cuentas = { norte: 0, centro: 0, sur: 0, total: 0 };
    let valores = { norte: 0, centro: 0, sur: 0, total: 0 };

    asociados.forEach((a) => {
        const agencia = parseInt(a.CODIGO_AGENCIA);
        const cuentasAgencia = Number(a.TOTAL_CUENTAS);
        const valorAgencia = Number(a.TOTAL_DEUDA);

        if (zonas.norte.includes(agencia)) {
            cuentas.norte += cuentasAgencia;
            valores.norte += valorAgencia;
        } else if (zonas.centro.includes(agencia)) {
            cuentas.centro += cuentasAgencia;
            valores.centro += valorAgencia;
        } else if (zonas.sur.includes(agencia)) {
            cuentas.sur += cuentasAgencia;
            valores.sur += valorAgencia;
        }

        cuentas.total += cuentasAgencia;
        valores.total += valorAgencia;
    });

    // Insertar valores en la tabla
    document.getElementById('cuentasNorte').textContent = cuentas.norte;
    document.getElementById('valorNorte').textContent = `$ ${valores.norte.toLocaleString('es-CO')}`;

    document.getElementById('cuentasCentro').textContent = cuentas.centro;
    document.getElementById('valorCentro').textContent = `$ ${valores.centro.toLocaleString('es-CO')}`;

    document.getElementById('cuentasSur').textContent = cuentas.sur;
    document.getElementById('valorSur').textContent = `$ ${valores.sur.toLocaleString('es-CO')}`;

    document.getElementById('cuentasTotal').textContent = cuentas.total;
    document.getElementById('valorTotal').textContent = `$ ${valores.total.toLocaleString('es-CO')}`;
}



document.getElementById("btnImprimir").addEventListener("click", () => {
    // 1️⃣ Obtener instancia de DataTable
    const table = $('#tablaCastigados').DataTable();

    // 2️⃣ Exportar todas las filas (sin paginación ni filtros activos)
    const todasFilas = table.rows({ search: 'applied' }).data().toArray();

    // 3️⃣ Reconstruir tabla completa en HTML (omitimos la última columna)
    let tablaCompleta = `
        <table>
            <thead>
                <tr>
                    <th>Agencia</th>
                    <th>Total Cuentas</th>
                    <th>Total Deuda</th>
                </tr>
            </thead>
            <tbody>
    `;

    todasFilas.forEach(fila => {
        tablaCompleta += "<tr>";
        for (let i = 0; i < fila.length - 1; i++) { // excluye la columna acciones
            tablaCompleta += `<td>${fila[i]}</td>`;
        }
        tablaCompleta += "</tr>";
    });

    tablaCompleta += "</tbody></table>";

    // 4️⃣ Resumen
    const tablaResumen = document.getElementById("tablaTotalesZonas").outerHTML;

    // 🕒 5️⃣ Obtener fecha y hora actual
    const fechaHora = new Date().toLocaleString("es-CO", {
        dateStyle: "full",
        timeStyle: "short"
    });

    // 6️⃣ Contenido del reporte (con estilos incluidos)
    const contenido = `
        <html>
            <head>
                <title>Reporte Castigados</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    th, td { border: 1px solid #000; padding: 6px; text-align: center; }
                    th { background-color: #f2f2f2; }
                    h2 { text-align: center; margin-bottom: 10px; }
                    .fecha { text-align: right; font-size: 12px; margin-bottom: 20px; font-style: italic; }
                </style>
            </head>
            <body>
                <div class="fecha">Generado el: ${fechaHora}</div>
                <h2>Resumen por Agencias</h2>
                ${tablaCompleta}
                <h2>Resumen por Zonas Juridicas</h2>
                ${tablaResumen}
            </body>
        </html>
    `;

    // 7️⃣ Crear un iframe oculto en la misma página
    let iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    // 8️⃣ Escribir el contenido en el iframe y disparar la impresión
    iframe.contentDocument.open();
    iframe.contentDocument.write(contenido);
    iframe.contentDocument.close();

    iframe.contentWindow.focus();
    iframe.contentWindow.print();

    // 9️⃣ Eliminar el iframe después de imprimir
    setTimeout(() => {
        document.body.removeChild(iframe);
    }, 1000);
});
