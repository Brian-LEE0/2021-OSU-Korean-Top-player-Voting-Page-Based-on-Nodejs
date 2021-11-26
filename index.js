const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();
app.listen(8080, () => {
  console.log('Server is running on port : 8080')
});
app.use(cookieParser());
app.set('view engine', 'ejs');
app.get('/', (req, res) => {
  return res.render('index');
});

app.get('/login', (req, res) => {
    const uri = 'https://osu.ppy.sh/oauth/authorize?'+
        'client_id=11183&'+
        'redirect_uri=http://localhost:8080/authorize&'+
        'response_type=code';
    return res.redirect(uri);
});

const request = require('request-promise');
var code;

app.get('/authorize', async(req, res) => {
    
    const { code } = req.query;
    const result = await request({
    method: 'POST',
    url: 'https://osu.ppy.sh/oauth/token',
    body: {
        code,
        grant_type: 'authorization_code',
        client_id: 11183,
        client_secret: 'vzFBNpSCxrHrQc2nar4n9u8KUQ89HzB6xDJPV6rB',
        redirect_uri: 'http://localhost:8080/authorize'
    },
    json : true
    });
    res.cookie('Accept','application/json');
    res.cookie('Content-Type','application/json');
    res.cookie('Authorization','Bearer ' + result['access_token']);
    
    res.redirect('/main');
});

const request2 = require('request');

app.get('/main',(req,res)=>{
    var headers = req.cookies;
    const options = {
        url: 'https://osu.ppy.sh/api/v2/me',
        method: 'GET',
        headers:headers
    };
    request2(options,function(error,response,body){
        console.log(body.country_code);
        const obj = JSON.parse(body)
        res.render('main',{
            nicname : obj["username"],
            image : obj["avatar_url"],
            userpage : "osu.ppy.sh/users/"+obj["id"]
        });
        console.log(obj["avatar_url"]);
    });
    
});