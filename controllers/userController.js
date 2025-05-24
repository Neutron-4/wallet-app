require('dotenv').config();
const express = require('express');
const session = require('express-session');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const ejs = require('ejs')
const db = new sqlite3.Database('./data.sqlite');
const alertMessage = require('./alertController');


const generateID = (prefix) => {
    const length = 9;
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomString = prefix;

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        randomString += characters.charAt(randomIndex);
    }
    return randomString;
}



const isValidWithdrawalTime = () => {
    // const now = new Date();  // Get the current date and time
    const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });
    const date = new Date(now); // Convert the string back into a Date object

    const day = date.getDay(); // Get the current day (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const hour = date.getHours(); // Get the current hour (0-23)
    const minute = date.getMinutes(); // Get the current minute (0-59)

    const isWeekday = day >= 1 && day <= 6; // 1 (Monday) to 6 (Saturday)
    const isWithinTimeRange = (hour > 10 || (hour === 10 && minute >= 0)) && (hour < 19 || (hour === 19 && minute <= 30));

    return isWeekday && isWithinTimeRange;

}

// Maximum 4 times he can wothdraw in a Day
const isAbleToWithdraw = (user_id, callback) => {
    const todayDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });

    db.get(`SELECT COUNT(*) AS totalCount FROM transactions WHERE userId = ? AND uploaded_date = ? AND type = 'Withdraw'`, [user_id, todayDate], (err, row) => {
        if (err) {
            console.log(err);
            return callback(false);
        }


        if (row.totalCount < 4) {
            return callback(true);
        } else {
            return callback(false);
        }
    });
}


// Check Whethe user Crossed the daily Withdrawl limit or not !
const isWithdrawLimitCross = (req, callback) => {
    const todayDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });
    db.get(`SELECT value FROM configurations WHERE key = 'daily_withdraw_limit'`, [], (err, limit) => {
        if (err) {
            console.log(err);
            return callback(false); // Return false in case of error
        }

        db.get(`SELECT COUNT(amount) as totalCount FROM transactions WHERE userid = ? AND type = 'Withdraw' AND uploaded_date = ?`, [req.session.userId, todayDate], (err, count) => {
            if (err) {
                console.log(err);
                return callback(false); // Return false in case of error
            }

            if (count.totalCount >= limit.value) {
                return callback(true);
            } else {
                return callback(false);
            }
        });
    });
};



const homePage = (req, res) => {
    const userEmail = req.session.userEmail || null;
    if (userEmail) {
        db.get(`SELECT balance,usdtBalance,btcBalance FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
            if (err || !user) {
                console.error(err || 'User not found.');
                return res.status(500).send("Error loading user data.");
            }

            res.render('index', { userEmail, userName: req.session.username, balance: user.balance, usdtBalance: user.usdtBalance, btcBalance: user.btcBalance });
        });
    } else {
        res.render('index', { userEmail, userName: req.session.username, balance: null, usdtBalance: null, btcBalance: null });
    }
}

const contactus = (req, res) => {
    const userEmail = req.session.userEmail || null;
    if (userEmail) {
        db.get(`SELECT balance,usdtBalance,btcBalance FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
            if (err || !user) {
                console.error(err || 'User not found.');
                return res.status(500).send("Error loading user data.");
            }
            res.render('contact-us', { userEmail, userName: req.session.username, balance: user.balance, usdtBalance: user.usdtBalance, btcBalance: user.btcBalance });
        });
    } else {
        res.render('contact-us', { userEmail: req.session.userEmail, userName: req.session.username, balance: null, usdtBalance: null, btcBalance: null });
    }
}

const postcontactus = (req, res) => {
    const { name, subject, email, message } = req.body;

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    const mailOptions = {
        from: process.env.SMTP_USER,
        to: email,
        subject: subject,
        html: '<p>Thanks for contacting</p>',
    };
    ejs.renderFile('./views/mailTemplate/contactMail.ejs', { email: email, subject: subject, name: name, message: message }, (err, contactMail) => {
        if (err) {
            console.error('Error rendering email template:', err);
        } else {
            mailOptions.html = contactMail;
            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    console.error('Error sending verification email: ', err);
                } else {
                    // console.log('Verification email sent: ' + info.response);
                }
            });
        }
    });
    res.render('contact-us',)
}


const policy = (req, res) => {
    const userEmail = req.session.userEmail || null;
    if (userEmail) {
        db.get(`SELECT balance,usdtBalance,btcBalance FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
            if (err || !user) {
                console.error(err || 'User not found.');
                return res.status(500).send("Error loading user data.");
            }
            res.render('privacy-policy', { userEmail, balance: user.balance, usdtBalance: user.usdtBalance, btcBalance: user.btcBalance });
        });
    } else {
        res.render('privacy-policy', { userEmail, balance: null, usdtBalance: null, btcBalance: null });
    }
}

const faqs = (req, res) => {
    const userEmail = req.session.userEmail || null;

    if (userEmail) {
        db.get(`SELECT balance,usdtBalance,btcBalance FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
            if (err || !user) {
                console.error(err || 'User not found.');
                return res.status(500).send("Error loading user data.");
            }

            res.render('faqs', {
                userEmail: req.session.userEmail,
                userName: req.session.username,
                balance: user.balance,
                usdtBalance: user.usdtBalance,
                btcBalance: user.btcBalance
            });
        });
    } else {
        res.render('faqs', {
            userEmail: null,
            balance: null,
            usdtBalance: null,
            btcBalance: null
        });
    }
}


