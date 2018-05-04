var mongoose = mongo;
var jwt = require('jsonwebtoken');
var Promise = require('bluebird');
var secret = require('../../../secret');
var hasher = require('../../hasher');
var verify = hasher.verify;

var resolvers = {
    Query: {
        authenticate: async function (parent, args) {
            return await new Promise((resolve, reject) => {
                try {
                    var decoded = jwt.verify(args.token, secret);
                    resolve(true);
                } catch (e) {
                    resolve(false);
                }
            })
        },
    },
    Mutation: {
        createSession: async function (parent, args, {
            User,
            Session
        }) {
            return await new Promise((resolve, reject) => {
                User.findOne({
                        username: args.username
                    })
                    .then(user => {
                        if (user == null) {
                            resolve({
                                username: '',
                                token: '',
                                error: 'ERR_INVALIDUSER'
                            });
                            return;
                        }
                        var verifyRes = verify(args.pass, user.hashedPass);
                        if (user.approved === false) {
                            var UnapprovedSession = {
                                username: args.username,
                                token: '',
                                error: 'ERR_UNAPPROVED'
                            }
                            //('resolving unapproved!');
                            //(user);
                            resolve(UnapprovedSession);
                            return;
                        } else {
                            //(user);
                        }
                        if (verifyRes === true) {
                            var token = jwt.sign({
                                username: args.username
                            }, secret, {
                                expiresIn: '1d'
                            });
                            var NewSession = {
                                username: args.username,
                                token: token,
                                error: ''
                            }
                            if (token && args.username != "undefined") {
                                resolve(NewSession);
                            }
                        } else {
                            resolve({
                                username: '',
                                token: '',
                                error: 'ERR_WRONGPASS'
                            });
                        }
                    })
            })
        }
    }
}

module.exports = resolvers;