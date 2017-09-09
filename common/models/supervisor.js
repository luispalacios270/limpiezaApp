'use strict';

module.exports = function (Supervisor) {

  Supervisor.sendEmail = function (email, cb) {
    var ObjectID = require('mongodb').ObjectID;
    var supervisorCollection = Supervisor.getDataSource().connector.collection(Supervisor.modelName);
    supervisorCollection.findOne({
      email: email
    }, function (err, data) {
      if (err) {
        console.log(err);
        cb(err);
      } else {               
        cb(null, data);
      }

    })


    // send email using Email model of Loopback 
    /*   Supervisor.app.models.EmailSender.send({
        to: email,
        from: "no-replay@gmail.com",
        subject: "Passwrod Reminder",
        text: "Hi, your password id: ",
        html: msg
      }, function (err, mail) {
        if (err) {
          console.log(err);
          cb(err);
          return err;
        } else {
          console.log(mail);
          cb(null, mail);
        }
      }); */

  }
  Supervisor.remoteMethod('sendEmail', {
    http: {
      path: '/sendEmail',
      verb: 'get'
    },
    description: ["api para envío de emial."],
    accepts: {
      arg: 'email',
      type: 'string'
    },
    returns: {
      arg: 'result',
      type: 'object'
    }
  });

};
