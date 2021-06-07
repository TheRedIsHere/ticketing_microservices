import express, {Request, Response} from 'express';
import {body} from 'express-validator';

import {validateRequest, requireAuth, NotFoundError, NotAuthorizedError,} from '@shootl/common';

import {Order, OrderStatus} from '../models/order';
import {OrderCancelledPublisher} from "../events/publishers/order-cancelled-publisher";
import {natsWrapper} from "../nats/nats-wrapper";

const router = express.Router();

router.delete('/api/orders/:id', requireAuth, async (req: Request, res: Response) => {
    const {orderId} = req.params;

    const order = await Order.findById(orderId).populate('ticket');

    if (!order) {
        throw new NotFoundError();
    }

    if (order.userId !== req.currentUser!.id) {
        throw new NotAuthorizedError();
    }

    order.status = OrderStatus.Cancelled;
    await order.save();

    await new OrderCancelledPublisher(natsWrapper.client).publish({
        id: order.id,
        version: order.version,
        ticket: {
            id: order.ticket.id,
        }
    });

    return res.status(204).send(order);
});

export {router as deleteOrderRouter};