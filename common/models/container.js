'use strict';
var fs = require("fs");
const uuidv1 = require('uuid/v1');




module.exports = function (Container) {

  Container.uploadPic = (base64Img, container, fileName, cb) => {
    var base64Data = base64Img.replace(/^data:image\/jpeg;base64,/, "");
    if (fileName == '') {
      fileName = uuidv1() + ".jpg";
    }
    var filePath = "storage/" + container + "/" + fileName;

    fs.writeFile(filePath, base64Data, 'base64', function (err) {
      if (err) {
        fs.mkdir("storage/" + container, function (err) {
          if (err) {
            console.log(err);
            cb(err)
          } else {
            fs.writeFile(filePath, base64Data, 'base64', function (err) {
              if (err) {
                console.log(err);
                cb(err)
              } else {
                cb(null, "ok");
              }
            })
          }
        });
      } else {
        cb(null, "ok");
      }
    });

  }

  Container.remoteMethod('uploadPic', {
    http: {
      verb: 'post'
    },
    description: "Upload a picture to the server",
    accepts: [{
        arg: "base64Img",
        type: "string",
        description: "File encoded en base64 from client"

      },
      {
        arg: "container",
        type: "string"

      }, {
        arg: "fileName",
        type: "string"
      }
    ],
    returns: {
      arg: "result",
      type: "string"
    }
  });

};
