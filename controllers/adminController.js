const dotenv = require('dotenv');
const express = require('express');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');
const app = express();
const db = new sqlite3.Database('./data.sqlite');
dotenv.config();
const alertMessage = require('./alertController');

const adminLogin = (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        res.redirect('/admin/dashboard');
    } else {
        res.redirect('/admin');
    }
}


const adminDashboard = (req, res) => {
    // Helper function to handle errors and render default data
    const handleError = (err, data, res) => {
        console.error(err);
        return res.render('admin-dashboard', data);
    };

    // Default Date Calculation: Start of the month and current date
    const getDefaultStartDate = () => {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return firstDayOfMonth.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    };

    const getDefaultEndDate = () => {
        const today = new Date();
        return today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    };

    // Get start and end date for Monthly Deposits (from the first form)
    let startDate = req.query['start-date'] || getDefaultStartDate();
    let endDate = req.query['end-date'] || getDefaultEndDate();

    // Get start and end date for Completed Deposits (from the second form)
    let startDateCompleted = req.query['start-date-completed'] || getDefaultStartDate();
    let endDateCompleted = req.query['end-date-completed'] || getDefaultEndDate();

    // SQL Queries
    const transactionsQuery = `
        SELECT u.firstName, u.lastName, u.phone, u.email, t.amount, t.proof, 
               t.payment_method, t.status, t.id
        FROM users u
        JOIN transactions t ON u.id = t.userId
    `;

    const paymentMethodsQuery = `SELECT * FROM payment_methods`;

    const totalUsersQuery = `SELECT COUNT(*) AS total FROM users`;

    const monthlyDepositQuery = `
    SELECT u.username, t.userId, SUM(t.amount) AS totalAmount
    FROM transactions t
    JOIN users u ON u.id = t.userId
    WHERE t.type = 'Deposit'
    AND t.uploaded_on BETWEEN ? AND ?
    GROUP BY t.userId, u.username
`;


    const completedDepositsQuery = `
        SELECT u.username, u.id AS userId, COUNT(t.id) AS depositCount
        FROM users u
        JOIN transactions t ON u.id = t.userId
        WHERE t.type = 'Deposit'
        AND t.isPaymentDone = 1
        AND t.uploaded_on BETWEEN ? AND ?
        GROUP BY u.id
        ORDER BY depositCount DESC
    `;

    const totalDepositsQuery = `
        SELECT COUNT(*) AS totalDeposits
        FROM transactions
        WHERE type = 'Deposit' AND status = 'Complete'
    `;

    const totalWithdrawalsQuery = `
        SELECT COUNT(*) AS totalWithdrawals
        FROM transactions
        WHERE type = 'Withdraw' AND status = 'Complete'
    `;

    // Execute all queries sequentially and render the view
    db.all(transactionsQuery, [], (err, transactions) => {
        if (err) return handleError(err, { data: [], paymentMethods: [], totalUsers: 0, deposits: [], completedDeposits: [], totalDeposits: 0, totalWithdrawals: 0 }, res);

        db.all(paymentMethodsQuery, [], (err, paymentMethods) => {
            if (err) return handleError(err, { data: transactions, paymentMethods: [], totalUsers: 0, deposits: [], completedDeposits: [], totalDeposits: 0, totalWithdrawals: 0 }, res);

            db.get(totalUsersQuery, [], (err, result) => {
                if (err) return handleError(err, { data: transactions, paymentMethods, totalUsers: 0, deposits: [], completedDeposits: [], totalDeposits: 0, totalWithdrawals: 0 }, res);

                const totalUsers = result.total;

                // Fetch deposits for the selected date range
                db.all(monthlyDepositQuery, [startDate, endDate], (err, deposits) => {
                    if (err) return handleError(err, { data: transactions, paymentMethods, totalUsers, deposits: [], completedDeposits: [], totalDeposits: 0, totalWithdrawals: 0 }, res);

                    // Fetch completed deposits for the selected date range
                    db.all(completedDepositsQuery, [startDateCompleted, endDateCompleted], (err, completedDeposits) => {
                        if (err) return handleError(err, { data: transactions, paymentMethods, totalUsers, deposits, completedDeposits: [], totalDeposits: 0, totalWithdrawals: 0 }, res);

                        // Fetch total successful deposits
                        db.get(totalDepositsQuery, [], (err, totalDepositsResult) => {
                            if (err) return handleError(err, { data: transactions, paymentMethods, totalUsers, deposits, completedDeposits, totalDeposits: 0, totalWithdrawals: 0 }, res);
                            const totalDeposits = totalDepositsResult.totalDeposits;

                            // Fetch total successful withdrawals
                            db.get(totalWithdrawalsQuery, [], (err, totalWithdrawalsResult) => {
                                if (err) return handleError(err, { data: transactions, paymentMethods, totalUsers, deposits, completedDeposits, totalDeposits, totalWithdrawals: 0 }, res);
                                const totalWithdrawals = totalWithdrawalsResult.totalWithdrawals;

                                // Render the dashboard view with all the data
                                res.render('admin-dashboard', {
                                    data: transactions,
                                    paymentMethods,
                                    totalUsers,
                                    deposits,
                                    completedDeposits,
                                    totalDeposits,
                                    totalWithdrawals,
                                    startDate,
                                    endDate,
                                    startDateCompleted,
                                    endDateCompleted
                                });
                            });
                        });
                    });
                });
            });
        });
    });
};






