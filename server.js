const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const rateLimit = require("express-rate-limit");

const app = express();

app.use(cors());
app.use(express.json());


// ================= RATE LIMIT (SAFE PROTECTION) =================

app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200 // limit each IP
}));


// ================= PATH =================

const moviesPath = path.join(__dirname, "movies.json");


// ================= STATIC FOLDERS =================

app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// ================= READ MOVIES =================

function readMovies() {
  try {
    return JSON.parse(fs.readFileSync(moviesPath, "utf-8"));
  } catch (err) {
    return [];
  }
}


// ================= SAVE MOVIES =================

function saveMovies(movies) {
  fs.writeFileSync(moviesPath, JSON.stringify(movies, null, 2));
}


// ================= MULTER STORAGE =================

const storage = multer.diskStorage({

  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }

});

const upload = multer({ storage });


// ================= TEST ROUTE =================

app.get("/", (req, res) => {
  res.send("Backend running successfully");
});


// ================= GET MOVIES =================

app.get("/movies", (req, res) => {
  try {
    const movies = readMovies();
    res.json(movies);
  } catch (err) {
    res.status(500).json({ error: "Failed to load movies" });
  }
});


// ================= UPLOAD MOVIE =================

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

    res.status(201).json({
      message: "Movie uploaded successfully",
      movie: newMovie
    });

  } catch (err) {
    res.status(500).json({ error: "Upload failed" });
  }

});


// ================= START SERVER =================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Backend running on port " + PORT);
});
