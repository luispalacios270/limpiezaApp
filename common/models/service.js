'use strict';

var PDFDocument = require('pdfkit');
var blobStream = require('blob-stream');
var fs = require("fs");


function sortAreas(areasArray, objectResult, index, parentCallback) {
  if (index >= areasArray.length)
    parentCallback(objectResult);
  else {
    sortItems(areasArray[index].__data.items, [], 0, areasArray[index].__data.name, objectResult, function (data) {
      objectResult.areas.push(data);
      sortAreas(areasArray, objectResult, index + 1, parentCallback);
    });
  }
}

function sortItems(itemsArray, itemArrayAux, index, areaName, objectResult, parentCallback) {
  if (index >= itemsArray.length)
    parentCallback({
      name: areaName,
      items: itemArrayAux
    });
  else {
    checkFurnitures(itemsArray[index].__data.furniture, 0, itemsArray[index].__data.name, 0, 0, objectResult, function (data) {
      itemArrayAux.push(data);
      sortItems(itemsArray, itemArrayAux, index + 1, areaName, objectResult, parentCallback)
    });
  }
}

function checkFurnitures(furnitures, index, itemName, total, done, objectResult, parentCallback) {
  if (index >= furnitures.length) {
    objectResult.service.total += total;
    objectResult.service.done += done;
    parentCallback({
      name: itemName,
      totalItem: total,
      doneItem: done
    });
  } else {
    total = total + 1;
    let furniture = furnitures[index];
    if (furniture.__data.furnitureInspections.length > 0) {
      done = done + 1;
    }
    checkFurnitures(furnitures, index + 1, itemName, total, done, objectResult, parentCallback);
  }
}

/*   "id": "596833ecddc4cb1f94c88950",
    "clientId": "59683323ddc4cb1f94c8893f",
    "address": "",
    "price": 0
  },
  {
    "initialDate": "2017-07-14T04:27:46.750Z",
    "finished": false,
    "id": "5968486054e1e82fd4285e18", */

function sortListSummary(list, cb) {
  var auxList = [];
  var objectResult = {
    service: {
      total: 0,
      done: 0
    },
    areas: []
  };
  sortAreas(list, objectResult, 0, function (data) {
    cb(null, data);
  });
}

function createPdfDocument() {
  var doc = new PDFDocument();
  doc.pipe(fs.createWriteStream("file.pdf"));

  doc.fontSize(25)
    .text('Certificado de servicio', {
      align: 'center'
    })
    .moveDown()
    .moveDown()
    .moveDown()
    .moveDown()
    .moveDown()
    .moveDown().moveDown();

  doc.fontSize(20)
    .text('Información del servicio', {
      align: 'center'
    })
    .moveDown();

  doc.fontSize(12)
    .text('Cliente: Jose Alberto', {
      align: 'justify'
    })
    .moveDown();
  doc.text('Dirección: Avenida siempre viva', {
      align: 'justify'
    })
    .moveDown();
  doc.text('Fecha de inicio: 27 de octubre', {
      align: 'justify'
    })
    .moveDown();
  doc.text('Fecha de finalizacion: 29 de octubre', {
      align: 'justify'
    })
    .moveDown()
    .moveDown();

  doc.addPage();
  doc.fontSize(18)
    .text('Area Name', {
      align: 'center'
    })
    .moveDown();

  doc.fontSize(15)
    .text('Item Name', {
      align: 'center'
    })
    .moveDown();

  doc.fontSize(12)
    .text('FurnitureName')
    .moveDown();

  doc.addPage();
  doc.fontSize(25)
    .text('Firmas', {
      align: 'center'
    })
    .moveDown()
    .moveDown();
  doc.fontSize(18)
    .text('Firma de Inspector', {
      align: 'center'
    })
    .moveDown();

  doc.fontSize(18)
    .text('Firma de Cliente', {
      align: 'center'
    })
    .moveDown();


  cb(null, "ok");
  /* stream.on('finish', () => {
    var blobEx = stream.toBlob('application/pdf');
    console.log(blobEx);
    cb(null, blobEx);
  }) */

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

  Service.generatePDF = (serviceId, clientId, signatureClient, signatureInspector, clientName, cb) => {

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
        (result, cb);
        // cb(null, result);
      }
    });
  }

  Service.remoteMethod('generatePDF', {
    http: {
      verb: 'post'
    },
    description: ["api para envío de emial."],
    accepts: [{
      arg: 'serviceId',
      type: 'string',
      required: true

    }, {
      arg: 'clientId',
      type: 'string',
      required: true
    }, {
      arg: 'signatureClient',
      type: 'string',
      required: true
    }, {
      arg: 'signatureInspector',
      type: 'string',
      required: true
    }, {
      arg: 'clientName',
      type: 'string',
      required: true
    }],
    returns: {
      arg: 'result',
      type: 'object'
    }
  });
};
