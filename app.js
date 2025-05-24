require('dotenv').config();
const express = require('express');
const session = require('express-session');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const ejs = require('ejs')
const fs = require('fs');
const { adminRoutes } = require('./routes/adminRoutes')
const { userRoutes } = require('./routes/userRoutes')
const app = express();
const db = new sqlite3.Database('./data.sqlite');
const {dailyIncomeUpdateForAll} = require('./controllers/userController');
const cron = require('node-cron');
function setRate() {
    db.all(`SELECT cName, cRate,paymentType FROM currencyrate ORDER BY paymentType`, [], (err, rates) => {
        if (err) {
            console.error(err);
            // return res.status(500).send('An error occurred while retrieving the currency rates.');
        }
        btcRate_Deposit = rates[0].cRate;
        usdtRate_Deposit = rates[1].cRate;
        btcRate_Withdraw = rates[2].cRate;
        usdtRate_Withdraw = rates[3].cRate;

    });
}

setRate();


// Schedule the function to run every minute
cron.schedule('* * * * *', async () => {
    console.log("Executing dailyIncomeUpdateForAll...");
    try {
        await dailyIncomeUpdateForAll();
    } catch (err) {
        console.error("Error during execution:", err);
    }
});


app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60
    }
}));

// const storage = multer.diskStorage({
//     destination: './public/uploads',
//     filename: (req, file, cb) => {
//         cb(null, Date.now() + path.extname(file.originalname));
//     }
// });
// const upload = multer({ storage });

// const storage_upi = multer.diskStorage({
//     destination: './public/upi',
//     filename: (req, file, cb) => {
//         cb(null, 'upi_qr' + path.extname(file.originalname));
//     }
// });
// const upi_upload = multer({ storage: storage_upi })


app.set('view engine', 'ejs');

app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

app.use('/', userRoutes);
app.use('/admin', adminRoutes);
// function checkAuth(req, res, next) {
//     if (req.session.userId) {
//         res.locals.userName = req.session.username || null;
//         res.locals.userEmail = req.session.email || null;
//         res.locals.balance = req.session.balance || null;
//         res.locals.usdtBalance =  req.session.usdtbal || null ;
//         res.locals.btcBalance = req.session.btcbal || null;
//         return next();
//     }
//     res.redirect('/sign-in');
// }

// function checkAdmin(req, res, next) {
//     if (req.session.isAdmin) {
//         return next();
//     }
//     res.redirect('/admin-login');
// }

// app.get(['/', '/home', '/index'], (req, res) => {
//     const userEmail = req.session.userEmail || null;
//     if (userEmail) {
//         db.get(`SELECT balance,usdtBalance,btcBalance FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
//             if (err || !user) {
//                 console.error(err || 'User not found.');
//                 return res.status(500).send("Error loading user data.");
//             }
//             res.render('index', { userEmail, userName: req.session.username, balance: user.balance,usdtBalance:user.usdtBalance,btcBalance:user.btcBalance });
//         });
//     } else {
//         res.render('index', { userEmail, userName: req.session.username, balance: null,usdtBalance:null,btcBalance:null });
//     }
// });


// app.get(['/sign-in', '/login'], (req, res) => {
//     res.render('sign-in');
// });

// app.get(['/sign-up', '/register'], (req, res) => {
//     res.render('sign-up');
// });

// app.get('/contact-us', (req, res) => {
//     const userEmail = req.session.userEmail || null;
//     if (userEmail) {
//         db.get(`SELECT balance FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
//             if (err || !user) {
//                 console.error(err || 'User not found.');
//                 return res.status(500).send("Error loading user data.");
//             }
//             res.render('contact-us', { userEmail, userName: req.session.username, balance: user.balance });
//         });
//     } else {
//         res.render('contact-us', { userEmail: req.session.userEmail, userName: req.session.username, balance: null });
//     }
// });
// app.post('/contact-us', (req, res) => {
//     const { name, subject, email, message } = req.body;

//     const transporter = nodemailer.createTransport({
//         host: process.env.SMTP_HOST,
//         port: 587,
//         secure: false, // Use TLS
//         auth: {
//             user: process.env.SMTP_USER,
//             pass: process.env.SMTP_PASS,
//         },
//     });

//     // Define email options
//     const mailOptions = {
//         from: process.env.SMTP_USER,
//         to: email,
//         subject: subject,
//         html: '<p>Thanks for contacting</p>', // Use the rendered HTML content from the template
//     };
//     ejs.renderFile('./views/mailTemplate/contactMail.ejs', { email: email, subject: subject, name: name, message: message }, (err, contactMail) => {
//         if (err) {
//             console.error('Error rendering email template:', err);
//         } else {
//             mailOptions.html = contactMail;
//             transporter.sendMail(mailOptions, (err, info) => {
//                 if (err) {
//                     console.error('Error sending verification email: ', err);
//                 } else {
//                     // console.log('Verification email sent: ' + info.response);
//                 }
//             });
//         }
//     });
//     res.render('contact-us',)
// })

// app.get('/about', (req, res) => {
//     const userEmail = req.session.userEmail || null;
//     if (userEmail) {
//         db.get(`SELECT balance FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
//             if (err || !user) {
//                 console.error(err || 'User not found.');
//                 return res.status(500).send("Error loading user data.");
//             }
//             res.render('about', { userEmail, balance: user.balance });
//         });
//     } else {
//         res.render('about', { userEmail, balance: null });
//     }
// });

