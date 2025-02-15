const express = require('express');
const router = express.Router();
const db = require('../../database/db');

const generateGameId = () => Math.random().toString(36).substring(2, 8);

router.post('/start', (req, res) => {
    const { name, difficulty } = req.body;
    if (!name || !difficulty || difficulty < 1 || difficulty > 4) {
        return res.status(400).json({ 
            error: 'Invalid name or difficulty level' 
        });
    }

    db.query('SELECT * FROM username WHERE username = ?', [name], (err, result) => {
        if (err) {
            return res.status(500).json({ 
                error: 'Database error while checking user' 
            });
        }

        if (result.length > 0) {
            const user = result[0];
            assignNewQuestion(user.game_id, difficulty, res, user);
        } else {
            const game_id = generateGameId();
            db.query(
                'INSERT INTO username (username, game_id, current_score, total_time_spent, difficulty) VALUES (?, ?, 0, 0, ?)',
                [name, game_id, difficulty],
                (err) => {
                    if (err) {
                        return res.status(500).json({ 
                            error: 'Database error while creating user' 
                        });
                    }
                    assignNewQuestion(game_id, difficulty, res, { username: name, game_id, current_score: 0, total_time_spent: 0 });
                }
            );
        }
    });
});

const assignNewQuestion = (game_id, difficulty, res, user) => {
    db.query('SELECT id, math_question FROM question_bank WHERE difficulty = ? ORDER BY RAND() LIMIT 1',
        [difficulty], (err, questionResult) => {
            if (err) {
                return res.status(500).json({ 
                    error: 'Database error while selecting question' 
                });
            }
            if (questionResult.length === 0) {
                return res.status(404).json({ 
                    error: 'No questions available' 
                });
            }

            const question_id = questionResult[0].id;
            const math_question = questionResult[0].math_question;

            db.query('INSERT INTO question_session (question_id, game_id, time_taken, valid) VALUES (?, ?, 0, "no")',
                [question_id, game_id], (err) => {
                    if (err) {
                        return res.status(500).json({ 
                            error: 'Database error while creating question session' 
                        });
                    }
                    res.json({
                        message: `Hello ${user.username}, find your submit API URL below`,
                        submit_url: `http://localhost:5000/game/${game_id}/submit`,
                        question: math_question,
                        time_started: new Date().toISOString(),
                    });
                });
        });
};

router.post('/:game_id/submit', (req, res) => {
    const { game_id } = req.params;
    const { answer } = req.body;

    if (!answer) {
        return res.status(400).json({ 
            error: 'Answer is required' 
        });
    }

    db.query(
        `SELECT q.id AS question_id, q.answer, qs.id AS session_id 
         FROM question_session qs 
         JOIN question_bank q ON qs.question_id = q.id 
         WHERE qs.game_id = ? AND qs.valid = 'no' 
         ORDER BY qs.id DESC LIMIT 1`,
        [game_id],
        (err, result) => {
            if (err) {
                return res.status(500).json({ 
                    error: 'Database error while fetching question' 
                });
            }
            if (result.length === 0) {
                return res.status(404).json({ 
                    error: 'No active question found. Start a new game.' 
                });
            }

            const { question_id, session_id, answer: correctAnswer } = result[0];
            const isCorrect = parseFloat(answer) === correctAnswer;
            const time_taken = Math.floor(Math.random() * 10) + 1;

            db.query(
                'UPDATE question_session SET valid = ?, time_taken = ? WHERE id = ?',
                [isCorrect ? 'yes' : 'no', time_taken, session_id],
                (err) => {
                    if (err) {
                        return res.status(500).json({ 
                            error: 'Database error while updating question session'
                         });
                    }
                    var myScore;
                    db.query(
                        'SELECT username, current_score, total_time_spent FROM username WHERE game_id = ?',
                        [game_id],
                        (err, userResult) => {
                            if (err) {
                                return res.status(500).json({ 
                                    error: 'Database error while retrieving user data' 
                                });
                            }
                
                            if (userResult.length === 0) {
                                return res.status(404).json({
                                     error: 'User not found'
                                     });
                            }
                
                            myScore = userResult[0].current_score;
                            console.log("myScore: " + myScore);
                        }
                    );
                    db.query(
                        'UPDATE username SET current_score = current_score + ?, total_time_spent = total_time_spent + ?, total_score = total_score + ? WHERE game_id = ?',
                        [isCorrect ? 1 : 0, time_taken, isCorrect? 1 : 1, game_id],
                        (err) => {
                            if (err) {
                                return res.status(500).json({ 
                                    error: 'Database error while updating user score', sqlState: err.sqlState, message: err.message 
                                });
                            }

                            fetchUserScoreAndHistory(game_id, isCorrect, time_taken, res);
                        }
                    );
                }
            );
        }
    );
});


function fetchUserScoreAndHistory(game_id, isCorrect, time_taken, res) {
    db.query(
        'SELECT username, current_score, total_time_spent, total_score FROM username WHERE game_id = ?',
        [game_id],
        (err, userResult) => {
            if (err) {
                return res.status(500).json({ 
                    error: 'Database error while retrieving user data'
                 });
            }

            if (userResult.length === 0) {
                return res.status(404).json({ 
                    error: 'User not found' 
                });
            }

            const user = userResult[0];

            db.query(
                `SELECT q.math_question, q.answer, qs.valid, qs.time_taken 
                 FROM question_session qs 
                 JOIN question_bank q ON qs.question_id = q.id 
                 WHERE qs.game_id = ?`,
                [game_id],
                (err, historyResult) => {
                    if (err) {
                        return res.status(500).json({ 
                            error: 'Database error while retrieving history'
                         });
                    }

                    res.json({
                        message: `${isCorrect ? 'Good Job ' : 'Sorry '} ${user.username}, your answer is ${isCorrect ? 'Correct' : 'Incorrect'}`,
                        time_taken: `${time_taken} seconds`,
                        current_score: (user.current_score / user.total_score).toFixed(2),
                        history: historyResult
                    });
                }
            );
        }
    );
}

router.get('/:game_id/status', (req, res) => {
    const { game_id } = req.params;

    db.query(
        'SELECT username, current_score, total_time_spent, difficulty, total_score FROM username WHERE game_id = ?',
        [game_id],
        (err, userResult) => {
            if (err || userResult.length === 0) {
                return res.status(404).json({ 
                    error: 'Game not found' 
                });
            }

            // Fetch game history
            db.query(
                `SELECT q.math_question, q.answer, qs.time_taken, qs.valid 
                 FROM question_session qs 
                 JOIN question_bank q ON qs.question_id = q.id 
                 WHERE qs.game_id = ?`,
                [game_id],
                (err, historyResult) => {
                    if (err) {
                        return res.status(500).json({ 
                            error: 'Database error while retrieving history' 
                        });
                    }

                    res.json({
                        name: userResult[0].username,
                        difficulty: userResult[0].difficulty,
                        current_score: (userResult[0].current_score / userResult[0].total_score).toFixed(2),
                        total_time_spent: `${userResult[0].total_time_spent} seconds`,
                        history: historyResult
                    });
                }
            );
        }
    );
});


module.exports = router;