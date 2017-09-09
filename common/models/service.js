'use strict';

var PDFDocument = require('pdfkit');
var blobStream = require('blob-stream');
const uuidv1 = require('uuid/v1');
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

function generateItemPdfclientInfo(itemName, subItemName, doc) {
  var spaceBetween = 4;
  var sizeFontItems = 15;
  var sizeFontSubItems = 10;
  doc.fontSize(sizeFontItems).text(itemName, {
    align: 'center'
  }).moveDown(0.7);
  doc.fontSize(sizeFontSubItems).text(subItemName, {
    align: 'center'
  }).moveDown(spaceBetween);
}

function clientInfoPdf(client, service, name, doc) {
  // Title
  doc.fontSize(15).text('REPORTE DE INSPECCIÓN', {
    align: 'center'
  }).moveDown(12);

  //Logo
  doc.image('companyLogo.png', 246, 125, {
    width: 120,
    height: 120
  });

  // doc.moveDown(9);

  generateItemPdfclientInfo('CLIENTE', client.realm, doc);
  generateItemPdfclientInfo('PERSONA QUE FIRMA', name, doc);
  generateItemPdfclientInfo('DIRECCIÓN', client.address, doc);
  generateItemPdfclientInfo('FECHA DE INICIO', String(new Date(service.initialDate)), doc);
  generateItemPdfclientInfo('FECHA DE FINLIZACIÓN', String(new Date(service.finalDate)), doc);
}

function getQualification(option) {
  const good = "Buena";
  const notDefined = "No definida";
  const bad = "Mala"
  switch (option) {
    case 0:
      return good;
      break;
    case 1:
      return bad;
      break;
    case 2:
      return notDefined;
      break;

    default:
      return good;
      break;
  }

}


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


function addAllPictures(filePath, doc, title) {
  try {

    var pictures = fs.readdirSync(filePath);
    if (title)
      doc.text(title + ':')
      .moveDown(3);
    var positionX;
    var positionY;
    pictures.forEach((picture, index) => {
      if (index % 2 === 0) {
        positionX = doc.x;
        positionY = doc.y;
        if ((positionY + 225) >= 790) {
          doc.addPage();
          positionY = doc.y;
        }
      } else {
        positionX = 330;
        positionY = doc.y - 225;
      }
      doc.image(`${filePath}/${picture}`, positionX, positionY, {
        width: 225,
        height: 225
      });
    });
    doc.moveDown(6);
  } catch (error) {
    // console.log(error);
  }
}



function fillDocument(resultArray, doc) {
  resultArray.forEach((area) => {
    var areaTmp = area.__data;
    // doc.addPage();
    // doc.fontSize(16)
    //   .text(areaTmp.name)
    //   .moveDown();  
    doc.addPage();
    doc.fontSize(18)
      .text(areaTmp.name)
      .moveDown(0.65);
    areaTmp.items.forEach((item) => {
      var itemTmp = item.__data;
      /* doc.
      fontSize(16)
        .text(itemTmp.name, {
          align: 'center'
        })
        .moveDown(); */
      doc.fontSize(14)
        .text(itemTmp.name)
        .moveDown(0.65);

      itemTmp.furniture.forEach(furniture => {
        var furnitureTmp = furniture.__data;
        var furnitureInspection = furnitureTmp.furnitureInspections[0];
        if (!furnitureInspection) return;
        var container = `picBefore-${furnitureInspection.id}`;
        var containerAfter = `picAfter-${furnitureInspection.id}`;
        var filePath = `storage/${container}`;
        var filePathAfter = `storage/${containerAfter}`;

        doc.fontSize(14)
          .text(furnitureTmp.name)
          .moveDown(0.9);

        var color = '';
        var qualification = '';


        switch (furnitureInspection.qualification) {
          case 0:
            color = 'grey';
            qualification = 'Regular';
            break;

          case 1:
            color = 'green';
            qualification = 'Bueno';
            break;

          case 2:
            color = 'red';
            qualification = 'Malo';
            break;

          default:
            break;
        }

        doc.fontSize(14)
          .text('Calificación')
          .moveDown(0.65);

        doc.fontSize(12)
          .fillColor(color)
          .text(qualification)
          .fillColor('black')
          .moveDown(0.65);

        if (furnitureInspection.notesClient ||
          furnitureInspection.notesAdministrator ||
          furnitureInspection.notesInspector ||
          furnitureInspection.notesActionPlan) {
          doc.fontSize(14)
            .text('Notas')
            .moveDown(0.65);

          if (furnitureInspection.notesClient) {
            doc.fontSize(12)
              .text('Notas del cliente:' + furnitureInspection.notesClient)
              .moveDown(0.65);
          }

          if (furnitureInspection.notesAdministrator) {
            doc.fontSize(12)
              .text('Notas del Administrador:' + furnitureInspection.notesAdministrator)
              .moveDown(0.65);
          }
          if (furnitureInspection.notesInspector) {
            doc.fontSize(12)
              .text('Notas del Inspector:' + furnitureInspection.notesInspector)
              .moveDown(0.65);
          }
          if (furnitureInspection.notesActionPlan) {
            doc.fontSize(12)
              .text('Plan de acción:' + furnitureInspection.notesActionPlan)
              .moveDown(0.65);
          }
        }

        addAllPictures(filePath, doc, 'Fotos Antes');
        addAllPictures(filePathAfter, doc, 'Fotos después');

        // doc.addPage();
      });
    });

  });
}