// app.get('/currency-exchanger', (req, res) => {
//     res.render('user');
// });

// app.get('/deposit', (req, res) => {
//     res.redirect('user/deposit');
// });

// app.get('/withdraw', (req, res) => {
//     res.redirect('user/withdraw');
// });

// app.get(['/privacy-policy', '/terms-and-conditions'], (req, res) => {
//     const userEmail = req.session.userEmail || null;
//     if (userEmail) {
//         db.get(`SELECT balance FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
//             if (err || !user) {
//                 console.error(err || 'User not found.');
//                 return res.status(500).send("Error loading user data.");
//             }
//             res.render('privacy-policy', { userEmail, balance: user.balance });
//         });
//     } else {
//         res.render('privacy-policy', { userEmail, balance: null });
//     }
// });


// app.get('/faqs', (req, res) => {
//     const userEmail = req.session.userEmail || null;

//     if (userEmail) {
//         db.get(`SELECT balance FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
//             if (err || !user) {
//                 console.error(err || 'User not found.');
//                 return res.status(500).send("Error loading user data.");
//             }

//             res.render('faqs', {
//                 userEmail: req.session.userEmail,
//                 userName: req.session.username,
//                 balance: user.balance
//             });
//         });
//     } else {
//         res.render('faqs', {
//             userEmail: null,
//             balance: null
//         });
//     }
// });
// app.post('/sign-up', async (req, res) => {
//     const { firstName, lastName, phone, email, password, username } = req.body;

//     db.get(`SELECT value FROM configurations WHERE key = ?`, ['registration_enabled'], async (err, row) => {
//         if (err) {
//             console.error(err);
//             return res.render('sign-up', { showAlert: true, alertMessage: 'Error occurred', alertType: 'error' });
//         }

//         if (row && row.value === 'false') {
//             return res.status(403).send('User registrations are currently disabled.');
//         }

//         db.get(`SELECT * FROM users WHERE phone = ? OR email = ? OR username = ?`, [phone, email, username], async (err, user) => {
//             if (err) {
//                 console.error(err);
//                 return res.render('sign-up', { showAlert: true, alertMessage: 'Error occurred', alertType: 'error' });
//             }

//             if (user) {
//                 return res.render('sign-up', { showAlert: true, alertMessage: 'User already registered!', alertType: 'error', resendMail: true });
//             }

//             try {
//                 const hashedPassword = await bcrypt.hash(password, 10);
//                 const verificationToken = crypto.randomBytes(32).toString('hex');
//                 const verificationLink = `${process.env.BASE_URL}verify-account?token=${verificationToken}`;

//                 db.run(
//                     `INSERT INTO users (firstName, lastName, phone, email, password, username, resetToken) VALUES (?, ?, ?, ?, ?, ?, ?)`,
//                     [firstName, lastName, phone, email, hashedPassword, username, verificationToken],
//                     (err) => {
//                         if (err) {
//                             console.error(err);
//                             return res.render('sign-up', { showAlert: true, alertMessage: 'Error occurred', alertType: 'error' });
//                         }


//                         res.render('sign-in', { showAlert: true, alertMessage: 'Verify your email to complete registration.', alertType: 'info' });

//                         process.nextTick(() => {
//                             const transporter = nodemailer.createTransport({
//                                 host: process.env.SMTP_HOST,
//                                 port: 587,
//                                 secure: false,
//                                 auth: {
//                                     user: process.env.SMTP_USER,
//                                     pass: process.env.SMTP_PASS,
//                                 },
//                             });

//                             const mailOptions = {
//                                 from: process.env.SMTP_USER,
//                                 to: email,
//                                 subject: 'Verify Your Account',
//                             };

//                             ejs.renderFile('./views/mailTemplate/mailVerify.ejs', { verifyLink: verificationLink }, (err, verifyPage) => {
//                                 if (err) {
//                                     console.error('Error rendering email template:', err);
//                                 } else {
//                                     mailOptions.html = verifyPage;

//                                     transporter.sendMail(mailOptions, (err, info) => {
//                                         if (err) {
//                                             console.error('Error sending verification email: ', err);
//                                         } else {
//                                             // console.log('Verification email sent: ' + info.response);
//                                         }
//                                     });
//                                 }
//                             });
//                         });
//                     }
//                 );
//             } catch (error) {
//                 console.error(error);
//                 return res.render('sign-up', { showAlert: true, alertMessage: 'Error occurred', alertType: 'error' });
//             }
//         });
//     });
// });


// app.get('/verify-account', (req, res) => {
//     const { token } = req.query;

//     db.get('SELECT * FROM users WHERE resetToken = ?', [token], async (err, user) => {

//         if (err) {
//             console.error(err);
//             return res.render('sign-in', { showAlert: true, alertMessage: 'Something went wrong!', alertType: 'error' });
//         }

//         if (!user) {
//             return res.render('sign-in', { showAlert: true, alertMessage: 'Expire or Invalid Token', alertType: 'error' });
//         }

//         db.run(`UPDATE users SET verifiedStatus = 1, resetToken = NULL WHERE resetToken = ?`, [token], (err) => {
//             if (err) {
//                 console.error(err);
//                 return res.render('sign-in', { showAlert: true, alertMessage: 'Something went wrong contact admin!', alertType: 'error' });
//             }

