
// This is the frontEnd that modifies the HTML page directly
// event-based programming,such as document load, click a button

/*
What is a Promise in Javascript? 

A Promise can be in one of three states:

    - Pending: The initial state; the promise is neither fulfilled nor rejected.

    - Fulfilled: The operation completed successfully, and the promise has a 
      resulting value.

    - Rejected: The operation failed, and the promise has a reason for the failure.

Promises have two main methods: then and catch.

    - The then method is used to handle the successful fulfillment of a promise. 
    It takes a callback function that will be called when the promise is resolved, 
    and it receives the resulting value.

    - The catch method is used to handle the rejection of a promise. It takes a 
    callback function that will be called when the promise is rejected, and it 
    receives the reason for the rejection.

What is a promise chain? 
    The Promise chain starts with some asyncOperation1(), which returns a promise, 
    and each subsequent ``then`` is used to handle the result of the previous Promise.

    The catch is used at the end to catch any errors that might occur at any point 
    in the chain.

    Each then returns a new Promise, allowing you to chain additional ``then`` calls to 
    handle subsequent results.

What is an arrow function?

    An arrow function in JavaScript is a concise way to write anonymous function 
    expressions.

    Traditional function syntax: 
        const add = function(x, y) {
           return x + y;
        };

    Arrow function syntax:
        const add = (x, y) => x + y;
    
    
Arrow functions have a few notable features:

    - Shorter Syntax: Arrow functions eliminate the need for the function keyword, 
      curly braces {}, and the return keyword in certain cases, making the syntax 
      more concise.

    - Implicit Return: If the arrow function consists of a single expression, it is 
      implicitly returned without needing the return keyword.

    - Lexical this: Arrow functions do not have their own this context; instead, they 
      inherit this from the surrounding code. This can be beneficial in certain situations,
      especially when dealing with callbacks and event handlers.
*/


// fetch call is to call the backend
document.addEventListener('DOMContentLoaded', function() {
    // one can point your browser to http://localhost:5050/getAll to check what it returns first.
    fetch('http://localhost:5050/getAll')     
    .then(response => response.json())
    .then(data => loadHTMLTable(data['data']));
});