const signup = async (req, res) => {
    const { firstName, lastName, phone, email, password, username } = req.body;
    const refferalcode = req.body.refferalcode || null;

    db.get(`SELECT value FROM configurations WHERE key = ?`, ['registration_enabled'], async (err, row) => {
        if (err) {
            console.error(err);
            return res.render('sign-up', alertMessage.errorOccurred);
        }

        if (row && row.value === 'false') {
            return res.render('sign-up', alertMessage.registrationDisabled);
        }

        db.get(`SELECT * FROM users WHERE phone = ? OR email = ? OR username = ?`, [phone, email, username], async (err, user) => {
            if (err) {
                console.error(err);
                return res.render('sign-up', alertMessage.errorOccurred);
            }

            if (user) {
                if (username === user.username) {
                    return res.render('sign-up', alertMessage.usernameAlreadyExist);
                }
                if (phone === user.phone) {
                    return res.render('sign-up', alertMessage.phonenoAlreadyExist);
                }
                return res.render('sign-up', alertMessage.userAlreadyRegistered);
            }

            try {
                const hashedPassword = await bcrypt.hash(password, 10);
                const verificationToken = crypto.randomBytes(32).toString('hex');
                const verificationLink = `${process.env.BASE_URL}verify-account?token=${verificationToken}`;

                db.run(
                    `INSERT INTO users (firstName, lastName, phone, email, password, username, resetToken,refer_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [firstName, lastName, phone, email, hashedPassword, username, verificationToken, refferalcode],
                    (err) => {
                        if (err) {
                            console.error(err);
                            return res.render('sign-up', alertMessage.errorOccurred);
                        }

                        res.render('sign-in', alertMessage.verifyEmailReminder);

                        process.nextTick(() => {
                            const transporter = nodemailer.createTransport({
                                host: process.env.SMTP_HOST,
                                port: 587,
                                secure: false,
                                auth: {
                                    user: process.env.SMTP_USER,
                                    pass: process.env.SMTP_PASS,
                                },
                            });

                            const mailOptions = {
                                from: process.env.SMTP_USER,
                                to: email,
                                subject: 'Verify Your Account',
                            };

                            ejs.renderFile('./views/mailTemplate/mailVerify.ejs', { verifyLink: verificationLink }, (err, verifyPage) => {
                                if (err) {
                                    console.error('Error rendering email template:', err);
                                } else {
                                    mailOptions.html = verifyPage;

                                    transporter.sendMail(mailOptions, (err, info) => {
                                        if (err) {
                                            console.error('Error sending verification email: ', err);
                                        } else {
                                            // console.log('Verification email sent: ' + info.response);
                                        }
                                    });
                                }
                            });
                        });
                    }
                );
            } catch (error) {
                console.error(error);
                return res.render('sign-up', alertMessage.errorOccurred);
            }
        });
    });
};


const verifyAccount = (req, res) => {
    const { token } = req.query;

    db.get('SELECT * FROM users WHERE resetToken = ?', [token], async (err, user) => {

        if (err) {
            console.error(err);
            return res.render('sign-in', alertMessage.contactAdminError);
        }

        if (!user) {
            return res.render('sign-in', alertMessage.invalidToken);
        }

        db.run(`UPDATE users SET verifiedStatus = 1, resetToken = NULL WHERE resetToken = ?`, [token], (err) => {
            if (err) {
                console.error(err);
                return res.render('sign-in', alertMessage.contactAdminError);
            }

            return res.render('sign-in', alertMessage.emailVerified);
        });
    });
}

const resendVerificationMail = (req, res) => {
    const email = req.session.userEmail;
    const username = req.session.username;


    db.get(`SELECT * FROM users WHERE email = ? OR username = ?`, [email, username], (err, user) => {
        if (err) {
            console.error(err);
            return res.render('sign-up', alertMessage.databaseError);
        }
        if (!user) {
            return res.render('sign-up', alertMessage.emailNotRegistered);
        }

        try {
            const verificationToken = user.resetToken;
            if (!verificationToken) {
                return res.render('sign-up', alertMessage.tokenRequired);
            }

            const verificationLink = `${process.env.BASE_URL}verify-account?token=${verificationToken}`;

            res.render('sign-in', { showAlert: true, alertMessage: `Verification mail sent to ${user.email}`, resendMail: false, alertType: 'info' });

            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: 587,
                secure: false,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });

            ejs.renderFile('./views/mailTemplate/mailVerify.ejs', { verifyLink: verificationLink }, (err, verifyPage) => {
                if (err) {
                    console.error('Error rendering email template:', err);
                    return res.render('sign-up', alertMessage.contactAdminError);
                }

                const mailOptions = {
                    from: process.env.SMTP_USER,
                    to: email,
                    subject: 'Verify Your Account',
                    html: verifyPage
                };

                transporter.sendMail(mailOptions, (err, info) => {
                    if (err) {
                        console.error('Error sending verification email: ', err);
                        return res.render('sign-in', alertMessage.errorSendingEmail);
                    }

                });
            });
        } catch (error) {
            console.error(error);
            return res.render('sign-up', alertMessage.errorOccurred);
        }
    });
}

const postSignIn = async (req, res) => {
    const { emailOrUsername, password } = req.body;
    if (req.session.userId) {
        res.redirect('/');
    }

    const query = `SELECT * FROM users WHERE email = ? OR username = ?`;
    db.get(query, [emailOrUsername, emailOrUsername], async (err, user) => {

        if (err) {
            console.error(err);
            return res.render('sign-in', alertMessage.errorOccurred);
        }

        if (!user) {
            return res.render('sign-in', alertMessage.userNotFound);
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.render('sign-in', alertMessage.wrongLoginCredentials);
        }

        if (user.verifiedStatus === 0) {
            return res.render('sign-in', alertMessage.emailNotVerified);
        }

        req.session.userId = user.id;
        req.session.userEmail = user.email;
        req.session.username = user.username;
        req.session.balance = user.balance || null;
        req.session.usdtbal = user.usdtBalance || null;
        req.session.btcbal = user.btcBalance || null;


        res.render('index', { userEmail: user.email, userName: req.session.username, usdtBalance: user.usdtBalance, btcBalance: user.btcBalance, balance: user.balance, showAlert: true, alertMessage: 'Signed in successfully !', alertType: 'success', });

    });
}


const changepassword = (req, res) => {
    db.get(`SELECT balance,usdtBalance,btcBalance FROM users WHERE id = ?`, [req.session.userId], (err, user) => {

        const userEmail = req.session.userEmail || null;
        res.render('change-password', { userEmail, balance: user.balance, usdtBalance: user.usdtBalance, btcBalance: user.btcBalance });
    })
}
const postchangePassword = async (req, res) => {
    const userEmail = req.session.userEmail || null;
    const { email, currentPassword, newPassword, confirmNewPassword } = req.body;

    db.get(`SELECT * FROM users WHERE id = ?`, [req.session.userId], async (err, user) => {
        if (err || !user || !(await bcrypt.compare(currentPassword, user.password))) {
            console.error("Incorrect current password");
            return res.render('change-password', alertMessage.cpIncorrectPassword);
        }

        if (newPassword !== confirmNewPassword) {
            return res.render('change-password', alertMessage.cpNewAndConfirmPassUnmatch)
        }

        if (email) {
            db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, existingUser) => {
                if (err) {
                    console.error(err);
                    return res.render('change-password', alertMessage.errorOccurred);
                }
                if (existingUser && existingUser.id !== user.id) {
                    return res.render('chnage-password', cpEmailAlreadySet);
                }

                const hashedNewPassword = await bcrypt.hash(newPassword, 10);
                db.run(`UPDATE users SET email = ?, password = ?,verifiedStatus=0 WHERE id = ?`,
                    [email, hashedNewPassword, req.session.userId], (err) => {
                        if (err) {
                            console.error(err);
                            return res.render('change-password', alertMessage.contactAdminError);
                        }
                        res.redirect('/');
                    });
            });
        } else {
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);
            db.run(`UPDATE users SET password = ? WHERE id = ?`,
                [hashedNewPassword, req.session.userId], (err) => {
                    if (err) {
                        console.error(err);
                        return res.render('change-password', alertMessage.contactAdminError);
                    }
                    res.render('change-password', alertMessage.cpInformationUpdated);
                });
        }
    });
}

const deposit = (req, res) => {
    db.get(`SELECT balance,usdtBalance,btcBalance FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
        if (err || !user) {
            console.error(err || 'User not found.');
            return res.status(500).send("Error loading user data.");
        }
        db.all(`SELECT * FROM transactions WHERE userId = ?`, [req.session.userId], (err, transactions) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Error loading transactions.");
            }
            db.all(`SELECT method, details FROM payment_methods`, (err, paymentMethods) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send("Error loading payment methods.");
                }
                db.all(`SELECT * FROM currency_network`, [], (err, network) => {
                    if (err) {
                        console.log(err);
                        return res.status(500).send("Error loading networks.")
                    }
                    console.log(user);

                    res.render('user/deposit', {
                        userEmail: req.session.userEmail,
                        balance: user.balance,
                        usdtBalance: user.usdtBalance,
                        btcBalance: user.btcBalance,
                        transactions,
                        transactionId: req.query.transactionId,
                        paymentMethods,
                        usdtRate: usdtRate_Deposit,
                        btcRate: btcRate_Deposit,
                        network,
                    });
                })
            });
        });
    });
}