//             return res.render('sign-in', { showAlert: true, alertMessage: 'Email verified successfully !', alertType: 'success' });
//         });
//     });
// });


// app.post('/resend-verification-email', checkAuth, (req, res) => {
//     const email = req.session.userEmail;
//     const username = req.session.username;


//     // Correct SQL query
//     db.get(`SELECT * FROM users WHERE email = ? OR username = ?`, [email, username], (err, user) => {
//         if (err) {
//             console.error(err);
//             return res.render('sign-up', { showAlert: true, alertMessage: 'Database error', alertType: 'error' });
//         }



//         if (!user) {
//             return res.render('sign-up', { showAlert: true, alertMessage: 'Email not registered!', alertType: 'error', resendMail: false });
//         }

//         try {
//             const verificationToken = user.resetToken;
//             if (!verificationToken) {
//                 // Handle case where there's no resetToken in the database
//                 return res.render('sign-up', { showAlert: true, alertMessage: 'No verification token found', alertType: 'error' });
//             }


//             const verificationLink = `${process.env.BASE_URL}verify-account?token=${verificationToken}`;
//             // Render page first with the alert message

//             res.render('sign-in', { showAlert: true, alertMessage: `Verification mail sent to ${user.email}`, resendMail: false, alertType: 'info' });

//             const transporter = nodemailer.createTransport({
//                 host: process.env.SMTP_HOST,
//                 port: 587,
//                 secure: false, // Use secure true if you use SSL
//                 auth: {
//                     user: process.env.SMTP_USER,
//                     pass: process.env.SMTP_PASS,
//                 },
//             });

//             ejs.renderFile('./views/mailTemplate/mailVerify.ejs', { verifyLink: verificationLink }, (err, verifyPage) => {
//                 if (err) {
//                     console.error('Error rendering email template:', err);
//                     return res.render('sign-up', { showAlert: true, alertMessage: 'Error generating email template', alertType: 'error' });
//                 }

//                 const mailOptions = {
//                     from: process.env.SMTP_USER,
//                     to: email,
//                     subject: 'Verify Your Account',
//                     html: verifyPage
//                 };

//                 transporter.sendMail(mailOptions, (err, info) => {
//                     if (err) {
//                         console.error('Error sending verification email: ', err);
//                         return res.render('sign-in', { showAlert: true, alertMessage: 'Error sending email', alertType: 'error' });
//                     }

//                 });
//             });
//         } catch (error) {
//             console.error(error);
//             return res.render('sign-up', { showAlert: true, alertMessage: 'Error occurred', alertType: 'error' });
//         }
//     });
// });





// app.get('/sign-in', (req, res) => {
//     res.render('sign-in');
// });

// app.post('/sign-in', async (req, res) => {
//     const { emailOrUsername, password } = req.body;
//     if (req.session.userId) {
//         res.redirect('/');
//     }

//     const query = `SELECT * FROM users WHERE email = ? OR username = ?`;
//     db.get(query, [emailOrUsername, emailOrUsername], async (err, user) => {
//         if (err) {
//             console.error(err);
//             return res.render('sign-in', { showAlert: true, alertMessage: 'Something went wrong!', alertType: 'error' });
//         }

//         if (!user) {
//             return res.render('sign-in', { showAlert: true, alertMessage: 'User not found', alertType: 'warning' });
//         }

//         const isPasswordCorrect = await bcrypt.compare(password, user.password);
//         if (!isPasswordCorrect) {
//             return res.render('sign-in', { showAlert: true, alertMessage: 'Wrong login credentials', alertType: 'error' });
//         }

//         if (user.verifiedStatus === 0) {
//             return res.render('sign-in', { emailsend: user.email, showAlert: true, alertMessage: 'Email is not Verified!', alertType: 'error', resendMail: true });
//         }

//         req.session.userId = user.id;
//         req.session.userEmail = user.email;
//         req.session.username = user.username;
//         req.session.balance = user.balance;

//         req.session.usdtbal = user.usdtBalance;
//         req.session.btcbal = user.btcBalance;

//         console.log(user);
//         res.render('index', { userEmail: user.email, userName: req.session.username, balance: user.balance, showAlert: true, alertMessage: 'Signed in successfully !', alertType: 'success', });

//     });
// });



// app.get('/change-password', checkAuth, (req, res) => {
//     const userEmail = req.session.userEmail || null;
//     res.render('change-password', { userEmail, balance: req.session.balance });
// });
// app.post('/change-password', checkAuth, async (req, res) => {
//     const userEmail = req.session.userEmail || null;
//     const { email, currentPassword, newPassword, confirmNewPassword } = req.body;

//     db.get(`SELECT * FROM users WHERE id = ?`, [req.session.userId], async (err, user) => {
//         if (err || !user || !(await bcrypt.compare(currentPassword, user.password))) {
//             console.error("Incorrect current password");
//             return res.status(400).send("Incorrect current password.");
//         }

//         if (newPassword !== confirmNewPassword) {
//             return res.status(400).send("New password and confirmation do not match.");
//         }

//         if (email) {
//             db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, existingUser) => {
//                 if (err) {
//                     console.error(err);
//                     return res.status(500).send("Error checking email availability.");
//                 }
//                 if (existingUser && existingUser.id !== user.id) {
//                     return res.status(400).send("Email already exists.");
//                 }

