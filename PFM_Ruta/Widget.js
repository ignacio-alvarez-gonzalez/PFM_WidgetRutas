//Estas funciones son llamadas en el evento Onclick de los botones a lo largo de los HTML, 
// la primera ocultar, cambia el display de flex a none y viceversa, del elemento id que se referenciará en el html, sirve para hacer desplegables algunos a partados a raiz del click en un boton. ademas esta función añade un flex direction que cambia en funcion del Widget.
function ocultar(esto) {
  vista = document.getElementById(esto).style.display;
  if (vista == 'none') vista = 'flex';else vista = 'none';

  document.getElementById(esto).style.display = vista;
  document.getElementById(esto).style.flexDirection = 'column';
}
// La segunda función se utiliza en el primer Widget y nos permite mostrar exclusivamente el contenido del elemento id que queramos en el HTML, supongamos que si dividimos el HTML en 5 <div></div> y a cada uno le asiganmos un id, al introducir los parametros, el primero sera el id que queremos mostrar y el resto los que queremos ocultar.
function ocultarPro(bueno, malo1, malo2, malo3, malo4) {
  var vbueno = document.getElementById(bueno).style.display;
  var vmalo1 = document.getElementById(malo1).style.display;
  var vmalo2 = document.getElementById(malo2).style.display;
  var vmalo3 = document.getElementById(malo3).style.display;
  var vmalo4 = document.getElementById(malo4).style.display;
  if (vbueno == 'none') {
    vbueno = 'block';
    vmalo1 = 'none';
    vmalo2 = 'none';
    vmalo3 = 'none';
    vmalo4 = 'none';
  } else {
    vbueno = 'none';
  }

  document.getElementById(bueno).style.display = vbueno;
  document.getElementById(malo1).style.display = vmalo1;
  document.getElementById(malo2).style.display = vmalo2;
  document.getElementById(malo3).style.display = vmalo3;
  document.getElementById(malo4).style.display = vmalo4;
}

