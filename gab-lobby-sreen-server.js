const https = require('https');
const fs    = require('fs');
const url   = require('url');
const pug   = require('pug');

const argv = process.argv.slice(2);

if (argv.length != 4) {
    console.error("Usage: node server.js [port] [path to certificate] [path to key] [oauth2 client secret]");
    process.exit(1);
}

const portnumber    = argv[0];
const certfilepath  = argv[1];
const keyfilepath   = argv[2];
const oauth2_secret = argv[3];

const token_file = "tokens.json";

const options = {
    key: fs.readFileSync(keyfilepath),
    cert: fs.readFileSync(certfilepath)
};

var oauth2_code;
var oauth2_access_token;
var oauth2_clientid     = "live1_198685_KantFDrlXQwShJNW9YRdCj0Z";
var oauth2_redirecturi  = "https://localhost:8888/?date=today";

var access_token;
var refresh_token;
var checkins_list;

const get_today_string = function() {
    var current = new Date();
    var dd = current.getDate();
    var mm = current.getMonth() + 1;
    var yyyy = current.getFullYear();

    if (dd < 10) {
        dd = '0' + dd;
    }
    if (mm < 10) {
        mm = '0' + mm;
    }

    var todayString = yyyy+'-'+mm+'-'+dd;
    return todayString;
}

var checkin_date = get_today_string();
var fetching_checkins = false;

const get_home_page = function() {
    return compiled_homepage({
        oauth2_clientid: oauth2_clientid,
        oauth2_redirecturi: oauth2_redirecturi
    });
}

const get_human_readable_date = function () {
    var tha_date = new Date(checkin_date + "T12:00:00-05:00");
    return tha_date.toDateString();
}

const get_checkins_page = function () {

    if (!checkins_list) {
        return compiled_loadpage({});
    }

    return compiled_checkins({
        human_readable_date: get_human_readable_date(),
        checkins_list: checkins_list
    });
}

const save_tokens = function () {

    const token_file_tmp = `${token_file}.tmp`;

    let tokens = {
        access_token: access_token,
        refresh_token: refresh_token
    };

    let data = JSON.stringify(tokens, null, 2);

    fs.writeFile(token_file_tmp, data, (err) => {
        if (err) throw err;

        fs.renameSync(token_file_tmp, token_file);
        console.log(`Cloudbeds tokens saved to ${token_file}`);
    });
}

const get_oauth2_access_token = function () {

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
            json_response = JSON.parse(d);
            access_token  = json_response.access_token;
            refresh_token = json_response.refresh_token;
            save_tokens();
            setInterval(refresh_access_token, 600000);
        })
    });

    req.on('error', error => {
        console.error(error);
    });

    req.write(form_data);
    req.end();
}

const refresh_access_token = function() {

    console.log("refresh access token");
    form_data = `${encodeURI('grant_type')}=${encodeURI("refresh_token")}`;
    form_data += `&${encodeURI('refresh_token')}=${encodeURI(refresh_token)}`;
    form_data += `&${encodeURI('client_id')}=${encodeURI(oauth2_clientid)}`;
    form_data += `&${encodeURI('client_secret')}=${encodeURI(oauth2_secret)}`;

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
            json_response = JSON.parse(d);
            access_token  = json_response.access_token;
            refresh_token = json_response.refresh_token;
            save_tokens();
        })
    });

    req.on('error', error => {
        console.error(error);
    });

    req.write(form_data);
    req.end();
}

const get_checkins = function() {

    fetching_checkins = true;

    const options = {
        hostname: 'hotels.cloudbeds.com',
        port: 443,
        path: `/api/v1.1/getReservations?checkInFrom=${checkin_date}&checkInTo=${checkin_date}&includeGuestsDetails=true`,
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${access_token}`
        }
    };

    const req = https.request(options, res => {
        console.log(`statusCode: ${res.statusCode}`);
        response_buf = "";

        res.on('data', d => {
            response_buf += d;
        });

        res.on('end', () => {
            json_response = JSON.parse(response_buf);
            console.log(json_response);
            checkins_list = json_response.data;

            // Assemble the list of guests for each room under each reservation
            for (let i = 0; checkins_list && checkins_list.length && i < checkins_list.length; i++) {
                var rooms = {};
                for (const [key, guest] of Object.entries(checkins_list[i].guestList)) {
                    guest.rooms.forEach(function(room) {
                        if (rooms[room.roomName] == null) {
                            rooms[room.roomName] = {
                                "guests": [guest.guestName],
                                "roomName": room.roomName
                            };
                        } else {
                            rooms[room.roomName].guests.push(guest.guestName);
                        }
                    });
                }
                checkins_list[i].rooms = rooms;
            }

            fetching_checkins = false;
        })
    });

    req.on('error', error => {
        console.error(error);
        fetching_checkins = false;
    });

    req.write(form_data);
    req.end();
}

const app = function (req, res) {

    var url_parts = url.parse(req.url, true);
    //console.log(url_parts.query);

    if ("code" in url_parts.query && !oauth2_code) {
        oauth2_code = url_parts.query["code"];
        get_oauth2_access_token();
    }

    if ("date" in url_parts.query) {
        new_date = url_parts.query["date"];
        if (new_date == "today") {
            new_date = get_today_string();
        }
        if (new_date != checkin_date) {
            checkins_list = undefined;
            checkin_date = new_date;
        }
        if (access_token && fetching_checkins == false) {
            get_checkins();
        }
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(get_checkins_page());
        return;
    }

    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(get_home_page());
}

const compiled_homepage = pug.compileFile('template_homepage.pug');
const compiled_loadpage = pug.compileFile('template_loadpage.pug');
const compiled_checkins = pug.compileFile('template_checkins.pug');

try {
    if (fs.existsSync(token_file)) {
        console.log(`Loading Cloudbeds tokens from ${token_file}`);
        let rawtokendata = fs.readFileSync(token_file);
        let tokens = JSON.parse(rawtokendata);
        refresh_token = tokens.refresh_token;
        refresh_access_token();
        setInterval(refresh_access_token, 600000);
    }
} catch(err) {
    fs.unlinkSync(token_file);
}

https.createServer(options, app).listen(portnumber);