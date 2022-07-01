Install dependencies:
=====================
npm install

Generate certificates:
======================
openssl genrsa 2048 > server.key
chmod 400 server.key
openssl req -new -x509 -nodes -sha256 -days 365 -key server.key -out server.cert

Run server:
===========
node \
    gab-lobby-sreen-server.js  \
    8888                       \
    /path/to/server.cert       \
    /path/to/server.key        \
    [cloudbed  client_secret]  \
    [cloudbeds client_id]
