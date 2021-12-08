const express = require("express")
const mysql = require("mysql");
const cookieParser = require("cookie-parser")
const path = require("path")
const request_prom = require("request-promise")
const request = require("request")
const bodyParser = require("body-parser")
const { cookie } = require("request")

const app = express()
//const url = "http://118.91.37.158:80"
const url = "http://localhost:80"

const sql_info = {
    host     : 'localhost',
    user     : 'root',
    password : 'nnaisle123',
    database : '2021_OsuKoreanTopPlayer'
}
var con = mysql.createConnection(sql_info);
const compare = {
    YEAR : 2021,
    MONTH : 05,
    playcount : 5000
}

const vote_info = [
    [1, 0, 0],
    [1, 0, 0],
    [1, 1, 0],
    [1, 1, 0],
    [1, 1, 0],
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1],
]

con.connect((err)=>{
    if(err) throw err
    console.log('Connected DB')
    try{
        con.query('CREATE DATABASE '+sql_info.database,(err,result)=>{
            if(err){
                
            }else{
                console.log('database created')
            }
            
        })
    }catch(err){
        console.log(err);
    }
});

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(cookieParser())
app.use(express.static("assets")) // path of assets
app.set("view engine", "ejs")

app.listen(80, () => {
    console.log("Server is running on port : 80\nurl : " + url)
})

app.get("/", (req, res) => {
    return res.render("index")
})

app.get("/login", (req, res) => {
    const uri =
        "https://osu.ppy.sh/oauth/authorize?" +
        "client_id=11183&" +
        "redirect_uri=" +
        url +
        "/authorize&" +
        "response_type=code&scope=public"
    return res.redirect(uri)
})


app.get("/authorize", async (req, res) => {
    const { code } = req.query
    const result = await request_prom({
        method: "POST",
        url: "https://osu.ppy.sh/oauth/token",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: {
            code,
            client_id: 11183,
            client_secret: "vzFBNpSCxrHrQc2nar4n9u8KUQ89HzB6xDJPV6rB",
            grant_type: "authorization_code",
            redirect_uri: "http://localhost:80/authorize",
        },
        json: true,
    })
    res.cookie("Accept", "application/json")
    res.cookie("Content-Type", "application/json")
    res.cookie("Authorization", "Bearer " + result["access_token"])

    res.redirect("/main")
})

app.get("/main", (req, res) => {
    try{
        if (!req.cookies["Authorization"]) {
            res.redirect("/")
        }
        const headers = {
            Accept: req.cookies["Accept"],
            "Content-Type": req.cookies["Content-Type"],
            Authorization: req.cookies["Authorization"],
        }
        const options = {
            url: "https://osu.ppy.sh/api/v2/me",
            method: "GET",
            headers: headers,
        }
        request(options, function (error, response, body) {
            const obj = JSON.parse(body)
            const join_date = obj.join_date.split('T')[0].split('-')
            if(obj.statistics.play_count < compare.playcount){
                res.send("<script>alert('플레이 카운트가 5000 미만입니다. 투표에 참여하실 수 없습니다.')location.href='/'</script>")
            }else if(Number(join_date[0])>=compare.YEAR || Number(join_date[1]) >= compare.MONTH){
                res.send("<script>alert('최초가입일이 "  + compare.YEAR + "년 " +compare.MONTH + "월 이후입니다. 투표에 참여하실 수 없습니다.')location.href='/'</script>")
            }else{
                const params = {
                    nicname_me: obj["username"],
                    image_me: obj["avatar_url"],
                    userpage_me: "osu.ppy.sh/users/" + obj["id"],
                    vote_info: vote_info,
                }
                res.cookie("params", params)
                res.render("voting.ejs", params)
            }
        })
    }catch(err){
        res.redirect("/")
    }
})

app.post("/main", (req, res) => {
    const headers = {
        Accept: req.cookies["Accept"],
        "Content-Type": req.cookies["Content-Type"],
        Authorization: req.cookies["Authorization"],
    }
    if (!req.body) {
        return res.status(400).json({
            status: "error",
            error: "req body cannot be empty",
        })
    }
    val = req.body["name"]
    request({
        url: "https://osu.ppy.sh/api/v2/users/" + val,
        //url: 'https://osu.ppy.sh/api/v2/users/' + val + '/osu',
        qs: {
            mode: "osu",
            limit: 1,
        },
        method: "GET",
        headers: headers,
    },
        function (error2, response2, body2) {
            var json = {}
            var Jbody = JSON.parse(body2)
            try{
                if (Jbody["username"] == 'undefined' || Jbody["country"]["code"] !='KR') {
                    res.json({
                        name: "",
                        img: "",
                        rank: "",
                    })
                    return 0
                }else{
                    json.name = Jbody["username"]
                    json.img = Jbody["avatar_url"]
                    json.rank = Jbody["statistics"]["global_rank"]
                    console.log(json)
                    json.rank = "# " + json.rank
                    res.json(json)
                    return 0 
                }

            }catch(err){
                res.json({
                    name: "",
                    img: "",
                    rank: "",
                })
            }
            
            
        })
})

app.get("/submit",(req,res) =>{

})