function base64ToImage(base64Img) {
  const base64Data = base64Img.replace(/^data:image\/png;base64,/, "");
  return base64Data;
  // var filePath = "storage/" + container + "/" + fileName;
}

function fillSignatures(signatureClient, signatureInspector, doc) {
  const signatureClientImage = base64ToImage(signatureClient);
  const signatureInspectorImage = base64ToImage(signatureInspector);
  // let filePath = '';
  const fileNameClientImage = `${uuidv1()}.png`;
  const fileNameInspectorImage = `${uuidv1()}.png`;

  const filePathClient = `tmp/${fileNameClientImage}`;
  fs.writeFileSync(filePathClient, signatureClientImage, 'base64');

  const filePathInspector = `tmp/${fileNameInspectorImage}`;
  fs.writeFileSync(filePathInspector, signatureInspectorImage, 'base64');

  doc.addPage();

  doc.fontSize(25)
    .text('Firma del cliente:', 100, 150, {
      align: 'center'
    });

  doc.image(`tmp/${fileNameClientImage}`, 110, 190, {
    width: 400,
    height: 200
  });

  doc.text('Firma del inspector:', 100, 420, {
    align: 'center'
  });

  doc.image(`tmp/${fileNameInspectorImage}`, 110, 460, {
    width: 400,
    height: 200
  });

  fs.unlink(filePathClient);
  fs.unlink(filePathInspector);

}

function createPdfDocument(service, client, resultArray, sigantureClient, sigantureInspector, aprobationName, cb) {
  try {
    let doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(`storage/pdf/${service.id}.pdf`));
    clientInfoPdf(client, service, aprobationName, doc);
    fillDocument(resultArray, doc);
    fillSignatures(sigantureClient, sigantureInspector, doc)
    doc.end();
    cb(null, "ok");
  } catch (error) {
    cb(error);
  }
}

module.exports = function (Service) {
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

  Service.generatePDF = (service, signatureClient, signatureInspector, aprobationName, cb) => {

    Service.app.models.area.find({
      where: {
        clientId: service.clientId
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
                    serviceId: service.id
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
        Service.app.models.client.findById(service.clientId, function (err, client) {
          if (err) return cb(err);
          createPdfDocument(service, client, result, signatureClient, signatureInspector, aprobationName, cb);
        });
      }
    });
  }

  Service.remoteMethod('generatePDF', {
    http: {
      verb: 'post'
    },
    // description: ["api para envío de emial."],
    accepts: [{
      arg: 'service',
      type: 'object',
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
      arg: 'aprobationName',
      type: 'string',
      required: true
    }],
    returns: {
      arg: 'result',
      type: 'string'
    }
  });
};