const updatePaymentMethods = (req, res) => {
    db.all(`SELECT method, details FROM payment_methods`, [], (err, paymentMethods) => {
        if (err) {
            console.error(err);
            return res.render('payment-methods', { paymentMethods: [] });
        }

        db.all(`SELECT network_name, network_address FROM currency_network`, [], (err, network) => {
            if (err) {
                console.log(err);
                return res.render('payment-methods', { paymentMethods, network: [] });
            }

            res.render('payment-methods', { paymentMethods, network });
        });
    });
}

const postupdatePaymentMethods = (req, res) => {
    for (const key in req.body) {
        const value = req.body[key];

        if (key.startsWith('details_')) {
            const method = key.replace('details_', '');

            db.run(`UPDATE payment_methods SET details = ? WHERE method = ?`, [value, method], (err) => {
                if (err) {
                    console.error("Error updating payment method:", err);
                    return res.status(500).send('Error updating payment methods.');
                }
            });
        }

        if (key.startsWith('info')) {
            const networkName = key.replace('info', '');

            db.run(`UPDATE currency_network SET network_address = ? WHERE network_name = ?`, [value, networkName], (err) => {
                if (err) {
                    console.error("Error updating network:", err);
                    return res.status(500).send('Error updating network addresses.');
                }
            });
        }
    }
    res.redirect('/admin/update-payment-methods');
};

