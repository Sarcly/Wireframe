var {
    Query
} = require('mongoose');
var fs = require('fs');
var jwt = require('jsonwebtoken');
var secret = require('../../../secret');
var hasher = require('../../hasher')
var _path = require('path')
var usersPath = __dirname + "../../../../../../users/";
var GenericFile = require('../../mongo/schemas/data/genericFile');
var uuid = require('uuid');
var bb = require('bluebird');

async function removeSubitems(username, path, _id) {
    // items in this folder path should all removed - all folders within it should have theirs removed also
    GenericFile.find({
        uploader: username,
        userRelativePath: [...path, _id]
    }).then((files) => {
        files.forEach((e) => {
            if (e.type == '|dir|') {
                removeSubitems(`${e.userRelativePath}/${e.name}/`).then(() => e.remove());
            } else {
                fs.unlinkSync(_path.resolve(`${usersPath}${username}/${e.name}`));
                e.remove();
            }
        })
    })
}

async function checkFolderName(name, username, path) {
    GenericFile.find({
        uploader: username,
        type: "dir",
        path: path,
    })
}

var resolvers = {
    Query: {
        files: async function (parent, args, {
            GenericFile, Folder
        }) {
            return await new Promise((resolve, reject) => {
                var info;
                try {
                    info = jwt.verify(args.token, secret);
                    var childrenPromises = [];
                    var children = [];
                    Folder.findOne({_id:args.parentId}).then(res=>{
                        res.children.forEach(child=>{
                            if(child.childType==='|dir|'){
                                childrenPromises.push(Folder.findOne({_id:child.childId}));
                            }
                            else{
                                childrenPromises.push(GenericFile.findOne({_id:child.childId}));
                            }
                        })
                        bb.all(childrenPromises).then(res=>{
                            resolve(res);
                        })
                    })
                } catch (e) {
                    resolve(false);
                }
            });
        },
        file: async function (parent, args, {
            GenericFile
        }) {
            return await new Promise((resolve, reject) => {
                try {
                    var info = jwt.verify(args.token, secret);
                    GenericFile.findOne({
                        _id: args._id
                    }).then((res) => {
                        if (res) resolve(res);
                        resolve(null);
                    })
                } catch (e) {
                    resolve(false);
                }
            })
        },
        getCrumbs: async function (parent, args, {
            GenericFile
        }) {
            return await new Promise((resolve, reject) => {
                try {
                    var info = jwt.verify(args.token, secret);
                    var fileParents = [];
                    var resultNames = [];
                    if (args._id == '') {
                        resolve(null);
                        return;
                    } else { }
                    GenericFile.findOne({
                        _id: args._id
                    }).then(res => {
                        fileParents = res.userRelativePath;
                        var promises = [];
                        var parentNames = [];
                        fileParents.forEach(parentId => {
                            if (parentId !== '') {
                                var prom = GenericFile.findOne({
                                    _id: parentId
                                }).then(res => resultNames.push({
                                    name: res.name,
                                    _id: res._id
                                }));
                                promises.push(prom);
                            }
                            else {
                                var prom = GenericFile.find({
                                    uploader: info.username,
                                    userRelativePath: ['']
                                });
                                promises.push(prom);
                            }

                        })
                        bb.all(promises).then(results => {

                        })
                    });

                } catch (e) {
                    resolve(false);
                }

            })
        },
        getStructure: async function (parent, args, {
            GenericFile
        }) {
            return await new Promise((resolve, reject) => {
                try {
                    var info = jwt.verify(args.token, secret);
                    let struc = [];
                    let user = info.username;
                    GenericFile.find({ uploader: user }).then(res => {
                        resolve(res);
                    });
                } catch (e) {
                    throw (e)
                    resolve(null);
                    return;
                }
            })

        }
    },
    Mutation: {
        renameFile: async function (parent, args, {
            GenericFile
        }) {
            return await new Promise((resolve, reject) => {
                try {
                    var info = jwt.verify(args.token, secret);
                    GenericFile.update({
                        userRelativePath: args.path,
                        _id: args._id,
                        uploader: info.username
                    }, {
                            name: args.newName
                        }).then(res => {
                            resolve(true);

                        }).catch((e) => {
                            throw (e);
                            resolve(false);
                            return;
                        });
                } catch (e) {
                    throw (e);
                    resolve(false);
                    return;
                }
            })
        },
        addFolder: async function (parent, args, {
            GenericFile, Folder
        }) {
            // path is in terms from user root directory
            return await new Promise((resolve, reject) => {
                try {
                    var info = jwt.verify(args.token, secret);
                    var folder = new Folder({
                        name: args.name,
                        parentId: args.parentId,
                        owner: info.username
                    })
                    folder.save().then(() => {
                        Folder.findOne({ _id: args.parentId }).then(res => {
                            res.children.push({ childType: "|dir|", childId: folder._id, childName: args.name });
                            res.save().then(() => {
                                resolve(true);
                            })
                        })
                    })
                } catch (e) {
                    throw (e);
                    resolve(false);
                    return;
                }
            });
        },
        remove: async function (parent, args, {
            GenericFile
        }) {
            return await new Promise((resolve, reject) => {
                try {
                    var info = jwt.verify(args.token, secret);
                    GenericFile.find({
                        _id: args._id
                    }).then((res) => {
                        res.forEach(element => {
                            if (element.type == '|dir|') {
                                //TODO: check if this remove subfolder still works
                                removeSubitems(element.uploader, element.userRelativePath, element.name).then(() => {
                                    element.remove();
                                    resolve(true);
                                });
                            } else {
                                try {
                                    fs.unlinkSync(_path.resolve(__dirname + `../../../../../../users/${element.uploader}/${element.name}`));
                                    element.remove().then(() => resolve(true));
                                } catch (e) {
                                    if (e.code == 'ENOENT') {
                                        element.remove().then(() => resolve(true));
                                    } else resolve(false);
                                }
                            }
                        });
                    })
                } catch (e) {
                    throw (e);
                    resolve(false);
                }
            })
        },
        generateLink: async function (parent, args, {
            GenericFile
        }) {
            return await new Promise((resolve, reject) => {
                try {
                    var info = jwt.verify(args.token, secret);
                    GenericFile.findOne({
                        uploader: info.username,
                        userRelativePath: args.path == '' ? '/' : args.path,
                        name: args.name
                    }).then((file) => {
                        var url = uuid.v4(3);
                        file.sharing_links.push(url);
                        file.save().then((res) => resolve(url));
                    })
                } catch (e) {
                    resolve(false);
                }
            });
        }
    }
}

module.exports = resolvers;