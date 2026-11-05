// ===============================
// 🟩 PROYECTO: VAO POS MULTIHOJA
// 📍 Google Sheet: javierojedabariloche@gmail.com
// 📍 Claude: javierojedabariloche@gmail.com
// 📍 DeepSeek: javierojedabariloche@gmail.com
// 🌐 URL: https://vaopos-ar-staging.vercel.app/
// 📁 Repo: https://github.com/almacen-copihue/vaopos-staging
// 📊 Planilla ID: 1EacDxrzI2Xix5uRvOKaZdZIYiRlFfv-K9mWGf0KHIzc
// 🔗 API: https://script.google.com/macros/s/AKfycbzlfo16ivECUH-qUkjIllj636bK9uE9GuFBxaddKK3KQT06xnrv1BObwlvFQ_3WvY_f/exec
// 🧩 Arquitectura: 1 planilla, multihojas por cliente
// 🎯 Origen: VAO POS + funciones maduras de Seba21/Copihue
// ⚠️ ESTE ES EL SISTEMA DE PRUEBAS — NO PRODUCCIÓN
// 📅 Última edición: 01/11/2026 (v040.6: el mismo cliente aunque cambien tildes, mayúsculas o espacios (_normCliente_); solo cambia cómo se COMPARA, la planilla no se toca. v040.5: sesión del comercio de 30 días que se renueva con el uso. v040.4: + Historial de cambios del comercio, solo lectura (getCambios). v040.3: corrige la falsa alarma de la cadena de huellas de PAGOS_VAO. Base v040.2: modo manual — Mercado Pago en línea apagado por defecto, reporte de cobros, correcciones y anulaciones)
// ===============================

const SISTEMA = {
  proyecto:      'VAO POS MULTIHOJA',
  entorno:       'staging',
  googlesheet:   'javierojedabariloche@gmail.com',
  claude:        'javierojedabariloche@gmail.com',
  deepseek:      'javierojedabariloche@gmail.com',
  url:           'https://vaopos-ar-staging.vercel.app/',
  repo:          'almacen-copihue/vaopos-staging',
  planillaId:    '1EacDxrzI2Xix5uRvOKaZdZIYiRlFfv-K9mWGf0KHIzc',
  api:           'https://script.google.com/macros/s/AKfycbzlfo16ivECUH-qUkjIllj636bK9uE9GuFBxaddKK3KQT06xnrv1BObwlvFQ_3WvY_f/exec',
  arquitectura:  '1 planilla, multihojas por cliente',
  origen:        'VAO POS + funciones maduras de Seba21/Copihue',
  version:       'v042',
  ultimaEdicion: '05/11/2026'
};

// ===============================
// VAO SmartPOS — Motor API (STAGING)
// ===============================
// Columnas VENDEDORES:  A=Prefijo B=Nombre C=Teléfono D=Correo E=Categoría F=Fecha Alta G=Activo H=Comision% I=Alias Pago J=Link MP K=Notas
// ⚠️  Token MP NO va en Sheets — se guarda en Script Properties (seguro)
//     Para cargar tokens: ejecutar setTokenMP('PREFIJO', 'APP_USR-...')
// Columnas INVENTARIO:  A=Código B=Producto C=Stock D=P.Costo E=P.Venta F=Proveedor G=Categoría H=Relampago I=Destacada J=Especial K=PrecioPromo (v040.4: comentario corregido; antes decía H/I Reservada)
// Columnas VENTAS:      A=Fecha B=Producto C=Cantidad D.P.Venta E=Modo de pago F=Total
// ===============================


// v024: acciones que no pertenecen a un negocio (admin, login, info).
// Todas las demás exigen ?prefijo=XX.
var ACCIONES_SIN_PREFIJO_ = ['getInfo', 'crearVendedor', 'adminLogin', 'clienteLogin', 'cerrarSesionAdmin',
                             'renovarVigencia', 'resetPin', 'getResumenAdmin', 'activarCliente', 'suspenderCliente',
                             // v025: administración de planes y módulos (el prefijo va dentro de data)
                             'getPlanes', 'inicializarPlanes', 'previsualizarPlanes', 'guardarPlan', 'verificarPrefijo',
                             'cambiarPlanCliente', 'getModulosCliente', 'setModuloCliente',
                             'regularizarPrueba', // v028
                             'checkpointModulos', 'sincronizarModulos', 'previsualizarCambioPlan',
                             'checkpointPlanes', 'corregirPlanesFijos', 'agregarPlanPersonalizado', // v029
                             'recuperarCambioPlan', // v030
                             // v031: página pública planes.html (SIN sesión) — solo lectura de planes y registro de PRUEBA
                             'getPlanesPublicos', 'registroSolicitarCodigo', 'registroConfirmar', 'registroEstado',
                             // v031: Admin (con sesión admin)
                             'prepararPreciosPlanes', 'guardarPreciosPlan', 'guardarPromocion',
                             'registrosPanel', 'registrosConfig', 'registroAccion', 'confirmarPagoRecibido',
                             // v033: vigencia de planes pagos (Admin)
                             'estadoVigenciaCliente', 'registrarCortesia', 'regularizarVigencia', 'sincronizarVigencia', 'recuperarPagoEnCurso',
                             // v038: contrato digital — públicas (el prefijo va dentro de data; sin sesión)
                             'getContrato', 'getAnexoC', 'contratoSolicitarCodigo', 'contratoAceptar', 'contratoRechazar', 'getConstancia', 'verificarConstancia',
                             // v038: contrato digital — Admin (con sesión admin)
                             'estadoContratos', 'guardarBorradorContrato', 'publicarContrato', 'verificarIntegridadContratos', 'reenviarComprobante',
                             // v040: pagos (Admin con sesión; mpNotificacion exige el secreto del relay)
                             'cuentasReceptoras', 'estadoPagosVao', 'verificarIntegridadPagos', 'mpConciliarAdmin', 'mpNotificacion', 'estadoCuposPromo', 'mpResolverRetenido',
                             'reporteCobrosVao', 'corregirPagoVao', 'anularPagoVao', 'resolverAnulacionVao',   // v040.2
                             'setCotizacion', 'getOperacionesEnCurso',   // v041 (Admin con sesión)
                             'getEstadoCobro', 'setCobroAvanzado'];   // v042 (Admin con sesión)

// v026: doGet y doPost comparten el MISMO ruteo. POST sirve para pedidos
// largos (un carrito grande no entra en la URL). Los GET de siempre no cambian.
function doGet(e) {
  return _rutearPedido_(e);
}

function doPost(e) {
  var params = {};
  var q = (e && e.parameter) || {};
  Object.keys(q).forEach(function (k) { params[k] = q[k]; });
  var cuerpo = {};
  try { cuerpo = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (err) { return respuestaJSON({ error: 'Pedido POST mal formado' }); }
  if (cuerpo.action)  params.action  = String(cuerpo.action);
  if (cuerpo.prefijo) params.prefijo = String(cuerpo.prefijo);
  if (cuerpo.data !== undefined) params.data = encodeURIComponent(JSON.stringify(cuerpo.data));
  return _rutearPedido_({ parameter: params });
}

function _rutearPedido_(e) {
  e = e || {}; e.parameter = e.parameter || {};
  const action  = e.parameter.action  || '';
  // v024: sin prefijo por defecto (antes caía en 'NE', un negocio real).
  const prefijo = String(e.parameter.prefijo || '').trim().toUpperCase();

  var result;
  try {
    // v024: un 'data' mal formado ahora devuelve error JSON en vez de romper la respuesta.
    const data = e.parameter.data ? JSON.parse(decodeURIComponent(e.parameter.data)) : {};
    var errModulo = null, bloqueoPrueba = null, errEntorno41 = null;
    // v041: esta versión solo atiende la planilla de STAGING (getInfo responde siempre, para poder verificar).
    if      (action !== 'getInfo' && (errEntorno41 = _guardaEntornoV041_())) { result = { success: false, error: errEntorno41, entornoIncorrecto: true, bloqueado: true, definitivo: true }; }
    else if (!prefijo && ACCIONES_SIN_PREFIJO_.indexOf(action) === -1) { result = { error: 'Prefijo requerido' }; }
    // v025: el servidor exige que el módulo esté habilitado (plan + CONFIG_XX)
    else if (Object.prototype.hasOwnProperty.call(MODULO_POR_ACCION_, action) &&
             (errModulo = _verificarModuloAccion_(prefijo, data, MODULO_POR_ACCION_[action]))) { result = { error: errModulo, moduloNoHabilitado: true }; }
    // v028: PRUEBA vencida → escrituras bloqueadas desde el servidor (también por API directa)
    // v036: también plan vencido o negocio suspendido (modo consulta: solo lectura)
    else if (prefijo && ACCIONES_ESCRITURA_.indexOf(action) !== -1 &&
             (bloqueoPrueba = _bloqueoSoloLectura_(prefijo, action, data))) { result = bloqueoPrueba; }
    else if (action === 'getInfo')            { result = getInfo(); }
    // v041: motor único de cobros (fiado, abonos, mixto, monedas, deuda) y gestión de clientes
    else if (action === 'cobrar')             { result = cobrarV041(prefijo, data); }
    else if (action === 'previsualizarCobro') { result = previsualizarCobroV041(prefijo, data); }
    else if (action === 'anularAbono')        { result = anularAbonoV041(prefijo, data); }
    else if (action === 'getDeudaCliente')    { result = getDeudaClienteV041(prefijo, data); }
    else if (action === 'getCaja')            { result = getCajaV041(prefijo, data); }
    else if (action === 'gestionarCliente')   { result = gestionarClienteV041(prefijo, data); }
    else if (action === 'verificarInventario'){ var eI41 = _requiereSesionLectura_(prefijo, data.token || ''); result = eI41 ? { error: eI41 } : verificarInventarioV041(prefijo); }
    else if (action === 'setCotizacion')      { result = setCotizacionV041(data); }
    else if (action === 'getOperacionesEnCurso') { result = getOperacionesEnCursoV041(data); }
    // v042: conexión con las pantallas
    else if (action === 'getFichaCliente')    { result = getFichaClienteV042(prefijo, data); }
    else if (action === 'getEstadoCobro')     { result = getEstadoCobroV042(data); }
    else if (action === 'setCobroAvanzado')   { result = setCobroAvanzadoV042(data); }
    // v038: contrato digital (Etapa 2a). No pasan por módulos, modo consulta ni sesión del POS.
    else if (action === 'getContrato')        { result = getContrato(data); }
    else if (action === 'getAnexoC')          { result = getAnexoC(data); }
    else if (action === 'contratoSolicitarCodigo') { result = contratoSolicitarCodigo(data); }
    else if (action === 'contratoAceptar')    { result = contratoAceptar(data); }
    else if (action === 'contratoRechazar')   { result = contratoRechazar(data); }
    else if (action === 'getConstancia')      { result = getConstancia(data); }
    else if (action === 'verificarConstancia'){ result = verificarConstancia(data); }
    else if (action === 'estadoContratos')    { result = estadoContratos(data); }
    else if (action === 'guardarBorradorContrato') { result = guardarBorradorContrato(data); }
    else if (action === 'publicarContrato')   { result = publicarContrato(data); }
    else if (action === 'verificarIntegridadContratos') { result = verificarIntegridadContratos(data); }
    else if (action === 'reenviarComprobante'){ result = reenviarComprobante(data); }
    else if (action === 'exportarDatos')      { result = exportarDatos(prefijo, data.token || ''); }
    else if (action === 'listarHojasDescargables') { result = listarHojasDescargables(prefijo, data); } // v036
    else if (action === 'descargarHoja')      { result = descargarHoja(prefijo, data); }                // v036
    else if (action === 'regularizarPrueba')  { result = regularizarPrueba(data); }
    else if (action === 'checkpointModulos')  { result = checkpointModulos(data); }
    else if (action === 'sincronizarModulos') { result = sincronizarModulos(data); }
    else if (action === 'previsualizarCambioPlan') { result = previsualizarCambioPlan(data); }
    else if (action === 'checkpointPlanes')   { result = checkpointPlanes(data); }
    else if (action === 'corregirPlanesFijos'){ result = corregirPlanesFijos(data); }
    else if (action === 'agregarPlanPersonalizado') { result = agregarPlanPersonalizado(data); }
    else if (action === 'recuperarCambioPlan') { result = recuperarCambioPlan(data); }
    else if (action === 'getPlanesPublicos')  { result = getPlanesPublicos(data); }
    else if (action === 'registroSolicitarCodigo') { result = registroSolicitarCodigo(data); }
    else if (action === 'registroConfirmar')  { result = registroConfirmar(data); }
    else if (action === 'registroEstado')     { result = registroEstado(data); }
    else if (action === 'prepararPreciosPlanes') { result = prepararPreciosPlanes(data); }
    else if (action === 'guardarPreciosPlan') { result = guardarPreciosPlan(data); }
    else if (action === 'guardarPromocion')   { result = guardarPromocion(data); }
    else if (action === 'registrosPanel')     { result = registrosPanel(data); }
    else if (action === 'registrosConfig')    { result = registrosConfig(data); }
    else if (action === 'registroAccion')     { result = registroAccion(data); }
    else if (action === 'confirmarPagoRecibido') { result = confirmarPagoRecibido(data); }
    else if (action === 'estadoVigenciaCliente') { result = estadoVigenciaCliente(data); }
    else if (action === 'registrarCortesia')  { result = registrarCortesia(data); }
    else if (action === 'regularizarVigencia'){ result = regularizarVigencia(data); }
    else if (action === 'sincronizarVigencia'){ result = sincronizarVigencia(data); }
    else if (action === 'recuperarPagoEnCurso') { result = recuperarPagoEnCurso(data); }
    else if (action === 'cuentasReceptoras')  { result = cuentasReceptoras(data); }      // v040
    else if (action === 'estadoPagosVao')     { result = estadoPagosVao(data); }         // v040
    else if (action === 'estadoCuposPromo')   { result = estadoCuposPromo(data); }       // v040
    else if (action === 'verificarIntegridadPagos') { result = verificarIntegridadPagos(data); } // v040
    else if (action === 'mpConciliarAdmin')   { result = mpConciliarAdmin(data); }       // v040
    else if (action === 'mpResolverRetenido') { result = mpResolverRetenido(data); }     // v040.1
    else if (action === 'reporteCobrosVao')   { result = reporteCobrosVao(data); }       // v040.2
    else if (action === 'corregirPagoVao')    { result = corregirPagoVao(data); }        // v040.2
    else if (action === 'anularPagoVao')      { result = anularPagoVao(data); }          // v040.2
    else if (action === 'resolverAnulacionVao') { result = resolverAnulacionVao(data); } // v040.2
    else if (action === 'mpNotificacion')     { result = mpNotificacion(data); }         // v040 (relay de Vercel)
    else if (action === 'mpCrearOrden')       { result = mpCrearOrden(prefijo, data); }  // v040 (POS, sesión del comercio)
    else if (action === 'mpVerificarOrden')   { result = mpVerificarOrden(prefijo, data); } // v040 (POS, sesión del comercio)
    else if (action === 'verificarOperacion') { result = verificarOperacion(prefijo, data); }
    else if (action === 'getPlanes')          { result = getPlanes(data); }
    else if (action === 'inicializarPlanes')  { result = inicializarPlanes(data); }
    else if (action === 'previsualizarPlanes'){ result = previsualizarPlanes(data); }
    else if (action === 'guardarPlan')        { result = guardarPlan(data); }
    else if (action === 'verificarPrefijo')   { result = verificarPrefijo(data); }
    else if (action === 'cambiarPlanCliente') { result = cambiarPlanCliente(data); }
    else if (action === 'getModulosCliente')  { result = getModulosCliente(data); }
    else if (action === 'setModuloCliente')   { result = setModuloCliente(data); }
    else if (action === 'getVendedores')      { result = getVendedores(prefijo, data.token || ''); }
    else if (action === 'crearVendedor')      { result = crearVendedor(data); }
    else if (action === 'getProductos')       { result = getProductos(prefijo, data.token || ''); }
    else if (action === 'vender')             { result = registrarVenta(data, prefijo); }
    else if (action === 'venderFiado')        { result = venderFiado(data, prefijo); }
    else if (action === 'ingresarMercaderia') { result = ingresarMercaderia(data, prefijo); }
    else if (action === 'ajustarStock')       { result = ajustarStock(data, prefijo); }
    else if (action === 'getEstadisticas')    { result = getEstadisticas(data, prefijo); }
    else if (action === 'getVentas')          { result = getVentas(prefijo, data.token || ''); }
    else if (action === 'getVentasDiarias')   { result = getVentasDiarias(data, prefijo); }
    else if (action === 'getTokenMP')         { result = getTokenMP(prefijo); }
    else if (action === 'adminLogin')         { result = adminLogin(data); }
    else if (action === 'clienteLogin')       { result = clienteLogin(data); }
    else if (action === 'cerrarSesion')       { result = cerrarSesionCliente(prefijo, data.token || ''); }
    else if (action === 'cerrarSesionAdmin')  { result = cerrarSesionAdmin(data.token || ''); }
    else if (action === 'renovarVigencia')    { result = renovarVigenciaCliente(data); }
    else if (action === 'resetPin')           { result = resetPinCliente(data); }
    else if (action === 'getConfig')          { result = getConfig(prefijo, data.token || '', data); }
    else if (action === 'getResumenAdmin')    { result = getResumenAdmin(data.token || ''); }
    else if (action === 'activarCliente')     { result = activarCliente(data); }
    else if (action === 'suspenderCliente')   { result = suspenderCliente(data); }
    else if (action === 'getClientes')        { result = getClientesXX(prefijo, data.token || ''); }
    else if (action === 'getFiados')          { result = listarFiadosXX(prefijo, data.token || ''); }
    else if (action === 'consultarDeuda')     { result = consultarDeudaXX(prefijo, data.token || '', data.telefono || ''); }
    else if (action === 'getFiadosCliente')   { result = listarFiadosClienteXX(prefijo, data); }
    else if (action === 'registrarFiado')     { result = registrarFiadoXX(prefijo, data); }
    else if (action === 'abonarFiado')        { result = abonarFiadoXX(prefijo, data); }
    else if (action === 'cobrarFiado')        { result = cobrarFiadoXX(prefijo, data); }
    else if (action === 'getHistorial')       { result = listarHistorialXX(prefijo, data.token || '', data.limite); }
    else if (action === 'getCambios')         { result = listarCambiosXX(prefijo, data); } // v040.4: Historial de cambios (solo lectura)
    else if (action === 'getPrestamos')       { result = listarPrestamosXX(prefijo, data.token || ''); }
    else if (action === 'registrarPrestamo')  { result = registrarPrestamoXX(prefijo, data); }
    else if (action === 'pagarCuotaPrestamo') { result = pagarCuotaPrestamoXX(prefijo, data); }
    else if (action === 'cancelarPrestamo')   { result = cancelarPrestamoXX(prefijo, data); }
    else if (action === 'registrarMovimientoCaja') { result = registrarMovimientoCajaXX(prefijo, data); }
    else if (action === 'getMovimientosCaja') { result = listarMovimientosCajaXX(prefijo, data.token || '', data); }
    else if (action === 'registrarSalida')    { result = registrarSalidaXX(prefijo, data); }
    else if (action === 'getSalidas')         { result = listarSalidasXX(prefijo, data.token || '', data); }
    else if (action === 'ajusteRapido')       { result = { success: false, definitivo: true, error: 'Acción deshabilitada. Usá ✏️ Ajustar desde el POS.' }; } // v021 (P0-2): endpoint alternativo inseguro cerrado; ajustarProductoXX queda definida pero inalcanzable
    else if (action === 'getOfertas')         { result = getOfertasXX(prefijo, data.token || ''); }
    else if (action === 'getRecienLlegados')  { result = getRecienLlegadosXX(prefijo, data.token || ''); }
    else                                      { result = { error: 'Acción no reconocida: ' + action }; }
  } catch (err) {
    // v041: el detalle técnico va al registro de ejecuciones, no a la pantalla
    Logger.log('Error en ' + action + ' (' + prefijo + '): ' + (err && err.stack || err));
    result = { error: /^No existe hoja/.test(String(err && err.message)) ? MSG41_.sinHoja : (err instanceof SyntaxError ? 'El pedido llegó incompleto. No se registró nada: volvé a intentar.' : MSG41_.falloGeneral),
               detalleTecnico: String(err && err.message || err).slice(0, 300) };   // no se muestra en pantalla; sirve para soporte
  }

  return respuestaJSON(result);
}

// ===============================
// GESTIÓN SEGURA DE TOKENS MP
// Los tokens NUNCA se guardan en Sheets — viven en Script Properties
// ===============================

// Ejecutar manualmente UNA VEZ desde el editor para cargar el token:
// setTokenMP('NE', 'APP_USR-...')
// setTokenMP('VA', 'APP_USR-...')
function setTokenMP(prefijo, token) {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('MP_TOKEN_' + prefijo.toUpperCase(), token);
  Logger.log('Token guardado para ' + prefijo);
}

// Eliminar token de un vendedor
function deleteTokenMP(prefijo) {
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty('MP_TOKEN_' + prefijo.toUpperCase());
  Logger.log('Token eliminado para ' + prefijo);
}

// Ver qué prefijos tienen token cargado (SIN mostrar el token)
function listarTokensConfigurados() {
  var props = PropertiesService.getScriptProperties().getProperties();
  var configurados = [];
  for (var key in props) {
    if (key.startsWith('MP_TOKEN_')) {
      configurados.push(key.replace('MP_TOKEN_', ''));
    }
  }
  Logger.log('Tokens configurados: ' + configurados.join(', '));
  return configurados;
}

// v022 (seguridad): el Access Token de Mercado Pago NUNCA se entrega al navegador.
// La acción se conserva solo por compatibilidad: responde siempre sin token
// y no consulta las propiedades del script.
function getTokenMP(prefijo) {
  return { token: '', configurado: false };
}

// ===============================
// INFO DEL SISTEMA
// Endpoint: ?action=getInfo
// Devuelve los datos del proyecto.
// ===============================
function getInfo() {
  return {
    ok: true,
    sistema: SISTEMA,
    version: SISTEMA.version,
    planillaActiva: (function () { try { return SpreadsheetApp.getActiveSpreadsheet().getId() === V041_PLANILLA_STAGING_ ? 'STAGING (correcta)' : 'OTRA PLANILLA: v041 no atiende'; } catch (e) { return 'sin verificar'; } })(),
    fechaConsulta: new Date().toISOString()
  };
}

// ===============================
// HELPERS COMPARTIDOS (migrados de Copihue)
// ===============================

/**
 * Helper central para armar respuestas JSON en el Web App de GAS.
 * Recibe cualquier objeto JS y devuelve un ContentService.TextOutput
 * con el JSON serializado y el MIME type correcto, listo para
 * retornar desde doGet/doPost.
 */
function respuestaJSON(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * _parseNumeroFlexible
 * Convierte a número cualquier valor que venga de una celda de Google Sheets,
 * sin importar el formato: número real, texto plano, formato argentino
 * ("1.500,50"), con coma decimal ("1,6"), con símbolo de moneda ("$1.500"),
 * vacío, null o undefined. Si no logra interpretar el valor, devuelve 0.
 */
function _parseNumeroFlexible(valor) {
  if (valor === null || valor === undefined || valor === '') return 0;
  if (typeof valor === 'number') return isNaN(valor) ? 0 : valor;
  if (typeof valor !== 'string') return 0;
  var texto = valor.trim();
  if (texto === '') return 0;
  texto = texto.replace(/[^0-9.,-]/g, '');
  if (texto === '' || texto === '-') return 0;
  var tieneComa = texto.indexOf(',') !== -1;
  var tienePunto = texto.indexOf('.') !== -1;
  if (tieneComa && tienePunto) {
    texto = texto.replace(/\./g, '').replace(',', '.');
  } else if (tieneComa) {
    texto = texto.replace(',', '.');
  } else if (tienePunto) {
    var partes = texto.split('.');
    var ultimaParte = partes[partes.length - 1];
    if (partes.length === 2 && ultimaParte.length === 3) {
      texto = texto.replace('.', '');
    }
  }
  var numero = parseFloat(texto);
  return isNaN(numero) ? 0 : numero;
}

/**
 * _esActivoFlag_: normaliza distintos valores de una planilla de
 * Google Sheets para determinar si representan "activo" (true) o no (false).
 * Acepta: true, "SI", "SÍ", "TRUE", "VERDADERO", "X", "1" (sin importar
 * mayúsculas/minúsculas ni espacios al inicio/final). Cualquier otro
 * valor (false, null, undefined, "", otros textos) devuelve false.
 */
function _esActivoFlag_(valor) {
  if (valor === true) return true;
  if (typeof valor !== 'string') return false;
  var normalizado = valor.trim().toUpperCase();
  var valoresActivos = ['SI', 'SÍ', 'TRUE', 'VERDADERO', 'X', '1'];
  return valoresActivos.indexOf(normalizado) !== -1;
}

function getHojaInv(prefijo) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('INVENTARIO_' + prefijo);
  if (!hoja) throw new Error('No existe hoja INVENTARIO_' + prefijo);
  return hoja;
}

function getHojaVentas(prefijo) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('VENTAS_' + prefijo);
  if (!hoja) throw new Error('No existe hoja VENTAS_' + prefijo);
  return hoja;
}

// v024: antes era público y devolvía teléfono, correo, comisión, alias y link
// de TODOS los negocios. Ahora exige la sesión del negocio y devuelve solo el
// suyo, con los datos que usa el POS (nombre, alias, link de pago).
function getVendedores(prefijo, token) {
  var errAcceso = _requiereSesionLectura_(prefijo, token);
  if (errAcceso) return { error: errAcceso, vendedores: [] };

  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('VENDEDORES');
  if (!hoja) throw new Error('No existe hoja VENDEDORES');
  var datos = hoja.getDataRange().getValues();
  var vendedores = [];
  for (var i = 1; i < datos.length; i++) {
    var f = datos[i];
    var pref = f[0] ? String(f[0]).trim().toUpperCase() : '';
    if (!pref || pref !== prefijo) continue;
    // A=Prefijo B=Nombre C=Teléfono D=Correo E=Categoría F=Fecha Alta G=Activo H=Comision% I=Alias Pago J=Link MP K=Notas
    vendedores.push({
      prefijo:   pref,
      nombre:    String(f[1]  || '').trim(),
      activo:    String(f[6]  || '').trim().toLowerCase() === 'si',
      aliasPago: String(f[8]  || '').trim(),
      linkMP:    String(f[9]  || '').trim()
      // tokenMP: NUNCA se devuelve desde getVendedores
    });
  }
  return { vendedores: vendedores };
}

function generarPinAleatorio() {
  // v026: azar de Utilities.getUuid() (antes Math.random). Siempre 6 dígitos.
  var n = parseInt(Utilities.getUuid().replace(/-/g, '').substring(0, 12), 16);
  return String(100000 + (n % 900000));
}

function crearHojaConfigDefault(ss, prefijo, nombre, telefono, correo, aliasPago) {
  var nombreConfig = 'CONFIG_' + prefijo;
  if (ss.getSheetByName(nombreConfig)) return; // ya existe, no se toca

  var hoja = ss.insertSheet(nombreConfig);

  var datos = [
    ['campo', 'valor', 'notas'],
    ['', '', '--- IDENTIDAD ---'],
    ['title', 'Catalogo - ' + nombre, ''],
    ['slogan', '', ''],
    ['nombre_empresa', nombre, ''],
    ['telefono', telefono, ''],
    ['direccion', '', ''],
    ['email', correo, ''],
    ['ciudad', '', ''],
    ['descripcion', '', ''],
    ['logo_url', '', ''],
    ['url_sitio', '', ''],
    ['', '', '--- APARIENCIA ---'],
    ['tema_actual', 'T3', ''],
    ['color_primario', '#1E88E5', 'VAO Blue'],
    ['color_secundario', '#2CCB6F', 'VAO Green'],
    ['color_acento', '#FF9800', 'VAO Sunset'],
    ['', '', '--- PAGOS ---'],
    ['alias_transferencia', aliasPago, ''],
    ['qr_pago', '', ''],
    ['', '', '--- WIFI ---'],
    ['wifi_ssid', '', ''],
    ['wifi_clave', '', ''],
    ['qr_wifi', '', ''],
    ['', '', '--- RECIEN LLEGADOS ---'],
    ['RECIEN_LLEGADOS_PRECIO_MIN', 2000, ''],
    ['RECIEN_LLEGADOS_LIMITE', 60, ''],
    ['RECIEN_LLEGADOS_DIAS', 15, ''],
    ['', '', '--- SEGURIDAD ---'],
    ['PIN', '', 'inerte — el PIN real vive en Script Properties'],
    ['sesion_dias', 7, ''],
    ['intentos_max', 3, ''],
    ['', '', '--- MODULOS BASE (siempre TRUE) ---'],
    ['ventas', 'TRUE', ''],
    ['cobrar', 'TRUE', ''],
    ['ticket_wa', 'TRUE', ''],
    ['buscador', 'TRUE', ''],
    ['', '', '--- PACK 1 (default FALSE, activar manualmente) ---'],
    ['pack1_ingreso', 'FALSE', ''],
    ['pack1_hoy', 'FALSE', ''],
    ['pack1_recargar', 'FALSE', ''],
    ['pack1_notificaciones', 'FALSE', ''],
    ['pack1_info', 'FALSE', ''],
    ['', '', '--- PACK 2 (default FALSE) ---'],
    ['pack2_editor_stock', 'FALSE', ''],
    ['pack2_reportes', 'FALSE', ''],
    ['', '', '--- PACK 3 (default FALSE) ---'],
    ['pack3_editor_categoria', 'FALSE', ''],
    ['pack3_editor_nombre', 'FALSE', ''],
    ['pack3_finanzas', 'FALSE', ''],
    ['', '', '--- EXTRA (default FALSE) ---'],
    ['extra_horarios', 'FALSE', 'requiere CONF_DIARIA_' + prefijo],
    ['extra_ultimas_unidades', 'FALSE', ''],
    ['extra_prestamos', 'FALSE', ''],
    ['extra_retiro_caja', 'FALSE', ''],
    ['extra_retiro_local', 'FALSE', ''],
    ['extra_fiados', 'FALSE', ''],
    ['extra_lista_compras', 'FALSE', ''],
    ['extra_generador_flyer', 'FALSE', ''],
    ['extra_config_ofertas', 'FALSE', ''],
    ['extra_carga_foto', 'FALSE', ''],
    ['extra_herramientas', 'FALSE', ''],
    ['extra_raspadita', 'FALSE', ''],
    ['extra_tragamonedas', 'FALSE', '']
  ];

  hoja.getRange(1, 1, datos.length, 3).setValues(datos);
  var header = hoja.getRange(1, 1, 1, 3);
  header.setBackground('#1E88E5');
  header.setFontColor('#FFFFFF');
  header.setFontWeight('bold');
  hoja.setFrozenRows(1);
}

function crearVendedor(data) {
  // v024: exige sesión admin.
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  // v031: el cuerpo pasó a _altaNegocioSinLock_ (mismas validaciones), para que el
  // alta automática de PRUEBA use exactamente el mismo camino. Acá solo se toma el lock.
  var d0 = String(data.nombre || '').trim();
  if (!d0) return { error: 'Nombre requerido' };
  var lock = LockService.getScriptLock();
  var tieneLock = false;
  try { tieneLock = lock.tryLock(10000); } catch (e) { tieneLock = false; }
  if (!tieneLock) return { error: MSG41_.ocupadoGeneral, ocupado: true };
  try { return _altaNegocioSinLock_(data, { origen: 'ADMIN' }); }
  finally { lock.releaseLock(); }
}

// v031: alta de un negocio. Quien la llama TIENE QUE tener el lock del script.
// La usan crearVendedor (Admin) y el alta automática de PRUEBA (planes.html).
function _altaNegocioSinLock_(data, opciones) {
  opciones = opciones || {};
  // v025: alta completa y segura. Primero se verifica TODO sin escribir nada;
  // si el prefijo choca con cualquier hoja existente (del sistema o de otro
  // negocio), con un negocio registrado o con datos de acceso viejos, se rechaza.
  var d = {
    prefijo:   _normalizarPrefijo_(data.prefijo),
    nombre:    String(data.nombre    || '').trim(),
    contacto:  String(data.contacto  || '').trim(),
    telefono:  String(data.telefono  || '').trim(),
    correo:    String(data.correo    || '').trim().toLowerCase(), // v026: siempre en minúsculas
    aliasPago: String(data.aliasPago || '').trim(),
    linkMP:    String(data.linkMP    || '').trim(),
    tokenMP:   String(data.tokenMP   || '').trim(), // se guarda en Properties, NO en Sheets
    comision:  parseFloat(data.comision) || 0,
    plan:      _normalizarPlan_(data.plan || data.categoria),
    obs:       opciones.obs || ''
  };
  if (!d.nombre) return { error: 'Nombre requerido' };

  {
    var chequeo = _chequearPrefijoDisponible_(d.prefijo);
    if (!chequeo.disponible) {
      return { error: 'No se puede usar el prefijo ' + d.prefijo + ': ' + chequeo.motivos.join(' · '), motivos: chequeo.motivos };
    }
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss.getSheetByName('VENDEDORES')) return { error: 'No existe hoja VENDEDORES' };

    var pl = _leerPlanes_();
    if (!pl.existe) return { error: 'Primero inicializá los planes (Admin → Planes)' };
    var plan = pl.planes[d.plan];
    if (!plan) return { error: 'Plan ' + (d.plan || '(vacío)') + ' no existe' };
    if (!plan.activo) return { error: 'El plan ' + plan.nombre + ' está inactivo' };
    if (plan.contratable === false) return { error: 'El plan ' + plan.nombre + ' todavía no se puede contratar' }; // v031 (PLUS: próximamente)
    // v033: un plan pago se activa SOLO registrando el pago confirmado (💳 Vigencia y pagos), nunca desde el alta.
    if (d.plan !== 'PRUEBA') return { error: 'Los planes pagos se activan registrando el pago confirmado. Dalo de alta como PRUEBA y después registrá el pago en 💳 Vigencia y pagos.', requierePago: true };
    // v029: el alta toma los módulos de PLANES_VAO; si al plan le falta una columna, no se adivina.
    var faltan = MODULOS_IMPLEMENTADOS_.filter(function (m) { return !plan.definidos[m.clave]; }).map(function (m) { return m.nombre; });
    if (faltan.length) return { error: 'PLANES_VAO está incompleto (falta: ' + faltan.join(', ') + '). Completalo en 🧩 Planes antes de dar altas.' };
    d.modulosPlan = plan.modulos;

    if (d.plan === 'PRUEBA') {
      // v028: PRUEBA = 7 días + 3 de gracia, fijos. Sin días manuales ni "sin vencimiento".
      if (!_vacio_(data.diasVigencia) && Number(data.diasVigencia) !== DIAS_PRUEBA_) {
        return { error: 'La prueba dura ' + DIAS_PRUEBA_ + ' días fijos (+ ' + DIAS_GRACIA_PRUEBA_ + ' de gracia): no se pueden elegir otros días.' };
      }
      if (!d.telefono && !d.correo) return { error: 'Para la prueba gratuita hace falta teléfono o correo del negocio.' };
      // v030: sin CLIENTES_VAO no se puede controlar "una prueba por persona" ni guardar el vencimiento.
      if (!SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CLIENTES_VAO')) return { error: 'Falta la hoja CLIENTES_VAO: no se puede dar una prueba gratuita sin registrar su vencimiento.' };
      var yaUso = _pruebaYaUsada_(d.telefono, d.correo);
      if (yaUso) return { error: 'Ese teléfono o correo ya está registrado (' + yaUso + '): la prueba gratuita es una sola vez. Elegí BÁSICO o PRO.' };
      var cp = _calcularPrueba_(new Date());
      d.fechaVence = cp.vence;   // último día de prueba (día 7)
      d.prueba = cp;
      return _crearNegocio_(d);
    }
    // Vigencia: los días que mande Admin; si no manda, los del plan; vacío = sin vencimiento.
    var dias = _enteroOpcional_(data.diasVigencia);
    if (isNaN(dias)) return { error: 'Días de vigencia inválidos' };
    if (dias === null) dias = plan.diasVigencia;
    if (dias) {
      var hoy = new Date();
      d.fechaVence = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias);
    }
    return _crearNegocio_(d);
  }
}

function getProductos(prefijo, token) {
  var errAcceso = _requiereSesionLectura_(prefijo, token);
  if (errAcceso) return { error: errAcceso };

  var inv   = getHojaInv(prefijo);
  var datos = inv.getDataRange().getValues();
  var productos = [];
  for (var i = 1; i < datos.length; i++) {
    var fila   = datos[i];
    var nombre = fila[1] ? String(fila[1]).trim() : '';
    var precio = parseFloat(fila[4]) || 0;
    if (!nombre || precio <= 0) continue;
    productos.push({
      id:       i + 1,
      codigo:   fila[0] ? String(fila[0]).trim() : '',
      name:     nombre.toUpperCase(),
      price:    precio,
      costo:    parseFloat(fila[3]) || 0,
      stock:    parseInt(fila[2])   || 0,
      proveedor:fila[5] ? String(fila[5]).trim() : '',
      category: fila[6] ? String(fila[6]).trim().toUpperCase() : 'GENERAL'
    });
  }
  return { productos: productos };
}

function registrarVenta(data, prefijo) {
  var errAcceso = _requiereSesionValida_(prefijo, data.token || '');
  if (errAcceso) return { error: errAcceso };

  // ETAPA 1 (VentaId): si el POS manda VentaId, tiene que tener el formato
  // que genera el POS. Sin VentaId, la venta sigue exactamente como antes.
  var ventaId = String(data.ventaId || '').trim();
  if (ventaId && !/^VTA_\d{8}-\d{6}-[A-Z0-9]{4}$/.test(ventaId)) {
    return { error: 'VentaId inválido' };
  }

  var lock = LockService.getScriptLock();
  var tieneLock = false;
  try {
    tieneLock = lock.tryLock(10000); // 10s: prudente para el volumen actual, sin colgar el request
  } catch (e) {
    tieneLock = false;
  }
  if (!tieneLock) {
    return { error: MSG41_.ocupadoGeneral, ocupado: true };
  }

  try {
    // ETAPA 1 (VentaId): idempotencia. Dentro del lock: si este VentaId ya
    // está en VENTAS_XX, la venta ya se procesó — no se vuelve a descontar
    // stock ni a escribir filas; se devuelve lo que quedó registrado.
    if (ventaId) {
      var existente = _buscarVentaPorId_(getHojaVentas(prefijo), ventaId);
      if (existente.existe) {
        return {
          success: true,
          yaExistia: true,
          ventaId: ventaId,
          procesados: existente.procesados,
          errores: [],
          bloqueados: []
        };
      }
    }
    return _registrarVentaSinLock_(data, prefijo);
  } finally {
    lock.releaseLock();
  }
}

function _registrarVentaSinLock_(data, prefijo) {
  var inv      = getHojaInv(prefijo);
  var ventas   = getHojaVentas(prefijo);
  var items    = data.items || [];
  var metodo   = (data.metodoPago || 'EFECTIVO').toUpperCase();
  var ahora    = new Date();
  var errores  = [];
  var procesados = [];
  var bloqueados = [];
  var datosInv = inv.getDataRange().getValues();

  // v028: cantidades enteras en rango y precios válidos, antes de escribir.
  var errItems = _errorItemsVenta_(items, _reglasNegocio_(prefijo));
  if (errItems) return { success: false, procesados: [], bloqueados: [], errores: [errItems], validacion: true };

  // ETAPA 4 (P0-1): antes de CUALQUIER escritura, cada fila tiene que seguir
  // siendo el producto que el POS cree (código; nombre solo como respaldo).
  // Si algún ítem no coincide se rechaza la operación completa sin escribir
  // nada. Respuesta success:false SIN 'error' = definitiva para el POS.
  var identidadIncorrecta = [];
  for (var v = 0; v < items.length; v++) {
    var filaV = parseInt(items[v].id);
    if (!filaV || filaV < 2 || filaV > datosInv.length) continue;
    if (!_identidadCoincide_(datosInv[filaV - 1], items[v].codigo, items[v].name)) {
      identidadIncorrecta.push(String(items[v].name || ('id ' + items[v].id)).trim().toUpperCase() +
        ': el inventario cambió — quitalo y volvé a agregarlo');
    }
  }
  if (identidadIncorrecta.length > 0) {
    return { success: false, procesados: [], bloqueados: [], errores: identidadIncorrecta, identidad: true };
  }

  for (var k = 0; k < items.length; k++) {
    var item     = items[k];
    var filaIdx  = parseInt(item.id);
    if (!filaIdx || filaIdx < 2 || filaIdx > datosInv.length) {
      errores.push('Producto no encontrado (id ' + item.id + ')');
      continue;
    }
    var stockActual = parseInt(datosInv[filaIdx-1][2]) || 0;
    var qty         = parseInt(item.qty) || 1;
    var precio      = (item.precioVenta !== undefined && item.precioVenta !== null && item.precioVenta !== '')
      ? parseFloat(item.precioVenta)
      : parseFloat(datosInv[filaIdx-1][4]) || 0;
    var nombre = String(datosInv[filaIdx-1][1]).trim().toUpperCase();

    // BLOQUEO DURO: sin stock no se registra ni se descuenta
    if (stockActual <= 0) {
      bloqueados.push(nombre);
      errores.push(nombre + ': sin stock (venta NO registrada)');
      continue;
    }

    // Stock insuficiente: registra pero avisa
    if (stockActual < qty) {
      errores.push(nombre + ': stock insuficiente (disponible: ' + stockActual + ')');
      qty = stockActual; // vende lo que hay
    }

    // ETAPA 1 (O2): primero la fila de VENTAS, después el stock.
    // Con VentaId se escribe también la columna G; sin VentaId (venta
    // antigua o venderFiado) se escriben las mismas 6 columnas de siempre.
    var uf = ventas.getLastRow() + 1;
    var ventaIdFila = String(data.ventaId || '').trim();
    if (ventaIdFila) {
      ventas.getRange(uf,1,1,7).setValues([[ahora, nombre, qty, precio, metodo, precio*qty, ventaIdFila]]);
    } else {
      ventas.getRange(uf,1,1,6).setValues([[ahora, nombre, qty, precio, metodo, precio*qty]]);
    }
    ventas.getRange(uf,1).setNumberFormat('dd/mm/yyyy hh:mm');
    ventas.getRange(uf,4).setNumberFormat('"$"#,##0');
    ventas.getRange(uf,6).setNumberFormat('"$"#,##0');
    inv.getRange(filaIdx,3).setValue(stockActual - qty);
    datosInv[filaIdx-1][2] = stockActual - qty; // v027: si el mismo producto viene en dos renglones, el segundo parte del stock ya descontado
    procesados.push({ name: nombre, qty: qty, precio: precio });
  }

  var success = procesados.length > 0;
  return {
    success: success,
    procesados: procesados,
    errores: errores,
    bloqueados: bloqueados
  };
}

// ETAPA 1 (VentaId): busca una venta ya registrada por su VentaId en la
// columna G de VENTAS_XX. Solo lectura. Devuelve los ítems en el mismo
// formato que `procesados` de _registrarVentaSinLock_ ({ name, qty, precio }).
function _buscarVentaPorId_(hojaVentas, ventaId) {
  if (!ventaId) return { existe: false, procesados: [] };
  var ultimaFila = hojaVentas.getLastRow();
  if (ultimaFila < 2 || hojaVentas.getMaxColumns() < 7) return { existe: false, procesados: [] };

  var celdas = hojaVentas.getRange(2, 7, ultimaFila - 1, 1)
    .createTextFinder(ventaId)
    .matchEntireCell(true)
    .matchCase(true)
    .findAll();
  if (!celdas.length) return { existe: false, procesados: [] };

  var procesados = [];
  for (var i = 0; i < celdas.length; i++) {
    var fila = hojaVentas.getRange(celdas[i].getRow(), 2, 1, 3).getValues()[0]; // B,C,D
    procesados.push({
      name:   String(fila[0] || '').trim().toUpperCase(),
      qty:    parseInt(fila[1]) || 0,
      precio: parseFloat(fila[2]) || 0
    });
  }
  return { existe: true, procesados: procesados };
}

// ETAPA 4 (P0-1): ¿la fila del inventario sigue siendo el producto esperado?
// v020: con código esperado se exige que coincidan el código Y el nombre
// (detecta tanto filas movidas como un código que quedó fijo mientras el
// producto a su alrededor cambió). Sin código (carritos/operaciones
// anteriores a V16): respaldo solo por nombre. Si no viene ninguno de los
// dos, no se verifica (compatibilidad). Solo lectura.
function _identidadCoincide_(fila, codigoEsperado, nombreEsperado) {
  var codigo = String(codigoEsperado || '').trim().toUpperCase();
  var nombre = String(nombreEsperado || '').trim().toUpperCase();
  if (codigo) {
    if (String(fila[0] || '').trim().toUpperCase() !== codigo) return false;
    if (nombre && String(fila[1] || '').trim().toUpperCase() !== nombre) return false;
    return true;
  }
  if (nombre) return String(fila[1] || '').trim().toUpperCase() === nombre;
  return true;
}

function venderFiado(data, prefijo) {
  var errAcceso = _requiereSesionValida_(prefijo, data.token || '');
  if (errAcceso) return { error: errAcceso };

  var idOperacion = String(data.idOperacion || '').trim();
  if (!idOperacion) return { error: 'No se pudo identificar la operación. No se registró nada: volvé a intentar.' };

  var lock = LockService.getScriptLock();
  var tieneLock = false;
  try { tieneLock = lock.tryLock(10000); } catch (e) { tieneLock = false; }
  if (!tieneLock) return { error: MSG41_.ocupado, ocupado: true };

  try {
    var r41 = venderFiadoV041_(data, prefijo, idOperacion);   // v041: motor único (null = operación vieja: camino v027)
    if (r41) return r41;
    return _venderFiadoSinLock_(data, prefijo, idOperacion);
  } catch (err) {
    // v027: un error a mitad de camino NO borra el registro de la operación.
    // El próximo Confirmar (mismo idOperacion) retoma desde la última etapa segura.
    Logger.log('venderFiado ' + idOperacion + ': ' + (err && err.stack || err));
    return { success: false, enProceso: true, idOperacion: idOperacion,
             error: 'El fiado quedó a medio guardar. Tocá Confirmar de nuevo para terminarlo: no se duplica ni se descuenta stock dos veces.' };
  } finally {
    lock.releaseLock();
  }
}

// =====================================================================
// v027 — VENTA FIADA POR ETAPAS, RECUPERABLE CON EL MISMO idOperacion
// =====================================================================
// Antes (v018–v026): VENTAS y stock se escribían ANTES de guardar el estado
// VENTA_REGISTRADA, y las filas fiadas no tenían VentaId. Un corte en ese
// intervalo dejaba la operación "ambigua" para siempre: nadie podía saber si
// el stock se había descontado.
//
// Ahora, todo bajo el mismo ScriptLock, en este orden:
//   1. INICIADA   — se guarda el PLAN: por cada fila, stock ANTES y DESPUÉS.
//   2. stock      — cada producto se lleva a su valor DESPUÉS (valor fijo, no resta).
//   3. STOCK_OK
//   4. VENTAS     — todas las filas en UNA sola escritura, con el idOperacion en G.
//   5. VENTAS_OK
//   6. FIADOS     — una fila con Ticket = idOperacion.
//   7. fin        — se borra el registro de la operación.
// Recuperación (mismo idOperacion):
//   - Ticket en FIADOS        → ya estaba completo (no se repite nada).
//   - INICIADA                → producto por producto: stock = ANTES → falta;
//                               stock = DESPUÉS → ya se descontó; otro valor →
//                               AMBIGUA (alguien más lo cambió): no se toca y se informa.
//   - Filas con el id en G    → el stock ya estaba descontado (va antes).
//   - STOCK_OK / VENTAS_OK    → sigue desde ahí.
// Operaciones de versiones anteriores (sin plan) se tratan como antes: las
// INICIADA viejas siguen siendo ambiguas (no se reconcilian solas).
function _venderFiadoSinLock_(data, prefijo, idOperacion) {
  var props   = PropertiesService.getScriptProperties();
  var propKey = 'FIADO_OP_' + prefijo + '_' + idOperacion;
  var hojaFiados = getHojaFiados(prefijo);
  var hojaVentas = getHojaVentas(prefijo);

  // R0 — ¿la deuda ya existe? Entonces la operación está completa.
  var filaTicket = _filaTicketFiado_(hojaFiados, idOperacion);
  if (filaTicket) {
    _repararEstadoFiado_(hojaFiados, filaTicket);
    props.deleteProperty(propKey);
    return { success: true, ventaRegistrada: true, fiadoRegistrado: true, yaExistia: true, idOperacion: idOperacion };
  }

  var opStr = props.getProperty(propKey);
  var op = null;
  if (opStr) { try { op = JSON.parse(opStr); } catch (e) { return _fiadoAmbiguo_(idOperacion, ['el registro de la operación está dañado']); } }

  // ── operaciones de versiones anteriores (sin plan): mismo trato que antes ──
  if (op && !op.v) {
    if (op.estado === 'VENTA_REGISTRADA') {
      var rLeg = registrarFiadoXX(prefijo, { token: data.token, cliente: op.cliente, telefono: op.telefono,
        total: op.total, descripcion: op.descripcion, cantItems: op.cantItems, ticket: idOperacion });
      if (rLeg.success) { props.deleteProperty(propKey); return { success: true, ventaRegistrada: true, fiadoRegistrado: true, idOperacion: idOperacion, idFiado: rLeg.idFiado }; }
      return { success: false, ventaRegistrada: true, fiadoRegistrado: false, idOperacion: idOperacion,
               error: 'Venta registrada, fiado pendiente de reconciliar: ' + (rLeg.error || 'error desconocido') };
    }
    return { success: false, ambiguo: true, idOperacion: idOperacion,
             error: 'Operación ambigua, requiere revisión manual antes de reintentar' };
  }

  // ── operación nueva ──
  if (!op) {
    if (_buscarVentaPorId_(hojaVentas, idOperacion).existe) {
      return _fiadoAmbiguo_(idOperacion, ['hay ventas con este número en VENTAS_' + prefijo + ' pero no hay registro de la operación']);
    }
    var cliente  = String(data.cliente  || '').trim();
    var telefono = String(data.telefono || '').trim();
    if (!cliente) return { error: 'Cliente requerido para venta fiada' };

    var datosInv = getHojaInv(prefijo).getDataRange().getValues();
    var items = data.items || [];
    var errItems = _errorItemsVenta_(items, _reglasNegocio_(prefijo)); // v028
    if (errItems) return { success: false, definitivo: true, validacion: true, idOperacion: idOperacion, error: errItems };

    // Identidad (igual que v016): nada escrito si una fila ya no es el producto.
    var identidadIncorrecta = [];
    items.forEach(function (it) {
      var f = parseInt(it.id);
      if (!f || f < 2 || f > datosInv.length) return;
      if (!_identidadCoincide_(datosInv[f - 1], it.codigo, it.name)) identidadIncorrecta.push(String(it.name || ('id ' + it.id)).trim().toUpperCase());
    });
    if (identidadIncorrecta.length) {
      return { success: false, definitivo: true, identidad: true, idOperacion: idOperacion,
               error: 'El inventario cambió: ' + identidadIncorrecta.join(', ') + '. Quitalo y volvé a agregarlo.' };
    }

    // Plan agrupado por fila (si un producto aparece dos veces se suma).
    var porFila = {}, orden = [], faltantes = [];
    items.forEach(function (it) {
      var f = parseInt(it.id);
      if (!f || f < 2 || f > datosInv.length) { faltantes.push('Producto no encontrado (id ' + it.id + ')'); return; }
      var qty = parseInt(it.qty) || 1;
      if (!porFila[f]) {
        var precio = (it.precioVenta !== undefined && it.precioVenta !== null && it.precioVenta !== '') ? parseFloat(it.precioVenta) : (parseFloat(datosInv[f - 1][4]) || 0);
        porFila[f] = { fila: f, codigo: String(datosInv[f - 1][0] || '').trim().toUpperCase(),
                       nombre: String(datosInv[f - 1][1]).trim().toUpperCase(), qty: 0, precio: precio,
                       antes: parseInt(datosInv[f - 1][2]) || 0 };
        orden.push(f);
      }
      porFila[f].qty += qty;
    });
    orden.forEach(function (f) {
      var p = porFila[f];
      if (p.antes < p.qty) faltantes.push(p.nombre + ': stock insuficiente (disponible ' + p.antes + ')');
    });
    if (faltantes.length) return { error: 'Stock insuficiente para venta fiada: ' + faltantes.join(' | ') }; // texto que el POS reconoce (D1)
    if (!orden.length) return { error: 'Stock insuficiente para venta fiada: carrito vacío' };

    op = { v: 27, estado: 'INICIADA', cliente: cliente, telefono: telefono, ts: new Date().getTime(),
           plan: orden.map(function (f) { var p = porFila[f]; p.despues = p.antes - p.qty; return p; }) };
    props.setProperty(propKey, JSON.stringify(op));                       // ETAPA 1
  }

  var guardar = function () { op.ts = new Date().getTime(); props.setProperty(propKey, JSON.stringify(op)); };

  // ── ETAPA 2: stock ──
  if (op.estado === 'INICIADA') {
    if (_buscarVentaPorId_(hojaVentas, idOperacion).existe) {
      op.estado = 'STOCK_OK'; guardar();   // las filas de VENTAS van después del stock: ya estaba descontado
    } else {
      var inv = getHojaInv(prefijo);
      var datos = inv.getDataRange().getValues();
      var pendientes = [], dudas = [];
      op.plan.forEach(function (p) {
        var filaInv = datos[p.fila - 1];
        var mismo = filaInv && String(filaInv[1]).trim().toUpperCase() === p.nombre &&
                    String(filaInv[0] || '').trim().toUpperCase() === p.codigo;
        var actual = filaInv ? (parseInt(filaInv[2]) || 0) : null;
        if (!mismo) dudas.push(p.nombre + ': la fila ' + p.fila + ' ya no es ese producto');
        else if (actual === p.despues) { /* ya descontado */ }
        else if (actual === p.antes) pendientes.push(p);
        else dudas.push(p.nombre + ': stock ' + actual + ' (se esperaba ' + p.antes + ' antes o ' + p.despues + ' después)');
      });
      if (dudas.length) return _fiadoAmbiguo_(idOperacion, dudas);
      pendientes.forEach(function (p) { inv.getRange(p.fila, 3).setValue(p.despues); });
      op.estado = 'STOCK_OK'; guardar();                                 // ETAPA 3
    }
  }

  // ── ETAPA 4: VENTAS (una sola escritura, con el id en G) ──
  if (op.estado === 'STOCK_OK') {
    if (!_buscarVentaPorId_(hojaVentas, idOperacion).existe) {
      var ahora = new Date();
      var filas = op.plan.map(function (p) { return [ahora, p.nombre, p.qty, p.precio, 'FIADO', p.precio * p.qty, idOperacion]; });
      var uf = hojaVentas.getLastRow() + 1;
      hojaVentas.getRange(uf, 1, filas.length, 7).setValues(filas);
      hojaVentas.getRange(uf, 1, filas.length, 1).setNumberFormat('dd/mm/yyyy hh:mm');
      hojaVentas.getRange(uf, 4, filas.length, 1).setNumberFormat('"$"#,##0');
      hojaVentas.getRange(uf, 6, filas.length, 1).setNumberFormat('"$"#,##0');
    }
    op.estado = 'VENTAS_OK'; guardar();                                  // ETAPA 5
  }

  // ── ETAPA 6: la deuda ──
  var total = 0, cant = 0;
  op.plan.forEach(function (p) { total += p.precio * p.qty; cant += p.qty; });
  var descripcion = op.plan.map(function (p) { return p.qty + 'x ' + p.nombre; }).join(', ');
  var rf = registrarFiadoXX(prefijo, { token: data.token, cliente: op.cliente, telefono: op.telefono,
    total: total, descripcion: descripcion, cantItems: cant, ticket: idOperacion });
  if (rf.success) {
    props.deleteProperty(propKey);                                       // ETAPA 7
    return { success: true, ventaRegistrada: true, fiadoRegistrado: true, idOperacion: idOperacion, idFiado: rf.idFiado };
  }
  return { success: false, ventaRegistrada: true, fiadoRegistrado: false, idOperacion: idOperacion,
           error: 'Venta registrada, fiado pendiente de reconciliar: ' + (rf.error || 'error desconocido') };
}

function _filaTicketFiado_(hoja, ticket) {
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) if (String(datos[i][2]) === String(ticket)) return i + 1;
  return 0;
}

// Si se cortó justo después de agregar la fila de la deuda, falta la fórmula de Estado (K).
function _repararEstadoFiado_(hoja, fila) {
  if (String(hoja.getRange(fila, 11).getValue() || '') !== '') return;
  hoja.getRange(fila, 11).setFormula('=IF(D' + fila + '="";"";IF(L' + fila + '<>"";"PAGADO";' +
    'IF(AND(J' + fila + '<>"";TODAY()>J' + fila + ');"VENCIDO";"PENDIENTE")))');
}

function _fiadoAmbiguo_(idOperacion, detalle) {
  return { success: false, ambiguo: true, idOperacion: idOperacion, detalle: detalle,
           error: 'Operación ambigua, requiere revisión manual antes de reintentar: ' + detalle.join(' · ') };
}

// Ejecutar desde el editor: lista operaciones de fiado que quedaron a medias
// (no corrige nada). Sirve para revisar ambiguas.
function listarFiadosEnCurso() {
  var props = PropertiesService.getScriptProperties().getProperties();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var lista = Object.keys(props).filter(function (k) { return k.indexOf('FIADO_OP_') === 0; }).map(function (k) {
    var op = {}; try { op = JSON.parse(props[k]); } catch (e) { op = { estado: 'ILEGIBLE' }; }
    var resto = k.replace('FIADO_OP_', ''), pref = resto.split('_')[0], id = resto.substring(pref.length + 1);
    var h = ss.getSheetByName('FIADOS_' + pref);
    var yaEsta = h ? _filaTicketFiado_(h, id) > 0 : false;
    return resto + ' → ' + (yaEsta ? 'DEUDA YA REGISTRADA (marca sobrante, se borra sola al reintentar) · ' : '') + (op.v ? 'v027 ' : 'anterior ') + (op.estado || '?') +
      (op.cliente ? ' · ' + op.cliente : '') + (op.ts ? ' · ' + new Date(op.ts).toISOString() : '');
  });
  Logger.log(lista.length ? lista.join('\n') : 'No hay fiados en curso');
  return lista;
}

// SEBA21: ingresarMercaderia() escribe siempre en la hoja Historial (11
//   columnas: Fecha,Producto,Cantidad,StockResultante,ID,Proveedor,
//   PrecioCosto,PrecioVenta,FechaVencimiento,IdOperacion,StockAnterior) y
//   usa idOperacion para no duplicar el ingreso si el cliente reintenta.
// VAO MULTIHOJA: mismo comportamiento sobre HISTORIAL_XX, salvo la
//   columna FechaVencimiento.
// MOTIVO: INVENTARIO_XX (creada en pasos anteriores) no tiene columna de
//   fecha de vencimiento — no existe ese dato para trasladar. Se omite
//   la columna en vez de dejarla siempre vacía; se puede agregar el día
//   que INVENTARIO_XX trackee vencimientos, sin tocar lo demás.
// ETAPA 3 — P1: el ingreso participa del MISMO ScriptLock que la venta y el
// fiado (mismo patrón que registrarVenta). Serializa ingreso ↔ venta/fiado/
// ingreso y deja la búsqueda de idOperacion en HISTORIAL_XX dentro del lock
// (dos solicitudes con el mismo ING_… ya no pueden sumar las dos).
// Si no consigue el lock no escribe nada y responde 'ocupado' (POS V14
// conserva el ingreso y reintenta con el mismo idOperacion).
function ingresarMercaderia(data, prefijo) {
  var errAcceso = _requiereSesionValida_(prefijo, data.token || '');
  if (errAcceso) return { error: errAcceso };

  var lock = LockService.getScriptLock();
  var tieneLock = false;
  try {
    tieneLock = lock.tryLock(10000);
  } catch (e) {
    tieneLock = false;
  }
  if (!tieneLock) {
    return { error: MSG41_.ocupadoGeneral, ocupado: true };
  }

  try {
    return _ingresarMercaderiaSinLock_(data, prefijo);
  } finally {
    lock.releaseLock();
  }
}

// Cuerpo original de ingresarMercaderia, sin cambios (salvo la validación
// de sesión, que pasó al envoltorio). Llamar SOLO con el ScriptLock tomado.
function _ingresarMercaderiaSinLock_(data, prefijo) {
  var inv   = getHojaInv(prefijo);
  var hist  = getHojaHistorial(prefijo); // crea la hoja sola si un cliente viejo no la tiene
  var idOp  = String(data.idOperacion || '').trim();

  if (idOp) {
    var existente = _buscarIdOperacionHistorial_(hist, idOp);
    if (existente.existe) {
      return { success: true, yaExistia: true, mensaje: 'La operación ya estaba registrada — no se sumó stock de nuevo.' };
    }
  }

  var nombre   = (data.nombre   || '').trim().toUpperCase();
  var prov     = (data.proveedor || '').trim().toUpperCase();
  var cat      = (data.categoria || 'GENERAL').trim().toUpperCase();

  if (!nombre)       return _rechazoValidacion_('Nombre requerido', 'nombre');

  var datos = inv.getDataRange().getValues();
  var filaExistente = -1;
  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][1]).trim().toUpperCase() === nombre) { filaExistente = i+1; break; }
  }

  // v028: PRIMERO VALIDAR, DESPUÉS ESCRIBIR. Si algo no cumple, no se toca
  // ni el inventario ni el historial.
  var val = _validarIngreso_(data, filaExistente > 0 ? datos[filaExistente-1] : null, _reglasNegocio_(prefijo));
  if (!val.ok) return val;
  var cantidad = val.cantidad;
  var costo    = val.costo || 0;
  var venta    = val.venta || 0;

  var tz = Session.getScriptTimeZone();
  var fechaHist = new Date();

  if (filaExistente > 0) {
    var stockAnterior = parseInt(datos[filaExistente-1][2]) || 0;
    var nuevoStock     = stockAnterior + cantidad;
    var codigoExist    = String(datos[filaExistente-1][0] || '');
    inv.getRange(filaExistente,3).setValue(nuevoStock);
    if (venta > 0) inv.getRange(filaExistente,5).setValue(venta);
    if (costo > 0) inv.getRange(filaExistente,4).setValue(costo);
    if (prov)      inv.getRange(filaExistente,6).setValue(prov);

    hist.appendRow([fechaHist, nombre, cantidad, nuevoStock, codigoExist, prov, costo || '', venta || '', idOp, stockAnterior]);

    return { success: true, mensaje: '📦 Stock actualizado: ' + nombre + ' (+' + cantidad + ')', nuevo: false };
  } else {
    var ultimaFila   = inv.getLastRow() + 1;
    var datosSlice   = datos.slice(1);
    var ultimoCodigo = 0;
    for (var j = 0; j < datosSlice.length; j++) {
      var cod = String(datosSlice[j][0]);
      if (cod.startsWith(prefijo)) {
        var num = parseInt(cod.replace(prefijo,'')) || 0;
        if (num > ultimoCodigo) ultimoCodigo = num;
      }
    }
    var nuevoCodigo = prefijo + String(ultimoCodigo+1).padStart(3,'0');
    inv.getRange(ultimaFila,1,1,7).setValues([[nuevoCodigo, nombre, cantidad, costo, venta, prov, cat]]);

    hist.appendRow([fechaHist, nombre, cantidad, cantidad, nuevoCodigo, prov, costo || '', venta || '', idOp, 0]);

    return { success: true, mensaje: '✅ Nuevo producto: ' + nombre + ' (' + nuevoCodigo + ')', nuevo: true };
  }
}

// v021 (P0-2): el Ajuste participa del MISMO ScriptLock que venta, fiado e
// ingreso (mismo patrón que ingresarMercaderia). La sesión se valida fuera.
function ajustarStock(data, prefijo) {
  var errAcceso = _requiereSesionValida_(prefijo, data.token || '');
  if (errAcceso) return { error: errAcceso };

  var lock = LockService.getScriptLock();
  var tieneLock = false;
  try {
    tieneLock = lock.tryLock(10000);
  } catch (e) {
    tieneLock = false;
  }
  if (!tieneLock) {
    return { error: MSG41_.ocupadoGeneral, ocupado: true };
  }

  try {
    return _ajustarStockSinLock_(data, prefijo);
  } finally {
    lock.releaseLock();
  }
}

// Cuerpo de ajustarStock (v020) sin la validación de sesión, que pasó al
// envoltorio. Llamar SOLO con el ScriptLock tomado.
function _ajustarStockSinLock_(data, prefijo) {
  var inv        = getHojaInv(prefijo);
  var filaIdx    = parseInt(data.id);
  var nuevoStock = parseInt(data.stock);
  var nuevoPrecio= parseFloat(data.precio);
  var nuevoNombre= (data.nombre || '').trim().toUpperCase();
  var nuevoCodigo= (data.codigo || '').trim().toUpperCase();

  if (!filaIdx || filaIdx < 2) return { error: 'ID inválido' };

  // v021 (P0-2): el frontend TIENE que demostrar cuál fue el stock base que
  // vio el cajero. Sin stockOriginal numérico no se escribe nada.
  var so = data.stockOriginal;
  if (so === undefined || so === null || so === '' || isNaN(Number(so))) {
    return { success: false, definitivo: true, actualizarPOS: true,
             error: 'Tu POS está desactualizado. Recargá la página (Ctrl+F5) y volvé a hacer el ajuste.' };
  }
  var stockOriginal = Number(so);

  var filaActual  = inv.getRange(filaIdx, 1, 1, 7).getValues()[0];

  // ETAPA 4 (P0-1): se verifica la identidad ORIGINAL del producto elegido
  // (no los valores nuevos editados) ANTES de modificar cualquier celda.
  if ((data.codigoOriginal || data.nombreOriginal) &&
      !_identidadCoincide_(filaActual, data.codigoOriginal, data.nombreOriginal)) {
    return { success: false, definitivo: true, identidad: true,
             error: 'El producto cambió en el inventario. Recargá y volvé a elegirlo.' };
  }

  // v028: validar antes de escribir (stock entero en rango, precio vs costo, cambios grandes).
  var val28 = _validarAjuste_(data, filaActual, _reglasNegocio_(prefijo));
  if (!val28.ok) return val28;
  nuevoPrecio = val28.cambiaPrecio ? val28.nuevoPrecio : NaN;

  var nombreAntes = String(filaActual[1] || '').trim();
  var stockAntes  = Number(filaActual[2]) || 0;
  var precioAntes = Number(filaActual[4]) || 0;
  var catAntes    = String(filaActual[6] || '').trim();

  // v021 (P0-2): semántica ABSOLUTA. Si el stock solicitado es igual al
  // original, el usuario NO tocó el stock → no se escribe (se conserva el
  // real). Si lo cambió y la hoja ya no tiene el stock que vio → rechazo
  // definitivo, cero escrituras.
  var cambiaStock = !isNaN(nuevoStock) && nuevoStock >= 0 && nuevoStock !== stockOriginal;
  if (cambiaStock && stockAntes !== stockOriginal) {
    return { success: false, definitivo: true, stockCambio: true, stock: stockAntes,
             error: 'El stock cambió (ahora ' + stockAntes + '). Volvé a elegir el producto y ajustá de nuevo.' };
  }

  if (cambiaStock) inv.getRange(filaIdx,3).setValue(nuevoStock);
  if (!isNaN(nuevoPrecio)  && nuevoPrecio >  0) inv.getRange(filaIdx,5).setValue(nuevoPrecio);
  if (nuevoNombre) inv.getRange(filaIdx,2).setValue(nuevoNombre);
  if (nuevoCodigo) inv.getRange(filaIdx,1).setValue(nuevoCodigo);

  var stockDespues  = cambiaStock ? nuevoStock : stockAntes; // v021: lo que REALMENTE quedó
  var precioDespues = (!isNaN(nuevoPrecio) && nuevoPrecio >  0) ? nuevoPrecio : precioAntes;
  var nombreDespues = nuevoNombre ? nuevoNombre : nombreAntes;

  _registrarAuditoriaAjusteXX_(prefijo, {
    producto:     nombreAntes,
    nombreAntes:  nombreAntes,  nombreDespues:  nombreDespues,
    stockAntes:   stockAntes,   stockDespues:   stockDespues,
    precioAntes:  precioAntes,  precioDespues:  precioDespues,
    catAntes:     catAntes,     catDespues:     catAntes,
    usuario:      data.usuario
  });

  return { success: true, mensaje: 'Producto actualizado', stock: stockDespues };
}

function getEstadisticas(data, prefijo) {
  var errAcceso = _requiereSesionLectura_(prefijo, data.token || '');
  if (errAcceso) return { error: errAcceso };

  var ventas     = getHojaVentas(prefijo);
  var filas      = ventas.getDataRange().getValues();
  var hoy        = new Date();
  var hoyStr     = Utilities.formatDate(hoy, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var mesActual  = hoy.getMonth();
  var anioActual = hoy.getFullYear();
  var resHoy = {}, resMes = {}, resProductos = {}, resMeses = {};
  var ventasHoy = 0, ventasMes = 0;

  for (var i = 1; i < filas.length; i++) {
    var fila  = filas[i];
    var fecha = fila[0];
    if (!fecha || !(fecha instanceof Date)) continue;
    var nombre   = String(fila[1]||'').trim().toUpperCase();
    var qty      = parseFloat(fila[2])||0;
    var total    = parseFloat(fila[5])||0;
    var metodo   = String(fila[4]||'EFECTIVO').trim().toUpperCase();
    var fechaStr = Utilities.formatDate(fecha, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var mesStr   = Utilities.formatDate(fecha, Session.getScriptTimeZone(), 'yyyy-MM');
    var esMes    = fecha.getMonth()===mesActual && fecha.getFullYear()===anioActual;

    if (fechaStr===hoyStr) { resHoy[metodo]=(resHoy[metodo]||0)+total; ventasHoy+=total; }
    if (esMes)             { resMes[metodo]=(resMes[metodo]||0)+total; ventasMes+=total; }
    resMeses[mesStr]=(resMeses[mesStr]||0)+total;
    if (esMes && nombre) {
      if (!resProductos[nombre]) resProductos[nombre]={qty:0,total:0};
      resProductos[nombre].qty+=qty; resProductos[nombre].total+=total;
    }
  }

  var topProductos = [];
  var entries = Object.keys(resProductos).map(function(k){ return [k, resProductos[k]]; });
  entries.sort(function(a,b){ return b[1].total-a[1].total; });
  for (var t = 0; t < Math.min(10, entries.length); t++) {
    topProductos.push({ nombre:entries[t][0], qty:entries[t][1].qty, total:entries[t][1].total });
  }

  var histMeses = [];
  var mEntries = Object.keys(resMeses).sort();
  for (var m = 0; m < mEntries.length; m++) {
    histMeses.push({ mes:mEntries[m], total:resMeses[mEntries[m]] });
  }

  return { hoy:{metodos:resHoy,total:ventasHoy}, mes:{metodos:resMes,total:ventasMes}, topProductos:topProductos, histMeses:histMeses };
}

function getVentasDiarias(data, prefijo) {
  // v024: exigía nada; ahora exige la sesión del negocio, igual que getVentas.
  var errAcceso = _requiereSesionLectura_(prefijo, data.token || '');
  if (errAcceso) return { error: errAcceso };
  var ventas = getHojaVentas(prefijo);
  var anio   = parseInt(data.anio) || new Date().getFullYear();
  var mes    = parseInt(data.mes);
  var filas  = ventas.getDataRange().getValues();
  var dias   = {};
  var metodosArr = [];

  for (var i = 1; i < filas.length; i++) {
    var fila  = filas[i];
    var fecha = fila[0];
    if (!fecha || !(fecha instanceof Date)) continue;
    if (fecha.getFullYear() !== anio) continue;
    if (!isNaN(mes) && fecha.getMonth() !== mes) continue;
    var dia    = fecha.getDate();
    var metodo = String(fila[4]||'EFECTIVO').trim().toUpperCase();
    var total  = parseFloat(fila[5])||0;
    if (!dias[dia]) dias[dia]={};
    dias[dia][metodo]=(dias[dia][metodo]||0)+total;
    if (metodosArr.indexOf(metodo)===-1) metodosArr.push(metodo);
  }
  return { dias:dias, metodos:metodosArr.sort(), anio:anio, mes:isNaN(mes)?-1:mes };
}

function getVentas(prefijo, token) {
  var errAcceso = _requiereSesionLectura_(prefijo, token);
  if (errAcceso) return { error: errAcceso };

  var ventas  = getHojaVentas(prefijo);
  var filas   = ventas.getDataRange().getValues();
  var tz      = Session.getScriptTimeZone();
  var resultado = [];
  for (var i = 1; i < filas.length; i++) {
    var fila  = filas[i];
    var fecha = fila[0];
    if (!fecha || !(fecha instanceof Date)) continue;
    resultado.push({
      fecha:  Utilities.formatDate(fecha, tz, 'yyyy-MM-dd'),
      hora:   Utilities.formatDate(fecha, tz, 'HH:mm'),
      nombre: String(fila[1]||'').trim().toUpperCase(),
      qty:    parseFloat(fila[2])||0,
      precio: parseFloat(fila[3])||0,
      metodo: String(fila[4]||'EFECTIVO').trim().toUpperCase(),
      total:  parseFloat(fila[5])||0,
      ventaId: String(fila[6]||'').trim() // v023: identidad de la venta (vacío en ventas viejas y fiados)
    });
  }
  return { ventas: resultado };
}

// ===============================
// MÓDULO AUTH — VAO SmartPOS
// Gestión segura de acceso admin y PIN de clientes
// Tokens y PINs NUNCA en Sheets — solo en Script Properties
// ===============================

// ── HELPERS ──────────────────────────────────────────────────────

function generarToken(largo) {
  // v026: azar de Utilities.getUuid() (antes Math.random, predecible).
  var token = '';
  while (token.length < (largo || 32)) token += Utilities.getUuid().replace(/-/g, '');
  return token.substring(0, largo || 32);
}

function hashSimple(texto) {
  // Hash básico para no guardar PINs en texto plano en Properties
  // No es criptográfico pero es suficiente para este sistema
  var hash = 0;
  var sal  = 'VAO2026';
  var str  = sal + texto + sal;
  for (var i = 0; i < str.length; i++) {
    var char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'H' + Math.abs(hash).toString(36).toUpperCase();
}

// ── ADMIN — CLAVE MAESTRA ─────────────────────────────────────────

// v024: la clave ya NO se escribe en el código.
// Procedimiento para cambiarla:
//   1) Configuración del proyecto → Propiedades del script → agregar
//      ADMIN_CLAVE_NUEVA con la clave nueva (mínimo 6 caracteres).
//   2) Ejecutar generarClaveAdmin(). Guarda el hash y BORRA ADMIN_CLAVE_NUEVA.
// La clave vigente sigue funcionando hasta que se haga este procedimiento.
function generarClaveAdmin() {
  var props = PropertiesService.getScriptProperties();
  var clave = String(props.getProperty('ADMIN_CLAVE_NUEVA') || '').trim();

  if (!clave) {
    Logger.log('ERROR: falta la propiedad ADMIN_CLAVE_NUEVA — no se cambió nada');
    return;
  }
  if (clave.length < 6) {
    props.deleteProperty('ADMIN_CLAVE_NUEVA');
    Logger.log('ERROR: La clave debe tener al menos 6 caracteres — no se cambió nada');
    return;
  }

  props.setProperty('ADMIN_CLAVE_HASH', _hashFuerte_(clave, 'ADMIN')); // v026: SHA-256
  props.deleteProperty('ADMIN_CLAVE_NUEVA');
  props.deleteProperty('LOGIN_FALLOS_ADMIN');

  Logger.log('✅ Clave admin configurada correctamente');
}

function _test1_ping() {
  Logger.log('ping ok');
}


function adminLogin(data) {
  var clave = (data.clave || '').trim();
  if (!clave) return { error: 'Clave requerida' };

  var props     = PropertiesService.getScriptProperties();
  var claveHash = props.getProperty('ADMIN_CLAVE_HASH');

  if (!claveHash) return { error: 'Sistema no configurado — ejecutar generarClaveAdmin() primero' };
  // v026: límite de intentos + hash SHA-256 (las claves viejas se migran solas al entrar bien).
  var bloqueoA = _loginBloqueado_('ADMIN');
  if (bloqueoA) return { error: 'Demasiados intentos fallidos. Probá de nuevo en ' + bloqueoA + ' minuto' + (bloqueoA === 1 ? '' : 's') + '.', bloqueado: true };
  if (!_hashCoincide_(clave, claveHash, 'ADMIN')) { _registrarFalloLogin_('ADMIN', 5); return { error: 'Clave incorrecta' }; }
  _limpiarFallosLogin_('ADMIN');
  if (claveHash.indexOf('S2$') !== 0) props.setProperty('ADMIN_CLAVE_HASH', _hashFuerte_(clave, 'ADMIN'));

  // Token de sesión admin — nace con 10 minutos de vigencia; se renueva
  // otros 10 minutos en cada acción válida (ver validarSesionAdmin).
  var token  = 'ADMIN_' + generarToken(24);
  var expira = new Date().getTime() + (10 * 60 * 1000);
  var ahora  = new Date().getTime();

  // Retirar la clave vieja de un solo admin global (migración, sin función
  // manual aparte) y limpiar sesiones admin vencidas de cualquier dispositivo,
  // sin tocar las que todavía están vigentes.
  props.deleteProperty('SESSION_ADMIN');
  var prefKey = 'SESSION_ADMIN_';
  var todas = props.getProperties();
  for (var key in todas) {
    if (key.indexOf(prefKey) !== 0) continue;
    try {
      var s = JSON.parse(todas[key]);
      if (!s.expira || ahora > s.expira) props.deleteProperty(key);
    } catch (e) { props.deleteProperty(key); }
  }

  props.setProperty('SESSION_ADMIN_' + token, JSON.stringify({ token: token, expira: expira }));

  Logger.log('✅ Login admin exitoso');
  return { success: true, token: token, expira: expira };
}

function validarSesionAdmin(token) {
  if (!token || !token.startsWith('ADMIN_')) return false;
  var props    = PropertiesService.getScriptProperties();
  var sesionStr= props.getProperty('SESSION_ADMIN_' + token);
  if (!sesionStr) return false;
  try {
    var sesion = JSON.parse(sesionStr);
    if (sesion.token !== token) return false;
    if (new Date().getTime() > sesion.expira) {
      props.deleteProperty('SESSION_ADMIN_' + token);
      return false;
    }
    // Actividad válida: renovar únicamente esta sesión otros 10 minutos.
    var nuevaExpira = new Date().getTime() + (10 * 60 * 1000);
    props.setProperty('SESSION_ADMIN_' + token, JSON.stringify({ token: token, expira: nuevaExpira }));
    return true;
  } catch(e) { return false; }
}

// ── PIN DE CLIENTES ───────────────────────────────────────────────

// Ejecutar desde el editor para cargar el PIN de un cliente:
// setPIN('MC', '1234')
function setPIN(prefijo, pin) {
  prefijo = (prefijo || '').trim().toUpperCase();
  pin     = (pin || '').trim();
  if (!prefijo) { Logger.log('ERROR: Prefijo requerido'); return; }
  if (!pin || pin.length < 4) { Logger.log('ERROR: PIN debe tener al menos 4 caracteres'); return; }

  var props = PropertiesService.getScriptProperties();
  props.setProperty('PIN_' + prefijo, _hashFuerte_(pin, prefijo)); // v026: SHA-256

  // Actualizar estado en hoja CLIENTES_VAO si existe
  actualizarEstadoCliente(prefijo, 'PIN', 'CONFIGURADO ✅');

  Logger.log('✅ PIN configurado para ' + prefijo);
}

function eliminarPIN(prefijo) {
  prefijo = (prefijo || '').trim().toUpperCase();
  PropertiesService.getScriptProperties().deleteProperty('PIN_' + prefijo);
  actualizarEstadoCliente(prefijo, 'PIN', 'PENDIENTE ⚠️');
  Logger.log('🗑️ PIN eliminado para ' + prefijo);
}


// ── VIGENCIA COMERCIAL (V8) ─────────────────────────────────────────
// Candado independiente de la suspensión manual. Lee exclusivamente
// CLIENTES_VAO, columna I (Fecha Vence). No toca VENDEDORES, no toca
// CONFIG_XX, no apaga switches, no crea hojas ni columnas.
// Regla: Fecha Vence vacía o futura o == hoy → VIGENTE (comparación por
// fecha calendario, no por hora). Fecha Vence anterior a hoy → VENCIDO.
function _obtenerVigenciaCliente_(prefijo) {
  // v028: PRUEBA regularizada → se puede entrar y consultar siempre; las
  // escrituras las frena el ruteo cuando está VENCIDA.
  var ep28 = _estadoPrueba_(prefijo);
  if (ep28 && ep28.regularizada) return { vigente: true, fechaVence: ep28.vence, enTolerancia: ep28.estado === 'GRACIA', revisar: '', prueba: ep28 };
  // v025: + tolerancia del plan y fechas ilegibles. Nunca suspende por un dato
  // dudoso: si la fecha no se puede leer, deja entrar y marca "revisar".
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('CLIENTES_VAO');
  if (!hoja) return { vigente: true, fechaVence: null };

  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][0]).trim().toUpperCase() === prefijo) {
      var pl   = _leerPlanes_();
      var plan = pl.existe ? pl.planes[_normalizarPlan_(datos[i][5])] : null;
      var fechaVenceRaw = datos[i][8]; // I = Fecha Vence
      if (!fechaVenceRaw) {
        var codV = _normalizarPlan_(datos[i][5]);
        return { vigente: true, fechaVence: null,   // v033: NO se bloquea; solo se avisa
                 revisar: (codV && codV !== 'PRUEBA') ? 'PENDIENTE DE REGULARIZAR: plan pago sin vencimiento'
                        : ((plan && plan.diasVigencia) ? 'Sin fecha de vencimiento (su plan tiene duración)' : '') };
      }
      var fv = (fechaVenceRaw instanceof Date) ? fechaVenceRaw : new Date(fechaVenceRaw);
      if (isNaN(fv.getTime())) {
        return { vigente: true, fechaVence: null, revisar: 'Fecha de vencimiento ilegible: ' + fechaVenceRaw };
      }
      var hoy    = new Date();
      var hoyDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
      var venceDia = new Date(fv.getFullYear(), fv.getMonth(), fv.getDate());
      var tolerancia = plan ? (plan.diasTolerancia || 0) : 0;
      var limite = new Date(venceDia.getFullYear(), venceDia.getMonth(), venceDia.getDate() + tolerancia);
      var vigente = hoyDia <= limite;
      return { vigente: vigente, fechaVence: fv, enTolerancia: vigente && hoyDia > venceDia,
               diasTolerancia: tolerancia, revisar: '' };
    }
  }
  return { vigente: true, fechaVence: null };
}

function clienteLogin(data) {
  var prefijo = (data.prefijo || '').trim().toUpperCase();
  var pin     = (data.pin     || '').trim();

  if (!prefijo) return { error: 'Prefijo requerido' };
  if (!pin)     return { error: 'PIN requerido' };

  // Verificar que el cliente existe y está activo
  var infoCliente = obtenerInfoCliente(prefijo);
  if (!infoCliente)            return { error: 'Cliente no encontrado' };
  // v036: con modoConsulta:true (POS V25) un negocio suspendido o vencido entra en SOLO LECTURA,
  // con el mismo PIN y el mismo bloqueo por intentos. Sin el indicador (POS anterior), igual que antes.
  var consulta = _motivoSoloLectura_(prefijo, infoCliente);
  if (consulta && data.modoConsulta !== true) {
    if (!infoCliente.activo) return { error: 'Cliente inactivo — contactar a VAO Sistemas' };
    return { error: 'Suscripción vencida — contactar a VAO Sistemas' };
  }

  // Validar PIN
  var props   = PropertiesService.getScriptProperties();
  var pinHash = props.getProperty('PIN_' + prefijo);
  if (!pinHash) return { error: 'Acceso no configurado — contactar a VAO Sistemas' };
  // v026: límite de intentos por negocio (CONFIG_XX intentos_max, mínimo 3,
  // 5 si no está) y hash SHA-256 con migración automática del PIN viejo.
  var bloqueo = _loginBloqueado_(prefijo);
  if (bloqueo) return { error: 'Demasiados intentos fallidos. Probá de nuevo en ' + bloqueo + ' minuto' + (bloqueo === 1 ? '' : 's') + '.', bloqueado: true };
  if (!_hashCoincide_(pin, pinHash, prefijo)) {
    _registrarFalloLogin_(prefijo, _intentosMaxNegocio_(prefijo));
    return { error: 'PIN incorrecto' };
  }
  _limpiarFallosLogin_(prefijo);
  if (pinHash.indexOf('S2$') !== 0) props.setProperty('PIN_' + prefijo, _hashFuerte_(pin, prefijo));

  // v040.5: sesión cliente de SESION_CLIENTE_DIAS_ días, renovable con el uso (antes: 7 días fijos)
  var token  = 'CLI_' + prefijo + '_' + generarToken(20);
  var expira = new Date().getTime() + SESION_CLIENTE_DIAS_ * 86400000;
  var ahora  = new Date().getTime();

  // Limpiar sesiones vencidas del mismo prefijo antes de agregar la nueva
  var prefKey = 'SESSION_' + prefijo + '_';
  var todas = props.getProperties();
  for (var key in todas) {
    if (key.indexOf(prefKey) !== 0) continue;
    try {
      var s = JSON.parse(todas[key]);
      if (!s.expira || ahora > s.expira) props.deleteProperty(key);
    } catch (e) { props.deleteProperty(key); }
  }

  props.setProperty('SESSION_' + prefijo + '_' + token, JSON.stringify({ token: token, expira: expira }));

  Logger.log('✅ Login exitoso: ' + prefijo);
  return {
    success: true,
    token:   token,
    expira:  expira,
    prefijo: prefijo,
    nombre:  infoCliente.nombre,
    modoConsulta: consulta || undefined   // v036
  };
}

function validarSesionCliente(prefijo, token) {
  if (!prefijo || !token) return false;
  if (!token.startsWith('CLI_' + prefijo + '_')) return false;

  var props    = PropertiesService.getScriptProperties();
  var sesionStr= props.getProperty('SESSION_' + prefijo + '_' + token);
  if (!sesionStr) return false;

  try {
    var sesion = JSON.parse(sesionStr);
    if (sesion.token !== token) return false;
    var ahora = new Date().getTime();
    if (ahora > sesion.expira) {
      props.deleteProperty('SESSION_' + prefijo + '_' + token);
      return false;
    }
    // v040.5: renovación con el uso. Se reescribe como mucho una vez por día (cuando ya pasó ≥ 1 día
    // desde la última renovación), así una venta no escribe propiedades de más. Reset PIN y Salir la siguen cerrando.
    if (sesion.expira - ahora < (SESION_CLIENTE_DIAS_ - 1) * 86400000) {
      try { props.setProperty('SESSION_' + prefijo + '_' + token, JSON.stringify({ token: token, expira: ahora + SESION_CLIENTE_DIAS_ * 86400000 })); } catch (e2) {}
    }
    return true;
  } catch(e) { return false; }
}
var SESION_CLIENTE_DIAS_ = 30; // v040.5

function cerrarSesionCliente(prefijo, token) {
  prefijo = (prefijo || '').trim().toUpperCase();
  token   = (token || '').trim();
  if (prefijo && token) {
    PropertiesService.getScriptProperties().deleteProperty('SESSION_' + prefijo + '_' + token);
  }
  return { success: true };
}

// Con la sesión ya scopeada por token en el propio nombre de la clave,
// no hace falta leer/comparar antes de borrar: si el token es incorrecto
// o viejo, esa clave puntual simplemente no existe, y el delete no afecta
// a ninguna otra sesión admin.
function cerrarSesionAdmin(token) {
  token = (token || '').trim();
  if (token) {
    PropertiesService.getScriptProperties().deleteProperty('SESSION_ADMIN_' + token);
  }
  return { success: true };
}

// ── HELPERS INTERNOS ──────────────────────────────────────────────

function obtenerInfoCliente(prefijo) {
  // Busca en VENDEDORES (planilla del sistema)
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('VENDEDORES');
  if (!hoja) return null;
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    var f = datos[i];
    if (String(f[0]).trim().toUpperCase() === prefijo) {
      return {
        prefijo: prefijo,
        nombre:  String(f[1] || '').trim(),
        activo:  String(f[6] || '').trim().toLowerCase() === 'si'
      };
    }
  }
  return null;
}

function actualizarEstadoCliente(prefijo, campo, valor) {
  // Actualiza columna L (Token MP) o M (PIN) en CLIENTES_VAO si existe
  try {
    var ss   = SpreadsheetApp.getActiveSpreadsheet();
    var hoja = ss.getSheetByName('CLIENTES_VAO');
    if (!hoja) return;
    var datos = hoja.getDataRange().getValues();
    var colMap = { 'TOKEN': 12, 'PIN': 13 }; // L=12, M=13
    var col = colMap[campo.toUpperCase()];
    if (!col) return;
    for (var i = 1; i < datos.length; i++) {
      if (String(datos[i][0]).trim().toUpperCase() === prefijo) {
        hoja.getRange(i+1, col).setValue(valor);
        return;
      }
    }
  } catch(e) { Logger.log('actualizarEstadoCliente: ' + e.message); }
}

// ── SINCRONIZACIÓN CLIENTES_VAO ↔ VENDEDORES ───────────────────────
// Fuente de verdad decidida (auditoría 2026-09-18):
//  - VENDEDORES.Activo (col G, si/no) sigue siendo el gate técnico de login
//    (lo usa obtenerInfoCliente/clienteLogin, NO SE TOCA en este paso).
//  - CLIENTES_VAO.Estado (ACTIVO/SUSPENDIDO/BAJA) es la vista comercial/admin.
//  - A partir de ahora ambas se mantienen sincronizadas: crearVendedor()
//    crea la fila en las dos hojas, y activarCliente/suspenderCliente
//    actualizan las dos en la misma operación.
// Columnas CLIENTES_VAO: A=Prefijo B=Nombre Negocio C=Contacto D=Teléfono
//  E=Correo F=Plan G=Estado H=Fecha Alta I=Fecha Vence J=Alias Pago
//  K=Link MP L=Token MP M=PIN N=Observaciones

// Crea la fila comercial en CLIENTES_VAO al dar de alta un cliente nuevo.
// Fecha Vence: no hay una regla de plazo definida en la especificación
// (días de prueba, vencimiento de plan, etc.) → se deja vacía a propósito,
// REQUIERE DECISIÓN. No se inventa un plazo.
function crearFilaClientesVao(prefijo, nombre, telefono, correo, plan, aliasPago, linkMP, tieneTokenMP) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('CLIENTES_VAO');
  if (!hoja) { Logger.log('crearFilaClientesVao: no existe hoja CLIENTES_VAO'); return; }

  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][0]).trim().toUpperCase() === prefijo) return; // ya existe, no duplicar
  }

  var ultimaFila = hoja.getLastRow() + 1;
  hoja.getRange(ultimaFila, 1, 1, 14).setValues([[
    prefijo,                 // A Prefijo
    nombre,                  // B Nombre Negocio
    '',                      // C Contacto (nombre del dueño — no llega en el alta actual)
    telefono,                // D Teléfono
    correo,                  // E Correo
    plan || '',              // F Plan
    'ACTIVO',                // G Estado
    new Date(),               // H Fecha Alta
    '',                       // I Fecha Vence — REQUIERE DECISIÓN, se deja vacía
    aliasPago,                // J Alias Pago
    linkMP,                   // K Link MP
    tieneTokenMP ? 'CONFIGURADO ✅' : 'PENDIENTE ⚠️', // L Token MP
    'CONFIGURADO ✅',         // M PIN (crearVendedor siempre genera uno)
    ''                        // N Observaciones
  ]]);
}

// Endpoint admin — activa un cliente: VENDEDORES.Activo='si' + CLIENTES_VAO.Estado='ACTIVO'
function activarCliente(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  var prefijo = (data.prefijo || '').trim().toUpperCase();
  if (!prefijo) return { error: 'Prefijo requerido' };

  var ok = _setActivoVendedor(prefijo, 'si');
  if (!ok) return { error: 'Cliente no encontrado en VENDEDORES' };
  _setEstadoClientesVao(prefijo, 'ACTIVO');

  return { success: true, mensaje: '✅ Cliente ' + prefijo + ' activado' };
}

// Endpoint admin — suspende un cliente: VENDEDORES.Activo='no' + CLIENTES_VAO.Estado='SUSPENDIDO'
// No borra ni toca PIN/Token — solo el estado. El login queda bloqueado porque
// clienteLogin() exige infoCliente.activo (ya usa esta misma columna).
function suspenderCliente(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  var prefijo = (data.prefijo || '').trim().toUpperCase();
  if (!prefijo) return { error: 'Prefijo requerido' };

  var ok = _setActivoVendedor(prefijo, 'no');
  if (!ok) return { error: 'Cliente no encontrado en VENDEDORES' };
  _setEstadoClientesVao(prefijo, 'SUSPENDIDO');

  return { success: true, mensaje: '🔒 Cliente ' + prefijo + ' suspendido' };
}

// Endpoint admin — resetea el PIN de un cliente generando uno nuevo.
// Reutiliza generarPinAleatorio() y setPIN() tal cual existen, sin
// modificarlas. No toca sesiones existentes (setPIN nunca tocó
// SESSION_<prefijo>_<token>, y esta función tampoco lo hace).
function resetPinCliente(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  var prefijo = (data.prefijo || '').trim().toUpperCase();
  if (!prefijo) return { error: 'Prefijo requerido' };

  var infoCliente = obtenerInfoCliente(prefijo);
  if (!infoCliente) return { error: 'Cliente no encontrado en VENDEDORES' };

  var nuevoPin = generarPinAleatorio();
  setPIN(prefijo, nuevoPin);
  // v036: cambiar el PIN corta el acceso de TODOS los equipos de ESTE negocio (lectura y escritura).
  // La clave termina en "_" después del prefijo: no alcanza a otros negocios ni a sesiones de Admin.
  var props = PropertiesService.getScriptProperties(), pref = 'SESSION_' + prefijo + '_', cerradas = 0;
  Object.keys(props.getProperties()).forEach(function (k) { if (k.indexOf(pref) === 0) { props.deleteProperty(k); cerradas++; } });

  return { success: true, prefijo: prefijo, pin: nuevoPin, sesionesCerradas: cerradas,
           mensaje: '✅ PIN reseteado' + (cerradas ? ' · se cerraron ' + cerradas + ' sesión(es) abierta(s)' : '') };
}

function _setActivoVendedor(prefijo, valorSiNo) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('VENDEDORES');
  if (!hoja) return false;
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][0]).trim().toUpperCase() === prefijo) {
      hoja.getRange(i+1, 7).setValue(valorSiNo); // G = Activo
      return true;
    }
  }
  return false;
}

function _setEstadoClientesVao(prefijo, estado) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('CLIENTES_VAO');
  if (!hoja) return;
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][0]).trim().toUpperCase() === prefijo) {
      hoja.getRange(i+1, 7).setValue(estado); // G = Estado
      return;
    }
  }
}

// Endpoint admin — renueva la vigencia comercial de un cliente (V8).
// Toca EXCLUSIVAMENTE CLIENTES_VAO columna I (Fecha Vence). No toca
// Estado ni VENDEDORES.Activo — la suspensión manual es independiente
// y esta función nunca la modifica.
// FÓRMULA ÚNICA: nuevaFecha = max(hoy, FechaVenceActual) + dias.
// Cubre los 3 casos a la vez: sin Fecha Vence → arranca desde hoy;
// vigente/vence hoy → conserva los días que ya tenía pagados; ya
// vencida → max() descarta la fecha pasada y arranca igual desde hoy.
function renovarVigenciaCliente(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  if (_planDeNegocio_(_normalizarPrefijo_(data.prefijo)) === 'PRUEBA') {
    return { error: 'La prueba gratuita no se renueva: registrá el pago del plan en 💳 Vigencia y pagos.' }; // v028
  }
  // v033: ya no se suman días manuales sueltos. La vigencia de un plan pago se extiende SOLO con
  // un pago confirmado, una cortesía (sin pago, 1 a 7 días) o una regularización (con motivo).
  return { error: 'La vigencia de los planes pagos se extiende registrando un pago confirmado, una cortesía o una regularización (💳 Vigencia y pagos).', requierePago: true };
}

// ===============================
// MÓDULO CLIENTES_XX — clientes del NEGOCIO de cada prefijo
// (NO confundir con CLIENTES_VAO, que es la administración comercial
// de VAO Sistemas sobre sus propios clientes-negocio)
// ===============================
// SEBA21: hoja "Clientes" con 2 columnas (Nombre, Telefono), liviana,
//   se autocompleta sola vía upsertCliente() cada vez que se guarda un
//   fiado — no es un CRM, es solo la lista para el buscador de fiados.
//   La deuda NO se guarda en Clientes: se calcula siempre leyendo FIADOS.
// VAO MULTIHOJA: mismo patrón, adaptado a hoja por cliente CLIENTES_XX.
// MOTIVO: la spec solo pide "buscar cliente" y que el cliente de un
//   fiado salga de esta hoja (no de localStorage) — no pide un CRM con
//   más campos, y agregar campos no pedidos sería inventar sin base.

function crearHojaClientesXX(ss, prefijo) {
  var nombreHoja = 'CLIENTES_' + prefijo;
  if (ss.getSheetByName(nombreHoja)) return; // ya existe, no se toca
  var hoja = ss.insertSheet(nombreHoja);
  hoja.getRange(1, 1, 1, 5).setValues([['Nombre', 'Telefono', 'ClienteId', 'Clave', 'Activo']]);   // v041: 3 columnas al final
  hoja.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#e8f5e9');
  hoja.setFrozenRows(1);
}

function getHojaClientes(prefijo) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('CLIENTES_' + prefijo);
  if (!hoja) throw new Error('No existe hoja CLIENTES_' + prefijo);
  return hoja;
}

// Endpoint: ?action=getClientes&prefijo=XX — lista para el buscador de fiados
function getClientesXX(prefijo, token) {
  // v024: la lista de clientes (nombres y teléfonos) exige la sesión del negocio.
  var errAcceso = _requiereSesionLectura_(prefijo, token);
  if (errAcceso) return { error: errAcceso };
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('CLIENTES_' + prefijo);
  if (!hoja) return { clientes: [] }; // cliente aún sin la hoja (creado antes de este paso)

  var datos = hoja.getDataRange().getValues();
  var clientes = [];
  for (var i = 1; i < datos.length; i++) {
    var nombre = String(datos[i][0] || '').trim();
    if (!nombre) continue;
    var act41 = String(datos[i][4] || '').trim().toUpperCase();
    if (act41 === 'DUPLICADO') continue;   // v041: ficha repetida (quedó unida a la original)
    clientes.push({ nombre: nombre, telefono: String(datos[i][1] || '').trim(), clienteId: String(datos[i][2] || ''), activo: act41 !== 'NO' });
  }
  clientes.sort(function(a, b) { return a.nombre.localeCompare(b.nombre, 'es'); });
  return { clientes: clientes };
}

// Inserta el cliente si no existe; si existe completa el teléfono solo si
// estaba vacío. Mismo comportamiento que upsertCliente() de Seba21, pero
// sobre la hoja CLIENTES_<prefijo>. La usará guardarFiadoXX en el paso 3
// (no es un endpoint propio todavía — no hay UI que la llame sola aún).
// v040.6: clave para COMPARAR nombres de clientes (misma regla que Copihue
// _normNomCli): sin tildes, espacios repetidos juntos, mayúsculas.
// Nunca se escribe en la planilla: el nombre se guarda tal como se escribió.
function _normCliente_(n) {
  return String(n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
}

function upsertClienteXX(prefijo, nombre, telefono) {
  try {
    var ss   = SpreadsheetApp.getActiveSpreadsheet();
    var hoja = ss.getSheetByName('CLIENTES_' + prefijo);
    if (!hoja) { crearHojaClientesXX(ss, prefijo); hoja = ss.getSheetByName('CLIENTES_' + prefijo); }

    var nombreNorm = _normCliente_(nombre); // v040.6: sin tildes ni espacios repetidos
    if (!nombreNorm) return;
    var telLimpio = String(telefono || '').replace(/\D/g, '');
    var datos = hoja.getDataRange().getValues();

    for (var i = 1; i < datos.length; i++) {
      if (String(datos[i][4] || '').toUpperCase() === 'DUPLICADO') continue;   // v041: fichas repetidas no cuentan
      if (_normCliente_(datos[i][0]) === nombreNorm) {
        if (!String(datos[i][1] || '').trim() && telLimpio) {
          hoja.getRange(i + 1, 2).setValue(telLimpio);
        }
        return String(datos[i][2] || '');
      }
    }
    // v041: ficha nueva con ClienteId y Clave (no depende del número de fila)
    var idCli = 'CLI-' + prefijo + '-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss') + Math.floor(Math.random() * 1e4);
    if (hoja.getLastColumn() < 5 || String(hoja.getRange(1, 3).getValue() || '') === '') _hojaCobro_(ss, 'CLIENTES', prefijo);
    hoja.appendRow([String(nombre).trim(), telLimpio, idCli, nombreNorm, '']);
    return idCli;
  } catch (e) {
    Logger.log('upsertClienteXX error (no crítico): ' + e.message);
  }
}

// ===============================
// MÓDULO FIADOS_XX — fiado por cliente de negocio (CLIENTES_XX)
// Adaptado 1:1 de la estructura de columnas de Seba21/Copihue (hoja
// FIADOS, funciones listarFiados/consultarFiado/listarFiadosCliente/
// guardarFiado/abonarFiado/cobrarFiado) — misma cantidad de columnas,
// mismo orden, misma fórmula de estado. Solo cambia: cada cliente VAO
// tiene su propia hoja FIADOS_<prefijo> en vez de una sola hoja FIADOS
// global, y las llamadas pasan siempre por token de sesión del cliente.
//
// SEBA21: guardarFiado()/listarFiadosCliente() enriquecen cada fiado
//   con el detalle de productos del ticket (getDetalleTicket, leyendo
//   la hoja "Ventas" por número de ticket).
// VAO MULTIHOJA: no se enriquece con detalle de ticket.
// MOTIVO: VENTAS_XX (creada en pasos anteriores) no tiene número de
//   ticket ni columna de referencia a fiado — es una estructura más
//   simple que la de Seba21. Agregar eso ahora sería tocar VENTAS_XX
//   sin que el paso lo pida. Se deja fuera y documentado, no inventado.
//
// SEBA21: pagarFiadosSeleccionados() (cobro múltiple) registra el
//   ingreso en CAJA_MOVIMIENTOS.
// VAO MULTIHOJA: cobrarFiadoXX()/abonarFiadoXX() (cobro de a uno, que
//   es lo mínimo pedido en este paso) NO registran nada en caja.
// MOTIVO: CAJA_XX/CAJA_MOVIMIENTOS_XX todavía no existen (son el
//   Paso 6) — conectar ahí ahora rompería con una hoja inexistente.
//   Queda pendiente explícito para cuando se construya el Paso 6.
//
// Columnas FIADOS_<prefijo> (A–N, idénticas en orden a Seba21):
//  A=IdFiado B=Fecha C=Ticket D=Cliente E=Telefono F=Descripcion
//  G=CantItems H=TotalOriginal I=Saldo J=FechaVencimiento K=Estado
//  L=FechaPago M=MetodoPago N=Observaciones

function crearHojaFiadosXX(ss, prefijo) {
  var nombreHoja = 'FIADOS_' + prefijo;
  if (ss.getSheetByName(nombreHoja)) return; // ya existe, no se toca
  var hoja = ss.insertSheet(nombreHoja);
  var headers = ['IdFiado','Fecha','Ticket','Cliente','Telefono','Descripcion',
    'CantItems','TotalOriginal','Saldo','FechaVencimiento','Estado',
    'FechaPago','MetodoPago','Observaciones','ClienteId','OpId'];   // v041: 2 columnas al final
  hoja.getRange(1, 1, 1, headers.length).setValues([headers]);
  hoja.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#37474f').setFontColor('#FFFFFF');
  hoja.setFrozenRows(1);
}

function getHojaFiados(prefijo) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('FIADOS_' + prefijo);
  if (!hoja) throw new Error('No existe hoja FIADOS_' + prefijo);
  return hoja;
}

// Chequeo de sesión reutilizado por todas las acciones de fiados —
// mismo chain que getConfig (Reglas 24-29): prefijo existe → activo → token válido.
// ===============================
// VALIDACIÓN DE SESIÓN — función única compartida (Paso 11)
// Antes de este paso existían 7 funciones _validarAcceso*_ (fiados,
// historial, préstamos, caja, salidas, ajuste, ofertas) con el cuerpo
// EXACTAMENTE IDÉNTICO, verificado línea por línea antes de tocar nada.
// Se unifican en esta única función; las 7 anteriores quedan como
// delegados de una línea (mismo nombre, mismo comportamiento, cero
// lógica duplicada) para no romper ningún llamado existente.
// ===============================
function _requiereSesionValida_(prefijo, token) {
  var infoCliente = obtenerInfoCliente(prefijo);
  if (!infoCliente)        return 'Cliente no encontrado';
  if (!infoCliente.activo) return 'Cliente inactivo — contactar a VAO Sistemas';
  if (!_obtenerVigenciaCliente_(prefijo).vigente) return 'Suscripción vencida — contactar a VAO Sistemas';
  if (!validarSesionCliente(prefijo, token)) return 'Sesión inválida o expirada';
  return null; // sin error = acceso OK
}

// v036: LECTURA = negocio existente + sesión válida de ESE negocio. No mira si está activo ni vigente:
// un negocio vencido o suspendido puede consultar y descargar SUS datos. Las escrituras siguen
// con _requiereSesionValida_ (sin cambios) y además las frena el ruteo (_bloqueoSoloLectura_).
function _requiereSesionLectura_(prefijo, token) {
  if (!obtenerInfoCliente(prefijo))          return 'Cliente no encontrado';
  if (!_sesionClienteVigente_(prefijo, token)) return 'Sesión inválida o expirada';
  return null;
}
// Igual que validarSesionCliente pero SIN escribir nada (una lectura nunca borra ni crea propiedades).
function _sesionClienteVigente_(prefijo, token) {
  if (!prefijo || !token || String(token).indexOf('CLI_' + prefijo + '_') !== 0) return false;
  var str = PropertiesService.getScriptProperties().getProperty('SESSION_' + prefijo + '_' + token);
  if (!str) return false;
  try { var s = JSON.parse(str); return s.token === token && new Date().getTime() <= s.expira; } catch (e) { return false; }
}

function _validarAccesoFiados_(prefijo, token)     { return _requiereSesionValida_(prefijo, token); }
function _validarAccesoHistorial_(prefijo, token)  { return _requiereSesionValida_(prefijo, token); }
function _validarAccesoPrestamos_(prefijo, token)  { return _requiereSesionValida_(prefijo, token); }
function _validarAccesoCaja_(prefijo, token)       { return _requiereSesionValida_(prefijo, token); }
function _validarAccesoSalidas_(prefijo, token)    { return _requiereSesionValida_(prefijo, token); }
function _validarAccesoAjuste_(prefijo, token)     { return _requiereSesionValida_(prefijo, token); }
function _validarAccesoOfertas_(prefijo, token)    { return _requiereSesionValida_(prefijo, token); }

// Endpoint: ?action=getFiados&prefijo=XX&data={token} — listado completo
// (oculta PAGADOs de más de 30 días, igual que Seba21)
function listarFiadosXX(prefijo, token) {
  var errAcceso = _requiereSesionLectura_(prefijo, token);
  if (errAcceso) return { error: errAcceso };

  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('FIADOS_' + prefijo);
  if (!hoja) return { fiados: [] }; // cliente creado antes de este paso

  var datos = hoja.getDataRange().getValues();
  var hoy = new Date(); hoy.setHours(0,0,0,0);
  var fiados = [];

  for (var i = 1; i < datos.length; i++) {
    var fila = datos[i];
    if (!fila[0]) continue;

    var estado = String(fila[10] || '').toUpperCase();
    var vencFecha = fila[9] ? new Date(fila[9]) : null;
    if (vencFecha && vencFecha < hoy && estado !== 'PAGADO') estado = 'VENCIDO';

    if (estado === 'PAGADO') {
      var fechaPago = fila[11] ? new Date(fila[11]) : null;
      var hace30 = new Date(hoy); hace30.setDate(hace30.getDate() - 30);
      if (!fechaPago || fechaPago < hace30) continue;
    }

    var totalOriginal = parseFloat(fila[7]) || 0;
    var saldo         = parseFloat(fila[8]) || 0;

    fiados.push({
      fila:             i + 1,
      idFiado:          String(fila[0] || ''),
      fecha:            String(fila[1] || ''),
      ticket:           String(fila[2] || ''),
      cliente:          String(fila[3] || ''),
      telefono:         String(fila[4] || ''),
      descripcion:      String(fila[5] || ''),
      cantItems:        fila[6] || 0,
      totalOriginal:    totalOriginal,
      total:            saldo,
      totalAbonado:     Math.max(0, totalOriginal - saldo),
      fechaVencimiento: fila[9] ? String(fila[9]).split('T')[0] : '',
      fechaPago:        fila[11] ? String(fila[11]) : '',
      metodoPago:       String(fila[12] || ''),
      observaciones:    String(fila[13] || ''),
      estado:           estado
    });
  }

  fiados.sort(function(a, b) {
    if (a.estado === 'VENCIDO' && b.estado !== 'VENCIDO') return -1;
    if (b.estado === 'VENCIDO' && a.estado !== 'VENCIDO') return 1;
    return (a.fechaVencimiento || '').localeCompare(b.fechaVencimiento || '');
  });

  return { fiados: fiados };
}

// Endpoint: ?action=consultarDeuda&prefijo=XX&data={token,telefono}
function consultarDeudaXX(prefijo, token, telefono) {
  var errAcceso = _requiereSesionLectura_(prefijo, token);
  if (errAcceso) return { error: errAcceso };
  if (!telefono) return { deuda: null };

  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('FIADOS_' + prefijo);
  if (!hoja) return { deuda: null };

  var datos = hoja.getDataRange().getValues();
  var telBuscar = String(telefono).replace(/\D/g, '');
  var hoy = new Date(); hoy.setHours(0,0,0,0);
  var totalDeuda = 0, pendientes = 0, vencidos = 0, nombreCliente = '';

  for (var i = 1; i < datos.length; i++) {
    var fila = datos[i];
    var telFila = String(fila[4] || '').replace(/\D/g, '');
    if (telFila !== telBuscar) continue;

    var estado = String(fila[10] || '').toUpperCase();
    if (estado === 'PAGADO') continue;

    var fechaVenc = fila[9] ? new Date(fila[9]) : null;
    if (fechaVenc && fechaVenc < hoy) estado = 'VENCIDO';

    var total = parseFloat(fila[8]) || 0;
    totalDeuda += total;
    pendientes++;
    if (estado === 'VENCIDO') vencidos++;
    if (!nombreCliente && fila[3]) nombreCliente = String(fila[3]);
  }

  if (pendientes === 0) return { deuda: null };
  return { deuda: { nombre: nombreCliente, total: totalDeuda, pendientes: pendientes, vencidos: vencidos } };
}

// Endpoint: ?action=getFiadosCliente&prefijo=XX&data={token,telefono|cliente}
// Historial de pendientes/vencidos de UN cliente puntual (para la ficha del cliente).
function listarFiadosClienteXX(prefijo, data) {
  var errAcceso = _requiereSesionLectura_(prefijo, data.token || '');
  if (errAcceso) return { error: errAcceso };

  var telefono = String(data.telefono || '').replace(/\D/g, '');
  var cliente  = _normCliente_(data.cliente); // v040.6
  if (!telefono && !cliente) return { error: 'Se requiere teléfono o cliente' };

  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('FIADOS_' + prefijo);
  if (!hoja) return { fiados: [], totalDeuda: 0, cantFiados: 0, hayVencidos: false };

  var rows = hoja.getDataRange().getValues();
  var hoy  = new Date(); hoy.setHours(0,0,0,0);
  var fiados = [];

  for (var i = 1; i < rows.length; i++) {
    var fila = rows[i];
    if (!fila[0]) continue;

    var telFila = String(fila[4] || '').replace(/\D/g, '');
    var cliFila = _normCliente_(fila[3]); // v040.6
    var coincide = (telefono && telFila === telefono) || (!telefono && cliFila === cliente);
    if (!coincide) continue;

    var estado = String(fila[10] || '').toUpperCase();
    var vencFecha = fila[9] ? new Date(fila[9]) : null;
    if (vencFecha && vencFecha < hoy && estado !== 'PAGADO') estado = 'VENCIDO';
    if (estado === 'PAGADO') continue; // solo pendientes + vencidos

    var totalOriginal = parseFloat(fila[7]) || 0;
    var saldo         = parseFloat(fila[8]) || 0;

    fiados.push({
      idFiado:          String(fila[0]),
      fecha:            String(fila[1] || ''),
      ticket:           String(fila[2] || ''),
      cliente:          String(fila[3] || ''),
      telefono:         String(fila[4] || ''),
      descripcion:      String(fila[5] || ''),
      cantItems:        fila[6] || 0,
      totalOriginal:    totalOriginal,
      totalPendiente:   saldo,
      abonadoParcial:   totalOriginal > saldo,
      montoAbonado:     Math.round((totalOriginal - saldo) * 100) / 100,
      fechaVencimiento: fila[9] ? String(fila[9]).split('T')[0] : '',
      estado:           estado,
      observaciones:    String(fila[13] || '')
    });
  }

  fiados.sort(function(a, b) {
    if (a.estado === 'VENCIDO' && b.estado !== 'VENCIDO') return -1;
    if (b.estado === 'VENCIDO' && a.estado !== 'VENCIDO') return 1;
    return a.fecha.localeCompare(b.fecha);
  });

  var totalDeuda  = fiados.reduce(function(s, f) { return s + f.totalPendiente; }, 0);
  var hayVencidos = fiados.some(function(f) { return f.estado === 'VENCIDO'; });

  return {
    cliente:     fiados.length ? fiados[0].cliente : (data.cliente || ''),
    telefono:    telefono,
    totalDeuda:  Math.round(totalDeuda * 100) / 100,
    cantFiados:  fiados.length,
    hayVencidos: hayVencidos,
    fiados:      fiados
  };
}

// Endpoint: ?action=registrarFiado&prefijo=XX&data={token,cliente,telefono,
//   descripcion,cantItems,total,vencimiento,ticket,obs}
function registrarFiadoXX(prefijo, data) {
  var errAcceso = _validarAccesoFiados_(prefijo, data.token || '');
  if (errAcceso) return { error: errAcceso };

  var cliente = (data.cliente || '').trim();
  var total   = parseFloat(data.total) || 0;
  if (!cliente) return { error: 'Escribí el nombre del cliente. No se registró nada.' };
  if (total <= 0) return { error: 'Escribí un monto mayor que cero. No se registró nada.' };

  if (_migracionPendiente41_(prefijo)) return { error: MSG41_.migracion, migracionPendiente: true, definitivo: true };   // v041
  return _conCandado41_(function () { return _registrarFiadoV041_(prefijo, data, cliente, total); });
}
function _registrarFiadoV041_(prefijo, data, cliente, total) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName('FIADOS_' + prefijo)) crearHojaFiadosXX(ss, prefijo);
  var hoja = _hojaCobro_(ss, 'FIADOS', prefijo);

  var tz = Session.getScriptTimeZone();
  var fechaStr = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm');
  var numFiado = hoja.getLastRow();
  // v041: id por fecha y hora + azar (antes: número de fila, que se repetiría después de un reset).
  var opF = 'RF' + Utilities.formatDate(new Date(), tz, 'yyyyMMddHHmmss') + Math.floor(Math.random() * 1e4);
  var idFiado  = data.idFiado || ('FIADO-' + opF.slice(2));
  var store41 = _storeCobro_(prefijo), rc41 = MotorCobro.resolverCliente(store41, cliente, data.telefono || '');
  if (rc41.ambiguo) return { error: 'Hay más de un cliente que coincide: ' + rc41.ambiguo.join(' / ') + '. No se registró nada: elegí el cliente con su teléfono.' };
  if (rc41.fila && String(rc41.fila[MotorCobro.CLI.ACTIVO] || '').toUpperCase() === 'NO') return { error: cliente + ' está desactivado: no se le puede fiar. No se registró nada.', clienteDesactivado: true };

  // v027: la fórmula de Estado (K) va en la MISMA escritura que la fila, así
  // un corte no puede dejar una deuda sin Estado.
  var filaEsperada = numFiado + 1;
  var formulaEstado = function (f) {
    return '=IF(D' + f + '="";"";IF(L' + f + '<>"";"PAGADO";' +
      'IF(AND(J' + f + '<>"";TODAY()>J' + f + ');"VENCIDO";"PENDIENTE")))';
  };
  hoja.appendRow([
    idFiado, fechaStr,
    data.ticket || '', cliente, data.telefono || '',
    data.descripcion || 'FIADO', data.cantItems || 1,
    total, total,
    data.vencimiento || '',
    formulaEstado(filaEsperada), '', '',
    data.obs || '',
    rc41.id || upsertClienteXX(prefijo, cliente, data.telefono || ''), opF   // v041: ClienteId, OpId (al final)
  ]);

  var nuevaFila = hoja.getLastRow();
  if (nuevaFila !== filaEsperada) hoja.getRange(nuevaFila, 11).setFormula(formulaEstado(nuevaFila)); // la hoja tenía filas vacías al final

  if (rc41.id) upsertClienteXX(prefijo, cliente, data.telefono || '');   // completa el teléfono si faltaba

  return { success: true, idFiado: idFiado };
}

// Endpoint: ?action=abonarFiado&prefijo=XX&data={token,idFiado,abono,metodoPago,idOperacion}
function abonarFiadoXX(prefijo, data) {
  var errAcceso = _validarAccesoFiados_(prefijo, data.token || '');
  if (errAcceso) return { error: errAcceso };
  // v026: con ScriptLock (dos cobros simultáneos ya no pisan el saldo).
  // v041: el abono va al libro (ABONOS + PAGOS + caja) con el motor único. _abonarFiadoSinLock_ queda sin uso (respaldo).
  return _conCandado41_(function () { return abonarFiadoV041_(prefijo, data); });
}

function _abonarFiadoSinLock_(prefijo, data) {
  if (!data.idFiado) return { error: 'No se indicó qué fiado. No se registró nada: actualizá la lista.' };

  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('FIADOS_' + prefijo);
  if (!hoja) return { error: 'Este comercio todavía no tiene fiados. No se registró nada.' };

  var rows  = hoja.getDataRange().getValues();
  var idOp  = String(data.idOperacion || '').trim();

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) !== String(data.idFiado)) continue;
    var obsPrevia = String(rows[i][13] || '');

    // Idempotencia — mismo patrón que Seba21: si idOperacion ya está en
    // las observaciones de este fiado, el abono ya se aplicó antes.
    if (idOp && obsPrevia.indexOf(idOp) !== -1) {
      return { success: true, yaExistia: true, nuevoTotal: parseFloat(rows[i][8]) || 0 };
    }

    var totalActual = parseFloat(rows[i][8]) || 0;
    var abono = parseFloat(data.abono) || 0;
    if (abono <= 0) return { error: 'Escribí un monto mayor que cero. No se registró nada.' };
    if (totalActual <= 0 || String(rows[i][10]).trim().toUpperCase() === 'PAGADO') {
      return { error: 'Este fiado ya está saldado — no se registró el pago', definitivo: true };
    }

    // v040 (FIA-03): tolerancia de $0,50 por redondeos; más que eso no se registra (ni en la deuda ni en la caja).
    if (abono > totalActual + 0.5) return { error: 'El abono ($' + abono + ') supera el saldo pendiente ($' + totalActual + '). No se registró nada: si paga todo, usá Cobrar total.', definitivo: true, saldo: totalActual, abonoMayorQueSaldo: true };
    if (abono > totalActual) abono = totalActual; // diferencia de centavos: se cobra exactamente el saldo
    var nuevoTotal = Math.max(0, totalActual - abono);
    hoja.getRange(i + 1, 9).setValue(nuevoTotal);

    var tz = Session.getScriptTimeZone();
    var fecha = Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy');
    var nuevaObs = (obsPrevia ? obsPrevia + ' | ' : '') +
      'Abono $' + abono + ' (' + (data.metodoPago || 'EFECTIVO') + ') ' + fecha +
      (idOp ? ' [' + idOp + ']' : '');
    hoja.getRange(i + 1, 14).setValue(nuevaObs);

    if (nuevoTotal === 0) {
      hoja.getRange(i + 1, 11).setValue('PAGADO');
      hoja.getRange(i + 1, 12).setValue(fecha);
      hoja.getRange(i + 1, 13).setValue(data.metodoPago || 'EFECTIVO');
    }

    // Link con caja (Paso 6): un abono es plata real que entra al
    // negocio — mismo criterio que _registrarIngresoFiadoCaja_ de Seba21.
    _registrarIngresoFiadoCajaXX_(prefijo, abono, data.metodoPago, rows[i][3], 'Abono fiado ' + data.idFiado);

    return { success: true, nuevoTotal: nuevoTotal };
  }
  return { error: 'No se encontró ese fiado. No se registró nada: actualizá la lista.' };
}

// Endpoint: ?action=cobrarFiado&prefijo=XX&data={token,idFiado,metodoPago,
//   esAbonoParcial,obs,idOperacion} — salda un fiado completo (o deja nota
//   si esAbonoParcial=true, igual que Seba21).
function cobrarFiadoXX(prefijo, data) {
  var errAcceso = _validarAccesoFiados_(prefijo, data.token || '');
  if (errAcceso) return { error: errAcceso };
  // v041: cobro total con el motor único; la nota sin plata (esAbonoParcial) sigue por el camino de siempre.
  return _conCandado41_(function () { return cobrarFiadoV041_(prefijo, data) || _cobrarFiadoSinLock_(prefijo, data); });
}

function _cobrarFiadoSinLock_(prefijo, data) {
  if (!data.idFiado) return { error: 'No se indicó qué fiado. No se registró nada: actualizá la lista.' };

  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('FIADOS_' + prefijo);
  if (!hoja) return { error: 'Este comercio todavía no tiene fiados. No se registró nada.' };

  var rows = hoja.getDataRange().getValues();
  var idOp = String(data.idOperacion || '').trim();
  var tz   = Session.getScriptTimeZone();

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) !== String(data.idFiado)) continue;

    var obsExistente = String(rows[i][13] || '');
    if (idOp && obsExistente.indexOf(idOp) !== -1) return { success: true, yaExistia: true };

    var fechaPago = data.fechaPago || Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm');
    if (!data.esAbonoParcial && String(rows[i][10]).trim().toUpperCase() === 'PAGADO') {
      return { error: 'Este fiado ya estaba pagado — no se registró de nuevo', definitivo: true }; // v026
    }

    if (data.esAbonoParcial) {
      var nuevaObsP = obsExistente ? obsExistente + ' | ' + (data.obs || '') : (data.obs || '');
      hoja.getRange(i + 1, 14).setValue(nuevaObsP);
    } else {
      var saldoCobrado = parseFloat(rows[i][8]) || 0;
      hoja.getRange(i + 1, 9).setValue(0); // saldo = 0
      hoja.getRange(i + 1, 11).setValue('PAGADO');
      hoja.getRange(i + 1, 12).setValue(fechaPago);
      hoja.getRange(i + 1, 13).setValue(data.metodoPago || 'EFECTIVO');
      var notaObs = (data.obs || '') + (idOp ? ' [' + idOp + ']' : '');
      if (notaObs.trim()) hoja.getRange(i + 1, 14).setValue(obsExistente ? obsExistente + ' | ' + notaObs : notaObs);

      // Link con caja (Paso 6): cobro total = plata real que entra al
      // negocio — mismo criterio que _registrarIngresoFiadoCaja_ de Seba21.
      _registrarIngresoFiadoCajaXX_(prefijo, saldoCobrado, data.metodoPago, rows[i][3], 'Cobro fiado ' + data.idFiado);
    }
    return { success: true };
  }
  return { error: 'No se encontró ese fiado. No se registró nada: actualizá la lista.' };
}

// ── BACKFILL MANUAL (opcional, ejecutar UNA vez desde el editor) ──
// Crea FIADOS_XX para clientes que ya existían antes de este paso
// (hoy: XX y LP). No borra nada si ya existe.
function backfillFiadosXX() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var hVend = ss.getSheetByName('VENDEDORES');
  if (!hVend) { Logger.log('No existe VENDEDORES'); return; }
  var datos = hVend.getDataRange().getValues();
  var creadas = [];
  for (var i = 1; i < datos.length; i++) {
    var prefijo = String(datos[i][0] || '').trim().toUpperCase();
    if (!prefijo) continue;
    crearHojaFiadosXX(ss, prefijo);
    creadas.push(prefijo);
  }
  Logger.log('FIADOS_XX revisada/creada para: ' + creadas.join(', '));
}

// ===============================
// MÓDULO HISTORIAL_XX — todo lo que ingresa al local, por cliente
// Adaptado de la hoja "Historial" de Seba21 (11 columnas) — misma
// función: registrar cada ingreso de mercadería para poder auditarlo,
// deshacerlo y (más adelante, motor de inventario) calcular rotación.
//
// SEBA21: 11 columnas, incluye FechaVencimiento (col I).
// VAO MULTIHOJA: 10 columnas, sin FechaVencimiento.
// MOTIVO: INVENTARIO_XX no tiene columna de fecha de vencimiento —no hay
//   ese dato para trasladar—, se omite en vez de dejarla siempre vacía.
//
// Columnas HISTORIAL_<prefijo> (A–J):
//  A=Fecha B=Producto C=Cantidad D=StockResultante E=Codigo F=Proveedor
//  G=PrecioCosto H=PrecioVenta I=IdOperacion J=StockAnterior

function crearHojaHistorialXX(ss, prefijo) {
  var nombreHoja = 'HISTORIAL_' + prefijo;
  if (ss.getSheetByName(nombreHoja)) return; // ya existe, no se toca
  var hoja = ss.insertSheet(nombreHoja);
  var headers = ['Fecha','Producto','Cantidad','StockResultante','Codigo',
    'Proveedor','PrecioCosto','PrecioVenta','IdOperacion','StockAnterior'];
  hoja.getRange(1, 1, 1, headers.length).setValues([headers]);
  hoja.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#37474f').setFontColor('#FFFFFF');
  hoja.setFrozenRows(1);
}

// Devuelve la hoja HISTORIAL_<prefijo>, creándola sola si un cliente
// viejo (de antes de este paso) todavía no la tiene — igual criterio
// que getHojaFiados/getClientesXX para no romper clientes existentes.
function getHojaHistorial(prefijo) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('HISTORIAL_' + prefijo);
  if (!hoja) { crearHojaHistorialXX(ss, prefijo); hoja = ss.getSheetByName('HISTORIAL_' + prefijo); }
  return hoja;
}

// Búsqueda simple por idOperacion (col I = índice 8). Alcanza para el
// volumen actual; si HISTORIAL_XX crece mucho se puede optimizar más
// adelante con TextFinder como hace Seba21 — no se hizo ahora para no
// sumar complejidad que este paso no pide.
function _buscarIdOperacionHistorial_(hoja, idOp) {
  if (!idOp) return { existe: false };
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][8] || '').trim() === idOp) {
      return { existe: true, fila: i + 1, fecha: datos[i][0], stockActual: datos[i][3] };
    }
  }
  return { existe: false };
}

// ── v040.4: HISTORIAL DE CAMBIOS DEL COMERCIO (solo lectura) ──────────
// Endpoint: ?action=getCambios&prefijo=XX&data={token,limite}
// Une AJUSTE_RAPIDO_XX (ajustes de nombre/stock/precio/categoría) e HISTORIAL_XX (ingresos de mercadería),
// lo más nuevo primero. Lee por NOMBRE de encabezado (regla 11 de planilla): una columna o una hoja que
// falta = sin dato, nunca un error. NO crea hojas ni escribe nada. Funciona también en modo consulta.
// Sin módulo: son datos propios del comercio (ya se pueden descargar desde Mis datos).
function listarCambiosXX(prefijo, data) {
  data = data || {};
  var errAcceso = _requiereSesionLectura_(prefijo, data.token || '');
  if (errAcceso) return { error: errAcceso };
  var max = Math.min(Math.max(parseInt(data.limite, 10) || 300, 1), 1000);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  function leer(base) {
    var h = ss.getSheetByName(base + prefijo);
    if (!h || h.getLastRow() < 2 || h.getLastColumn() < 1) return { enc: {}, filas: [] };
    var d = h.getRange(1, 1, h.getLastRow(), h.getLastColumn()).getValues();
    var enc = {};
    d[0].forEach(function (c, i) { var k = String(c).trim(); if (k && !(k in enc)) enc[k] = i; });
    return { enc: enc, filas: d.slice(1) };
  }
  function v(f, enc, n) { return Object.prototype.hasOwnProperty.call(enc, n) ? f[enc[n]] : ''; }
  function ms(x) { var t = (x instanceof Date) ? x.getTime() : new Date(x).getTime(); return isNaN(t) ? 0 : t; }
  function iso(x) { var t = ms(x); return t ? new Date(t).toISOString() : ''; }
  function num(x) { return (x === '' || x === null || x === undefined || isNaN(Number(x))) ? '' : Number(x); }
  var cambios = [];
  var a = leer('AJUSTE_RAPIDO_');
  a.filas.forEach(function (f) {
    var prod = String(v(f, a.enc, 'Producto') || '').trim();
    if (!prod) return;
    cambios.push({ tipo: 'AJUSTE', _t: ms(v(f, a.enc, 'Fecha')), fecha: iso(v(f, a.enc, 'Fecha')), producto: prod,
      nombreAntes: String(v(f, a.enc, 'NombreAntes') || ''), nombreDespues: String(v(f, a.enc, 'NombreDespues') || ''),
      stockAntes: num(v(f, a.enc, 'StockAntes')), stockDespues: num(v(f, a.enc, 'StockDespues')),
      precioAntes: num(v(f, a.enc, 'PrecioAntes')), precioDespues: num(v(f, a.enc, 'PrecioDespues')),
      categoriaAntes: String(v(f, a.enc, 'CategoriaAntes') || ''), categoriaDespues: String(v(f, a.enc, 'CategoriaDespues') || ''),
      usuario: String(v(f, a.enc, 'Usuario') || '') });
  });
  var hi = leer('HISTORIAL_');
  hi.filas.forEach(function (f) {
    var prod = String(v(f, hi.enc, 'Producto') || '').trim();
    if (!prod) return;
    cambios.push({ tipo: 'INGRESO', _t: ms(v(f, hi.enc, 'Fecha')), fecha: iso(v(f, hi.enc, 'Fecha')), producto: prod,
      cantidad: num(v(f, hi.enc, 'Cantidad')), stockAntes: num(v(f, hi.enc, 'StockAnterior')), stockDespues: num(v(f, hi.enc, 'StockResultante')),
      costo: num(v(f, hi.enc, 'PrecioCosto')), venta: num(v(f, hi.enc, 'PrecioVenta')), proveedor: String(v(f, hi.enc, 'Proveedor') || '') });
  });
  cambios.forEach(function (c, i) { c._i = i; });
  cambios.sort(function (x, y) { return (y._t - x._t) || (y._i - x._i); });
  var total = cambios.length;
  cambios = cambios.slice(0, max);
  cambios.forEach(function (c) { delete c._t; delete c._i; });
  return { success: true, total: total, cambios: cambios };
}

// Endpoint: ?action=getHistorial&prefijo=XX&data={token,limite}
// Últimos ingresos, más reciente primero (por defecto 50, como
// getUltimosIngresos de Seba21).
function listarHistorialXX(prefijo, token, limite) {
  var errAcceso = _requiereSesionLectura_(prefijo, token);
  if (errAcceso) return { error: errAcceso };

  var hoja = _hojaParaLeer_(prefijo, 'HISTORIAL_', getHojaHistorial); // v036: en modo consulta no crea la hoja
  var datos = hoja.getDataRange().getValues();
  var max = parseInt(limite) || 50;
  var ingresos = [];

  for (var i = 1; i < datos.length; i++) {
    var fila = datos[i];
    if (!fila[1]) continue; // sin producto = fila vacía
    ingresos.push({
      fecha:           fila[0] instanceof Date ? fila[0].toISOString() : String(fila[0] || ''),
      producto:        String(fila[1] || ''),
      cantidad:        fila[2] || 0,
      stockResultante: fila[3] || 0,
      codigo:          String(fila[4] || ''),
      proveedor:       String(fila[5] || ''),
      precioCosto:     fila[6] || '',
      precioVenta:     fila[7] || '',
      idOperacion:     String(fila[8] || ''),
      stockAnterior:   fila[9] || 0
    });
  }

  ingresos.reverse(); // más reciente primero
  var total = ingresos.length;
  return { total: total, ingresos: ingresos.slice(0, max) };
}

// ── BACKFILL MANUAL (opcional, ejecutar UNA vez desde el editor) ──
// Crea HISTORIAL_XX para clientes que ya existían antes de este paso
// (hoy: XX y LP). No borra nada si ya existe.
function backfillHistorialXX() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var hVend = ss.getSheetByName('VENDEDORES');
  if (!hVend) { Logger.log('No existe VENDEDORES'); return; }
  var datos = hVend.getDataRange().getValues();
  var creadas = [];
  for (var i = 1; i < datos.length; i++) {
    var prefijo = String(datos[i][0] || '').trim().toUpperCase();
    if (!prefijo) continue;
    crearHojaHistorialXX(ss, prefijo);
    creadas.push(prefijo);
  }
  Logger.log('HISTORIAL_XX revisada/creada para: ' + creadas.join(', '));
}

// ===============================
// MÓDULO PRESTAMOS_XX — plata que el NEGOCIO le debe a un tercero
// (acreedor), NO confundir con FIADOS_XX (que es al revés: lo que le
// deben AL negocio).
//
// SEBA21: no existe en el backend — vivía entero en localStorage del
//   navegador (clave 'copihue_prestamos'), como array de objetos
//   {id, fecha, acreedor, monto, motivo, cuotas, montoCuota,
//   vencimiento, obs, estado, pagos:[{fecha,monto}]}. Se estudió
//   directamente esa lógica de prestRegistrar()/prestPagarCuota()/
//   prestCancelar() en seba21v488_estable.html.
// VAO MULTIHOJA: mismos 11 campos, ahora en PRESTAMOS_XX (Sheets como
//   base de datos, ya no localStorage).
// MOTIVO: pagos era un array anidado en localStorage; una fila de
//   Sheets no admite un array real. Se traduce a un log de texto en la
//   columna Pagos ("fecha:monto;fecha:monto"), igual criterio que se
//   usó para las Observaciones/abonos de FIADOS_XX — no se inventa una
//   hoja aparte de pagos porque la especificación pide solo PRESTAMOS_XX.
//
// Columnas PRESTAMOS_<prefijo> (A–K), mismo orden que pidió Victor:
//  A=Id B=Fecha C=Acreedor D=Monto E=Motivo F=Cuotas G=MontoCuota
//  H=Vencimiento I=Observaciones J=Estado K=Pagos (log "fecha:monto;...")

function crearHojaPrestamosXX(ss, prefijo) {
  var nombreHoja = 'PRESTAMOS_' + prefijo;
  if (ss.getSheetByName(nombreHoja)) return;
  var hoja = ss.insertSheet(nombreHoja);
  var headers = ['Id','Fecha','Acreedor','Monto','Motivo','Cuotas','MontoCuota',
    'Vencimiento','Observaciones','Estado','Pagos'];
  hoja.getRange(1, 1, 1, headers.length).setValues([headers]);
  hoja.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#4527a0').setFontColor('#FFFFFF');
  hoja.setFrozenRows(1);
}

function getHojaPrestamos(prefijo) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('PRESTAMOS_' + prefijo);
  if (!hoja) { crearHojaPrestamosXX(ss, prefijo); hoja = ss.getSheetByName('PRESTAMOS_' + prefijo); }
  return hoja;
}

function _parsearPagosPrestamo_(log) {
  if (!log) return [];
  return String(log).split(';').filter(function(s){ return s; }).map(function(par) {
    var partes = par.split(':');
    return { fecha: partes[0], monto: parseFloat(partes[1]) || 0 };
  });
}

// Endpoint: ?action=getPrestamos&prefijo=XX&data={token}
// Mismo cálculo que prestRenderLista() de Seba21: saldo, % pagado,
// vencido/urgente según fecha, activo vs cancelado.
function listarPrestamosXX(prefijo, token) {
  var errAcceso = _requiereSesionLectura_(prefijo, token);
  if (errAcceso) return { error: errAcceso };

  var hoja  = _hojaParaLeer_(prefijo, 'PRESTAMOS_', getHojaPrestamos); // v036
  var datos = hoja.getDataRange().getValues();
  var hoy   = new Date(); hoy.setHours(0,0,0,0);
  var prestamos = [];

  for (var i = 1; i < datos.length; i++) {
    var fila = datos[i];
    if (!fila[0]) continue;

    var monto      = parseFloat(fila[3]) || 0;
    var cuotas     = parseInt(fila[5]) || 1;
    var montoCuota = parseFloat(fila[6]) || 0;
    var vencStr    = fila[7] ? String(fila[7]) : '';
    var estado     = String(fila[9] || 'PENDIENTE').toUpperCase();
    var pagos      = _parsearPagosPrestamo_(fila[10]);
    var pagado     = pagos.reduce(function(s,p){ return s + p.monto; }, 0);
    var saldo      = Math.max(0, monto - pagado);
    var activo     = estado !== 'CANCELADO' && pagos.length < cuotas;

    var venc = vencStr ? new Date(vencStr) : null;
    var diasVenc = venc ? Math.round((venc - hoy) / 86400000) : null;

    prestamos.push({
      id:            String(fila[0]),
      fecha:         String(fila[1] || ''),
      acreedor:      String(fila[2] || ''),
      monto:         monto,
      motivo:        String(fila[4] || ''),
      cuotas:        cuotas,
      montoCuota:    montoCuota,
      vencimiento:   vencStr,
      observaciones: String(fila[8] || ''),
      estado:        activo ? estado : 'CANCELADO',
      cuotasPagadas: pagos.length,
      pagado:        Math.round(pagado * 100) / 100,
      saldo:         Math.round(saldo * 100) / 100,
      porcentaje:    monto > 0 ? Math.round(pagado / monto * 100) : 0,
      activo:        activo,
      vencido:       activo && diasVenc !== null && diasVenc < 0,
      urgente:       activo && diasVenc !== null && diasVenc >= 0 && diasVenc <= 7,
      diasVencimiento: diasVenc
    });
  }

  var totalDeuda = prestamos.filter(function(p){ return p.activo; })
    .reduce(function(s,p){ return s + p.saldo; }, 0);

  return { prestamos: prestamos, totalDeuda: Math.round(totalDeuda * 100) / 100 };
}

// Endpoint: ?action=registrarPrestamo&prefijo=XX&data={token,acreedor,
//   monto,motivo,cuotas,vencimiento,obs}
function registrarPrestamoXX(prefijo, data) {
  var errAcceso = _validarAccesoPrestamos_(prefijo, data.token || '');
  if (errAcceso) return { error: errAcceso };

  var acreedor = (data.acreedor || '').trim();
  var monto    = parseFloat(data.monto) || 0;
  if (!acreedor) return { error: 'Ingresá el nombre del acreedor' };
  if (monto <= 0) return { error: 'Ingresá el monto' };

  var cuotas     = parseInt(data.cuotas) || 1;
  var montoCuota = Math.round(monto / cuotas);
  var hoja       = getHojaPrestamos(prefijo);
  var tz         = Session.getScriptTimeZone();
  var fechaStr   = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  var idPrestamo = 'p_' + new Date().getTime();

  hoja.appendRow([
    idPrestamo, fechaStr, acreedor, monto, data.motivo || '',
    cuotas, montoCuota, data.vencimiento || '', data.obs || '',
    'PENDIENTE', ''
  ]);

  return { success: true, id: idPrestamo, montoCuota: montoCuota };
}

// Endpoint: ?action=pagarCuotaPrestamo&prefijo=XX&data={token,id}
// Mismo comportamiento que prestPagarCuota(): agrega un pago por el
// valor de la cuota, empuja el vencimiento +1 mes si quedan cuotas, y
// marca CANCELADO cuando se completan todas.
function pagarCuotaPrestamoXX(prefijo, data) {
  var errAcceso = _validarAccesoPrestamos_(prefijo, data.token || '');
  if (errAcceso) return { error: errAcceso };
  if (!data.id) return { error: 'Falta ID del préstamo' };

  var hoja  = getHojaPrestamos(prefijo);
  var datos = hoja.getDataRange().getValues();

  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][0]) !== String(data.id)) continue;

    var cuotas     = parseInt(datos[i][5]) || 1;
    var montoCuota = parseFloat(datos[i][6]) || 0;
    var pagos      = _parsearPagosPrestamo_(datos[i][10]);
    if (pagos.length >= cuotas) return { error: 'Este préstamo ya está saldado' };

    var tz = Session.getScriptTimeZone();
    var fechaPago = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
    var logPrevio = String(datos[i][10] || '');
    var nuevoLog  = (logPrevio ? logPrevio + ';' : '') + fechaPago + ':' + montoCuota;
    hoja.getRange(i + 1, 11).setValue(nuevoLog);

    var cuotasPagadasAhora = pagos.length + 1;

    // Empujar vencimiento +1 mes si quedan cuotas (igual que Seba21)
    var vencStr = datos[i][7] ? String(datos[i][7]) : '';
    if (vencStr && cuotasPagadasAhora < cuotas) {
      var v = new Date(vencStr);
      v.setMonth(v.getMonth() + 1);
      hoja.getRange(i + 1, 8).setValue(Utilities.formatDate(v, tz, 'yyyy-MM-dd'));
    }

    if (cuotasPagadasAhora >= cuotas) {
      hoja.getRange(i + 1, 10).setValue('CANCELADO');
    }

    return {
      success: true,
      cuotasPagadas: cuotasPagadasAhora,
      cuotasTotal: cuotas,
      saldado: cuotasPagadasAhora >= cuotas
    };
  }
  return { error: 'Préstamo no encontrado' };
}

// Endpoint: ?action=cancelarPrestamo&prefijo=XX&data={token,id}
function cancelarPrestamoXX(prefijo, data) {
  var errAcceso = _validarAccesoPrestamos_(prefijo, data.token || '');
  if (errAcceso) return { error: errAcceso };
  if (!data.id) return { error: 'Falta ID del préstamo' };

  var hoja  = getHojaPrestamos(prefijo);
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][0]) !== String(data.id)) continue;
    hoja.getRange(i + 1, 10).setValue('CANCELADO');
    return { success: true };
  }
  return { error: 'Préstamo no encontrado' };
}

// ── BACKFILL MANUAL (opcional, ejecutar UNA vez desde el editor) ──
// Crea PRESTAMOS_XX para clientes que ya existían antes de este paso
// (hoy: XX y LP). No borra nada si ya existe.
function backfillPrestamosXX() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var hVend = ss.getSheetByName('VENDEDORES');
  if (!hVend) { Logger.log('No existe VENDEDORES'); return; }
  var datos = hVend.getDataRange().getValues();
  var creadas = [];
  for (var i = 1; i < datos.length; i++) {
    var prefijo = String(datos[i][0] || '').trim().toUpperCase();
    if (!prefijo) continue;
    crearHojaPrestamosXX(ss, prefijo);
    creadas.push(prefijo);
  }
  Logger.log('PRESTAMOS_XX revisada/creada para: ' + creadas.join(', '));
}

// ===============================
// MÓDULO CAJA — plata que entra y sale del negocio, por cliente
//
// ESTUDIO DE REFERENCIA (Seba21/Copihue, antes de programar):
// - CAJA_MOVIMIENTOS SÍ existe en Seba21: 9 columnas (FECHA,HORA,TIPO,
//   MOTIVO,MONTO,MEDIO,CATEGORIA,OBSERVACION,VENDEDOR), función
//   registrarMovimientoCaja() y lectura getCajaEgresos()/otra similar.
//   Se traslada 1:1 a CAJA_MOVIMIENTOS_XX.
// - Una hoja "CAJA" (apertura/cierre/saldo) NO EXISTE en Seba21 — está
//   confirmado en su propio código: el comentario de getCajaDiaria()
//   dice textualmente "en vez de buscar una hoja 'Caja' que no existe",
//   y esa función calcula los totales del día leyendo las filas
//   "TOTAL TICKET" de la hoja Ventas de Seba21 (un concepto de ticket
//   agrupado que Seba21 sí tiene). VAO tampoco tiene hoy ninguna hoja
//   "CAJA" ni un concepto de ticket en VENTAS_XX.
// CONCLUSIÓN: no hay estructura de referencia en NINGÚN lado (ni Seba21
//   ni VAO) para lo que sería CAJA_XX como hoja de saldo/apertura/
//   cierre — inventar sus columnas violaría la regla de no inventar
//   contabilidad nueva. Por eso en este paso se construye y conecta
//   SOLO CAJA_MOVIMIENTOS_XX (que sí tiene referencia clara); CAJA_XX
//   queda marcada REQUIERE DECISIÓN (ver mensaje a Victor) y no se crea
//   todavía ninguna hoja con ese nombre.
//
// Columnas CAJA_MOVIMIENTOS_<prefijo> (A–I), idénticas a Seba21:
//  A=Fecha B=Hora C=Tipo(INGRESO/EGRESO) D=Motivo E=Monto F=Medio
//  G=Categoria H=Observacion I=Vendedor

function crearHojaCajaMovimientosXX(ss, prefijo) {
  var nombreHoja = 'CAJA_MOVIMIENTOS_' + prefijo;
  if (ss.getSheetByName(nombreHoja)) return;
  var hoja = ss.insertSheet(nombreHoja);
  var headers = ['Fecha','Hora','Tipo','Motivo','Monto','Medio','Categoria','Observacion','Vendedor'];
  hoja.getRange(1, 1, 1, headers.length).setValues([headers]);
  hoja.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#37474f').setFontColor('#FFFFFF');
  hoja.setFrozenRows(1);
}

function getHojaCajaMovimientos(prefijo) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('CAJA_MOVIMIENTOS_' + prefijo);
  if (!hoja) { crearHojaCajaMovimientosXX(ss, prefijo); hoja = ss.getSheetByName('CAJA_MOVIMIENTOS_' + prefijo); }
  return hoja;
}

// Endpoint: ?action=registrarMovimientoCaja&prefijo=XX&data={token,tipo,
//   motivo,monto,medio,categoria,observacion,vendedor}
function registrarMovimientoCajaXX(prefijo, data) {
  var errAcceso = _validarAccesoCaja_(prefijo, data.token || '');
  if (errAcceso) return { error: errAcceso };

  var monto = parseFloat(data.monto) || 0;
  if (monto <= 0) return { error: 'Escribí un monto mayor que cero. No se registró nada.' };

  var tz = Session.getScriptTimeZone();
  var ahora = new Date();
  var hoja = getHojaCajaMovimientos(prefijo);
  hoja.appendRow([
    Utilities.formatDate(ahora, tz, 'yyyy-MM-dd'),
    Utilities.formatDate(ahora, tz, 'HH:mm'),
    (data.tipo || 'EGRESO').toUpperCase(),
    data.motivo || '',
    monto,
    (data.medio || 'EFECTIVO').toUpperCase(),
    data.categoria || '',
    data.observacion || '',
    data.vendedor || ''
  ]);
  return { success: true };
}

// Igual criterio que _registrarIngresoFiadoCaja_ de Seba21, pero interno
// (no es un endpoint — lo llaman cobrarFiadoXX/abonarFiadoXX de este
// mismo archivo cuando entra plata real de un fiado).
function _registrarIngresoFiadoCajaXX_(prefijo, monto, medio, cliente, obs) {
  try {
    if (!monto || monto <= 0) return;
    var tz = Session.getScriptTimeZone();
    var ahora = new Date();
    var hoja = getHojaCajaMovimientos(prefijo);
    hoja.appendRow([
      Utilities.formatDate(ahora, tz, 'yyyy-MM-dd'),
      Utilities.formatDate(ahora, tz, 'HH:mm'),
      'INGRESO',
      'COBRO FIADO — ' + (cliente || '').toUpperCase(),
      monto,
      (medio || 'EFECTIVO').toUpperCase(),
      'FIADOS',
      obs || '',
      ''
    ]);
  } catch (e) {
    Logger.log('_registrarIngresoFiadoCajaXX_ error (no crítico): ' + e.message);
  }
}

// Endpoint: ?action=getMovimientosCaja&prefijo=XX&data={token,tipo,limite}
function listarMovimientosCajaXX(prefijo, token, opts) {
  var errAcceso = _requiereSesionLectura_(prefijo, token);
  if (errAcceso) return { error: errAcceso };

  opts = opts || {};
  var filtroTipo = opts.tipo ? String(opts.tipo).toUpperCase() : null;
  var limite = parseInt(opts.limite) || 100;

  var hoja  = _hojaParaLeer_(prefijo, 'CAJA_MOVIMIENTOS_', getHojaCajaMovimientos) /* v036 */;
  var datos = hoja.getDataRange().getValues();
  var movimientos = [];

  for (var i = 1; i < datos.length; i++) {
    var fila = datos[i];
    if (!fila[0]) continue;
    var tipo = String(fila[2] || '').toUpperCase();
    if (filtroTipo && tipo !== filtroTipo) continue;
    movimientos.push({
      fecha:        String(fila[0] || ''),
      hora:         String(fila[1] || ''),
      tipo:         tipo,
      motivo:       String(fila[3] || ''),
      monto:        parseFloat(fila[4]) || 0,
      medio:        String(fila[5] || ''),
      categoria:    String(fila[6] || ''),
      observacion:  String(fila[7] || ''),
      vendedor:     String(fila[8] || '')
    });
  }

  movimientos.sort(function(a, b) { return (b.fecha + ' ' + b.hora).localeCompare(a.fecha + ' ' + a.hora); });
  var totalIngresos = movimientos.filter(function(m){ return m.tipo === 'INGRESO'; }).reduce(function(s,m){ return s+m.monto; }, 0);
  var totalEgresos  = movimientos.filter(function(m){ return m.tipo === 'EGRESO';  }).reduce(function(s,m){ return s+m.monto; }, 0);

  return {
    movimientos:    movimientos.slice(0, limite),
    total:          movimientos.length,
    totalIngresos:  Math.round(totalIngresos * 100) / 100,
    totalEgresos:   Math.round(totalEgresos * 100) / 100,
    saldoNeto:      Math.round((totalIngresos - totalEgresos) * 100) / 100
  };
}

// ── BACKFILL MANUAL (opcional, ejecutar UNA vez desde el editor) ──
// Crea CAJA_MOVIMIENTOS_XX para clientes que ya existían antes de este
// paso (hoy: XX y LP). No borra nada si ya existe.
function backfillCajaMovimientosXX() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var hVend = ss.getSheetByName('VENDEDORES');
  if (!hVend) { Logger.log('No existe VENDEDORES'); return; }
  var datos = hVend.getDataRange().getValues();
  var creadas = [];
  for (var i = 1; i < datos.length; i++) {
    var prefijo = String(datos[i][0] || '').trim().toUpperCase();
    if (!prefijo) continue;
    crearHojaCajaMovimientosXX(ss, prefijo);
    creadas.push(prefijo);
  }
  Logger.log('CAJA_MOVIMIENTOS_XX revisada/creada para: ' + creadas.join(', '));
}

// ===============================
// MÓDULO SALIDAS_XX — merma, consumo interno y otras bajas de stock
// que NO son una venta.
//
// SEBA21: hoja "SALIDAS" (10 columnas: Fecha,Hora,Producto,ID,Cantidad,
//   Costo Unit.,Precio Venta,Motivo,Observación,Vendedor), función
//   registrarSalidaInterna() (descuenta stock de Inventario por el
//   mismo índice de fila "id" que usa la venta, bloquea si no alcanza
//   el stock) y getSalidasInternas() (lectura). El motivo es un valor
//   cerrado que define el propio frontend de Seba21: CONSUMO, MERMA,
//   VENCIDO, REGALO, ROTURA, USO_INTERNO — se reutilizan esos 6 exactos,
//   no se inventan otros.
// VAO MULTIHOJA: mismo esquema y misma lógica sobre SALIDAS_XX,
//   usando el mismo "id" = número de fila de INVENTARIO_XX que ya usa
//   registrarVenta() (getProductos ya devuelve ese id).
// MOTIVO para NO agregar una columna de IdOperacion (a diferencia de
//   FIADOS/HISTORIAL/CAJA): Seba21 tampoco la tiene en SALIDAS, y la
//   regla de este paso es no agregar columnas que "parecen útiles" si
//   no están en la referencia — se deja igual que Seba21.
//
// Columnas SALIDAS_<prefijo> (A–J), idénticas a Seba21:
//  A=Fecha B=Hora C=Producto D=ID E=Cantidad F=CostoUnit G=PrecioVenta
//  H=Motivo I=Observacion J=Vendedor

var MOTIVOS_SALIDA_VALIDOS = ['CONSUMO','MERMA','VENCIDO','REGALO','ROTURA','USO_INTERNO'];

function crearHojaSalidasXX(ss, prefijo) {
  var nombreHoja = 'SALIDAS_' + prefijo;
  if (ss.getSheetByName(nombreHoja)) return;
  var hoja = ss.insertSheet(nombreHoja);
  var headers = ['Fecha','Hora','Producto','ID','Cantidad','CostoUnit','PrecioVenta','Motivo','Observacion','Vendedor'];
  hoja.getRange(1, 1, 1, headers.length).setValues([headers]);
  hoja.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#37474f').setFontColor('#FFFFFF');
  hoja.setFrozenRows(1);
}

function getHojaSalidas(prefijo) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('SALIDAS_' + prefijo);
  if (!hoja) { crearHojaSalidasXX(ss, prefijo); hoja = ss.getSheetByName('SALIDAS_' + prefijo); }
  return hoja;
}

// Endpoint: ?action=registrarSalida&prefijo=XX&data={token,id,cantidad,
//   motivo,obs,vendedor} — id = número de fila de INVENTARIO_XX (el
//   mismo "id" que devuelve getProductos y que ya usa registrarVenta).
function registrarSalidaXX(prefijo, data) {
  var errAcceso = _validarAccesoSalidas_(prefijo, data.token || '');
  if (errAcceso) return { error: errAcceso };

  var motivo = String(data.motivo || '').toUpperCase().trim();
  if (MOTIVOS_SALIDA_VALIDOS.indexOf(motivo) === -1) {
    return { error: 'Motivo no válido. Debe ser uno de: ' + MOTIVOS_SALIDA_VALIDOS.join(', ') };
  }

  var inv     = getHojaInv(prefijo);
  var datosInv = inv.getDataRange().getValues();
  var filaIdx = parseInt(data.id);
  if (!filaIdx || filaIdx < 2 || filaIdx > datosInv.length) return { error: 'Producto no encontrado' };

  var stockActual = parseInt(datosInv[filaIdx - 1][2]) || 0;
  var cantidad    = parseFloat(data.cantidad) || 0;
  if (cantidad <= 0) return { error: 'Cantidad inválida' };
  if (cantidad > stockActual) return { error: 'Stock insuficiente (hay ' + stockActual + '). No se registró nada: corregí la cantidad.' };

  var nombre = String(datosInv[filaIdx - 1][1] || '').trim().toUpperCase();
  var costo  = parseFloat(datosInv[filaIdx - 1][3]) || 0;
  var precio = parseFloat(datosInv[filaIdx - 1][4]) || 0;
  var nuevoStock = Math.max(0, stockActual - cantidad);
  inv.getRange(filaIdx, 3).setValue(nuevoStock);

  var tz    = Session.getScriptTimeZone();
  var ahora = new Date();
  var hoja  = getHojaSalidas(prefijo);
  hoja.appendRow([
    Utilities.formatDate(ahora, tz, 'yyyy-MM-dd'),
    Utilities.formatDate(ahora, tz, 'HH:mm'),
    nombre, 'ID' + filaIdx, cantidad, costo, precio,
    motivo, data.obs || '', data.vendedor || ''
  ]);

  return { success: true, nuevoStock: nuevoStock };
}

// Endpoint: ?action=getSalidas&prefijo=XX&data={token,motivo,fecha,limite}
function listarSalidasXX(prefijo, token, opts) {
  var errAcceso = _requiereSesionLectura_(prefijo, token);
  if (errAcceso) return { error: errAcceso };

  opts = opts || {};
  var filtroMotivo = opts.motivo ? String(opts.motivo).toUpperCase() : null;
  var filtroFecha  = opts.fecha  ? String(opts.fecha) : null;
  var limite = parseInt(opts.limite) || 100;

  var hoja  = _hojaParaLeer_(prefijo, 'SALIDAS_', getHojaSalidas) /* v036 */;
  var datos = hoja.getDataRange().getValues();
  var registros = [];

  for (var i = 1; i < datos.length; i++) {
    var fila = datos[i];
    if (!fila[0]) continue;
    var fecha = String(fila[0] || '');
    if (filtroFecha && fecha !== filtroFecha) continue;
    var motivo = String(fila[7] || '').toUpperCase();
    if (filtroMotivo && motivo !== filtroMotivo) continue;

    registros.push({
      fecha:       fecha,
      hora:        String(fila[1] || ''),
      producto:    String(fila[2] || ''),
      idProducto:  String(fila[3] || ''),
      cantidad:    parseFloat(fila[4]) || 0,
      costoUnit:   parseFloat(fila[5]) || 0,
      precioVenta: parseFloat(fila[6]) || 0,
      motivo:      motivo,
      observacion: String(fila[8] || ''),
      vendedor:    String(fila[9] || '')
    });
  }

  registros.sort(function(a, b) { return (b.fecha + ' ' + b.hora).localeCompare(a.fecha + ' ' + a.hora); });
  var totalUnidades = registros.reduce(function(s, r) { return s + r.cantidad; }, 0);
  var totalCostoPerdido = registros.reduce(function(s, r) { return s + (r.cantidad * r.costoUnit); }, 0);

  return {
    registros: registros.slice(0, limite),
    total: registros.length,
    totalUnidades: totalUnidades,
    totalCostoPerdido: Math.round(totalCostoPerdido * 100) / 100
  };
}

// ── BACKFILL MANUAL (opcional, ejecutar UNA vez desde el editor) ──
// Crea SALIDAS_XX para clientes que ya existían antes de este paso
// (hoy: XX y LP). No borra nada si ya existe.
function backfillSalidasXX() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var hVend = ss.getSheetByName('VENDEDORES');
  if (!hVend) { Logger.log('No existe VENDEDORES'); return; }
  var datos = hVend.getDataRange().getValues();
  var creadas = [];
  for (var i = 1; i < datos.length; i++) {
    var prefijo = String(datos[i][0] || '').trim().toUpperCase();
    if (!prefijo) continue;
    crearHojaSalidasXX(ss, prefijo);
    creadas.push(prefijo);
  }
  Logger.log('SALIDAS_XX revisada/creada para: ' + creadas.join(', '));
}

// ===============================
// MÓDULO AJUSTE_RAPIDO_XX — corrección manual de un producto (stock,
// precio, nombre o categoría) desde el POS, con auditoría de qué
// cambió y qué había antes. NO es lo mismo que SALIDAS_XX: una salida
// es una baja de stock con un motivo de negocio (merma, consumo...);
// un ajuste rápido es corregir un dato del producto que estaba mal
// cargado (ej. "el stock real es 8, no 5" o "el precio subió a $900").
//
// SEBA21: función ajustarProducto() — hoja "Ajuste_Rapido" (11
//   columnas: FECHA,PRODUCTO,NOMBRE ANTES,NOMBRE DESPUÉS,STOCK ANTES,
//   STOCK DESPUÉS,PRECIO ANTES,PRECIO DESPUÉS,CATEGORÍA ANTES,
//   CATEGORÍA DESPUÉS,USUARIO). Busca el producto por nombre en
//   Inventario, actualiza solo los campos que vienen en la petición
//   (si no vienen, no cambia ese campo) y deja un registro con el
//   antes/después de cada uno.
// VAO MULTIHOJA: misma hoja (11 columnas) y misma lógica sobre
//   AJUSTE_RAPIDO_XX e INVENTARIO_XX (adaptando los índices de columna
//   al layout real de INVENTARIO_XX: Código,Producto,Stock,Costo,
//   Venta,Proveedor,Categoría).
//
// LO QUE SE OMITE A PROPÓSITO (documentado, no inventado):
// - ajustarProducto() de Seba21 también llama a
//   _ajustarMulticompraProducto_() (editor de Multicompra). Victor
//   indicó explícitamente que el código de Multicompra no se pasa
//   porque se va a sacar del sistema — se omite por completo, no se
//   reconstruye ni se inventa un equivalente.
// - Seba21 NO tiene ninguna función de LECTURA de "Ajuste_Rapido" — es
//   una hoja de auditoría de solo escritura, nunca se vuelve a leer
//   desde el código. Por eso este paso NO agrega un endpoint de
//   lectura (getAjustes): no hay referencia de qué forma debería tener
//   ni para qué se usaría. Si en el futuro hace falta mostrarlo en el
//   HTML, es una REQUIERE DECISIÓN aparte (qué filtros, qué formato).
//
// Columnas AJUSTE_RAPIDO_<prefijo> (A–K), idénticas a Seba21:
//  A=Fecha B=Producto C=NombreAntes D=NombreDespues E=StockAntes
//  F=StockDespues G=PrecioAntes H=PrecioDespues I=CategoriaAntes
//  J=CategoriaDespues K=Usuario

function crearHojaAjusteRapidoXX(ss, prefijo) {
  var nombreHoja = 'AJUSTE_RAPIDO_' + prefijo;
  if (ss.getSheetByName(nombreHoja)) return;
  var hoja = ss.insertSheet(nombreHoja);
  var headers = ['Fecha','Producto','NombreAntes','NombreDespues','StockAntes',
    'StockDespues','PrecioAntes','PrecioDespues','CategoriaAntes','CategoriaDespues','Usuario'];
  hoja.getRange(1, 1, 1, headers.length).setValues([headers]);
  hoja.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#37474f').setFontColor('#FFFFFF');
  hoja.setFrozenRows(1);
}

function getHojaAjusteRapido(prefijo) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('AJUSTE_RAPIDO_' + prefijo);
  if (!hoja) { crearHojaAjusteRapidoXX(ss, prefijo); hoja = ss.getSheetByName('AJUSTE_RAPIDO_' + prefijo); }
  return hoja;
}

// Endpoint: ?action=ajusteRapido&prefijo=XX&data={token,producto,
//   stockDespues,precioDespues,nombreNuevo,categoriaDespues,usuario}
// Solo cambia los campos que vienen en data — igual que Seba21.
function _registrarAuditoriaAjusteXX_(prefijo, datos) {
  var hojaAjuste = getHojaAjusteRapido(prefijo);
  hojaAjuste.appendRow([
    new Date(), datos.producto,
    datos.nombreAntes, datos.nombreDespues !== datos.nombreAntes ? datos.nombreDespues : '',
    datos.stockAntes,  datos.stockDespues,
    datos.precioAntes, datos.precioDespues !== datos.precioAntes ? datos.precioDespues : '',
    datos.catAntes,    datos.catDespues    !== datos.catAntes    ? datos.catDespues    : '',
    datos.usuario || 'POS'
  ]);
}

function ajustarProductoXX(prefijo, data) {
  var errAcceso = _validarAccesoAjuste_(prefijo, data.token || '');
  if (errAcceso) return { error: errAcceso };

  var producto = String(data.producto || '').trim();
  if (!producto) return { error: 'Nombre de producto vacío' };

  var inv = getHojaInv(prefijo);
  var datosInv = inv.getDataRange().getValues();
  var productoNorm = producto.toUpperCase().replace(/\s+/g, ' ');
  var filaProducto = -1, nombreActual = '', stockActual = 0, precioActual = 0, catActual = '';

  for (var i = 1; i < datosInv.length; i++) {
    if (!datosInv[i][1]) continue;
    var nombreEnSheet = String(datosInv[i][1]).trim().toUpperCase().replace(/\s+/g, ' ');
    if (nombreEnSheet === productoNorm) {
      filaProducto = i + 1;
      nombreActual = String(datosInv[i][1]).trim();
      stockActual  = Number(datosInv[i][2]) || 0;
      precioActual = Number(datosInv[i][4]) || 0;
      catActual    = String(datosInv[i][6] || '').trim();
      break;
    }
  }
  if (filaProducto === -1) return { error: 'Producto no encontrado: ' + producto };

  var stockNuevo  = (data.stockDespues !== undefined && data.stockDespues !== null && data.stockDespues !== '') ? Number(data.stockDespues)  : stockActual;
  var precioNuevo = (data.precioDespues !== undefined && data.precioDespues !== null && data.precioDespues !== '') ? Number(data.precioDespues) : precioActual;
  var nombreNuevo = data.nombreNuevo ? String(data.nombreNuevo).trim().toUpperCase() : nombreActual;
  var catNueva    = data.categoriaDespues ? String(data.categoriaDespues).trim().toUpperCase() : catActual;

  inv.getRange(filaProducto, 3).setValue(stockNuevo); // Stock
  if (precioNuevo !== precioActual) inv.getRange(filaProducto, 5).setValue(precioNuevo); // Venta
  if (nombreNuevo !== nombreActual) inv.getRange(filaProducto, 2).setValue(nombreNuevo); // Producto
  if (catNueva    !== catActual)    inv.getRange(filaProducto, 7).setValue(catNueva);    // Categoria

  _registrarAuditoriaAjusteXX_(prefijo, {
    producto:     producto,
    nombreAntes:  nombreActual, nombreDespues: nombreNuevo,
    stockAntes:   stockActual,  stockDespues:  stockNuevo,
    precioAntes:  precioActual, precioDespues: precioNuevo,
    catAntes:     catActual,    catDespues:    catNueva,
    usuario:      data.usuario
  });

  var cambios = [];
  if (stockNuevo  !== stockActual)  cambios.push('Stock: '  + stockActual  + ' → ' + stockNuevo);
  if (precioNuevo !== precioActual) cambios.push('Precio: $' + precioActual + ' → $' + precioNuevo);
  if (nombreNuevo !== nombreActual) cambios.push('Nombre: ' + nombreActual + ' → ' + nombreNuevo);
  if (catNueva    !== catActual)    cambios.push('Categoría: ' + catActual + ' → ' + catNueva);

  return { success: true, mensaje: cambios.length ? cambios.join(' | ') : 'Sin cambios', stockNuevo: stockNuevo };
}

// ── BACKFILL MANUAL (opcional, ejecutar UNA vez desde el editor) ──
// Crea AJUSTE_RAPIDO_XX para clientes que ya existían antes de este
// paso (hoy: XX y LP). No borra nada si ya existe.
function backfillAjusteRapidoXX() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var hVend = ss.getSheetByName('VENDEDORES');
  if (!hVend) { Logger.log('No existe VENDEDORES'); return; }
  var datos = hVend.getDataRange().getValues();
  var creadas = [];
  for (var i = 1; i < datos.length; i++) {
    var prefijo = String(datos[i][0] || '').trim().toUpperCase();
    if (!prefijo) continue;
    crearHojaAjusteRapidoXX(ss, prefijo);
    creadas.push(prefijo);
  }
  Logger.log('AJUSTE_RAPIDO_XX revisada/creada para: ' + creadas.join(', '));
}

// ===============================
// MÓDULO DE OFERTAS — sobre INVENTARIO_XX
//
// MAPEO REALIZADO ANTES DE PROGRAMAR (paso 9):
// 1) Lógica actual de VAO: ninguna todavía — CONFIG_XX solo tiene el
//    flag extra_config_ofertas (on/off) y los 3 campos de RECIEN_LLEGADOS,
//    sin motor implementado detrás.
// 2) Referencia funcional #1 — la planilla "Patagonia" que Victor dio
//    directamente como spec de columnas/fórmulas (RELAMPAGO, DESTACADA,
//    ESPECIAL, PRECIO_PROMO, fórmula de badge y de unitario, 27 pasos
//    de evaluación con prioridad estricta).
// 3) Referencia funcional #2 — calcularOfertas() de Seba21: confirma que
//    su columna J de Inventario usa exactamente el mismo sistema de
//    badges ("2X1","3X2","REPONER X PARA OFERTA", etc.) que la planilla
//    Patagonia — son el mismo motor. calcularOfertas() le agrega ARRIBA
//    una capa de selección/rotación/límites por día y horario (leída de
//    una hoja config_sistema con columnas por día de semana) y una
//    exclusión especial para "Jueves Cervecero".
//
// QUÉ SE CONSTRUYE EN ESTE PASO (con referencia clara, sin inventar):
// - RELAMPAGO (códigos 0-14, mismos mínimos de stock), DESTACADA
//   (10%-70%, nunca vende bajo costo), ESPECIAL (10% fijo) y la regla
//   de ERROR DOBLE OFERTA — igual que la planilla Patagonia/Seba21,
//   ahora calculado en GAS sobre INVENTARIO_XX en vez de con fórmulas
//   de Sheets (adaptación: INVENTARIO_XX lo edita la app, no una
//   persona a mano, así que el cálculo vive en el backend).
// - RECIÉN LLEGADOS: usa los 3 campos que YA EXISTEN en CONFIG_XX
//   (RECIEN_LLEGADOS_PRECIO_MIN/_LIMITE/_DIAS) cruzados con la fecha de
//   primer ingreso de cada producto en HISTORIAL_XX (paso 4) — no hace
//   falta ninguna estructura nueva.
//
// QUÉ SE DEJA EXPLÍCITAMENTE FUERA (documentado, no inventado):
// - PROMOS / COMBOS (por categoría "PROMOS"/"COMBOS" en la planilla
//   Patagonia): en VAO la columna Categoría de INVENTARIO_XX ya se usa
//   para la categoría real del producto (bebidas, comidas, etc.) —
//   reutilizarla como flag de tipo de oferta pisaría ese uso. REQUIERE
//   DECISIÓN: dónde guardar ese flag sin romper Categoría.
// - MULTICOMPRA: Victor indicó explícitamente que no pasa ese código
//   ("se van a sacar igual del sistema") — no hay ninguna referencia
//   para estudiar, así que no se puede migrar ni adaptar. Sigue fuera.
// - JUEVES CERVECERO y el resto de calcularOfertas() (límites por tipo,
//   horarios por día de semana, rotación diaria de relámpago): dependen
//   de una hoja de configuración con estructura por día de semana que
//   VAO no tiene — CONFIG_XX está fijada en 52 campos y agregar los que
//   harían falta (máximos, horarios, día cervecero) excede esa lista.
//   REQUIERE DECISIÓN de Victor antes de tocar CONFIG_XX.
// - ÚLTIMAS UNIDADES: en Seba21 es selección MANUAL de productos
//   (ids guardados en una clave de config_sistema), no un cálculo
//   automático por stock bajo. Guardar esa selección en VAO también
//   excedería los 52 campos de CONFIG_XX. REQUIERE DECISIÓN.
// - "Personalizadas con porcentajes": funcionalmente es lo mismo que
//   DESTACADA (% arbitrario entre 10 y 70) — no se construyó como tipo
//   aparte porque sería duplicar la misma lógica con otro nombre.
//
// Columnas usadas en INVENTARIO_<prefijo> (H–K, antes "Reservada"):
//  H=Relampago(0-14) I=Destacada(%) J=Especial(0/1) K=PrecioPromo

var CODIGOS_RELAMPAGO_VALIDOS = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14];

// Calcula el badge y el precio unitario de UNA fila de INVENTARIO_XX,
// siguiendo el mismo orden de prioridad que la planilla Patagonia.
function _calcularOfertaFila_(fila) {
  var nombre    = String(fila[1] || '').trim();
  var stock     = parseInt(fila[2]) || 0;
  var costo     = parseFloat(fila[3]) || 0;
  var venta     = parseFloat(fila[4]) || 0;
  var relampago = fila[7] === '' || fila[7] === undefined ? 0 : parseInt(fila[7]);
  var destacada = fila[8] === '' || fila[8] === undefined ? 0 : parseFloat(fila[8]);
  var especial  = fila[9] === '' || fila[9] === undefined ? 0 : parseInt(fila[9]);
  var precioPromo = parseFloat(fila[10]) || 0;

  if (!nombre) return { badge: '', unitario: '' };
  if (isNaN(relampago)) relampago = 0;
  if (isNaN(especial))  especial  = 0;
  if (stock <= 0) return { badge: 'sin stock', unitario: '' };

  if (especial !== 0 && especial !== 1) return { badge: 'ERROR ESPECIAL', unitario: '' };
  if (CODIGOS_RELAMPAGO_VALIDOS.indexOf(relampago) === -1) return { badge: 'CODIGO RELAMPAGO NO VALIDO', unitario: '' };

  var activos = (especial === 1 ? 1 : 0) + (destacada > 0 ? 1 : 0) + (relampago > 0 ? 1 : 0);
  if (activos > 1) return { badge: 'ERROR DOBLE OFERTA', unitario: '' };

  if (destacada > 0 && destacada < 10) return { badge: 'ERROR DESTACADA MINIMO 10%', unitario: '' };
  if (destacada > 0 && destacada > 70) return { badge: 'ERROR DESTACADA MAXIMO 70%', unitario: '' };
  if (destacada > 0 && costo > 0 && venta * (1 - destacada / 100) <= costo) return { badge: 'ERROR DESTACADA BAJO COSTO', unitario: '' };

  if (relampago >= 1 && relampago <= 9 && stock < relampago + 1) {
    return { badge: 'REPONER ' + ((relampago + 1) - stock) + ' PARA OFERTA', unitario: '' };
  }
  if (relampago === 10 && stock < 2) {
    return { badge: 'REPONER ' + (2 - stock) + ' PARA OFERTA', unitario: '' };
  }

  if (especial === 1)  return { badge: 'especial',  unitario: Math.round(venta * 0.9 * 100) / 100 };
  if (destacada > 0)   return { badge: 'destacada', unitario: Math.round(venta * (1 - destacada / 100) * 100) / 100 };

  if (relampago >= 1 && relampago <= 9) {
    var unitarioNxM = precioPromo > 0 ? Math.round((precioPromo / (relampago + 1)) * 100) / 100 : '';
    return { badge: (relampago + 1) + 'x' + relampago, unitario: unitarioNxM };
  }
  if (relampago === 10) return { badge: '2da50', unitario: Math.round(((venta + venta * 0.5) / 2) * 100) / 100 };
  if (relampago === 11) return { badge: '10%', unitario: Math.round(venta * 0.9  * 100) / 100 };
  if (relampago === 12) return { badge: '15%', unitario: Math.round(venta * 0.85 * 100) / 100 };
  if (relampago === 13) return { badge: '20%', unitario: Math.round(venta * 0.8  * 100) / 100 };
  if (relampago === 14) return { badge: '25%', unitario: Math.round(venta * 0.75 * 100) / 100 };

  return { badge: 'sin oferta', unitario: venta };
}

var BADGES_SIN_OFERTA_ACTIVA = ['', 'sin stock', 'sin oferta'];

// Endpoint: ?action=getOfertas&prefijo=XX&data={token}
// Devuelve, por separado, las ofertas activas y los productos con
// errores de configuración (para que el POS pueda avisar), sin tocar
// PROMOS/COMBOS/MULTICOMPRA/JUEVES CERVECERO (fuera de este paso).
function getOfertasXX(prefijo, token) {
  var errAcceso = _requiereSesionLectura_(prefijo, token);
  if (errAcceso) return { error: errAcceso };

  var inv = getHojaInv(prefijo);
  var datos = inv.getDataRange().getValues();
  var activas = [], errores = [], reponer = [];

  for (var i = 1; i < datos.length; i++) {
    var fila = datos[i];
    if (!fila[1]) continue;
    var resultado = _calcularOfertaFila_(fila);
    var item = {
      fila: i + 1,
      codigo: String(fila[0] || ''),
      producto: String(fila[1]).trim(),
      stock: parseInt(fila[2]) || 0,
      precio: parseFloat(fila[4]) || 0,
      badge: resultado.badge,
      unitario: resultado.unitario
    };
    if (resultado.badge.indexOf('ERROR') === 0) errores.push(item);
    else if (resultado.badge.indexOf('REPONER') === 0) reponer.push(item);
    else if (BADGES_SIN_OFERTA_ACTIVA.indexOf(resultado.badge) === -1) activas.push(item);
  }

  return { activas: activas, errores: errores, reponer: reponer };
}

// Endpoint: ?action=getRecienLlegados&prefijo=XX&data={token}
// Usa RECIEN_LLEGADOS_PRECIO_MIN/_LIMITE/_DIAS (ya existentes en
// CONFIG_XX) cruzados con la primera fecha de ingreso de cada producto
// en HISTORIAL_XX (StockAnterior=0 = fue un alta, no una reposición).
function getRecienLlegadosXX(prefijo, token) {
  var errAcceso = _requiereSesionLectura_(prefijo, token);
  if (errAcceso) return { error: errAcceso };

  var cfg = leerConfig(prefijo).config;
  var precioMin = parseFloat(cfg.RECIEN_LLEGADOS_PRECIO_MIN) || 0;
  var limite    = parseInt(cfg.RECIEN_LLEGADOS_LIMITE) || 10;
  var dias      = parseInt(cfg.RECIEN_LLEGADOS_DIAS) || 7;

  var hist = _hojaParaLeer_(prefijo, 'HISTORIAL_', getHojaHistorial) /* v036 */;
  var histDatos = hist.getDataRange().getValues();
  var primerIngreso = {}; // producto -> fecha más antigua con StockAnterior=0

  for (var i = 1; i < histDatos.length; i++) {
    var fh = histDatos[i];
    if (!fh[1]) continue;
    if ((parseInt(fh[9]) || 0) !== 0) continue; // solo altas, no reposiciones
    var nombreH = String(fh[1]).trim().toUpperCase();
    var fechaH  = fh[0] instanceof Date ? fh[0] : new Date(fh[0]);
    if (isNaN(fechaH.getTime())) continue;
    if (!primerIngreso[nombreH] || fechaH < primerIngreso[nombreH]) primerIngreso[nombreH] = fechaH;
  }

  var inv = getHojaInv(prefijo);
  var invDatos = inv.getDataRange().getValues();
  var hoy = new Date();
  var recientes = [];

  for (var j = 1; j < invDatos.length; j++) {
    var filaP = invDatos[j];
    var nombreP = String(filaP[1] || '').trim();
    if (!nombreP) continue;
    var precio = parseFloat(filaP[4]) || 0;
    if (precio < precioMin) continue;

    var fechaAlta = primerIngreso[nombreP.toUpperCase()];
    if (!fechaAlta) continue; // sin historial de alta (cargado antes del paso 4, o vía import manual)
    var diasDesde = Math.floor((hoy - fechaAlta) / 86400000);
    if (diasDesde > dias) continue;

    recientes.push({
      producto: nombreP,
      precio: precio,
      stock: parseInt(filaP[2]) || 0,
      diasDesdeAlta: diasDesde
    });
  }

  recientes.sort(function(a, b) { return a.diasDesdeAlta - b.diasDesdeAlta; });
  return { recienLlegados: recientes.slice(0, limite), total: recientes.length };
}

// ── BACKFILL MANUAL (opcional, ejecutar UNA vez desde el editor) ──
// Renombra las columnas H/I ("Reservada") de INVENTARIO_XX a
// Relampago/Destacada y agrega Especial/PrecioPromo (J/K) en clientes
// que ya existían antes de este paso (hoy: XX y LP). No toca ningún
// valor de producto — solo encabezados y columnas nuevas en blanco.
function backfillColumnasOfertasXX() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var hVend = ss.getSheetByName('VENDEDORES');
  if (!hVend) { Logger.log('No existe VENDEDORES'); return; }
  var datos = hVend.getDataRange().getValues();
  var actualizadas = [];
  for (var i = 1; i < datos.length; i++) {
    var prefijo = String(datos[i][0] || '').trim().toUpperCase();
    if (!prefijo) continue;
    var hoja = ss.getSheetByName('INVENTARIO_' + prefijo);
    if (!hoja) continue;
    hoja.getRange(1, 8, 1, 4).setValues([['Relampago','Destacada','Especial','PrecioPromo']]);
    hoja.getRange(1, 8, 1, 4).setFontWeight('bold');
    actualizadas.push(prefijo);
  }
  Logger.log('Columnas de ofertas revisadas/creadas en INVENTARIO_XX para: ' + actualizadas.join(', '));
}

// ── BACKFILL MANUAL (opcional, ejecutar UNA vez desde el editor) ──
// Crea la hoja CLIENTES_XX para clientes que ya existían antes de este
// paso (hoy: XX y LP no la tienen). No borra nada si ya existe.
function backfillClientesXX() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var hVend = ss.getSheetByName('VENDEDORES');
  if (!hVend) { Logger.log('No existe VENDEDORES'); return; }
  var datos = hVend.getDataRange().getValues();
  var creadas = [];
  for (var i = 1; i < datos.length; i++) {
    var prefijo = String(datos[i][0] || '').trim().toUpperCase();
    if (!prefijo) continue;
    crearHojaClientesXX(ss, prefijo);
    creadas.push(prefijo);
  }
  Logger.log('CLIENTES_XX revisada/creada para: ' + creadas.join(', '));
}

// ── BACKFILL MANUAL (opcional, ejecutar UNA vez desde el editor) ──
// Completa la fila en CLIENTES_VAO de clientes que ya existen en
// VENDEDORES pero fueron creados antes de este cambio (hoy: LP).
// No modifica nada si el prefijo ya tiene fila en CLIENTES_VAO.
function backfillClientesVao() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var hVend = ss.getSheetByName('VENDEDORES');
  if (!hVend) { Logger.log('No existe VENDEDORES'); return; }
  var datos = hVend.getDataRange().getValues();
  var creados = [];
  for (var i = 1; i < datos.length; i++) {
    var f = datos[i];
    var prefijo = String(f[0] || '').trim().toUpperCase();
    if (!prefijo) continue;
    crearFilaClientesVao(
      prefijo,
      String(f[1] || '').trim(),   // nombre
      String(f[2] || '').trim(),   // telefono
      String(f[3] || '').trim(),   // correo
      String(f[4] || '').trim(),   // categoria → Plan
      String(f[8] || '').trim(),   // aliasPago
      String(f[9] || '').trim(),   // linkMP
      !!PropertiesService.getScriptProperties().getProperty('MP_TOKEN_' + prefijo)
    );
    creados.push(prefijo);
  }
  Logger.log('Backfill CLIENTES_VAO revisado para: ' + creados.join(', '));
}

// ── RESUMEN ADMIN ─────────────────────────────────────────────────

function getResumenAdmin(token) {
  if (!validarSesionAdmin(token)) return { error: 'Sesión admin inválida o expirada' };

  var ss      = SpreadsheetApp.getActiveSpreadsheet();
  var hVend   = ss.getSheetByName('VENDEDORES');
  if (!hVend) return { error: 'No existe hoja VENDEDORES' };

  var datos   = hVend.getDataRange().getValues();
  var clientes = [];
  var props   = PropertiesService.getScriptProperties();
  var todasProps = props.getProperties();
  var periodos33 = _leerPeriodos_(); // v033

  for (var i = 1; i < datos.length; i++) {
    var f       = datos[i];
    var prefijo = String(f[0] || '').trim().toUpperCase();
    if (!prefijo) continue;

    var tienePin   = !!props.getProperty('PIN_' + prefijo);
    var tieneToken = !!props.getProperty('MP_TOKEN_' + prefijo);
    var tieneSesion= Object.keys(todasProps).some(function(k) {
      return k.indexOf('SESSION_' + prefijo + '_') === 0;
    });

    // Contar ventas del mes
    var totalMes = 0;
    try {
      var hVentas = ss.getSheetByName('VENTAS_' + prefijo);
      if (hVentas) {
        var ventas  = hVentas.getDataRange().getValues();
        var hoy     = new Date();
        for (var v = 1; v < ventas.length; v++) {
          var fecha = ventas[v][0];
          if (fecha instanceof Date &&
              fecha.getMonth() === hoy.getMonth() &&
              fecha.getFullYear() === hoy.getFullYear()) {
            totalMes += parseFloat(ventas[v][5]) || 0;
          }
        }
      }
    } catch(e) {}

    var vigencia = _obtenerVigenciaCliente_(prefijo);
    var pl25 = _leerPlanes_();
    var codPlan = _planDeNegocio_(prefijo);
    var planObj = pl25.existe ? pl25.planes[codPlan] : null;
    var revisar = [];
    if (vigencia.revisar) revisar.push(vigencia.revisar);
    var ep = codPlan === 'PRUEBA' ? _estadoPrueba_(prefijo) : null; // v028
    if (ep && !ep.regularizada) revisar.push('PRUEBA sin regularizar: ' + ep.discrepancia);
    if (pl25.existe && !planObj) revisar.push(codPlan ? 'Plan "' + codPlan + '" no está en PLANES_VAO (se usa solo CONFIG)' : 'Sin plan asignado (se usa solo CONFIG)');

    clientes.push({
      prueba:      ep ? (ep.regularizada ? { regularizada: true, estado: ep.estado, dia: ep.dia, altaTxt: ep.altaTxt, venceTxt: ep.venceTxt, finGraciaTxt: ep.finGraciaTxt }
                          : { regularizada: false, discrepancia: ep.discrepancia, propuesta: ep.propuesta }) : null, // v028
      plan:        codPlan,                         // v025
      planNombre:  planObj ? planObj.nombre : '',   // v025
      enTolerancia:!!vigencia.enTolerancia,         // v025
      revisar:     revisar,                         // v025: avisos para el administrador
      prefijo:     prefijo,
      nombre:      String(f[1] || '').trim(),
      activo:      String(f[6] || '').trim().toLowerCase() === 'si',
      tienePin:    tienePin,
      tieneToken:  tieneToken,
      sesionActiva:tieneSesion,
      ventasMes:   totalMes,
      vigente:     vigencia.vigente,
      fechaVence:  vigencia.fechaVence,
      comercial:   _estadoComercial_(prefijo, codPlan, vigencia, periodos33, todasProps) // v033
    });
  }

  return { success: true, clientes: clientes };
}

// ===============================
// MÓDULO CONFIG — VAO SmartPOS
// Lee la configuración del cliente (hoja CONFIG_<prefijo>)
// El PIN es sensible y NUNCA se devuelve al frontend
// Cadena de validación (Reglas 24-29): prefijo → activo → token → token válido
// ===============================

function getConfig(prefijo, token, data) {
  var infoCliente = obtenerInfoCliente(prefijo);
  if (!infoCliente)        return { error: 'Cliente no encontrado' };
  var consulta = _motivoSoloLectura_(prefijo, infoCliente);   // v036
  if (consulta && !(data && data.modoConsulta === true)) {
    if (!infoCliente.activo) return { error: 'Cliente inactivo — contactar a VAO Sistemas' };
    return { error: 'Suscripción vencida — contactar a VAO Sistemas' };
  }
  // v036: en modo consulta el control de sesión no escribe (activo: igual que siempre)
  if (!(consulta ? _sesionClienteVigente_(prefijo, token) : validarSesionCliente(prefijo, token))) return { error: 'Sesión inválida o expirada' };

  var resultado = leerConfig(prefijo);
  if (resultado.config) delete resultado.config.PIN; // el PIN nunca sale del servidor
  // v025: el POS recibe los módulos YA combinados con el plan (EFECTIVO =
  // interruptor del negocio Y permiso del plan). Igual el servidor los vuelve
  // a exigir en cada acción, por si alguien altera el navegador.
  if (resultado.config) {
    var ef = _modulosEfectivos_(prefijo, resultado.config);
    Object.keys(ef.modulos).forEach(function (k) { resultado.config[k] = ef.modulos[k]; });
    resultado.config.plan = ef.codigoPlan;
    resultado.config.planNombre = ef.plan ? ef.plan.nombre : '';
    resultado.config.reglas = _reglasNegocio_(prefijo); // v028: los mismos límites que exige el servidor
    var ep = _estadoPrueba_(prefijo);
    resultado.config.estadoPrueba = (ep && ep.regularizada)
      ? { estado: ep.estado, dia: ep.dia, venceTxt: ep.venceTxt, finGraciaTxt: ep.finGraciaTxt } : null;
    resultado.config.modoConsulta = consulta || null;   // v036: el POS muestra la franja y desactiva lo que escribe
    resultado.cobro = _infoCobroV042_(prefijo);         // v042: POS V39 muestra 🔀 Mixto solo si está prendido
  }
  return resultado;
}

function leerConfig(prefijo) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('CONFIG_' + prefijo);
  if (!hoja) throw new Error('No existe hoja CONFIG_' + prefijo);

  var datos  = hoja.getDataRange().getValues();
  var config = {};

  for (var i = 1; i < datos.length; i++) {
    var campo = datos[i][0] ? String(datos[i][0]).trim() : '';
    if (!campo) continue; // fila separadora de sección ("--- IDENTIDAD ---", etc.), se ignora

    var valor = datos[i][1];
    if (valor === 'TRUE')  valor = true;
    if (valor === 'FALSE') valor = false;

    config[campo] = valor;
  }

  // Módulos base: nunca se apagan, aunque la planilla diga FALSE
  config.ventas    = true;
  config.cobrar    = true;
  config.ticket_wa = true;
  config.buscador  = true;

  return { config: config };
}

// =====================================================================
// v025 — PREFIJOS SEGUROS, PLANES Y MÓDULOS
// =====================================================================
// Regla de oro: un alta NUNCA puede apropiarse de una hoja que ya existe
// (del sistema o de otro negocio). Todo se verifica ANTES de escribir y,
// si algo falla a mitad de camino, se deshace lo que esta misma alta creó.
// No se modifica ni se borra ninguna hoja preexistente.
// =====================================================================

// Regla ÚNICA de prefijo para altas nuevas (admin.html la recibe de getPlanes,
// así frontend y backend usan exactamente la misma). Coincide con index.html
// (2 o 3 letras). Los negocios existentes con otro formato siguen funcionando:
// esta regla solo se aplica al dar de alta.
var PREFIJO_PATRON_ = '^[A-Z]{2,3}$';
var PREFIJOS_RESERVADOS_ = ['VAO', 'ADM', 'SYS'];

// Hojas centrales del sistema (no pertenecen a ningún negocio).
var HOJAS_SISTEMA_ = ['VENDEDORES', 'CLIENTES_VAO', 'PLANES_VAO', 'SOLICITUDES_VAO', 'PROMOCIONES_VAO', 'CUPOS_PROMO_VAO', 'PERIODOS_VAO', // v031: + registro y oferta · v033: + períodos
                      'CONTRATOS_VAO', 'ACEPTACIONES_VAO', // v038: contrato digital
                      'PAGOS_VAO', 'ORDENES_MP_VAO']; // v040: pagos

// Todas las hojas que usa un negocio XX. Un alta exige que NINGUNA exista.
// (CONF_DIARIA_ no se crea en el alta, pero la usa extra_horarios.)
var FAMILIAS_HOJAS_NEGOCIO_ = ['INVENTARIO_', 'VENTAS_', 'CLIENTES_', 'FIADOS_', 'HISTORIAL_', 'PRESTAMOS_',
                               'CAJA_MOVIMIENTOS_', 'SALIDAS_', 'AJUSTE_RAPIDO_', 'CONFIG_', 'CONF_DIARIA_'];

// Módulos que REALMENTE tienen pantalla en el POS hoy. Solo estos se ofrecen
// en los planes. Los demás interruptores de CONFIG_XX (préstamos, caja, etc.)
// no tienen pantalla: un negocio con plan reconocido no los recibe.
var MODULOS_IMPLEMENTADOS_ = [
  { clave: 'pack1_ingreso',      nombre: 'Ingreso de mercadería' },
  { clave: 'pack1_hoy',          nombre: 'Resumen del día' },
  { clave: 'pack2_editor_stock', nombre: 'Ajuste de stock' },
  { clave: 'pack2_reportes',     nombre: 'Reportes' },
  { clave: 'extra_fiados',       nombre: 'Fiados (cuentas de clientes)' }
];

// Qué módulo exige cada acción del servidor. Se controla en doGet, así el
// navegador no puede habilitarse un módulo cambiando una variable.
// (vender y venderFiado son la venta del POS: no se bloquean — ver informe.)
var MODULO_POR_ACCION_ = {
  ingresarMercaderia: 'pack1_ingreso',
  ajustarStock:       'pack2_editor_stock',
  getVentas:          'pack2_reportes',
  getVentasDiarias:   'pack2_reportes',
  getEstadisticas:    'pack2_reportes',
  getFiados:          'extra_fiados',
  getFiadosCliente:   'extra_fiados',
  registrarFiado:     'extra_fiados',
  abonarFiado:        'extra_fiados',
  cobrarFiado:        'extra_fiados',
  consultarDeuda:     'extra_fiados',
  getClientes:        'extra_fiados',
  getHistorial:       'extra_fiados',
  anularAbono:        'extra_fiados',   // v041
  getDeudaCliente:    'extra_fiados',   // v041
  getFichaCliente:    'extra_fiados',   // v042
  gestionarCliente:   'extra_fiados',   // v041
  getPrestamos:       'extra_prestamos',
  registrarPrestamo:  'extra_prestamos',
  pagarCuotaPrestamo: 'extra_prestamos',
  cancelarPrestamo:   'extra_prestamos',
  registrarMovimientoCaja: 'extra_retiro_caja',
  getMovimientosCaja:      'extra_retiro_caja',
  registrarSalida:         'extra_retiro_caja',
  getSalidas:              'extra_retiro_caja'
};

var PLANES_COLUMNAS_ = ['Plan', 'Nombre', 'Activo', 'Dias_vigencia', 'Dias_tolerancia'];

// ── utilidades ─────────────────────────────────────────────────────

function _normalizarPrefijo_(p) {
  return String(p == null ? '' : p).trim().toUpperCase();
}

function _normalizarPlan_(p) {
  return String(p == null ? '' : p).trim().toUpperCase()
    .replace(/Á/g, 'A').replace(/É/g, 'E').replace(/Í/g, 'I').replace(/Ó/g, 'O').replace(/Ú/g, 'U');
}

function _esVerdadero_(v) {
  if (v === true) return true;
  var s = String(v == null ? '' : v).trim().toUpperCase();
  return s === 'TRUE' || s === 'SI' || s === 'SÍ' || s === 'VERDADERO';
}

// Entero >= 0, o null si está vacío. Devuelve NaN si es inválido.
function _enteroOpcional_(v) {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  var n = Number(v);
  if (!isFinite(n) || n < 0 || Math.floor(n) !== n) return NaN;
  return n;
}

// v041: PAGOS_ y ABONOS_ se crean al primer cobro (no en el alta). Cuentan para ver si un prefijo está libre
// (conExtras = true), pero no para verificar que un alta quedó completa.
var FAMILIAS_V041_EXTRA_ = ['PAGOS_', 'ABONOS_'];
function _hojasDelNegocio_(prefijo, conExtras) {
  return FAMILIAS_HOJAS_NEGOCIO_.concat(conExtras ? FAMILIAS_V041_EXTRA_ : []).map(function (f) { return f + prefijo; });
}

function _esModuloImplementado_(clave) {
  return MODULOS_IMPLEMENTADOS_.some(function (m) { return m.clave === clave; });
}

// ── verificación de prefijo (sin escribir nada) ────────────────────

function _chequearPrefijoDisponible_(prefijo) {
  var motivos = [];
  if (!new RegExp(PREFIJO_PATRON_).test(prefijo)) {
    return { disponible: false, motivos: ['El prefijo debe tener 2 o 3 letras (A-Z), sin números, espacios ni símbolos'] };
  }
  if (PREFIJOS_RESERVADOS_.indexOf(prefijo) !== -1) {
    motivos.push(prefijo + ' es un prefijo reservado del sistema');
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  // Comparación sin distinguir mayúsculas: Google Sheets no admite dos hojas
  // que difieran solo en mayúsculas/minúsculas.
  var existentes = {};
  ss.getSheets().forEach(function (h) { existentes[String(h.getName()).trim().toUpperCase()] = true; });

  _hojasDelNegocio_(prefijo, true).forEach(function (nombre) {
    if (HOJAS_SISTEMA_.indexOf(nombre) !== -1) motivos.push(nombre + ' es una hoja del sistema');
    else if (existentes[nombre]) motivos.push('ya existe la hoja ' + nombre);
  });

  ['VENDEDORES', 'CLIENTES_VAO'].forEach(function (nombreHoja) {
    var h = ss.getSheetByName(nombreHoja);
    if (!h) return;
    var datos = h.getDataRange().getValues();
    for (var i = 1; i < datos.length; i++) {
      if (_normalizarPrefijo_(datos[i][0]) === prefijo) { motivos.push('ya está registrado en ' + nombreHoja); break; }
    }
  });

  var props = PropertiesService.getScriptProperties().getProperties();
  var restos = Object.keys(props).filter(function (k) {
    return k === 'PIN_' + prefijo || k === 'MP_TOKEN_' + prefijo || k === 'PRUEBA_7_3_' + prefijo || k.indexOf('SESSION_' + prefijo + '_') === 0;
  });
  if (restos.length) motivos.push('quedan datos de acceso guardados de un negocio anterior con ese prefijo');

  return { disponible: motivos.length === 0, motivos: motivos };
}

// Endpoint admin: ?action=verificarPrefijo&data={token,prefijo}
function verificarPrefijo(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  var prefijo = _normalizarPrefijo_(data.prefijo);
  var r = _chequearPrefijoDisponible_(prefijo);
  return { success: true, prefijo: prefijo, disponible: r.disponible, motivos: r.motivos };
}

// ── planes (hoja PLANES_VAO, editable desde Admin) ─────────────────

var _cachePlanes_ = null; // dura una sola ejecución (un pedido)

function _leerPlanes_() {
  if (_cachePlanes_) return _cachePlanes_;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('PLANES_VAO');
  if (!hoja) { _cachePlanes_ = { existe: false, planes: {}, orden: [] }; return _cachePlanes_; }

  var datos = hoja.getDataRange().getValues();
  var enc = (datos[0] || []).map(function (c) { return String(c).trim(); });
  var col = function (nombre) { return enc.indexOf(nombre); };
  var planes = {}, orden = [];
  for (var i = 1; i < datos.length; i++) {
    var f = datos[i];
    var codigo = _normalizarPlan_(f[col('Plan')]);
    if (!codigo) continue;
    var modulos = {}, definidos = {};
    MODULOS_IMPLEMENTADOS_.forEach(function (m) {
      var c = col(m.clave);
      definidos[m.clave] = c !== -1;                       // v029: columna ausente = "no definido", NO es FALSE
      modulos[m.clave] = c !== -1 && _esVerdadero_(f[c]);
    });
    var dv = _enteroOpcional_(f[col('Dias_vigencia')]);
    var dt = _enteroOpcional_(f[col('Dias_tolerancia')]);
    planes[codigo] = {
      codigo:         codigo,
      nombre:         String(f[col('Nombre')] || codigo).trim(),
      activo:         _esVerdadero_(f[col('Activo')]),
      diasVigencia:   (dv === null || isNaN(dv)) ? null : dv,
      diasTolerancia: (dt === null || isNaN(dt)) ? 0 : dt,
      fijo:           codigo === 'PRUEBA',
      definidos:      definidos,
      diasRaw:        f[col('Dias_vigencia')], toleranciaRaw: f[col('Dias_tolerancia')],
      modulos:        modulos,
      fila:           i + 1,
      // v031: datos comerciales (columnas opcionales; si faltan, null = "no configurado")
      precioRegular:     col('Precio_regular') === -1 ? null : _precioOpcional_(f[col('Precio_regular')]),
      precioLanzamiento: col('Precio_lanzamiento') === -1 ? null : _precioOpcional_(f[col('Precio_lanzamiento')]),
      moneda:            col('Moneda') === -1 ? null : (String(f[col('Moneda')] || '').trim().toUpperCase() || null),
      periodo:           col('Periodo_facturacion') === -1 ? null : (String(f[col('Periodo_facturacion')] || '').trim().toUpperCase() || null),
      contratable:       (col('Contratable') === -1 || _vacio_(f[col('Contratable')])) ? null : _esVerdadero_(f[col('Contratable')]),
      visible:           (col('Visible_en_planes') === -1 || _vacio_(f[col('Visible_en_planes')])) ? null : _esVerdadero_(f[col('Visible_en_planes')])
    };
    if (codigo === 'PRUEBA') { planes[codigo].diasVigencia = DIAS_PRUEBA_; planes[codigo].diasTolerancia = DIAS_GRACIA_PRUEBA_; } // v028: fijo
    orden.push(codigo);
  }
  _cachePlanes_ = { existe: true, planes: planes, orden: orden, hoja: hoja, encabezados: enc };
  return _cachePlanes_;
}

// Plan de un negocio: CLIENTES_VAO.F (vista comercial) y, si falta, VENDEDORES.E.
function _planDeNegocio_(prefijo) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var fuentes = [['CLIENTES_VAO', 5], ['VENDEDORES', 4]];
  for (var k = 0; k < fuentes.length; k++) {
    var h = ss.getSheetByName(fuentes[k][0]);
    if (!h) continue;
    var datos = h.getDataRange().getValues();
    for (var i = 1; i < datos.length; i++) {
      if (_normalizarPrefijo_(datos[i][0]) === prefijo) {
        var p = _normalizarPlan_(datos[i][fuentes[k][1]]);
        if (p) return p;
        break;
      }
    }
  }
  return '';
}

// Regla única de módulos:
//   EFECTIVO = interruptor del negocio (CONFIG_XX) Y permiso del plan (PLANES_VAO)
// - Si el plan del negocio no está en PLANES_VAO (negocios anteriores), el plan
//   no restringe: manda solo CONFIG_XX, exactamente como hasta v024.
// - Con plan reconocido, un módulo sin pantalla nunca queda habilitado.
function _modulosEfectivos_(prefijo, config) {
  var planes = _leerPlanes_();
  var codigo = _planDeNegocio_(prefijo);
  var plan = planes.existe ? planes.planes[codigo] : null;
  var res = {};
  Object.keys(config || {}).forEach(function (k) {
    if (!/^(pack\d+_|extra_)/.test(k)) return;
    var interruptor = config[k] === true || _esVerdadero_(config[k]);
    // v029: si PLANES_VAO no tiene la columna de ese módulo, el plan no lo define
    // y manda CONFIG_XX (como antes). Nunca se apaga algo por una columna ausente.
    var permitido = plan ? (_esModuloImplementado_(k) && (plan.definidos && plan.definidos[k] === false ? true : !!plan.modulos[k])) : true;
    res[k] = interruptor && permitido;
  });
  return { modulos: res, plan: plan, codigoPlan: codigo, planReconocido: !!plan };
}

function _verificarModuloAccion_(prefijo, data, modulo) {
  // Sin sesión válida no se informa nada sobre módulos: la función de
  // destino devuelve su error de sesión habitual.
  if (_requiereSesionLectura_(prefijo, (data && data.token) || '')) return null; // v036: también en modo consulta
  var config;
  try { config = leerConfig(prefijo).config; } catch (e) { return null; }
  var ef = _modulosEfectivos_(prefijo, config);
  if (ef.modulos[modulo] === true) return null;
  return 'Este módulo no está habilitado para tu negocio — contactar a VAO Sistemas';
}

// Endpoint admin: ?action=getPlanes&data={token}
function getPlanes(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  var pl = _leerPlanes_();
  return {
    success: true,
    existe: pl.existe,
    planes: pl.orden.map(function (c) {
      var p = pl.planes[c];
      return { codigo: p.codigo, nombre: p.nombre, activo: p.activo, diasVigencia: p.diasVigencia,
               diasTolerancia: p.diasTolerancia, modulos: p.modulos, fijo: !!p.fijo };
    }),
    modulosImplementados: MODULOS_IMPLEMENTADOS_,
    reglasPrefijo: { patron: PREFIJO_PATRON_, reservados: PREFIJOS_RESERVADOS_ }
  };
}

// Valores iniciales SUGERIDOS de los planes (son datos, no reglas: se editan
// desde Admin). Duración vacía = sin vencimiento automático.
function _planesIniciales_() {
  var todos = MODULOS_IMPLEMENTADOS_.map(function (m) { return m.clave; });
  return [
    { codigo: 'PRUEBA', nombre: 'Prueba', modulos: todos },
    { codigo: 'BASICO', nombre: 'Básico', modulos: ['pack1_ingreso', 'pack1_hoy', 'extra_fiados'] }, // v027: Fiados en todos los planes
    { codigo: 'PRO',    nombre: 'Pro',    modulos: todos }
  ];
}

// Qué módulos hoy encendidos dejaría de tener cada negocio existente si se
// crean los planes iniciales. No escribe nada.
function _impactoPlanesIniciales_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hVend = ss.getSheetByName('VENDEDORES');
  var iniciales = {};
  _planesIniciales_().forEach(function (p) { iniciales[p.codigo] = p; });
  var impacto = [];
  if (!hVend) return impacto;
  var datos = hVend.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    var prefijo = _normalizarPrefijo_(datos[i][0]);
    if (!prefijo) continue;
    var codigo = _planDeNegocio_(prefijo);
    var plan = iniciales[codigo];
    if (!plan) { impacto.push({ prefijo: prefijo, plan: codigo, reconocido: false, pierde: [] }); continue; }
    var config = {};
    try { config = leerConfig(prefijo).config; } catch (e) {}
    var pierde = MODULOS_IMPLEMENTADOS_.filter(function (m) {
      return _esVerdadero_(config[m.clave]) && plan.modulos.indexOf(m.clave) === -1;
    }).map(function (m) { return m.nombre; });
    impacto.push({ prefijo: prefijo, plan: codigo, reconocido: true, pierde: pierde });
  }
  return impacto;
}

// Endpoint admin: vista previa antes de crear los planes.
function previsualizarPlanes(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  return { success: true, existe: _leerPlanes_().existe, planesIniciales: _planesIniciales_(),
           modulosImplementados: MODULOS_IMPLEMENTADOS_, impacto: _impactoPlanesIniciales_() };
}

// Endpoint admin: crea PLANES_VAO SOLO si no existe (nunca la sobrescribe).
function inicializarPlanes(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName('PLANES_VAO')) return { error: 'PLANES_VAO ya existe — no se modifica', yaExiste: true };
  // v034: solo con confirmación explícita y bajo candado (un clic accidental o doble no crea ni pisa nada)
  if (data.confirmar !== true) return { error: 'Falta confirmar la creación de los planes iniciales.' };
  return _conLock_(function () { return _inicializarPlanesSinLock_(data); });
}

function _inicializarPlanesSinLock_(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  _cachePlanes_ = null;
  if (ss.getSheetByName('PLANES_VAO')) return { error: 'PLANES_VAO ya existe — no se modifica', yaExiste: true }; // se vuelve a mirar dentro del candado
  var claves = MODULOS_IMPLEMENTADOS_.map(function (m) { return m.clave; });
  var filas = [PLANES_COLUMNAS_.concat(claves).concat(['Notas'])];
  _planesIniciales_().forEach(function (p) {
    filas.push([p.codigo, p.nombre, 'TRUE', p.codigo === 'PRUEBA' ? DIAS_PRUEBA_ : '', p.codigo === 'PRUEBA' ? DIAS_GRACIA_PRUEBA_ : 0]
      .concat(claves.map(function (k) { return p.modulos.indexOf(k) !== -1 ? 'TRUE' : 'FALSE'; })).concat(['']));
  });
  var hoja = ss.insertSheet('PLANES_VAO');
  hoja.getRange(1, 1, filas.length, filas[0].length).setValues(filas);
  hoja.getRange(1, 1, 1, filas[0].length).setFontWeight('bold');
  hoja.setFrozenRows(1);
  _cachePlanes_ = null;
  return getPlanes(data);
}

// Endpoint admin: actualiza UN plan existente (no crea ni borra planes).
function guardarPlan(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  var p = data.plan || {};
  var codigo = _normalizarPlan_(p.codigo);
  var pl = _leerPlanes_();
  if (!pl.existe) return { error: 'Primero inicializá los planes' };
  var actual = pl.planes[codigo];
  if (!actual) return { error: 'Plan ' + codigo + ' no encontrado' };

  var dv = _enteroOpcional_(p.diasVigencia), dt = _enteroOpcional_(p.diasTolerancia);
  if (isNaN(dv) || isNaN(dt)) return { error: 'Los días deben ser números enteros, 0 o mayores' };
  var nombre = String(p.nombre || '').trim();
  if (!nombre) return { error: 'El plan necesita un nombre' };

  var enc = pl.encabezados, hoja = pl.hoja, fila = actual.fila;
  var escribir = function (col, valor) {
    var c = enc.indexOf(col);
    if (c === -1) { c = enc.length; enc.push(col); hoja.getRange(1, c + 1).setValue(col); }
    hoja.getRange(fila, c + 1).setValue(valor);
  };
  escribir('Nombre', nombre);
  escribir('Activo', p.activo ? 'TRUE' : 'FALSE');
  if (codigo === 'PRUEBA') { escribir('Dias_vigencia', DIAS_PRUEBA_); escribir('Dias_tolerancia', DIAS_GRACIA_PRUEBA_); } // v028: no configurable
  else {
  escribir('Dias_vigencia', dv === null ? '' : dv);
  escribir('Dias_tolerancia', dt === null ? 0 : dt);
  }
  MODULOS_IMPLEMENTADOS_.forEach(function (m) {
    if (p.modulos && m.clave in p.modulos) escribir(m.clave, p.modulos[m.clave] ? 'TRUE' : 'FALSE');
  });
  _cachePlanes_ = null;
  return { success: true, mensaje: '✅ Plan ' + nombre + ' guardado' };
}

// ── alta con reversión ─────────────────────────────────────────────

function _crearHojaVerificada_(ss, nombre, crear, creadas) {
  if (ss.getSheetByName(nombre)) throw new Error('la hoja ' + nombre + ' ya existía — no se reutiliza');
  crear();
  if (!ss.getSheetByName(nombre)) throw new Error('no se pudo crear la hoja ' + nombre);
  creadas.push(nombre);
}

function _crearHojaConEncabezado_(ss, nombre, encabezado) {
  var h = ss.insertSheet(nombre);
  h.getRange(1, 1, 1, encabezado.length).setValues([encabezado]);
  h.getRange(1, 1, 1, encabezado.length).setFontWeight('bold');
}

function _crearNegocio_(d) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var p = d.prefijo, creadas = [], filasAgregadas = [], propsAgregadas = [];
  try {
    _crearHojaVerificada_(ss, 'INVENTARIO_' + p, function () {
      _crearHojaConEncabezado_(ss, 'INVENTARIO_' + p, ['Código','Producto','Stock','P.Costo','P.Venta','Proveedor','Categoría','Relampago','Destacada','Especial','PrecioPromo']);
    }, creadas);
    _crearHojaVerificada_(ss, 'VENTAS_' + p, function () {
      _crearHojaConEncabezado_(ss, 'VENTAS_' + p, ['Fecha','Producto','Cantidad','P.Venta','Modo de pago','Total','VentaId']);
    }, creadas);
    _crearHojaVerificada_(ss, 'CLIENTES_' + p,         function () { crearHojaClientesXX(ss, p); }, creadas);
    _crearHojaVerificada_(ss, 'FIADOS_' + p,           function () { crearHojaFiadosXX(ss, p); }, creadas);
    _crearHojaVerificada_(ss, 'HISTORIAL_' + p,        function () { crearHojaHistorialXX(ss, p); }, creadas);
    _crearHojaVerificada_(ss, 'PRESTAMOS_' + p,        function () { crearHojaPrestamosXX(ss, p); }, creadas);
    _crearHojaVerificada_(ss, 'CAJA_MOVIMIENTOS_' + p, function () { crearHojaCajaMovimientosXX(ss, p); }, creadas);
    _crearHojaVerificada_(ss, 'SALIDAS_' + p,          function () { crearHojaSalidasXX(ss, p); }, creadas);
    _crearHojaVerificada_(ss, 'AJUSTE_RAPIDO_' + p,    function () { crearHojaAjusteRapidoXX(ss, p); }, creadas);
    _crearHojaVerificada_(ss, 'CONFIG_' + p, function () {
      crearHojaConfigDefault(ss, p, d.nombre, d.telefono, d.correo, d.aliasPago);
      // v029: interruptores EXACTAMENTE según PLANES_VAO para el plan elegido.
      var hc = ss.getSheetByName('CONFIG_' + p);
      var dc = hc.getDataRange().getValues();
      for (var i = 1; i < dc.length; i++) {
        var clave = String(dc[i][0]).trim();
        if (_esModuloImplementado_(clave)) hc.getRange(i + 1, 2).setValue(d.modulosPlan[clave] ? 'TRUE' : 'FALSE');
      }
    }, creadas);

    var hVend = ss.getSheetByName('VENDEDORES');
    var filaV = hVend.getLastRow() + 1;
    hVend.getRange(filaV, 1, 1, 11).setValues([[p, d.nombre, d.telefono, d.correo, d.plan, new Date(), 'si', d.comision, d.aliasPago, d.linkMP, '']]);
    filasAgregadas.push(['VENDEDORES', filaV]);

    var hCli = ss.getSheetByName('CLIENTES_VAO');
    if (hCli) {
      var filaC = hCli.getLastRow() + 1;
      hCli.getRange(filaC, 1, 1, 14).setValues([[p, d.nombre, d.contacto, d.telefono, d.correo, d.plan, 'ACTIVO',
        new Date(), d.fechaVence || '', d.aliasPago, d.linkMP, d.tokenMP ? 'CONFIGURADO ✅' : 'PENDIENTE ⚠️', 'CONFIGURADO ✅', d.obs || '']]);
      filasAgregadas.push(['CLIENTES_VAO', filaC]);
    }

    var props = PropertiesService.getScriptProperties();
    if (d.tokenMP) { props.setProperty('MP_TOKEN_' + p, d.tokenMP); propsAgregadas.push('MP_TOKEN_' + p); }
    var pin = generarPinAleatorio();
    props.setProperty('PIN_' + p, _hashFuerte_(pin, p)); // v026
    propsAgregadas.push('PIN_' + p);
    if (d.prueba) { // v028: marca de PRUEBA 7+3 con la fecha de alta del servidor
      props.setProperty('PRUEBA_7_3_' + p, JSON.stringify({ alta: d.prueba.alta.toISOString(), modo: 'alta' }));
      propsAgregadas.push('PRUEBA_7_3_' + p);
    }

    return { success: true, mensaje: '✅ Negocio ' + d.nombre + ' (' + p + ') creado', prefijo: p, pin: pin,
             plan: d.plan, fechaVence: d.fechaVence || null, hojasCreadas: creadas,
             prueba: d.prueba ? { altaTxt: d.prueba.altaTxt, venceTxt: d.prueba.venceTxt, finGraciaTxt: d.prueba.finGraciaTxt } : null };
  } catch (err) {
    // Reversión: se deshace SOLO lo que esta alta creó.
    var pendientes = [];
    var props2 = PropertiesService.getScriptProperties();
    propsAgregadas.forEach(function (k) { try { props2.deleteProperty(k); } catch (e) { pendientes.push('propiedad ' + k); } });
    filasAgregadas.slice().reverse().forEach(function (fa) {
      try {
        var h = ss.getSheetByName(fa[0]);
        if (h && _normalizarPrefijo_(h.getRange(fa[1], 1).getValue()) === p) h.deleteRow(fa[1]);
        else pendientes.push('fila ' + fa[1] + ' de ' + fa[0]);
      } catch (e) { pendientes.push('fila ' + fa[1] + ' de ' + fa[0]); }
    });
    creadas.slice().reverse().forEach(function (nombre) {
      try { var h = ss.getSheetByName(nombre); if (h) ss.deleteSheet(h); } catch (e) { pendientes.push('hoja ' + nombre); }
    });
    Logger.log('Alta de ' + p + ' cancelada: ' + err.message + (pendientes.length ? ' · revisar a mano: ' + pendientes.join(', ') : ''));
    return { error: 'Alta cancelada: ' + err.message + (pendientes.length ? ' — revisar a mano: ' + pendientes.join(', ') : ' — no quedó nada creado'),
             revertido: pendientes.length === 0, pendientesRevision: pendientes };
  }
}

// ── cambio de plan y módulos por negocio ───────────────────────────

function cambiarPlanCliente(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  var prefijo = _normalizarPrefijo_(data.prefijo);
  var codigo = _normalizarPlan_(data.plan);
  // v030: la firma de la vista previa es OBLIGATORIA. Sin ella no se sabe qué vio el Admin.
  if (!data.firma || typeof data.firma !== 'string') return { error: 'Falta la vista previa del cambio: abrila, revisala y confirmá desde ahí.', sinFirma: true };
  return _conLock_(function () {
    var pend = _cambioPlanPendiente_(prefijo);
    if (pend) return { error: 'Hay un cambio de plan sin terminar en ' + prefijo + ' (' + pend.de + ' → ' + pend.a + '). Revisalo en el checkpoint antes de hacer otro.', cambioPendiente: true };
    var pl = _leerPlanes_();
    if (!pl.existe) return { error: 'Primero inicializá los planes' };
    var plan = pl.planes[codigo];
    if (!plan) return { error: 'Plan ' + codigo + ' no encontrado' };
    if (!plan.activo) return { error: 'El plan ' + plan.nombre + ' está inactivo' };
    if (plan.contratable === false) return { error: 'El plan ' + plan.nombre + ' todavía no se puede contratar' }; // v031
    var planActual = _planDeNegocio_(prefijo);
    if (codigo === 'PRUEBA' && planActual !== 'PRUEBA') return { error: 'Un negocio no puede volver a PRUEBA: la prueba gratuita es solo al darlo de alta.' }; // v028
    if (codigo !== planActual) return { error: MSJ_PLAN_POR_PAGO_, requierePago: true }; // v033: solo se re-sincroniza el MISMO plan
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var hCli = ss.getSheetByName('CLIENTES_VAO'), hVend = ss.getSheetByName('VENDEDORES');
    if (_filaPrefijo_(hVend, prefijo) === -1) return { error: 'Cliente no encontrado en VENDEDORES' };
    var fC = _filaPrefijo_(hCli, prefijo);
    if (fC === -1) return { error: 'Cliente sin fila en CLIENTES_VAO — ejecutar backfillClientesVao() antes de cambiar el plan' };
    var p = _planificarModulos_(prefijo, codigo);
    if (p.error) return { error: p.error };
    if (data.firma !== p.firma) return { error: 'La configuración cambió desde la vista previa: volvé a revisarla.', firmaVieja: true };

    // Registro ANTES de escribir: si algo se corta, queda dicho qué se iba a hacer.
    var reg = { v: 30, de: planActual, a: codigo, ts: new Date().getTime(),
                cambios: p.cambios.map(function (c) { return { clave: c.clave, nombre: c.nombre, actual: c.actual, nuevo: c.nuevo }; }) };
    PropertiesService.getScriptProperties().setProperty(_claveCambioPlan_(prefijo), JSON.stringify(reg));
    // Orden seguro: en cada paso intermedio el negocio tiene, como mucho, los módulos
    // de ANTES y de DESPUÉS a la vez permitidos por el plan más chico (nunca de más).
    _aplicarCambiosModulos_(prefijo, p.cambios.filter(function (c) { return !c.nuevo; }));  // 1) se apagan
    _escribirPlan_(hVend, prefijo, 5, codigo);                                              // 2) VENDEDORES (E)
    _escribirPlan_(hCli, prefijo, 6, codigo);                                               // 3) CLIENTES_VAO (F) — la que manda
    var aplicado = _aplicarCambiosModulos_(prefijo, p.cambios.filter(function (c) { return c.nuevo; })); // 4) se encienden
    aplicado.cambiados = p.cambios.length;
    PropertiesService.getScriptProperties().deleteProperty(_claveCambioPlan_(prefijo));     // 5) terminado
    _cachePlanes_ = null;

    var aviso = '';
    if (planActual === 'PRUEBA' && codigo !== 'PRUEBA') {
      var fv = _fechaValida_(hCli.getRange(_filaPrefijo_(hCli, prefijo), 9).getValue());
      aviso = 'La fecha de vencimiento sigue siendo la de la prueba (' + (fv ? _fechaTxt_(fv) : 'sin fecha') + '): renová la vigencia del nuevo plan.';
    }
    return { success: true, prefijo: prefijo, plan: codigo, aviso: aviso, modulos: aplicado, contradicciones: p.contradicciones,
             mensaje: '✅ ' + prefijo + ' pasó al plan ' + plan.nombre };
  });
}

function getModulosCliente(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  var prefijo = _normalizarPrefijo_(data.prefijo);
  if (!obtenerInfoCliente(prefijo)) return { error: 'Cliente no encontrado' };
  var config;
  try { config = leerConfig(prefijo).config; } catch (e) { return { error: e.message }; }
  var ef = _modulosEfectivos_(prefijo, config);
  return {
    success: true, prefijo: prefijo, plan: ef.codigoPlan, planReconocido: ef.planReconocido,
    editable: ef.codigoPlan === 'PERSONALIZADO', // v029: solo PERSONALIZADO se edita módulo por módulo
    planNombre: ef.plan ? ef.plan.nombre : '',
    modulos: MODULOS_IMPLEMENTADOS_.map(function (m) {
      return { clave: m.clave, nombre: m.nombre,
               permitidoPorPlan: ef.plan ? !!ef.plan.modulos[m.clave] : null,
               interruptor: config[m.clave] === true || _esVerdadero_(config[m.clave]),
               efectivo: ef.modulos[m.clave] === true };
    })
  };
}

// Prende/apaga UN módulo implementado en CONFIG_XX (configuración particular).
// No permite encender lo que el plan no incluye.
function setModuloCliente(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  var prefijo = _normalizarPrefijo_(data.prefijo);
  var modulo = String(data.modulo || '').trim();
  var activo = data.activo === true;
  if (!_esModuloImplementado_(modulo)) return { error: 'Módulo no disponible: ' + modulo };
  if (!obtenerInfoCliente(prefijo)) return { error: 'Cliente no encontrado' };

  if (_cambioPlanPendiente_(prefijo)) return { error: 'Hay un cambio de plan sin terminar en ' + prefijo + ': revisalo en el checkpoint primero.', cambioPendiente: true }; // v030
  var ef = _modulosEfectivos_(prefijo, {});
  // v029: los planes estándar (PRUEBA, BÁSICO, PRO) no se editan módulo por módulo.
  if (ef.codigoPlan !== 'PERSONALIZADO') {
    return { error: 'Los módulos de ' + (ef.plan ? ef.plan.nombre : (ef.codigoPlan || 'este plan')) + ' los define el plan. Para elegir módulos uno por uno, pasá el negocio a PERSONALIZADO.' };
  }
  if (activo && ef.plan && !ef.plan.modulos[modulo]) {
    return { error: 'El plan ' + ef.plan.nombre + ' no incluye este módulo — cambiá el plan primero' };
  }
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CONFIG_' + prefijo);
  if (!hoja) return { error: 'No existe hoja CONFIG_' + prefijo };
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][0]).trim() === modulo) {
      hoja.getRange(i + 1, 2).setValue(activo ? 'TRUE' : 'FALSE');
      return getModulosCliente(data);
    }
  }
  hoja.appendRow([modulo, activo ? 'TRUE' : 'FALSE', 'agregado desde Admin (v025)']);
  return getModulosCliente(data);
}


// =====================================================================
// v026 — APRENDIZAJES DE SEBA BALANCE (verificación, hash, intentos)
// =====================================================================

function _conLock_(fn) {
  var lock = LockService.getScriptLock();
  var tiene = false;
  try { tiene = lock.tryLock(10000); } catch (e) { tiene = false; }
  if (!tiene) return { error: MSG41_.ocupadoGeneral, ocupado: true };
  try { return fn(); } finally { lock.releaseLock(); }
}

// Endpoint: ?action=verificarOperacion&prefijo=XX&data={token,tipo,id[,idFiado]}
// SOLO LECTURA. Responde si una operación enviada sin confirmar llegó.
// tipo: 'venta' (VentaId), 'fiado' (idOperacion), 'ingreso' (idOperacion),
//       'pagoFiado' (idOperacion de un abono/cobro + idFiado).
function verificarOperacion(prefijo, data) {
  var errAcceso = _requiereSesionLectura_(prefijo, data.token || '');
  if (errAcceso) return { error: errAcceso };
  var tipo = String(data.tipo || '');
  var id = String(data.id || '').trim();
  if (!id || id.length > 80) return { error: 'Identificador inválido' };

  if (tipo === 'venta') {
    var r = _buscarVentaPorId_(getHojaVentas(prefijo), id);
    return { success: true, tipo: tipo, id: id, existe: r.existe, procesados: r.procesados || [] };
  }
  if (tipo === 'fiado' || tipo === 'pagoFiado' || tipo === 'cobro') {   // v041: un cobro del motor sin terminar se retoma con Confirmar
    var id41 = tipo === 'pagoFiado' ? _opIdAbono41_(id) : (tipo === 'fiado' ? _opIdMotor41_(id, 'FV') : id);   // abonos de pantallas con id corto: mismo id derivado que usó el motor
    var pg41 = PropertiesService.getScriptProperties().getProperty('COBRO_' + id41);
    if (pg41) { var et41 = ''; try { et41 = JSON.parse(pg41).etapa; } catch (e) {} return { success: true, tipo: tipo, id: id, existe: false, enProceso: true, estado: et41 }; }
    if (tipo === 'cobro') return { success: true, tipo: tipo, id: id, existe: !!_filaConOp41_('PAGOS', prefijo, 2, id) };
    if (tipo === 'pagoFiado' && _filaConOp41_('PAGOS', prefijo, 2, id41)) return { success: true, tipo: tipo, id: id, existe: true };
  }
  if (tipo === 'fiado') {
    var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('FIADOS_' + prefijo);
    var datos = hoja ? hoja.getDataRange().getValues() : [];
    for (var i = 1; i < datos.length; i++) {
      if (String(datos[i][2]) === id || String(datos[i][2]) === _opIdMotor41_(id, 'FV')) return { success: true, tipo: tipo, id: id, existe: true };   // v041: id corto → id derivado
    }
    var opStr = PropertiesService.getScriptProperties().getProperty('FIADO_OP_' + prefijo + '_' + id);
    var estado = '';
    try { estado = opStr ? (JSON.parse(opStr).estado || '') : ''; } catch (e) { estado = 'ILEGIBLE'; }
    // Si quedó a medias en el servidor no se puede descartar: lo resuelve Confirmar o una revisión.
    return { success: true, tipo: tipo, id: id, existe: false, enProceso: !!estado, estado: estado };  // v027: INICIADA/STOCK_OK/VENTAS_OK los retoma Confirmar
  }
  if (tipo === 'ingreso') {
    var h = _buscarIdOperacionHistorial_(_hojaParaLeer_(prefijo, 'HISTORIAL_', getHojaHistorial), id); // v036
    return { success: true, tipo: tipo, id: id, existe: !!h.existe };
  }
  if (tipo === 'pagoFiado') {
    var hf = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('FIADOS_' + prefijo);
    var df = hf ? hf.getDataRange().getValues() : [];
    for (var k = 1; k < df.length; k++) {
      if (String(df[k][0]) !== String(data.idFiado || '')) continue;
      return { success: true, tipo: tipo, id: id, existe: String(df[k][13] || '').indexOf(id) !== -1,
               saldo: parseFloat(df[k][8]) || 0, estadoFiado: String(df[k][10] || '') };
    }
    return { success: true, tipo: tipo, id: id, existe: false, fiadoNoEncontrado: true };
  }
  return { error: 'Tipo de operación desconocido' };
}

// ── hash SHA-256 (con migración desde hashSimple) ──────────────────

function _hashFuerte_(texto, contexto) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
    'VAO2026|' + String(contexto || '') + '|' + String(texto), Utilities.Charset.UTF_8);
  return 'S2$' + bytes.map(function (b) { var h = (b < 0 ? b + 256 : b).toString(16); return h.length === 1 ? '0' + h : h; }).join('');
}

function _hashCoincide_(texto, guardado, contexto) {
  guardado = String(guardado || '');
  if (!guardado) return false;
  if (guardado.indexOf('S2$') === 0) return _hashFuerte_(texto, contexto) === guardado;
  return hashSimple(texto) === guardado; // formato viejo: se acepta y se migra al entrar bien
}

// ── límite de intentos de login ────────────────────────────────────

var MINUTOS_BLOQUEO_LOGIN_ = 15;

function _intentosMaxNegocio_(prefijo) {
  try {
    var n = parseInt(leerConfig(prefijo).config.intentos_max, 10);
    if (n >= 3) return n;
  } catch (e) {}
  return 5;
}

function _loginBloqueado_(clave) {
  var raw = PropertiesService.getScriptProperties().getProperty('LOGIN_FALLOS_' + clave);
  if (!raw) return 0;
  try {
    var st = JSON.parse(raw);
    var resto = (st.hasta || 0) - new Date().getTime();
    return resto > 0 ? Math.ceil(resto / 60000) : 0;
  } catch (e) { return 0; }
}

function _registrarFalloLogin_(clave, max) {
  var props = PropertiesService.getScriptProperties();
  var st = { n: 0, hasta: 0 };
  try { st = JSON.parse(props.getProperty('LOGIN_FALLOS_' + clave) || '{"n":0,"hasta":0}'); } catch (e) {}
  st.n = (st.n || 0) + 1;
  if (st.n >= max) { st.n = 0; st.hasta = new Date().getTime() + MINUTOS_BLOQUEO_LOGIN_ * 60000; }
  props.setProperty('LOGIN_FALLOS_' + clave, JSON.stringify(st));
}

function _limpiarFallosLogin_(clave) {
  PropertiesService.getScriptProperties().deleteProperty('LOGIN_FALLOS_' + clave);
}

// =====================================================================
// v028 — VALIDACIONES DE CANTIDAD Y PRECIO (servidor)
// =====================================================================
// Regla comercial de referencia (VAO POS, "💡 Sugerido (+50%)" desde V9):
//   precio de venta mínimo = costo × (1 + recargo_minimo_pct / 100)
//   Es RECARGO sobre el costo, NO margen sobre la venta:
//   recargo 50 % → costo 1000, venta 1500 → margen = 500/1500 = 33,3 %.
// Hasta v027 era solo una sugerencia en pantalla; desde v028 se exige.
// Todos los valores se pueden ajustar por negocio en CONFIG_XX (columna
// campo/valor). Si falta o es inválido se usa el valor seguro de abajo.
var REGLAS_DEFECTO_ = {
  recargo_minimo_pct:       50,        // venta ≥ costo × 1,50
  recargo_maximo_pct:       900,       // venta ≤ costo × 10 (más es sospechoso)
  cantidad_maxima:          5000,      // por ingreso o renglón de venta (bloqueo)
  cantidad_alerta:          200,       // más que esto pide confirmación
  stock_maximo:             100000,    // stock resultante máximo (bloqueo)
  precio_maximo:            10000000,  // precio unitario máximo (bloqueo)
  precio_alerta:            500000,    // sin costo de referencia, más que esto pide confirmación
  cambio_precio_alerta_pct: 50         // cambio de precio de ±50 % o más pide confirmación
};
var REGLAS_RANGO_ = {
  recargo_minimo_pct: [0, 1000], recargo_maximo_pct: [1, 100000], cantidad_maxima: [1, 100000],
  cantidad_alerta: [1, 100000], stock_maximo: [1, 10000000], precio_maximo: [1, 10000000000],
  precio_alerta: [1, 10000000000], cambio_precio_alerta_pct: [1, 10000]
};

function _reglasNegocio_(prefijo) {
  var cfg = {};
  try { cfg = leerConfig(prefijo).config || {}; } catch (e) { cfg = {}; }
  var r = {};
  Object.keys(REGLAS_DEFECTO_).forEach(function (k) {
    var v = cfg[k], n = (v === '' || v === null || v === undefined || v === true || v === false) ? NaN : Number(v);
    var rg = REGLAS_RANGO_[k];
    r[k] = (isFinite(n) && n >= rg[0] && n <= rg[1]) ? n : REGLAS_DEFECTO_[k];
  });
  if (r.cantidad_alerta > r.cantidad_maxima) r.cantidad_alerta = r.cantidad_maxima;
  if (r.recargo_maximo_pct <= r.recargo_minimo_pct) r.recargo_maximo_pct = REGLAS_DEFECTO_.recargo_maximo_pct > r.recargo_minimo_pct ? REGLAS_DEFECTO_.recargo_maximo_pct : r.recargo_minimo_pct * 10;
  if (r.precio_alerta > r.precio_maximo) r.precio_alerta = r.precio_maximo;
  return r;
}

// Entero sin signo ni decimales ("1.5", "-1", "10abc", "1e5" → NaN).
function _parseEntero_(v) {
  var s = String(v === null || v === undefined ? '' : v).trim();
  if (!/^\d{1,9}$/.test(s)) return NaN;
  return Number(s);
}
// Importe: hasta 2 decimales, punto o coma, sin signo ni exponente.
function _parseDinero_(v) {
  var s = String(v === null || v === undefined ? '' : v).trim();
  if (!/^\d{1,12}([.,]\d{1,2})?$/.test(s)) return NaN;
  return Number(s.replace(',', '.'));
}
function _vacio_(v) { return v === null || v === undefined || String(v).trim() === ''; }
function _pesos_(n) { return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

// Reglas de precio contra costo. Devuelve texto de error o ''.
function _errorPrecioCosto_(precio, costo, r) {
  if (!(costo > 0) || !(precio > 0)) return '';
  if (precio < costo) return 'El precio de venta (' + _pesos_(precio) + ') es MENOR que el costo (' + _pesos_(costo) + ').';
  var minimo = costo * (1 + r.recargo_minimo_pct / 100);
  if (precio < minimo) return 'El precio de venta (' + _pesos_(precio) + ') está por debajo del mínimo: costo + ' + r.recargo_minimo_pct + ' % = ' + _pesos_(Math.ceil(minimo)) + '.';
  var maximo = costo * (1 + r.recargo_maximo_pct / 100);
  if (precio > maximo) return 'El precio de venta (' + _pesos_(precio) + ') es más de ' + Math.round(maximo / costo) + ' veces el costo (' + _pesos_(costo) + '): revisá si sobra un cero.';
  return '';
}

function _rechazoValidacion_(msg, campo, extra) {
  var r = { success: false, definitivo: true, validacion: true, campo: campo || '', error: msg };
  if (extra) Object.keys(extra).forEach(function (k) { r[k] = extra[k]; });
  return r;
}

// INGRESO. fila = fila actual del INVENTARIO (o null si es nuevo).
function _validarIngreso_(data, fila, r) {
  var cantidad = _parseEntero_(data.cantidad);
  if (isNaN(cantidad)) return _rechazoValidacion_('Cantidad inválida: tiene que ser un número entero, sin decimales ni signos.', 'cantidad');
  if (cantidad < 1) return _rechazoValidacion_('La cantidad tiene que ser 1 o más.', 'cantidad');
  if (cantidad > r.cantidad_maxima) return _rechazoValidacion_('Cantidad ' + cantidad + ' supera el máximo permitido por ingreso (' + r.cantidad_maxima + '). Revisá si sobra un cero.', 'cantidad');

  var costo = null, venta = null;
  if (!_vacio_(data.costo)) {
    costo = _parseDinero_(data.costo);
    if (isNaN(costo) || costo <= 0) return _rechazoValidacion_('Costo inválido: tiene que ser un importe mayor que 0.', 'costo');
    if (costo > r.precio_maximo) return _rechazoValidacion_('Costo ' + _pesos_(costo) + ' fuera de rango (máximo ' + _pesos_(r.precio_maximo) + ').', 'costo');
  }
  if (!_vacio_(data.venta)) {
    venta = _parseDinero_(data.venta);
    if (isNaN(venta) || venta <= 0) return _rechazoValidacion_('Precio de venta inválido: tiene que ser un importe mayor que 0.', 'venta');
    if (venta > r.precio_maximo) return _rechazoValidacion_('Precio de venta ' + _pesos_(venta) + ' fuera de rango (máximo ' + _pesos_(r.precio_maximo) + ').', 'venta');
  }
  var stockAntes = fila ? (parseInt(fila[2]) || 0) : 0;
  if (stockAntes + cantidad > r.stock_maximo) return _rechazoValidacion_('El stock quedaría en ' + (stockAntes + cantidad) + ', más que el máximo (' + r.stock_maximo + ').', 'cantidad');
  if (!fila && venta === null) return _rechazoValidacion_('Producto nuevo: ingresá el precio de venta.', 'venta');

  var precioActual = fila ? (Number(fila[4]) || 0) : 0, costoActual = fila ? (Number(fila[3]) || 0) : 0;
  var precioFinal = venta !== null ? venta : precioActual;
  var costoFinal  = costo !== null ? costo : costoActual;
  // La regla de precio se exige cuando el ingreso toca precio o costo (no se
  // bloquea el stock de un producto viejo que ya estaba mal de precio).
  if (venta !== null || costo !== null) {
    var e = _errorPrecioCosto_(precioFinal, costoFinal, r);
    if (e) return _rechazoValidacion_(e + (venta === null ? ' Con el costo nuevo tenés que actualizar el precio de venta.' : ''), venta === null ? 'venta' : 'venta',
      { precioMinimo: costoFinal > 0 ? Math.ceil(costoFinal * (1 + r.recargo_minimo_pct / 100)) : 0 });
  }
  var pide = [];
  if (cantidad > r.cantidad_alerta && data.confirmarCantidad !== true) pide.push('cantidad');
  if (venta !== null && fila && precioActual > 0 && venta !== precioActual &&
      Math.abs(venta / precioActual - 1) * 100 >= r.cambio_precio_alerta_pct && data.confirmarPrecio !== true) pide.push('precio');
  if (venta !== null && !(costoFinal > 0) && venta > r.precio_alerta && data.confirmarPrecio !== true && pide.indexOf('precio') === -1) pide.push('precio');
  if (pide.length) {
    return _rechazoValidacion_('Hace falta confirmar: ' + pide.map(function (p) {
      return p === 'cantidad' ? 'cantidad grande (' + cantidad + ')' : (precioActual > 0 && fila ? 'cambio de precio de ' + _pesos_(precioActual) + ' a ' + _pesos_(venta) : 'precio alto (' + _pesos_(venta) + ')');
    }).join(' y ') + '.', pide[0], { requiereConfirmacion: pide });
  }
  return { ok: true, cantidad: cantidad, costo: costo, venta: venta };
}

// AJUSTE. filaActual = fila del INVENTARIO antes de tocarla.
function _validarAjuste_(data, filaActual, r) {
  var stockAntes = Number(filaActual[2]) || 0, precioAntes = Number(filaActual[4]) || 0, costo = Number(filaActual[3]) || 0;
  var res = { cambiaPrecio: false, nuevoPrecio: precioAntes };
  if (!_vacio_(data.stock)) {
    var st = _parseEntero_(data.stock);
    if (isNaN(st)) return _rechazoValidacion_('Stock inválido: tiene que ser un número entero, 0 o más.', 'stock');
    if (st > r.stock_maximo) return _rechazoValidacion_('Stock ' + st + ' supera el máximo (' + r.stock_maximo + '). Revisá si sobra un cero.', 'stock');
    res.nuevoStock = st;
  }
  if (!_vacio_(data.precio)) {
    var pr = _parseDinero_(data.precio);
    if (isNaN(pr) || pr <= 0) return _rechazoValidacion_('Precio inválido: tiene que ser un importe mayor que 0.', 'precio');
    if (pr > r.precio_maximo) return _rechazoValidacion_('Precio ' + _pesos_(pr) + ' fuera de rango (máximo ' + _pesos_(r.precio_maximo) + ').', 'precio');
    if (pr !== precioAntes) {
      var e = _errorPrecioCosto_(pr, costo, r);
      if (e) return _rechazoValidacion_(e, 'precio', { precioMinimo: costo > 0 ? Math.ceil(costo * (1 + r.recargo_minimo_pct / 100)) : 0 });
      res.cambiaPrecio = true; res.nuevoPrecio = pr;
    }
  }
  var pide = [];
  if (res.nuevoStock !== undefined && res.nuevoStock !== Number(data.stockOriginal) &&
      Math.abs(res.nuevoStock - stockAntes) > r.cantidad_alerta && data.confirmarCantidad !== true) pide.push('cantidad');
  if (res.cambiaPrecio && precioAntes > 0 && Math.abs(res.nuevoPrecio / precioAntes - 1) * 100 >= r.cambio_precio_alerta_pct && data.confirmarPrecio !== true) pide.push('precio');
  if (res.cambiaPrecio && !(costo > 0) && res.nuevoPrecio > r.precio_alerta && data.confirmarPrecio !== true && pide.indexOf('precio') === -1) pide.push('precio');
  if (pide.length) {
    return _rechazoValidacion_('Hace falta confirmar: ' + pide.map(function (p) {
      return p === 'cantidad' ? 'cambio grande de stock (' + stockAntes + ' → ' + res.nuevoStock + ')' : 'cambio de precio de ' + _pesos_(precioAntes) + ' a ' + _pesos_(res.nuevoPrecio);
    }).join(' y ') + '.', pide[0], { requiereConfirmacion: pide });
  }
  res.ok = true;
  return res;
}

// VENTAS (normal y fiada): cantidades enteras dentro del rango y precios válidos.
// Precio 0 se permite (es el "🎁 Regalo" del POS).
function _errorItemsVenta_(items, r) {
  if (!items || !items.length) return 'El carrito está vacío.';
  for (var i = 0; i < items.length; i++) {
    var it = items[i], nombre = String(it.name || ('id ' + it.id)).trim().toUpperCase();
    var q = _parseEntero_(it.qty);
    if (isNaN(q) || q < 1) return nombre + ': cantidad inválida (' + it.qty + ').';
    if (q > r.cantidad_maxima) return nombre + ': cantidad ' + q + ' supera el máximo (' + r.cantidad_maxima + ').';
    if (!_vacio_(it.precioVenta)) {
      var p = _parseDinero_(it.precioVenta);
      if (isNaN(p)) return nombre + ': precio inválido (' + it.precioVenta + ').';
      if (p > r.precio_maximo) return nombre + ': precio ' + _pesos_(p) + ' fuera de rango.';
    }
  }
  return '';
}

// =====================================================================
// v028 — PLAN PRUEBA: 7 DÍAS + 3 DE GRACIA (FIJO, NO CONFIGURABLE)
// =====================================================================
// Día 1 = día del alta (fecha del SERVIDOR). Días 1–7: ACTIVA. Días 8–10:
// GRACIA (sigue operando, con aviso). Desde el día 11: VENCIDA → se bloquean
// las escrituras desde el servidor; se puede entrar, consultar y exportar.
// Nunca se borra nada. Solo rige para PRUEBA "regularizadas": las creadas
// por v028 o las que Admin regularizó (marca PRUEBA_7_3_XX). Las PRUEBA
// anteriores siguen como estaban y Admin las muestra para regularizar.
var DIAS_PRUEBA_ = 7, DIAS_GRACIA_PRUEBA_ = 3;
var ACCIONES_ESCRITURA_ = ['vender', 'venderFiado', 'ingresarMercaderia', 'ajustarStock', 'registrarFiado', 'abonarFiado',
  'cobrarFiado', 'registrarPrestamo', 'pagarCuotaPrestamo', 'cancelarPrestamo', 'registrarMovimientoCaja', 'registrarSalida',
  'cobrar', 'anularAbono', 'gestionarCliente'];   // v041

function _diaSolo_(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function _sumarDias_(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
function _fechaTxt_(d) { return Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd/MM/yyyy'); }
function _fechaValida_(v) { if (!v) return null; var d = (v instanceof Date) ? v : new Date(v); return isNaN(d.getTime()) ? null : d; }

function _calcularPrueba_(alta) {
  var a = _diaSolo_(alta), hoy = _diaSolo_(new Date());
  var dia = Math.floor((hoy.getTime() - a.getTime()) / 86400000 + 0.5) + 1;
  var ultimoActivo = _sumarDias_(a, DIAS_PRUEBA_ - 1), ultimoGracia = _sumarDias_(a, DIAS_PRUEBA_ + DIAS_GRACIA_PRUEBA_ - 1);
  return { alta: a, dia: dia, vence: ultimoActivo, finGracia: ultimoGracia,
           estado: dia <= DIAS_PRUEBA_ ? 'ACTIVA' : (dia <= DIAS_PRUEBA_ + DIAS_GRACIA_PRUEBA_ ? 'GRACIA' : 'VENCIDA'),
           altaTxt: _fechaTxt_(a), venceTxt: _fechaTxt_(ultimoActivo), finGraciaTxt: _fechaTxt_(ultimoGracia) };
}

function _filaClientesVao_(prefijo) {
  var h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CLIENTES_VAO');
  if (!h) return null;
  var datos = h.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) if (_normalizarPrefijo_(datos[i][0]) === prefijo) return { hoja: h, fila: i + 1, datos: datos[i] };
  return null;
}

// null si el negocio no es PRUEBA.
function _estadoPrueba_(prefijo) {
  if (_planDeNegocio_(prefijo) !== 'PRUEBA') return null;
  var marca = PropertiesService.getScriptProperties().getProperty('PRUEBA_7_3_' + prefijo);
  if (marca) {
    var m = {}; try { m = JSON.parse(marca); } catch (e) {}
    var alta = _fechaValida_(m.alta);
    if (alta) { var c = _calcularPrueba_(alta); c.regularizada = true; return c; }
  }
  // PRUEBA anterior a v028: no se aplica la regla todavía; se describe la diferencia.
  var fc = _filaClientesVao_(prefijo);
  var altaOrig = fc ? _fechaValida_(fc.datos[7]) : null, venceOrig = fc ? _fechaValida_(fc.datos[8]) : null;
  var base = altaOrig || new Date();
  var prop = _calcularPrueba_(base);
  var difs = [];
  if (!altaOrig) difs.push('sin fecha de alta válida (se tomaría hoy)');
  if (!venceOrig) difs.push('sin fecha de vencimiento');
  else if (_diaSolo_(venceOrig).getTime() !== prop.vence.getTime()) difs.push('vence ' + _fechaTxt_(venceOrig) + ' (con la regla: ' + prop.venceTxt + ')');
  return { regularizada: false, discrepancia: difs.length ? difs.join(' · ') : 'fechas coinciden con la regla, falta confirmarla',
           propuesta: { altaTxt: prop.altaTxt, venceTxt: prop.venceTxt, finGraciaTxt: prop.finGraciaTxt, estado: prop.estado, dia: prop.dia, conservaAlta: !!altaOrig },
           venceActualTxt: venceOrig ? _fechaTxt_(venceOrig) : '' };
}

// Endpoint admin: vista previa (sin confirmar) o aplicación (confirmar:true).
function regularizarPrueba(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  var prefijo = _normalizarPrefijo_(data.prefijo);
  var ep = _estadoPrueba_(prefijo);
  if (!ep) return { error: prefijo + ' no está en plan PRUEBA' };
  if (ep.regularizada) return { error: prefijo + ' ya está regularizada (prueba hasta ' + ep.venceTxt + ', gracia hasta ' + ep.finGraciaTxt + ')' };
  if (data.confirmar !== true) return { success: true, vistaPrevia: true, prefijo: prefijo, discrepancia: ep.discrepancia, propuesta: ep.propuesta, venceActualTxt: ep.venceActualTxt };
  var fc = _filaClientesVao_(prefijo);
  if (!fc) return { error: 'Cliente sin fila en CLIENTES_VAO' };
  var altaOrig = _fechaValida_(fc.datos[7]);
  var alta = _diaSolo_(altaOrig || new Date());
  var c = _calcularPrueba_(alta);
  if (!altaOrig) fc.hoja.getRange(fc.fila, 8).setValue(alta);          // H = Fecha Alta (solo si no era válida)
  fc.hoja.getRange(fc.fila, 9).setValue(c.vence);                      // I = Fecha Vence = último día de prueba
  PropertiesService.getScriptProperties().setProperty('PRUEBA_7_3_' + prefijo, JSON.stringify({ alta: alta.toISOString(), modo: 'regularizada', el: new Date().toISOString() }));
  _cachePlanes_ = null;
  return { success: true, prefijo: prefijo, estado: c.estado, dia: c.dia, altaTxt: c.altaTxt, venceTxt: c.venceTxt, finGraciaTxt: c.finGraciaTxt,
           mensaje: '✅ ' + prefijo + ' regularizada: prueba hasta ' + c.venceTxt + ', gracia hasta ' + c.finGraciaTxt + ' (hoy: ' + c.estado + ')' };
}

// Bloqueo de escrituras para PRUEBA vencida (se llama desde el ruteo).
function _bloqueoPruebaVencida_(prefijo, action, data) {
  if (_requiereSesionValida_(prefijo, (data && data.token) || '')) return null; // sin sesión: error habitual de la función
  var ep = _estadoPrueba_(prefijo);
  if (!ep || !ep.regularizada || ep.estado !== 'VENCIDA') return null;
  // Lo que se empezó antes del vencimiento se puede verificar/terminar (no son operaciones nuevas).
  try {
    if (action === 'vender' && data.ventaId && _buscarVentaPorId_(getHojaVentas(prefijo), String(data.ventaId)).existe) return null;
    if (action === 'venderFiado' && data.idOperacion &&
        (PropertiesService.getScriptProperties().getProperty('FIADO_OP_' + prefijo + '_' + data.idOperacion) ||
         PropertiesService.getScriptProperties().getProperty('COBRO_' + data.idOperacion) ||   // v041
         _filaTicketFiado_(getHojaFiados(prefijo), String(data.idOperacion)))) return null;
    if (action === 'ingresarMercaderia' && data.idOperacion && _buscarIdOperacionHistorial_(getHojaHistorial(prefijo), String(data.idOperacion)).existe) return null;
  } catch (e) {}
  var msg = '🔒 La prueba gratuita terminó el ' + ep.finGraciaTxt + '. Tus datos están guardados y podés consultarlos y descargarlos; para seguir vendiendo hay que pasar a un plan. Contactá a VAO Sistemas.';
  var r = { success: false, definitivo: true, pruebaVencida: true, error: msg };
  if (action === 'vender') { delete r.error; r.procesados = []; r.bloqueados = []; r.errores = [msg]; } // formato "definitivo" que entiende el POS
  return r;
}

// Consulta/exportación de los datos propios (también con la prueba vencida).
function exportarDatos(prefijo, token) {
  var err = _requiereSesionLectura_(prefijo, token);
  if (err) return { error: err };
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var leer = function (n) { var h = ss.getSheetByName(n + prefijo); return h ? h.getDataRange().getDisplayValues() : []; };
  return { success: true, prefijo: prefijo, generado: new Date().toISOString(),
           inventario: leer('INVENTARIO_'), ventas: leer('VENTAS_'), fiados: leer('FIADOS_') };
}

// Una sola prueba por persona: mismo teléfono (últimos 8 dígitos) o correo.
function _pruebaYaUsada_(telefono, correo) {
  var h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CLIENTES_VAO');
  if (!h) return '';
  var tel = String(telefono || '').replace(/\D/g, ''), mail = String(correo || '').trim().toLowerCase();
  var t8 = tel.length >= 8 ? tel.slice(-8) : '';
  var datos = h.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    var t = String(datos[i][3] || '').replace(/\D/g, ''), m = String(datos[i][4] || '').trim().toLowerCase();
    if ((t8 && t.length >= 8 && t.slice(-8) === t8) || (mail && m === mail)) return _normalizarPrefijo_(datos[i][0]);
  }
  return '';
}


// =====================================================================
// v029 — UNA SOLA CONFIGURACIÓN COHERENTE DE MÓDULOS
// =====================================================================
// PLANES_VAO dice qué módulos incluye cada plan estándar (PRUEBA, BÁSICO, PRO).
// CONFIG_XX guarda los interruptores del negocio. En planes estándar deben
// coincidir con el plan; en PERSONALIZADO cada módulo se elige dentro de lo
// que PLANES_VAO permita para ese plan.
// Ventas, cobro, ticket y buscador son ESENCIALES: siempre encendidos (leerConfig).
// El checkpoint SOLO LEE. Sincronizar exige confirmación y la "firma" de lo visto.
var PLANES_ESTANDAR_ = ['PRUEBA', 'BASICO', 'PRO'];

function _firma_(obj) { return hashSimple(JSON.stringify(obj)); }

function _interruptoresConfig_(prefijo) {
  var h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CONFIG_' + prefijo);
  if (!h) return null;
  var datos = h.getDataRange().getValues(), res = {};
  for (var i = 1; i < datos.length; i++) {
    var k = String(datos[i][0] || '').trim();
    if (_esModuloImplementado_(k)) res[k] = _esVerdadero_(datos[i][1]);
  }
  return res;
}

// Qué interruptores habría que cambiar para que CONFIG_XX quede según el plan.
function _planificarModulos_(prefijo, codigoDestino) {
  var pl = _leerPlanes_();
  if (!pl.existe) return { error: 'Primero inicializá los planes' };
  var plan = pl.planes[codigoDestino];
  if (!plan) return { error: 'Plan ' + (codigoDestino || '(sin plan)') + ' no está en PLANES_VAO' };
  var cfg = _interruptoresConfig_(prefijo);
  if (!cfg) return { error: 'No existe CONFIG_' + prefijo };
  var cambios = [], noDefinidos = [], contradicciones = [];
  var estandar = PLANES_ESTANDAR_.indexOf(codigoDestino) !== -1;
  MODULOS_IMPLEMENTADOS_.forEach(function (m) {
    var actual = (m.clave in cfg) ? cfg[m.clave] : null;    // null = falta la fila en CONFIG
    if (!plan.definidos[m.clave]) { noDefinidos.push(m.nombre); return; } // no se toca lo que el plan no define
    // v030: PRUEBA, BÁSICO y PRO incluyen Fiados completos (decisión 15/10). Si PLANES_VAO
    // dice otra cosa, se informa y NO se apaga Fiados en ningún negocio por esa planilla.
    if (estandar && m.clave === MODULO_FIADOS_ && !plan.modulos[m.clave]) {
      contradicciones.push({ clave: m.clave, nombre: m.nombre, enConfig: actual,
        mensaje: 'PLANES_VAO dice que ' + plan.nombre + ' NO incluye Fiados, pero la regla es que PRUEBA, BÁSICO y PRO incluyen Fiados completos. ' +
                 'No se apaga ni se cambia nada: corregí PLANES_VAO en 🧩 Planes y volvé a revisar.' });
      return;
    }
    var nuevo;
    if (codigoDestino === 'PERSONALIZADO') nuevo = plan.modulos[m.clave] ? !!actual : false; // se conserva lo elegido, dentro del tope
    else nuevo = !!plan.modulos[m.clave];
    if (actual !== nuevo) cambios.push({ clave: m.clave, nombre: m.nombre, actual: actual, nuevo: nuevo });
  });
  var planActual = _planDeNegocio_(prefijo);
  return { plan: plan, planActual: planActual, cambios: cambios, noDefinidos: noDefinidos, contradicciones: contradicciones,
           firma: _firma_([prefijo, planActual, codigoDestino, cambios, contradicciones.map(function (c) { return c.clave; })]) };
}

function _aplicarCambiosModulos_(prefijo, cambios) {
  var h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CONFIG_' + prefijo);
  var datos = h.getDataRange().getValues();
  cambios.forEach(function (c) {
    for (var i = 1; i < datos.length; i++) {
      if (String(datos[i][0]).trim() === c.clave) { h.getRange(i + 1, 2).setValue(c.nuevo ? 'TRUE' : 'FALSE'); return; }
    }
    h.appendRow([c.clave, c.nuevo ? 'TRUE' : 'FALSE', 'agregado al sincronizar con el plan (v029)']);
  });
  var cfg = _interruptoresConfig_(prefijo);
  var activos = [], inactivos = [];
  MODULOS_IMPLEMENTADOS_.forEach(function (m) { (cfg[m.clave] ? activos : inactivos).push(m.nombre); });
  return { activos: activos, inactivos: inactivos, cambiados: cambios.length };
}

function _checkpointUno_(prefijo) {
  var codigo = _planDeNegocio_(prefijo);
  var fc = _filaClientesVao_(prefijo);
  var planCli = fc ? _normalizarPlan_(fc.datos[5]) : '';
  var hV = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('VENDEDORES');
  var planVend = '';
  if (hV) { var dv = hV.getDataRange().getValues(); for (var i = 1; i < dv.length; i++) if (_normalizarPrefijo_(dv[i][0]) === prefijo) { planVend = _normalizarPlan_(dv[i][4]); break; } }
  var r = { prefijo: prefijo, plan: codigo, avisos: [] };
  var pend = _cambioPlanPendiente_(prefijo);
  if (pend) { // v030: un cambio de plan se cortó a mitad de camino
    var rec = _estadoRecuperacion_(prefijo, pend);
    r.estado = 'CAMBIO_INCOMPLETO'; r.cambioPendiente = rec; r.diferencias = [];
    r.avisos.push('Un cambio de plan ' + pend.de + ' → ' + pend.a + ' quedó sin terminar. Elegí completarlo o revertirlo.');
    return r;
  }
  r.prueba = _resumenPrueba_(prefijo); // v030: PRUEBA regularizada o pendiente de regularizar
  if (planCli && planVend && planCli !== planVend) r.avisos.push('El plan no coincide: CLIENTES_VAO dice ' + planCli + ' y VENDEDORES dice ' + planVend + ' (se usa ' + codigo + ').');
  var p = _planificarModulos_(prefijo, codigo);
  if (p.error) { r.estado = 'NO_SE_PUEDE'; r.avisos.push(p.error); r.diferencias = []; return r; }
  r.planNombre = p.plan.nombre;
  r.diferencias = p.cambios.map(function (c) { return { clave: c.clave, nombre: c.nombre, enConfig: c.actual, segunPlan: c.nuevo }; });
  if (p.noDefinidos.length) r.avisos.push('PLANES_VAO no define para ' + p.plan.nombre + ': ' + p.noDefinidos.join(', ') + ' (se deja como está).');
  r.contradicciones = p.contradicciones;
  // v030: Fiados siempre a la vista: CONFIG, PLANES_VAO y la regla.
  var cfg = _interruptoresConfig_(prefijo) || {};
  var enCfg = (MODULO_FIADOS_ in cfg) ? cfg[MODULO_FIADOS_] : null;
  var enPlanilla = p.plan.definidos[MODULO_FIADOS_] ? !!p.plan.modulos[MODULO_FIADOS_] : null;
  var reglaAplica = PLANES_ESTANDAR_.indexOf(codigo) !== -1;
  r.fiados = { enConfig: enCfg, enPlanilla: enPlanilla, regla: reglaAplica ? true : null,
               ok: reglaAplica ? (enPlanilla === true && enCfg === true) : true };
  if (reglaAplica && enPlanilla === false) r.fiados.mensaje = 'PLANES_VAO no incluye Fiados en ' + p.plan.nombre + ' y la regla dice que sí. Mientras no se corrija la planilla, este negocio no ve la pantalla de Fiados.';
  else if (reglaAplica && enPlanilla === null) r.fiados.mensaje = 'PLANES_VAO no tiene la columna de Fiados.';
  else if (reglaAplica && enCfg !== true) r.fiados.mensaje = 'Fiados está apagado en CONFIG_' + prefijo + ': se enciende al sincronizar.';
  r.estado = r.diferencias.length ? 'DIFERENCIAS' : (p.contradicciones.length ? 'REVISAR_PLAN' : 'COINCIDE');
  r.firma = p.firma;
  return r;
}

// Endpoint admin, SOLO LECTURA: un negocio (prefijo) o todos.
function checkpointModulos(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  var lista = [];
  if (data.prefijo) lista = [_normalizarPrefijo_(data.prefijo)];
  else {
    var h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('VENDEDORES');
    var dv = h ? h.getDataRange().getValues() : [];
    for (var i = 1; i < dv.length; i++) { var p = _normalizarPrefijo_(dv[i][0]); if (p) lista.push(p); }
  }
  var negocios = lista.map(_checkpointUno_);
  return { success: true, soloLectura: true, negocios: negocios,
           resumen: { // v030
             pruebasSinRegularizar: negocios.filter(function (n) { return n.prueba && !n.prueba.regularizada; }).map(function (n) { return n.prefijo; }),
             fiadosConDiferencia: negocios.filter(function (n) { return n.fiados && !n.fiados.ok; }).map(function (n) { return n.prefijo; }),
             cambiosIncompletos: negocios.filter(function (n) { return n.estado === 'CAMBIO_INCOMPLETO'; }).map(function (n) { return n.prefijo; }) } };
}

// Endpoint admin: aplica lo que mostró el checkpoint (confirmar + misma firma).
function sincronizarModulos(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  var prefijo = _normalizarPrefijo_(data.prefijo);
  if (data.confirmar !== true) return { error: 'Falta la confirmación' };
  return _conLock_(function () {
    if (_cambioPlanPendiente_(prefijo)) return { error: 'Hay un cambio de plan sin terminar en ' + prefijo + ': completalo o revertilo primero.', cambioPendiente: true }; // v030
    var codigo = _planDeNegocio_(prefijo);
    var p = _planificarModulos_(prefijo, codigo);
    if (p.error) return { error: p.error };
    if (data.firma !== p.firma) return { error: 'La configuración cambió desde que la revisaste: volvé a abrir el checkpoint.' };
    var res = _aplicarCambiosModulos_(prefijo, p.cambios);
    res.success = true; res.prefijo = prefijo; res.plan = codigo;
    res.mensaje = '✅ ' + prefijo + ' sincronizado con ' + p.plan.nombre + ' (' + p.cambios.length + ' cambio' + (p.cambios.length === 1 ? '' : 's') + ')';
    return res;
  });
}

// Endpoint admin, SOLO LECTURA: qué cambiaría al pasar a otro plan.
function previsualizarCambioPlan(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  var prefijo = _normalizarPrefijo_(data.prefijo), destino = _normalizarPlan_(data.plan);
  var actual = _planDeNegocio_(prefijo);
  if (destino === 'PRUEBA' && actual !== 'PRUEBA') return { error: 'Un negocio no puede volver a PRUEBA: la prueba gratuita es solo al darlo de alta.' };
  if (destino !== actual) return { error: MSJ_PLAN_POR_PAGO_, requierePago: true }; // v033
  if (_cambioPlanPendiente_(prefijo)) return { error: 'Hay un cambio de plan sin terminar en ' + prefijo + ': revisalo en el checkpoint primero.', cambioPendiente: true }; // v030
  var p = _planificarModulos_(prefijo, destino);
  if (p.error) return { error: p.error };
  if (!p.plan.activo) return { error: 'El plan ' + p.plan.nombre + ' está inactivo' };
  if (p.plan.contratable === false) return { error: 'El plan ' + p.plan.nombre + ' todavía no se puede contratar' }; // v031
  return { success: true, soloLectura: true, prefijo: prefijo, planActual: actual, planNuevo: destino, planNombre: p.plan.nombre,
           seActivan: p.cambios.filter(function (c) { return c.nuevo; }).map(function (c) { return c.nombre; }),
           seDesactivan: p.cambios.filter(function (c) { return !c.nuevo; }).map(function (c) { return c.nombre; }),
           noDefinidos: p.noDefinidos, contradicciones: p.contradicciones, firma: p.firma,
           avisoVigencia: actual === 'PRUEBA' && destino !== 'PRUEBA' ? 'Después de cambiar, renová la vigencia del nuevo plan (la fecha de la prueba no cambia sola).' : '' };
}

// Endpoint admin, SOLO LECTURA: estado de la tabla de planes.
function checkpointPlanes(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  var pl = _leerPlanes_();
  if (!pl.existe) return { success: true, existe: false, avisos: ['No existe PLANES_VAO'] };
  var avisos = [], corregible = false;
  var pr = pl.planes.PRUEBA;
  if (pr && (Number(pr.diasRaw) !== DIAS_PRUEBA_ || Number(pr.toleranciaRaw) !== DIAS_GRACIA_PRUEBA_)) {
    avisos.push('PRUEBA en la hoja dice ' + (pr.diasRaw === '' ? '(vacío)' : pr.diasRaw) + ' días / ' + (pr.toleranciaRaw === '' ? '(vacío)' : pr.toleranciaRaw) +
      ' de gracia. La regla obligatoria es 7 + 3 (el sistema ya la aplica; se puede corregir la hoja).');
    corregible = true;
  }
  var fiadosFaltan = [];
  pl.orden.forEach(function (c) {
    var p = pl.planes[c];
    var faltan = MODULOS_IMPLEMENTADOS_.filter(function (m) { return !p.definidos[m.clave]; }).map(function (m) { return m.nombre; });
    if (faltan.length) avisos.push(p.nombre + ': falta definir ' + faltan.join(', ') + ' (columna ausente en PLANES_VAO).');
    // v030: PRUEBA, BÁSICO y PRO incluyen Fiados completos.
    if (PLANES_ESTANDAR_.indexOf(c) !== -1 && p.definidos[MODULO_FIADOS_] && !p.modulos[MODULO_FIADOS_]) {
      fiadosFaltan.push(c);
      avisos.push(p.nombre + ': PLANES_VAO NO incluye Fiados. La regla es que PRUEBA, BÁSICO y PRO incluyen Fiados completos.');
    }
  });
  return { success: true, existe: true, avisos: avisos, corregiblePrueba: corregible, fiadosFaltan: fiadosFaltan,
           corregibleFijos: corregible || fiadosFaltan.length > 0, tienePersonalizado: !!pl.planes.PERSONALIZADO,
           planes: pl.orden.map(function (c) { var p = pl.planes[c]; return { codigo: c, nombre: p.nombre, modulos: p.modulos, definidos: p.definidos }; }) };
}

// Endpoint admin: escribe 7 y 3 en la fila PRUEBA de PLANES_VAO (con confirmación).
function corregirPlanesFijos(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  if (data.confirmar !== true) return { error: 'Falta la confirmación' };
  var pl = _leerPlanes_();
  if (!pl.existe || !pl.planes.PRUEBA) return { error: 'No hay fila PRUEBA en PLANES_VAO' };
  var c1 = pl.encabezados.indexOf('Dias_vigencia'), c2 = pl.encabezados.indexOf('Dias_tolerancia'), f = pl.planes.PRUEBA.fila;
  if (c1 !== -1) pl.hoja.getRange(f, c1 + 1).setValue(DIAS_PRUEBA_);
  if (c2 !== -1) pl.hoja.getRange(f, c2 + 1).setValue(DIAS_GRACIA_PRUEBA_);
  // v030: Fiados incluido en PRUEBA, BÁSICO y PRO. Solo la planilla de planes: ningún CONFIG_XX cambia.
  var cF = pl.encabezados.indexOf(MODULO_FIADOS_), conFiados = [];
  if (cF !== -1) PLANES_ESTANDAR_.forEach(function (c) {
    var p = pl.planes[c];
    if (p && !p.modulos[MODULO_FIADOS_]) { pl.hoja.getRange(p.fila, cF + 1).setValue('TRUE'); conFiados.push(p.nombre); }
  });
  _cachePlanes_ = null;
  return { success: true, fiadosAgregados: conFiados,
           mensaje: '✅ PRUEBA en PLANES_VAO: 7 días + 3 de gracia' + (conFiados.length ? ' · Fiados incluido en ' + conFiados.join(', ') + ' (los negocios se revisan uno por uno en su checkpoint)' : '') };
}

// Endpoint admin: agrega la fila PERSONALIZADO (con confirmación). El tope son
// los módulos que existen hoy; qué tiene cada negocio se elige en su ficha.
function agregarPlanPersonalizado(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  if (data.confirmar !== true) return { error: 'Falta la confirmación' };
  var pl = _leerPlanes_();
  if (!pl.existe) return { error: 'Primero inicializá los planes' };
  if (pl.planes.PERSONALIZADO) return { error: 'PERSONALIZADO ya existe' };
  var fila = pl.encabezados.map(function (h) {
    if (h === 'Plan') return 'PERSONALIZADO';
    if (h === 'Nombre') return 'Personalizado';
    if (h === 'Activo') return 'TRUE';
    if (h === 'Dias_tolerancia') return 0;
    if (h === 'Notas') return 'Módulos elegidos uno por uno en la ficha del negocio';
    if (_esModuloImplementado_(h)) return 'TRUE';
    return '';
  });
  pl.hoja.appendRow(fila);
  _cachePlanes_ = null;
  return { success: true, mensaje: '✅ Plan PERSONALIZADO agregado' };
}


// =====================================================================
// v030 — CAMBIO DE PLAN SEGURO Y RECUPERABLE
// =====================================================================
// Antes de escribir, cambiarPlanCliente deja un registro (propiedad CAMBIO_PLAN_XX)
// con el plan de origen, el de destino y cada interruptor (antes → después).
// Si la ejecución se corta, el negocio queda marcado "CAMBIO_INCOMPLETO" en el
// checkpoint y no se acepta otro cambio hasta que Admin elija COMPLETAR o REVERTIR.
// La recuperación compara lo que HAY con lo que tiene que haber: solo escribe lo
// que falta, así que repetirla no duplica nada.
var MODULO_FIADOS_ = 'extra_fiados';

function _claveCambioPlan_(prefijo) { return 'CAMBIO_PLAN_' + prefijo; }

function _cambioPlanPendiente_(prefijo) {
  var v = PropertiesService.getScriptProperties().getProperty(_claveCambioPlan_(prefijo));
  if (!v) return null;
  try { return JSON.parse(v); } catch (e) { return { de: '?', a: '?', cambios: [], ilegible: true }; }
}

function _filaPrefijo_(h, prefijo) {
  if (!h) return -1;
  var datos = h.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) if (_normalizarPrefijo_(datos[i][0]) === prefijo) return i + 1;
  return -1;
}

function _escribirPlan_(h, prefijo, col, codigo) {
  var f = _filaPrefijo_(h, prefijo);
  if (f === -1) throw new Error('No se encontró ' + prefijo + ' en ' + h.getName());
  if (_normalizarPlan_(h.getRange(f, col).getValue()) !== codigo) h.getRange(f, col).setValue(codigo);
}

// Qué falta para llegar a "completar" y a "revertir" (solo lectura).
function _estadoRecuperacion_(prefijo, reg) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var leerPlan = function (nombre, col) {
    var h = ss.getSheetByName(nombre), f = _filaPrefijo_(h, prefijo);
    return f === -1 ? null : _normalizarPlan_(h.getRange(f, col).getValue());
  };
  var cfg = _interruptoresConfig_(prefijo) || {};
  var items = [
    { que: 'Plan en VENDEDORES', hoy: leerPlan('VENDEDORES', 5), antes: reg.de, despues: reg.a },
    { que: 'Plan en CLIENTES_VAO', hoy: leerPlan('CLIENTES_VAO', 6), antes: reg.de, despues: reg.a }
  ];
  (reg.cambios || []).forEach(function (c) {
    items.push({ que: c.nombre || c.clave, clave: c.clave, hoy: (c.clave in cfg) ? cfg[c.clave] : null, antes: c.actual, despues: c.nuevo });
  });
  var faltaCompletar = items.filter(function (it) { return it.hoy !== it.despues; }).length;
  var faltaRevertir = items.filter(function (it) { return it.antes === null ? (it.hoy === true) : it.hoy !== it.antes; }).length;
  return { de: reg.de, a: reg.a, desde: reg.ts ? new Date(reg.ts).toISOString() : '', ilegible: !!reg.ilegible, items: items,
           faltaCompletar: faltaCompletar, faltaRevertir: faltaRevertir,
           firma: _firma_([prefijo, reg.ts || 0, items.map(function (it) { return [it.que, it.hoy]; })]) };
}

// Endpoint admin: sin confirmar = vista previa; con confirmar:true + modo + firma = aplica.
function recuperarCambioPlan(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  var prefijo = _normalizarPrefijo_(data.prefijo);
  var reg0 = _cambioPlanPendiente_(prefijo);
  if (!reg0) return { error: prefijo + ' no tiene ningún cambio de plan pendiente' };
  if (reg0.ilegible) return { error: 'El registro del cambio pendiente está dañado: revisión manual (no se aplica nada a ciegas).' };
  if (data.confirmar !== true) return { success: true, vistaPrevia: true, prefijo: prefijo, recuperacion: _estadoRecuperacion_(prefijo, reg0) };
  var modo = data.modo;
  if (modo !== 'completar' && modo !== 'revertir') return { error: 'Elegí completar o revertir' };
  return _conLock_(function () {
    var reg = _cambioPlanPendiente_(prefijo);
    if (!reg) return { error: prefijo + ' ya no tiene cambios pendientes' };
    var est = _estadoRecuperacion_(prefijo, reg);
    if (data.firma !== est.firma) return { error: 'El estado cambió desde que lo revisaste: volvé a abrir el checkpoint.', firmaVieja: true };
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var destinoPlan = modo === 'completar' ? reg.a : reg.de;
    var cambios = (reg.cambios || []).map(function (c) {
      var objetivo = modo === 'completar' ? c.nuevo : (c.actual === null ? false : c.actual);
      return { clave: c.clave, nombre: c.nombre, nuevo: objetivo };
    });
    var cfg = _interruptoresConfig_(prefijo) || {};
    var faltan = cambios.filter(function (c) { return !((c.clave in cfg) && cfg[c.clave] === c.nuevo); });
    // Mismo orden seguro: apagar → planes → encender.
    _aplicarCambiosModulos_(prefijo, faltan.filter(function (c) { return !c.nuevo; }));
    _escribirPlan_(ss.getSheetByName('VENDEDORES'), prefijo, 5, destinoPlan);
    _escribirPlan_(ss.getSheetByName('CLIENTES_VAO'), prefijo, 6, destinoPlan);
    var res = _aplicarCambiosModulos_(prefijo, faltan.filter(function (c) { return c.nuevo; }));
    PropertiesService.getScriptProperties().deleteProperty(_claveCambioPlan_(prefijo));
    _cachePlanes_ = null;
    res.success = true; res.prefijo = prefijo; res.plan = destinoPlan; res.modo = modo; res.escritos = faltan.length;
    res.mensaje = '✅ ' + prefijo + (modo === 'completar' ? ': cambio completado, plan ' : ': cambio revertido, plan ') + destinoPlan;
    return res;
  });
}

// PRUEBA en el checkpoint: regularizada (con día y estado) o pendiente, a la vista.
function _resumenPrueba_(prefijo) {
  var ep = _estadoPrueba_(prefijo);
  if (!ep) return null;
  if (ep.regularizada) return { regularizada: true, estado: ep.estado, dia: ep.dia, venceTxt: ep.venceTxt, finGraciaTxt: ep.finGraciaTxt };
  return { regularizada: false, discrepancia: ep.discrepancia, propuesta: ep.propuesta,
           aviso: 'PRUEBA anterior a v028, SIN REGULARIZAR: hoy no vence sola (' + ep.discrepancia + '). No se bloquea en silencio: regularizala en la ficha del negocio (vista previa + confirmación).' };
}


// =====================================================================
// v031 — PRECIOS, OFERTA DE LANZAMIENTO Y ALTA AUTOMÁTICA DE PRUEBA
// =====================================================================
// planes.html (pública, sin sesión) lee los planes con getPlanesPublicos y
// registra una PRUEBA con registroSolicitarCodigo → registroConfirmar.
// El alta usa el MISMO camino que Admin (_altaNegocioSinLock_ → _crearNegocio_),
// bajo el lock del script. La contratación PAGA sigue bloqueada hasta tener el
// contrato digital revisado (confirmarPagoRecibido responde "bloqueado").

var COLUMNAS_PRECIO_ = ['Precio_regular', 'Precio_lanzamiento', 'Moneda', 'Periodo_facturacion', 'Contratable', 'Visible_en_planes'];
// Valores aprobados por Víctor el 17/10/2026 (solo se escriben donde la celda está vacía).
var PRECIOS_INICIALES_ = {
  PRUEBA:        { Precio_regular: 0,     Precio_lanzamiento: 0,     Moneda: 'ARS', Periodo_facturacion: 'PRUEBA',  Contratable: 'TRUE',  Visible_en_planes: 'TRUE' },
  BASICO:        { Precio_regular: 25000, Precio_lanzamiento: 15000, Moneda: 'ARS', Periodo_facturacion: 'MENSUAL', Contratable: 'TRUE',  Visible_en_planes: 'TRUE' },
  PLUS:          { Precio_regular: 35000, Precio_lanzamiento: 20000, Moneda: 'ARS', Periodo_facturacion: 'MENSUAL', Contratable: 'FALSE', Visible_en_planes: 'TRUE' },
  PRO:           { Precio_regular: 45000, Precio_lanzamiento: 25000, Moneda: 'ARS', Periodo_facturacion: 'MENSUAL', Contratable: 'TRUE',  Visible_en_planes: 'TRUE' },
  PERSONALIZADO: { Precio_regular: '',    Precio_lanzamiento: '',    Moneda: 'ARS', Periodo_facturacion: 'MENSUAL', Contratable: 'TRUE',  Visible_en_planes: 'TRUE' }
};
var ORDEN_PUBLICO_ = ['PRUEBA', 'BASICO', 'PLUS', 'PRO', 'PERSONALIZADO'];
var PROMO_ENC_ = ['Promo_id', 'Nombre', 'Estado', 'Cupo_total', 'Planes_elegibles', 'Meses_beneficio', 'Condiciones', 'Version_condiciones'];
var PROMO_INICIAL_ = ['LANZAMIENTO_2026', 'Oferta de lanzamiento', 'ACTIVA', 20, 'BASICO,PLUS,PRO', 6,
  'Precio de lanzamiento durante los primeros 6 meses de la contratación paga, para los primeros 20 comercios que contraten un plan pago elegible. No se renueva. Una vez por comercio. La prueba gratuita no cuenta.', 1];

function _precioOpcional_(v) {
  if (_vacio_(v)) return null;
  var n = Number(String(v).replace(/[^\d.]/g, ''));
  return isNaN(n) ? null : Math.round(n);
}
function _cacheScript_() { try { return CacheService.getScriptCache(); } catch (e) { return null; } }
function _limpiarCachePublica_() { var c = _cacheScript_(); if (c) try { c.remove('planesPublicos'); } catch (e) {} }

// ── PROMOCIÓN ─────────────────────────────────────────────────────────
function _leerPromo_() {
  var h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('PROMOCIONES_VAO');
  if (!h) return null;
  var d = h.getDataRange().getValues();
  if (d.length < 2) return null;
  var enc = d[0].map(function (c) { return String(c).trim(); });
  var f = d[1], col = function (n) { return enc.indexOf(n); };
  var planes = String(f[col('Planes_elegibles')] || '').split(',').map(function (x) { return _normalizarPlan_(x); }).filter(String);
  return { hoja: h, fila: 2, id: String(f[col('Promo_id')] || ''), nombre: String(f[col('Nombre')] || ''),
           estado: String(f[col('Estado')] || '').trim().toUpperCase(), cupoTotal: _enteroOpcional_(f[col('Cupo_total')]) || 0,
           planes: planes, meses: _enteroOpcional_(f[col('Meses_beneficio')]) || 0,
           condiciones: String(f[col('Condiciones')] || ''), version: _enteroOpcional_(f[col('Version_condiciones')]) || 1, encabezados: enc };
}
// Cupos CONFIRMADOS: solo los registra la contratación paga (bloqueada en v031). Una PRUEBA nunca cuenta.
function _cuposConfirmados_(promoId) {
  var h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CUPOS_PROMO_VAO');
  if (!h) return 0;
  var d = h.getDataRange().getValues(), conf = {}, enc = (d[0] || []).map(String);
  var cP = enc.indexOf('Prefijo'), cE = enc.indexOf('Evento'), cI = enc.indexOf('Promo_id');
  for (var i = 1; i < d.length; i++) {
    if (String(d[i][cI]) !== promoId) continue;
    var p = String(d[i][cP]);
    if (d[i][cE] === 'CONFIRMACION') conf[p] = true;
    if (d[i][cE] === 'LIBERACION') delete conf[p];
  }
  return Object.keys(conf).length;
}

// ── PÚBLICO: planes y precios (sin sesión) ───────────────────────────
function getPlanesPublicos(data) {
  var cache = _cacheScript_();
  if (cache) { try { var c = cache.get('planesPublicos'); if (c) { var o = JSON.parse(c); o.desdeCache = true; o.inscripcion = _estadoInscripcion_().inscripcion; return o; } } catch (e) {} }
  var pl = _leerPlanes_();
  var promo = _leerPromo_();
  var hayCupo = promo ? _cuposDisponibles_(promo) > 0 : false; // v040
  var promoActiva = !!(promo && promo.estado === 'ACTIVA' && hayCupo);
  var preciosConfigurados = pl.existe && pl.encabezados.indexOf('Precio_regular') !== -1;
  var planes = [];
  if (pl.existe) {
    var orden = ORDEN_PUBLICO_.filter(function (c) { return pl.planes[c]; })
      .concat(pl.orden.filter(function (c) { return ORDEN_PUBLICO_.indexOf(c) === -1; }));
    orden.forEach(function (c) {
      var p = pl.planes[c];
      if (p.visible === false) return;
      if (!p.activo && c !== 'PLUS') return;                         // inactivos no se muestran (PLUS sí, como "Próximamente")
      var contratable = p.activo && p.contratable !== false;
      var modulos = MODULOS_IMPLEMENTADOS_.filter(function (m) { return p.modulos[m.clave]; }).map(function (m) { return m.nombre; });
      planes.push({
        codigo: c, nombre: p.nombre,
        precioRegular: p.precioRegular, precioLanzamiento: p.precioLanzamiento,
        moneda: p.moneda || 'ARS', periodo: p.periodo || (c === 'PRUEBA' ? 'PRUEBA' : 'MENSUAL'),
        contratable: contratable, proximamente: !contratable,
        cotizacion: c === 'PERSONALIZADO' && p.precioRegular === null,
        conPromo: promoActiva && promo.planes.indexOf(c) !== -1 && p.precioLanzamiento !== null && contratable,
        modulos: c === 'PLUS' && !contratable ? [] : modulos
      });
    });
  }
  var res = {
    success: true, preciosConfigurados: preciosConfigurados,
    prueba: { dias: DIAS_PRUEBA_, gracia: DIAS_GRACIA_PRUEBA_ },
    promo: promoActiva ? { nombre: promo.nombre, meses: promo.meses, planes: promo.planes, condiciones: promo.condiciones } : null,
    planes: planes,
    condicionesPrueba: { version: CONDICIONES_PRUEBA_.version, texto: CONDICIONES_PRUEBA_.texto, hash: _sha256Hex_(CONDICIONES_PRUEBA_.texto) },
    generado: new Date().toISOString()
  };
  if (cache) { try { cache.put('planesPublicos', JSON.stringify(res), 60); } catch (e) {} } // 60 s: evita leer la planilla en cada visita
  res.inscripcion = _estadoInscripcion_().inscripcion;
  return res;
}

// ── ADMIN: preparar columnas de precio, PLUS y la promoción ──────────
function _planPreciosIniciales_() {
  var pl = _leerPlanes_();
  if (!pl.existe) return { error: 'Primero inicializá los planes' };
  var enc = pl.encabezados.slice(), cambios = [];
  COLUMNAS_PRECIO_.forEach(function (c) { if (enc.indexOf(c) === -1) { cambios.push({ tipo: 'columna', columna: c }); enc.push(c); } });
  var col = function (n) { return enc.indexOf(n); };
  var datos = pl.hoja.getDataRange().getValues();
  Object.keys(PRECIOS_INICIALES_).forEach(function (cod) {
    var p = pl.planes[cod];
    if (!p) { if (cod === 'PLUS') cambios.push({ tipo: 'filaPLUS' }); return; }
    var fila = datos[p.fila - 1] || [];
    COLUMNAS_PRECIO_.forEach(function (c) {
      var actual = col(c) < fila.length ? fila[col(c)] : '';
      var nuevo = PRECIOS_INICIALES_[cod][c];
      if (_vacio_(actual) && !_vacio_(nuevo)) cambios.push({ tipo: 'celda', plan: cod, columna: c, valor: nuevo });
    });
  });
  if (!SpreadsheetApp.getActiveSpreadsheet().getSheetByName('PROMOCIONES_VAO')) cambios.push({ tipo: 'promo' });
  return { cambios: cambios, firma: _firma_(['precios', cambios]) };
}

function prepararPreciosPlanes(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  var p0 = _planPreciosIniciales_();
  if (p0.error) return p0;
  var describir = function (c) {
    if (c.tipo === 'columna') return 'Agregar columna ' + c.columna + ' en PLANES_VAO';
    if (c.tipo === 'celda') return c.plan + ' · ' + c.columna + ' = ' + c.valor;
    if (c.tipo === 'filaPLUS') return 'Agregar PLUS (inactivo, NO contratable, módulos sin definir) — $35.000 / lanzamiento $20.000';
    return 'Crear PROMOCIONES_VAO: oferta de lanzamiento ACTIVA, 20 cupos, 6 meses, BÁSICO/PLUS/PRO';
  };
  if (data.confirmar !== true) return { success: true, vistaPrevia: true, cambios: p0.cambios.map(describir), firma: p0.firma,
    nota: 'Solo se completan celdas vacías. No cambia ningún negocio, módulo ni vencimiento.' };
  return _conLock_(function () {
    var p = _planPreciosIniciales_();
    if (p.error) return p;
    if (data.firma !== p.firma) return { error: 'PLANES_VAO cambió desde la vista previa: volvé a revisarla.' };
    var pl = _leerPlanes_(), h = pl.hoja, enc = pl.encabezados.slice();
    p.cambios.forEach(function (c) {
      if (c.tipo === 'columna') { enc.push(c.columna); h.getRange(1, enc.length).setValue(c.columna); }
    });
    p.cambios.forEach(function (c) {
      if (c.tipo === 'celda') h.getRange(pl.planes[c.plan].fila, enc.indexOf(c.columna) + 1).setValue(c.valor);
    });
    if (p.cambios.some(function (c) { return c.tipo === 'filaPLUS'; })) {
      var fila = enc.map(function (e) {
        if (e === 'Plan') return 'PLUS';
        if (e === 'Nombre') return 'Plus';
        if (e === 'Activo') return 'FALSE';
        if (e === 'Dias_tolerancia') return 0;
        if (e === 'Notas') return 'Próximamente: módulos sin definir. No contratable.';
        if (_esModuloImplementado_(e)) return 'FALSE';
        if (PRECIOS_INICIALES_.PLUS.hasOwnProperty(e)) return PRECIOS_INICIALES_.PLUS[e];
        return '';
      });
      h.appendRow(fila);
    }
    if (p.cambios.some(function (c) { return c.tipo === 'promo'; })) {
      var hp = SpreadsheetApp.getActiveSpreadsheet().insertSheet('PROMOCIONES_VAO');
      hp.getRange(1, 1, 2, PROMO_ENC_.length).setValues([PROMO_ENC_, PROMO_INICIAL_]);
    }
    _cachePlanes_ = null; _limpiarCachePublica_();
    return { success: true, aplicados: p.cambios.length, mensaje: '✅ Precios y oferta preparados (' + p.cambios.length + ' cambios). Ningún negocio cambió.' };
  });
}

// Editar el precio de un plan (solo contrataciones NUEVAS; no hay precios pactados todavía).
function guardarPreciosPlan(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  var codigo = _normalizarPlan_(data.plan);
  var pl = _leerPlanes_();
  if (!pl.existe || !pl.planes[codigo]) return { error: 'Plan no encontrado' };
  if (pl.encabezados.indexOf('Precio_regular') === -1) return { error: 'Primero prepará los precios (🧩 Planes → Preparar precios)' };
  var p = pl.planes[codigo];
  var reg = _vacio_(data.precioRegular) ? '' : Number(data.precioRegular);
  var lan = _vacio_(data.precioLanzamiento) ? '' : Number(data.precioLanzamiento);
  if (reg !== '' && (!/^\d{1,9}$/.test(String(data.precioRegular)) || reg > 100000000)) return { error: 'Precio regular inválido (entero, sin puntos ni signos)' };
  if (lan !== '' && (!/^\d{1,9}$/.test(String(data.precioLanzamiento)) || lan > 100000000)) return { error: 'Precio de lanzamiento inválido' };
  if (reg !== '' && lan !== '' && lan > reg) return { error: 'El precio de lanzamiento no puede ser mayor que el regular' };
  if (codigo === 'PRUEBA' && (reg || lan)) return { error: 'La PRUEBA es gratuita' };
  var contratable = data.contratable === undefined ? (p.contratable !== false) : data.contratable === true;
  if (contratable && !p.activo) return { error: 'Un plan inactivo no puede ser contratable' + (codigo === 'PLUS' ? ' (PLUS: definí y probá primero sus módulos)' : '') };
  var visible = data.visible === undefined ? (p.visible !== false) : data.visible === true;
  var nuevo = { Precio_regular: reg, Precio_lanzamiento: lan, Contratable: contratable ? 'TRUE' : 'FALSE', Visible_en_planes: visible ? 'TRUE' : 'FALSE' };
  var antes = { Precio_regular: p.precioRegular === null ? '' : p.precioRegular, Precio_lanzamiento: p.precioLanzamiento === null ? '' : p.precioLanzamiento,
                Contratable: p.contratable === false ? 'FALSE' : 'TRUE', Visible_en_planes: p.visible === false ? 'FALSE' : 'TRUE' };
  var negocios = 0, hc = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CLIENTES_VAO');
  if (hc) hc.getDataRange().getValues().slice(1).forEach(function (r) { if (_normalizarPlan_(r[5]) === codigo) negocios++; });
  var firma = _firma_(['precio', codigo, antes, nuevo]);
  if (data.confirmar !== true) return { success: true, vistaPrevia: true, plan: codigo, antes: antes, despues: nuevo, firma: firma,
    impacto: 'Afecta solo a contrataciones NUEVAS. ' + negocios + ' negocio(s) con plan ' + p.nombre + ' no cambian (sus condiciones no se modifican en silencio).' };
  return _conLock_(function () {
    _cachePlanes_ = null;
    var pl2 = _leerPlanes_(), p2 = pl2.planes[codigo];
    var antes2 = { Precio_regular: p2.precioRegular === null ? '' : p2.precioRegular, Precio_lanzamiento: p2.precioLanzamiento === null ? '' : p2.precioLanzamiento,
                   Contratable: p2.contratable === false ? 'FALSE' : 'TRUE', Visible_en_planes: p2.visible === false ? 'FALSE' : 'TRUE' };
    if (_firma_(['precio', codigo, antes2, nuevo]) !== data.firma) return { error: 'Los precios cambiaron desde la vista previa: volvé a revisarla.' };
    Object.keys(nuevo).forEach(function (k) { pl2.hoja.getRange(p2.fila, pl2.encabezados.indexOf(k) + 1).setValue(nuevo[k]); });
    _cachePlanes_ = null; _limpiarCachePublica_();
    return { success: true, mensaje: '✅ Precios de ' + p2.nombre + ' guardados (solo para contrataciones nuevas)' };
  });
}

function guardarPromocion(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  var pr = _leerPromo_();
  if (!pr) return { error: 'Primero prepará los precios y la oferta (🧩 Planes)' };
  var estado = String(data.estado || pr.estado).toUpperCase();
  if (['ACTIVA', 'PAUSADA', 'FINALIZADA'].indexOf(estado) === -1) return { error: 'Estado inválido' };
  var cupo = data.cupoTotal === undefined ? pr.cupoTotal : Number(data.cupoTotal);
  if (!/^\d{1,4}$/.test(String(cupo))) return { error: 'Cupo inválido' };
  var conf = _cuposConfirmados_(pr.id);
  if (cupo < conf) return { error: 'El cupo no puede ser menor que los ' + conf + ' lugares ya confirmados' };
  var antes = { estado: pr.estado, cupoTotal: pr.cupoTotal }, despues = { estado: estado, cupoTotal: cupo };
  var firma = _firma_(['promo', antes, despues]);
  if (data.confirmar !== true) return { success: true, vistaPrevia: true, antes: antes, despues: despues, confirmados: conf, firma: firma,
    impacto: 'No cambia el precio de ningún negocio. Cupos confirmados: ' + conf + '.' };
  return _conLock_(function () {
    var pr2 = _leerPromo_();
    if (_firma_(['promo', { estado: pr2.estado, cupoTotal: pr2.cupoTotal }, despues]) !== data.firma) return { error: 'La oferta cambió desde la vista previa.' };
    pr2.hoja.getRange(2, pr2.encabezados.indexOf('Estado') + 1).setValue(estado);
    pr2.hoja.getRange(2, pr2.encabezados.indexOf('Cupo_total') + 1).setValue(cupo);
    _limpiarCachePublica_();
    return { success: true, mensaje: '✅ Oferta: ' + estado + ' · cupo ' + cupo };
  });
}

// v033: confirmarPagoRecibido está más abajo (sección VIGENCIA DE PLANES PAGOS).

// ── CONDICIONES DE LA PRUEBA (no es el contrato pago) ────────────────
var CONDICIONES_PRUEBA_ = {
  version: 'PRUEBA-1 (STAGING · pendiente de revisión jurídica)',
  texto: [
    'Condiciones de la prueba gratuita de VAO POS',
    '1. La prueba es gratuita, sin tarjeta de crédito, y dura 7 días corridos desde la activación más 3 días de gracia. Desde el día 11 no se pueden registrar operaciones nuevas.',
    '2. Es una sola vez por persona o comercio (se controla por teléfono y correo). No se renueva ni se reinicia al cambiar de dispositivo.',
    '3. Tus registros (productos, ventas, fiados, caja, etc.) son tuyos: los podés consultar y descargar desde el primer día, también cuando la prueba termine.',
    '4. VAO POS funciona sobre una planilla central de VAO Sistemas con hojas separadas para cada comercio. Nunca se muestran datos de un comercio a otro.',
    '5. Usamos tu nombre, teléfono y correo solo para darte acceso, avisarte sobre tu prueba y responder tus consultas. No los vendemos ni los cedemos.',
    '6. El PIN de acceso es personal del comercio: cuidalo. Quien tenga el PIN puede operar el POS.',
    '7. Aceptar estas condiciones NO es contratar un plan pago. Para pasar a un plan pago vas a recibir el contrato y sus condiciones comerciales antes de aceptarlas.',
    '8. Podés pedir la baja o la eliminación de tus datos escribiendo a VAO Sistemas.'
  ].join('\n')
};

function _sha256Hex_(t) {
  var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(t), Utilities.Charset.UTF_8);
  return b.map(function (x) { var v = (x < 0 ? x + 256 : x).toString(16); return v.length === 1 ? '0' + v : v; }).join('');
}

// ── CONFIGURACIÓN DE ALTAS AUTOMÁTICAS (Admin) ────────────────────────
var ALTAS_DEFECTO_ = { activas: false, maxSimultaneas: 10, maxPorDia: 3, maxCodigosPorDia: 40 }; // v032: solo Admin las habilita
function _configAltas_() {
  var c = {}; try { c = JSON.parse(PropertiesService.getScriptProperties().getProperty('ALTAS_AUTO_CONFIG') || '{}'); } catch (e) { c = {}; }
  return { activas: c.activas === undefined ? ALTAS_DEFECTO_.activas : c.activas === true,
           maxSimultaneas: _enteroValido_(c.maxSimultaneas, ALTAS_DEFECTO_.maxSimultaneas),
           maxPorDia: _enteroValido_(c.maxPorDia, ALTAS_DEFECTO_.maxPorDia),
           maxCodigosPorDia: _enteroValido_(c.maxCodigosPorDia, ALTAS_DEFECTO_.maxCodigosPorDia) };
}
function _enteroValido_(v, def) { var n = Number(v); return (v === undefined || v === null || v === '' || isNaN(n) || n < 0 || Math.floor(n) !== n) ? def : n; }

// Pruebas que hoy pueden operar (ACTIVA + GRACIA + anteriores sin regularizar). Una sola lectura de CLIENTES_VAO.
function _contarPruebas_() {
  var h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CLIENTES_VAO');
  var props = PropertiesService.getScriptProperties().getProperties();
  var r = { activas: 0, gracia: 0, vencidas: 0, sinRegularizar: 0, suspendidas: 0, operando: 0 };
  if (!h) return r;
  h.getDataRange().getValues().slice(1).forEach(function (f) {
    var p = _normalizarPrefijo_(f[0]);
    if (!p || _normalizarPlan_(f[5]) !== 'PRUEBA') return;
    if (String(f[6] || '').toUpperCase() === 'SUSPENDIDO') { r.suspendidas++; return; }
    var m = props['PRUEBA_7_3_' + p], alta = null;
    if (m) { try { alta = _fechaValida_(JSON.parse(m).alta); } catch (e) {} }
    if (!alta) { r.sinRegularizar++; return; }
    var e = _calcularPrueba_(alta).estado;
    if (e === 'ACTIVA') r.activas++; else if (e === 'GRACIA') r.gracia++; else r.vencidas++;
  });
  r.operando = r.activas + r.gracia + r.sinRegularizar;
  return r;
}

function _hoyClave_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd'); }

// ¿Se puede abrir una prueba automática ahora? (sin contar excepciones de Admin)
function _estadoInscripcion_() {
  var cfg = _configAltas_();
  if (!cfg.activas) return { inscripcion: 'LISTA_ESPERA', motivo: 'Altas automáticas no habilitadas por Admin' };
  var cp = _contarPruebas_();
  if (cp.operando >= cfg.maxSimultaneas) return { inscripcion: 'LISTA_ESPERA', motivo: 'Límite de pruebas simultáneas (' + cfg.maxSimultaneas + ')' };
  if (_altasAutomaticasHoy_() >= cfg.maxPorDia) return { inscripcion: 'LISTA_ESPERA', motivo: 'Límite de altas del día (' + cfg.maxPorDia + ')' };
  return { inscripcion: 'ABIERTA', motivo: '' };
}

// ── SOLICITUDES (registro público) ────────────────────────────────────
var SOL_ENC_ = ['Solicitud_id', 'Fecha', 'Estado', 'Comercio', 'Responsable', 'Telefono', 'Correo', 'Condiciones_version', 'Condiciones_hash',
                'Correo_verificado', 'Prefijo', 'Origen', 'Excepcion', 'Fecha_activacion', 'Detalle', 'Actualizado'];
var SC_ = {}; SOL_ENC_.forEach(function (n, i) { SC_[n] = i; });

function _hojaSolicitudes_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var h = ss.getSheetByName('SOLICITUDES_VAO');
  if (!h) { h = ss.insertSheet('SOLICITUDES_VAO'); h.getRange(1, 1, 1, SOL_ENC_.length).setValues([SOL_ENC_]); }
  return h;
}
function _leerSolicitudes_() {
  var h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('SOLICITUDES_VAO');
  if (!h) return [];
  return h.getDataRange().getValues().slice(1).map(function (r, i) { var o = { fila: i + 2, raw: r }; SOL_ENC_.forEach(function (n, k) { o[n] = r[k]; }); return o; });
}
function _buscarSolicitud_(id) {
  id = String(id || '');
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  var l = _leerSolicitudes_();
  for (var i = 0; i < l.length; i++) if (String(l[i].Solicitud_id) === id) return l[i];
  return null;
}
function _guardarSolicitud_(sol, cambios) {
  var h = _hojaSolicitudes_();
  var fila = sol.raw.slice(); while (fila.length < SOL_ENC_.length) fila.push('');
  Object.keys(cambios).forEach(function (k) { fila[SC_[k]] = cambios[k]; sol[k] = cambios[k]; });
  fila[SC_.Actualizado] = new Date();
  h.getRange(sol.fila, 1, 1, SOL_ENC_.length).setValues([fila]);   // UNA sola escritura por cambio de estado
  sol.raw = fila;
  return sol;
}
function _altasAutomaticasHoy_() {
  var hoy = _hoyClave_(), n = 0;
  _leerSolicitudes_().forEach(function (s) {
    if (s.Estado === 'ACTIVADA' && s.Origen === 'AUTO' && !s.Excepcion && s.Fecha_activacion &&
        Utilities.formatDate(new Date(s.Fecha_activacion), Session.getScriptTimeZone(), 'yyyyMMdd') === hoy) n++;
  });
  return n;
}

// Texto seguro para la planilla: sin caracteres de control, sin fórmulas al inicio, largo acotado.
function _textoPublico_(v, min, max) {
  var t = String(v === undefined || v === null ? '' : v).replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
  if (t.length < min || t.length > max) return null;
  if (/^[=+\-@'"]/.test(t)) return null;                 // evita que Sheets lo tome como fórmula
  if (!/^[A-Za-zÀ-ÿ0-9 .,&()\/'ºª#-]+$/.test(t)) return null;
  return t;
}
function _correoPublico_(v) {
  var t = String(v || '').trim().toLowerCase();
  if (t.length > 100 || !/^[a-z0-9._%+-]{1,64}@[a-z0-9.-]{1,180}\.[a-z]{2,24}$/.test(t)) return null;
  return t;
}
function _telefonoPublico_(v) {
  var t = String(v || '').replace(/[\s()+.-]/g, '');
  return /^\d{8,15}$/.test(t) ? t : null;
}
function _enmascararCorreo_(c) { c = String(c || ''); var i = c.indexOf('@'); return i < 1 ? '' : c.charAt(0) + '***' + c.substring(i); }
function _claveIdentidad_(tel, correo) { return { t8: String(tel || '').slice(-8), c: String(correo || '').toLowerCase() }; }
function _mismaPersona_(s, tel, correo) {
  var a = _claveIdentidad_(s.Telefono, s.Correo), b = _claveIdentidad_(tel, correo);
  return (a.t8 && a.t8.length === 8 && a.t8 === b.t8) || (a.c && a.c === b.c);
}

function _codigoSeisDigitos_() {
  var n = parseInt(Utilities.getUuid().replace(/-/g, '').substring(0, 12), 16);
  return ('000000' + String(n % 1000000)).slice(-6);
}

function _enviarCorreo_(para, asunto, texto) {
  try {
    if (MailApp.getRemainingDailyQuota() < 3) return 'Sin cupo de correo de Google por hoy';
    MailApp.sendEmail({ to: para, subject: asunto, body: texto, name: 'VAO POS' });
    return '';
  } catch (e) { return 'No se pudo enviar el correo: ' + e.message; }
}

// Paso 1 (público): validar datos, controlar duplicados y límites de envío, y mandar el código.
function registroSolicitarCodigo(data) {
  data = data || {};
  if (data.web) return { error: 'No se pudo procesar la solicitud.' };            // trampa para robots (campo oculto)
  if (!data.solicitudId && data.t !== undefined && Number(data.t) < 3000) return { error: 'No se pudo procesar la solicitud.' }; // formulario completado demasiado rápido
  return _conLock_(function () {
    var sol = null, comercio, responsable, tel, correo;
    if (data.solicitudId) {                                                       // reenvío o invitación de Admin
      sol = _buscarSolicitud_(data.solicitudId);
      if (!sol) return { error: 'Solicitud no encontrada' };
      if (['CODIGO_ENVIADO', 'HABILITADA', 'CREANDO'].indexOf(sol.Estado) === -1) return _respuestaEstado_(sol); // v032: CREANDO = retomar con código
      comercio = sol.Comercio; responsable = sol.Responsable; tel = String(sol.Telefono); correo = sol.Correo;
    } else {
      comercio = _textoPublico_(data.comercio, 2, 60);
      responsable = _textoPublico_(data.responsable, 3, 60);
      tel = _telefonoPublico_(data.telefono);
      correo = _correoPublico_(data.correo);
      if (!comercio) return { error: 'Revisá el nombre del comercio (2 a 60 letras o números).', campo: 'comercio' };
      if (!responsable) return { error: 'Revisá el nombre y apellido del responsable.', campo: 'responsable' };
      if (!tel) return { error: 'Revisá el teléfono: solo números, con característica (8 a 15 dígitos).', campo: 'telefono' };
      if (!correo) return { error: 'Revisá el correo electrónico.', campo: 'correo' };
      if (data.acepta !== true || data.condicionesVersion !== CONDICIONES_PRUEBA_.version) return { error: 'Para seguir tenés que leer y aceptar las condiciones de la prueba.', campo: 'acepta' };
    }
    // Prueba ya usada (negocios existentes). Un alta cortada (CREANDO) puede encontrarse a sí misma: no es duplicado.
    var ya = (sol && sol.Estado === 'CREANDO') ? '' : _pruebaYaUsada_(tel, correo);
    if (ya) {
      if (!sol) _registrarDuplicado_(comercio, responsable, tel, correo, 'Ya existe el negocio ' + ya);
      else _guardarSolicitud_(sol, { Estado: 'DUPLICADO', Detalle: 'Ya existe el negocio ' + ya });
      return { error: 'Ese teléfono o correo ya tiene una prueba registrada. La prueba gratuita es una sola vez. Si sos el titular, escribinos a VAO Sistemas.', duplicado: true };
    }
    // Solicitudes abiertas de la misma persona
    if (!sol) {
      var abiertas = _leerSolicitudes_().filter(function (s) { return _mismaPersona_(s, tel, correo); });
      for (var i = abiertas.length - 1; i >= 0; i--) {
        var s = abiertas[i];
        if (s.Estado === 'CODIGO_ENVIADO' || s.Estado === 'HABILITADA') { sol = s; break; }
        if (['LISTA_ESPERA', 'CREANDO', 'ACTIVADA', 'ERROR', 'RECHAZADA'].indexOf(s.Estado) !== -1) return _respuestaEstado_(s);
      }
    }
    // Límites de envío (protegen el cupo de correos y frenan abusos)
    var cfg = _configAltas_(), props = PropertiesService.getScriptProperties();
    var kDia = 'REG_COD_DIA_' + _hoyClave_();
    var enviadosHoy = Number(props.getProperty(kDia) || 0);
    if (enviadosHoy >= cfg.maxCodigosPorDia) return { error: 'Hoy recibimos muchas solicitudes. Probá de nuevo mañana o escribinos a VAO Sistemas.', limite: true };
    var kPer = 'REG_COD_PER_' + _sha256Hex_('VAO|' + correo).substring(0, 16);
    var per = {}; try { per = JSON.parse(props.getProperty(kPer) || '{}'); } catch (e) { per = {}; }
    if (per.dia !== _hoyClave_()) per = { dia: _hoyClave_(), n: 0 };
    if (per.n >= 3) return { error: 'Ya te enviamos 3 códigos hoy. Revisá tu correo (también en spam) o probá mañana.', limite: true };
    // Solicitud (nueva o la misma)
    if (!sol) {
      var h = _hojaSolicitudes_(), id = Utilities.getUuid();
      var fila = SOL_ENC_.map(function () { return ''; });
      fila[SC_.Solicitud_id] = id; fila[SC_.Fecha] = new Date(); fila[SC_.Estado] = 'CODIGO_ENVIADO';
      fila[SC_.Comercio] = comercio; fila[SC_.Responsable] = responsable; fila[SC_.Telefono] = "'" + tel; fila[SC_.Correo] = correo;
      fila[SC_.Condiciones_version] = CONDICIONES_PRUEBA_.version; fila[SC_.Condiciones_hash] = _sha256Hex_(CONDICIONES_PRUEBA_.texto);
      fila[SC_.Origen] = 'AUTO'; fila[SC_.Actualizado] = new Date();
      h.appendRow(fila);
      sol = _buscarSolicitud_(id);
    }
    var codigo = _codigoSeisDigitos_();
    var otp = { h: _hashFuerte_(codigo, 'REG|' + sol.Solicitud_id), exp: new Date().getTime() + 15 * 60000, intentos: 0 };
    props.setProperty('REG_OTP_' + sol.Solicitud_id, JSON.stringify(otp));
    var err = _enviarCorreo_(correo, 'Tu código de VAO POS: ' + codigo,
      'Hola ' + responsable + ':\n\nTu código para crear la prueba gratuita de VAO POS para "' + comercio + '" es:\n\n    ' + codigo +
      '\n\nVence en 15 minutos y sirve una sola vez.\nSi no lo pediste, ignorá este correo.\n\nVAO Sistemas');
    if (err) { props.deleteProperty('REG_OTP_' + sol.Solicitud_id); return { error: err + '. Probá de nuevo en unos minutos.' }; }
    per.n++; props.setProperty(kPer, JSON.stringify(per)); props.setProperty(kDia, String(enviadosHoy + 1));
    if (['CODIGO_ENVIADO', 'HABILITADA', 'CREANDO'].indexOf(sol.Estado) === -1) _guardarSolicitud_(sol, { Estado: 'CODIGO_ENVIADO' });
    return { success: true, solicitudId: sol.Solicitud_id, correo: _enmascararCorreo_(correo), venceMin: 15,
             mensaje: 'Te enviamos un código de 6 números a ' + _enmascararCorreo_(correo) + '. Revisá también la carpeta de spam.' };
  });
}

function _registrarDuplicado_(comercio, responsable, tel, correo, detalle) {
  var desde = new Date().getTime() - 86400000;
  var ya = _leerSolicitudes_().some(function (s) { return s.Estado === 'DUPLICADO' && _mismaPersona_(s, tel, correo) && new Date(s.Fecha).getTime() > desde; });
  if (ya) return;                                                       // una alerta por persona y día alcanza
  var fila = SOL_ENC_.map(function () { return ''; });
  fila[SC_.Solicitud_id] = Utilities.getUuid(); fila[SC_.Fecha] = new Date(); fila[SC_.Estado] = 'DUPLICADO';
  fila[SC_.Comercio] = comercio; fila[SC_.Responsable] = responsable; fila[SC_.Telefono] = "'" + tel; fila[SC_.Correo] = correo;
  fila[SC_.Origen] = 'AUTO'; fila[SC_.Detalle] = detalle; fila[SC_.Actualizado] = new Date();
  _hojaSolicitudes_().appendRow(fila);
}

function _posUrl_(prefijo) { return SISTEMA.url + 'pos.html?p=' + prefijo; }

function _respuestaEstado_(s) {
  var base = { solicitudId: s.Solicitud_id, estado: s.Estado, correo: _enmascararCorreo_(s.Correo) };
  if (s.Estado === 'ACTIVADA') return Object.assign(base, { success: true, yaCreado: true, prefijo: s.Prefijo, posUrl: _posUrl_(s.Prefijo),
    mensaje: 'Tu prueba ya está creada. Entrá con el enlace y el PIN que te enviamos por correo.' });
  if (s.Estado === 'LISTA_ESPERA') return Object.assign(base, { success: true, listaEspera: true, // v032: la habilitación depende de Admin
    mensaje: 'Quedaste en la lista de espera. En este momento las nuevas pruebas las habilita VAO Sistemas en forma manual: si habilita la tuya, te llega un correo con el enlace para comenzar. No hay una fecha asegurada.' });
  if (s.Estado === 'CODIGO_ENVIADO' || s.Estado === 'HABILITADA') return Object.assign(base, { success: true, esperaCodigo: true,
    habilitada: s.Estado === 'HABILITADA', mensaje: s.Estado === 'HABILITADA' ? 'VAO Sistemas te habilitó: pedí tu código para crear la prueba.' : 'Ingresá el código que te enviamos por correo.' });
  if (s.Estado === 'CREANDO') return Object.assign(base, { success: true, esperaCodigo: true, reanudar: true,   // v032
    mensaje: 'Tu prueba quedó a medio crear por un corte. Para terminarla de forma segura, pedí un código nuevo a tu correo.' });
  if (s.Estado === 'ERROR') return Object.assign(base, { error: 'Tu prueba necesita una revisión de VAO Sistemas. No hace falta que la pidas de nuevo.', enRevision: true });
  if (s.Estado === 'RECHAZADA') return Object.assign(base, { error: 'Tu solicitud no fue aprobada. Si creés que es un error, escribinos a VAO Sistemas.', rechazada: true });
  return Object.assign(base, { error: 'Esta solicitud no se puede continuar. Escribinos a VAO Sistemas.' });
}

// Público: estado de una solicitud (para retomar si se recarga la página).
function registroEstado(data) {
  var s = _buscarSolicitud_((data || {}).solicitudId);
  if (!s) return { error: 'Solicitud no encontrada' };
  return _respuestaEstado_(s);
}

// Paso 2 (público): verificar el código y, si hay lugar, crear la PRUEBA. Todo bajo el lock.
function registroConfirmar(data) {
  data = data || {};
  return _conLock_(function () {
    var s = _buscarSolicitud_(data.solicitudId);
    if (!s) return { error: 'Solicitud no encontrada' };
    if (s.Estado !== 'CODIGO_ENVIADO' && s.Estado !== 'HABILITADA' && s.Estado !== 'CREANDO') return _respuestaEstado_(s);
    // v032: TODO camino que pueda crear o recuperar un negocio (y entregar un PIN) exige un código válido,
    // enviado al correo verificado. Conocer el solicitudId no alcanza.
    var v = _verificarCodigoRegistro_(s, data.codigo);
    if (!v.ok) return v.respuesta;
    if (s.Estado === 'CREANDO') return _reanudarAlta_(s, false);              // alta cortada: se retoma con el código nuevo
    var excepcion = s.Estado === 'HABILITADA';
    // Controles del servidor otra vez (no se confía en la página)
    var ya = _pruebaYaUsada_(String(s.Telefono), s.Correo);
    if (ya) { _guardarSolicitud_(s, { Estado: 'DUPLICADO', Correo_verificado: new Date(), Detalle: 'Ya existe el negocio ' + ya });
              return { error: 'Ese teléfono o correo ya tiene una prueba registrada. La prueba gratuita es una sola vez.', duplicado: true }; }
    if (!excepcion) {
      var ins = _estadoInscripcion_();
      if (ins.inscripcion !== 'ABIERTA') {
        _guardarSolicitud_(s, { Estado: 'LISTA_ESPERA', Correo_verificado: new Date(), Detalle: ins.motivo });
        return _respuestaEstado_(s);
      }
    }
    var pref = _generarPrefijo_(s.Comercio);
    if (!pref) { _guardarSolicitud_(s, { Estado: 'ERROR', Correo_verificado: new Date(), Detalle: 'No se encontró un prefijo libre' });
                 return { error: 'No pudimos crear tu prueba en este momento. VAO Sistemas ya fue avisado.', enRevision: true }; }
    _guardarSolicitud_(s, { Estado: 'CREANDO', Correo_verificado: new Date(), Prefijo: pref });   // marca ANTES de crear: recuperable
    return _crearAltaDeSolicitud_(s, pref);
  });
}

function _crearAltaDeSolicitud_(s, pref) {
  var r = _altaNegocioSinLock_({ prefijo: pref, nombre: s.Comercio, contacto: s.Responsable, telefono: String(s.Telefono).replace(/^'/, ''),
                                 correo: s.Correo, plan: 'PRUEBA' },
                               { origen: 'AUTO', obs: 'Alta automática (planes.html) · solicitud ' + s.Solicitud_id + (s.Excepcion ? ' · excepción: ' + s.Excepcion : '') });
  if (!r.success) {
    _guardarSolicitud_(s, { Estado: 'ERROR', Detalle: String(r.error || 'error desconocido').substring(0, 400) });
    return { error: 'No pudimos crear tu prueba en este momento. VAO Sistemas ya fue avisado y lo revisa.', enRevision: true, detalle: r.error };
  }
  _guardarSolicitud_(s, { Estado: 'ACTIVADA', Fecha_activacion: new Date(), Detalle: '' });
  var errMail = _enviarCorreo_(s.Correo, 'Tu prueba de VAO POS está lista',
    'Hola ' + s.Responsable + ':\n\nTu prueba gratuita de VAO POS para "' + s.Comercio + '" ya está activa.\n\n' +
    'Entrá desde: ' + _posUrl_(pref) + '\nTu PIN: ' + r.pin + '\n\n' +
    'La prueba dura 7 días (hasta el ' + r.prueba.venceTxt + ') más 3 días de gracia (hasta el ' + r.prueba.finGraciaTxt + ').\n' +
    'Guardá este correo. Cuidá tu PIN: quien lo tenga puede operar tu POS.\n\nVAO Sistemas');
  if (errMail) _guardarSolicitud_(s, { Detalle: 'Correo con PIN no enviado: ' + errMail });
  return { success: true, creado: true, prefijo: pref, pin: r.pin, posUrl: _posUrl_(pref),
           venceTxt: r.prueba.venceTxt, finGraciaTxt: r.prueba.finGraciaTxt, correoEnviado: !errMail };
}

// Un alta quedó en CREANDO (corte de Apps Script). Se mira qué quedó y nunca se crea un segundo negocio.
function _reanudarAlta_(s, porAdmin) {
  var pref = String(s.Prefijo || '');
  var ss = SpreadsheetApp.getActiveSpreadsheet(), props = PropertiesService.getScriptProperties();
  var hojas = _hojasDelNegocio_(pref).filter(function (n) { return n.indexOf('CONF_DIARIA_') !== 0; });
  var hay = hojas.filter(function (n) { return !!ss.getSheetByName(n); });
  var enV = _filaPrefijo_(ss.getSheetByName('VENDEDORES'), pref) !== -1;
  var enC = _filaPrefijo_(ss.getSheetByName('CLIENTES_VAO'), pref) !== -1;
  var pin = !!props.getProperty('PIN_' + pref), marca = !!props.getProperty('PRUEBA_7_3_' + pref);
  var completo = pref && hay.length === hojas.length && enV && enC && pin && marca;
  var nada = pref && hay.length === 0 && !enV && !enC && !pin && !marca;
  if (!completo && pref && hay.length === hojas.length && enV) return _completarAltaCortada_(s, pref, enC, marca, porAdmin);
  if (completo) {
    // El negocio existe entero, pero el PIN se perdió con el corte: se genera uno nuevo y se envía.
    var nuevoPin = generarPinAleatorio();
    props.setProperty('PIN_' + pref, _hashFuerte_(nuevoPin, pref));
    var cp = _calcularPrueba_(_fechaValida_(JSON.parse(props.getProperty('PRUEBA_7_3_' + pref)).alta));
    _guardarSolicitud_(s, { Estado: 'ACTIVADA', Fecha_activacion: s.Fecha_activacion || new Date(), Detalle: 'Recuperada tras un corte' + (porAdmin ? ' (Admin)' : '') });
    var errM1 = _enviarCorreo_(s.Correo, 'Tu prueba de VAO POS está lista', 'Tu prueba de VAO POS ya está activa.\n\nEntrá desde: ' + _posUrl_(pref) + '\nTu PIN: ' + nuevoPin + '\n\nVAO Sistemas');
    if (errM1) _guardarSolicitud_(s, { Detalle: 'Recuperada tras un corte. Correo con PIN NO enviado: ' + errM1 + ' (usar Reset PIN)' });
    return { success: true, creado: true, recuperado: true, prefijo: pref, pin: nuevoPin, correoEnviado: !errM1, posUrl: _posUrl_(pref), venceTxt: cp.venceTxt, finGraciaTxt: cp.finGraciaTxt };
  }
  if (nada) return _crearAltaDeSolicitud_(s, _prefijoLibre_(pref) ? pref : (_generarPrefijo_(s.Comercio) || pref));
  // Restos SIN datos (solo hojas recién creadas: encabezado, o la CONFIG inicial) y sin registro ni accesos:
  // Admin puede limpiarlos y volver a crear. Nunca se borra una hoja con filas cargadas.
  var soloRestosVacios = pref && !enV && !enC && !pin && !marca && hay.every(function (n) {
    var h = ss.getSheetByName(n); return n.indexOf('CONFIG_') === 0 ? true : h.getLastRow() <= 1;
  });
  if (soloRestosVacios && porAdmin) {
    hay.forEach(function (n) { var h = ss.getSheetByName(n); if (h) ss.deleteSheet(h); });
    _guardarSolicitud_(s, { Detalle: 'Admin limpió ' + hay.length + ' hoja(s) vacía(s) de un alta cortada y reintentó' });
    return _crearAltaDeSolicitud_(s, _prefijoLibre_(pref) ? pref : (_generarPrefijo_(s.Comercio) || pref));
  }
  var detalle = 'Alta incompleta de ' + pref + ': hojas ' + hay.length + '/' + hojas.length + ', VENDEDORES ' + (enV ? 'sí' : 'no') +
                ', CLIENTES_VAO ' + (enC ? 'sí' : 'no') + ', PIN ' + (pin ? 'sí' : 'no') + ', marca PRUEBA ' + (marca ? 'sí' : 'no') + '. Revisión manual.';
  _guardarSolicitud_(s, { Estado: 'ERROR', Detalle: detalle });
  return { error: porAdmin ? detalle : 'Tu prueba necesita una revisión de VAO Sistemas. No hace falta que la pidas de nuevo.', enRevision: true, detalle: detalle };
}

// Hojas completas y fila en VENDEDORES (la CONFIG ya estaba terminada): se completan SOLO las piezas
// de esta misma alta que faltan (fila en CLIENTES_VAO, marca 7 + 3) y se genera un PIN nuevo.
function _completarAltaCortada_(s, pref, enC, marca, porAdmin) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), props = PropertiesService.getScriptProperties();
  var hV = ss.getSheetByName('VENDEDORES'), fV = _filaPrefijo_(hV, pref);
  var alta = _fechaValida_(hV.getRange(fV, 6).getValue()) || new Date();
  var cpA = _calcularPrueba_(alta);
  if (!enC) ss.getSheetByName('CLIENTES_VAO').appendRow([pref, s.Comercio, s.Responsable, String(s.Telefono).replace(/^'/, ''), s.Correo, 'PRUEBA', 'ACTIVO',
    alta, cpA.vence, '', '', 'PENDIENTE ⚠️', 'CONFIGURADO ✅', 'Alta automática (planes.html) · solicitud ' + s.Solicitud_id + ' · completada tras un corte']);
  if (!marca) props.setProperty('PRUEBA_7_3_' + pref, JSON.stringify({ alta: _diaSolo_(alta).toISOString(), modo: 'alta' }));
  var nuevoPin = generarPinAleatorio();
  props.setProperty('PIN_' + pref, _hashFuerte_(nuevoPin, pref));
  _guardarSolicitud_(s, { Estado: 'ACTIVADA', Fecha_activacion: s.Fecha_activacion || new Date(), Detalle: 'Completada tras un corte' + (porAdmin ? ' (Admin)' : '') });
  var errM2 = _enviarCorreo_(s.Correo, 'Tu prueba de VAO POS está lista', 'Tu prueba de VAO POS ya está activa.\n\nEntrá desde: ' + _posUrl_(pref) + '\nTu PIN: ' + nuevoPin + '\n\nVAO Sistemas');
  if (errM2) _guardarSolicitud_(s, { Detalle: 'Completada tras un corte. Correo con PIN NO enviado: ' + errM2 + ' (usar Reset PIN)' });
  return { success: true, creado: true, recuperado: true, prefijo: pref, pin: nuevoPin, correoEnviado: !errM2, posUrl: _posUrl_(pref), venceTxt: cpA.venceTxt, finGraciaTxt: cpA.finGraciaTxt };
}

// Prefijo nuevo: iniciales del comercio y, si están ocupadas, combinaciones al azar. Nunca reservado ni usado.
function _prefijoLibre_(p) { return _chequearPrefijoDisponible_(p).disponible; }
function _generarPrefijo_(nombre) {
  var limpio = String(nombre || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z ]/g, ' ').trim();
  var pal = limpio.split(/\s+/).filter(function (w) { return w.length > 0; });
  var cands = [];
  if (pal.length >= 3) cands.push(pal[0][0] + pal[1][0] + pal[2][0]);
  if (pal.length >= 2) cands.push(pal[0][0] + pal[1][0] + (pal[1][1] || pal[0][1] || 'X'), pal[0][0] + pal[1][0]);
  if (pal.length >= 1 && pal[0].length >= 3) cands.push(pal[0].substring(0, 3));
  if (pal.length >= 1 && pal[0].length >= 2) cands.push(pal[0].substring(0, 2));
  // Conjuntos leídos una sola vez (evita leer la planilla por cada candidato)
  var ss = SpreadsheetApp.getActiveSpreadsheet(), usados = {};
  ss.getSheets().forEach(function (h) { usados['H:' + String(h.getName()).toUpperCase()] = true; });
  ['VENDEDORES', 'CLIENTES_VAO'].forEach(function (n) { var h = ss.getSheetByName(n); if (h) h.getDataRange().getValues().slice(1).forEach(function (r) { usados['P:' + _normalizarPrefijo_(r[0])] = true; }); });
  var props = Object.keys(PropertiesService.getScriptProperties().getProperties());
  var libre = function (p) {
    if (!new RegExp(PREFIJO_PATRON_).test(p) || PREFIJOS_RESERVADOS_.indexOf(p) !== -1 || usados['P:' + p]) return false;
    if (_hojasDelNegocio_(p, true).some(function (n) { return usados['H:' + n] || HOJAS_SISTEMA_.indexOf(n) !== -1; })) return false;
    return !props.some(function (k) { return k === 'PIN_' + p || k === 'MP_TOKEN_' + p || k === 'PRUEBA_7_3_' + p || k.indexOf('SESSION_' + p + '_') === 0; });
  };
  var LET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (var i = 0; i < 40; i++) {
    var hex = Utilities.getUuid().replace(/-/g, '');
    cands.push(LET[parseInt(hex.substr(0, 2), 16) % 26] + LET[parseInt(hex.substr(2, 2), 16) % 26] + LET[parseInt(hex.substr(4, 2), 16) % 26]);
  }
  for (var j = 0; j < cands.length; j++) if (libre(cands[j]) && _prefijoLibre_(cands[j])) return cands[j];
  return '';
}

// ── ADMIN: panel de pruebas y registros ───────────────────────────────
function registrosPanel(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  var cfg = _configAltas_(), cp = _contarPruebas_(), sol = _leerSolicitudes_();
  var ahora = new Date().getTime(), semana = ahora - 7 * 86400000, hoy = _hoyClave_();
  var tz = Session.getScriptTimeZone();
  var fmt = function (d) { return d ? Utilities.formatDate(new Date(d), tz, 'dd/MM HH:mm') : ''; };
  var lista = sol.slice().reverse().slice(0, 150).map(function (s) {
    return { id: s.Solicitud_id, fecha: fmt(s.Fecha), estado: s.Estado, comercio: s.Comercio, responsable: s.Responsable,
             telefono: String(s.Telefono || '').replace(/^'/, ''), correo: s.Correo, prefijo: s.Prefijo, excepcion: s.Excepcion,
             activacion: fmt(s.Fecha_activacion), detalle: s.Detalle,
             atascada: s.Estado === 'CREANDO' && (ahora - new Date(s.Actualizado || s.Fecha).getTime()) > 5 * 60000 };
  });
  var pausada = !cfg.activas;
  var quota = -1; try { quota = MailApp.getRemainingDailyQuota(); } catch (e) {}
  var ins = _estadoInscripcion_();
  return { success: true, config: cfg, pruebas: cp, inscripcion: ins,
    altasHoy: sol.filter(function (s) { return s.Estado === 'ACTIVADA' && s.Origen === 'AUTO' && !s.Excepcion && s.Fecha_activacion && Utilities.formatDate(new Date(s.Fecha_activacion), tz, 'yyyyMMdd') === hoy; }).length,
    nuevosSemana: sol.filter(function (s) { return s.Estado === 'ACTIVADA' && s.Fecha_activacion && new Date(s.Fecha_activacion).getTime() > semana; }).length,
    enEspera: sol.filter(function (s) { return s.Estado === 'LISTA_ESPERA'; }).length,
    pendientesCodigo: sol.filter(function (s) { return s.Estado === 'CODIGO_ENVIADO' || s.Estado === 'HABILITADA'; }).length,
    duplicadosSemana: sol.filter(function (s) { return s.Estado === 'DUPLICADO' && new Date(s.Fecha).getTime() > semana; }).length,
    errores: lista.filter(function (x) { return x.estado === 'ERROR' || x.atascada; }).length,
    codigosHoy: Number(PropertiesService.getScriptProperties().getProperty('REG_COD_DIA_' + hoy) || 0),
    cuotaCorreo: quota, pausada: pausada, solicitudes: lista,
    pagoBloqueado: _entornoPagosSimulados_() ? 'Pagos REALES y los 20 cupos: bloqueados hasta tener el contrato digital revisado. En STAGING está habilitado el registro de pagos SIMULADOS (sin dinero real).'
                                             : 'La contratación paga y los 20 cupos están bloqueados hasta tener el contrato digital revisado.' };
}

function registrosConfig(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  var actual = _configAltas_(), nuevo = {};
  nuevo.activas = data.activas === undefined ? actual.activas : data.activas === true;
  var campos = { maxSimultaneas: [0, 500], maxPorDia: [0, 100], maxCodigosPorDia: [0, 90] };
  for (var k in campos) {
    var v = data[k] === undefined ? actual[k] : data[k];
    if (!/^\d{1,3}$/.test(String(v)) || Number(v) < campos[k][0] || Number(v) > campos[k][1]) return { error: 'Valor inválido para ' + k + ' (' + campos[k][0] + ' a ' + campos[k][1] + ')' };
    nuevo[k] = Number(v);
  }
  var firma = _firma_(['altas', actual, nuevo]);
  var cp = _contarPruebas_();
  if (data.confirmar !== true) return { success: true, vistaPrevia: true, antes: actual, despues: nuevo, firma: firma,
    impacto: 'Solo cambia las altas NUEVAS. Las ' + cp.operando + ' pruebas que hoy operan no cambian: ni fechas ni accesos.' };
  return _conLock_(function () {
    if (_firma_(['altas', _configAltas_(), nuevo]) !== data.firma) return { error: 'La configuración cambió desde la vista previa.' };
    var props = PropertiesService.getScriptProperties();
    props.setProperty('ALTAS_AUTO_CONFIG', JSON.stringify(nuevo));
    var hist = []; try { hist = JSON.parse(props.getProperty('ALTAS_AUTO_HIST') || '[]'); } catch (e) {}
    hist.push({ fecha: new Date().toISOString(), antes: actual, despues: nuevo }); hist = hist.slice(-20);
    props.setProperty('ALTAS_AUTO_HIST', JSON.stringify(hist));
    _limpiarCachePublica_();
    return { success: true, config: nuevo, mensaje: '✅ Configuración de altas guardada' };
  });
}

// Acciones de Admin sobre una solicitud: rechazar, habilitar (excepción) o reintentar un alta cortada.
function registroAccion(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  var accion = String(data.accion || '');
  if (['rechazar', 'habilitar', 'reintentar'].indexOf(accion) === -1) return { error: 'Acción inválida' };
  var s0 = _buscarSolicitud_(data.solicitudId);
  if (!s0) return { error: 'Solicitud no encontrada' };
  var permitido = { rechazar: ['CODIGO_ENVIADO', 'LISTA_ESPERA', 'HABILITADA'], habilitar: ['LISTA_ESPERA'], reintentar: ['ERROR', 'CREANDO'] }[accion];
  if (permitido.indexOf(s0.Estado) === -1) return { error: 'No se puede ' + accion + ' una solicitud en estado ' + s0.Estado };
  if (data.confirmar !== true) {
    var txt = { rechazar: 'Se marca RECHAZADA. No se crea nada y el código pendiente deja de servir.',
                habilitar: 'Excepción de Admin: se le envía un correo para que verifique de nuevo su correo y cree la prueba aunque se haya alcanzado el límite. Igual se controla que no tenga una prueba anterior.',
                reintentar: 'Se revisa qué quedó del alta: si está completa, se activa con un PIN nuevo; si no quedó nada, se crea; si quedaron solo hojas vacías recién creadas (sin registros ni accesos), se limpian y se crea; si quedó algo más, queda para revisión manual (no se borra nada).' }[accion];
    return { success: true, vistaPrevia: true, accion: accion, solicitud: { comercio: s0.Comercio, correo: s0.Correo, estado: s0.Estado }, impacto: txt };
  }
  return _conLock_(function () {
    var s = _buscarSolicitud_(data.solicitudId);
    if (permitido.indexOf(s.Estado) === -1) return { error: 'La solicitud cambió de estado (' + s.Estado + ')' };
    var props = PropertiesService.getScriptProperties();
    if (accion === 'rechazar') {
      props.deleteProperty('REG_OTP_' + s.Solicitud_id);
      _guardarSolicitud_(s, { Estado: 'RECHAZADA', Detalle: 'Rechazada por Admin' + (data.motivo ? ': ' + String(data.motivo).substring(0, 200) : '') });
      return { success: true, mensaje: 'Solicitud rechazada' };
    }
    if (accion === 'habilitar') {
      var ya = _pruebaYaUsada_(String(s.Telefono), s.Correo);
      if (ya) { _guardarSolicitud_(s, { Estado: 'DUPLICADO', Detalle: 'Ya existe el negocio ' + ya }); return { error: 'No se puede: ya tiene una prueba (' + ya + ')' }; }
      var exc = 'Admin ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
      _guardarSolicitud_(s, { Estado: 'HABILITADA', Excepcion: exc });
      var err = _enviarCorreo_(s.Correo, 'Ya podés crear tu prueba de VAO POS',
        'Hola ' + s.Responsable + ':\n\nYa hay lugar para tu prueba gratuita de VAO POS.\nEntrá acá para confirmar tu correo y crearla:\n' +
        SISTEMA.url + 'planes.html?s=' + s.Solicitud_id + '\n\nVAO Sistemas');
      return { success: true, mensaje: 'Habilitada (excepción registrada)' + (err ? ' · ⚠️ ' + err : ' · correo enviado') };
    }
    var rr = _reanudarAlta_(s, true);
    if (rr && rr.pin) { delete rr.pin; rr.mensaje = '✅ Alta de ' + rr.prefijo + ' completada. El PIN se envió solo al correo del comercio.'; } // v032
    return rr;
  });
}


// =====================================================================
// v032 — VERIFICACIÓN DE CÓDIGO (compartida) Y RECORDATORIO DEL DÍA 5
// =====================================================================
function _verificarCodigoRegistro_(s, codigo) {
  var props = PropertiesService.getScriptProperties(), k = 'REG_OTP_' + s.Solicitud_id;
  var otp = null; try { otp = JSON.parse(props.getProperty(k) || 'null'); } catch (e) { otp = null; }
  var reanudar = s.Estado === 'CREANDO';
  if (!otp) return { ok: false, respuesta: { error: reanudar ? 'Para terminar tu prueba, pedí un código nuevo a tu correo.' : 'El código venció o ya se usó. Pedí uno nuevo.', codigoVencido: true, reanudar: reanudar } };
  if (new Date().getTime() > otp.exp) { props.deleteProperty(k); return { ok: false, respuesta: { error: 'El código venció. Pedí uno nuevo.', codigoVencido: true, reanudar: reanudar } }; }
  if (otp.intentos >= 5) { props.deleteProperty(k); return { ok: false, respuesta: { error: 'Demasiados intentos. Pedí un código nuevo.', codigoVencido: true, reanudar: reanudar } }; }
  var cod = String(codigo || '').replace(/\D/g, '');
  if (cod.length !== 6 || !_hashCoincide_(cod, otp.h, 'REG|' + s.Solicitud_id)) {
    otp.intentos++; props.setProperty(k, JSON.stringify(otp));
    return { ok: false, respuesta: { error: 'Código incorrecto. Te quedan ' + Math.max(0, 5 - otp.intentos) + ' intento(s).', codigoIncorrecto: true } };
  }
  props.deleteProperty(k);                                                     // un solo uso
  return { ok: true };
}

// ── Recordatorio por correo, UNA vez, el día 5 de la PRUEBA (quedan 2 de los 7 días) ──
// Lo ejecuta un disparador diario de Apps Script (instalarRecordatorioDiario), NO el POS.
// Solo lee CLIENTES_VAO y escribe la marca RECORDATORIO_D5_<prefijo>. No toca el negocio ni la prueba.
// Si un día el disparador no corrió, al día siguiente (6 o 7) se envía igual, con los días que quedan.
var RESERVA_CORREOS_ = 10;          // se dejan libres para los códigos de registro
var MAX_RECORDATORIOS_POR_CORRIDA_ = 40;

function _textoPlanesCorreo_() {
  var pp = getPlanesPublicos({}), lineas = [];
  (pp.planes || []).forEach(function (p) {
    if (p.codigo === 'PRUEBA' || !p.contratable) return;
    if (p.cotizacion) { lineas.push('• ' + p.nombre + ': cotización a medida.'); return; }
    if (p.precioRegular === null || p.precioRegular === undefined) return;
    var t = '• ' + p.nombre + ': $' + Number(p.precioRegular).toLocaleString('es-AR') + ' por mes';
    if (p.conPromo && pp.promo) t += ' (oferta de lanzamiento: $' + Number(p.precioLanzamiento).toLocaleString('es-AR') + ' por mes durante los primeros ' + pp.promo.meses + ' meses, según cupo disponible)';
    lineas.push(t + '.');
  });
  return lineas.length ? 'Planes y precios vigentes (en pesos argentinos):\n' + lineas.join('\n') : 'Consultanos los planes y precios vigentes respondiendo este correo.';
}

function _textoRecordatorio_(nombreNegocio, contacto, cp) {
  var quedan = Math.max(0, DIAS_PRUEBA_ - cp.dia);
  var cuando = quedan === 0 ? 'hoy es el último día' : (quedan === 1 ? 'te queda 1 día' : 'te quedan ' + quedan + ' días');
  return 'Hola' + (contacto ? ' ' + contacto : '') + ':\n\n' +
    'Tu prueba gratuita de VAO POS para "' + nombreNegocio + '" termina el ' + cp.venceTxt + ' (' + cuando + ' de los 7 gratuitos).\n' +
    'Después tenés 3 días de gracia, hasta el ' + cp.finGraciaTxt + '. Desde el día siguiente no se pueden registrar ventas nuevas, pero tus datos quedan guardados y los podés consultar y descargar.\n\n' +
    _textoPlanesCorreo_() + '\n\n' +
    'Para contratar un plan, respondé este correo indicando cuál te interesa. VAO Sistemas te va a enviar el contrato y las condiciones antes de cualquier pago.\n\n' +
    'Este es el único recordatorio que te enviamos sobre tu prueba.\nVAO Sistemas';
}

// Ejecutada por el disparador diario. Devuelve un resumen (también queda en el registro de ejecuciones).
function enviarRecordatoriosPrueba() {
  var res = { enviados: 0, yaEnviados: 0, errores: 0, sinCupo: false, revisar: [] };
  var h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CLIENTES_VAO');
  if (!h) return res;
  var props = PropertiesService.getScriptProperties();
  var todas = props.getProperties();
  var filas = h.getDataRange().getValues().slice(1);
  for (var i = 0; i < filas.length; i++) {
    if (res.enviados >= MAX_RECORDATORIOS_POR_CORRIDA_) break;
    var f = filas[i], p = _normalizarPrefijo_(f[0]);
    if (!p || _normalizarPlan_(f[5]) !== 'PRUEBA' || String(f[6] || '').toUpperCase() === 'SUSPENDIDO') continue;
    var correo = _correoPublico_(f[4]);
    if (!correo || !todas['PRUEBA_7_3_' + p]) continue;                       // sin correo válido o PRUEBA vieja sin fechas
    var alta = null; try { alta = _fechaValida_(JSON.parse(todas['PRUEBA_7_3_' + p]).alta); } catch (e) {}
    if (!alta) continue;
    var cp = _calcularPrueba_(alta);
    if (cp.dia < 5 || cp.dia > DIAS_PRUEBA_) continue;                          // solo días 5 a 7 (5 = el previsto)
    var k = 'RECORDATORIO_D5_' + p;
    var m0 = {}; try { m0 = JSON.parse(todas[k] || '{}'); } catch (e) { m0 = {}; }
    if (m0.estado === 'ENVIADO') { res.yaEnviados++; continue; }
    if (m0.estado === 'ENVIANDO') { res.revisar.push(p); continue; }           // pudo haberse enviado: no se repite
    if (m0.estado === 'ERROR' && (m0.intentos || 0) >= 3) continue;
    var cupo = 0; try { cupo = MailApp.getRemainingDailyQuota(); } catch (e) { cupo = 0; }
    if (cupo <= RESERVA_CORREOS_) { res.sinCupo = true; break; }              // se reintenta en la próxima corrida
    // Marca ANTES de enviar (con un lock corto, para que dos corridas no envíen el mismo correo)
    var lock = LockService.getScriptLock(), tengo = false;
    try { tengo = lock.tryLock(5000); } catch (e) { tengo = false; }
    if (!tengo) continue;                                                       // el POS está escribiendo: se reintenta mañana
    try {
      var m1 = {}; try { m1 = JSON.parse(props.getProperty(k) || '{}'); } catch (e) { m1 = {}; }
      if (m1.estado === 'ENVIADO' || m1.estado === 'ENVIANDO') { res.yaEnviados++; continue; }
      props.setProperty(k, JSON.stringify({ estado: 'ENVIANDO', fecha: new Date().toISOString(), dia: cp.dia, intentos: (m1.intentos || 0) + 1 }));
    } finally { lock.releaseLock(); }
    var err = '';
    try { MailApp.sendEmail({ to: correo, subject: 'Tu prueba de VAO POS termina el ' + cp.venceTxt, body: _textoRecordatorio_(String(f[1] || p), String(f[2] || ''), cp), name: 'VAO POS' }); }
    catch (e) { err = String(e.message || e); }
    var m2 = JSON.parse(props.getProperty(k));
    if (err) { m2.estado = 'ERROR'; m2.error = err.substring(0, 200); res.errores++; }
    else { m2.estado = 'ENVIADO'; m2.enviado = new Date().toISOString(); res.enviados++; }
    props.setProperty(k, JSON.stringify(m2));
  }
  Logger.log('Recordatorios día 5: ' + JSON.stringify(res));
  return res;
}

// Ejecutar UNA vez desde el editor (Apps Script pide autorizar los disparadores). Deja uno solo, diario, ~10 h.
function instalarRecordatorioDiario() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'enviarRecordatoriosPrueba') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('enviarRecordatoriosPrueba').timeBased().everyDays(1).atHour(10).create();
  Logger.log('Recordatorio diario instalado (enviarRecordatoriosPrueba, todos los días cerca de las 10 h)');
}
function quitarRecordatorioDiario() {
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'enviarRecordatoriosPrueba') { ScriptApp.deleteTrigger(t); n++; } });
  Logger.log('Disparadores quitados: ' + n);
}
// Desde el editor: muestra en el registro el texto que recibiría un negocio, SIN enviar nada.
function vistaPreviaRecordatorio(prefijo) {
  prefijo = _normalizarPrefijo_(prefijo);
  var fc = _filaClientesVao_(prefijo);
  var m = PropertiesService.getScriptProperties().getProperty('PRUEBA_7_3_' + prefijo);
  if (!fc || !m) { Logger.log(prefijo + ': no es una PRUEBA con fechas'); return ''; }
  var t = _textoRecordatorio_(String(fc.datos[1] || prefijo), String(fc.datos[2] || ''), _calcularPrueba_(_fechaValida_(JSON.parse(m).alta)));
  Logger.log(t);
  return t;
}


// =====================================================================
// v033 — VIGENCIA DE PLANES PAGOS (períodos mensuales, pagos, cortesía, regularización)
// =====================================================================
// El POS NO cambia: sigue leyendo SOLO CLIENTES_VAO.I (Fecha Vence). Este módulo escribe
// esa columna únicamente desde acciones de Admin con vista previa y confirmación, y deja el
// historial en PERIODOS_VAO (solo se agregan filas). Un plan pago se activa o se cambia SOLO
// registrando el pago (D7: el cambio entre planes pagos se aplica al confirmar la renovación).
// Pagos REALES: bloqueados en todo entorno hasta el contrato. En STAGING: pagos SIMULADOS (D4).

var MSJ_PLAN_POR_PAGO_ = 'Un plan pago se activa o se cambia registrando el pago confirmado de la renovación con el plan nuevo (💳 Vigencia y pagos). El cambio de plan por sí solo no confirma un pago ni da días.';
var PER_ENC_ = ['Registro_id', 'Prefijo', 'Plan', 'Tipo', 'Inicio', 'Fin', 'Ancla', 'Ciclo', 'Importe', 'Moneda', 'Medio', 'Referencia',
                'Fecha_pago', 'Clave', 'Motivo', 'Admin', 'Fecha_registro', 'Fin_promo'];
var PC_ = {}; PER_ENC_.forEach(function (n, i) { PC_[n] = i; });
var TIPOS_CONTRATO_ = ['PAGO', 'PAGO_SIMULADO', 'REGULARIZACION'];   // cuentan como "período contratado"
var MEDIOS_PAGO_ = ['TRANSFERENCIA', 'MERCADO_PAGO', 'EFECTIVO', 'OTRO'];

// D4 — pagos SIMULADOS solo en la planilla de STAGING. El ID está escrito ACÁ (no en SISTEMA):
// si este código se copia a PRODUCCIÓN, la planilla activa tiene otro ID y esto devuelve false.
function _entornoPagosSimulados_() {
  var PLANILLA_STAGING = '1EacDxrzI2Xix5uRvOKaZdZIYiRlFfv-K9mWGf0KHIzc';
  try { if (SpreadsheetApp.getActiveSpreadsheet().getId() !== PLANILLA_STAGING) return false; } catch (e) { return false; }
  if (SISTEMA.entorno !== 'staging') return false;
  return PropertiesService.getScriptProperties().getProperty('PAGOS_SIMULADOS_STAGING') === 'SI'; // se carga a mano en el editor
}

// ── fechas calendario ────────────────────────────────────────────────
function _diasDelMes_(y, m) { return new Date(y, m + 1, 0).getDate(); }
function _aniversario_(y, m, ancla) { var yy = y + Math.floor(m / 12), mm = ((m % 12) + 12) % 12; return new Date(yy, mm, Math.min(ancla, _diasDelMes_(yy, mm))); }
// Período mensual: del inicio al día ANTERIOR al próximo aniversario (el fin está incluido).
function _periodoMensual_(inicio, ancla) {
  var a = _diaSolo_(inicio);
  var prox = _aniversario_(a.getFullYear(), a.getMonth() + 1, ancla);
  return { inicio: a, fin: _sumarDias_(prox, -1), proxima: prox };
}
function _unMesAdelante_(d) { var a = _diaSolo_(d); return _aniversario_(a.getFullYear(), a.getMonth() + 1, a.getDate()); }
function _fechaISOaDia_(t) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(t || ''));
  if (!m) return null;
  var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return (d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3])) ? d : null;
}

// ── historial ────────────────────────────────────────────────────────
function _hojaPeriodos_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), h = ss.getSheetByName('PERIODOS_VAO');
  if (!h) h = ss.insertSheet('PERIODOS_VAO');
  if (h.getLastRow() === 0) h.getRange(1, 1, 1, PER_ENC_.length).setValues([PER_ENC_]);   // también si un corte la dejó sin encabezado
  return h;
}
// v040.2: _leerPeriodos_ ya NO devuelve los períodos anulados (fila ANULACION en PERIODOS_VAO con Clave ANU|<Registro_id>)
// ni las propias filas ANULACION. La hoja no se modifica: _leerPeriodosCrudo_ la devuelve completa.
function _periodosAnulados_(crudo) { var a = {}; (crudo || []).forEach(function (r) { if (r.Tipo === 'ANULACION' && /^ANU\|/.test(String(r.Clave))) a[String(r.Clave).substring(4)] = true; }); return a; }
function _leerPeriodos_() {
  var crudo = _leerPeriodosCrudo_(), anul = _periodosAnulados_(crudo);
  return crudo.filter(function (r) { return r.Tipo !== 'ANULACION' && !anul[String(r.Registro_id)]; });
}
function _leerPeriodosCrudo_() {
  var h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('PERIODOS_VAO');
  if (!h) return [];
  return h.getDataRange().getValues().slice(1).map(function (r) {
    var o = {}; PER_ENC_.forEach(function (n, k) { o[n] = r[k]; });
    o.Inicio = _fechaValida_(o.Inicio); o.Fin = _fechaValida_(o.Fin);
    o.Prefijo = _normalizarPrefijo_(o.Prefijo); return o;
  });
}
function _periodosDe_(prefijo, todos) { return (todos || _leerPeriodos_()).filter(function (r) { return r.Prefijo === prefijo && r.Fin && r.Tipo !== 'SINCRONIZACION'; }); }
function _ultimoPorFin_(lista) { var u = null; lista.forEach(function (r) { if (!u || _diaSolo_(r.Fin).getTime() >= _diaSolo_(u.Fin).getTime()) u = r; }); return u; }
function _claveCambioPago_(p) { return 'PAGO_EN_CURSO_' + p; }
function _pagoPendiente_(p) { var v = PropertiesService.getScriptProperties().getProperty(_claveCambioPago_(p)); if (!v) return null; try { return JSON.parse(v); } catch (e) { return { ilegible: true }; } }

// Estado comercial para Admin (no se usa en el POS).
function _estadoComercial_(prefijo, codPlan, vig, todos, props) {
  if (codPlan === 'PRUEBA') return { tipo: 'PRUEBA' };
  var mios = _periodosDe_(prefijo, todos), ult = _ultimoPorFin_(mios);
  var pagos = mios.filter(function (r) { return r.Tipo === 'PAGO' || r.Tipo === 'PAGO_SIMULADO'; });
  var up = pagos.length ? pagos[pagos.length - 1] : null;
  var fi = vig && vig.fechaVence ? _diaSolo_(new Date(vig.fechaVence)) : null;
  var estado;
  if (!mios.length) estado = fi ? 'HISTORICO_CON_FECHA' : 'HISTORICO_SIN_FECHA';
  else if (!fi || fi.getTime() !== _diaSolo_(ult.Fin).getTime()) estado = 'DESINCRONIZADO';
  else estado = vig.vigente ? (vig.enTolerancia ? 'EN_TOLERANCIA' : 'VIGENTE') : 'VENCIDO';
  var tz = Session.getScriptTimeZone(), f = function (d) { return d ? Utilities.formatDate(new Date(d), tz, 'dd/MM/yyyy') : ''; };
  return {
    tipo: 'PAGO', estado: estado, historico: !mios.length,
    planAsignado: codPlan,
    ultimoPago: up ? { fecha: f(up.Fecha_registro), importe: up.Importe, medio: up.Medio, referencia: String(up.Referencia || '').replace(/^'/, ''), simulado: up.Tipo === 'PAGO_SIMULADO' } : null,
    periodo: ult ? { inicio: f(ult.Inicio), fin: f(ult.Fin), tipo: ult.Tipo } : (fi ? { inicio: '', fin: f(fi), tipo: 'HISTORICO' } : null),
    proximaRenovacion: ult ? f(_sumarDias_(_diaSolo_(ult.Fin), 1)) : (fi ? f(_sumarDias_(fi, 1)) : ''),
    finPromo: '',   // la oferta exige contrato aceptado (todavía no existe)
    pagoEnCurso: !!(props && props[_claveCambioPago_(prefijo)])
  };
}

// ── cálculo del próximo período pago (D1, D5, D6 y aclaración 1) ─────
function _proximoPeriodoPago_(prefijo, planActual, todos) {
  var hoy = _diaSolo_(new Date()), mios = _periodosDe_(prefijo, todos), ult = _ultimoPorFin_(mios);
  var inicio = null, ancla = null, ciclo = 'NUEVO';
  if (planActual !== 'PRUEBA') {
    if (ult && _diaSolo_(ult.Fin).getTime() >= hoy.getTime()) {              // renueva ANTES de vencer: se encadena
      inicio = _sumarDias_(_diaSolo_(ult.Fin), 1); ciclo = 'RENOVACION';
      ancla = (ult.Tipo === 'CORTESIA' || !Number(ult.Ancla)) ? inicio.getDate() : Number(ult.Ancla);   // D6: después de una cortesía, ancla nueva
    } else if (!ult) {                                                        // histórico con fecha todavía vigente
      var vf = _obtenerVigenciaCliente_(prefijo).fechaVence;
      if (vf && _diaSolo_(new Date(vf)).getTime() >= hoy.getTime()) { inicio = _sumarDias_(_diaSolo_(new Date(vf)), 1); ancla = inicio.getDate(); ciclo = 'RENOVACION'; }
    }
  }
  if (!inicio) { inicio = hoy; ancla = hoy.getDate(); ciclo = 'NUEVO'; }      // primer pago, desde PRUEBA o después de vencer: ciclo nuevo
  var pm = _periodoMensual_(inicio, ancla);
  return { inicio: pm.inicio, fin: pm.fin, ancla: ancla, ciclo: ciclo };
}

// Cambio de plan con el orden seguro de v030 (sin reglas comerciales: las controla quien llama). Requiere el lock.
function _ejecutarCambioPlanInterno_(prefijo, codigo, planActual, p) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var reg = { v: 33, de: planActual, a: codigo, ts: new Date().getTime(), origen: 'pago',
              cambios: p.cambios.map(function (c) { return { clave: c.clave, nombre: c.nombre, actual: c.actual, nuevo: c.nuevo }; }) };
  PropertiesService.getScriptProperties().setProperty(_claveCambioPlan_(prefijo), JSON.stringify(reg));
  _aplicarCambiosModulos_(prefijo, p.cambios.filter(function (c) { return !c.nuevo; }));
  _escribirPlan_(ss.getSheetByName('VENDEDORES'), prefijo, 5, codigo);
  _escribirPlan_(ss.getSheetByName('CLIENTES_VAO'), prefijo, 6, codigo);
  _aplicarCambiosModulos_(prefijo, p.cambios.filter(function (c) { return c.nuevo; }));
  PropertiesService.getScriptProperties().deleteProperty(_claveCambioPlan_(prefijo));
  _cachePlanes_ = null;
}
function _escribirVence_(prefijo, fin) {
  var h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CLIENTES_VAO'), f = _filaPrefijo_(h, prefijo);
  if (f === -1) throw new Error('No se encontró ' + prefijo + ' en CLIENTES_VAO');
  var actual = _fechaValida_(h.getRange(f, 9).getValue());
  if (!actual || _diaSolo_(actual).getTime() !== _diaSolo_(fin).getTime()) h.getRange(f, 9).setValue(_diaSolo_(fin));
}
function _filaPeriodo_(o) { return PER_ENC_.map(function (n) { return o[n] === undefined ? '' : o[n]; }); }
function _adminTexto_() { return 'Admin ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'); }
function _bloqueosComunes_(prefijo) {
  if (_pagoPendiente_(prefijo)) return 'Hay un pago a medio registrar en ' + prefijo + ': completalo primero.';
  if (_cambioPlanPendiente_(prefijo)) return 'Hay un cambio de plan sin terminar en ' + prefijo + ': resolvelo en el checkpoint primero.';
  return '';
}
function _fmtDia_(d) { return d ? Utilities.formatDate(_diaSolo_(new Date(d)), Session.getScriptTimeZone(), 'dd/MM/yyyy') : ''; }

// ── REGISTRAR PAGO (Admin) ───────────────────────────────────────────
// v035 (D7): un pago que CAMBIA entre planes pagos solo se acepta si su período empieza HOY.
// Renovar anticipadamente el MISMO plan sigue permitido. PRUEBA → primer plan pago no cambia.
function _cambioPlanAnticipado_(planActual, destino, per, pl) {
  if (destino === planActual || !planActual || planActual === 'PRUEBA') return null;
  if (_diaSolo_(per.inicio).getTime() <= _diaSolo_(new Date()).getTime()) return null;
  var nom = function (c) { return (pl && pl.planes && pl.planes[c] && pl.planes[c].nombre) || c; };
  return { error: 'El cambio de ' + nom(planActual) + ' a ' + nom(destino) + ' recién se puede registrar desde el ' + _fmtDia_(per.inicio) +
                  ', el día en que empieza el nuevo período. Hasta entonces podés renovar ' + nom(planActual) + '. No se registró nada.',
           cambioDesde: _fmtDia_(per.inicio), cambioPlanAnticipado: true };
}

// v040 (Etapa 3A): el registro manual pasa por el núcleo con LLAVE ÚNICA (cuenta receptora + referencia normalizada).
// Mismos nombres de acción y de campos que Admin V14; se agregan cuenta, banco, titular, operador y frase.
function confirmarPagoRecibido(data) { return _registrarPagoManual_(data || {}); }

// Un pago quedó a medio registrar (corte de Apps Script): se completa sin duplicar.
function recuperarPagoEnCurso(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  var prefijo = _normalizarPrefijo_(data.prefijo), reg = _pagoPendiente_(prefijo);
  if (!reg) return { error: prefijo + ' no tiene pagos a medio registrar' };
  if (reg.ilegible) return { error: 'El registro del pago pendiente está dañado: revisión manual (no se aplica nada a ciegas).' };
  var hayFila = _leerPeriodosCrudo_().some(function (r) { return String(r.Clave) === String(reg.clave); });
  var hayPago = !reg.pago || _leerPagos_().some(function (r) { return r.Pago_id === reg.pago.Pago_id; }); // v040
  var planOk = _planDeNegocio_(prefijo) === reg.destino;
  var vf = _obtenerVigenciaCliente_(prefijo).fechaVence;
  var venceOk = vf && _diaSolo_(new Date(vf)).getTime() === _diaSolo_(new Date(reg.fin)).getTime();
  var faltan = [];
  if (!hayPago) faltan.push('fila del pago en PAGOS_VAO'); // v040
  if (!hayFila) faltan.push('fila del pago en PERIODOS_VAO'); if (!planOk) faltan.push('plan ' + reg.destino); if (!venceOk) faltan.push('Fecha Vence ' + _fmtDia_(reg.fin));
  if (data.confirmar !== true) return { success: true, vistaPrevia: true, faltan: faltan, mensaje: faltan.length ? 'Falta completar: ' + faltan.join(', ') : 'Todo aplicado: solo falta cerrar el registro.' };
  return _conLock_(function () {
    var r2 = _pagoPendiente_(prefijo); if (!r2) return { error: 'Ya no hay pago pendiente' };
    if (_cambioPlanPendiente_(prefijo)) return { error: 'Primero completá o revertí el cambio de plan pendiente (checkpoint).' };
    _completarFilaPagoPendiente_(r2); // v040: E2 (PAGOS_VAO) antes que E3
    if (!_leerPeriodosCrudo_().some(function (r) { return String(r.Clave) === String(r2.clave); })) {
      var fila = r2.fila.slice(); fila[PC_.Inicio] = _fechaValida_(fila[PC_.Inicio]); fila[PC_.Fin] = _fechaValida_(fila[PC_.Fin]);
      fila[PC_.Fecha_pago] = _fechaValida_(fila[PC_.Fecha_pago]); fila[PC_.Fecha_registro] = _fechaValida_(fila[PC_.Fecha_registro]);
      _hojaPeriodos_().appendRow(fila);
    }
    var pa = _planDeNegocio_(prefijo);
    if (pa !== r2.destino) { var p = _planificarModulos_(prefijo, r2.destino); if (p.error) return { error: p.error }; _ejecutarCambioPlanInterno_(prefijo, r2.destino, pa, p); }
    _escribirVence_(prefijo, new Date(r2.fin));
    PropertiesService.getScriptProperties().deleteProperty(_claveCambioPago_(prefijo));
    return { success: true, mensaje: '✅ Pago completado: ' + r2.destino + ' hasta el ' + _fmtDia_(r2.fin) };
  });
}

// ── CORTESÍA (sin pago; D3, D9) ──────────────────────────────────────
function registrarCortesia(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  var prefijo = _normalizarPrefijo_(data.prefijo), plan = _planDeNegocio_(prefijo);
  if (!plan || plan === 'PRUEBA') return { error: 'La cortesía es solo para planes pagos (la prueba no se extiende).' };
  var dias = String(data.dias || '');
  if (!/^[1-7]$/.test(dias)) return { error: 'La cortesía es de 1 a 7 días.' };
  var motivo = String(data.motivo || '').replace(/[\u0000-\u001F]/g, ' ').trim();
  if (motivo.length < 5 || motivo.length > 200 || /^[=+\-@]/.test(motivo)) return { error: 'El motivo es obligatorio (5 a 200 caracteres).' };
  var calcular = function () {
    var mios = _periodosDe_(prefijo), contratos = mios.filter(function (r) { return TIPOS_CONTRATO_.indexOf(r.Tipo) !== -1; });
    if (!contratos.length) return { error: 'Este negocio no tiene un período contratado registrado: primero regularizalo o registrá un pago.' };
    var ultC = _ultimoPorFin_(contratos), ult = _ultimoPorFin_(mios);
    var yaUsada = mios.some(function (r) { return r.Tipo === 'CORTESIA' && r.Inicio && _diaSolo_(r.Inicio).getTime() > _diaSolo_(ultC.Inicio || ultC.Fin).getTime(); });
    if (yaUsada || ult.Tipo === 'CORTESIA') return { error: 'Ya se dio una cortesía en este período contratado (máximo una; no se encadenan).' };
    var hoy = _diaSolo_(new Date());
    var inicio = _diaSolo_(ult.Fin).getTime() >= hoy.getTime() ? _sumarDias_(_diaSolo_(ult.Fin), 1) : hoy;
    return { inicio: inicio, fin: _sumarDias_(inicio, Number(dias) - 1) };
  };
  var bl = _bloqueosComunes_(prefijo); if (bl) return { error: bl };
  var c = calcular(); if (c.error) return c;
  var firma = _firma_(['cortesia', prefijo, _fmtDia_(c.inicio), _fmtDia_(c.fin), motivo]);
  var res = { prefijo: prefijo, inicio: _fmtDia_(c.inicio), fin: _fmtDia_(c.fin), dias: Number(dias), motivo: motivo,
              aviso: 'Cortesía SIN PAGO: no cuenta como pago, no cambia el plan ni consume promociones. El próximo pago empezará al terminar la cortesía, con ancla nueva.' };
  if (data.confirmar !== true) return Object.assign({ success: true, vistaPrevia: true, firma: firma }, res);
  return _conLock_(function () {
    var bl2 = _bloqueosComunes_(prefijo); if (bl2) return { error: bl2 };
    var c2 = calcular(); if (c2.error) return c2;
    if (_firma_(['cortesia', prefijo, _fmtDia_(c2.inicio), _fmtDia_(c2.fin), motivo]) !== data.firma) return { error: 'Algo cambió desde la vista previa: volvé a revisarla.' };
    _hojaPeriodos_().appendRow(_filaPeriodo_({ Registro_id: Utilities.getUuid(), Prefijo: prefijo, Plan: plan, Tipo: 'CORTESIA', Inicio: c2.inicio, Fin: c2.fin,
      Ancla: '', Ciclo: '', Motivo: motivo, Admin: _adminTexto_(), Fecha_registro: new Date() }));
    _escribirVence_(prefijo, c2.fin);
    return Object.assign({ success: true, mensaje: '✅ Cortesía sin pago: hasta el ' + _fmtDia_(c2.fin) }, res);
  });
}

// ── REGULARIZAR histórico (D2, D8) ───────────────────────────────────
function regularizarVigencia(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  var prefijo = _normalizarPrefijo_(data.prefijo), plan = _planDeNegocio_(prefijo);
  if (!plan || plan === 'PRUEBA') return { error: 'Solo se regularizan planes pagos (la PRUEBA tiene su propia regularización).' };
  if (_periodosDe_(prefijo).length) return { error: 'Este negocio ya tiene historial de períodos: se renueva con pagos (o cortesía), no se regulariza.' };
  var fin = _fechaISOaDia_(data.fin), inicio = data.inicio ? _fechaISOaDia_(data.inicio) : null;
  if (!fin) return { error: 'Fecha de fin inválida' };
  if (data.inicio && (!inicio || inicio.getTime() > fin.getTime())) return { error: 'Fecha de inicio inválida' };
  var limite = _unMesAdelante_(new Date());
  if (fin.getTime() > limite.getTime()) return { error: 'Como máximo un mes calendario hacia adelante (hasta el ' + _fmtDia_(limite) + '). Más allá, registrá pagos.' };
  var motivo = String(data.motivo || '').replace(/[\u0000-\u001F]/g, ' ').trim();
  if (motivo.length < 5 || motivo.length > 200 || /^[=+\-@]/.test(motivo)) return { error: 'El motivo es obligatorio (5 a 200 caracteres).' };
  var bl = _bloqueosComunes_(prefijo); if (bl) return { error: bl };
  var hoy = _diaSolo_(new Date()), vf = _obtenerVigenciaCliente_(prefijo).fechaVence;
  var res = { prefijo: prefijo, plan: plan, fin: _fmtDia_(fin), inicio: inicio ? _fmtDia_(inicio) : '', venceActual: vf ? _fmtDia_(vf) : 'sin vencimiento', motivo: motivo,
              aviso: fin.getTime() < hoy.getTime() ? '⚠️ Con esa fecha el negocio queda VENCIDO (no podrá registrar ventas nuevas).' : 'No es un pago: se registra como REGULARIZACIÓN con tu motivo.' };
  var firma = _firma_(['regularizar', prefijo, res.fin, res.inicio, res.venceActual, motivo]);
  if (data.confirmar !== true) return Object.assign({ success: true, vistaPrevia: true, firma: firma }, res);
  return _conLock_(function () {
    if (_periodosDe_(prefijo).length) return { error: 'Ya tiene historial de períodos.' };
    var vf2 = _obtenerVigenciaCliente_(prefijo).fechaVence;
    if (_firma_(['regularizar', prefijo, res.fin, res.inicio, vf2 ? _fmtDia_(vf2) : 'sin vencimiento', motivo]) !== data.firma) return { error: 'Algo cambió desde la vista previa: volvé a revisarla.' };
    _hojaPeriodos_().appendRow(_filaPeriodo_({ Registro_id: Utilities.getUuid(), Prefijo: prefijo, Plan: plan, Tipo: 'REGULARIZACION', Inicio: inicio || '', Fin: fin,
      Ancla: _sumarDias_(fin, 1).getDate(), Ciclo: '', Motivo: motivo, Admin: _adminTexto_(), Fecha_registro: new Date() }));
    _escribirVence_(prefijo, fin);
    return Object.assign({ success: true, mensaje: '✅ Vigencia regularizada hasta el ' + res.fin }, res);
  });
}

// ── SINCRONIZAR: la Fecha Vence de la planilla no coincide con el historial ──
function sincronizarVigencia(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  var prefijo = _normalizarPrefijo_(data.prefijo), ult = _ultimoPorFin_(_periodosDe_(prefijo));
  if (!ult) return { error: 'Sin historial: usá Regularizar' };
  var vf = _obtenerVigenciaCliente_(prefijo).fechaVence;
  if (vf && _diaSolo_(new Date(vf)).getTime() === _diaSolo_(ult.Fin).getTime()) return { error: 'La fecha ya coincide con el historial' };
  var motivo = String(data.motivo || '').replace(/[\u0000-\u001F]/g, ' ').trim();
  if (motivo.length < 5 || /^[=+\-@]/.test(motivo)) return { error: 'El motivo es obligatorio' };
  var res = { prefijo: prefijo, enPlanilla: vf ? _fmtDia_(vf) : 'vacía', segunHistorial: _fmtDia_(ult.Fin), aviso: 'Vale el historial: se escribe ' + _fmtDia_(ult.Fin) + ' en Fecha Vence.' };
  var firma = _firma_(['sinc', prefijo, res.enPlanilla, res.segunHistorial, motivo]);
  if (data.confirmar !== true) return Object.assign({ success: true, vistaPrevia: true, firma: firma }, res);
  return _conLock_(function () {
    var bl = _bloqueosComunes_(prefijo); if (bl) return { error: bl };
    var vf2 = _obtenerVigenciaCliente_(prefijo).fechaVence;
    if (_firma_(['sinc', prefijo, vf2 ? _fmtDia_(vf2) : 'vacía', res.segunHistorial, motivo]) !== data.firma) return { error: 'Algo cambió desde la vista previa.' };
    _hojaPeriodos_().appendRow(_filaPeriodo_({ Registro_id: Utilities.getUuid(), Prefijo: prefijo, Plan: _planDeNegocio_(prefijo), Tipo: 'SINCRONIZACION', Inicio: '', Fin: ult.Fin,
      Motivo: motivo + ' (planilla decía: ' + res.enPlanilla + ')', Admin: _adminTexto_(), Fecha_registro: new Date() }));
    _escribirVence_(prefijo, ult.Fin);
    return Object.assign({ success: true, mensaje: '✅ Fecha Vence sincronizada con el historial: ' + res.segunHistorial }, res);
  });
}

// ── FICHA "💳 Vigencia y pagos" (Admin, solo lectura) ─────────────────
function estadoVigenciaCliente(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  var prefijo = _normalizarPrefijo_(data.prefijo);
  if (!obtenerInfoCliente(prefijo)) return { error: 'Cliente no encontrado' };
  var todos = _leerPeriodos_(), plan = _planDeNegocio_(prefijo), vig = _obtenerVigenciaCliente_(prefijo);
  var props = PropertiesService.getScriptProperties().getProperties();
  var com = _estadoComercial_(prefijo, plan, vig, todos, props);
  var mios = todos.filter(function (r) { return r.Prefijo === prefijo; });
  var pl = _leerPlanes_();
  var contratables = pl.existe ? pl.orden.filter(function (c) { var p = pl.planes[c]; return c !== 'PRUEBA' && p.activo && p.contratable !== false; })
    .map(function (c) { var p = pl.planes[c]; return { codigo: c, nombre: p.nombre, precioRegular: p.precioRegular }; }) : [];
  var contratos = mios.filter(function (r) { return TIPOS_CONTRATO_.indexOf(r.Tipo) !== -1; });
  var ultC = _ultimoPorFin_(contratos), ult = _ultimoPorFin_(mios.filter(function (r) { return r.Tipo !== 'SINCRONIZACION'; }));
  var cortesiaUsada = !!ultC && mios.some(function (r) { return r.Tipo === 'CORTESIA' && r.Inicio && _diaSolo_(r.Inicio).getTime() > _diaSolo_(ultC.Inicio || ultC.Fin).getTime(); });
  return {
    success: true, prefijo: prefijo, plan: plan, comercial: com, prueba: plan === 'PRUEBA' ? (vig.prueba ? { estado: vig.prueba.estado, venceTxt: vig.prueba.venceTxt, finGraciaTxt: vig.prueba.finGraciaTxt } : null) : null,
    historial: (function () { var cr = _leerPeriodosCrudo_(), an = _periodosAnulados_(cr); return cr.filter(function (r) { return r.Prefijo === prefijo; }).map(function (r) { r._anulado = !!an[String(r.Registro_id)]; return r; }); })()   // v040.2: con los anulados marcados
      .reverse().map(function (r) { return { tipo: r.Tipo + (r._anulado ? ' (ANULADO)' : ''), plan: r.Plan, inicio: _fmtDia_(r.Inicio), fin: _fmtDia_(r.Fin), ciclo: r.Ciclo, ancla: r.Ancla,
      importe: r.Importe, medio: r.Medio, referencia: String(r.Referencia || '').replace(/^'/, ''), motivo: r.Motivo, admin: r.Admin }; }),
    contratables: contratables, pagosSimulados: _entornoPagosSimulados_(),
    modoPagos: _modoPagos_(), cuentas: _cuentasReceptoras_(_modoPagos_()), pagosVao: _pagosVaoDe_(prefijo), mpEnLinea: _mpEnLinea_(), // v040 · v040.2
    puedeCortesia: plan !== 'PRUEBA' && !!ultC && !cortesiaUsada && !(ult && ult.Tipo === 'CORTESIA'),
    puedeRegularizar: plan !== 'PRUEBA' && !_periodosDe_(prefijo, todos).length,
    limiteRegularizar: Utilities.formatDate(_unMesAdelante_(new Date()), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    desincronizado: com.estado === 'DESINCRONIZADO', pagoEnCurso: !!props[_claveCambioPago_(prefijo)],
    cambioPlanPendiente: !!props[_claveCambioPlan_(prefijo)]
  };
}

// =====================================================================
// v036 — MODO CONSULTA (vencido o suspendido) y DESCARGA HOJA POR HOJA
// =====================================================================
// LEER: PIN válido → sesión del propio negocio. Vale aunque esté vencido o suspendido.
// ESCRIBIR: además, negocio activo y vigente (sin cambios) + freno central en el ruteo.
// El estado se mira en CADA pedido: si vence a mitad del día, la escritura siguiente se frena.

// ¿El negocio está en solo lectura? (suspendido o plan vencido). La PRUEBA regularizada vencida
// sigue con su propio control (_bloqueoPruebaVencida_), igual que desde v028.
function _motivoSoloLectura_(prefijo, info) {
  info = info || obtenerInfoCliente(prefijo);
  if (!info) return null;
  if (!info.activo) return { motivo: 'SUSPENDIDA',
    mensaje: '🔒 Tu cuenta está suspendida. Tus datos están guardados: podés consultarlos y descargarlos. Para volver a operar, contactá a VAO Sistemas.' };
  var v = _obtenerVigenciaCliente_(prefijo);
  if (!v.vigente) {
    var vt = v.fechaVence ? Utilities.formatDate(new Date(v.fechaVence), Session.getScriptTimeZone(), 'dd/MM/yyyy') : '';
    return { motivo: 'VENCIDA', venceTxt: vt,
      mensaje: '🔒 Tu suscripción venció' + (vt ? ' el ' + vt : '') + '. Tus datos están guardados: podés consultarlos y descargarlos. Para volver a vender, contactá a VAO Sistemas.' };
  }
  return null;
}

// Lo que ya había llegado antes del vencimiento se puede verificar/terminar (no es una operación nueva).
// Mismo criterio que _bloqueoPruebaVencida_ (v028).
function _operacionYaLlego_(prefijo, action, data) {
  try {
    if (action === 'vender' && data.ventaId && _buscarVentaPorId_(getHojaVentas(prefijo), String(data.ventaId)).existe) return true;
    if (action === 'venderFiado' && data.idOperacion &&
        (PropertiesService.getScriptProperties().getProperty('FIADO_OP_' + prefijo + '_' + data.idOperacion) ||
         PropertiesService.getScriptProperties().getProperty('COBRO_' + data.idOperacion) ||   // v041
         _filaTicketFiado_(getHojaFiados(prefijo), String(data.idOperacion)))) return true;
    if (action === 'ingresarMercaderia' && data.idOperacion) {
      var h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('HISTORIAL_' + prefijo);   // sin crear la hoja
      if (h && _buscarIdOperacionHistorial_(h, String(data.idOperacion)).existe) return true;
    }
  } catch (e) {}
  return false;
}

// Freno central de ESCRITURAS (se llama desde el ruteo para ACCIONES_ESCRITURA_).
function _bloqueoSoloLectura_(prefijo, action, data) {
  var r = _bloqueoPruebaVencida_(prefijo, action, data);          // v028, sin cambios
  if (r) return r;
  data = data || {};
  if (_requiereSesionLectura_(prefijo, data.token || '')) return null; // sin sesión: error habitual de la función
  var c = _motivoSoloLectura_(prefijo);
  if (!c) return null;
  if (_operacionYaLlego_(prefijo, action, data)) return null;     // la función responde como siempre (no escribe de nuevo)
  var out = { success: false, definitivo: true, soloLectura: true, motivo: c.motivo, error: c.mensaje };
  if (action === 'vender') { delete out.error; out.procesados = []; out.bloqueados = []; out.errores = [c.mensaje]; } // formato que entiende el POS
  return out;
}

// Lecturas de hojas que se crean solas si faltan (historial, préstamos, caja, salidas):
// - negocio ACTIVO: igual que siempre (la función de siempre la crea);
// - MODO CONSULTA (vencido, suspendido o PRUEBA vencida): NO se crea nada; se lee una hoja vacía en memoria.
var _HOJA_VACIA_ = { getDataRange: function () { return { getValues: function () { return []; }, getDisplayValues: function () { return []; } }; },
                     getLastRow: function () { return 0; }, getLastColumn: function () { return 0; } };
function _enModoConsulta_(prefijo) {
  if (_motivoSoloLectura_(prefijo)) return true;
  var ep = _estadoPrueba_(prefijo);
  return !!(ep && ep.regularizada && ep.estado === 'VENCIDA');
}
function _hojaParaLeer_(prefijo, base, getterQueCrea) {
  var h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(base + prefijo);
  if (h) return h;
  if (_enModoConsulta_(prefijo)) return _HOJA_VACIA_;
  return getterQueCrea(prefijo);
}

// ── DESCARGA HOJA POR HOJA ────────────────────────────────────────────
// Lista CERRADA: la pantalla manda la clave; el nombre real lo arma el servidor con el prefijo DE LA SESIÓN.
var HOJAS_DESCARGA_ = [
  { clave: 'INVENTARIO',    base: 'INVENTARIO_',       nombre: 'Inventario' },
  { clave: 'VENTAS',        base: 'VENTAS_',           nombre: 'Ventas' },
  { clave: 'FIADOS',        base: 'FIADOS_',           nombre: 'Fiados' },
  { clave: 'CLIENTES',      base: 'CLIENTES_',         nombre: 'Clientes' },
  { clave: 'CAJA',          base: 'CAJA_MOVIMIENTOS_', nombre: 'Caja' },
  { clave: 'HISTORIAL',     base: 'HISTORIAL_',        nombre: 'Historial de ingresos' },
  { clave: 'SALIDAS',       base: 'SALIDAS_',          nombre: 'Salidas' },
  { clave: 'AJUSTES',       base: 'AJUSTE_RAPIDO_',    nombre: 'Ajustes' },
  { clave: 'PRESTAMOS',     base: 'PRESTAMOS_',        nombre: 'Préstamos', soloConFilas: true },
  { clave: 'HORARIOS',      base: 'CONF_DIARIA_',      nombre: 'Horarios',  soloConFilas: true },
  { clave: 'DATOS_NEGOCIO', base: 'CONFIG_',           nombre: 'Datos del negocio', filtrada: true },
  { clave: 'PAGOS',         base: 'PAGOS_',            nombre: 'Pagos (v041)',  soloConFilas: true },
  { clave: 'ABONOS',        base: 'ABONOS_',           nombre: 'Abonos (v041)', soloConFilas: true }
];
// Datos del negocio: SOLO estos campos comerciales de CONFIG (lista de permitidos; lo nuevo no sale).
// Excluidos a propósito: sesión, intentos, módulos, reglas internas y Wi-Fi (incluye una clave).
var CAMPOS_COMERCIALES_CONFIG_ = ['title', 'slogan', 'nombre_empresa', 'telefono', 'direccion', 'email', 'ciudad', 'descripcion',
  'logo_url', 'url_sitio', 'tema_actual', 'color_primario', 'color_secundario', 'color_acento', 'alias_transferencia', 'qr_pago'];
var DESCARGA_MAX_FILAS_ = 2000;

function _defHojaDescarga_(clave) {
  clave = String(clave || '').trim().toUpperCase();
  for (var i = 0; i < HOJAS_DESCARGA_.length; i++) if (HOJAS_DESCARGA_[i].clave === clave) return HOJAS_DESCARGA_[i];
  return null;
}
function _datosNegocioDescarga_(prefijo) {
  var h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CONFIG_' + prefijo);
  if (!h || h.getLastRow() < 1) return [];
  var filas = [];
  h.getDataRange().getDisplayValues().forEach(function (r) {
    var campo = String(r[0] || '').trim();
    if (CAMPOS_COMERCIALES_CONFIG_.indexOf(campo) !== -1) filas.push([campo, String(r[1] === undefined ? '' : r[1])]);
  });
  return filas;
}

// ?action=listarHojasDescargables&prefijo=XX&data={token}  (solo lectura; también vencido o suspendido)
function listarHojasDescargables(prefijo, data) {
  var err = _requiereSesionLectura_(prefijo, (data && data.token) || '');
  if (err) return { error: err };
  var ss = SpreadsheetApp.getActiveSpreadsheet(), hojas = [];
  HOJAS_DESCARGA_.forEach(function (d) {
    var filas;
    if (d.filtrada) filas = _datosNegocioDescarga_(prefijo).length;
    else { var h = ss.getSheetByName(d.base + prefijo); if (!h) { if (d.soloConFilas) return; filas = 0; } else filas = Math.max(0, h.getLastRow() - 1); }
    if (d.soloConFilas && !filas) return;
    hojas.push({ clave: d.clave, nombre: d.nombre, filas: filas });
  });
  var c = _motivoSoloLectura_(prefijo);
  return { success: true, prefijo: prefijo, hojas: hojas, maxPorPagina: DESCARGA_MAX_FILAS_, modoConsulta: c || null };
}

// ?action=descargarHoja&prefijo=XX&data={token, hoja:'VENTAS', desde:0, limite:2000}
// Devuelve VALORES (nunca fórmulas), por páginas. No crea hojas.
function descargarHoja(prefijo, data) {
  data = data || {};
  var err = _requiereSesionLectura_(prefijo, data.token || '');
  if (err) return { error: err };
  var d = _defHojaDescarga_(data.hoja);
  if (!d) return { error: 'Hoja no disponible' };
  var desde = parseInt(data.desde, 10); if (!(desde >= 0)) desde = 0;
  var limite = parseInt(data.limite, 10); if (!(limite >= 1) || limite > DESCARGA_MAX_FILAS_) limite = DESCARGA_MAX_FILAS_;
  var base = { success: true, prefijo: prefijo, hoja: d.clave, nombre: d.nombre, desde: desde, generado: new Date().toISOString() };
  if (d.filtrada) {
    var todas = _datosNegocioDescarga_(prefijo);
    return Object.assign(base, { encabezados: ['Campo', 'Valor'], filas: todas.slice(desde, desde + limite), total: todas.length });
  }
  var h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(d.base + prefijo);   // getSheetByName: nunca crea
  if (!h || h.getLastRow() < 1 || h.getLastColumn() < 1) return Object.assign(base, { encabezados: [], filas: [], total: 0, sinRegistros: true });
  var nc = h.getLastColumn(), total = Math.max(0, h.getLastRow() - 1);
  if (d.clave === 'INVENTARIO') nc = Math.min(nc, 11);   // v041: StockVer/StockOps (L–M) son técnicas: no se descargan
  var enc = h.getRange(1, 1, 1, nc).getDisplayValues()[0];
  var n = Math.max(0, Math.min(limite, total - desde));
  // v037: los NÚMEROS van con su valor real (2500), no con el formato de la planilla ("$2,500"), que Excel en
  // español leía como 2,50. Fechas, textos y lo demás siguen como se ven en la planilla. Nunca fórmulas.
  var filas = [];
  if (n > 0) {
    var rango = h.getRange(2 + desde, 1, n, nc), vis = rango.getDisplayValues(), val = rango.getValues();
    filas = vis.map(function (fila, i) { return fila.map(function (c, j) { var v = val[i][j]; return (typeof v === 'number' && isFinite(v)) ? v : c; }); });
  }
  return Object.assign(base, { encabezados: enc, filas: filas, total: total, sinRegistros: total === 0 });
}


// =====================================================================
// v038 — ETAPA 2a: CONTRATO DIGITAL (solo STAGING)
// Registra e INFORMA aceptaciones. NO bloquea ni habilita pagos (eso es la Etapa 3).
// No toca ventas, stock, fiados, suscripciones, pagos simulados, modo consulta,
// descarga, registro público, PIN ni sesiones. No llama a ninguna función de
// vigencia, plan ni módulos: aceptar NO reactiva, NO renueva y NO permite vender.
//
// Separación PERMANENTE entre contratos de PRUEBA y COMERCIALES (no depende del nombre):
//   1. Columna Ambito (PRUEBA / COMERCIAL) dentro de la huella SHA-256 del contrato:
//      cambiarla a mano deja la versión "ALTERADA" (no se puede leer ni aceptar).
//   2. Cada aceptación copia Ambito, Planilla_origen y Entorno, y todo entra en la cadena (Hash_fila).
//   3. v038 solo puede publicar Ambito = PRUEBA (no existe camino para COMERCIAL) y exige
//      la leyenda "SIN VALOR LEGAL". En la planilla de STAGING un COMERCIAL es siempre inválido.
//   4. _aceptacionVigente_ (la que usará la Etapa 3) devuelve "no válida" para TODA aceptación
//      de PRUEBA, en STAGING, o creada en otra planilla. Sin excepciones.
// =====================================================================

var CTR_PLANILLA_STAGING_ = '1EacDxrzI2Xix5uRvOKaZdZIYiRlFfv-K9mWGf0KHIzc';
var CTR_LEYENDA_PRUEBA_ = 'SIN VALOR LEGAL';
var CTR_MAX_PARTES_ = 8, CTR_LARGO_PARTE_ = 45000;          // celdas de Sheets: máx. 50.000 caracteres
var CTR_OTP_MIN_ = 15, CTR_OTP_INTENTOS_ = 5, CTR_COD_POR_DIA_ = 3;
var CTR_NO_ENCONTRADA_ = 'Constancia no encontrada o datos incorrectos.';

var CTR_ENC_ = ['Version', 'Ambito', 'Estado', 'Planilla_origen', 'Entorno', 'Creado', 'Publicado', 'Admin_publicacion', 'Hash_SHA256', 'Partes',
                'Texto_1', 'Texto_2', 'Texto_3', 'Texto_4', 'Texto_5', 'Texto_6', 'Texto_7', 'Texto_8'];
var ACE_ENC_ = ['Aceptacion_id', 'Tipo', 'Fecha_UTC', 'Fecha_local', 'Prefijo', 'Negocio', 'Firmante_declarado', 'Contacto_registrado',
                'Caracter', 'Caracter_detalle', 'Firmante_DNI', 'Correo_verificado', 'Contrato_version', 'Ambito', 'Contrato_hash',
                'AnexoC_json', 'AnexoC_hash', 'Plan', 'Precio', 'Moneda', 'Periodo', 'Planilla_origen', 'Entorno', 'Solicitud_id',
                'Clave_cliente_hash', 'Metodo', 'Dispositivo', 'Comprobante', 'Verificador_hash', 'Hash_anterior', 'Hash_fila'];
// Únicas columnas que pueden cambiar después de escrita la fila (estado del correo y enlace de verificación).
// Todo lo demás entra en Hash_fila: si se modifica, la constancia aparece ALTERADA.
var ACE_MUTABLES_ = ['Comprobante', 'Verificador_hash', 'Hash_fila'];
var ACE_HASH_ = ACE_ENC_.filter(function (n) { return ACE_MUTABLES_.indexOf(n) === -1; });

// ── entorno ──────────────────────────────────────────────────────────
function _idPlanilla_() { try { return String(SpreadsheetApp.getActiveSpreadsheet().getId()); } catch (e) { return ''; } }
// STAGING si la planilla es la de STAGING (ID escrito acá) O si SISTEMA dice staging. Ante la duda: STAGING.
function _esPlanillaStaging_() {
  var id = _idPlanilla_();
  if (!id) return true;
  return id === CTR_PLANILLA_STAGING_ || SISTEMA.entorno === 'staging';
}
function _fechasCtr_(d) {
  var tz = Session.getScriptTimeZone();
  // Con sufijo de texto: Sheets no las convierte en fecha y la huella se puede recalcular igual.
  return { utc: Utilities.formatDate(d, 'UTC', 'yyyy-MM-dd HH:mm:ss') + ' UTC',
           local: Utilities.formatDate(d, tz, 'dd/MM/yyyy HH:mm:ss') + ' (' + tz + ')' };
}
// Texto apto para la planilla (sin controles; si empieza con = + - @ ' se antepone "·" para que nunca sea fórmula).
function _celdaCtr_(v, max) {
  var t = String(v === undefined || v === null ? '' : v).replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
  if (max) t = t.substring(0, max);
  if (/^[=+\-@']/.test(t)) t = '·' + t;
  return t;
}
function _txtCelda_(v) { return v instanceof Date ? v.toISOString() : (v === null || v === undefined ? '' : String(v)); }

// ── hojas (se crean recién en la primera ESCRITURA; las lecturas nunca crean) ──
function _hojaCtrGenerica_(nombre, enc) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), h = ss.getSheetByName(nombre);
  if (!h) h = ss.insertSheet(nombre);
  if (h.getLastRow() === 0) {
    h.getRange(1, 1, h.getMaxRows(), enc.length).setNumberFormat('@');   // todo como TEXTO: Sheets no convierte números ni fechas
    h.getRange(1, 1, 1, enc.length).setValues([enc]);
    h.setFrozenRows(1);
  }
  return h;
}
function _hojaContratos_() { return _hojaCtrGenerica_('CONTRATOS_VAO', CTR_ENC_); }
function _hojaAceptaciones_() { return _hojaCtrGenerica_('ACEPTACIONES_VAO', ACE_ENC_); }

function _leerTablaCtr_(nombre, enc) {
  var h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombre);   // getSheetByName: nunca crea
  if (!h || h.getLastRow() < 2) return [];
  var d = h.getRange(1, 1, h.getLastRow(), Math.max(enc.length, h.getLastColumn())).getValues();
  var cab = d[0].map(function (c) { return String(c).trim(); });
  return d.slice(1).map(function (r, i) {
    var o = { _fila: i + 2 };
    enc.forEach(function (n) { var k = cab.indexOf(n); o[n] = k === -1 ? '' : _txtCelda_(r[k]); });
    return o;
  });
}
// Escribe UNA fila completa (nueva o existente) respetando el orden real de los encabezados. Una sola escritura.
function _escribirFilaCtr_(h, enc, obj, fila) {
  var cab = h.getRange(1, 1, 1, Math.max(enc.length, h.getLastColumn())).getValues()[0].map(function (c) { return String(c).trim(); });
  if (enc.some(function (n) { return cab.indexOf(n) === -1; })) throw new Error('Los encabezados de ' + h.getName() + ' fueron modificados. Revisión de VAO Sistemas.');
  var valores = cab.map(function (n) { return enc.indexOf(n) === -1 ? '' : String(obj[n] === undefined || obj[n] === null ? '' : obj[n]); });
  if (!fila) {
    fila = h.getLastRow() + 1;
    if (fila > h.getMaxRows()) h.insertRowsAfter(h.getMaxRows(), 50);
  }
  h.getRange(fila, 1, 1, valores.length).setNumberFormat('@').setValues([valores]);
  return fila;
}

// ── contrato: texto, huella, versiones ───────────────────────────────
function _textoNormalizado_(t) {
  return String(t === undefined || t === null ? '' : t).replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .split('\n').map(function (l) { return l.replace(/\s+$/, ''); }).join('\n').replace(/^\n+|\n+$/g, '');
}
// La huella incluye versión, ÁMBITO, planilla de origen y entorno: cambiar cualquiera la invalida.
function _hashContrato_(c) {
  return _sha256Hex_(JSON.stringify(['VAO-CONTRATO-1', String(c.Version), String(c.Ambito), String(c.Planilla_origen), String(c.Entorno), String(c.texto)]));
}
function _leerContratos_() {
  return _leerTablaCtr_('CONTRATOS_VAO', CTR_ENC_).map(function (c) {
    var n = parseInt(c.Partes, 10) || 0, partes = [];
    for (var i = 1; i <= Math.min(n, CTR_MAX_PARTES_); i++) { var p = c['Texto_' + i]; partes.push(p.charAt(0) === '§' ? p.substring(1) : p); }
    c.texto = partes.join('');
    c.Estado = String(c.Estado).trim().toUpperCase();
    return c;
  });
}
function _integridadContrato_(c) {
  var m = [];
  if (c.Estado === 'BORRADOR') return { ok: false, borrador: true, motivos: ['Es un borrador (no publicado)'] };
  if (!c.Hash_SHA256 || _hashContrato_(c) !== c.Hash_SHA256) m.push('El texto, la versión, el ámbito o el origen no coinciden con la huella publicada');
  if (c.Planilla_origen !== _idPlanilla_()) m.push('La versión fue creada en otra planilla');
  if (c.Ambito !== 'PRUEBA' && c.Ambito !== 'COMERCIAL') m.push('Ámbito desconocido');
  if (c.Ambito === 'PRUEBA' && c.texto.indexOf(CTR_LEYENDA_PRUEBA_) === -1) m.push('Falta la leyenda SIN VALOR LEGAL');
  if (c.Ambito === 'COMERCIAL' && _esPlanillaStaging_()) m.push('Un contrato COMERCIAL no puede existir en STAGING');
  return { ok: !m.length, motivos: m };
}
function _contratoVigente_(lista) {
  var pub = (lista || _leerContratos_()).filter(function (c) { return c.Estado === 'PUBLICADA'; });
  if (!pub.length) return { error: 'Todavía no hay un contrato publicado.', sinContrato: true };
  if (pub.length > 1) return { error: 'Hay más de una versión publicada. Necesita revisión de VAO Sistemas.', alterado: true };
  var integ = _integridadContrato_(pub[0]);
  if (!integ.ok) return { error: 'CONTRATO ALTERADO: la versión publicada no coincide con su huella. No se puede leer ni aceptar hasta que VAO Sistemas lo revise.', alterado: true };
  return { contrato: pub[0] };
}
function _leerVersionContrato_(version, lista) {
  version = String(version || '');
  var l = (lista || _leerContratos_()).filter(function (c) { return c.Version === version && c.Estado !== 'BORRADOR'; });
  return l.length === 1 ? l[0] : null;
}

// ── datos del comercio y Anexo C ─────────────────────────────────────
function _datosComercioCtr_(prefijo) {
  var f = _filaClientesVao_(prefijo);
  if (!f) return null;
  var d = f.datos, negocio = String(d[1] || '').trim();
  if (!negocio) { var v = obtenerInfoCliente(prefijo); negocio = v ? v.nombre : ''; }
  return { prefijo: prefijo, negocio: _celdaCtr_(negocio, 80), contacto: _celdaCtr_(d[2], 80), correo: _correoPublico_(d[4]),
           plan: _normalizarPlan_(d[5]) };
}
function _planesContratablesCtr_(pl) {
  return pl.orden.filter(function (c) { var p = pl.planes[c]; return c !== 'PRUEBA' && p.activo && p.contratable !== false && p.precioRegular !== null; })
    .map(function (c) { return { codigo: c, nombre: pl.planes[c].nombre }; });
}
// Condiciones económicas EXACTAS publicadas al momento (PLANES_VAO / PROMOCIONES_VAO). Solo lectura.
function _armarAnexoC_(prefijo, planPedido, com) {
  com = com || _datosComercioCtr_(prefijo);
  if (!com) return { error: 'Comercio no encontrado.' };
  var pl = _leerPlanes_();
  if (!pl.existe) return { error: 'No hay planes configurados.' };
  var cod = _normalizarPlan_(planPedido || (com.plan && com.plan !== 'PRUEBA' ? com.plan : ''));
  var p = pl.planes[cod];
  if (!cod || cod === 'PRUEBA' || !p || !p.activo || p.contratable === false || p.precioRegular === null)
    return { error: 'Elegí un plan pago con precio publicado.', elegirPlan: true, planes: _planesContratablesCtr_(pl) };
  var promo = _leerPromo_(), promoTxt = null;
  if (promo && promo.estado === 'ACTIVA' && promo.planes.indexOf(cod) !== -1 && p.precioLanzamiento !== null)
    promoTxt = { nombre: promo.nombre, meses: promo.meses, condiciones: promo.condiciones, version: promo.version };
  var anexo = {
    formato: 'ANEXO_C_1', prefijo: prefijo, negocio: com.negocio,
    plan: cod, planNombre: p.nombre,
    precioRegular: String(p.precioRegular), precioLanzamiento: p.precioLanzamiento === null ? '' : String(p.precioLanzamiento),
    moneda: p.moneda || 'ARS', periodo: p.periodo || 'MENSUAL',
    modulos: MODULOS_IMPLEMENTADOS_.filter(function (m) { return p.modulos[m.clave]; }).map(function (m) { return m.nombre; }),
    promocionPublicada: promoTxt,
    nota: 'Condiciones económicas publicadas al momento de aceptar. Aceptarlas no registra un pago, no reserva cupo de promoción y no cambia el plan ni la vigencia.'
  };
  var json = JSON.stringify(anexo);
  return { anexo: anexo, json: json, hash: _sha256Hex_('ANEXO_C|' + json), comercio: com };
}

// ── código de verificación (6 dígitos, 15 min, 5 intentos, un solo uso) ──
function _claveOtpCtr_(p) { return 'CONTRATO_OTP_' + p; }
function _leerOtpCtr_(p) { var v = PropertiesService.getScriptProperties().getProperty(_claveOtpCtr_(p)); if (!v) return null; try { return JSON.parse(v); } catch (e) { return null; } }
// NO acepta PIN, token del POS ni sesión: solo el código de 6 dígitos enviado al correo, para ESA solicitud y ESE comercio.
function _verificarCodigoContrato_(prefijo, solicitudId, codigo) {
  var props = PropertiesService.getScriptProperties(), k = _claveOtpCtr_(prefijo), o = _leerOtpCtr_(prefijo);
  if (!o || !solicitudId || o.sid !== String(solicitudId)) return { ok: false, respuesta: { error: 'Código incorrecto o vencido. Pedí un código nuevo.', codigoInvalido: true } };
  if (new Date().getTime() > o.exp) { props.deleteProperty(k); return { ok: false, respuesta: { error: 'El código venció (dura ' + CTR_OTP_MIN_ + ' minutos). Pedí uno nuevo.', vencido: true } }; }
  if ((o.intentos || 0) >= CTR_OTP_INTENTOS_) { props.deleteProperty(k); return { ok: false, respuesta: { error: 'Se agotaron los intentos. Pedí un código nuevo.', bloqueado: true } }; }
  if (!/^\d{6}$/.test(String(codigo || '')) || _hashFuerte_(String(codigo), 'CTR|' + prefijo + '|' + o.sid) !== o.h) {
    o.intentos = (o.intentos || 0) + 1;
    if (o.intentos >= CTR_OTP_INTENTOS_) { props.deleteProperty(k); return { ok: false, respuesta: { error: 'Código incorrecto. Se agotaron los ' + CTR_OTP_INTENTOS_ + ' intentos: pedí un código nuevo.', bloqueado: true } }; }
    props.setProperty(k, JSON.stringify(o));
    return { ok: false, respuesta: { error: 'Código incorrecto. Te quedan ' + (CTR_OTP_INTENTOS_ - o.intentos) + ' intentos.', codigoIncorrecto: true, restantes: CTR_OTP_INTENTOS_ - o.intentos } };
  }
  return { ok: true, otp: o };
}
// El correo registrado y el contrato tienen que ser los mismos que cuando se pidió el código.
function _controlesOtpCtr_(otp, com, cv) {
  if (!com || !com.correo || _sha256Hex_('CTR|' + com.correo) !== otp.correoHash) return { error: 'El correo registrado del comercio cambió. Pedí un código nuevo.', correoCambio: true };
  if (cv.error) return cv;
  if (cv.contrato.Version !== otp.version || cv.contrato.Hash_SHA256 !== otp.contratoHash) return { error: 'El contrato cambió desde que pediste el código. Volvé a leerlo y pedí un código nuevo.', contratoCambio: true };
  return null;
}
function _prefijoCtr_(v) { var p = _normalizarPrefijo_(v); return /^[A-Z0-9]{2,10}$/.test(p) ? p : ''; }
function _claveClienteValida_(v) { v = String(v || ''); return /^[A-Za-z0-9_-]{32,128}$/.test(v) ? v : ''; }

// ── constancias: huella y cadena ─────────────────────────────────────
function _leerAceptaciones_() { return _leerTablaCtr_('ACEPTACIONES_VAO', ACE_ENC_); }
function _hashFilaAceptacion_(r) {
  return _sha256Hex_(JSON.stringify(['VAO-ACEPTACION-1'].concat(ACE_HASH_.map(function (n) { return String(r[n] === undefined || r[n] === null ? '' : r[n]); }))));
}
function _integridadAceptacion_(r, todas, contratos) {
  var m = [], i = todas.indexOf(r);
  if (_hashFilaAceptacion_(r) !== r.Hash_fila) m.push('La fila fue modificada después de registrada');
  if (r.Hash_anterior !== (i > 0 ? todas[i - 1].Hash_fila : 'INICIO')) m.push('La cadena de constancias está rota (fila borrada, movida o modificada)');
  var c = _leerVersionContrato_(r.Contrato_version, contratos);
  if (!c || c.Hash_SHA256 !== r.Contrato_hash || !_integridadContrato_(c).ok) m.push('La versión del contrato no coincide o fue alterada');
  else if (c.Ambito !== r.Ambito) m.push('El ámbito no coincide con el del contrato');
  if (r.Tipo === 'ACEPTACION' && _sha256Hex_('ANEXO_C|' + r.AnexoC_json) !== r.AnexoC_hash) m.push('El Anexo C fue modificado');
  return { ok: !m.length, motivos: m };
}
function _agregarConstancia_(obj) {
  var h = _hojaAceptaciones_();
  var todas = _leerAceptaciones_();
  obj.Hash_anterior = todas.length ? todas[todas.length - 1].Hash_fila : 'INICIO';
  obj.Hash_fila = _hashFilaAceptacion_(obj);
  return _escribirFilaCtr_(h, ACE_ENC_, obj, 0);                  // UNA sola escritura
}
function _actualizarMutableCtr_(id, cambios) {
  var r = _leerAceptaciones_().filter(function (x) { return x.Aceptacion_id === id; })[0];
  if (!r) return false;
  Object.keys(cambios).forEach(function (k) { if (ACE_MUTABLES_.indexOf(k) !== -1 && k !== 'Hash_fila') r[k] = cambios[k]; });
  _escribirFilaCtr_(_hojaAceptaciones_(), ACE_ENC_, r, r._fila);
  return true;
}
function _buscarPorSolicitudCtr_(prefijo, sid) {
  return _leerAceptaciones_().filter(function (r) { return r.Solicitud_id === sid && r.Prefijo === prefijo; })[0] || null;
}

// REGLA PERMANENTE (decisión 1): ¿esta aceptación habilita pagos REALES? Informativa en v038:
// nadie la usa para cobrar todavía (Etapa 3). Una aceptación de PRUEBA NUNCA es válida, ni ahora ni migrada.
function _aceptacionVigente_(prefijo, todas, contratos) {
  todas = todas || _leerAceptaciones_(); contratos = contratos || _leerContratos_();
  var mias = todas.filter(function (r) { return r.Prefijo === prefijo && r.Tipo === 'ACEPTACION'; });
  if (!mias.length) return { valida: false, existe: false, motivo: 'Sin aceptación registrada' };
  var u = mias[mias.length - 1];
  var base = { existe: true, aceptacionId: u.Aceptacion_id, version: u.Contrato_version, ambito: u.Ambito, fecha: u.Fecha_local };
  var no = function (motivo) { return Object.assign(base, { valida: false, motivo: motivo }); };
  if (u.Ambito !== 'COMERCIAL') return no('Aceptación de PRUEBA (sin valor legal): nunca habilita pagos reales');
  if (_esPlanillaStaging_()) return no('Entorno STAGING: ninguna aceptación habilita pagos reales');
  if (u.Planilla_origen !== _idPlanilla_()) return no('Registrada en otra planilla');
  if (u.Entorno === 'staging' || u.Entorno !== SISTEMA.entorno) return no('Registrada en otro entorno');
  var integ = _integridadAceptacion_(u, todas, contratos);
  if (!integ.ok) return no('Constancia alterada: ' + integ.motivos.join('; '));
  var cv = _contratoVigente_(contratos);
  if (cv.error || cv.contrato.Version !== u.Contrato_version || cv.contrato.Ambito !== 'COMERCIAL') return no('No corresponde al contrato comercial vigente');
  return Object.assign(base, { valida: true, motivo: '' });
}

// ── correo del comprobante (solo al correo registrado del titular; sin copia a VAO) ──
function _urlVerificacionCtr_(id, verificador) { return SISTEMA.url + 'contrato.html#v=' + id + '&k=' + verificador; }
function _textoComprobante_(r, verificador) {
  var ax = {}; try { ax = JSON.parse(r.AnexoC_json || '{}'); } catch (e) { ax = {}; }
  var lineas = [
    'Constancia de aceptación del contrato de VAO POS',
    r.Ambito === 'PRUEBA' ? '*** CONTRATO DE PRUEBA — SIN VALOR LEGAL. No habilita pagos reales. ***' : '',
    '',
    'Comercio: ' + r.Negocio + ' (' + r.Prefijo + ')',
    // v039: se informa lo que el sistema puede comprobar; el carácter solo aparece si la persona lo declaró.
    'Aceptado por (nombre declarado): ' + r.Firmante_declarado +
      (r.Caracter === 'TITULAR' ? ' — declaró actuar como titular' : r.Caracter === 'REPRESENTANTE' ? ' — declaró actuar en representación (' + r.Caracter_detalle + ')' : ''),
    'Contacto registrado al aceptar: ' + r.Contacto_registrado,
    'Fecha: ' + r.Fecha_local + ' · ' + r.Fecha_UTC,
    'Contrato: versión ' + r.Contrato_version + ' · huella ' + r.Contrato_hash,
    'Anexo C: plan ' + (ax.planNombre || r.Plan) + ' · precio regular ' + r.Moneda + ' ' + r.Precio + ' (' + r.Periodo + ')' +
      (ax.precioLanzamiento ? ' · precio de lanzamiento publicado ' + r.Moneda + ' ' + ax.precioLanzamiento : '') + ' · huella ' + r.AnexoC_hash,
    'Número de constancia: ' + r.Aceptacion_id,
    '',
    'Verificación pública (muestra solo el resultado, la versión, la huella y la fecha; ningún dato personal):',
    _urlVerificacionCtr_(r.Aceptacion_id, verificador),
    '',
    'Se registró la aceptación expresa de los términos ("Leí y acepto"), confirmada con un código enviado al correo registrado del comercio.',
    'La verificación por correo acredita el acceso al correo registrado del comercio; no comprueba la identidad legal de la persona ni su representación.',
    'Aceptar no registra un pago, no cambia el plan y no modifica la vigencia de tu cuenta.',
    '',
    'VAO Sistemas'
  ];
  return lineas.filter(function (l, i) { return l !== '' || i > 1; }).join('\n');
}

// =====================================================================
// ACCIONES PÚBLICAS (sin sesión). Ninguna devuelve datos personales sin el código o la clave del navegador.
// =====================================================================

// Texto genérico del contrato (sin datos de ningún comercio). Solo versiones publicadas o retiradas.
function getContrato(data) {
  data = data || {};
  var lista = _leerContratos_(), c;
  if (data.version) {
    c = _leerVersionContrato_(String(data.version), lista);
    if (!c) return { error: 'Versión no encontrada.' };
    if (!_integridadContrato_(c).ok) return { error: 'CONTRATO ALTERADO: esta versión no coincide con su huella.', alterado: true };
  } else {
    var cv = _contratoVigente_(lista);
    if (cv.error) return cv;
    c = cv.contrato;
  }
  return { success: true, version: c.Version, ambito: c.Ambito, sinValorLegal: c.Ambito === 'PRUEBA', estado: c.Estado,
           publicado: c.Publicado, hash: c.Hash_SHA256, texto: c.texto };
}

// Paso 1: el titular pide el código. Va SOLO al correo registrado del comercio.
// v038 (corrección 21/10): el NAVEGADOR genera el solicitudId (UUID v4) ANTES de pedir el código y lo conserva,
// así un corte del servidor no deja al comerciante con un código sin su solicitud.
// Estados del código guardado (CONTRATO_OTP_<PREFIJO>):
//   PREPARADO = guardado, todavía sin envío confirmado (puede haber salido o no: un corte deja la duda)
//   ENVIADO   = _enviarCorreo_ terminó sin error (Google lo aceptó; la entrega no se puede garantizar)
// Límites (CTR_COD_<PREFIJO> = { dia, solicitudes: { sid: intentos de envío reservados } }):
//   máximo 3 solicitudes por comercio por día y 2 intentos de envío por solicitud.
//   Cada intento se RESERVA en forma persistente ANTES de llamar a _enviarCorreo_. Un error SEGURO del correo
//   devuelve la reserva; un corte la deja gastada (lado seguro). Nunca se responde "ya enviado" sin ENVIADO.
// La respuesta es la misma exista o no el comercio (no revela comercios ni correos).
var CTR_INTENTOS_POR_SID_ = 2;
var CTR_SID_PATRON_ = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
function contratoSolicitarCodigo(data) {
  data = data || {};
  var prefijo = _prefijoCtr_(data.prefijo);
  if (!prefijo) return { error: 'Código de comercio inválido.' };
  var sid = String(data.solicitudId || '').trim().toLowerCase();
  if (!CTR_SID_PATRON_.test(sid)) return { error: 'Falta el identificador de la solicitud. Recargá la página.' };
  return _conLock_(function () {
    var cv = _contratoVigente_();
    if (cv.error) return cv;
    var respuesta = function (extra) {
      return Object.assign({ success: true, solicitudId: sid, venceMin: CTR_OTP_MIN_,
               mensaje: 'Si el comercio tiene un correo registrado, le enviamos un código de 6 números. Revisá también la carpeta de spam. Si no llega, escribinos a VAO Sistemas.' }, extra || {});
    };
    var pedirNuevo = function (txt) { return { error: txt + ' Pedí un código nuevo.', pedirNuevo: true }; };
    var com = _datosComercioCtr_(prefijo);
    if (!com || !com.correo) return respuesta();                                   // sin correo ni código: ninguna solicitud lo acepta
    if (_buscarPorSolicitudCtr_(prefijo, sid)) return { error: 'Esta solicitud ya fue utilizada. Recargá la página para empezar de nuevo.' };
    var props = PropertiesService.getScriptProperties(), kc = 'CTR_COD_' + prefijo, kOtp = _claveOtpCtr_(prefijo), hoy = _hoyClave_();
    var cntTxt = props.getProperty(kc), otpTxt = props.getProperty(kOtp);
    var cnt = {}; try { cnt = JSON.parse(cntTxt || '{}'); } catch (e) { cnt = {}; }
    if (cnt.dia !== hoy) cnt = { dia: hoy, solicitudes: {} };
    if (!cnt.solicitudes || typeof cnt.solicitudes !== 'object') {                  // formato anterior { dia, n }: se respeta lo ya contado
      var previas = {}; for (var q = 0; q < (Number(cnt.n) || 0); q++) previas['anterior_' + q] = CTR_INTENTOS_POR_SID_;
      cnt = { dia: hoy, solicitudes: previas };
    }
    var o = null; try { o = otpTxt ? JSON.parse(otpTxt) : null; } catch (e) { o = null; }
    var mismo = !!(o && o.sid === sid), reservados = Number(cnt.solicitudes[sid]) || 0;
    if (reservados === 0) {
      // Solicitud que hoy no tiene ningún intento reservado.
      if (mismo && !(o.dia === hoy && o.estado === 'PREPARADO')) return pedirNuevo('Esta solicitud es de otro día.');
      // (mismo sid, hoy, PREPARADO sin reserva = un corte antes de reservar: el correo NUNCA salió; se rehace el intento)
      if (Object.keys(cnt.solicitudes).length >= CTR_COD_POR_DIA_)
        return { error: 'Ya se enviaron ' + CTR_COD_POR_DIA_ + ' códigos hoy para este comercio. El último sigue valiendo ' + CTR_OTP_MIN_ + ' minutos desde que se envió. Si no llegó, probá mañana.', limite: true };
    } else {
      // Reintento de una solicitud de hoy.
      if (!mismo) return pedirNuevo('Esta solicitud ya no tiene un código activo (venció, se bloqueó o fue reemplazada).');
      if (o.estado === 'ENVIADO') {
        if (new Date().getTime() <= o.exp) return respuesta({ yaEnviado: true, mensaje: 'Ya te enviamos el código para esta solicitud. Revisá también la carpeta de spam.' });
        return pedirNuevo('El código venció.');
      }
      // PREPARADO con intento reservado = envío INCIERTO (pudo salir o no). Nunca se responde "ya enviado".
      if (reservados >= CTR_INTENTOS_POR_SID_) return pedirNuevo('Ya se hicieron los ' + CTR_INTENTOS_POR_SID_ + ' intentos de envío de esta solicitud.');
    }
    var intento = (mismo && o.dia === hoy && o.estado === 'PREPARADO' && reservados === 0) ? 1 : reservados + 1;
    var codigo = _codigoSeisDigitos_(), c = cv.contrato;
    var nuevo = { sid: sid, h: _hashFuerte_(codigo, 'CTR|' + prefijo + '|' + sid), exp: new Date().getTime() + CTR_OTP_MIN_ * 60000,
                  intentos: mismo ? (Number(o.intentos) || 0) : 0,                 // los intentos fallidos de la solicitud se conservan
                  correoHash: _sha256Hex_('CTR|' + com.correo), version: c.Version, contratoHash: c.Hash_SHA256,
                  estado: 'PREPARADO', dia: hoy, envio: intento };
    // Escritura 1: el código nuevo (PREPARADO) reemplaza al anterior. Un corte acá: no salió ningún correo.
    props.setProperty(kOtp, JSON.stringify(nuevo));
    // Escritura 2: RESERVA persistente del intento, ANTES de enviar. Un corte de acá en adelante deja el intento gastado.
    cnt.solicitudes[sid] = intento;
    props.setProperty(kc, JSON.stringify(cnt));
    var err = _enviarCorreo_(com.correo, 'Código para aceptar el contrato de VAO POS',
      'Hola' + (com.contacto ? ' ' + com.contacto : '') + ':\n\nTu código para aceptar el contrato de VAO POS (versión ' + c.Version +
      (c.Ambito === 'PRUEBA' ? ' — PRUEBA, SIN VALOR LEGAL' : '') + ') para "' + com.negocio + '" es:\n\n    ' + codigo +
      '\n\nVence en ' + CTR_OTP_MIN_ + ' minutos y sirve una sola vez. No es el PIN del POS.' +
      '\nSi recibiste más de un código para esta solicitud, usá el último: los anteriores ya no sirven.' +
      '\nSi no lo pediste, ignorá este correo.\n\nVAO Sistemas');
    if (err) {
      // Error SEGURO (el correo no salió): se vuelve al código anterior y se devuelve la reserva.
      if (otpTxt) props.setProperty(kOtp, otpTxt); else props.deleteProperty(kOtp);
      if (cntTxt) props.setProperty(kc, cntTxt); else props.deleteProperty(kc);
      return { error: 'No se pudo enviar el código. Probá de nuevo en unos minutos.' };
    }
    // Escritura 3: envío confirmado (Google aceptó el correo).
    nuevo.estado = 'ENVIADO';
    props.setProperty(kOtp, JSON.stringify(nuevo));
    return respuesta();
  });
}

// Paso 2: con el código (sin consumirlo) el titular ve SUS condiciones (Anexo C) y el nombre precargado.
function getAnexoC(data) {
  data = data || {};
  var prefijo = _prefijoCtr_(data.prefijo);
  if (!prefijo) return { error: 'Código de comercio inválido.' };
  return _conLock_(function () {
    var v = _verificarCodigoContrato_(prefijo, data.solicitudId, data.codigo);
    if (!v.ok) return v.respuesta;
    var com = _datosComercioCtr_(prefijo), cv = _contratoVigente_();
    var e = _controlesOtpCtr_(v.otp, com, cv); if (e) return e;
    var ax = _armarAnexoC_(prefijo, data.plan, com);
    if (ax.error) return ax;
    return { success: true, negocio: com.negocio, prefijo: prefijo, correo: _enmascararCorreo_(com.correo), contactoRegistrado: com.contacto,
             contrato: { version: cv.contrato.Version, ambito: cv.contrato.Ambito, hash: cv.contrato.Hash_SHA256 },
             anexoC: ax.anexo, anexoHash: ax.hash, planes: _planesContratablesCtr_(_leerPlanes_()),
             venceEnMin: Math.max(0, Math.ceil((v.otp.exp - new Date().getTime()) / 60000)),
             aviso: 'El nombre que declares y el contacto registrado no prueban por sí solos identidad ni representación.' };
  });
}

// Paso 3: aceptar. Todo se recalcula bajo el candado; una sola escritura; idempotente por solicitud.
function contratoAceptar(data) {
  data = data || {};
  var prefijo = _prefijoCtr_(data.prefijo), sid = String(data.solicitudId || '');
  var clave = _claveClienteValida_(data.claveCliente);
  if (!prefijo) return { error: 'Código de comercio inválido.' };
  if (!clave) return { error: 'Falta la clave de este navegador. Recargá la página.' };
  var res = _conLock_(function () {
    // Respuesta perdida: la misma solicitud ya registrada se recupera SOLO con la clave del navegador que aceptó.
    var ya = sid ? _buscarPorSolicitudCtr_(prefijo, sid) : null;
    if (ya) {
      if (ya.Tipo !== 'ACEPTACION' || _hashFuerte_(clave, 'CLI|' + ya.Aceptacion_id) !== ya.Clave_cliente_hash) return { error: 'Esta solicitud ya fue utilizada.' };
      return { success: true, yaRegistrada: true, aceptacionId: ya.Aceptacion_id, fecha: ya.Fecha_local, version: ya.Contrato_version,
               ambito: ya.Ambito, sinValorLegal: ya.Ambito === 'PRUEBA', validaParaPagos: _validaParaPagosAce_(ya), comprobante: ya.Comprobante,
               mensaje: 'Tu aceptación ya estaba registrada. El enlace de verificación está en el comprobante enviado a tu correo.' };
    }
    if (data.confirmo !== true) return { error: 'Para aceptar tenés que marcar que leíste el contrato y el Anexo C.' };
    var firmante = _textoPublico_(data.firmante, 3, 80);
    if (!firmante) return { error: 'Revisá tu nombre y apellido (3 a 80 letras).', campo: 'firmante' };
    // v039: el carácter es OPCIONAL. Sin carácter queda NO_DECLARADO (no se afirma ser titular ni representante).
    // Se siguen aceptando TITULAR y REPRESENTANTE (compatibilidad). Cualquier otro valor se rechaza.
    var caracter = String(data.caracter || '').trim().toUpperCase(), detalle = '';
    if (!caracter) caracter = 'NO_DECLARADO';
    if (caracter !== 'NO_DECLARADO' && caracter !== 'TITULAR' && caracter !== 'REPRESENTANTE') return { error: 'Carácter no válido. Podés dejarlo sin indicar.', campo: 'caracter' };
    if (caracter === 'REPRESENTANTE') { detalle = _textoPublico_(data.caracterDetalle, 2, 80); if (!detalle) return { error: 'Indicá en representación de quién o con qué carácter.', campo: 'caracterDetalle' }; }
    var v = _verificarCodigoContrato_(prefijo, sid, data.codigo);
    if (!v.ok) return v.respuesta;
    var contratos = _leerContratos_(), com = _datosComercioCtr_(prefijo), cv = _contratoVigente_(contratos);
    var e = _controlesOtpCtr_(v.otp, com, cv); if (e) return e;
    var c = cv.contrato;
    if (String(data.contratoVersion || '') !== c.Version || String(data.contratoHash || '') !== c.Hash_SHA256)
      return { error: 'El contrato que leíste no es el vigente. Volvé a leerlo.', contratoCambio: true };
    var ax = _armarAnexoC_(prefijo, data.plan, com);
    if (ax.error) return ax;
    if (String(data.anexoHash || '') !== ax.hash) return { error: 'Las condiciones del Anexo C cambiaron. Volvé a leerlas antes de aceptar.', anexoCambio: true };
    var id = Utilities.getUuid(), verificador = generarToken(64), f = _fechasCtr_(new Date());
    var fila = {
      Aceptacion_id: id, Tipo: 'ACEPTACION', Fecha_UTC: f.utc, Fecha_local: f.local, Prefijo: prefijo, Negocio: com.negocio,
      Firmante_declarado: firmante, Contacto_registrado: com.contacto, Caracter: caracter, Caracter_detalle: detalle,
      Firmante_DNI: '',                                                    // reservada: uso del DNI pendiente de abogado
      Correo_verificado: com.correo, Contrato_version: c.Version, Ambito: c.Ambito, Contrato_hash: c.Hash_SHA256,
      AnexoC_json: ax.json, AnexoC_hash: ax.hash, Plan: ax.anexo.plan, Precio: ax.anexo.precioRegular, Moneda: ax.anexo.moneda,
      Periodo: ax.anexo.periodo, Planilla_origen: _idPlanilla_(), Entorno: SISTEMA.entorno, Solicitud_id: sid,
      Clave_cliente_hash: _hashFuerte_(clave, 'CLI|' + id), Metodo: 'CASILLA_ACEPTO+CODIGO_CORREO_REGISTRADO',   // v039: aceptación expresa + código
      Dispositivo: _celdaCtr_(data.dispositivo, 200), Comprobante: 'PENDIENTE', Verificador_hash: _hashFuerte_(verificador, 'VER|' + id)
    };
    _agregarConstancia_(fila);                                            // primero la constancia…
    PropertiesService.getScriptProperties().deleteProperty(_claveOtpCtr_(prefijo));   // …después se consume el código
    return { success: true, fila: fila, verificador: verificador };
  });
  if (!res.success || res.yaRegistrada) return res;
  // El comprobante sale DESPUÉS: si el correo falla, la constancia queda registrada y "PENDIENTE" de reenvío.
  var r = res.fila, estado = 'PENDIENTE';
  if (!_enviarCorreo_(r.Correo_verificado, 'Constancia de aceptación del contrato de VAO POS', _textoComprobante_(r, res.verificador))) {
    estado = 'ENVIADO ' + _fechasCtr_(new Date()).local;
    _conLock_(function () { _actualizarMutableCtr_(r.Aceptacion_id, { Comprobante: estado }); return {}; });
  }
  return { success: true, aceptacionId: r.Aceptacion_id, verificador: res.verificador, fecha: r.Fecha_local, version: r.Contrato_version,
           ambito: r.Ambito, sinValorLegal: r.Ambito === 'PRUEBA', validaParaPagos: _validaParaPagosAce_(r), comprobante: estado === 'PENDIENTE' ? 'PENDIENTE' : 'ENVIADO',
           mensaje: estado === 'PENDIENTE' ? 'Aceptación registrada. No pudimos enviar el comprobante por correo: VAO Sistemas lo puede reenviar.'
                                         : 'Aceptación registrada. Te enviamos el comprobante a tu correo.' };
}

// El titular decide no aceptar: queda registrado (informativo). No cambia nada de la cuenta.
function contratoRechazar(data) {
  data = data || {};
  var prefijo = _prefijoCtr_(data.prefijo), sid = String(data.solicitudId || '');
  if (!prefijo) return { error: 'Código de comercio inválido.' };
  var clave = data.claveCliente ? _claveClienteValida_(data.claveCliente) : '';
  return _conLock_(function () {
    var ya = sid ? _buscarPorSolicitudCtr_(prefijo, sid) : null;
    if (ya) return ya.Tipo === 'RECHAZO' ? { success: true, yaRegistrado: true, mensaje: 'Ya estaba registrado que no aceptaste.' } : { error: 'Esta solicitud ya fue utilizada.' };
    var v = _verificarCodigoContrato_(prefijo, sid, data.codigo);
    if (!v.ok) return v.respuesta;
    var contratos = _leerContratos_(), com = _datosComercioCtr_(prefijo), cv = _contratoVigente_(contratos);
    var e = _controlesOtpCtr_(v.otp, com, cv); if (e) return e;
    var id = Utilities.getUuid(), f = _fechasCtr_(new Date()), c = cv.contrato;
    _agregarConstancia_({ Aceptacion_id: id, Tipo: 'RECHAZO', Fecha_UTC: f.utc, Fecha_local: f.local, Prefijo: prefijo, Negocio: com.negocio,
      Contacto_registrado: com.contacto, Correo_verificado: com.correo, Contrato_version: c.Version, Ambito: c.Ambito, Contrato_hash: c.Hash_SHA256,
      Planilla_origen: _idPlanilla_(), Entorno: SISTEMA.entorno, Solicitud_id: sid, Clave_cliente_hash: clave ? _hashFuerte_(clave, 'CLI|' + id) : '',
      Metodo: 'CODIGO_6_DIGITOS_CORREO_REGISTRADO', Dispositivo: _celdaCtr_(data.dispositivo, 200), Comprobante: 'NO_APLICA' });
    PropertiesService.getScriptProperties().deleteProperty(_claveOtpCtr_(prefijo));
    return { success: true, mensaje: 'Registramos que no aceptaste el contrato. No cambia nada en tu cuenta.' };
  });
}

// Constancia COMPLETA (con datos personales): exige la clave del navegador que aceptó. El verificador NO sirve acá.
function getConstancia(data) {
  data = data || {};
  var id = String(data.aceptacionId || ''), clave = _claveClienteValida_(data.claveCliente);
  if (!/^[0-9a-f-]{36}$/.test(id) || !clave) return { error: CTR_NO_ENCONTRADA_ };
  var todas = _leerAceptaciones_(), r = todas.filter(function (x) { return x.Aceptacion_id === id; })[0];
  if (!r || !r.Clave_cliente_hash || _hashFuerte_(clave, 'CLI|' + id) !== r.Clave_cliente_hash) return { error: CTR_NO_ENCONTRADA_ };
  var integ = _integridadAceptacion_(r, todas, _leerContratos_()), ax = null;
  try { ax = r.AnexoC_json ? JSON.parse(r.AnexoC_json) : null; } catch (e) { ax = null; }
  return { success: true, resultado: integ.ok ? 'VÁLIDA' : 'ALTERADA', aceptacionId: id, tipo: r.Tipo, fecha: r.Fecha_local, fechaUTC: r.Fecha_UTC,
           negocio: r.Negocio, prefijo: r.Prefijo, firmanteDeclarado: r.Firmante_declarado, contactoRegistrado: r.Contacto_registrado,
           caracter: r.Caracter, caracterDetalle: r.Caracter_detalle, correo: _enmascararCorreo_(r.Correo_verificado),
           contratoVersion: r.Contrato_version, ambito: r.Ambito, sinValorLegal: r.Ambito === 'PRUEBA', contratoHash: r.Contrato_hash,
           anexoC: ax, anexoHash: r.AnexoC_hash, metodo: 'Código enviado al correo registrado', comprobante: String(r.Comprobante).indexOf('ENVIADO') === 0 ? 'ENVIADO' : r.Comprobante,
           validaParaPagos: integ.ok && _validaParaPagosAce_(r),
           aviso: 'El nombre declarado y el contacto registrado no prueban por sí solos identidad ni representación.' };
}

// Verificación PÚBLICA: Aceptacion_id + verificador. Devuelve SOLO estos 7 campos; ningún dato personal.
function verificarConstancia(data) {
  data = data || {};
  var id = String(data.aceptacionId || ''), ver = String(data.verificador || '');
  if (!/^[0-9a-f-]{36}$/.test(id) || !/^[0-9a-f]{64}$/.test(ver)) return { error: CTR_NO_ENCONTRADA_ };
  var todas = _leerAceptaciones_(), r = todas.filter(function (x) { return x.Aceptacion_id === id; })[0];
  if (!r || r.Tipo !== 'ACEPTACION' || !r.Verificador_hash || _hashFuerte_(ver, 'VER|' + id) !== r.Verificador_hash) return { error: CTR_NO_ENCONTRADA_ };
  var integ = _integridadAceptacion_(r, todas, _leerContratos_());
  return { success: true,
           resultado: integ.ok ? 'VÁLIDA' : 'ALTERADA',
           ambito: r.Ambito === 'PRUEBA' ? 'PRUEBA — SIN VALOR LEGAL' : r.Ambito,
           tipo: 'ACEPTACIÓN',
           contratoVersion: r.Contrato_version,
           contratoHash: r.Contrato_hash,
           fecha: r.Fecha_local + ' · ' + r.Fecha_UTC,
           metodo: 'Código enviado al correo registrado' };
}

// =====================================================================
// ACCIONES DE ADMIN (con sesión admin)
// =====================================================================
var CTR_SIN_SESION_ = { error: 'Sesión admin inválida o expirada' };

function estadoContratos(data) {
  data = data || {};
  if (!validarSesionAdmin(data.token || '')) return CTR_SIN_SESION_;
  var contratos = _leerContratos_(), todas = _leerAceptaciones_(), cv = _contratoVigente_(contratos);
  var prefijos = [];
  todas.forEach(function (r) { if (r.Tipo === 'ACEPTACION' && prefijos.indexOf(r.Prefijo) === -1) prefijos.push(r.Prefijo); });
  return {
    success: true, staging: _esPlanillaStaging_(), soloPrueba: true,
    vigente: cv.error ? null : cv.contrato.Version, problemaVigente: cv.error && !cv.sinContrato ? cv.error : '',
    contratos: contratos.map(function (c) {
      var ig = _integridadContrato_(c);
      return { version: c.Version, ambito: c.Ambito, estado: c.Estado, creado: c.Creado, publicado: c.Publicado, hash: c.Hash_SHA256,
               largo: c.texto.length, integra: c.Estado === 'BORRADOR' ? null : ig.ok, motivos: c.Estado === 'BORRADOR' ? [] : ig.motivos };
    }),
    aceptaciones: todas.slice(-200).map(function (r) {
      var ig = _integridadAceptacion_(r, todas, contratos);
      return { id: r.Aceptacion_id, tipo: r.Tipo, fecha: r.Fecha_local, prefijo: r.Prefijo, negocio: r.Negocio, firmante: r.Firmante_declarado,
               caracter: r.Caracter, caracterDetalle: r.Caracter_detalle, contacto: r.Contacto_registrado, correo: r.Correo_verificado,
               version: r.Contrato_version, ambito: r.Ambito, plan: r.Plan, precio: r.Precio, moneda: r.Moneda,
               comprobante: r.Comprobante, integra: ig.ok, motivos: ig.motivos };
    }),
    // Informativo (Etapa 3 lo usará): en v038 siempre "no válida" (todo es PRUEBA y STAGING).
    validezParaPagos: prefijos.map(function (p) { var a = _aceptacionVigente_(p, todas, contratos); return { prefijo: p, valida: a.valida, motivo: a.motivo }; })
  };
}

function guardarBorradorContrato(data) {
  data = data || {};
  if (!validarSesionAdmin(data.token || '')) return CTR_SIN_SESION_;
  var version = String(data.version || '').trim();
  if (!/^[0-9A-Za-z][0-9A-Za-z.\-]{0,29}$/.test(version) || !/[A-Za-z]/.test(version))
    return { error: 'La versión debe tener de 1 a 30 caracteres (letras, números, punto o guion) e incluir al menos una letra. Ejemplo: 0.1-STAGING.' };
  // v038: contratos de PRUEBA. v040: COMERCIAL solo fuera de STAGING y con habilitación + revisión jurídica (_comercialHabilitado_).
  var ambito = data.ambito === undefined ? 'PRUEBA' : String(data.ambito);
  if (ambito !== 'PRUEBA' && ambito !== 'COMERCIAL') return { error: 'Ámbito inválido.' };
  if (ambito === 'COMERCIAL') { var hab = _comercialHabilitado_(); if (!hab.ok) return { error: hab.motivo, comercialBloqueado: true }; }
  var texto = _textoNormalizado_(data.texto);
  if (texto.length < 50) return { error: 'El texto del contrato es demasiado corto.' };
  if (texto.length > CTR_MAX_PARTES_ * CTR_LARGO_PARTE_) return { error: 'El texto supera el máximo de ' + (CTR_MAX_PARTES_ * CTR_LARGO_PARTE_) + ' caracteres.' };
  if (ambito === 'PRUEBA' && texto.indexOf(CTR_LEYENDA_PRUEBA_) === -1) return { error: 'Un contrato de PRUEBA debe incluir en su texto la leyenda "' + CTR_LEYENDA_PRUEBA_ + '".' };
  if (ambito === 'COMERCIAL' && texto.indexOf(CTR_LEYENDA_PRUEBA_) !== -1) return { error: 'Un contrato COMERCIAL no puede llevar la leyenda "' + CTR_LEYENDA_PRUEBA_ + '".' };
  var buscar = function () { return _leerContratos_().filter(function (c) { return c.Version === version; })[0] || null; };
  var ex = buscar();
  if (ex && ex.Estado !== 'BORRADOR') return { error: 'La versión ' + version + ' ya fue publicada: no se puede modificar. Usá un número de versión nuevo.' };
  var firmaDe = function (x) { return _firma_(['ctr-borrador', version, ambito, _sha256Hex_(texto), x ? _sha256Hex_(x.texto) + '|' + x.Estado : '']); };
  var partes = Math.max(1, Math.ceil(texto.length / CTR_LARGO_PARTE_));
  if (data.confirmar !== true) return { success: true, vistaPrevia: true, version: version, ambito: ambito, largo: texto.length, partes: partes,
    reemplazaBorrador: !!ex, inicio: texto.substring(0, 300), firma: firmaDe(ex),
    aviso: 'Se guarda como BORRADOR: nadie lo ve ni lo puede aceptar hasta que lo publiques.' };
  return _conLock_(function () {
    var ex2 = buscar();
    if (ex2 && ex2.Estado !== 'BORRADOR') return { error: 'La versión ' + version + ' ya fue publicada: no se puede modificar.' };
    if (firmaDe(ex2) !== data.firma) return { error: 'El borrador cambió desde la vista previa. Volvé a revisarlo.' };
    if (ambito === 'COMERCIAL' && !_comercialHabilitado_().ok) return { error: _comercialHabilitado_().motivo, comercialBloqueado: true };
    var obj = { Version: version, Ambito: ambito, Estado: 'BORRADOR', Planilla_origen: _idPlanilla_(), Entorno: SISTEMA.entorno,
                Creado: _fechasCtr_(new Date()).local, Publicado: '', Admin_publicacion: '', Hash_SHA256: '', Partes: String(partes) };
    for (var i = 1; i <= CTR_MAX_PARTES_; i++) { var p = texto.substring((i - 1) * CTR_LARGO_PARTE_, i * CTR_LARGO_PARTE_); obj['Texto_' + i] = p ? '§' + p : ''; }
    _escribirFilaCtr_(_hojaContratos_(), CTR_ENC_, obj, ex2 ? ex2._fila : 0);
    return { success: true, version: version, estado: 'BORRADOR', mensaje: '✅ Borrador ' + version + ' guardado (' + (ambito === 'COMERCIAL' ? 'COMERCIAL' : 'PRUEBA — sin valor legal') + ').' };
  });
}

function publicarContrato(data) {
  data = data || {};
  if (!validarSesionAdmin(data.token || '')) return CTR_SIN_SESION_;
  var version = String(data.version || '').trim();
  var preparar = function () {
    var lista = _leerContratos_(), c = lista.filter(function (x) { return x.Version === version; })[0];
    if (!c) return { error: 'No existe la versión ' + version + '.' };
    if (c.Estado !== 'BORRADOR') return { error: 'Solo se puede publicar un BORRADOR. La versión ' + version + ' está ' + c.Estado + '.' };
    if (c.Ambito === 'COMERCIAL') { var hb = _comercialHabilitado_(); if (!hb.ok) return { error: hb.motivo, comercialBloqueado: true };
      if (c.texto.indexOf(CTR_LEYENDA_PRUEBA_) !== -1) return { error: 'Un contrato COMERCIAL no puede llevar la leyenda "' + CTR_LEYENDA_PRUEBA_ + '".' }; }
    else if (c.Ambito !== 'PRUEBA') return { error: 'Ámbito desconocido: no se publica.' };
    else if (c.texto.indexOf(CTR_LEYENDA_PRUEBA_) === -1) return { error: 'Falta la leyenda "' + CTR_LEYENDA_PRUEBA_ + '" en el texto.' };
    if (c.Planilla_origen !== _idPlanilla_() || c.Entorno !== SISTEMA.entorno) return { error: 'El borrador fue creado en otra planilla o entorno. No se publica.' };
    var otras = lista.filter(function (x) { return x.Estado === 'PUBLICADA'; });
    return { c: c, otras: otras, hash: _hashContrato_(c) };
  };
  var p = preparar();
  if (p.error) return p;
  var esCom = p.c.Ambito === 'COMERCIAL';
  var frase = (esCom ? 'PUBLICAR COMERCIAL ' : 'PUBLICAR ') + version;
  var firmaDe = function (q) { return _firma_(['ctr-publicar', version, q.hash, q.otras.map(function (x) { return x.Version; }).join(',')]); };
  if (data.confirmar !== true) return { success: true, vistaPrevia: true, version: version, ambito: esCom ? 'COMERCIAL (revisión jurídica: ' + _comercialHabilitado_().revision + ')' : 'PRUEBA — SIN VALOR LEGAL', hash: p.hash,
    largo: p.c.texto.length, inicio: p.c.texto.substring(0, 300), retira: p.otras.map(function (x) { return x.Version; }),
    fraseRequerida: frase, firma: firmaDe(p),
    aviso: esCom ? 'Una vez publicada, esta versión no se puede modificar. Desde ese momento, cada comercio tiene que ACEPTAR esta versión para poder pagar (las aceptaciones de versiones anteriores dejan de habilitar pagos).'
                 : 'Una vez publicada, esta versión no se puede modificar. Las aceptaciones anteriores no cambian. Una aceptación de PRUEBA nunca habilita pagos reales.' };
  if (String(data.frase || '') !== frase) return { error: 'Para publicar escribí exactamente: ' + frase };
  return _conLock_(function () {
    var q = preparar();
    if (q.error) return q;
    if (firmaDe(q) !== data.firma) return { error: 'Los contratos cambiaron desde la vista previa. Volvé a revisarlos.' };
    var h = _hojaContratos_(), ahora = _fechasCtr_(new Date()).local;
    // Primero se retira la anterior (un corte deja "sin contrato publicado", nunca dos publicadas); después se publica.
    q.otras.forEach(function (x) { x.Estado = 'RETIRADA'; _escribirFilaCtr_(h, CTR_ENC_, x, x._fila); });
    q.c.Estado = 'PUBLICADA'; q.c.Publicado = ahora; q.c.Admin_publicacion = q.c.Ambito === 'COMERCIAL' ? ('ADMIN · revisión jurídica: ' + _comercialHabilitado_().revision).substring(0, 200) : 'ADMIN'; q.c.Hash_SHA256 = q.hash;
    _escribirFilaCtr_(h, CTR_ENC_, q.c, q.c._fila);
    return { success: true, version: version, hash: q.hash, retiradas: q.otras.map(function (x) { return x.Version; }),
             mensaje: '✅ Versión ' + version + ' publicada (' + (q.c.Ambito === 'COMERCIAL' ? 'COMERCIAL' : 'PRUEBA — sin valor legal') + ').' };
  });
}

function verificarIntegridadContratos(data) {
  data = data || {};
  if (!validarSesionAdmin(data.token || '')) return CTR_SIN_SESION_;
  var contratos = _leerContratos_(), todas = _leerAceptaciones_(), problemas = [];
  contratos.forEach(function (c) { if (c.Estado === 'BORRADOR') return; var ig = _integridadContrato_(c); if (!ig.ok) problemas.push({ tipo: 'CONTRATO', version: c.Version, motivos: ig.motivos }); });
  todas.forEach(function (r) { var ig = _integridadAceptacion_(r, todas, contratos); if (!ig.ok) problemas.push({ tipo: 'CONSTANCIA', id: r.Aceptacion_id, prefijo: r.Prefijo, fila: r._fila, motivos: ig.motivos }); });
  return { success: true, ok: !problemas.length, contratos: contratos.length, constancias: todas.length, problemas: problemas };
}

// Reenvía el comprobante SOLO al correo registrado actual del comercio. Genera un enlace de verificación nuevo
// (el anterior deja de funcionar). Si el correo falla, no cambia nada.
function reenviarComprobante(data) {
  data = data || {};
  if (!validarSesionAdmin(data.token || '')) return CTR_SIN_SESION_;
  var id = String(data.aceptacionId || '');
  var preparar = function () {
    var r = _leerAceptaciones_().filter(function (x) { return x.Aceptacion_id === id && x.Tipo === 'ACEPTACION'; })[0];
    if (!r) return { error: 'Constancia no encontrada.' };
    var com = _datosComercioCtr_(r.Prefijo);
    if (!com || !com.correo) return { error: 'El comercio no tiene un correo registrado válido.' };
    return { r: r, correo: com.correo };
  };
  var p = preparar();
  if (p.error) return p;
  var firmaDe = function (q) { return _firma_(['ctr-reenvio', id, q.correo, q.r.Comprobante, q.r.Verificador_hash]); };
  if (data.confirmar !== true) return { success: true, vistaPrevia: true, aceptacionId: id, negocio: p.r.Negocio, prefijo: p.r.Prefijo,
    destino: _enmascararCorreo_(p.correo), correoDistintoAlVerificado: p.correo !== p.r.Correo_verificado, comprobante: p.r.Comprobante, firma: firmaDe(p),
    aviso: 'Se envía solo al correo registrado del comercio. Se genera un enlace de verificación nuevo y el anterior deja de funcionar.' };
  return _conLock_(function () {
    var q = preparar();
    if (q.error) return q;
    if (firmaDe(q) !== data.firma) return { error: 'La constancia cambió desde la vista previa.' };
    var verificador = generarToken(64);
    var err = _enviarCorreo_(q.correo, 'Constancia de aceptación del contrato de VAO POS', _textoComprobante_(q.r, verificador));
    if (err) return { error: err + '. No se cambió nada.' };
    _actualizarMutableCtr_(id, { Comprobante: 'ENVIADO ' + _fechasCtr_(new Date()).local + ' (reenvío)', Verificador_hash: _hashFuerte_(verificador, 'VER|' + id) });
    return { success: true, destino: _enmascararCorreo_(q.correo), mensaje: '✅ Comprobante reenviado al correo registrado.' };
  });
}


// =====================================================================
// v040 — ETAPA 3A + MERCADO PAGO: REGISTRO CENTRAL DE PAGOS (PAGOS_VAO)
// =====================================================================
// Un solo camino para acreditar un abono, venga de una TRANSFERENCIA verificada por VAO o de un pago
// de MERCADO PAGO (Checkout Pro) consultado en la API oficial. Reglas:
//  · Cada pago tiene una LLAVE ÚNICA: 'TRF|<cuenta receptora>|<referencia normalizada>' o 'MP|<payment_id>'.
//    Una llave ya registrada NUNCA vuelve a acreditar (reintentos, webhooks repetidos, doble clic, ficha reabierta).
//  · La llave se controla BAJO EL CANDADO contra PAGOS_VAO y contra los pagos a medio registrar.
//  · PAGOS_VAO solo agrega filas (cadena de huellas Hash_fila). Un reembolso o contracargo agrega una fila REVERSION.
//  · El navegador nunca acredita: el POS solo pide "verificar"; el servidor consulta Mercado Pago con su propio token.
//  · Una notificación (webhook) solo dice "mirá el pago N": lo que vale es lo que responde GET /v1/payments/N.
//  · Pagos REALES: solo fuera de STAGING, con PAGOS_REALES_HABILITADOS=SI y contrato COMERCIAL aceptado y vigente.
//    En STAGING: pagos SIMULADOS (PAGOS_SIMULADOS_STAGING=SI) y Mercado Pago solo con credenciales de PRUEBA.
// Secuencia de escritura (E1–E6): marca PAGO_EN_CURSO (con la fila de PAGOS_VAO) → PAGOS_VAO → PERIODOS_VAO
// (Clave = Pago_id) → plan (si cambia) → Fecha Vence → borrar la marca. recuperarPagoEnCurso completa lo que falte.

var PAG_ENC_ = ['Pago_id', 'Llave', 'Tipo', 'Medio', 'Entorno', 'Prefijo', 'Plan', 'Importe', 'Moneda', 'Fecha_pago',
                'Cuenta_receptora', 'Banco_origen', 'Titular_ref', 'Referencia', 'MP_payment_id', 'MP_orden', 'MP_estado',
                'Periodo_inicio', 'Periodo_fin', 'Operador', 'Origen', 'Fecha_registro', 'Pago_relacionado', 'Motivo',
                'Hash_anterior', 'Hash_fila'];
var ORD_ENC_ = ['Orden_id', 'Prefijo', 'Plan', 'Importe', 'Moneda', 'Creada', 'Vence', 'Preference_id', 'Init_point', 'Entorno', 'Solicitud_id', 'Tipo_precio'];
var PAGO_TIPOS_ = ['CREDITO', 'REVERSION', 'SIN_ACREDITAR', 'RESOLUCION', 'CORRECCION', 'ANULACION'];   // v040.2: CORRECCION y ANULACION (administrativas, sin borrar el original)   // v040.1: RESOLUCION = decisión de Admin sobre un pago retenido (sin crédito)
var MP_API_ = 'https://api.mercadopago.com';
var MP_ORDEN_MIN_ = 60;           // la preferencia vence a la hora
var MP_CONCILIAR_DIAS_ = 7;       // órdenes abiertas que se revisan
var MP_REVISAR_REVERSION_DIAS_ = 120;

// ── modo de pagos ────────────────────────────────────────────────────
// 'SIMULADO' (solo planilla STAGING + propiedad) · 'REAL' (no STAGING + propiedad + contrato comercial publicado) · 'BLOQUEADO'
function _modoPagos_() {
  if (_entornoPagosSimulados_()) return 'SIMULADO';
  if (_esPlanillaStaging_()) return 'BLOQUEADO';
  if (PropertiesService.getScriptProperties().getProperty('PAGOS_REALES_HABILITADOS') !== 'SI') return 'BLOQUEADO';
  var cv = _contratoVigente_();
  if (cv.error || !cv.contrato || cv.contrato.Ambito !== 'COMERCIAL') return 'BLOQUEADO';
  return 'REAL';
}
var MSJ_PAGOS_BLOQUEADOS_ = 'La contratación paga está bloqueada: falta el contrato COMERCIAL publicado y la habilitación de pagos reales. No se registró ningún pago.';
// Para un pago REAL, el comercio tiene que tener aceptado el contrato comercial vigente.
function _faltaContratoParaPagar_(prefijo, modo) {
  if (modo !== 'REAL') return '';
  var a = _aceptacionVigente_(prefijo);
  return a.valida ? '' : 'El comercio no tiene aceptado el contrato comercial vigente (' + a.motivo + ').';
}

// ── referencias y cuentas ────────────────────────────────────────────
// Normalización conservadora: mayúsculas; se quitan SOLO espacios, guiones, puntos y barras. Los ceros a la
// izquierda se conservan (0012 y 12 son referencias DISTINTAS). Resultado: 4 a 40 letras o números.
function _normRefTransfer_(r) {
  var t = String(r === undefined || r === null ? '' : r).toUpperCase().replace(/[\s\-.\/]/g, '');
  return /^[A-Z0-9]{4,40}$/.test(t) ? t : null;
}
function _cuentasReceptoras_(modo) {
  var raw = PropertiesService.getScriptProperties().getProperty('CUENTAS_RECEPTORAS_VAO'), lista = [];
  try { lista = JSON.parse(raw || '[]'); } catch (e) { lista = []; }
  lista = (Array.isArray(lista) ? lista : []).filter(function (c) { return c && /^[A-Z0-9_-]{2,20}$/.test(String(c.id || '')) && c.activa !== false; })
    .map(function (c) { return { id: String(c.id), banco: String(c.banco || '').substring(0, 40), alias: String(c.alias || '').substring(0, 40) }; });
  if (!lista.length && modo === 'SIMULADO') lista = [{ id: 'SIM-1', banco: 'BANCO SIMULADO (STAGING)', alias: 'vao.simulado' }];
  return lista;
}
function _llaveTransferencia_(cuentaId, refNorm) { return 'TRF|' + cuentaId + '|' + refNorm; }
function _llaveMP_(paymentId) { return 'MP|' + String(paymentId).replace(/\D/g, ''); }

// ── hoja PAGOS_VAO (solo agregar) ────────────────────────────────────
function _hojaPagos_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), h = ss.getSheetByName('PAGOS_VAO');
  if (!h) h = ss.insertSheet('PAGOS_VAO');
  if (h.getLastRow() === 0) h.getRange(1, 1, 1, PAG_ENC_.length).setValues([PAG_ENC_]);
  return h;
}
function _leerPagos_() {
  var h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('PAGOS_VAO');
  if (!h || h.getLastRow() < 2) return [];
  return h.getDataRange().getValues().slice(1).map(function (r) { var o = {}; PAG_ENC_.forEach(function (n, k) { o[n] = r[k]; }); o.Llave = String(o.Llave || ''); return o; });
}
// v040.3: la huella se calcula con el valor TAL COMO QUEDA en Google Sheets. Al escribir '<texto> (apóstrofo para forzar texto),
// Sheets guarda <texto> SIN el apóstrofo; antes la huella usaba el apóstrofo y la verificación daba una falsa "cadena alterada".
function _valorHashPago_(v) { if (v instanceof Date) return v.toISOString(); var s = String(v === undefined || v === null ? '' : v); return s.charAt(0) === "'" ? s.substring(1) : s; }
function _hashFilaPago_(o) { return _sha256Hex_(PAG_ENC_.slice(0, -1).map(function (n) { return _valorHashPago_(o[n]); }).join('␟')); }
// Huella como la calculaban v040 a v040.2 (con el apóstrofo en Referencia y MP_payment_id). Solo se usa para VERIFICAR filas ya escritas:
// la única diferencia aceptada es ese apóstrofo; cualquier otro cambio en la fila sigue dando una huella distinta.
var PAG_CAMPOS_APOSTROFO_ = ['Referencia', 'MP_payment_id'];
function _hashFilaPagoAnterior_(o) { return _sha256Hex_(PAG_ENC_.slice(0, -1).map(function (n) { var s = _valorHashPago_(o[n]);
  return (PAG_CAMPOS_APOSTROFO_.indexOf(n) !== -1 && s !== '') ? "'" + s : s; }).join('␟')); }
function _armarFilaPago_(o, todos) {
  var ult = todos.length ? todos[todos.length - 1] : null;
  o.Hash_anterior = ult ? String(ult.Hash_fila || '') : 'INICIO';
  o.Hash_fila = _hashFilaPago_(o);
  return PAG_ENC_.map(function (n) { return o[n] === undefined ? '' : o[n]; });
}
function _pagoPorLlave_(llave, todos) { return (todos || _leerPagos_()).filter(function (p) { return p.Llave === llave && p.Tipo !== 'REVERSION'; })[0] || null; }
// Llaves de pagos a medio registrar (marca PAGO_EN_CURSO_<prefijo> de cualquier comercio).
function _llavesEnCurso_() {
  var props = PropertiesService.getScriptProperties().getProperties(), out = {};
  Object.keys(props).forEach(function (k) {
    if (k.indexOf('PAGO_EN_CURSO_') !== 0) return;
    try { var r = JSON.parse(props[k]); if (r && r.llave) out[r.llave] = k.substring('PAGO_EN_CURSO_'.length); } catch (e) {}
  });
  return out;
}
function verificarIntegridadPagos(data) {
  if (!validarSesionAdmin((data || {}).token || '')) return { error: 'Sesión admin inválida o expirada' };
  var todos = _leerPagos_(), prev = 'INICIO', malas = [];
  todos.forEach(function (p, i) {
    var o = {}; PAG_ENC_.forEach(function (n) { o[n] = p[n]; });
    var h = String(p.Hash_fila);   // v040.3: vale la huella actual o, para filas anteriores, la de v040–v040.2
    if (String(p.Hash_anterior) !== prev || (_hashFilaPago_(o) !== h && _hashFilaPagoAnterior_(o) !== h)) malas.push(i + 2);
    prev = String(p.Hash_fila);
  });
  return { success: true, filas: todos.length, integra: !malas.length, filasAlteradas: malas };
}

// ── NÚCLEO: acreditar un pago una sola vez (llamar SOLO con el candado tomado) ──
// p: { llave, medio, entorno, prefijo, plan, importe, moneda, fechaPago, cuenta, banco, titular, referencia,
//      mpPaymentId, mpOrden, mpEstado, operador, origen, tipoPeriodo ('PAGO' | 'PAGO_SIMULADO'), firmaEsperada? }
function _acreditarPagoSinLock_(p) {
  var todos = _leerPagos_();
  // Primero: ¿está a medio registrar? (la fila de PAGOS_VAO puede existir sin el período todavía)
  var enCurso0 = _llavesEnCurso_();
  if (enCurso0[p.llave]) return { error: 'Ese pago está a medio registrar en ' + enCurso0[p.llave] + ': completalo primero (Recuperar pago en curso).', pagoEnCurso: true };
  var ya = /^ADMIN/.test(String(p.origen || '')) ? _pagoBloqueantePorLlave_(p.llave, todos, p.prefijo) : _pagoPorLlave_(p.llave, todos);   // v040.2
  if (ya && ya.anulacionPendiente) return { error: _msjAnulacionPendiente_(ya), anulacionPendiente: true };
  if (ya) return { success: true, yaRegistrado: true, pagoId: ya.Pago_id, prefijo: ya.Prefijo, tipo: ya.Tipo,
                   inicio: _fmtDia_(ya.Periodo_inicio), fin: _fmtDia_(ya.Periodo_fin), mensaje: 'Ese pago ya estaba registrado (no se duplicó).' };
  var enCurso = _llavesEnCurso_();
  if (enCurso[p.llave]) return { error: 'Ese pago está a medio registrar en ' + enCurso[p.llave] + ': completalo primero (Recuperar pago en curso).', pagoEnCurso: true };
  var bl = _bloqueosComunes_(p.prefijo); if (bl) return { error: bl, pagoEnCurso: !!_pagoPendiente_(p.prefijo) };
  var info = obtenerInfoCliente(p.prefijo); if (!info) return { error: 'Cliente no encontrado' };
  var pl = _leerPlanes_(), plan = pl.planes[p.plan];
  if (!plan || p.plan === 'PRUEBA') return { error: 'Elegí un plan pago' };
  if (!plan.activo || plan.contratable === false) return { error: 'El plan ' + plan.nombre + ' no se puede contratar' };
  var periodos = _leerPeriodos_();
  var planActual = _planDeNegocio_(p.prefijo), per = _proximoPeriodoPago_(p.prefijo, planActual, periodos);
  var noAun = _cambioPlanAnticipado_(planActual, p.plan, per, pl); if (noAun) return noAun;
  var mods = p.plan !== planActual ? _planificarModulos_(p.prefijo, p.plan) : { cambios: [] };
  if (mods.error) return { error: mods.error };
  var ben = _beneficioPromo_(p.prefijo, p.plan, plan, per.inicio);
  if (p.firmaEsperada !== undefined && _firmaPago_(p, planActual, per, mods, ben) !== p.firmaEsperada) return { error: 'Algo cambió desde la vista previa (por ejemplo, se ocupó el último cupo de la oferta): volvé a revisarla.', firmaVieja: true };
  var aPrecioPromo = plan.precioRegular !== null && plan.precioRegular !== undefined && Number(p.importe) < Number(plan.precioRegular);
  var tomaCupo = ben.tipo === 'LANZAMIENTO' && ben.nuevo && aPrecioPromo;
  var sinCupo = aPrecioPromo && ben.tipo === 'REGULAR' && Number(plan.precioLanzamiento) > 0;   // pagó menos que el regular sin derecho a la oferta
  if (sinCupo && p.origen === 'ADMIN') return { error: 'No se puede registrar a precio de lanzamiento: ' + ben.motivo + '. El precio que corresponde es $' + plan.precioRegular + '.', sinCupo: true };
  // v040.1: precio que corresponde a ESTE comercio en ESTE momento (se recalcula bajo el candado, no se confía en la orden)
  var precioHoy = ben.tipo === 'LANZAMIENTO' ? Number(plan.precioLanzamiento) : Number(plan.precioRegular);
  var insuficiente = isFinite(precioHoy) && precioHoy > 0 && Number(p.importe) < precioHoy;
  var esPagoMPAuto = p.medio === 'MERCADO_PAGO' && p.origen !== 'ADMIN' && p.origen !== 'ADMIN_RESOLUCION';
  if (p.exigirOferta && ben.tipo !== 'LANZAMIENTO')
    return { error: 'No hay un lugar de la oferta disponible para este comercio ahora (' + ben.motivo + '). No se aplicó nada.', sinCupo: true };
  if (insuficiente && p.origen === 'ADMIN_RESOLUCION') return { error: 'El importe pagado ($' + p.importe + ') no cubre el precio que corresponde ($' + precioHoy + '). No se aplicó nada.', sinCupo: true };
  // Mercado Pago: se respeta el precio con el que el SERVIDOR armó la orden (si después cambió el precio, vale el de la orden),
  // EXCEPTO la oferta: una orden a precio de lanzamiento solo se acredita si el comercio TODAVÍA tiene derecho (lugar, beneficio vigente).
  var perdioOferta = esPagoMPAuto && p.tipoPrecioOrden === 'LANZAMIENTO' && ben.tipo !== 'LANZAMIENTO';
  var sinTipoOrden = esPagoMPAuto && p.tipoPrecioOrden !== 'LANZAMIENTO' && p.tipoPrecioOrden !== 'REGULAR';
  if (perdioOferta || (sinTipoOrden && insuficiente)) return _retenerPagoMP_(p, ben, plan, precioHoy);   // registrado, SIN crédito ni cupo: lo resuelve Admin
  var pagoId = 'PAG-' + Utilities.getUuid();
  var objPago = { Pago_id: pagoId, Llave: p.llave, Tipo: 'CREDITO', Medio: p.medio, Entorno: p.entorno, Prefijo: p.prefijo, Plan: p.plan,
    Importe: Number(p.importe), Moneda: p.moneda || 'ARS', Fecha_pago: p.fechaPago, Cuenta_receptora: p.cuenta || '', Banco_origen: p.banco || '',
    Titular_ref: p.titular || '', Referencia: p.referencia ? "'" + p.referencia : '', MP_payment_id: p.mpPaymentId ? "'" + p.mpPaymentId : '',
    MP_orden: p.mpOrden || '', MP_estado: p.mpEstado || '', Periodo_inicio: per.inicio, Periodo_fin: per.fin, Operador: p.operador || '',
    Origen: p.origen || '', Fecha_registro: new Date(), Pago_relacionado: p.pagoRelacionado || '', Motivo: p.pagoRelacionado ? 'RESUELTO: oferta aplicada por Admin' : '' };
  var filaPago = _armarFilaPago_(Object.assign({}, objPago), todos);
  var filaPer = _filaPeriodo_({ Registro_id: Utilities.getUuid(), Prefijo: p.prefijo, Plan: p.plan, Tipo: p.tipoPeriodo, Inicio: per.inicio, Fin: per.fin,
    Ancla: per.ancla, Ciclo: per.ciclo, Importe: Number(p.importe), Moneda: p.moneda || 'ARS', Medio: p.medio, Referencia: p.referencia ? "'" + p.referencia : '',
    Fecha_pago: p.fechaPago, Clave: pagoId, Motivo: p.llave, Admin: p.origen === 'ADMIN' ? _adminTexto_() : (p.origen || ''), Fecha_registro: new Date(),
    Fin_promo: (ben.tipo === 'LANZAMIENTO' && aPrecioPromo) ? _diaSolo_(ben.finBeneficio) : '' });
  var cupo = tomaCupo ? { Registro_id: Utilities.getUuid(), Promo_id: ben.promoId, Prefijo: p.prefijo, Plan: p.plan, Evento: 'CONFIRMACION', Fecha: new Date(), Vence_reserva: '',
    Claves_identidad: (ben.claves || []).join(','), Orden: p.mpOrden || '', Pago_id: pagoId, Fin_beneficio: _diaSolo_(ben.finBeneficio), Admin: p.origen === 'ADMIN' ? _adminTexto_() : (p.origen || ''), Motivo: '' } : null;
  // E1 marca (incluye las dos filas para poder completar sin recalcular) → E2 PAGOS_VAO → E3 PERIODOS_VAO → E4 plan → E5 vence → E6 fin
  PropertiesService.getScriptProperties().setProperty(_claveCambioPago_(p.prefijo), JSON.stringify({ v: 40, clave: pagoId, llave: p.llave, destino: p.plan, de: planActual,
    fin: per.fin.toISOString(), fila: filaPer, pago: objPago, cupo: cupo, ts: new Date().getTime() }));
  _hojaPagos_().appendRow(filaPago);
  if (cupo) _hojaCupos_().appendRow(CUPO_ENC_.map(function (n) { return cupo[n] === undefined ? '' : cupo[n]; }));   // E2b
  _hojaPeriodos_().appendRow(filaPer);
  if (p.plan !== planActual) _ejecutarCambioPlanInterno_(p.prefijo, p.plan, planActual, mods);
  _escribirVence_(p.prefijo, per.fin);
  PropertiesService.getScriptProperties().deleteProperty(_claveCambioPago_(p.prefijo));
  return { success: true, registrado: true, pagoId: pagoId, prefijo: p.prefijo, plan: p.plan, inicio: _fmtDia_(per.inicio), fin: _fmtDia_(per.fin), ciclo: per.ciclo, ancla: per.ancla,
           oferta: ben.tipo === 'LANZAMIENTO' && aPrecioPromo ? { finBeneficio: _fmtDia_(ben.finBeneficio), cupoNuevo: tomaCupo } : null };
}
function _firmaPago_(p, planActual, per, mods, ben) {
  return _firma_(['pago40', p.prefijo, planActual, p.plan, _fmtDia_(per.inicio), _fmtDia_(per.fin), per.ancla, String(p.importe), p.medio, p.llave, p.fechaPago ? _fmtDia_(p.fechaPago) : '', (mods.cambios || []),
                  ben ? [ben.tipo, !!ben.nuevo] : null]);
}
// Fila sin acreditar o reversión (también bajo candado). Idempotente por llave + tipo.
function _registrarFilaPagoSinCredito_(o) {
  var todos = _leerPagos_();
  var ya = todos.filter(function (r) { return r.Llave === o.Llave && r.Tipo === o.Tipo; })[0];
  if (ya) return { success: true, yaRegistrado: true, pagoId: ya.Pago_id };
  o.Pago_id = o.Pago_id || 'PAG-' + Utilities.getUuid(); o.Fecha_registro = new Date();
  _hojaPagos_().appendRow(_armarFilaPago_(o, todos));
  return { success: true, registrado: true, pagoId: o.Pago_id };
}

// v040.1 — PAGO RETENIDO. Un pago APROBADO de Mercado Pago que no cubre el precio que corresponde HOY (típico: pagó el precio
// de lanzamiento, su reserva venció y otro comercio ocupó el último cupo) NO se acredita ni toma cupo. Queda:
//   · registrado en PAGOS_VAO como SIN_ACREDITAR con Motivo RETENIDO_… (nunca se pierde; la llave MP|id impide duplicarlo);
//   · con alerta PAGO_RETENIDO en Admin y un correo al comercio explicando qué pasó con su dinero;
//   · a resolver por Admin (mpResolverRetenido): APLICAR_OFERTA solo si HAY un lugar disponible, o A_DEVOLVER.
function _retenerPagoMP_(p, ben, plan, precioHoy) {
  var motivo = /no quedan cupos/.test(String(ben.motivo)) ? 'SIN_CUPO' : (ben.tipo === 'REGULAR' && Number(plan.precioLanzamiento) > 0 ? 'SIN_DERECHO_OFERTA' : 'PRECIO_DISTINTO');
  var r = _registrarFilaPagoSinCredito_({ Llave: p.llave, Tipo: 'SIN_ACREDITAR', Medio: p.medio, Entorno: p.entorno, Prefijo: p.prefijo, Plan: p.plan,
    Importe: Number(p.importe), Moneda: p.moneda || 'ARS', Fecha_pago: p.fechaPago, Cuenta_receptora: 'MP', MP_payment_id: p.mpPaymentId ? "'" + p.mpPaymentId : '',
    MP_orden: p.mpOrden || '', MP_estado: p.mpEstado || '', Origen: p.origen || '',
    Motivo: 'RETENIDO_' + motivo + ': ' + ben.motivo + ' (corresponde $' + precioHoy + ', pagó $' + Number(p.importe) + ')' });
  var txtCliente = motivo === 'SIN_CUPO' ? 'ya no quedaban lugares de la oferta de lanzamiento cuando se aprobó el pago'
                 : motivo === 'SIN_DERECHO_OFERTA' ? 'el precio de lanzamiento ya no correspondía a tu cuenta cuando se aprobó el pago (' + ben.motivo + ')'
                 : 'el importe pagado no coincide con el precio vigente del plan';
  if (!r.yaRegistrado) {
    _agregarAlertaMP_({ tipo: 'PAGO_RETENIDO', prefijo: p.prefijo, paymentId: p.mpPaymentId || p.llave, pagoId: r.pagoId,
      mensaje: 'Pago aprobado de $' + Number(p.importe) + ' RETENIDO sin acreditar (' + ben.motivo + '). Resolver en la ficha: aplicar la oferta si hay lugar, o devolver.' });
    try {
      var fc = _filaClientesVao_(p.prefijo), correo = fc ? String(fc.datos[4] || '').trim() : '';
      if (correo.indexOf('@') > 0) _enviarCorreo_(correo, 'VAO POS — recibimos tu pago (operación ' + (p.mpPaymentId || '') + ')',
        'Hola.\n\nRecibimos tu pago de $' + Number(p.importe) + ' por Mercado Pago (operación ' + (p.mpPaymentId || '') + ') para el plan ' + (plan.nombre || p.plan) + '.\n\n' +
        'No pudimos aplicarlo automáticamente porque ' + txtCliente + '.\n\n' +
        'Tu pago quedó registrado y no se perdió. No vuelvas a pagar: VAO Sistemas lo va a revisar y se va a comunicar con vos para aplicarlo o devolverte el dinero.\n\nVAO Sistemas');
    } catch (e) {}
  }
  return { retenido: true, pagoId: r.pagoId, yaRegistrado: !!r.yaRegistrado, motivo: motivo, motivoCliente: txtCliente };
}

// ── A. TRANSFERENCIA (Admin): reemplaza el cuerpo de confirmarPagoRecibido ──
// data: { token, prefijo, plan, importe, fechaPago 'AAAA-MM-DD', cuenta, referencia, banco, titular?, operador?, medio?, frase?, confirmar?, firma? }
function _registrarPagoManual_(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  var modo = _modoPagos_();
  if (modo === 'BLOQUEADO') return { error: MSJ_PAGOS_BLOQUEADOS_, bloqueado: true };
  var prefijo = _normalizarPrefijo_(data.prefijo), destino = _normalizarPlan_(data.plan);
  if (!obtenerInfoCliente(prefijo)) return { error: 'Cliente no encontrado' };
  var falta = _faltaContratoParaPagar_(prefijo, modo); if (falta) return { error: falta, sinContrato: true };
  var medio = String(data.medio || 'TRANSFERENCIA').toUpperCase();
  if (medio !== 'TRANSFERENCIA' && medio !== 'MERCADO_PAGO') return { error: 'Medio no admitido: solo transferencia bancaria o un pago de Mercado Pago ya acreditado.' };
  var importe = String(data.importe || '');
  if (!/^\d{1,9}$/.test(importe) || Number(importe) <= 0) return { error: 'Importe inválido (pesos enteros, sin puntos)' };
  var fechaPago = data.fechaPago ? _fechaISOaDia_(data.fechaPago) : _diaSolo_(new Date());
  if (!fechaPago || fechaPago.getTime() > _diaSolo_(new Date()).getTime()) return { error: 'Fecha de pago inválida (no puede ser futura)' };
  var ref = _normRefTransfer_(data.referencia);
  // Se GUARDA como la escribió el admin (para leerla igual que en el extracto); la LLAVE usa la versión normalizada.
  var refTexto = String(data.referencia || '').replace(/[\u0000-\u001F]/g, ' ').trim().substring(0, 60);
  if (!ref) return { error: 'Falta la referencia de la operación (4 a 40 letras o números, tal como figura en el extracto de la cuenta que recibió el dinero). Sin referencia no se registra.', campo: 'referencia' };
  var llave, cuenta = '', banco = '', titular = '';
  if (medio === 'MERCADO_PAGO') {
    if (!/^\d{6,20}$/.test(ref)) return { error: 'El número de operación de Mercado Pago son solo dígitos.', campo: 'referencia' };
    llave = _llaveMP_(ref); cuenta = 'MP';
  } else {
    var cuentas = _cuentasReceptoras_(modo);
    // Compatibilidad Admin V14 (sin selector de cuenta): solo en SIMULADO y solo si hay UNA cuenta.
    var idCta = String(data.cuenta || '').toUpperCase() || (modo === 'SIMULADO' && cuentas.length === 1 ? cuentas[0].id : '');
    var cta = cuentas.filter(function (c) { return c.id === idCta; })[0];
    if (!cta) return { error: 'Elegí la cuenta que recibió la transferencia.', campo: 'cuenta', cuentas: cuentas };
    cuenta = cta.id;
    banco = String(data.banco || '').toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ0-9 .]/g, '').trim().substring(0, 40);
    if (banco.length < 2 && modo === 'SIMULADO' && !data.banco) banco = 'NO INFORMADO (SIMULADO)'; // compatibilidad Admin V14
    if (banco.length < 2) return { error: 'Indicá el banco o billetera de origen.', campo: 'banco' };
    titular = String(data.titular || '').replace(/\D/g, '');
    if (titular && titular.length !== 4) return { error: 'Titular: solo los últimos 4 dígitos (opcional).', campo: 'titular' };
    llave = _llaveTransferencia_(cuenta, ref);
  }
  var operador = String(data.operador || '').replace(/[\u0000-\u001F]/g, ' ').trim().substring(0, 40);
  if (modo === 'REAL' && operador.length < 2) return { error: 'Indicá quién verificó el ingreso del dinero (operador).', campo: 'operador' };
  var enCursoM = _llavesEnCurso_();
  if (enCursoM[llave]) return { error: 'Esa transferencia está a medio registrar en ' + enCursoM[llave] + ': completala primero (Recuperar pago en curso).', pagoEnCurso: true };
  var todos = _leerPagos_(), ya = _pagoBloqueantePorLlave_(llave, todos, prefijo);   // v040.2: contempla cobros anulados
  if (ya && ya.anulacionPendiente) return { error: _msjAnulacionPendiente_(ya), anulacionPendiente: true };
  if (ya) return { success: true, yaRegistrado: true, pagoId: ya.Pago_id, prefijo: ya.Prefijo, inicio: _fmtDia_(ya.Periodo_inicio), fin: _fmtDia_(ya.Periodo_fin),
                   mensaje: 'Esa transferencia ya estaba registrada' + (ya.Prefijo !== prefijo ? ' en OTRO comercio (' + ya.Prefijo + ')' : '') + ' (no se duplicó).' };
  // Control secundario: mismo importe, misma fecha y misma cuenta → posible duplicado con otra referencia.
  // (solo dentro del MISMO comercio: varios comercios pagando el mismo precio el mismo día es lo normal)
  var estAnu = _estadoCobros_(todos).anul;   // v040.2: un cobro anulado no cuenta como "parecido"
  var parecido = todos.filter(function (r) { return r.Tipo === 'CREDITO' && !estAnu[r.Pago_id] && r.Prefijo === prefijo && r.Cuenta_receptora === cuenta && Number(r.Importe) === Number(importe) &&
                                                   r.Fecha_pago && _diaSolo_(new Date(r.Fecha_pago)).getTime() === fechaPago.getTime(); });
  if (parecido.length && String(data.frase || '').trim().toUpperCase() !== 'ES OTRA TRANSFERENCIA')
    return { error: 'Ya hay un pago del mismo importe, el mismo día y a la misma cuenta (' + parecido.map(function (r) { return r.Prefijo + ' ref ' + String(r.Referencia).replace(/^'/, ''); }).join(', ') +
             '). Si es otra transferencia distinta, escribí ES OTRA TRANSFERENCIA.', posibleDuplicado: true };
  var pago = { llave: llave, medio: medio, entorno: modo, prefijo: prefijo, plan: destino, importe: Number(importe), moneda: 'ARS', fechaPago: fechaPago, cuenta: cuenta,
               banco: banco, titular: titular, referencia: refTexto, operador: operador, origen: 'ADMIN', tipoPeriodo: modo === 'REAL' ? 'PAGO' : 'PAGO_SIMULADO' };
  var pl = _leerPlanes_(), plan = pl.planes[destino];
  if (!plan || destino === 'PRUEBA') return { error: 'Elegí un plan pago' };
  if (!plan.activo || plan.contratable === false) return { error: 'El plan ' + plan.nombre + ' no se puede contratar' };
  var bl = _bloqueosComunes_(prefijo); if (bl) return { error: bl, pagoEnCurso: !!_pagoPendiente_(prefijo) };
  var planActual = _planDeNegocio_(prefijo), per = _proximoPeriodoPago_(prefijo, planActual, _leerPeriodos_());
  var noAun = _cambioPlanAnticipado_(planActual, destino, per, pl); if (noAun) return noAun;
  var mods = destino !== planActual ? _planificarModulos_(prefijo, destino) : { cambios: [] };
  if (mods.error) return { error: mods.error };
  var ben = _beneficioPromo_(prefijo, destino, plan, per.inicio);
  var precioEsperado = ben.tipo === 'LANZAMIENTO' ? Number(plan.precioLanzamiento) : plan.precioRegular;
  var avisos = [];
  if (ben.tipo === 'LANZAMIENTO') avisos.push(ben.nuevo ? '🚀 Oferta de lanzamiento: si paga $' + plan.precioLanzamiento + ' toma un cupo (' + ben.motivo + '); beneficio hasta el ' + _fmtDia_(ben.finBeneficio) + '.'
                                                      : '🚀 Beneficio de lanzamiento vigente hasta el ' + _fmtDia_(ben.finBeneficio) + ': precio $' + plan.precioLanzamiento + '.');
  else if (plan.precioLanzamiento) avisos.push('Precio regular: ' + ben.motivo + '.');
  if (destino !== planActual) avisos.push(planActual === 'PRUEBA' ? 'Termina la PRUEBA: el negocio pasa a ' + plan.nombre + '.' : 'Cambio de plan ' + planActual + ' → ' + destino + ': el nuevo período empieza hoy y los módulos cambian al confirmar (D7).');
  if (precioEsperado !== null && precioEsperado !== undefined && Number(importe) !== Number(precioEsperado))
    avisos.push('El importe ($' + importe + ') no coincide con el precio que corresponde a este comercio ($' + precioEsperado + ').');
  if (ben.tipo === 'REGULAR' && plan.precioRegular && Number(importe) < Number(plan.precioRegular) && Number(plan.precioLanzamiento) > 0)
    return { error: 'No se puede registrar a precio de lanzamiento: ' + ben.motivo + '. El precio que corresponde es $' + plan.precioRegular + '.', sinCupo: true };
  if (_negocioActivo40_(prefijo) === false) avisos.push('El negocio está SUSPENDIDO: registrar el pago no lo reactiva (eso se hace aparte).');
  if (modo === 'SIMULADO') avisos.push('SIMULADO (STAGING): no hay dinero real.');
  var firma = _firmaPago_(pago, planActual, per, mods, ben);
  var resumen = { prefijo: prefijo, planActual: planActual, planNuevo: destino, planNombre: plan.nombre, inicio: _fmtDia_(per.inicio), fin: _fmtDia_(per.fin),
                  proxima: _fmtDia_(_sumarDias_(per.fin, 1)), ciclo: per.ciclo, ancla: per.ancla, importe: Number(importe), medio: medio, referencia: refTexto, cuenta: cuenta, banco: banco,
                  llave: llave, referenciaNormalizada: ref, precioEsperado: precioEsperado, oferta: ben.tipo === 'LANZAMIENTO' ? { nuevo: !!ben.nuevo, finBeneficio: _fmtDia_(ben.finBeneficio) } : null, avisos: avisos, simulado: modo === 'SIMULADO', modo: modo,
                  seActivan: mods.cambios.filter(function (c) { return c.nuevo; }).map(function (c) { return c.nombre; }),
                  seDesactivan: mods.cambios.filter(function (c) { return !c.nuevo; }).map(function (c) { return c.nombre; }) };
  if (data.confirmar !== true) return Object.assign({ success: true, vistaPrevia: true, firma: firma }, resumen);
  pago.firmaEsperada = String(data.firma || '');
  return _conLock_(function () {
    var r = _acreditarPagoSinLock_(pago);
    if (r.registrado) r.mensaje = '✅ Pago ' + (modo === 'SIMULADO' ? 'SIMULADO ' : '') + 'registrado: ' + destino + ' del ' + r.inicio + ' al ' + r.fin;
    return r.registrado ? Object.assign({}, resumen, r) : r;
  });
}
function _negocioActivo40_(prefijo) { var i = obtenerInfoCliente(prefijo); return i ? !!i.activo : null; }

// Admin: cuentas receptoras configuradas (sin datos sensibles más allá de banco y alias).
function cuentasReceptoras(data) {
  if (!validarSesionAdmin((data || {}).token || '')) return { error: 'Sesión admin inválida o expirada' };
  var modo = _modoPagos_();
  return { success: true, modo: modo, cuentas: _cuentasReceptoras_(modo) };
}

// Admin: pagos de un comercio (o los últimos 200) y alertas de Mercado Pago.
function estadoPagosVao(data) {
  if (!validarSesionAdmin((data || {}).token || '')) return { error: 'Sesión admin inválida o expirada' };
  var p = data.prefijo ? _normalizarPrefijo_(data.prefijo) : '';
  var todos = _leerPagos_().filter(function (r) { return !p || r.Prefijo === p; });
  var f = function (d) { return d ? _fmtDia_(d) : ''; };
  var alertas = [];
  try { alertas = JSON.parse(PropertiesService.getScriptProperties().getProperty('MP_ALERTAS_VAO') || '[]'); } catch (e) { alertas = []; }
  return { success: true, modo: _modoPagos_(), total: todos.length,
    pagos: todos.slice(-200).reverse().map(function (r) { return { pagoId: r.Pago_id, tipo: r.Tipo, medio: r.Medio, entorno: r.Entorno, prefijo: r.Prefijo, plan: r.Plan,
      importe: r.Importe, fechaPago: f(r.Fecha_pago), cuenta: r.Cuenta_receptora, referencia: String(r.Referencia || '').replace(/^'/, ''),
      mpPaymentId: String(r.MP_payment_id || '').replace(/^'/, ''), mpEstado: r.MP_estado, inicio: f(r.Periodo_inicio), fin: f(r.Periodo_fin),
      motivo: r.Motivo, relacionado: r.Pago_relacionado }; }),
    alertas: alertas.filter(function (a) { return !p || a.prefijo === p; }) };
}

// ── B. MERCADO PAGO (Checkout Pro) ────────────────────────────────────
// Credenciales de la CUENTA DE VAO (no las de los comercios): Propiedades del script
//   MP_ACCESS_TOKEN_VAO  (en STAGING: credencial de PRUEBA)
//   MP_COLLECTOR_ID_VAO  (id de usuario de la cuenta que cobra; se compara con collector_id del pago)
//   MP_RELAY_SECRET_VAO  (secreto compartido con la función de Vercel que recibe los webhooks; opcional)
//   MP_WEBHOOK_URL_VAO   (URL pública de esa función; opcional: sin webhook, la conciliación igual acredita)
function _mpConfig_() {
  var pr = PropertiesService.getScriptProperties();
  return { token: pr.getProperty('MP_ACCESS_TOKEN_VAO') || '', collector: String(pr.getProperty('MP_COLLECTOR_ID_VAO') || ''),
           relay: pr.getProperty('MP_RELAY_SECRET_VAO') || '', webhook: pr.getProperty('MP_WEBHOOK_URL_VAO') || '' };
}
// v040.1 — ¿la credencial cargada es de la cuenta correcta y del entorno correcto? (Mercado Pago no garantiza el prefijo
// del Access Token: "puede variar según la solución", y Checkout Pro se prueba con las credenciales de PRODUCCIÓN de una
// cuenta de prueba del vendedor, que empiezan con APP_USR-.) Se consulta GET /users/me:
//   · el id de la cuenta TIENE que ser MP_COLLECTOR_ID_VAO (obligatorio);
//   · STAGING (SIMULADO): la cuenta tiene que verse como de PRUEBA (prefijo TEST-, etiqueta test_user o correo @testuser.com);
//   · REAL: lo contrario. Si no se puede comprobar, NO se crea el pago (falla hacia lo seguro).
// Esas marcas de "cuenta de prueba" NO están garantizadas por la documentación: se confirman en la prueba real R0.
// Aunque este control fallara, en STAGING un pago REAL nunca se acredita (live_mode) y en REAL uno de prueba tampoco.
function _mpCuentaVerificada_(modo) {
  var c = _mpConfig_();
  if (!c.token) return { ok: false, motivo: 'El pago con Mercado Pago no está disponible por ahora. Podés pagar por transferencia.' };
  if (!/^\d{3,20}$/.test(c.collector)) return { ok: false, motivo: 'Mercado Pago no está configurado del todo (falta la cuenta cobradora). Podés pagar por transferencia.' };
  var huella = _sha256Hex_('MPCTA|' + c.token).substring(0, 16) + '|' + c.collector + '|' + modo, pr = PropertiesService.getScriptProperties();
  var cache = null; try { cache = JSON.parse(pr.getProperty('MP_CUENTA_VERIFICADA_VAO') || 'null'); } catch (e) { cache = null; }
  if (cache && cache.h === huella && cache.ok === true && new Date().getTime() - Number(cache.ts) < 6 * 3600000) return { ok: true, prueba: cache.prueba };
  var r = _mpApi_('get', '/users/me');
  if (r.code !== 200 || !r.json) return { ok: false, motivo: 'No pudimos verificar la cuenta de Mercado Pago. Probá de nuevo en unos minutos o pagá por transferencia.' };
  var u = r.json, tags = Array.isArray(u.tags) ? u.tags.map(String) : [];
  var prueba = /^TEST-/.test(c.token) || tags.indexOf('test_user') !== -1 || /@testuser\.com$/i.test(String(u.email || ''));
  var motivo = '';
  if (String(u.id) !== c.collector) motivo = 'La credencial de Mercado Pago no es de la cuenta cobradora configurada.';
  else if (modo === 'SIMULADO' && !prueba) motivo = 'En STAGING solo se admite una cuenta de PRUEBA de Mercado Pago.';
  else if (modo === 'REAL' && prueba) motivo = 'La credencial cargada es de una cuenta de PRUEBA: no se puede cobrar de verdad.';
  if (motivo) { _agregarAlertaMP_({ tipo: 'CUENTA_MP', prefijo: '', paymentId: 'cuenta', mensaje: motivo }); return { ok: false, motivo: 'El pago con Mercado Pago no está disponible por ahora (configuración). Podés pagar por transferencia.', detalle: motivo }; }
  pr.setProperty('MP_CUENTA_VERIFICADA_VAO', JSON.stringify({ h: huella, ok: true, prueba: prueba, ts: new Date().getTime() }));
  return { ok: true, prueba: prueba };
}
function _mpApi_(metodo, ruta, cuerpo) {
  var c = _mpConfig_(); if (!c.token) return { code: 0, error: 'Mercado Pago no configurado' };
  var op = { method: metodo, muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + c.token } };
  if (cuerpo) { op.contentType = 'application/json'; op.payload = JSON.stringify(cuerpo); }
  var r;
  try { r = UrlFetchApp.fetch(MP_API_ + ruta, op); } catch (e) { return { code: 0, error: 'Sin conexión con Mercado Pago' }; }
  var code = r.getResponseCode(), json = null;
  try { json = JSON.parse(r.getContentText()); } catch (e) { json = null; }
  return { code: code, json: json };
}
function _hojaOrdenes_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), h = ss.getSheetByName('ORDENES_MP_VAO');
  if (!h) h = ss.insertSheet('ORDENES_MP_VAO');
  if (h.getLastRow() === 0) h.getRange(1, 1, 1, ORD_ENC_.length).setValues([ORD_ENC_]);
  return h;
}
function _leerOrdenes_() {
  var h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ORDENES_MP_VAO');
  if (!h || h.getLastRow() < 2) return [];
  return h.getDataRange().getValues().slice(1).map(function (r) { var o = {}; ORD_ENC_.forEach(function (n, k) { o[n] = r[k]; }); return o; });
}
// Precio que paga ESTE comercio. La oferta de lanzamiento exige el control de cupos (todavía no programado):
// hasta entonces se cobra el precio regular y se informa. Nunca se toma un precio del navegador.
function _precioOrden_(prefijo, codPlan, plan, inicio) {
  if (plan.precioRegular === null || plan.precioRegular === undefined || !(Number(plan.precioRegular) > 0)) return null;
  var ben = _beneficioPromo_(prefijo, codPlan, plan, inicio);
  if (ben.tipo === 'LANZAMIENTO') return { importe: Math.round(Number(plan.precioLanzamiento)), tipo: 'LANZAMIENTO', ben: ben,
    aviso: ben.nuevo ? 'Precio de lanzamiento: el lugar queda reservado mientras el pago esté abierto.' : 'Precio de lanzamiento hasta el ' + _fmtDia_(ben.finBeneficio) + '.' };
  return { importe: Math.round(Number(plan.precioRegular)), tipo: 'REGULAR', ben: ben, aviso: plan.precioLanzamiento ? 'Precio regular (' + ben.motivo + ').' : '' };
}

// POS (sesión del comercio; también vencido): crea la orden y la preferencia. data: { token, plan, solicitudId (UUID del navegador) }
function mpCrearOrden(prefijo, data) {
  data = data || {};
  var err = _requiereSesionLectura_(prefijo, data.token || ''); if (err) return { error: err };
  if (!_mpEnLinea_()) return { error: MSJ_MP_APAGADO_, bloqueado: true, mpApagado: true };   // v040.2
  var modo = _modoPagos_(); if (modo === 'BLOQUEADO') return { error: MSJ_PAGOS_BLOQUEADOS_, bloqueado: true };
  var falta = _faltaContratoParaPagar_(prefijo, modo); if (falta) return { error: falta, sinContrato: true };
  var cfg = _mpConfig_(); if (!cfg.token) return { error: 'El pago con Mercado Pago no está disponible por ahora. Podés pagar por transferencia.' };
  var cta = _mpCuentaVerificada_(modo); if (!cta.ok) return { error: cta.motivo, cuentaMP: true };
  var sid = String(data.solicitudId || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(sid)) return { error: 'Solicitud inválida (recargá la página)' };
  var destino = _normalizarPlan_(data.plan), pl = _leerPlanes_(), plan = pl.planes[destino];
  if (!plan || destino === 'PRUEBA' || !plan.activo || plan.contratable === false) return { error: 'Ese plan no se puede contratar' };
  if (!(plan.precioRegular > 0)) return { error: 'El plan no tiene precio cargado' };
  var bl = _bloqueosComunes_(prefijo); if (bl) return { error: 'Hay una operación pendiente en tu cuenta: avisá a VAO Sistemas.' };
  var planActual = _planDeNegocio_(prefijo), per = _proximoPeriodoPago_(prefijo, planActual, _leerPeriodos_());
  var noAun = _cambioPlanAnticipado_(planActual, destino, per, pl); if (noAun) return noAun;
  return _conLock_(function () {
    var ahora = new Date();
    var abierta = _leerOrdenes_().filter(function (o) { return String(o.Solicitud_id) === sid && o.Prefijo === prefijo; })[0];
    if (abierta) {
      if (new Date(abierta.Vence).getTime() > ahora.getTime() && abierta.Plan === destino) return { success: true, reutilizada: true, orden: abierta.Orden_id, url: abierta.Init_point, importe: Number(abierta.Importe) };
      return { error: 'Esa solicitud ya se usó. Recargá la página para generar un pago nuevo.' };
    }
    var precio = _precioOrden_(prefijo, destino, plan, per.inicio);   // bajo candado: dos comercios no se llevan el mismo último cupo
    if (!precio) return { error: 'El plan no tiene precio cargado' };
    var orden = 'VAO-ORD-' + Utilities.getUuid(), vence = new Date(ahora.getTime() + MP_ORDEN_MIN_ * 60000);
    var base = SISTEMA.url + 'pos.html?p=' + encodeURIComponent(prefijo) + '&mp=' + encodeURIComponent(orden);
    var cuerpo = { items: [{ id: 'VAO-' + destino, title: 'VAO POS — Plan ' + plan.nombre + ' (1 mes) — ' + prefijo, quantity: 1, unit_price: precio.importe, currency_id: 'ARS' }],
      external_reference: orden, binary_mode: true, metadata: { prefijo: prefijo, plan: destino, orden: orden },
      payment_methods: { excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }], installments: 1 },
      back_urls: { success: base, failure: base, pending: base }, auto_return: 'approved',
      expires: true, expiration_date_from: ahora.toISOString(), expiration_date_to: vence.toISOString() };
    if (cfg.webhook) cuerpo.notification_url = cfg.webhook;
    // v040.1: el lugar se RESERVA ANTES de pedir el link de pago (bajo el mismo candado); si Mercado Pago falla, la reserva se anula.
    var reserva = precio.tipo === 'LANZAMIENTO' && precio.ben.nuevo;
    if (reserva) {
      var rv = { Registro_id: Utilities.getUuid(), Promo_id: precio.ben.promoId, Prefijo: prefijo, Plan: destino, Evento: 'RESERVA', Fecha: ahora,
                 Vence_reserva: new Date(vence.getTime() + CUPO_RESERVA_EXTRA_MIN_ * 60000), Claves_identidad: (precio.ben.claves || []).join(','), Orden: orden, Pago_id: '', Fin_beneficio: '', Admin: 'POS', Motivo: '' };
      _hojaCupos_().appendRow(CUPO_ENC_.map(function (n) { return rv[n] === undefined ? '' : rv[n]; }));
    }
    var anular = function () { if (!reserva) return; var an = { Registro_id: Utilities.getUuid(), Promo_id: precio.ben.promoId, Prefijo: prefijo, Plan: destino, Evento: 'RESERVA_ANULADA',
      Fecha: new Date(), Vence_reserva: '', Claves_identidad: '', Orden: orden, Pago_id: '', Fin_beneficio: '', Admin: 'POS', Motivo: 'Mercado Pago no generó el link de pago' };
      _hojaCupos_().appendRow(CUPO_ENC_.map(function (n) { return an[n] === undefined ? '' : an[n]; })); };
    var r = _mpApi_('post', '/checkout/preferences', cuerpo);
    if (r.code !== 200 && r.code !== 201 || !r.json || !r.json.id || !r.json.init_point) { anular(); return { error: 'Mercado Pago no respondió. Probá de nuevo en unos minutos.', mpCodigo: r.code }; }
    // v040.1: init_point también en STAGING (Checkout Pro con la cuenta de PRUEBA del vendedor, según Mercado Pago). Qué cuenta es
    // la controla _mpCuentaVerificada_ antes de llegar acá; y un pago real igual nunca se acredita en STAGING (live_mode).
    var url = r.json.init_point;
    _hojaOrdenes_().appendRow(ORD_ENC_.map(function (n) { return ({ Orden_id: orden, Prefijo: prefijo, Plan: destino, Importe: precio.importe, Moneda: 'ARS', Creada: ahora, Vence: vence,
      Preference_id: String(r.json.id), Init_point: url, Entorno: modo, Solicitud_id: sid, Tipo_precio: precio.tipo })[n]; }));
    return { success: true, orden: orden, url: url, importe: precio.importe, tipoPrecio: precio.tipo, plan: destino, vence: vence.toISOString(), aviso: precio.aviso };
  });
}

// Procesa UN pago de Mercado Pago consultándolo en la API oficial. Nunca usa datos del navegador ni del webhook.
// Resultado.estado: ACREDITADO | YA_ACREDITADO | PENDIENTE | RECHAZADO | REVERTIDO | IMPORTE_DISTINTO | AJENO | DESCONOCIDO | ERROR
function _procesarPagoMP_(paymentId, origen) {
  if (!_mpEnLinea_()) return { estado: 'DESACTIVADO', error: 'Mercado Pago en línea desactivado: no se acredita nada automáticamente' };   // v040.2
  paymentId = String(paymentId || '').replace(/\D/g, '');
  if (!paymentId || paymentId.length > 20) return { estado: 'DESCONOCIDO', error: 'Identificador de pago inválido' };
  var r = _mpApi_('get', '/v1/payments/' + paymentId);
  if (r.code === 404) return { estado: 'DESCONOCIDO', error: 'Mercado Pago no reconoce ese pago' };
  if (r.code !== 200 || !r.json) return { estado: 'ERROR', error: r.error || ('Mercado Pago respondió ' + r.code), reintentar: true };
  var pg = r.json, cfg = _mpConfig_(), modo = _modoPagos_();
  var orden = String(pg.external_reference || '');
  var ord = /^VAO-ORD-[0-9a-f-]{36}$/.test(orden) ? _leerOrdenes_().filter(function (o) { return o.Orden_id === orden; })[0] : null;
  if (!ord) return { estado: 'AJENO', error: 'El pago no corresponde a una orden de VAO POS' };
  if (!cfg.collector) return { estado: 'ERROR', error: 'Falta MP_COLLECTOR_ID_VAO: no se acredita nada sin saber qué cuenta debe cobrar', reintentar: true };   // v040.1: obligatorio
  if (String(pg.collector_id || (pg.collector && pg.collector.id) || '') !== cfg.collector) return _alertaMP_(ord, pg, 'AJENO', 'El pago no fue cobrado por la cuenta de VAO');
  if (pg.live_mode !== true && pg.live_mode !== false) return _alertaMP_(ord, pg, 'AJENO', 'Mercado Pago no informó si el pago es de prueba o real: no se acredita');   // v040.1
  var esperadoVivo = modo === 'REAL';
  if (modo === 'BLOQUEADO' || ord.Entorno !== modo || (pg.live_mode === true) !== esperadoVivo) return _alertaMP_(ord, pg, 'AJENO', 'Pago de otro entorno (prueba/real) o pagos bloqueados');
  var llave = _llaveMP_(paymentId), st = String(pg.status || '');
  var base = { Llave: llave, Medio: 'MERCADO_PAGO', Entorno: modo, Prefijo: ord.Prefijo, Plan: ord.Plan, Importe: Number(pg.transaction_amount), Moneda: pg.currency_id || '',
               Fecha_pago: _fechaValida_(pg.date_approved || pg.date_created) || new Date(), Cuenta_receptora: 'MP', MP_payment_id: "'" + paymentId, MP_orden: orden, MP_estado: st + (pg.status_detail ? '/' + pg.status_detail : ''), Origen: origen || '' };
  if (st === 'refunded' || st === 'charged_back' || (st === 'approved' && Number(pg.transaction_amount_refunded) > 0)) {
    return _conLock_(function () {
      var cred = _pagoPorLlave_(llave);
      if (cred && cred.Tipo !== 'CREDITO') { var rc = _pagoPorLlave_('RES|' + llave); if (rc && rc.Tipo === 'CREDITO') cred = rc; }
      if (cred && cred.Tipo === 'SIN_ACREDITAR') {   // v040.1: se devolvió un pago retenido o sin acreditar → queda constancia y se cierra la incidencia
        var rv0 = _registrarFilaPagoSinCredito_(Object.assign({}, base, { Tipo: 'REVERSION', Pago_relacionado: cred.Pago_id, Motivo: (st === 'charged_back' ? 'CONTRACARGO' : 'REEMBOLSO') + ' de un pago NO acreditado' }));
        if (!rv0.yaRegistrado) _agregarAlertaMP_({ tipo: 'DEVUELTO_SIN_ACREDITAR', prefijo: ord.Prefijo, pagoId: cred.Pago_id, paymentId: paymentId, mensaje: 'El pago no acreditado fue devuelto en Mercado Pago: incidencia cerrada.' });
        return { estado: 'REVERTIDO', acreditado: false, yaRegistrado: !!rv0.yaRegistrado, mensaje: 'Pago devuelto; no se había acreditado.' };
      }
      if (!cred || cred.Tipo !== 'CREDITO') return { estado: 'REVERTIDO', acreditado: false, mensaje: 'Pago devuelto antes de acreditarse: no se activó nada.' };
      var rv = _registrarFilaPagoSinCredito_(Object.assign({}, base, { Tipo: 'REVERSION', Pago_relacionado: cred.Pago_id, Periodo_inicio: cred.Periodo_inicio, Periodo_fin: cred.Periodo_fin,
                 Motivo: st === 'charged_back' ? 'CONTRACARGO' : 'REEMBOLSO' }));
      if (!rv.yaRegistrado) _agregarAlertaMP_({ tipo: st === 'charged_back' ? 'CONTRACARGO' : 'REEMBOLSO', prefijo: ord.Prefijo, pagoId: cred.Pago_id, paymentId: paymentId,
                 hasta: _fmtDia_(cred.Periodo_fin), mensaje: 'Revisar: el período pagado sigue vigente hasta que Admin decida (suspender, cobrar de nuevo o dejarlo).' });
      return { estado: 'REVERTIDO', acreditado: true, pagoId: cred.Pago_id, yaRegistrado: !!rv.yaRegistrado };
    });
  }
  if (st === 'pending' || st === 'in_process' || st === 'authorized') return { estado: 'PENDIENTE', orden: orden };
  if (st !== 'approved') return { estado: 'RECHAZADO', orden: orden, detalle: st };
  if (pg.currency_id !== 'ARS' || Number(pg.transaction_amount) !== Number(ord.Importe))
    return _conLock_(function () { _registrarFilaPagoSinCredito_(Object.assign({}, base, { Tipo: 'SIN_ACREDITAR', Motivo: 'IMPORTE_DISTINTO: esperado ' + ord.Importe + ' ARS' }));
      _agregarAlertaMP_({ tipo: 'IMPORTE_DISTINTO', prefijo: ord.Prefijo, paymentId: paymentId, mensaje: 'Pagó ' + pg.transaction_amount + ' ' + pg.currency_id + ' y la orden era de ' + ord.Importe + ' ARS: no se acreditó.' });
      return { estado: 'IMPORTE_DISTINTO', orden: orden }; });
  return _conLock_(function () {
    var enc = _llavesEnCurso_();
    if (enc[llave]) return { estado: 'ERROR', error: 'Pago a medio registrar en ' + enc[llave] + ' (se completa en la próxima conciliación)', pagoEnCurso: true, reintentar: true };
    var ya = _pagoPorLlave_(llave);
    if (ya && ya.Tipo !== 'CREDITO') { var rs = _pagoPorLlave_('RES|' + llave); if (rs && rs.Tipo === 'CREDITO') ya = rs; }   // retenido y luego aplicado por Admin
    if (ya && ya.Tipo === 'SIN_ACREDITAR' && /^RETENIDO_/.test(String(ya.Motivo))) {
      var rsd = _pagoPorLlave_('RES|' + llave);
      return { estado: 'RETENIDO', pagoId: ya.Pago_id, orden: orden, resolucion: rsd ? String(rsd.Motivo) : '',
               motivoCliente: /SIN_CUPO/.test(String(ya.Motivo)) ? 'ya no quedaban lugares de la oferta de lanzamiento cuando se aprobó el pago'
                 : /SIN_DERECHO_OFERTA/.test(String(ya.Motivo)) ? 'el precio de lanzamiento ya no correspondía a tu cuenta cuando se aprobó el pago' : 'el importe pagado no coincide con el precio vigente del plan' };
    }
    if (ya) return { estado: ya.Tipo === 'CREDITO' ? 'YA_ACREDITADO' : 'SIN_ACREDITAR', pagoId: ya.Pago_id, orden: orden, fin: _fmtDia_(ya.Periodo_fin) };
    var otroDeLaOrden = _leerPagos_().filter(function (p) { return p.MP_orden === orden && p.Tipo === 'CREDITO'; })[0];
    if (otroDeLaOrden) { _registrarFilaPagoSinCredito_(Object.assign({}, base, { Tipo: 'SIN_ACREDITAR', Motivo: 'SEGUNDO_PAGO_DE_LA_ORDEN: ya acreditada por ' + otroDeLaOrden.Pago_id }));
      _agregarAlertaMP_({ tipo: 'PAGO_DOBLE', prefijo: ord.Prefijo, paymentId: paymentId, mensaje: 'Segundo pago aprobado de la misma orden: no se acreditó otro período. Evaluar devolución.' });
      return { estado: 'SIN_ACREDITAR', orden: orden, motivo: 'segundo pago de la misma orden' }; }
    var falta = _faltaContratoParaPagar_(ord.Prefijo, modo);
    if (falta) { _agregarAlertaMP_({ tipo: 'SIN_CONTRATO', prefijo: ord.Prefijo, paymentId: paymentId, mensaje: falta }); return { estado: 'ERROR', error: falta }; }
    var res = _acreditarPagoSinLock_({ llave: llave, medio: 'MERCADO_PAGO', entorno: modo, prefijo: ord.Prefijo, plan: ord.Plan, importe: Number(pg.transaction_amount), moneda: 'ARS',
      fechaPago: _diaSolo_(base.Fecha_pago), cuenta: 'MP', referencia: '', mpPaymentId: paymentId, mpOrden: orden, mpEstado: base.MP_estado,
      operador: '', origen: origen || 'MP', tipoPeriodo: modo === 'REAL' ? 'PAGO' : 'PAGO_SIMULADO', tipoPrecioOrden: String(ord.Tipo_precio || '') });
    if (res.retenido) return { estado: 'RETENIDO', pagoId: res.pagoId, orden: orden, motivoCliente: res.motivoCliente };
    if (res.registrado) return { estado: 'ACREDITADO', pagoId: res.pagoId, orden: orden, inicio: res.inicio, fin: res.fin };
    if (res.yaRegistrado) return { estado: 'YA_ACREDITADO', pagoId: res.pagoId, orden: orden, fin: res.fin };
    _agregarAlertaMP_({ tipo: 'NO_SE_PUDO_ACREDITAR', prefijo: ord.Prefijo, paymentId: paymentId, mensaje: res.error || 'error' });
    return { estado: 'ERROR', error: res.error, pagoEnCurso: !!res.pagoEnCurso };
  });
}
function _alertaMP_(ord, pg, estado, msj) { _agregarAlertaMP_({ tipo: estado, prefijo: ord.Prefijo, paymentId: String(pg.id || ''), mensaje: msj }); return { estado: estado, error: msj }; }
function _agregarAlertaMP_(a) {
  var pr = PropertiesService.getScriptProperties(), l = [];
  try { l = JSON.parse(pr.getProperty('MP_ALERTAS_VAO') || '[]'); } catch (e) { l = []; }
  var clave = a.tipo + '|' + a.paymentId;
  if (l.some(function (x) { return x.tipo + '|' + x.paymentId === clave; })) return;
  a.fecha = new Date().toISOString(); l.push(a);
  pr.setProperty('MP_ALERTAS_VAO', JSON.stringify(l.slice(-50)));
}

// POS: "Ya pagué" / vuelta de Mercado Pago. Busca los pagos de la orden en la API y los procesa. data: { token, orden }
function mpVerificarOrden(prefijo, data) {
  data = data || {};
  var err = _requiereSesionLectura_(prefijo, data.token || ''); if (err) return { error: err };
  var orden = String(data.orden || '');
  var ord = /^VAO-ORD-[0-9a-f-]{36}$/.test(orden) ? _leerOrdenes_().filter(function (o) { return o.Orden_id === orden; })[0] : null;
  if (!ord || ord.Prefijo !== prefijo) return { error: 'Orden no encontrada' };
  if (!_mpEnLinea_()) return { success: true, estado: 'NO_ACREDITADO', mpApagado: true, mensaje: MSJ_MP_APAGADO_ + ' Si ya pagaste, avisá a VAO Sistemas: VAO lo verifica y lo confirma.' };   // v040.2
  var r = _mpApi_('get', '/v1/payments/search?external_reference=' + encodeURIComponent(orden) + '&sort=date_created&criteria=desc&limit=20');
  if (r.code !== 200 || !r.json) return { success: true, estado: 'SIN_RESPUESTA', mensaje: 'No pudimos consultar Mercado Pago. Si ya pagaste, se acreditará solo en unos minutos.' };
  var res = (r.json.results || []).map(function (p) { return _procesarPagoMP_(p.id, 'POS'); });
  var ok = res.filter(function (x) { return x.estado === 'ACREDITADO' || x.estado === 'YA_ACREDITADO'; })[0];
  if (ok) return { success: true, estado: 'ACREDITADO', fin: ok.fin, mensaje: '✅ Pago acreditado. Tu plan está activo hasta el ' + (ok.fin || '') + '.' };
  var ret = res.filter(function (x) { return x.estado === 'RETENIDO'; })[0];   // v040.1: explicación clara del dinero recibido
  if (ret) return { success: true, estado: 'NO_ACREDITADO', retenido: true,
    mensaje: 'Recibimos tu pago, pero no se pudo aplicar automáticamente: ' + ret.motivoCliente + '. Tu pago quedó registrado y no se perdió. No vuelvas a pagar: te enviamos un correo y VAO Sistemas te va a contactar para aplicarlo o devolverte el dinero.' };
  if (res.some(function (x) { return x.estado === 'PENDIENTE'; })) return { success: true, estado: 'PENDIENTE', mensaje: 'Mercado Pago todavía está procesando el pago.' };
  if (!res.length) return { success: true, estado: 'SIN_PAGO', mensaje: 'Todavía no hay un pago para esta orden.' };
  return { success: true, estado: 'NO_ACREDITADO', mensaje: 'El pago no se aprobó o no se pudo acreditar. Si te debitaron, avisá a VAO Sistemas.' };
}

// Webhook (vía la función de Vercel). data: { relay, tipo, id }. Responde rápido; la verdad es la consulta a la API.
function mpNotificacion(data) {
  data = data || {};
  var cfg = _mpConfig_();
  if (!cfg.relay || String(data.relay || '') !== cfg.relay) return { error: 'No autorizado' };
  if (!_mpEnLinea_()) return { success: true, ignorado: true, motivo: 'Mercado Pago en línea desactivado (no se acredita nada automáticamente)' };   // v040.2
  var tipo = String(data.tipo || '');
  if (tipo !== 'payment') return { success: true, ignorado: true, motivo: 'tipo ' + tipo + ' (la conciliación revisa reembolsos y contracargos)' };
  var r = _procesarPagoMP_(data.id, 'WEBHOOK');
  return { success: r.estado !== 'ERROR', estado: r.estado, reintentar: !!r.reintentar };
}

// Conciliación: recupera notificaciones perdidas y detecta reembolsos/contracargos. Disparador cada 15 min o botón de Admin.
function conciliarPagosMP() {
  if (!_mpEnLinea_()) return { success: true, omitido: true, motivo: 'Mercado Pago en línea desactivado' };   // v040.2
  var c = _mpConfig_(); if (!c.token || _modoPagos_() === 'BLOQUEADO') return { success: true, omitido: true };
  var desde = new Date().getTime() - MP_CONCILIAR_DIAS_ * 86400000, out = { ordenes: 0, acreditados: 0, revertidos: 0, errores: 0, completados: _completarPagosMPPendientes_() };
  var acreditadas = {}; _leerPagos_().forEach(function (p) { if (p.Tipo === 'CREDITO' && p.MP_orden) acreditadas[p.MP_orden] = p; });
  _leerOrdenes_().forEach(function (o) {
    if (new Date(o.Creada).getTime() < desde || acreditadas[o.Orden_id]) return;
    out.ordenes++;
    var r = _mpApi_('get', '/v1/payments/search?external_reference=' + encodeURIComponent(o.Orden_id) + '&limit=20');
    if (r.code !== 200 || !r.json) { out.errores++; return; }
    (r.json.results || []).forEach(function (p) { var x = _procesarPagoMP_(p.id, 'CONCILIACION'); if (x.estado === 'ACREDITADO') out.acreditados++; if (x.estado === 'ERROR') out.errores++; });
  });
  var limite = new Date().getTime() - MP_REVISAR_REVERSION_DIAS_ * 86400000;
  Object.keys(acreditadas).forEach(function (k) {
    var p = acreditadas[k]; if (new Date(p.Fecha_registro).getTime() < limite) return;
    var x = _procesarPagoMP_(String(p.MP_payment_id).replace(/^'/, ''), 'CONCILIACION'); if (x.estado === 'REVERTIDO' && !x.yaRegistrado) out.revertidos++;
  });
  return Object.assign({ success: true }, out);
}
function mpConciliarAdmin(data) {
  if (!validarSesionAdmin((data || {}).token || '')) return { error: 'Sesión admin inválida o expirada' };
  return conciliarPagosMP();
}
// Ejecutar a mano desde el editor (una sola vez) para la conciliación automática cada 15 minutos.
function instalarConciliacionMP() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'conciliarPagosMP') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('conciliarPagosMP').timeBased().everyMinutes(15).create();
  Logger.log('Conciliación de Mercado Pago instalada (cada 15 minutos).');
}
function quitarConciliacionMP() {
  var n = 0; ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'conciliarPagosMP') { ScriptApp.deleteTrigger(t); n++; } });
  Logger.log('Disparadores quitados: ' + n);
}

// v040: completa la fila de PAGOS_VAO de un pago a medio registrar (la llama recuperarPagoEnCurso bajo candado).
// La huella se recalcula con la última fila ACTUAL (otro comercio pudo registrar pagos en el medio).
var FECHAS_PAGO_ = ['Fecha_pago', 'Periodo_inicio', 'Periodo_fin', 'Fecha_registro'];
function _completarFilaPagoPendiente_(reg) {
  if (!reg || !reg.pago || !reg.llave) return false;
  _completarCupoPendiente_(reg);   // E2b (puede faltar aunque la fila de PAGOS_VAO ya esté)
  var todos = _leerPagos_();
  if (todos.some(function (r) { return r.Pago_id === reg.pago.Pago_id || (r.Llave === reg.llave && r.Tipo === 'CREDITO'); })) return false;
  var o = Object.assign({}, reg.pago); FECHAS_PAGO_.forEach(function (n) { o[n] = _fechaValida_(o[n]) || o[n]; });
  _hojaPagos_().appendRow(_armarFilaPago_(o, todos));
  return true;
}

// v040: la conciliación completa sola un pago de MERCADO PAGO que quedó a medio registrar hace más de 10 minutos
// (mismos pasos que recuperarPagoEnCurso; los de transferencias los completa el admin con el botón de siempre).
function _completarPagoEnCursoSinLock_(prefijo) {
  var r2 = _pagoPendiente_(prefijo);
  if (!r2 || r2.ilegible || r2.v !== 40) return false;
  if (_cambioPlanPendiente_(prefijo)) return false;
  _completarFilaPagoPendiente_(r2);
  if (!_leerPeriodosCrudo_().some(function (r) { return String(r.Clave) === String(r2.clave); })) {
    var fila = r2.fila.slice(); fila[PC_.Inicio] = _fechaValida_(fila[PC_.Inicio]); fila[PC_.Fin] = _fechaValida_(fila[PC_.Fin]);
    fila[PC_.Fecha_pago] = _fechaValida_(fila[PC_.Fecha_pago]); fila[PC_.Fecha_registro] = _fechaValida_(fila[PC_.Fecha_registro]);
    _hojaPeriodos_().appendRow(fila);
  }
  var pa = _planDeNegocio_(prefijo);
  if (pa !== r2.destino) { var p = _planificarModulos_(prefijo, r2.destino); if (p.error) return false; _ejecutarCambioPlanInterno_(prefijo, r2.destino, pa, p); }
  _escribirVence_(prefijo, new Date(r2.fin));
  PropertiesService.getScriptProperties().deleteProperty(_claveCambioPago_(prefijo));
  return true;
}
function _completarPagosMPPendientes_() {
  var props = PropertiesService.getScriptProperties().getProperties(), n = 0, limite = new Date().getTime() - 10 * 60000;
  Object.keys(props).forEach(function (k) {
    if (k.indexOf('PAGO_EN_CURSO_') !== 0) return;
    var r; try { r = JSON.parse(props[k]); } catch (e) { return; }
    if (!r || r.v !== 40 || String(r.llave || '').indexOf('MP|') !== 0 || !(r.ts < limite)) return;
    var res = _conLock_(function () { return _completarPagoEnCursoSinLock_(k.substring('PAGO_EN_CURSO_'.length)); });
    if (res === true) n++;
  });
  return n;
}

// v040: resumen de PAGOS_VAO de un comercio para la ficha de Admin (últimos 30) + alertas de Mercado Pago.
function _pagosVaoDe_(prefijo) {
  var f = function (d) { return d ? _fmtDia_(d) : ''; }, alertas = [];
  try { alertas = JSON.parse(PropertiesService.getScriptProperties().getProperty('MP_ALERTAS_VAO') || '[]'); } catch (e) { alertas = []; }
  var todosP = _leerPagos_(), estC = _estadoCobros_(todosP);   // v040.2
  return { pagos: todosP.filter(function (r) { return r.Prefijo === prefijo; }).slice(-30).reverse().map(function (r) {
             var c402 = r.Tipo === 'CREDITO' ? _resumenCobro402_(r, estC) : null;
             var ret = r.Tipo === 'SIN_ACREDITAR' && /^RETENIDO_/.test(String(r.Motivo)), rsl = ret ? _pagoPorLlave_('RES|' + r.Llave, todosP) : null;
             return { pagoId: r.Pago_id, retenido: ret, resolucion: rsl ? (rsl.Tipo === 'CREDITO' ? 'OFERTA APLICADA' : String(rsl.Motivo)) : '',
                      tipo: r.Tipo, medio: r.Medio, entorno: r.Entorno, importe: r.Importe, fechaPago: f(r.Fecha_pago), cuenta: r.Cuenta_receptora,
                      referencia: String(r.Referencia || '').replace(/^'/, ''), mp: String(r.MP_payment_id || '').replace(/^'/, ''), mpEstado: r.MP_estado,
                      inicio: f(r.Periodo_inicio), fin: f(r.Periodo_fin), operador: r.Operador, motivo: r.Motivo,
                      relacionado: r.Pago_id && r.Pago_relacionado ? String(r.Pago_relacionado) : '', cobro: c402 }; }),
           mpEnLinea: _mpEnLinea_(),
           alertas: alertas.filter(function (a) { return a.prefijo === prefijo; }), oferta: _ofertaDe_(prefijo) };
}
function _ofertaDe_(prefijo) {
  var promo = _leerPromo_(); if (!promo) return null;
  var est = _estadoCupos_(promo), mio = est.conf[prefijo];
  return { estado: promo.estado, total: est.total, confirmados: est.confirmados, reservados: est.reservados, disponibles: est.disponibles,
           comercio: mio ? { desde: _fmtDia_(mio.Fecha), finBeneficio: _fmtDia_(mio.Fin_beneficio), plan: mio.Plan } : null };
}

// =====================================================================
// v040 — OFERTA DE LANZAMIENTO: CUPOS (CUPOS_PROMO_VAO, solo se agregan filas)
// =====================================================================
// Reglas técnicas (las comerciales quedan configurables y PENDIENTES de aprobación, ver informe):
//  · Nunca más cupos confirmados que Cupo_total (PROMOCIONES_VAO). Todo se decide BAJO EL CANDADO.
//  · Un cupo se CONFIRMA con el primer pago acreditado a precio de lanzamiento (decisión 6.1 recomendada: el pago).
//  · Mercado Pago: al crear la orden a precio de lanzamiento se RESERVA el lugar hasta que vence la orden (+15 min).
//    Una reserva vencida libera el lugar sola (no hace falta escribir nada).
//  · Una vez por comercio y por identidad (huellas de teléfono y correo; sin el dato en claro).
//  · Beneficio: desde el inicio del primer período pago con oferta, durante Meses_beneficio. Las renovaciones
//    cuyo período EMPIEZA antes del fin del beneficio pagan precio de lanzamiento (del plan que paguen).
//  · Cancelar, vencer o suspender NO devuelve el cupo (decisión 6.2 recomendada: cupo usado).
var CUPO_ENC_ = ['Registro_id', 'Promo_id', 'Prefijo', 'Plan', 'Evento', 'Fecha', 'Vence_reserva', 'Claves_identidad', 'Orden', 'Pago_id', 'Fin_beneficio', 'Admin', 'Motivo'];
var CUPO_RESERVA_EXTRA_MIN_ = 15;
function _hojaCupos_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), h = ss.getSheetByName('CUPOS_PROMO_VAO');
  if (!h) h = ss.insertSheet('CUPOS_PROMO_VAO');
  if (h.getLastRow() === 0) h.getRange(1, 1, 1, CUPO_ENC_.length).setValues([CUPO_ENC_]);
  return h;
}
function _leerCupos_() {
  var h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CUPOS_PROMO_VAO');
  if (!h || h.getLastRow() < 2) return [];
  var d = h.getDataRange().getValues(), enc = d[0].map(String);
  return d.slice(1).map(function (r) { var o = {}; enc.forEach(function (n, k) { o[n] = r[k]; }); o.Prefijo = String(o.Prefijo || ''); return o; });
}
function _clavesIdentidad_(prefijo) {
  var fc = _filaClientesVao_(prefijo), tel = '', mail = '';
  if (fc) { tel = String(fc.datos[3] || '').replace(/\D/g, '').slice(-8); mail = String(fc.datos[4] || '').trim().toLowerCase(); }
  var k = [];
  if (tel.length >= 6) k.push('T:' + _sha256Hex_('VAO-T|' + tel).substring(0, 16));
  if (mail.indexOf('@') > 0) k.push('C:' + _sha256Hex_('VAO-C|' + mail).substring(0, 16));
  return k;
}
// Estado de la oferta. excluirOrden: la reserva de ESA orden no se descuenta (es del propio comercio).
function _estadoCupos_(promo, cupos, excluirPrefijo) {
  cupos = cupos || _leerCupos_();
  var ahora = new Date().getTime(), conf = {}, res = {}, liberado = {};
  // un pago a medio registrar que toma cupo ya cuenta (si no, otro podría llevarse ese lugar antes de completarlo)
  var props = PropertiesService.getScriptProperties().getProperties();
  Object.keys(props).forEach(function (k) { if (k.indexOf('PAGO_EN_CURSO_') !== 0) return;
    try { var m = JSON.parse(props[k]); if (m && m.cupo && String(m.cupo.Promo_id) === promo.id) cupos = cupos.concat([m.cupo]); } catch (e) {} });
  var anuladas = {};
  cupos.forEach(function (c) {
    if (String(c.Promo_id) !== promo.id) return;
    if (c.Evento === 'RESERVA_ANULADA' && c.Orden) anuladas[String(c.Orden)] = true;
    if (c.Evento === 'CONFIRMACION') conf[c.Prefijo] = c;
    if (c.Evento === 'LIBERACION') liberado[c.Prefijo] = true;
  });
  Object.keys(liberado).forEach(function (p) { delete conf[p]; });
  cupos.forEach(function (c) {
    if (String(c.Promo_id) !== promo.id || c.Evento !== 'RESERVA' || conf[c.Prefijo] || anuladas[String(c.Orden)]) return;
    if (excluirPrefijo && c.Prefijo === excluirPrefijo) return;
    var v = _fechaValida_(c.Vence_reserva); if (v && v.getTime() > ahora) res[c.Prefijo] = c;   // una reserva por comercio
  });
  var nConf = Object.keys(conf).length, nRes = Object.keys(res).length;
  return { total: promo.cupoTotal, confirmados: nConf, reservados: nRes, disponibles: Math.max(0, promo.cupoTotal - nConf - nRes), conf: conf, res: res };
}
function _cuposDisponibles_(promo) { return promo ? _estadoCupos_(promo).disponibles : 0; }
// ¿Qué precio corresponde a ESTE comercio para un período que empieza en 'inicio'?
// { tipo: 'LANZAMIENTO'|'REGULAR', nuevo: bool (tomaría un cupo), finBeneficio, motivo, promoId }
function _beneficioPromo_(prefijo, codPlan, plan, inicio) {
  var promo = _leerPromo_(), reg = function (m) { return { tipo: 'REGULAR', nuevo: false, motivo: m }; };
  if (!promo) return reg('sin oferta');
  if (!plan || plan.precioLanzamiento === null || plan.precioLanzamiento === undefined || !(Number(plan.precioLanzamiento) > 0) || promo.planes.indexOf(codPlan) === -1) return reg('el plan no tiene precio de lanzamiento');
  var cupos = _leerCupos_(), est = _estadoCupos_(promo, cupos, prefijo), mio = est.conf[prefijo];
  if (mio) {
    var fin = _fechaValida_(mio.Fin_beneficio);
    if (fin && _diaSolo_(inicio).getTime() < _diaSolo_(fin).getTime()) return { tipo: 'LANZAMIENTO', nuevo: false, finBeneficio: fin, motivo: 'beneficio vigente', promoId: promo.id };
    return reg('beneficio terminado');
  }
  if (promo.estado !== 'ACTIVA') return reg('oferta ' + promo.estado.toLowerCase());
  var mias = _clavesIdentidad_(prefijo);
  var usada = Object.keys(est.conf).some(function (p) { return String(est.conf[p].Claves_identidad || '').split(',').some(function (k) { return k && mias.indexOf(k) !== -1; }); });
  if (usada) return reg('este comercio (teléfono o correo) ya usó la oferta');
  if (est.disponibles <= 0) return reg('no quedan cupos');
  var finN = _aniversario_(_diaSolo_(inicio).getFullYear(), _diaSolo_(inicio).getMonth() + promo.meses, _diaSolo_(inicio).getDate());
  return { tipo: 'LANZAMIENTO', nuevo: true, finBeneficio: finN, motivo: 'cupo disponible (' + est.disponibles + ' de ' + est.total + ')', promoId: promo.id, claves: mias };
}
function estadoCuposPromo(data) {
  if (!validarSesionAdmin((data || {}).token || '')) return { error: 'Sesión admin inválida o expirada' };
  var promo = _leerPromo_(); if (!promo) return { success: true, sinOferta: true };
  var est = _estadoCupos_(promo);
  return { success: true, promoId: promo.id, estado: promo.estado, total: est.total, confirmados: est.confirmados, reservados: est.reservados, disponibles: est.disponibles,
    comercios: Object.keys(est.conf).map(function (p) { return { prefijo: p, plan: est.conf[p].Plan, desde: _fmtDia_(est.conf[p].Fecha), finBeneficio: _fmtDia_(est.conf[p].Fin_beneficio) }; }) };
}

function _completarCupoPendiente_(reg) {
  if (!reg || !reg.cupo) return false;
  if (_leerCupos_().some(function (c) { return c.Evento === 'CONFIRMACION' && String(c.Pago_id) === String(reg.cupo.Pago_id); })) return false;
  var c = Object.assign({}, reg.cupo); ['Fecha', 'Fin_beneficio'].forEach(function (n) { c[n] = _fechaValida_(c[n]) || c[n]; });
  _hojaCupos_().appendRow(CUPO_ENC_.map(function (n) { return c[n] === undefined ? '' : c[n]; }));
  return true;
}

// v040: ¿se puede crear/publicar un contrato COMERCIAL acá? Nunca en STAGING. Fuera de STAGING, solo si VAO cargó a mano
// CONTRATO_COMERCIAL_HABILITADO=SI y CONTRATO_REVISION_JURIDICA (quién revisó y cuándo). El sistema NO valida el contenido legal.
function _comercialHabilitado_() {
  if (_esPlanillaStaging_()) return { ok: false, motivo: 'En STAGING no existen contratos COMERCIALES (solo de PRUEBA, sin valor legal).' };
  var pr = PropertiesService.getScriptProperties();
  if (pr.getProperty('CONTRATO_COMERCIAL_HABILITADO') !== 'SI') return { ok: false, motivo: 'El contrato COMERCIAL todavía no está habilitado en este entorno.' };
  var rev = String(pr.getProperty('CONTRATO_REVISION_JURIDICA') || '').trim();
  if (rev.length < 5) return { ok: false, motivo: 'Falta registrar la revisión jurídica del texto (CONTRATO_REVISION_JURIDICA).' };
  return { ok: true, revision: rev.substring(0, 120) };
}
// v040: una constancia habilita pagos REALES solo si es COMERCIAL y es la aceptación vigente de ese comercio.
function _validaParaPagosAce_(r) {
  if (!r || r.Ambito !== 'COMERCIAL') return false;
  var a = _aceptacionVigente_(r.Prefijo);
  return !!(a.valida && a.aceptacionId === r.Aceptacion_id);
}

// v040.1 — Admin resuelve un pago RETENIDO (Mercado Pago aprobado pero sin acreditar). Dos caminos, ninguno inventa beneficios:
//   APLICAR_OFERTA: solo si AHORA hay un lugar de la oferta para este comercio (se vuelve a comprobar bajo el candado, con el
//                   tope de cupos) y Mercado Pago confirma que el pago sigue aprobado y sin devolución. Acredita UNA vez (llave RES|MP|id).
//   A_DEVOLVER:     deja constancia (fila RESOLUCION, sin crédito). La devolución del dinero la hace VAO desde Mercado Pago;
//                   la conciliación registra después la REVERSION sola.
// Las dos son excluyentes (misma llave RES|…) y quedan con operador, fecha y nota. data: { token, pagoId, accion, operador, nota?, confirmar?, firma? }
function mpResolverRetenido(data) {
  data = data || {};
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  var modo = _modoPagos_(); if (modo === 'BLOQUEADO') return { error: MSJ_PAGOS_BLOQUEADOS_, bloqueado: true };
  var accion = String(data.accion || '');
  if (accion !== 'APLICAR_OFERTA' && accion !== 'A_DEVOLVER') return { error: 'Acción inválida' };
  var pagoId = String(data.pagoId || '');
  var buscar = function () { return _leerPagos_().filter(function (x) { return x.Pago_id === pagoId && x.Tipo === 'SIN_ACREDITAR' && /^RETENIDO_/.test(String(x.Motivo)); })[0] || null; };
  var row = buscar(); if (!row) return { error: 'No se encontró ese pago retenido.' };
  if (row.Entorno !== modo) return { error: 'Ese pago es de otro entorno (' + row.Entorno + '): no se resuelve acá.' };
  var llaveRes = 'RES|' + row.Llave;
  var resuelto = function (y) { return { success: true, yaResuelto: true, pagoId: y.Pago_id, mensaje: 'Ese pago ya estaba resuelto (' + (y.Tipo === 'CREDITO' ? 'oferta aplicada' : String(y.Motivo)) + '). No se hizo nada más.' }; };
  var ya0 = _pagoPorLlave_(llaveRes); if (ya0) return resuelto(ya0);
  var operador = String(data.operador || '').replace(/[\u0000-\u001F]/g, ' ').trim().substring(0, 40);
  if (operador.length < 2) return { error: 'Indicá quién resuelve (operador).', campo: 'operador' };
  var nota = String(data.nota || '').replace(/[\u0000-\u001F]/g, ' ').trim().substring(0, 120);
  var mpId = String(row.MP_payment_id || '').replace(/\D/g, '');
  var r = _mpApi_('get', '/v1/payments/' + mpId);   // estado REAL en Mercado Pago, nunca el de la planilla
  if (r.code !== 200 || !r.json) return { error: 'No se pudo consultar Mercado Pago. Probá de nuevo en unos minutos.' };
  var st = String(r.json.status || ''), devuelto = st === 'refunded' || st === 'charged_back' || Number(r.json.transaction_amount_refunded) > 0;
  if (accion === 'APLICAR_OFERTA') {
    if (st !== 'approved' || devuelto) return { error: 'Mercado Pago informa el pago como "' + st + '"' + (devuelto ? ' con devolución' : '') + ': no se puede aplicar.' };
    var falta = _faltaContratoParaPagar_(row.Prefijo, modo); if (falta) return { error: falta, sinContrato: true };
  }
  var promo = _leerPromo_(), est = promo ? _estadoCupos_(promo) : null;
  var pl = _leerPlanes_(), plan = pl.planes[row.Plan];
  var ben = plan ? _beneficioPromo_(row.Prefijo, row.Plan, plan, _proximoPeriodoPago_(row.Prefijo, _planDeNegocio_(row.Prefijo), _leerPeriodos_()).inicio) : { tipo: 'REGULAR', motivo: 'plan inexistente' };
  var firma = _firma_(['res401', pagoId, accion, operador, nota, accion === 'APLICAR_OFERTA' ? ben.tipo : '']);
  if (data.confirmar !== true) {
    if (accion === 'APLICAR_OFERTA' && ben.tipo !== 'LANZAMIENTO')
      return { error: 'No se puede aplicar la oferta: ' + ben.motivo + (est ? ' (' + est.confirmados + ' de ' + est.total + ' cupos confirmados, ' + est.disponibles + ' libres)' : '') + '. La alternativa es devolver el pago.', sinCupo: true };
    return { success: true, vistaPrevia: true, firma: firma, accion: accion, prefijo: row.Prefijo, importe: Number(row.Importe), mp: mpId, estadoMP: st,
      detalle: accion === 'APLICAR_OFERTA'
        ? 'Se acredita el período del plan ' + row.Plan + ' a precio de lanzamiento y se ocupa 1 lugar de la oferta (' + (est ? est.disponibles : 0) + ' libre(s) ahora).'
        : 'Se deja constancia de que este pago se DEVUELVE. No cambia la vigencia. Después hacé la devolución en tu cuenta de Mercado Pago (operación ' + mpId + ').' };
  }
  if (String(data.firma || '') !== firma) return { error: 'Algo cambió desde la vista previa: volvé a revisarla.', firmaVieja: true };
  return _conLock_(function () {
    var row2 = buscar(); if (!row2) return { error: 'No se encontró ese pago retenido.' };
    var ya = _pagoPorLlave_(llaveRes); if (ya) return resuelto(ya);
    if (accion === 'A_DEVOLVER') {
      var rr = _registrarFilaPagoSinCredito_({ Llave: llaveRes, Tipo: 'RESOLUCION', Medio: row2.Medio, Entorno: row2.Entorno, Prefijo: row2.Prefijo, Plan: row2.Plan,
        Importe: Number(row2.Importe), Moneda: row2.Moneda, Fecha_pago: row2.Fecha_pago, Cuenta_receptora: 'MP', MP_payment_id: row2.MP_payment_id, MP_orden: row2.MP_orden,
        MP_estado: st, Operador: operador, Origen: 'ADMIN_RESOLUCION', Pago_relacionado: row2.Pago_id, Motivo: 'A_DEVOLVER' + (nota ? ': ' + nota : '') });
      return { success: true, resuelto: true, accion: accion, pagoId: rr.pagoId,
               mensaje: 'Quedó registrado para DEVOLVER. Hacé la devolución desde tu cuenta de Mercado Pago (operación ' + mpId + '); la conciliación la registra sola.' };
    }
    var res = _acreditarPagoSinLock_({ llave: llaveRes, medio: 'MERCADO_PAGO', entorno: row2.Entorno, prefijo: row2.Prefijo, plan: row2.Plan, importe: Number(row2.Importe), moneda: 'ARS',
      fechaPago: _diaSolo_(_fechaValida_(row2.Fecha_pago) || new Date()), cuenta: 'MP', referencia: '', mpPaymentId: mpId, mpOrden: row2.MP_orden, mpEstado: st,
      operador: operador, origen: 'ADMIN_RESOLUCION', tipoPeriodo: row2.Entorno === 'REAL' ? 'PAGO' : 'PAGO_SIMULADO', exigirOferta: true, pagoRelacionado: row2.Pago_id });
    if (res.registrado) return { success: true, resuelto: true, accion: accion, pagoId: res.pagoId, fin: res.fin, mensaje: '✅ Oferta aplicada: plan activo hasta el ' + res.fin + '.' };
    return res;
  });
}

// =====================================================================
// v040.2 — MODO MANUAL: Mercado Pago en línea apagado por defecto, reporte de cobros, correcciones y anulaciones
// =====================================================================
// Reglas:
//  · Mercado Pago en línea (link de pago, webhook, conciliación, verificación desde el POS) solo funciona con la propiedad
//    MP_EN_LINEA_HABILITADO=SI. Sin ella NO se crea ningún link y NADA se acredita solo: todo cobro lo confirma Admin.
//  · PAGOS_VAO sigue siendo de solo agregar filas (cadena de huellas). Nunca se edita ni se borra un cobro:
//      CORRECCION → fila nueva vinculada (Pago_relacionado) con el importe y/o la fecha de pago correctos. No toca la vigencia.
//      ANULACION  → fila nueva vinculada. El cobro deja de contar en los totales. Una sola por cobro (llave ANU|<Pago_id>).
//        · RESUELTA: se pudo DEMOSTRAR que el período del cobro es el último y que hay un período anterior encadenado del mismo
//          plan → se quita ese período (fila ANULACION en PERIODOS_VAO) y el vencimiento vuelve al anterior. La llave se libera
//          (la misma transferencia se puede registrar de nuevo, por ejemplo en el comercio correcto).
//        · REQUIERE_REVISION: si no se puede demostrar, la vigencia NO cambia y la llave sigue bloqueada hasta que Admin confirme
//          la resolución (resolverAnulacionVao). Esa confirmación solo libera la llave para registrarla en OTRO comercio.
//  · Reporte: fuente única PAGOS_VAO (CREDITO no anulados, con su última corrección). PERIODOS_VAO no se suma (evita doble conteo);
//    los cobros anteriores a v040 (solo en PERIODOS_VAO) se listan aparte, sin sumar. Totales por moneda; REAL y SIMULADO nunca se mezclan.
var MSJ_MP_APAGADO_ = 'El pago en línea con Mercado Pago no está habilitado.';
function _mpEnLinea_() { return PropertiesService.getScriptProperties().getProperty('MP_EN_LINEA_HABILITADO') === 'SI'; }

// Estado de cada cobro: correcciones (en orden) y anulación con su resolución.
function _estadoCobros_(todos) {
  var corr = {}, anul = {}, revis = {};
  (todos || _leerPagos_()).forEach(function (r) {
    var rel = String(r.Pago_relacionado || '');
    if (r.Tipo === 'CORRECCION' && rel) (corr[rel] = corr[rel] || []).push(r);
    if (r.Tipo === 'ANULACION' && rel && !anul[rel]) anul[rel] = r;
    if (r.Tipo === 'RESOLUCION' && rel && /^ANURES\|/.test(String(r.Llave))) revis[rel] = r;
  });
  Object.keys(anul).forEach(function (k) {
    var a = anul[k], m = String(a.Motivo || '');
    anul[k] = { fila: a, estado: /^RESUELTA/.test(m) ? 'RESUELTA' : (revis[k] ? 'REVISADA' : 'REQUIERE_REVISION'), revision: revis[k] || null };
  });
  return { corr: corr, anul: anul };
}
// Valores vigentes de un cobro (original + última corrección).
function _valoresCobro_(r, est) {
  var c = (est.corr[r.Pago_id] || []), u = c.length ? c[c.length - 1] : null;
  return { importe: Number(u ? u.Importe : r.Importe), moneda: String((u ? u.Moneda : r.Moneda) || 'ARS'), fechaPago: _fechaValida_(u ? u.Fecha_pago : r.Fecha_pago),
           correcciones: c.length, ultimaCorreccion: u ? u.Pago_id : '' };
}
function _resumenCobro402_(r, est) {
  var v = _valoresCobro_(r, est), a = est.anul[r.Pago_id];
  return { importe: v.importe, moneda: v.moneda, fechaPago: v.fechaPago ? _fmtDia_(v.fechaPago) : '', correcciones: v.correcciones,
           anulacion: a ? { estado: a.estado, motivo: String(a.fila.Motivo || ''), fecha: _fmtDia_(a.fila.Fecha_registro), operador: a.fila.Operador,
                            completar: a.estado === 'RESUELTA' && _anulacionIncompleta_(r) } : null,
           puedeCorregir: !a, puedeAnular: !a, puedeResolver: !!a && a.estado === 'REQUIERE_REVISION' };
}
// ¿Bloquea la llave? Devuelve la fila que bloquea (o null). Un cobro anulado RESUELTO no bloquea; uno REVISADO solo deja
// registrarla en OTRO comercio; uno pendiente de revisión bloquea con aviso.
function _pagoBloqueantePorLlave_(llave, todos, prefijo) {
  todos = todos || _leerPagos_();
  var est = _estadoCobros_(todos), filas = todos.filter(function (r) { return r.Llave === llave && r.Tipo !== 'REVERSION'; });
  for (var i = 0; i < filas.length; i++) {
    var r = filas[i], a = r.Tipo === 'CREDITO' ? est.anul[r.Pago_id] : null;
    if (!a) return r;
    if (a.estado === 'RESUELTA') continue;
    if (a.estado === 'REVISADA' && prefijo && prefijo !== r.Prefijo) continue;
    return Object.assign({}, r, { anulacionPendiente: true, anulEstado: a.estado });
  }
  return null;
}
function _msjAnulacionPendiente_(ya) {
  return ya.anulEstado === 'REVISADA'
    ? 'Esa operación pertenece a un cobro ANULADO de ' + ya.Prefijo + ' cuya vigencia no se modificó: solo se puede registrar en OTRO comercio. No se registró nada.'
    : 'Esa operación pertenece a un cobro ANULADO de ' + ya.Prefijo + ' que todavía REQUIERE REVISIÓN: primero confirmá la resolución de la anulación. No se registró nada.';
}
function _textoAdminSeguro_(v, min, max) {
  var t = String(v === undefined || v === null ? '' : v).replace(/[\u0000-\u001F]/g, ' ').replace(/\s+/g, ' ').trim();
  if (t.length < min || t.length > max || /^[=+\-@]/.test(t)) return null;
  return t;
}
function _cobroOriginal_(pagoId, todos) {
  return (todos || _leerPagos_()).filter(function (r) { return r.Pago_id === String(pagoId || '') && r.Tipo === 'CREDITO'; })[0] || null;
}

// ── CORRECCIÓN (importe y/o fecha de pago). data: { token, pagoId, importe?, fechaPago? 'AAAA-MM-DD', motivo, operador, clave, confirmar?, firma? }
// Medio y referencia NO se corrigen acá: cambian la llave de la operación y abrirían la puerta a registrar dos veces el mismo
// dinero. Para eso: anular (y, si quedó RESUELTA, registrar de nuevo con los datos correctos).
function corregirPagoVao(data) {
  data = data || {};
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  var pagoId = String(data.pagoId || ''), clave = String(data.clave || '');
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(clave)) return { error: 'Falta la clave de la operación (recargá la ficha).' };
  var motivo = _textoAdminSeguro_(data.motivo, 5, 200); if (!motivo) return { error: 'El motivo es obligatorio (5 a 200 caracteres).', campo: 'motivo' };
  var operador = _textoAdminSeguro_(data.operador, 2, 40); if (!operador) return { error: 'Indicá quién hace la corrección (operador).', campo: 'operador' };
  var importe = data.importe === undefined || data.importe === '' ? null : String(data.importe);
  if (importe !== null && (!/^\d{1,9}$/.test(importe) || Number(importe) <= 0)) return { error: 'Importe inválido (pesos enteros, sin puntos)', campo: 'importe' };
  var fecha = data.fechaPago ? _fechaISOaDia_(data.fechaPago) : null;
  if (data.fechaPago && (!fecha || fecha.getTime() > _diaSolo_(new Date()).getTime())) return { error: 'Fecha de pago inválida (no puede ser futura)', campo: 'fechaPago' };
  var preparar = function () {
    var todos = _leerPagos_(), est = _estadoCobros_(todos), r = _cobroOriginal_(pagoId, todos);
    if (!r) return { error: 'No se encontró ese cobro.' };
    if (est.anul[pagoId]) return { error: 'Ese cobro está ANULADO: no se corrige.' };
    var ya = todos.filter(function (x) { return x.Llave === 'COR|' + pagoId + '|' + clave; })[0];
    if (ya) return { ya: ya, r: r };
    var v = _valoresCobro_(r, est);
    var nuevoImp = importe !== null ? Number(importe) : v.importe, nuevaFecha = fecha || v.fechaPago;
    if (nuevoImp === v.importe && _fmtDia_(nuevaFecha) === _fmtDia_(v.fechaPago)) return { error: 'No hay cambios: el importe y la fecha son los mismos.' };
    return { r: r, v: v, nuevoImp: nuevoImp, nuevaFecha: _diaSolo_(nuevaFecha), firma: _firma_(['cor402', pagoId, v.ultimaCorreccion, String(nuevoImp), _fmtDia_(nuevaFecha), motivo, operador, clave]) };
  };
  var q = preparar(); if (q.error) return q;
  if (q.ya) return { success: true, yaRegistrado: true, correccionId: q.ya.Pago_id, mensaje: 'Esa corrección ya estaba registrada (no se duplicó).' };
  var res = { pagoId: pagoId, prefijo: q.r.Prefijo, antes: { importe: q.v.importe, fechaPago: _fmtDia_(q.v.fechaPago) }, despues: { importe: q.nuevoImp, fechaPago: _fmtDia_(q.nuevaFecha) },
              moneda: q.v.moneda, aviso: 'Corrección administrativa: se agrega un registro nuevo vinculado al cobro original (que no se modifica). La vigencia NO cambia.' };
  if (data.confirmar !== true) return Object.assign({ success: true, vistaPrevia: true, firma: q.firma }, res);
  return _conLock_(function () {
    var q2 = preparar(); if (q2.error) return q2;
    if (q2.ya) return { success: true, yaRegistrado: true, correccionId: q2.ya.Pago_id, mensaje: 'Esa corrección ya estaba registrada (no se duplicó).' };
    if (q2.firma !== String(data.firma || '')) return { error: 'Algo cambió desde la vista previa: volvé a revisarla.', firmaVieja: true };
    var r = q2.r;
    var w = _registrarFilaPagoSinCredito_({ Llave: 'COR|' + pagoId + '|' + clave, Tipo: 'CORRECCION', Medio: r.Medio, Entorno: r.Entorno, Prefijo: r.Prefijo, Plan: r.Plan,
      Importe: q2.nuevoImp, Moneda: q2.v.moneda, Fecha_pago: q2.nuevaFecha, Cuenta_receptora: r.Cuenta_receptora, Referencia: r.Referencia, MP_payment_id: r.MP_payment_id,
      Operador: operador, Origen: 'ADMIN_CORRECCION', Pago_relacionado: pagoId, Motivo: 'CORRECCION: ' + motivo });
    return Object.assign({ success: true, registrado: true, correccionId: w.pagoId, mensaje: '✅ Corrección registrada. El cobro original se conserva.' }, res);
  });
}

// ¿Se puede DEMOSTRAR que quitar el período del cobro deja una vigencia consistente?
function _analisisAnulacion_(r) {
  var razones = [], crudo = _leerPeriodosCrudo_(), anulados = _periodosAnulados_(crudo);
  var per = crudo.filter(function (x) { return String(x.Clave) === String(r.Pago_id) && (x.Tipo === 'PAGO' || x.Tipo === 'PAGO_SIMULADO') && !anulados[x.Registro_id]; })[0] || null;
  var vis = _periodosDe_(r.Prefijo, _leerPeriodos_());
  var previo = null;
  if (!per || !per.Inicio || !per.Fin) razones.push('no se encontró el período de este cobro en el historial');
  else {
    var otros = vis.filter(function (x) { return x.Registro_id !== per.Registro_id; });
    if (otros.some(function (x) { return _diaSolo_(x.Fin).getTime() >= _diaSolo_(per.Fin).getTime() || (x.Inicio && _diaSolo_(x.Inicio).getTime() > _diaSolo_(per.Inicio).getTime()); }))
      razones.push('hay períodos posteriores (renovaciones o cortesías) a este cobro');
    previo = _ultimoPorFin_(otros);
    if (!previo) razones.push('no hay un período anterior: el cobro abrió el plan (por ejemplo, desde la PRUEBA)');
    else if (_fmtDia_(_sumarDias_(_diaSolo_(previo.Fin), 1)) !== _fmtDia_(per.Inicio)) razones.push('el período anterior no está encadenado con este cobro');
    else if (String(previo.Plan) !== String(per.Plan)) razones.push('el cobro cambió de plan');
    var vf = _obtenerVigenciaCliente_(r.Prefijo).fechaVence;
    if (!vf || _fmtDia_(vf) !== _fmtDia_(per.Fin)) razones.push('la fecha de vencimiento de la planilla no coincide con el período del cobro');
    if (_planDeNegocio_(r.Prefijo) !== String(per.Plan)) razones.push('el plan actual del comercio no es el del cobro');
    if (per.Fin_promo || _leerCupos_().some(function (c) { return c.Evento === 'CONFIRMACION' && String(c.Pago_id) === String(r.Pago_id); }))
      razones.push('el cobro ocupó un lugar de la oferta de lanzamiento');
  }
  return { revertible: !razones.length, razones: razones, periodo: per, previo: previo };
}
// ¿Anulación RESUELTA a la que le falta quitar el período (un corte en el medio)? Se completa repitiendo la anulación.
function _anulacionIncompleta_(r) {
  var crudo = _leerPeriodosCrudo_(), anulados = _periodosAnulados_(crudo);
  var per = crudo.filter(function (x) { return String(x.Clave) === String(r.Pago_id) && (x.Tipo === 'PAGO' || x.Tipo === 'PAGO_SIMULADO'); })[0];
  return !!per && !anulados[per.Registro_id];
}
function _completarAnulacionSinLock_(r) {
  var a = _analisisAnulacion_(r);
  if (!a.periodo || !a.previo) return false;
  // Fin = el vencimiento que queda. Va cargado porque v040.1 y v039 fallan con una fila de PERIODOS_VAO sin Fin (ver la reversión).
  _hojaPeriodos_().appendRow(_filaPeriodo_({ Registro_id: Utilities.getUuid(), Prefijo: r.Prefijo, Plan: a.periodo.Plan, Tipo: 'ANULACION', Inicio: '', Fin: a.previo.Fin,
    Clave: 'ANU|' + a.periodo.Registro_id, Motivo: 'Anulación del cobro ' + r.Pago_id + ': se quita el período ' + _fmtDia_(a.periodo.Inicio) + ' → ' + _fmtDia_(a.periodo.Fin),
    Admin: _adminTexto_(), Fecha_registro: new Date() }));
  _escribirVence_(r.Prefijo, a.previo.Fin);
  return true;
}

// ── ANULACIÓN administrativa. data: { token, pagoId, motivo, operador, confirmar?, firma? }
function anularPagoVao(data) {
  data = data || {};
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  var pagoId = String(data.pagoId || '');
  var motivo = _textoAdminSeguro_(data.motivo, 5, 200); if (!motivo) return { error: 'El motivo es obligatorio (5 a 200 caracteres).', campo: 'motivo' };
  var operador = _textoAdminSeguro_(data.operador, 2, 40); if (!operador) return { error: 'Indicá quién anula (operador).', campo: 'operador' };
  var todos = _leerPagos_(), r = _cobroOriginal_(pagoId, todos);
  if (!r) return { error: 'No se encontró ese cobro.' };
  var a0 = _estadoCobros_(todos).anul[pagoId];
  if (a0) {   // repetición: no se anula dos veces; si quedó a medio hacer, se completa
    if (a0.estado === 'RESUELTA' && _anulacionIncompleta_(r)) {
      var hecho = _conLock_(function () { return _anulacionIncompleta_(r) ? _completarAnulacionSinLock_(r) : true; });
      return { success: true, yaAnulado: true, completado: hecho === true, estado: a0.estado, mensaje: 'Esa anulación ya estaba registrada; se completó la vigencia pendiente.' };
    }
    return { success: true, yaAnulado: true, estado: a0.estado, mensaje: 'Ese cobro ya estaba anulado (' + a0.estado + '). No se hizo nada más.' };
  }
  var bl = _bloqueosComunes_(r.Prefijo); if (bl) return { error: bl };
  var an = _analisisAnulacion_(r), venceAct = _obtenerVigenciaCliente_(r.Prefijo).fechaVence;
  var firmaDe = function (x, vAct) { return _firma_(['anu402', pagoId, x.revertible, x.previo ? _fmtDia_(x.previo.Fin) : '', x.razones.join('|'), vAct ? _fmtDia_(vAct) : '', motivo, operador]); };
  var v = _valoresCobro_(r, _estadoCobros_(todos));
  var res = { pagoId: pagoId, prefijo: r.Prefijo, importe: v.importe, moneda: v.moneda, fechaPago: v.fechaPago ? _fmtDia_(v.fechaPago) : '',
    estado: an.revertible ? 'RESUELTA' : 'REQUIERE_REVISION', razones: an.razones,
    vigencia: an.revertible ? { quitarPeriodo: _fmtDia_(an.periodo.Inicio) + ' → ' + _fmtDia_(an.periodo.Fin), venceAntes: venceAct ? _fmtDia_(venceAct) : '', venceDespues: _fmtDia_(an.previo.Fin) } : null,
    aviso: 'Anulación ADMINISTRATIVA: no es una devolución de dinero (eso se hace aparte). El cobro original se conserva y deja de contar en los totales. ' +
           (an.revertible ? 'Se quita su período y el vencimiento vuelve al ' + _fmtDia_(an.previo.Fin) + '. La operación se podrá registrar de nuevo (por ejemplo, en el comercio correcto).'
                          : 'La vigencia NO cambia (' + an.razones.join('; ') + '). Queda REQUIERE REVISIÓN: la operación sigue bloqueada hasta que confirmes la resolución.') };
  if (data.confirmar !== true) return Object.assign({ success: true, vistaPrevia: true, firma: firmaDe(an, venceAct) }, res);
  return _conLock_(function () {
    var todos2 = _leerPagos_(), r2 = _cobroOriginal_(pagoId, todos2);
    if (!r2) return { error: 'No se encontró ese cobro.' };
    if (_estadoCobros_(todos2).anul[pagoId]) return { success: true, yaAnulado: true, mensaje: 'Ese cobro ya estaba anulado. No se hizo nada más.' };
    var bl2 = _bloqueosComunes_(r2.Prefijo); if (bl2) return { error: bl2 };
    var an2 = _analisisAnulacion_(r2);
    if (firmaDe(an2, _obtenerVigenciaCliente_(r2.Prefijo).fechaVence) !== String(data.firma || '')) return { error: 'Algo cambió desde la vista previa: volvé a revisarla.', firmaVieja: true };
    var w = _registrarFilaPagoSinCredito_({ Llave: 'ANU|' + pagoId, Tipo: 'ANULACION', Medio: r2.Medio, Entorno: r2.Entorno, Prefijo: r2.Prefijo, Plan: r2.Plan,
      Importe: v.importe, Moneda: v.moneda, Fecha_pago: v.fechaPago || '', Cuenta_receptora: r2.Cuenta_receptora, Referencia: r2.Referencia, MP_payment_id: r2.MP_payment_id,
      Periodo_inicio: r2.Periodo_inicio, Periodo_fin: r2.Periodo_fin, Operador: operador, Origen: 'ADMIN_ANULACION', Pago_relacionado: pagoId,
      Motivo: (an2.revertible ? 'RESUELTA' : 'REQUIERE_REVISION (' + an2.razones.join('; ') + ')') + ' | ' + motivo });
    if (an2.revertible) _completarAnulacionSinLock_(r2);   // después de dejar constancia: si se corta acá, repetir la anulación lo completa
    return Object.assign({ success: true, registrado: true, anulacionId: w.pagoId, mensaje: an2.revertible ? '✅ Cobro anulado; vigencia hasta el ' + _fmtDia_(an2.previo.Fin) + '.' : '✅ Cobro anulado; vigencia sin cambios: REQUIERE REVISIÓN.' }, res);
  });
}

// ── Confirmar la resolución de una anulación que REQUIERE REVISIÓN. data: { token, pagoId, motivo, operador, confirmar?, firma? }
// No cambia la vigencia (eso lo decide y lo hace el dueño con las herramientas existentes). Solo deja constancia y libera la operación
// para registrarla en OTRO comercio.
function resolverAnulacionVao(data) {
  data = data || {};
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  var pagoId = String(data.pagoId || '');
  var motivo = _textoAdminSeguro_(data.motivo, 5, 200); if (!motivo) return { error: 'El motivo es obligatorio (5 a 200 caracteres).', campo: 'motivo' };
  var operador = _textoAdminSeguro_(data.operador, 2, 40); if (!operador) return { error: 'Indicá quién resuelve (operador).', campo: 'operador' };
  var check = function () {
    var todos = _leerPagos_(), r = _cobroOriginal_(pagoId, todos), a = _estadoCobros_(todos).anul[pagoId];
    if (!r || !a) return { error: 'Ese cobro no tiene una anulación.' };
    if (a.estado === 'REVISADA') return { ya: true, r: r };
    if (a.estado !== 'REQUIERE_REVISION') return { error: 'Esa anulación ya está RESUELTA: no necesita revisión.' };
    return { r: r, a: a };
  };
  var c = check(); if (c.error) return c;
  if (c.ya) return { success: true, yaResuelto: true, mensaje: 'Esa revisión ya estaba confirmada. No se hizo nada más.' };
  var firma = _firma_(['anures402', pagoId, motivo, operador]);
  var res = { pagoId: pagoId, prefijo: c.r.Prefijo, aviso: 'Se deja constancia de que revisaste esta anulación. La vigencia de ' + c.r.Prefijo + ' NO cambia. La operación queda liberada solo para registrarla en OTRO comercio.' };
  if (data.confirmar !== true) return Object.assign({ success: true, vistaPrevia: true, firma: firma }, res);
  if (firma !== String(data.firma || '')) return { error: 'Algo cambió desde la vista previa: volvé a revisarla.', firmaVieja: true };
  return _conLock_(function () {
    var c2 = check(); if (c2.error) return c2;
    if (c2.ya) return { success: true, yaResuelto: true, mensaje: 'Esa revisión ya estaba confirmada. No se hizo nada más.' };
    var r = c2.r;
    var w = _registrarFilaPagoSinCredito_({ Llave: 'ANURES|' + pagoId, Tipo: 'RESOLUCION', Medio: r.Medio, Entorno: r.Entorno, Prefijo: r.Prefijo, Plan: r.Plan,
      Importe: 0, Moneda: r.Moneda, Fecha_pago: '', Operador: operador, Origen: 'ADMIN_ANULACION', Pago_relacionado: pagoId, Motivo: 'ANULACION_REVISADA | ' + motivo });
    return Object.assign({ success: true, registrado: true, resolucionId: w.pagoId, mensaje: '✅ Revisión confirmada. La vigencia no cambió.' }, res);
  });
}

// ── REPORTE de cobros. data: { token, anio 'AAAA', mes? 1..12, prefijo?, entorno 'REAL'|'SIMULADO', fechaBase? 'PAGO'|'REGISTRO' }
function reporteCobrosVao(data) {
  data = data || {};
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión admin inválida o expirada' };
  var anio = String(data.anio || ''); if (!/^\d{4}$/.test(anio)) return { error: 'Año inválido' };
  var mes = (data.mes === undefined || data.mes === null || data.mes === '') ? 0 : Number(data.mes);
  if (!(mes >= 0 && mes <= 12) || mes % 1 !== 0) return { error: 'Mes inválido' };
  var entorno = String(data.entorno || 'REAL').toUpperCase(); if (entorno !== 'REAL' && entorno !== 'SIMULADO') return { error: 'Entorno inválido' };
  var base = String(data.fechaBase || 'PAGO').toUpperCase(); if (base !== 'PAGO' && base !== 'REGISTRO') return { error: 'Fecha de referencia inválida' };
  var prefijo = data.prefijo ? _normalizarPrefijo_(data.prefijo) : '';
  var tz = Session.getScriptTimeZone(), ym = function (d) { return d ? Utilities.formatDate(new Date(d), tz, 'yyyy-MM') : ''; };
  var enPeriodo = function (d) { var k = ym(d); return !!k && k.substring(0, 4) === anio && (!mes || Number(k.substring(5, 7)) === mes); };
  var todos = _leerPagos_(), est = _estadoCobros_(todos), ids = {};
  var detalle = [], anulados = [], otros = [], tot = {};
  todos.forEach(function (r) {
    ids[r.Pago_id] = true;
    if (r.Entorno !== entorno || (prefijo && r.Prefijo !== prefijo)) return;
    if (r.Tipo === 'CREDITO') {
      var v = _valoresCobro_(r, est), fRef = base === 'PAGO' ? v.fechaPago : _fechaValida_(r.Fecha_registro);
      if (!enPeriodo(fRef)) return;
      var a = est.anul[r.Pago_id];
      var fila = { pagoId: r.Pago_id, prefijo: r.Prefijo, plan: r.Plan, importe: v.importe, moneda: v.moneda, fechaPago: v.fechaPago ? _fmtDia_(v.fechaPago) : '',
        fechaRegistro: _fmtDia_(r.Fecha_registro), medio: r.Medio, referencia: String(r.Referencia || r.MP_payment_id || '').replace(/^'/, ''),
        periodo: r.Periodo_inicio ? _fmtDia_(r.Periodo_inicio) + ' → ' + _fmtDia_(r.Periodo_fin) : '', vence: _fmtDia_(r.Periodo_fin), operador: r.Operador,
        correcciones: v.correcciones, importeOriginal: Number(r.Importe), mes: ym(fRef) };
      if (a) { fila.anulacion = a.estado; anulados.push(fila); return; }
      detalle.push(fila);
      var t = tot[v.moneda] = tot[v.moneda] || { moneda: v.moneda, total: 0, cantidad: 0, meses: {} };
      t.total += v.importe; t.cantidad++;
      var m = t.meses[fila.mes] = t.meses[fila.mes] || { mes: fila.mes, total: 0, cantidad: 0 }; m.total += v.importe; m.cantidad++;
    } else if (r.Tipo === 'SIN_ACREDITAR' || r.Tipo === 'REVERSION') {
      if (enPeriodo(base === 'PAGO' ? r.Fecha_pago : r.Fecha_registro))
        otros.push({ pagoId: r.Pago_id, tipo: r.Tipo, prefijo: r.Prefijo, importe: Number(r.Importe), moneda: r.Moneda, fecha: _fmtDia_(r.Fecha_pago || r.Fecha_registro), motivo: String(r.Motivo || '') });
    }
  });
  // anteriores a v040: solo en PERIODOS_VAO (sin cobro central). Se listan, NO se suman.
  var anteriores = [];
  _leerPeriodosCrudo_().forEach(function (p) {
    if ((entorno === 'REAL' ? p.Tipo !== 'PAGO' : p.Tipo !== 'PAGO_SIMULADO') || ids[String(p.Clave)]) return;
    if (prefijo && p.Prefijo !== prefijo) return;
    if (!enPeriodo(base === 'PAGO' ? (p.Fecha_pago || p.Fecha_registro) : p.Fecha_registro)) return;
    anteriores.push({ prefijo: p.Prefijo, plan: p.Plan, importe: Number(p.Importe) || 0, moneda: String(p.Moneda || ''), fechaPago: _fmtDia_(p.Fecha_pago), medio: p.Medio,
      referencia: String(p.Referencia || '').replace(/^'/, ''), periodo: _fmtDia_(p.Inicio) + ' → ' + _fmtDia_(p.Fin) });
  });
  var totales = Object.keys(tot).sort().map(function (k) { var t = tot[k]; return { moneda: t.moneda, total: t.total, cantidad: t.cantidad,
    meses: Object.keys(t.meses).sort().map(function (mm) { return t.meses[mm]; }) }; });
  // control: la suma del detalle tiene que dar el total (por moneda)
  var cuadra = totales.every(function (t) { return detalle.filter(function (d) { return d.moneda === t.moneda; }).reduce(function (s, d) { return s + d.importe; }, 0) === t.total; });
  return { success: true, filtros: { anio: anio, mes: mes || null, prefijo: prefijo || null, entorno: entorno, fechaBase: base },
    totales: totales, detalle: detalle.sort(function (x, y) { return x.mes < y.mes ? -1 : x.mes > y.mes ? 1 : 0; }), cuadra: cuadra,
    anulados: anulados, otros: otros, anterioresV040: anteriores,
    nota: 'Cuentan solo los cobros confirmados (CREDITO) de PAGOS_VAO no anulados, con su última corrección. Período según la fecha de ' + (base === 'PAGO' ? 'pago' : 'registro') + '.' };
}

// <<<MOTOR_COBRO_V041_INICIO>>>
// =====================================================================
// MOTOR DE COBRO VAO POS — v041 (va DENTRO de Code.gs; este archivo es la misma pieza para las pruebas locales)
// v3 = v2 + (a) plan guardado en partes (límite 9 KB por propiedad), (b) stock con marca de operación
//      escrita en la MISMA escritura que el stock (sin desfase silencioso), (c) progreso chico separado del plan.
// Fiado + pago mixto + monedas (USD/CLP) + deuda en caja, UN solo motor
// para todos los planes (BÁSICO y PERSONALIZADO: el plan solo habilita o
// rechaza funciones, el cálculo es siempre el mismo).
//
// PRINCIPIOS
//  1. Cero texto con plata: cada importe es un número en su propia celda.
//  2. Saldos CALCULADOS: saldo(fiado) = Original − Σ ABONOS.Importe.
//  3. Un cobro = UNA operación (OpId) bajo candado, por etapas verificables;
//     reintentar nunca duplica.
//  4. Cuentas en CENTAVOS enteros. Moneda extranjera: centavos × cotización
//     (multiplicar, nunca dividir), cotización tomada del SERVIDOR.
//  5. El vuelto se entrega siempre en EFECTIVO PESOS.
// =====================================================================
var MotorCobro = (function () {

  var H = { INV: 'INVENTARIO', VENTAS: 'VENTAS', FIADOS: 'FIADOS', ABONOS: 'ABONOS', PAGOS: 'PAGOS', CLIENTES: 'CLIENTES' };
  // INVENTARIO: columnas actuales + 2 técnicas AL FINAL (regla 11): StockVer (número) y StockOps (últimas operaciones que
  // escribieron el stock). En el prototipo el inventario tiene 5 columnas → índices 5 y 6. En VAO serían L y M.
  var INV = { COD: 0, NOM: 1, STOCK: 2, PRECIO: 4, VER: 11, OPS: 12 };   // VAO: A..K actuales; L=StockVer, M=StockOps
  var OPS_GUARDADAS = 8, PARTE_PLAN = 8000;
  var VEN = { FECHA: 0, NOM: 1, QTY: 2, PRECIO: 3, MODO: 4, TOTAL: 5, VID: 6 };                       // VENTAS_XX actual, sin cambios
  var FIA = { ID: 0, FECHA: 1, TICKET: 2, CLI: 3, TEL: 4, DESC: 5, CANT: 6, ORIG: 7, SALDO: 8, VENC: 9,
              ESTADO: 10, FPAGO: 11, MPAGO: 12, OBS: 13, CLIID: 14, OPID: 15 };                          // 14 actuales + 2 al final
  var ABO = { ID: 0, FECHA: 1, OPID: 2, FIADO: 3, CLIID: 4, IMP: 5, ORIGEN: 6, VID: 7, REF: 8, MOTIVO: 9 }; // hoja nueva
  // PAGOS (hoja nueva): una fila por cada pago RECIBIDO, más una por el vuelto entregado y una por el fiado.
  //   Importe = ARS (con signo). AVenta + ADeuda + AExceso = Importe (las tres partes, en ARS).
  var PAG = { FECHA: 0, OPID: 1, VID: 2, TIPO: 3, MEDIO: 4, MONEDA: 5, MONTO_MON: 6, COT: 7, IMP: 8, AVENTA: 9, ADEUDA: 10, AEXCESO: 11 };
  var ENC = {
    PAGOS:  ['Fecha', 'OpId', 'VentaId', 'Tipo', 'Medio', 'Moneda', 'MontoMoneda', 'Cotizacion', 'Importe', 'AVenta', 'ADeuda', 'AExceso'],
    ABONOS: ['IdMov', 'Fecha', 'OpId', 'IdFiado', 'ClienteId', 'Importe', 'Origen', 'VentaId', 'Ref', 'Motivo']
  };
  var CLI = { NOM: 0, TEL: 1, ID: 2, CLAVE: 3, ACTIVO: 4 };   // Activo: '' o 'SI' = activo · 'NO' = desactivado · 'DUPLICADO' = ficha repetida (se ignora)                                                         // 2 actuales + 2 al final

  var NO_EFECTIVO = ['DEBITO', 'QR_POSNET', 'QR', 'TRANSFERENCIA'];       // no pueden generar vuelto
  var MEDIOS = ['EFECTIVO'].concat(NO_EFECTIVO);
  var MONEDAS = ['ARS', 'USD', 'CLP'];                                     // solo para EFECTIVO
  var PLAN_BASICO = { medios: ['EFECTIVO', 'DEBITO', 'TRANSFERENCIA'] };
  var TOPE_EQUIV_CTS = 50000000 * 100;                                     // lección v445 de Copihue

  function cts(x) { var n = Number(x); return isFinite(n) ? Math.round(n * 100) : NaN; }
  function pesos(c) { return c / 100; }
  function normCliente(n) { return String(n || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toUpperCase(); }
  function soloDig(t) { return String(t || '').replace(/\D/g, ''); }
  function err(msg, extra) { var e = { ok: false, error: msg, definitivo: true }; for (var k in (extra || {})) e[k] = extra[k]; return e; }
  function filasCon(store, hoja, col, valor) { return store.leer(hoja).filter(function (f) { return String(f[col]) === String(valor); }); }
  function clave(medio, moneda) { return medio === 'EFECTIVO' && moneda && moneda !== 'ARS' ? 'EFECTIVO ' + moneda : medio; }

  // ── lecturas ─────────────────────────────────────────────────────────
  function abonosDeFiado(store, id) { return filasCon(store, H.ABONOS, ABO.FIADO, id); }
  function saldoFiadoCts(store, f) { return cts(f[FIA.ORIG]) - abonosDeFiado(store, f[FIA.ID]).reduce(function (s, a) { return s + cts(a[ABO.IMP]); }, 0); }
  function fiadosAbiertos(store, cid) {
    return store.leer(H.FIADOS).filter(function (f) { return String(f[FIA.CLIID]) === String(cid); })
      .map(function (f) { return { fila: f, saldo: saldoFiadoCts(store, f) }; }).filter(function (x) { return x.saldo > 0; })
      .sort(function (a, b) { var ta = new Date(a.fila[FIA.FECHA]).getTime(), tb = new Date(b.fila[FIA.FECHA]).getTime();
        return ta !== tb ? ta - tb : String(a.fila[FIA.ID]).localeCompare(String(b.fila[FIA.ID])); });
  }
  function saldoClienteCts(store, cid) { return fiadosAbiertos(store, cid).reduce(function (s, x) { return s + x.saldo; }, 0); }
  function clientePorId(store, id) {
    var c = store.leer(H.CLIENTES).filter(function (x) { return String(x[CLI.ID]) === String(id); })[0];
    return c ? { id: c[CLI.ID], fila: c } : { nuevo: true };
  }
  function resolverCliente(store, nombre, telefono) {
    var tel = soloDig(telefono), k = normCliente(nombre), cl = store.leer(H.CLIENTES).filter(function (c) { return String(c[CLI.ACTIVO] || '').toUpperCase() !== 'DUPLICADO' && c[CLI.ID]; });
    if (tel.length >= 6) {
      var t = cl.filter(function (c) { return soloDig(c[CLI.TEL]) === tel; });
      if (t.length === 1) return { id: t[0][CLI.ID], fila: t[0], aviso: (k && t[0][CLI.CLAVE] !== k) ? 'Ese teléfono es de ' + t[0][CLI.NOM] + ': se usa esa ficha.' : '' };
      if (t.length > 1) return { ambiguo: t.map(function (c) { return c[CLI.NOM]; }) };
      var s = cl.filter(function (c) { return c[CLI.CLAVE] === k && !soloDig(c[CLI.TEL]); });
      if (s.length === 1) return { id: s[0][CLI.ID], fila: s[0], completarTel: tel };
      return { nuevo: true };
    }
    if (!k) return { error: 'Falta el nombre del cliente' };
    var n = cl.filter(function (c) { return c[CLI.CLAVE] === k; });
    if (n.length === 1) return { id: n[0][CLI.ID], fila: n[0] };
    if (n.length > 1) return { ambiguo: n.map(function (c) { return c[CLI.NOM] + ' · ' + (c[CLI.TEL] || 'sin tel.'); }) };
    return { nuevo: true };
  }

  // ── PLAN (cálculo puro, no escribe) ──────────────────────────────────
  // op = { opId, items:[{fila,codigo,nombre,qty,precio}], pagos:[{medio, moneda?, monto}],
  //        fiado:{cliente,telefono,vencimiento}|null, deuda:{cliente,telefono,modo:'SUMAR'|'VUELTO',monto?,idFiado?}|null,
  //        esperado:{total,deuda,fiado,vuelto,cot:{USD,CLP}}|null }
  // Config del comercio (del servidor): store.cfg = { plan:'BASICO'|'PERSONALIZADO', cot:{USD:1450, CLP:1.6}, limiteSobrepagoPct:20 }
  function calcularPlan(store, op) {
    // Capacidades (un solo motor): plan BASICO del prototipo, o en VAO el módulo extra_cobro_avanzado apagado.
    // Sin cobro avanzado: un solo medio, fiar la compra completa, cobrar/abonar un fiado puntual (como hoy en VAO).
    var cfg = store.cfg || {}, basico = cfg.plan === 'BASICO' || cfg.avanzado === false, avisos = [];
    var mediosBasico = cfg.plan === 'BASICO' ? PLAN_BASICO.medios : MEDIOS, abonoParcialBasico = cfg.plan !== 'BASICO';
    if (!op || !/^[A-Za-z0-9_\-]{6,64}$/.test(String(op.opId || ''))) return err('No se pudo identificar la operación. No se registró nada: volvé a intentar.');
    var items = op.items || [], pagosIn = op.pagos || [];
    if (op.fiado && op.deuda) return err('No se puede fiar y cobrar deuda en el mismo cobro: pagar deuda con deuda nueva no corresponde. No se registró nada: hacé una cosa por vez.');
    if (!items.length && !op.deuda) return err('No hay productos para cobrar. No se registró nada.');

    // 1) Compra y stock
    var inv = store.leer(H.INV), lineas = [], T = 0, porFila = {};
    for (var i = 0; i < items.length; i++) {
      var it = items[i], f = parseInt(it.fila, 10), q = Number(it.qty), p = cts(it.precio);
      if (!(f >= 0 && f < inv.length)) return err('No se encontró el producto «' + it.nombre + '». No se registró nada: actualizá la lista de productos y volvé a agregarlo.');
      if (!(q > 0) || Math.round(q) !== q) return err('La cantidad de «' + it.nombre + '» no es válida. No se registró nada: corregila.');
      if (!(p >= 0)) return err('El precio de «' + it.nombre + '» no es válido. No se registró nada: corregilo.');
      if (String(inv[f][INV.COD]) !== String(it.codigo) || String(inv[f][INV.NOM]) !== String(it.nombre)) return err('El inventario cambió: ' + it.nombre + '. No se registró nada: quitalo y volvé a agregarlo.');
      porFila[f] = (porFila[f] || 0) + q; lineas.push({ fila: f, nombre: inv[f][INV.NOM], qty: q, precio: p, total: p * q }); T += p * q;
    }
    var stock = [];
    for (var k in porFila) {
      var antes = Number(inv[k][INV.STOCK]) || 0;
      if (antes < porFila[k]) return err('Stock insuficiente: ' + inv[k][INV.NOM] + ' (hay ' + antes + '). No se registró nada: corregí la cantidad.', { stockInsuficiente: true });
      stock.push({ fila: Number(k), nombre: inv[k][INV.NOM], codigo: inv[k][INV.COD], antes: antes, despues: antes - porFila[k] });
    }

    // 2) Pagos recibidos → ingresos en ARS (centavos), con su moneda y cotización del SERVIDOR
    var ing = [];
    for (var j = 0; j < pagosIn.length; j++) {
      var m = String(pagosIn[j].medio || '').toUpperCase(), mon = String(pagosIn[j].moneda || 'ARS').toUpperCase();
      if (MEDIOS.indexOf(m) === -1) return err('Ese medio de pago (' + m + ') no está disponible. No se registró nada.');
      if (MONEDAS.indexOf(mon) === -1 || (m !== 'EFECTIVO' && mon !== 'ARS')) return err('La moneda ' + mon + ' no se puede usar con ' + m + '. No se registró nada: las monedas extranjeras van solo en efectivo.');
      var cm = cts(pagosIn[j].monto);
      if (!(cm > 0)) return err('El importe en ' + clave(m, mon) + ' no es válido. No se registró nada: corregilo.');
      var cot = 1;
      if (mon !== 'ARS') {
        cot = Number(cfg.cot && cfg.cot[mon]);
        if (!(cot > 0) || !isFinite(cot)) return err('No hay cotización de ' + mon + ' activa. No se registró nada: cobrá en pesos o pedí que se cargue la cotización.');
      }
      var imp = Math.round(cm * cot);                                       // centavos de moneda × cotización = centavos ARS
      if (imp > TOPE_EQUIV_CTS) return err('El equivalente de ' + clave(m, mon) + ' da $' + pesos(imp) + ': algo no cierra (¿cotización o monto?). No se registró nada: revisá el monto.');
      ing.push({ n: j, medio: m, moneda: mon, montoMon: cm, cot: cot, imp: imp, efectivo: m === 'EFECTIVO' });
    }
    // Orden fijo de aplicación: primero lo que no puede dar vuelto, después efectivo ARS, USD, CLP.
    function rango(x) { return x.efectivo ? 10 + MONEDAS.indexOf(x.moneda) : NO_EFECTIVO.indexOf(x.medio); }
    ing.sort(function (a, b) { return rango(a) - rango(b) || a.n - b.n; });
    var P = ing.reduce(function (s, x) { return s + x.imp; }, 0);
    var NC = ing.filter(function (x) { return !x.efectivo; }).reduce(function (s, x) { return s + x.imp; }, 0);

    // 3) Plan BÁSICO: mismas cuentas, menos funciones (se rechaza en el servidor, no solo en pantalla)
    if (basico) {
      if (ing.length > 1) return err('Tu plan permite cobrar con un solo medio. El pago mixto es del plan Personalizado. No se registró nada.');
      if (ing.length && (mediosBasico.indexOf(ing[0].medio) === -1 || ing[0].moneda !== 'ARS')) return err('Ese medio o moneda es del plan Personalizado. No se registró nada.');
      if (op.fiado && ing.length) return err('Tu plan permite fiar la compra completa. Fiar una parte es del plan Personalizado. No se registró nada.');
      if (op.deuda && (items.length || String(op.deuda.modo || 'SUMAR').toUpperCase() !== 'SUMAR' || !op.deuda.idFiado))
        return err('Sumar deuda a una compra o usar el vuelto para la deuda es del plan Personalizado. No se registró nada: cobrá la deuda desde Fiados.');
    }

    // 4) Deuda
    var deuda = null, S = 0, D = 0;
    if (op.deuda) {
      var rc = op.deuda.clienteId ? clientePorId(store, op.deuda.clienteId) : resolverCliente(store, op.deuda.cliente, op.deuda.telefono);
      if (rc.error) return err(rc.error);
      if (rc.ambiguo) return err('Hay más de un cliente que coincide: ' + rc.ambiguo.join(' / ') + '. No se registró nada: elegí el cliente con su teléfono.', { ambiguo: rc.ambiguo });
      if (rc.nuevo) return err('Ese cliente no tiene deuda. No se registró nada.');
      if (rc.aviso) avisos.push(rc.aviso);
      var ab = fiadosAbiertos(store, rc.id);
      if (op.deuda.idFiado) ab = ab.filter(function (x) { return String(x.fila[FIA.ID]) === String(op.deuda.idFiado); });
      S = ab.reduce(function (s, x) { return s + x.saldo; }, 0);
      if (!(S > 0)) return err('Ese cliente no tiene deuda pendiente' + (op.deuda.idFiado ? ' en ese fiado' : '') + '. No se registró nada.', { sinDeuda: true });
      deuda = { clienteId: rc.id, cliente: rc.fila[CLI.NOM], abiertos: ab, modo: String(op.deuda.modo || 'SUMAR').toUpperCase() };
      if (deuda.modo === 'SUMAR') {
        D = op.deuda.monto != null ? cts(op.deuda.monto) : S;
        if (!(D > 0)) return err('El importe a pagar de la deuda no es válido. No se registró nada: corregilo.');
        if (D > S) return err('El pago a la deuda ($' + pesos(D) + ') supera lo que debe ($' + pesos(S) + '). No se registró nada: corregí el monto.', { saldo: pesos(S), abonoMayorQueSaldo: true });
        if (basico && !abonoParcialBasico && D !== S) return err('Tu plan cobra el fiado completo. Los abonos parciales son del plan Personalizado. No se registró nada.');
      } else if (deuda.modo !== 'VUELTO') return err('No se reconoce cómo pagar la deuda. No se registró nada.');
    }

    // 5) Cuadre
    var Need = T + D, F = 0, V = 0, Ve = 0, fiado = null;
    if (NC > Need) return err('Tarjeta, QR o transferencia no pueden superar lo que se cobra: el vuelto solo sale del efectivo. No se registró nada: corregí los montos.');
    if (op.fiado) {
      if (!items.length) return err('No hay compra para fiar. No se registró nada.');
      if (P >= Need) return err('No hace falta fiado: lo pagado ya cubre el total. No se registró nada: quitá el fiado y cobrá.');
      F = Need - P;
      var rf = resolverCliente(store, op.fiado.cliente, op.fiado.telefono);
      if (rf.error) return err(rf.error);
      if (rf.ambiguo) return err('Hay más de un cliente que coincide: ' + rf.ambiguo.join(' / ') + '. No se registró nada: elegí el cliente con su teléfono.', { ambiguo: rf.ambiguo });
      if (rf.aviso) avisos.push(rf.aviso);
      if (rf.fila && String(rf.fila[CLI.ACTIVO] || '').toUpperCase() === 'NO') return err('El cliente ' + rf.fila[CLI.NOM] + ' está desactivado. No se registró nada: reactivalo desde Clientes o elegí otro cliente.', { clienteDesactivado: true });
      fiado = { clienteId: rf.id || null, completarTel: rf.completarTel || '', cliente: rf.fila ? rf.fila[CLI.NOM] : String(op.fiado.cliente).trim(),
                telefono: soloDig(op.fiado.telefono) || (rf.fila ? soloDig(rf.fila[CLI.TEL]) : ''), vencimiento: op.fiado.vencimiento || '', importe: F };
    } else {
      if (P < Need) return err('Faltan $' + pesos(Need - P) + ' para completar el cobro. No se registró nada: agregá otro pago o fiá lo que falta.', { falta: pesos(Need - P) });
      V = P - Need;
    }
    if (deuda && deuda.modo === 'VUELTO') {
      if (!(V > 0)) return err('No hay vuelto para aplicar a la deuda. No se registró nada.');
      D = op.deuda.monto != null ? Math.min(cts(op.deuda.monto), V, S) : Math.min(V, S);
      if (!(D > 0)) return err('El importe a pagar de la deuda no es válido. No se registró nada: corregilo.');
      Ve = V - D; Need = T + D;
    } else Ve = V;

    // 6) Reparto de cada ingreso entre VENTA, DEUDA y EXCESO (lo que vuelve como vuelto), en el orden fijo
    var faltaV = T, faltaD = D;
    ing.forEach(function (x) {
      x.aV = Math.min(x.imp, faltaV); faltaV -= x.aV;
      x.aD = Math.min(x.imp - x.aV, faltaD); faltaD -= x.aD;
      x.aX = x.imp - x.aV - x.aD;
      if (x.aX > 0 && !x.efectivo) x.malo = true;
    });
    if (ing.some(function (x) { return x.malo; })) return err('No se pudo cerrar la cuenta del cobro. No se registró nada: avisá a VAO Sistemas.');
    var sumX = ing.reduce(function (s, x) { return s + x.aX; }, 0);
    if (faltaV !== (F > 0 ? F : 0) || faltaD !== 0 || sumX !== Ve) return err('No se pudo cerrar la cuenta del cobro. No se registró nada: avisá a VAO Sistemas.');
    // aviso (no bloquea): dólares que dejan un vuelto grande (Copihue v448/v449)
    ing.forEach(function (x) { if (x.moneda === 'USD' && x.aX > 0 && x.aX > (x.imp - x.aX) * ((cfg.limiteSobrepagoPct || 20) / 100)) avisos.push('Los dólares dejan un vuelto grande: $' + pesos(x.aX) + '.'); });

    // 7) Abonos (más viejo primero, o el fiado elegido)
    var abonos = [];
    if (deuda) {
      var r = D;
      for (var a = 0; a < deuda.abiertos.length && r > 0; a++) { var y = deuda.abiertos[a], im = Math.min(y.saldo, r); abonos.push({ idFiado: y.fila[FIA.ID], importe: im }); r -= im; }
      if (r !== 0) return err('No se pudo repartir el pago entre los fiados. No se registró nada: avisá a VAO Sistemas.');
    }

    var mediosVenta = {}; ing.forEach(function (x) { if (x.aV > 0) mediosVenta[clave(x.medio, x.moneda)] = 1; }); if (F > 0) mediosVenta.FIADO = 1;
    var mv = Object.keys(mediosVenta);
    var plan = { v: 2, opId: String(op.opId), total: T, deuda: D, fiado: F, vuelto: Ve, recibido: P, lineas: lineas, stock: stock,
                 modo: !items.length ? '' : (mv.length === 1 ? mv[0] : (mv.length ? 'MIXTO' : 'SIN COBRO')),
                 ingresos: ing.map(function (x) { return { medio: x.medio, moneda: x.moneda, montoMon: x.montoMon, cot: x.cot, imp: x.imp, aV: x.aV, aD: x.aD, aX: x.aX }; }),
                 abonos: abonos, clienteDeuda: deuda ? { id: deuda.clienteId, nombre: deuda.cliente } : null, fiadoNuevo: fiado,
                 idFiadoObjetivo: op.deuda && op.deuda.idFiado ? String(op.deuda.idFiado) : '', avisos: avisos, origen: items.length ? 'CAJA' : 'DEUDA' };

    // 8) La pantalla tiene que haber visto lo mismo (otro equipo, cotización cambiada…)
    if (op.esperado) {
      var e = op.esperado, dif = [];
      if (e.total != null && cts(e.total) !== T) dif.push('total');
      if (e.deuda != null && cts(e.deuda) !== D) dif.push('deuda');
      if (e.fiado != null && cts(e.fiado) !== F) dif.push('fiado');
      if (e.vuelto != null && cts(e.vuelto) !== Ve) dif.push('vuelto');
      if (e.cot) for (var mo in e.cot) if (Number(e.cot[mo]) !== Number(cfg.cot && cfg.cot[mo])) dif.push('cotización ' + mo);
      if (dif.length) return err('Los números cambiaron desde que abriste el cobro (' + dif.join(', ') + '). No se cobró nada: revisá y confirmá de nuevo.', { cambio: dif, plan: resumen(plan) });
    }
    return { ok: true, plan: plan };
  }

  function resumen(plan) {
    return { opId: plan.opId, total: pesos(plan.total), deuda: pesos(plan.deuda), fiado: pesos(plan.fiado), vuelto: pesos(plan.vuelto), modo: plan.modo,
             ingresos: plan.ingresos.map(function (x) { return { medio: clave(x.medio, x.moneda), monto: pesos(x.montoMon), cot: x.cot, importe: pesos(x.imp), venta: pesos(x.aV), deuda: pesos(x.aD), exceso: pesos(x.aX) }; }),
             abonos: plan.abonos.map(function (a) { return { idFiado: a.idFiado, importe: pesos(a.importe) }; }), avisos: plan.avisos };
  }

  // Filas de PAGOS de un plan: una por ingreso + el vuelto entregado (en pesos) + el fiado; nunca vacío.
  function filasPagos(plan, fecha, aDevolver, cliente) {
    var vid = plan.lineas.length ? plan.opId : '', filas = [], resto = aDevolver || 0;
    // lo que no se pudo abonar pasa de "deuda" a "exceso" (desde el último pago), y sale como fila A_DEVOLVER
    var ing = plan.ingresos.map(function (x) { return { medio: x.medio, moneda: x.moneda, montoMon: x.montoMon, cot: x.cot, imp: x.imp, aV: x.aV, aD: x.aD, aX: x.aX }; });
    for (var z = ing.length - 1; z >= 0 && resto > 0; z--) { var m = Math.min(ing[z].aD, resto); ing[z].aD -= m; ing[z].aX += m; resto -= m; }
    ing.forEach(function (x) { filas.push([fecha, plan.opId, vid, 'INGRESO', x.medio, x.moneda, pesos(x.montoMon), x.cot, pesos(x.imp), pesos(x.aV), pesos(x.aD), pesos(x.aX)]); });
    if (aDevolver > 0) filas.push([fecha, plan.opId, vid, 'A_DEVOLVER', 'EFECTIVO', 'ARS', -pesos(aDevolver), 1, -pesos(aDevolver), 0, 0, -pesos(aDevolver)]);
    if (plan.vuelto > 0) filas.push([fecha, plan.opId, vid, 'VUELTO', 'EFECTIVO', 'ARS', -pesos(plan.vuelto), 1, -pesos(plan.vuelto), 0, 0, -pesos(plan.vuelto)]);
    if (plan.fiado > 0) filas.push([fecha, plan.opId, vid, 'FIADO', 'FIADO', 'ARS', pesos(plan.fiado), 1, pesos(plan.fiado), pesos(plan.fiado), 0, 0]);
    if (!filas.length) filas.push([fecha, plan.opId, vid, 'SIN_COBRO', '', 'ARS', 0, 1, 0, 0, 0, 0]);   // venta en $0 (regalo): igual deja marca de "completo"
    return filas;
  }

  // ── PERSISTENCIA de la operación en curso ──────────────────────────────
  // Plan (grande, se escribe UNA vez) en partes de ≤ 8.000 caracteres: COBROPLAN_<op>_0..n.
  // Progreso (chico, cambia en cada etapa) en COBRO_<op>. El progreso se escribe DESPUÉS de las partes:
  // si existe, el plan está completo. Al terminar se borra primero el progreso y después las partes.
  function guardarPlan(store, opId, plan) {
    var txt = JSON.stringify(plan), n = Math.ceil(txt.length / PARTE_PLAN) || 1;
    for (var p = 0; p < n; p++) store.setProp('COBROPLAN_' + opId + '_' + p, txt.slice(p * PARTE_PLAN, (p + 1) * PARTE_PLAN));
    return n;
  }
  function leerPlan(store, opId, n) {
    var t = ''; for (var p = 0; p < n; p++) { var x = store.prop('COBROPLAN_' + opId + '_' + p); if (x == null) return null; t += x; }
    try { return JSON.parse(t); } catch (e) { return null; }
  }
  function borrarPlan(store, opId) {                                   // borra TODAS las partes de ese cobro que existan
    Object.keys(store.props).filter(function (k) { return k.indexOf('COBROPLAN_' + opId + '_') === 0; }).sort().forEach(function (k) { store.delProp(k); });
  }
  function opsDe(fila) { return String(fila[INV.OPS] || '').split(' ').filter(Boolean); }

  // ── EJECUCIÓN por etapas (PAGOS es el último dato escrito) ─────────────
  function cobrar(store, op, ahora) {
    ahora = ahora || new Date();
    var opId = String(op && op.opId || ''), key = 'COBRO_' + opId, guardado = store.prop(key);
    if (!guardado && filasCon(store, H.PAGOS, PAG.OPID, opId).length) { borrarPlan(store, opId); return { ok: true, yaExistia: true, opId: opId }; }
    if (!guardado && filasCon(store, H.VENTAS, VEN.VID, opId).length) return { ok: false, ambiguo: true, error: 'Este cobro quedó a medias y necesita revisión. No lo cobres de nuevo: avisá a VAO Sistemas.' };
    if (guardado && JSON.parse(guardado).etapa === 'FIN') { borrarPlan(store, opId); store.delProp(key); return { ok: true, yaExistia: true, opId: opId }; }
    var pg, plan;
    if (guardado) {
      pg = JSON.parse(guardado); plan = leerPlan(store, opId, pg.partes);
      if (!plan) return { ok: false, ambiguo: true, opId: opId, error: 'Este cobro quedó a medias y necesita revisión. No lo cobres de nuevo: avisá a VAO Sistemas.' };
    } else {
      var r = calcularPlan(store, op); if (!r.ok) return r; plan = r.plan;
      var n = guardarPlan(store, opId, plan);
      pg = { etapa: 'PLAN', fecha: ahora.toISOString(), partes: n, stock: {}, clienteId: null, abonos: null, revisar: [], prefijo: store.prefijo || '' };
      store.setProp(key, JSON.stringify(pg));                                     // desde acá el cobro "existe"
    }
    var fecha = new Date(pg.fecha);
    function guardar() { store.setProp(key, JSON.stringify(pg)); }
    function avanzar(e) { pg.etapa = e; guardar(); }
    var abonos = pg.abonos || plan.abonos;

    // STOCK: cada producto se escribe con UNA escritura de la fila: stock nuevo + StockVer+1 + este OpId en StockOps.
    // Así "¿ya se descontó?" se responde mirando la marca, no adivinando por el valor.
    if (pg.etapa === 'PLAN') {
      for (var si = 0; si < plan.stock.length; si++) {
        var s0 = plan.stock[si], qty = s0.antes - s0.despues, e0 = pg.stock[si];
        if (e0 && e0.hecho) continue;
        var fi = store.leer(H.INV)[s0.fila];
        if (!fi || String(fi[INV.NOM]) !== String(s0.nombre) || String(fi[INV.COD]) !== String(s0.codigo)) {
          pg.revisar.push({ nombre: s0.nombre, qty: qty, motivo: 'la fila ya no es ese producto' }); pg.stock[si] = { hecho: true }; guardar(); continue;
        }
        var ops = opsDe(fi), ver = Number(fi[INV.VER]) || 0;
        if (ops.indexOf(opId) >= 0) { pg.stock[si] = { hecho: true }; guardar(); continue; }          // ya estaba escrito
        if (e0 && e0.verAntes != null && ver - e0.verAntes >= OPS_GUARDADAS) {                        // la marca pudo perderse
          pg.revisar.push({ nombre: s0.nombre, qty: qty, motivo: 'corte al descontar y después hubo ' + (ver - e0.verAntes) + ' cambios de stock: no se puede saber' });
          pg.stock[si] = { hecho: true }; guardar(); continue;
        }
        pg.stock[si] = { verAntes: ver }; guardar();                                                  // "voy a escribir"
        var act = Number(fi[INV.STOCK]) || 0, nuevoOps = ops.concat([opId]).slice(-OPS_GUARDADAS).join(' '), cambios = {};
        cambios[INV.STOCK] = act - qty; cambios[INV.VER] = ver + 1; cambios[INV.OPS] = nuevoOps;
        store.escribirFila(H.INV, s0.fila, cambios);                                                  // UNA escritura (setValues del tramo)
        if (act - qty < 0) pg.revisar.push({ nombre: s0.nombre, qty: qty, motivo: 'quedó en negativo (se vendió en el medio)' });
        pg.stock[si] = { hecho: true }; guardar();
      }
      avanzar('STOCK');
    }
    if (pg.etapa === 'STOCK') {
      if (plan.lineas.length && !filasCon(store, H.VENTAS, VEN.VID, opId).length)
        store.agregar(H.VENTAS, plan.lineas.map(function (l) { return [fecha, l.nombre, l.qty, pesos(l.precio), plan.modo, pesos(l.total), opId]; }));
      avanzar('VENTAS');
    }
    if (pg.etapa === 'VENTAS') {
      var fn = plan.fiadoNuevo;
      if (fn && !fn.clienteId) {
        var idN = 'CLI-' + opId;
        if (!filasCon(store, H.CLIENTES, CLI.ID, idN).length) store.agregar(H.CLIENTES, [[fn.cliente, fn.telefono, idN, normCliente(fn.cliente)]]);
        pg.clienteId = idN;
      } else if (fn && fn.completarTel) {
        var cl = store.leer(H.CLIENTES);
        for (var c = 0; c < cl.length; c++) if (cl[c][CLI.ID] === fn.clienteId && !soloDig(cl[c][CLI.TEL])) store.escribir(H.CLIENTES, c, CLI.TEL, fn.completarTel);
      }
      avanzar('CLIENTE');
    }
    if (pg.etapa === 'CLIENTE') {
      var fz = plan.fiadoNuevo;
      if (fz && !filasCon(store, H.FIADOS, FIA.OPID, opId).length) {
        var desc = plan.lineas.slice(0, 3).map(function (l) { return l.qty + 'x ' + l.nombre; }).join(' · ') + (plan.lineas.length > 3 ? ' (+' + (plan.lineas.length - 3) + ')' : '');
        store.agregar(H.FIADOS, [['FIA-' + opId, fecha, opId, fz.cliente, fz.telefono, desc, plan.lineas.reduce(function (s, l) { return s + l.qty; }, 0), pesos(fz.importe), pesos(fz.importe), fz.vencimiento, 'PENDIENTE', '', '', '', fz.clienteId || pg.clienteId, opId]]);
      }
      avanzar('FIADO');
    }
    if (pg.etapa === 'FIADO') {
      if (abonos.length && !filasCon(store, H.ABONOS, ABO.OPID, opId).length) {
        var entra = abonos.every(function (a) { var f = filasCon(store, H.FIADOS, FIA.ID, a.idFiado)[0]; return f && saldoFiadoCts(store, f) >= a.importe; });
        if (!entra) {
          var ab2 = fiadosAbiertos(store, plan.clienteDeuda.id);
          if (plan.idFiadoObjetivo) ab2 = ab2.filter(function (x) { return String(x.fila[FIA.ID]) === plan.idFiadoObjetivo; });
          var r2 = plan.deuda, nuevos = [];
          for (var q = 0; q < ab2.length && r2 > 0; q++) { var im2 = Math.min(ab2[q].saldo, r2); nuevos.push({ idFiado: ab2[q].fila[FIA.ID], importe: im2 }); r2 -= im2; }
          // Si la deuda que queda no alcanza (otro equipo ya la cobró), NO se deja el cobro abierto:
          // se abona lo que se puede y la diferencia queda registrada como "a devolver al cliente".
          abonos = nuevos; pg.abonos = nuevos; pg.aDevolver = r2; guardar();
        }
        store.agregar(H.ABONOS, abonos.map(function (a, n) { return ['AB-' + opId + '-' + (n + 1), fecha, opId, a.idFiado, plan.clienteDeuda.id, pesos(a.importe), plan.origen, plan.lineas.length ? opId : '', '', '']; }));
      }
      avanzar('ABONOS');
    }
    if (pg.etapa === 'ABONOS') {
      if (!filasCon(store, H.PAGOS, PAG.OPID, opId).length) store.agregar(H.PAGOS, filasPagos(plan, fecha, pg.aDevolver || 0, plan.clienteDeuda ? plan.clienteDeuda.nombre : ''));
      avanzar('PAGOS');
    }
    if (pg.etapa === 'PAGOS') {
      if (store.alCompletarPagos) store.alCompletarPagos(plan, opId, fecha, abonos, pg);   // VAO: fila en CAJA_MOVIMIENTOS (sin duplicar)
      var toc = abonos.map(function (a) { return a.idFiado; }); if (plan.fiadoNuevo) toc.push('FIA-' + opId);
      refrescarCache(store, toc, fecha); avanzar('CACHE');
    }
    avanzar('FIN'); borrarPlan(store, opId); store.delProp(key);   // FIN → partes → progreso: un corte en cualquier punto se limpia al reintentar
    var res = resumen(plan);
    if (pg.abonos) res.abonos = pg.abonos.map(function (a) { return { idFiado: a.idFiado, importe: pesos(a.importe) }; });
    if (pg.aDevolver) { res.deuda = pesos(plan.deuda - pg.aDevolver); res.aDevolver = pesos(pg.aDevolver);
      res.avisos.push('Devolverle $' + pesos(pg.aDevolver) + ' a ' + plan.clienteDeuda.nombre + ': esa parte de su deuda ya la había cobrado otro equipo. El cobro quedó registrado.'); }
    res.avisos = res.avisos.concat(pg.revisar.map(function (x) { return 'Revisar stock de ' + x.nombre + ' (' + x.qty + ' u.): ' + x.motivo + '. La venta quedó registrada.'; }));
    return { ok: true, opId: opId, resumen: res };
  }

  // Operaciones interrumpidas: lista para Admin / reintento automático (solo lectura).
  function operacionesEnCurso(store) {
    return Object.keys(store.props).filter(function (k) { return /^COBRO_/.test(k); }).map(function (k) {
      var pg = JSON.parse(store.props[k]); return { opId: k.slice(6), etapa: pg.etapa, desde: pg.fecha };
    });
  }
  // Partes de plan sin progreso (corte antes de crear el cobro): se pueden borrar sin riesgo, no hay nada escrito.
  function partesHuerfanas(store) {
    return Object.keys(store.props).filter(function (k) { var m = /^COBROPLAN_(.+)_\d+$/.exec(k); return m && !store.props['COBRO_' + m[1]]; });
  }

  function refrescarCache(store, ids, hoy) {
    var fi = store.leer(H.FIADOS), set = {}; (ids || []).forEach(function (i) { set[i] = 1; });
    for (var n = 0; n < fi.length; n++) {
      if (ids && !set[fi[n][FIA.ID]]) continue;
      var s = saldoFiadoCts(store, fi[n]), abs = abonosDeFiado(store, fi[n][FIA.ID]), ult = abs.length ? abs[abs.length - 1] : null;
      store.escribir(H.FIADOS, n, FIA.SALDO, pesos(s));
      store.escribir(H.FIADOS, n, FIA.ESTADO, s <= 0 ? 'PAGADO' : (fi[n][FIA.VENC] && new Date(fi[n][FIA.VENC]) < hoy ? 'VENCIDO' : 'PENDIENTE'));
      store.escribir(H.FIADOS, n, FIA.FPAGO, s <= 0 && ult ? ult[ABO.FECHA] : '');
      store.escribir(H.FIADOS, n, FIA.MPAGO, s <= 0 && ult ? ult[ABO.ORIGEN] : '');
    }
  }

  // ── Corrección: anular un abono (fila inversa; la plata se devuelve por el mismo medio;
  //    lo que entró en efectivo —pesos o extranjera— se devuelve en EFECTIVO PESOS) ─────
  function anularAbono(store, opId, idMov, motivo, ahora) {
    ahora = ahora || new Date();
    if (!/^[A-Za-z0-9_\-]{6,64}$/.test(String(opId || ''))) return err('No se pudo identificar la operación. No se registró nada: volvé a intentar.');
    var rev = filasCon(store, H.ABONOS, ABO.OPID, opId)[0];
    if (rev && filasCon(store, H.PAGOS, PAG.OPID, opId).length) {   // ya hecha: se completa lo que pudo faltar tras un corte (caja, copia de lectura)
      if (store.alAnular) store.alAnular(opId, filasCon(store, H.ABONOS, ABO.ID, rev[ABO.REF])[0], filasCon(store, H.PAGOS, PAG.OPID, opId), ahora);
      refrescarCache(store, [rev[ABO.FIADO]], ahora); return { ok: true, yaExistia: true }; }
    var a;
    if (rev) a = filasCon(store, H.ABONOS, ABO.ID, rev[ABO.REF])[0];
    else {
      if (!String(motivo || '').trim()) return err('Escribí el motivo de la anulación. No se anuló nada.');
      a = filasCon(store, H.ABONOS, ABO.ID, idMov)[0];
      if (!a) return err('No se encontró ese abono. No se anuló nada.');
      if (cts(a[ABO.IMP]) <= 0) return err('Ese movimiento no es un abono. No se anuló nada.');
      if (filasCon(store, H.ABONOS, ABO.REF, idMov).length) return err('Ese abono ya estaba anulado. No se hizo nada.');
    }
    var opOrig = a[ABO.OPID], restante = cts(a[ABO.IMP]), disp = {}, orden = [];
    function dev(medio) { return medio === 'EFECTIVO' ? 'EFECTIVO' : medio; }       // efectivo de cualquier moneda → pesos
    filasCon(store, H.PAGOS, PAG.OPID, opOrig).forEach(function (p) {
      var c = cts(p[PAG.ADEUDA]); if (!(c > 0)) return; var m = dev(p[PAG.MEDIO]);
      if (disp[m] == null) { disp[m] = 0; orden.push(m); } disp[m] += c;
    });
    var delOrig = {}; filasCon(store, H.ABONOS, ABO.OPID, opOrig).forEach(function (x) { delOrig[x[ABO.ID]] = 1; });
    store.leer(H.ABONOS).forEach(function (x) {
      if (!delOrig[x[ABO.REF]] || String(x[ABO.OPID]) === opId) return;
      filasCon(store, H.PAGOS, PAG.OPID, x[ABO.OPID]).forEach(function (p) { disp[p[PAG.MEDIO]] = (disp[p[PAG.MEDIO]] || 0) + cts(p[PAG.ADEUDA]); });
    });
    var filas = [];
    orden.forEach(function (m) { if (restante <= 0) return; var x = Math.min(disp[m], restante); if (x <= 0) return; restante -= x;
      filas.push([ahora, opId, '', 'ANULACION', m, 'ARS', -pesos(x), 1, -pesos(x), 0, -pesos(x), 0]); });
    if (restante !== 0) return err('No cuadra la devolución por medio de pago. No se anuló nada: avisá a VAO Sistemas.');
    if (!rev) store.agregar(H.ABONOS, [['AB-' + opId + '-1', ahora, opId, a[ABO.FIADO], a[ABO.CLIID], -Number(a[ABO.IMP]), 'ANULACION', '', a[ABO.ID], String(motivo).trim()]]);
    store.agregar(H.PAGOS, filas);
    if (store.alAnular) store.alAnular(opId, a, filas, ahora);                                  // VAO: egreso en CAJA_MOVIMIENTOS (sin duplicar)
    refrescarCache(store, [a[ABO.FIADO]], ahora);
    return { ok: true, devuelto: filas.map(function (f) { return { medio: f[PAG.MEDIO], importe: -f[PAG.IMP] }; }) };
  }

  // ── Totales (todo por cálculo) ───────────────────────────────────────
  function mismoDia(f, d) { var x = new Date(f); return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth() && x.getDate() === d.getDate(); }
  function sumar(res, k, c) { res[k] = (res[k] || 0) + c; }
  function salida(res) { var o = {}; Object.keys(res).sort().forEach(function (k) { if (res[k]) o[k] = pesos(res[k]); }); return o; }
  // Ventas por medio (ARS): parte VENTA de cada pago; ventas viejas sin PAGOS por su columna Modo.
  function ventasPorMedio(store, dia) {
    var res = {}, conPagos = {};
    store.leer(H.PAGOS).forEach(function (p) {
      if (p[PAG.VID]) conPagos[p[PAG.VID]] = 1;
      if (dia && !mismoDia(p[PAG.FECHA], dia)) return;
      var c = cts(p[PAG.AVENTA]); if (c) sumar(res, clave(p[PAG.MEDIO], p[PAG.MONEDA]), c);
    });
    store.leer(H.VENTAS).forEach(function (v) { if ((v[VEN.VID] && conPagos[v[VEN.VID]]) || (dia && !mismoDia(v[VEN.FECHA], dia))) return; sumar(res, String(v[VEN.MODO] || 'EFECTIVO').toUpperCase(), cts(v[VEN.TOTAL])); });
    return salida(res);
  }
  // Caja por medio (ARS equivalente): todo lo que entró y salió de verdad (sin fiado).
  function cajaPorMedio(store, dia) {
    var res = {}, v = ventasPorMedio(store, null), conPagos = {};
    store.leer(H.PAGOS).forEach(function (p) {
      if (p[PAG.VID]) conPagos[p[PAG.VID]] = 1;
      if (p[PAG.TIPO] === 'FIADO' || (dia && !mismoDia(p[PAG.FECHA], dia))) return;
      sumar(res, clave(p[PAG.MEDIO], p[PAG.MONEDA]), cts(p[PAG.IMP]));
    });
    store.leer(H.VENTAS).forEach(function (vv) { if ((vv[VEN.VID] && conPagos[vv[VEN.VID]]) || (dia && !mismoDia(vv[VEN.FECHA], dia))) return;
      var m = String(vv[VEN.MODO] || 'EFECTIVO').toUpperCase(); if (m !== 'FIADO') sumar(res, m, cts(vv[VEN.TOTAL])); });
    return salida(res);
  }
  // Billetes por moneda en el cajón (en su propia moneda): efectivo recibido − vuelto − devoluciones.
  function cajonPorMoneda(store, dia) {
    var res = {};
    store.leer(H.PAGOS).forEach(function (p) { if (p[PAG.MEDIO] !== 'EFECTIVO' || (dia && !mismoDia(p[PAG.FECHA], dia))) return; sumar(res, p[PAG.MONEDA], cts(p[PAG.MONTO_MON])); });
    return salida(res);
  }

  return { H: H, FIA: FIA, ABO: ABO, PAG: PAG, VEN: VEN, CLI: CLI, INV: INV, MEDIOS: MEDIOS, MONEDAS: MONEDAS, NO_EFECTIVO: NO_EFECTIVO,
           ENC: ENC, clientePorId: clientePorId, calcularPlan: calcularPlan, cobrar: cobrar, operacionesEnCurso: operacionesEnCurso, partesHuerfanas: partesHuerfanas, anularAbono: anularAbono, refrescarCache: refrescarCache, filasPagos: filasPagos,
           saldoClienteCts: saldoClienteCts, saldoFiadoCts: saldoFiadoCts, fiadosAbiertos: fiadosAbiertos, resolverCliente: resolverCliente,
           ventasPorMedio: ventasPorMedio, cajaPorMedio: cajaPorMedio, cajonPorMoneda: cajonPorMoneda, normCliente: normCliente, cts: cts, pesos: pesos };
})();
// <<<MOTOR_COBRO_V041_FIN>>>

// =====================================================================
// v041 — COBROS (motor único), FIADOS EN LIBRO, RESET OPERATIVO, CLIENTES
// SOLO STAGING. Ver PROPUESTA_ETAPA1_STAGING_v041.md.
// =====================================================================

// ── Guarda de entorno: esta versión solo trabaja en la planilla de STAGING ──
var V041_PLANILLA_STAGING_ = '1EacDxrzI2Xix5uRvOKaZdZIYiRlFfv-K9mWGf0KHIzc';
function _guardaEntornoV041_() {
  var id = '';
  try { id = SpreadsheetApp.getActiveSpreadsheet().getId(); } catch (e) { return 'No se pudo verificar la planilla. No se hizo nada.'; }
  return id === V041_PLANILLA_STAGING_ ? null
    : 'Esta versión del sistema (' + SISTEMA.version + ') es solo para la planilla de pruebas (STAGING). No se hizo nada: volvé a instalar la versión anterior en esta planilla.';
}

// ── Mensajes comunes (español claro: qué pasó · si quedó registrado · qué hacer) ──
var MSG41_ = {
  sesion: 'Tu sesión venció. No se registró nada: volvé a entrar con tu PIN.',
  ocupadoGeneral: 'El sistema está terminando otra operación. No se registró nada: esperá unos segundos y volvé a intentar.',
  falloGeneral: 'No se pudo completar el pedido. Si estabas cobrando, no lo cargues de nuevo: tocá Confirmar otra vez (no se duplica). Si se repite, avisá a VAO Sistemas.',
  sinHoja: 'Falta una hoja de este comercio. No se hizo nada: avisá a VAO Sistemas.',
  ocupado: 'El sistema está terminando otra operación. No se registró nada: esperá unos segundos y tocá Confirmar de nuevo (no se va a cobrar dos veces).',
  migracion: 'Los fiados de este comercio se están actualizando. No se registró nada: avisá a VAO Sistemas para que termine la actualización.',
  modulo: 'Esta función no está habilitada para tu comercio. No se registró nada: consultá a VAO Sistemas.',
  interno: 'No se pudo completar la operación. Si se cobró, quedó guardado y se termina al reintentar con Confirmar: no la cargues de nuevo.'
};

// ── Hojas del motor por comercio (se crean al primer uso; columnas solo al final) ──
var V041_COLS_ = {
  INVENTARIO: { desde: 12, enc: ['StockVer', 'StockOps'] },
  FIADOS:     { desde: 15, enc: ['ClienteId', 'OpId'] },
  CLIENTES:   { desde: 3,  enc: ['ClienteId', 'Clave', 'Activo'] }
};
var V041_ANCHO_ = { INVENTARIO: 13, VENTAS: 7, FIADOS: 16, ABONOS: 10, PAGOS: 12, CLIENTES: 5 };

function _hojaCobro_(ss, base, prefijo) {
  var nombre = base + '_' + prefijo, h = ss.getSheetByName(nombre);
  if (h && h.getLastRow() === 0 && base !== 'INVENTARIO') { ss.deleteSheet(h); h = null; }   // creada vacía (corte antes del encabezado): se rehace
  if (!h) {
    if (base === 'PAGOS' || base === 'ABONOS') { _crearHojaConEncabezado_(ss, nombre, MotorCobro.ENC[base]); h = ss.getSheetByName(nombre); }
    else if (base === 'CLIENTES') { crearHojaClientesXX(ss, prefijo); h = ss.getSheetByName(nombre); }
    else if (base === 'FIADOS') { crearHojaFiadosXX(ss, prefijo); h = ss.getSheetByName(nombre); }
    else throw new Error('No existe la hoja ' + nombre);
  }
  var c = V041_COLS_[base];
  if (c) {
    var enc = h.getRange(1, c.desde, 1, c.enc.length).getValues()[0];
    var vacias = enc.every(function (x) { return String(x || '').trim() === ''; });
    var iguales = enc.every(function (x, i) { return String(x || '').trim() === c.enc[i]; });
    if (vacias) h.getRange(1, c.desde, 1, c.enc.length).setValues([c.enc]);
    else if (!iguales) {
      // compatibilidad: CLIENTES sin la columna Activo todavía
      var parcial = enc.slice(0, -1).every(function (x, i) { return String(x || '').trim() === c.enc[i]; }) && String(enc[enc.length - 1] || '').trim() === '';
      if (parcial) h.getRange(1, c.desde + c.enc.length - 1).setValue(c.enc[c.enc.length - 1]);
      else throw new Error('La hoja ' + nombre + ' tiene columnas inesperadas donde van ' + c.enc.join(', ') + '. No se tocó: revisión manual.');
    }
  }
  return h;
}

// Adaptador: la planilla del comercio vista como la "planilla" del motor.
// Cada hoja se lee UNA vez por operación; cada escritura actualiza también la copia en memoria.
// soloLectura = true: para vistas previas y consultas. No crea hojas ni agrega encabezados (una hoja que falta se lee vacía).
function _storeCobro_(prefijo, soloLectura) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sp = PropertiesService.getScriptProperties();
  var hojas = {}, cache = {};
  // Leer nunca escribe: una hoja o columna que falta se lee vacía. Las hojas y encabezados nuevos se crean
  // recién en la PRIMERA escritura (una operación rechazada no deja nada escrito, ni siquiera encabezados).
  function hoja(h) {
    if (hojas[h]) return hojas[h];
    if (soloLectura) throw new Error('store de solo lectura');
    return (hojas[h] = _hojaCobro_(ss, h, prefijo));
  }
  function leer(h) {
    if (!cache[h]) {
      var sh = hojas[h] || ss.getSheetByName(h + '_' + prefijo);
      if (!sh) { cache[h] = []; return cache[h]; }
      var lr = sh.getLastRow(), w = Math.max(sh.getLastColumn(), V041_ANCHO_[h] || 1);
      cache[h] = lr < 2 ? [] : sh.getRange(2, 1, lr - 1, w).getValues();
      cache[h].forEach(function (r) { while (r.length < w) r.push(''); });
    }
    return cache[h];
  }
  function formulaEstado(f) { return '=IF(D' + f + '="";"";IF(L' + f + '<>"";"PAGADO";IF(AND(J' + f + '<>"";TODAY()>J' + f + ');"VENCIDO";"PENDIENTE")))'; }
  var store = {
    prefijo: prefijo,
    leer: leer,
    agregar: function (h, filas) {
      if (soloLectura) throw new Error('store de solo lectura');
      if (!filas.length) return;
      var sh = hoja(h), datos = leer(h), w = 1;
      filas.forEach(function (f) { w = Math.max(w, f.length); });
      var fil = filas.map(function (f) { var r = f.slice(); while (r.length < w) r.push(''); return r; });
      var f0 = datos.length + 2;
      if (h === 'FIADOS') fil = fil.map(function (r, n) { var x = r.slice(); x[MotorCobro.FIA.ESTADO] = formulaEstado(f0 + n);   // Estado = fórmula de siempre
        if (store.nombreEscrito) x[MotorCobro.FIA.CLI] = store.nombreEscrito;   // el fiado guarda el nombre tal como se escribió (regla v040.6); la ficha une por ClienteId
        if (x[MotorCobro.FIA.FECHA] instanceof Date) x[MotorCobro.FIA.FECHA] = Utilities.formatDate(x[MotorCobro.FIA.FECHA], Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');   // mismo formato que v040
        return x; });
      sh.getRange(f0, 1, fil.length, w).setValues(fil);
      if (h === 'VENTAS') { sh.getRange(f0, 1, fil.length, 1).setNumberFormat('dd/mm/yyyy hh:mm'); }
      filas.forEach(function (r) { var x = r.slice(); while (x.length < w) x.push(''); datos.push(x); });   // la copia en memoria guarda los valores
    },
    escribir: function (h, i, c, v) {
      var sh = hoja(h), d = leer(h), F = MotorCobro.FIA, A = MotorCobro.ABO;
      if (h === 'FIADOS' && (c === F.FPAGO || c === F.MPAGO)) {
        var abs = leer('ABONOS').filter(function (a) { return String(a[A.FIADO]) === String(d[i][F.ID]); }), ult = abs.length ? abs[abs.length - 1] : null;
        if (ult && ult[A.ORIGEN] === 'MIGRACION') return;                              // fiado de antes de v041: se conserva lo que mostraba
        if (c === F.FPAGO && v instanceof Date) v = Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
        if (c === F.MPAGO && v && ult) {                                                // medio(s) reales del último pago, no el origen interno
          var med = []; leer('PAGOS').forEach(function (p) { if (String(p[MotorCobro.PAG.OPID]) === String(ult[A.OPID]) && Number(p[MotorCobro.PAG.ADEUDA]) > 0 && med.indexOf(p[MotorCobro.PAG.MEDIO]) === -1) med.push(p[MotorCobro.PAG.MEDIO]); });
          if (med.length) v = med.join(' + ');
        }
        if (String(d[i][c]) === String(v)) return;                                       // sin cambios: no se escribe
      }
      if (h === 'FIADOS' && c === MotorCobro.FIA.ESTADO) sh.getRange(i + 2, c + 1).setFormula(formulaEstado(i + 2));
      else sh.getRange(i + 2, c + 1).setValue(v);
      d[i][c] = v;
    },
    escribirFila: function (h, i, cambios) {                     // UNA escritura (setValues) del tramo que cambia
      var sh = hoja(h), d = leer(h), cols = Object.keys(cambios).map(Number), c0 = Math.min.apply(null, cols), c1 = Math.max.apply(null, cols);
      var fila = d[i].slice(c0, c1 + 1); while (fila.length < c1 - c0 + 1) fila.push('');
      cols.forEach(function (c) { fila[c - c0] = cambios[c]; });
      sh.getRange(i + 2, c0 + 1, 1, fila.length).setValues([fila]);
      cols.forEach(function (c) { d[i][c] = cambios[c]; });
    },
    prop: function (k) { return sp.getProperty(k); },
    setProp: function (k, v) { sp.setProperty(k, v); },
    delProp: function (k) { sp.deleteProperty(k); },
    alCompletarPagos: function (plan, opId, fecha, abonos) { _cajaDeAbonosV041_(prefijo, plan, opId, fecha, abonos); },
    alAnular: function (opId, abono, filas, ahora) { _cajaDeAnulacionV041_(prefijo, opId, abono, filas, ahora); }
  };
  Object.defineProperty(store, 'props', { get: function () { return sp.getProperties(); } });
  var cfg = { plan: 'VAO', avanzado: false, cot: {}, limiteSobrepagoPct: 20 };
  try {
    // Interruptor de STAGING: se lee directo de CONFIG_XX (no está en los planes ni en MODULOS_IMPLEMENTADOS_
    // hasta que exista la pantalla nueva del POS; así no cambian los planes, la página pública ni las altas).
    var conf = leerConfig(prefijo).config;
    cfg.avanzado = conf.extra_cobro_avanzado === true || _esVerdadero_(conf.extra_cobro_avanzado);
    ['USD', 'CLP'].forEach(function (m) { var v = _parseNumeroFlexible41_(conf['cot_' + m]); if (v > 0) cfg.cot[m] = v; });
  } catch (e) {}
  store.cfg = cfg;
  return store;
}
function _parseNumeroFlexible41_(v) {
  if (typeof v === 'number') return v;
  var t = String(v == null ? '' : v).trim().replace(/\s/g, '');
  if (!t) return 0;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, '').replace(',', '.'); else t = t.replace(',', '.');
  var n = Number(t); return isFinite(n) ? n : 0;
}

// ── Caja actual (CAJA_MOVIMIENTOS_XX): una fila por medio de lo pagado a deudas, dentro del mismo cobro y sin duplicar ──
function _cajaYaTieneOp41_(prefijo, opId) {
  var h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CAJA_MOVIMIENTOS_' + prefijo);
  if (!h || h.getLastRow() < 2) return false;
  return h.getRange(2, 1, h.getLastRow() - 1, Math.max(8, h.getLastColumn())).createTextFinder('[' + opId + ']').findAll().length > 0;
}
function _hojaCaja41_(prefijo) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), h = ss.getSheetByName('CAJA_MOVIMIENTOS_' + prefijo);
  if (h && h.getLastRow() === 0) ss.deleteSheet(h);                                   // creada vacía (corte antes del encabezado): se rehace
  return getHojaCajaMovimientos(prefijo);
}
function _cajaDeAbonosV041_(prefijo, plan, opId, fecha, abonos) {
  if (!plan.deuda || _cajaYaTieneOp41_(prefijo, opId)) return;
  var porMedio = {};
  plan.ingresos.forEach(function (x) { if (x.aD > 0) { var m = x.medio + (x.moneda !== 'ARS' ? ' ' + x.moneda : ''); porMedio[m] = (porMedio[m] || 0) + x.aD; } });
  var ids = (abonos || []).map(function (a) { return a.idFiado; }).join(', ');
  var hoja = _hojaCaja41_(prefijo), tz = Session.getScriptTimeZone(), filas = [];
  Object.keys(porMedio).forEach(function (m) {
    filas.push([Utilities.formatDate(fecha, tz, 'yyyy-MM-dd'), Utilities.formatDate(fecha, tz, 'HH:mm'), 'INGRESO',
      'COBRO FIADO — ' + String(plan.clienteDeuda ? plan.clienteDeuda.nombre : '').toUpperCase(), porMedio[m] / 100, m, 'FIADOS', 'Abono ' + ids + ' [' + opId + ']', '']);
  });
  if (filas.length) hoja.getRange(hoja.getLastRow() + 1, 1, filas.length, filas[0].length).setValues(filas);
}
function _cajaDeAnulacionV041_(prefijo, opId, abono, filas, ahora) {
  if (_cajaYaTieneOp41_(prefijo, opId)) return;
  var hoja = _hojaCaja41_(prefijo), tz = Session.getScriptTimeZone(), out = [];
  filas.forEach(function (f) {
    out.push([Utilities.formatDate(ahora, tz, 'yyyy-MM-dd'), Utilities.formatDate(ahora, tz, 'HH:mm'), 'EGRESO',
      'ANULACIÓN DE ABONO — ' + String(abono ? abono[MotorCobro.ABO.FIADO] : ''), -Number(f[MotorCobro.PAG.IMP]), f[MotorCobro.PAG.MEDIO], 'FIADOS', 'Anula ' + (abono ? abono[0] : '') + ' [' + opId + ']', '']);
  });
  if (out.length) hoja.getRange(hoja.getLastRow() + 1, 1, out.length, out[0].length).setValues(out);
}

// ── ¿Hay fiados o clientes sin pasar al libro? (antes de migrar, el motor no los toca) ──
function _migracionPendiente41_(prefijo) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hf = ss.getSheetByName('FIADOS_' + prefijo), hc = ss.getSheetByName('CLIENTES_' + prefijo);
  function sinId(h, colId) {
    if (!h || h.getLastRow() < 2) return false;
    if (h.getLastColumn() < colId) return true;
    return h.getRange(2, 1, h.getLastRow() - 1, colId).getValues().some(function (r) { return String(r[0] || r[1] || '').trim() && !String(r[colId - 1] || '').trim(); });
  }
  return sinId(hf, 15) || sinId(hc, 3);
}

// ── Candado común (mismo de siempre: ScriptLock, 10 s) ──
function _conCandado41_(fn, msgCorte) {
  var lock = LockService.getScriptLock(), tiene = false;
  try { tiene = lock.tryLock(10000); } catch (e) { tiene = false; }
  if (!tiene) return { success: false, ok: false, ocupado: true, error: MSG41_.ocupado };
  try { return fn(); }
  catch (e) {
    if (e && e.limite) return { success: false, ok: false, error: MSG41_.interno, detalle: 'limite' };
    Logger.log('v041 error: ' + (e && e.stack || e));
    return { success: false, ok: false, enProceso: true, error: msgCorte || MSG41_.interno };
  } finally { try { lock.releaseLock(); } catch (e2) {} }
}

// ── Acción cobrar (POS nuevo y página de pruebas) ──
// data = { token, op: { opId, items:[{id (fila de la planilla), codigo, name, qty, precioVenta}], pagos:[{medio, moneda, monto}], fiado?, deuda?, esperado? } }
function _itemsAlMotor41_(prefijo, items) {
  var inv = getHojaInv(prefijo).getDataRange().getValues(), out = [];
  for (var i = 0; i < (items || []).length; i++) {
    var it = items[i], fila = parseInt(it.id, 10);
    if (!fila || fila < 2 || fila > inv.length) return { error: 'No se encontró el producto «' + (it.name || it.id) + '». No se registró nada: actualizá la lista de productos y volvé a agregarlo.' };
    var r = inv[fila - 1], cod = String(r[0] || '').trim().toUpperCase(), nom = String(r[1] || '').trim().toUpperCase();
    if (!_identidadCoincide_(r, it.codigo, it.name)) return { error: 'El inventario cambió: ' + String(it.name || '').toUpperCase() + '. No se registró nada: quitalo y volvé a agregarlo.', identidad: true };
    var precio = (it.precioVenta !== undefined && it.precioVenta !== null && it.precioVenta !== '') ? Number(it.precioVenta) : Number(r[4]) || 0;
    var k = (fila - 2) + '|' + precio, ya = out.filter(function (x) { return x._k === k; })[0];
    if (ya) ya.qty += Number(it.qty);                                                // mismo producto y precio en dos renglones: una sola línea (como v027)
    else out.push({ fila: fila - 2, codigo: r[0], nombre: r[1], qty: Number(it.qty), precio: precio, _cod: cod, _nom: nom, _k: k });
  }
  return { items: out };
}
function _medio41_(m) { m = String(m || '').trim().toUpperCase(); return m === 'TARJETA' ? 'DEBITO' : m; }
function cobrarV041(prefijo, data) {
  var errS = _requiereSesionValida_(prefijo, data.token || ''); if (errS) return { success: false, error: errS };
  var op = data.op || {};
  // Cobrar deuda exige el módulo Fiados (igual que abonarFiado); fiar una compra no (igual que venderFiado en el POS).
  if (op.deuda) { var errMod41 = _verificarModuloAccion_(prefijo, data, 'extra_fiados'); if (errMod41) return { success: false, error: errMod41, moduloNoHabilitado: true }; }
  if (_migracionPendiente41_(prefijo) && (op.fiado || op.deuda)) return { success: false, error: MSG41_.migracion, migracionPendiente: true, definitivo: true };
  return _conCandado41_(function () {
    var store = _storeCobro_(prefijo), mi = _itemsAlMotor41_(prefijo, op.items);
    if (mi.error) return { success: false, definitivo: true, error: mi.error };
    var errItems = _errorItemsVenta_(op.items || [], _reglasNegocio_(prefijo)); if (errItems) return { success: false, definitivo: true, error: errItems };
    var o = { opId: op.opId, items: mi.items, pagos: (op.pagos || []).map(function (p) { return { medio: _medio41_(p.medio), moneda: p.moneda || 'ARS', monto: p.monto }; }),
              fiado: op.fiado || null, deuda: op.deuda || null, esperado: op.esperado || null };
    var r = MotorCobro.cobrar(store, o, new Date());
    return _respuestaCobro41_(r);
  });
}
function previsualizarCobroV041(prefijo, data) {
  var errS = _requiereSesionLectura_(prefijo, data.token || ''); if (errS) return { success: false, error: errS };
  var op = data.op || {}, store = _storeCobro_(prefijo, true), mi = _itemsAlMotor41_(prefijo, op.items);
  if (mi.error) return { success: false, error: mi.error };
  var r = MotorCobro.calcularPlan(store, { opId: op.opId || 'PREVIA00', items: mi.items, pagos: (op.pagos || []).map(function (p) { return { medio: _medio41_(p.medio), moneda: p.moneda || 'ARS', monto: p.monto }; }), fiado: op.fiado || null, deuda: op.deuda || null });
  if (!r.ok) return { success: false, error: r.error, falta: r.falta };
  var p = r.plan;
  return { success: true, esperado: { total: p.total / 100, deuda: p.deuda / 100, fiado: p.fiado / 100, vuelto: p.vuelto / 100, cot: store.cfg.cot }, avisos: p.avisos, ingresos: p.ingresos.map(function (x) { return { medio: x.medio, moneda: x.moneda, importe: x.imp / 100 }; }) };
}
function _respuestaCobro41_(r) {
  if (r.ok) return { success: true, yaExistia: !!r.yaExistia, opId: r.opId, resumen: r.resumen,
    mensaje: r.yaExistia ? 'Este cobro ya estaba registrado. No se cobró de nuevo.' : 'Cobro registrado.' + (r.resumen && r.resumen.vuelto ? ' Vuelto: $' + r.resumen.vuelto + '.' : '') };
  var out = { success: false, error: r.error };
  ['definitivo', 'ambiguo', 'falta', 'saldo', 'cambio', 'abonoMayorQueSaldo', 'clienteDesactivado', 'stockInsuficiente', 'sinDeuda'].forEach(function (k) { if (r[k] !== undefined) out[k] = r[k]; });
  return out;
}

// ── Compatibilidad: las pantallas actuales siguen llamando a venderFiado / abonarFiado / cobrarFiado ──
function venderFiadoV041_(data, prefijo, idOperacion) {
  var props = PropertiesService.getScriptProperties();
  var delMotor = !!props.getProperty('COBRO_' + _opIdMotor41_(idOperacion, 'FV'));                             // cobro v041 empezado: lo termina el motor
  if (!delMotor && props.getProperty('FIADO_OP_' + prefijo + '_' + idOperacion)) return null;          // operación v027 a medias: la termina el camino viejo
  if (!delMotor && _filaTicketFiado_(getHojaFiados(prefijo), idOperacion) && !_filaConOp41_('FIADOS', prefijo, 16, idOperacion)) return null; // fiado viejo ya hecho (columna P = OpId)
  if (_migracionPendiente41_(prefijo)) return { success: false, error: MSG41_.migracion, migracionPendiente: true, definitivo: true };
  var cliente = String(data.cliente || '').trim();
  if (!cliente) return { error: 'Escribí el nombre del cliente. No se registró nada.' };
  var errItems = _errorItemsVenta_(data.items || [], _reglasNegocio_(prefijo));
  if (errItems) return { success: false, definitivo: true, validacion: true, idOperacion: idOperacion, error: errItems };
  var mi = _itemsAlMotor41_(prefijo, data.items);
  if (mi.error) return { success: false, definitivo: true, identidad: !!mi.identidad, idOperacion: idOperacion, error: mi.error };
  var store = _storeCobro_(prefijo);
  store.nombreEscrito = cliente;
  var r = MotorCobro.cobrar(store, { opId: _opIdMotor41_(idOperacion, 'FV'), items: mi.items, pagos: [], fiado: { cliente: cliente, telefono: data.telefono || '', vencimiento: data.vencimiento || '' } }, new Date());
  if (r.ok) {   // mismo formato que v040; yaExistia y avisos solo cuando corresponden
    var ok41 = { success: true, ventaRegistrada: true, fiadoRegistrado: true, idOperacion: idOperacion, idFiado: 'FIA-' + _opIdMotor41_(idOperacion, 'FV') };
    if (r.yaExistia) ok41.yaExistia = true;
    if (r.resumen && r.resumen.avisos && r.resumen.avisos.length) ok41.avisos = r.resumen.avisos;
    return ok41;
  }
  if (r.stockInsuficiente) return { error: 'Stock insuficiente para venta fiada: ' + String(r.error).replace(/^Stock insuficiente: /, '') }; // texto que el POS reconoce (D1)
  if (r.ambiguo) return { success: false, ambiguo: true, idOperacion: idOperacion, error: r.error };
  return { success: false, definitivo: true, idOperacion: idOperacion, error: r.error, clienteDesactivado: r.clienteDesactivado };
}
function _filaConOp41_(base, prefijo, col, valor) {
  var h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(base + '_' + prefijo);
  if (!h || h.getLastRow() < 2 || h.getLastColumn() < col) return 0;
  var f = h.getRange(2, col, h.getLastRow() - 1, 1).createTextFinder(String(valor)).matchEntireCell(true).findAll();
  return f.length ? f[0].getRow() : 0;
}
function _fiadoYCliente41_(prefijo, idFiado) {
  var store = _storeCobro_(prefijo), F = MotorCobro.FIA;
  var f = store.leer('FIADOS').filter(function (x) { return String(x[F.ID]) === String(idFiado); })[0];
  return { store: store, fila: f || null };
}
function _abonoViejoYaHecho41_(fila, idOp) { return !!(idOp && fila && String(fila[MotorCobro.FIA.OBS] || '').indexOf(idOp) !== -1); }
// Id de operación para el motor: el de la pantalla si sirve (6–64 letras, números, _ o -); si no, uno FIJO derivado
// de él (mismo id de pantalla → mismo id de motor, así el reintento sigue sin duplicar).
function _opIdMotor41_(idOp, pre) {
  idOp = String(idOp || '').trim();
  if (/^[A-Za-z0-9_\-]{6,64}$/.test(idOp)) return idOp;
  return idOp ? pre + _hashFuerte_(idOp, 'OPID-' + pre).slice(3, 35) : '';
}
function _opIdAbono41_(idOp) {
  idOp = String(idOp || '').trim();
  if (idOp) return _opIdMotor41_(idOp, 'AB');                                   // mismo id de pantalla → mismo id de motor (reintento seguro)
  return 'AB' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss') + Math.floor(Math.random() * 1e6); // pantallas viejas sin id: como antes, sin protección de reintento
}
function abonarFiadoV041_(prefijo, data) {
  if (!data.idFiado) return { error: 'No se indicó qué fiado se paga. No se registró nada.' };
  if (_migracionPendiente41_(prefijo)) return { success: false, error: MSG41_.migracion, migracionPendiente: true, definitivo: true };
  var x = _fiadoYCliente41_(prefijo, data.idFiado);
  if (!x.fila) return { error: 'No se encontró ese fiado. No se registró nada: actualizá la lista.' };
  if (_abonoViejoYaHecho41_(x.fila, data.idOperacion)) return { success: true, yaExistia: true, nuevoTotal: Number(x.fila[MotorCobro.FIA.SALDO]) || 0 };
  var saldo = MotorCobro.saldoFiadoCts(x.store, x.fila);
  if (saldo <= 0) {
    if (data.idOperacion && _filaConOp41_('PAGOS', prefijo, 2, _opIdAbono41_(data.idOperacion))) return { success: true, yaExistia: true, nuevoTotal: 0 };
    return { error: 'Este fiado ya está saldado. No se registró el pago.', definitivo: true };
  }
  var monto = Number(data.abono) || 0;
  if (!(monto > 0)) return { error: 'Escribí el monto del abono. No se registró nada.' };
  if (Math.round(monto * 100) > saldo + 50) return { error: 'El abono ($' + monto + ') supera el saldo pendiente ($' + saldo / 100 + '). No se registró nada: si paga todo, usá Cobrar total.', definitivo: true, saldo: saldo / 100, abonoMayorQueSaldo: true };
  if (Math.round(monto * 100) > saldo) monto = saldo / 100;                            // diferencia de centavos: se cobra exactamente el saldo (como v040)
  var r = MotorCobro.cobrar(x.store, { opId: _opIdAbono41_(data.idOperacion), items: [], pagos: [{ medio: _medio41_(data.metodoPago || 'EFECTIVO'), monto: monto }],
    deuda: { clienteId: x.fila[MotorCobro.FIA.CLIID], modo: 'SUMAR', monto: monto, idFiado: data.idFiado } }, new Date());
  if (!r.ok) return { error: r.error, definitivo: !!r.definitivo, saldo: r.saldo, abonoMayorQueSaldo: r.abonoMayorQueSaldo };
  var f2 = _fiadoYCliente41_(prefijo, data.idFiado);
  return { success: true, yaExistia: !!r.yaExistia, nuevoTotal: MotorCobro.saldoFiadoCts(f2.store, f2.fila) / 100 };
}
function cobrarFiadoV041_(prefijo, data) {
  if (!data.idFiado) return { error: 'No se indicó qué fiado se cobra. No se registró nada.' };
  if (data.esAbonoParcial) return null;                                                // nota sin plata (camino viejo)
  if (_migracionPendiente41_(prefijo)) return { success: false, error: MSG41_.migracion, migracionPendiente: true, definitivo: true };
  var x = _fiadoYCliente41_(prefijo, data.idFiado);
  if (!x.fila) return { error: 'No se encontró ese fiado. No se registró nada: actualizá la lista.' };
  if (_abonoViejoYaHecho41_(x.fila, data.idOperacion)) return { success: true, yaExistia: true };
  if (data.idOperacion && _filaConOp41_('PAGOS', prefijo, 2, _opIdAbono41_(data.idOperacion))) return { success: true, yaExistia: true };
  var saldo = MotorCobro.saldoFiadoCts(x.store, x.fila);
  if (saldo <= 0) return { error: 'Este fiado ya estaba pagado. No se registró de nuevo.', definitivo: true };
  var r = MotorCobro.cobrar(x.store, { opId: _opIdAbono41_(data.idOperacion), items: [], pagos: [{ medio: _medio41_(data.metodoPago || 'EFECTIVO'), monto: saldo / 100 }],
    deuda: { clienteId: x.fila[MotorCobro.FIA.CLIID], modo: 'SUMAR', idFiado: data.idFiado } }, new Date());
  if (!r.ok) return { error: r.error, definitivo: !!r.definitivo };
  return { success: true, yaExistia: !!r.yaExistia };
}

// ── Anular un abono (acción del comercio, con motivo) ──
function anularAbonoV041(prefijo, data) {
  var errS = _requiereSesionValida_(prefijo, data.token || ''); if (errS) return { success: false, error: errS };
  return _conCandado41_(function () {
    var r = MotorCobro.anularAbono(_storeCobro_(prefijo), data.opId, data.idMov, data.motivo, new Date());
    if (r.ok) return { success: true, yaExistia: !!r.yaExistia, devuelto: r.devuelto || [], mensaje: r.yaExistia ? 'Esa anulación ya estaba hecha. No se repitió.' : 'Abono anulado: la deuda volvió a quedar pendiente y la devolución quedó registrada en la caja.' };
    return { success: false, error: r.error };
  });
}

// ── Consultas (solo lectura) ──
function getCajaV041(prefijo, data) {
  var errS = _requiereSesionLectura_(prefijo, data.token || ''); if (errS) return { success: false, error: errS };
  var store = _storeCobro_(prefijo, true), dia = data.dia ? new Date(data.dia + 'T12:00:00') : new Date();
  // cajaPorMedio ya suma las ventas comunes (VENTAS sin cobro del motor) y los cobros del motor (PAGOS), sin el fiado.
  var caja = MotorCobro.cajaPorMedio(store, dia), fiado = 0;
  store.leer('PAGOS').forEach(function (p) { var f = new Date(p[MotorCobro.PAG.FECHA]); if (p[MotorCobro.PAG.TIPO] === 'FIADO' && f.toDateString() === dia.toDateString()) fiado += Math.round(Number(p[MotorCobro.PAG.IMP]) * 100); });
  return { success: true, dia: Utilities.formatDate(dia, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
           cajaPorMedio: caja, totalCaja: Object.keys(caja).reduce(function (t, m) { return t + Math.round(caja[m] * 100); }, 0) / 100, fiadoDelDia: fiado / 100,
           ventasPorMedio: MotorCobro.ventasPorMedio(store, dia), cajonPorMoneda: MotorCobro.cajonPorMoneda(store, dia) };
}
function getDeudaClienteV041(prefijo, data) {
  var errS = _requiereSesionLectura_(prefijo, data.token || ''); if (errS) return { success: false, error: errS };
  var store = _storeCobro_(prefijo, true), rc = MotorCobro.resolverCliente(store, data.cliente, data.telefono);
  if (rc.ambiguo) return { success: false, error: 'Hay más de un cliente que coincide: ' + rc.ambiguo.join(' / ') + '. Elegí con el teléfono.', ambiguo: rc.ambiguo };
  if (!rc.id) return { success: true, deuda: 0, fiados: [] };
  var ab = MotorCobro.fiadosAbiertos(store, rc.id), F = MotorCobro.FIA;
  return { success: true, clienteId: rc.id, cliente: rc.fila[MotorCobro.CLI.NOM], deuda: ab.reduce(function (s, x) { return s + x.saldo; }, 0) / 100,
           fiados: ab.map(function (x) { return { idFiado: x.fila[F.ID], fecha: x.fila[F.FECHA], original: Number(x.fila[F.ORIG]), saldo: x.saldo / 100, vence: x.fila[F.VENC] }; }) };
}
function getOperacionesEnCursoV041(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión de administrador vencida. Volvé a entrar.' };
  var sp = PropertiesService.getScriptProperties(), props = sp.getProperties();
  var en = Object.keys(props).filter(function (k) { return /^COBRO_/.test(k); }).map(function (k) { var pg = {}; try { pg = JSON.parse(props[k]); } catch (e) {} return { opId: k.slice(6), prefijo: pg.prefijo || '', etapa: pg.etapa, desde: pg.fecha }; });
  var sueltas = Object.keys(props).filter(function (k) { var m = /^COBROPLAN_(.+)_\d+$/.exec(k); return m && !props['COBRO_' + m[1]]; });
  return { success: true, enCurso: en, partesSueltas: sueltas.length };
}
// Partes de plan sin progreso: corte ANTES de que el cobro existiera. No hay nada escrito en hojas: se pueden borrar.
// Solo las de más de 1 hora (para no tocar un cobro que se está guardando en este momento).
function limpiarPartesSueltasV041() {
  var err = _guardaEntornoV041_(); if (err) return { error: err };
  var sp = PropertiesService.getScriptProperties(), props = sp.getProperties(), n = 0;
  Object.keys(props).forEach(function (k) {
    var m = /^COBROPLAN_(.+)_\d+$/.exec(k);
    if (!m || props['COBRO_' + m[1]]) return;
    var t = /(\d{8}-\d{6})/.exec(m[1]); var viejo = true;
    if (t) { var d = t[1]; var f = new Date(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8), +d.slice(9, 11), +d.slice(11, 13), +d.slice(13, 15)); viejo = (new Date() - f) > 3600000; }
    if (viejo) { sp.deleteProperty(k); n++; }
  });
  return { success: true, borradas: n };
}

// ── Cotizaciones (solo administrador; queda historial; vacía = moneda apagada) ──
function setCotizacionV041(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión de administrador vencida. Volvé a entrar.' };
  var prefijo = _normalizarPrefijo_(data.prefijo), moneda = String(data.moneda || '').toUpperCase(), valor = data.valor === '' || data.valor == null ? '' : _parseNumeroFlexible41_(data.valor);
  if (['USD', 'CLP'].indexOf(moneda) === -1) return { error: 'Moneda no reconocida. No se cambió nada.' };
  if (valor !== '' && !(valor > 0 && valor < 1000000)) return { error: 'La cotización no es válida. No se cambió nada: escribí cuántos pesos vale 1 ' + moneda + '.' };
  return _conCandado41_(function () {
    var ss = SpreadsheetApp.getActiveSpreadsheet(), h = ss.getSheetByName('CONFIG_' + prefijo);
    if (!h) return { error: 'No se encontró el comercio ' + prefijo + '. No se cambió nada.' };
    var d = h.getDataRange().getValues(), clave = 'cot_' + moneda, anterior = '', fila = 0;
    for (var i = 1; i < d.length; i++) if (String(d[i][0]).trim() === clave) { fila = i + 1; anterior = d[i][1]; break; }
    if (fila) h.getRange(fila, 2).setValue(valor); else h.appendRow([clave, valor, 'cotización (v041): 1 ' + moneda + ' = $ … · vacía = moneda apagada']);
    var log = ss.getSheetByName('COTIZACIONES_VAO') || (function () { _crearHojaConEncabezado_(ss, 'COTIZACIONES_VAO', ['Fecha', 'Prefijo', 'Moneda', 'Anterior', 'Nueva']); return ss.getSheetByName('COTIZACIONES_VAO'); })();
    log.appendRow([new Date(), prefijo, moneda, anterior, valor]);
    return { success: true, mensaje: valor === '' ? moneda + ' apagado para ' + prefijo + '.' : 'Cotización guardada: 1 ' + moneda + ' = $' + valor + ' para ' + prefijo + '.' };
  });
}

// ── Clientes: desactivar / reactivar / eliminar (solo sin historial) ──
function _filaCliente41_(store, clienteId) {
  var cl = store.leer('CLIENTES'); for (var i = 0; i < cl.length; i++) if (String(cl[i][MotorCobro.CLI.ID]) === String(clienteId)) return i; return -1;
}
function gestionarClienteV041(prefijo, data) {
  var errS = _requiereSesionValida_(prefijo, data.token || ''); if (errS) return { success: false, error: errS };
  if (_migracionPendiente41_(prefijo)) return { success: false, error: MSG41_.migracion, migracionPendiente: true, definitivo: true };
  var accion = String(data.accion || '');
  return _conCandado41_(function () {
    var store = _storeCobro_(prefijo), i = _filaCliente41_(store, data.clienteId), C = MotorCobro.CLI;
    if (i < 0) return { success: false, error: 'No se encontró ese cliente. No se cambió nada.' };
    var fila = store.leer('CLIENTES')[i], nombre = fila[C.NOM];
    if (accion === 'desactivar' || accion === 'reactivar') {
      store.escribir('CLIENTES', i, C.ACTIVO, accion === 'desactivar' ? 'NO' : 'SI');
      return { success: true, mensaje: accion === 'desactivar'
        ? nombre + ' quedó desactivado: se conserva su ficha y su historial, y no se le puede fiar. Si tiene deuda, se le puede seguir cobrando.'
        : nombre + ' quedó activo otra vez.' };
    }
    if (accion === 'eliminar') {
      var F = MotorCobro.FIA, ref = store.leer('FIADOS').some(function (f) { return String(f[F.CLIID]) === String(data.clienteId); }) ||
        store.leer('ABONOS').some(function (a) { return String(a[MotorCobro.ABO.CLIID]) === String(data.clienteId); });
      if (ref) return { success: false, tieneHistorial: true, error: nombre + ' tiene fiados o pagos registrados, así que no se puede eliminar. No se cambió nada: podés desactivarlo, que conserva su historial.' };
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CLIENTES_' + prefijo).deleteRow(i + 2);
      return { success: true, mensaje: nombre + ' fue eliminado (no tenía fiados ni pagos).' };
    }
    return { success: false, error: 'Acción no reconocida. No se cambió nada.' };
  });
}

// ── Migración de fiados existentes al libro (vista previa → confirmación; se puede repetir sin duplicar) ──
// No lee texto ni borra nada: por cada fiado agrega UNA fila MIGRACION en ABONOS = Original − Saldo actual,
// y completa ClienteId/Clave en CLIENTES y ClienteId/OpId en FIADOS.
function _planMigracion41_(prefijo, soloLectura) {
  var store = _storeCobro_(prefijo, soloLectura), F = MotorCobro.FIA, C = MotorCobro.CLI, cl = store.leer('CLIENTES'), fi = store.leer('FIADOS');
  var plan = { clientesConId: [], clientesNuevos: [], fiados: [], abonos: [], anomalias: [], duplicados: [] }, porClave = {};
  cl.forEach(function (c, i) {
    if (!String(c[C.NOM] || '').trim()) return;
    var k = MotorCobro.normCliente(c[C.NOM]), id = String(c[C.ID] || '').trim() || ('CLI-' + prefijo + '-' + (i + 2));
    if (!String(c[C.ID] || '').trim()) {
      var tel = String(c[C.TEL] || '').replace(/\D/g, ''), prev = porClave[k];
      var dup = prev && (!tel || !prev.tel || prev.tel === tel);
      plan.clientesConId.push({ i: i, id: dup ? prev.id : id, clave: k, dup: !!dup });
      if (dup) plan.duplicados.push(c[C.NOM]); else porClave[k] = { id: id, tel: tel };
    } else porClave[k] = porClave[k] || { id: id, tel: String(c[C.TEL] || '').replace(/\D/g, '') };
  });
  function clientePara(nombre, tel) {
    tel = String(tel || '').replace(/\D/g, ''); var k = MotorCobro.normCliente(nombre);
    for (var kk in porClave) if (tel.length >= 6 && porClave[kk].tel === tel) return porClave[kk].id;
    if (porClave[k]) return porClave[k].id;
    var id = 'CLI-' + prefijo + '-N' + (plan.clientesNuevos.length + 1);
    plan.clientesNuevos.push([String(nombre).trim(), tel, id, k, '']); porClave[k] = { id: id, tel: tel }; return id;
  }
  fi.forEach(function (f, i) {
    if (!String(f[F.ID] || '').trim()) return;
    var cid = String(f[F.CLIID] || '').trim() || clientePara(f[F.CLI], f[F.TEL]);
    var orig = Math.round(Number(f[F.ORIG]) * 100), saldoHoy = Math.round(Number(f[F.SALDO]) * 100);
    if (!isFinite(orig) || !isFinite(saldoHoy)) { plan.anomalias.push(f[F.ID] + ': importes no numéricos'); return; }
    var calc = orig - store.leer('ABONOS').filter(function (a) { return String(a[MotorCobro.ABO.FIADO]) === String(f[F.ID]); }).reduce(function (s, a) { return s + Math.round(Number(a[MotorCobro.ABO.IMP]) * 100); }, 0);
    var dif = calc - saldoHoy;
    if (!String(f[F.CLIID] || '').trim()) plan.fiados.push({ i: i, cid: cid, opId: String(f[F.OPID] || '').trim() || ('MIG-' + f[F.ID]) });
    if (dif > 0) plan.abonos.push({ idFiado: f[F.ID], cid: cid, importe: dif, cliente: f[F.CLI], original: orig / 100, saldo: saldoHoy / 100 });
    if (dif < 0) plan.anomalias.push(f[F.ID] + ' (' + f[F.CLI] + '): el saldo guardado ($' + saldoHoy / 100 + ') es mayor que el calculado ($' + calc / 100 + '). Revisión manual: no se tocó.');
  });
  return { store: store, plan: plan };
}
function migrarFiadosV041(prefijo, confirmar) {
  var err = _guardaEntornoV041_(); if (err) return { error: err };
  prefijo = _normalizarPrefijo_(prefijo);
  return _conCandado41_(function () {
    var x = _planMigracion41_(prefijo, !confirmar), p = x.plan, store = x.store;
    var resumen = { prefijo: prefijo, clientesACompletar: p.clientesConId.length, fichasRepetidas: p.duplicados, clientesNuevos: p.clientesNuevos.length,
      fiadosACompletar: p.fiados.length, abonosDeMigracion: p.abonos.map(function (a) { return a.idFiado + ' · ' + a.cliente + ' · original $' + a.original + ' · saldo $' + a.saldo + ' → abono de migración $' + a.importe / 100; }),
      anomalias: p.anomalias };
    if (!confirmar) return { success: true, vistaPrevia: true, resumen: resumen, mensaje: 'Vista previa: no se cambió nada. Si está bien, confirmá la migración.' };
    var C = MotorCobro.CLI, F = MotorCobro.FIA, ahora = new Date();
    p.clientesConId.forEach(function (c) { store.escribirFila('CLIENTES', c.i, (function () { var o = {}; o[C.ID] = c.id; o[C.CLAVE] = c.clave; if (c.dup) o[C.ACTIVO] = 'DUPLICADO'; return o; })()); });
    if (p.clientesNuevos.length) store.agregar('CLIENTES', p.clientesNuevos);
    p.fiados.forEach(function (f) { var o = {}; o[F.CLIID] = f.cid; o[F.OPID] = f.opId; store.escribirFila('FIADOS', f.i, o); });
    if (p.abonos.length) store.agregar('ABONOS', p.abonos.map(function (a) { return ['MIG-' + a.idFiado + '-' + Utilities.formatDate(ahora, Session.getScriptTimeZone(), 'yyyyMMddHHmmss'), ahora, 'MIG-' + a.idFiado, a.idFiado, a.cid, a.importe / 100, 'MIGRACION', '', '', 'Saldo anterior a v041']; }));
    MotorCobro.refrescarCache(store, p.abonos.map(function (a) { return a.idFiado; }), ahora);
    var ver = _planMigracion41_(prefijo, true).plan;
    return { success: true, resumen: resumen, controlOk: ver.abonos.length === 0 && ver.fiados.length === 0 && ver.clientesConId.length === 0,
             mensaje: 'Migración hecha. Los saldos de los fiados quedaron iguales a los de antes.' + (p.anomalias.length ? ' Hay ' + p.anomalias.length + ' fiado(s) para revisar a mano (no se tocaron).' : '') };
  }, 'La migración se interrumpió. No se perdió nada: volvé a ejecutar migrarFiadosV041 con confirmar = true y termina lo que falta (no duplica).');
}

// ── Preparar la planilla para v041 (vista previa → confirmación) ──
function prepararV041(confirmar) {
  var err = _guardaEntornoV041_(); if (err) return { error: err };
  var ss = SpreadsheetApp.getActiveSpreadsheet(), cambios = [];
  ss.getSheets().forEach(function (h) {
    var m = /^CONFIG_([A-Z]{2,3})$/.exec(h.getName()); if (!m) return;
    var d = h.getDataRange().getValues(), tiene = {};
    d.forEach(function (r) { tiene[String(r[0]).trim()] = true; });
    ['extra_cobro_avanzado', 'cot_USD', 'cot_CLP'].forEach(function (k) { if (!tiene[k]) cambios.push({ hoja: h.getName(), clave: k }); });
  });
  if (!confirmar) return { success: true, vistaPrevia: true, agregar: cambios.map(function (c) { return c.hoja + ' ← ' + c.clave; }), mensaje: 'Vista previa: no se cambió nada.' };
  cambios.forEach(function (c) {
    var h = ss.getSheetByName(c.hoja);
    h.appendRow([c.clave, c.clave === 'extra_cobro_avanzado' ? 'FALSE' : '', c.clave === 'extra_cobro_avanzado' ? 'cobro avanzado: mixto, monedas, deuda en caja (v041)' : 'cotización (v041): vacía = moneda apagada']);
  });
  return { success: true, agregadas: cambios.length, mensaje: 'Listo: se agregaron ' + cambios.length + ' clave(s). El cobro avanzado quedó apagado en todos los comercios.' };
}

// ── Inventario: verificación de solo lectura antes de vender ──
function verificarInventarioV041(prefijo) {
  prefijo = _normalizarPrefijo_(prefijo);
  var h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('INVENTARIO_' + prefijo);
  if (!h) return { error: 'No existe el inventario de ' + prefijo + '.' };
  var d = h.getDataRange().getValues(), enc = d[0] || [], prob = [], cods = {}, n = 0;
  var esperadas = ['Código', 'Producto', 'Stock', 'P.Costo', 'P.Venta'];
  esperadas.forEach(function (e, i) { if (String(enc[i] || '').trim() !== e) prob.push('Encabezado de la columna ' + String.fromCharCode(65 + i) + ': dice «' + enc[i] + '», debería decir «' + e + '». No muevas ni renombres columnas.'); });
  if (enc.length > 11 && String(enc[11] || '') && String(enc[11]) !== 'StockVer') prob.push('La columna L debería ser StockVer (técnica de v041).');
  for (var i = 1; i < d.length; i++) {
    var r = d[i]; if (!String(r[0] || '').trim() && !String(r[1] || '').trim()) continue; n++;
    var f = 'Fila ' + (i + 1) + ' (' + (r[1] || 'sin nombre') + '): ', cod = String(r[0] || '').trim().toUpperCase();
    if (!cod) prob.push(f + 'falta el código.'); else if (cods[cod]) prob.push(f + 'el código ' + cod + ' está repetido (fila ' + cods[cod] + ').'); else cods[cod] = i + 1;
    if (!String(r[1] || '').trim()) prob.push(f + 'falta el nombre.');
    if (r[2] === '' || isNaN(Number(r[2])) || Number(r[2]) < 0 || Math.round(Number(r[2])) !== Number(r[2])) prob.push(f + 'el stock debe ser un número entero de 0 o más.');
    if (r[4] === '' || isNaN(Number(r[4])) || Number(r[4]) <= 0) prob.push(f + 'el precio de venta debe ser un número mayor que 0.');
    if (r[3] !== '' && (isNaN(Number(r[3])) || Number(r[3]) < 0)) prob.push(f + 'el costo no es un número válido.');
    if (enc.length > 12 && String(r[12] || '') && !/^[A-Za-z0-9_\- ]*$/.test(String(r[12]))) prob.push(f + 'la columna M (StockOps) fue editada: dejala como estaba.');
  }
  return { success: true, productos: n, problemas: prob, listo: prob.length === 0,
           mensaje: prob.length ? 'Hay ' + prob.length + ' cosa(s) para corregir antes de vender. No se cambió nada.' : 'El inventario está listo para vender (' + n + ' productos). No se cambió nada.' };
}

// =====================================================================
// RESET OPERATIVO DEL COMERCIO (solo STAGING; solo desde el editor de Apps Script)
// No borra: ARCHIVA. Cada hoja operativa se renombra a ARCH_<PREF>_<id>_<HOJA> y se crea una vacía
// con el mismo encabezado. Diario en propiedades: un corte se retoma con el mismo idReset y nunca
// queda una hoja a medio borrar. Se puede deshacer con deshacerResetV041.
// =====================================================================
var RESET41_HOJAS_ = ['VENTAS_', 'PAGOS_', 'ABONOS_', 'FIADOS_', 'CAJA_MOVIMIENTOS_', 'SALIDAS_'];   // siempre juntas (dependen entre sí)
var RESET41_OPCIONALES_ = ['CLIENTES_', 'HISTORIAL_', 'AJUSTE_RAPIDO_', 'PRESTAMOS_'];
// No se tocan nunca: INVENTARIO_, CONFIG_, CONF_DIARIA_ y las hojas del sistema (VENDEDORES, CLIENTES_VAO, PLANES_VAO, PAGOS_VAO, …).
// CLIENTES_ solo se puede incluir junto con FIADOS_ (que siempre va): así no quedan referencias rotas.

function configurarClavesResetV041(numero, palabra) {
  var err = _guardaEntornoV041_(); if (err) return err;
  numero = String(numero || ''); palabra = String(palabra || '');
  if (!/^\d{6,12}$/.test(numero)) return 'La clave numérica debe tener entre 6 y 12 números. No se guardó nada.';
  if (!/^[A-Za-zÁÉÍÓÚÑáéíóúñ]{6,30}$/.test(palabra)) return 'La palabra clave debe tener entre 6 y 30 letras, sin espacios ni números. No se guardó nada.';
  var sp = PropertiesService.getScriptProperties();
  sp.setProperty('RESET41_NUM', _hashFuerte_(numero, 'RESET-NUM'));
  sp.setProperty('RESET41_PAL', _hashFuerte_(palabra.toUpperCase(), 'RESET-PAL'));
  return 'Claves de reset guardadas (solo se guardan cifradas). Anotalas en un lugar seguro.';
}
function _hojasReset41_(prefijo, opcionales) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), lista = RESET41_HOJAS_.slice();
  (opcionales || []).forEach(function (o) { o = String(o).toUpperCase().replace(/_?$/, '_'); if (RESET41_OPCIONALES_.indexOf(o) !== -1 && lista.indexOf(o) === -1) lista.push(o); });
  return lista.map(function (b) { var h = ss.getSheetByName(b + prefijo); return { base: b, nombre: b + prefijo, existe: !!h, filas: h ? Math.max(0, h.getLastRow() - 1) : 0 }; });
}
function resetVistaPreviaV041(prefijo, opcionales) {
  var err = _guardaEntornoV041_(); if (err) return { error: err };
  prefijo = _normalizarPrefijo_(prefijo);
  if (!obtenerInfoCliente(prefijo)) return { error: 'No existe el comercio ' + prefijo + '. No se hizo nada.' };
  var hojas = _hojasReset41_(prefijo, opcionales), enCurso = _opsDelComercio41_(prefijo);
  return { success: true, vistaPrevia: true, comercio: prefijo,
    seArchivan: hojas.map(function (h) { return h.nombre + ': ' + h.filas + ' fila(s)' + (h.existe ? '' : ' (no existe, se omite)'); }),
    seConservan: ['INVENTARIO_' + prefijo + ' (productos y stock)', 'CONFIG_' + prefijo + ' (datos, plan, módulos, preferencias, cotizaciones)', 'CONF_DIARIA_' + prefijo, 'PIN, sesiones y permisos', 'registro en VENDEDORES / CLIENTES_VAO / PLANES_VAO / PAGOS_VAO', (opcionales || []).map(String).join(' ').toUpperCase().indexOf('CLIENTES') === -1 ? 'CLIENTES_' + prefijo + ' (fichas de clientes)' : ''].filter(Boolean),
    operacionesEnCurso: enCurso, bloqueado: enCurso.length > 0,
    mensaje: enCurso.length ? 'Hay ' + enCurso.length + ' cobro(s) sin terminar en ' + prefijo + '. No se puede resetear hasta terminarlos.' : 'Vista previa: no se cambió nada. Nada se borra: las hojas se archivan y se pueden recuperar.' };
}
function _opsDelComercio41_(prefijo) {
  var props = PropertiesService.getScriptProperties().getProperties();
  return Object.keys(props).filter(function (k) { if (!/^COBRO_/.test(k)) return false; try { return JSON.parse(props[k]).prefijo === prefijo; } catch (e) { return false; } }).map(function (k) { return k.slice(6); });
}
function resetEjecutarV041(prefijo, claveNumero, clavePalabra, confirmacion, opcionales, idReset) {
  var err = _guardaEntornoV041_(); if (err) return { error: err };
  prefijo = _normalizarPrefijo_(prefijo);
  var sp = PropertiesService.getScriptProperties(), kDiario = 'RESET41_EN_CURSO_' + prefijo, diario = sp.getProperty(kDiario);
  var kInt = 'RESET41_INTENTOS', intentos = JSON.parse(sp.getProperty(kInt) || '{"n":0,"hasta":0}');
  if (intentos.hasta > Date.now()) return { error: 'Demasiados intentos con claves incorrectas. Esperá 30 minutos. No se hizo nada.' };
  if (!sp.getProperty('RESET41_NUM') || !sp.getProperty('RESET41_PAL')) return { error: 'Primero configurá las dos claves de reset (configurarClavesResetV041). No se hizo nada.' };
  var okClaves = _hashCoincide_(String(claveNumero || ''), sp.getProperty('RESET41_NUM'), 'RESET-NUM') && _hashCoincide_(String(clavePalabra || '').toUpperCase(), sp.getProperty('RESET41_PAL'), 'RESET-PAL');
  if (!okClaves) {
    intentos.n++; if (intentos.n >= 3) { intentos = { n: 0, hasta: Date.now() + 30 * 60000 }; }
    sp.setProperty(kInt, JSON.stringify(intentos));
    return { error: 'Alguna de las dos claves no es correcta. No se hizo nada.' };
  }
  sp.deleteProperty(kInt);
  if (String(confirmacion || '').trim() !== 'ARCHIVAR OPERACIONES DE ' + prefijo) return { error: 'Para confirmar escribí exactamente: ARCHIVAR OPERACIONES DE ' + prefijo + '. No se hizo nada.' };
  return _conCandado41_(function () {
    var ss = SpreadsheetApp.getActiveSpreadsheet(), d;
    if (diario) d = JSON.parse(diario);
    else {
      if (!obtenerInfoCliente(prefijo)) return { error: 'No existe el comercio ' + prefijo + '. No se hizo nada.' };
      var enCurso = _opsDelComercio41_(prefijo);
      if (enCurso.length) return { error: 'Hay ' + enCurso.length + ' cobro(s) sin terminar en ' + prefijo + '. No se hizo nada: terminalos y volvé a intentar.' };
      idReset = String(idReset || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyMMddHHmm'));
      var quien = ''; try { quien = Session.getEffectiveUser().getEmail(); } catch (e) {}
      d = { idReset: idReset, fecha: new Date().toISOString(), quien: quien || 'editor de Apps Script', hojas: _hojasReset41_(prefijo, opcionales).filter(function (h) { return h.existe; }).map(function (h) { return { base: h.base, filas: h.filas, paso: 0 }; }) };
      sp.setProperty(kDiario, JSON.stringify(d));
    }
    d.hojas.forEach(function (h) {
      var nombre = h.base + prefijo, arch = ('ARCH_' + prefijo + '_' + d.idReset + '_' + h.base.replace(/_$/, '')).slice(0, 99);
      if (h.paso === 0) {
        var orig = ss.getSheetByName(nombre), yaArch = ss.getSheetByName(arch);
        if (orig && !yaArch) { h.enc = orig.getRange(1, 1, 1, Math.max(1, orig.getLastColumn())).getValues()[0]; sp.setProperty(kDiario, JSON.stringify(d)); orig.setName(arch); }
        h.paso = 1; sp.setProperty(kDiario, JSON.stringify(d));
      }
      if (h.paso === 1) {
        var a = ss.getSheetByName(arch), enc = h.enc || (a ? a.getRange(1, 1, 1, Math.max(1, a.getLastColumn())).getValues()[0] : ['']);
        var nueva = ss.getSheetByName(nombre);
        if (!nueva) _crearHojaConEncabezado_(ss, nombre, enc);
        else if (nueva.getLastRow() === 0) { nueva.getRange(1, 1, 1, enc.length).setValues([enc]); nueva.getRange(1, 1, 1, enc.length).setFontWeight('bold'); }   // se cortó antes del encabezado
        h.paso = 2; sp.setProperty(kDiario, JSON.stringify(d));
      }
    });
    var reg = ss.getSheetByName('RESETS_VAO') || (function () { _crearHojaConEncabezado_(ss, 'RESETS_VAO', ['Fecha', 'Comercio', 'IdReset', 'Quién', 'Hojas archivadas (filas)', 'Estado']); return ss.getSheetByName('RESETS_VAO'); })();
    var yaReg = reg.getLastRow() > 1 && reg.getRange(2, 3, reg.getLastRow() - 1, 1).createTextFinder(d.idReset).matchEntireCell(true).findAll().some(function (c) { return reg.getRange(c.getRow(), 2).getValue() === prefijo; });
    if (!yaReg) reg.appendRow([new Date(d.fecha), prefijo, d.idReset, d.quien, d.hojas.map(function (h) { return h.base + prefijo + ' (' + h.filas + ')'; }).join(' · '), 'HECHO']);
    sp.deleteProperty(kDiario);
    return { success: true, idReset: d.idReset, mensaje: 'Listo: las operaciones de ' + prefijo + ' quedaron archivadas (' + d.hojas.length + ' hojas) y el comercio quedó listo para empezar. Nada se borró: para recuperarlo, usá deshacerResetV041("' + prefijo + '", "' + d.idReset + '").' };
  }, 'El reset se interrumpió. No se perdió nada (las hojas se archivan, no se borran): volvé a ejecutar resetEjecutarV041 con los mismos datos y termina donde quedó.');
}
function deshacerResetV041(prefijo, idReset) {
  var err = _guardaEntornoV041_(); if (err) return { error: err };
  prefijo = _normalizarPrefijo_(prefijo);
  return _conCandado41_(function () {
    var ss = SpreadsheetApp.getActiveSpreadsheet(), hechos = [], problemas = [];
    RESET41_HOJAS_.concat(RESET41_OPCIONALES_).forEach(function (b) {
      var arch = ss.getSheetByName(('ARCH_' + prefijo + '_' + idReset + '_' + b.replace(/_$/, '')).slice(0, 99)); if (!arch) return;
      var actual = ss.getSheetByName(b + prefijo);
      if (actual && actual.getLastRow() > 1) { problemas.push(b + prefijo + ' ya tiene ' + (actual.getLastRow() - 1) + ' fila(s) nuevas: no se reemplaza'); return; }
      if (actual) actual.setName(('VACIA_' + prefijo + '_' + idReset + '_' + b.replace(/_$/, '')).slice(0, 99));
      arch.setName(b + prefijo); hechos.push(b + prefijo);
    });
    return { success: problemas.length === 0, recuperadas: hechos, problemas: problemas,
             mensaje: problemas.length ? 'Se recuperaron ' + hechos.length + ' hoja(s). ' + problemas.join(' · ') + '. Revisión manual.' : 'Reset deshecho: se recuperaron ' + hechos.length + ' hoja(s).' };
  });
}

// =====================================================================
// MENÚ "VAO v041 (STAGING)" en la planilla — solo lo ven quienes pueden EDITAR la planilla
// (el comercio usa la web y no tiene acceso). Cada paso muestra antes lo que va a hacer.
// =====================================================================
function onOpen() {
  if (_guardaEntornoV041_()) return;                                           // otra planilla: no se agrega nada
  SpreadsheetApp.getUi().createMenu('VAO POS (STAGING)')
    .addItem('1. Qué versión hay instalada', 'v041MenuInfo')
    .addItem('2. Preparar la planilla para v041', 'v041MenuPreparar')
    .addItem('3. Pasar los fiados de un comercio al libro', 'v041MenuMigrar')
    .addItem('4. Verificar el inventario de un comercio', 'v041MenuInventario')
    .addSeparator()
    .addItem('Cobros sin terminar', 'v041MenuEnCurso')
    .addSeparator()
    .addItem('Reset: configurar las dos claves', 'v041MenuClaves')
    .addItem('Reset operativo de un comercio', 'v041MenuReset')
    .addItem('Deshacer un reset', 'v041MenuDeshacer')
    .addToUi();
}
function _ui41_() { return SpreadsheetApp.getUi(); }
function _pedir41_(titulo, texto) {
  var ui = _ui41_(), r = ui.prompt(titulo, texto, ui.ButtonSet.OK_CANCEL);
  return r.getSelectedButton() === ui.Button.OK ? String(r.getResponseText() || '').trim() : null;
}
function _avisar41_(titulo, obj) {
  var t = typeof obj === 'string' ? obj : (obj.error ? '❌ ' + obj.error : (obj.mensaje || '') + '\n\n' + JSON.stringify(obj.resumen || obj.agregar || obj.seArchivan || obj.problemas || obj.enCurso || '', null, 1).slice(0, 1800));
  _ui41_().alert(titulo, t, _ui41_().ButtonSet.OK);
}
function _siNo41_(titulo, texto) { var ui = _ui41_(); return ui.alert(titulo, texto, ui.ButtonSet.YES_NO) === ui.Button.YES; }
function v041MenuInfo() {
  var i = getInfo(); _avisar41_('Versión', 'Versión: ' + i.version + '\nPlanilla: ' + i.planillaActiva + '\nEntorno: ' + SISTEMA.entorno);
}
function v041MenuPreparar() {
  var p = prepararV041(false); if (p.error) return _avisar41_('Preparar', p);
  if (!p.agregar.length) return _avisar41_('Preparar', 'No hace falta nada: la planilla ya está preparada.');
  if (!_siNo41_('Preparar — vista previa', 'Se agregan estas claves al final de cada CONFIG (cobro avanzado APAGADO, cotizaciones vacías):\n\n' + p.agregar.join('\n') + '\n\n¿Confirmás?')) return _avisar41_('Preparar', 'No se cambió nada.');
  _avisar41_('Preparar', prepararV041(true));
}
function v041MenuMigrar() {
  var pref = _pedir41_('Fiados al libro', 'Prefijo del comercio (ej. JOF):'); if (!pref) return;
  var v = migrarFiadosV041(pref, false); if (v.error) return _avisar41_('Fiados al libro', v);
  var r = v.resumen, txt = 'Comercio ' + r.prefijo + '\n· Fichas de clientes a completar: ' + r.clientesACompletar + '\n· Fichas repetidas (se unen, no se borran): ' + (r.fichasRepetidas.join(', ') || 'ninguna') +
    '\n· Clientes nuevos: ' + r.clientesNuevos + '\n· Fiados a completar: ' + r.fiadosACompletar + '\n· Abonos de migración:\n  ' + (r.abonosDeMigracion.join('\n  ') || 'ninguno') + '\n· Para revisar a mano (no se tocan):\n  ' + (r.anomalias.join('\n  ') || 'ninguno');
  if (!_siNo41_('Fiados al libro — vista previa (no se cambió nada)', txt.slice(0, 1700) + '\n\n¿Confirmás? Los saldos quedan iguales.')) return _avisar41_('Fiados al libro', 'No se cambió nada.');
  _avisar41_('Fiados al libro', migrarFiadosV041(pref, true));
}
function v041MenuInventario() {
  var pref = _pedir41_('Inventario', 'Prefijo del comercio:'); if (!pref) return;
  var r = verificarInventarioV041(pref); if (r.error) return _avisar41_('Inventario', r);
  _avisar41_('Inventario', r.mensaje + (r.problemas.length ? '\n\n' + r.problemas.slice(0, 25).join('\n') + (r.problemas.length > 25 ? '\n… y ' + (r.problemas.length - 25) + ' más' : '') : ''));
}
function v041MenuEnCurso() {
  var props = PropertiesService.getScriptProperties().getProperties();
  var l = Object.keys(props).filter(function (k) { return /^COBRO_/.test(k); }).map(function (k) { var p = {}; try { p = JSON.parse(props[k]); } catch (e) {} return k.slice(6) + ' · ' + (p.prefijo || '') + ' · etapa ' + p.etapa; });
  _avisar41_('Cobros sin terminar', l.length ? l.join('\n') + '\n\nSe terminan solos cuando el comercio toca Confirmar con el mismo cobro.' : 'No hay cobros sin terminar.');
}
function v041MenuClaves() {
  var n = _pedir41_('Clave numérica del reset', 'Entre 6 y 12 números (anotala aparte):'); if (n === null) return;
  var w = _pedir41_('Palabra clave del reset', 'Entre 6 y 30 letras, sin espacios (anotala aparte):'); if (w === null) return;
  _avisar41_('Claves del reset', configurarClavesResetV041(n, w));
}
function v041MenuReset() {
  var pref = _pedir41_('Reset operativo', 'Prefijo del comercio:'); if (!pref) return;
  var opc = _pedir41_('Reset operativo', 'Hojas opcionales para archivar también (separadas por coma; vacío = ninguna).\nPosibles: CLIENTES, HISTORIAL, AJUSTE_RAPIDO, PRESTAMOS'); if (opc === null) return;
  var lista = opc ? opc.split(',').map(function (x) { return x.trim().toUpperCase(); }).filter(Boolean) : [];
  var v = resetVistaPreviaV041(pref, lista); if (v.error) return _avisar41_('Reset', v);
  if (v.bloqueado) return _avisar41_('Reset', v.mensaje);
  if (!_siNo41_('Reset — vista previa (no se cambió nada)', 'Se ARCHIVAN (no se borran):\n' + v.seArchivan.join('\n') + '\n\nSe conservan:\n' + v.seConservan.join('\n') + '\n\n¿Seguir?')) return _avisar41_('Reset', 'No se cambió nada.');
  var n = _pedir41_('Reset — clave numérica', 'Clave numérica:'); if (n === null) return;
  var w = _pedir41_('Reset — palabra clave', 'Palabra clave:'); if (w === null) return;
  var c = _pedir41_('Reset — confirmación', 'Para confirmar escribí exactamente:\nARCHIVAR OPERACIONES DE ' + _normalizarPrefijo_(pref)); if (c === null) return;
  _avisar41_('Reset', resetEjecutarV041(pref, n, w, c, lista));
}
function v041MenuDeshacer() {
  var pref = _pedir41_('Deshacer reset', 'Prefijo del comercio:'); if (!pref) return;
  var id = _pedir41_('Deshacer reset', 'Id del reset (está en la hoja RESETS_VAO, columna C):'); if (!id) return;
  _avisar41_('Deshacer reset', deshacerResetV041(pref, id));
}


// =====================================================================
// v042 — CONEXIÓN CON LAS PANTALLAS (POS V39, Fiados V6, Admin, Reportes)
// =====================================================================

// Lo que la pantalla necesita saber del cobro (va FUERA de config, así getConfig no cambia para las pantallas viejas).
function _infoCobroV042_(prefijo) {
  var out = { avanzado: false, cot: {} };
  try {
    var conf = leerConfig(prefijo).config;
    out.avanzado = conf.extra_cobro_avanzado === true || _esVerdadero_(conf.extra_cobro_avanzado);
    ['USD', 'CLP'].forEach(function (m) { var v = _parseNumeroFlexible41_(conf['cot_' + m]); if (v > 0) out.cot[m] = v; });
  } catch (e) {}
  return out;
}

// Ficha del cliente para la pantalla Fiados: estado, deuda calculada y los últimos movimientos (solo lectura).
function getFichaClienteV042(prefijo, data) {
  var errS = _requiereSesionLectura_(prefijo, data.token || ''); if (errS) return { success: false, error: errS };
  var store = _storeCobro_(prefijo, true), C = MotorCobro.CLI, A = MotorCobro.ABO, P = MotorCobro.PAG;
  var rc = data.clienteId ? MotorCobro.clientePorId(store, data.clienteId) : MotorCobro.resolverCliente(store, data.cliente, data.telefono);
  if (rc.ambiguo) return { success: false, error: 'Hay más de un cliente que coincide: ' + rc.ambiguo.join(' / ') + '. Elegí con el teléfono.', ambiguo: rc.ambiguo };
  if (!rc.id || !rc.fila) return { success: true, sinFicha: true, migracionPendiente: _migracionPendiente41_(prefijo) };
  var abiertos = MotorCobro.fiadosAbiertos(store, rc.id), tz = Session.getScriptTimeZone();
  var todos = store.leer('ABONOS').filter(function (a) { return String(a[A.CLIID]) === String(rc.id); });
  var anulados = {}; todos.forEach(function (a) { if (a[A.ORIGEN] === 'ANULACION' && a[A.REF]) anulados[a[A.REF]] = a[A.MOTIVO] || 'anulado'; });
  var pagos = store.leer('PAGOS');
  var movs = todos.filter(function (a) { return Number(a[A.IMP]) > 0; }).map(function (a) {
    var medios = []; pagos.forEach(function (p) { if (String(p[P.OPID]) === String(a[A.OPID]) && Number(p[P.ADEUDA]) > 0 && medios.indexOf(p[P.MEDIO]) === -1) medios.push(p[P.MEDIO]); });
    var f = a[A.FECHA] instanceof Date ? a[A.FECHA] : new Date(a[A.FECHA]);
    return { idMov: a[A.ID], fecha: isNaN(f.getTime()) ? String(a[A.FECHA]) : Utilities.formatDate(f, tz, 'dd/MM/yyyy HH:mm'), idFiado: a[A.FIADO], importe: Number(a[A.IMP]),
             origen: a[A.ORIGEN], medios: medios, anulado: !!anulados[a[A.ID]], motivoAnulacion: anulados[a[A.ID]] || '',
             anulable: !anulados[a[A.ID]] && a[A.ORIGEN] !== 'MIGRACION' && medios.length > 0 };
  }).reverse().slice(0, 30);
  var act = String(rc.fila[C.ACTIVO] || '').toUpperCase();
  return { success: true, clienteId: rc.id, nombre: rc.fila[C.NOM], telefono: String(rc.fila[C.TEL] || ''), activo: act !== 'NO',
           deuda: abiertos.reduce(function (s, x) { return s + x.saldo; }, 0) / 100, cantAbiertos: abiertos.length,
           tieneHistorial: store.leer('FIADOS').some(function (x) { return String(x[MotorCobro.FIA.CLIID]) === String(rc.id); }) || todos.length > 0,
           movimientos: movs };
}

// Admin: estado del cobro de un comercio (interruptor, cotizaciones, cobros sin terminar) y uso de la planilla.
function getEstadoCobroV042(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión de administrador vencida. Volvé a entrar.' };
  var prefijo = _normalizarPrefijo_(data.prefijo), ss = SpreadsheetApp.getActiveSpreadsheet();
  var out = { success: true, prefijo: prefijo, usoPlanilla: _usoPlanillaV042_() };
  if (prefijo) {
    if (!ss.getSheetByName('CONFIG_' + prefijo)) return { error: 'No se encontró el comercio ' + prefijo + '.' };
    out.cobro = _infoCobroV042_(prefijo);
    out.migracionPendiente = _migracionPendiente41_(prefijo);
    out.enCurso = _opsDelComercio41_(prefijo);
  }
  return out;
}
function _usoPlanillaV042_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), total = 0, hojas = 0;
  ss.getSheets().forEach(function (h) { hojas++; total += h.getMaxRows() * h.getMaxColumns(); });
  return { celdas: total, limite: 10000000, hojas: hojas, porcentaje: Math.round(total / 100000) / 1, aviso: total > 8000000 ? 'La planilla pasó el 80% del límite de Google (10 millones de celdas). Conviene abrir una planilla nueva para los próximos comercios.' : '' };
}

// Admin: prender o apagar el cobro avanzado de un comercio (queda registrado).
function setCobroAvanzadoV042(data) {
  if (!validarSesionAdmin(data.token || '')) return { error: 'Sesión de administrador vencida. Volvé a entrar.' };
  var prefijo = _normalizarPrefijo_(data.prefijo), activo = data.activo === true;
  return _conCandado41_(function () {
    var ss = SpreadsheetApp.getActiveSpreadsheet(), h = ss.getSheetByName('CONFIG_' + prefijo);
    if (!h) return { error: 'No se encontró el comercio ' + prefijo + '. No se cambió nada.' };
    if (activo && _migracionPendiente41_(prefijo)) return { error: 'Primero pasá los fiados de ' + prefijo + ' al libro (menú de la planilla, opción 3). No se cambió nada.' };
    var d = h.getDataRange().getValues(), fila = 0, anterior = '';
    for (var i = 1; i < d.length; i++) if (String(d[i][0]).trim() === 'extra_cobro_avanzado') { fila = i + 1; anterior = d[i][1]; break; }
    if (fila) h.getRange(fila, 2).setValue(activo ? 'TRUE' : 'FALSE'); else h.appendRow(['extra_cobro_avanzado', activo ? 'TRUE' : 'FALSE', 'cobro avanzado: mixto, monedas, deuda en el cobro']);
    var log = ss.getSheetByName('COTIZACIONES_VAO') || (function () { _crearHojaConEncabezado_(ss, 'COTIZACIONES_VAO', ['Fecha', 'Prefijo', 'Moneda', 'Anterior', 'Nueva']); return ss.getSheetByName('COTIZACIONES_VAO'); })();
    log.appendRow([new Date(), prefijo, 'COBRO_AVANZADO', String(anterior), activo ? 'TRUE' : 'FALSE']);
    return { success: true, mensaje: 'Cobro avanzado ' + (activo ? 'PRENDIDO' : 'APAGADO') + ' para ' + prefijo + '.' + (activo ? ' El POS muestra el botón 🔀 Mixto al volver a entrar.' : '') };
  });
}