const updateStatus = (req, res) => {
    const { status, remark, updateBalance, updateMail } = req.body;
    const transactionId = req.params.id;

    db.get(`SELECT t.type, t.amount, t.status, t.userId, t.payment_method, t.id AS payment_id, t.uploaded_on, t.remark ,t.isPaymentDone,t.deductionAmount
            FROM transactions t WHERE t.id = ?`, [transactionId], (err, transaction) => {
        if (err || !transaction) {
            console.error(err || "Transaction not found.");
            return res.status(500).send("Error updating transaction status.");
        }

        const { type, amount, status: currentStatus, userId, payment_method, id, uploaded_on, remark: transactionRemark, isPaymentDone } = transaction;

        db.get(`SELECT username, email FROM users WHERE id = ?`, [userId], (err, user) => {
            if (err || !user) {
                console.error(err || "User not found.");
                return res.status(500).send("Error fetching user details.");
            }

            const paymentDetails = {
                username: user.username,
                email: user.email,
                payment_method: payment_method,
                payment_id: id,
                uploaded_on: uploaded_on,
                type: type,
                remark: transactionRemark,
                status: status,
                amount: amount
            };

            if (currentStatus === status && remark === transactionRemark) {
                return res.redirect('/admin/transactions');
            }

            db.run(`UPDATE transactions SET status = ?, remark = ?, isPaymentDone = 1 WHERE id = ?`, [status, remark, transactionId], (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send("Error updating transaction.");
                }

                const balanceMapping = {
                    'UPI': 'balance',
                    'Bank': 'balance',
                    'BTC': 'btcBalance',
                    'USDT': 'usdtBalance',
                };

                if (type === 'Deposit' && status === 'Complete') {
                    if (balanceMapping[payment_method]) {
                        const balanceField = balanceMapping[payment_method];

                        db.run(`UPDATE users SET ${balanceField} = ${balanceField} + ? WHERE id = ?`, [amount, userId], (err) => {
                            if (err) {
                                console.error(err);
                                return res.status(500).send("Error updating user balance.");
                            }
                            calculateCommissions(uploaded_on,userId, amount, transactionId, "Deposit");

                            // Calculate commissions and send email notification
                            sendEmailNotification(userId, paymentDetails);

                            return res.redirect('/admin/transactions');
                        });
                    }
                } else if (type === 'Withdraw' && status === 'Complete') {
                    console.log('with complete');

                    if (balanceMapping[payment_method]) {
                        const balanceField = balanceMapping[payment_method];

                        db.run(`UPDATE users SET ${balanceField} = ${balanceField} - ? WHERE id = ?`, [amount, userId], (err) => {
                            if (err) {
                                console.error(err);
                                return res.status(500).send("Error updating user balance.");
                            }

                            // Calculate commissions and send email notification
                            sendEmailNotification(userId, paymentDetails);

                            return res.redirect('/admin/transactions');
                        });
                    }
                } else {
                    sendEmailNotification(userId, paymentDetails);
                    return res.redirect('/admin/transactions');
                }
            });
        });
    });


    // Commission calculation function for direct, indirect, and third-level referrals
    function calculateCommissions(formattedDate,userId, amount, transaction_id,productType) {
        

        db.get("SELECT refer_by FROM users WHERE id = ?", [userId], (err, row) => {
            if (err) {
                console.error("Error fetching refer_by:", err);
                return;
            }

            if (!row || !row.refer_by) {
                console.log(`No referrer found for userId ${userId}. No commissions will be calculated.`);
                return;
            }

            // Direct Commission (5%)
            const referrerId = row.refer_by;
            const directCommission = 0;  // 5% direct commission
            db.run("INSERT INTO commissions (user_id, amount, type, from_user_id, product_type, created_at,transaction_id,depositAmount) VALUES (?,?, '1st Direct', ?, ?, ?, ?,?)",
                [referrerId, directCommission, userId,productType, formattedDate,transaction_id,amount], (err) => {
                    if (err) {
                        console.error("Error inserting direct commission:", err);
                    } else {
                        console.log(`Direct commission of ${directCommission} added for referrer (user_id: ${referrerId})`);
                    }
                });

            // Indirect Commission (1%) - Level 2 Referral
            db.get("SELECT refer_by FROM users WHERE referral_code = ?", [row.refer_by], (err, indirectRow) => {
                if (err) {
                    console.error("Error fetching second-level referrer:", err);
                    return;
                }
                console.log(indirectRow, indirectRow.refer_by)

                if (!indirectRow || !indirectRow.refer_by) {
                    console.log(`No second-level referrer found for userId ${userId}. No indirect commission.`);
                    return;
                }

                const indirectReferrerId = indirectRow.refer_by;
                const indirectCommission = 0; // 1% indirect commission

                db.run("INSERT INTO commissions (user_id, amount, type, from_user_id, product_type, created_at,transaction_id,depositAmount) VALUES (?,?,  '2nd Indirect',?, ?, ?, ?,?)",
                    [indirectReferrerId, indirectCommission, userId, productType, formattedDate,transaction_id,amount], (err) => {
                        if (err) {
                            console.error("Error inserting indirect commission:", err);
                        } else {
                            console.log(`Indirect commission of ${indirectCommission} added for second-level referrer (user_id: ${indirectReferrerId})`);
                        }
                    });

                // Third-Level Commission (0.5%) - Level 3 Referral
                db.get("SELECT refer_by FROM users WHERE referral_code = ?", [indirectRow.refer_by], (err, thirdLevelRow) => {
                    if (err) {
                        console.error("Error fetching third-level referrer:", err);
                        return;
                    }

                    if (!thirdLevelRow || !thirdLevelRow.refer_by) {
                        console.log(`No third-level referrer found for userId ${userId}. No third-level commission.`);
                        return;
                    }

                    const thirdLevelReferrerId = thirdLevelRow.refer_by;
                    const thirdLevelCommission = 0;  // % third-level commission

                    db.run("INSERT INTO commissions (user_id, amount, type, from_user_id, product_type, created_at,transaction_id,depositAmount) VALUES (?, ?, '3rd Indirect', ?, ?, ?,?,?)",
                        [thirdLevelReferrerId, thirdLevelCommission, userId, productType, formattedDate,transaction_id,amount], (err) => {
                            if (err) {
                                console.error("Error inserting third-level commission:", err);
                            } else {
                                console.log(`Third-level commission of ${thirdLevelCommission} added for third-level referrer (user_id: ${thirdLevelReferrerId})`);
                            }
                        });
                });
            });
        });
    }




    // Email sending function
    function sendEmailNotification(userId, paymentDetails) {
        ejs.renderFile('./views/mailTemplate/paymentStatus.ejs', paymentDetails, (err, htmlContent) => {
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

            db.get(`SELECT email FROM users WHERE id = ?`, [userId], (err, emailInfo) => {
                if (err) {
                    console.error('Error finding user email:', err);
                    return;
                }

                const mailOptions = {
                    from: process.env.SMTP_USER,
                    to: emailInfo.email,
                    subject: 'Payment Status Update',
                    html: htmlContent,
                };

                transporter.sendMail(mailOptions, (err, info) => {
                    if (err) {
                        console.error('Error sending email:', err);
                    } else {
                        console.log('Payment status update email sent to:', emailInfo.email);
                    }
                });
            });
        });
    }
};

const users = (req, res) => {
    db.all(`SELECT id, firstName, lastName, phone, email, username,resetToken,verifiedStatus FROM users`, [], (err, users) => {
        if (err) {
            console.error(err);
            return res.render('admin-dashboard', { transactions: null, paymentMethods: [] });
        }

        res.render('users', { users });
    });
}

