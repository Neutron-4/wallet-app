const express = require("express")
const adminRoutes = express.Router()
const { adminLogin, adminDashboard, updatePaymentMethods, postupdatePaymentMethods, updateStatus, users, deleteUser, transactions, deleteTransactions, currencyrate, postcurrencyrate, addUser, updateRegistrationStatus, newpost, allposts,editpost,editpostp,setting,newsetting,deletepost,orders,updateOrder ,updateSetting ,offers, postoffer,editoffers,editoffersp,updateComission , refferalDetails,allReferrals} = require('../controllers/adminController')

const multer = require('multer');
const path = require('path');

const storage_upi = multer.diskStorage({
    destination: '../public/upi',
    filename: (req, file, cb) => {
        cb(null, 'upi_qr' + path.extname(file.originalname));
    }
});
const upi_upload = multer({ storage: storage_upi })

const storage_posts = multer.diskStorage({
    destination: './public/posts',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const posts_upload = multer({ storage: storage_posts })


const storage_offers = multer.diskStorage({
    destination: './public/offers',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const offer_upload = multer({ storage: storage_offers })


function isAdmin(req, res, next) {
    if (req.session.isAdmin) {
            return next();
        }
        res.redirect('/admin');
}

adminRoutes.get('/', (req, res) => {
    if(req.session.isAdmin){
        return res.redirect('dashboard')
    }
    res.render('admin-login', { data: null });
});
adminRoutes.post('/sign-in', adminLogin);
adminRoutes.get('/dashboard', isAdmin, adminDashboard);
adminRoutes.get('/update-payment-methods', isAdmin, updatePaymentMethods);
adminRoutes.post('/update-payment-methods', upi_upload.single('upi_qr'), isAdmin, postupdatePaymentMethods);
adminRoutes.post('/update-status/:id', isAdmin, updateStatus); 
adminRoutes.get('/users', isAdmin, users);
adminRoutes.post('/delete-user', isAdmin, deleteUser);
adminRoutes.get('/transactions', isAdmin, transactions);
adminRoutes.post('/delete-transaction', isAdmin, deleteTransactions);
adminRoutes.get('/currencyrate', isAdmin, currencyrate);
adminRoutes.post('/currencyrate', isAdmin, postcurrencyrate);
adminRoutes.post('/add-user', isAdmin, addUser);
adminRoutes.post('/update-registration-status', updateRegistrationStatus);
adminRoutes.post('/update-order/:id', updateOrder);
// adminRoutes.get('/post', createnewpost);
adminRoutes.post('/post', isAdmin,posts_upload.single('thumbnail'), newpost);
adminRoutes.get('/posts', isAdmin, allposts);
adminRoutes.get('/post/:id',isAdmin,editpost)
adminRoutes.post('/post/:id',isAdmin,posts_upload.single('thumbnail'),editpostp)
adminRoutes.get('/setting', isAdmin, setting);
adminRoutes.post('/newsetting', isAdmin, newsetting);
adminRoutes.get('/orders', isAdmin, orders);
adminRoutes.post('/post/delete/:id',isAdmin,deletepost);
adminRoutes.post('/update-setting',isAdmin,posts_upload.single('thumbnail'),updateSetting);
adminRoutes.get('/offers', isAdmin, offers);
adminRoutes.get('/newoffer', isAdmin, editoffers);
adminRoutes.get('/editoffer/:id', isAdmin, editoffers);

adminRoutes.post('/offer-details',isAdmin,offer_upload.single('thumbnail'),postoffer);
adminRoutes.post('/offer-details/:id',isAdmin,offer_upload.single('thumbnail'),editoffersp);
adminRoutes.get('/all-referrals',allReferrals)
adminRoutes.get('/refferal-details/',refferalDetails)
adminRoutes.post('/updateComission/:id',updateComission)


module.exports = { adminRoutes };