//                 const hashedNewPassword = await bcrypt.hash(newPassword, 10);
//                 db.run(`UPDATE users SET email = ?, password = ? WHERE id = ?`,
//                     [email, hashedNewPassword, req.session.userId], (err) => {
//                         if (err) {
//                             console.error(err);
//                             return res.status(500).send("Error updating account details.");
//                         }
//                         res.redirect('/');
//                     });
//             });
//         } else {
//             const hashedNewPassword = await bcrypt.hash(newPassword, 10);
//             db.run(`UPDATE users SET password = ? WHERE id = ?`,
//                 [hashedNewPassword, req.session.userId], (err) => {
//                     if (err) {
//                         console.error(err);
//                         return res.status(500).send("Error updating password.");
//                     }
//                     res.redirect('/');
//                 });
//         }
//     });
// });




// app.get('/user', checkAuth, (req, res) => {
//     db.all(`SELECT * FROM transactions WHERE userId = ?`, [req.session.userId], (err, transactions) => {
//         if (err) {
//             console.error(err);
//             return res.status(500).send("Error loading transactions.");
//         }
//         db.all(`SELECT method, details FROM payment_methods`, (err, paymentMethods) => {
//             if (err) {
//                 console.error(err);
//                 return res.status(500).send("Error loading payment methods.");
//             }
//             res.render('user', {
//                 userEmail: req.session.userEmail,
//                 transactions,
//                 transactionId: req.query.transactionId,
//                 paymentMethods,
//             });
//         });
//     });
// });

// app.get('/user/deposit', checkAuth, (req, res) => {
//     db.get(`SELECT balance FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
//         if (err || !user) {
//             console.error(err || 'User not found.');
//             return res.status(500).send("Error loading user data.");
//         }

//         db.all(`SELECT * FROM transactions WHERE userId = ?`, [req.session.userId], (err, transactions) => {
//             if (err) {
//                 console.error(err);
//                 return res.status(500).send("Error loading transactions.");
//             }

//             db.all(`SELECT method, details FROM payment_methods`, (err, paymentMethods) => {
//                 if (err) {
//                     console.error(err);
//                     return res.status(500).send("Error loading payment methods.");
//                 }
//                 db.all(`SELECT * FROM currency_network`, [], (err, network) => {
//                     if (err) {
//                         console.log(err);
//                         return res.status(500).send("Error loading networks.")
//                     }

//                     res.render('user/deposit', {
//                         userEmail: req.session.userEmail,
//                         balance: user.balance,
//                         transactions,
//                         transactionId: req.query.transactionId,
//                         paymentMethods,
//                         usdtRate: usdtRate,
//                         btcRate: btcRate,
//                         network,
//                     });
//                 })
//             });
//         });
//     });
// });



// app.get('/user/withdraw', checkAuth, (req, res) => {
//     db.get(`SELECT balance,usdtBalance,btcBalance,Balance FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
//         if (err || !user) {
//             console.error(err || 'User not found.');
//             return res.status(500).send("Error loading user data.");
//         }

//         db.all(`SELECT * FROM transactions WHERE userId = ?`, [req.session.userId], (err, transactions) => {
//             if (err) {
//                 console.error(err);
//                 return res.status(500).send("Error loading transactions.");
//             }

//             db.all(`SELECT method, details FROM payment_methods`, (err, paymentMethods) => {
//                 if (err) {
//                     console.error(err);
//                     return res.status(500).send("Error loading payment methods.");
//                 }

//                 const cryptoMethods = paymentMethods.filter(({ method }) =>
//                     ['BTC', 'ETH', 'USDT', 'DOGE', 'XRP', 'SOL', 'LTC'].includes(method)
//                 );
//                 const otherMethods = paymentMethods.filter(({ method }) =>
//                     !['BTC', 'ETH', 'USDT', 'DOGE', 'XRP', 'SOL', 'LTC'].includes(method)
//                 );


//                 res.render('user/withdraw', {
//                     userEmail: req.session.userEmail,
//                     balance: user.balance,
//                     usdtBalance: user.usdtBalance,
//                     btcBalance: user.btcBalance,
//                     transactions,
//                     transactionId: req.query.transactionId,
//                     paymentMethods,
//                     cryptoMethods,
//                     otherMethods,
//                     usdtRate: usdtRate,
//                     btcRate: btcRate
//                 });
//             });
//         });
//     });
// });



// app.post('/user/deposit', checkAuth, upload.single('proof'), (req, res) => {
//     const { amount, payment_method, walletHash, network } = req.body;
//     const proof = req.file ? req.file.filename : null;
//     const currentDate = new Date();
//     const formattedDate = currentDate.toLocaleString('sv-SE', {
//         hour12: false,
//         year: 'numeric',
//         month: '2-digit',
//         day: '2-digit',
//         hour: '2-digit',
//         minute: '2-digit',
//         second: '2-digit'
//     });

//     if (payment_method === 'Crypto' && !walletHash) {
//         return res.status(400).send("Transaction hash is required for cryptocurrency payments.");
//     }

//     if (payment_method === 'USDT' && !network) {
//         return res.status(400).send("Network selection is required for USDT payments.");
//     }

//     db.run(
//         `INSERT INTO transactions (userId, amount, proof, payment_method, wallet_hash, network,uploaded_on, type) VALUES (?, ?, ?, ?, ?, ?,?, 'Deposit')`,
//         [req.session.userId, amount, proof, payment_method, walletHash || null, network || null, formattedDate], // Insert network
//         function (err) {
//             if (err) {
//                 console.error(err);
//                 return res.redirect('/user/deposit');
//             }
//             res.redirect(`/user/deposit?transactionId=${this.lastID}`);
//         }
//     );
// });