const deleteUser = (req, res) => {
    const userId = req.body.userId;

    if (!userId) {
        return res.redirect('/admin/users');
    }
    db.run('DELETE FROM users WHERE id = ?', [userId], (err) => {
        if (err) {
            console.error(err);
            return res.redirect('/admin/users');
        }
        res.redirect('/admin/users');
    });
}

const transactions = (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const itemsPerPage = 10;
    const offset = (page - 1) * itemsPerPage;

    db.get(`SELECT COUNT(*) as count FROM transactions`, [], (err, countResult) => {
        if (err) {
            console.error(err);
            return res.render('transactions', { transactions: [], totalPages: 0 });
        }

        const totalTransactions = countResult.count;
        const totalPages = Math.ceil(totalTransactions / itemsPerPage);

        db.all(
            `SELECT u.firstName, u.lastName, u.phone, u.email, u.username, t.amount, t.proof, t.deductionAmount,
                t.payment_method, t.status, t.wallet_hash, t.type, t.network, t.id, t.remark, t.uploaded_date, t.uploaded_time
            FROM users u
            JOIN transactions t ON u.id = t.userId ORDER BY uploaded_date DESC , uploaded_time DESC
            LIMIT ? OFFSET ? `,
            [itemsPerPage, offset],
            (err, transactions) => {
                if (err) {
                    console.error(err);
                    return res.render('transactions', { transactions: [], totalPages: 0 });
                }

                res.render('transactions', { transactions, totalPages, currentPage: page });
            }
        );
    });
};


const deleteTransactions = (req, res) => {
    const transactionId = req.body.transactionId;

    if (!transactionId) {
        return res.redirect('/admin/transactions');
    }

    db.run('DELETE FROM transactions WHERE id = ?', [transactionId], function (err) {
        if (err) {
            console.error(err);
            return res.redirect('/admin/transactions');
        }

        //   console.log(`Transaction with ID ${transactionId} deleted.`);
        res.redirect('/admin/transactions');
    });
}

const currencyrate = (req, res) => {
    db.all(`SELECT cName, cRate,paymentType FROM currencyrate ORDER BY paymentType`, [], (err, rates) => {
        if (err) {
            console.error(err);
            return res.status(500).send('An error occurred while retrieving the currency rates.');
        }
        btcRate_Deposit = rates[0].cRate;
        usdtRate_Deposit = rates[1].cRate;
        btcRate_Withdraw = rates[2].cRate;
        usdtRate_Withdraw = rates[3].cRate;

        res.render('currencyrate', { rates });
    });
}

const postcurrencyrate = (req, res) => {
    if (req.body.BTC_withdrawRate) {
        app.locals.BTC_withdrawRate = req.body.BTC_withdrawRate;
        db.run(`UPDATE currencyrate SET cRate = ? WHERE cName = 'BTC' AND paymentType = 'Withdraw'`, [req.body.BTC_withdrawRate], function (err) {
            if (err) {
                console.error(err);
                return res.status(500).send('An error occurred while updating the BTC Withdraw rate.');
            }
        });
    }

    if (req.body.USDT_withdrawRate) {
        app.locals.USDT_withdrawRate = req.body.USDT_withdrawRate
        db.run(`UPDATE currencyrate SET cRate = ? WHERE cName = 'USDT' AND paymentType = 'Withdraw'`, [req.body.USDT_withdrawRate], function (err) {
            if (err) {
                console.error(err);
                return res.status(500).send('An error occurred while updating the USDT Withdraw rate.');
            }
        });
    }

    if (req.body.BTC_depositRate) {
        app.locals.BTC_depositRate = req.body.BTC_depositRate;
        db.run(`UPDATE currencyrate SET cRate = ? WHERE cName = 'BTC' AND paymentType = 'Deposit'`, [req.body.BTC_depositRate], function (err) {
            if (err) {
                console.error(err);
                return res.status(500).send('An error occurred while updating the BTC Deposit rate.');
            }
        });
    }
    if (req.body.USDT_depositRate) {
        app.locals.USDT_depositRate = req.body.USDT_depositRate;
        db.run(`UPDATE currencyrate SET cRate = ? WHERE cName = 'USDT' AND paymentType = 'Deposit'`, [req.body.USDT_depositRate], function (err) {
            if (err) {
                console.error(err);
                return res.status(500).send('An error occurred while updating the USDT Deposit rate.');
            }
        });
    }


    res.redirect('/admin/currencyrate');
}


