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

// STATIC — also no-cache for uploaded files
app.use("/uploads", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
}, express.static(path.join(__dirname, "uploads")));

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

// MULTER — only allow video files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // ✅ FIX: make sure uploads/ folder exists
    const uploadDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // ✅ 500MB max
  fileFilter: (req, file, cb) => {
    const allowed = ["video/mp4", "video/webm", "video/ogg", "video/mkv"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only video files are allowed"));
    }
  }
});

// TEST ROUTE
app.get("/", (req, res) => {
  res.send("Backend running successfully");
});

// ✅ MOVIES ROUTE — no-cache headers so browser always gets fresh list
app.get("/movies", (req, res) => {
  const movies = readMovies();

  // ✅ Sort latest first on the server too (double safety)
  movies.sort((a, b) => b.id - a.id);

  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");

  res.json(movies);
});

// UPLOAD MOVIE
app.post("/upload", upload.single("movie"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No video file uploaded" });
    }
    if (!req.body.title) {
      return res.status(400).json({ error: "Movie title is required" });
    }

    const movies = readMovies();

    const newMovie = {
      id: Date.now(),
      title: req.body.title.trim(),
      thumbnail: req.body.thumbnail || "",
      video: `/uploads/${req.file.filename}`
    };

    movies.push(newMovie);
    saveMovies(movies);

    res.set("Cache-Control", "no-store");
    res.json({ success: true, movie: newMovie });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed: " + err.message });
  }
});

// ✅ DELETE MOVIE ROUTE (was missing — useful for removing wrong uploads)
app.delete("/movies/:id", (req, res) => {
  try {
    const movies = readMovies();
    const id = parseInt(req.params.id);

    const index = movies.findIndex(m => m.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Movie not found" });
    }

    // Also delete the actual video file from disk
    const movie = movies[index];
    const filePath = path.join(__dirname, movie.video);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    movies.splice(index, 1);
    saveMovies(movies);

    res.set("Cache-Control", "no-store");
    res.json({ success: true });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Delete failed: " + err.message });
  }
});

// ✅ MULTER ERROR HANDLER
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: "File too large (max 500MB)" });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

// START
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("Backend running on port " + PORT);
});
