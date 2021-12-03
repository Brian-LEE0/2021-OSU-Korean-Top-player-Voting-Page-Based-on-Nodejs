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


for (var i = 0; i < 8; i++) {
    for (var j = 0; j < 3; j++) {
        if (vote_info[i][j]) {
            info[i][j] = { name: '', img: '', pt: String(10 - i) + "pt" }
        } else {
            info[i][j] = 0
        }
    }
}
console.log(info)
console.log(vote_info)

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
            vote_info: vote_info,
            info: info
        };
        res.cookie("params", params);
        res.render('voting.ejs', req.cookies.params);
    });
});



app.post('/main', (req, res) => {
    var temp;
    var headers = {
        'Accept': req.cookies['Accept'],
        'Content-Type': req.cookies['Content-Type'],
        'Authorization': req.cookies['Authorization']
    }
    temp = Object.keys(req.body)
    val = req.body[temp]
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
    var params = req.cookies.params
    request(options, function(error, response, body) {
        console.log(JSON.parse(body)["avatar_url"])
        for (var i = 0; i < vote_info.length; i++) {
            for (var j = 0; vote_info[i][j] != 0; j++) {
                console.log(params.info[i][0])
                if (temp == (params.info[i][j].pt)) {
                    params.info[i][j].name = val;
                    params.info[i][j].img = JSON.parse(body)["avatar_url"];

                    res.cookie("params", params);
                    res.render("voting.ejs", req.cookies.params);
                    return;
                }
            }
        }
    });
})