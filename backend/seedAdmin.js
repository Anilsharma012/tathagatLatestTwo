const mongoose = require("mongoose");
const Admin = require("./models/Admin");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const adminEmail = "admin@tathagat.co.in";
    const existingAdmin = await Admin.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log("Admin already exists. Updating password...");
      existingAdmin.password = "admin123456";
      await existingAdmin.save();
      console.log("Admin password updated successfully");
    } else {
      const newAdmin = new Admin({
        email: adminEmail,
        password: "admin123456",
        name: "Super Admin"
      });
      await newAdmin.save();
      console.log("New admin created successfully");
    }
    process.exit(0);
  } catch (error) {
    console.error("Error seeding admin:", error);
    process.exit(1);
  }
};

seedAdmin();
