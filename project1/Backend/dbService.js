// database services, accessbile by DbService methods.

const mysql = require('mysql');
const bcrypt = require('bcrypt'); 
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '.env') });
let instance = null; 


// if you use .env to configure
console.log("HOST: " + process.env.HOST);
console.log("DB USER: " + process.env.DB_USER);
console.log("PASSWORD: " + process.env.PASSWORD);
console.log("DATABASE: " + process.env.DATABASE);
console.log("DB PORT: " + process.env.DB_PORT);

const connection = mysql.createConnection({
     host: process.env.HOST,
     user: process.env.DB_USER,        
     password: process.env.PASSWORD,
     database: process.env.DATABASE,
     port: process.env.DB_PORT
});


// if you configure directly in this file, there is a security issue, but it will work
/*
const connection = mysql.createConnection({
     host:"localhost",
     user:"root",        
     password:"",
     database:"web_app",
     port:3306
});
*/


connection.connect((err) => {
     if(err){
        console.log(err.message);
     }
     console.log('db ' + connection.state);    // to see if the DB is connected or not
});

// the following are database functions, 

class DbService{
    static getDbServiceInstance(){ // only one instance is sufficient
        return instance? instance: new DbService();
    }

   /*
     This code defines an asynchronous function getAllData using the async/await syntax. 
     The purpose of this function is to retrieve all data from a database table named 
     "names" using a SQL query.

     Let's break down the code step by step:
         - async getAllData() {: This line declares an asynchronous function named getAllData.

         - try {: The try block is used to wrap the code that might throw an exception 
            If any errors occur within the try block, they can be caught and handled in 
            the catch block.

         - const response = await new Promise((resolve, reject) => { ... });: 
            This line uses the await keyword to pause the execution of the function 
            until the Promise is resolved. Inside the await, there is a new Promise 
            being created that represents the asynchronous operation of querying the 
            database. resolve is called when the database query is successful, 
            and it passes the query results. reject is called if there is an error 
            during the query, and it passes an Error object with an error message.

         - The connection.query method is used to execute the SQL query on the database.

         - return response;: If the database query is successful, the function returns 
           the response, which contains the results of the query.

        - catch (error) {: The catch block is executed if an error occurs anywhere in 
           the try block. It logs the error to the console.

        - console.log(error);: This line logs the error to the console.   
    }: Closes the catch block.

    In summary, this function performs an asynchronous database query using await and a 
   Promise to fetch all data from the "names" table. If the query is successful, 
   it returns the results; otherwise, it catches and logs any errors that occur 
   during the process. It's important to note that the await keyword is used here 
   to work with the asynchronous nature of the connection.query method, allowing 
   the function to pause until the query is completed.
   */
   async registerUser(userData) {
      const { firstName, lastName, email, password, salary = 0, age = 0 } = userData;
      try {
         const saltRounds = 10;
         const passwordHash = await bcrypt.hash(password, saltRounds);

         const insertId = await new Promise((resolve, reject) => {
               const query = "INSERT INTO users (first_name, last_name, email, password_hash, salary, age) VALUES (?, ?, ?, ?, ?, ?);";
               connection.query(query, [firstName, lastName, email, passwordHash, salary, age], (err, result) => {
                  if(err) reject(new Error(err.message));
                  else resolve(result.insertId);
               });
         });

         return { userid: insertId, firstName, lastName, email, salary, age };
      } catch(error) {
         console.log(error);
         throw error;
      }
   }

   async signInUser(email, password) {
        try {
            const users = await new Promise((resolve, reject) => {
                const query = "SELECT * FROM users WHERE email = ?;";
                connection.query(query, [email], (err, results) => {
                    if(err) reject(new Error(err.message));
                    else resolve(results);
                });
            });

            if (users.length === 0) {
                return { success: false, message: "Invalid email or password" };
            }

            const user = users[0];
            const match = await bcrypt.compare(password, user.password_hash);

            if (!match) {
                return { success: false, message: "Invalid email or password" };
            }

            // Update last_login timestamp
            await new Promise((resolve, reject) => {
                const updateQuery = "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE userid = ?;";
                connection.query(updateQuery, [user.userid], (err, result) => {
                    if(err) reject(new Error(err.message));
                    else resolve(result);
                });
            });

            return { success: true, message: "Sign-in successful", userid: user.userid, email: user.email };
        } catch(error) {
            console.log(error);
            throw error;
        }
    }

