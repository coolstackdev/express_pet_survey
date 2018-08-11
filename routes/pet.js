const express = require('express');
const router = express.Router();
const mysql = require('mysql');


const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123',
    database: 'census'
});

//show simple first page
router.get('/', (req, res) => {

    var fs = require('fs');

    fs.readFile('public/data/breed.txt', 'utf8', function (err, data) {
        if (err) throw err;

        //get breeds from file
        var breed_data = data.split(',');

        //get countries from json file
        fs.readFile('public/data/country.json', 'utf8', function (err, data) {
            if (err) throw err;
            var json_data = JSON.parse(data);
            var country_json_data = json_data['data'];
            var country_data = [];

            for (var i = 0; i < country_json_data.length; i++) {
                country_data[i] = country_json_data[i]['name'];
            }

            //render to view
            res.render('first_no_vote', {
                breeds: breed_data,
                countries: country_data
            });
        });

    });

});

//get json data and show census result
router.get('/show', (req, res) => {
    var fs = require('fs');

    fs.readFile('public/data/breed.txt', 'utf8', function (err, data) {
        if (err) throw err;

        //get breeds from file
        var breed_data = data.split(',');

        //get countries from json file
        fs.readFile('public/data/country.json', 'utf8', function (err, data) {
            if (err) throw err;
            var json_data = JSON.parse(data);
            var country_json_data = json_data['data'];
            var country_data = [];

            for (var i = 0; i < country_json_data.length; i++) {
                country_data[i] = country_json_data[i]['name'];
            }

            //render to view
            res.render('first_census_result', {
                breeds: breed_data,
                countries: country_data
            });
        });

    });
});


//get json data and show census result
router.post('/add', function (req, res) {

    let name = req.body.username;
    // let email = req.body.email;
    let email = "a@b.com";
    let animal_name = req.body.animal_name;
    let breed = req.body.breed_data;
    let country = req.body.country_data;
    let comment = req.body.comment;
    let photo_path = "";
    let thumbnail_path = "";


    console.log("name: " + name + ", animal: " + animal_name + ", breed: " + breed + ", country: " + country + ", comment: " + comment);



    //upload image file
    if (!req.files){
        console.log('No files were uploaded.');
    }else {
        console.log("file upload ");

        // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
        let photoFile = req.files.photoFile;
        
        if(photoFile != null){
            photo_path = photoFile.name;
            thumbnail_path = photoFile.name;

            console.log("uploaded filename: " + photo_path);

            // Use the mv() method to place the file somewhere on your server
            photoFile.mv('public/uploads/images/'+photo_path, function (err) {

                if (err)
                    return res.status(500).send(err);

            });
        }
    }

    //save to database
    var cur_date = new Date().toJSON().slice(0, 10).replace(/-/g, '/');

    var poll_record = [
        [name, email, animal_name, breed, country, comment, photo_path, thumbnail_path, cur_date]
    ];
    connection.query("INSERT INTO poll (name, email, animal_name, breed, country, comment, photo_path, thumbnail_path, date) VALUES ?", [poll_record], function (err, result, fields) {
        // if any error while executing above query, throw error
        if (err) throw err;
        
        console.log("insert data success");
    });

    console.log("after add query run");

    res.redirect('/show');

});

//get all people's poll data for second page
router.get('/get_polls', (req, res) => {
    var cur_date = new Date().toJSON().slice(0, 10).replace(/-/g, '/');
    console.log(cur_date);

    connection.query("SELECT * FROM poll", (err, rows, fields) => {
        if (err) {
            console.log(err)
            res.end()
        }

        res.json(rows)
    })


});

//cron job for daily backup
router.get('/json_backup', (req, res) => {

    //get current date string
    var d = new Date(),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    var cur_date = [year, month, day].join('-');
    var file_name = cur_date + ".json";

    //create bubble.json for breed bubble chart
    connection.query("SELECT breed, count(breed) as size FROM poll GROUP BY breed", (err, rows, fields) => {
        if (err) {
            console.log(err)
            res.end()
        }

        console.log("breed cronjob");

        var fs = require('fs');

        var obj = {
            name: "breed bubble data",
            children: []
        };

        for (var i = 0; i < rows.length; i++) {
            obj.children.push({ name: rows[i]['breed'], size: rows[i]['size'] });
        }

        var json = JSON.stringify(obj);
        fs.writeFile('public/cronjob/bubble/' + file_name, json, 'utf8', function callback() {
            console.log("breed.json write success: " + file_name);
        });

        res.end();
    });


    //create comment.json for comment word chart
    connection.query("SELECT comment FROM poll", (err, rows, fields) => {
        if (err) {
            console.log(err)
            res.end()
        }

        console.log("comment cronjob");

        var fs = require('fs');

        var obj = {
            data: ""
        };

        var comment_str = "";

        for (var i = 0; i < rows.length; i++) {
            var str = rows[i]['comment'];
            str.replace(/\r?\n|\r/g, ' ');
            comment_str += str;
        }
        obj.data = comment_str;

        var json = JSON.stringify(obj);

        fs.writeFile('public/cronjob/word/' + file_name, json, 'utf8', function callback() {
            console.log("comment.json write success: " + file_name);
         });

        res.end();
    });


    //create map.json for participater's country
    connection.query("SELECT country, count(country) as size FROM poll group by country", (err, rows, fields) => {
        if (err) {
            console.log(err)
            res.end()
        }

        console.log("country cronjob");

        var fs = require('fs');

        var obj = {
            data: []
        };

        var result_set = rows;

        console.log(result_set);

        fs.readFile('public/data/country.json', 'utf8', function (err, data) {
            if (err) throw err;

            var json_data = JSON.parse(data);
            var country_json_data = json_data['data'];

            for (var i = 0; i < result_set.length; i++) {
                var country_name = result_set[i]['country'];

                for (var j = 0; j < country_json_data.length; j++) {
                    if (country_name == country_json_data[j]['name']) {
                        country_json_data[j]['value'] = result_set[i]['size'];
                        obj.data.push(country_json_data[j]);
                    }
                }

            }

            var json = JSON.stringify(obj);
            fs.writeFile('public/cronjob/map/' + file_name, json, 'utf8', function callback() {
                console.log("country.json write success: " + file_name);
            });

            res.end();

        });

    });

});

module.exports = router;