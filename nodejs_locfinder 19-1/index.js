require('dotenv').config();
var express = require('express');
var router = express();
var url = require('url');
var bodyparser = require('body-parser');
var mysql = require('mysql');

var admin = require('firebase-admin');
var serviceAccount = require("./locationfinderapp-firebase-adminsdk");
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


//register new user
router.post('/LocationFinderApp/checkUserExist' , function(req , res , next){
	try{
  var querydata = req.body;
  var connection = mysql.createConnection(config);

  connection.connect();
  connection.query("SELECT * FROM users WHERE phoneNumber = '"+querydata.phoneNumber+"'" ,
  function(err , rows , fields){
    if(!err){
      if(rows.length > 0){    //check if user is already registered before
          var acknowledgment = {msg : 'Phone_number_existed'}       //warning : if statement on the value
          res.send(acknowledgment);
      }else{
        var acknowledgment = {msg : 'New_user'}    //warning : if statement on the value
        res.send(acknowledgment);
      }
    }
    else{
      var error = {msg : 'error in getting main information of the phoneNumber: ' + querydata.phoneNumber}
      res.send(error);
    }
  });
    connection.end();
	}catch{
		console.log("error in checkUserExist");
	}
});




//complete the registration process by checking regCodes are identical
router.post('/LocationFinderApp/completeRegistrationProcess' , function(req , res , next){
	try{
  var querydata = req.body;
  var connection = mysql.createConnection(config);

  connection.connect();
  connection.query("SELECT regDate , regCode FROM tempUsers WHERE phoneNumber = '"+querydata.phoneNumber+"'" ,
  function(err , rows , fields){
    if(!err){
		if(rows.length > 0){
			
		var currentDate = new Date(querydata.currentTime);
		if
		(
			querydata.regCode == rows[0].regCode &&
			rows[0].regDate.getDate() == currentDate.getDate() &&
			rows[0].regDate.getMonth() == currentDate.getMonth() &&
			rows[0].regDate.getFullYear() == currentDate.getFullYear() &&
			(rows[0].regDate.getHours() == currentDate.getHours() ||
			rows[0].regDate.getHours() == currentDate.getHours() - 1)
		){
		  
		
			if(connection.state === 'disconnected'){
				connection.connect();
			}		
			connection.query("SELECT * FROM users WHERE phoneNumber = '"+querydata.phoneNumber+"'" ,
			function(err1 , rows1 , fields1){
				if(!err1){
					if(rows1.length > 0){    //check if user is already registered before
						console.log('old user re-registering');

						if(connection.state === 'disconnected'){
							connection.connect();
						}
						connection.query("UPDATE users SET UserName = '"+querydata.userName+"', simId = "+querydata.simId+" , LastCapturedLoc = '"+querydata.currentTime+"' , CurrentLocation_Lng = "+querydata.currentLocation_Lng+" , CurrentLocation_Lat = "+querydata.currentLocation_Lat+" , TokenKey = '"+querydata.tokenKey+"' , imei = '"+querydata.imei+"' WHERE phoneNumber = '"+querydata.phoneNumber+"'" ,
						function(err2 , result){
							if(!err2){
								
								//retrieve old connections for the user to set it in his sqlite table
								if(connection.state === 'disconnected'){
									connection.connect();
								}	
								connection.query("SELECT Id , AccessFromPhone , AccessFromUserName , AccessToPhone , AccessToUserName , ConnectionStatus , ConnectTime_From , ConnectTime_To , ExpirationDate FROM connections LEFT JOIN users ON users.phoneNumber = '"+querydata.phoneNumber+"' WHERE AccessFromPhone = '"+querydata.phoneNumber+"' OR AccessToPhone = '"+querydata.phoneNumber+"'" , 
								function(err3 , rows3 , fields3){
									if(!err3){
										if(rows3.length > 0){
						
											connection.end();
											console.log("registeredSuccessfully with sqlite and expiration date="+rows3[0].ExpirationDate.toString());
											res.send(rows3);
										}else{
						
											connection.end();
											console.log('registeredSuccessfully to ' + rows1[0].ExpirationDate.toString());
											var msg = {msg : "ExpirationDate="+rows1[0].ExpirationDate.toString()}   //if statement on msg value
											res.send(msg);
										}
									}
									else{
						
										connection.end();
										console.log('registeredSuccessfully , but failed to retrieve old connections to sqlite');
										var msg = {msg : "ExpirationDate="+rows1[0].ExpirationDate.toString()}   //if statement on msg value
										res.send(msg);
									}
								});
							}
							else{

								connection.end();
								console.log('failed to update user info in mysql to complete reg');
								var msg = {msg : 'errorInExecutingQuery'}
								res.send(msg);
							}
						});
					}
					else{
					console.log('New_user registeration');

						if(connection.state === 'disconnected'){
							connection.connect();
						}
						connection.query("INSERT INTO users(UserName , phoneNumber, simId, LastCapturedLoc , CurrentLocation_Lng , CurrentLocation_Lat , TokenKey , imei, ExpirationDate) VALUES('"+querydata.userName+"' , '"+querydata.phoneNumber+"' , "+querydata.simId+" , '"+querydata.currentTime+"' , "+querydata.currentLocation_Lng+" , "+querydata.currentLocation_Lat+", '"+querydata.tokenKey+"' , '"+querydata.imei+"' , '2020-1-1')" ,
						function(err4 , result4){
							if(!err4){
								
								connection.end();
								console.log('registeredSuccessfully');
								var msg = {msg : 'registeredSuccessfully'}   //if statement on msg value
								res.send(msg);

							}
							else{
								
								connection.end();
								console.log('failed to insert user info in mysql to complete reg');
								var msg = {msg : 'errorInExecutingQuery'}
								res.send(msg);
							}
						});
					}
				}
				else{

					connection.end();
					var msg = {msg : 'errorInExecutingQuery'}
					res.send(msg);
				}
			});
  
				
		}
		else{

			connection.end();
			var msg = {msg : 'wrongRegCode'}  //if statement on msg value
			res.send(msg);
		}
	}
	else{
		connection.end();
		var msg = {msg : 'wrongRegCode'}  //if statement on msg value
		res.send(msg);
	}
    }
    else{
      connection.end();
      var msg = {msg : 'errorInExecutingQuery'}
      res.send(msg);
    }
  });
	}catch{
		console.log("error in completeRegistrationProcess");
		
        var msg = {msg : 'wrongRegCode'}  //if statement on msg value
        res.send(msg);
	}
});




