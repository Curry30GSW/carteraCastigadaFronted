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

    obtenerasociados().then(() => {
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




async function obtenerasociados() {
    try {
        const token = sessionStorage.getItem('token');
        const url = 'http://localhost:5000/api/castigados?page=1&pageSize=2500';

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

    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

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
        const zonaJuridica = determinarZonaJuridica(asociado.AAUX93);
        const centroOperacion = `${asociado.AAUX93} - ${asociado.DESC03}`;
        const sumaCredito = (Number(asociado.ESCR93) || 0) + (Number(asociado.ORCR93) || 0);

        let fechaFormateada = '';
        if (asociado.FTAG05) {
            const fechaRaw = String(19000000 + parseInt(asociado.FTAG05));
            const anio = parseInt(fechaRaw.substring(0, 4));
            const mes = parseInt(fechaRaw.substring(4, 6)) - 1;
            const dia = parseInt(fechaRaw.substring(6, 8));

            fechaFormateada = `${dia.toString().padStart(2, '0')}/${meses[mes]}/${anio}`;
        }

        let scoreBadge = '';
        if (asociado.Score === 'F/D') {
            scoreBadge = `<span class="badge bg-dark fs-6">F/D</span>`;
        } else if (asociado.Score === 'S/E') {
            scoreBadge = `<span class="badge bg-warning text-dark fs-6">S/E</span>`;
        } else {
            const scoreNum = Number(asociado.Score);
            if (scoreNum > 650) {
                scoreBadge = `<span class="badge bg-primary fs-6">${scoreNum}</span>`;
            } else if (scoreNum === 650) {
                scoreBadge = `<span class="badge bg-warning text-dark fs-6">${scoreNum}</span>`;
            } else {
                scoreBadge = `<span class="badge bg-danger fs-6">${scoreNum}</span>`;
            }
        }

        // 🔹 Semáforo para la FechaInsercion
        let semaforoHTML = '';
        if (asociado.FechaInsercion && asociado.FechaInsercion !== 'F/D') {
            const fechaInsercion = new Date(asociado.FechaInsercion);
            const hoy = new Date();
            const diffTime = Math.abs(hoy - fechaInsercion);
            const diffDias = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            let estado = '';
            if (diffDias <= 170) {
                estado = 'green';
            } else if (diffDias >= 171 && diffDias <= 179) {
                estado = 'yellow';
            } else if (diffDias >= 180) {
                estado = 'red';
            }

            semaforoHTML = `
                        <div class="semaforo mt-1">
                            <div class="circle ${estado === 'green' ? 'active-green' : ''}"></div>
                            <div class="circle ${estado === 'yellow' ? 'active-yellow' : ''}"></div>
                            <div class="circle ${estado === 'red' ? 'active-red' : ''}"></div>
                            <span class="text dark fw-bold">${diffDias} días</span>
                        </div>
                    `;
        } else {
            semaforoHTML = `
                        <div class="semaforo mt-1">
                            <div class="circle"></div>
                            <div class="circle"></div>
                            <div class="circle"></div>
                            <span class="text dark fw-bold">Sin info</span>
                        </div>
                    `;
        }

        resultados += `
                <tr>
                    <td class="text-center">${centroOperacion}</td>
             
                    <td>${Number(asociado.NNIT93).toLocaleString('es-CO')}</td>
                    <td>${asociado.DCTA93}</td>
                    <td class="text-center">${asociado.NCTA93}</td>
                    <td>${asociado.DNOM93}</td>
                    <td class="text-center">
                        <div class="d-flex flex-column align-items-center">
                            ${scoreBadge}
                            ${semaforoHTML}
                        </div>
                    </td>
                    <td class="text-center">$ ${sumaCredito.toLocaleString()}</td>
                    <td class="text-center">${fechaFormateada}</td>
                    <td class="text-center">
                        <button class="btn btn-md ver-mas" data-id="${asociado.NNIT93}" title="Ver más">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-md ver-juridico" data-id="${asociado.NCTA93}" title="Estado Jurídico">
                            <i class="fa-solid fa-scale-unbalanced-flip"></i>
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
        lengthMenu: [7, 16, 25, 50, 100],
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
        buttons: [
            {
                extend: 'excelHtml5',
                text: '<i class="fas fa-file-excel"></i> Exportar a Excel',
                titleAttr: 'Exportar a Excel',
                className: 'btn btn-success mb-2',
                exportOptions: {
                    columns: ':not(:last-child)' // Excluye la columna de botones
                }
            }
        ]
    });

    // Usar event delegation en el contenedor de la tabla
    $('#tablaCastigados').on('click', '.ver-mas', async function () {
        const cedula = $(this).data('id');
        await cargarDetallesAsociado(cedula);

        // Mostrar el modal usando Bootstrap 5
        const modal = new bootstrap.Modal(document.getElementById('modalDetalleAsociado'));
        modal.show();
    });

    $('#tablaCastigados').on('click', '.ver-juridico', async function () {
        const cuenta = $(this).data('id');

        // Mostrar spinner de carga
        document.getElementById('contenidoModalAsociado').innerHTML = `
        <div class="text-center my-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
            </div>
            <p class="mt-2">Cargando información jurídica...</p>
        </div>
    `;

        // Mostrar el modal inmediatamente
        const modal = new bootstrap.Modal(document.getElementById('modalDetalleAsociado'));
        modal.show();

        // Cargar los datos
        await cargarProcesoJuridico(cuenta);
    });

};

//CARGAR DETALLES
async function cargarDetallesAsociado(cedula) {
    try {
        const token = sessionStorage.getItem('token');
        const response = await fetch(`http://localhost:5000/api/castigos/${cedula}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar los datos');
        }
        const data = await response.json();
        console.log(data);

        mostrarDetallesEnModal(data[0]);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('contenidoModalAsociado').innerHTML = `
            <div class="alert alert-danger">
                Error al cargar los detalles del asociado: ${error.message}
            </div>
        `;
    }
}


function mostrarDetallesEnModal(asociado) {
    const modalContent = document.getElementById('contenidoModalAsociado');
    modalContent.innerHTML = '';

    // Formatear fecha de castigo
    let fechaFormateada = 'No disponible';
    if (asociado.FTAG05) {
        const fechaRaw = String(19000000 + parseInt(asociado.FTAG05));
        const anio = fechaRaw.substring(0, 4);
        const mesNumero = parseInt(fechaRaw.substring(4, 6)) - 1;
        const dia = fechaRaw.substring(6, 8);
        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        fechaFormateada = `${dia}/${meses[mesNumero]}/${anio}`;
    }

    // Sumar créditos
    const sumaCredito = (Number(asociado.ESCR93) || 0) + (Number(asociado.ORCR93) || 0);

    // Fecha y hora actual formateada
    const ahora = new Date();
    const fechaHoy = ahora.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Generar HTML para referencias
    let referenciasHTML = '';
    const tieneReferencias = asociado.NOM531 || asociado.NOM532 || asociado.NOM533;
    const tieneBeneficiarios = asociado.BEN105 || asociado.BEN205 || asociado.BEN305;

    // Función para determinar el parentesco
    function obtenerParentesco(codigo) {
        switch (codigo) {
            case '0': return 'Madre';
            case '4': return 'Padre';
            case '2': return 'Hijo(a)';
            case '1': return 'Cónyuge';
            default: return 'Otro';
        }
    }

    const estadosAsociado = {
        0: { texto: "Activo", clase: "bg-success" },
        2: { texto: "Retirado", clase: "bg-danger" },
        3: { texto: "Codeudor", clase: "bg-info" },
        4: { texto: "Cuentas Control", clase: "bg-info" },
        5: { texto: "Beneficiario Fallecido", clase: "bg-primary" },
        6: { texto: "Cuentas H", clase: "bg-warning" },
        7: { texto: "Cuentas Fraudes", clase: "bg-warning" },
        8: { texto: "Stand By", clase: "bg-warning" },
        9: { texto: "Bloqueado por Consejo Admin", clase: "bg-danger" }
    };
    const estado = estadosAsociado[asociado.INDC05] || { texto: "No definido", clase: "bg-dark" };


    // 🔹 Badge de Score
    let scoreBadge = '';
    if (asociado.Score === 'Falta DataCrédito') {
        scoreBadge = `<span class="badge bg-dark fs-6">Falta DataCrédito</span>`;
    } else if (asociado.Score === 'S/E') {
        scoreBadge = `<span class="badge bg-warning text-dark fs-6">S/E</span>`;
    } else {
        const scoreNum = Number(asociado.Score);
        if (scoreNum > 650) {
            scoreBadge = `<span class="badge bg-primary fs-6">${scoreNum}</span>`;
        } else if (scoreNum === 650) {
            scoreBadge = `<span class="badge bg-warning text-dark fs-6">${scoreNum}</span>`;
        } else {
            scoreBadge = `<span class="badge bg-danger fs-6">${scoreNum}</span>`;
        }
    }

    // 🔹 Semáforo para la FechaInsercion
    let semaforoHTML = '';

    if (asociado.FechaInsercion && asociado.FechaInsercion !== 'Falta DataCrédito') {
        const fechaInsercion = new Date(asociado.FechaInsercion);
        const hoy = new Date();
        const diffTime = Math.abs(hoy - fechaInsercion);
        const diffDias = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        let estado = '';
        if (diffDias <= 170) {
            estado = 'green';
        } else if (diffDias >= 171 && diffDias <= 179) {
            estado = 'yellow';
        } else if (diffDias >= 180) {
            estado = 'red';
        }

        semaforoHTML = `
        <div class="semaforo mt-1">
            <div class="circle ${estado === 'green' ? 'active-green' : ''}"></div>
            <div class="circle ${estado === 'yellow' ? 'active-yellow' : ''}"></div>
            <div class="circle ${estado === 'red' ? 'active-red' : ''}"></div>
            <span class="text dark fw-bold">${diffDias} días</span>
        </div>
    `;
    } else if (asociado.FechaInsercion === 'Falta DataCredito') {
        semaforoHTML = `
        <div class="semaforo mt-1">
            <div class="circle"></div>
            <div class="circle"></div>
            <div class="circle"></div>
            <span class="text dark fw-bold">0 días</span>
        </div>
    `;
    } else {
        semaforoHTML = `
        <div class="semaforo mt-1">
            <div class="circle"></div>
            <div class="circle"></div>
            <div class="circle"></div>
            <span class="text dark fw-bold">Sin info</span>
        </div>
    `;
    }



    // Generar HTML para referencias tradicionales
    if (tieneReferencias) {
        // Referencia 1
        if (asociado.NOM531) {
            const tipoRef1 = asociado.TRF531 === 'P' ? 'Personal' : 'Familiar';
            referenciasHTML += `
        <div class="col-md-4 mb-3">
            <div class="card referencia h-100 border-${asociado.TRF531 === 'P' ? 'primary' : 'success'}">
                <div class="card-header bg-${asociado.TRF531 === 'P' ? 'primary' : 'success'} text-white">
                    <h6 class="mb-0">
                        <i class="fas fa-user${asociado.TRF531 === 'P' ? '' : '-friends'} me-2"></i>
                        Referencia ${tipoRef1}
                    </h6>
                </div>
                <div class="card-body">
                    <div class="info-referencia">
                        <span class="etiqueta">Nombre:</span>
                        <span class="valor">${asociado.NOM531} ${asociado.APE531}</span>
                    </div>
                    <div class="info-referencia">
                        <span class="etiqueta">Dirección:</span>
                        <span class="valor">${asociado.DIR531 || 'No disponible'}</span>
                    </div>
                    <div class="info-referencia">
                        <span class="etiqueta">Ciudad:</span>
                        <span class="valor">${asociado.CIU531 || 'No disponible'}</span>
                    </div>
                    <div class="info-referencia">
                        <span class="etiqueta">Teléfono:</span>
                        <span class="valor">${asociado.TCE531 || 'No disponible'}</span>
                    </div>
                </div>
            </div>
        </div>`;
        }

        // Referencia 2
        if (asociado.NOM532) {
            const tipoRef2 = asociado.TRF532 === 'P' ? 'Personal' : 'Familiar';
            referenciasHTML += `
        <div class="col-md-4 mb-3">
            <div class="card referencia h-100 border-${asociado.TRF532 === 'P' ? 'primary' : 'success'}">
                <div class="card-header bg-${asociado.TRF532 === 'P' ? 'primary' : 'success'} text-white">
                    <h6 class="mb-0">
                        <i class="fas fa-user${asociado.TRF532 === 'P' ? '' : '-friends'} me-2"></i>
                        Referencia ${tipoRef2}
                    </h6>
                </div>
                <div class="card-body">
                    <div class="info-referencia">
                        <span class="etiqueta">Nombre:</span>
                        <span class="valor">${asociado.NOM532} ${asociado.APE532}</span>
                    </div>
                    <div class="info-referencia">
                        <span class="etiqueta">Dirección:</span>
                        <span class="valor">${asociado.DIR532 || 'No disponible'}</span>
                    </div>
                    <div class="info-referencia">
                        <span class="etiqueta">Ciudad:</span>
                        <span class="valor">${asociado.CIU532 || 'No disponible'}</span>
                    </div>
                    <div class="info-referencia">
                        <span class="etiqueta">Teléfono:</span>
                        <span class="valor">${asociado.TCE532 ? asociado.TCE532 : (asociado.TOF532 || 'No disponible')}</span>
                    </div>
                </div>
            </div>
        </div>`;
        }

        // Referencia 3
        if (asociado.NOM533) {
            const tipoRef3 = asociado.TRF533 === 'P' ? 'Personal' : 'Familiar';
            referenciasHTML += `
        <div class="col-md-4 mb-3">
            <div class="card referencia h-100 border-${asociado.TRF533 === 'P' ? 'primary' : 'success'}">
                <div class="card-header bg-${asociado.TRF533 === 'P' ? 'primary' : 'success'} text-white">
                    <h6 class="mb-0">
                        <i class="fas fa-user${asociado.TRF533 === 'P' ? '' : '-friends'} me-2"></i>
                        Referencia ${tipoRef3}
                    </h6>
                </div>
                <div class="card-body">
                    <div class="info-referencia">
                        <span class="etiqueta">Nombre:</span>
                        <span class="valor">${asociado.NOM533} ${asociado.APE533}</span>
                    </div>
                    <div class="info-referencia">
                        <span class="etiqueta">Dirección:</span>
                        <span class="valor">${asociado.DIR533 || 'No disponible'}</span>
                    </div>
                    <div class="info-referencia">
                        <span class="etiqueta">Ciudad:</span>
                        <span class="valor">${asociado.CIU533 || 'No disponible'}</span>
                    </div>
                    <div class="info-referencia">
                        <span class="etiqueta">Teléfono:</span>
                        <span class="valor">${asociado.TCE533 || 'No disponible'}</span>
                    </div>
                </div>
            </div>
        </div>`;
        }
    }

    // Generar HTML para beneficiarios (nuevas referencias)
    if (tieneBeneficiarios) {
        // Beneficiario 1
        if (asociado.BEN105) {
            referenciasHTML += `
        <div class="col-md-4 mb-3">
            <div class="card referencia h-100 border-success">
                <div class="card-header bg-success text-white">
                    <h6 class="mb-0">
                        <i class="fas fa-user-tag me-2"></i>
                        Referencia Familiar
                    </h6>
                </div>
                <div class="card-body">
                    <div class="info-referencia">
                        <span class="etiqueta">Nombre:</span>
                        <span class="valor">${asociado.BEN105}</span>
                    </div>
                    <div class="info-referencia">
                        <span class="etiqueta">Documento:</span>
                        <span class="valor">${Number(asociado.NIT105).toLocaleString('es-CO') || 'No disponible'}</span>
                    </div>
                    <div class="info-referencia">
                        <span class="etiqueta">Teléfono:</span>
                        <span class="valor">${asociado.CEL105 || 'No disponible'}</span>
                    </div>
                    <div class="info-referencia">
                        <span class="etiqueta">Parentesco:</span>
                        <span class="valor">${obtenerParentesco(asociado.PAR105)}</span>
                    </div>
                </div>
            </div>
        </div>`;
        }

        // Beneficiario 2
        if (asociado.BEN205) {
            referenciasHTML += `
        <div class="col-md-4 mb-3">
            <div class="card referencia h-100 border-info">
                <div class="card-header bg-info text-white">
                    <h6 class="mb-0">
                        <i class="fas fa-user-tag me-2"></i>
                        Beneficiario
                    </h6>
                </div>
                <div class="card-body">
                    <div class="info-referencia">
                        <span class="etiqueta">Nombre:</span>
                        <span class="valor">${asociado.BEN205}</span>
                    </div>
                    <div class="info-referencia">
                        <span class="etiqueta">Documento:</span>
                        <span class="valor">${asociado.NIT205 || 'No disponible'}</span>
                    </div>
                    <div class="info-referencia">
                        <span class="etiqueta">Teléfono:</span>
                        <span class="valor">${asociado.CEL205 || 'No disponible'}</span>
                    </div>
                    <div class="info-referencia">
                        <span class="etiqueta">Parentesco:</span>
                        <span class="valor">${obtenerParentesco(asociado.PAR205)}</span>
                    </div>
                </div>
            </div>
        </div>`;
        }

        // Beneficiario 3
        if (asociado.BEN305) {
            referenciasHTML += `
        <div class="col-md-4 mb-3">
            <div class="card referencia h-100 border-info">
                <div class="card-header bg-info text-white">
                    <h6 class="mb-0">
                        <i class="fas fa-user-tag me-2"></i>
                        Beneficiario
                    </h6>
                </div>
                <div class="card-body">
                    <div class="info-referencia">
                        <span class="etiqueta">Nombre:</span>
                        <span class="valor">${asociado.BEN305}</span>
                    </div>
                    <div class="info-referencia">
                        <span class="etiqueta">Documento:</span>
                        <span class="valor">${asociado.NIT305 || 'No disponible'}</span>
                    </div>
                    <div class="info-referencia">
                        <span class="etiqueta">Teléfono:</span>
                        <span class="valor">${asociado.CEL305 || 'No disponible'}</span>
                    </div>
                    <div class="info-referencia">
                        <span class="etiqueta">Parentesco:</span>
                        <span class="valor">${obtenerParentesco(asociado.PAR305)}</span>
                    </div>
                </div>
            </div>
        </div>`;
        }
    }

    if (!tieneReferencias && !tieneBeneficiarios) {
        referenciasHTML = `
    <div class="col-12">
        <div class="sin-referencias">
            <i class="fas fa-user-slash"></i>
            <p>No se encontraron referencias registradas</p>
        </div>
    </div>`;
    }

    modalContent.innerHTML = `
    <div class="expediente-juridico">
        <!-- Encabezado estilo documento oficial -->
        <div class="encabezado-documento">
            <div class="membrete">
                <div class="logo-institucion">
                    <i class="fas fa-user-tie fa-3x"></i>
                </div>
                <div class="titulo-documento">
                    <h3>EXPEDIENTE DE ASOCIADO</h3>
                    <p class="numero-expediente fs-4">No. Cuenta: ${asociado.NCTA93 || 'S/N'}</p>
                </div>
                <div class="sello">
                    <div class="sello-content">
                        <span>CARTERA CASTIGADA</span>
                    </div>
                </div>
            </div>
            
            <div class="datos-encabezado">
                <div class="fecha-radicacion">
                    <span class="text-dark fw-bold fs-5">Corte: ${fechaHoy}</span>
                </div>
                <div class="codigo-barras">
                    <span>Cédula: ${Number(asociado.NNIT93).toLocaleString('es-CO') || 'No registrada'}</span>
                </div>
            </div>
        </div>

        <!-- Cuerpo principal del expediente -->
        <div class="cuerpo-expediente">
            <!-- Sección de identificación -->
            <div class="seccion-expediente">
                 <h4 class="titulo-seccion">
                        <i class="fas fa-id-card"></i> DATOS DEL ASOCIADO 
                        <span class="badge ${estado.clase} ms-2">${estado.texto}</span>
                    </h4>
                <div class="grid-datos">
                    <div class="dato-legal">
                        <span class="etiqueta">Nombre completo:</span>
                        <span class="valor">${asociado.DCTA93 || 'No disponible'}</span>
                    </div>
                    <div class="dato-legal">
                        <span class="etiqueta">Cédula:</span>
                        <span class="valor">${Number(asociado.NNIT93).toLocaleString('es-CO') || 'No registrada'}</span>
                    </div>
                    <div class="dato-legal">
                        <span class="etiqueta">Agencia:</span>
                        <span class="valor">${asociado.AAUX93} - ${asociado.DESC03}</span>
                    </div>
                    <div class="dato-legal">
                        <span class="etiqueta">Nómina:</span>
                        <span class="valor">${asociado.DNOM93 || 'No disponible'}</span>
                    </div>
                    <div class="dato-legal">
                        <span class="etiqueta">Recaudación:</span>
                        <span class="valor">${asociado.DIST93}${asociado.DIST93}-${asociado.DEPE93} ${asociado.DDEP93}</span>
                    </div>
                    <div class="dato-legal">
                        <span class="etiqueta">Fecha de castigo:</span>
                        <span class="valor">${fechaFormateada}</span>
                    </div>
                     <div class="dato-legal">
                        <span class="etiqueta">Score DATACRÉDITO:</span>
                        <span class="valor">${scoreBadge}</span>
                    </div>
                    <div class="dato-legal">
                        <span class="etiqueta">Vigencia:</span>
                        <span class="valor">${semaforoHTML}</span>
                    </div>
                </div>
            </div>

        <!-- Sección de información financiera -->
        <div class="seccion-expediente">
              <h4 class="titulo-seccion"><i class="fas fa-file-invoice-dollar"></i> SITUACIÓN FINANCIERA</h4>

            <!-- Sección de créditos detallados en horizontal (PRIMERO) -->
             <div class="creditos-detallados-horizontal">
               <h5 class="subtitulo-seccion"><i class="fas fa-list-ul"></i> CRÉDITOS CASTIGADOS</h5>
        
                <div class="contenedor-cards-horizontal">
                    ${asociado.creditos && asociado.creditos.length > 0 ?
            asociado.creditos.map(credito => `
                    <div class="tarjeta-credito-horizontal">
                        <div class="encabezado-credito">
                            <span class="numero-credito">Pagaré #${credito.numero}</span>
                            <span class="tipo-credito">Linea: ${credito.tipo_credito}-${credito.descripcion_tipo_credito}</span>
                        </div>               
                        <div class="detalle-credito">
                            <div class="fila-detalle">
                                <span class="concepto">Garantia:</span>
                                <span class="monto">${credito.moga}-${credito.descripcion_moga}</span>
                            </div>
                            <div class="fila-detalle">
                                <span class="concepto">Saldo Capital:</span>
                                <span class="monto">$${Number(credito.saldo_capital || 0).toLocaleString()}</span>
                            </div>
                            <div class="fila-detalle">
                                <span class="concepto">Interés Ordinario:</span>
                                <span class="monto">$${Number(credito.interes || 0).toLocaleString()}</span>
                            </div>
                            <div class="fila-detalle">
                                <span class="concepto">Interés de Mora:</span>
                                <span class="monto">$${Number(credito.interes_mora || 0).toLocaleString()}</span>
                            </div>
                            <div class="fila-detalle">
                                <span class="concepto">Interés Contingente:</span>
                                <span class="monto">$${Number(credito.interes_contingente || 0).toLocaleString()}</span>
                            </div>
                            <div class="fila-detalle">
                                <span class="concepto">Valor Costas Judiciales:</span>
                                <span class="monto">$${Number(credito.scjo || 0).toLocaleString()}</span>
                            </div>
                            <div class="fila-detalle total">
                                <span class="concepto">Total Crédito:</span>
                                <span class="monto">$${Number(
                (credito.saldo_capital || 0) +
                (credito.interes || 0) +
                (credito.interes_mora || 0) +
                (credito.scjo || 0) +
                (credito.interes_contingente || 0)
            ).toLocaleString()}</span>
                                            </div>
                                        </div>
                    <div class="adjuntar-pdf mt-2 p-2 border-top">
                        <label class="form-label fw-bold">
                            <i class="fas fa-file-pdf text-danger me-2"></i> Adjuntar Pagaré (PDF):
                        </label>

                        ${credito.pagare_pdf
                    ? `
                            <!-- Si existe el PDF mostrar ojito -->
                            <div class="pdf-visualizar">
                                <a href="http://localhost:5000/uploads${credito.pagare_pdf}" target="_blank" class="btn btn-success btn-md">
                                    <i class="fas fa-eye me-1"></i> Ver Pagaré
                                </a>
                            </div>
                            `
                    : `
                            <!-- Si NO existe, permitir adjuntar -->
                            <div class="file-upload-container">
                                <input type="file" accept="application/pdf" id="fileInput-${credito.numero}" class="d-none file-input">
                                
                                <label for="fileInput-${credito.numero}" class="file-upload-label">
                                    <i class="fas fa-upload me-2"></i> 
                                    <span class="file-upload-text">Seleccionar archivo PDF</span>
                                </label>

                                <div id="fileName-${credito.numero}" class="file-name-display mt-1"></div>
                                
                                <iframe id="filePreview-${credito.numero}" class="w-100 mt-2 d-none" 
                                style="height: 200px; border: 1px solid #dee2e6; border-radius: 5px;">
                                </iframe>
                            </div>
                            <div class="mt-3">
                                <button type="button" 
                                    id="confirmBtn-${credito.numero}" 
                                    class="btn btn-success btn-md" 
                                    data-cedula="${asociado.NNIT93}" 
                                    data-cuenta="${asociado.NCTA93}"
                                    data-pagare="${credito.numero}"
                                    disabled
                                >
                                    <i class="fas fa-check-circle me-1"></i> Confirmar
                                </button>
                            </div>
                            `}
                    </div>
                </div>
                                `).join('')
            :
            '<div class="sin-creditos">No se encontraron créditos registrados</div>'
        }
        </div>
    </div>
                <div class="resumen-financiero">
                    <div class="dato-financiero">
                        <span class="concepto">Crédito Ordinario:</span>
                        <span class="monto">$${Number(asociado.ORCR93 || 0).toLocaleString()}</span>
                    </div>
                    <div class="dato-financiero">
                        <span class="concepto">Crédito Especial:</span>
                        <span class="monto">$${Number(asociado.ESCR93 || 0).toLocaleString()}</span>
                    </div>
                    <div class="dato-financiero total">
                        <span class="concepto">TOTAL CASTIGADO:</span>
                        <span class="monto monto-blink">$${sumaCredito.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            

            <!-- Sección de información de contacto -->
            <div class="seccion-expediente">
                <h4 class="titulo-seccion"><i class="fas fa-address-book"></i> INFORMACIÓN DE CONTACTO</h4>
                
                <div class="grid-datos">
                    <div class="dato-legal">
                        <span class="etiqueta">Dirección:</span>
                        <span class="valor">${asociado.DIRE05 || 'No disponible'}</span>
                    </div>
                    <div class="dato-legal">
                        <span class="etiqueta">Teléfono:</span>
                        <span class="valor">${asociado.TELE05 || 'No disponible'}</span>
                    </div>
                    <div class="dato-legal">
                        <span class="etiqueta">Celular:</span>
                        <span class="valor">${asociado.TCEL05 || 'No disponible'}</span>
                    </div>
                    <div class="dato-legal">
                        <span class="etiqueta">Correo electrónico:</span>
                        <span class="valor">${asociado.MAIL05 || 'No disponible'}</span>
                    </div>
                </div>
            </div>

            <!-- Sección de referencias -->
            <div class="seccion-expediente">
                <h4 class="titulo-seccion"><i class="fas fa-users"></i> REFERENCIAS</h4>
                <div class="row">
                    ${referenciasHTML}
                </div>
            </div>

            <!-- Sección de información adicional -->
            <div class="seccion-expediente">
                <h4 class="titulo-seccion"><i class="fas fa-info-circle"></i> INFORMACIÓN ADICIONAL</h4>
                
                <div class="grid-datos">
                    <div class="dato-legal">
                        <span class="etiqueta">Lugar de nacimiento:</span>
                        <span class="valor">${asociado.LNAC05 || 'No disponible'}</span>
                    </div>
                    <div class="dato-legal">
                        <span class="etiqueta">Fecha de nacimiento:</span>
                        <span class="valor">${formatearFecha(asociado.FECN05)}</span>
                    </div>
                    <div class="dato-legal">
                        <span class="etiqueta">Edad:</span>
                        <span class="valor">${calcularEdad(asociado.FECN05)}</span>
                    </div>
                    <div class="dato-legal">
                        <span class="etiqueta">Estado civil:</span>
                        <span class="valor">${obtenerEstadoCivilHTML(asociado.ESTC05) || 'No disponible'}</span>
                    </div>
                    <div class="dato-legal">
                        <span class="etiqueta">Cargo:</span>
                        <span class="valor">${asociado.CARG05 || 'No disponible'}</span>
                    </div>
                    <div class="dato-legal">
                        <span class="etiqueta">Vivienda:</span>
                        <span class="valor">${asociado.MVIV05 || 'No Registrada'}</span>
                    </div>
                     <div class="dato-legal">
                        <span class="etiqueta">Vehiculo:</span>
                        <span class="valor">${asociado.PLAC05 || 'No Registrada'}</span>
                    </div>
                </div>
            </div>

            <!-- Sección de información de agencia -->
            <div class="seccion-expediente">
                <h4 class="titulo-seccion"><i class="fas fa-building"></i> INFORMACIÓN DE AGENCIA</h4>
                
                <div class="grid-datos">
                    <div class="dato-legal">
                        <span class="etiqueta">Agencia:</span>
                        <span class="valor">${asociado.AAUX93} - ${asociado.DESC03}</span>
                    </div>
                    <div class="dato-legal">
                        <span class="etiqueta">Dirección agencia:</span>
                        <span class="valor">${asociado.DIRO03 || 'No disponible'}</span>
                    </div>
                    <div class="dato-legal">
                        <span class="etiqueta">Teléfonos agencia:</span>
                        <span class="valor">${asociado.TELS03 || 'No disponible'}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Pie de documento -->
        <div class="pie-documento">
            <div class="firma-digital">
                <div class="linea-firma"></div>
                <p>Expediente generado electrónicamente</p>
                <small>${fechaHoy}</small>
            </div>
            <div class="codigo-consulta">
                <span>Cuenta: ${asociado.NCTA93} | Cédula: ${Number(asociado.NNIT93).toLocaleString('es-CO') || 'No registrada'}</span>
            </div>
        </div>
    </div>`;

}


function calcularEdad(fechaNumerica) {
    if (!fechaNumerica || isNaN(fechaNumerica)) return 'No disponible';

    const fechaStr = String(fechaNumerica);
    const anio = parseInt(fechaStr.substring(0, 4));
    const mes = parseInt(fechaStr.substring(4, 6)) - 1;
    const dia = parseInt(fechaStr.substring(6, 8));

    const fechaNacimiento = new Date(anio, mes, dia);
    const hoy = new Date();
    let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();

    const cumpleEsteAnio = new Date(hoy.getFullYear(), mes, dia);
    if (hoy < cumpleEsteAnio) edad--;

    if (edad > 75) {
        return `<span class="text-danger fw-bold">${edad} años</span>`;
    }

    return `${edad} años`;
}


function formatearFecha(fechaNumerica) {
    if (!fechaNumerica || isNaN(fechaNumerica)) return 'No disponible';

    const fechaStr = String(fechaNumerica);
    const anio = fechaStr.substring(0, 4);
    const mes = parseInt(fechaStr.substring(4, 6)) - 1;
    const dia = fechaStr.substring(6, 8);

    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return `${dia}/${meses[mes]}/${anio}`;
}

function formatearHora(horaString) {
    if (!horaString) return 'Hora no válida';

    const horaStr = horaString.toString(); // <-- CONVIERTE a string

    // Si ya viene en formato HH:MM:SS o H:MM:SS
    if (horaStr.includes(':')) {
        const partes = horaStr.split(':');
        if (partes.length < 2) return 'Hora no válida';

        let horas = parseInt(partes[0], 10);
        const minutos = parseInt(partes[1], 10);

        if (isNaN(horas) || isNaN(minutos)) return 'Hora no válida';

        const ampm = horas >= 12 ? 'PM' : 'AM';
        const horas12 = horas % 12 || 12;

        return `${horas12}:${minutos.toString().padStart(2, '0')} ${ampm}`;
    }

    // Si viene en formato HHMMSS
    const str = horaStr.padStart(6, '0');
    const horas = parseInt(str.substring(0, 2), 10);
    const minutos = parseInt(str.substring(2, 4), 10);

    if (isNaN(horas) || isNaN(minutos)) return 'Hora no válida';

    const ampm = horas >= 12 ? 'PM' : 'AM';
    const horas12 = horas % 12 || 12;

    return `${horas12}:${minutos.toString().padStart(2, '0')} ${ampm}`;
}


function formatearFechaGeneral(fecha, origen) {
    if (origen === "MySQL") {
        if (!fecha) return "Fecha no válida";

        // ejemplo entrada: "05 de sept de 2025"
        const partes = fecha.split(" ").filter(p => p.toLowerCase() !== "de");
        // ahora partes = ["05", "sept", "2025"]

        if (partes.length < 3) return fecha;

        const dia = partes[0].padStart(2, "0");
        const mesTexto = partes[1].toLowerCase();
        const anio = partes[2];

        const mesesMap = {
            ene: "Ene", enero: "Ene",
            feb: "Feb", febrero: "Feb",
            mar: "Mar", marzo: "Mar",
            abr: "Abr", abril: "Abr",
            may: "May", mayo: "May",
            jun: "Jun", junio: "Jun",
            jul: "Jul", julio: "Jul",
            ago: "Ago", agosto: "Ago",
            sep: "Sep", sept: "Sep", septiembre: "Sep",
            oct: "Oct", octubre: "Oct",
            nov: "Nov", noviembre: "Nov",
            dic: "Dic", diciembre: "Dic"
        };

        const mes = mesesMap[mesTexto] || mesTexto;

        return `${dia}/${mes}/${anio}`;
    } else {
        return formatearFecha(fecha); // AS400
    }
}

function formatearHoraGeneral(hora, origen) {
    if (origen === "MySQL") {
        // Se devuelve tal cual viene
        return hora || "No disponible";
    } else {
        // AS400 sí se formatea
        return formatearHora(hora);
    }
}




function obtenerEstadoCivilHTML(codigo) {
    switch (codigo) {
        case 'C':
            return '<i class="fas fa-ring me-2 text-primary"></i><span class="fw-bold">Casado</span>';
        case 'D':
            return '<i class="fas fa-user-slash me-2 text-danger"></i><span class="fw-bold">Divorciado</span>';
        case 'S':
            return '<i class="fas fa-user me-2 text-secondary"></i><span class="fw-bold">Soltero</span>';
        case 'U':
            return '<i class="fas fa-hand-holding-heart me-2 text-success"></i><span class="fw-bold">Unión Libre</span>';
        case 'V':
            return '<i class="fas fa-cross me-2 text-muted"></i><span class="fw-bold">Viudo</span>';
        default:
            return '<i class="fas fa-question-circle me-2 text-dark"></i><span class="fw-bold">No disponible</span>';
    }
}

//CARGAR PRCESO JURIDICO

async function cargarProcesoJuridico(cuenta) {
    try {
        const token = sessionStorage.getItem('token');
        const response = await fetch(`http://localhost:5000/api/estado-proceso/${cuenta}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.success || !result.data || result.data.length === 0) {
            throw new Error('No se encontró información del proceso jurídico');
        }

        mostrarProcesoJuridicoEnModal(result.data);

    } catch (error) {
        console.error('Error al cargar proceso jurídico:', error);
        document.getElementById('contenidoModalAsociado').innerHTML = `
        <div class="text-center p-3">
            <i class="fas fa-info-circle fa-2x text-muted mb-2"></i>
            <p class="mb-2 text-dark">Esta persona no tiene procesos jurídicos registrados.</p>
            <button class="btn btn-md btn-warning fw-bold" id="btnVerGestion" data-cuenta="${cuenta}">
                <i class="fas fa-tasks me-1"></i> VER GESTIÓN
            </button>
        </div>
    `;
    }


}


function mostrarProcesoJuridicoEnModal(procesos) {
    const modalContent = document.getElementById('contenidoModalAsociado');
    modalContent.innerHTML = '';

    const proceso = procesos[0];

    // Determinar zona jurídica
    const determinarZonaJuridica = (agencia) => {
        const agenciaNum = parseInt(agencia);
        const zonas = {
            centro: [48, 80, 89, 94, 83, 13, 68, 73, 76, 90, 91, 92, 96, 93, 95],
            norte: [87, 86, 85, 81, 84, 88, 98, 97, 82],
            sur: [77, 49, 70, 42, 46, 45, 47, 78, 74, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 43, 44, 29]
        };

        if (zonas.centro.includes(agenciaNum)) return '21 - JURÍDICO ZONA CENTRO';
        if (zonas.norte.includes(agenciaNum)) return '22 - JURÍDICO ZONA NORTE';
        if (zonas.sur.includes(agenciaNum)) return '23 - JURÍDICO ZONA SUR';
        return 'No determinada';
    };

    const descripcionZona = (zona) => {
        switch (parseInt(zona)) {
            case 21:
                return 'JURÍDICO ZONA CENTRO';
            case 22:
                return 'JURÍDICO ZONA NORTE';
            case 23:
                return 'JURÍDICO ZONA SUR';
            default:
                return 'Zona no determinada';
        }
    };


    const zonaJuridica = determinarZonaJuridica(proceso.AGENCIA29);
    const fechaActual = new Date().toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    modalContent.innerHTML = `
    <div class="expediente-juridico">
        <!-- Encabezado estilo documento oficial -->
        <div class="encabezado-documento">
            <div class="membrete">
                <div class="logo-institucion">
                    <i class="fas fa-balance-scale fa-3x"></i>
                </div>
                <div class="titulo-documento">
                    <h3>EXPEDIENTE JURÍDICO</h3>
                    <p class="numero-expediente text-dark fs-5">No. Expediente Juzgado ${proceso.EXPEJUZ29 || 'S/N'}</p>
                </div>
                <div class="sello">
                    <div class="sello-content">
                        <span>${proceso.ESTADO29 || 'ACTIVO'}</span>
                    </div>
                </div>
            </div>
            
            <div class="datos-encabezado">
                <div class="fecha-radicacion">
                    <span class= "text-dark fw-bold fs-5">Radicado el: ${formatearFecha(proceso.FRAD29)}</span>
                </div>
                <div class="fecha-radicacion">
                    <span class= "text-dark fw-bold fs-6">No. Cuenta: ${proceso.NCTA29}-${proceso.DESC05}</span>
                </div>
            </div>
        </div>

        <!-- Cuerpo principal del expediente -->
        <div class="cuerpo-expediente">
            <!-- Sección de identificación -->
            <div class="seccion-expediente">
                <h4 class="titulo-seccion"><i class="fas fa-id-card"></i> IDENTIFICACIÓN DEL PROCESO</h4>
                <div class="grid-datos">
                    <div class="dato-legal">
                        <span class="etiqueta">Juzgado:</span>
                        <span class="valor">${proceso.JUZG29 || 'No asignado'} - ${proceso.DEJ129 || ''}</span>
                    </div>
                    <div class="dato-legal">
                        <span class="etiqueta">Zona Jurídica:</span>
                        <span class="valor">${zonaJuridica}</span>
                    </div>
                    <div class="dato-legal">
                        <span class="etiqueta">Expediente Interno:</span>
                        <span class="valor">${proceso.EXPEINT29 || '0000'}</span>
                    </div>
                    <div class="dato-legal">
                        <span class="etiqueta">Fecha Creación Expediente:</span>
                        <span class="valor">${formatearFecha(proceso.FCHA29)}</span>
                    </div>

                    <div class="dato-legal">
                        <span class="etiqueta">Estado Actual:</span>
                        <span class="valor estado-${proceso.ESTADO29?.toLowerCase() || 'activo'}">${proceso.ES_DESCR || 'Activo'}</span>
                    </div>
                </div>
            </div>
            
            <div class="valor-vencido mb-5">
                 <strong>Valor vencido:</strong> $${Number(proceso.VALOR_VENCIDO).toLocaleString('es-CO')}
            </div>

            <!-- Sección de partes -->
            <div class="seccion-expediente">
                <h4 class="titulo-seccion"><i class="fas fa-gavel"></i> PARTES</h4>
                
                <div class="partes-proceso">
                    <!-- Tarjeta de abogado -->
                    <div class="tarjeta-parte abogado">
                        <div class="parte-header">
                            <i class="fas fa-user-tie"></i>
                            <h5>ABOGADO RESPONSABLE</h5>
                        </div>
                        ${proceso.NOM ? `
                        <div class="parte-body">
                            <div class="info-parte">
                                <span class="campo">Nombre:</span>
                                <span class="valor">${proceso.NOM} ${proceso.APE1} ${proceso.APE2 || ''}</span>
                            </div>
                            <div class="info-parte">
                                <span class="campo">Identificación:</span>
                                <span class="valor">${proceso.CABO29 || 'No registrada'}</span>
                            </div>
                            <div class="info-parte">
                                <span class="campo">Zona Jurídica:</span>
                                <span class="valor">${proceso.ZONA} - ${descripcionZona(proceso.ZONA)}</span>
                            </div>
                        </div>
                        ` : `
                        <div class="parte-body no-asignado">
                            <i class="fas fa-user-slash"></i>
                            <p>No hay abogado asignado</p>
                            ${proceso.CABO29 ? `<small>Cédula registrada: ${proceso.CABO29}</small>` : ''}
                        </div>
                        `}
                    </div>
                    
                    <!-- Tarjeta de demandado -->
                    <div class="tarjeta-parte demandado">
                        <div class="parte-header">
                            <i class="fas fa-user"></i>
                            <h5>DEMANDADO</h5>
                        </div>
                        <div class="parte-body">
                            <div class="info-parte">
                                <span class="campo">Nombre:</span>
                                <span class="valor">${proceso.DESC05 || 'No disponible'}</span>
                            </div>
                            <div class="info-parte">
                                <span class="campo">Identificación:</span>
                                <span class="valor">${proceso.NNIT05 || 'No registrada'}</span>
                            </div>
                            <div class="info-parte">
                                <span class="campo">N° Cuenta:</span>
                                <span class="valor">${proceso.NCTA29}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

         <!-- Sección de medidas cautelares --> 
           <div class="seccion-expediente">
                <h4 class="titulo-seccion"><i class="fas fa-shield-alt"></i> MEDIDAS CAUTELARES</h4>

                ${proceso.MEDIDAS_DETALLE ?
            `<div class="row">
                        ${proceso.MEDIDAS_DETALLE.split('\n').map(medida => {
                const [tipoParte, obsParte, fecParte, usrParte] = medida.split('|').map(p => p.trim());

                const tipo = tipoParte || '';
                const observacion = obsParte ? obsParte.replace('OBS: ', '') : '';
                const fecha = fecParte ? fecParte.replace('FEC: ', '') : '';
                const usuario = usrParte ? usrParte.replace('USR: ', '') : '';

                return `
                                    <div class="col-md-4 mb-3">
                                        <div class="card h-100">
                                            <div class="card-header d-flex justify-content-between align-items-center">
                                                <h6 class="mb-0">${tipo}</h6>
                                            </div>
                                            <div class="card-body">
                                                <p><strong>Observación:</strong> ${observacion || 'Sin observaciones registradas'}</p>
                                                <p><strong>Fecha medida:</strong> ${fecha || 'Sin fecha'}</p>
                                                <p><strong>Usuario:</strong> ${usuario || 'Sin usuario'}</p>
                                            </div>
                                        </div>
                                    </div>
                                `;
            }).join('')
            }
                    </div>`
            :
            `<div class="sin-medidas">
                        <i class="fas fa-folder-open"></i>
                        <p>No se han registrado medidas cautelares</p>
                    </div>`
        }
            </div>




            <!-- Sección de historial -->
            <div class="seccion-expediente">
    <div class="d-flex justify-content-between align-items-center mb-2">
        <h4 class="titulo-seccion mb-0"><i class="fas fa-history"></i> HISTORIAL</h4>
        <button class="btn btn-md btn-warning fw-bold" id="btnVerGestion" data-cuenta="${proceso.NCTA29}">
            <i class="fas fa-tasks me-1 "></i> VER GESTIÓN
        </button>
    </div>
    <div class="historial">
        <div class="evento-historial">
            <div class="fecha-evento">${formatearFechaGeneral(proceso.FCHA29)}</div>
            <div class="detalle-evento">
                <span class="titulo-evento">Inicio del proceso</span>
                <span class="descripcion-evento">Radicado en Juzgado ${proceso.JUZG29 || 'juzgado no especificado'}-${proceso.DEJ129}</span>
            </div>
        </div>
        ${proceso.FRAD29 ? `
        <div class="evento-historial">
            <div class="fecha-evento">${formatearHoraGeneral(proceso.FRAD29)}</div>
            <div class="detalle-evento">
                <span class="titulo-evento">Radicación formal</span>
                <span class="descripcion-evento">Expediente ${proceso.EXPEJUZ29 || 'no especificado'}</span>
            </div>
        </div>
        ` : ''}
    </div>
</div>


        </div>

        <!-- Pie de documento -->
        <div class="pie-documento">
            <div class="firma-digital">
                <div class="linea-firma"></div>
                <p>Expediente generado electrónicamente</p>
                <small>${fechaActual}</small>
            </div>
            <div class="codigo-consulta">
                <span>Expediente Interno: ${proceso.EXPEINT29 || '0000'}</span>
            </div>
        </div>
    </div>`;
}


document.addEventListener('click', (e) => {
    const btn = e.target.closest('#btnVerGestion');
    if (btn) {
        const cuenta = btn.dataset.cuenta;
        if (cuenta) abrirModalGestion(cuenta);
        else alert('Cuenta sin gestión.');
    }
});


async function abrirModalGestion(cuenta) {
    try {
        // Configuración inicial del modal
        const modalGestion = new bootstrap.Modal(document.getElementById('modalGestion'));
        modalGestion.show();
        document.getElementById('modalDetalleAsociado').classList.add('modal-blur');

        // Obtener datos
        const token = sessionStorage.getItem('token');

        const res = await fetch(`http://localhost:5000/api/castigos/gestion/${cuenta}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await res.json();
        console.log(data);

        const contenido = document.getElementById('contenidoGestion');

        if (!data || data.length === 0) {
            contenido.innerHTML = `
                <div class="sin-gestiones text-center py-5">
                    <i class="fas fa-folder-open fa-4x mb-3 text-muted"></i>
                    <h4 class="text-muted">No se encontraron gestiones</h4>
                    <p class="text-muted">No hay registros de gestión para esta cuenta</p>
                </div>
            `;
        } else {
            // Ordenar gestiones por fecha (más reciente primero)
            const gestionesOrdenadas = data.sort((a, b) => {
                return new Date(b.FCHA29) - new Date(a.FCHA29);
            });

            // Crear HTML con diseño mejorado
            let html = `
                <div class="expediente-gestiones">
                    <!-- Encabezado estilo documento -->
                    <div class="encabezado-documento">
                        <div class="membrete">
                            <div class="logo-institucion">
                                <i class="fas fa-tasks fa-3x"></i>
                            </div>
                            <div class="titulo-documento">
                                <h3>HISTORIAL DE GESTIONES</h3>
                                <p class="numero-expediente text-dark fs-6">Cuenta No. ${cuenta} - ${data[0].nombre}</p>
                            </div>
                            <div class="sello">
                                <div class="sello-content">
                                    <span>${data.length} REGISTROS</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="datos-encabezado">
                            <div class="fecha-radicacion">
                                <span class="text-dark fw-bold fs-5">Última gestión: ${formatearFechaGeneral(gestionesOrdenadas[0].fecha_gestion, gestionesOrdenadas[0].origen)}</span>
                            </div>
                            <div class="codigo-barras">
                                <span>Total gestiones: ${data.length}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Cuerpo del historial -->
                    <div class="cuerpo-expediente">
                        <div class="seccion-expediente">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <h4 class="titulo-seccion mb-0"><i class="fas fa-history me-2"></i>DETALLE DE GESTIONES</h4>
                                <span class="badge bg-primary">${data.length} registros</span>
                            </div>
                        <div class="convencion-colores mb-3">
                            <span class="badge" style="background-color:#3a7bd5;">AS400</span>
                            <small class="text-dark ms-2">Gestiones provenientes de la plataforma AS400</small><br>
                            <span class="badge text-dark fw-bold" style="background-color:#11db4e;">Software Cartera Cast.</span>
                            <small class="text-dark ms-2">Gestiones registradas en el Software Cartera Cast.</small>
                        </div>

                            
                            <div class="timeline-gestiones">
            `;

            gestionesOrdenadas.forEach((gestion, index) => {
                const claseOrigen = gestion.origen === "MySQL" ? "mysql" : "as400";

                html += `
                        <div class="evento-gestion ${index === 0 ? 'ultima-gestion' : ''}">
                            <div class="timeline-marker">
                                <i class="fas ${index === 0 ? 'fa-star' : 'fa-circle'}"></i>
                            </div>
                            <div class="timeline-content">
                                <div class="timeline-header">
                                    <h5>Gestión #${index + 1}</h5>
                                    <span class="fecha-gestion">
                                        <i class="far fa-calendar-alt me-1"></i>
                                        ${formatearFechaGeneral(gestion.fecha_gestion, gestion.origen)} 
                                        <i class="far fa-clock ms-2 me-1"></i>
                                        ${formatearHoraGeneral(gestion.hora_gestion, gestion.origen)}
                                    </span>
                                </div>
                                <div class="timeline-body">
                                    <div class="descripcion-gestion ${claseOrigen}">
                                        <i class="fas fa-align-left me-2"></i>
                                        <p class="fw-bold text-dark">${gestion.gestion || 'Sin descripción registrada'}</p>
                                    </div>
                                    <div class="metadatos-gestion">
                                        <span class="badge bg-light text-dark">
                                            <i class="fas fa-user-circle me-1"></i>
                                            ${gestion.usuario_gestion || 'Usuario no registrado'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
            });


            html += `
                            </div>
                        </div>
                    </div>

                    <!-- Pie de documento -->
                    <div class="pie-documento">
                        <div class="firma-digital">
                            <div class="linea-firma"></div>
                            <p>Historial generado electrónicamente</p>
                            <small>${new Date().toLocaleDateString('es-CO')}</small>
                        </div>
                        <div class="codigo-consulta">
                            <span>Cuenta: ${cuenta}</span>
                        </div>
                    </div>
                </div>
            `;

            contenido.innerHTML = html;
            contenido.style.maxHeight = '80vh';
            contenido.style.overflowY = 'auto';
        }

    } catch (error) {
        console.error('Error al obtener gestión:', error);
        contenido.innerHTML = `
            <div class="error-carga text-center py-5">
                <i class="fas fa-exclamation-triangle fa-4x mb-3 text-danger"></i>
                <h4 class="text-danger">Error al cargar el historial</h4>
                <p>No se pudo obtener la información de gestiones</p>
                <button class="btn btn-sm btn-outline-primary mt-2" onclick="abrirModalGestion('${cuenta}')">
                    <i class="fas fa-sync-alt me-1"></i> Reintentar
                </button>
            </div>
        `;
    }
}


document.getElementById('modalGestion').addEventListener('hidden.bs.modal', function () {
    document.getElementById('modalDetalleAsociado').classList.remove('modal-blur');
});


function actualizarFechaCorte() {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const ahora = new Date();

    const dia = ahora.getDate().toString().padStart(2, '0');
    const mes = meses[ahora.getMonth()];
    const anio = ahora.getFullYear();

    let horas = ahora.getHours();
    const minutos = ahora.getMinutes().toString().padStart(2, '0');
    const ampm = horas >= 12 ? 'P.m' : 'A.m';
    horas = horas % 12;
    horas = horas ? horas : 12;

    const horaFormateada = `${horas}:${minutos} ${ampm}`;
    const fechaFormateada = `${dia}/${mes}/${anio} ${horaFormateada}`;

    document.getElementById('fechaCorte').textContent = `Corte: ${fechaFormateada}`;
}

// Llamar al cargar la página
actualizarFechaCorte();

function imprimirHistorial() {
    const contenido = document.getElementById('contenidoModalAsociado');

    if (!contenido || !contenido.innerHTML.trim()) {
        alert("No hay contenido para imprimir.");
        return;
    }

    const ventanaImpresion = window.open('', '_blank', 'width=900,height=600');

    ventanaImpresion.document.write(`
        <html>
            <head>
                <title>Historial de Gestiones</title>
                <link rel="stylesheet" href="../assets/css/expediente.css">
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                <style>
                    @media print {
                        /* Estilos generales */
                        body {
                            padding: 10px !important;
                            margin: 0 !important;
                            font-family: 'Segoe UI', sans-serif;
                            font-size: 12px !important;
                            line-height: 1.3 !important;
                            color: #000 !important;
                            background-color: white !important;
                        }
                        
                        /* Numeración de páginas */
                        @page {
                            size: A4;
                            margin: 0.5cm 0.5cm 1.5cm 0.5cm;
                            
                            @bottom-center {
                                content: counter(page) " de " counter(pages);
                                font-family: 'Segoe UI', sans-serif;
                                font-size: 10px;
                                color: #666;
                            }
                        }
                        
                        /* Mantener iconos de FontAwesome */
                        .fa, .fas, .far, .fal, .fab {
                            display: inline !important;
                            font-style: normal !important;
                        }
                        
                        /* Estilo específico para TOTAL CASTIGADO */
                        .resumen-financiero .total .concepto {
                            font-weight: bold !important;
                        }
                        
                        .resumen-financiero .total .monto {
                            color: #000000 !important;
                            font-weight: bold !important;
                            animation: none !important;
                            background-color: transparent !important;
                            border: none !important;
                            padding: 0 !important;
                        }
                        
                        /* Eliminar cualquier efecto de parpadeo */
                        .monto-blink, .valor-vencido {
                            animation: none !important;
                            color: #000000 !important;
                        }
                        
                        /* SOLUCIÓN DEFINITIVA PARA REFERENCIAS EN LÍNEA */
                        .seccion-expediente .row {
                            display: flex !important;
                            flex-wrap: wrap !important;
                            margin: 0 -10px !important;
                        }
                        
                        .seccion-expediente .row > .col-md-4 {
                            flex: 0 0 33.333% !important;
                            max-width: 33.333% !important;
                            padding: 0 10px !important;
                            float: none !important;
                            display: inline-block !important;
                            vertical-align: top !important;
                            page-break-inside: avoid !important;
                        }
                        
                        .card.referencia {
                            height: 100% !important;
                            margin-bottom: 15px !important;
                            border-width: 2px !important;
                        }
                        
                        .card-header h6 {
                            font-size: 14px !important;
                        }
                        
                        .info-referencia {
                            display: flex !important;
                            margin-bottom: 8px !important;
                        }
                        
                        .etiqueta {
                            font-weight: bold !important;
                            min-width: 70px !important;
                        }
                        
                        /* Ajustes para el contenedor limitador */
                        .contenedor-limitador {
                            height: calc(297mm * 2 - 1cm);
                            overflow: hidden;
                        }
                        
                        /* Optimización general */
                        * {
                            margin-top: 0 !important;
                            margin-bottom: 5px !important;
                        }
                    }
                    
                    /* Estilos para vista previa */
                    @media screen {
                        body {
                            font-size: 12px;
                            padding: 10px;
                            position: relative;
                        }
                        
                        .contenedor-limitador {
                            border: 1px dashed #ccc;
                            height: calc(297mm * 2 - 1cm);
                            overflow: auto;
                        }
                        
                        /* Simulación de numeración para vista previa */
                        body::after {
                            content: "Página 1/2 (Vista previa)";
                            position: fixed;
                            bottom: 10px;
                            left: 0;
                            right: 0;
                            text-align: center;
                            font-size: 10px;
                            color: #666;
                        }
                    }
                </style>
            </head>
            <body onload="window.print(); setTimeout(() => window.close(), 500)">
                <div class="contenedor-limitador">
                    ${contenido.innerHTML}
                </div>
            </body>
        </html>
    `);

    ventanaImpresion.document.close();
}

document.addEventListener("change", function (e) {
    if (e.target.matches(".file-input")) {
        const fileInput = e.target;
        const creditoNum = fileInput.id.split("-")[1];
        const fileNameDisplay = document.getElementById(`fileName-${creditoNum}`);
        const filePreview = document.getElementById(`filePreview-${creditoNum}`);
        const confirmBtn = document.getElementById(`confirmBtn-${creditoNum}`);

        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            fileNameDisplay.textContent = file.name;

            // Previsualizar PDF
            const fileURL = URL.createObjectURL(file);
            filePreview.src = fileURL;
            filePreview.classList.remove("d-none");

            // Habilitar botón confirmar
            confirmBtn.disabled = false;
        }
    }
});

document.addEventListener('click', function (e) {
    if (e.target.id.startsWith('confirmBtn-')) {
        const numeroCredito = e.target.id.split('-')[1];
        const fileInput = document.getElementById(`fileInput-${numeroCredito}`);
        const file = fileInput.files[0];

        if (!file) {
            Swal.fire({
                icon: 'warning',
                title: 'Archivo faltante',
                text: 'Por favor, adjunta un archivo PDF antes de confirmar.'
            });
            return;
        }

        const cedula = e.target.getAttribute("data-cedula");
        const cuenta = e.target.getAttribute("data-cuenta");
        const pagare = e.target.getAttribute("data-pagare");

        const formData = new FormData();
        formData.append("cedula", cedula);
        formData.append("cuenta", cuenta);
        formData.append("pagare", pagare);
        formData.append("pagare_pdf", file);

        fetch("http://localhost:5000/api/pagares", {
            method: "POST",
            body: formData
        })
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: data.error
                    });
                } else {
                    const modalEl = document.getElementById('modalDetalleAsociado');
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    if (modal) modal.hide();

                    // Mostrar alerta de éxito
                    Swal.fire({
                        icon: 'success',
                        title: '¡Éxito!',
                        text: 'Pagaré cargado correctamente ✅',
                        confirmButtonText: 'Aceptar'
                    }).then(() => {
                        // Recargar la página después de cerrar la alerta
                        window.location.reload();
                    });
                }
            })
            .catch(err => {
                console.error("Error al cargar pagaré:", err);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error al cargar el pagaré ❌'
                });
            });
    }
});

document.getElementById("btnBuscarCliente").addEventListener("click", async () => {
    const cedula = document.getElementById("cedulaInput").value.trim();
    if (!cedula) {
        Swal.fire({
            icon: "warning",
            title: "Campo vacío",
            text: "Por favor ingrese un número de cédula",
            confirmButtonColor: "#1B3C53"
        });
        return;
    }

    const token = sessionStorage.getItem("token");

    try {
        const response = await fetch(`http://localhost:5000/api/castigos/${cedula}`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) throw new Error("Cliente no encontrado");

        const data = await response.json();
        const cliente = Array.isArray(data) ? data[0] : data;

        // Mostrar datos
        document.getElementById("datosCliente").classList.remove("d-none");
        document.getElementById("clienteNombre").textContent = cliente.DCTA93 || "No disponible";
        document.getElementById("clienteCedula").textContent = cliente.NNIT93 || "No disponible";
        document.getElementById("clienteNomina").textContent = cliente.DNOM93 || "No disponible";
        document.getElementById("clienteCuenta").textContent = cliente.NCTA93 || "No disponible";
        document.getElementById("clienteAgencia").textContent = `${cliente.AAUX93} - ${cliente.DESC03}` || "No disponible";
        document.getElementById("clienteValorCastigado").textContent = cliente.ESCR93 ? `$${Number(cliente.ESCR93).toLocaleString('es-CO')}` : "No disponible";

        // Mostrar área de gestión
        document.getElementById("areaGestion").classList.remove("d-none");
        document.getElementById("btnGuardarGestion").classList.remove("d-none");

        // ✅ Opcional: mostrar notificación de éxito
        Swal.fire({
            icon: "success",
            title: "Cliente encontrado",
            text: `${cliente.DCTA93 || "Cliente"} ha sido cargado correctamente.`,
            confirmButtonColor: "#1B3C53",
            timer: 2500,
            showConfirmButton: false
        });

    } catch (error) {
        Swal.fire({
            icon: "error",
            title: "Cliente no encontrado",
            text: "No se encontró información para el número de cédula ingresado.",
            confirmButtonColor: "#d33"
        });
        console.error(error);
    }
});

document.getElementById("btnGuardarGestion").addEventListener("click", async () => {
    const cedula = document.getElementById("clienteCedula").textContent.trim();
    const nombre = document.getElementById("clienteNombre").textContent.trim().toUpperCase();
    const cuenta = document.getElementById("clienteCuenta").textContent.trim();
    const gestion = document.getElementById("textoGestion").value.trim().toUpperCase();
    const maxChars = 250;

    // Validaciones
    if (!gestion) {
        Swal.fire({
            icon: 'warning',
            title: 'Oops...',
            text: 'Debe ingresar una gestión'
        });
        return;
    }

    if (gestion.length > maxChars) {
        Swal.fire({
            icon: 'warning',
            title: 'Límite excedido',
            text: `La gestión no puede superar ${maxChars} caracteres`
        });
        return;
    }

    const token = sessionStorage.getItem("token");
    const usuario_gestion = sessionStorage.getItem("usuario").toUpperCase();

    try {
        const response = await fetch("http://localhost:5000/api/gestion", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ cedula, nombre, cuenta, gestion, usuario_gestion })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Error al guardar la gestión");
        }

        const result = await response.json();

        // Cerrar modal antes del éxito
        const modalElement = document.getElementById('modalCrearGestion');
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) modal.hide();

        Swal.fire({
            icon: 'success',
            title: '¡Éxito!',
            text: `Gestión guardada correctamente. ✅`,
        }).then(() => {
            location.reload();
        });

        // Limpiar input
        document.getElementById("textoGestion").value = '';
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message
        });
        console.error(error);
    }
});


