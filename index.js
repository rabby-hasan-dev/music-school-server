const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
var jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.VITE_payment_secrete_key)
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;


// Middleware
app.use(cors());
app.use(express.json());
const verifyJWT = (req, res, next) => {
    // console.log(req.headers);
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    // bearer token
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRETE, (error, decoded) => {
        if (error) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })
}




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.p6rgmv3.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const allClassesCollection = client.db("musicSchool").collection('allClasses');
       
        const allUsersCollection = client.db("musicSchool").collection('allUsers');
        const selectedClassCollection = client.db("musicSchool").collection('selected_class');
        const paymentCollection = client.db("musicSchool").collection('payments');

        // jwt api
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRETE, { expiresIn: '1h' })
            res.send({ token });
        })
        //  warning: use verifyJWT before using verifyAdmin
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await allUsersCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden access' })
            }

            next();


        }


        // Class relate api


        app.get('/allClasses', async (req, res) => {

            let query = {};
            if (req.query?.email) {
                query = { instructor_email: req.query.email }
                const result = await allClassesCollection.find(query).toArray();
                return res.send(result);
            }
            const result = await allClassesCollection.find().toArray();
            res.send(result);


        })

        app.get('/allClasses/:id', async (req, res) => {

            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await allClassesCollection.findOne(query);
            res.send(result);


        })

        app.post('/allClasses', async (req, res) => {
            const addClasses = req.body;
            const result = await allClassesCollection.insertOne(addClasses)
            res.send(result);

        })
        app.patch('/allClasses/:id', async (req, res) => {
            const id = req.params.id
            const classes = req.body;
            const filter = { _id: new ObjectId(id) };
            const updateClasses = {
                $set: {

                    name: classes.name,
                    image: classes.image,
                    instructor_name: classes.instructor_name,
                    instructor_email: classes.instructor_email,
                    available_seats: classes.available_seats,
                    price: classes.price,
                    descriptions: classes.descriptions,
                }
            }
            const result = await allClassesCollection.updateOne(filter, updateClasses)
            res.send(result);
        })

        // approved api
        app.patch('/allClasses/approved/:id', async (req, res) => {
            const id = req.params.id

            const filter = { _id: new ObjectId(id) };
            const approvedClass = {
                $set: {
                    status: "approved",

                }
            }


            const result = await allClassesCollection.updateOne(filter, approvedClass)
            res.send(result);

        })
        // deny api
        app.patch('/allClasses/deny/:id', async (req, res) => {
            const id = req.params.id

            const filter = { _id: new ObjectId(id) };
            const denyClass = {
                $set: {
                    status: "denied",

                }
            }


            const result = await allClassesCollection.updateOne(filter, denyClass)
            res.send(result);

        })
        // feedBack api
        app.patch('/allClasses/feedBack/:id', async (req, res) => {
            const id = req.params.id
            const feedBackData = req.body;
            const filter = { _id: new ObjectId(id) };
            const feedBackClass = {
                $set: {
                    feedBack: feedBackData.feedBack

                }
            }


            const result = await allClassesCollection.updateOne(filter, feedBackClass)
            res.send(result);

        })
        // instructor related api
       

        app.get('/allInstructors', async (req, res) => {
            const query={ role:"instructor"}
            const result = await allUsersCollection.find(query).toArray();
            res.send(result);

        })
        // Selected class
        app.get('/selectedClass', verifyJWT, async (req, res) => {

            const email = req.query.email;
            if (!email) {
                return res.send([]);
            }

            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'forbidden access' })

            }

            const query = { email: email }
            const result = await selectedClassCollection.find(query).toArray();
            res.send(result)
        })

        app.post('/selectedClass', async (req, res) => {
            const SelectedClasses = req.body;
            const query = {
                $and: [
                    { classId: SelectedClasses.classId },
                    { email: SelectedClasses.email }
                ]
            }

            const existingClass = await selectedClassCollection.findOne(query);

            if (existingClass) {
                return res.send({ message: ' class already exists' })
            }

            const result = await selectedClassCollection.insertOne(SelectedClasses)
            res.send(result);


        })

        app.delete('/selectedClass/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await selectedClassCollection.deleteOne(query);
            res.send(result)
        })

        // users related api

        app.get('/allUsers', verifyJWT, verifyAdmin, async (req, res) => {

            const result = await allUsersCollection.find().toArray();
            res.send(result);

        })
        app.post('/allUsers', async (req, res) => {
            const users = req.body;
            const query = { email: users.email };
            const existingUser = await allUsersCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'User already exist' })

            }
            const result = await allUsersCollection.insertOne(users);
            res.send(result);

        })

        app.delete('/allUsers/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await allUsersCollection.deleteOne(query);
            res.send(result);

        })

        // admin related api
        app.get('/allUsers/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;


            if (req.decoded.email !== email) {
                res.send({ admin: false })
            }

            const query = { email: email };
            const user = await allUsersCollection.findOne(query);
            const result = { admin: user?.role === 'admin' };
            res.send(result);
        })


        app.patch('/allUsers/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            };
            const result = await allUsersCollection.updateOne(filter, updateDoc);
            res.send(result);
        })
        //instructor related api
        app.get('/allUsers/instructor/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;


            if (req.decoded.email !== email) {
                res.send({ instructor: false })
            }

            const query = { email: email };
            const user = await allUsersCollection.findOne(query);
            const result = { instructor: user?.role === 'instructor' };
            res.send(result);
        })


        app.patch('/allUsers/instructor/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: 'instructor'
                },
            };
            const result = await allUsersCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        // Create payment intent
        app.post("/create-payment-intent", verifyJWT, async (req, res) => {

            const { price } = req.body;
            const amount = parseInt(price * 100);

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ["card"],

            })

            res.send({
                clientSecret: paymentIntent.client_secret
            })

        });

        // payment related api

        app.get('/payments', async (req, res) => {

            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
                const result = await paymentCollection.find(query).sort({Date: -1}).toArray();
                return res.send(result);
            }

           
            const result = await paymentCollection.find().toArray();
            res.send(result);

        })
        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const insertResult = await paymentCollection.insertOne(payment);

            const query = {
                _id: {
                    $in: payment.selectedClassId
                        .map(id => new ObjectId(id))
                }
            }
            const deleteResult = await selectedClassCollection.deleteMany(query);
            res.send({ insertResult, deleteResult });
        })







        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);







app.get('/', (req, res) => {

    res.send('Music Shool server site is Running')
})

app.listen(port, () => {
    console.log(`Music school running port is:${port}`)
})