const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const request_prom = require('request-promise');
const request = require('request');
var bodyParser = require('body-parser');
const { cookie } = require('request');

const app = express();
//const url = "http://118.91.37.158:80";
const url = "http://localhost:80";

var vote_info = [
    [1, 0, 0],
    [1, 0, 0],
    [1, 1, 0],
    [1, 1, 0],
    [1, 1, 0],
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1]
];

var info = new Array(8);
for (var i = 0; i < info.length; i++) {
    info[i] = new Array(2);
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static('assets')); // path of assets
app.set('view engine', 'ejs');

app.listen(80, () => {
    console.log('Server is running on port : 80\nurl : ' + url);
});


app.get('/', (req, res) => {
    return res.render('index');
});

app.get('/login', (req, res) => {
    const uri = 'https://osu.ppy.sh/oauth/authorize?' +
        'client_id=11183&' +
        'redirect_uri=' + url + '/authorize&' +
        'response_type=code&scope=public';
    return res.redirect(uri);
});


var code;

app.get('/authorize', async(req, res) => {

    const { code } = req.query;
    const result = await request_prom({
        method: 'POST',
        url: 'https://osu.ppy.sh/oauth/token',
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
        body: {
            code,
            "client_id": 11183,
            "client_secret": "vzFBNpSCxrHrQc2nar4n9u8KUQ89HzB6xDJPV6rB",
            "grant_type": "authorization_code",
            "redirect_uri": "http://localhost:80/authorize"
        },
        json: true
    });
    res.cookie('Accept', 'application/json');
    res.cookie('Content-Type', 'application/json');
    res.cookie('Authorization', 'Bearer ' + result['access_token']);

    res.redirect('/main');
});



app.get('/main', (req, res) => {
    if (!req.cookies['Authorization']) {
        res.redirect('/')
    } else {

    }
    var headers = {
        'Accept': req.cookies['Accept'],
        'Content-Type': req.cookies['Content-Type'],
        'Authorization': req.cookies['Authorization']
    }
    const options = {
        url: 'https://osu.ppy.sh/api/v2/me',
        method: 'GET',
        headers: headers
    };
    request(options, function(error, response, body) {
        const obj = JSON.parse(body)
        var params = {
            nicname_me: obj["username"],
            image_me: obj["avatar_url"],
            userpage_me: "osu.ppy.sh/users/" + obj["id"],
            vote_info: vote_info
        };
        res.cookie("params", params);
        res.render('voting.ejs', params);
    });
});



app.post('/main', (req, res) => {
    var temp, temp2;
    var name;
    var headers = {
        'Accept': req.cookies['Accept'],
        'Content-Type': req.cookies['Content-Type'],
        'Authorization': req.cookies['Authorization']
    }
    val = req.body['name']
    console.log(req.body)
    const options = {
        url: "https://osu.ppy.sh/api/v2/users/" + val,
        //url: 'https://osu.ppy.sh/api/v2/users/' + val + '/osu',
        qs: {
            'mode': 'osu',
            'limit': 5
        },
        method: 'GET',
        headers: headers
    };
    var json = {};
    request(options, function(error, response, body) {
        json.name = val;
        json.img = JSON.parse(body)["avatar_url"];
        json.rank = JSON.parse(body)['statistics']["global_rank"]
        console.log(json);
        res.json(json);
    });
})