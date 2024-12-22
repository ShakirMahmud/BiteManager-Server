const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// verify token middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2cmkq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    // auth related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "1h" });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          maxAge: 60 * 60 * 1000, // 1 hour
        })
        .send({ success: true });
    });

    // Logout endpoint to clear cookie
    app.post("/logout", async (req, res) => {
      res
        .clearCookie("token", {
          maxAge: 0,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // Collections
    const usersCollection = client.db("BiteManager").collection("users");

    // User related APIs
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // Protected route example
    app.get("/users", verifyToken, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // foods related APIs
    const foodsCollection = client.db("BiteManager").collection("foods");
    app.get("/foods",verifyToken, async (req, res) => {
      const email = req.query.email; // Extract email from query parameters
      console.log(email)
      const searchQuery = req.query.search || ""; // Extract search query, default to an empty string
    
      if (req.decoded.email !== email) {
        return res.status(403).send({ message: "Forbidden access" });
      }

      // Build the filter object
      const filter = {
        ...(email ? { "addedBy.email": email } : {}), // Filter by addedBy.email if email is provided
        ...(searchQuery ? { foodName: { $regex: searchQuery, $options: "i" } } : {}), // Add search query filter
      };
    
      try {
        const result = await foodsCollection.find(filter).toArray(); // Query the database with the filter
        res.send(result); // Send the result back to the client
      } catch (error) {
        console.error("Error fetching foods:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });
    

    // get single food
    app.get("/food/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodsCollection.findOne(query);
      res.send(result);
    });
    

    app.post("/foods", async (req, res) => {
      const food = req.body;
      const result = await foodsCollection.insertOne(food);
      res.send(result);
    });

    /* ------------------------------------------------------- */
    // purchase related APIs
    const purchaseCollection = client.db("BiteManager").collection("purchase");
    app.get("/purchase", verifyToken, async (req, res) => {
      const result = await purchaseCollection.find().toArray();
      res.send(result);
    });

    app.post("/purchase", verifyToken, async (req, res) => {
      const purchase = req.body;
      const result = await purchaseCollection.insertOne(purchase);
      const id = purchase.foodId;
      const query = { _id: new ObjectId(id) };
      const food = await foodsCollection.findOne(query);
      if (food) {
        await foodsCollection.updateOne(query, {
          $set: {
            quantity: food.quantity - purchase.quantity,
            purchaseCount: food.purchaseCount + purchase.quantity,
          },
        });
      }
      res.send(result);
    });
  } finally {
    // Commenting out client.close() to keep connection alive
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`The app listening on port ${port}`);
});
