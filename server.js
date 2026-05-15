const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const rateLimit = require("express-rate-limit");

const app = express();

app.use(cors());
app.use(express.json());

// RATE LIMIT
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
}));

// PATH
const moviesPath = path.join(__dirname, "movies.json");

// STATIC (no cache)
app.use("/uploads", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
}, express.static(path.join(__dirname, "uploads")));

// READ
function readMovies() {
  try {
    return JSON.parse(fs.readFileSync(moviesPath, "utf-8"));
  } catch {
    return [];
  }
}

// SAVE
function saveMovies(movies) {
  fs.writeFileSync(moviesPath, JSON.stringify(movies, null, 2));
}

// MULTER
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

// TEST
app.get("/", (req, res) => {
  res.send("Backend running");
});

// MOVIES
app.get("/movies", (req, res) => {
  const movies = readMovies();

  // latest first
  movies.sort((a, b) => b.id - a.id);

  res.set("Cache-Control", "no-store");
  res.json(movies);
});

// UPLOAD
app.post("/upload", upload.single("movie"), (req, res) => {
  try {
    const movies = readMovies();

    const newMovie = {
      id: Date.now(),
      title: req.body.title,
      thumbnail: req.body.thumbnail,
      video: `/uploads/${req.file.filename}`
    };

    movies.push(newMovie);
    saveMovies(movies);

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Upload failed" });
  }
});

// DELETE
app.delete("/movies/:id", (req, res) => {
  const movies = readMovies();
  const id = parseInt(req.params.id);

  const filtered = movies.filter(m => m.id !== id);
  saveMovies(filtered);

  res.json({ success: true });
});

// START
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Running on " + PORT));