const addUser = async (req, res) => {
    const { firstName, lastName, phone, email, password } = req.body;

    try {
        db.get(`SELECT * FROM users WHERE phone = ? OR email = ?`, [phone, email], async (err, user) => {
            if (err) {
                console.error(err);
                return res.status(500).send('An error occurred.');
            }

            if (user) {
                return res.status(400).send('Phone number or email already registered.');
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            db.run(`INSERT INTO users (firstName, lastName, phone, email, password) VALUES (?, ?, ?, ?, ?)`,
                [firstName, lastName, phone, email, hashedPassword], function (err) {
                    if (err) {
                        console.error(err);
                        return res.status(500).send('An error occurred while adding the user.');
                    }

                    res.redirect('/admin/users');
                });
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('An unexpected error occurred.');
    }
}

const updateRegistrationStatus = (req, res) => {
    const { registrationEnabled } = req.body;

    db.run(`UPDATE configurations SET value = ? WHERE key = ?`, [registrationEnabled, 'registration_enabled'], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send('An error occurred while updating the registration status.');
        }
        res.redirect('/admin/dashboard');
    });
}

const createnewpost = (req, res) => {
    db.all(`SELECT * FROM offers`, [], (err, offers) => {
        if (err) {
            console.log(err);
        }
        res.render('editpost', { blog: null, offers });
    })
}

const newpost = (req, res) => {
    const { title, description, visible, dailyIncome, monthlyIncome, yearlyIncome, packPrice, investmentType } = req.body;
    const thumbnail = req.file ? req.file.filename : null;
    const currentDate = Date.now();

    if (!title || !description) {
        return res.status(400).send('Title, description, and visibility are required');
    }

    let isVisible = (visible === 'yes' || visible === true) ? true : false;


    db.run(
        `INSERT INTO blogposts(title, description, thumbnail, created_on, lastUpdate,daily_income,monthly_income,yearly_income,package_price,category, ispublic) 
        VALUES(?, ?, ?, ?, ?,?,?,?,?,?,?)`,
        [title, description, thumbnail, currentDate, currentDate, dailyIncome, monthlyIncome, yearlyIncome, packPrice, investmentType, isVisible],
        (err) => {
            if (err) {
                console.log(err);
                return res.status(500).send('Error saving post');
            }
            res.status(201).send('Post published');
        }
    );
};

const deletepost = (req, res) => {
    const blogid = req.params.id;
    if (!blogid) {
        return res.send('blog id must needed')
    }

    db.run(`DELETE FROM blogposts WHERE blogid = ?`, [blogid], (err) => {
        if (err) {
            console.log(err);
        }
        return res.redirect('/admin/posts');
    })
}



const editpost = (req, res) => {
    const blogId = req.params.id;
    db.get(`SELECT * FROM blogposts where blogid = ${blogId}`, [], (err, blog) => {
        if (err) {
            console.log(err);
        }
        db.all(`SELECT * FROM offers`, [], (err, offers) => {
            if (err) {
                console.log(err);
            }

            res.render('editpost', { blog, offers })
        })
    })
}


const editpostp = (req, res) => {
    const blogId = req.params.id;
    const { title, description, visible, dailyIncome, monthlyIncome, yearlyIncome, packPrice, investmentType, offer } = req.body;


    // Fetch the current blog post to get the existing thumbnail
    db.get('SELECT thumbnail FROM blogposts WHERE blogid = ?', [blogId], (err, row) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Error fetching post details');
        }

        // If the blog post exists, check for thumbnail changes
        let thumbnail = row ? row.thumbnail : null; // Default to existing thumbnail if not uploading a new one
        if (req.file) {
            thumbnail = req.file.filename;  // Update thumbnail if a new file is uploaded
        }

        const currentDate = Date.now();

        // Validation: Ensure required fields are provided
        if (!title || !description || typeof visible === 'undefined') {
            return res.status(400).send('Title, description, and visibility are required');
        }

        // Handle visibility correctly
        const isVisible = visible === 'yes';

        // Check that dailyIncome, packPrice, and investmentType are valid values
        const validDailyIncome = dailyIncome && !isNaN(dailyIncome);
        const validMonthlyIncome = monthlyIncome && !isNaN(monthlyIncome);
        const validYearlyIncome = yearlyIncome && !isNaN(yearlyIncome);
        const validPackPrice = packPrice && !isNaN(packPrice);
        const validInvestmentType = investmentType && ['dailyIncome', 'realEstate'].includes(investmentType);

        if (!validDailyIncome || !validPackPrice || !validInvestmentType || !validMonthlyIncome || !validYearlyIncome) {
            return res.status(400).send('Invalid values for daily / monthly / yearly Income, packPrice, or investmentType');
        }

        // Update query with values
        db.run(
            `UPDATE blogposts 
            SET title = ?, description = ?, thumbnail = ?, created_on = ?, lastUpdate = ?, ispublic = ?, daily_income = ?,monthly_income=?,yearly_income=?, package_price = ?, category = ? , appliedOffer = ?
            WHERE blogid = ?`,
            [title, description, thumbnail, currentDate, currentDate, isVisible, dailyIncome, monthlyIncome, yearlyIncome, packPrice, investmentType, offer, blogId],
            (err) => {
                if (err) {
                    console.log(err);
                    return res.status(500).send('Error saving post');
                }
                res.redirect(`/admin/post/${blogId}`);
            }
        );
    });
};


