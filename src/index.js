import dotenv from "dotenv";
import server from "./server.js";
import io from "./socket.js";
import connectDB from "./db/index.js";

dotenv.config({
  path: "./.env", 
});

const serverPort = process.env.PORT || 8080;

connectDB()
  .then(() => {
    server.on("error", (err) => {
      console.log("Error Occured at index.js:", err);
    });

    server.listen(serverPort, () => {
      console.log({
        serverStatus: "🌐  Application is Running",
        URL: `🔗 http://localhost:${serverPort}`,
      });
    });
  })
  .catch((err) => {
    console.log("DB connection Failed from Index.js:", err);
  }); 
