const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'bank'
});

db.connect((err) => {
    if (err) throw err;
    console.log('Connected to database');
});

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/customers', (req, res) => {
    const query = 'SELECT * FROM Customers';
    db.query(query, (err, results) => {
        if (err) throw err;
        res.render('customers', { customers: results });
    });
});

app.get('/customer/:id', (req, res) => {
    const query = 'SELECT * FROM Customers WHERE id = ?';
    db.query(query, [req.params.id], (err, results) => {
        if (err) throw err;
        res.render('customer', { customer: results[0] });
    });
});

app.post('/transfer', (req, res) => {
    const { sender_id, receiver_id, amount } = req.body;
    const transferAmount = parseFloat(amount);

    db.beginTransaction((err) => {
        if (err) throw err;

        db.query('SELECT balance FROM Customers WHERE id = ?', [sender_id], (err, results) => {
            if (err) {
                return db.rollback(() => { throw err; });
            }

            const senderBalance = results[0].balance;
            if (senderBalance < transferAmount) {
                return res.send('Insufficient balance');
            }

            db.query('UPDATE Customers SET balance = balance - ? WHERE id = ?', [transferAmount, sender_id], (err, results) => {
                if (err) {
                    return db.rollback(() => { throw err; });
                }

                db.query('UPDATE Customers SET balance = balance + ? WHERE id = ?', [transferAmount, receiver_id], (err, results) => {
                    if (err) {
                        return db.rollback(() => { throw err; });
                    }

                    db.query('INSERT INTO Transfers (sender_id, receiver_id, amount) VALUES (?, ?, ?)', [sender_id, receiver_id, transferAmount], (err, results) => {
                        if (err) {
                            return db.rollback(() => { throw err; });
                        }

                        db.commit((err) => {
                            if (err) {
                                return db.rollback(() => { throw err; });
                            }
                            res.redirect('/customers');
                        });
                    });
                });
            });
        });
    });
});

app.listen(3000, () => {
    console.log('Server started on http://localhost:3000');
});
