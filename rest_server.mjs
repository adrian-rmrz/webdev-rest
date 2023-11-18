import * as path from 'node:path';
import * as url from 'node:url';

import { default as express } from 'express';
import { default as sqlite3 } from 'sqlite3';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const db_filename = path.join(__dirname, 'db', 'stpaul_crime.sqlite3');

const port = 8000;

let app = express();
app.use(express.json());

/********************************************************************
 ***   DATABASE FUNCTIONS                                         *** 
 ********************************************************************/
// Open SQLite3 database (in read-write mode)
let db = new sqlite3.Database(db_filename, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.log('Error opening ' + path.basename(db_filename));
    }
    else {
        console.log('Now connected to ' + path.basename(db_filename));
    }
});

// Create Promise for SQLite3 database SELECT query 
function dbSelect(query, params) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(rows);
            }
        });
    });
}

// Create Promise for SQLite3 database INSERT or DELETE query
function dbRun(query, params) {
    return new Promise((resolve, reject) => {
        db.run(query, params, (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}

/********************************************************************
 ***   REST REQUEST HANDLERS                                      *** 
 ********************************************************************/
// GET request handler for crime codes
app.get('/codes', (req, res) => {
    console.log(req.query); // query object (key-value pairs after the ? in the url)

    let sql = 'SELECT * FROM Codes';
    let params = [];

    if (req.query.hasOwnProperty('incident_type')) {
        sql += ' WHERE incident_type LIKE ?';
        params.push(req.query.incident_type + "%");
    };

    if (req.query.hasOwnProperty('code')) {
        let arr = req.query.code.split(",");

        if (params.length == 0) {
            sql += ' WHERE code IN (?'; 
        } else {
            sql += ' AND code IN (?'; 
        };
        params.push(parseInt(arr[0]));

        for (let i = 1; i < arr.length; i++) {
            sql += ', ?';
            params.push(parseInt(arr[i]));
        };

        sql += ')'; 
    };

    dbSelect(sql, params)
    .then((rows) => {
        res.status(200).type('json').send(rows);
    })
    .catch((error) => {
        res.status(500).type('txt').send(error);
    });
});

// GET request handler for neighborhoods
app.get('/neighborhoods', (req, res) => {
    console.log(req.query); // query object (key-value pairs after the ? in the url)
    
    let sql = 'SELECT * FROM Neighborhoods';
    let params = [];

    if (req.query.hasOwnProperty('neighborhood_number')) {
        let arr = req.query.neighborhood_number.split(",");

        sql += ' WHERE neighborhood_number IN (?';
        params.push(parseInt(arr[0]));

        for (let i = 1; i < arr.length; i++) {
            sql += ', ?';
            params.push(parseInt(arr[i]));
        };

        sql += ')'; 
    };

    if (req.query.hasOwnProperty('neighborhood_name')) {
        if (params.length === 0) {
            sql += ' WHERE neighborhood_name LIKE ?';
            
        }
        else {
            sql += ' AND neighborhood_name LIKE ?';
        }
        params.push(req.query.neighborhood_name.charAt(0).toUpperCase() 
        + req.query.neighborhood_name.substr(1) + '%');
    };

    dbSelect(sql, params)
    .then((rows) => {
        res.status(200).type('json').send(rows);
    })
    .catch((error) => {
        res.status(500).type('txt').send(error);
    });
});

// GET request handler for crime incidents
app.get('/incidents', (req, res) => {
    console.log(req.query); // query object (key-value pairs after the ? in the url)
    let sql = 'SELECT * FROM Incidents';
    let params = [];

    // add to 'sql' and 'params' based on 'req.query'
    if (req.query.hasOwnProperty('start_date')) {
        sql += ' WHERE date_time >= ?'; 
        params.push(req.query.start_date + 'T00:00:00');
    };

    if (req.query.hasOwnProperty('end_date')) {
        if (params.length == 0) {
            sql += ' WHERE date_time <= ?'; 
        } else {
            sql += ' AND date_time <= ?'; 
        }
        params.push(req.query.end_date + 'T23:59:59');

    };

    if (req.query.hasOwnProperty('code')) {
        let arr = req.query.code.split(",");

        if (params.length == 0) {
            sql += ' WHERE code IN (?'; 
        } else {
            sql += ' AND code IN (?'; 
        };
        params.push(parseInt(arr[0]));

        for (let i = 1; i < arr.length; i++) {
            sql += ', ?';
            params.push(parseInt(arr[i]));
        };

        sql += ')'; 
    };

    if (req.query.hasOwnProperty('grid')) {
        let arr = req.query.grid.split(",");

        if (params.length == 0) {
            sql += ' WHERE police_grid IN (?'; 
        } else {
            sql += ' AND police_grid IN (?'; 
        };
        params.push(parseInt(arr[0]));

        for (let i = 1; i < arr.length; i++) {
            sql += ', ?';
            params.push(parseInt(arr[i]));
        };

        sql += ')';
    };

    if (req.query.hasOwnProperty('neighborhood')) {
        let arr = req.query.neighborhood.split(",");

        if (params.length == 0) {
            sql += ' WHERE neighborhood_number IN (?'; 
        } else {
            sql += ' AND neighborhood_number IN (?'; 
        };
        params.push(parseInt(arr[0]));

        for (let i = 1; i < arr.length; i++) {
            sql += ', ?';
            params.push(parseInt(arr[i]));
        };

        sql += ')';
    };

    if (req.query.hasOwnProperty('limit')) {
        sql += ' LIMIT ?'; 
        params.push(parseInt(req.query.limit));
    };

    dbSelect(sql, params).then((rows) => {
        for (let i = 0; i < rows.length; i++) {
            let originalElement = rows[i];
            let dateParts = originalElement.date_time.split('T');
            let date = dateParts[0];
            let time = dateParts[1];

            let jsonString = JSON.stringify(originalElement);
            jsonString = jsonString.replace('"date_time":"' + originalElement.date_time + '"', "\"date\":\"" + date + "\",\"time\":\"" + time + "\"");

            rows[i] = JSON.parse(jsonString);
        };

        res.status(200).type('json').send(rows);
    }).catch((error) => {
        res.status(500).type('txt').send(error);
    });
    
    // res.status(200).type('json').send({}); // <-- you will need to change this
});

// PUT request handler for new crime incident
app.put('/new-incident', (req, res) => {
    dbSelect('SELECT * FROM Incidents WHERE case_number = ?', [req.body.case_number])
    .then((rows) => {
        if (rows.length != 0) {
            res.status(500).type('txt').send('Case number ' + req.body.case_number + ' already exists');
        } else {
            dbRun('INSERT INTO Incidents (case_number, date_time, code, incident, police_grid, neighborhood_number, block) VALUES (?, ?, ?, ?, ?, ?, ?)', [req.body.case_number, req.body.date_time, req.body.code, req.body.incident, req.body.police_grid, req.body.neighborhood_number, req.body.block]);

            res.status(200).type('txt').send('OK'); // <-- you may need to change this
        };
    }).catch((error) => {
        res.status(500).type('txt').send('Error: ' + error);
    });
    
    console.log(req.body); // uploaded data
});

// DELETE request handler for new crime incident
app.delete('/remove-incident', (req, res) => {
    dbSelect('SELECT * FROM Incidents WHERE case_number = ?', [req.body.case_number])
    .then((rows) => {
        if (rows.length === 0) {
            res.status(500).type('txt').send('Case number ' + req.body.case_number + ' does not exist');
        } else {
            dbRun('DELETE FROM Incidents WHERE case_number = ?', [req.body.case_number]);

            res.status(200).type('txt').send('OK'); // <-- you may need to change this
        };
    }).catch((error) => {
        res.status(500).type('txt').send('Error: ' + error);
    });
    console.log(req.body); // uploaded data
});

/********************************************************************
 ***   START SERVER                                               *** 
 ********************************************************************/
// Start server - listen for client connections
app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
