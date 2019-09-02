"use strict";

var PDFDocument = require("pdfkit");
var blobStream = require("blob-stream");
var uuidv1 = require("uuid/v1");
var fs = require("fs");

function sortAreas(areasArray, objectResult, index, parentCallback) {
  if (index >= areasArray.length) parentCallback(objectResult);
  else {
    sortItems(
      areasArray[index].__data.items,
      [],
      0,
      areasArray[index].__data.name,
      objectResult,
      function (data) {
        objectResult.areas.push(data);
        sortAreas(areasArray, objectResult, index + 1, parentCallback);
      }
    );
  }
}

function sortItems(
  itemsArray,
  itemArrayAux,
  index,
  areaName,
  objectResult,
  parentCallback
) {
  if (index >= itemsArray.length)
    parentCallback({
      name: areaName,
      items: itemArrayAux
    });
  else {
    checkFurnitures(
      itemsArray[index].__data.furniture,
      0,
      itemsArray[index].__data.name,
      0,
      0,
      objectResult,
      function (data) {
        itemArrayAux.push(data);
        sortItems(
          itemsArray,
          itemArrayAux,
          index + 1,
          areaName,
          objectResult,
          parentCallback
        );
      }
    );
  }
}

function checkFurnitures(
  furnitures,
  index,
  itemName,
  total,
  done,
  objectResult,
  parentCallback
) {
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
    checkFurnitures(
      furnitures,
      index + 1,
      itemName,
      total,
      done,
      objectResult,
      parentCallback
    );
  }
}

function generateItemPdfclientInfo(itemName, subItemName, doc) {
  var spaceBetween = 4;
  var sizeFontItems = 15;
  var sizeFontSubItems = 10;
  doc
    .fontSize(sizeFontItems)
    .text(itemName, {
      align: "center"
    })
    .moveDown(0.7);
  doc
    .fontSize(sizeFontSubItems)
    .text(subItemName, {
      align: "center"
    })
    .moveDown(spaceBetween);
}

function transformToPercent(qualification) {
  if (qualification == undefined || isNaN(qualification)) return;
  const resultadoGlobal = String((qualification * 100).toFixed(2)) + "%";
  return resultadoGlobal;
}

function clientInfoPdf(
  client,
  service,
  name,
  doc,
  information,
  supervisor,
  language_json
) {
  //Logo
  doc.image("companyLogo.png", 10, 10, {
    width: 60,
    height: 60
  });

  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    // .text("Reporte de Inspección - QC Inspections"
    .text(`${language_json.title} - QC Inspections`, 10, 25, {
      align: "right"
    });

  const resultadoGlobal = transformToPercent(information.total);

  doc.fontSize(12).text(`${language_json.globalResult} (${resultadoGlobal})`, {
    align: "right"
  });

  doc
    .fontSize(10)
    .font("Helvetica")
    .text(
      `${client.address} - ${language_json.inspectorInfo}: ${
      supervisor.realm
      }, ${service.finalDate}`,
      { align: "right" }
    )
    .moveDown();

  doc.lineWidth(2);

  doc
    .lineCap("butt")
    .moveTo(10, 75)
    .lineTo(600, 75)
    .stroke()
    .moveDown();
}

function setQualificationPercent(qualification) {
  if (qualification == undefined) return 0;
  let qualificationPercent = 0;
  switch (qualification) {
    case 0:
      qualificationPercent = 0.6;
      break;
    case 1:
      qualificationPercent = 1;
      break;
    case 2:
      qualificationPercent = 0.1;
      break;
    default:
      break;
  }
  return qualificationPercent;
}

function prepareInformationForPDF(arregloDeAreas) {
  if (!arregloDeAreas) return;
  let arregloFinal = {
    total: 0,
    areas: []
  };
  let countAreas = 0;
  arregloDeAreas.forEach(area => {
    const areaTemporal = area.__data;
    let areaToBeAdded = {
      name: areaTemporal.name,
      items: []
    };
    let countItems = 0;
    areaTemporal.items.forEach(item => {
      const itemTemporal = item.__data;
      let itemToBeAdded = {
        name: itemTemporal.name,
        furnitures: []
      };
      let countFurnitures = 0;
      itemTemporal.furniture.forEach(furniture => {
        const furnitureTemporal = furniture.__data;
        const furnitureInspection = furnitureTemporal.furnitureInspections[0];
        if (!furnitureInspection) return;
        const qualificationFurniture = setQualificationPercent(
          furnitureInspection.qualification
        );

        const furnitureToBeAdded = {
          name: furnitureTemporal.name,
          qualification: qualificationFurniture
        };

        itemToBeAdded.furnitures.push(furnitureToBeAdded);
        countFurnitures += qualificationFurniture;
      });

      if (itemTemporal.furniture.length > 0) {
        countFurnitures = countFurnitures / itemTemporal.furniture.length;
        itemToBeAdded.qualification = countFurnitures;

        areaToBeAdded.items.push(itemToBeAdded);

        countItems += countFurnitures;
      }
    });
    if (areaTemporal.items.length > 0) {
      countItems = countItems / areaTemporal.items.length;
      areaToBeAdded.qualification = countItems;
      arregloFinal.areas.push(areaToBeAdded);
      countAreas += countItems;
    }
  });

  arregloFinal.total = countAreas / arregloDeAreas.length;

  return arregloFinal;
}