// app.post('/user/withdraw', checkAuth, upload.single('proof'), (req, res) => {
//     const { amount, payment_method, accountHolderName, bankAccount, ifsc, upiId, usdtWallet ,walletHash} = req.body;

//     const proof = req.file ? req.file.filename : null;
//     const currentDate = new Date();
//     const formattedDate = currentDate.toLocaleString('sv-SE', {
//         hour12: false,
//         year: 'numeric',
//         month: '2-digit',
//         day: '2-digit',
//         hour: '2-digit',
//         minute: '2-digit',
//         second: '2-digit'
//     });

//     let paymentDetails = null;
//     db.all(`SELECT * FROM transactions WHERE userId = ?`, [req.session.userId], (err, transactions) => {
//         if (err) {
//             console.error(err);
//             return res.status(500).send("Error loading transactions.");
//         }
//         if (payment_method === 'Bank') {
//             if (!accountHolderName || !bankAccount || !ifsc) {
//                 return res.render('user/withdraw', { showAlert: true, alertMessage: 'Bank Details required', alertType: 'error', transactions });
//             }
//             paymentDetails = `Account Holder: ${accountHolderName}, Bank Account: ${bankAccount}, IFSC: ${ifsc}`;
//         } else if (payment_method === 'UPI') {
//             if (!upiId) {
//                 return res.render('user/withdraw', { showAlert: true, alertMessage: 'UPI ID is required.', alertType: 'error', transactions });
//             }
//             paymentDetails = `UPI ID: ${upiId}`;
//         } else {
//             if (!(usdtWallet || walletHash)) {
//                 return res.render('user/withdraw', { showAlert: true, alertMessage: 'Wallet Address Required', alertType: 'error', transactions });
//             }
//             paymentDetails = `Wallet Address: ${usdtWallet}`;
//         }


//         db.get(`SELECT balance FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
//             if (err || !user) {
//                 console.error(err || 'User not found.');
//                 return res.status(500).send("Error processing withdrawal.");
//             }

//             if (user.balance < amount) {
//                 return res.render('user/withdraw', { btcRate: btcRate, usdtRate: usdtRate, showAlert: true, alertMessage: 'Insufficient Balance', alertType: 'error', transactions });
//             }

//             db.run(
//                 `UPDATE users SET balance = balance - ? WHERE id = ?`,
//                 [amount, req.session.userId],
//                 (err) => {
//                     if (err) {
//                         console.error(err);
//                         return res.status(500).send("Error updating balance.");
//                     }

//                     db.run(
//                         `INSERT INTO transactions (userId, amount, proof, payment_method, wallet_hash,uploaded_on, status, type) VALUES (?, ?, ?, ?, ?,?, 'Pending', 'Withdraw')`,
//                         [req.session.userId, amount, proof, payment_method, paymentDetails, formattedDate],
//                         function (err) {
//                             if (err) {
//                                 console.error(err);
//                                 return res.redirect('/user/withdraw');
//                             }
//                             res.redirect(`/user/withdraw?transactionId=${this.lastID}`);
//                         }
//                     );
//                 }
//             );
//         });
//     });
// });



// app.get('/reset-password', (req, res) => {
//     const { token } = req.query;

//     db.get(
//         'SELECT * FROM users WHERE resetToken = ? AND resetTokenExpires > ?',
//         [token, Date.now()],
//         (err, user) => {
//             if (err || !user) {
//                 return res.status(400).send('Invalid or expired token');
//             }

//             const userEmail = user.email;
//             res.render('reset-password', { token, userEmail });
//         }
//     );
// });



// app.post('/reset-password', async (req, res) => {
//     const { token, password } = req.body;

//     db.get(
//         'SELECT * FROM users WHERE resetToken = ? AND resetTokenExpires > ?',
//         [token, Date.now()],
//         async (err, user) => {
//             if (err || !user) {
//                 return res.status(400).send('Invalid or expired token');
//             }

//             try {
//                 // Hash the password before saving it
//                 const hashedPassword = await bcrypt.hash(password, 10);

//                 db.run(
//                     'UPDATE users SET password = ?, resetToken = NULL, resetTokenExpires = NULL WHERE id = ?',
//                     [hashedPassword, user.id],
//                     (err) => {
//                         if (err) {
//                             return res.status(500).send('Server Error');
//                         }

//                         res.send('Password updated successfully.');
//                     }
//                 );
//             } catch (error) {
//                 console.error('Error hashing password:', error);
//                 res.status(500).send('Server Error');
//             }
//         }
//     );
// });

// app.get('/forgot-password', (req, res) => {
//     res.render('forgot-password');
// });


// app.post('/forgot-password', (req, res) => {
//     const { email } = req.body;

//     db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
//         if (err) {
//             console.error(err);
//             return res.render('forgot-password', { showAlert: true, alertMessage: 'Error Occurred', alertType: 'error' });
//         }

//         if (!user) {
//             return res.render('forgot-password', { showAlert: true, alertMessage: 'Email not found, please sign up', alertType: 'error' });
//         }

//         const resetToken = crypto.randomBytes(32).toString('hex');
//         const baseUrl = process.env.BASE_URL;
//         const resetLink = `${baseUrl}reset-password?token=${resetToken}`;

