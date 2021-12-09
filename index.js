const express = require("express");
const mysql = require("mysql");
const cookieParser = require("cookie-parser");
const path = require("path");
const request_prom = require("request-promise");
const request = require("request");
const bodyParser = require("body-parser");
const { cookie } = require("request");

const app = express();

const url = "http://oktp.shop"
//const url = "http://localhost:80";

const sql_info = {
    host: "localhost",
    user: "root",
    password: "01085244701"
};
var con = mysql.createConnection(sql_info);
const compare = {
    YEAR: 2021,
    MONTH: 05,
    playcount: 5000,
};

const vote_info = [
    [1, 0, 0],
    [1, 0, 0],
    [1, 1, 0],
    [1, 1, 0],
    [1, 1, 0],
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1],
];

con.connect((err) => {
    con.query(
        "CREATE DATABASE 2021_OsuKoreanTopPlayer",
        (err, result) => {
            if (!err) console.log("success to CREATE DATABASE 2021_OsuKoreanTopPlayer");
        }
    );
    con.query(
        "USE 2021_OsuKoreanTopPlayer",
        (err, result) => {
            if (!err) console.log("success to USE 2021_OsuKoreanTopPlayer");
        }
    );
    var temp;
    if (err) console.log(err);
    console.log("Connected DB");
    con.query(
        "CREATE TABLE voter (id int not null primary key)",
        (err, result) => {
            if (!err) console.log("success to make TABLE voter");
        }
    );
    con.query(
        "CREATE TABLE vote_result (_index int not null primary key auto increment)",
        (err, result) => {
            if (!err) console.log("success to make TABLE vote_result");
        }
    );
    AddRow("vote_result", "voter_id VARCHAR(40) not null");
    AddRow("vote_result", "candidate_id VARCHAR(40) not null");
    AddRow("vote_result", "point int not null");
    AddRow("voter", "username VARCHAR(40) not null");
    vote_info.forEach((i, i_index) =>
        i.forEach((j, j_index) => {
            if (j) {
                temp =
                    String(10 - i_index) +
                    "_" +
                    String(1 + j_index) +
                    " VARCHAR(40)";
                if (j_index == 0) temp += " NOT NULL";
                AddRow("voter", temp);
                temp =
                    String(10 - i_index) +
                    "_" +
                    String(1 + j_index) +
                    "_avatar" +
                    " VARCHAR(400)";
                if (j_index == 0) temp += " NOT NULL";
                AddRow("voter", temp);
                temp =
                    String(10 - i_index) +
                    "_" +
                    String(1 + j_index) +
                    "_id" +
                    " VARCHAR(30)";
                if (j_index == 0) temp += " NOT NULL";
                AddRow("voter", temp);
            }
        })
    );
});

function AddRow(table, str) {
    var temp;
    temp = "ALTER TABLE " + table + " ADD ";
    temp += str;
    con.query(temp, (err, result) => {
        if (!err) console.log(temp, "success");
    });
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static("assets")); // path of assets
app.set("view engine", "ejs");

app.listen(80, () => {
    console.log("Server is running on port : 80\nurl : " + url);
});

app.get("/", (req, res) => {
    return res.render("index");
});

app.get("/login", (req, res) => {
    const uri =
        "https://osu.ppy.sh/oauth/authorize?" +
        "client_id=11442&" +
        "redirect_uri=" +
        url +
        "/authorize&" +
        "response_type=code&scope=public";
    return res.redirect(uri);
});

app.get("/authorize", async(req, res) => {
    var { code } = req.query;
    const result = await request_prom({
        method: "POST",
        url: "https://osu.ppy.sh/oauth/token",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: {
            code,
            client_id: 11442,
            client_secret: "yPYLz0m8vFSpLvCKapevqqZ4QzVLuzq6CQPvrDqp",
            grant_type: "authorization_code",
            redirect_uri: "http://oktp.shop/authorize",
        },
        json: true,
    });
    res.cookie("Accept", "application/json");
    res.cookie("Content-Type", "application/json");
    res.cookie("Authorization", "Bearer " + result["access_token"]);

    res.redirect("/main");
});

app.get("/main", (req, res) => {
    try {
        if (!req.cookies["Authorization"]) {
            res.redirect("/");
        }
        const headers = {
            Accept: req.cookies["Accept"],
            "Content-Type": req.cookies["Content-Type"],
            Authorization: req.cookies["Authorization"],
        };
        const options = {
            url: "https://osu.ppy.sh/api/v2/me",
            method: "GET",
            headers: headers,
        };
        request(options, function(error, response, body) {
            const obj = JSON.parse(body);
            console.log(obj.join_date);
            const join_date = obj.join_date.split("T")[0].split("-");
            if (obj.statistics.play_count < compare.playcount) {
                res.send(
                    "<script>alert('플레이 카운트가 5000 미만입니다. 투표에 참여하실 수 없습니다.')location.href='/'</script>"
                );
            } else if (
                Number(join_date[0]) >= compare.YEAR ||
                Number(join_date[1]) >= compare.MONTH
            ) {
                res.send(
                    "<script>alert('최초가입일이 " +
                    compare.YEAR +
                    "년 " +
                    compare.MONTH +
                    "월 이후입니다. 투표에 참여하실 수 없습니다.')location.href='/'</script>"
                );
            } else {
                const params = {
                    nicname_me: obj["username"],
                    id_me: obj["id"],
                    image_me: obj["avatar_url"],
                    userpage_me: "osu.ppy.sh/users/" + obj["id"],
                    vote_info: vote_info,
                };
                res.cookie("params", params);
                res.render("voting.ejs", params);
            }
        });
    } catch (err) {
        res.redirect("/");
    }
});

