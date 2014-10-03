
var SUFF_TIME_R = '_TIME_R', SUFF_TIME_T = '_TIME_T', SUFF_TIME = '_TIME', SUFF_PASS = '_PASS';

var posDevice = {
    location: {
        latitude: 0,
        longitude: 0
    },
    city: '' 
};

var posCenter;
var map;

$( document ).on( "pagecreate", "#map-page", function() {
    
    // OpenData REST
    openbusREST.initialize(_initOpenData);
    function _initOpenData() {
        console.log(' Init Open Data');
        $('#nameApp').html(openbusConfig.app + ' ' + openbusConfig.city + ', ' + openbusConfig.country)
    };

    initialize_map();

    function initialize_map () {
        
        console.log('*** Drawing OpenStreet Map ***');

        var center = { lat: openbusConfig.lat, lng: openbusConfig.lng};

        // create an object for options
         var options = {
           elt: document.getElementById(openbusConfig.mapElement),           // ID of map element on page
           zoom: openbusConfig.zoom,                                      // initial zoom level of the map
           latLng: center,                              // center of map in latitude/longitude
           mtype: 'map',                                  // map type (map, sat, hyb); defaults to map
           bestFitMargin: 0,                              // margin offset from map viewport when applying a bestfit on shapes
           zoomOnDoubleClick: true                        // enable map to be zoomed in when double-clicking on map
         };
     
         // construct an instance of MQA.TileMap with the options object
         map = new MQA.TileMap(options);

         // download the modules
         MQA.withModule('largezoom', 'viewoptions', 'geolocationcontrol', 'insetmapcontrol', 'mousewheel', function() {
         
           // add the Large Zoom control
           map.addControl(
             new MQA.LargeZoom(),
             new MQA.MapCornerPlacement(MQA.MapCorner.TOP_LEFT, new MQA.Size(5,5))
           );
         
           // add the Map/Satellite toggle button
           map.addControl(new MQA.ViewOptions());
         
           // add the Geolocation button
           map.addControl(
             new MQA.GeolocationControl(),
             new MQA.MapCornerPlacement(MQA.MapCorner.TOP_RIGHT, new MQA.Size(10,50))
           );
         
           // add the small Inset Map with custom options
           map.addControl(
             new MQA.InsetMapControl({
               size: { width: 150, height: 125 },
               zoom: 3,
               mapType: 'map',
               minimized: true
             }),
             new MQA.MapCornerPlacement(MQA.MapCorner.BOTTOM_RIGHT)
           );
         
           // enable zooming with your mouse
           map.enableMouseWheelZoom();
         });

         MQA.EventManager.addListener(map, 'moveend', _map);
         MQA.EventManager.addListener(map, 'dragend', _map);
         
         // openbusSM.isInCity(lat, lng, city, callback);
         navigator.geolocation.getCurrentPosition(_success_geolocation, _error_geolocation);

    };

    function convertToLatLng(latP, lngP) {
        var pos = { lat: latP, lng: lngP };
        return pos;
    }

    function _success_geolocation(position) {
        posDevice = {
            location: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            }
        };
        var pos = convertToLatLng(position.coords.latitude, position.coords.longitude); 
        reverseGeocode(pos);
        setCenter(pos);
        refresh(pos);
     };

    function _error_geolocation() {
        
        posDevice = {
            location: {
                latitude: openbusConfig.lat,
                longitude: openbusConfig.lng
            },
            city: openbusConfig.city
        };

        var pos = convertToLatLng(openbusConfig.lat, openbusConfig.lng);
        setCenter(pos);
        refresh(pos);
    };

    function setCenter (pos) {
        console.log('set center at ' + JSON.stringify(pos));
        map.setCenter(pos);
        map.setZoomLevel(openbusConfig.zoom);
    };

    function isMoved(pos) {

        var nd = getDistance(posDevice.location.latitude, posDevice.location.longitude, pos.lat, pos.lng);
        if (nd > openbusConfig.distance) {
            console.log('--- ti sei spostato più di ' + openbusConfig.distance + ' mt eseguo il refresh');
            posDevice = {
                location: {
                    latitude: pos.lat,
                    longitude: pos.lng
                }
            };
            reverseGeocode(pos);
            return true;
        } else {
            console.log('--- non ti sei spostato più di ' + openbusConfig.distance + ' mt');
            return false;
        }

    };

    function refresh(pos) {
        posCenter = pos;
        openbusREST.getFermate(_getFermate);  
    };
    
    function _map(evt) {
        console.log('_map ' + evt.eventname);
        posCenter = map.getCenter();
        refresh(posCenter);
    };

    function _addBusStation(item) {
        console.log(' added bus stations ' + JSON.stringify(item));
        add_busstation(item);
    }

    function _getFermate(response) {

        console.log('*** _getFermate start ***');

        // leggo tutte le fermate entro la distanza di default
        if (typeof response !== 'undefined') {
            $('#busstation_container').empty();
            var tt = sortByDistance(response);
            addBusStations(tt, openbusConfig.stations, _addBusStation);            

        } else {
            console.log('Error to read bus stations');
        }

    };
    
    // visualizza l'errore 
    function view_error(msg) {
        var html_code = '<p>' + msg + '</p>';
        $('#error_msg').html(html_code);
    };

    function click_timetable(element) {
        var station = element.data('station');
        var address = element.data('address');
        var lat_b = element.data('lat');
        var lng_b = element.data('lng');
        var action = element.data('action');

        if (action === 'routing') {

            // openbus.calcRoute(g_lat, g_lng, lat_b, lng_b, address, _calcRoute);
            var end = convertToLatLng(lat_b, lng_b);

            console.log('calculating route start from ' + JSON.stringify(posCenter) + ' to ' + JSON.stringify(end));
            routingExtended(posCenter, end);
        } else if (action === 'next') {
            var idlinea = $(this).data('linea');

            var idlinea_new = idlinea.replace('/', 'barrato');

            alert('Linea : ' + idlinea_new);
        }   
    }

    // calcola la distanza ed il percorso dal punto del dispositivo
    $('#busstation_container').on('click', 'a', function () {
        click_timetable($(this));
    });

    function add_busstation(item) {

        // tabella degli orari
        var idTimeT = item.IdFermata + SUFF_TIME + '_t';
        var idTimeR = item.IdFermata + SUFF_TIME + '_r';

        var distance = getDistance(posCenter.lat, 
                                   posCenter.lng, 
                                   item.PosizioneFermata.Latitudine, 
                                   item.PosizioneFermata.Longitudine);

        var html_code = '<div class="ui-grid-a">' + 
                        '   <div class="ui-block-a">' + 
                        '       <img src="img/time.png" width="16px" height="16px" /> Orari' +
                        '       <div class="ui-bar ui-bar-a" style="height:60px">' + 
                                    item.DescrizioneFermata + 
                        '       </div>' +
                        '       <ul data-role="listview" data-shadow="false" data-inset="true" data-corners="false" ' + 
                        '           id="' + idTimeT + '"></ul>' +
                        '   </div>' +
                        '   <div class="ui-block-b">' +
                        '       <img src="img/bus.png" width="16px" height="16px" /> Bus in arrivo' +
                        '       <div class="ui-bar ui-bar-a" style="height:60px">' + 
                        '           <a href="#popupInfo" data-rel="popup" data-position-to="window" data-transition="pop" class="ui-btn ui-corner-all ui-shadow ui-btn-inline ui-icon-location ui-btn-icon-left ui-btn-b" ' +
                        '               data-station="' + item.IdFermata + '" ' +
                        '               data-action="routing"' +
                        '               data-address="' + item.DescrizioneFermata + '" ' +
                        '               data-lat="' + item.PosizioneFermata.Latitudine + '" ' +
                        '               data-lng="' + item.PosizioneFermata.Longitudine + '">' + distance + ' mt </a>' +
                        '       </div>' +
                        '   <ul data-role="listview" data-shadow="false" data-inset="true" data-corners="false" ' + 
                        '   id="' + idTimeR + '"></ul>' +
                        '   </div>' +
                        '</div>';

        $('#busstation_container').append(html_code);

        openbusREST.getOrarioPalinaTeorico(item.IdFermata, _oraripalina_teorico);
        openbusREST.getOrarioPalinaRealtime(item.IdFermata, _oraripalina_realtime);
        
    };

    function getDateFormatEU(dateStr) {
        var d = moment.tz(dateStr, "Europe/Rome");
        console.log('create date: ' + d.format('h:mm:ss a'));
        return d.format('h:mm:ss a');
    };

    sortByTime = function(array){
        return _.sortBy(array, function (element) {
            return getDateFormatEU(element.OrarioArrivo)
        });
    };

    sortByDistance = function(array){
        return _.sortBy(array, function (element) {
            return getDistance(posCenter.lat,
                               posCenter.lng, 
                               element.PosizioneFermata.Latitudine, 
                               element.PosizioneFermata.Longitudine);
        });
    };

    function _addBus(bus) {
        console.log(' added bus ' + JSON.stringify(bus));
    }

    function _oraripalina_realtime(response, station) {
        var idElement = '#' + station + SUFF_TIME + '_r';
        $(idElement).empty();
        addTimeTable(response, station, idElement);
        addBus(response, station, _addBus);
    };

    // aggunge gli orari di ogni linea
    function addTimeTable(response, station, idElement) {

        // orari teorici
        var html_code = '<table data-role="table" data-mode="columntoggle" class="ui-responsive table-stroke">' +
                    '<thead>' +
                    '   <tr>' +
                    '       <th data-priority="2">Linea</th>' + 
                    '       <th>Corsa</th>' +
                    '       <th>Arrivo</th>' +
                    '   </tr>' +
                    '</thead>' +
                    '<tbody>';

        // ordina gli orari 
        var tt = sortByTime(response.PrevisioniLinee);

        tt.forEach( function (lineBus) {

            console.log(' add line bus ' + lineBus.IdLinea);

            html_code += '<tr>' +
                         '<th><b>' + lineBus.IdLinea + '</b></th>' +
                         '<td>' + lineBus.IdCorsa + '</td>' +
                         '<td>' + getDateFormatEU(lineBus.OrarioArrivo) + '</td>' +
                         '<td><a href="#panel-next" data-action="next" data-linea="' + lineBus.IdLinea + '"><img src="img/next.png" /></a></td>' +
                         '</tr>';
        
            console.log('add bus --> ' + lineBus.IdLinea + ' (' + lineBus.IdCorsa + ') , element: ' + idElement);
        });

        html_code += '</tbody></table>';

        $(idElement).html(html_code);
    }

    function _oraripalina_teorico(response, station) {
        var idElement = '#' + station + SUFF_TIME + '_t';
        $(idElement).empty();
        addTimeTable(response, station, idElement);
    };

    // cerca un indirizzo
    $( "#search-btn" ).click(function(  ) {
        var address = $( "#search-address" ).val();
        if (address !== '') {
            geocode(address);
        }   
    });

    $( "#search-address" ).keypress(function( event ) {
          if ( event.which == 13 && $( "#search-address" ).val() != '') {
            geocode($( "#search-address" ).val());  
          }
    });

    function addMarker (lat, lng, image, title, content, key) {

        console.log('add marker ' + title + ' ' + content);

         var pos = { lat: lat, lng: lng };

         // create a POI by passing in a lat/lng object to the MQA.Poi constructor
         var marker = new MQA.Poi(pos);

         // set the POI to use the MQA.Icon object instead of its default icon
         marker.setIcon(new MQA.Icon(image, 24, 24));
         
         // set the shadow offset for the custom icon if needed
         marker.setShadowOffset({ x: 10, y: -25});

         //marker.setHtml(title, 0, 0, 'mqa_htmlpoi');

         //marker.key = key;
         marker.addExtraField('key', key);
         
         marker.setRolloverContent(title);
         marker.setInfoContentHTML(content);
         
         // add POI to the map's default shape collection
         map.addShape(marker);

         MQA.EventManager.addListener(marker, 'click', _eventMarker);

         // map.bestFit();
        
    };

    function _eventMarker(evt) {
       console.log('event marker click raised');
       //alert(evt);
    };

    function getDistance (latOrigin, lngOrigin, latDestination, lngDestination) {
        var llOne = { lat: latOrigin, lng: lngOrigin };    
        var llTwo = { lat: latDestination, lng: lngDestination };   
 
        return Math.ceil(MQA.Util.distanceBetween(llOne, llTwo, 'KM') * 1000);
    };

    function addBus(collection, busstation, callback) {

        var i = 0;
        console.log('*** start add collection bus ***');
        var c = new MQA.ShapeCollection();
        c.collectionName = busstation;
        c.minZoomLevel = 7;

        console.log(' bus to addedd ' + collection.length + ' data : ' + JSON.stringify(collection));

        while (collection[i]) {
    
            var point = { 
                lat: collection[i].UltimeCoordinateMezzo.Latitudine, 
                lng: collection[i].UltimeCoordinateMezzo.Longitudine
            }

            var poi = new MQA.Poi(point);
            poi.addExtraField('corsa', collection[i].IdCorsa);
            poi.addExtraField('linea', collection[i].IdLinea);
            poi.setRolloverContent(collection[i].IdLinea);
            poi.setInfoContentHTML(collection[i].IdCorsa + ' - ' +  getDateFormatEU(collection[i].OrarioArrivo));
            poi.setIcon(new MQA.Icon('http://obb.gzileni.name/img/bus.png'), 32, 25);
            c.add(poi);

            if (typeof callback === 'function') {
                callback(collection[i]);
            }

            i++;

        };

        map.addShapeCollection(c);

        //map.bestFit();
    };

    function addBusStations (collection, limit, callback) {

        console.log('*** start add collection bus station ***');
        var c = new MQA.ShapeCollection();
        c.collectionName = 'bus_station';
        c.minZoomLevel = 7;

        console.log('*** start add collection bus station ***');

        for (var i=0; i < limit; i++) {

            console.log(i + ') ' + collection[i].IdFermata)

            var point = { 
                lat: collection[i].PosizioneFermata.Latitudine, 
                lng: collection[i].PosizioneFermata.Longitudine 
            }

            var poi = new MQA.Poi(point);
            poi.addExtraField('name', collection[i].IdFermata);
            poi.addExtraField('address', collection[i].DescrizioneFermata);
            poi.setRolloverContent(collection[i].IdFermata);
            poi.setInfoContentHTML(collection[i].DescrizioneFermata);
            poi.setIcon(new MQA.Icon('http://obb.gzileni.name/img/flag.png'), 21, 26);
            c.add(poi);

            if (typeof callback === 'function') {
                callback(collection[i]);
            }

        };

        map.addShapeCollection(c);
        // map.bestFit();

    };

    function geocode(address) {

        var url = 'http://www.mapquestapi.com/geocoding/v1/address?key=' + openbusConfig.key + '&outFormat=json&inFormat=json&json=' +
                  '{"location":{"street":"' + address + ', Bari, IT"},"options":{"thumbMaps":true}}';

        $.getJSON(url, function (response) {
            if (typeof response !== 'undefined') {
                response.results.forEach( function(item) {
                    console.log('item founded --> ' + JSON.stringify(item.locations[0].adminArea5));
                    if (item.locations[0].adminArea5 == openbusConfig.city) {
                        setCenter(item.locations[0].latLng);
                        refresh(item.locations[0].latLng);
                    }
                });
            }
        });
    }

    function reverseGeocode(pos) {
        // download the geocoder module
         MQA.withModule('geocoder', function() {
            map.reverseGeocodeAndAddLocation(pos, _showAddress);
         });

    };

    function _showAddress(data) {
        var response = data.results[0].locations[0];
        posDevice.city = response.adminArea5;
    };

    function routing(start, end, callback) {
        MQA.withModule('new-route', function() {
 
       // uses the MQA.TileMap.addRoute function to pass in an array
       // of locations as part of the request parameter
           map.addRoute({
             request: {
               locations: [
                 { latLng: start},
                 { latLng: end}
               ]
             }
           });

           if (typeof callback === 'function') {
            callback(); 
           }

         });
    };

    function _routing() {
        map.setZoomLevel(openbusConfig.zoom);
    };

    function routingExtended(start, end) {

        // download the module
        MQA.withModule('new-route', function() {
     
            // uses the MQA.TileMap.addRoute function to pass in an array
            // of locations as part of the request parameter
            var opt = {
                request: {
                    locations: [
                        { latLng: start},
                        { latLng: end}
                      ],
                    options: {
                         avoids: [],
                         avoidTimedConditions: false,
                         doReverseGeocode: true,
                         shapeFormat: 'raw',
                         generalize: 0,
                         routeType: 'fastest',
                         timeType: 1,
                         locale: 'en_US',
                         unit: 'm',
                         enhancedNarrative: false,
                         drivingStyle: 2,
                         highwayEfficiency: 21.0
                    }
                },
                display: {
                    color: '#800000',
                    borderWidth: 10
                },
                // on success, display the route narrative
                success: function displayNarrative(data) {
                    if (data.route) {
                        var legs = data.route.legs, html = '', i = 0, j = 0, trek, maneuver;
         
                        html += '<table data-role="table" id="table-column-toggle" data-mode="columntoggle" class="ui-responsive table-stroke">' +
                                 '<thead>' + 
                                 '  <tr>' +
                                 '  <th data-priority="2"></th>' +
                                 '</thead>' +
                                 '<tbody>';
         
                        for (i=0; i<legs.length; i++) {
                            for (j=0; j<legs[i].maneuvers.length; j++) {
                                maneuver = legs[i].maneuvers[j];
                                html += '<tr>';
                                html += '<td>';
         
                                if (maneuver.iconUrl) {
                                    html += '<img src="' + maneuver.iconUrl + '" />';
                                }
         
                                for (k=0; k<maneuver.signs.length; k++) {
                                    var sign = maneuver.signs[k];
         
                                    if (sign && sign.url) {
                                        html += '<img src="' + sign.url + '" />';
                                    }
                                }
         
                                html += '</td><td>' + maneuver.narrative + '</td>';
                                html += '</tr>';
                            }
                        }
         
                        html += '</tbody></table>';
                        $('#route_container').html(html);
                    }
                }
            }

            map.addRoute(opt);

            if (typeof callback === 'function') {
                callback();
            }
        });
    }
});