// when the addBtn is clicked
const addBtn = document.querySelector('#add-name-btn');
addBtn.onclick = function (){
    const nameInput = document.querySelector('#name-input');
    const name = nameInput.value;
    nameInput.value = "";

    fetch('http://localhost:5050/insert', {
        headers: {
            'Content-type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify({name: name})
    })
    .then(response => response.json())
    .then(data => insertRowIntoTable(data['data']));
}

// when the searchBtn is clicked
const searchBtn =  document.querySelector('#search-btn');
searchBtn.onclick = function (){
    const searchInput = document.querySelector('#search-input');
    const searchValue = searchInput.value;
    searchInput.value = "";

    fetch('http://localhost:5050/search/' + searchValue)
    .then(response => response.json())
    .then(data => loadHTMLTable(data['data']));
}

let rowToDelete; 

// when the delete button is clicked, since it is not part of the DOM tree, we need to do it differently
document.querySelector('table tbody').addEventListener('click', 
      function(event){
        if(event.target.className === "delete-row-btn"){

            deleteRowById(event.target.dataset.id);   
            rowToDelete = event.target.parentNode.parentNode.rowIndex;    
            debug("delete which one:");
            debug(rowToDelete);
        }   
        if(event.target.className === "edit-row-btn"){
            showEditRowInterface(event.target.dataset.id); // display the edit row interface
        }
      }
);

function deleteRowById(id){
    // debug(id);
    fetch('http://localhost:5050/delete/' + id,
       { 
        method: 'DELETE'
       }
    )
    .then(response => response.json())
    .then(
         data => {
             if(data.success){
                document.getElementById("table").deleteRow(rowToDelete);
                // location.reload();
             }
         }
    );
}

let idToUpdate = 0;

function showEditRowInterface(id){
    debug("id clicked: ");
    debug(id);
    document.querySelector('#update-name-input').value = ""; // clear this field
    const updateSetction = document.querySelector("#update-row");  
    updateSetction.hidden = false;
    // we assign the id to the update button as its id attribute value
    idToUpdate = id;
    debug("id set!");
    debug(idToUpdate+"");
}


// when the update button on the update interface is clicked
const updateBtn = document.querySelector('#update-row-btn');

updateBtn.onclick = function(){
    debug("update clicked");
    debug("got the id: ");
    debug(updateBtn.value);
    
    const updatedNameInput = document.querySelector('#update-name-input');

    fetch('http://localhost:5050/update',
          {
            headers: {
                'Content-type': 'application/json'
            },
            method: 'PATCH',
            body: JSON.stringify(
                  {
                    id: idToUpdate,
                    name: updatedNameInput.value
                  }
            )
          }
    ) 
    .then(response => response.json())
    .then(data => {
        if(data.success){
            location.reload();
        }
        else 
           debug("no update occurs");
    })
}


// this function is used for debugging only, and should be deleted afterwards
function debug(data)
{
    fetch('http://localhost:5050/debug', {
        headers: {
            'Content-type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify({debug: data})
    })
}

function insertRowIntoTable(data){

   debug("index.js: insertRowIntoTable called: ");
   debug(data);

   const table = document.querySelector('table tbody');
   debug(table);

   const isTableData = table.querySelector('.no-data');

  // debug(isTableData);

   let tableHtml = "<tr>";
   
   for(var key in data){ // iterating over the each property key of an object data
      if(data.hasOwnProperty(key)){   // key is a direct property for data
            if(key === 'dateAdded'){  // the property is 'dataAdded'
                data[key] = new Date(data[key]).toLocaleString(); // format to javascript string
            }
            tableHtml += `<td>${data[key]}</td>`;
      }
   }

   tableHtml +=`<td><button class="delete-row-btn" data-id=${data.id}>Delete</td>`;
   tableHtml += `<td><button class="edit-row-btn" data-id=${data.id}>Edit</td>`;

   tableHtml += "</tr>";

    if(isTableData){
       debug("case 1");
       table.innerHTML = tableHtml;
    }
    else {
        debug("case 2");
        // debug(tableHtml);

        const newrow = table.insertRow();
        newrow.innerHTML = tableHtml;
    }
}

function loadHTMLTable(data){
    debug("index.js: loadHTMLTable called.");

    const table = document.querySelector('table tbody'); 
    
    if(data.length === 0){
        table.innerHTML = "<tr><td class='no-data' colspan='5'>No Data</td></tr>";
        return;
    }
  
    /*
    In the following JavaScript code, the forEach method is used to iterate over the 
    elements of the data array. The forEach method is a higher-order function 
    that takes a callback function as its argument. The callback function is 
    executed once for each element in the array.
    
    In this case, the callback function takes a single argument, which is an object 
    destructuring pattern:


    function ({id, name, date_added}) {
        // ... code inside the callback function
    }

    This pattern is used to extract the id, name, and date_added properties from each 
    element of the data array. The callback function is then executed for each element
    in the array, and within the function, you can access these properties directly 
    as variables (id, name, and date_added).

    
    In summary, the forEach method is a convenient way to iterate over each element in 
    an array and perform some operation or execute a function for each element. 
    The provided callback function is what gets executed for each element in the 
    data array.
    */

    let tableHtml = "";
    data.forEach(function ({id, name, date_added}){
         tableHtml += "<tr>";
         tableHtml +=`<td>${id}</td>`;
         tableHtml +=`<td>${name}</td>`;
         tableHtml +=`<td>${new Date(date_added).toLocaleString()}</td>`;
         tableHtml +=`<td><button class="delete-row-btn" data-id=${id}>Delete</td>`;
         tableHtml += `<td><button class="edit-row-btn" data-id=${id}>Edit</td>`;
         tableHtml += "</tr>";
    });

    table.innerHTML = tableHtml;
}


/* USER REGISTRATION */

const registerForm = document.getElementById("register-form");
const registerMessage = document.getElementById("register-message");

registerForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const user = {
        userid: document.getElementById("userid").value.trim(),
        firstName: document.getElementById("first-name").value.trim(),
        lastName: document.getElementById("last-name").value.trim(),
        password: document.getElementById("password").value,
        age: Number(document.getElementById("age").value),
        salary: Number(document.getElementById("salary").value)
    };

    if (!user.userid || !user.firstName ||
        !user.lastName || !user.password) {
        registerMessage.textContent =
            "Please fill in all required fields.";
        return;
    }

    registerMessage.textContent =
        "Registration form validated. Backend connection pending.";

    console.log("Registration form validated.");
});


