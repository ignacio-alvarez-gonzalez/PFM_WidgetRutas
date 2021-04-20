define(['dojo/_base/declare', 'jimu/BaseWidget', "esri/SpatialReference", "esri/tasks/FeatureSet", "esri/layers/FeatureLayer", "esri/tasks/RouteTask", "esri/tasks/RouteParameters", "esri/tasks/RouteResult", "esri/tasks/NATypes", "esri/tasks/GeometryService", "esri/tasks/BufferParameters", "esri/tasks/QueryTask", "esri/tasks/query", "esri/toolbars/draw", "esri/geometry/Point", "esri/symbols/SimpleFillSymbol", "esri/symbols/SimpleLineSymbol", "esri/symbols/SimpleMarkerSymbol", "esri/graphic", "esri/Color", "dojo/on"], function (declare, BaseWidget, SpatialReference, FeatureSet, FeatureLayer, RouteTask, RouteParameters, RouteResult, NATypes, GeometryService, BufferParameters, QueryTask, Query, Draw, Point, SimpleFillSymbol, SimpleLineSymbol, SimpleMarkerSymbol, Graphic, Color, on) {

  return declare([BaseWidget], {

    baseClass: 'pfm-ruta',

    postCreate: function postCreate() {
      this.inherited(arguments);
      console.log('PFM_Ruta::postCreate');
    },

    // startup: function() {
    //   this.inherited(arguments);
    //   console.log('PFM_Ruta::startup');
    // },

    onOpen: function onOpen() {
      console.log('PFM_Ruta::onOpen');

      var miMapa = this.map;

      var capaPuntosRecarga = this.map.itemInfo.itemData.operationalLayers[0];

      var puntoInicio;
      var ubicacionInicio;
      var puntoFinal;
      var ubicacionFinal;

      miMapa.graphics.clear();

      on(dojo.byId("seleccionInicio"), "click", function () {

        miMapa.graphics.remove(ubicacionInicio);

        var herramientaDibujo = new Draw(miMapa);
        herramientaDibujo.activate(Draw.POINT);
        herramientaDibujo.on("draw-end", function (evento) {

          puntoInicio = new Point(evento.geometry);

          var miSimboloUbicacion = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_SQUARE, 10, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 0, 0]), 1), new Color([255, 255, 255]));

          ubicacionInicio = new Graphic(puntoInicio, miSimboloUbicacion);
          miMapa.graphics.add(ubicacionInicio);

          herramientaDibujo.deactivate();
        });
      });

      on(dojo.byId("seleccionFinal"), "click", function () {

        miMapa.graphics.remove(ubicacionFinal);

        var herramientaDibujo = new Draw(miMapa);
        herramientaDibujo.activate(Draw.POINT);
        herramientaDibujo.on("draw-end", function (evento) {

          puntoFinal = new Point(evento.geometry);

          var miSimboloUbicacion = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_SQUARE, 10, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 0, 0]), 1), new Color([255, 255, 255]));

          ubicacionFinal = new Graphic(puntoFinal, miSimboloUbicacion);
          miMapa.graphics.add(ubicacionFinal);

          herramientaDibujo.deactivate();
        });
      });

      on(dojo.byId("calcularRuta"), "click", function () {

        if (dojo.byId("bateria").value == 0) {
          dojo.byId("errorUbicacion").innerHTML = "Introduzca la capacidad de su batería";
          return;
        };

        if (puntoInicio != null && puntoFinal != null) {

          var entidades = [];
          entidades.push(ubicacionInicio);
          entidades.push(ubicacionFinal);

          var ubicaciones = new FeatureSet();
          ubicaciones.features = entidades;

          var tareaRuta = new RouteTask("https://localhost:6443/arcgis/rest/services/PFM/20210403_pruebaPublicarServiciosRutas_v2/NAServer/Route");

          var parametrosRuta = new RouteParameters();
          parametrosRuta.accumulateAttributes = ["ConsumoKWh", "Length", "Tiempo_coche"];
          parametrosRuta.preserveFirstStop = true;
          parametrosRuta.preserveLastStop = true;
          parametrosRuta.restrictUTurns = NATypes.UTurn.AT_DEAD_ENDS_ONLY;
          parametrosRuta.outputLines = NATypes.OutputLine.TRUE_SHAPE_WITH_MEASURE;
          parametrosRuta.stops = ubicaciones;
          parametrosRuta.outSpatialReference = miMapa.spatialReference;

          tareaRuta.solve(parametrosRuta, function (evento) {

            console.log("Resultados de la ruta: ", evento);
            var rutaPrimerCaso = evento.routeResults[0].route;
            var simboloRuta = new SimpleLineSymbol("solid", new Color([255, 127, 0]), 3);

            if (rutaPrimerCaso.attributes.Total_ConsumoKWh < dojo.byId("bateria").value) {

              rutaPrimerCaso.setSymbol(simboloRuta);
              miMapa.graphics.add(rutaPrimerCaso);
              miMapa.setExtent(rutaPrimerCaso.geometry.getExtent(), true);
              dojo.byId("consumoTotal").innerHTML = "El consumo total del trayecto será " + Math.round(rutaPrimerCaso.attributes.Total_ConsumoKWh * 100) / 100 + "kWh.";
              dojo.byId("trayectoTotal").innerHTML = "El trayecto recorrerá " + Math.round(rutaPrimerCaso.attributes.Total_Length / 1000 * 100) / 100 + "km en " + Math.round(rutaPrimerCaso.attributes.Total_Tiempo_coche * 100) / 100 + "horas.";
            } else {

              dojo.byId("datosSegundoCaso").style.visibility = "visible";

              on(dojo.byId("buscarPuntosRecarga"), "click", function () {

                var servicioGeometria = new GeometryService("https://utility.arcgisonline.com/arcgis/rest/services/Geometry/GeometryServer");

                var parametrosAI = new BufferParameters();
                parametrosAI.geometries = [rutaPrimerCaso.geometry];
                parametrosAI.distances = [dojo.byId("distancia").value];
                parametrosAI.unit = GeometryService.UNIT_KILOMETER;
                parametrosAI.outSpatialReference = miMapa.spatialReference;

                servicioGeometria.buffer(parametrosAI);
                servicioGeometria.on("buffer-complete", function (eventoBuffer) {

                  miMapa.setExtent(eventoBuffer.geometries[0].getExtent(), true);

                  var simboloAI = new SimpleFillSymbol(SimpleFillSymbol.STYLE_NULL, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255, 0, 0, 0.65]), 3), new Color([255, 0, 0, 0.35]));

                  var graficoAI;

                  dojo.forEach(eventoBuffer.geometries, function (parametro) {
                    graficoAI = new Graphic(parametro, simboloAI);
                    miMapa.graphics.add(graficoAI);
                  });

                  console.log(graficoAI);

                  var consultaPdR = new Query();
                  consultaPdR.where = "1=1";
                  consultaPdR.outFields = ["*"];
                  consultaPdR.geometry = graficoAI.geometry;
                  consultaPdR.returnGeometry = true;
                  consultaPdR.outSpatialReference = new SpatialReference(102100);

                  capaPuntosRecarga.layerObject.queryFeatures(consultaPdR);

                  var miTareaDeConsulta = new QueryTask(capaPuntosRecarga.url);
                  miTareaDeConsulta.executeForIds(consultaPdR, function (resultado) {

                    console.log("El mapa: ", miMapa), console.log("Resultados de la consulta: ", resultado);

                    var expresiones = [];

                    dojo.forEach(resultado, function (idPunto) {
                      // capaPuntosRecarga.layerObject.setDefinitionExpression("objectid = " + [idPunto]);
                      expresiones.push("objectid = " + [idPunto] + " or ");
                    });

                    expresiones.push("objectid = 0");

                    var expresionDefinicion = [];

                    dojo.forEach(expresiones, function (expresion) {
                      expresionDefinicion += expresion;
                    });

                    console.log(expresionDefinicion);
                    capaPuntosRecarga.layerObject.setDefinitionExpression(expresionDefinicion);

                    // capaPuntosRecarga.layerObject.setDefinitionExpression("objectid = 1 or objectiid = 2");
                    // capaPuntosRecarga.layerObject.setDefinitionExpression("objectid = 'B:SM Serveis Municipals'");
                  });
                  miTareaDeConsulta.on("execute-for-ids-complete", function () {
                    dojo.byId("datosTercerCaso").style.visibility = "visible";
                  });
                });
              });

              var herramientaSeleccion = new Draw(miMapa);

              on(dojo.byId("seleccionarPunto"), function () {

                herramientaSeleccion.activate(Draw.EXTENT);
                herramientaSeleccion.on("draw-end", function (eventoSeleccion) {

                  var consultaSeleccion = new Query();
                  consultaSeleccion.geometry = eventoSeleccion.geometry;

                  var simboloSeleccion = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_SQUARE, 10, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 0, 0]), 1), new Color([255, 0, 0]));

                  capaPuntosRecarga.layerObject.setSelectionSymbol(simboloSeleccion);
                  capaPuntosRecarga.layerObject.selectFeatures(consultaSeleccion);
                });
              });

              on(dojo.byId("recalcularRuta"), "click", function () {

                herramientaSeleccion.deactivate();

                var puntoSeleccionado = capaPuntosRecarga.layerObject.getSelectedFeatures();
                console.log(puntoSeleccionado);

                if (puntoSeleccionado.length == 0) {
                  dojo.byId("errorPunto").innerHTML = "Es necesario que seleccione un punto donde recargar.";
                  return;
                };

                var entidadesSegundaRuta = [];

                var miSimboloUbicacion = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_SQUARE, 10, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 0, 0]), 1), new Color([255, 255, 255]));

                entidadesSegundaRuta.push(ubicacionInicio);

                if (puntoSeleccionado.length == 1) {
                  var ubicacionIntermedia = new Graphic(puntoSeleccionado[0].geometry, miSimboloUbicacion);
                  entidadesSegundaRuta.push(ubicacionIntermedia);
                } else if (puntoSeleccionado.length == 2) {
                  var ubicacionIntermedia1 = new Graphic(puntoSeleccionado[0].geometry, miSimboloUbicacion);
                  entidadesSegundaRuta.push(ubicacionIntermedia1);
                  var ubicacionIntermedia2 = new Graphic(puntoSeleccionado[1].geometry, miSimboloUbicacion);
                  entidadesSegundaRuta.push(ubicacionIntermedia2);
                } else if (puntoSeleccionado.length == 3) {
                  var ubicacionIntermedia1 = new Graphic(puntoSeleccionado[0].geometry, miSimboloUbicacion);
                  entidadesSegundaRuta.push(ubicacionIntermedia1);
                  var ubicacionIntermedia2 = new Graphic(puntoSeleccionado[1].geometry, miSimboloUbicacion);
                  entidadesSegundaRuta.push(ubicacionIntermedia2);
                  var ubicacionIntermedia3 = new Graphic(puntoSeleccionado[2].geometry, miSimboloUbicacion);
                  entidadesSegundaRuta.push(ubicacionIntermedia3);
                } else {
                  dojo.byId("errorPunto").innerHTML = "Seleccione 3 o menos puntos únicamente.";
                  return;
                };

                entidadesSegundaRuta.push(ubicacionFinal);

                var ubicacionesSegundaRuta = new FeatureSet();
                ubicacionesSegundaRuta.features = entidadesSegundaRuta;

                var tareaSegundaRuta = new RouteTask("https://localhost:6443/arcgis/rest/services/PFM/20210403_pruebaPublicarServiciosRutas_v2/NAServer/Route");

                var parametrosSegundaRuta = new RouteParameters();
                parametrosSegundaRuta.accumulateAttributes = ["ConsumoKWh", "Length", "Tiempo_coche"];
                parametrosSegundaRuta.preserveFirstStop = true;
                parametrosSegundaRuta.preserveLastStop = true;
                parametrosSegundaRuta.restrictUTurns = NATypes.UTurn.AT_DEAD_ENDS_ONLY;
                parametrosSegundaRuta.outputLines = NATypes.OutputLine.TRUE_SHAPE_WITH_MEASURE;
                parametrosSegundaRuta.stops = ubicacionesSegundaRuta;
                parametrosSegundaRuta.outSpatialReference = miMapa.spatialReference;

                tareaSegundaRuta.solve(parametrosSegundaRuta, function (evento) {

                  var rutaSegundoCaso = evento.routeResults[0].route;
                  var simboloRuta = new SimpleLineSymbol("solid", new Color([255, 127, 0]), 3);

                  rutaSegundoCaso.setSymbol(simboloRuta);
                  miMapa.graphics.add(rutaSegundoCaso);
                  miMapa.setExtent(rutaSegundoCaso.geometry.getExtent(), true);

                  dojo.byId("consumoTotal").innerHTML = "El consumo total del trayecto será " + Math.round(rutaSegundoCaso.attributes.Total_ConsumoKWh * 100) / 100 + "kWh.";
                  dojo.byId("trayectoTotal").innerHTML = "El trayecto recorrerá " + Math.round(rutaSegundoCaso.attributes.Total_Length / 1000 * 100) / 100 + "km en " + Math.round(rutaSegundoCaso.attributes.Total_Tiempo_coche * 100) / 100 + "horas.";
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

    onClose: function onClose() {

      console.log('PFM_Ruta::onClose');
      // this.map.graphics.clear();
      this.map.itemInfo.itemData.operationalLayers[0].layerObject.setDefinitionExpression(null);
      this.bateria.value = 0;
      dojo.byId("datosSegundoCaso").style.visibility = "hidden";
      dojo.byId("datosTercerCaso").style.visibility = "hidden";
      this.map.itemInfo.itemData.operationalLayers[0].layerObject.clearSelection();
    }

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
//# sourceMappingURL=Widget_versionAnterior_1.js.map
