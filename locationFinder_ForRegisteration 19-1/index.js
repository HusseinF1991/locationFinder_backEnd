var express = require('express');
var router = express();
var url = require('url');
var bodyparser = require('body-parser');
var mysql = require('mysql');
var admin = require('firebase-admin');

var serviceAccount = require("./registeruserslocationfin-firebase-adminsdk.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "databaseURL"
});


var config =
{
  host : '127.0.0.1',
  user : 'root',
  password : '',
  database : 'locationfinderapp'
}

router.use(bodyparser.json()); //accept json parameters
router.use(bodyparser.urlencoded({extended : true})) //accept url encoded params


//set regCode in tempUsers table and send FCM to the modem
router.post('/LocationFinderApp/requestRegCode_users' , function(req , res , next){
	try{
  var querydata = req.body;
  var connection = mysql.createConnection(config);
  
  console.log(querydata);

  connection.connect();
  connection.query("SELECT * FROM tempUsers WHERE phoneNumber = '"+querydata.phoneNumber+"'" ,
  function(err , rows , fields){
    if(!err){
      if(rows.length > 0){    //check if user is already registered before
        console.log('Phone_number_existed in tempUsers');

        connection.query("UPDATE tempUsers SET regDate = '"+querydata.regDate+"' , regCode = "+querydata.regCode+" WHERE phoneNumber = '"+querydata.phoneNumber+"'" ,
        function(err , result){
          if(!err){

            connection.end();
            requestRegCodeFromModem(res , req);
          }
          else{

            connection.end();
            var error = {msg : 'errorInRequestingCode'}   //if statement on this msg value
            res.send(error);
          }
        });
      }
      else{
        console.log('phoneNumber not exist in tempUsers')

        connection.query("INSERT INTO tempUsers(phoneNumber, regDate , regCode) VALUES('"+querydata.phoneNumber+"'  , '"+querydata.regDate+"' , "+querydata.regCode+")" ,
        function(err , result){
          if(!err){

			connection.end();
            requestRegCodeFromModem(res , req);
            
          }
          else{

              connection.end();
              var error = {msg : 'errorInRequestingCode'}   //if statement on this msg value
              res.send(error);
          }
        });
      }
    }
    else{

      connection.end();
      var error = {msg : 'errorInRequestingCode'}   //if statement on this msg value
      res.send(error);
    }
  });
	}
	catch{
		console.log("error in requestRegCode");
	}
});



//update the modem info or insert it
router.post('/LocationFinderApp/setModemInfo' , function(req , res , next){
	try{
  var querydata = req.body;
  var connection = mysql.createConnection(config);
  
  console.log(querydata);

  connection.connect();
  connection.query("SELECT * FROM users WHERE phoneNumber = '"+querydata.phoneNumber+"'" ,
  function(err , rows , fields){
    if(!err){
      if(rows.length > 0){    //check if user is already registered before
        console.log('modem_number_existed');

        connection.query("UPDATE users SET UserName = '"+querydata.userName+"', simId = "+querydata.simId+" , LastCapturedLoc = '"+querydata.lastCapturedLoc+"' , CurrentLocation_Lng = "+querydata.currentLocation_Lng+" , CurrentLocation_Lat = "+querydata.currentLocation_Lat+" , TokenKey = '"+querydata.tokenKey+"' , imei = "+querydata.imei+" WHERE phoneNumber = '"+querydata.phoneNumber+"'" ,
        function(err , result){
          if(!err){

            connection.end();
            var msg = {msg : 'modemInfoUpdated'}  //if statement on this msg value
            res.send(msg);
            
          }
          else{

            connection.end();
            var error = {msg : 'errorInRequestingCode'}   //if statement on this msg value
            res.send(error);
          }
        });
      }
      else{
        console.log('New_modem')

        connection.query("INSERT INTO users(UserName , phoneNumber, simId, LastCapturedLoc , CurrentLocation_Lng , CurrentLocation_Lat , TokenKey , imei , ExpirationDate) VALUES('"+querydata.userName+"' , '"+querydata.phoneNumber+"' , "+querydata.simId+" , '"+querydata.lastCapturedLoc+"' , "+querydata.currentLocation_Lng+" , "+querydata.currentLocation_Lat+", '"+querydata.tokenKey+"' , "+querydata.imei+" , '2050-12-12')" ,
        function(err , result){
          if(!err){

            connection.end();
            var msg = {msg : 'modemInfoUpdated'}  //if statement on this msg value
            res.send(msg);
            
          }
          else{

              connection.end();
              var error = {msg : 'errorInRequestingCode'}   //if statement on this msg value
              res.send(error);
          }
        });
      }
    }
    else{

      connection.end();
      var error = {msg : 'errorInRequestingCode'}   //if statement on this msg value
      res.send(error);
    }
  });
	}
	catch{
		console.log("error in requestRegCode");
	}
});


//request registeration code from modem to be sent by sms
function requestRegCodeFromModem(res , req){
	try{
  var querydata = req.body;
  var connection = mysql.createConnection(config);

  connection.connect();
  //get token key of the modem phone by it's number in db
  connection.query("SELECT TokenKey FROM users WHERE phoneNumber = '07734201387'" ,
  function(err , rows , result){
    if(!err){

      // This registration token comes from the client FCM SDKs.
      var registrationToken = rows[0].TokenKey;	  
	 var message = {
		"data": {
          "title": 'sendCodeBySms',     //warning : if condition in java on this title string
          "phoneNumber": querydata.phoneNumber,
          "regCode": querydata.regCode.toString()
		},
		"token": registrationToken,
		"webpush": {
			"headers": {
				"Urgency": "high"
			}
		},
		"android": {
			"priority": "high"
		}
	}

      // Send a message to the device corresponding to the provided
      // registration token.
      admin.messaging().send(message)
      .then((response) => {
        // Response is a message ID string.
        console.log('Successfully sent message (requestRegCode):', response);

        var msg = {msg : 'codeRequestSent'}
        res.send(msg);
      })
      .catch((error) => {
        console.log('Error sending message (requestRegCode):', error);

        var msg = {msg : 'errorInRequestingCode'}  // if statement on the msg value
        res.send(msg);
      });
    }
    else{
      console.log("there is problem in getting the modem token key");

      var msg = {msg : 'errorInRequestingCode'}  // if statement on the msg value
      res.send(msg);
    }
  });
  connection.end();
	}
	catch{
		console.log("error in requestRegCodeFromModem");
	}
}



router.listen(3001, 'localhost', function(){
  console.log(`Server running at http://localhost:3001 `);
});