const withdraw = (req, res) => {
    db.get(`SELECT balance,usdtBalance,btcBalance FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
        if (err || !user) {
            console.error(err || 'User not found.');
            return res.status(500).send("Error loading user data.");
        }

        db.all(`SELECT * FROM transactions WHERE userId = ?`, [req.session.userId], (err, transactions) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Error loading transactions.");
            }

            db.all(`SELECT method, details FROM payment_methods`, (err, paymentMethods) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send("Error loading payment methods.");
                }

                const cryptoMethods = paymentMethods.filter(({ method }) =>
                    ['BTC', 'ETH', 'USDT', 'DOGE', 'XRP', 'SOL', 'LTC'].includes(method)
                );
                const otherMethods = paymentMethods.filter(({ method }) =>
                    !['BTC', 'ETH', 'USDT', 'DOGE', 'XRP', 'SOL', 'LTC'].includes(method)
                );


                res.render('user/withdraw', {
                    userEmail: req.session.userEmail,
                    balance: user.balance,
                    usdtBalance: user.usdtBalance,
                    btcBalance: user.btcBalance,
                    transactions,
                    transactionId: req.query.transactionId,
                    paymentMethods,
                    cryptoMethods,
                    otherMethods,
                    usdtRate: usdtRate_Withdraw,
                    btcRate: btcRate_Withdraw
                });
            });
        });
    });
}


const postdeposit = (req, res) => {
    const { amount, payment_method, walletHash, network } = req.body;
    const proof = req.file ? req.file.filename : null;
    const date = new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' })
    const time = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata' })
    const formattedDate = `${date} ${time}`;

    if (payment_method === 'Crypto' && !walletHash) {
        return res.render('deposit', alertMessage.walletAddressRequired);
    }

    if (payment_method === 'USDT' && !network) {
        return res.render('deposit', alertMessage.networkSelectRequired);
    }

    let t_id = generateID('DPT');

    db.get(`SELECT id FROM transactions WHERE id = ?`, [t_id], (err, transc) => {
        if (err) {
            console.error(err);
            return res.send('Error while checking transaction ID existence. Try again later.');
        }

        if (transc) {
            console.log("Duplicate transaction ID encountered.");
            t_id = generateID('DPT'); // regenerate if ID is taken
        }

        db.run(
            `INSERT INTO transactions (userId, id, amount, proof, payment_method, wallet_hash, network, uploaded_date, uploaded_time, uploaded_on, type) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Deposit')`,
            [req.session.userId, t_id, amount, proof, payment_method, walletHash || null, network || null, date, time, formattedDate],
            function (err) {
                if (err) {
                    console.error(err);
                    return res.redirect('/user/deposit');
                }
                res.redirect(`/user/deposit?transactionId=${t_id}`);
            }
        );
    });
};


