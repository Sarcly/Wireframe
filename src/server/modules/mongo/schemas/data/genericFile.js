var mongoose = require('mongoose');
var {Schema} = mongoose;

let File = new Schema({
    absolutePath: String,
    userRelativePath: !String,
    rawName: String,
    uploader: !String,
    name: !String,
    type: String,
    uploadDate:!Date,
    fileSize: Number
})

module.exports = mongo.model('File',File);