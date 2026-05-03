import { APIError } from "../utils/APIerror.js";

const notFound = (req, res, next) => {
    const error = new APIError(404, `Route not found - ${req.originalUrl}`);
    next(error);
};

export default notFound;