const allposts = (req, res) => {
    db.all(`SELECT * FROM blogposts ORDER BY created_on DESC`, (err, posts) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Database error occurred.');
        }
        res.render('posts', { posts: posts });
    });
};

const setting = (req, res) => {
    db.all(`SELECT * FROM configurations`, [], (err, settings) => {
        if (err) {
            console.log(err);
        }
        res.render('settings', { settings })
    })
}

const newsetting = (req, res) => {
    const { key, value } = req.body;  // Extract key and value from req.body

    // Check if key and value are provided
    if (!key || !value) {
        return res.status(400).json({ error: "Key and value are required" });
    }
    const checkQuery = `SELECT 1 FROM configurations WHERE key = ?`;

    db.get(checkQuery, [key], (err, row) => {
        if (err) {
            console.error("Error checking for duplicate key:", err);
            return res.status(500).json({ error: "Database error" });
        }

        if (row) {
            // If the key already exists
            console.log("Duplicate key found. Key already exists:", key);
            return res.status(400).json({ error: "Duplicate key found" });
        }

        // If no duplicate, insert the new configuration
        const insertQuery = `INSERT INTO configurations (key, value) VALUES (?, ?)`;

        db.run(insertQuery, [key, value], function (err) {
            if (err) {
                console.error("Error inserting new configuration:", err.message);
                return res.status(500).json({ error: "Failed to insert configuration" });
            }
            console.log(`Configuration added with id ${this.lastID}`);
            return res.status(201).json({ message: "Configuration added successfully", id: this.lastID });
        });
    });
}
const orders = (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const itemsPerPage = 10;
    const offset = (page - 1) * itemsPerPage;

    db.get(`SELECT COUNT(*) as count FROM products`, [], (err, countResult) => {
        if (err) {
            console.error(err);
            return res.render('transactions', { transactions: [], totalPages: 0 });
        }

        const totalTransactions = countResult.count;
        const totalPages = Math.ceil(totalTransactions / itemsPerPage);

        db.all(
            `SELECT p.transaction_id, p.amount, p.product_id, p.buy_at, p.quantity, p.status AS product_status, 
                    p.transaction_id, p.expiry_date, p.expiry_time, p.uploaded_date, p.uploaded_time,
                    b.title, p.proof, p.remark, p.user_id, u.username, p.payment_method
             FROM products p
             LEFT JOIN blogposts b ON p.product_id = b.blogid
             LEFT JOIN users u ON p.user_id = u.id
             ORDER BY p.buy_at DESC
             LIMIT ? OFFSET ?`,
            [itemsPerPage, offset],
            (err, transactions) => {
                if (err) {
                    console.error(err);
                    return res.render('orders', { transactions: [], totalPages: 0, currentPage: 0 });
                }


                res.render('orders', { transactions, totalPages, currentPage: page });
            }
        );
    });
};







const updateOrder = (req, res) => {
    const { status, remark } = req.body;
    const transactionId = req.params.id;

    // Current date and time in the 'Asia/Kolkata' timezone
    const date = new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
    const time = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata' });

    // Fetch product based on the transaction ID
    db.get(`SELECT * from products WHERE transaction_id = ?`, [transactionId], (err, product) => {
        if (err || !product) {
            console.error(err || "Transaction not found.");
            return res.status(500).send("Error updating transaction status.");
        }

        const { status: currentStatus, user_id, product_id, quantity, appliedOffer } = product;

        // Fetch user details associated with the transaction
        db.get(`SELECT username, balance, email FROM users WHERE id = ?`, [user_id], (err, user) => {
            if (err || !user) {
                console.error(err || "User not found.");
                return res.status(500).send("Error fetching user details.");
            }

            // If status and remark haven't changed, redirect to orders page
            if (currentStatus === status && remark === product.remark) {
                return res.redirect('/admin/orders');
            }

            // Update the status and remark in the products table
            db.run(`UPDATE products SET status = ?, remark = ? WHERE transaction_id = ?`, [status, remark, transactionId], (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send("Error updating transaction.");
                }

                // Update balance if the status is 'Complete'
                if (status === 'Complete') {
                    db.run(`UPDATE products SET status = 'Complete' WHERE transaction_id = ?`, [transactionId], (err) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).send("Error updating user balance.");
                        }

                        // Fetch product income and offer
                        db.get(`SELECT daily_income, appliedOffer FROM blogposts WHERE blogid = ?`, [product_id], (err, prod) => {
                            if (err || !prod) {
                                console.error(err || "Product details not found.");
                                return res.status(500).send("Error fetching product details.");
                            }

                            const oldBalance = parseFloat(user.balance) || 0;  // Ensure oldBalance is a valid number
                            const dailyIncome = parseFloat(prod.daily_income) || 0; // Ensure daily_income is a valid number
                            const productQuantity = parseFloat(quantity) || 0; // Ensure quantity is a valid number

                            let amount = dailyIncome * productQuantity;
                            let amountAdd = amount;
                            let offerId = '';  // Use a unique name for offerId
                            let newBalance = oldBalance;  // Initial balance for the user


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
                                        amountAdd = amount + (amount * (parseFloat(offer.percentage) / 100));  // Apply the offer percentage correctly
                                    }

                                    // newBalance = newBalance + amountAdd;  // Add the amount to newBalance


                                    // Update the user's balance
                                    // db.run(`UPDATE users SET balance = ? WHERE id = ?`, [newBalance, req.session.userId], (err) => {
                                    //     if (err) {
                                    //         console.error("Error updating user balance:", err);
                                    //         return res.status(500).send("Error updating user balance.");
                                    //     }

                                        // Insert daily income log
                                        // db.run(
                                        //     `INSERT INTO daily_Income_logs (user_id, product_id, old_balance, new_balance, amountAdded, offer, updated_date, updated_time, transaction_id) 
                                        //     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                        //     [user_id, product_id, oldBalance, newBalance, amountAdd, offerId, date, time, transactionId],
                                        //     function (err) {
                                        //         if (err) {
                                        //             console.log(err);
                                        //         }
                                        //         console.log(`Daily Income update from admin panel!`);
                                        //     }
                                        // );
                                    // });
                                });
                            });
                        });
                    });
                } else {
                    return res.redirect('/admin/orders');
                }
            });
        });
    });
};