const postwithdraw = (req, res) => {
    const { amount, payment_method, accountHolderName, bankAccount, ifsc, upiId, usdtWallet, walletHash, network } = req.body;

    const proof = req.file ? req.file.filename : null;
    const date = new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' }) // Current date in DD/MM/YY format
    const time = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata' }) // Current time
    const formattedDate = date + ' ' + time;


    db.all(`SELECT * FROM transactions WHERE userId = ?`, [req.session.userId], (err, transactions) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error loading transactions.");
        }
        db.get(`SELECT balance,btcBalance,usdtBalance,email FROM users WHERE id = ?`, [req.session.userId], (err, user) => {

            //Withdrawl time limit Monday to Saturday
            if (!isValidWithdrawalTime()) {
                return res.render('user/withdraw', { userEmail: user.email, balance: user.balance, usdtBalance: user.usdtBalance, btcBalance: user.btcBalance, usdtRate: usdtRate_Withdraw, btcRate: btcRate_Withdraw, showAlert: true, alertMessage: 'Withdrawals are only allowed between 10:00 AM and 7:30 PM (Monday to Saturday).', alertType: 'info', transactions });
            }

            // Maximum 4 times he can wothdraw in a Day
            isAbleToWithdraw(req.session.userId, (valid) => {
                if (!valid) {
                    return res.render('user/withdraw', { usdtRate: usdtRate_Withdraw, btcRate: btcRate_Withdraw, showAlert: true, alertMessage: 'Daily Withdraw limit Crosses you can withdraw only 4 in a Day.', alertType: 'info', transactions });
                }
            });

            // Daily Withdraw limit Check
            isWithdrawLimitCross(req, (result) => {
                if (result) {
                    return res.render('user/withdraw', { usdtRate: usdtRate_Withdraw, btcRate: btcRate_Withdraw, showAlert: true, alertMessage: 'Your Daily Withdtaw limit Crossed !', alertType: 'info', transactions });
                }
            });



            if (payment_method === 'Bank') {
                if (!accountHolderName || !bankAccount || !ifsc) {
                    return res.render('user/withdraw', { usdtRate: usdtRate_Withdraw, btcRate: btcRate_Withdraw, showAlert: true, alertMessage: 'Bank Details required', alertType: 'error', transactions });
                }
                paymentDetails = `Account Holder: ${accountHolderName}, Bank Account: ${bankAccount}, IFSC: ${ifsc}`;
            } else if (payment_method === 'UPI') {
                if (!upiId) {
                    return res.render('user/withdraw', { usdtRate: usdtRate_Withdraw, btcRate: btcRate_Withdraw, showAlert: true, alertMessage: 'UPI ID is required.', alertType: 'error', transactions });
                }
                paymentDetails = `UPI ID: ${upiId}`;
            } else if (payment_method === 'USDT' || payment_method === 'BTC') {
                if (!(usdtWallet || walletHash)) {
                    return res.render('user/withdraw', { usdtRate: usdtRate_Withdraw, btcRate: btcRate_Withdraw, showAlert: true, alertMessage: 'Wallet Address Required', alertType: 'error', transactions });
                }
                paymentDetails = `Wallet Address: ${usdtWallet || walletHash}`;
            } else {
                return res.render('user/withdraw', { usdtRate: usdtRate_Withdraw, btcRate: btcRate_Withdraw, showAlert: true, alertMessage: 'Invalid Payment Method', alertType: 'error', transactions });
            }

            let balanceType = '';
            if (payment_method === 'UPI' || payment_method === 'Bank') {
                balanceType = 'balance';
            } else if (payment_method === 'BTC') {
                balanceType = 'btcBalance';
            } else if (payment_method === 'USDT') {
                balanceType = 'usdtBalance';
            }

            db.get(`SELECT ${balanceType} FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
                if (err || !user) {
                    console.error(err || 'User not found.');
                    return res.status(500).send("Error processing withdrawal.");
                }

                if (user[balanceType] < amount) {
                    return res.render('user/withdraw', { btcRate: btcRate_Withdraw, usdtRate: usdtRate_Withdraw, showAlert: true, alertMessage: 'Insufficient Balance', alertType: 'error', transactions });
                }

                const t_id = generateID('WTD');

                db.get(`SELECT id FROM transactions WHERE id = ?`, [t_id], (err, transc) => {
                    if (err) {
                        console.log(err);
                        return res.send('Error while checking transaction ID existence. Try again later.');
                    }

                    if (transc) {
                        console.log("Duplicate transaction ID encountered. Regenerating.");
                        return postwithdraw(req, res);
                    }
                    const deductionAmount = (amount * 0.12) + (amount * 0.03);
                    console.log(deductionAmount);

                    db.run(
                        `INSERT INTO transactions (userId, id, amount,deductionAmount, proof, payment_method, wallet_hash, network, uploaded_date,uploaded_time,uploaded_on, type) VALUES (?, ?, ?, ?,?, ?, ?, ?, ?, ?, ?, 'Withdraw')`,
                        [req.session.userId, t_id, amount, deductionAmount, proof, payment_method, walletHash || null, network || null, date, time, formattedDate],
                        function (err) {
                            if (err) {
                                console.error(err);
                                return res.redirect('/user/withdraw');
                            }

                            res.redirect(`/user/withdraw?transactionId=${this.lastID}`);
                        }
                    );
                });
            });
        });
    });
};

const resetpassword = (req, res) => {
    const { token } = req.query;

    db.get(
        'SELECT * FROM users WHERE resetToken = ? AND resetTokenExpires > ?',
        [token, Date.now()],
        (err, user) => {
            if (err || !user) {
                return res.status(400).send('Invalid or expired token');
            }

            const userEmail = user.email;
            res.render('reset-password', { token, userEmail });
        }
    );
}

const postresetpassword = async (req, res) => {
    const { token, password } = req.body;

    db.get(
        'SELECT * FROM users WHERE resetToken = ? AND resetTokenExpires > ?',
        [token, Date.now()],
        async (err, user) => {
            if (err || !user) {
                return res.status(400).send('Invalid or expired token');
            }

            try {
                const hashedPassword = await bcrypt.hash(password, 10);

                db.run(
                    'UPDATE users SET password = ?, resetToken = NULL, resetTokenExpires = NULL WHERE id = ?',
                    [hashedPassword, user.id],
                    (err) => {
                        if (err) {
                            return res.status(500).send('Server Error');
                        }

                        res.send('Password updated successfully.');
                    }
                );
            } catch (error) {
                console.error('Error hashing password:', error);
                res.status(500).send('Server Error');
            }
        }
    );
}

const forgotPassword = (req, res) => {
    res.render('forgot-password');
}

const postforgotPassword = (req, res) => {
    const { email } = req.body;

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) {
            console.error(err);
            return res.render('forgot-password', alertMessage.errorOccurred);
        }

        if (!user) {
            return res.render('forgot-password', alertMessage.emailNotRegistered);
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const baseUrl = process.env.BASE_URL;
        const resetLink = `${baseUrl}reset-password?token=${resetToken}`;

        db.run(
            `UPDATE users SET resetToken = ?, resetTokenExpires = ? WHERE email = ?`,
            [resetToken, Date.now() + 3600000, email],
            (err) => {
                if (err) {
                    console.error(err);
                    return res.render('forgot-password', alertMessage.errorOccurred);
                }

                res.render('forgot-password', alertMessage.emailsent);

                process.nextTick(() => {
                    ejs.renderFile('./views/mailTemplate/forgotmailpass.ejs', { resetLink }, (err, htmlContent) => {
                        if (err) {
                            console.error('Error rendering email template:', err);
                            return;
                        }

                        const transporter = nodemailer.createTransport({
                            host: process.env.SMTP_HOST,
                            port: 587,
                            secure: false,
                            auth: {
                                user: process.env.SMTP_USER,
                                pass: process.env.SMTP_PASS,
                            },
                        });

                        const mailOptions = {
                            from: process.env.SMTP_USER,
                            to: email,
                            subject: 'Password Reset Request',
                            html: htmlContent,
                        };

                        transporter.sendMail(mailOptions, (err, info) => {
                            if (err) {
                                console.error('Error sending reset email:', err);
                            } else {
                                console.log('Password reset email sent: ' + info.response);
                            }
                        });
                    });
                });
            }
        );
    });
}

const logout = (req, res) => {
    if (!req.session.userEmail) {
        return res.redirect('/');
    }
    req.session.destroy((err) => {
        if (err) {
            return console.error(err);
        }
        return res.render('index', alertMessage.logout);
    });
}

const mytransactions = (req, res) => {
    const userId = req.session.userId;

    if (!userId) {
        return res.status(400).send("User not logged in.");
    }

    db.get(`SELECT balance,btcBalance,usdtBalance, email FROM users WHERE id = ?`, [userId], (err, user) => {
        if (err) {
            console.error("Error fetching user details:", err);
            return res.status(500).send("Unable to fetch user details.");
        }

        if (!user) {
            return res.status(404).send("User not found ! Sign in or Contact Support team .");
        }

        db.all(
            `SELECT * FROM transactions WHERE userId = ? ORDER BY uploaded_on DESC`,
            [userId],
            (err, transactions) => {
                if (err) {
                    console.error("Error fetching transactions:", err);
                    return res.status(500).send("Unable to fetch transactions.");
                }

                res.render('mytransactions', {
                    transactions,
                    balance: user.balance,
                    usdtBalance: user.usdtBalance,
                    btcBalance: user.btcBalance,
                    userEmail: user.email || null,
                });
            }
        );
    });
}


const myinvestment = (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        return res.status(400).send("User not logged in.");
    }

    db.get(`SELECT balance,usdtBalance,btcBalance, email FROM users WHERE id = ?`, [userId], (err, user) => {
        if (err) {
            console.error("Error fetching user details:", err);
            return res.status(500).send("Unable to fetch user details.");
        }

        if (!user) {
            return res.status(404).send("User not found.");
        }
        db.all(
            `SELECT p.transaction_id,p.product_id, p.uploaded_date, p.expiry_date, p.id, p.status, b.title, b.daily_income, b.category, p.quantity
             FROM products p
             JOIN blogposts b ON p.product_id = b.blogid
             WHERE p.user_id = ?`,
            [userId],
            (err, investment) => {
                if (err) {
                    console.error("Error fetching transactions:", err);
                    return res.status(500).send("Unable to fetch transactions.");
                }

                res.render('my-investment', {
                    investment,
                    balance: user.balance,
                    usdtBalance: user.usdtBalance,
                    btcBalance: user.btcBalance,
                    userEmail: user.email || null,
                });
            }
        );

    });
}



const genReferral = (req, res) => {
    const userid = req.session.userId;
    const newref = generateID('');

    // First, check if the generated referral code already exists
    db.get(`SELECT referral_code FROM users WHERE referral_code = ?`, [newref], (err, existingRow) => {
        if (err) {
            console.error(err);
            return res.status(500).send("An error occurred.");
        }

        if (existingRow) {
            return genReferral(req, res);
        }

        // Now fetch the user's information to check if they already have a referral code
        db.get(`SELECT referral_code FROM users WHERE id = ?`, [userid], (err, userRow) => {
            if (err) {
                console.error(err);
                return res.status(500).send("An error occurred.");
            }

            if (userRow && userRow.referral_code) {
                return res.render('refferal', { referral_code: userRow.referral_code, showAlert: true, alertMessage: 'Already joined to Refferal Program', alertType: 'info', });
            }

            // Insert the new referral code into the database
            db.run(`UPDATE users SET referral_code = ? WHERE id = ?`, [newref, userid], (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send("An error occurred while creating the referral code.");
                }

                return res.render('refferal', { referral_code: userRow.referral_code, showAlert: true, alertMessage: 'Successfully Joined to the Refferal Program', alertType: 'info', });
                // return res.send('Referral code created successfully');
            });
        });
    });
};


const dailyIncome = (req, res) => {
    db.get(`SELECT balance,btcBalance,usdtBalance,email FROM users WHERE id = ?`, [req.session.userId], (err, user) => {

        db.all(`SELECT * FROM blogposts WHERE ispublic = 1 ORDER BY created_on DESC`, (err, posts) => {
            if (err) {
                console.log(err);
                return res.status(500).send('Database error occurred.');
            }
            res.render('daily-income', { userName: req.session.username, balance: user.balance, usdtBalance: user.usdtBalance, btcBalance: user.btcBalance, userEmail: req.session.userEmail, posts: posts });
        });
    })

};


const refferal = (req, res) => {
    const userEmail = req.session.userEmail || null;
    if (userEmail) {
        db.get(`SELECT balance,usdtBalance,btcBalance,referral_code FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
            if (err || !user) {
                console.error(err || 'User not found.');
                return res.status(500).send("Error loading user data.");
            }

            db.get(`SELECT COUNT(*) as totalRef FROM users WHERE refer_by = ?`, [user.referral_code], (err, ref) => {
                if (err) {
                    return res.status(500).send("Error loading referal data.");
                }
                let level = 1;
                if (ref.totalRef >= 1050) {
                    level = 6
                } else if (ref.totalRef >= 130) {
                    level = 5;
                } else if (ref.totalRef >= 60) {
                    level = 4;
                } else if (ref.totalRef >= 15) {
                    level = 3;
                } else if (ref.totalRef >= 6) {
                    level = 2;
                } else {
                    level = 1;
                }


                res.render('refferal', { refLevel: level, totalref: ref.totalRef, userEmail, userName: req.session.username, balance: user.balance, usdtBalance: user.usdtBalance, btcBalance: user.btcBalance, referral_code: user.referral_code });
            });
        });
    }
}

