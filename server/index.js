const express = require('express');
const app = express();
const PORT = 8080;

const morgan = require('morgan');
app.use(morgan('common'));

app.use(express.static('public'));
app.listen(PORT, () => console.log(`Serving files on port: ${PORT}`));