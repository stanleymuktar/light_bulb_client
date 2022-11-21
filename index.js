var AWS = require('aws-sdk');
var AWSIoTData = require('aws-iot-device-sdk');

console.log('Loaded AWS SDK for JavaScript and AWS IoT SDK for Node.js');

// Cognito pool ID
var poolID = "us-east-1:dce40a1b-8b77-4d06-82e0-85abcb828ba7"
// endpoint URL
var endpointURL = "alfmz4kip273p-ats.iot.us-east-1.amazonaws.com"
// region server
var region = "us-east-1"

//topics

/*
light status
turns light on or off. (light intensity 100 for 1, light intensity 0 for 0)
topic = light_bulb/status
data = [1 | 0]
ex. data = 1
*/
statusTopic = "light_bulb/status"

/*
light intensity
adjusts light intensity.
topic = light_bulb/intensity
data = [0 - 100]
ex. data = 52
*/
intensityTopic = "light_bulb/intensity"

/*
light color
changes color of light.
topic = light_bulb/color
data = #[0 - FF][0 - FF][0 - FF]
ex. data = #ff129e
*/
colorTopic = "light_bulb/color"

//client ID
var clientID = 'mqtt_client-' + (Math.floor((Math.random() * 100000) + 1));

// AWS region
AWS.config.region = region;

// AWS Cognito pool ID
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
   IdentityPoolId: poolID
});

//
// Create the AWS IoT device object.  Note that the credentials must be 
// initialized with empty strings; when we successfully authenticate to
// the Cognito Identity Pool, the credentials will be dynamically updated.
//
const mqttClient = AWSIoTData.device({
   //
   // Set the AWS region we will operate in.
   //
   region: AWS.config.region,
   //
   ////Set the AWS IoT Host Endpoint
   host: endpointURL,
   //
   // Use the clientId created earlier.
   //
   clientId: clientID,
   //
   // Connect via secure WebSocket
   //
   protocol: 'wss',
   //
   // Set the maximum reconnect time to 8 seconds; this is a browser application
   // so we don't want to leave the user waiting too long for reconnection after
   // re-connecting to the network/re-opening their laptop/etc...
   //
   maximumReconnectTimeMs: 8000,
   //
   // Enable console debugging information (optional)
   //
   debug: true,
   //
   // IMPORTANT: the AWS access key ID, secret key, and sesion token must be 
   // initialized with empty strings.
   //
   accessKeyId: '',
   secretKey: '',
   sessionToken: ''
});

// Attempt to authenticate to the Cognito Identity Pool.
var cognitoIdentity = new AWS.CognitoIdentity();
AWS.config.credentials.get(function(err, data) {
   if (!err) {
      console.log('retrieved identity: ' + AWS.config.credentials.identityId);
      var params = {
         IdentityId: AWS.config.credentials.identityId
      };
      cognitoIdentity.getCredentialsForIdentity(params, function(err, data) {
         if (!err) {
            //
            // Update our latest AWS credentials; the MQTT client will use these
            // during its next reconnect attempt.
            //
            mqttClient.updateWebSocketCredentials(data.Credentials.AccessKeyId,
               data.Credentials.SecretKey,
               data.Credentials.SessionToken);
         } else {
            console.log('error retrieving credentials: ' + err);
            alert('error retrieving credentials: ' + err);
         }
      });
   } else {
      console.log('error retrieving identity:' + err);
      alert('error retrieving identity: ' + err);
   }
});

// Connect handler

window.mqttClientConnectHandler = function() {
    console.log('connected.');
    document.querySelector("#light-status").disabled = false;
    document.getElementById("intensity").disabled = false;
    document.getElementById("color").disabled = false;

    showNotification();
    notificationToConnected();

    // Subscribe to our topics.

    mqttClient.subscribe(statusTopic);
    mqttClient.subscribe(intensityTopic);
    mqttClient.subscribe(colorTopic);
};

// Reconnect handler

window.mqttClientReconnectHandler = function() {
    console.log('reconnect');

    showNotification();
    notificationToConnecting();

    document.querySelector("#light-status").disabled = true;
    document.getElementById("intensity").disabled = true;
    document.getElementById("color").disabled = true;
};

// invoked when light status UI updated

window.lightStatusUpdated = function(){
    var status = document.querySelector("#light-status").checked;
    status = (status) ? "1":"0";

    console.log("light status = ", status);
    mqttClient.publish(statusTopic, status);
}

// invoked when light intensity UI updated

window.intensityUpdated = function(){
    var intensity = document.getElementById("intensity").value.toString();

    console.log("intensity = ", intensity);
    mqttClient.publish(intensityTopic, intensity);
}

// invoked when light color UI updated

window.colorUpdated = function(){
    var color = document.getElementById("color").value.toString();

    console.log("color = ", color);
    mqttClient.publish(colorTopic, color);
}

// show notification

window.showNotification = function(){
    var notification = document.getElementById("notification");
    notification.style.opacity = "1";
}

// close notification

window.closeNotification = function(){
    var notification = document.getElementById("notification");
    notification.style.opacity = "0";
}

// change notification from connecting to connected

window.notificationToConnected = function(){
    document.getElementById("notification").className = "alert connected";
    document.getElementById("alert-img").src = "./images/tick.png";
    document.getElementById("alert-data").innerText = "Connected.";
    document.getElementById("alert-data").color = "white";
    document.getElementById("close-btn").opacity = "1";
}

// change notification from connected to connecting

window.notificationToConnecting = function(){
    document.getElementById("notification").className = "alert connecting";
    document.getElementById("alert-img").src = "./images/loading.gif";
    document.getElementById("alert-data").color = "black";
    document.getElementById("alert-data").innerText = "Connecting...";
    document.getElementById("close-btn").opacity = "0";
}

// Install connect/reconnect event handlers.
mqttClient.on('connect', window.mqttClientConnectHandler);
mqttClient.on('reconnect', window.mqttClientReconnectHandler);

// Initialize forms
document.querySelector("#light-status").disabled = true;
document.getElementById("intensity").disabled = true;
document.getElementById("color").disabled = true;
document.getElementById("close-btn").opacity = "0";