    async searchUsersByName(firstName, lastName) {
        try {
            const response = await new Promise((resolve, reject) => {
                let query = "SELECT userid, first_name, last_name, email, salary, age, registered_at, last_login FROM users WHERE 1=1";
                let params = [];

                if (firstName) {
                     query += " AND first_name LIKE ?";
                     params.push(`%${firstName}%`);
                }

                if (lastName) {
                     query += " AND last_name LIKE ?";
                     params.push(`%${lastName}%`);
                }

                query += ";";

                connection.query(query, params, (err, results) => {
                    if(err) reject(new Error(err.message));
                    else resolve(results);
                });
            });
            return response;
        } catch(error) {
            console.log(error);
        }
    }

    // 4. Search users by userid
    async searchUserById(userid) {
        try {
            const response = await new Promise((resolve, reject) => {
                const query = "SELECT userid, first_name, last_name, email, salary, age, registered_at, last_login FROM users WHERE userid = ?;";
                connection.query(query, [userid], (err, results) => {
                    if(err) reject(new Error(err.message));
                    else resolve(results);
                });
            });
            return response;
        } catch(error) {
            console.log(error);
        }
    }
  
    // 5. Search all users whose salary is between X and Y
    async searchUsersBySalaryRange(minSalary, maxSalary) {
        try {
            const response = await new Promise((resolve, reject) => {
                const query = "SELECT userid, first_name, last_name, email, salary, age, registered_at, last_login FROM users WHERE salary BETWEEN ? AND ?;";
                connection.query(query, [minSalary, maxSalary], (err, results) => {
                    if(err) reject(new Error(err.message));
                    else resolve(results);
                });
            });
            return response;
        } catch(error) {
            console.log(error);
        }
    }

    // 6. Search all users whose ages are between X and Y
    async searchUsersByAgeRange(minAge, maxAge) {
        try {
            const response = await new Promise((resolve, reject) => {
                const query = "SELECT userid, first_name, last_name, email, salary, age, registered_at, last_login FROM users WHERE age BETWEEN ? AND ?;";
                connection.query(query, [minAge, maxAge], (err, results) => {
                    if(err) reject(new Error(err.message));
                    else resolve(results);
                });
            });
            return response;
        } catch(error) {
            console.log(error);
        }
    }

    // 7. Search users who registered after reference user registered (by userid)
    async searchUsersRegisteredAfter(userid) {
        try {
            const response = await new Promise((resolve, reject) => {
                const query = `
                    SELECT u.* FROM users u 
                    JOIN users ref ON ref.userid = ? 
                    WHERE u.registered_at > ref.registered_at;
                `;
                connection.query(query, [userid], (err, results) => {
                    if(err) reject(new Error(err.message));
                    else resolve(results);
                });
            });
            return response;
        } catch(error) {
            console.log(error);
        }
    }

    async searchUsersNeverSignedIn() {
        try {
            const response = await new Promise((resolve, reject) => {
                const query = "SELECT userid, first_name, last_name, email, salary, age, registered_at, last_login FROM users WHERE last_login IS NULL;";
                connection.query(query, (err, results) => {
                    if(err) reject(new Error(err.message));
                    else resolve(results);
                });
            });
            return response;
        } catch(error) {
            console.log(error);
        }
    }

    async searchUsersRegisteredOnSameDay(userid) {
        try {
            const response = await new Promise((resolve, reject) => {
                const query = `
                    SELECT u.* FROM users u 
                    JOIN users ref ON ref.userid = ? 
                    WHERE DATE(u.registered_at) = DATE(ref.registered_at) 
                    AND u.userid != ref.userid;
                `;
                connection.query(query, [userid], (err, results) => {
                    if(err) reject(new Error(err.message));
                    else resolve(results);
                });
            });
            return response;
        } catch(error) {
            console.log(error);
        }
    }

    async searchUsersRegisteredToday() {
        try {
            const response = await new Promise((resolve, reject) => {
                const query = "SELECT userid, first_name, last_name, email, salary, age, registered_at, last_login FROM users WHERE DATE(registered_at) = CURDATE();";
                connection.query(query, (err, results) => {
                    if(err) reject(new Error(err.message));
                    else resolve(results);
                });
            });
            return response;
        } catch(error) {
            console.log(error);
        }
    }

}

module.exports = DbService;