//update user personal info (username , simId)
router.post('/LocationFinderApp/updatePersonalInfo' , function(req , res , next){
	try{
  var querydata = req.body;
  var connection = mysql.createConnection(config);

  connection.connect();
  connection.query("UPDATE users SET userName = '"+ querydata.userName +"', simId = "+ querydata.simId +" WHERE PhoneNumber = '"+querydata.phoneNumber+"'" ,
  function(err , result){
    if(!err){
      var msg = {msg : 'Updated'}
      res.send(msg);
      }
      else{
        var error = {msg : 'error in executing the query!!!!'}
        res.send(error);
      }
    });
  connection.end();
	}
	catch{
		console.log("error in updatePersonalInfo");
	}
});


//get the user info when starting the application
router.post('/LocationFinderApp/getUserInfo' ,function(req , res , next){
	try{
  var querydata = req.body;
  var connection = mysql.createConnection(config);

  connection.connect();
  connection.query("Select UserName , TokenKey FROM Users WHERE PhoneNumber = '"+querydata.PhoneNumber +"'" , function(err , rows , fields){
    if(!err){
      if(rows.length > 0){
        res.send(rows);
      }
    }
    else{
      var error = {msg : 'error in executing the query!!!!'}
      res.send(error);
    }
  });
  connection.end();
	}
	catch{
		console.log("error in getUserInfo");
	}
});



