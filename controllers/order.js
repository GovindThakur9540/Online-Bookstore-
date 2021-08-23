// Schema and error handler
const {Order, CartItem} = require('../models/order');
const {errorHandler} = require("../helpers/dbErrorHandler");
const User = require("../models/user");
// sendgrid for email npm i @sendgrid/mail
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey('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');

// nodemailer to send emails
// const nodemailer = require("nodemailer");
// let transporter = nodemailer.createTransport({
//     service : 'gmail',
//     secure : false,
//     port : 25,
//     auth : {
//         user : process.env.EMAILID,
//         pass : process.env.EMAILPASSWORD
//     },
//     tls : {
//         rejectUnauthorized : false
//     }});



// Return order by id
exports.orderById = (req, res, next, id) => {
    Order.findById(id)
    .populate('products.product', 'name price')
    .exec((err, order) => {
        if(err || !order)
        {
            return res.status(400).json({
                error: errorHandler(err)
            })
        }
        
        req.order = order;
        next();
    })
}

// Create order
exports.create = (req, res) => {
    req.body.order.user = req.profile;
    const order = new Order(req.body.order);
    order.save((error, data) => {
        if (error) {
            return res.status(400).json({
                error: errorHandler(error)
            });
        }

    // Send order confirmation email to user and admin
    // send email alert to admin
        // order.address
        // order.products.length
        // order.amount
        const emailData = {
            to: 'govindthakur385@gmail.com',
            from: 'noreply@onlinebookstore.com',
            subject: `A new order is received`,
            html: `
            <p>Customer name:</p>
            <p>Total products: ${order.products.length}</p>
            <p>Total cost: ${order.amount}</p>
            <p>Login to dashboard to the order in detail.</p>
        `
        };
        sgMail.send(emailData);
        res.json(data);
    });
};

// Push order to user history
exports.addOrderToUserHistory = async(req, res, next) => {
    let history = []

    // Order to be saved
    req.body.order.products.forEach((item) => {
        history.push({
            _id: item._id,
            name: item.name,
            description: item.description,
            category: item.category,
            quantity: item.count,
            transaction_id: req.body.order.transaction_id,
            amount: req.body.order.amount
        })
    });

    // Push order history in database by updating user order history
    User.findOneAndUpdate({_id: req.profile._id}, {$push: {history: history}}, {new: true}, (err, data) => {
        if(err)
        {
            return res.status(400).json({
                error: 'Could not update user purchase history'
            })
        }

        next();
    })
}

// List all orders for admin
exports.listOrders = (req, res) => {
    Order.find()
    .populate('user', "_id name address")
    .sort('-created')
    .exec((err, orders) => {
        if(err)
        {
            return res.status(400).json({
                error: errorHandler(err)
            })
        }

        return res.json(orders);
    })
}

// Return various status values of the enum
exports.getStatusValues = (req, res) => {
    res.json(Order.schema.path("status").enumValues)
}

// Update order status
exports.UpdateOrderStatus = (req, res) => {
    Order.update({_id: req.body.orderId}, {$set: {status: req.body.status}}, (err, order) => {
        if(err)
        {
            return res.status(400).json({
                error: errorHandler(err)
            })
        }
        return res.json(order);
    });
}