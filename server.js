const express = require("express");
const app = express();
const bodyParser = require("body-parser");

// Untuk Membaca File + Upload File
const multer = require("multer");
const upload = multer().single("file");

// import firebase + key
const admin = require("firebase-admin");
const credentials = require("./key.json");
admin.initializeApp({
  credential: admin.credential.cert(credentials),
  storageBucket: "gs://v-recipe-6ed4a.appspot.com",
});

//API Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: false })); // Baca Form
// Baca Direktori Page
app.use(express.static("public"));
app.get("/dashboard", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});
app.get("/collection", (req, res) => {
  res.sendFile(__dirname + "/public/collection.html");
});
app.get("/user", (req, res) => {
  res.sendFile(__dirname + "/public/user.html");
});

// Simple
const db = admin.firestore();
const auth = admin.auth();

// Create - Recipe
app.post("/create/recipes", (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).send("Error uploading file");
    }
    try {
      // Menampilkan Data Text + File Input Dari Form
      console.log(req.body);
      console.log(req.file);

      // Ngumpulin data Input
      const recipes = {
        title: req.body.title,
        ingredients: req.body.ingredients,
        directions: req.body.directions,
        imageURL: "",
      };

      //Data Siap
      const response = await db.collection("recipes").add(recipes);

      // Upload gambar ke Firebase Storage
      const bucket = admin.storage().bucket();
      const file = req.file;
      const fileRef = bucket.file(`${file.originalname}`);
      await fileRef.save(file.buffer);

      // Mendapatkan URL gambar dari Firebase Storage
      const imageURL = await fileRef.getSignedUrl({
        action: "read",
        expires: "01-01-2030",
      });

      // Memperbarui isi imageURL Dalam Data Siap
      await response.update({ imageURL: imageURL });

      // Eksekusi
      res.redirect("/dashboard");
    } catch (error) {
      res.status(500).send(error.message);
    }
  });
});

// Read - Recipe
app.get("/read/recipes", async (req, res) => {
  try {
    // Mengambil data dari koleksi "recipes"
    const snapshot = await db.collection("recipes").get();

    const recipe = [];
    // Mengolah setiap dokumen dalam koleksi
    snapshot.forEach((doc) => {
      const data = doc.data();
      recipe.push({
        id: doc.id,
        title: data.title,
        ingredients: data.ingredients,
        directions: data.directions,
        imageURL: data.imageURL,
      });
    });
    res.send(recipe);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Update - Recipe
app.post("/update/recipes", (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).send("Error uploading file");
    }
    try {
      // Menampilkan Data Text + File Input Dari Form
      console.log(req.body);
      console.log(req.file);

      // Ngambil Id + Data Waktu
      const recipeId = req.body.idUpdate;

      // Upload gambar ke Firebase Storage
      const bucket = admin.storage().bucket();
      const file = req.file;
      const fileRef = bucket.file(`${file.originalname}`);
      await fileRef.save(file.buffer);

      // Mendapatkan URL gambar dari Firebase Storage
      const imageURLUpdate = await fileRef.getSignedUrl({
        action: "read",
        expires: "01-01-2030",
      });

      // Ngumpulin data baru Input
      const newRecipe = {
        title: req.body.titleUpdate,
        ingredients: req.body.ingredientsUpdate,
        directions: req.body.directionsUpdate,
        imageURL: imageURLUpdate,
      };

      // Eksekusi
      await db.collection("recipes").doc(recipeId).update(newRecipe);

      res.redirect("/collection");
    } catch (error) {
      res.status(500).redirect("/collection");
    }
  });
});

// Delete - Recipe
app.delete("/delete/:id", async (req, res) => {
  try {
    // Hapus Data Firestore
    const response = await db.collection("recipes").doc(req.params.id).delete();

    res.send(response);
  } catch (error) {
    res.send(error);
  }
});

// Read Total Recipe
// app.get("/recipes/count", async (req, res) => {
//   try {
//     const snapshot = await db.collection("recipes").get();
//     const totalPhotos = snapshot.size;
//     res.send({ totalPhotos });
//   } catch (error) {
//     res.status(500).send(error.message);
//   }
// });

// Read Total User
// app.get("/users/count", async (req, res) => {
//   try {
//     const userRecords = await auth.listUsers();
//     const totalUsers = userRecords.users.length;
//     res.send({ totalUsers });
//   } catch (error) {
//     res.status(500).send(error.message);
//   }
// });

// Read User
app.get("/read/users", async (req, res) => {
  try {
    const userRecords = await auth.listUsers();
    const users = userRecords.users.map((user) => ({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
    }));
    res.send(users);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

//Port Test Lokal
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on PORT ${PORT}.`);
});