document.getElementById("cedulaInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        document.getElementById("btnBuscarCliente").click();
    }
});

document.addEventListener('DOMContentLoaded', function () {
    const textoGestion = document.getElementById('textoGestion');
    const charCounter = document.querySelector('.char-counter');
    const maxChars = 250;

    if (textoGestion && charCounter) {
        // Contador de caracteres
        textoGestion.addEventListener('input', function () {
            const length = this.value.length;
            charCounter.textContent = `${length}/${maxChars} caracteres`;

            // Cambiar color cuando se aproxime al límite
            if (length > maxChars * 0.9) {
                charCounter.classList.add('text-danger'); // ejemplo: rojo al límite
            } else {
                charCounter.classList.remove('text-danger');
            }

            // Resaltar textarea cuando tenga texto
            if (length > 0) {
                this.classList.add('has-text');
            } else {
                this.classList.remove('has-text');
            }
        });

        // Validar longitud máxima
        textoGestion.addEventListener('keydown', function (e) {
            if (this.value.length >= maxChars && e.key !== 'Backspace' && e.key !== 'Delete' && !e.ctrlKey) {
                e.preventDefault();
            }
        });
    }
});

document.getElementById('modalCrearGestion').addEventListener('hidden.bs.modal', () => {
    // Limpiar inputs
    document.getElementById("cedulaInput").value = "";
    document.getElementById("textoGestion").value = "";

    // Ocultar secciones
    document.getElementById("datosCliente").classList.add("d-none");
    document.getElementById("areaGestion").classList.add("d-none");
    document.getElementById("btnGuardarGestion").classList.add("d-none");

    // Limpiar datos del cliente
    document.getElementById("clienteAgencia").textContent = "";
    document.getElementById("clienteNombre").textContent = "";
    document.getElementById("clienteCedula").textContent = "";
    document.getElementById("clienteCuenta").textContent = "";
    document.getElementById("clienteNomina").textContent = "";
    document.getElementById("clienteValorCastigado").textContent = "";
});