function getQualification(option) {
  const good = "Buena";
  const notDefined = "No definida";
  const bad = "Mala";
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
    if (title) doc.text(title + ":").moveDown(3);
    var positionX;
    var positionY;
    pictures.forEach((picture, index) => {
      if (index % 2 === 0) {
        positionX = doc.x;
        positionY = doc.y;
        if (positionY + 225 >= 790) {
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

function createSummaryPdf(sortedInformation, doc, language_json) {
  const initialPositionY = 85;
  let marginLeft = 10;
  let marginSubItem = 50;
  let marginCenter = 150;
  let counterColumns = 0;

  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .text(language_json.inspectionSummary, marginLeft, initialPositionY)
    .moveDown(0.65);

  doc
    .fontSize(8)
    .font("Helvetica")
    .text(language_json.percentResult, marginCenter)
    .moveDown(0.65);

  doc
    .fontSize(12)
    .font("Helvetica-Bold")
    .text(language_json.areasResult, marginLeft)
    .moveDown();

  const initialPositionYForAreas = doc.y;

  sortedInformation.areas.forEach(area => {
    if (Math.abs(792 - doc.y) < 80) {
      if (counterColumns === 0) {
        doc.y = initialPositionYForAreas;
        marginLeft += 300;
        marginSubItem += 300;
        marginCenter += 300;
        counterColumns++;
      } else if (counterColumns === 1) {
        doc.addPage();
        doc.y = initialPositionYForAreas;
        marginLeft -= 300;
        marginSubItem -= 300;
        marginCenter -= 300;
        counterColumns--;
      }
    }
    const positionY = doc.y;
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(area.name, marginLeft + 10, positionY);

    const areaPercent = transformToPercent(area.qualification);

    doc.text(areaPercent, marginCenter, positionY).moveDown(0.65);

    area.items.forEach(item => {
      if (Math.abs(792 - doc.y) < 80) {
        if (counterColumns === 0) {
          doc.y = initialPositionYForAreas;
          marginLeft += 300;
          marginSubItem += 300;
          marginCenter += 300;
          counterColumns = 1;
        } else if (counterColumns === 1) {
          doc.addPage();
          doc.y = initialPositionYForAreas;
          marginLeft -= 300;
          marginSubItem -= 300;
          marginCenter -= 300;
          counterColumns = 0;
        }
      }
      const positionYItem = doc.y;

      doc
        .fontSize(6)
        .font("Helvetica")
        .text(item.name, marginSubItem, positionYItem);

      const itemPercent = transformToPercent(item.qualification);

      doc
        .text(itemPercent, marginCenter, positionYItem, { align: "rigth" })
        .moveDown();
    });
    doc.moveDown();
  });
}

function fillDocument(areasArray, doc, language_json) {
  const initialXPosition = 10;
  const finalXPosition = 480;
  const yHeaderPosition = 15;
  const areaXPosition = initialXPosition + 10;
  const itemXPosition = areaXPosition + 15;
  const furnitureXPosition = itemXPosition + 15;

  doc.addPage({
    margins: {
      top: 72,
      bottom: 0,
      left: 72,
      right: 72
    }
  });

  doc
    .fontSize(15)
    .font("Helvetica-Bold")
    .text(language_json.detailInspection, initialXPosition, yHeaderPosition);

  doc
    .fontSize(10)
    .font("Helvetica")
    .text(language_json.results, finalXPosition, yHeaderPosition);

  doc.moveDown();

  areasArray.areas.forEach(area => {
    if (doc.y >= 670) {
      doc.addPage();
    }
    let currentYPosition = doc.y;

    doc
      .fontSize(13)
      .font("Helvetica-Bold")
      .text(area.name, areaXPosition, currentYPosition, { underline: true });

    doc
      .fontSize(10)
      .text(
        transformToPercent(area.qualification),
        finalXPosition,
        currentYPosition
      )
      .moveDown(0.8);

    doc.font("Helvetica");

    area.items.forEach(item => {
      if (doc.y >= 670) {
        doc.addPage();
      }
      currentYPosition = doc.y;

      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .text(item.name, itemXPosition, currentYPosition);

      doc
        .fontSize(8)
        .text(
          transformToPercent(item.qualification),
          finalXPosition,
          currentYPosition
        )
        .moveDown(0.8);

      doc.font("Helvetica");

      item.furnitures.forEach(furniture => {
        if (doc.y >= 670) {
          doc.addPage();
        }
        currentYPosition = doc.y;

        doc
          .fontSize(10)
          .text(furniture.name, furnitureXPosition, currentYPosition);

        doc
          .fontSize(6)
          .text(
            transformToPercent(furniture.qualification),
            finalXPosition,
            currentYPosition
          )
          .moveDown();
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
  fs.writeFileSync(filePathClient, signatureClientImage, "base64");

  const filePathInspector = `tmp/${fileNameInspectorImage}`;
  fs.writeFileSync(filePathInspector, signatureInspectorImage, "base64");

  doc.addPage();

  doc.fontSize(25).text("Firma del cliente: ", 100, 150, {
    align: "center"
  });

  doc.image(`tmp/${fileNameClientImage}`, 110, 190, {
    width: 400,
    height: 200
  });

  doc.text("Firma del inspector: ", 100, 420, {
    align: "center"
  });

  doc.image(`tmp/${fileNameInspectorImage}`, 110, 460, {
    width: 400,
    height: 200
  });

  fs.unlink(filePathClient, () => { });
  fs.unlink(filePathInspector, () => { });
}

function putSignature(
  signatureClient,
  signatureInspector,
  pdfDocument,
  language_json
) {
  const initialPOsitionY = pdfDocument.y;
  let initialYPositionSignature = 650;

  pdfDocument.y = initialYPositionSignature;

  pdfDocument
    .lineCap("butt")
    .moveTo(10, initialYPositionSignature)
    .lineTo(600, initialYPositionSignature)
    .stroke();

  initialYPositionSignature = 730;

  pdfDocument
    .fontSize(14)
    .text(`${language_json.clientSignature}: `, 60, initialYPositionSignature);
  pdfDocument
    .fontSize(14)
    .text(
      `${language_json.inspectorSignature}: `,
      310,
      initialYPositionSignature
    );

  const signatureClientImage = base64ToImage(signatureClient);
  const signatureInspectorImage = base64ToImage(signatureInspector);

  const fileNameClientImage = `${uuidv1()}.png`;
  const fileNameInspectorImage = `${uuidv1()}.png`;

  const filePathClient = `tmp/${fileNameClientImage}`;
  fs.writeFileSync(filePathClient, signatureClientImage, "base64");

  const filePathInspector = `tmp/${fileNameInspectorImage}`;
  fs.writeFileSync(filePathInspector, signatureInspectorImage, "base64");

  pdfDocument.image(
    `tmp/${fileNameClientImage}`,
    170,
    initialYPositionSignature - 30,
    {
      width: 120,
      height: 60
    }
  );

  pdfDocument.image(
    `tmp/${fileNameInspectorImage}`,
    445,
    initialYPositionSignature - 30,
    {
      width: 120,
      height: 60
    }
  );

  fs.unlink(filePathClient, () => { });
  fs.unlink(filePathInspector, () => { });
}

function attachEvidences(areasArray, pdfDocument, language_json) {
  pdfDocument.addPage();

  areasArray.forEach(area => {
    area.__data.items.forEach(item => {
      item.__data.furniture.forEach(furniture => {
        const furnitureTmp = furniture.__data;
        const furnitureInspection = furnitureTmp.furnitureInspections[0];

        if (furnitureInspection) {
          var container = `picBefore-${furnitureInspection.id}`;
          var containerAfter = `picAfter-${furnitureInspection.id}`;
          var filePath = `storage/${container}`;
          var filePathAfter = `storage/${containerAfter}`;

          addAllPictures(
            filePath,
            pdfDocument,
            `${language_json.beforePictures}: ${area.__data.name} - ${
            item.__data.name
            } - ${furnitureTmp.name}`
          );
          addAllPictures(
            filePathAfter,
            pdfDocument,
            `${language_json.afterPictures}: ${area.__data.name} - ${
            item.__data.name
            } - ${furnitureTmp.name}`
          );
        }
      });
    });
  });
}

function selectCorrectJsonLanguage(language = "en") {
  let language_json;
  switch (language) {
    case "es":
      language_json = {
        top: {
          title: "Reporte de Inspección",
          globalResult: "Resultado Global",
          inspectorInfo: "Inspeccionado por"
        },
        summary: {
          inspectionSummary: "Resumen de inspeccion",
          percentResult: "Resultado Porcentual",
          areasResult: "Resultado Por Áreas"
        },
        document: {
          detailInspection: "Detalle de la inspección",
          results: "Resultados"
        },
        signature: {
          clientSignature: "Firma del cliente",
          inspectorSignature: "Firma del inspector"
        },
        evidence: {
          beforePictures: "Foto(s) Antes",
          afterPictures: "Foto(s) Después"
        }
      };
      break;

    case "en":
      language_json = {
        top: {
          title: "Inspection's Report",
          globalResult: "Global Result",
          inspectorInfo: "Inspected by"
        },
        summary: {
          inspectionSummary: "Inspection's Summary",
          percentResult: "Percentage Result",
          areasResult: "Result Per Area"
        },
        document: {
          detailInspection: "Inspection's detail",
          results: "Results"
        },
        signature: {
          clientSignature: "Client's Signature",
          inspectorSignature: "Inspector's Signature"
        },
        evidence: {
          beforePictures: "Before Picture(s)",
          afterPictures: "After Picture(s)"
        }
      };
      break;
  }

  return language_json;
}

function createPdfDocument(
  service,
  client,
  resultArray,
  sigantureClient,
  sigantureInspector,
  aprobationName,
  supervisor,
  language,
  cb
) {
  try {
    let pdfDocument = new PDFDocument({
      margins: {
        top: 72,
        left: 72,
        bottom: 0,
        right: 72
      }
    });
    pdfDocument.pipe(fs.createWriteStream(`storage/pdf/${service.id}.pdf`));
    const information = prepareInformationForPDF(resultArray);
    const language_json = selectCorrectJsonLanguage(language);

    clientInfoPdf(
      client,
      service,
      aprobationName,
      pdfDocument,
      information,
      supervisor,
      language_json.top
    );
    createSummaryPdf(information, pdfDocument, language_json.summary);
    fillDocument(information, pdfDocument, language_json.document);
    putSignature(
      sigantureClient,
      sigantureInspector,
      pdfDocument,
      language_json.signature
    );
    attachEvidences(resultArray, pdfDocument, language_json.evidence);
    pdfDocument.end();
    cb(null, "ok");
  } catch (error) {
    cb(error);
  }
}

module.exports = function (Service) {
  Service.getSummary = (serviceId, clientId, cb) => {
    Service.app.models.area.find(
      {
        where: {
          clientId: clientId
        },
        include: {
          relation: "items",
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
      },
      (err, result) => {
        if (err) {
          // console.log(err);
          cb(err);
          return;
        } else {
          sortListSummary(result, cb);
        }
      }
    );
  };

  Service.remoteMethod("getSummary", {
    http: {
      verb: "get"
    },
    description: ["api para envío de emial."],
    accepts: [
      {
        arg: "serviceId",
        type: "string"
      },
      {
        arg: "clientId",
        type: "string"
      }
    ],
    returns: {
      arg: "result",
      type: "array"
    }
  });

  Service.generatePDF = (
    service,
    signatureClient,
    signatureInspector,
    aprobationName,
    language,
    cb
  ) => {
    console.log(service,
      signatureClient,
      signatureInspector,
      aprobationName,
      language);
    Service.app.models.area.find(
      {
        where: {
          clientId: service.clientId
        },
        include: {
          relation: "items",
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
      },
      (err, result) => {
        if (err) {
          console.log(err);
          cb(err);
          return;
        } else {
          Service.app.models.client.findById(service.clientId, function (
            err,
            client
          ) {
            if (err) return cb(err);
            Service.app.models.Supervisor.findById(
              service.supervisorId,
              function (err, supervisor) {
                if (err) return cb(err);
                createPdfDocument(
                  service,
                  client,
                  result,
                  signatureClient,
                  signatureInspector,
                  aprobationName,
                  supervisor,
                  language,
                  cb
                );
              }
            );
          });
        }
      }
    );
  };

  Service.remoteMethod("generatePDF", {
    http: {
      verb: "post"
    },
    // description: ["api para envío de emial."],
    accepts: [
      {
        arg: "service",
        type: "object",
        required: true
      },
      {
        arg: "signatureClient",
        type: "string",
        required: true
      },
      {
        arg: "signatureInspector",
        type: "string",
        required: true
      },
      {
        arg: "aprobationName",
        type: "string",
        required: true
      },
      {
        arg: "language",
        type: "string"
      }
    ],
    returns: {
      arg: "result",
      type: "string"
    }
  });
};
