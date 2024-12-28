import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = 3000;

// PostgreSQL configuration
const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "Books",
    password: process.env.DB_PASSWORD,
    port: 5432,
  });
  db.connect();

// Middleware
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Fetch book cover using Open Library Covers API

async function fetchBookCover(title) {
    const encodedTitle = encodeURIComponent(title); // URL encode the title
    const url = `https://covers.openlibrary.org/b/title/${encodedTitle}-L.jpg`;

    try {
        // Make a GET request to check if the cover exists
        const response = await axios.head(url); // Use HEAD to only check for the resource
        if (response.status === 200) {
            return url; // Return the cover URL if it exists
        }
    } catch (error) {
        console.error(`Cover not found for "${title}":`, error.message);
    }

    // Return a default cover if the specific cover is unavailable
    return "/assets/default-cover.jpg";
}
export { fetchBookCover };


// Routes
app.get("/", async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM books ORDER BY date_read DESC");
        res.render("index", { books: result.rows });
    } catch (error) {
        console.error("Error fetching books:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/add", async (req, res) => {
    const { title, author, rating, date_read } = req.body;

    try {
        const cover_url = await fetchBookCover(title);
        await db.query(
            "INSERT INTO books (title, author, rating, date_read, cover_url) VALUES ($1, $2, $3, $4, $5)",
            [title, author, rating, date_read, cover_url]
        );
        res.redirect("/");
    } catch (error) {
        console.error("Error adding book:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/delete", async (req, res) => {
    const { id } = req.body;

    try {
        await db.query("DELETE FROM books WHERE id = $1", [id]);
        res.redirect("/");
    } catch (error) {
        console.error("Error deleting book:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
