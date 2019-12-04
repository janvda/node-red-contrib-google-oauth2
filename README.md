# node-red-contrib-google-photos

Node-RED node for the Google Photos API.

## Implementation Details

This Node is derived from [node-red-contrib-google-oauth2](https://github.com/pckhib/node-red-contrib-google-oauth2). It reuses a big part of its implementation - especially the OAuth2 authentication.

The implementation of the Google Photos API is based on the [googlephotos package](https://www.npmjs.com/package/googlephotos) ([github](https://github.com/roopakv/google-photos)).

## Features (TO BE UPDATED)

This node is a wrapper for official Google APIs Node.js Client: [google-api-nodejs-client](https://github.com/google/google-api-nodejs-client).

List of available APIs are delivered online via [Google API Discovery Service](https://developers.google.com/discovery/).

Package contains two nodes. There is configuration node made for maintaining connection to Google API Services (_google-credentials_) and regular node providing posibility to call any method of any API exposed via official Google's Node.js Client.

## How to Install

Run the following command in the root directory of your Node-RED install

```
npm install node-red-contrib-google-photos
```

or for a global installation
```
npm install -g node-red-contrib-google-photos
```

## Configuration (TO BE UPDATED)

1. Generate OAuth credentials at [Google API Console](https://console.developers.google.com/apis/credentials/oauthclient).

  * Choose Web Application.
  * As `Authorized JavaScript origins` enter your Node-RED IP (_e.g. `http://localhost:1880`_)
  * As `Authorized redirect URIs` enter your Node-RED IP plus `/google-credentials/auth/callback` (_e.g. `http://localhost:1880/google-credentials/auth/callback`_)

2. Copy the `Client ID` and `Client secret` and paste them into the Config Node