const updateSetting = (req, res) => {
    const { key, value } = req.body;

    // Assuming  have a function to update the setting in the database
    updateSettingInDatabase(key, value).then(() => {
        res.redirect('/admin/setting');
    }).catch((err) => {
        console.error("Error updating setting:", err);
        res.status(500).send("Internal Server Error");
    });
};


// Function to update the setting in the database and modify .env file if necessary
function updateSettingInDatabase(key, value) {
    return new Promise((resolve, reject) => {
        // Query to update the database
        const query = "UPDATE configurations SET value = ? WHERE key = ?";

        db.run(query, [value, key], (err, result) => {
            if (err) {
                return reject({ message: 'Database error', error: err });
            }

            // If the key is 'admin_username' or 'admin_password', update the .env file
            if (key === "admin_username" || key === "admin_password") {
                const ENV_PATH = path.join(__dirname, '../.env');  // Path to the .env file

                // Read the .env file
                fs.readFile(ENV_PATH, 'utf8', (err, data) => {
                    if (err) {
                        return reject({ message: 'Error reading .env file', error: err });
                    }

                    // Replace the old values in the .env file
                    let newData = data;
                    const usernameRegex = /^ADMIN_USERNAME=(.*)$/m;
                    const passwordRegex = /^ADMIN_PASSWORD=(.*)$/m;

                    if (key === "admin_username") {
                        newData = newData.replace(usernameRegex, `ADMIN_USERNAME=${value}`);
                        process.env.ADMIN_USERNAME = value;  // Set the value in process.env
                    } else if (key === "admin_password") {
                        newData = newData.replace(passwordRegex, `ADMIN_PASSWORD=${value}`);
                        process.env.ADMIN_PASSWORD = value;  // Set the value in process.env
                    }

                    // Write the new values to the .env file
                    fs.writeFile(ENV_PATH, newData, 'utf8', (err) => {
                        if (err) {
                            return reject({ message: 'Error writing to .env file', error: err });
                        }

                        // Manually reload the environment variables in the current process
                        dotenv.config();

                        // Resolve the promise with the result
                        resolve(result);
                    });
                });
            } else {
                // If no change to .env file is needed, just resolve with the result
                resolve(result);
            }
        });
    });
}


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
        if (err) {
            console.log(err);
        }
        res.redirect('/admin/offers');

    });

};

const editoffers = (req, res) => {
    const offerid = req.params.id;
    db.get(`SELECT * FROM offers where id = ${offerid}`, [], (err, offer) => {
        if (err) {
            console.log(err);
        }

        res.render('editoffers', { offer })
    })
}


