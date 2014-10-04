
var URL_OPENDATA = 'http://bari.opendata.planetek.it/OrariBus/v2.0/OpenDataService.svc/REST/';

var openbusREST = {

	initialize: function(callback) {
		// controllo l'aggiornamento dei dati tra i due server API
		if (typeof callback === 'function') {
      		callback();
      	}
	},

  getFermateLinea: function (fermate, linea, laststop, callback) {
    
    var islast= false;
    var url = URL_OPENDATA + 'rete/FermateLinea/' + linea;

    console.log('*** getFermateLinee start ***');

    openbusREST.makeJSONrequest(url, _getFLinea);

    /*
    this.getFermate(_getF);

    function _getF(fermate) {
      // leggo le fermate della linea
      f = fermate;
      
    };

    */

    function _getFLinea(fermatelinea) {
      var i=0;
      while (fermatelinea[i]) {
        console.log(' Fermata ' + fermatelinea[i].IdFermata + ' vs ' + laststop);
        if (!islast) islast = fermatelinea[i].IdFermata == laststop;
        if (islast) {
          console.log('stata raggiunta');
          var dir = fermatelinea[i].Direzione;
          var busstop = fermatelinea[i].IdFermata;
          var descrizione = getDescrizioneFermata(fermate, busstop);

          if (typeof callback === 'function') {
            callback(dir, busstop, descrizione); 
          }
        } else {
          console.log('non è stata raggiunta la stazione ');
        };
        i++; 
      }
    };

    function getDescrizioneFermata (collection, idfermata) {
      var i, ret='';
      while (collection[i]) {
        console.log(collection[i].IdFermata + ' vs ' + idfermata);
        if (collection[i].IdFermata.toString() === idfermata) {
          ret = collection[i].DescrizioneFermata;
          break;
        }
        i++;
      }

      return ret;
    }
  },

  getOrarioPalinaTeorico: function (station, callback) {
    var url = URL_OPENDATA + 'OrariPalina/' + station + '/teorico/';

    this.makeJSONrequest(url, _getOrarioPalina);

    function _getOrarioPalina(result) {
      if (typeof callback === 'function') {
        callback(result, station);
      }
    };

  },

	getOrarioPalinaRealtime: function (station, callback) {

    var url = URL_OPENDATA + 'OrariPalina/' + station + '/realtime/';

    openbusREST.makeJSONrequest(url, _getOrarioPalina);

    function _getOrarioPalina(result) {
      if (typeof callback === 'function') {
        callback(result, station);
      }
    }

	},

  getFermate: function (callback) {

    var url = URL_OPENDATA + 'rete/Fermate';
    console.log('*** getFermate start with url ' + url);
    
    this.makeJSONrequest(url, callback);
  },

	makeCorsRequest: function(url, item, type, callback) {
      
      var error = false;
      var errorMsg = '';

      var xhr = createCORSRequest('GET', url);
      if (!xhr) {
        alert('CORS not supported');
        return;
      }

      // Response handlers.
      xhr.onload = function() {
        var text = xhr.responseText;
        var title = getTitle(text);
        errorMsg = '';
        error=false;
        // alert('Response from CORS request to ' + url + ': ' + title);
      };

      xhr.onerror = function() {
      	error = true;
        errorMsg = 'Woops, there was an error making the request.';
      };

      xhr.setRequestHeader('Access-Control-Allow-Origin', '*');

      xhr.send();

      if (typeof callback === 'function') {
      	callback(xhr.response, item, type, error, errorMsg)
      }
    },

    makeJSONrequest: function (url, callback) {

      console.log('get JSON data from url ' + url);

      $.getJSON(url, function (result) {
          if (typeof callback === 'function')
          	callback(result);
      });

    },

    // JQuery CORS request
    makeAJAXrequest: function(url, callback) {

        $.ajax({

          // The 'type' property sets the HTTP method.
          // A value of 'PUT' or 'DELETE' will trigger a preflight request.
          type: 'GET',

          // The URL to make the request to.
          url: url,

          // The 'contentType' property sets the 'Content-Type' header.
          // The JQuery default for this property is
          // 'application/x-www-form-urlencoded; charset=UTF-8', which does not trigger
          // a preflight. If you set this value to anything other than
          // application/x-www-form-urlencoded, multipart/form-data, or text/plain,
          // you will trigger a preflight request.
          contentType: 'text/plain',

          xhrFields: {
            // The 'xhrFields' property sets additional fields on the XMLHttpRequest.
            // This can be used to set the 'withCredentials' property.
            // Set the value to 'true' if you'd like to pass cookies to the server.
            // If this is enabled, your server must respond with the header
            // 'Access-Control-Allow-Credentials: true'.
            withCredentials: false
          },

          headers: {
            // Set any custom headers here.
            // If you set any non-simple headers, your server must include these
            // headers in the 'Access-Control-Allow-Headers' response header.
            'Access-Control-Allow-Origin': '*'
          },

          success: function(data) {
            // Here's where you handle a successful response.
            console.log('Success ---> ' + JSON.stringify(data));

            if (typeof callback === 'function') {
                callback(data);
            }

          },

          error: function() {
            // Here's where you handle an error response.
            // Note that if the error was due to a CORS issue,
            // this function will still fire, but there won't be any additional
            // information about the error.
            console.log('Error to get request from opendata ');
          }
        });
    }
	
}