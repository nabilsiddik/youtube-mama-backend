import dotenv from "dotenv";
import { app } from "./app.js";
dotenv.config();
const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
// Gracefully shutdown on unhandled Rejection
process.on("unhandledRejection", (err) => {
    console.log("Unhandled Rejection error", err);
    server.close(() => {
        process.exit(1);
    });
});
//# sourceMappingURL=server.js.map