const dailyProductBuy = (req, res) => {
    const prodId = req.params.product
    db.get(`SELECT balance,usdtBalance,btcBalance from users WHERE id = ?`, [req.session.userId], (err, user) => {

        db.all(`SELECT * FROM blogposts WHERE blogid = ?`, [prodId], (err, product) => {
            if (err) {
                console.log(err);
                return res.status(500).send('Database error occurred.');
            }
            if (user) {
                return res.render('dailyProduct', { userEmail: req.session.userEmail, products: product, balance: user.balance, usdtBalance: user.usdtBalance, btcBalance: user.btcBalance });
            }
            return res.render('dailyProduct', { userEmail: req.session.userEmail, products: product, balance: '520', usdtBalance: null, btcBalance: null });
        });
    })

}


const buyProduct = (req, res) => {
    // Extracting data from the form submission (POST request)
    const { payment_method, quantity, total, price_per_item, productid } = req.body;
    const proof = req.file ? req.file.filename : null;
    const walletHash = req.body.walletHash || null
    const network = req.body.network || null
    // Log the request body for debugging purposes

    // Ensure that required fields are available
    if (!quantity || !total || !price_per_item) {
        return res.render('daily-income', alertMessage.fillAllDetails);
    }

    // Generate the current date and time for the purchase
    const date = new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' }) // Current date in DD/MM/YY format
    const time = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata' }) // Current time
    const buy_at = date + ' ' + time;

    // Static or placeholder values (You might replace with dynamic data in a real-world scenario)
    const status = 'Pending';
    const transaction_id = generateID('P');  // Simulate a transaction ID (use a real method for production)
    db.get(`SELECT id FROM products WHERE id = ?`, [transaction_id], (err, transc) => {
        if (err) {
            console.error(err);
            return res.send('Error while checking transaction ID existence. Try again later.');
        }

        if (transc) {
            console.log("Duplicate transaction ID encountered.");
            transaction_id = buyProduct(req, res); // regenerate if ID is taken
        }
        // Set the expiry date as 1 month from the current date based on the quantity (this is a simple example)
        const currentDate = new Date();

        const date = new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' }) // Current date in DD/MM/YY format
        const time = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata' }) // Current time
        const formattedDate = date + ' ' + time;

        const expiryDate = new Date(currentDate);
        const expiryTime = new Date(currentDate);

        expiryDate.setMonth(currentDate.getMonth() + 12);
        expiryTime.setMonth(currentDate.getMonth() + 12);

        const formattedExpiryDate = expiryDate.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
        const formattedExpiryTime = expiryTime.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata' });

        // Construct the SQL query for inserting the new product into the 'products' table
        const query = `
        INSERT INTO products (user_id, amount,proof, product_id, buy_at, quantity, status, transaction_id, expiry_date,expiry_time,uploaded_date,uploaded_time,wallet_hash,payment_method,network)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?,?,?,?)
    `;

        // Set up the parameters to pass into the query
        const params = [
            req.session.userId,  // Assume user_id is stored in the session
            total,
            proof,             // Total price from the form
            productid,      // Price per item from the form
            buy_at,              // Date and time of purchase
            quantity,            // Quantity from the form
            status,              // Default status 'Pending'
            transaction_id,      // Simulated transaction ID (use a real one in production)
            formattedExpiryDate,         // Expiry date (calculated above)w
            formattedExpiryTime,
            date,
            time,
            walletHash,
            payment_method,
            network
            // Expiry date (calculated above)w
        ];

        // Execute the query to insert the purchase into the database
        db.run(query, params, function (err) {
            if (err) {
                console.error("Error inserting product", err);
                return res.status(500).json({ error: 'Database error' });
            }

            // After inserting the product, retrieve the latest posts and user data
            db.all(`SELECT * FROM blogposts WHERE ispublic = 1 ORDER BY created_on DESC`, (err, posts) => {
                if (err) {
                    console.log(err);
                    return res.status(500).send('Database error occurred.');
                }


                db.get(`SELECT balance,usdtBalance,btcBalance FROM users WHERE id = ?`, [req.session.userId], (err, user) => {

                    // After processing, render the response with the necessary data
                    return res.render('daily-income', {
                        userEmail: req.session.userEmail,
                        balance: user.balance,
                        usdtBalance: user.usdtBalance,
                        btcBalance: user.btcBalance,
                        showAlert: true,
                        alertMessage: 'Ordered. Our team will review it!',
                        resendMail: false,
                        alertType: 'success',
                        posts: posts
                    });
                });
            });
        });
    })
};



