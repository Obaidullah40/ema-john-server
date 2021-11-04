const express = require("express");
const { MongoClient } = require("mongodb");
require("dotenv").config();
const cors = require("cors");
var admin = require("firebase-admin");



const app = express();
const port = process.env.PORT || 4000;


// firebase admin initialization 

var serviceAccount = require("./ema-john-simple-8db77-firebase-adminsdk-ozi27-fa1e6f6f95.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});



// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.k92al.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

// console.log(uri);
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});


async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith("Bearer ")) {
        const idToken = req.headers.authorization.split("Bearer ")[1];
        try {
            const decodedUser = await admin.auth().verifyIdToken(idToken);
            req.decodedUserEmail = decodedUser.email;
        }
        catch {
            
        }
    }
    next();
}


async function run() {
    try {
        await client.connect();
        const database = client.db("onlineShop");
        // console.log('database connected successfully')
        const productsCollection = database.collection("products");
        const orderCollection = database.collection("orders");

        // GET products API
        app.get("/products", async (req, res) => {
            const cursor = productsCollection.find({});
            const page = req.query.page;
            const size = parseInt(req.query.size);
            let products;
            const count = await cursor.count();
            if (page) {
                products = await cursor
                    .skip(page * size)
                    .limit(size)
                    .toArray();
            } else {
                products = await cursor.toArray();
            }
            // const products = await cursor.limit(10).toArray();

            res.send({
                count,
                products,
            });
        });

        // post to get data by keys
        app.post("/products/byKeys", async (req, res) => {
            const keys = req.body;
            const query = { key: { $in: keys } };
            // console.log("hit the post api", keys);
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        });

        // Add Orders API
        app.get('/orders', verifyToken, async (req, res) => {
            const email = req.query.email;
            if (req.decodedUserEmail === email) {
                const query = { email: email };
                const cursor = orderCollection.find(query);
                const orders = await cursor.toArray();
                res.json(orders);
            }           
            else {
                res.status(401).json({ message: "User not authorized" });
            }         
        });

        app.post("/orders", async (req, res) => {
            const order = req.body;
            order.createdAt = new Date();
            // console.log("hit the post api", order);
            const result = await orderCollection.insertOne(order);

            res.json(result);
        });
    } finally {
        // await client.close( );
    }
}

run().catch(console.dir);

app.get("/", (req, res) => {
    res.send("Running my Server with ema jon");
});

app.listen(port, () => {
    console.log("Running Server on port", port);
});
