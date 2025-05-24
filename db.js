const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data.sqlite');

db.serialize(() => {
    // Create 'users' table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firstName TEXT,
        lastName TEXT,
        phone TEXT,
        email TEXT UNIQUE,
        password TEXT,
        username TEXT UNIQUE NOT NULL,
        resetToken TEXT,
        resetTokenExpires INTEGER,
        balance REAL DEFAULT 0,
        btcBalance REAL DEFAULT 0,
        usdtBalance REAL DEFAULT 0,
        verifiedStatus BOOLEAN DEFAULT 0,
        role TEXT DEFAULT USER,
        created_on DATE
    )`, (err) => {
        if (err) {
            console.error("Error creating 'users' table:", err);
        }
    });
    // db.run(`ALTER TABLE users ADD COLUMN referral_code TEXT`)
    // db.run(`ALTER TABLE users ADD COLUMN refer_by TEXT`)

    // Update resetToken for a specific email
    db.run(`UPDATE users SET resetToken = NULL, verifiedStatus = 1 WHERE email = 'parasnikum04@gmail.com'`, (err) => {
        if (err) {
            console.error("Error updating resetToken:", err);
        }
    });
    // db.run(`DELETE from products WHERE transaction_id = 54`)

    // Create 'transactions' table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        userId INTEGER,
        amount REAL,
        proof TEXT,
        payment_method TEXT,
        status TEXT DEFAULT 'Pending',
        wallet_hash TEXT,
        remark TEXT DEFAULT 'NULL',
        network TEXT,
        uploaded_on DATE,
        updateBy INTEGER,
        isPaymentDone BOOLEAN DEFAULT 0,
        type TEXT CHECK(type IN ('Deposit', 'Withdraw')) NOT NULL,
        FOREIGN KEY(userId) REFERENCES users(id),
        FOREIGN KEY(updateBy) REFERENCES users(id)
    )`, (err) => {
        if (err) {
            console.error("Error creating 'transactions' table:", err);
        }
    });

    // db.run(`ALTER TABLE products ADD COLUMN uploaded_date TEXT`)
    // db.run(`ALTER TABLE products ADD COLUMN uploaded_time TEXT`)
    // db.run(`ALTER TABLE products ADD COLUMN expiry_time TEXT`)
    // db.run(`ALTER TABLE products ADD COLUMN proof TEXT`)
    // db.run(`ALTER TABLE products ADD COLUMN wallet_hash TEXT`)
    // db.run(`ALTER TABLE products ADD COLUMN network TEXT`)
    // db.run(`ALTER TABLE products ADD COLUMN remark TEXT`)
    // db.run(`ALTER TABLE products ADD COLUMN payment_method TEXT`)
    // db.run(`ALTER TABLE transactions DROP COLUMN uploaded_time `)
    // db.run(`ALTER TABLE transactions DROP COLUMN uploaded_date `)

    // db.run(`DELETE FROM products where transaction_id = 'P7hhXp30sV'`)

    db.run(`CREATE TABLE IF NOT EXISTS blogposts (
        blogid INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL, 
        description TEXT,
        thumbnail TEXT,  
        created_on DATE ,  
        lastUpdate DATE , 
        ispublic BOOLEAN
    )`, (err) => {
        if (err) {
            console.log(err);
        }
    });

    // db.run(`ALTER TABLE blogposts ADD COLUMN daily_income REAL`);
    // db.run(`ALTER TABLE blogposts DROP COLUMN daily_income `);
    // db.run(`ALTER TABLE blogposts ADD COLUMN monthly_income REAL`);
    // db.run(`ALTER TABLE blogposts ADD COLUMN yearly_income REAL`);
    // db.run(`ALTER TABLE blogposts ADD COLUMN package_price REAL`);
    // db.run(`ALTER TABLE blogposts ADD COLUMN category TEXT`)
    // db.run(`ALTER TABLE blogposts ADD COLUMN appliedOffer TEXT`)
    db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,  -- ID of the user making the purchase
    amount DECIMAL(10, 2),  -- Total price of the product
    product_id TEXT,  -- Unique product identifier (could be a foreign key)
    buy_at DATETIME,  -- Date and time of purchase
    quantity INTEGER DEFAULT 1,  -- Number of units purchased
    status TEXT DEFAULT 'Pending',  -- Purchase status (e.g., 'Pending', 'Completed')
    wallet_hash TEXT,
    network TEXT,
    transaction_id TEXT,  -- Payment transaction ID for reference
    expiry_date DATETIME,  -- Expiry date for time-sensitive products
    FOREIGN KEY (user_id) REFERENCES users(id)
);;`, (err) => {
        if (err) {
            console.log(err);
        }
    })


    db.run(`CREATE TABLE IF NOT EXISTS commissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,  -- User earning the commission
    amount REAL,
    type TEXT,  -- 'Direct' or 'Indirect'
    from_user_id INTEGER,  -- Who referred the user
    product_type TEXT,  -- 'Daily Income' or other
    created_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (from_user_id) REFERENCES users(id)
);`, (err) => {
        if (err) {
            console.log(err);
        }
    })
    db.run(`ALTER TABLE commissions ADD COLUMN transaction_id TEXT`);
    // db.run(`ALTER TABLE commissions ADD COLUMN updated_at TEXT DATETIME `);


    db.run(`CREATE TABLE IF NOT EXISTS daily_Income_logs (
    logid INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    product_id INTEGER,
    old_balance REAL,
    new_balance REAL,
    updated_date TEXT,
    updated_time TEXT,
    transaction_id TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
    FOREIGN KEY (product_id) REFERENCES blogposts(blogid)
    FOREIGN KEY (transaction_id) REFERENCES products (transaction_id)
);
`)
    // db.run(`ALTER TABLE daily_Income_logs ADD COLUMN amountAdded REAL`);
    // db.run(`ALTER TABLE daily_Income_logs DROP COLUMN offer`);
    // db.run(`ALTER TABLE daily_Income_logs ADD COLUMN offer TEXT`);
    // db.run(`DROP TABLE offers`)

    db.run(`
        CREATE TABLE IF NOT EXISTS offers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            offername TEXT NOT NULL,
            offedetails TEXT NOT NULL,
            percentage INTEGER DEFAULT 0 NOT NULL,
            starting TEXT NOT NULL,
            expiry_on TEXT NOT NULL,
            thumbnail TEXT
        );
    `);
    
    // db.run(`ALTER TABLE offers ADD COLUMN minimum_product INTEGER DEFAULT 0`);
    // db.run(`ALTER TABLE transactions ADD COLUMN deductionAmount REAL DEFAULT 0`);


    




    // Create 'payment_methods' table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS payment_methods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        method TEXT UNIQUE,
        details TEXT
    )`, (err) => {
        if (err) {
            console.error("Error creating 'payment_methods' table:", err);
        }
    });

    // Create 'configurations' table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS configurations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE,
        value TEXT
    )`, (err) => {
        if (err) {
            console.error("Error creating 'configurations' table:", err);
        }
    });
    // db.run(`INSERT INTO configurations(key,value) VALUES('admin_username','admin')`)
    // db.run(`INSERT INTO configurations(key,value) VALUES('admin_password','123')`)
    // db.run(`DELETE FROM configurations where key ='registration_enabled'`)

    // db.run(`DROP TABLE currencyrate`)
    // Create 'currencyrate' table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS currencyrate (
        cName TEXT ,
        cRate REAL DEFAULT 1,
        paymentType TEXT 
    )`, (err) => {
        if (err) {
            console.error("Error creating 'currencyrate' table:", err);
        }
    });


    // db.run(`INSERT OR IGNORE INTO currencyrate (cName, cRate,paymentType) VALUES
    //     ('BTC', 1,'Withdraw'),
    //     ('USDT', 1,'Withdraw'),
    //     ('BTC', 1,'Deposit'),
    //     ('USDT', 1,'Deposit')
    // `, (err) => {
    //     if (err) {
    //         console.error("Error inserting into 'currencyrate' table:", err);
    //     }
    // });

    // Create 'currency_network' table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS currency_network (
        network_name TEXT UNIQUE,
        network_address TEXT
    )`, (err) => {
        if (err) {
            console.error("Error creating 'currency_network' table:", err);
        }
    });

    // Insert default data into 'currency_network' table if not already present
    db.run(`INSERT OR IGNORE INTO currency_network (network_name, network_address) VALUES
        ('TRC20', 'null'),
        ('ERC20', 'null')
    `, (err) => {
        if (err) {
            console.error("Error inserting into 'currency_network' table:", err);
        }
    });

    // Insert default payment methods if they don't exist
    const methods = [
        { method: 'Bank', details: 'Account Holder Name: Exchme, Bank account number: 187575785278, IFSC: BOAS55SD0' },
        { method: 'UPI', details: 'exchme@upi' },
        { method: 'Crypto', details: 'Please select a crypto currency.' },
        { method: 'BTC', details: '0x32Be343B94f860124dC4fEe278FDCBD38C102D88' },
        { method: 'USDT', details: '7Qh8pe7aWV1cHH3BQyX7cQ3c2s7QgU7VxP2brc13RuY4' }
    ];

    methods.forEach(({ method, details }) => {
        db.run(`INSERT OR IGNORE INTO payment_methods (method, details) VALUES (?, ?)`, [method, details], (err) => {
            if (err) {
                console.error("Error inserting payment method:", err);
            }
        });
    });

    // Check and add 'balance' column to the 'users' table if it doesn't exist
    db.get(`PRAGMA table_info(users)`, (err, info) => {
        if (err) {
            console.error("Error fetching table info for 'users':", err);
        } else if (Array.isArray(info)) {
            const columnNames = info.map(row => row.name);
            if (!columnNames.includes('balance')) {
                db.run(`ALTER TABLE users ADD COLUMN balance REAL DEFAULT 0`, (err) => {
                    if (err) {
                        console.error("Error adding 'balance' column:", err);
                    }
                });
            }
        }
    });


    // Check and add missing columns in the 'transactions' table if they don't exist
    db.get(`PRAGMA table_info(transactions)`, (err, info) => {
        if (err) {
            console.error("Error fetching table info for 'transactions':", err);
        } else if (Array.isArray(info)) {
            const columnNames = info.map(row => row.name);
            if (!columnNames.includes('wallet_hash')) {
                db.run(`ALTER TABLE transactions ADD COLUMN wallet_hash TEXT`, (err) => {
                    if (err) {
                        console.error("Error adding 'wallet_hash' column:", err);
                    }
                });
            }
            if (!columnNames.includes('type')) {
                db.run(`ALTER TABLE transactions ADD COLUMN type TEXT CHECK(type IN ('Deposit', 'Withdraw')) NOT NULL DEFAULT 'Deposit'`, (err) => {
                    if (err) {
                        console.error("Error adding 'type' column:", err);
                    }
                });
            }
            if (!columnNames.includes('network')) {
                db.run(`ALTER TABLE transactions ADD COLUMN network TEXT`, (err) => {
                    if (err) {
                        console.error("Error adding 'network' column:", err);
                    }
                });
            }
        }
    });
});
module.exports = db;