//check user Imei and expiration date
router.post('/LocationFinderApp/CheckImeiNExpiration' , function(req , res , next){
	try{
  var querydata = req.body;
  var connection = mysql.createConnection(config);

  connection.connect();
  
		connection.query("SELECT imei , ExpirationDate FROM users WHERE phoneNumber = '"+querydata.PhoneNumber+"'" , 
		function(err , rows , fields){
			if(!err){
				if(rows.length > 0){
					
					if(querydata.imei == rows[0].imei){
						
						var expirationDate = new Date(querydata.ExpirationDate);
						if(
						rows[0].ExpirationDate.getDate() == expirationDate.getDate() &&
						rows[0].ExpirationDate.getMonth() == expirationDate.getMonth() &&
						rows[0].ExpirationDate.getFullYear() == expirationDate.getFullYear()){
								
							connection.end();
							var message = {msg : 'noProblem'} //warning : if statement on the string
							res.send(message);
						}
						else{
						
							if(connection.state === 'disconnected'){
								connection.connect();
							}
							connection.query("UPDATE users SET ExpirationDate = '"+querydata.ExpirationDate+"' WHERE PhoneNumber = '"+ querydata.PhoneNumber+"'" ,
							function(err , rows2 , fields){
								if(!err){
									
									connection.end();
									var message = {msg : 'expiration_Date_Updated'} //warning : if statement on the string
									res.send(message);
								}
								else{
							
									connection.end();
									var error = {msg : 'error in executing the query!!!!'} //warning : if statement on the string
									res.send(error);
								}
							});
						}
						
					}
					else{
						
						connection.end();
						var error = {msg : 'wrong imei'}  //warning : if statement on the string
						res.send(error);	
					}
				}
				else{
					
					connection.end();
					var error = {msg : 'error in executing the query!!!!'} //warning : if statement on the string
					res.send(error);	
				}
			}
			else{
			
				connection.end();
				var error = {msg : 'error in executing the query!!!!'}
				res.send(error);	
			}
		});	
	}
	catch{
		console.log("error in CheckImeiNExpiration");
	}
});



//getUserConnection to populate it in the spinner
router.post('/LocationFinderApp/getConnectedUserConnectionTo' , function(req , res , next){
	try{
		var querydata = req.body;
		var connection = mysql.createConnection(config);

		connection.connect();
		connection.query("SELECT imei FROM users WHERE phoneNumber = '"+querydata.PhoneNumber+"'" , 
		function(err , rows , fields){
			if(!err){
				if(rows.length > 0){
					
					if(querydata.imei == rows[0].imei){
						
						if(connection.state === 'disconnected'){
							connection.connect();
						}
						connection.query("SELECT Connections.AccessToPhone, Connections.AccessToUserName , Users.TokenKey , Connections.connectTime_From , Connections.connectTime_To FROM Connections LEFT JOIN Users ON Connections.AccessToPhone = Users.PhoneNumber WHERE Connections.ConnectionStatus = 'Connected' AND Connections.AccessFromPhone = '"+ querydata.PhoneNumber+"'" ,
						function(err , rows , fields){
							if(!err){
								if(rows.length > 0){
									
									res.send(rows);
									connection.end();
								}
								else {
									
									connection.end();
									var noConnections = {msg : 'لا يوجد لديك ارتباطات'}
									res.send(noConnections);
								}
							}
							else{
								
								connection.end();
								var error = {msg : 'error in executing the query!!!!'}
								res.send(error);
							}
						});
						
					}
					else{
						
						connection.end();
						var error = {msg : 'wrong imei'}
						res.send(error);	
					}
				}
				else{
					
					connection.end();
					var error = {msg : 'error in executing the query!!!!'}
					res.send(error);	
				}
			}
			else{
			
				connection.end();
				var error = {msg : 'error in executing the query!!!!'}
				res.send(error);	
			}
		});	
	}catch{
		console.Log('error in getConnectedUserConnectionTo');
		
		connection.end();
	}
});


//get the user connections on and requests on
router.post('/LocationFinderApp/getConnsNReqs' , function(req , res , next){
	try{
  var querydata = req.body;
  var connection = mysql.createConnection(config);

  connection.connect();
  connection.query("SELECT Connections.AccessFromPhone, Connections.AccessFromUserName , Users.TokenKey , Connections.ConnectionStatus , Connections.ConnectTime_From , Connections.ConnectTime_To FROM Connections LEFT JOIN Users ON Connections.AccessFromPhone = Users.PhoneNumber WHERE Connections.ConnectionStatus <> 'Rejected' AND Connections.ConnectionStatus <> 'Aborted' AND Connections.AccessToPhone = '"+ querydata.PhoneNumber+"'" ,
  function(err , rows , fields){
    if(!err){
      if(rows.length > 0){
        res.send(rows);
      }
      else{
      var noConnections = {msg : 'لايوجد احد مرتبط بك ولا طلبات ارتباط'}
      res.send(noConnections);
      }
    }
    else{
      var error = {msg : 'error in executing the query!!!!'}
      res.send(error);
    }
  });
  connection.end();
	}
	catch{
		console.log("error in getConnsNReqs");
	}
});



