# mindgame-postman
Backend-based game called "Dev Mind Speed", where players solve math equations by calling APIs using Postman made using NodeJS & ExpressJS.

## How to Play
The player will have to solve math equations of 1-4 difficulties of their choice. The game will calculate the speed of solving the issue and the total score.

## Requirements
• VSCode
• Postman
• XAMMP (Optional for DB)

## Installation
1. Extract the zip folder and open it via VSCode.
2. Run:

```bash
npm install
```
3. Connect your database with the information to database/db.js file. The database must have the three following tables: 
```sql
Database name: betask
---
No. Tables: 3
CREATE TABLE question_bank (
    id INT AUTO_INCREMENT PRIMARY KEY,
    math_question TEXT NOT NULL,
    answer FLOAT NOT NULL,
    difficulty INT NOT NULL CHECK (difficulty BETWEEN 1 AND 4)
);

CREATE TABLE question_session (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_id INT NOT NULL,
    game_id INT NOT NULL,
    time_taken INT NOT NULL DEFAULT 0,
    valid BOOLEAN NOT NULL,
);

CREATE TABLE username (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    game_id INT NOT NULL,
    current_score INT DEFAULT 0,
    total_time_spent INT DEFAULT 0 -- Stored in seconds
);

```
4. Make the changes to the following:
```text
from
const db = require('../database/db'); // Import database connection

to
const db = require('./database/db'); // Import database connection
```

5. Run command:  
```text
node server

// make sure you get the following in the console
Server running on port 5000
Connected to MySQL database
```

## Usage
After you make sure everything is working and the database is connected. You can open the postman and play the game!
1. Starting the game: http://localhost:5000/game/start (POST)
2. Submit game: http://localhost:5000/game/:game_id/submit (POST)
3. Game Status: http://localhost:5000/game/:game_id/status (POST)


## Contributing
Pull requests are welcome. For major changes, please open an issue first
to discuss what you would like to change.

## License
[MIT](https://choosealicense.com/licenses/mit/)
