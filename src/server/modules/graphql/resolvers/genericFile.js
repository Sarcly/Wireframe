var {
    Query
} = require('mongoose');
var fs = require('fs');
var jwt = require('jsonwebtoken');
var secret = require('../../../secret');
var hasher = require('../../hasher')
var _path = require('path')
var usersPath = __dirname + "../../../../../../users/";
var {
    GenericFile,
    Folder
} = require('../../mongo/schemas/data/genericFile');
var uuid = require('uuid');
var bb = require('bluebird');
var _ = require('lodash');

var times = 0;

async function checkFolderName(name, username, path) {
    GenericFile.find({
        owner: username,
        type: "|dir|",
        path: path,
    })
}

var isEmpty = _.isEmpty;

function unflattenEntities(entities, parent = {
    _id: "5b0de8e0ccc4deacd6289d1b",
    parentId: ""
}, tree = []) {
    let children = entities.filter(entity => entity.parentId == parent._id)
    //console.log(children);
    if (!isEmpty(children)) {
        if (parent.parentId == "") {
            tree = children
        } else {
            parent['children'] = children
        }
        children.map(child => unflattenEntities(entities, child))
    }
    return tree
}

async function getSubFolders(parentId) {
    return await new Promise((resolve, reject) => {
        var promises = Folder.find({
            parentId: parentId
        }).then(res => {
            var promises = [];
            res.forEach(kid => promises.push(getSubFolders(kid._id)));
            return promises;
        });
        bb.all(promises).then(children => {
            Folder.findOne({
                _id: parentId
            }).then(res => {
                var assigned = Object.assign({}, res, {
                    childrenFiles: children.map(c => c._doc)
                });
                GenericFile.find({
                    parentId: res._id
                }).then(genericFileKids => {
                    console.log(genericFileKids);
                    var genericChildrenAssigned = Object.assign({}, assigned, {
                        childrenFiles: genericFileKids.map(c => c._doc)
                    });
                    resolve(assigned);
                })
            })
        })
    })
}

async function removeSubItems(parentId) {
    Folder.findOne({
        _id: parentId
    }).then(folder => {
        folder.children.forEach(child => {
            if (child.type === '|dir|') removeSubItems(child._id);
            else {
                GenericFile.findOne({
                    _id: child._id
                }).then(item => {
                    try {
                        fs.unlinkSync(_path.resolve(__dirname + `../../../../../../users/${item.owner}/${item.name + item._id}`));
                        item.remove().then(() => resolve(true));
                    } catch (e) {
                        if (e.code == 'ENOENT') {
                            item.remove().then(() => resolve(true));
                        } else resolve(false);
                    }
                })
            }
        })
    })
}