//respond to the connection requests
router.post('/LocationFinderApp/ResponseToConnectionReq' , function(req , res , next) {
	try{
  var querydata = req.body;
  var connection = mysql.createConnection(config);

  connection.connect();
  
  //check if req is accept or reject or abort
  var cmdString;
  if(querydata.ConnectionStatus == 'Connected'){
	  var cmdString = "UPDATE Connections SET ConnectionStatus = 'Connected' , ConnectTime_From = '"+querydata.ConnectTime_From+"' , ConnectTime_To = '"+querydata.ConnectTime_To+"' WHERE AccessToPhone = '"+querydata.AccessToPhone +"' AND AccessFromPhone = '"+querydata.AccessFromPhone +"'";
  }
  else {
	  var cmdString = "UPDATE Connections SET ConnectionStatus = '"+querydata.ConnectionStatus+"' WHERE AccessToPhone = '"+querydata.AccessToPhone +"' AND AccessFromPhone = '"+querydata.AccessFromPhone +"'";
  }
  connection.query( cmdString ,  function(err , result){
    if(!err){
      var msg = {msg : 'Updated'}
      res.send(msg);

	  if(connection.state === 'disconnected'){
			connection.connect();
		}
      connection.query("SELECT accessToUserName FROM Connections  WHERE accessFromPhone ='"+querydata.AccessFromPhone+"' AND accessToPhone = '"+querydata.AccessToPhone+"'" ,
      function(err , rows , fields){
        if(!err){

          // This registration token comes from the client FCM SDKs.
          var registrationToken = querydata.TokenKey;
		  var message;
		if(querydata.ConnectionStatus == 'Connected'){

		  message = {
			"data": {
              title: 'respondToConnectionReq',      //warning : if condition in java on this title string
              AccessToPhone: querydata.AccessToPhone,
              ConnectionStatus: querydata.ConnectionStatus,
              AccessToUserName : rows[0].accessToUserName,
			  ConnectTime_From : querydata.ConnectTime_From,
			  ConnectTime_To : querydata.ConnectTime_To
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
		}
		else {

		  message = {
			"data": {
              title: 'respondToConnectionReq',      //warning : if condition in java on this title string
              AccessToPhone: querydata.AccessToPhone,
              ConnectionStatus: querydata.ConnectionStatus,
              AccessToUserName : rows[0].accessToUserName
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
		}

          // Send a message to the device corresponding to the provided
          // registration token.
          admin.messaging().send(message)
          .then((response) => {
            // Response is a message ID string.
            console.log('Successfully sent message (ResponseToConnectionReq):', response);
          })
          .catch((error) => {
            console.log('Error sending message (ResponseToConnectionReq):', error);
          });

          connection.end();
        }
        else{
          connection.end();
          console.log('process not completed , response for connection_req notifiation not sent');
        }
      });
    }
    else{
      connection.end();
      var error = {msg : 'error in executing the query!!!!'}
      res.send(error);
    }
  });
	}
	catch{
		console.log("error in ResponseToConnectionReq");
	}
});



//handle connection request
router.post('/LocationFinderApp/handleConnectionToReq' , function(req , res , next){
	try{
  var querydata = req.body;
  var connection = mysql.createConnection(config);

  connection.connect();
  connection.query("SELECT TokenKey FROM Users WHERE PhoneNumber = '"+querydata.receiverRequestPhone+"'" ,
  function(err , rows, fields){
    if(!err){
      if(rows.length > 0){
        var tokenKey = rows[0].TokenKey;
		
		if(connection.state === 'disconnected'){
			connection.connect();
		}
        connection.query("SELECT connectionStatus FROM Connections WHERE AccessFromPhone = '"+querydata.senderRequestPhone+"' AND AccessToPhone = '"+querydata.receiverRequestPhone+"'" ,
        function(err , rows2 , fields){
          if(!err){
            if(rows2.length > 0){
              if(rows2[0].connectionStatus == 'Connected'){
                var alreadyConnected = {msg : 'هذا الشخص لديك ارتباط به مسبقا'}
                res.send(alreadyConnected);

                connection.end();
              }
              else if(rows2[0].connectionStatus == 'Pending'){
                var alreadyConnected = {msg : 'لديك طلب ارتباط لهذا الشخص بانتظار الرد'}
                res.send(alreadyConnected);

                connection.end();
              }
              else if(rows2[0].connectionStatus != 'Connected' && rows2[0].connectionStatus != 'Pending'){
                
				if(connection.state === 'disconnected'){
					connection.connect();
				}
				connection.query("UPDATE Connections SET ConnectionStatus = 'Pending' , AccessToUserName = '"+querydata.receiverRequestUserName+"' , ConnectTime_From = '00:00' , ConnectTime_To = '23:59' WHERE AccessFromPhone = '"+querydata.senderRequestPhone+"' AND AccessToPhone = '"+querydata.receiverRequestPhone+"'" ,
                function(err , result){
                  if(!err){
                    var requestSent = {msg : 'تم ارسال طلب الارتباط'}   //warning :msg Content connected to if-statement in java code
                    res.send(requestSent);

                    connection.end();
                    sendConnectionRequestNotification(tokenKey , querydata.senderRequestPhone);
                  }
                  else{
                    var error = {msg : 'error in executing the query!!!!'}
                    res.send(error);

                    connection.end();
                  }
                });
              }
            }
            else{
				
			  if(connection.state === 'disconnected'){
					connection.connect();
				}
              connection.query("INSERT INTO Connections(AccessFromPhone  , AccessToPhone , AccessToUserName , ConnectionStatus , ConnectTime_From , ConnectTime_To) Values('"+querydata.senderRequestPhone+"' ,'"+ querydata.receiverRequestPhone+"' ,'"+querydata.receiverRequestUserName+"' ,'Pending' , '00:00' , '23:59')" ,
               function(err , result){
                if(!err){
                  var requestSent = {msg : 'تم ارسال طلب الارتباط'} //warning :msg Content connected to if-statement in java code
                  res.send(requestSent);

                  connection.end();
                  sendConnectionRequestNotification(tokenKey , querydata.senderRequestPhone);
                }
                else{
                  var error = {msg : 'error in executing the query!!!!'}
                  res.send(error);

                  connection.end();
                }
              });
            }
          }else{
            var error = {msg : 'error in executing the query!!!!'}
            res.send(error);

            connection.end();
          }
        });
      }
      else{
        var error = {msg : 'هذا الشخص لم يشترك بالتطبيق'}
        res.send(error);

        connection.end();
      }
    }
    else{
      var error = {msg : 'error in executing the query!!!!'}
      res.send(error);

      connection.end();
    }
  });
	}
	catch{
		console.log("error in handleConnectionToReq");
	}
});

function sendConnectionRequestNotification(tokenKey , accessFromPhone){
  // This registration token comes from the client FCM SDKs.
  var registrationToken = tokenKey;
	 var message = {
		"data": {
			"title": 'connectionReq',     //warning : if condition in java on this title string
			"accessFromPhone": accessFromPhone
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
    console.log('Successfully sent message (handleConnectionToReq):', response);
  })
  .catch((error) => {
    console.log('Error sending message (handleConnectionToReq):', error);
  });
}



//set the connection requester userName
router.post('/LocationFinderApp/setConnectionRequesterUserName' , function(req , res , next){
	try{
  var querydata = req.body;
  var connection = mysql.createConnection(config);

  connection.connect();
  connection.query("UPDATE Connections SET accessFromUserName = '"+querydata.accessFromUserName+"' WHERE accessFromPhone = '"+querydata.accessFromPhone+"' AND accessToPhone ='"+querydata.accessToPhone+"'" ,
  function(err , results){
    if(err){
      var error = {msg : 'error in executing the query!!!!'}
      res.send(error);
      console.log(error);
    }
    else{
      console.log('successful operation');
    }
  });
  connection.end();
	}
	catch{
		console.log("error in setConnectionRequesterUserName");
	}
});



//get all connections_to (connected , pending)
router.post('/LocationFinderApp/getUserConnectionsTo', function(req , res , next){
	try{
  var querydata = req.body;
  var connection = mysql.createConnection(config);

  connection.connect();
  connection.query("SELECT accessToPhone , accessToUserName , connectionStatus , tokenKey , connectTime_From , connectTime_To FROM Connections LEFT JOIN Users ON Connections.accessToPhone = Users.PhoneNumber WHERE accessFromPhone = '"+querydata.PhoneNumber+"' AND ConnectionStatus <> 'Rejected' AND ConnectionStatus <> 'Aborted'" ,
function(err , rows , fields){
  if(!err){
    if(rows.length > 0){
      res.send(rows);
    }
    else {
      var noConnections = {msg : 'لا يوجد لديك ارتباطات'}
      res.send(noConnections);
    }
  }
  else{
    var error = {msg : 'error in executing the query!!!!'}
    res.send(error);
  }
});
connection.end();
	}
	catch{
		console.log("error in getUserConnectionsTo");
	}
});



//abort user Connection-To (request pending or Connected)
router.post('/LocationFinderApp/abortConnectionTo' , function(req , res , next){
	try{
  var querydata = req.body;
  var connection = mysql.createConnection(config);

  connection.connect();
  connection.query("UPDATE Connections SET ConnectionStatus = 'Aborted' WHERE AccessToPhone = '"+querydata.accessToPhone +"' AND AccessFromPhone = '"+querydata.accessFromPhone +"'" ,
  function(err , result){
    if(!err){
      if(querydata.oldConnectionStatus == 'Connected'){
      var acknowledgment = {msg : 'تم الغاء الارتباط'}
      res.send(acknowledgment);
      }
      else if(querydata.oldConnectionStatus == 'Pending'){
      var acknowledgment = {msg : 'تم الغاء طلب الارتباط'}
      res.send(acknowledgment);
      }

      if(connection.state === 'disconnected'){
			connection.connect();
		}
      connection.query("SELECT accessFromUserName FROM Connections WHERE AccessToPhone = '"+querydata.accessToPhone +"' AND AccessFromPhone = '"+querydata.accessFromPhone +"'" ,
      function(err , rows, fields){
        if(!err){
          // This registration token comes from the client FCM SDKs.
          var registrationToken = querydata.tokenKey;
		  
	 var message = {
		"data": {
              title: 'abortConnectionTo',    //warning : if condition in java on this title string
              accessFromPhone: querydata.accessFromPhone,
              oldConnectionStatus: querydata.oldConnectionStatus,
              accessFromUserName : rows[0].accessFromUserName
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
            console.log('Successfully sent message (abortConnectionTo):', response);
          })
          .catch((error) => {
            console.log('Error sending message (abortConnectionTo):', error);
          });
        }
        else{
          var error = {msg : 'error in executing the query!!!!'}
          res.send(error);
        }
        connection.end();
      });
    }else{
      var error = {msg : 'error in executing the query!!!!'}
      res.send(error);
    }
  });
	}
	catch{
		console.log("error in abortConnectionTo");
	}
});



//on user request location
router.post('/LocationFinderApp/GetLocation' , function(req , res , next){
	try{
  var querydata = req.body;
  var connection = mysql.createConnection(config);

  connection.connect();
  connection.query("SELECT accessFromUserName FROM Connections WHERE AccessFromPhone = '"+querydata.requesterPhoneNumber+"' AND AccessToPhone = '"+querydata.responderPhoneNumber+"'" ,
  function(err , rows , fields){
    if(!err){
      // This registration token comes from the client FCM SDKs.
      var registrationToken = querydata.tokenKey; 
	 var message = {
		"data": {
		  "title": 'locationReq',     //warning : if condition in java on this title string
          "requesterPhoneNumber": querydata.requesterPhoneNumber,
          "responderPhoneNumber": querydata.responderPhoneNumber,
          "requesterUserName": rows[0].accessFromUserName
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
        console.log('Successfully sent message (GetLocation):', response);
      })
      .catch((error) => {
        console.log('Error sending message (GetLocation):', error);
      });

      var acknowledgment = {msg : 'تم ارسال طلب الموقع'}
      res.send(acknowledgment);

      connection.end();
    }
    else{
      var error = {msg : 'error in executing the query!!!!'}
      res.send(error);
      connection.end();
    }
  });
	}
	catch{
		console.log("error in GetLocation");
	}
});


//return location to the requester
router.post('/LocationFinderApp/returnRequestedLocation' , function(req , res , next){
	try{
  var querydata = req.body;
  var connection = mysql.createConnection(config);

  connection.connect();

  var today = new Date();
  var dd = String(today.getDate()).padStart(2, '0');
  var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
  var yyyy = today.getFullYear();
  var hour = today.getHours();
  var minutes = today.getMinutes();
  today = yyyy  + '-' + mm  + '-' + dd + ' ' + hour + ':' +minutes;


  connection.query("UPDATE Users SET CurrentLocation_Lat = "+querydata.lat+" , CurrentLocation_Lng = "+ querydata.lng +" , LastCapturedLoc = '"+ today +"' WHERE phoneNumber = '"+querydata.responderPhoneNumber+"'" ,
  function(err , results){
    if(!err){
		
	  if(connection.state === 'disconnected'){
			connection.connect();
		}
      connection.query("SELECT Users.tokenKey , Connections.accessToUserName FROM Users LEFT JOIN Connections ON accessToPhone = '"+querydata.responderPhoneNumber+"' AND accessFromPhone = '"+querydata.requesterPhoneNumber+"' WHERE phoneNumber = '"+querydata.requesterPhoneNumber+"'" ,
      function(err , rows , fields){
        if(!err){
          // This registration token comes from the client FCM SDKs.
          var registrationToken = rows[0].tokenKey;
          var accessToUserName = rows[0].accessToUserName;
          var lat = querydata.lat.toString();
          var lng = querydata.lng.toString();
		  
	 var message = {
		"data": {
              "title": 'locationResponse',     //warning : if condition in java on this title string
              "responderUserName": accessToUserName,
              "lat": lat,
              "lng": lng
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
            console.log('Successfully sent message (returnRequestedLocation):', response);
          })
          .catch((error) => {
            console.log('Error sending message (returnRequestedLocation):', error);
          });

          connection.end();
        }
        else{
          console.log('Error in executing the query!!!!');
        }
      });
    }
    else{
      console.log('Error in executing the query!!!!');
    }
  });
	}
	catch{
		console.log("error in returnRequestedLocation");
	}
});



//set new tokenKey when token is changed
router.post('/LocationFinderApp/setNewTokenKey' , function(req , res , next){
	try{
  var querydata = req.body;
  var connection = mysql.createConnection(config);

  connection.connect();
  connection.query("UPDATE Users SET TokenKey = '"+querydata.tokenKey+"' WHERE PhoneNumber = '"+querydata.phoneNumber+"'" ,
  function(err , result){
    if(!err){
      console.log("tokenKey successfully updated");
    }
    else{
      console.log("failed in updating tokenKey");
    }
  });
  connection.end();
	}catch{
		console.log("error in setNewTokenKey");
	}
});



//when the target location GPS is off
router.post('/LocationFinderApp/GPS_Off_cantGetLocation' , function(req , res , next){
	try{
  var querydata = req.body;
  var connection = mysql.createConnection(config);

  connection.connect();
  connection.query("SELECT Users.tokenKey , Connections.accessToUserName FROM Users LEFT JOIN Connections ON accessToPhone = '"+querydata.responderPhoneNumber+"' AND accessFromPhone = '"+querydata.requesterPhoneNumber+"' WHERE phoneNumber = '"+querydata.requesterPhoneNumber+"'" ,
  function(err , rows , fields){
    if(!err){
      // This registration token comes from the client FCM SDKs.
      var registrationToken = rows[0].tokenKey;
      var msgContent = 'نظام تحديد الموقع غير مفعل عند ' + rows[0].accessToUserName
	  
	 var message = {
		"data": {
          "title": 'GPS_Off',    //warning : if condition in java on this title string
          "notificationTitle": 'فشل في تحديد الموقع',
          "notificationContent": msgContent
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
        console.log('Successfully sent message (GPS_Off_cantGetLocation):', response);
      })
      .catch((error) => {
        console.log('Error sending message (GPS_Off_cantGetLocation):', error);
      });
    }
  });
	}
	catch(error){
		console.log("error in GPS_Off_cantGetLocation");
	}
});



router.listen(3000, 'localhost', function(){
  console.log(`Server running at http://localhost:3000`);
});