/* USER SIGN-IN */

const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");

loginForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const userId = document.getElementById("login-userid").value.trim();
    const password = document.getElementById("login-password").value;

    if (!userId || !password) {
        loginMessage.textContent =
            "Please enter your User ID and Password.";
        return;
    }

    loginMessage.textContent =
        "Sign-in form validated. Backend connection pending.";

    console.log("Sign-in form validated.");
});


/* SEARCH BY FIRST NAME AND LAST NAME */

const searchNameForm = document.getElementById("search-name-form");
const searchMessage = document.getElementById("search-message");

searchNameForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const firstName = document.getElementById("search-first-name").value.trim();
    const lastName = document.getElementById("search-last-name").value.trim();

    if (!firstName && !lastName) {
        searchMessage.textContent =
            "Please enter a first name or last name.";
        return;
    }

    searchMessage.textContent =
        "Name search validated. Backend connection pending.";
});

/* SEARCH BY USER ID */

const searchUserIdForm = document.getElementById("search-userid-form");

searchUserIdForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const userId = document.getElementById("search-userid").value.trim();

    if (!userId) {
        searchMessage.textContent =
            "Please enter a User ID.";
        return;
    }

    searchMessage.textContent =
        "User ID search validated. Backend connection pending.";
});


/* SEARCH BY SALARY RANGE */

const salaryForm = document.getElementById("search-salary-form");

salaryForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const minSalary = Number(
        document.getElementById("min-salary").value
    );

    const maxSalary = Number(
        document.getElementById("max-salary").value
    );

    if (minSalary > maxSalary) {
        alert("Minimum salary cannot be greater than maximum salary.");
        return;
    }

    alert("Salary range validated. Backend connection pending.");
});


/* SEARCH BY AGE RANGE */

const ageForm = document.getElementById("search-age-form");

ageForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const minAge = Number(
        document.getElementById("min-age").value
    );

    const maxAge = Number(
        document.getElementById("max-age").value
    );

    if (minAge > maxAge) {
        alert("Minimum age cannot be greater than maximum age.");
        return;
    }

    alert("Age range validated. Backend connection pending.");
});


/* USERS REGISTERED AFTER ANOTHER USER */

const afterForm = document.getElementById("search-after-form");

afterForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const userId = document.getElementById("after-userid").value.trim();

    if (!userId) {
        alert("Please enter a User ID.");
        return;
    }

    alert("Registered-after search validated for: " +
          userId + ". Backend connection pending.");
});


/* USERS REGISTERED ON THE SAME DAY */

const sameDayForm = document.getElementById("search-same-day-form");

sameDayForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const userId = document.getElementById("same-day-userid").value.trim();

    if (!userId) {
        alert("Please enter a User ID.");
        return;
    }

    alert("Same-day search validated for: " +
          userId + ". Backend connection pending.");
});


/* USERS WHO NEVER SIGNED IN */

const neverSignedInBtn = document.getElementById("never-signed-in-btn");

neverSignedInBtn.addEventListener("click", function() {
    alert("Never-signed-in search selected. Backend connection pending.");
});


/* USERS REGISTERED TODAY */

const registeredTodayBtn = document.getElementById("registered-today-btn");

registeredTodayBtn.addEventListener("click", function() {
    alert("Registered-today search selected. Backend connection pending.");
});
