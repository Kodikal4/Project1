// Backend: application services, accessible by URIs


const express = require('express')
const cors = require ('cors')
const dotenv = require('dotenv')

const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();

const dbService = require('./dbService');


app.use(cors());
app.use(express.json())
app.use(express.urlencoded({extended: false}));

// create
app.post('/api/users/register', (request, response) => {
    const {firstName, lastName, email, password} = request.body;
    const db = dbService.getDbServiceInstance();

    const result = db.registerUser({ firstName, lastName, email, password });

    result
      .then(data => response.json({ success: true, data }))
      .catch(err => response.status(500).json({ success: false, error: err.message }));
});

app.post('/api/users/signin', (request, response) => {
    const {email, password} = request.body;
    const db = dbService.getDbServiceInstance();

    const result = db.signInUser({email, password});

    result
     .then(data => response.json(data))
     .catch(err => response.status(500).json({ success: false, error: err.message }));
});

app.get('/api/users/search/name', (request, response) => {
    const {firstName, lastName} = request.query;
    const db = dbService.getDbServiceInstance();

    const result = db.searchUsersByName({ firstName, lastName });

    result
    .then(data => response.json({ data }))
    .catch(err => response.status(500).json({ error: err.message }));
})


app.get('/api/users/search/id/:id', (request, response) => {
    const { id } = request.params;
    const db = dbService.getDbServiceInstance();

    const result = db.searchUserById(id);

    result
        .then(data => response.json({ data: data }))
        .catch(err => response.status(500).json({ error: err.message }));
});

app.get('/api/users/search/salary', (request, response) => {
    const { min, max } = request.query;
    const db = dbService.getDbServiceInstance();

    const result = db.searchUsersBySalaryRange(min, max);
    result
        .then(data => response.json({ data }))
        .catch(err => response.status(500).json({ error: err.message }));
});

// 6. Search users whose ages are between X and Y
app.get('/api/users/search/age', (request, response) => {
    const { min, max } = request.query;
    const db = dbService.getDbServiceInstance();

    const result = db.searchUsersByAgeRange(min, max);
    result
        .then(data => response.json({ data }))
        .catch(err => response.status(500).json({ error: err.message }));
});

app.get('/api/users/search/registered-after/:userid', (request, response) => {
    const { userid } = request.params;
    const db = dbService.getDbServiceInstance();

    const result = db.searchUsersRegisteredAfter(userid);
    result
        .then(data => response.json({ data }))
        .catch(err => response.status(500).json({ error: err.message }));
});

// 8. Search users who never signed in
app.get('/api/users/search/never-signed-in', (request, response) => {
    const db = dbService.getDbServiceInstance();

    const result = db.searchUsersNeverSignedIn();
    result
        .then(data => response.json({ data }))
        .catch(err => response.status(500).json({ error: err.message }));
});

app.get('/api/users/search/same-day/:userid', (request, response) => {
    const { userid } = request.params;
    const db = dbService.getDbServiceInstance();

    const result = db.searchUsersRegisteredOnSameDay(userid);
    result
        .then(data => response.json({ data }))
        .catch(err => response.status(500).json({ error: err.message }));
});

app.get('/api/users/search/registered-today', (request, response) => {
    const db = dbService.getDbServiceInstance();

    const result = db.searchUsersRegisteredToday();
    result
        .then(data => response.json({ data }))
        .catch(err => response.status(500).json({ error: err.message }));
});

// if we configure here directly
app.listen(5050, 
    () => {
        console.log("I am listening on the fixed port 5050.")
    }
);
