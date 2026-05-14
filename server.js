const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const app = express();

app.use(cors());
app.use(express.json());


//  =================  Smart bot blocking  =================

app.use((req, res, next) => {
  const ua = req.headers['user-agent'] || "";

  // Allow Google
  if (ua.includes("Googlebot")) return next();

  // Block aggressive bots
  if (
    ua.includes("bot") ||
    ua.includes("crawler") ||
    ua.includes("spider") ||
    ua === ""
  ) {
    return res.status(403).send("Blocked");
  }

  next();
});


// ================= PATH =================

const moviesPath = path.join(__dirname, "movies.json");


// ================= STATIC FOLDERS =================

app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// ================= READ MOVIES =================

function readMovies() {
  return JSON.parse(fs.readFileSync(moviesPath, "utf-8"));
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
  res.send("OTT Backend Running");
});


// ================= GET MOVIES =================

app.get("/movies", (req, res) => {

  const movies = readMovies();

  res.json(movies);

});


// ================= UPLOAD MOVIE =================

app.post("/upload", upload.single("movie"), (req, res) => {

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
    message: "Movie Uploaded Successfully",
    movie: newMovie
  });

});


// ================= START SERVER =================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {

  console.log("Backend running on port " + PORT);

});
