const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;


// Middleware
app.use(cors());


app.get('/', (req, res) => {

    res.send('Music Shool server site is Running')
})

app.listen(port, () => {
    console.log(`Music school running port is:${port}`)
})