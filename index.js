if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

const express = require("express");
const mongoose = require("mongoose");
const methodOverride = require("method-override");
const ejsmate = require("ejs-mate");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const multer = require("multer");

const User = require("./models/user.js");
const Listing = require("./models/listing.js");
const { storage } = require("./cloudConfig.js");

const userRoutes = require("./routes/user.js");
const listingsRoutes = require("./routes/listings.js");

const upload = multer({ storage });
const app = express();


// ============================
// DATABASE CONNECTION ✅ FIXED
// ============================
const dbUrl = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/your-db";

mongoose.connect(dbUrl)
    .then(() => {
        console.log("✅ MongoDB connected");
    })
    .catch((err) => {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1);
    });


// ============================
// EJS SETUP
// ============================
app.engine("ejs", ejsmate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


// ============================
// MIDDLEWARES
// ============================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));


// ============================
// SESSION & FLASH
// ============================
const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: {
        secret: process.env.SECRET || "supersecret"
    },
    touchAfter: 24 * 3600
});

store.on("error", (err) => {
    console.log("⚠️ Mongo Session Store Error:", err);
});

const sessionConfig = {
    store,
    name: "session",
    secret: process.env.SECRET || "supersecret",
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
};

app.use(session(sessionConfig));
app.use(flash());


// ============================
// PASSPORT CONFIG
// ============================
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


// ============================
// GLOBAL LOCALS
// ============================
app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currentUser = req.user;
    next();
});


// ============================
// ROUTES
// ============================
app.get("/", async (req, res, next) => {
    try {
        const allListings = await Listing.find({});
        res.render("listings/index", { allListings });
    } catch (err) {
        next(err);
    }
});

app.get("/demouser", async (req, res, next) => {
    try {
        let random = Math.floor(Math.random() * 10000);
        let user = new User({
            email: `anan${random}@mail.com`,
            username: `chuouser${random}`
        });
        let registeredUser = await User.register(user, "demopassword");
        res.send(registeredUser);
    } catch (err) {
        next(err);
    }
});

app.use("/listings", listingsRoutes);
app.use("/", userRoutes);


// ============================
// ERROR HANDLER
// ============================
app.use((err, req, res, next) => {
    console.error("🔥 ERROR:", err);
    res.status(500).render("error", { err });
});


// ============================
// SERVER START ✅ FIXED PORT
// ============================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