const checkout = (req, res) => {
    db.get(`SELECT balance,usdtBalance,btcBalance FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
        if (err || !user) {
            console.error(err || 'User not found.');
            return res.status(500).send("Error loading user data.");
        }
        db.all(`SELECT method, details FROM payment_methods`, (err, paymentMethods) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Error loading payment methods.");
            }
            db.get(`SELECT * FROM blogposts where blogid = ?`, [req.params.id], (err, product) => {
                if (err) {
                    console.log(err);
                    return res.status(500).send("Error loading networks.")
                }
                db.all(`SELECT * FROM currency_network`, [], (err, network) => {
                    if (err) {
                        console.log(err);
                        return res.status(500).send("Error loading networks.")
                    }
                    res.render('dailyProduct', {
                        userEmail: req.session.userEmail,
                        balance: user.balance,
                        usdtBalance: user.usdtBalance,
                        btcBalance: user.btcBalance,
                        paymentMethods,
                        usdtRate: usdtRate_Deposit,
                        btcRate: btcRate_Deposit,
                        products: product,
                        network
                    });
                })
            });
        });
    });
};


const checkoutConfirm = async (req, res) => {
    db.get(`SELECT balance, usdtBalance, btcBalance,email FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
        if (err || !user) {
            console.error(err || 'User not found.');
            return res.status(500).send("Error loading user data.");
        }

        const { productid, quantity, useBalance, total, price_per_item } = req.body;
        let offer = '';

        // Handle case when using balance
        if (useBalance) {
            if (user.balance < total) {
                return res.render('index', {
                    userName: req.session.username,
                    userEmail: user.email,
                    balance: (user.balance + 0), // New balance after exchange
                    usdtBalance: user.usdtBalance,
                    btcBalance: user.btcBalance ,
                    showAlert: true, alertMessage: `Insufficient Balance`, alertType: 'error'
                });
            }

            let transaction_id = generateID('P');  // Simulate a transaction ID (use a real method for production)

            // Check if the transaction ID already exists
            db.get(`SELECT id FROM products WHERE transaction_id = ?`, [transaction_id], (err, transc) => {
                if (err) {
                    console.error(err);
                    return res.send('Error while checking transaction ID existence. Try again later.');
                }

                if (transc) {
                    console.log("Duplicate transaction ID encountered.");
                    transaction_id = generateID('P'); // Regenerate if ID is taken
                }

                const currentDate = new Date();
                const date = new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' }) // Current date in DD/MM/YY format
                const time = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata' }) // Current time
                const formattedDate = `${date} ${time}`;

                // Calculate expiry date and time (1 month from current date)
                const expiryDate = new Date(currentDate);
                const expiryTime = new Date(currentDate);
                expiryDate.setMonth(currentDate.getMonth() + 12);
                expiryTime.setMonth(currentDate.getMonth() + 12);


                const formattedExpiryDate = expiryDate.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
                const formattedExpiryTime = expiryTime.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata' });

                const query = `
                    INSERT INTO products (user_id, amount, product_id, buy_at, quantity, status, transaction_id, expiry_date, expiry_time, uploaded_date, uploaded_time, payment_method,remark)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)
                `;

                const params = [
                    req.session.userId,  // Assume user_id is stored in the session
                    total,                // Total price
                    productid,            // Product ID
                    formattedDate,        // Date and time of purchase
                    quantity,             // Quantity
                    'Complete',           // Status 'Complete'
                    transaction_id,       // Transaction ID
                    formattedExpiryDate,  // Expiry date
                    formattedExpiryTime,  // Expiry time
                    date,                 // Date (short format)
                    time,                 // Time (short format)
                    'Deposit Wallet',     // Payment method
                    'Invested from available balance' // Remark
                ];
                // Insert product into the database

                db.run(query, params, function (err) {
                    if (err) {
                        console.error("Error inserting product", err);
                        return res.status(500).json({ error: 'Database error' });
                    }
                    db.get(`SELECT daily_income FROM blogposts WHERE blogid = ?`, [productid], (err, prod) => {
                        if (err) {
                            console.log(err);
                        }
                        const oldBalance = user.balance;

                        // let amountAdd = (parseInt(prod.daily_income) * parseInt(quantity));
                        let offerPercent = 0
                        let newBalance = user.balance - total;
                        db.get(`SELECT COUNT(*) as totalProducts from products where user_id = ? AND status = 'Complete'`, [req.session.userId], (err, count) => {
                            console.log(count.totalProducts);

                            // Fetch completed products by the user
                            db.get(`SELECT COUNT(*) as totalProducts from products WHERE user_id = ? AND status = 'Complete'`, [req.session.userId], (err, count) => {
                                if (err) {
                                    console.error(err);
                                    return res.status(500).send("Error fetching user product count.");
                                }

                                // Fetch the offer details
                                db.get(`SELECT percentage, minimum_product FROM offers WHERE id = ?`, [prod.appliedOffer], (err, offer) => {
                                    if (err) {
                                        console.error(err || "Offer details not found.");
                                        return res.status(500).send("Error fetching offer details.");
                                    }

                                    // Check if the user qualifies for the offer
                                    if (offer && parseFloat(count.totalProducts) >= offer.minimum_product) {
                                        offerId = prod.appliedOffer;  // Set the offerId
                                        offerPercent = offer.percentage || 0
                                        // amountAdd = amount + (amount * (parseFloat(offer.percentage) / 100));  // Apply the offer percentage correctly
                                    }

                                    // newBalance = newBalance + amountAdd;  // Add the amount to newBalance


                                    // Update the use
                                    db.run(`UPDATE users SET balance = ? WHERE id = ?`, [newBalance, req.session.userId], (err) => {
                                        if (err) {
                                            console.log(err);
                                        }
                                        //     db.run(
                                        //         `INSERT INTO daily_Income_logs (user_id, product_id, old_balance, new_balance,amountAdded,offer, updated_date, updated_time, transaction_id) 
                                        //  VALUES (?, ?, ?, ?, ?,?, ?,?, ?)`,
                                        //         [req.session.userId, productid, oldBalance, newBalance, amountAdd, offerPercent, date, time, transaction_id],
                                        //         function (err) {
                                        //             if (err) {
                                        //                 console.log(err);
                                        //             }

                                        //         })
                                    })
                                })
                            })
                        })
                    })

                    // // Deduct the total balance from user's account
                    // db.get(`UPDATE users SET balance = balance - ? WHERE id = ?`, [total, req.session.userId], (err) => {
                    //     if (err) {
                    //         console.error(err);
                    //         return res.status(500).send('Error updating balance.');
                    //     }

                    // Update product status and remark
                    db.run(`UPDATE products SET status = 'Complete', remark = 'Invested from Available Balance !' WHERE transaction_id = ?`, [transaction_id], (err) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).send("Error updating transaction.");
                        }


                        // Fetch updated user data to show on the page
                        db.get(`SELECT balance, usdtBalance, btcBalance FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
                            if (err || !user) {
                                console.error(err || 'User not found.');
                                return res.status(500).send("Error loading user data.");
                            }
                            req.session.balance = user.balance;
                            db.all(
                                `SELECT p.transaction_id,p.product_id, p.uploaded_date, p.expiry_date, p.id, p.status, b.title, b.daily_income, b.category, p.quantity
                                     FROM products p
                                     JOIN blogposts b ON p.product_id = b.blogid
                                     WHERE p.user_id = ?`,
                                [req.session.userId],
                                (err, investment) => {
                                    if (err) {
                                        console.error("Error fetching transactions:", err);
                                        return res.status(500).send("Unable to fetch transactions.");
                                    }
                                    // Render the page with the updated data
                                    return res.render('my-investment', {
                                        balance: user.balance - total,
                                        btcBalance: user.btcBalance,
                                        usdtBalance: user.usdtBalance,
                                        userEmail: req.session.userEmail,
                                        showAlert: true,
                                        alertMessage: 'Purchased!',
                                        resendMail: false,
                                        alertType: 'success',
                                        investment
                                    });
                                });
                        })
                    });
                });
            });

        } else {
            // Handle case when balance is not being used
            db.all(`SELECT * FROM transactions WHERE userId = ?`, [req.session.userId], (err, transactions) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send("Error loading transactions.");
                }

                db.all(`SELECT method, details FROM payment_methods`, (err, paymentMethods) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).send("Error loading payment methods.");
                    }

                    db.all(`SELECT * FROM currency_network`, [], (err, network) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).send("Error loading networks.");
                        }

                        db.get(`SELECT * FROM blogposts WHERE blogid = ?`, [productid], (err, product) => {
                            if (err) {
                                console.error(err);
                                return res.status(500).send('Database error occurred.');
                            }

                            // Render the checkout page for the user to confirm purchase
                            res.render('productCheckout', {
                                userEmail: req.session.userEmail,
                                balance: user.balance,
                                usdtBalance: user.usdtBalance,
                                btcBalance: user.btcBalance,
                                paymentMethods: paymentMethods,
                                usdtRate: usdtRate_Deposit,
                                btcRate: btcRate_Deposit,
                                network: network,
                                products: product,
                                productid: productid,
                                quantity: quantity,
                                total: total,
                                price_per_item: price_per_item
                            });
                        });
                    });
                });
            });
        }
    });
}

const investmentDetails = (req, res) => {
    const transaction_id = req.params.id;
    db.get(`SELECT * FROM products WHERE transaction_id = ?`, [transaction_id], (err, order) => {
        if (err) {
            console.log(err);

        }
        db.get(`SELECT title FROM blogposts WHERE blogid = ?`, [order.product_id], (err, title) => {
            if (err) {
                console.error(err);
                return res.send('Error while checking transaction ID existence. Try again later.');
            }
            db.get(`SELECT balance, usdtBalance, btcBalance FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
                req.session.balance = user.balance;
                req.session.usdtBalance = user.usdtBalance;
                req.session.btcBalance = user.btcBalance;

                db.all(`SELECT  b.title, b.daily_income, d.product_id,d.old_balance,d.offer,d.amountAdded, d.new_balance, d.updated_date, d.updated_time FROM daily_Income_logs d JOIN blogposts b ON b.blogid = d.product_id WHERE d.transaction_id = ? ORDER BY d.updated_date DESC , d.updated_time DESC
`, [transaction_id], (err, logs) => {
                    if (err) {
                        console.error(err);
                        return res.send('Error while checking transaction ID existence. Try again later.');
                    }

                    db.get(`SELECT SUM(amountAdded) as totalEarn FROM daily_Income_logs WHERE transaction_id = ?`, [transaction_id], (err, total) => {
                        console.log(total, req.session.userId);

                        res.render('investment-details', { total: total.totalEarn, title, order, userEmail: req.session.userEmail, balance: user.balance, btcBalance: user.btcBalance, usdtBalance: user.usdtBalance, logs });
                    });
                });
            });
        })
    })
}

