const express = require("express");
const mysql = require("mysql");
const cookieParser = require("cookie-parser");
const path = require("path");
const request_prom = require("request-promise");
const request = require("request");
const bodyParser = require("body-parser");
const date = require("date-utils");

const app = express();

const url = "http://oktp.shop";
//const url = "http://localhost:80";

const sql_info = {
    host: "localhost",
    user: "root",
    password: "01085244701",
};
var con = mysql.createConnection(sql_info);
const compare = {
    YEAR: 2021,
    MONTH: 05,
    playcount: 5000,
};
var today = new Date();
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
    con.query("CREATE DATABASE 2021_OsuKoreanTopPlayer", (err, result) => {
        if (!err)
            console.log("success to CREATE DATABASE 2021_OsuKoreanTopPlayer");
    });
    con.query("USE 2021_OsuKoreanTopPlayer", (err, result) => {
        if (!err) console.log("success to USE 2021_OsuKoreanTopPlayer");
    });
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
        "CREATE TABLE vote_result (_index int not null primary key auto_increment)",
        (err, result) => {
            if (!err) console.log("success to make TABLE vote_result");
        }
    );
    AddRow("vote_result", "voter_id VARCHAR(40) not null");
    AddRow("vote_result", "candidate_id VARCHAR(40) not null");
    AddRow("vote_result", "candidate_name VARCHAR(40) not null");
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
    try {
        const uri =
            "https://osu.ppy.sh/oauth/authorize?" +
            "client_id=11442&" +
            "redirect_uri=" +
            url +
            "/authorize&" +
            "response_type=code&scope=public";
        return res.redirect(uri);
    } catch (err) {
        console.log("Error : get/login");
    }
});

app.get("/authorize", async(req, res) => {
    try {
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
    } catch (err) {
        console.log("Error : get/authorize");
    }
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
            var obj;
            try {
                obj = JSON.parse(body);
            } catch (e) {
                console.log("ERROR at main req");
            }
            try {
				try{
					var join_date = obj.join_date.split("T")[0].split("-");
					var play_count = obj.statistics.play_count;
				}catch(err){
					var join_date = [2999,12];
					var play_count = 0;
					console.log("cannot load player's info");
				}
                if (play_count < compare.playcount) {
                    res.send(
                        "<script>alert('플레이 카운트가 5000 미만입니다. 투표에 참여하실 수 없습니다.');location.href='/';</script>"
                    );
                } else if (
                    Number(join_date[0]) >= compare.YEAR ||
                    (Number(join_date[1]) >= compare.MONTH &&
                        Number(join_date[0]) == compare.YEAR)
                ) {
                    res.send(
                        "<script>alert('최초가입일이 " +
                        compare.YEAR +
                        "년 " +
                        compare.MONTH +
                        "월 이후입니다. 투표에 참여하실 수 없습니다.');location.href='/';</script>"
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
            } catch (err) {
                console.log(err);
                res.send(
                    "<script>alert('서버에러! 재접속 부탁드립니다!');location.href='/';</script>"
                );
            }
        });
    } catch (err) {
        res.redirect("/");
    }
});

app.post("/init", (req, res) => {
    try {
        today = new Date();
        console.log("initalized :", req.body["id"], today);
        retrieveDB(res, String(req.body["id"]));
    } catch (err) {
        console.log("Error : post/init");
    }
});

