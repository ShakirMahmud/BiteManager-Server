const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const e = require("express");

// middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://bite-manager-server.vercel.app",
      "https://bite-manager-client-shakir.vercel.app",
    ],
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
    // await client.connect();
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );

    // auth related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "1h" });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          maxAge: 60 * 60 * 1000, 
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

    app.post("/users", async (req, res) => {
        const user = req.body;
        console.log(user)
      
        try {
          const existingUser = await usersCollection.findOne({ email: user.email });
          console.log(existingUser);
      
          if (existingUser) {
            return res.status(200).send({ message: "Welcome back! You are already signed up." });
          }
          const result = await usersCollection.insertOne(user);
          res.send(result);
        } catch (error) {
          console.error(error);
          res.status(500).send({ message: "An error occurred", error });
        }
      });
      

    app.get("/users", verifyToken, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // foods related APIs
    const foodsCollection = client.db("BiteManager").collection("foods");

    app.get("/foods", async (req, res) => {
      const email = req.query.email;
      const searchQuery = req.query.search || "";
      const page = req.query.page || 1;
      const size = req.query.size || 9;

      if (email) {
        return verifyToken(req, res, async () => {
          if (req.decoded.email !== email) {
            return res.status(403).send({ message: "Forbidden access" });
          }
          const result = await foodsCollection
            .find({ "addedBy.email": email })
            .toArray();
          res.send(result);
        });
      }

      const filter = {
        ...(email ? { "addedBy.email": email } : {}),
        ...(searchQuery
          ? { foodName: { $regex: searchQuery, $options: "i" } }
          : {}),
      };

      try {
        const totalCount = await foodsCollection.countDocuments(filter);
        const result = await foodsCollection
          .find(filter)
          .skip(page * size)
          .limit(size)
          .toArray();
        res.send({ foods: result, totalCount });
      } catch (error) {
        console.error("Error fetching foods:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.get("/limitFoods", async (req, res) => {
      const limit = parseInt(req.query.limit) || 0;
      const sortBy = req.query.sortBy || null;
      const options = {
        ...(sortBy ? { sort: { [sortBy]: -1 } } : {}),
        ...(limit ? { limit } : {}),
      };

      const result = await foodsCollection.find({}, options).toArray();
      res.send(result);
    });

    // get single food
    app.get("/food/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodsCollection.findOne(query);
      res.send(result);
    });

    // Add food item with token verification
    app.post("/foods", verifyToken, async (req, res) => {
      try {
        const food = req.body;
        // Verify if the user email from token matches the addedBy email
        if (food.addedBy.email !== req.decoded.email) {
          return res.status(403).send({
            success: false,
            message: "Forbidden: Email mismatch",
          });
        }
        const newFood = {
          ...food,
          purchaseCount: 0,
        };
        const result = await foodsCollection.insertOne(newFood);
        res.send(result);
      } catch (error) {
        console.error("Error adding food:", error);
        res.status(500).send({
          success: false,
          message: "Internal server error",
          error: error.message,
        });
      }
    });

    // update food
    app.put("/foods/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const foodUpdates = req.body;

      const query = { _id: new ObjectId(id) };
      const food = await foodsCollection.findOne(query);

      if (!food || food.addedBy.email !== req.decoded.email) {
        return res.status(403).send({ message: "Forbidden access" });
      }

      const { popularity, purchaseCount, addedBy, ...updateFields } =
        foodUpdates;

      const result = await foodsCollection.updateOne(query, {
        $set: updateFields,
      });
      res.send(result);
    });

    /* ------------------------------------------------------- */
    app.get("/foodsCount", async (req, res) => {
      const result = await foodsCollection.estimatedDocumentCount();
      res.send({ count: result });
    });

    /* ------------------------------------------------------- */
    // purchase related APIs
    const purchaseCollection = client.db("BiteManager").collection("purchase");

    app.get("/purchase", verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { buyerEmail: email };
      if (req.decoded.email !== email) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      const result = await purchaseCollection.find(query).toArray();

      for (const purchase of result) {
        const query = { _id: new ObjectId(purchase.foodId) };
        const food = await foodsCollection.findOne(query);
        if (food) {
          purchase.foodName = food.foodName;
          purchase.price = food.price;
          purchase.foodImage = food.foodImage;
          purchase.foodOwner = food.addedBy.name;
        }
      }
      res.send(result);
    });

    // get single purchase
    app.get("/purchase/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await purchaseCollection.findOne(query);
      res.send(result);
    });

    // delete purchase
    app.delete("/purchase/:id", verifyToken, async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };

        const purchase = await purchaseCollection.findOne(query);
        if (!purchase) {
            return res.status(404).send({ message: "Order not found." });
        }
    
        const foodId = new ObjectId(purchase.foodId);
    
        const deleteResult = await purchaseCollection.deleteOne(query);
    
        if (deleteResult.deletedCount === 1) {
            await foodsCollection.updateOne(
                { _id: foodId },
                {
                    $inc: {
                        quantity: purchase.quantity, 
                        purchaseCount: -purchase.quantity, 
                    },
                }
            );
            return res.send({ message: "Order deleted and food updated successfully." });
        }
    
        res.status(500).send({ message: "Failed to delete the order." });
    });
    

    app.post("/purchase", verifyToken, async (req, res) => {
      const purchase = req.body;
      const loggedInUserEmail = req.decoded.email;
      const foodId = new ObjectId(purchase.foodId);
      const food = await foodsCollection.findOne({ _id: foodId });

      if (food.addedBy.email === loggedInUserEmail) {
        return res
          .status(403)
          .send({ message: "You cannot purchase your own added food item." });
      }

      try {
        const result = await purchaseCollection.insertOne(purchase);
        const updatedFood = await foodsCollection.updateOne(
          { _id: foodId },
          {
            $set: {
              quantity: food.quantity - purchase.quantity,
              purchaseCount: food.purchaseCount + purchase.quantity,
            },
          }
        );
        res.send(result);
      } catch (error) {
        console.error("Error processing purchase:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`The app listening on port ${port}`);
});