//         // Store resetToken and expiration time in the database
//         db.run(
//             `UPDATE users SET resetToken = ?, resetTokenExpires = ? WHERE email = ?`,
//             [resetToken, Date.now() + 3600000, email],
//             (err) => {
//                 if (err) {
//                     console.error(err);
//                     return res.render('forgot-password', { showAlert: true, alertMessage: 'Error Occurred', alertType: 'error' });
//                 }

//                 res.render('forgot-password', { showAlert: true, alertMessage: 'Email sent, check your inbox', alertType: 'info' });

//                 // Use process.nextTick to ensure email sending happens after the response
//                 process.nextTick(() => {
//                     // Render the email content using ejs.renderFile
//                     ejs.renderFile('./views/mailTemplate/forgotmailpass.ejs', { resetLink }, (err, htmlContent) => {
//                         if (err) {
//                             console.error('Error rendering email template:', err);
//                             return;
//                         }

//                         // Create the transporter for nodemailer
//                         const transporter = nodemailer.createTransport({
//                             host: process.env.SMTP_HOST,
//                             port: 587,
//                             secure: false, // Use TLS
//                             auth: {
//                                 user: process.env.SMTP_USER,
//                                 pass: process.env.SMTP_PASS,
//                             },
//                         });

//                         // Define email options
//                         const mailOptions = {
//                             from: process.env.SMTP_USER,
//                             to: email,
//                             subject: 'Password Reset Request',
//                             html: htmlContent, // Use the rendered HTML content from the template
//                         };

//                         // Send the email
//                         transporter.sendMail(mailOptions, (err, info) => {
//                             if (err) {
//                                 console.error('Error sending reset email:', err);
//                             } else {
//                                 // Optionally, log the response from the mail server
//                                 console.log('Password reset email sent: ' + info.response);
//                             }
//                         });
//                     });
//                 });
//             }
//         );
//     });
// });



// app.get('/logout', (req, res) => {
//     req.session.destroy((err) => {
//         if (err) return console.error(err);
//         res.redirect('/');
//     });
// });

// app.get('/mytransactions', checkAuth, (req, res) => {
//     const userId = req.session.userId;

//     if (!userId) {
//         return res.status(400).send("User not logged in.");
//     }

//     db.get(`SELECT balance, email FROM users WHERE id = ?`, [userId], (err, user) => {
//         if (err) {
//             console.error("Error fetching user details:", err);
//             return res.status(500).send("Unable to fetch user details.");
//         }

//         if (!user) {
//             return res.status(404).send("User not found.");
//         }

//         db.all(
//             `SELECT * FROM transactions WHERE userId = ? `,
//             [userId],
//             (err, transactions) => {
//                 if (err) {
//                     console.error("Error fetching transactions:", err);
//                     return res.status(500).send("Unable to fetch transactions.");
//                 }

//                 res.render('mytransactions', {
//                     transactions,
//                     balance: user.balance,
//                     userEmail: user.email || null,
//                 });
//             }
//         );
//     });
// });



// app.get('/admin', (req, res) => {
//     res.render('admin-login', { data: null });
// });

// app.post('/admin/sign-in', (req, res) => {
//     const { username, password } = req.body;
//     if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
//         req.session.isAdmin = true;
//         res.redirect('/admin/dashboard');
//     } else {
//         res.redirect('/admin');
//     }
// });

// function checkAdmin(req, res, next) {
//     if (req.session.isAdmin) {
//         return next();
//     }
//     res.redirect('/admin');
// }

// app.get('/admin/dashboard', checkAdmin, (req, res) => {
//     const transactionsQuery = `
//         SELECT u.firstName, u.lastName, u.phone, u.email, t.amount, t.proof, 
//                t.payment_method, t.status, t.id
//         FROM users u
//         JOIN transactions t ON u.id = t.userId
//     `;
//     const paymentMethodsQuery = `SELECT * FROM payment_methods`;
//     const totalUsersQuery = `SELECT COUNT(*) AS total FROM users`;

//     db.all(transactionsQuery, [], (err, transactions) => {
//         if (err) {
//             console.error(err);
//             return res.render('admin-dashboard', { data: [], paymentMethods: [], totalUsers: 0 });
//         }

//         db.all(paymentMethodsQuery, [], (err, paymentMethods) => {
//             if (err) {
//                 console.error(err);
//                 return res.render('admin-dashboard', { data: transactions, paymentMethods: [], totalUsers: 0 });
//             }

//             db.get(totalUsersQuery, [], (err, result) => {
//                 if (err) {
//                     console.error(err);
//                     return res.render('admin-dashboard', { data: transactions, paymentMethods, totalUsers: 0 });
//                 }

//                 const totalUsers = result.total;
//                 res.render('admin-dashboard', { data: transactions, paymentMethods, totalUsers });
//             });
//         });
//     });
// });

// app.get('/admin/update-payment-methods', checkAdmin, (req, res) => {
//     db.all(`SELECT method, details FROM payment_methods`, [], (err, paymentMethods) => {
//         if (err) {
//             console.error(err);
//             return res.render('payment-methods', { paymentMethods: [] });
//         }

//         db.all(`SELECT network_name, network_address FROM currency_network`, [], (err, network) => {
//             if (err) {
//                 console.log(err);
//                 return res.render('payment-methods', { paymentMethods, network: [] });
//             }

