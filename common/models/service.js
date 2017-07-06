'use strict';

function sortListSummary(list, cb) {
  var auxList = [];
  var objectResult = {
    service: {
      total: 0,
      done: 0
    },
    areas: []
  };
  var areas = [];
  var done = 0,
    total = 0;
  list.forEach(function (areaOption, areaIndex) {
    // areas.push()
    let areaAux = {
      name: areaOption.__data.name,
      items: []
    };
    // console.log(areaOption);
    areaOption.__data.items.forEach(function (item, itemIndex) {
      let itemAux = {};
      let doneItem = 0,
        totalItem = 0;
      item.__data.furniture.forEach(function (furniture, furnitureIndex) {
        totalItem++;
        total++;
        if (furniture.__data.furnitureInspections.length > 0) {
          doneItem++;
          done++;
        }
        if (furnitureIndex + 1 >= item.__data.furniture.length) {
          areaAux.items.push({
            name: item.__data.name,
            totalItem: totalItem,
            doneItem: doneItem
          })
          if (itemIndex + 1 >= areaOption.__data.items.length) {
            objectResult.areas.push(areaAux);
          }
          if (areaIndex + 1 >= list.length) {
            objectResult.service.total = total;
            objectResult.service.done = done;
            objectResult.areas.push(areaAux);
            cb(null, objectResult);
          }
        }
      });
      /*itemAux = {
        name: item.name,
        totalItem: totalItem,
        doneItem: doneItem
      }
      areaAux.items.push(itemAux)*/
    });

    // areaAux.push();

  });

}

module.exports = function (Service) {

  Service.sendEmail = function (msg, cb) {

    // send email using Email model of Loopback 
    Service.app.models.EmailSender.send({
      to: "luiseduardo27000@hotmail.com",
      from: "no-replay@gmail.com",
      subject: "Your custom email subject here",
      text: "hola como va!!!",
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
    });

  }
  Service.remoteMethod('sendEmail', {
    http: {
      path: '/sendEmail',
      verb: 'get'
    },
    description: ["api para envío de emial."],
    accepts: {
      arg: 'msg',
      type: 'string'
    },
    returns: {
      arg: 'Email',
      type: 'string'
    }
  });

  Service.getSummary = (serviceId, clientId, cb) => {
    Service.app.models.area.find({
      where: {
        clientId: clientId
      },
      include: {
        relation: 'items',
        scope: {
          include: {
            relation: "furniture",
            scope: {
              include: {
                relation: "furnitureInspections",
                scope: {
                  where: {
                    serviceId: serviceId
                  }
                }
              }
            }
          }
        }
      }
    }, (err, result) => {
      if (err) {
        console.log(err);
        cb(err);
        return;
      } else {
        sortListSummary(result, cb);
        // cb(null, result);
      }
    });
  }
  Service.remoteMethod('getSummary', {
    http: {
      verb: 'get'
    },
    description: ["api para envío de emial."],
    accepts: [{
        arg: 'serviceId',
        type: 'string'
      },
      {
        arg: 'clientId',
        type: 'string'
      }
    ],
    returns: {
      arg: 'result',
      type: 'array'
    }
  });
};
