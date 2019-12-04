module.exports = function(RED) {

    "use strict";

    function encodeAPI(name, version) {
        return name + ':' + version;
    }

    function decodeAPI(api) {
        var a = api.split(':', 2);
        return {
            name: a[0],
            version: a[1]
        };
    }

    var { google } = require('googleapis');
    const Photos = require('googlephotos');

    var discovery = google.discovery({ version: 'v1' });

    RED.httpAdmin.get('/google/apis', function(req, res) {
        discovery.apis.list({
            fields: "items(name,version)"
        }, function(err, data) {
            var response = [];
            data.data.items.forEach(function(v) {
                response.push(encodeAPI(v.name, v.version));
            });
            response.sort();
            res.json(response);
        });
    });

    RED.httpAdmin.get('/google/apis/:api/info', function(req, res) {

        var api = decodeAPI(req.params.api);

        discovery.apis.getRest({
            api: api.name,
            version: api.version,
            fields: "auth,methods,resources"
        }, function(err, data) {

            if (err) {
              return res.status(500).json(err);
            }

            var response = {
                operations: [],
                scopes: []
            };

            function processResources(d, parent) {
                var prefix = parent ? parent + '.' : '';
                if (d.methods) {
                    Object.keys(d.methods).forEach(function(k) {
                        response.operations.push(prefix + k);
                    });
                }
                if (d.resources) {
                    Object.keys(d.resources).forEach(function(k) {
                        processResources(d.resources[k], prefix + k);
                    });
                }
            }

            processResources(data.data);

            response.operations.sort();
            response.scopes = Object.keys(data.data.auth.oauth2.scopes);

            res.json(response);

        });
    });

    function GoogleNode(config) {

        RED.nodes.createNode(this, config);
        var node = this;
        node.config = RED.nodes.getNode(config.google);
        /*
        node.api = config.api;
        node.operation = config.operation;
        node.scopes = config.scopes; */

        const oauth2Client = new google.auth.OAuth2(
            node.config.credentials.clientId,
            node.config.credentials.clientSecret
        );
        oauth2Client.setCredentials({
            access_token: node.config.credentials.accessToken,
            refresh_token: node.config.credentials.refreshToken,
            scope: node.config.scopes.replace(/\n/g, " "),
            token_type: node.config.credentials.tokenType,
            expiry_date: node.config.credentials.expireTime 
        });

        // this is added to force a refresh of the access token.  
        // In other words the function registered by the below call (= oauth2Client.on('tokens', ...)) will be called.
        oauth2Client.refreshAccessToken(function(err, tokens) { });


        // handling refresh tokens : see https://github.com/googleapis/google-api-nodejs-client#handling-refresh-tokens
        oauth2Client.on('tokens', (tokens) => {
            node.warn("oauth2Client.on(): old access token :" + node.config.credentials.accessToken.substr(0,30));
            node.warn("oauth2Client.on(): new access token :" + tokens.access_token.substr(0,30));
            node.config.credentials.accessToken = tokens.access_token;
            node.config.credentials.expireTime  = tokens.expiry_date;
            node.warn("oauth2Client.on(): expireTime:"   + (new Date(node.config.credentials.expireTime)).toLocaleString());
            if (tokens.refresh_token) {
                node.config.credentials.refreshToken = tokens.refresh_token;
                node.warn("oauth2Client.on(): new refresh_token :" + tokens.refresh_token.substr(0,30));
            }

            // Note that this command is not really persisting the credentials !!
            RED.nodes.addCredentials(config.google, node.config.credentials);

            // use the new access take to initialize photos.
            node.warn("oauth2Client.on(): new Photos ("  + node.config.credentials.accessToken.substr(0,30) + ")");
            node.photos = new Photos(node.config.credentials.accessToken);
        });

        node.warn("node.config.credentials.refreshToken:" + node.config.credentials.refreshToken.substr(0,30));
        node.warn("node.config.credentials.expireTime:"   + (new Date(node.config.credentials.expireTime)).toLocaleString());

        node.on('input', function(msg) {

            this.warn("node.on('input'):"  + msg );

            node.status({
                fill: 'blue',
                shape: 'dot',
                text: 'pending'
            });

            async function get_albums_list(node){
                node.warn("get_albums_list ...")
                try {
                    let response = await node.photos.albums.list();
                    node.warn("get_albums_list response :"+ response);
                    node.status({
                        fill: 'yellow',
                        shape: 'dot',
                        text: 'success'
                    });
    
                    msg.payload = response;
    
                    node.send(msg);
                } catch (e) {
                    node.status({
                        fill: 'red',
                        shape: 'dot',
                        text: 'error'
                    });
                    node.error(e);
                }
            }

            async function upload_photo(node, albumId, fileName, filePath, description){
                node.warn("upload_photo ...")
                try {
                    let response = await node.photos.mediaItems.upload(albumId, fileName, filePath, description);
                    node.warn("upload_photo response :"+ response);
                    node.status({
                        fill: 'yellow',
                        shape: 'dot',
                        text: 'success'
                    });
    
                    msg.payload = response;
    
                    node.send(msg);
                } catch (e) {
                    node.status({
                        fill: 'red',
                        shape: 'dot',
                        text: 'error'
                    });
                    node.error(e);
                }
            }

            switch( msg.payload.operation ) {
                case "upload_photo" :
                    upload_photo(node, msg.payload.albumId, msg.payload.fileName, msg.payload.filePath, msg.payload.description );
                    break;
                case "get_album_list" :
                    get_albums_list(node);
                    break;
                default:
                    node.status({
                            fill: 'red',
                            shape: 'dot',
                            text: 'error'
                        });
                    node.error("msg.operation (=" + msg.operation+ ") doesn't specify a supported operation.");
            }

            this.warn("... end node.on()");

        });
    }

    RED.nodes.registerType("google", GoogleNode);

};