define([
  'dojo/_base/declare',
  'jimu/BaseWidget',

  "esri/SpatialReference",
  "esri/tasks/FeatureSet",
  "esri/layers/FeatureLayer",

  "esri/tasks/RouteTask",
  "esri/tasks/RouteParameters",
  "esri/tasks/RouteResult",
  "esri/tasks/NATypes",

  "esri/tasks/GeometryService",
  "esri/tasks/BufferParameters",

  "esri/tasks/QueryTask",
  "esri/tasks/query",

  "esri/toolbars/draw",
  "esri/geometry/Point",
  "esri/symbols/SimpleFillSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/graphic", 
  "esri/Color",

  "esri/dijit/Search",

  "dojo/on"
], function(
  declare, 
  BaseWidget,

  SpatialReference,
  FeatureSet,
  FeatureLayer,

  RouteTask,
  RouteParameters,
  RouteResult,
  NATypes,

  GeometryService,
  BufferParameters,

  QueryTask,
  Query,

  Draw,
  Point,
  SimpleFillSymbol,
  SimpleLineSymbol,
  SimpleMarkerSymbol,
  Graphic,
  Color,

  Search,

  on
  ) {

  return declare([BaseWidget], {

    baseClass: 'pfm-ruta',

    postCreate: function() {
      this.inherited(arguments);
      console.log('PFM_Ruta::postCreate');
    },

    // startup: function() {
    //   this.inherited(arguments);
    //   console.log('PFM_Ruta::startup');
    // },

    onOpen: function(){
      console.log('PFM_Ruta::onOpen');

      // SE GUARDAN LAS PRINCIPALES VARIABLES QUE SE VAN A USAR:
      // SE ALMACENAN LAS RUTAS DE LOS PRINCIPALES SERVICIOS QUE SE VAN A USAR:

      var miMapa = this.map;
      console.log("El mapa: ", miMapa);

      var capaPuntosRecarga = this.map.itemInfo.itemData.operationalLayers[0];
      console.log("La capa de puntos de recarga: ", capaPuntosRecarga);
      capaPuntosRecarga.layerObject.hide();

      var urlServicioRutas = "https://localhost:6443/arcgis/rest/services/DatosPFM/NetworkDatasetPFM_NetworkAnalystServices/NAServer/Route";
      var urlTablaDatosVehiculos = "https://services3.arcgis.com/OTL4fBaJCey9GRSL/ArcGIS/rest/services/TablaDatosVehiculos/FeatureServer/0";

      var puntoInicio;
      var ubicacionInicio;
      var puntoFinal;
      var ubicacionFinal;

      var miSimboloUbicacion = new SimpleMarkerSymbol(
        SimpleMarkerSymbol.STYLE_CIRCLE, 
        10,
        new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0,0,0]), 1),
        new Color([255,255,0])
      );
      
      // AL ABRIR EL WIDGET SE BORRA TODO LO DIBUJADO EN LA CAPA GRÁFICOS ANTERIORMENTE Y SE ELIMINAN FILTROS PREVIOS:
      miMapa.graphics.clear();
      capaPuntosRecarga.layerObject.setDefinitionExpression(null);

      // AL CAMBIAR EL SELECTOR DE MARCA DE COCHE SE LA LANZA LA FUNCIÓN QUE ESCRIBE EN EL HTML LA SELECCION DE MODELOS DE ESA MARCA:
      on(dojo.byId("selectorMarca"), "change", function(){

        var marcaCoche = dojo.byId("selectorMarca").value;

        dojo.byId("selectorModelo").innerHTML = "";

        if (marcaCoche == "Ninguno") return;

        var tareaConsultaVehiculos = new QueryTask(urlTablaDatosVehiculos);

        var consultaVehiculos = new Query();
        consultaVehiculos.returnGeometry = false;
        consultaVehiculos.outFields = ["MODELO", "BATERIA_kwh"];
        consultaVehiculos.orderByFields = ["MODELO"];
        consultaVehiculos.where = "MARCA = '" + marcaCoche + "'";

        tareaConsultaVehiculos.execute(consultaVehiculos, function(resultados) {

          var opcion = document.createElement("option");
          opcion.value = "Ninguno";
          opcion.text = "Seleccione un modelo:";
          dojo.byId("selectorModelo").add(opcion);

          for (var i = 0; i < resultados.features.length; i++) {

            opcion = document.createElement("option");
            opcion.value = resultados.features[i].attributes.BATERIA_kwh;
            opcion.text = resultados.features[i].attributes.MODELO;
            dojo.byId("selectorModelo").add(opcion);

          };
          
        });

      });

      // AL CAMBIAR EL SELECTOR DE MODELO DE COCHE, SE LANZA LA FUNCIÓN QUE LANZA LA ALTERNATIVA EN CASO DE QUE NO SE DISPONGAN DATOS DE LA BATERÍA:
      on(dojo.byId("selectorModelo"), "change", function(){

        console.log("La batería: ", dojo.byId("selectorModelo").value);

        if(dojo.byId("selectorModelo").value == 0) {
          dojo.byId("errorBateria").innerHTML = "Aún no disponemos de los datos de capacidad de batería de este vehículo. Por favor, introducelos manualmente.";
          dojo.byId("datosBateria").style.display = "block";
        } else {
          dojo.byId("errorBateria").innerHTML = "";
          dojo.byId("datosBateria").style.display = "none";
        };

      });

      // AL CAMBIAR EL VALOR DEL PORCENTAJE DE LA BATERÍA, SE LANZA LA FUNCIÓN QUE ESCRIBE EL ERROR DE INTRODUCIR UN VALOR VÁLIDO:
      on(dojo.byId("porcentaje"), "change", function(){

        if (dojo.byId("porcentaje").value == 0) {
          dojo.byId("errorPorcentaje").innerHTML = "El porcentaje de carga de la batería tiene que ser mayor que 0.";
        } else {
          dojo.byId("errorPorcentaje").innerHTML = "";
        };

      });

      // AL PULSAR EN EL BOTÓN DE SELECCIONAR ORIGEN SE LANZA LA FUNCIÓN QUE CREA EL PUNTO DE INICIO Y LO DIBUJA EN EL MAPA:
      on(dojo.byId("seleccionInicio"), "click", function(){

        miMapa.graphics.remove(ubicacionInicio);

        var herramientaDibujo = new Draw(miMapa);
        herramientaDibujo.activate(Draw.POINT);
        herramientaDibujo.on("draw-end", function(evento){

          puntoInicio = new Point(evento.geometry);

          ubicacionInicio = new Graphic(puntoInicio, miSimboloUbicacion);
          miMapa.graphics.add(ubicacionInicio);

          herramientaDibujo.deactivate();

        });

      });

      // AL PULSAR EN EL BOTÓN DE SELECCIONAR DESTINO SE LANZA LA FUNCIÓN QUE CREA EL PUNTO FINAL Y LO DIBUJA EN EL MAPA:
      on(dojo.byId("seleccionFinal"), "click", function(){

        miMapa.graphics.remove(ubicacionFinal);

        var herramientaDibujo = new Draw(miMapa);
        herramientaDibujo.activate(Draw.POINT);
        herramientaDibujo.on("draw-end", function(evento){

          puntoFinal = new Point(evento.geometry);

          ubicacionFinal = new Graphic(puntoFinal, miSimboloUbicacion);
          miMapa.graphics.add(ubicacionFinal);

          herramientaDibujo.deactivate();

        });

      });

      // CREO UN BUSCADOR PARA GEOLOCALIZAR DIRECCIONES COMO ALTERNATIVA PARA CREAR EL PUNTO DE ORIGEN:
      var miBuscadorInicio = new Search({map: miMapa, enableInfoWindow: false, autoNavigate: false}, "buscadorInicio");
      miBuscadorInicio.startup();
      miBuscadorInicio.on("select-result", function(eventoBuscadorOrigen){

        miMapa.graphics.remove(ubicacionInicio);

        puntoInicio = new Point(eventoBuscadorOrigen.result.feature.geometry);

        ubicacionInicio = new Graphic(puntoInicio, miSimboloUbicacion);
        miMapa.graphics.add(ubicacionInicio);

        miBuscadorInicio.clear();
        
      });
      
      // CREO OTRO BUSCADOR PARA GEOLOCALIZAR DIRECCIONES COMO ALTERNATIVA PARA CREAR EL PUNTO DE DESTINO:
      var miBuscadorFinal = new Search({map: miMapa, enableInfoWindow: false, autoNavigate: false}, "buscadorFinal");
      miBuscadorFinal.startup();
      miBuscadorFinal.on("select-result", function(eventoBuscadorDestino){

        miMapa.graphics.remove(ubicacionFinal);

        puntoFinal = new Point(eventoBuscadorDestino.result.feature.geometry);

        ubicacionFinal = new Graphic(puntoFinal, miSimboloUbicacion);
        miMapa.graphics.add(ubicacionFinal);

        miBuscadorFinal.clear();
        
      });

      // AL PULSAR EN EL BOTÓN DE CALCULAR RUTA SE LANZA LA FUNCIÓN PRINCIPAL QUE EVALUA LAS RUTAS Y DE LA QUE CUELGAN LAS SIGUIENTES FUNCIONES:
      on(dojo.byId("calcularRuta"), "click", function(){

        dojo.byId("consumoTotal").innerHTML = "";
        dojo.byId("trayectoTotal").innerHTML = "";

        // SE EVALUA SI SE HA SELECCIONADO CORRECTAMENTE MARCA Y MODELO DE COCHE. EN CASO DE NO HABERSE SELECCIONADO, LA FUNCIÓN PARA:
        if (dojo.byId("selectorMarca").value == "Ninguno" || dojo.byId("selectorModelo").value == "Ninguno") {
          dojo.byId("errorCoche").innerHTML = "Seleccione su marca y modelo de coche.";
          return;
        };

        // SE CREAN VARIABLES PARA ALMACENAR LOS DATOS DE LA BATERÍA:
        var bateriaDisponible;
        var porcentajeDisponible = dojo.byId("porcentaje").value;

        if (dojo.byId("selectorModelo").value != 0) {

          bateriaDisponible = dojo.byId("selectorModelo").value;

        } else if (dojo.byId("selectorModelo").value == 0) {

          if (dojo.byId("bateria").value != 0) {
            dojo.byId("errorBateria").innerHTML = "";
            bateriaDisponible = dojo.byId("bateria").value;
          } else if (dojo.byId("bateria").value == 0) {
            dojo.byId("errorBateria").innerHTML = "Introduzca la capacidad de su batería.";
            return;
          };

        };

        // SE EVALUA SI SE HA SELECCIONADO CORRECTAMENTE EL ORIGEN Y EL DESTINO PARA CONTINUAR CON LA EVALUACIÓN DE LA RUTA:
        if ((puntoInicio != null) && (puntoFinal != null)) {

          // SE CREAN PARÁMETROS PARA RESOLVER LA PRIMERA TAREA DE RUTA:

          var entidades = [];
          entidades.push(ubicacionInicio);
          entidades.push(ubicacionFinal);

          var ubicaciones = new FeatureSet();
          ubicaciones.features = entidades;

          var tareaRuta = new RouteTask(urlServicioRutas);

          var parametrosRuta = new RouteParameters;
          parametrosRuta.accumulateAttributes = ["ConsumoKWh", "Length", "Tiempo_coche"];
          parametrosRuta.preserveFirstStop = true;
          parametrosRuta.preserveLastStop = true;
          parametrosRuta.restrictUTurns = NATypes.UTurn.AT_DEAD_ENDS_ONLY;
          parametrosRuta.outputLines = NATypes.OutputLine.TRUE_SHAPE_WITH_MEASURE;
          parametrosRuta.stops = ubicaciones;
          parametrosRuta.outSpatialReference = miMapa.spatialReference;

          // SE RESUELVE LA RUTA ENTRE EL ORIGEN Y EL DESTINO:
          tareaRuta.solve(parametrosRuta, function(evento){

            console.log("Los resultados de la ruta: ", evento);
            var rutaPrimerCaso = evento.routeResults[0].route;
            var simboloRuta = new SimpleLineSymbol("solid", new Color([0,255,0]), 4);

            console.log("La autonomía disponible: ", (bateriaDisponible * (porcentajeDisponible/100)));

            // SE EVALUA SI LA AUTONOMÍA DISPONIBLE DEL COCHE ES SUFICIENTE PARA CUBRIR EL TRAYECTO:
            // EN CASO DE SER SUFICIENTE, SE DIBUJA ESA RUTA Y SE OBTIENEN LOS DATOS DEL VIAJE:
            if (rutaPrimerCaso.attributes.Total_ConsumoKWh < (bateriaDisponible * (porcentajeDisponible/100))) {

              rutaPrimerCaso.setSymbol(simboloRuta);
              miMapa.graphics.add(rutaPrimerCaso);
              miMapa.setExtent(rutaPrimerCaso.geometry.getExtent(), true);

              dojo.byId("datosViaje").style.display = "block";

              dojo.byId("consumoTotal").innerHTML = "El consumo total del trayecto será " + Math.round((rutaPrimerCaso.attributes.Total_ConsumoKWh)*100)/100 + "kWh, lo que supondrá un " + Math.round((rutaPrimerCaso.attributes.Total_ConsumoKWh * 100) / bateriaDisponible) + "% de tu batería.";

              dojo.byId("trayectoTotal").innerHTML = "El trayecto recorrerá " + Math.round((rutaPrimerCaso.attributes.Total_Length/1000)*100)/100 + "km en aproximadamente " + Math.round((rutaPrimerCaso.attributes.Total_Tiempo_coche)*100)/100 + "horas.";

            // SI LA AUTONOMÍA NO ES SUFICIENTE, SE DESPLIEGA EL SIGUIENTE BLOQUE DE HTML PARA SOLICITAR DATOS SOBRE LA RECARGA NECESARIA:
            } else {

              dojo.byId("datosSegundoCaso").style.display = "block";

              // SE CREAN VARIABLES PARA GUARDAR LOS DATOS SOBRE LOS PUNTOS DE RECARGA QUE SE APLICARÁN EN EL FILTRO:
              var listaTipoConector = [
                dojo.byId("tipoConector1"),
                dojo.byId("tipoConector2"),
                dojo.byId("tipoConector3"),
                dojo.byId("tipoConector4"),
                dojo.byId("tipoConector5"),
                dojo.byId("tipoConector6"),
                dojo.byId("tipoConector7"),
                dojo.byId("tipoConector8"),
              ];

              var listaTipoOperador = [
                dojo.byId("tipoOperador1"),
                dojo.byId("tipoOperador2"),
                dojo.byId("tipoOperador3"),
                dojo.byId("tipoOperador4"),
                dojo.byId("tipoOperador5"),
                dojo.byId("tipoOperador6"),
                dojo.byId("tipoOperador7"),
                dojo.byId("tipoOperador8"),
              ];

              // SE DEFINE LA FUNCIÓN QUE SELECCIONA TODOS LOS VALORES DE TIPO DE CONECTOR:
              on(dojo.byId("tipoConectorTodos"), "change", function(){

                if (dojo.byId("tipoConectorTodos").checked == true) {

                  dojo.forEach(listaTipoConector, function(tipoConector){
                    tipoConector.checked = true;
                  });
                  
                  listaTipoConector.push(dojo.byId("tipoConectorTodos"));
                  console.log(listaTipoConector);

                } else if (dojo.byId("tipoConectorTodos").checked == false) {

                  dojo.forEach(listaTipoConector, function(tipoConector){
                    tipoConector.checked = false;
                  });

                  listaTipoConector.pop();
                  console.log(listaTipoConector);

                };

              });

              // SE DEFINE LA FUNCIÓN QUE SELECCIONA TODOS LOS VALORES DE TIPO DE OPERADOR:
              on(dojo.byId("tipoOperadorTodos"), "change", function(){

                if (dojo.byId("tipoOperadorTodos").checked == true) {
                  dojo.forEach(listaTipoOperador, function(tipoOperador){
                    tipoOperador.checked = true;
                  });
                } else if (dojo.byId("tipoOperadorTodos").checked == false) {
                  dojo.forEach(listaTipoOperador, function(tipoOperador){
                    tipoOperador.checked = false;
                  });
                };

              });

              var graficoAI;
              
              // AL PULSAR EN EL BOTÓN DE BUSCAR PUNTOS DE RECARGA, SE LANZA LA CADENA DE FUNCIONES (SIEMPRE DENTRO DEL ELSE DE LA PRIMERA TAREA DE RUTA) QUE BUSCARÁN LOS PUNTOS DE RECARGA AL ALCANCE Y DENTRO DE LOS FILTROS ESPECIFICADOS:
              on(dojo.byId("buscarPuntosRecarga"), "click", function(){

                // SE CREA LA VARIABLE QUE ALMACENARÁ LOS ID DE LOS PUNTOS QUE SE OBTENGAN MÁS ADELANTE:
                var indices = [];

                dojo.byId("datosTercerCaso").style.display = "none";
                miMapa.graphics.clear(graficoAI);
                
                dojo.byId("esperarProceso").style.display = "block";

                // SE CREAN VARIABLES PARA ALMACENAR CADENAS DE TEXTO CON LOS DATOS DE LOS FILTROS PARA CREAR UNA EXPRESIÓN DE DEFINICIÓN:

                // ESTE BLOQUE DE CÓDIGO CREA LA CADENA DE TEXTO (EN SQL) CON EL FILTRO DEL TIPO DE CONECTOR:
                var tipoConectorSeleccionado = [];
                dojo.forEach(listaTipoConector, function(tipoConector){
                  if (tipoConector.checked == true) {
                    tipoConectorSeleccionado.push(tipoConector.value);
                  };
                });
                
                var expresionesTipoConector = [];
                dojo.forEach(tipoConectorSeleccionado, function(conector){
                  expresionesTipoConector.push("tipoconector = " + conector + " or ");
                });
                expresionesTipoConector.push("tipoconector = 27");

                var expresionDefinicionConectores = "";
                dojo.forEach(expresionesTipoConector, function(expresion){
                  expresionDefinicionConectores += expresion;
                });

                // ESTE BLOQUE DE CÓDIGO CREA LA CADENA DE TEXTO (EN SQL) CON EL FILTRO DEL TIPO DE OPERADOR:
                var tipoOperadorSeleccionado = [];
                var expresionesTipoOperador = [];
                var expresionDefinicionOperadores = "";

                if (dojo.byId("tipoConectorTodos").checked != true) {

                  dojo.forEach(listaTipoOperador, function(tipoOperador){
                    if (tipoOperador.checked == true) {
                      tipoOperadorSeleccionado.push(tipoOperador.value);
                    };
                  });

                  dojo.forEach(tipoOperadorSeleccionado, function(operador){
                    expresionesTipoOperador.push("operadorpromotor = '" + operador + "' or ");
                  });
                  expresionesTipoOperador.push("operadorpromotor = 'TEXTO DE CONTROL'");

                  dojo.forEach(expresionesTipoOperador, function(expresion){
                    expresionDefinicionOperadores += expresion;
                  });

                };              

                // SE CREA UNA GRAN CADENA DE TEXTO, SUMANDO LAS ANTERIORES, QUE SE GUARDA COMO EXPRESIÓN DE DEFINCIÓN QUE SE PASARÁ MÁS ADELANTE A LA CAPA DE PUNTOS DE RECARGA:
                var expresionDefinicion = "";
                if (dojo.byId("tipoConectorTodos").checked == true) {
                  expresionDefinicion = expresionDefinicionConectores;
                } else {
                  expresionDefinicion = ("(" + expresionDefinicionConectores + ") and (" + expresionDefinicionOperadores + ")");
                };                
                console.log(expresionDefinicion);

                // SE PREPARAN LAS VARIABLES PARA REALIZAR UN BUFFER DESDE LA RUTA DE LA SOLUCIÓN DE LA PRIMERA TAREA DE RUTA:
                var servicioGeometria = new GeometryService("https://utility.arcgisonline.com/arcgis/rest/services/Geometry/GeometryServer");

                var parametrosAI = new BufferParameters();
                parametrosAI.geometries = [rutaPrimerCaso.geometry];
                parametrosAI.distances = [dojo.byId("distancia").value];
                parametrosAI.unit = GeometryService.UNIT_KILOMETER;
                parametrosAI.outSpatialReference = miMapa.spatialReference;

                // SE EJECUTA EL BUFFER Y AL COMPLETARSE SE LANZA LA SIGUIENTE CADENA DE FUNCIONES, QUE FILTRARÁN LOS PUNTOS QUE SE MUESTRAN AL USUARIO:
                servicioGeometria.buffer(parametrosAI);
                servicioGeometria.on("buffer-complete", function(eventoBuffer){

                  // SE CENTRA EL MAPA EN EL BUFFER Y SE DIBUJA EN LA CAPA GRÁFICOS:
                  miMapa.setExtent(eventoBuffer.geometries[0].getExtent(), true);

                  var simboloAI = new SimpleFillSymbol(
                    SimpleFillSymbol.STYLE_NULL,
                    new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHED, new Color([255,255,0,0.75]), 3),
                    new Color([255,0,0,0.35])
                  );

                  dojo.forEach(eventoBuffer.geometries, function(parametro) {
                    graficoAI = new Graphic(parametro, simboloAI);
                    miMapa.graphics.add(graficoAI);
                  });

                  // SE PREPARA UNA TAREA DE CONSULTA PARA OBTENER UNA LISTA DE LOS PUNTOS DE RECARGA QUE QUEDEN DENTRO DE LA GEOMETRÍA DEL BUFFER Y QUE CUMPLA EL FILTRO:
                  var consultaPdR = new Query();
                  consultaPdR.where = expresionDefinicion;
                  consultaPdR.outFields = ["*"];
                  consultaPdR.geometry = graficoAI.geometry;
                  consultaPdR.returnGeometry = true;
                  consultaPdR.outSpatialReference = new SpatialReference(102100);

                  // SE APLICAN LOS FILTROS A LA CAPA Y SE SELECCIONAN LOS CANDIDATOS POR OPERADOR Y CONECTOR:
                  capaPuntosRecarga.layerObject.setDefinitionExpression(expresionDefinicion);
                  capaPuntosRecarga.layerObject.selectFeatures(consultaPdR);

                  var miTareaDeConsulta = new QueryTask(capaPuntosRecarga.url);

                  // SE EJECUTA LA TAREA DE CONSULTA Y SE LANZA LA SIGUIENTE FUNCIÓN, QUE USARÁ LOS RESULTADOS PARA EVALUAR CUALES DE LOS PUNTOS OBTENIDOS DENTRO DEL BUFFER ESTÁN AL ALCANCE DE LA AUTONOMÍA DEL COCHE:
                  miTareaDeConsulta.execute(consultaPdR, function(resultado){

                    console.log("El resultado de la queryTask", resultado);
                    var contador = 0;
                    var contadorMaximo = resultado.features.length;
                    console.log("El contador máximo: ", contadorMaximo);

                    if (resultado.features.length == 0) {
                      dojo.byId("errorPuntosDisponibles").innerHTML = "No hay puntos de recarga en ese radio de alcance. Modifica la distancia de desvío.";
                      return;
                    };

                    // SE EJECUTARÁ UNA TAREA DE RUTA DESDE EL ORIGEN HASTA CADA PUNTO OBTENIDO PARA VER SI ESTÁN DENTRO DEL RANGO DE AUTONOMÍA:
                    var tareaRutaEvaluadora = new RouteTask(urlServicioRutas);

                    // SE ITERA POR CADA PUNTO OBTENIDO DE LA QUERYTASK:
                    dojo.forEach(resultado.features, function(entidad){

                      var entidadEvaluada = entidad;
                      var puntoEvaluado = new Graphic(entidad.geometry, miSimboloUbicacion);

                      var entidadesRutaEvaluadora = [];
                      entidadesRutaEvaluadora.push(ubicacionInicio);
                      entidadesRutaEvaluadora.push(puntoEvaluado);

                      var ubicacionesRutaEvaluadora = new FeatureSet();
                      ubicacionesRutaEvaluadora.features = entidadesRutaEvaluadora;

                      var parametrosRutaEvaluadora = new RouteParameters;
                      parametrosRutaEvaluadora.accumulateAttributes = ["ConsumoKWh", "Length", "Tiempo_coche"];
                      parametrosRutaEvaluadora.preserveFirstStop = true;
                      parametrosRutaEvaluadora.preserveLastStop = true;
                      parametrosRutaEvaluadora.restrictUTurns = NATypes.UTurn.AT_DEAD_ENDS_ONLY;
                      parametrosRutaEvaluadora.outputLines = NATypes.OutputLine.TRUE_SHAPE_WITH_MEASURE;
                      parametrosRutaEvaluadora.stops = ubicacionesRutaEvaluadora;
                      parametrosRutaEvaluadora.outSpatialReference = miMapa.spatialReference;  

                      // CUANDO SE RESUELVE LA RUTA SE COMPRUEBA SI EL PUNTO ESTÁ DENTRO DEL RANGO (EN KWH) Y EN CASO AFIRMATIVO SE AÑADE AL ARRAY DE INDICES:
                      tareaRutaEvaluadora.solve(parametrosRutaEvaluadora, function(eventoRutaEvaluadora){

                        console.log("eventoRutaEvaluadora", eventoRutaEvaluadora)

                        var rutaEvaluadora = eventoRutaEvaluadora.routeResults[0].route;

                        if (rutaEvaluadora.attributes.Total_ConsumoKWh < (bateriaDisponible * (porcentajeDisponible/100))) {
                          indices.push(entidadEvaluada.attributes.objectid);
                        };

                        // CUANDO SE COMPLETE LA RESOLUCIÓN DE CADA RUTA EVALUADA, SE CREARÁ UNA CADENA DE TEXTO PARA CADA PUNTO, LAS CUALES SE UNIRÁN Y SE AÑADIRÁN A LA EXPRESIÓN DE DEFINICIÓN:

                        var expresiones = [];

                        dojo.forEach(indices, function(idPunto){
                          expresiones.push("objectid = " + idPunto + " or ");
                        });

                        expresiones.push("objectid = 0");

                        var expresionDefinicionGeometria = [];

                        dojo.forEach(expresiones, function(expresion){
                          expresionDefinicionGeometria += expresion;
                        });

                        expresionDefinicion = ("(" + expresionDefinicionGeometria + ") and (" + expresionDefinicionConectores + ") and (" + expresionDefinicionOperadores + ")");
                        console.log("La expresión: ", expresionDefinicion);

                        capaPuntosRecarga.layerObject.setDefinitionExpression(expresionDefinicion);

                        contador++;
                        console.log("El contador", contador);

                        // UNA VEZ COMPLETADA LA EVALUACIÓN DE LOS PUNTOS, SE DESBLOQUEA EL TERCER BLOQUE HTML, QUE PERMITE SELECCIONAR UNO DE LOS PUNTOS FILTRADOS:
                        if (contador == contadorMaximo) {

                          if (indices.length == 0) {
                            dojo.byId("errorPuntosDisponibles").innerHTML = "En esta ruta, con tu batería y con tus filtros de puntos de recarga, no existen opciones de cargadores. Modifica los datos.";
                          } else {
                            capaPuntosRecarga.layerObject.clearSelection();
                            capaPuntosRecarga.layerObject.show();

                            if (indices.length == 1) {
                              dojo.byId("puntosDisponibles").innerHTML = "Se muestra en el mapa " + indices.length + " punto de recarga dentro del alcance de tu batería.";
                            } else {
                              dojo.byId("puntosDisponibles").innerHTML = "Se muestran en el mapa " + indices.length + " puntos de recarga dentro del alcance de tu batería.";
                            }
                            
                            dojo.byId("informacionx").style.display = "none";
                            dojo.byId("datosTercerCaso").style.display = "block";      
                          }; 

                          dojo.byId("esperarProceso").style.display = "none";
                          miMapa.graphics.clear(graficoAI);

                        };

                      });

                    });    

                  });

                });

              });

              // AL PULSAR EN EL BOTÓN DE SELECCIONAR PUNTO (DEL TERCER BLOQUE) SE LANZA LA FUNCIÓN QUE PERMITE SELECCIONAR UNO DE LOS PUNTOS MOSTRADOS:
              on(dojo.byId("seleccionarPunto"), "click", function(){

                var herramientaSeleccion = new Draw(miMapa);

                herramientaSeleccion.activate(Draw.EXTENT);
                herramientaSeleccion.on("draw-end", function(eventoSeleccion){

                  var consultaSeleccion = new Query();
                  consultaSeleccion.geometry = eventoSeleccion.geometry;

                  var simboloSeleccion = new SimpleMarkerSymbol(
                    SimpleMarkerSymbol.STYLE_SQUARE, 
                    10,
                    new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0,0,0]), 1),
                    new Color([255,0,0])
                  );

                  capaPuntosRecarga.layerObject.setSelectionSymbol(simboloSeleccion);
                  capaPuntosRecarga.layerObject.selectFeatures(consultaSeleccion);

                  herramientaSeleccion.deactivate();

                });

              });

              // AL PULSAR EN RECALCULAR RUTA SE VUELVE A EVALUAR LA RUTA ENTRE EL ORIGEN Y EL DESTINO, PERO METIENDO ESTA VEZ EL PUNTO DE CARGA (O PUNTOS) SELECCIONADO COMO UBICACIÓN INTERMEDIA:
              on(dojo.byId("recalcularRuta"), "click", function(){

                miMapa.graphics.clear(graficoAI);

                capaPuntosRecarga.layerObject.hide();

                var puntoSeleccionado = capaPuntosRecarga.layerObject.getSelectedFeatures();
                console.log(puntoSeleccionado);

                if (puntoSeleccionado.length == 0){
                  dojo.byId("errorPunto").innerHTML = "Es necesario que seleccione un punto donde recargar.";
                  return;
                };
                
                // var miSimboloUbicacion = new SimpleMarkerSymbol(
                //   SimpleMarkerSymbol.STYLE_SQUARE, 
                //   10,
                //   new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0,0,0]), 1),
                //   new Color([255,255,255])
                // );

                var entidadesSegundaRuta = [];
                var entidadesEvaluacionRecarga = [];
                
                // SE METE AL ARRAY DE ENTIDADES PARA LA RUTA EL MISMO PUNTO DE ORIGEN QUE SE MARCÓ AL INICIO:
                entidadesSegundaRuta.push(ubicacionInicio);
                miMapa.graphics.add(ubicacionInicio);

                // SE EVALUA SI SON 1, 2 O 3 LOS PUNTOS SELECCIONADOS QUE HAY QUE METER AL ARRAY DE ENTIDADES PARA LA RUTA, Y SE COLOCAN DETRÁS DEL INICIO:
                if (puntoSeleccionado.length == 1) {

                  var ubicacionIntermedia = new Graphic(puntoSeleccionado[0].geometry, miSimboloUbicacion);
                  entidadesSegundaRuta.push(ubicacionIntermedia);
                  miMapa.graphics.add(ubicacionIntermedia);
                  entidadesEvaluacionRecarga.push(ubicacionIntermedia);

                } else if (puntoSeleccionado.length == 2) {

                  var ubicacionIntermedia1 = new Graphic(puntoSeleccionado[0].geometry, miSimboloUbicacion);
                  entidadesSegundaRuta.push(ubicacionIntermedia1);
                  miMapa.graphics.add(ubicacionIntermedia1);

                  var ubicacionIntermedia2 = new Graphic(puntoSeleccionado[1].geometry, miSimboloUbicacion);
                  entidadesSegundaRuta.push(ubicacionIntermedia2);
                  miMapa.graphics.add(ubicacionIntermedia2);
                  entidadesEvaluacionRecarga.push(ubicacionIntermedia2);

                } else if (puntoSeleccionado.length == 3) {

                  var ubicacionIntermedia1 = new Graphic(puntoSeleccionado[0].geometry, miSimboloUbicacion);
                  entidadesSegundaRuta.push(ubicacionIntermedia1);
                  miMapa.graphics.add(ubicacionIntermedia1);

                  var ubicacionIntermedia2 = new Graphic(puntoSeleccionado[1].geometry, miSimboloUbicacion);
                  entidadesSegundaRuta.push(ubicacionIntermedia2);
                  miMapa.graphics.add(ubicacionIntermedia2);

                  var ubicacionIntermedia3 = new Graphic(puntoSeleccionado[2].geometry, miSimboloUbicacion);
                  entidadesSegundaRuta.push(ubicacionIntermedia3);
                  miMapa.graphics.add(ubicacionIntermedia3);
                  entidadesEvaluacionRecarga.push(ubicacionIntermedia3);

                } else {
                  dojo.byId("errorPunto").innerHTML = "Seleccione 3 o menos puntos únicamente.";
                  return;
                };

                // SE METE AL FINAL DEL ARRAY DE ENTIDADES PARA LA RUTA EL MISMO PUNTO DE DESTINO QUE SE MARCÓ AL INICIO:
                entidadesSegundaRuta.push(ubicacionFinal);
                miMapa.graphics.add(ubicacionFinal);
                // SE METE EL DESTINO AL FINAL DEL ARRAY QUE EVALUARÁ LA RECARGA NECESARIA:
                entidadesEvaluacionRecarga.push(ubicacionFinal);

                // SE PREPARAN LOS PARAMÉTROS PARA VOLVER A RESOLVER LA RUTA:
                var ubicacionesSegundaRuta = new FeatureSet();
                ubicacionesSegundaRuta.features = entidadesSegundaRuta;

                // SE PREPARAN LOS PARÁMETROS PARA LA EVALUACIÓN DE LA RECARGA NECESARIA:
                var ubicacionesEvaluacionRecarga = new FeatureSet();
                ubicacionesEvaluacionRecarga.features = entidadesEvaluacionRecarga;

                var tareaSegundaRuta = new RouteTask(urlServicioRutas);

                var parametrosSegundaRuta = new RouteParameters;
                parametrosSegundaRuta.accumulateAttributes = ["ConsumoKWh", "Length", "Tiempo_coche"];
                parametrosSegundaRuta.preserveFirstStop = true;
                parametrosSegundaRuta.preserveLastStop = true;
                parametrosSegundaRuta.restrictUTurns = NATypes.UTurn.AT_DEAD_ENDS_ONLY;
                parametrosSegundaRuta.outputLines = NATypes.OutputLine.TRUE_SHAPE_WITH_MEASURE;
                parametrosSegundaRuta.stops = ubicacionesSegundaRuta;
                parametrosSegundaRuta.outSpatialReference = miMapa.spatialReference;
                
                // SE RESUELVE LA TAREA DE RUTA Y SE DIBUJAN LOS RESULTADOS EN EL MAPA Y LOS DATOS DEL VIAJE SE ESCRIBEN EN EL HTML:
                tareaSegundaRuta.solve(parametrosSegundaRuta, function(eventoSegundaRuta){

                  var rutaSegundoCaso = eventoSegundaRuta.routeResults[0].route;
                  var simboloRuta = new SimpleLineSymbol("solid", new Color([0,255,0]), 3);

                  rutaSegundoCaso.setSymbol(simboloRuta);
                  miMapa.graphics.add(rutaSegundoCaso);
                  miMapa.setExtent(rutaSegundoCaso.geometry.getExtent(), true);

                  dojo.byId("datosViajeCasoDos").style.display = "block";
                  dojo.byId("consumoTotalCasoDos").innerHTML = "El consumo total del trayecto será " + Math.round((rutaSegundoCaso.attributes.Total_ConsumoKWh)*100)/100 + "kWh.";
                  dojo.byId("trayectoTotalCasoDos").innerHTML = "El trayecto recorrerá " + Math.round((rutaSegundoCaso.attributes.Total_Length/1000)*100)/100 + "km en aproximadamente " + Math.round((rutaSegundoCaso.attributes.Total_Tiempo_coche)*100)/100 + "horas.";

                });

                // SE RESUELVE LA TAREA DE RUTA ENTRE EL CARGADOR Y EL DESTINO PARA VER LA RECARGA NECESARIA:
                parametrosSegundaRuta.stops = ubicacionesEvaluacionRecarga;

                var tareaRutaEvaluacionRecarga = new RouteTask(urlServicioRutas);
                tareaRutaEvaluacionRecarga.solve(parametrosSegundaRuta, function(eventoRutaRecarga){

                  var rutaEvaluacionRecarga = eventoRutaRecarga.routeResults[0].route;
                  var gastoSegundoTramo = rutaEvaluacionRecarga.attributes.Total_ConsumoKWh;
                  var recargaNecesaria = ((gastoSegundoTramo * 100) / bateriaDisponible);

                  dojo.byId("recargaNecesaria").innerHTML = "Para llegar al destino será necesario salir del punto de recarga con la batería al menos al " + Math.round(recargaNecesaria) + "% de su capacidad.";

                });

              }); 

            };

            puntoInicio = null;
            puntoFinal = null;

          });

          dojo.byId("errorUbicacion").innerHTML = "";

        } else {
          dojo.byId("errorUbicacion").innerHTML = "Seleccione un punto inicial y un punto final para calcular la ruta.";
          return;
        };

      });

    },

    onClose: function(){

      console.log('PFM_Ruta::onClose');
      // this.map.graphics.clear();
      this.map.itemInfo.itemData.operationalLayers[0].layerObject.setDefinitionExpression(null);
      this.map.itemInfo.itemData.operationalLayers[0].layerObject.clearSelection();
      this.map.itemInfo.itemData.operationalLayers[0].layerObject.show();

      this.bateria.value = 0;
      dojo.byId("selectorMarca").value = "Ninguno"
      dojo.byId("selectorModelo").innerHTML = "";
      dojo.byId("datosViaje").style.display = "none";
      dojo.byId("datosViajeCasoDos").style.display = "none";
      dojo.byId("datosSegundoCaso").style.display = "none";
      dojo.byId("datosTercerCaso").style.display = "none";
      dojo.byId("consumoTotal").innerHTML = "";
      dojo.byId("trayectoTotal").innerHTML = "";
      dojo.byId("primer")
      
    },

    // onMinimize: function(){
    //   console.log('PFM_Ruta::onMinimize');
    // },

    // onMaximize: function(){
    //   console.log('PFM_Ruta::onMaximize');
    // },

    // onSignIn: function(credential){
    //   console.log('PFM_Ruta::onSignIn', credential);
    // },

    // onSignOut: function(){
    //   console.log('PFM_Ruta::onSignOut');
    // }

    // onPositionChange: function(){
    //   console.log('PFM_Ruta::onPositionChange');
    // },

    // resize: function(){
    //   console.log('PFM_Ruta::resize');
    // }

    //methods to communication between widgets:

  });

});
//# sourceMappingURL=Widget.js.map