var resolvers = {
    Query: {
        files: async function (parent, args, {
            GenericFile,
            Folder
        }) {
            return await new Promise((resolve, reject) => {
                var info;
                try {
                    info = jwt.verify(args.token, secret);
                    var childrenPromises = [];
                    var children = [];
                    childrenPromises.push(Folder.find({
                        parentId: args.parentId
                    }));
                    childrenPromises.push(GenericFile.find({
                        parentId: args.parentId
                    }));
                    bb.all(childrenPromises).then(res => {
                        resolve(res[0].concat(res[1]));
                    })
                } catch (e) {
                    console.log(e)
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
        resolvePath: async function (parent, args, {
            Folder
        }) {
            return await new Promise((resolve, reject) => {
                try {
                    var info = jwt.verify(args.token, secret);
                    let resDir = [];
                    let promises = [];
                    args.path.forEach(id => {
                        promises.push(Folder.findOne({
                            _id: id
                        }));
                    });
                    //TODO: To make the breadcrumb fast we should index the the files in the data base to a lookup tabel so we dont have to wait on the array of promises
                    bb.all(promises).then(res => {
                        res.forEach(i => {
                            resDir.push(i);
                        })
                        resolve(resDir)
                    })
                } catch (e) {
                    throw (e);
                    resolve(null);
                    return;
                }
            })
        },
        getStructure: async function (parent, args, {
            Folder,
            GenericFile
        }) {
            return await new Promise((resolve, reject) => {
                try {
                    var info = jwt.verify(args.token, secret);
                    var folderPromise = Folder.find({
                        owner: info.username
                    });
                    var filePromise = GenericFile.find({
                        owner: info.username
                    });
                    bb.all([folderPromise, filePromise]).then(fulfilled => {
                        var flatResults = [];
                        fulfilled[0].forEach(p => flatResults.push(p));
                        fulfilled[1].forEach(p => flatResults.push(p));
                        var unflat = unflattenEntities(flatResults);
                        var edited = unflat.map(obj => {
                            return Object.assign(obj, obj.children ? {
                                children: JSON.stringify(obj.children)
                            } : {})
                        });
                        console.log(edited);
                        resolve(edited);
                        //resolve(tree);
                        /* var structure = []
                        var parentIdSet = new Set(files.map(file=>file.parentId));
                        parentIdSet = Object.assign(new Set(),parentIdSet,folders.map(folder=>folder.parentId));
                        // parentIdSet now has all parentId's, of both folders and files. we can use this to do something probably, but i dont know what yet.
                        var unstructuredFolders = {};

                        console.log(parentIdArray);
                        console.log(parentIdArray.pop()); */
                        //resolve(structure);
                    })
                } catch (e) {
                    resolve(null);
                }
            })
        }
    },
    Mutation: {
        renameFile: async function (parent, args, {
            GenericFile,
            Folder
        }) {
            return await new Promise((resolve, reject) => {
                try {
                    var info = jwt.verify(args.token, secret);
                    if (args.type != '|dir|') {
                        GenericFile.update({
                            _id: args._id,
                            owner: info.username
                        }, {
                            name: args.newName
                        }).then(res => {
                            resolve(true);
                        }).catch((e) => {
                            throw (e);
                            resolve(false);
                            return;
                        });
                    } else {
                        Folder.update({
                            _id: args._id
                        }, {
                            name: args.newName
                        }).then(res => {
                            resolve(true);
                        }).catch((e) => {
                            throw (e);
                            resolve(false);
                            return;
                        });
                    }
                } catch (e) {
                    throw (e);
                    resolve(false);
                    return;
                }
            })
        },
        addFolder: async function (parent, args, {
            GenericFile,
            Folder
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
                        Folder.findOne({
                            _id: args.parentId
                        }).then(res => {
                            /*                             res.children.push({
                                                            childType: "|dir|",
                                                            childId: folder._id,
                                                            childName: args.name
                                                        }); */
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
            GenericFile,
            Folder
        }) {
            return await new Promise((resolve, reject) => {
                try {
                    var info = jwt.verify(args.token, secret);
                    if (args.type === '|dir|') {
                        Folder.findOne({
                            _id: args._id
                        }).then((element) => {
                            Folder.remove({
                                _id: element._id
                            }).then(() => {
                                removeSubItems(element._id).then(() => {
                                    resolve(true);
                                });
                            });
                        });
                    } else {
                        GenericFile.findOne({
                            _id: args._id
                        }).then(item => {
                            try {
                                fs.unlinkSync(item.absolutePath);
                                item.remove().then(() => resolve(true));
                            } catch (e) {
                                if (e.code == 'ENOENT') {
                                    item.remove().then(() => resolve(true));
                                } else resolve(false);
                            }
                        })
                    }
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
                        owner: info.username,
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
        },
        move: async function (parent, args, {
            GenericFile,
            Folder
        }) {
            return await new Promise((resolve, reject) => {
                try {
                    var info = jwt.verify(args.token, secret);
                    var oldParentChildrenRemovePromise = Folder.findOne({
                        _id: args.oldParentId,
                        owner: info.username
                    }).then(res => {
                        if (res) {
                            res.children.filter(child => {
                                return !child._id === args._id
                            })
                            res.save();
                        }
                    })
                    var newParentChildrenAddPromise = Folder.findOne({
                        _id: args.newParentId,
                        owner: info.username
                    }).then(res => {
                        res.children.push(args._id);
                        res.save()
                    });
                    var updateElementParentId = args.isFolder ? Folder.update({
                        _id: args._id,
                        owner: info.username
                    }, {
                        parentId: args.newParentId
                    }) : GenericFile.update({
                        _id: args._id,
                        owner: info.username
                    }, {
                        parentId: args.newParentId
                    });
                    bb.all([oldParentChildrenRemovePromise, newParentChildrenAddPromise, updateElementParentId]).then(res => {
                        resolve(true);
                    }).catch(e => resolve(false));

                } catch (e) {
                    resolve(false);
                }
            })
        }
    }
}


module.exports = resolvers;