//             res.render('payment-methods', { paymentMethods, network });
//         });
//     });
// });

// app.post('/admin/update-payment-methods', upi_upload.single('upi_qr'), checkAdmin, (req, res) => {
//     // Update payment methods

//     for (const key in req.body) {
//         const value = req.body[key];

//         if (key.startsWith('details_')) {
//             const method = key.replace('details_', ''); // Extract method name

//             db.run(`UPDATE payment_methods SET details = ? WHERE method = ?`, [value, method], (err) => {
//                 if (err) {
//                     console.error("Error updating payment method:", err);
//                     return res.status(500).send('Error updating payment methods.');
//                 }
//             });
//         }

//         if (key.startsWith('info')) {
//             const networkName = key.replace('info', '');

//             db.run(`UPDATE currency_network SET network_address = ? WHERE network_name = ?`, [value, networkName], (err) => {
//                 if (err) {
//                     console.error("Error updating network:", err);
//                     return res.status(500).send('Error updating network addresses.');
//                 }
//             });
//         }
//     }
//     res.redirect('/admin/update-payment-methods');
// });








// app.post('/admin/update-status/:id', checkAdmin, (req, res) => {
//     const { status, remark } = req.body;
//     const transactionId = req.params.id;

//     // Fetch transaction details
//     db.get(`SELECT t.type, t.amount, t.status, t.userId, t.payment_method, t.id AS payment_id, t.uploaded_on, t.remark 
//             FROM transactions t WHERE t.id = ?`, [transactionId], (err, transaction) => {
//         if (err || !transaction) {
//             console.error(err || "Transaction not found.");
//             return res.status(500).send("Error updating transaction status.");
//         }

//         const { type, amount, status: currentStatus, userId, payment_method, id: t_id, uploaded_on, remark: transactionRemark ,isPaymentDone} = transaction;
//         console.log(transaction);

//         // Fetch the user's details
//         db.get(`SELECT username, email FROM users WHERE id = ?`, [userId], (err, user) => {
//             if (err || !user) {
//                 console.error(err || "User not found.");
//                 return res.status(500).send("Error fetching user details.");
//             }

//             // Prepare payment details for email
//             const paymentDetails = {
//                 username: user.username,
//                 email: user.email,
//                 payment_method: payment_method,
//                 payment_id: t_id,
//                 uploaded_on: uploaded_on,
//                 type: type,
//                 remark: transactionRemark,
//                 status: currentStatus, // Transaction status
//                 amount: amount
//             };

//             // If the current status is the same and a remark is provided, redirect
//             if (currentStatus === status && remark === transactionRemark) {
//                 return res.redirect('/admin/transactions');
//             }

//             // Update the transaction's status and remark
//             db.run(`UPDATE transactions SET status = ?, remark = ? WHERE id = ?`, [status, remark, transactionId], (err) => {
//                 if (err) {
//                     console.error(err);
//                     return res.status(500).send("Error updating transaction.");
//                 }

//                 // If it's a 'Deposit' and status is 'Complete', update the user's balance
//                 // Define the mapping of payment methods to their respective balances
//                 const balanceMapping = {
//                     'UPI': 'balance',
//                     'Bank': 'balance',
//                     'USDT(ERC20)': 'usdtBalance',
//                     'USDT(TRC20)': 'usdtBalance',
//                     'BTC': 'btcBalance'
//                 };

//                 // Check if it's a 'Deposit' and status is 'Complete'
//                 if (type === 'Deposit' && status === 'Complete' && isPaymentDone !== 1 ) {
//                     // Check if the payment method exists in the balance mapping
//                     if (balanceMapping[payment_method]) {
//                         const balanceField = balanceMapping[payment_method];

//                         // Update the correct balance in the database
//                         db.run(`UPDATE users SET ${balanceField} = ${balanceField} + ?,isPaymentDone = 1 WHERE id = ?`, [amount, userId], (err) => {
//                             if (err) {
//                                 console.error(err);
//                                 return res.status(500).send("Error updating user balance.");
//                             }

//                             // Send the email after updating the balance
//                             sendEmailNotification(userId, paymentDetails);
//                             return res.redirect('/admin/transactions');
//                         });
//                     } else {
//                         // If no matching payment method, send email without updating balance
//                         sendEmailNotification(userId, paymentDetails);
//                         return res.redirect('/admin/transactions');
//                     }
//                 } else {
//                     // If not a 'Deposit' or status is not 'Complete', just send the email
//                     sendEmailNotification(userId, paymentDetails);
//                     return res.redirect('/admin/transactions');
//                 }

//             });
//         });
//     });

//     // Function to send the email notification
//     function sendEmailNotification(userId, paymentDetails) {
//         // Render the email template
//         ejs.renderFile('./views/mailTemplate/paymentStatus.ejs', paymentDetails, (err, htmlContent) => {
//             if (err) {
//                 console.error('Error rendering email template:', err);
//                 return;
//             }

//             const transporter = nodemailer.createTransport({
//                 host: process.env.SMTP_HOST,
//                 port: 587,
//                 secure: false, // Use TLS
//                 auth: {
//                     user: process.env.SMTP_USER,
//                     pass: process.env.SMTP_PASS,
//                 },
//             });

//             // Fetch the user's email address from the database
//             db.get(`SELECT email FROM users WHERE id = ?`, [userId], (err, emailInfo) => {
//                 if (err) {
//                     console.error('Error finding user email:', err);
//                     return;
//                 }

