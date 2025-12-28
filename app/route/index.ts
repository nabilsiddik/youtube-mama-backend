import { Router } from "express";
import videoRouter from "../modules/video/videoRouter.js";

const appRouter = Router();

const routes = [
  {
    router: videoRouter,
    endPoint: "/video",
  },
];

routes.forEach((route) => {
  appRouter.use(route.endPoint, route.router);
});

export default appRouter;