const dailyIncomeUpdateForAll = async (req, res) => {
    const date = new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' }) // Current date in DD/MM/YY format
    const time = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata' }) // Current time
    let completedOperations = 0;

    try {
        // Fetch products with 'Complete' status
        const products = await new Promise((resolve, reject) => {
            db.all(`
                SELECT product_id, transaction_id, user_id,uploaded_date,uploaded_time,expiry_date,expiry_time, quantity
                FROM products 
                WHERE status = 'Complete'
            `, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });


        if (products.length === 0) {
            return res.send('No products found with complete status');
        }

        // Begin transaction
        db.run('BEGIN TRANSACTION');

        // Process each product
        for (let product of products) {
            const { product_id: prodID, transaction_id: transacID, user_id: userID, uploaded_date: uploadedDate, uploaded_time: uploadedTime, expiry_date: expiryDate, quantity } = product;
            const expiryDateObj = new Date(expiryDate);
            const currentDateObj = new Date();

            const [day, month, year] = uploadedDate.split('/');
            const formattedDate = `${year}-${month}-${day}`; // Convert to YYYY-MM-DD format

            // Combine the reformatted date and uploaded_time
            const uploadedDateTime = new Date(`${formattedDate}T${uploadedTime}`);

            // Check if 24 hours have passed
            const timeElapsed = currentDateObj - uploadedDateTime; // Time difference in milliseconds
            if (timeElapsed < 24 * 60 * 60 * 1000) {
                // console.log(`Product ${prodID} has not completed 24 hours since upload.`);
                continue; // Skip products that haven't completed 24 hours
            }
            if (expiryDateObj < currentDateObj) {
                // console.log(`Product ${prodID} has expired and will be skipped.`);
                continue; // Skip expired products
            }

            // Fetch daily income for the product
            const singleProd = await new Promise((resolve, reject) => {
                db.get(`SELECT daily_income,appliedOffer FROM blogposts WHERE blogid = ?`, [prodID], (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                });
            });

            if (!singleProd) {
                // console.log(`No daily income found for product: ${prodID}`);
                continue; // Skip products with no daily income
            }

            // Fetch user balance
            const user = await new Promise((resolve, reject) => {
                db.get(`SELECT balance FROM users WHERE id = ?`, [userID], (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                });
            });

            if (!user) {
                // console.log(`No user found with ID: ${userID}`);
                continue; // Skip if no user found
            }


            const oldBalance = parseFloat(user.balance) || 0;  // Ensure oldBalance is a valid number
            const dailyIncome = parseFloat(singleProd.daily_income) || 0; // Ensure daily_income is a valid number
            const productQuantity = parseFloat(quantity) || 0; // Ensure quantity is a valid number

            let amount = dailyIncome * productQuantity;
            let amountAdd = amount;
            let offerPercent = 0  // Use a unique name for offerId
            let newBalance = oldBalance;  // Initial balance for the user
            // Check for the offer (10% increase if user has 3+ completed products)
            const count = await new Promise((resolve, reject) => {
                db.get(`SELECT COUNT(*) as totalProducts FROM products WHERE user_id = ? AND status = 'Complete'`, [userID], (err, count) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(count);
                    }
                });
            });

            const offer = await new Promise((resolve, reject) => {
                db.get(`SELECT percentage, minimum_product FROM offers WHERE id = ?`, [singleProd.appliedOffer], (err, offer) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(offer);
                    }
                });
            });


            // Check if the user qualifies for the offer
            if (offer && parseFloat(count.totalProducts) >= offer.minimum_product) {
                offerPercent = offer.percentage || 0
                amountAdd = amount + (amount * (parseFloat(offer.percentage) / 100));  // Apply the offer percentage correctly
            }

            newBalance = newBalance + amountAdd;  // Add the amount to newBalance

            // Insert log into the daily_Income_logs table
            await new Promise((resolve, reject) => {
                db.run(
                    `INSERT INTO daily_Income_logs (user_id, product_id, old_balance, new_balance, amountAdded, offer, updated_date, updated_time, transaction_id) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [userID, prodID, oldBalance, newBalance, amountAdd, offerPercent, date, time, transacID],
                    function (err) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    }
                );
            });

            // Update the user's balance in the users table (only the original amount, no offer applied here)
            await new Promise((resolve, reject) => {
                db.run(
                    `UPDATE users SET balance = ? WHERE id = ?`,
                    [newBalance, userID],
                    function (err) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    }
                );
            });

            // Track the number of completed operations
            completedOperations++;

            // Log progress every 1000 operations
            if (completedOperations % 1000 === 0) {
                // console.log(`Processed ${completedOperations} records`);
            }
        }

        // Commit the transaction
        db.run('COMMIT');

        // Send the success response
        // res.send('All user balances updated and logs recorded.');

    } catch (err) {
        console.log(err);
        db.run('ROLLBACK'); // Ensure rollback on error
        // res.status(500).send('Error occurred during the update');
    }
};






const offers = (req, res) => {
    db.all(`SELECT * FROM offers`, (err, offers) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Database error occurred.');
        }
        res.render('offers', { offers });
    });
}

const postoffer = (req, res) => {
    const { offername, offedetails, percentage, starting, expiry_on } = req.body;
    const thumbnail = req.file ? req.file.filename : null; // Handle file upload

    db.run(`INSERT INTO offers (offername, offedetails, percentage, starting, expiry_on, thumbnail) VALUES (?, ?, ?, ?, ?, ?)`, [offername, offedetails, percentage, starting, expiry_on, thumbnail], (err) => {
        console.log(err);

    });

};

const exchangeCurrency = async (req, res) => {
    try {
        // Fetch the rates for BTC and USDT in parallel using db.get
        const [btcDeposit, btcWithdraw, usdtDeposit, usdtWithdraw] = await Promise.all([
            new Promise((resolve, reject) => {
                db.get(`SELECT cRate FROM currencyrate WHERE cName = 'BTC' AND paymentType = 'Deposit'`, (err, row) => {
                    if (err) {
                        return reject('Error while fetching the BTC Deposit rate for currency Exchange');
                    }
                    if (!row) {
                        return reject('BTC Deposit rate not found');
                    }
                    resolve(row.cRate); // Return the cRate value
                });
            }),
            new Promise((resolve, reject) => {
                db.get(`SELECT cRate FROM currencyrate WHERE cName = 'BTC' AND paymentType = 'Withdraw'`, (err, row) => {
                    if (err) {
                        return reject('Error while fetching the BTC Withdraw rate for currency Exchange');
                    }
                    if (!row) {
                        return reject('BTC Withdraw rate not found');
                    }
                    resolve(row.cRate); // Return the cRate value
                });
            }),
            new Promise((resolve, reject) => {
                db.get(`SELECT cRate FROM currencyrate WHERE cName = 'USDT' AND paymentType = 'Deposit'`, (err, row) => {
                    if (err) {
                        return reject('Error while fetching the USDT Deposit rate for currency Exchange');
                    }
                    if (!row) {
                        return reject('USDT Deposit rate not found');
                    }
                    resolve(row.cRate); // Return the cRate value
                });
            }),
            new Promise((resolve, reject) => {
                db.get(`SELECT cRate FROM currencyrate WHERE cName = 'USDT' AND paymentType = 'Withdraw'`, (err, row) => {
                    if (err) {
                        return reject('Error while fetching the USDT Withdraw rate for currency Exchange');
                    }
                    if (!row) {
                        return reject('USDT Withdraw rate not found');
                    }
                    resolve(row.cRate); // Return the cRate value
                });
            })
        ]);

        // Now fetch the user's information (balance, btcBalance, usdtBalance)
        db.get(`SELECT balance, btcBalance, usdtBalance, email FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
            if (err) {
                console.log('Error while fetching user data:', err);
                return res.status(500).send('Error while fetching user data.');
            }

            if (!user) {
                return res.status(404).send('User not found.');
            }

            // Render the page with the fetched data
            res.render('currency-converter', {
                btcDeposit: btcDeposit,
                btcWithdraw: btcWithdraw,
                usdtDeposit: usdtDeposit,
                usdtWithdraw: usdtWithdraw,
                userEmail: req.session.userEmail,
                balance: user.balance, // Current balance
                usdtBalance: user.usdtBalance, // USDT balance
                btcBalance: user.btcBalance // BTC balance
            });
        });

    } catch (error) {
        console.log('Error occurred:', error); // Log any error that occurs during the queries
        res.status(500).send("An error occurred while fetching currency rates.");
    }
};