const editoffersp = async (req, res) => {
    const offerid = req.params.id;
    const { offername, minOrder, offedetails, percentage, starting, expiry_on } = req.body;

    // Validate inputs
    if (!offerid || !offername || !offedetails || !percentage) {
        return res.status(400).send('All fields are required.');
    }

    try {
        // Fetch the existing thumbnail
        db.get('SELECT thumbnail FROM offers WHERE id = ?', [offerid], (err, row) => {
            if (err) {
                console.error('Error fetching post details:', err);
                return res.status(500).send('Error fetching post details.');
            }

            if (!row) {
                return res.status(404).send('Offer not found.');
            }

            // Use existing thumbnail if no new file is uploaded
            let thumbnail = row.thumbnail;
            if (req.file) {
                thumbnail = req.file.filename; // Update thumbnail with the new file
            }

            // Update the offer
            const updateQuery = `
                UPDATE offers 
                SET offername = ?, offedetails = ?, percentage = ?, minimum_product = ? ,starting = ?, expiry_on = ?, thumbnail = ? 
                WHERE id = ?
            `;
            const params = [offername, offedetails, percentage, minOrder, starting || '', expiry_on || '', thumbnail || '', offerid];
           

            db.run(updateQuery, params, (err) => {
                if (err) {
                    console.error('Error updating offer:', err);
                    return res.status(500).send('Error updating offer.');
                }
                db.all(`SELECT * FROM offers`, (err, alloffers) => {
                    if (err) {
                        console.log(err);
                        return res.status(500).send('Database error occurred.');
                    }
                    res.redirect('/admin/offers')
                });

            });
        });
    } catch (err) {
        console.error('Unexpected error:', err);
        return res.status(500).send('An unexpected error occurred.');
    }
};


const refferalDetails = (req, res) => {
    // Get the page number from the query string, default to 1 if not provided
    const page = parseInt(req.query.page) || 1;
    const pageSize = 10; // Number of referrals per page
    const offset = (page - 1) * pageSize;

    // Fetch the total count of referrals for pagination
    db.get('SELECT COUNT(*) AS totalCount FROM commissions c JOIN users u ON u.refer_by = c.user_id', [], (err, row) => {
        if (err) {
            console.log(err);
            return;
        }

        const totalCount = row.totalCount;
        const totalPages = Math.ceil(totalCount / pageSize);

        // Fetch the paginated referrals data
        db.all(
            `SELECT c.id, c.user_id, c.amount, c.depositAmount, c.type, c.from_user_id, c.product_type, c.created_at, c.transaction_id, c.updated_at, c.status, u.username, u.referral_code 
             FROM commissions c 
             JOIN users u ON u.refer_by = c.user_id ORDER BY created_at DESC
             LIMIT ? OFFSET ? `, 
            [pageSize, offset], 
            (err, refferls) => {
                if (err) {
                    console.log(err);
                    return;
                }
                // Send the data to the view along with pagination info
                res.render('admin-refferal', {
                    refferls,
                    page,
                    totalPages
                });
            }
        );
    });
}


const updateComission = (req, res) => {
    const date = new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' }) // Current date in DD/MM/YY format
    const time = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata' }) // Current time
    const formattedDate = `${date} ${time}`;
    
    db.run(`UPDATE commissions SET amount = ?, status = 'Complete',updated_at=? WHERE id = ? `,[req.body.comission,formattedDate,req.params.id])
        res.send('done')

}
const allReferrals = (req, res) => {
    const page = parseInt(req.query.page) || 1;  // Default page is 1
    const limit = 5;  // Limit of referrals per page
    const searchQuery = req.query.search || '';  // Search keyword

    // SQL Query with pagination and search filter
    const sqlQuery = `
        SELECT u.id, u.username, u.email, u.referral_code, u.refer_by, 
            COUNT(DISTINCT c.user_id) AS totalVerifiedRef, 
            COUNT(u.refer_by) AS totalRef
        FROM users u 
        LEFT JOIN commissions c ON u.referral_code = c.user_id
        WHERE u.username LIKE ? OR u.email LIKE ? OR u.referral_code LIKE ? OR u.refer_by LIKE ?
        GROUP BY u.id
        LIMIT ?, ?;
    `;

    // Executing SQL query
    db.all(sqlQuery, [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`,`%${searchQuery}%`, (page - 1) * limit, limit], (err, refferls) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Error querying the database");
        }

        // Query total number of records to calculate pagination
        db.get("SELECT COUNT(*) AS count FROM users u WHERE u.username LIKE ? OR u.email LIKE ? OR u.referral_code LIKE ?", 
            [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`], (err, result) => {
                if (err) {
                    console.log(err);
                    return res.status(500).send("Error querying the database");
                }

                const totalRecords = result.count;
                const totalPages = Math.ceil(totalRecords / limit);

                res.render('allReferrals', { 
                    refferls, 
                    currentPage: page, 
                    totalPages,
                    searchQuery // Pass the searchQuery to the view
                });
            });
    });
};


module.exports = { adminLogin, adminDashboard, updatePaymentMethods, postupdatePaymentMethods, updateStatus, users, deleteUser, transactions, deleteTransactions, currencyrate, postcurrencyrate, addUser, updateRegistrationStatus, newpost, allposts, editpost, editpostp, setting, newsetting, deletepost, orders, updateOrder, updateSetting, offers, postoffer, editoffers, editoffersp, refferalDetails, updateComission,allReferrals }