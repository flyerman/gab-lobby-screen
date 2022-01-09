const https = require('https');
const fs    = require('fs');
const url   = require('url');

const argv = process.argv.slice(2);

if (argv.length != 3) {
    console.error("Usage: node server.js [port] [path to certificate] [path to key]");
    process.exit(1);
}

const portnumber   = argv[0];
const certfilepath = argv[1];
const keyfilepath  = argv[2];

const options = {
    key: fs.readFileSync(keyfilepath),
    cert: fs.readFileSync(certfilepath)
};

const app = function (req, res) {

    var url_parts = url.parse(req.url, true);
    console.log(url_parts.query);

    res.writeHead(200);
    res.end("hello world\n");
}

https.createServer(options, app).listen(portnumber);