app.post("/init", (req, res) => {
    console.log("initalized :", req.body["id"]);
    retrieveDB(res, String(req.body["id"]));
});

app.post("/main", (req, res) => {
    const headers = {
        Accept: req.cookies["Accept"],
        "Content-Type": req.cookies["Content-Type"],
        Authorization: req.cookies["Authorization"],
    };
    if (!req.body) {
        return res.status(400).json({
            status: "error",
            error: "req body cannot be empty",
        });
    }
    val = req.body["name"];
    inputname = req.body["inputname"];
    console.log(req.body);
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
        function(error2, response2, body2) {
            var json = {};
            var Jbody = JSON.parse(body2);
            try {
                if (
                    Jbody["username"] == "undefined" ||
                    Jbody["country"]["code"] != "KR"
                ) {
                    res.json({
                        name: "",
                        img: "",
                        rank: "",
                        id: "",
                        inputname: inputname,
                    });
                    return 0;
                } else {
                    json.name = Jbody["username"];
                    json.img = Jbody["avatar_url"];
                    json.rank = Jbody["statistics"]["global_rank"];
                    json.id = Jbody["id"];
                    json.inputname = inputname;
                    console.log(json);
                    json.rank = "# " + json.rank;
                    res.json(json);
                    return 0;
                }
            } catch (err) {
                res.json({
                    name: "",
                    img: "",
                    rank: "",
                    id: "",
                    inputname: inputname,
                });
            }
        }
    );
});

app.post("/submit", (req, res) => {
    const headers = {
        Accept: req.cookies["Accept"],
        "Content-Type": req.cookies["Content-Type"],
        Authorization: req.cookies["Authorization"],
    };
    const options = {
        url: "https://osu.ppy.sh/api/v2/me",
        method: "GET",
        headers: headers,
    };
    request(options, function(error, response, body) {
        const obj = JSON.parse(body);
        if (req.body.id != obj.id) {
            res.status(300)
        } else {
            var submitted_data = req.body;
            console.log("submit request :", req.body.id);
            var data = submit_list(req.body);
            res.json({ mes: "Thank you for Voting", redirect: "/" })
        }

    })

});

function retrieveDB(res, id) {
    var db_out = {};
    con.query("SELECT * FROM voter WHERE id = '" + id + "'", (err, result) => {
        if (result.length) {
            res.json(JSON.parse(JSON.stringify(result[0])));
        }
    })
}

function submit_list(json) {
    try {
        var temp = "INSERT INTO voter (username, id, ";
        vote_info.forEach((i, i_index) =>
            i.forEach((j, j_index) => {
                if (j) {
                    temp +=
                        String(10 - i_index) + "_" + String(1 + j_index) + ", ";
                    temp +=
                        String(10 - i_index) +
                        "_" +
                        String(1 + j_index) +
                        "_avatar, ";
                    temp +=
                        String(10 - i_index) +
                        "_" +
                        String(1 + j_index) +
                        "_id";
                    if (
                        i_index != vote_info.length - 1 ||
                        j_index != i.length - 1
                    )
                        temp += ", ";
                }
            })
        );
        temp += ") VALUES (";
        temp += "'" + json.username + "','" + json.id + "',";
        vote_info.forEach((i, i_index) =>
            i.forEach((j, j_index) => {
                if (j) {
                    if (
                        json[String(10 - i_index) + "_" + String(1 + j_index)]
                    ) {
                        temp +=
                            "'" +
                            json[
                                String(10 - i_index) + "_" + String(1 + j_index)
                            ] +
                            "',";
                        temp +=
                            "'" +
                            json[
                                String(10 - i_index) +
                                "_" +
                                String(1 + j_index) +
                                "_avatar"
                            ] +
                            "',";
                        temp +=
                            "'" +
                            json[
                                String(10 - i_index) +
                                "_" +
                                String(1 + j_index) +
                                "_id"
                            ] +
                            "'";
                    } else {
                        temp += "NULL, NULL, NULL";
                    }
                    if (
                        i_index != vote_info.length - 1 ||
                        j_index != i.length - 1
                    )
                        temp += ", ";
                }
            })
        );
        temp += ");";
        con.query(temp, (err, result) => {
            if (err) {
                con.query(
                    "DELETE FROM voter WHERE id = '" + json.id + "'",
                    (err, result) => {
                        if (!err) submit_list(json);
                    }
                );
            } else {
                console.log("DB UPDATE SUCCESS : ", json.id);
            }
        });
        return 1;
    } catch (err) {
        return 0;
    }
}

function submit_list2(json) {
    var init = "INSERT INTO vote_result (voter_id, candidate_id, point) VALUS ('"
    vote_info.forEach((i, i_index) => i.forEach((j, j_index) => {
        if (j) {
            if (json[String(10 - i_index) + "_" + String(j_index + 1)] != '') {
                var temp = init;
                temp += json.id + "','";
                temp += json[String(10 - i_index) + "_" + String(j_index + 1) + "_id"] + "','"
                temp += String(10 - i_index) + "')"

            }
        }

    }))


}