app.post("/main", (req, res) => {
    try {
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
                try {
                    var Jbody = JSON.parse(body2);
                } catch (e) {
                    console.log("ERROR at main post");
                }
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
                            inputname: req.body["inputname"],
                        });
                        return 0;
                    } else {
                        json.name = Jbody["username"];
                        json.img = Jbody["avatar_url"];
                        json.rank = Jbody["statistics"]["global_rank"];
                        json.id = Jbody["id"];
                        json.inputname = req.body["inputname"];
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
                        inputname: req.body["inputname"],
                    });
                }
            }
        );
    } catch (err) {
        res.json({
            name: "",
            img: "",
            rank: "",
            id: "",
            inputname: req.body["inputname"],
        });
        console.log("Error : post/main")
    }
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
        try {
            const obj = JSON.parse(body);

            const db = req.body;
            var c = Object.keys(req.body);
            var check_num = 0;
            for (var i = 0; i < c.length; i++) {
                for (var j = i + 1; j < c.length; j++) {
                    if (
                        db[c[i]] == db[c[j]] &&
                        db[c[i]].replace(" ", "") != ""
                    ) {
                        check_num++;
                    }
                }
            }
            if (req.body.id != obj.id || check_num != 0) {
                res.status(300);
            } else {
                var submitted_data = req.body;
                today = new Date();
                console.log("submit request :", req.body.id, today);
                submit_list(req.body);
                submit_list2(req.body);
                res.json({
                    mes: "Your vote has been successfully submitted. Thank you for participating!",
                    redirect: "/",
                });
            }
        } catch (e) {
            console.log("ERROR at submit");
        }
    });
});

app.get("/EXHCaUv655BWYvrGcqTD", (req, res) => {
	var data = {}
	var db1 = 0
	var db2 = 0
	try {
        con.query(
            "SELECT count(candidate_name) as _count, group_concat(DISTINCT candidate_name separator '') AS name, candidate_id, sum(point) AS pt,  RANK() OVER (ORDER BY sum(point) DESC) as ranking FROM vote_result GROUP BY candidate_id ORDER BY pt DESC",
            (err, result) => {
                if (!err){
					data = JSON.parse(JSON.stringify(result))
					con.query(
						"SELECT count(DISTINCT voter_id) as db1_count FROM vote_result",
						(err, result) => {
							if (!err){ 
								db1 = Number(JSON.parse(JSON.stringify(result))[0]["db1_count"])
								con.query(
									"SELECT count(DISTINCT id) as db2_count FROM voter",
									(err, result) => {
										if (!err) {
											db2 = Number(JSON.parse(JSON.stringify(result))[0]["db2_count"])
											res.render("result.ejs", {"data":data,"db1":db1,"db2":db2});
										}
									}
								);
								
							}
						}
					);
				}
            }
        );		
		
    } catch (err) {
        console.log("Error : /EXHCaUv655BWYvrGcqTD");
    }
});

function retrieveDB(res, id) {
    var db_out = {};
    con.query("SELECT * FROM voter WHERE id = '" + id + "'", (err, result) => {
        if (result.length) {
            try {
                res.json(JSON.parse(JSON.stringify(result[0])));
            } catch (e) {}
        }
    });
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
                today = new Date();
                console.log("DB UPDATE SUCCESS :", json.id, today);
            }
        });
        return 1;
    } catch (err) {
        return 0;
    }
}

function submit_list2(json) {
    con.query(
        "SELECT voter_id FROM vote_result WHERE voter_id = '" + json.id + "'",
        (err, result) => {
            if (result.length) {
                con.query(
                    "DELETE FROM vote_result WHERE voter_id = '" +
                    json.id +
                    "'",
                    (err, result) => {
                        if (!err) {
                            today = new Date();
                            console.log("DB2 DELETE SUCEESS :", json.id, today);
                        }
                    }
                );
            }
            var error = 0;

            var init =
                "INSERT INTO vote_result (voter_id, candidate_id, candidate_name, point) VALUES ('";
            vote_info.forEach((i, i_index) =>
                i.forEach((j, j_index) => {
                    if (j) {
                        if (
                            json[
                                String(10 - i_index) + "_" + String(j_index + 1)
                            ] != ""
                        ) {
                            var temp = init;
                            temp += json.id + "','";
                            temp +=
                                json[
                                    String(10 - i_index) +
                                    "_" +
                                    String(j_index + 1) +
                                    "_id"
                                ] + "','";
                            temp +=
                                json[
                                    String(10 - i_index) +
                                    "_" +
                                    String(j_index + 1)
                                ] + "','";
                            temp += String(10 - i_index) + "')";
                            con.query(temp, (err, result) => {
                                if (err) error++;
                            });
                        }
                    }
                })
            );
            if (!error) {
                today = new Date();
                console.log("DB2 UPDATE SUCCESS :", json.id, today);
            }
        }
    );
}