const https = require('https');
const fs    = require('fs');
const url   = require('url');

const argv = process.argv.slice(2);

if (argv.length != 4) {
    console.error("Usage: node server.js [port] [path to certificate] [path to key] [oauth2 client secret]");
    process.exit(1);
}

const portnumber    = argv[0];
const certfilepath  = argv[1];
const keyfilepath   = argv[2];
const oauth2_secret = argv[3];

const options = {
    key: fs.readFileSync(keyfilepath),
    cert: fs.readFileSync(certfilepath)
};

var oauth2_code         = "N/A";
var oauth2_access_token = "N/A";
var oauth2_clientid     = "live1_198685_KantFDrlXQwShJNW9YRdCj0Z";
var oauth2_redirecturi  = "https://localhost:8888";

const get_html_page = function() {
    return `<html>
<body>
  <a href="https://hotels.cloudbeds.com/api/v1.1/oauth?client_id=${oauth2_clientid}&redirect_uri=${oauth2_redirecturi}&response_type=code">Get Cloudbeds auth token</a>
<p>
Code: ${oauth2_code}
</p>
</body>
</html>`;
}

const get_oauth2_access_token = function (code) {

    oauth2_code = code;

    form_data = `${encodeURI('grant_type')}=${encodeURI("authorization_code")}`;
    form_data += `&${encodeURI('client_id')}=${encodeURI(oauth2_clientid)}`;
    form_data += `&${encodeURI('client_secret')}=${encodeURI(oauth2_secret)}`;
    form_data += `&${encodeURI('redirect_uri')}=${encodeURI(oauth2_redirecturi)}`;
    form_data += `&${encodeURI('code')}=${encodeURI(oauth2_code)}`;

    console.log(`form_data: ${form_data}`);

    const options = {
        hostname: 'hotels.cloudbeds.com',
        port: 443,
        path: '/api/v1.1/access_token',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(form_data),
            'Accept': 'application/json'
        }
    };

    const req = https.request(options, res => {
        console.log(`statusCode: ${res.statusCode}`);

        res.on('data', d => {
          console.log(JSON.parse(d));
        })
    });

    req.on('error', error => {
        console.error(error);
    });

    req.write(form_data);
    req.end();
}

const app = function (req, res) {

    var url_parts = url.parse(req.url, true);
    console.log(url_parts.query);

    if ("code" in url_parts.query) {
        get_oauth2_access_token(url_parts.query["code"]);
    }

    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(get_html_page());
}

https.createServer(options, app).listen(portnumber);