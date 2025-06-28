require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const port = 3000; // The port your API will run on

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('Connected to MongoDB!'))
  .catch((err) => console.error('Could not connect to MongoDB:', err));

app.use(express.json()); // Allows your API to understand JSON requests

// GET all cigar lines
app.get('/api/v1/cigars/lines', async (req, res) => {
  try {
    const cigarLines = await CigarLine.find();
    res.json(cigarLines);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET cigar lines by brand
app.get('/api/v1/cigars/brands/:brandName/lines', async (req, res) => {
  try {
    const brandName = req.params.brandName; // Get brand name from URL
    const cigarLines = await CigarLine.find({ brand_name: brandName });
    res.json(cigarLines);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST (Save/Upsert) new cigar data (this is how you'll add data)
app.post('/api/v1/cigars/lines/batch', async (req, res) => {
  const data = req.body; // Expects an array of cigar line objects
  if (!Array.isArray(data)) {
    return res.status(400).json({
      message: 'Request body must be an array of cigar line objects.',
    });
  }

  const results = [];
  for (const item of data) {
    try {
      // Try to find by brand_name and line_name to update
      const existingLine = await CigarLine.findOneAndUpdate(
        { brand_name: item.brand_name, line_name: item.line_name },
        item, // The new data to update with
        { upsert: true, new: true, setDefaultsOnInsert: true } // upsert: create if not found, new: return updated document
      );
      results.push({
        status: 'success',
        line: existingLine.line_name,
        action: existingLine.__v === 0 ? 'inserted' : 'updated',
      });
    } catch (err) {
      results.push({
        status: 'error',
        line: item.line_name || 'unknown',
        message: err.message,
      });
    }
  }
  res.status(200).json(results);
});

// Basic route for testing
app.get('/', (req, res) => {
  res.send('Cigar API is running!');
});

app.listen(port, () => {
  console.log(`Cigar API listening at http://localhost:${port}`);
});

// Define a schema for your Cigar Line data
const cigarLineSchema = new mongoose.Schema({
  brand_name: String,
  line_name: String,
  origin_country: String,
  wrapper_leaf: String,
  binder_leaf: String,
  filler_leaf: String,
  strength: String,
  strength_level_numeric: Number,
  flavor_profile_notes: String,
  approximate_price_range: String,
  cigar_ratings: [
    {
      publication: String,
      score: Number,
      vitola_rated: String,
      year_rated: Number,
      notes: String,
    },
  ],
  pairings: {
    coffee: [String],
    bourbon: [String],
    scotch: [String],
    cognac: [String],
    wine: [String],
    food: [String],
    beer: [String],
  },
});

// Create a Model from the schema
const CigarLine = mongoose.model('CigarLine', cigarLineSchema);
