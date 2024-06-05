const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
// const bodyParser = require("body-parser");
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const port = process.env.PORT || 5000;

const app = express();

// middle ware
app.use(cors());
app.use(express.json());
// app.use(bodyParser.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nbfamjy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// jwt related api

    

// const verifyAdmin = async (req, res, next) => {
//   const email = req?.decoded?.email;
//   const query = { email: email };
//   const user = await userCollection.findOne(query);
//   const isAdmin = user?.role === "admin";
//   if (!isAdmin) {
//     return res.status(403).send({ message: "forbidden access" });
//   }
//   next();
// };

async function run() {
  try {
    await client.connect();
    const productsCollection = client.db("powerTools").collection("products");
    const ordersCollection = client.db("powerTools").collection("orders");
    const ratingCollection = client.db("powerTools").collection("reviews");
    const userCollection = client.db("powerTools").collection("users");



    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    const verifyToken = (req, res, next) => {
      const token = req.headers.authorization.split(" ")[1];
      if (!token) {
        return res.status(401).send({ message: "Unauthorized access" });
      }

      jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(403).send({ message: "Forbidden access" });
        }
        req.decoded = decoded;
        console.log('decoded', decoded);
        next();
      });
    };

    app.get("/products", async (req, res) => {
      const products = await productsCollection.find().toArray();
      res.send(products);
    });

    






    app.post("/products", verifyToken, async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });
    // delete product from db
    app.delete("/products/:id", verifyToken,  async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.json(result);
    });

    app.get("/products/:id",  async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const product = await productsCollection.findOne(query);
      res.send(product);
    });

    app.put("/products/:id", verifyToken,  async (req, res) => {
      const id = req.params.id;

      const filter = {
        _id: new ObjectId(id),
      };
      const updatedProd = req.body;
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          ...updatedProd,
        },
      };
      const result = await productsCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.json(result);
    });

    app.post("/orders", async (req, res) => {
      const product = await ordersCollection.insertOne(req.body);
      res.send(product);
    });

    // get single email ordered product
    app.get("/orders", async (req, res) => {
      const email = req.query.email;
      const query = {
        email: email,
      };
      const result = await ordersCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/delete-order/:id", async (req, res) => {
      const result = await ordersCollection.deleteOne({
        _id: ObjectId(req.params.id),
      });
      res.json(result);
    });

    // add rating to db
    app.post("/rating", async (req, res) => {
      const result = await ratingCollection.insertOne(req.body);
      res.json(result);
    });
    app.get("/rating", async (req, res) => {
      const result = await ratingCollection.find().toArray();
      res.json(result);
    });

    // get all orders
    app.get("/all-orders", async (req, res) => {
      const result = await ordersCollection.find().toArray();
      res.json(result);
    });
    // update orders status
    app.put("/updateStatus/:id", async (req, res) => {
      const id = req.params.id;
      const result = await ordersCollection.updateOne(
        {
          _id: ObjectId(id),
        },
        {
          $set: {
            status: "Approved",
          },
        }
      );
      res.json(result);
    });
    app.put("/updateStatus1/:id", async (req, res) => {
      const id = req.params.id;
      const result = await ordersCollection.updateOne(
        {
          _id: ObjectId(id),
        },
        {
          $set: {
            status: "on the way",
          },
        }
      );
      res.json(result);
    });

    //add a new product to db
    app.post("/products", async (req, res) => {
      const result = await productsCollection.insertOne(req.body);
      res.json(result);
    });

    // user related api
     app.get("/users/admin/:email",  async (req, res) => {
       const email = req.params.email;
console.log(email);
       
       if (email !== req?.decoded?.email) {
         return res.status(403).send({ message: "forbidden access" });
       }

       try {
         const user = await userCollection.findOne({ email: email });
         const isAdmin = user?.role === "admin";
         res.send({ admin: isAdmin });
       } catch (error) {
         console.error(error);
         res.status(500).send({ message: "Internal Server Error" });
       }
     });

    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
     app.get("/users/:email", async (req, res) => {
       const email = req.params.email;
       const result = await userCollection.findOne({ email });
       res.send(result);
     });
     app.get("/user/:id", async (req, res) => {
       const id = req.params.id;
       const query = { _id: new ObjectId(id) };
       const result = await userCollection.findOne(query);
       res.send(result);
     });
      app.put("/users/:email", async (req, res) => {
        const email = req.params.email;
        const filter = { email: email };
        const userUpdate = req.body;
        const options = { upsert: true };
        const updatedDoc = {
          $set: {
            ...userUpdate,
          },
        };
        const result = await userCollection.updateOne(
          filter,
          updatedDoc,
          options
        );
        res.send(result);
      });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "User Already available" });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // make user admin
    app.put("/users/admin/:id",  async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });


   

    app.delete("/users/:id",  async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.json(result);
    });

    // get admin user
    

    // payment

    app.get("/payment/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: ObjectId(id),
      };
      const product = await ordersCollection.findOne(query);
      res.json(product);
    });

    // update order after payment successful
    app.post("/payment/:id", async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = {
        _id: ObjectId(id),
      };
      const updateDoc = {
        $set: {
          payment: payment,
        },
      };
      const result = await ordersCollection.updateOne(filter, updateDoc);
      res.json(result);
    });

    // payment method setup
    app.post("/create-payment-intent", async (req, res) => {
      const paymentInfo = req.body;
      const amount = paymentInfo.price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        currency: "usd",
        amount: amount,
        payment_method_types: ["card"],
      });
      res.json({
        clientSecret: paymentIntent.client_secret,
      });
    });
  } finally {
  }
}

run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("Running power tools server");
});

app.listen(port, () => {
  console.log("listing to port", port);
});
