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

// STATIC
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// READ MOVIES
function readMovies() {
  try {
    const data = fs.readFileSync(moviesPath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

// SAVE MOVIES
function saveMovies(movies) {
  fs.writeFileSync(moviesPath, JSON.stringify(movies, null, 2));
}

// MULTER
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

// TEST ROUTE
app.get("/", (req, res) => {
  res.send("Backend running successfully");
});

// ✅ FIXED MOVIES ROUTE
app.get("/movies", (req, res) => {
  const movies = readMovies();
  res.json(movies);
});

// UPLOAD MOVIE
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

    res.json({ success: true, movie: newMovie });
  } catch (err) {
    res.status(500).json({ error: "Upload failed" });
  }
});

// START
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("Backend running on port " + PORT);
});
