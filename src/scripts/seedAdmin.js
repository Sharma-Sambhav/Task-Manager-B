import dotenv from "dotenv";
import connectDB from "../db/index.js";
import { User } from "../models/user.models.js";

dotenv.config({ path: "./.env" });

const seedAdmin = async () => {
    try {
        await connectDB();

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: "admin@gmail.com" });
        if (existingAdmin) {
            console.log("❌ Admin already exists!");
            console.log("Email: admin@gmail.com");
            
            // Delete existing admin to recreate with proper password hash
            console.log("\n🔄 Deleting existing admin to recreate...");
            await User.deleteOne({ email: "admin@gmail.com" });
            console.log("✅ Existing admin deleted");
        }

        // Create admin user (password will be hashed by pre-save hook)
        const admin = await User.create({
            firstName: "Admin",
            lastName: "User",
            email: "admin@gmail.com",
            password: "admin@123",
            role: "admin",
            status: "approved"
        });

        console.log("\n✅ Admin user created successfully!\n");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📧 Email:    admin@gmail.com");
        console.log("🔑 Password: admin@123");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("\n⚠️  IMPORTANT: Please change the password after first login!\n");

        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding admin:", error);
        process.exit(1);
    }
};

seedAdmin();
