
var openbusAPI = {

	initialize: function (orgname, appname, callback) {
        
        console.log('Init User Object...');
        
        var apigeeConfig = {
            orgName: orgname,       // Your organization name. You'll find this in the admin portal.
            appName: appname,       // Your App Services app name. It's in the admin portal.
            logging: true,          //optional - turn on logging, off by default
            buildCurl: true 
        };
        
        console.log('Init apiGEE config with ' + JSON.stringify(apigeeConfig));
        
        this.aClient = new Apigee.Client(apigeeConfig);
        
        if (typeof(callback) === 'function') {
            callback();
        }
    }, 
    aClient: null, // client object to connect apigee

    getBusStation: function (lat, lng, distance, callback) {

        // var l = getLimit(distance);

        console.log('get stations around ' + lat + ', ' + lng + ' bus stations around ' + distance + ' meters');

        var options = {
            type: 'busstations', //Required - the type of collection to be retrieved
            client: this.aClient,
            qs: { 
                ql: 'location within ' + distance + ' of ' + lat + ', ' + lng ,
                limit: 10
            }
        };
        
        console.log('*** reading bus stations ---> ' + JSON.stringify(options));
        
        //Create a collection object to hold the response
        var collection = new Apigee.Collection(options);

        //Call request to initiate the API call
        collection.fetch(function (error, response) {
            if (error) {
                console.log('Error to retrieve bus stations.');
            } else {
                console.log('OK to retrieve bus stations successfull!');      
            }
            
            if (typeof(callback) === 'function') {
                callback(response.entities, error);
            }
        });

        function getLimit(distance) {
            var limit = Math.ceil(distance / 1000) + 1;

            if (limit > 1000) limit = 1000;

            return limit;
        };
    },
    
    createStation: function (item, callback) {
     
        var properties = {
            type: 'busstations',
            name: item.name,
            address: item.address,
            location: {
                latitude: item.location.latitude,
                longitude: item.location.longitude
            }
        };
        
        console.log('Options: ' + JSON.stringify(properties));
    
        this.aClient.createEntity(properties, function (errorStatus, entity, errorMessage) { 
            console.log('****');
            if (errorStatus) { 
                console.log('Error to create station ' + JSON.stringify(errorMessage));
            } else { 
                console.log('Created bus station succefull !!')
            }
            
            if (typeof(callback) === 'function') {
                callback(entity._data, errorStatus, errorMessage);
            }
        });
    }
}

