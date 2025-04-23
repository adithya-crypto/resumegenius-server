const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const upload = multer({ dest: 'uploads/' });

// Use Flask service endpoint (OpenAI-based)
const OPENAI_SCORING_API = process.env.OPENAI_SCORING_SERVICE || 'http://localhost:5055/score-resume';

// ---- Resume PDF Upload & Extract ----
app.post('/upload/resume', upload.single('resume'), async (req, res) => {
  try {
    const filePath = path.join(__dirname, req.file.path);
    const dataBuffer = fs.readFileSync(filePath);
    const parsed = await pdfParse(dataBuffer);

    fs.unlinkSync(filePath);
    res.json({ text: parsed.text });
  } catch (err) {
    console.error('Resume parsing error:', err);
    res.status(500).json({ error: 'Resume parsing failed' });
  }
});

// ---- Score Resume via Flask OpenAI ATS API ----
app.post('/score-resume', async (req, res) => {
  try {
    const response = await fetch(OPENAI_SCORING_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Scoring error:', data);
      return res.status(500).json({ error: 'OpenAI scoring failed', details: data });
    }

    res.json(data);
  } catch (err) {
    console.error('Backend error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---- Health Check ----
app.get('/', (req, res) => {
  res.send('Resume Genius API (OpenAI-integrated) is running.');
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
