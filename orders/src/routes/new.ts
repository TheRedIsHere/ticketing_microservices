import express, {Request, Response} from 'express';
import {body} from 'express-validator';
import {BadRequestError, NotFoundError, OrderStatus, requireAuth, validateRequest} from '@shootl/common';
import mongoose from "mongoose";

import {Ticket} from '../models/ticket';
import {Order} from '../models/order';
import {OrderCreatedPublisher} from "../events/publishers/order-created-publisher";
import {natsWrapper} from "../nats/nats-wrapper";

const router = express.Router();

// test
const EXPIRATION_WINDOW_SECONDS = 1 * 60;
//const EXPIRATION_WINDOW_SECONDS = 15 * 60;

router.post(
    '/api/orders',
    requireAuth,
    [
        body('ticketId')
            .not()
            .isEmpty()
            .custom((input: string) => mongoose.isValidObjectId(input))
            .withMessage('TicketId must be provided'),
    ],
    validateRequest,
    async (req: Request, res: Response) => {
        const {ticketId} = req.body;
        const ticket = await Ticket.findById(ticketId);

        if (!ticket) {
            throw new NotFoundError();
        }

        const isReserved = await ticket.isReserved();

        if (isReserved) {
            throw new BadRequestError('Ticket is already reserved');
        }

        const expiration = new Date();
        expiration.setSeconds(expiration.getSeconds() + EXPIRATION_WINDOW_SECONDS);

        const order = Order.build({
            userId: req.currentUser!.id,
            status: OrderStatus.Created,
            expiresAt: expiration,
            ticket: ticket
        });
        await order.save();

        await new OrderCreatedPublisher(natsWrapper.client).publish({
            id: order.id,
            version: order.version,
            status: order.status,
            userId: order.userId,
            expiresAt: order.expiresAt.toISOString(),
            ticket: {
                id: ticket.id,
                price: ticket.price
            }
        });

        return res.status(201).send(order);
    }
);

export {router as createOrderRouter};