const postExchangeCurrency = (req, res) => {
    const userId = req.session.userId; // Get user ID from session
    if (!userId) {
        return res.status(401).send('User not logged in.');
    }

    // Retrieve user information from the database
    db.get(`SELECT balance, btcBalance, usdtBalance, email FROM users WHERE id = ?`, [userId], (err, user) => {
        if (err) {
            console.log('Database error:', err);
            return res.status(500).send('Database error occurred.');
        }

        // Check if the user exists
        if (!user) {
            return res.status(404).send('User not found.');
        }

        console.log('User data:', user); // Log user data to check if it's correct
        const amount = parseFloat(req.body.amount); // Get the amount entered by the user
        let exchangedAmount = 0;

        // Ensure the amount is a positive number
        if (isNaN(amount) || amount <= 0) {
            return res.status(400).send('Invalid amount entered.');
        }

        // Check if the user has sufficient balance based on the currency selected
        if (req.body.currency === 'bitcoin') {
            // Check if user has enough BTC balance
            if (user.btcBalance < amount) {
                return res.render('index', {
                    userName: req.session.username,
                    userEmail: user.email,
                    balance: (user.balance + 0), // New balance after exchange
                    usdtBalance: user.usdtBalance,
                    btcBalance: user.btcBalance ,
                    showAlert: true, alertMessage: `Insufficient Balance for Bitcoin`, alertType: 'error'
                });
            }
            exchangedAmount = amount * btcRate_Deposit; // Use btcRate_Deposit for conversion to INR
        } else if (req.body.currency === 'USDT') {
            // Check if user has enough USDT balance
            if (user.usdtBalance < amount) {
                return res.render('index', {
                    userName: req.session.username,
                    userEmail: user.email,
                    balance: (user.balance + 0), // New balance after exchange
                    usdtBalance: user.usdtBalance,
                    btcBalance: user.btcBalance ,
                    showAlert: true, alertMessage: `Insufficient Balance for USDT`, alertType: 'error'
                });
            }
            exchangedAmount = amount * usdtRate_Deposit; // Use usdtRate_Deposit for conversion to INR
        }

        // Update the user's balance and cryptocurrency balance
        db.run(
            `UPDATE users SET balance = balance + ?, btcBalance = btcBalance - ?, usdtBalance = usdtBalance - ? WHERE id = ?`,
            [exchangedAmount, req.body.currency === 'bitcoin' ? amount : 0, req.body.currency === 'USDT' ? amount : 0, userId],
            (err) => {
                if (err) {
                    console.log('Error updating balances:', err);
                    return res.status(500).send('Error updating balances.');
                }

                // Successfully updated the balances
                res.render('index', {
                    userName: req.session.username,
                    userEmail: user.email,
                    balance: (user.balance + exchangedAmount), // New balance after exchange
                    usdtBalance: user.usdtBalance - (req.body.currency === 'USDT' ? amount : 0),
                    btcBalance: user.btcBalance - (req.body.currency === 'bitcoin' ? amount : 0),
                    showAlert: true, alertMessage: `Currency Exchanged`, alertType: 'success'
                });
            }
        );
    });
};





module.exports = { homePage, contactus, postcontactus, policy, faqs, signup, verifyAccount, resendVerificationMail, postSignIn, changepassword, postchangePassword, deposit, withdraw, postdeposit, postwithdraw, resetpassword, postresetpassword, forgotPassword, postforgotPassword, logout, mytransactions, dailyIncome, genReferral, refferal, dailyProductBuy, buyProduct, checkout, checkoutConfirm, myinvestment, investmentDetails, dailyIncomeUpdateForAll, offers, postoffer, exchangeCurrency, postExchangeCurrency }