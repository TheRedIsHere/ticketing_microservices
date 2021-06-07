import express from 'express';
import 'express-async-errors';
import {json} from 'body-parser';
import cookieSession from "cookie-session";

import {errorHandler, NotFoundError, currentUser} from "@shootl/common";

import {indexOrderRouter} from "./routes/index";
import {createOrderRouter} from "./routes/new";
import {showOrderRouter} from "./routes/show";
import {deleteOrderRouter} from "./routes/delete";

/** @type {boolean} */
const node_env = process.env.NODE_ENV !== 'test';

const app = express();
app.set('trust proxy', true);
app.use(json());
app.use(
    cookieSession({
        signed: false,
        secure: node_env
    })
);
app.use(currentUser);

app.use(indexOrderRouter);
app.use(createOrderRouter);
app.use(showOrderRouter);
app.use(deleteOrderRouter);

app.all('*', async (req, res) => {
    throw new NotFoundError();
});

app.use(errorHandler);

export {app};