const express = require("express")
const userRoutes = express.Router()
const { homePage, contactus, postcontactus, about, policy, faqs, signup, verifyAccount, resendVerificationMail, postSignIn, changepassword,postchangePassword, deposit, withdraw, postdeposit, postwithdraw, resetpassword, postresetpassword, forgotPassword, postforgotPassword, logout, mytransactions, dailyIncome, genReferral, refferal, dailyProductBuy, buyProduct, checkout, checkoutConfirm, myinvestment, investmentDetails, dailyIncomeUpdateForAll,exchangeCurrency,postExchangeCurrency} = require('../controllers/userController')
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./data.sqlite');

const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: './public/uploads',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

function checkAuth(req, res, next) {
    if (req.session.userId) {
        res.locals.userName = req.session.username || null;
        res.locals.userEmail = req.session.email || null;
        res.locals.balance = req.session.balance || null;
        res.locals.usdtBalance = req.session.usdtbal || null;
        res.locals.btcBalance = req.session.btcbal || null;
        return next();
    }
    res.redirect('/sign-in');
}

userRoutes.get(['/', '/home', '/index'], homePage);
userRoutes.get(['/sign-in', '/login'], (req, res) => {
    if (req.session.userId) {
        return res.redirect("/");
    }
    res.render('sign-in');
});
userRoutes.get(['/sign-up', '/register'], (req, res) => {
    res.render('sign-up');
});
userRoutes.get('/contact-us', contactus);
userRoutes.post('/contact-us', postcontactus);
userRoutes.get('/currency-exchanger', (req, res) => {
    res.render('user');
});
userRoutes.get('/deposit', (req, res) => {
    res.redirect('user/deposit');
});
userRoutes.get('/withdraw', (req, res) => {
    res.redirect('user/withdraw');
});
userRoutes.get(['/privacy-policy', '/terms-and-conditions'], policy);
userRoutes.get('/faqs', faqs);
userRoutes.post('/sign-up', signup);
userRoutes.get('/verify-account', verifyAccount);
userRoutes.post('/resend-verification-email', checkAuth, resendVerificationMail);
userRoutes.get('/sign-in', (req, res) => {
    res.render('sign-in');
});
userRoutes.post('/sign-in', postSignIn);
userRoutes.get('/change-password', checkAuth, changepassword);
userRoutes.get('/daily-income', checkAuth, dailyIncome);
userRoutes.post('/change-password', checkAuth, postchangePassword);
userRoutes.get('/user/deposit', checkAuth, deposit);
userRoutes.post('/user/deposit', checkAuth, upload.single('proof'), postdeposit);
userRoutes.get('/user/withdraw', checkAuth, withdraw);
userRoutes.post('/user/withdraw', checkAuth, upload.single('proof'), postwithdraw);
userRoutes.get('/reset-password', resetpassword);
userRoutes.post('/reset-password', postresetpassword);
userRoutes.get('/forgot-password', forgotPassword);
userRoutes.post('/forgot-password', postforgotPassword);
userRoutes.get('/mytransactions', checkAuth, mytransactions);
userRoutes.get('/user/refferal', checkAuth, refferal);
userRoutes.post('/user/refferal', checkAuth, genReferral);
userRoutes.get('/buy/:product', checkAuth, dailyProductBuy);
userRoutes.get('/checkout/:id', checkAuth, checkout);
userRoutes.get('/myinvestment', checkAuth, myinvestment);
userRoutes.get('/investment-details/:id', checkAuth, investmentDetails);
userRoutes.post('/checkoutConfirm', checkAuth, checkoutConfirm);
userRoutes.post('/productPurchase/', checkAuth, upload.single('proof'), buyProduct);


// userRoutes.get('/updateincome/', dailyIncomeUpdateForAll);


userRoutes.get('/currency-exchange', exchangeCurrency);
userRoutes.post('/currency-exchange', postExchangeCurrency);
userRoutes.get('/logout', logout);




module.exports = { userRoutes };