//                 const mailOptions = {
//                     from: process.env.SMTP_USER,
//                     to: emailInfo.email,  // Use the user's email from the database
//                     subject: 'Payment Status Update',
//                     html: htmlContent, // Use the rendered HTML content from the template
//                 };

//                 // Send the email
//                 transporter.sendMail(mailOptions, (err, info) => {
//                     if (err) {
//                         console.error('Error sending email:', err);
//                     } else {
//                         console.log('Payment status update email sent to:', emailInfo.email);
//                     }
//                 });
//             });
//         });
//     }
// });

// app.get('/admin/users', checkAdmin, (req, res) => {
//     db.all(`SELECT id, firstName, lastName, phone, email, username,resetToken,verifiedStatus FROM users`, [], (err, users) => {
//         if (err) {
//             console.error(err);
//             return res.render('admin-dashboard', { transactions: null, paymentMethods: [] });
//         }

//         res.render('users', { users });
//     });
// });

// app.post('/admin/delete-user', checkAdmin, (req, res) => {
//     const userId = req.body.userId;

//     if (!userId) {
//         return res.redirect('/admin/users');
//     }

//     db.run('DELETE FROM users WHERE id = ?', [userId], (err) => {
//         if (err) {
//             console.error(err);
//             return res.redirect('/admin/users');
//         }
//         res.redirect('/admin/users');
//     });
// });


// app.get('/admin/transactions', checkAdmin, (req, res) => {
//     db.all(
//         `SELECT u.firstName, u.lastName, u.phone, u.email, u.username, t.amount, t.proof, 
//                 t.payment_method, t.status, t.wallet_hash, t.type, t.network, t.id,t.remark,t.uploaded_on
//          FROM users u
//          JOIN transactions t ON u.id = t.userId`,
//         [],
//         (err, transactions) => {
//             if (err) {
//                 console.error(err);
//                 return res.render('transactions', { transactions: [] });
//             }
//             res.render('transactions', { transactions });
//         }
//     );
// });


// app.post('/admin/delete-transaction', checkAdmin, (req, res) => {
//     const transactionId = req.body.transactionId;

//     if (!transactionId) {
//         return res.redirect('/admin/transactions');
//     }

//     db.run('DELETE FROM transactions WHERE id = ?', [transactionId], function (err) {
//         if (err) {
//             console.error(err);
//             return res.redirect('/admin/transactions');
//         }

//         //   console.log(`Transaction with ID ${transactionId} deleted.`);
//         res.redirect('/admin/transactions');
//     });
// });


// app.get('/admin/currencyrate', checkAdmin, (req, res) => {
//     db.all(`SELECT cName, cRate FROM currencyrate`, [], (err, rates) => {
//         if (err) {
//             console.error(err);
//             return res.status(500).send('An error occurred while retrieving the currency rates.');
//         }
//         btcRate = rates[0].cRate;
//         usdtRate = rates[1].cRate;

//         res.render('currencyrate', { rates });
//     });
// });



// app.post('/admin/currencyrate', checkAdmin, (req, res) => {
//     if (req.body.BTC_rate) {
//         app.locals.BTC_rate = req.body.BTC_rate;
//         db.run(`UPDATE currencyrate SET cRate = ? WHERE cName = 'BTC'`, [req.body.BTC_rate], function (err) {
//             if (err) {
//                 console.error(err);
//                 return res.status(500).send('An error occurred while updating the BTC rate.');
//             }
//         });
//     }

//     if (req.body.USDT_rate) {
//         app.locals.USDT_rate = req.body.USDT_rate;
//         db.run(`UPDATE currencyrate SET cRate = ? WHERE cName = 'USDT'`, [req.body.USDT_rate], function (err) {
//             if (err) {
//                 console.error(err);
//                 return res.status(500).send('An error occurred while updating the USDT rate.');
//             }
//         });
//     }


//     res.redirect('/admin/currencyrate');
// });



// app.post('/admin/add-user', checkAdmin, async (req, res) => {
//     const { firstName, lastName, phone, email, password } = req.body;

//     try {
//         db.get(`SELECT * FROM users WHERE phone = ? OR email = ?`, [phone, email], async (err, user) => {
//             if (err) {
//                 console.error(err);
//                 return res.status(500).send('An error occurred.');
//             }

//             if (user) {
//                 return res.status(400).send('Phone number or email already registered.');
//             }

//             const hashedPassword = await bcrypt.hash(password, 10);

//             db.run(`INSERT INTO users (firstName, lastName, phone, email, password) VALUES (?, ?, ?, ?, ?)`,
//                 [firstName, lastName, phone, email, hashedPassword], function (err) {
//                     if (err) {
//                         console.error(err);
//                         return res.status(500).send('An error occurred while adding the user.');
//                     }

//                     res.redirect('/admin/users');
//                 });
//         });
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('An unexpected error occurred.');
//     }
// });

// app.post('/admin/update-registration-status', (req, res) => {
//     const { registrationEnabled } = req.body;

//     db.run(`UPDATE configurations SET value = ? WHERE key = ?`, [registrationEnabled, 'registration_enabled'], (err) => {
//         if (err) {
//             console.error(err);
//             return res.status(500).send('An error occurred while updating the registration status.');
//         }
//         res.redirect('/admin/dashboard');
//     });
// });


app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
